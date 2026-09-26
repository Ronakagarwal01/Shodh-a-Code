import heapq
from typing import List, Dict, Any, Tuple, Optional

class Reranker:
    """
    Candidate Evidence Reranker for Shodh-a-Code.
    Combines normalized lexical BM25 scores, dense semantic vector similarity,
    exact concept match bonuses, and temporal freshness adjustments.
    Uses bounded min-heap selection (O(C log k)) over candidate unions.
    Designed with a pluggable interface to support neural cross-encoders (e.g., ms-marco-MiniLM).
    """
    def __init__(
        self,
        lexical_weight: float = 0.45,
        vector_weight: float = 0.45,
        metadata_weight: float = 0.10,
        neural_cross_encoder: Optional[Any] = None
    ):
        self.lexical_weight = lexical_weight
        self.vector_weight = vector_weight
        self.metadata_weight = metadata_weight
        self.cross_encoder = neural_cross_encoder

    def rerank(
        self,
        lexical_candidates: List[Tuple[Dict[str, Any], float]],
        vector_candidates: List[Tuple[Dict[str, Any], float]],
        query: str,
        preferred_concepts: List[str] = None,
        top_k: int = 5
    ) -> List[Tuple[Dict[str, Any], float]]:
        preferred_concepts_set = set(preferred_concepts) if preferred_concepts else set()
        doc_map: Dict[str, Dict[str, Any]] = {}
        lexical_scores: Dict[str, float] = {}
        vector_scores: Dict[str, float] = {}

        # 1. Normalize lexical BM25 scores to [0, 1]
        max_lex = max([s for _, s in lexical_candidates], default=1.0)
        for doc, score in lexical_candidates:
            doc_id = doc.get("id", str(id(doc)))
            doc_map[doc_id] = doc
            lexical_scores[doc_id] = (score / max_lex) if max_lex > 0 else 0.0

        # 2. Normalize dense vector similarity scores to [0, 1]
        max_vec = max([s for _, s in vector_candidates], default=1.0)
        for doc, score in vector_candidates:
            doc_id = doc.get("id", str(id(doc)))
            doc_map[doc_id] = doc
            vector_scores[doc_id] = (score / max_vec) if max_vec > 0 else 0.0

        combined_ranked: List[Tuple[Dict[str, Any], float]] = []

        # 3. If a neural cross-encoder is plugged in, compute cross-attention scores
        if self.cross_encoder is not None:
            try:
                pairs = [[query, doc.get("summary", "") or doc.get("content", "")] for doc in doc_map.values()]
                ce_scores = self.cross_encoder.predict(pairs)
                for i, (doc_id, doc) in enumerate(doc_map.items()):
                    combined_ranked.append((doc, float(ce_scores[i])))
                return heapq.nlargest(top_k, combined_ranked, key=lambda x: x[1])
            except Exception:
                pass  # Fallback to multi-factor scoring

        # 4. Multi-factor weighted candidate scoring
        for doc_id, doc in doc_map.items():
            l_score = lexical_scores.get(doc_id, 0.0)
            v_score = vector_scores.get(doc_id, 0.0)

            # Metadata concept alignment boost
            m_score = 0.0
            doc_concept = doc.get("conceptId") or doc.get("concept")
            if doc_concept and doc_concept in preferred_concepts_set:
                m_score = 1.0

            # Freshness penalty / boost for incident records
            freshness_boost = 0.0
            if doc.get("version"):
                try:
                    ver_num = float(doc.get("version", "1.0").split(".")[0])
                    freshness_boost = min(ver_num * 0.02, 0.05)
                except Exception:
                    pass

            final_score = (
                (self.lexical_weight * l_score) +
                (self.vector_weight * v_score) +
                (self.metadata_weight * m_score) +
                freshness_boost
            )
            combined_ranked.append((doc, final_score))

        # Top-k selection in O(C log k)
        return heapq.nlargest(top_k, combined_ranked, key=lambda x: x[1])
