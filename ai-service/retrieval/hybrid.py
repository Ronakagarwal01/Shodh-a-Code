from typing import List, Dict, Any, Optional
from models.schemas import EvidenceItem, ConfidenceLevel
from retrieval.lexical import LexicalIndex
from retrieval.vector_store import VectorStore
from retrieval.reranker import Reranker
from data.seed_knowledge import LEARNING_RESOURCES, PROBLEMS_KNOWLEDGE, CONTEST_INCIDENTS

class HybridRetriever:
    """
    Orchestrates Lexical (BM25) + Vector (Qdrant/Embedded) + Metadata Filtering + Reranking.
    Returns typed EvidenceItems with strict source metadata.
    """
    def __init__(self, vector_host: str = "localhost", vector_port: int = 6333):
        self.lexical_index = LexicalIndex()
        self.vector_store = VectorStore(host=vector_host, port=vector_port)
        self.reranker = Reranker()
        self._init_corpus()

    def _init_corpus(self):
        docs: List[Dict[str, Any]] = []

        # 1. Learning resources
        for r in LEARNING_RESOURCES:
            docs.append({
                "id": r["id"],
                "type": "LEARNING_MATERIAL",
                "title": r["title"],
                "conceptId": r["conceptId"],
                "summary": r["summary"],
                "content": r["content"],
                "version": r.get("version", "1.0"),
                "url": r.get("url", "")
            })

        # 2. Problem knowledge & common failure patterns
        for p in PROBLEMS_KNOWLEDGE:
            docs.append({
                "id": p["id"],
                "type": "PROBLEM",
                "title": f"Problem Knowledge: {p['title']}",
                "conceptId": p["conceptId"],
                "summary": p["explanation"],
                "content": "Failure patterns: " + "; ".join(p.get("commonFailurePatterns", [])),
                "version": "1.0"
            })

        # 3. Contest incidents & post-mortems
        for inc in CONTEST_INCIDENTS:
            timeline_str = " -> ".join([f"[{t['timestamp']}] {t['event']}: {t['details']}" for t in inc.get("timeline", [])])
            docs.append({
                "id": inc["id"],
                "type": "INCIDENT",
                "title": f"Incident: {inc['title']}",
                "summary": inc["summary"],
                "content": f"{inc['summary']} Timeline: {timeline_str}. Root Cause: {inc.get('rootCause', '')}",
                "version": "2.0",
                "contestId": inc["contestId"]
            })

        self.lexical_index.add_documents(docs)
        self.vector_store.index_documents(docs)

    def retrieve(
        self,
        query: str,
        preferred_concepts: List[str] = None,
        filter_dict: Optional[Dict[str, Any]] = None,
        top_k: int = 5
    ) -> List[EvidenceItem]:
        # 1. Lexical retrieval
        lexical_hits = self.lexical_index.search(query, top_k=top_k * 2)

        # 2. Vector retrieval
        vector_hits = self.vector_store.similarity_search(query, top_k=top_k * 2, filter_dict=filter_dict)

        # 3. Rerank
        reranked = self.reranker.rerank(
            lexical_candidates=lexical_hits,
            vector_candidates=vector_hits,
            query=query,
            preferred_concepts=preferred_concepts,
            top_k=top_k
        )

        # 4. Map to EvidenceItem
        evidence_items: List[EvidenceItem] = []
        for doc, score in reranked:
            conf: ConfidenceLevel = "HIGH" if score > 0.6 else ("MEDIUM" if score > 0.3 else "LOW")
            snippet = doc.get("summary") or doc.get("content", "")
            if len(snippet) > 250:
                snippet = snippet[:247] + "..."

            evidence_items.append(EvidenceItem(
                id=doc["id"],
                type=doc.get("type", "LEARNING_MATERIAL"),
                title=doc.get("title", "Reference Material"),
                source=f"KnowledgeBase::{doc.get('type')}::{doc['id']}",
                snippet=snippet,
                metadata={
                    "conceptId": doc.get("conceptId"),
                    "version": doc.get("version"),
                    "url": doc.get("url"),
                    "score": round(score, 3)
                },
                confidence=conf,
                isStale=False
            ))

        return evidence_items
