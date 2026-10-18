# SPRINT-58 — Storage-Tier-Modell: Container/Workspace/User/Shared-Ozone-Pfade

**Status:** 📋 Design-Frage, nirgends dokumentiert (geprüft: `ARCHITECTURE.md` hat 0 Treffer für
volume/storage/s3/bucket/ozone). Echte, offene Entscheidung, kein bestehender Fund.

---

## Auftrag, verbatim

> "was ist mit pfaden in projekten was jetzt container basiert sein soll oder zusätzliche pfade
> sind dann shared ozone pfade oder ein user pfad oder workspace"

Plus die frühere, verwandte Vorgabe (27.9.): "was wir auf keinen Fall mehr wollen: das man auf dem
Host einen Pfad im Projekt anlegt. Das sollte allerhöchstens irgendwie im S3-Bucket/Ozone sein."

## Vier real unterscheidbare Speicher-Tiers (Vorschlag, KEINE Entscheidung)

Passend zur bestehenden, verbindlichen Hierarchie (`ARCHITECTURE.md` §8: Project > Workspace > App,
volle Container-Duplikation pro Workspace, Server als unabhängige Achse):

1. **Workspace-isoliert** (`ozone://jimesh/{project_id}/{workspace_id}/...`) — 1:1 zur
   Container-Duplikations-Philosophie: jeder Workspace sieht NUR seinen eigenen Präfix, keine
   Cross-Workspace-Sicht. Default für alles, was ein Agent/User innerhalb eines Workspace anlegt.
2. **User-shared** (`ozone://jimesh/users/{user_id}/...`) — quer über mehrere Workspaces/Projekte
   desselben Users nutzbar (z. B. persönliche Notizen, Referenzmaterial). Passt auf die schon
   erwähnte, aber nie gebaute Unterscheidung "Shared Workspace = distinct from per-user"
   (SPRINT-53-Nachtrag von gestern zu #135/Domänenmodell).
3. **Project-shared** (`ozone://jimesh/projects/{project_id}/shared/...`) — von allen Workspaces
   EINES Projekts lesbar/schreibbar, für Team-Kollaboration innerhalb eines Projekts.
4. **Platform/Datalake** (separater Top-Level-Präfix, nicht user-adressierbar) — der `S3Sink` aus
   SPRINT-55/R44, komplett getrennt von den drei oben — kein User greift da direkt drauf zu, nur
   der Datalake-Orchestrator.

## Was NICHT mehr passieren soll (bestätigt, bereits Mandat)

Kein Host-Pfad im Projekt-Verzeichnis (z. B. `/opt/jimesh/projects/<id>/...` auf dem Node selbst)
für irgendeinen dieser vier Tiers — alles geht über Ozones S3-kompatibles Gateway
(`aws-sdk-go-v2/service/s3` mit `BaseEndpoint`, bereits aus SPRINT-54 bekannt), nie über einen
lokalen Docker-Volume-Mount, der Host-Dateisystem-Pfade erzeugt.

## Offene Entscheidungen für den Operator

1. Werden wirklich alle 4 Tiers gebraucht, oder reichen 1+4 (Workspace-isoliert + Datalake) für
   den Start, mit 2/3 als späterer Ausbau?
2. Wie wird der Zugriff auf Tier 2/3 (User-shared, Project-shared) autorisiert — dasselbe
   OPA/RBAC-Modell wie der Rest, oder eigene Ozone-Bucket-Policies?
3. Migriert bestehender Host-Pfad-Code (falls welcher existiert, z. B. im File-Browser/SSH-Explore)
   auf dieses Modell, oder bleibt der SSH-Explorer (Server-Dateisystem-Browsing) bewusst getrennt
   und unverändert (er ist konzeptionell was anderes — Server-Introspektion, nicht Workspace-Storage)?

---

## NACHTRAG 28.9. ~04:15 — Operator-Input (verbatim) + technisches Urteil

Operator-Requirements (Leos Worte, barely entschluesselt aber vollstaendig):
1. FileBrowser = ECHTE Sidebar-Komponente mit Target-Selector (alles, was Files hat: Workspaces,
   Apps, Deployments, Container); beim Oeffnen ist das letzte/erste Target vorselektiert.
2. Dieselbe Komponente pro App-/Deployment-/Container-Uebersicht EINGEBETTET — dort mit FIXEM
   Target, ohne Switch (eine Komponente, zwei Modi: general mit Selector / embedded fix).
3. Storage-PROVIDER-ABSTRAKTION: Ozone-S3 = erster echter Provider; User soll spaeter selbst
   waehlen koennen ("ob der irgendwie drive nimmt oder sonst was anderes einen anderen provider").
4. Shared Workspace bekommt einen EIGENEN Storage-Bereich ("sollte wenn moeglich auch zone haben").
5. gVisor-Container sollen sich ein Filesystem teilen koennen, das NICHT auf dem Host liegt —
   "komplett isoliert, ohne Rootshell auf dem Host".

**Technisches Urteil (ehrlich, kein Marketing):**
- Ein POSIX-Shared-FS zwischen gVisor-Containern OHNE Host-Beteiligung geht mit Dockers
  Mount-Modell NICHT sauber: bind mounts UND named volumes werden host-seitig vermittelt
  (Kernel-Mount im Host, dann in die Sandbox gereicht); FUSE inside gVisor ist nicht praktikabel.
  Docker-Volumes liegen physikalisch IMMER auf der Host-Disk.
- Der Weg, der Anforderung 5 ECHT erfuellt: Objekt-Storage uebers Netz (Ozone S3-Gateway).
  Kein Mount, kein Host-Pfad, kein Kernel-Bind; Container (auch unter runsc) sprechen S3 per
  jimesh-net mit per-Workspace-Credentials; der FileBrowser browsed dasselbe ueber das Backend.
- Pfad-Modell damit vereinheitlicht: JEDER Workspace (user ODER shared) bekommt sein eigenes
  Prefix `ozone://jimesh/{project_id}/{workspace_id}/...` — der Shared Workspace (einer pro
  Project, partial unique index) teilt SEIN Prefix unter den Containern des Workspace; das IST
  seine "Zone". User-Workspaces bleiben 1:1-isoliert. Tier 2 (user-shared) / Tier 4 (datalake)
  unveraendert. Physikalisch liegen die Bytes in Ozone-Volumes auf dem Control-Plane-Node — volle
  physische Trennung (eigener Storage-Node) = SPRINT-53-Multi-Node-Ausbau, nicht Voraussetzung.
- Rootshell-auf-Host war nie der Terminal-Weg (Terminal = docker-exec IN den Container,
  terminal.go: "KEIN SSH auf den Host. NIEMALS").
- Umsetzung: laufender Build-Agent (File-Browser-Aktivierung) hat diese 5 Punkte als Phase-2-Order
  erhalten; Provider-Interface im Backend, Ozone als erster Provider, Prefix-Modell wie oben.
