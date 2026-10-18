# TASK-013 — WP6: Exposure-Dashboard & FirewallProvider

> **Status:** ⏳ OFFEN · **Vorbedingung:** `docs/tasks/WORKTREE-PROTOCOL.md` gelesen
> **Branch:** `task/013-exposure-dashboard` · **Speist:** Sprint 20 WP6

## Kontext

Zeigt tatsächliche Erreichbarkeit, nicht konfigurierte Absicht — die ufw-Regeln vom
5.9.2026 sahen gültig aus und griffen trotzdem nicht.

**Bereits vorhanden** (Sprint 20 WP0, verifiziert):
`internal/network/port_detection.go` hat `PortInfo.BindAddr`,
`IsExternalBind`, `IsExternallyReachable`, `IsLoopbackOnly`, `ExternallyReachable`.
Diese Bausteine nur **konsumieren**, nicht neu erfinden.

**Bekannte Lücke:** `internal/gateway/tunnel.go:85` ruft `network.ParsePorts` auf
und gibt das Ergebnis nur durch, ohne die neuen Felder auszuwerten.

## Auftrag

1. **Route `GET /api/security/exposure`**: pro Projekt/Node die
   `PortInfo`-Liste inklusive `BindAddr` und `IsExternallyReachable()` ausgeben.
2. **Docker-Port-Mappings dagegenhalten**: `docker ps --format` (Shellout über
   den bestehenden SSH-Pfad) parsen und mit der `ss -tlnp`-Sicht abgleichen. Eine
   Diskrepanz (Docker publiziert einen Port, den `ss` nicht als Loopback zeigt) ist
   der eigentliche Risikofall — genau das Muster vom Incident.
3. **Risiko-Einstufung** unter Nutzung der bestehenden Tech-Ontologie
   (`internal/metadata/ontology.go` — Port→Kategorie-Mapping existiert schon):
   Bind auf `0.0.0.0`/`::`/Wildcard + bekannte Web-UI-Kategorie (VNC, code-server,
   Admin-Panel) + keine erkennbare Auth → kritisch. Über ein Nicht-Loopback-Interface
   erreichbar (z. B. `tailscale0`, falls als Interface-Name ermittelbar) → eigene
   Stufe. Loopback-only → unkritisch.
4. **`FirewallProvider`-Interface** (neues File, z. B.
   `internal/gateway/firewall_provider.go`):
   ```go
   type FirewallProvider interface {
       Detect(ctx context.Context) (Capabilities, error)
       Apply(ctx context.Context, rules RuleSet) error
       Status(ctx context.Context) ([]EffectiveRule, error)
   }
   ```
   Eine erste Implementierung `NftablesProvider`, die die vorhandene Firewall-Logik
   aus WP0/WP5 (falls TASK-012 schon gemergt ist — sonst als eigenständiger,
   minimaler nftables-Wrapper) hinter das Interface zieht. Keine zweite
   Implementierung (OPNsense/Cloud-SGs) in dieser Task — nur das Interface plus
   eine Implementierung, sauber trennbar für später.
5. **`tunnel.go:85` fixen**: das `bind_addr`-Feld tatsächlich auswerten und in die
   API-Antwort des Tunnel-Scans aufnehmen, statt es nur durchzureichen.

## Frontend (nur falls Zeit reicht — Backend hat Priorität)

Eine einfache Tabellen-Ansicht (kein neues Design-System, am bestehenden
Frontend-Stil orientieren — `src/frontend/src/views/` als Vorbild) für
`/api/security/exposure`: Port, Bind-Adresse, Kategorie, Risiko-Badge.

## Nicht tun

- Keine OPNsense/Cloud-SG-Integration (spätere Task).
- Kein „Ist das wirklich zu?"-Live-Test von außen (das bräuchte einen zweiten
  Host — als offene Frage im Report vermerken, nicht selbst konstruieren).

## Akzeptanz

- `make go-build`/`go-vet` sauber.
- `GET /api/security/exposure` liefert für den lokalen Dev-Stack eine plausible
  Liste (die bekannten Loopback-Bindings als unkritisch, falls ein absichtlich
  falsch konfigurierter Testport simulierbar ist: als kritisch).

## Ergebnis

**Status:** ✅ ERLEDIGT (6.9.2026) — implementiert auf main (manuelle Nacharbeit der anderen Session nach dem degenerierten GLM-Lauf, s3-Briefing); **Verifikation durch diese Session** (Build+Vet im Container ✅, Live-Routen-Check nach Deploy).

### Implementiert (Fundstellen)

| Deliverable | Fundstelle | Status |
|---|---|---|
| Tunnel-Scan evaluated bind_addr selbst (statt durchreichen) | `internal/gateway/tunnel.go` — `EvaluatePortInfos(ports)` + `externallyReachable`-Count in der Antwort | ✅ |
| Exposure-Logik: Risk-Levels critical/high/elevated/ok, Wildcard-Bind, VPN-Interface, Risk-Reason | `internal/gateway/exposure.go` (26 KB, `EvaluatePortInfos`, `riskRank`) | ✅ |
| Route `GET /api/security/exposure` | `gateway.go:270` → `handleSecurityExposureRoute` (Wrapper, `firewall.go:25`) → Kern `handleSecurityExposure` (`exposure.go:748`) | ✅ registriert |
| FirewallProvider-Interface (Detect/Apply/Status) + `NftablesProvider` | `internal/gateway/firewall_provider.go` (`Capabilities`, `RuleSet`, `EffectiveRule`) | ✅ |
| Build + Vet | `make go-build` + `make go-vet` im Worktree-Container | ✅ exit 0 |

### Offen / ehrlich

1. **Live-Smoke** gegen `/api/security/exposure` mit realem Projekt-Port-Scan: steht aus (Backend-Restart läuft in dieser Runde; ohne Session ist nur 401-gated prüfbar — der Scan braucht ein Projekt).
2. **Frontend-Tabelle** (optional laut Task): nicht gebaut — Backend hat Priorität, Widget folgt im Epic-13-Umfeld.
3. **„Ist das wirklich zu?"-Live-Test von außen**: braucht einen zweiten Host — bewusst nicht konstruiert (Task-Verbot), als offene Frage dokumentiert.
4. **NftablesProvider-Apply**: Implementierung existiert; die Verdrahtung in den Deploy-Pfad ist TASK-019 (läuft parallel, `cmd/socket-guard` + `egress.go`-Wire-in).
