import re
import math
from typing import List, Dict, Any, Tuple

class LexicalIndex:
    """
    In-memory BM25 lexical search implementation for precise keyword retrieval
    over domain resources, incidents, problems, and concepts.
    """
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.documents: List[Dict[str, Any]] = []
        self.doc_lengths: List[int] = []
        self.avg_doc_len: float = 0.0
        self.doc_freqs: Dict[str, int] = {}
        self.term_freqs: List[Dict[str, int]] = []

    def _tokenize(self, text: str) -> List[str]:
        # Lowercase and split on non-alphanumeric characters, keeping identifiers like v1.4.2 intact
        clean_text = text.lower()
        tokens = re.findall(r'[a-z0-9_.\-]+', clean_text)
        return [t for t in tokens if len(t) > 1]

    def add_documents(self, docs: List[Dict[str, Any]]):
        self.documents = docs
        self.doc_lengths = []
        self.term_freqs = []
        self.doc_freqs = {}

        for doc in docs:
            text = f"{doc.get('title', '')} {doc.get('summary', '')} {doc.get('content', '')} {doc.get('explanation', '')} {doc.get('concept', '')}"
            tokens = self._tokenize(text)
            self.doc_lengths.append(len(tokens))
            
            tf: Dict[str, int] = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
            self.term_freqs.append(tf)

            for unique_t in tf.keys():
                self.doc_freqs[unique_t] = self.doc_freqs.get(unique_t, 0) + 1

        total_docs = len(self.documents)
        self.avg_doc_len = sum(self.doc_lengths) / max(total_docs, 1)

    def search(self, query: str, top_k: int = 10) -> List[Tuple[Dict[str, Any], float]]:
        tokens = self._tokenize(query)
        if not tokens or not self.documents:
            return []

        scores: List[float] = [0.0] * len(self.documents)
        n_docs = len(self.documents)

        for token in tokens:
            df = self.doc_freqs.get(token, 0)
            if df == 0:
                continue
            # Standard BM25 idf formula
            idf = math.log(1.0 + (n_docs - df + 0.5) / (df + 0.5))

            for idx, tf_dict in enumerate(self.term_freqs):
                tf = tf_dict.get(token, 0)
                if tf > 0:
                    doc_len = self.doc_lengths[idx]
                    denom = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / self.avg_doc_len))
                    score = idf * (tf * (self.k1 + 1.0)) / denom
                    scores[idx] += score

        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        results = []
        for idx, score in ranked[:top_k]:
            if score > 0:
                results.append((self.documents[idx], float(score)))
        return results
