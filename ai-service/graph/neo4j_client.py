import os
from typing import List, Dict, Any, Optional

class GraphStore:
    """
    Graph Store supporting Neo4j Cypher execution with an in-memory
    graph database fallback when Neo4j is offline.
    """
    def __init__(self, uri: str = "bolt://localhost:7687", user: str = "neo4j", password: str = "shodha_graph_pass_2026"):
        self.uri = uri
        self.user = user
        self.password = password
        self.driver = None
        self.use_neo4j = False

        # Embedded graph representation: Nodes by label & id, edges by relationship type
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.edges: List[Dict[str, Any]] = []

        self._init_neo4j()

    def _init_neo4j(self):
        try:
            from neo4j import GraphDatabase
            driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password), connection_timeout=2.0)
            driver.verify_connectivity()
            self.driver = driver
            self.use_neo4j = True
            print(f"[GraphStore] Connected successfully to Neo4j at {self.uri}")
        except Exception:
            self.use_neo4j = False
            # print("[GraphStore] Neo4j offline or unreachable; using embedded knowledge graph engine.")

    def add_node(self, node_id: str, label: str, properties: Dict[str, Any]):
        self.nodes[node_id] = {
            "id": node_id,
            "label": label,
            "properties": properties
        }

    def add_edge(self, source_id: str, rel_type: str, target_id: str, properties: Dict[str, Any] = None):
        self.edges.append({
            "source": source_id,
            "type": rel_type,
            "target": target_id,
            "properties": properties or {}
        })

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        return self.nodes.get(node_id)

    def find_outgoing(self, source_id: str, rel_type: Optional[str] = None) -> List[Dict[str, Any]]:
        results = []
        for edge in self.edges:
            if edge["source"] == source_id:
                if rel_type is None or edge["type"] == rel_type:
                    target_node = self.nodes.get(edge["target"])
                    if target_node:
                        results.append({"edge": edge, "target": target_node})
        return results

    def find_incoming(self, target_id: str, rel_type: Optional[str] = None) -> List[Dict[str, Any]]:
        results = []
        for edge in self.edges:
            if edge["target"] == target_id:
                if rel_type is None or edge["type"] == rel_type:
                    source_node = self.nodes.get(edge["source"])
                    if source_node:
                        results.append({"edge": edge, "source": source_node})
        return results
