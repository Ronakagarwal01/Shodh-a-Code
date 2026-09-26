from typing import List, Dict, Any, Tuple
import datetime

class Reranker:
    """
    Reranks candidate evidence items by combining normalized lexical BM25 score,
    semantic vector similarity, concept alignment, and temporal freshness.
    """
    def __init__(self, lexical_weight: float = 0.45, vector_weight: float = 0.45, metadata_weight: float = 0.10):
        self.lexical_weight = lexical_weight
        self.vector_weight = vector_weight
        self.metadata_weight = metadata_weight

    def rerank(
        self,
        lexical_candidates: List[Tuple[Dict[str, Any], float]],
        vector_candidates: List[Tuple[Dict[str, Any], float]],
        query: str,
        preferred_concepts: List[str] = None,
        top_k: int = 5
    ) -> List[Tuple[Dict[str, Any], float]]:
        preferred_concepts = preferred_concepts or []
        doc_map: Dict[str, Dict[str, Any]] = {}
        lexical_scores: Dict[str, float] = {}
        vector_scores: Dict[str, float] = {}

        # Normalize lexical scores to [0, 1]
        max_lex = max([s for _, s in lexical_candidates], default=1.0)
        for doc, score in lexical_candidates:
            doc_id = doc.get("id", str(id(doc)))
            doc_map[doc_id] = doc
            lexical_scores[doc_id] = (score / max_lex) if max_lex > 0 else 0.0

        # Normalize vector scores to [0, 1]
        max_vec = max([s for _, s in vector_candidates], default=1.0)
        for doc, score in vector_candidates:
            doc_id = doc.get("id", str(id(doc)))
            doc_map[doc_id] = doc
            vector_scores[doc_id] = (score / max_vec) if max_vec > 0 else 0.0

        combined_ranked: List[Tuple[Dict[str, Any], float]] = []

        for doc_id, doc in doc_map.items():
            l_score = lexical_scores.get(doc_id, 0.0)
            v_score = vector_scores.get(doc_id, 0.0)

            # Metadata alignment boost (if concept matches user's current problem/failure)
            m_score = 0.0
            doc_concept = doc.get("conceptId") or doc.get("concept")
            if doc_concept and doc_concept in preferred_concepts:
                m_score = 1.0

            # Freshness penalty / boost for incident records
            freshness_boost = 0.0
            if doc.get("version"):
                try:
                    # Give slight priority to newer versions
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

        combined_ranked.sort(key=lambda x: x[1], reverse=True)
        return combined_ranked[:top_k]
