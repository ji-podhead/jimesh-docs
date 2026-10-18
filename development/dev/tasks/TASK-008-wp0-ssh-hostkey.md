# TASK-008 — SSH Host-Key-Verifikation statt InsecureIgnoreHostKey

> **Status:** ✅ ERLEDIGT (6.9.2026) · **Branch:** `task/008-ssh-hostkey` (gemerged, `ba81da5`→`bc9898d`) + Nacharbeit direkt auf `main` (`projects_ssh.go:577`, `dialSSH` TOFU-verdrahtet; `tunnelPool.SetHostKeyStore`/`sshHostKeyStore` in `gateway.New` wired — war vorher nirgends aufgerufen)
> **Speist:** Sprint 20 WP0-Restfunde

## Kontext

Zwei Stellen ignorieren SSH-Host-Keys komplett — MITM-anfällig:

- `src/backend/internal/network/tunnel.go:65`
- `src/backend/internal/gateway/projects_ssh.go:264`

Beide: `HostKeyCallback: ssh.InsecureIgnoreHostKey()`.

Zusätzlich in `projects_ssh.go`: `dialSSH` fällt bei fehlendem Passwort auf
`ssh.Password("")` zurück — prüfen und ebenfalls behandeln (siehe Auftrag Punkt 3).

## Auftrag

1. **Bootstrap-Trust-on-first-use (TOFU):** Beim ersten Verbindungsaufbau zu einem
   Host den Host-Key in eine `known_hosts`-ähnliche Struktur schreiben (Datei oder
   Postgres — Postgres ist konsistenter mit dem Rest des Repos, siehe
   `internal/store/`). Folgeverbindungen verifizieren gegen den gespeicherten Key.
2. Bei Host-Key-Mismatch: Verbindung ablehnen, klare Fehlermeldung
   ("host key changed — possible MITM or reinstalled host, verify manually").
   **Kein stiller Fallback auf Ignore.**
2a. Deployment-Flow: Beim allerersten Deploy auf einen neuen Host gibt es
   naturgemäß noch keinen gespeicherten Key. Dokumentiere das als akzeptierten
   TOFU-Moment (wie SSH selbst es macht), nicht als Lücke.
3. `ssh.Password("")`-Fallback in `dialSSH` (`projects_ssh.go`) — finde die
   Aufrufstelle, prüfe ob sie noch gebraucht wird (vermutlich Rest aus einer
   früheren Auth-Variante). Wenn nicht gebraucht: entfernen. Wenn doch: mit
   Kommentar begründen, warum ein leeres Passwort dort sicher ist.
4. Bestehende Aufrufer beider Dateien prüfen (`grep -rn "InsecureIgnoreHostKey\|dialSSH"`)
   und anpassen.

## Nicht tun

- Keine neue Abhängigkeit für Host-Key-Management (Mandat 7) — die Go-Standardlib
  (`golang.org/x/crypto/ssh/knownhosts`, bereits transitiv via `x/crypto` verfügbar)
  reicht.
- Keine SSH-CA bauen (das ist eine spätere, größere Entscheidung, siehe
  `docs/PRODUCT-ROADMAP.md` O3) — hier geht es nur um TOFU-Pinning.

## Akzeptanz

- `make go-build` und `make go-vet` sauber (Befehl siehe Worktree-Protokoll §3).
- Ein zweiter Verbindungsversuch zu demselben Host mit geändertem Host-Key schlägt
  sichtbar fehl statt still durchzulaufen (manuell mit zwei Test-Hosts oder
  Kommentar im Code, der den Pfad erklärt, falls kein Live-Test möglich ist).

## Ergebnis

_(noch nicht begonnen)_
