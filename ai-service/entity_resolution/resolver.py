import re
from typing import List, Dict, Any, Optional, Tuple
from data.seed_knowledge import USERS_SEED

class EntityResolver:
    """
    Entity Resolution layer that handles exact matching, normalized matching,
    alias resolution, confidence scoring, and ambiguity detection with O(1) avg lookup.
    """
    def __init__(self, users: List[Dict[str, Any]] = None):
        self.users = users or USERS_SEED
        # Precomputed hash indexes for O(1) lookups:
        self._id_index: Dict[str, Dict[str, Any]] = {}
        self._username_index: Dict[str, Dict[str, Any]] = {}
        self._display_name_index: Dict[str, List[Dict[str, Any]]] = {}
        self._alias_index: Dict[str, List[Dict[str, Any]]] = {}
        self._first_name_index: Dict[str, List[Tuple[Dict[str, Any], str]]] = {}

        self._build_indexes()

    def _normalize(self, text: str) -> str:
        # Lowercase, remove punctuation, strip excess spaces
        text = text.lower()
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        return ' '.join(text.split())

    def _build_indexes(self):
        """Builds normalized hash indexes in O(U) preprocessing time."""
        for user in self.users:
            u_id = user["id"]
            username_norm = user["username"].lower()
            display_name = user["displayName"]
            norm_display = self._normalize(display_name)

            self._id_index[u_id] = user
            self._username_index[username_norm] = user

            # Display name index (support both raw lower and normalized)
            for k in (display_name.lower(), norm_display):
                if k not in self._display_name_index:
                    self._display_name_index[k] = []
                if user not in self._display_name_index[k]:
                    self._display_name_index[k].append(user)

            # Alias index
            for alias in user.get("aliases", []):
                for k in (alias.lower(), self._normalize(alias)):
                    if k not in self._alias_index:
                        self._alias_index[k] = []
                    if user not in self._alias_index[k]:
                        self._alias_index[k].append(user)

            # First name index for fast candidate generation
            first_name = norm_display.split()[0] if norm_display.split() else ""
            if first_name:
                if first_name not in self._first_name_index:
                    self._first_name_index[first_name] = []
                self._first_name_index[first_name].append((user, norm_display))

    def resolve_user(self, query: str) -> Dict[str, Any]:
        """
        Resolves a user entity from raw text queries in O(1) average time.
        """
        clean_query = query.strip()
        norm_query = self._normalize(clean_query)

        # 1. Exact ID match (1.0) - O(1)
        if clean_query in self._id_index:
            return {
                "matched": True,
                "user": self._id_index[clean_query],
                "confidence": 1.0,
                "matchType": "EXACT_ID",
                "ambiguous": False
            }

        candidates: List[Tuple[Dict[str, Any], float, str]] = []
        seen_user_ids = set()

        # 2. Exact username match (1.0) - O(1)
        q_lower = clean_query.lower()
        if q_lower in self._username_index:
            u = self._username_index[q_lower]
            candidates.append((u, 1.0, "EXACT_USERNAME"))
            seen_user_ids.add(u["id"])

        # 3. Exact display name match (0.95) - O(1)
        dn_matches = self._display_name_index.get(q_lower, []) or self._display_name_index.get(norm_query, [])
        for u in dn_matches:
            if u["id"] not in seen_user_ids:
                candidates.append((u, 0.95, "EXACT_DISPLAY_NAME"))
                seen_user_ids.add(u["id"])

        # 4. Alias match (0.90) - O(1)
        alias_matches = self._alias_index.get(q_lower, []) or self._alias_index.get(norm_query, [])
        for u in alias_matches:
            if u["id"] not in seen_user_ids:
                candidates.append((u, 0.90, "ALIAS_MATCH"))
                seen_user_ids.add(u["id"])

        # 5. Substring / Prefix match using bounded first-name candidate set
        query_first = norm_query.split()[0] if norm_query.split() else ""
        if query_first and query_first in self._first_name_index:
            for user, norm_display in self._first_name_index[query_first]:
                if user["id"] in seen_user_ids:
                    continue
                # Check for initial
                if len(norm_query.split()) > 1 and len(norm_display.split()) > 1:
                    q_last = norm_query.split()[-1]
                    d_last = norm_display.split()[-1]
                    if d_last.startswith(q_last[0]):
                        candidates.append((user, 0.85, "NAME_INITIAL_MATCH"))
                        seen_user_ids.add(user["id"])
                        continue
                candidates.append((user, 0.70, "FIRST_NAME_ONLY"))
                seen_user_ids.add(user["id"])

        if not candidates:
            return {
                "matched": False,
                "user": None,
                "confidence": 0.0,
                "matchType": "NONE",
                "ambiguous": False
            }

        # Sort candidate set by confidence descending (small bounded set of candidates)
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
