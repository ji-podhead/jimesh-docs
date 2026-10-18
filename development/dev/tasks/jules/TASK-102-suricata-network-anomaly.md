# TASK-102 — Suricata + Network-Anomaly-Tab (Sicherheitslücke, kein Nice-to-have)

**Quelle:** Claude-Audit 16.9. — „Suricata + Network-Anomaly-Tab: weiterhin 0 Code, taucht bei Jules gar nicht auf"
**Priorität:** P1 — echte Sicherheitslücke (IDS fehlt komplett), nach CI-Fix + TASK-084

## Was existiert
- Falco (runtime eBPF, Container-Syscalls) ✅ implementiert (TASK-054)
- Wazuh (Host-Agents, File-Integrity) ✅ implementiert (TASK-054)
- siem-bridge (Falco+Wazuh → /api/sdk/logs) ✅ implementiert
- **Suricata (Netzwerk-IDS, Layer 3-7) ❌ 0 Code** — grep nach suricata in src/backend: 0 Treffer

## Was zu tun ist

### WP1 — Suricata als SIEM-Sidecar
- deploy/siem/docker-compose.yml um Suricata-Service erweitern (NetFlow/IPS-Mode am Router-Interface)
- suricata.yaml: EVE-JSON-Output (JSON lines) auf ein geteiltes Volume — gleiches Muster wie Falco (JSONL-File → Bridge poll)
- siem-bridge um Suricata-Transformer erweitern (EVE-JSON → /api/sdk/logs, type=network-anomaly, alias=suricata)
- Quelle-Attribution + K-LAF-E3-Redaction wie bei Wazuh/Falco

### WP2 — Network-Anomaly-Tab (Frontend)
- SecurityExposurePage um Network-Anomaly-Sektion erweitern: Suricata-Alerts (Signature, Severity, Source-IP, Dest-IP, Proto, Port)
- Filter: nach Projekt/VLAN/Node, Severity-Farben wie SIEM (rot=critical, orange=high, gelb=medium)
- Route: GET /api/security/anomalies (liest aus den sdk_logs, alias=suricata)

### WP3 — Ruleset-Management (v1 minimal)
- Default-Ruleset: Emerging-Threats-Open (kostenlos) — als Volume, NICHT jedes Update coden
- Konfiguration via Settings (rule-Pfad, Homenet-Range aus den VLAN-Subnetzen ableiten)

## Acceptance
- [ ] Suricata-Container läuft im SIEM-Compose (healthy)
- [ ] EVE-JSON-Alerts landen in /api/sdk/logs (alias=suricata)
- [ ] Network-Anomaly-Sektion zeigt Live-Alerts mit Filter
- [ ] Test: ein klarer Port-Scan gegen eine Node → Alert erscheint im Frontend (Live-Verify)
- [ ] Doku: API_DOCS + SPRINT-File aktualisiert

## Regeln
- CGO_ENABLED=0 (Suricata ist ein externer Container — ok)
- Kein Mock-Alert: der Test-Alert muss aus einem echten Scan kommen
