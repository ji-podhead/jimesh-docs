---
# okf-meta
id: ai-agents-and-context-management
title: AI Agent Strategy, Context Window Optimization, and Layered Planning
tags: [llm, agents, context-window, rag, goap, behavior-trees, pddl]
category: agent-systems-and-browser-automation
version: 1.0.0
license: CC-BY-SA-4.0
author: JiMesh Engineering Team
created_at: 2026-09-13
updated_at: 2026-09-13
description: Best practices for LLM agent context window optimization, memory recording, Goal-Oriented Action Planning (GOAP), Behavior Trees, and PDDL integration.
---

# AI Agent Strategy, Context Window Optimization, and Layered Planning

## 1. Context Window & Memory Management Best Practices

To prevent performance degradation (e.g. "lost in the middle" phenomena) and reduce token bloat when driving LLM coding and orchestrating agents, adhere to the following principles:

1. **Selective & High-Value Memory Updates**:
   - Only record memory when critical architectural decisions, security boundaries, or system instructions are established.
   - Avoid recording transient state or temporary debugging outputs.

2. **Explicit Documentation Navigation Over Auto-Compacting**:
   - Avoid aggressive auto-compaction which discards subtle context.
   - Maintain explicit, well-structured documentation files (e.g., OKF format, sprint files) and direct agents to specific paths.

3. **Session Resetting on Token Thresholds**:
   - Reset or clear conversation context when approaching model context window limits (e.g., >80% utilization) to maintain output quality.

4. **Codebase Indexing & RAG Integration**:
   - For large codebases, leverage Retrieval-Augmented Generation (RAG) and codebase indexing tools (such as Claude Code integrations or Roo Code codebase indexing) rather than dumping full file trees into prompt context.

---

## 2. Multi-Layered Planning Architecture (GOAP -> Behavior Trees -> PDDL)

Modern autonomous execution frameworks rely on a 3-tier hybrid stack combining deterministic planners with LLM translation interfaces:

```
┌─────────────────────────────────────────────────────────┐
│ 3. Interface Layer: Large Language Models (LLMs)        │
│    - Translates high-level natural language to PDDL      │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Strategic Layer: Formal Planners (PDDL / GOAP)        │
│    - Multi-step goal resolution & state solvers         │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ 1. Execution Layer: Behavior Trees                      │
│    - Moment-to-moment reactive control & skill execution│
└─────────────────────────────────────────────────────────┘
```

1. **Execution Layer (Behavior Trees)**:
   - Provides moment-to-moment reactive control. Behavior tree engines (e.g., BehaviorTree.CPP) orchestrate low-level skills and tool executions.

2. **Strategic Layer (Formal Planners - PDDL & GOAP)**:
   - Goal-Oriented Action Planning (GOAP) and Planning Domain Definition Language (PDDL) solvers evaluate preconditions and effects to generate deterministic, multi-step action sequences.

3. **Interface Layer (LLM Bridge)**:
   - The LLM acts as the natural-language interface bridge, converting human intent into structured PDDL domain representations for the strategic planner.
