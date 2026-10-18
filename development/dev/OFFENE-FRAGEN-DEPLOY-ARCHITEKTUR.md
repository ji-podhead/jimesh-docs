# Offene Fragen — Deploy-Architektur (SPRINT-44 Fortsetzung)

Erstellt 16.9.2026, nach einer sehr langen Session mit mehrfach wechselnden
Antworten im Chat. Zweck: alle offenen Entscheidungen an einem Ort, zum
Ausfüllen mit klarem Kopf — statt einzeln im Chat nachzufragen.

**Bitte direkt in dieser Datei beantworten** (Antwort hinter jede Frage
schreiben, oder die passende Option ankreuzen), dann der nächsten Session
geben.

---

## 1. Docker-Compose — komplett weg, überall?

Letzter Stand im Chat: JA, keine Ausnahme, auch nicht auf dem lokalen
Entwickler-Desktop.

- [ ] Bestätigt: `deploy/docker-compose.yml` soll komplett verschwinden,
      auch für lokale Entwicklung.
- [ ] Doch nicht — lokal bleibt Compose, nur echte Remote-Server nutzen
      Ansible.
- [ ] Andere Antwort: ______________________

## 2. Wo laufen die 6 Plattform-Services (Postgres/Redis/Vault/Keycloak/
     Backend/Frontend)?

Letzter Stand im Chat: alle auf `trading` (der einzige echte, bereits
provisionierte Remote-Node).

- [ ] Bestätigt: alle 6 Services auf `trading`.
- [ ] Aufteilen auf mehrere Nodes — welche/wie: ______________________
- [ ] Andere Node statt `trading`: ______________________

## 3. Rolle dieses Desktops, wenn Frage 1 = "Compose komplett weg"

Wenn alle Services auf `trading` laufen: braucht dieser Desktop dann
überhaupt einen SSH-Server / eine eigene Node-Registrierung in
`config.yml`? (Vermutlich NEIN, wenn er selbst keine Services hostet —
er wäre dann nur noch Ansible-Controller + Code-Editor.)

- [ ] Bestätigt: Desktop hostet nichts, braucht keinen eigenen
      Node-Eintrag/SSH-Server.
- [ ] Doch, Desktop soll auch etwas hosten: was: ______________________

## 4. Headscale — wie viele Instanzen, wo?

Letzter Stand im Chat: Headscale ist ein EINZELNER, zentraler
Mesh-Koordinator — NICHT pro Control-Plane-Node dupliziert. Vorschlag:
eine Instanz, auf `trading`.

- [ ] Bestätigt: eine Headscale-Instanz auf `trading`.
- [ ] Andere Node: ______________________
- [ ] Headscale vorerst gar nicht (weiter draußen lassen, wie jetzt).

## 5. Reihenfolge — was zuerst?

- [ ] Erst die 6 Kern-Services auf `trading` deployen + verifizieren
      (Health-Checks, Traefik-Routing, Keycloak-Login, Vault-Zugriff),
      DANN Headscale als 7. Service.
- [ ] Headscale zuerst.
- [ ] Andere Reihenfolge: ______________________

## 6. Wann darf `deploy/docker-compose.yml` gelöscht werden? (WP5)

- [ ] Erst wenn ALLE Services (inkl. Headscale, falls gewünscht) auf
      `trading` echt laufen und getestet sind — nicht vorher.
- [ ] Andere Bedingung: ______________________

---

## Ehrlicher Zwischenstand (Fakten, kein Interpretationsspielraum)

- `trading` (100.107.15.10) ist provisioniert (Docker + Netzwerk laufen,
  live per Ansible verifiziert) — **keine der 6 Services laufen dort bisher**.
- `deploy/docker-compose.yml` existiert weiterhin unverändert auf diesem
  Desktop, läuft aber gerade **nicht** (Container aktuell gestoppt).
- Die Ansible-Tasks für alle 6 Services sind geschrieben und
  syntax-geprüft, aber **noch nie live gegen eine echte Node ausgeführt**
  (ein `make redeploy`-Testlauf im Sandbox-Environment war blockiert).
- Headscale läuft **nirgends** — weder lokal noch auf `trading`. Der
  historische Konfigurationsstand (Sprint 35, Commit `07385d9`) ist
  bekannt und in der Session-Historie dokumentiert, aber noch nicht als
  Ansible-Task nachgebaut.
- `.claude`-Memory dieser Session wurde auf Nutzer-Wunsch komplett
  gelöscht — eine neue Session kennt den bisherigen Verlauf nicht, außer
  über diese Datei und die commiteten/nicht-commiteten Dateien selbst.
