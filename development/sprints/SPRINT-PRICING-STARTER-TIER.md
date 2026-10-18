# SPRINT-PRICING-STARTER-TIER — Pay-as-you-go Rechenmodell + Admin-Quotas

**Status:** 📋 GEPLANT (Kalkulation offen — Entscheidungsgrundlage)
**Datum:** 2026-10-14
**Operator-Vorgaben:** siehe „Operator-Vorgaben (wörtlich)" unten

## Ziel

Ein faire, transparente Pricing-Struktur für "JiMesh Cloud Starter" definieren — unsere Infrastruktur-Kosten (Azure northeurope) zeigen Kostenträger statt deprecated Kannonen-Multi-Tenant-Anteil. Budget-Grenze: **175 €/Monat** bis Startup-Credit erreicht (kein "Free-Shit"-Unlimited mehr religions).

## Operator-Vorgaben (wörtlich, 2026-10-14)

> „was würde uns das kosten wenn die container minimale specs haben? also im admin dashboard kann er dann quasi die quotas einstellen. er bezahlt am ende pay as you go."

> „solange wir noch kein startup program haben würde ich sagen, der user kriegt ne control plane mit utility container der minimale settings hat, dann kriegt er halt ein workspace wo er maximal irgendwie 3 container deployen kann und zusätzlich unsere services wie grafana usw for free nutzen kann"

## Was der Starter-User bekommt

- 1 Workspace (managed), **3 Container** (0.25 vCPU / 512 MB RAM je)
- 1 Utility-Container (minimal)
- Managed Services **gratis**: Grafana, shared Postgres-Schema, shared Redis, Event Hubs (shared namespace)

## Basiskosten (Azure northeurope, ~730 h/Monat, geprüft 2026-10-14)

| Node-Option | $/h | €/Monat | Passend |
|---|---|---|---|
| B2ts_v2 (2vCPU/1GB) | 0.0214 | ~14€ | ❌ zu klein für CP |
| **B2s (2vCPU/4GB)** | 0.0416 | **~28€** | ✅ 1 Node: CP-toys + 3 User-Container + Utility |
| B2ats_v2 (2vCPU/4GB) | 0.0435 | ~29€ | v2-Alternative |
| B2ms (2vCPU/8GB) | 0.0834 | ~56€ | Headroom |
| D2s_v4 (2vCPU/8GB) | 0.115 | ~77€ | komfortabel |

**Starter-Fix-Kosten pro Recheninstanz:**

| Posten | €/Monat |
|---|---|
| Node B2s | ~28 |
| Postgres B1ms (shared, multi-tenant) | ~25 |
| Public IP / Egress klein | ~5 |
| Postmark (Email-OTP: ~0 / Monat unter 10k Empfänger) | ~0 |
| Key Vault (<10k Ops/monat) | ~0.10 |
| Entra External-ID (<50k MAU) | 0 |
| Stripe-Gebühren (bei 10€/monat Invoice: 1.5% + 0.25€) | ~0.39 (dem User bezahlt) |
| **Subtotal / 1 Starter-User** | **~58 → User-Kostenanteil ≈ 2–3 €** |

### Break-even

```
Fix-Basis ≈ 100 € (CP + Node + PG + IP, multi-tenant geteilt)
User-Preis 9–12 €/Monat (Starter)
Break-even bei ~12–15 Usern (ohne Azure Startup-Credits)
```

### Pricing-Vorschlag

| Tier | Preis | Quotas |
|---|---|---|
| **Starter** | pay-as-you-go **~9–12 €/Monat Base + Metered** | 3 Container à 0.25/512MB, Utility, Services shared gratis |
| Metered overrides | Pay-per-use wenn erhöht | CPU-h/GB-RAM/egress über Quota Cap → Stripe Usage-Records (der `stripe_role` Exporter aus jimeshIO `iac/ansible/roles/stripe/` – hire nochly) |

**Admin-Dashboard (Operator-Seite):**
- CP-Admin setzt Quotas pro Workspace (Container-Anzahl, vCPU/RAM-Caps, Service-Flags)
- Technische Enforcement: K8s `ResourceQuota` + `LimitRange` pro Workspace-Namespace, geliefert via Agent
- Metering-Hook: vorhandener stripe_usage-Exporter (stundengenau)
- User-Seite: der Workspace-Admin-Token kann keine eigene Self-Service Quota erhöhen (nur Operator/Admin)

## Work Packages

| Nr | Task | Status |
|---|---|---|
| PR-1 | Metering-Design: CPU-h/GB-h/Egress-Meter pro Workspace-Namespace (K8s metrics-server oder Prometheus-Query) | [x] — commit pending on `feat-pr1-pr3-metering-quotas` (2026-10-14) |
| PR-2 | Stripe-Usage-Records-Exporter (nicht nur starter), an bestehende ansible stripe-role anlagern | [ ] |
| PR-3 | Admin-Dashboard „Workspace-Quotas" UI (Container-count, RAM/vCPU-Caps, Service on/off) | [x] — commit pending on `feat-pr1-pr3-metering-quotas` (2026-10-14) |
| PR-4 | Enforcement K8s-plugins: Namespace ResourceQuota/LimitRange via Agent-Apply | [ ] |
| PR-5 | Pricing-UI: jimesh.io/pricing (NestJS-Backend, Stripe Checkout, no card in our db) | [ ] |
| PR-6 | Admin-Panel-seitig: Admin kann pro Workspace-Quota setzen, Effektivwert (Metering-Readout) abrufbar | [ ] |

## Offene Punkte

- **OQ1** — Base-Preis final festnageln: **9 €** (aggressiv, subventioniert) oder 12 € (komfortabel)? Operator-Entscheidung
- **OQ2** — Metered-Preiskurve: CPU-h, RAM-GB-h, Egress-GB — Einheitspreise von Azure umlegen + X% Margin
- **OQ3** — Kontext über Eigenes-Hosting (self-hosted) bei der Pricing-Seite: externe Glaubwürdigkeit. Kein Freebie-Tier jenseits von "Trial" — sonst DoW-Risiko (Operator voit äußern)

### Umsetzungsnote PR-1 + PR-3 (lane `feat-pr1-pr3-metering-quotas`, 2026-10-14)

- **PR-1 Metering** — store `internal/store/metering.go`: Tabelle
  `workspace_metering_window` (PK (workspace_id, window_start); window
  seconds, cpu_seconds/mem_gb_seconds `NUMERIC(20,4)`, egress_bytes,
  container_peak). Contract: die CP scraped SELBST KEINE Live-Metrics — ein
  Reporter (KD-4-Finisher-Agent oder Operator-Script) POSTet geschlossene
  Fenster via `POST /api/admin/metering/report` (Pull-Mode: Prometheus
  Metrics-API ODER K8s metrics-server bei gebundenem Cluster; bis dahin
  ehrlicher Idle-State). Re-Reports des SELBEN Fensters akkumulieren
  (deltas addieren, peak/window_seconds = MAX). Operator-List
  `GET /api/admin/metering?workspace_id=&since=`, user-scoped Self-View
  `GET /api/metering/self` (session-sub, nur eigene Workspaces).
  JSONL/CSV-Export-Format im store-Datei-Header dokumentiert.
- **PR-3 Quotas** — store `internal/store/workspace_quota.go`: Tabelle
  `workspace_quota` (workspace_id UNIQUE/PK; Starter-Defaults 3 Container /
  750 millicores / 1536 MiB / services_all=false — genau die
  Pricing-Disposition oben; Seed ONCE an CreateWorkspace, lazy für
  Bestands-Tenants, ON CONFLICT DO NOTHING überschreibt NIE einen
  Operator-Wert). Gateway `GET/PUT /api/admin/workspaces/{id}/quota`
  (admin; PUT bounds 0..20 / 0..10000 m / 0..32768 MiB, 404 unknown
  workspace, RM35-Audit-Row je PUT-Versuch action
  `workspace_quota_update`) + read-only User-View
  `GET /api/workspaces/{id}/quota` (owner|member|admin scope). FE:
  WorkspaceQuotaAdminPage als Admin-Tab `/admin/quotas` + RM35
  Doppel-Nav-Zeile (  section-nav + HierarchySidebar, SHOW_ADMIN_NAV-Spread).
- Gates: go build ./... ok, vet store/gateway ok, `go test ./internal/store
  ./internal/gateway` green (Metering-Accumulate, Quota-Defaults,
  Bounds-400s, RM35 rows, 403/404-Branches), check:i18n green, FE vitest für
  die Quota-Tabelle + section-nav 3 subcases.

## Roadmap (explizit OUT OF SCOPE für das Startup-Programm, Operator 2026-10-14)

### Premium-Render-Buffer-Tier (Azure GPU) — späteres Enterprise-Add-on

> Operator: „unser webrtc und andere sachen sind wieder utility sachen, die müssen im preis
enthalten sein. das browser ding muss direkt in der userinfra sein, aber können wir im enterprise
ding nicht so ein premium render/buffer ding mit azure irgendwie anbieten das es nicht so lagged?"

**Decision:** out of scope fürs Startup-Programm (Kapazität-First: functioinal Starter-Tier shipped
before render-buffer). Auf die **Roadmap** gesetzt.

**Design-Snapshot (für später, Recherche verifiziert 2026-10-14):**

- WebRTC/utility-Kosten sind **immer im Preis enthalten** — utility-Container mit lokalem
  Chromium-Renderer (WebRTC-Kiosk, neko) läuft DIREKT in der User-Infra sowohl self-hosted als
  enterprise-starter (kein Premium-Zwang für die Basis-Feature).
- Premium-Render/Buffer-Option (Enterprise-Add-on, Tenant Session-Metered):

| SKU | Preis (on-demand northeurope) | Einstufung |
|---|---|---|
| **NVads A10 v5 (1/6 GPU, 3 GB, 4 vCPU)** — Partitionierbar | ~$0.60/h ≈ 44 €/8-Std-Tag, ~440 €/Monat 24/7 | **empfohlenes SKU** (GPU-Partitionierung, Linux + neko-kompatibel) |
| NVads A10 v5 Spot-Preise (~70 % discount) | ~$0.18–0.30/h | warm-Pools + Session-Recycling = realistisches Enterprise-Tier-Bill |
| NVv5 8×A10 full GPU | ~$3.62/h | nur Batch-Render, zu teuer für Chromium-Stream |
| AVD (Azure Virtual Desktop) | $5.50/user/Monat + compute | windows-first, passt nicht zu unserem Linux-Stack |

- **Session-Metered-Billing** (Stripe-Usage-Records — Exporter existiert), **kein Flat-24/7**
  (sonst DoW-Risiko), 30-s-Idle-Recycling pro Tenant-Slot
- Tenant-Route inseln-WebSocket: `<ws>.jimesh.io/render`, gleiches-Region Proxied, RTT-Ziel <50 ms
  (live-messbar, nicht gerne garantiert)
- **Kein Azure-natives "WebRTC Renderer"-Produkt** — GPU-VM wird von uns gehostet (auf unsr
  AKS/node pool); Azure Angebot überspringt zu participação only
- Container-Deployment: user-side (self-hosted) = zero-cost (kiosk in user infra), enterprise =
  GPU-Tier-Option via dashboard-toggle
