# Subagent-Dispatch mit Git-Worktrees (Pflicht-Pattern ab 14.9.)

**Warum:** Alle Subagent-Wellen, die im selben Working Tree liefen, erzeugten
Staging-Kollisionen (ab99f24), Hunk-Chirurgie-Zwang und Todesfälle in der
Commit-Phase. Claude's Agent-Welle mit isolated worktrees (worktree-agent-*)
lief kollisionsfrei. Ursache war nie die Prompt-Länge — es war der geteilte
Index.

**Das Muster (pro Task vor dem Spawn):**

```bash
# 1. Worktree + Branch für den Task
git worktree add .worktrees/task-071 -b task/071-ghost-delete origin/main

# 2. Agent-Spawn mit workdir + Prompt der NUR im Worktree arbeitet
#    (Prompt: "Dein Working-Tree ist /home/ji/projects/jimesh/.worktrees/task-071
#     — ALLE Commits dort, Branch task/071-ghost-delete. NIEMALS in den
#     Haupt-Checkout wechseln. Kein Push.")

# 3. Nach dem Agent-Finish: Review im Worktree (build/test/live-curl),
#    dann Merge zurück:
git checkout main && git merge --no-ff task/071-ghost-delete

# 4. Worktree aufräumen:
git worktree remove .worktrees/task-071 && git branch -d task/071-ghost-delete
```

**Regeln:**
- Ein Task = ein Worktree = ein Branch = ein Agent. Nie zwei Agents im
  selben Tree, nie im Haupt-Checkout arbeiten.
- Agent-Prompts werden DAMIT RADIKAL kürzer: keine "git add -A"-Warnungen,
  keine Hunk-Isolation, keine "Task-0XX ändert dieselbe Datei"-Warnungen —
  es gibt nichts zu kollidieren.
- Prompt braucht nur noch: Task-Ziel, Fundstellen, Akzeptanz, "Dein
  Worktree ist X, commite dort, kein Push".
- API_DOCS.md / geteilte Docs: im Worktree normal ändern — der Merge
  resolved Konflikte am Ende an EINER Stelle statt kontinuierlich.
- Der Haupt-Checkout bleibt dem Orchestrator (GLM-Session) vorbehalten:
  Review, Merge, Push, Eil-Fixes.

**Historie:** Kollisions-Fälle ab99f24 (Staging-Sweep), TASK-056 74-File-
Commit (Reset-Rettung), 12-Tasks-Welle 14.9. (12/12 Agents starben, groß-
teils in geteilter-Datei-Surgery). Das Pattern ist ab jetzt Pflicht.
