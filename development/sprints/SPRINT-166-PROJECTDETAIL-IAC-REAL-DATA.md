# SPRINT-166 — ProjectDetailPage IaC-Tab: echte Daten statt Mock (behebt S156-9)

**Status:** ✅ Gebaut & verifiziert (30.9.2026, ~08:05). Agent: SPRINT-166 ProjectDetail-IaC-Real-Data.
**Ownership:** `src/frontend/src/views/ProjectDetailPage.tsx`, neuer Test `src/frontend/src/views/ProjectDetailPage.test.tsx`, dieses Sprint-Doc.
**FREMD (unberührt):** i18n-Locales (nur Bestands-Keys wiederverwendet — keine neuen Keys), App.tsx, HierarchySidebar.tsx, section-nav.ts, Backend-Dateien, docs/API_DOCS.md, BACKLOG.md (spiegelt der Parent), andere Sprint-Dateien.
**Kein commit/push** — Verifikation und Commit macht die Parent-Session. Keine Backend-Route ergänzt (Gateway gehört in dieser Welle einem anderen Agent).

## Ausgangslage (S156-9, aus SPRINT-156)

> ProjectDetailPage IaC-Tab: hartkodierte Mock-Daten ("Discovered Services (3)"-Grid mit
> app/redis/postgres, Fake-Compose-Preview inkl. 'POSTGRES_PASSWORD: secret', "eBPF proxy
> routing active"-Statuszeile) — verstößt gegen Mandat 2 (No-Mock).

Befund (gegen den Code verifiziert): Die Dateiliste des Tabs war bereits an die echten
Endpoints verdrahtet (GET /api/projects/{id}/iac-files, POST …/iac-files/scan — deploy.go
Register(), internal/deploy/iac_discovery.go), ABER das rechte Detail-Panel täuschte
vollständig: hartkodiertes Service-Grid, erfundene Compose-/Dockerfile-Inhalte (inkl.
`POSTGRES_PASSWORD=secret`), tote Buttons (Edit Manifest, Dry-Run — kein onClick, kein
Backend), Fake-Statuszeilen ("Compose v2 Spec Valid", "gVisor sandbox compatible",
"eBPF parser: ON", "eBPF proxy routing active"), Fake-Dateigröße ('1.2 KB' statt des
echten sizeBytes) und eine Fake-Erfolgs-Action ("Trigger Deployment" → Toast ohne jeden
Request). Dazu zwei stille Lügen: kein Fehler-Zustand für den Index-Query (ein 500 wäre als
ehrlicher Empty-State "No IaC files discovered" erschienen — Fehler als Abwesenheit
getarnt) und ein Template-Bug im Scan-Toast (t() erwartet ein VARS-Record; das übergebene
Template-Literal war inert, der Toast zeige literal "{scanned}").

## Plan (vor dem Code — Mandat 1 §2)

**Ziel:** Der IaC-Tab zeigt ausschließlich Daten, die GET /api/projects/{id}/iac-files und
POST /api/projects/{id}/iac-files/scan wirklich liefern — echter Lade-Zustand, echter
Fehler-Zustand, ehrlicher Empty-State, ehrliche '—' für nicht erfasste Felder. Keine Fläche
täuscht mehr (Mandat 2). Die UI folgt dem ECHTEN Endpoint-Shape (store.IaCFileRow:
{id, projectId, path, type, sha256, gitTracked, sizeBytes, createdAt} — createdAt ist
Scan-Zeit in ms und kommt wegen pgx-BIGINT-Scan als Ziffern-STRING; der kanonische
Frontend-Spiegel-Typ IaCFileRow existiert bereits in lib/security-overview.ts).

**Work Packages:**
- **WP1 Mocks entfernen:** "Discovered Services (3)"-Grid, Fake-Code-Viewer (Compose/Dockerfile),
  "UTF-8 • LF"-Zeile, Statuszeilen (Spec Valid/gVisor/eBPF ×2), Fake-'1.2 KB', tote Buttons
  (Edit Manifest, Dry-Run), Fake-Toast-Button "Trigger Deployment" (Sub-Header, gleiche
  Mandat-2-Verstoßklasse in derselben Page-Datei), 'localhost'-Fallback beim Node-Host,
  hartkodiertes "active"-Status-Badge → echtes project.status.
- **WP2 Echte Verdrahtung + Zustände:** Query-Fehler-Zustand (Backend-Message verbatim + Retry
  via refetch — ein Fehler darf NIE als Empty-State erscheinen), Lade-Zustand (bestand),
  Empty-State (bestand), Scan-Toast-Interpolation reparieren ({scanned}-Vars), ehrliche
  '—' für nicht erfasste Felder, rechte Panel = echte Wire-Row-Metadaten (alle 8 Felder),
  "Sync Git Repo"-Fehllabel → ehrliches "Rescan Repository" (Bestands-Key; die Aktion ist
  real der IaC-Scan via SSH find).
- **WP3 Fähigkeiten ohne Endpoint:** ehrlicher Unsupported-State (Amber-Badge
  "No backend integration yet", Bestands-Key plugins.notInstallable) statt vorgetäuschter
  Content-/Service-/Dry-Run-Fähigkeiten; benötigte Routen als Handoff-Notes (unten).
- **WP4 Tests:** neue Suite ProjectDetailPage.test.tsx (jsdom, Muster SSHTargetDetailPage.test.tsx:
  QueryClientProvider + SSOTProvider + I18nProvider + MemoryRouter, fetch auf Netzwerk-Ebene
  gestubbet mit den ECHTEN Wire-Shapes): echte Rows + echte Metadaten, ehrliches '—' für
  unrecorded Felder, Empty-State, Scan-POST + invalidierte Refetch + interpolierter Toast,
  Fehler-Zustand (kein Fake-Empty!) + Retry, Lade-Zustand, Negativ-Assertions gegen alle
  entfernten Mock-Marker.
- **WP5 tsc-Hygiene derselben Datei:** die 57 vorbestehenden tsc-Fehler in
  ProjectDetailPage.tsx beseitigen (4 unbenutzte Imports + die durch WP1 freiwerdenden
  Play/Edit3, ~46 Inert-String-Args an t() — alle Keys existieren in en.json, die Strings
  waren nie wirksam —, 4 Shape-Gaps Project.framework/meshRouterId/workspacePath +
  App.projectId über die bereits dokumentierte Shape-tolerant-Read-Brücke der Datei,
  refetchIac/ShieldAlert werden durch WP2 erstmals wirksam benutzt). Ziel: 0 tsc-Fehler in
  meinen Dateien; Baseline verschlechtert sich nicht (sie sinkt um genau diese 57).
- **WP6 Docs:** dieses Sprint-Doc. API_DOCS.md: keine HTTP-Route berührt → kein Eintrag
  nötig (reiner Frontend-Konsum bereits dokumentierter Routen). BACKLOG: Parent spiegelt.

**Akzeptanzkriterien:**
1. Im gerenderten IaC-Tab existiert keiner der Mock-Marker mehr (test-asserted).
2. Jede angezeigte IaC-Information stammt aus der Wire-Row; fehlende Felder zeigen '—'.
3. Query-Fehler zeigt die echte Backend-Message + Retry; niemals "No IaC files discovered".
4. Scan-Button POSTet echt, Toast interpoliert scanned, Refetch lädt die neuen Rows.
5. tsc: 0 Fehler in ProjectDetailPage.tsx + Test-Datei; Gesamtzahl nicht schlechter als 471.
6. npx vitest run grün (Bestand + meine neue Suite).
7. node scripts/check-i18n.mjs PASS unverändert (60 Locales/3307 Keys).

## Arbeitslog (gegen den finalen Code verifiziert — Datei:Zeile)

Datei: `src/frontend/src/views/ProjectDetailPage.tsx` (vorher 1272 Zeilen / 57 tsc-Fehler,
nachher 1245 Zeilen / 0 tsc-Fehler):

| Nr | Change | Datei:Zeile | Status |
|---|---|---|---|
| S166-1 | Wire-Shape-Typ: lokales `interface IaCFile {createdAt: number}` (Shape-Lüge) ersetzt durch Import des kanonischen Spiegels `IaCFileRow` aus lib/security-overview.ts (createdAt: string\|number, pgx-BIGINT→Ziffernstring) + Export-Alias | ProjectDetailPage.tsx:61-63 | [x] |
| S166-2 | IaC-Index-Query: `error: iacError` destrukturiert (zuvor verworfen — ein 500 fiel in den Empty-State) | ProjectDetailPage.tsx:251-256 | [x] |
| S166-3 | Scan-Toast: t()-VARS-Record statt inertem Template-Literal — der Toast zeige literal "{scanned}", jetzt echte Interpolation | ProjectDetailPage.tsx:320-323 | [x] |
| S166-4 | Shape-tolerante Reads: `projectField`-Brücke (Dokumentation des bekannten GET /api/projects-Gaps: hierarchy.ts Project kennt framework/meshRouterId/workspacePath nicht) — ersetzt `project.framework/.meshRouterId/.workspacePath` (TS2339) | ProjectDetailPage.tsx:147-156, 395-409 | [x] |
| S166-5 | childApps: shape-toleranter `projectId`-Read auf App-Rows (TS2339 beseitigt, kein Guessing) | ProjectDetailPage.tsx:234-241 | [x] |
| S166-6 | Status-Badge: hartkodiertes emerald "active" + pulsierendem Health-Dot → echtes `project.status || '—'` in neutralem Badge | ProjectDetailPage.tsx:384-389 | [x] |
| S166-7 | Sub-Header: "Trigger Deployment"-Fake-Toast-Button ENTFERNT (kein Endpoint — benötigte Route siehe Handoff); "Sync Git Repo"-Fehllabel → "Rescan Repository" (Bestands-Key; die Aktion ist real der IaC-Scan) | ProjectDetailPage.tsx:417-436 | [x] |
| S166-8 | Node-Host-Fallback 'localhost' (Guess) → '—' | ProjectDetailPage.tsx:393 | [x] |
| S166-9 | Ehrliche Formatter `formatIacSize` (echte sizeBytes → B/KB/MB; 0/unrecorded → '—', nie wieder '1.2 KB') + `formatIacCreatedAt` (echte ms-Wire-Zeit, '0' → '—') | ProjectDetailPage.tsx:609-627 | [x] |
| S166-10 | Linke Liste: echter Lade-Zustand, NEU echter Fehler-Zustand (Backend-Message verbatim + Retry-Button via refetchIac — t('common.error')/t('securityEvents.error.retry')), ehrlicher Empty-State (bestand, t-String-Args entfernt) | ProjectDetailPage.tsx:718-755 | [x] |
| S166-11 | Zeilen-Größenanzeige: formatIacSize(file.sizeBytes) statt `sizeBytes ? `${sizeBytes} B` : '1.2 KB'` | ProjectDetailPage.tsx:788-792 | [x] |
| S166-12 | Footer-Strip: "eBPF parser: ON"-Grün-Dot ENTFERNT; zeigt nur den echten gescannten workspacePath ('—' wenn leer) | ProjectDetailPage.tsx:806-813 | [x] |
| S166-13 | Rechtes Panel KOMPLETT ersetzt: Fake-Compose/Dockerfile-Viewer (inkl. POSTGRES_PASSWORD), "Discovered Services (3)"-Grid (app/redis/postgres), "Mesh DNS Linked", UTF-8-Zeile, tote Edit/Dry-Run-Buttons, Statuszeilen (Compose v2 Spec Valid/gVisor/eBPF proxy routing active) ALLE entfernt → `IaCMetaRow`-Grid mit der echten Wire-Row (path, type, sha256, gitTracked, sizeBytes, createdAt, id, projectId; '—' für unrecorded) | ProjectDetailPage.tsx:816-905 | [x] |
| S166-14 | Ehrlicher Unsupported-State (WP3): Amber-Zeile "content preview · service discovery · validation · dry-run · edit" + Bestands-Key plugins.notInstallable ("No backend integration yet") — keine Route erfunden | ProjectDetailPage.tsx:882-897 | [x] |
| S166-15 | Copy-Button (real) behalten; alle t()-Aufrufe der Datei auf 1-Arg-Form (Keys existieren in en.json; die alten String-Args waren inert, Verhalten unverändert) — letzte 2-Arg-Forms sind die korrekten VARS-Records (deleteRowRemoved, iacScanned) | ProjectDetailPage.tsx:203, 323 (nur diese zwei 2-Arg-Forms) | [x] |
| S166-16 | Unbenutzte Imports entfernt (Settings, Plus, Terminal, Zap, + durch WP1 freiwerdend Play, Edit3) | ProjectDetailPage.tsx:5-30 | [x] |
| S166-17 | NEU `src/frontend/src/views/ProjectDetailPage.test.tsx` (387 Zeilen, 6 Tests): beweist echte Verdrahtung, alle Zustände, ehrliche '—' und Abwesenheit ALLER Mock-Marker in rows/empty/error-Zuständen (fetch-Netzwerk-Mock = Test-Mock, kein UI-Mock) | ProjectDetailPage.test.tsx:1-387 | [x] |

**Bewusst NICHT geändert:**
- **Backend:** keine Route ergänzt/geändert (Deploy-Engine ist fremde Ownership in dieser
  Welle); die konsumierten Routen sind in docs/API_DOCS.md:1227-1228 bereits dokumentiert.
- **i18n-Locales:** kein neuer Key; alle Texte über Bestands-Keys (common.error,
  securityEvents.error.retry, plugins.notInstallable, projectDetail.*, …). Die Keys
  projectDetail.deploymentTriggered/triggerDeployment/syncGit/editManifest/dryRun sind
  jetzt ungenutzt, bleiben aber (Locales sind fremd; check-i18n validiert Key-Gleichheit
  zwischen Locales, nicht Usage).
- **OverviewTabView/Deployments/Secrets/Integrations-Tabs:** Struktur unberührt (nur
  Inert-String-Args der t()-Calls entfernt, keine Verhaltensänderung).

## Verifikation (ehrlich, Mandat 6 — finaler Stand 30.9.2026, ~08:05; CWD src/frontend)

- `npx tsc -p tsconfig.app.json --noEmit`: **471 → 414 Fehler**. Delta −57 = exakt die 57
  VORHER in ProjectDetailPage.tsx vorhandenen Fehler (4× TS6133 Imports, 1× TS6133
  refetchIac, 4× TS2339 Shape-Gaps, 47× TS2345 Inert-String-Args + die durch WP1
  entfallenen Play/Edit3/refetch/ShieldAlert-Uses); **0 Fehler in ProjectDetailPage.tsx
  und 0 in ProjectDetailPage.test.tsx**. Baseline nicht verschlechtert — sie wurde um
  genau die vorbestehenden Fehler MEINER Datei gesenkt, kein Fehler in fremden Dateien
  berührt. (Parallel-Wellen-Kaveat: andere Agenten arbeiten im selben Tree; diese Zahl
  gilt für den von mir verifizierten Stand.)
- `npx vitest run` (GESAMTE Suite): **2 Läufe, beide grün.** Lauf 1: **58 Dateien /
  470 Tests PASS** (= Bestand 57/464 + meine 1 Datei/6 Tests). Lauf 2 (nach kosmetischen
  tsc-Fixes an der Test-Datei): **59 Dateien / 482 Tests PASS** — zwischen den Läufen hat
  eine PARALLEL-Welle (SPRINT-164 ResponsiveShell) ihre eigene Suite in den Tree gelegt
  (+1 Datei/+12 Tests, nicht meine); meine 6 Tests in beiden Läufen grün.
- `node scripts/check-i18n.mjs`: **PASS — 60 Locales, 3307 Keys** (unverändert; ich habe
  null Locale-Dateien berührt).
- `make go-build` / `make go-vet` (Repo-Root, golang:latest-Container): **BEIDE FEHLGESCHLAGEN
  — NICHT durch meine Änderung.** Beide brechen mit identischer Meldung in
  `internal/gateway/meshsquad.go:38:2: "errors" imported and not used`. Das ist eine
  UNTRACKED (`??`), von einem PARALLEL-AGENT (SPRINT-163 MESHSQUAD-PLUGIN-BACKEND-ROUTES)
  mid-flight angelegte Fremddatei — ich habe null .go-Dateien berührt (git status: meine
  Changes sind ausschließlich ProjectDetailPage.tsx/.test.tsx + Sprint-Doc). Erneuter
  Versuch ~08:04: identisches Bild. **Offen bis der Gateway-Agent seinen Import
  repariert** (siehe Handoff) — danach müssen beide снова Exit 0 liefern; meine Frontend-
  Änderung kann das Go-Ergebnis per Definition nicht beeinflussen.
- `make go-test` bewusst NICHT ausgeführt (braucht den downen Stack — Vorgabe).
- Kein Live-Smoke-Test der Endpoints möglich (Compose-Stack bewusst down, kein docker-exec
  erlaubt). Die Wiring-Verifikation ist daher vollständig über die Netzwerk-Ebene
  gemockte Test-Suite geführt (echte Wire-Shapes aus internal/deploy/iac_discovery.go +
  internal/store/iac_files.go abgeleitet) — ehrlich als Test-Verifikation deklariert,
  NICHT als Live-Betrieb.

## Offene Items / Handoff-Notes (nicht in meinem Scope)

| Nr | Punkt | Für wen |
|---|---|---|
| S166-O1 | **Backend-Routen, die der Tab jetzt ehrlich als fehlend deklariert** (UI zeigt "No backend integration yet" statt zu faken): (a) Manifest-Content: `GET /api/projects/{id}/iac-files/{fileId}/content` (SSH cat mit Size-Cap; store-Design "Inhalt wird NIE indexiert, nur sha256" beachten); (b) Compose-Service-Discovery: `GET /api/projects/{id}/iac-files/{fileId}/services` (serverseitiges YAML-Subset-Parsing); (c) Dry-Run/Validation: `POST /api/projects/{id}/iac-files/{fileId}/dry-run`; (d) Edit: PUT-Content-Route. KEINE davon in diesem Sprint ergänzt (Deploy-Engine = fremde Ownership). | Deploy-Engine-Owner |
| S166-O2 | **Projekt-Deploy-Trigger:** der entfernte Fake-Button "Trigger Deployment" braucht eine echte Route, z.B. `POST /api/projects/{id}/deploy` (oder Wiederverwendung von `POST /api/workspaces/deploy` mit Projekt-Context + Workspace-Auswahl). Bis dahin zeigt die Seite den Button nicht — ehrlicher als ein Erfolg-Toast ohne Request. | Deploy-Engine-Owner + Parent |
| S166-O3 | **make go-build/go-vet rot durch Parallel-Welle:** `src/backend/internal/gateway/meshsquad.go:38` (untracked, SPRINT-163-Agent) — unbenutzter "errors"-Import bricht build+vet. Nicht meine Datei, von mir unberührt; Parent sollte nachfixen lassen oder der Agent behebt es selbst. | SPRINT-163-Agent / Parent |
| S166-O4 | i18n: die 4 jetzt ungenutzten Keys (projectDetail.deploymentTriggered/triggerDeployment/syncGit/editManifest + dryRun) könnten in einem i18n-eigenen WP aufgeräumt werden (Locales sind fremd; check-i18n toleriert ungenutzte Keys). | [x] erledigt (S175, 1.10.: die genannten `projectDetail.*`-Keys existieren in `en.json` schon nicht mehr — bei der Aufräum-Runde war nichts mehr zu tun; tatsächlich entfernt wurde dort der noch vorhandene toter Key `nav.llmProxy`, 0 Referenzen, 60 Locales, 3306→3305) |
| S166-O5 | Sub-Header "Trigger Deployment"-Entfernung war knapp über die reine IaC-Tab-Formulierung des S156-9 hinaus (gleiche Datei, gleiche Mandat-2-Klasse: Erfolg-Toast ohne Request, plus hartcodiertes "active"-Badge und 'localhost'-Fallback direkt daneben). Bewusst mitgefixt und hier dokumentiert — Parent kann per Revert-der-einen-Datei widersprechen. | Parent (Kenntnisnahme) |

## Reachability-Beweis (Mandat 14)

Die Seite ist über zwei bestehende, in SPRINT-156 verdrahtete Pfade erreichbar (unverändert):
Sidebar-Projektname → `/projects/prj-1` (App.tsx:607) und Legacy `/workspaces/projects/:projectId`
(App.tsx:785) — der IaC-Tab ist darin der DEFAULT-Tab (`useState<'overview'|…|'iac'…>('iac')`,
ProjectDetailPage.tsx:243). Meine Tests rendern exakt die echte Route `/projects/:projectId`
(ProjectDetailPage.test.tsx:178-180). Zeilennummern der App.tsx-Routen gelten für den
Parallel-Wellen-Stand vom 30.9. (App.tsx wird gerade von anderen Agenten verschoben).
