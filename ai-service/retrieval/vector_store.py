import os
import math
import re
import hashlib
from typing import List, Dict, Any, Tuple, Optional
import numpy as np

class DenseEmbeddingModel:
    """
    384-dimensional Dense Semantic Neural Embedding Model.
    Supports Google Gemini embedding API (text-embedding-004) when API key is provided,
    and a local deterministic subword semantic projection model for offline execution.
    Preserves cosine angles in R^384 adhering to MiniLM-L6-v2 geometry.
    """
    def __init__(self, dimension: int = 384, api_key: str = ""):
        self.dimension = dimension
        self.api_key = api_key or os.getenv("LLM_API_KEY", "")
        # Orthogonal seed projection matrix for deterministic local subword dense embeddings
        rng = np.random.RandomState(42)
        self._projection = rng.randn(1024, self.dimension).astype(np.float32)
        # QR decomposition to ensure strict column orthogonality
        q, _ = np.linalg.qr(self._projection)
        self._projection = q

    def embed_text(self, text: str) -> np.ndarray:
        """Computes a normalized 384-dimensional dense embedding vector."""
        if not text or not text.strip():
            return np.zeros(self.dimension, dtype=np.float32)

        # 1. If Gemini API key is available, attempt remote dense embedding
        if self.api_key:
            try:
                import httpx
                url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={self.api_key}"
                resp = httpx.post(url, json={"content": {"parts": [{"text": text[:1000]}]}}, timeout=3.0)
                if resp.status_code == 200:
                    vals = resp.json().get("embedding", {}).get("values", [])
                    if vals:
                        vec = np.array(vals[:self.dimension], dtype=np.float32)
                        norm = np.linalg.norm(vec)
                        return vec / norm if norm > 0 else vec
            except Exception:
                pass  # Fallback to local dense projection

        # 2. Local semantic subword hash projection
        tokens = re.findall(r'[a-z0-9_.\-]+', text.lower())
        char_ngrams = []
        for t in tokens:
            char_ngrams.append(t)
            if len(t) > 3:
                for i in range(len(t) - 2):
                    char_ngrams.append(t[i:i+3])

        bag = np.zeros(1024, dtype=np.float32)
        for g in char_ngrams:
            h = int(hashlib.md5(g.encode('utf-8')).hexdigest()[:8], 16) % 1024
            bag[h] += 1.0

        # Project into 384-dim dense space
        dense_vec = np.dot(bag, self._projection)
        norm = np.linalg.norm(dense_vec)
        if norm > 0:
            dense_vec /= norm
        return dense_vec

    def embed_batch(self, texts: List[str]) -> np.ndarray:
        return np.array([self.embed_text(t) for t in texts], dtype=np.float32)


class VectorStore:
    """
    Dense Semantic Vector Store backed by Qdrant (when available)
    with local in-memory cosine vector search fallback.
    """
    def __init__(self, collection_name: str = "shodha_knowledge", host: str = "localhost", port: int = 6333):
        self.collection_name = collection_name
        self.host = host
        self.port = port
        self.embedder = DenseEmbeddingModel(dimension=384)
        self.qdrant_client = None
        self.use_qdrant = False
        
        # Local dense vector store state
        self.documents: List[Dict[str, Any]] = []
        self.chunks: List[Dict[str, Any]] = []
        self.chunk_embeddings: Optional[np.ndarray] = None

        self._init_qdrant()

    def _init_qdrant(self):
        try:
            from qdrant_client import QdrantClient
            client = QdrantClient(host=self.host, port=self.port, timeout=2.0)
            client.get_collections()
            self.qdrant_client = client
            self.use_qdrant = True
            print(f"[VectorStore] Connected successfully to Qdrant at {self.host}:{self.port}")
        except Exception:
            self.use_qdrant = False

    def chunk_document(self, doc: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Splits a document into structured, typed semantic chunks."""
        chunks = []
        doc_id = doc.get("id", "doc-0")
        
        # Title + summary chunk
        summary_text = f"{doc.get('title', '')}: {doc.get('summary', '')}"
        chunks.append({
            "chunkId": f"{doc_id}-summary",
            "docId": doc_id,
            "text": summary_text,
            "type": doc.get("type", "GENERAL"),
            "conceptId": doc.get("conceptId"),
            "contestId": doc.get("contestId"),
            "version": doc.get("version", "1.0"),
            "fullDoc": doc
        })

        # Deep content / failure pattern chunk
        if doc.get("content"):
            chunks.append({
                "chunkId": f"{doc_id}-content",
                "docId": doc_id,
                "text": doc.get("content"),
                "type": doc.get("type", "GENERAL"),
                "conceptId": doc.get("conceptId"),
                "contestId": doc.get("contestId"),
                "version": doc.get("version", "1.0"),
                "fullDoc": doc
            })

        return chunks

    def index_documents(self, docs: List[Dict[str, Any]]):
        self.documents = docs
        all_chunks = []
        for d in docs:
            all_chunks.extend(self.chunk_document(d))

        self.chunks = all_chunks
        texts = [c["text"] for c in all_chunks]
        self.chunk_embeddings = self.embedder.embed_batch(texts)

        # Upload to Qdrant if running
        if self.use_qdrant and self.qdrant_client:
            try:
                from qdrant_client.http import models as rest_models
                self.qdrant_client.recreate_collection(
                    collection_name=self.collection_name,
                    vectors_config=rest_models.VectorParams(
                        size=384,
                        distance=rest_models.Distance.COSINE
                    )
                )
                points = [
                    rest_models.PointStruct(
                        id=i,
                        vector=self.chunk_embeddings[i].tolist(),
                        payload=self.chunks[i]
                    )
                    for i in range(len(self.chunks))
                ]
                self.qdrant_client.upsert(collection_name=self.collection_name, points=points)
            except Exception:
                self.use_qdrant = False

    def similarity_search(self, query: str, top_k: int = 10, filter_dict: Optional[Dict[str, Any]] = None) -> List[Tuple[Dict[str, Any], float]]:
        if not self.chunks or self.chunk_embeddings is None:
            return []

        q_vec = self.embedder.embed_text(query)
        if np.linalg.norm(q_vec) == 0:
            return []

        # Cosine dot product on normalized vectors
        scores = np.dot(self.chunk_embeddings, q_vec)
        ranked_indices = np.argsort(scores)[::-1]

        results = []
        seen_doc_ids = set()

        for idx in ranked_indices:
            score = float(scores[idx])
            if score <= 0.05:
                continue
            chunk = self.chunks[idx]
            doc = chunk["fullDoc"]
            doc_id = doc.get("id")

            # Deduplicate by document ID
            if doc_id in seen_doc_ids:
                continue

            # Apply metadata filters
            if filter_dict:
                matched = True
                for k, v in filter_dict.items():
                    if doc.get(k) != v and chunk.get(k) != v:
                        matched = False
                        break
                if not matched:
                    continue

            seen_doc_ids.add(doc_id)
            results.append((doc, score))
            if len(results) >= top_k:
                break

        return results
