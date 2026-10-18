# IST vs. SOLL — Stand nach der Nacht-Session, 28./29.9.2026

Ehrlich, ungeschönt. Kein "ist alles fertig" mehr — hier steht genau was lief und was nicht.

## Was ich diese Nacht TATSÄCHLICH umgesetzt habe (committed `6d99822`, gepusht, 2x deployed)

1. **Auth-Härtung (SPRINT-148)** — Passwort-Login standardmäßig AUS (403), Rate-Limiting
   (5/IP/15min, global 20/15min), Keycloak einziger Weg. Code real, getestet, deployed.
2. **Falco+Suricata-Korrelation (SPRINT-147)** — echte Event-Korrelation nach
   Container+Zeitfenster, neue Seite `/security/threat-response`. Code real, getestet, deployed.
3. **Nav-Dedup Phase 1** — SAST/DAST/IaC → 1 Eintrag, 4 Firewall-Seiten → 1 Tab-Shell, SIEM neu in
   section-nav.ts registriert (war komplett gefehlt), Secrets eigener Top-Level-Punkt.
4. **Service-aware Graying Phase 4** — OPNsense hart deaktiviert, Deploy-Registry-Hook gebaut.
5. **Navbar-Kleinkram** — Command-Palette-Label, Admin→Sidebar.
6. Worktree-Audit, Prompts-Audit, Redesign-Proposal (Analyse-Dokumente, kein Code).

**Alles davon ist committed, gepusht (`64121d0..6d99822`), und Backend+Frontend wurden danach neu
deployed (beide `exit 0`, Git-Pull auf trading zeigt "changed", Image neu gebaut, Container neu
erstellt — laut Deploy-Log real, nicht nur behauptet).**

## Warum es trotzdem so aussieht, als wäre "nichts da"

**Das ist der eigentlich ungeklärte Punkt gerade.** Mögliche Gründe, keiner davon abschließend
verifiziert:
- Browser-Cache trotz Hard-Refresh
- Falscher Tab/falsche Session offen
- Ein Cache-Layer zwischen dir und trading (Traefik?) der alte Assets ausliefert
- Der Frontend-Build selbst ist fehlgeschlagen ohne dass der Ansible-Task es als Fehler wertet

**Nächster Schritt, sobald du wieder da bist:** eine einzige eindeutige URL direkt aufrufen
(`https://<trading>/security/siem` oder `/security/threat-response`) und sagen was kommt — 404,
leere Seite, alte Seite, oder die neue. Das trennt "Code ist nicht da" von "Cache-Problem"
eindeutig.

## Was NICHT gebaut wurde (Phase 2/3/5/6 aus dem Redesign-Proposal), bewusst nicht

- **Phase 2 — Tab-Leiste statt Navbar.** Dein größter, ursprünglicher Wunsch. NUR als Design
  fertig (`UIUX-REDESIGN-PROPOSAL-2026-09-28.md`), NICHT implementiert. Navbar oben ist unverändert
  da, absichtlich, weil das der größte/riskanteste Umbau ist.
- **Phase 3 — Sidebar-Dashboards-Sektion + eigene Presets + `jimesh.dashboards`-SDK.** Nur Design,
  kein Code. Braucht neue Backend-Tabelle.
- **Phase 5 — Email/Notification-System.** Existiert nicht, 0 Code, auch nicht diese Nacht gebaut.
- **Phase 6 — Meshsquad-Chat/Chatrooms.** Nur Design, kein Code, separates Repo.

## Feature-Status, ehrlich, Stand jetzt (deployed, falls Cache/Sichtbarkeit stimmt)

| Feature | Backend | Sidebar/Nav | Live auf trading |
|---|---|---|---|
| SIEM (Wazuh+Falco+Indexer) | echt, live-verifiziert | JETZT registriert (`/security/siem`) | Core lief, Indexer braucht noch gen-certs (dein Schritt) |
| WAF | echt seit Sprint 31 | KEIN Sidebar-Punkt — Toggle im Deploy-Dialog | Deploy-Dialog-Toggle live |
| Network Monitoring (Suricata) | echt, live, capturt | Panel auf `/networks` | läuft, af-packet (kein XDP) |
| FileBrowser | echt (Ozone S3) | pro Workspace-Zeile, KEIN Top-Level-Punkt | braucht noch OZONE_S3_*-Creds |
| Threat-Detection (Falco+Suricata-Korrelation) | echt, diese Nacht gebaut | `/security/threat-response` | deployed, ungetestet live |
| Tab-Leiste statt Navbar | — | NICHT gebaut | — |
| Sidebar-Dashboards+SDK | — | NICHT gebaut | — |
| Meshsquad-Chat | teilweise (meshsquad-public) | NICHT gebaut | — |

## Zu deiner Frage "warum sag ich's dir dann überhaupt, wenn eh nur irgendwas rauskommt"

Berechtigt, wenn das Ergebnis nicht sichtbar wird. Der Unterschied zwischen "ich hab's dir gesagt"
und "irgendwas passiert" ist aber real messbar — siehe die Tabelle oben, jeder Punkt ist konkret
auf eine deiner Forderungen zurückführbar, mit Datei/Commit-Beleg. Das Problem gerade ist nicht,
dass falsche Dinge gebaut wurden — das Problem ist die Sichtbarkeits-Lücke zwischen "committed +
deployed laut Log" und "was du im Browser siehst". Das muss als nächstes geklärt werden, bevor
irgendwas Neues gebaut wird.
