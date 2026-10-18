# Academic & Technical References

Papers and sources that validate the JiMesh/DSH architecture decisions.

---

## 1. Multi-Agent Orchestration & MoE

### Mixture-of-Agents (MoA)
- **Paper**: "Mixture-of-Agents Enhances Large Language Model Capabilities" (Wang et al., arXiv:2406.04692)
- **Relevance**: Proves that layered aggregation of small open-source models can outperform single proprietary monoliths (GPT-4). Models inherently benefit from intermediate results of other models.
- **Used in**: R6 (MoE agents), Sprint 14 WP2 (parallel mode + LLM synthesis aggregation)
- https://arxiv.org/abs/2406.04692

### Enterprise Orchestration
- **Paper**: "The Orchestration of Multi-Agent Systems: Architectures, Protocols, and Observability" (arXiv:2601.13671)
- **Relevance**: Formal framework for state-based agent communication. Compares MCP (Model Context Protocol) with dedicated agent-to-agent systems.
- **Used in**: R5 (framework comparison), R7 (DSH plugin architecture)
- https://arxiv.org/html/2601.13671v1

### Deterministic SLA Guarantees
- **Paper**: "Multi-Agent LLM Orchestration Achieves Deterministic, High-Quality Recommendation Rate" (arXiv:2511.15755)
- **Relevance**: Proves structured multi-agent pipelines achieve zero-variance compared to single agents — prerequisite for production SLA commitments.
- **Used in**: Sprint 13 WP3 (role-based mesh routes), Sprint 14 WP2 (execution engine)
- https://arxiv.org/html/2511.15755v1

---

## 2. Advanced Inferences: Speculative Decoding & Entropy Routing

### Speculative Decoding
- **Paper**: "Fast Inference from Transformers via Speculative Decoding" (Leviathan et al., Google, arXiv:2211.17192)
- **Relevance**: Proves a smaller draft model can propose token sequences that a target model verifies in one parallel forward pass. 2-3x speedup with zero quality loss.
- **Extensions**: EAGLE (feature-based prediction), Medusa
- **Used in**: R8 (speculative decoding config — skipped for cloud-only, but schema documented)
- https://arxiv.org/abs/2211.17192

### Entropy-Based Routing
- **Paper**: "When Do LLMs Reason? A Dynamical Systems View via Early-Stage Entropy Dynamics" (arXiv:2605.22873)
- **Relevance**: Introduces EDRM (Entropy Dynamics-based Reasoning Manifold). Proves Shannon entropy of first token generations is a reliable indicator for whether a prompt requires reasoning (high initial entropy) or can be fast-tracked.
- **Practice**: Confidence-Based Routing (Sawant, 2026) — measuring avg entropy over first 20-50 tokens for model pool control.
- **Used in**: R4 (entropy routing), Sprint 13 WP1 (entropy routing engine — IMPLEMENTED)
- https://arxiv.org/html/2605.22873v2
- https://medium.com/@udayansawant/confidence-based-routing-in-llm-systems-629aa5564567

---

## 3. Latent Space Planning & Low-Level Control

### Hierarchical Planning
- **Paper**: "Hierarchical Planning with Latent World Models (HWM)" (arXiv:2604.03208)
- **Relevance**: Describes hierarchical systems operating across temporal and logical scales in a shared continuous latent space. Long-term goals compressed into macro-latent actions, executed by fast low-level planners via MPC.
- **Used in**: R8 (latent space / HRL concept — DSH high-level → JiMesh Go low-level)
- https://arxiv.org/html/2604.03208v2

### NVIDIA Cosmos
- **Doc**: "Cosmos 3: Omnimodal World Models for Physical AI" (NVIDIA Cosmos Lab, 2026)
- **Relevance**: Mixture-of-Transformers architecture compressing language, video, audio, and action sequences into unified semantic tokens via causal Wavelet tokenizer.
- https://research.nvidia.com/labs/cosmos-lab/cosmos3/technical-report.pdf

---

## 4. NVIDIA NIM & Reasoning Engine

### NIM Reasoning Models
- **Docs**: NVIDIA NIM Large Language Models reasoning-model documentation
- **Relevance**: How NVIDIA's reasoning engine decides whether a task goes to the reasoning model. Entropy-based vs rule-based thresholds.
- **Used in**: R4 (Nemotron instruct principle)
- https://docs.nvidia.com/nim/large-language-models/1.8.0/reasoning-model.html
- https://docs.nvidia.com/nim/large-language-models/1.12.0/reasoning-model.html

### AI Router Concepts
- **Source**: InWorld AI — "What is an AI Router"
- **Relevance**: General AI routing principles, model selection based on task type.
- https://inworld.ai/resources/what-is-an-ai-router

---

## 5. Framework Comparisons

### CrewAI vs LangGraph vs AutoGen
- **Source**: N-iX — "LangGraph vs CrewAI vs AutoGen 2026: Full comparison"
- **Relevance**: Framework comparison matrix. CrewAI (role-based, sequential), LangGraph (graph-based, conditional routing), AutoGen (conversation-based).
- **Used in**: R5 (framework comparison — decision: Go core + Python sidecar)
- https://www.n-ix.com/langgraph-vs-crewai-vs-autogen/

### MoE vs Multi-Agent Systems
- **Source**: GuruSup — "MoE vs Multi-Agent Systems: Two AI Specialization Approaches"
- **Relevance**: Direct comparison — MoE routes per token (sub-ms, hardware level), multi-agent routes per task (per-request, application level).
- **Used in**: R6 (agent-level MoE design)
- https://gurusup.com/blog/moe-vs-multi-agent-systems

---

## 6. Logprob Tracking & API Auditing

### Log Probability Tracking
- **Paper**: "Log Probability Tracking of LLM APIs" (OpenReview, arXiv, 2026)
- **Relevance**: Monitoring LLM API behavior via logprob analysis. API drift detection, audit capabilities.
- **Used in**: R4 (entropy calculation from logprobs)
- https://openreview.net/forum?id=hFxivbAgVP

### AdaK: Adaptive KV Cache
- **Paper**: "AdaK: adaptive KV cache budget estimation framework" (Frontiers in AI, 2026)
- **Relevance**: Dynamic budget kt = Kmax · min(1, Ht/α). High entropy expands the cache budget — same principle as our entropy threshold.
- https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2026.1892739/full


---

## eBPF Agent-Security (Sprint 19/20)

- **AgentSight** — eBPF-Observability für KI-Agenten, Klartext an SSL-Grenzen.
  MIT, Rust. arXiv:2508.02736 · DOI 10.1145/3766882.3767169
  https://github.com/eunomia-bpf/agentsight → `docs/reference/ebpf/agentsight.md`
- **Jailer** — eBPF Mandatory Access Control via BPF LSM. Rust.
  Eigenständige Implementierung, inspiriert von Metas BpfJailer (Wisehart, Nga,
  El Khoury, Chadha). Upstream nicht produktionsreif.
  https://github.com/gen0sec/jailer → `docs/reference/ebpf/jailer.md`
- **Prompt Guard** (Meta) — DeBERTa-Klassifikator 22M/86M für Injection/Jailbreak.
  Kandidat für den Scanner-Sidecar, Sprint 20 WP2.
