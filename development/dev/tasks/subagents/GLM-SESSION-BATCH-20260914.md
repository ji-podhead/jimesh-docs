# GLM/DSH-Session-Batch 14.9.2026 — Task-Dispatch-Liste (von Claude kompiliert)

## ⛔ RETIRED — NICHT SENDEN (nur damit niemand alte Kopien benutzt)
- **TASK-075** → ersetzt durch TASK-079 (war auf falscher „gVisor hilft bei Ports"-Annahme gebaut)
- **TASK-077** → gefoldet in TASK-078 (Scanopy-Source nie standalone gefunden; korrekt gescoped in 078)

## ✅ READY TO SEND (13 Tasks)

| Task | Prompt-File | Kern | IA-safe? |
|---|---|---|---|
| 066 | PROMPT-task-066-vault-consolidation.md | VaultPage → VaultDashboardPage mergen + Redirect | ✅ (E-IA entschieden: Platform-Tab) |
| 067 | PROMPT-task-067-wazuh-embed-fix.md | Wazuh-iframe → new-tab-Link (self-signed-cert-Bug) | ✅ |
| 068 | PROMPT-task-068-control-planes-self-register.md | Lokaler JiMesh-Host als self-Row + „local"-Badge | ✅ |
| 069 | PROMPT-task-069-security-overview-picker.md | Echter Target-Picker + Dead-Notification-Link fixen | ✅ (E-IA: Security-Tab bleibt, Sub-Navigation via TASK-074-Pattern) |
| 070 | PROMPT-task-070-capability-rbac-schema.md | capabilities.rego auf JiMesh-Domänen + Matrix + echte 403s | ✅ (E-IA: Admin bleibt separate Console) |
| 071 | PROMPT-task-071-ghost-data-delete.md | DELETE /api/users + /api/projects + Confirm-Dialoge | ✅ |
| 072 | PROMPT-task-072-rbac-at-create.md | Access-Sektion in Create-Dialogen (POST /api/budgets bei Creation) | ✅ (E-IA: Workspaces-Tab bleibt) |
| 073 | PROMPT-task-073-oauth-google-github.md | Google+GitHub als Keycloak-IdPs (Realm-Import, ehrlich bei fehlenden Creds) | ✅ |
| 074 | PROMPT-task-074-mini-sidebar.md | Mini-Sidebar pro Sektion + Overview-Landing (Security als Pilot) | ✅ (E-IA entschieden: 5-Tab-Zielstruktur, Platform-Tab) |
| 076 | PROMPT-task-076-agent-feedback-loop.md | SIEM-Criticals → Session-SSE-Injektion (TASK-061-Mechanismus) | ✅ |
| 078 | PROMPT-task-078-headscale-networks.md | NetworksPage real (Headscale-API) + headplane-Fork + Topology-Visualizer + OPA-RBAC | ✅ |
| 079 | PROMPT-task-079-identity-router-proxying.md | Router = Identity-based Reverse-Proxy (ERSETZT 075 — Port-Randomisierung war falsches Modell) | ✅ |
| 080 | PROMPT-task-080-vlan-network-isolation.md | macvlan/ipvlan VLAN-Isolation + gVisor + Network-Editing-Tab (TASK-049-Scope) | ✅ |

## ✅ IA-ENTSCHEIDEN (E-IA in DECISIONS.md, Operator 14.9. „ok go go go")
Die SPRINT-22-Drift ist aufgelöst: **5 Haupt-Tabs** (Proxy / Workspaces /
**Platform NEU** / Security / DBs) + separates Admin. Platform = Control-Planes
+ Vault (Engine-Registry) + Networks. VaultDashboardPage gewinnt „Vault";
/security/vault wird „Project Secrets" (Security-Tab). Networks → Platform.
Admin bleibt separate Console. Runtime-Presets = App-Ebene (063 erledigt).

**Alle 13 Tasks sind jetzt freigegeben** — jeder Prompt referenziert E-IA.
Enforcement-Regel (DECISIONS.md): Neue Routen landen NIE per Convenience in der
nächstgelegenen Nav-Gruppe — gegen die E-IA-Tabelle prüfen, neue Konzepte
brauchen eine bewusste Platzierungs-Entscheidung im Sprint-File BEVOR sie
gebaut werden. Shared Files (App.tsx: 066/074/069/072; internal/policy:
070/078): hunk-isoliert committen (Staging-Lesson ab99f24!).

## KOLLISIONS-SCHUTZ
- C1/Secrets ist FERTIG (TASK-065 gemerged: secrets-engines + jimesh.secrets.get +
  Vault-Dashboard) — KEIN Task darf secrets touchieren außer 066 (Vault-Consolidation,
  die konsolidiert nur die UI, nicht die Secrets-Engine-Logik)
- TASK-079 ersetzt 075 komplett — Routing-Tabelle statt Port-Allokation
- TASK-080 ist das EINZIGE VLAN/OVS-Provisioning-Task — 078's Visualizer-Part
  berührt keine Provisioning-Logik
- Shared Files: App.tsx (074 + 069 + 072), internal/policy (070 + 078-RBAC) —
  Hunk-isoliert committen (Staging-Kollisions-Lesson ab99f24!)
