# SPRINT-160 — Responsive Design, AI-Section-Reorg, Universelle Health-Check-Registry

**Status:** 📋 Geplant, NICHT gebaut. Operator-Auftrag 30.9., verbatim, wortwörtlich übernommen —
nächste Session soll das konkretisieren + bauen, nicht neu erfinden.

## Auftrag, verbatim (Operator, 30.9.)

> "wir brauchen einfach responsive seite. [...] sidebar und responsiveness und das wir auch das
> mit dem dashboard builder so machen wie in leobot2/st2. dann fehlt immernoch ne ai section wo
> proxy und meshsquad reinkommt aber wieso steht da nur chat und wo ist der agent builder und was
> ist eigentlich mit dem healthcheck und register geworden für die ganzen services ich meine nicht
> nur meshsquad sondern auch alles andere"

## Punkte, einzeln, für die nächste Session zu klären + zu bauen

1. **Responsive Design — Sidebar + Hauptseiten.** Aktuell nicht responsive (kein Mobile/Tablet-
   Verhalten geprüft/gebaut, soweit heute Nacht bekannt). Braucht: Sidebar-Collapse-Verhalten auf
   schmalen Viewports, Haupt-Panel-Breiten-Logik (`App.tsx:502-505`, 3-Stufen-System
   full-bleed/wide/standard) responsive-tauglich machen.
2. **Dashboard-Builder "wie in leobot2/st2"** — Operator-Referenz auf ein ihm bekanntes
   Vergleichsprojekt/-Pattern (leobot2/st2), das NICHT in diesem Repo liegt und diese Session nicht
   identifizieren konnte. **Erste Aufgabe für nächste Session: Operator fragen, was genau an
   leobot2/st2 gemeint ist** (Layout? Drag&Drop-Verhalten? Widget-System?), bevor irgendwas gebaut
   wird — nicht raten.
3. **Fehlende "AI"-Sidebar-Sektion** — aktuell gibt es nur einen "Chat"-Eintrag (LLM-Playground,
   `/chat`), keine übergeordnete AI-Sektion. Dort sollen rein: Proxy (LLM-Proxy-Seiten, aktuell
   8 einzelne Seiten laut heutigem Audit, wo genau einsortiert?), Meshsquad (Chat-Space + Agent-
   Builder), und der Agent-Builder selbst.
4. **"Wo ist der Agent-Builder?"** — im jimesh-Frontend nicht gefunden (nur der Team-Creator/
   React-Flow-Builder lebt in **meshsquad-public**, ein anderes Repo). Klären: soll es einen
   Agent-Builder-Zugang direkt aus jimesh geben (Deep-Link ins meshsquad-public-Frontend, analog
   zum Chat-Space-Muster aus SPRINT-153), oder war ein jimesh-eigener Agent-Builder gemeint?
5. **Universelle Health-Check/Service-Registry** — SPRINT-142 (`node_services`-Tabelle,
   `GET/POST /api/node-services`) existiert bereits, aber **nur für die per `make deploy-all`
   verwalteten Kern-Plattform-Services**, nicht für "alles" im Sinne des Operators (Meshsquad-
   Crews, Plugin-Installationen, einzelne Workspace-Apps). Klären: soll die bestehende
   `node_services`-Registry auf ALLE Service-Typen erweitert werden (ein einheitliches Modell),
   oder braucht Meshsquad/Plugins eine eigene, separate Registry mit demselben Muster?

## Wichtig für nächste Session — Doku-Ablage (Operator-Standing-Order, mehrfach wiederholt)

**JEDE Sprint-/Planungs-Doku gehört nach `jimesh/docs/sprints/` (getrackt) — NIEMALS in einen
Claude-Session-Scratch-/Temp-Ordner (z.B. `/home/ji/projects/ihc24/`).** Diese Datei hier ist
bereits am richtigen Ort. Cross-Repo-Session-Artefakte (Prompt-Exports, Audits die mehrere Repos
betreffen) können in `ihc24` bleiben, aber ALLES jimesh-spezifische muss in `jimesh/docs/` landen,
committed, gepusht — nicht nur lokal auf der Platte liegen.

## Konkretisierung 30.9. (Folge-Session) — was davon jetzt gebaut wird

- **WP1 (Responsive) → SPRINT-164** (Subagent gestartet 30.9.): Sidebar-Collapse auf schmalen
  Viewports + breitere Standard-Panel-Tier. Eigenes File: SPRINT-164-RESPONSIVE-SHELL.md.
- **WP3 (AI-Sektion) → SPRINT-165** (startet nach S164 — beide berühren HierarchySidebar.tsx):
  Chat + 8×LLM-Proxy + MeshSquad in einer AI-Gruppe. Agent-Builder-Pattern = offene
  Operator-Frage (Deep-Link vs. eigener Builder).
- **WP2 (Dashboard-Builder "wie leobot2/st2")**: wartet auf Operator-Antwort — kein Repo dieses
  Namens auf der Platte gefunden (30.9. geprüft).
- **WP5 (Health-Check-Registry)**: wartet auf Operator-Entscheidung (node_services auf ALLE
  Service-Typen erweitern vs. separate Registry für Meshsquad/Plugins).

## Operator-Antworten 30.9. (live eingeholt) — WP2/WP5 entscheidungsreif

- **WP2 (Dashboard-Builder):** Referenz ist `/home/ji/projects/trading/st-2` (Operator-Angabe
  30.9.). Der nächste Builder-Agent liest dieses Repo direkt als Muster — nicht raten.
- **WP5 (Health-Check-Registry):** Operator-Entscheidung: **node_services auf ALLE Service-
  Typen erweitern** (Kern-Services, Meshsquad-Crews, Plugins, Workspace-Apps) — ein einheitliches
  Modell, ein Health-Check-Screen für alles.
- **Agent-Builder (WP3-Offenpunkt):** Operator-Will: MeshSquad soll ein EIGENES Frontend haben
  (oder mindestens eigene Components) — Agent-Builder, Chat-Interface, Konfiguration über
  YAML-Files; mindestens das Chat-Interface. Offenes Technologie-Thema vom Operator selbst
  benannt: meshsquad-public ist Python, jimesh ist Go ("müssten es dann erst in jimesh für
  python kompilieren"). Deshalb baut SPRINT-165 die AI-Sektion OHNE Builder-Eintrag und ohne
  Deep-Link; das Meshsquad-Frontend/Python-Go-Thema ist ein eigenes Paket der nächsten Welle.
- **SPRINT-150 (Tab-Strip):** bleibt live-mit-Operator reserviert (Operator-Bestätigung 30.9.).

## Nachtrag 30.9. — Research-Idee: Cloudflare Workers als leichtere Agent-Deployment-Tier

Operator-Idee: zusätzlich zum bestehenden gVisor-Container-Modell eine LEICHTERE Tier für
Agent-Workloads, die keine volle Container-Sandbox brauchen — Cloudflare Workers (V8-Isolates,
kein Cold-Start-Container-Overhead). Lokal testbar via `wrangler dev` (offizielles CLI, nutzt den
echten Open-Source-Runtime `workerd`, kein Cloud-Deploy zum Entwickeln nötig).

Bereits vorhanden: `CF_API_TOKEN`/`CF_MODELS` in `.env` — Cloudflare Workers AI wird schon als
LLM-Provider genutzt (GLM-Modelle), aber NICHT für Agent-Deployment/-Ausführung selbst.

Recherche-Ansatz (Google): "Cloudflare Workers V8 isolates AI agent sandboxing serverless
deployment alternative to containers 2026" bzw. "Cloudflare Workers vs gVisor container isolation
security AI agent workloads" — noch nicht recherchiert, nur als Idee für später notiert.

## Korrektur 30.9. (spät) — Research existiert bereits, war nur gitignored

Echte Recherche existiert schon: `docs_dev/research/cloudflare.md` (279 Zeilen) — war bisher NUR
im gitignoreten `docs_dev/` (Operator-Standing-Order verletzt), jetzt zusätzlich kopiert nach
`docs/research-cloudflare-workers.md` (getrackt).

**Operator-Präzisierung zur Einordnung:** landet in der geplanten AI-Sidebar-Sektion (Punkt 3 oben)
unter "Agents" ODER "Workers" (Benennung noch offen), UND soll gleich als Kategorie für
**allgemeine Serverless-Worker-Provider** angelegt werden, nicht nur Cloudflare — explizit auch
**Lambda (AWS)** und **Cloud Run (GCP)** als Alternativen in derselben Kategorie mit einplanen,
nicht Cloudflare-exklusiv bauen.

## Nachtrag 30.9. — Idee: Single-Container-Bootstrap statt Ansible-Erststart

Operator-Idee: erster Schritt auf einem neuen Node = nur den jimesh-control-plane-Container
pullen+starten, ALLES weitere (Node-Provisioning, Service-Auswahl aus dem `services:`-Preset,
Onboarding) läuft danach im Dashboard selbst — nicht die aktuelle Ansible-Vielschritt-Kette als
Erststart-Voraussetzung.

Anknüpfungspunkt, existiert teilweise schon: `handleNodeProvision` (dynamisches gVisor/runsc-
Install über SSH, vom Dashboard aus getriggert) — aktuell aber nur Zusatzfunktion neben dem
Ansible-Weg, nicht als alleiniger Erststart-Pfad gedacht. Müsste zum echten "one command to start"
-Onboarding ausgebaut werden: Control-Plane-Container braucht dann selbst die Fähigkeit, weitere
Services per SSH auf sich selbst oder andere Nodes nachzuziehen, ohne dass der Operator vorher
lokal `config.yml`/`.env`/Ansible aufsetzen muss.
