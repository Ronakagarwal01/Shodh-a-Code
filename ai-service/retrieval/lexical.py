import re
import math
import heapq
from typing import List, Dict, Any, Tuple

class LexicalIndex:
    """
    High-performance in-memory BM25 lexical search using inverted index (postings lists)
    and heap-based top-k selection to achieve sub-millisecond sparse retrieval.
    """
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.documents: List[Dict[str, Any]] = []
        self.doc_lengths: List[int] = []
        self.avg_doc_len: float = 0.0
        # Inverted index: term -> list of (doc_index, term_frequency)
        self.postings: Dict[str, List[Tuple[int, int]]] = {}

    def _tokenize(self, text: str) -> List[str]:
        # Lowercase and split on non-alphanumeric characters, keeping identifiers like v1.4.2 intact
        clean_text = text.lower()
        tokens = re.findall(r'[a-z0-9_.\-]+', clean_text)
        return [t for t in tokens if len(t) > 1]

    def add_documents(self, docs: List[Dict[str, Any]]):
        """Builds document index and inverted postings in O(TotalTokens) linear time."""
        self.documents = docs
        self.doc_lengths = []
        self.postings = {}

        for doc_idx, doc in enumerate(docs):
            text = f"{doc.get('title', '')} {doc.get('summary', '')} {doc.get('content', '')} {doc.get('explanation', '')} {doc.get('concept', '')}"
            tokens = self._tokenize(text)
            self.doc_lengths.append(len(tokens))

            # Count term frequencies for this document
            tf: Dict[str, int] = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1

            # Populate inverted postings index
            for term, count in tf.items():
                if term not in self.postings:
                    self.postings[term] = []
                self.postings[term].append((doc_idx, count))

        total_docs = len(self.documents)
        self.avg_doc_len = sum(self.doc_lengths) / max(total_docs, 1)

    def search(self, query: str, top_k: int = 10) -> List[Tuple[Dict[str, Any], float]]:
        """
        Retrieves top-k documents in O(sum(DF(token)) + M log k) time rather than O(N * |query| + N log N).
        """
        tokens = self._tokenize(query)
        if not tokens or not self.documents:
            return []

        sparse_scores: Dict[int, float] = {}
        n_docs = len(self.documents)

        # Iterate over unique query tokens
        unique_tokens = set(tokens)
        for token in unique_tokens:
            postings = self.postings.get(token)
            if not postings:
                continue

            df = len(postings)
            idf = math.log(1.0 + (n_docs - df + 0.5) / (df + 0.5))

            # Only accumulate scores for documents that actually contain the token
            for doc_idx, tf in postings:
                doc_len = self.doc_lengths[doc_idx]
                denom = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / self.avg_doc_len))
                score = idf * (tf * (self.k1 + 1.0)) / denom
                sparse_scores[doc_idx] = sparse_scores.get(doc_idx, 0.0) + score

        if not sparse_scores:
            return []

        # Heap selection for top-k in O(M log k) rather than sorting entire dataset in O(M log M)
        top_candidates = heapq.nlargest(top_k, sparse_scores.items(), key=lambda x: x[1])
        return [(self.documents[doc_idx], float(score)) for doc_idx, score in top_candidates if score > 0]
