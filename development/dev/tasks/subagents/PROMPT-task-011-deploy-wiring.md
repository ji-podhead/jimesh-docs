# PROMPT für die neue GLM-Session: TASK-011-Deploy-Wiring

> **Copy-paste-ready für eine neue DSH/GLM-Session.** Der Session-Titel sollte
> „TASK-011 Deploy-Wiring" lauten. Die Regeln sind self-contained — du brauchst
> keinen Kontext aus dieser Session.

---

Du bist der ausgelagerte Executor für TASK-011-Deploy-Wiring (JiMesh, Epic 10 — WP1 Identitätskette: der letzte Puzzelstein).

## 0) Pflichtlektüre in dieser Reihenfolge (bevor irgendein Befehl)
1. docs/tasks/WORKTREE-PROTOCOL.md — bindend: Worktree-Isolation, kein merge/push auf main, Ehrlichkeit, Report-Format
2. docs/tasks/TASK-011-wp1-identity-chain.md — die Task selbst (autoritativ)
3. CLAUDE.md + MANDATES.md — Mandate 2 (No-Mock), 6 (Verifikation), 7 (keine Dependency ohne Not), 9 (Secrets)
4. docs/K-LAF-ARCHITECTURE.md §2 — die Identitätskette (Pflichtlektüre)

## 1) Worktree-Isolation (Pflicht)
git -C /home/ji/projects/jimesh worktree add -b task/011-deploy-wiring ../jimesh-worktrees/task-011-deploy-wiring main
cd ../jimesh-worktrees/task-011-deploy-wiring
- Arbeite AUSSCHLIESSLICH hier. Niemals im Haupt-Checkout editieren/committen (Dev-Stack läuft dort).
- Kein push/merge/rebase auf main. Committen reicht.
- Koordinations-Hinweis: store.go ist von TASK-008 (Hostkey-Fix) und TASK-012 berührt — arbeite in anderen Regionen.

## 2) Task (autoritativ = TASK-011-Datei; der Wire-in-Kern)
Die Schema-Migration und die Session-Token-Auflösung sind bereits auf main:
- `internal/store/store.go:385` — `sessions`-Migration mit container_id, parent_session_id, project_id, status, trust_class
- `internal/store/vault.go:75` — vault_tokens-Tabelle mit TTL-Infrastruktur
- `agent_bridge.go:63` — ExecuteSelfProvisioning (Container-ID ist bekannt hier)
- `gateway.go` — Proxy-Pfad (`resolveSessionID`-Anchor existiert bereits)

**Dein Teil — der letzte Wire-in:**
1. **Session-Token minten beim Provisioning**: in `ExecuteSelfProvisioning` (agent_bridge.go:63), nach dem Docker-Spawn (Container-ID bekannt), vor dem Rückgabewert: Token über die Vault-Token-Infrastruktur minten (`store.CreateVaultToken` — prüfe die exakte Signatur in vault.go). `agent_id` = die neue session_id. Token als Env-Variable in den Container injizieren (RUN-Aufruf ergänzen; SDK-kompatibel: docs/PRODUCT-ROADMAP.md §1 „Das Token-Detail"). Neue Session-Row mit container_id + trust_class=provisioned.
2. **Gateway: Token auflösen**: im Proxy-Pfad (handleChatCompletionsProxy, gateway.go:2717) — Token gegen vault_tokens → session_id; kein gültiges Token: Request wie vorher (Rückwärtskompatibilität, kein Bruch); Token ungültig/expired: 401.
3. **Source-IP-Gegenprobe**: Request-Source-IP aus dem Docker-Netz; Docker-API abfragen — Shellout (docker network inspect) statt Docker-SDK-Library (Mandat 7); wenn IP-Container-ID ≠ Token-Container-ID: als eigenes Ereignis loggen (beide IDs).

## 3) Hartregeln
- Build NUR aus dem Worktree: `cd <worktree> && make go-build && make go-vet`.
- Keine Behauptung ohne Fundstelle. Nichts als getestet markieren, was nicht mit curl getroffen wurde. Negativbefunde zählen.
- Keine neue Dependency ohne Abwägung (Mandat 7) — Docker-SDK-Shellout statt Library, begründe im Report.
- E1–E8-Entscheidungen gehören dem Operator — arbeite gegen die im Task genannten Defaults.
- Berühre NICHT projects_ssh.go, NICHT den Haupt-Checkout, NICHT andere Worktrees.
- Report im Pflichtformat: Geändert / Build-Test-Status ehrlich / Abweichungen / Offene Fragen max. 5 / Branch + Commits.
