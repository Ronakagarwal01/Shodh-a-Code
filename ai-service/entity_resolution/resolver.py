import re
from typing import List, Dict, Any, Optional, Tuple
from data.seed_knowledge import USERS_SEED

class EntityResolver:
    """
    Entity Resolution layer that handles exact matching, normalized matching,
    alias resolution, confidence scoring, and ambiguity detection.
    """
    def __init__(self, users: List[Dict[str, Any]] = None):
        self.users = users or USERS_SEED

    def _normalize(self, text: str) -> str:
        # Lowercase, remove punctuation, strip excess spaces
        text = text.lower()
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        return ' '.join(text.split())

    def resolve_user(self, query: str) -> Dict[str, Any]:
        """
        Resolves a user entity from raw text queries like:
        "Ronak Agarwal", "ronak", "Ronak A.", "ronak_01"
        Returns resolved entity with confidence and ambiguity notice if uncertain.
        """
        clean_query = query.strip()
        norm_query = self._normalize(clean_query)
        candidates: List[Tuple[Dict[str, Any], float, str]] = []

        for user in self.users:
            u_id = user["id"]
            username = user["username"].lower()
            display_name = user["displayName"].lower()
            norm_display = self._normalize(display_name)
            aliases = [a.lower() for a in user.get("aliases", [])]

            # 1. Exact ID match (1.0)
            if clean_query == u_id:
                return {
                    "matched": True,
                    "user": user,
                    "confidence": 1.0,
                    "matchType": "EXACT_ID",
                    "ambiguous": False
                }

            # 2. Exact username match (1.0)
            if clean_query.lower() == username:
                candidates.append((user, 1.0, "EXACT_USERNAME"))
                continue

            # 3. Exact display name match (0.95)
            if clean_query.lower() == display_name or norm_query == norm_display:
                candidates.append((user, 0.95, "EXACT_DISPLAY_NAME"))
                continue

            # 4. Alias match (0.90)
            for alias in aliases:
                if clean_query.lower() == alias or norm_query == self._normalize(alias):
                    candidates.append((user, 0.90, "ALIAS_MATCH"))
                    break

            # 5. Substring / Prefix match (e.g. "Ronak A." matching "Ronak Agarwal")
            first_name = norm_display.split()[0] if norm_display.split() else ""
            query_first = norm_query.split()[0] if norm_query.split() else ""
            if query_first and query_first == first_name:
                # Check for initial
                if len(norm_query.split()) > 1 and len(norm_display.split()) > 1:
                    q_last = norm_query.split()[-1]
                    d_last = norm_display.split()[-1]
                    if d_last.startswith(q_last[0]):
                        candidates.append((user, 0.85, "NAME_INITIAL_MATCH"))
                        continue
                candidates.append((user, 0.70, "FIRST_NAME_ONLY"))

        if not candidates:
            return {
                "matched": False,
                "user": None,
                "confidence": 0.0,
                "matchType": "NONE",
                "ambiguous": False
            }

        # Sort by confidence descending
        candidates.sort(key=lambda x: x[1], reverse=True)

        # Check for ambiguity (multiple users with same high confidence)
        if len(candidates) > 1 and (candidates[0][1] - candidates[1][1] < 0.15):
            return {
                "matched": True,
                "user": candidates[0][0],
                "confidence": round(candidates[0][1], 2),
                "matchType": candidates[0][2],
                "ambiguous": True,
                "clarificationPrompt": f"Query '{query}' matched multiple learners: {candidates[0][0]['displayName']} and {candidates[1][0]['displayName']}. Please specify username or full name."
            }

        return {
            "matched": True,
            "user": candidates[0][0],
            "confidence": round(candidates[0][1], 2),
            "matchType": candidates[0][2],
            "ambiguous": False
        }
