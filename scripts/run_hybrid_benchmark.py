import time
import os
import sys
import json

AI_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ai-service"))
sys.path.insert(0, AI_DIR)

from retrieval.hybrid import HybridRetriever
from graph.graph_rag import GraphRAG

def run_benchmark():
    print("=" * 80)
    print("SHODH-A-CODE — RETRIEVAL & GRAPHRAG EMPIRICAL BENCHMARK")
    print("=" * 80)

    retriever = HybridRetriever()
    graph_rag = GraphRAG()

    benchmark_queries = [
        {
            "query": "cgroup v2 memory accounting failure judge v1.4.2",
            "type": "Exact Version / Incident",
            "ground_truth": "incident-2026-03-24-01"
        },
        {
            "query": "binary search loop invariant off by one",
            "type": "Algorithmic Concept",
            "ground_truth": "res-binary-search-01"
        },
        {
            "query": "topological sort cycle detection course prerequisites",
            "type": "Graph & Dependencies",
            "ground_truth": "res-graphs-01"
        },
        {
            "query": "hash map complement lookup two sum",
            "type": "Data Structure Pattern",
            "ground_truth": "res-arrays-01"
        },
        {
            "query": "dynamic programming memoization coin change fewest coins",
            "type": "Optimization Concept",
            "ground_truth": "res-dp-01"
        }
    ]

    print(f"\n{'Query':<45} | {'BM25 Hit':<12} | {'Vector Hit':<12} | {'Hybrid Hit':<12} | {'Latency':<8}")
    print("-" * 100)

    results = []
    for item in benchmark_queries:
        q = item["query"]
        t0 = time.perf_counter()

        # BM25 Lexical
        bm25_hits = retriever.lexical_index.search(q, top_k=1)
        bm25_top = bm25_hits[0][0]["id"] if bm25_hits else "None"

        # Vector Dense
        vector_hits = retriever.vector_store.similarity_search(q, top_k=1)
        vector_top = vector_hits[0][0]["id"] if vector_hits else "None"

        # Hybrid with Reranking
        hybrid_hits = retriever.retrieve(q, top_k=1)
        hybrid_top = hybrid_hits[0].id if hybrid_hits else "None"

        latency_ms = round((time.perf_counter() - t0) * 1000, 2)

        print(f"{q[:43]:<45} | {bm25_top[:12]:<12} | {vector_top[:12]:<12} | {hybrid_top[:12]:<12} | {latency_ms}ms")
        results.append({
            "query": q,
            "category": item["type"],
            "bm25_top": bm25_top,
            "vector_top": vector_top,
            "hybrid_top": hybrid_top,
            "latency_ms": latency_ms,
            "matched_ground_truth": hybrid_top == item["ground_truth"]
        })

    print("-" * 100)
    print("\n[Multi-Hop GraphRAG Traversal Benchmark]")
    t0 = time.perf_counter()
    gaps = graph_rag.find_shared_prerequisite_gaps()
    graph_lat_ms = round((time.perf_counter() - t0) * 1000, 2)
    print(f"Discovered {len(gaps)} multi-hop learner correlations across graph in {graph_lat_ms}ms.")
    if gaps:
        print(f"Sample multi-hop traversal:\n  {gaps[0]['graphPath']}")
        print(f"Shared foundational prerequisite: {gaps[0]['sharedPrerequisite']['name']}")

    # Save summary artifact
    out_file = os.path.join(os.path.dirname(__file__), "..", "docs", "retrieval_benchmark_results.json")
    with open(out_file, "w") as f:
        json.dump({"queries": results, "multi_hop_gaps_count": len(gaps), "graph_latency_ms": graph_lat_ms}, f, indent=2)
    print(f"\n[Saved benchmark results to {out_file}]")

if __name__ == "__main__":
    run_benchmark()
