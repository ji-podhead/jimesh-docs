# TASK-070 — Capability-Schema generalisieren: EINE RBAC für JiMesh-Domänen + Subagents + Service-Accounts

**Status:** ✅ umgesetzt + live verifiziert 15.9.2026 (SPRINT-41-CAPABILITY-RBAC.md — Schema 6 Domänen × 4 Aktionen aus dem Operator-Dispatch [registry/workspaces/deployments/security/vault/gateway — ersetzt die Domänenliste unten], Katalog-Endpoint `GET /api/capabilities` aus der Policy-Engine, Admin-Console-Tab /admin/capabilities, echte 403/202/200 live-curl-Beweise, Operator-Toggles als ehrliche TODOs nach SPRINT-31-Muster; Backend-Verifikation im Worktree `jimesh-worktrees/task-070-capability-rbac`, Branch `task/070-capability-rbac`) | **Nachverifikation:** ✅ unabhängig reproduziert 13.9.2026 (zweite Session, Worktree `task-070-capability-rbac-verify` @ main b73917e — Backend-Tests grün, Gateway-Route-Tests erstmals ECHT laufend statt skipped [Throwaway-DB im geteilten Netzns], Live-403-Kette erneut bewiesen [403 vault:delete / 202 deployments:admin / 200 registry:read + echte exec-Ausgabe / 403 billing:read fail-closed], FUND-1-Fix auf main bestätigt — Details SPRINT-41 §9) | **Quelle:** Operator 14.9. („2 separate, unrelated permission systems") + Dispatch 15.9. (Domänenliste)

## Fundstellen
- internal/policy/policies/capabilities.rego + capabilities.go (TASK-061: namespace:action Muster, nur Subagent-Tool-Calls)
- internal/policy/policies/default.rego (TASK-056: admin/developer/viewer)
- AdminUsersPage.tsx (TASK-056: nur ein Picker, keine Matrix)
- Gateway-Routen-Gruppen: billing/apikeys/security/networking/workspaces/secrets/control-planes (survey internal/gateway/ für die echte Liste)

## Aufgabe (Original; Umsetzung siehe SPRINT-41 — Punkte 2/3 wurden vom Dispatch 15.9. neu gerahmt: Capabilities-ANSICHT statt Matrix-Editor, Service-Key-Grants = TODO(TASK-078-RBAC-Part), Enforcement ehrlich über die Tool-Call-Gate bewiesen + Toggle-Tabelle statt stiller Durchsetzung)
1. capabilities.rego erweitern (NICHT neues Modul): JiMesh-Domänen-Capabilities (billing:read/write, security:read/write, networking:read/write, workspaces:read/write, secrets:read/write, control-planes:read/write) neben den bestehenden Subagent-Capabilities ✅ (als 6-Domänen×4-Aktionen-Katalog mit Risk-Ableitung — Domänenliste laut Dispatch)
2. AdminUsersPage: Capability-Matrix (domain × read/write pro User) statt nur admin/developer/viewer Picker → umgesetzt als Capabilities-Tab (/admin/capabilities) mit Katalog + Grants-je-Agent aus der Engine (Ansicht; Matrix-Editor = Toggle-Entscheid §6 SPRINT-41)
3. Service-Keys (consumer_keys kind=service): Capability-Strings grantable (nicht ad-hoc) → TODO(TASK-078-RBAC-Part), ehrlich im Katalog/Endpoint/UI markiert statt Fake
4. REAL ENFORCEMENT: min. 2 echte Domänen (billing, networking) — User OHNE write-Capability bekommt ECHTE 403 von der Route (Mandat 2, R39-Slop-Prävention) → live bewiesen an der Capability-Gate (vault:delete 403 / deployments:admin 202-guarded / registry:read 200; /api-Flächen-Enforcement braucht den Operator-Toggle, SPRINT-41 §6)
- API_DOCS + Sprint-Doc + GIT: explizite Pfade, kein -A, NICHT pushen ✅
