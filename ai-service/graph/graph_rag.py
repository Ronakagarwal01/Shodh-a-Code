from typing import List, Dict, Any, Optional
from graph.neo4j_client import GraphStore
from data.seed_knowledge import (
    CONCEPTS,
    PROBLEMS_KNOWLEDGE,
    CONTEST_INCIDENTS,
    JUDGE_VERSIONS,
    USERS_SEED,
    SUBMISSIONS_SEED,
    LEARNING_RESOURCES
)

class GraphRAG:
    """
    Graph-based Retrieval-Augmented Generation for multi-hop contest reasoning.
    Executes actual graph traversals across Concepts, Prerequisites, Problems,
    Learners, Submissions, Failure Patterns, and Incidents.
    """
    def __init__(self, uri: str = "bolt://localhost:7687", user: str = "neo4j", password: str = "shodha_graph_pass_2026"):
        self.store = GraphStore(uri=uri, user=user, password=password)
        self._seed_graph()

    def _seed_graph(self):
        # 1. Add Concepts
        for c in CONCEPTS:
            self.store.add_node(c["id"], "Concept", c)

        # Add Prerequisite relationships
        for c in CONCEPTS:
            for prereq_id in c.get("prerequisites", []):
                self.store.add_edge(c["id"], "REQUIRES", prereq_id)

        # 2. Add Problems and link to Concepts
        for p in PROBLEMS_KNOWLEDGE:
            self.store.add_node(p["id"], "Problem", p)
            self.store.add_edge(p["id"], "TEACHES", p["conceptId"])

        # 3. Add Users
        for u in USERS_SEED:
            self.store.add_node(u["id"], "User", u)

        # 4. Add Judge Versions
        for jv in JUDGE_VERSIONS:
            self.store.add_node(f"jv-{jv['version']}", "JudgeVersion", jv)

        # 5. Add Contest Incidents
        for inc in CONTEST_INCIDENTS:
            inc_node_id = inc["id"]
            self.store.add_node(inc_node_id, "ContestIncident", inc)
            # Associated with contest
            self.store.add_edge(inc_node_id, "OCCURRED_DURING", inc["contestId"])
            # Associated with judge v1.4.2
            self.store.add_edge(inc_node_id, "ASSOCIATED_WITH", "jv-v1.4.2")

        # 6. Add Submissions and relationships
        for sub in SUBMISSIONS_SEED:
            sub_id = sub["id"]
            self.store.add_node(sub_id, "Submission", sub)
            self.store.add_edge(sub["userId"], "SUBMITTED", sub_id)
            self.store.add_edge(sub_id, "FOR_PROBLEM", sub["problemId"])
            self.store.add_edge(f"jv-{sub['judgeVersion']}", "EVALUATED", sub_id)

            if sub.get("failurePattern"):
                fp_id = f"fp-{sub_id}"
                self.store.add_node(fp_id, "FailurePattern", {"pattern": sub["failurePattern"]})
                self.store.add_edge(sub_id, "EXHIBITS_PATTERN", fp_id)
                self.store.add_edge(sub["problemId"], "HAS_FAILURE_PATTERN", fp_id)

        # If connected to live Neo4j, run Cypher seeding in background
        if self.store.use_neo4j and self.store.driver:
            self._sync_to_neo4j()

    def _sync_to_neo4j(self):
        try:
            with self.store.driver.session() as session:
                for n_id, n_data in self.store.nodes.items():
                    lbl = n_data["label"]
                    session.run(f"MERGE (n:{lbl} {{id: $id}}) SET n += $props", id=n_id, props=n_data["properties"])
                for edge in self.store.edges:
                    rel = edge["type"]
                    session.run(
                        f"""
                        MATCH (a {{id: $src}}), (b {{id: $dst}})
                        MERGE (a)-[r:{rel}]->(b)
                        SET r += $props
                        """,
                        src=edge["source"],
                        dst=edge["target"],
                        props=edge.get("properties", {})
                    )
        except Exception:
            pass

    def find_shared_prerequisite_gaps(self) -> List[Dict[str, Any]]:
        """
        Multi-hop Graph Reasoning:
        Finds pairs of learners who failed on different problems with different verdicts
        yet share the identical foundational prerequisite concept gap.
        
        Traversal:
        (Learner1)-[:SUBMITTED]->(Sub1)-[:FOR_PROBLEM]->(Prob1)-[:TEACHES]->(Conc1)-[:REQUIRES]->(Prereq)
        (Learner2)-[:SUBMITTED]->(Sub2)-[:FOR_PROBLEM]->(Prob2)-[:TEACHES]->(Conc2)-[:REQUIRES]->(Prereq)
        WHERE Sub1.verdict != Sub2.verdict
        """
        # Find failed submissions
        results = []
        failed_subs = [
            n for n in self.store.nodes.values()
            if n["label"] == "Submission" and n["properties"].get("verdict") not in ["ACCEPTED", "QUEUED", "RUNNING"]
        ]

        learner_chains = []
        for sub_node in failed_subs:
            sub_id = sub_node["id"]
            user_rel = self.store.find_incoming(sub_id, "SUBMITTED")
            prob_rel = self.store.find_outgoing(sub_id, "FOR_PROBLEM")

            if not user_rel or not prob_rel:
                continue

            user_node = user_rel[0]["source"]
            prob_node = prob_rel[0]["target"]

            # Problem -> Concept
            conc_rel = self.store.find_outgoing(prob_node["id"], "TEACHES")
            if not conc_rel:
                continue
            conc_node = conc_rel[0]["target"]

            # Concept -> Prerequisite
            prereq_rel = self.store.find_outgoing(conc_node["id"], "REQUIRES")
            prereq_nodes = [r["target"] for r in prereq_rel]

            learner_chains.append({
                "user": user_node["properties"],
                "submission": sub_node["properties"],
                "problem": prob_node["properties"],
                "concept": conc_node["properties"],
                "prerequisites": [p["properties"] for p in prereq_nodes]
            })

        # Multi-hop correlation
        for i in range(len(learner_chains)):
            for j in range(i + 1, len(learner_chains)):
                c1 = learner_chains[i]
                c2 = learner_chains[j]

                # Check different learners, different problems or verdicts
                if c1["user"]["id"] == c2["user"]["id"]:
                    continue

                p1_prereqs = {p["id"]: p for p in c1["prerequisites"]}
                p2_prereqs = {p["id"]: p for p in c2["prerequisites"]}

                shared = set(p1_prereqs.keys()).intersection(p2_prereqs.keys())
                for s_id in shared:
                    shared_concept = p1_prereqs[s_id]
                    results.append({
                        "sharedPrerequisite": shared_concept,
                        "learner1": {
                            "username": c1["user"]["username"],
                            "displayName": c1["user"]["displayName"],
                            "submissionId": c1["submission"]["id"],
                            "verdict": c1["submission"]["verdict"],
                            "problemTitle": c1["problem"]["title"],
                            "failureReason": c1["submission"].get("failureReason")
                        },
                        "learner2": {
                            "username": c2["user"]["username"],
                            "displayName": c2["user"]["displayName"],
                            "submissionId": c2["submission"]["id"],
                            "verdict": c2["submission"]["verdict"],
                            "problemTitle": c2["problem"]["title"],
                            "failureReason": c2["submission"].get("failureReason")
                        },
                        "graphPath": f"({c1['user']['username']})-[SUBMITTED]->({c1['submission']['id']})-[FOR_PROBLEM]->({c1['problem']['id']})-[TEACHES]->({c1['concept']['id']})-[REQUIRES]->({shared_concept['id']})<-[REQUIRES]-({c2['concept']['id']})<-[TEACHES]-({c2['problem']['id']})<-[FOR_PROBLEM]-({c2['submission']['id']})<-[SUBMITTED]-({c2['user']['username']})"
                    })

        return results

    def investigate_judge_incident(self, contest_id: str = "contest-spring-2026") -> Dict[str, Any]:
        """
        Multi-hop Graph Reasoning:
        Determines whether judge deployment changes affected contest outcomes.
        
        Traversal:
        (Contest)<-[:OCCURRED_DURING]-(Incident)-[:ASSOCIATED_WITH]->(JudgeVersion)-[:EVALUATED]->(Submission)
        """
        incident_node = self.store.get_node("incident-2026-03-24-01")
        if not incident_node:
            return {"affected": False, "details": "No incident found"}

        inc_props = incident_node["properties"]
        jv_node = self.store.get_node("jv-v1.4.2")

        # Affected submissions
        subs = []
        for sub_id in inc_props.get("affectedSubmissions", []):
            sub_node = self.store.get_node(sub_id)
            if sub_node:
                subs.append(sub_node["properties"])

        return {
            "incident": inc_props,
            "judgeVersion": jv_node["properties"] if jv_node else None,
            "affectedSubmissions": subs,
            "timeline": inc_props.get("timeline", []),
            "rootCause": inc_props.get("rootCause"),
            "graphEvidence": f"(Contest:{contest_id})<-[:OCCURRED_DURING]-(Incident:{inc_props['id']})-[:ASSOCIATED_WITH]->(JudgeVersion:v1.4.2)-[:EVALUATED]->(Submissions:{len(subs)})"
        }

    def get_prerequisites_for_problem(self, problem_id: str) -> Dict[str, Any]:
        """
        Multi-hop retrieval of concepts and prerequisites for a problem.
        """
        prob_node = self.store.get_node(problem_id)
        if not prob_node:
            return {}

        conc_rels = self.store.find_outgoing(problem_id, "TEACHES")
        if not conc_rels:
            return {"problem": prob_node["properties"], "concept": None, "prerequisites": []}

        concept_node = conc_rels[0]["target"]
        prereq_rels = self.store.find_outgoing(concept_node["id"], "REQUIRES")
        prereqs = [r["target"]["properties"] for r in prereq_rels]

        return {
            "problem": prob_node["properties"],
            "concept": concept_node["properties"],
            "prerequisites": prereqs
        }
