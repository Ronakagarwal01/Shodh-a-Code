import os
import math
import re
from typing import List, Dict, Any, Tuple, Optional
import numpy as np

class VectorStore:
    """
    Production-friendly Vector Store that uses Qdrant if available,
    with an embedded in-memory vector store fallback.
    """
    def __init__(self, collection_name: str = "shodha_knowledge", host: str = "localhost", port: int = 6333):
        self.collection_name = collection_name
        self.host = host
        self.port = port
        self.qdrant_client = None
        self.use_qdrant = False
        
        # Embedded fallback state
        self.documents: List[Dict[str, Any]] = []
        self.embeddings: Optional[np.ndarray] = None
        self.vocab: Dict[str, int] = {}
        self.idf: Dict[int, float] = {}

        self._init_qdrant()

    def _init_qdrant(self):
        try:
            from qdrant_client import QdrantClient
            client = QdrantClient(host=self.host, port=self.port, timeout=2.0)
            # Ping check
            client.get_collections()
            self.qdrant_client = client
            self.use_qdrant = True
            print(f"[VectorStore] Connected successfully to Qdrant at {self.host}:{self.port}")
        except Exception:
            self.use_qdrant = False
            # print("[VectorStore] Qdrant offline or unreachable; using embedded vector store engine.")

    def _compute_embedding(self, text: str) -> np.ndarray:
        tokens = re.findall(r'[a-z0-9_.\-]+', text.lower())
        vec = np.zeros(max(len(self.vocab), 64), dtype=np.float32)
        for t in tokens:
            if t in self.vocab:
                idx = self.vocab[t]
                vec[idx] += self.idf.get(idx, 1.0)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec

    def index_documents(self, docs: List[Dict[str, Any]]):
        self.documents = docs
        
        # Build embedded vocabulary
        word_doc_counts: Dict[str, int] = {}
        all_tokens_per_doc = []
        for doc in docs:
            text = f"{doc.get('title', '')} {doc.get('summary', '')} {doc.get('content', '')} {doc.get('explanation', '')} {doc.get('concept', '')}"
            tokens = set(re.findall(r'[a-z0-9_.\-]+', text.lower()))
            all_tokens_per_doc.append(tokens)
            for t in tokens:
                word_doc_counts[t] = word_doc_counts.get(t, 0) + 1

        self.vocab = {w: i for i, w in enumerate(word_doc_counts.keys())}
        num_docs = len(docs)
        self.idf = {self.vocab[w]: math.log(1.0 + num_docs / count) for w, count in word_doc_counts.items()}

        vectors = []
        for doc in docs:
            text = f"{doc.get('title', '')} {doc.get('summary', '')} {doc.get('content', '')} {doc.get('explanation', '')}"
            vectors.append(self._compute_embedding(text))

        self.embeddings = np.array(vectors)

        # If Qdrant is connected, also create collection and upload points
        if self.use_qdrant and self.qdrant_client:
            try:
                from qdrant_client.http import models as rest_models
                self.qdrant_client.recreate_collection(
                    collection_name=self.collection_name,
                    vectors_config=rest_models.VectorParams(
                        size=self.embeddings.shape[1],
                        distance=rest_models.Distance.COSINE
                    )
                )
                points = [
                    rest_models.PointStruct(
                        id=i,
                        vector=self.embeddings[i].tolist(),
                        payload=self.documents[i]
                    )
                    for i in range(len(self.documents))
                ]
                self.qdrant_client.upsert(collection_name=self.collection_name, points=points)
            except Exception as e:
                # Fallback to embedded
                self.use_qdrant = False

    def similarity_search(self, query: str, top_k: int = 10, filter_dict: Optional[Dict[str, Any]] = None) -> List[Tuple[Dict[str, Any], float]]:
        if not self.documents or self.embeddings is None:
            return []

        q_vec = self._compute_embedding(query)
        if np.linalg.norm(q_vec) == 0:
            return []

        # Cosine similarity
        scores = np.dot(self.embeddings, q_vec)
        
        ranked_indices = np.argsort(scores)[::-1]
        results = []
        for idx in ranked_indices:
            score = float(scores[idx])
            if score <= 0.05:
                continue
            doc = self.documents[idx]
            
            # Apply filter if provided
            if filter_dict:
                matched = True
                for k, v in filter_dict.items():
                    if doc.get(k) != v:
                        matched = False
                        break
                if not matched:
                    continue

            results.append((doc, score))
            if len(results) >= top_k:
                break

        return results
