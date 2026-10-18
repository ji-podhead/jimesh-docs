# TASK-078 — Echte Headscale-Networks-Page (headplane-Fork) + Topology-Visualizer + RBAC

**Status:** ✅ [x] fertig (14.9., Branch `task/078-headscale-networks`, Basis
16a9d91, SPRINT-40-HEADSCALE-NETWORKS.md — ehrliche Abrechnung dort):
- **Part 1 ✅** (main-Commit b8bde4a, live curl-bewiesen): 3 Read-Routes +
  OPA-gated Mint/Expire + Policy-Anker auf die echte Headscale-0.29-REST-API
  (huma — KEIN gRPC mehr), OPA-Gate `headscale.rego` als 3. Modul auf der
  EINEN Engine (policy.go unberührt), server-derived Identity-Header.
- **Part 2 ✅** (fec8a68/d93cd62/5fcafe3): NetworksPage.tsx als echter
  headplane-Component-Port (MIT — tale/headplane, LICENSE im Clone selbst
  gelesen): Machines-Tabelle (Suche/Status-Filter/Sortierung/Showing-X-of-Y,
  echte `ipAddresses`-Felder), AuthKeys-Sektion (Filter-Semantik 1:1,
  Attribut-Rows, Create-Dialog mit Tag-only/Reusable/Ephemeral/90d +
  EINMALIGEM Key-Reveal + tailscale-up-Copy-Block, Expire-ConfirmButton),
  User-Rows; 77 i18n-Keys verdrahtet + 3 neue in 60 Locales
  (`scripts/task078-i18n-insert.py`, check:i18n grün 2093 Keys).
- **Part 3 ✅**: MeshTopology (React-Flow-Graph, Registry-Kanten echt,
  Permission-Kanten aus `lib/acl-policy.ts` — HuJSON-Scanner + Resolver
  fail-closed, 21 Unit-Tests) + ACL-&-Tagging-Anker (ehrlicher 502-Banner
  solange policy.mode=disabled). Atlas=MIT (vis-network-Pattern auf
  vorhandenes @xyflow/react portiert), Scanopy=AGPL-3+Commercial-Dual →
  **reference-only, kein Code** (Lizenz in /tmp/scanopy verifiziert),
  headscale-admin (GPL-3) ebenfalls reference-only — nie kopiert.
- **RBAC ✅** (Verdrahtung + Design): kein zweites Permission-System —
  Mutations-403 der OPA-Engine erscheint verbatim; `push-policy`-Gate-Action
  + `SetPolicy`-Client (PUT /api/v1/policy) sind implementiert, die Push-ROUTE
  bleibt bewusst dem Operator überlassen (Voraussetzung `policy.mode:
  database` = Posture-Wechsel — Design-Abschnitt im Sprint-File).
- **Verifikation ✅**: Worktree-Next-Dev :5175 → laufender Backend :19091:
  users 1 echter User, nodes ehrliches {count:0}, preauthkeys 4 echte
  maskierte Keys, policy ehrlicher 502 mit Headscales eigener Botschaft,
  GET /networks 200, eigener Code im kompilierten Bundle nachgewiesen;
  tsc 0 Fehler in TASK-078-Files, eslint 0 Befunde, vitest 21/21,
  check:i18n 60/60 Locales. Backend-Checks (Part 1): go-build/vet/test grün.
- **Zwischenfall (ehrlich):** die erste Part-2/3-Umsetzung wurde uncommittet
  durch eine externe Worktree-Cleanup-Welle entfernt; komplett rekonstruiert
  und diesmal sofort pro Part committet. Details: SPRINT-40 §Abrechnung.

— CORRECTED SCOPE (Claude, 14.9.):
- Scanopy = Network-Topology-**Visualizer** (github.com/scanopy/scanopy — maps
  what's talking to what, agentless discovery, 230+ Service-Signaturen) — KEIN
  OVS/VLAN-Provisioning-Tool! Das VLAN-Provisioning ist TASK-080.
- Alternativen: Atlas (github.com/karam-ajaj/atlas, Go-native!) / DockerNet
- Ersetzt TASK-077 (do not run separately)

**Repo:** /home/ji/projects/jimesh

LIES ZUERST: CLAUDE.md, MANDATES.md, dann:
- src/frontend/src/views/NetworksPage.tsx — ruft /api/networks/users, /api/networks/nodes,
  /api/networks/preauthkeys — KEINE davon hat irgendeine Backend-Route (bestätigt via
  grep — known-broken seit R39-Audit 14.9.). FIX DAS ZUERST, ist das Fundament.
- config/headscale/ + .env für HEADSCALE_*-Vars (Headscale läuft bereits, TASK-036)
- docs/research/R35* (Salvage-Review-Pattern: clone, Lizenz verifizieren, fork-vs-
  reference-only ENTSCHEIDEN BEVOR Code geschrieben wird)

## Part 1 — NetworksPage real machen (ZUERST, alles andere baut darauf)
Die 3 Routes an echte Headscale-Admin-API-Calls verdrahten (ListUsers, ListNodes/
Machines, ListPreAuthKeys oder equivalent — prüfe Headscale's echte API-Docs; gRPC
vs HTTP selbst verifizieren). Kein Mock, keine hardcoded Beispiel-Rows — Mandat 2.
Ist Headscale nicht erreichbar → ehrlicher Error/Empty-State, nie fabrizierte Rows.

## Part 2 — headplane als Dashboard-UI forken (nicht wieder from-scratch)
headplane (echte Repo-URL + Lizenz SELBER verifizieren — geglaubt MIT, war als
UI-Pattern-Donor in R35 earmarked, aber NIE wirklich geklont — confirmed empty
search). Diesmal wirklich: clonen, Lizenz re-checken, die echten UI-Patterns/
Komponenten der Headscale-User/Node/PreAuthKey-Screens nach NetworksPage.tsx
porten (oder die Page durch eine adaptierte Version ersetzen) — echte Component-
Portierung, keine vage Reskin-Inspiration.
- headscale-admin (GPL-3) bleibt REFERENCE-ONLY — keinen Code kopieren. Ideen
  sauber in eigenen Worten/Code nachimplementieren (R35-Regel).

## Part 3 — Network-Topology-Visualizer (corrected scope — NICHT VLAN/OVS, das ist TASK-080)
Evaluiere scanopy/scanopy und Atlas (Go-native!), verifiziere Lizenzen, und
integriere was besser passt als visuelle „what's talking to what"-Topology-View
innerhalb der Networks-Page — Reference/Pattern-Port nach derselben R35-Disziplin,
Lizenz-Bedingungen matchen.

## RBAC (Operator-Priorität)
Headscale's ACL/Tagging in die Networks-Page einbinden, gegated durch die
EXISTIERENDE OPA-Policy-Engine (internal/policy) — kein zweites paralleles
Permission-System. Falls TASK-070's Capability-Schema gelandet ist: direkt
wiederverwenden.
- Langfrist-Richtung (jetzt designen, nicht zwingend voll bauen): JiMesh's OPA-RBAC
  wird die Single-Source-of-Truth, die Headscale's ACL-Policy PROGRAMMATISCH pusht
  (Headscale hat eine API dafür) — statt Headscale-ACLs als separat gepflegtes
  System. Headscale's echte API-Surface dafür verifizieren BEVOR der Mechanismus
  festgelegt wird.

## Verifikation
Jeden Part gegen den laufenden Stack verifizieren (authenticated). API_DOCS.md +
Sprint-Doc mit ehrlicher Abrechnung was gebaut wurde vs. offen (z.B. falls Scanopy
nicht lokalisierbar: explizit sagen statt still droppen).

Commit — inkrementell pro Part ist ok (großer Task). GIT: explizite Pfade, kein -A,
NICHT pushen.
