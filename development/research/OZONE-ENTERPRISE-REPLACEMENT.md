# RESEARCH: Apache-Ozone → Azure-Managed Ersatz (Datalake-Enterprise-Upgrade)

**Datum:** 2026-10-14
**Operator-Frage (wörtlich):** „haben wir eigentlich auch ozone enterprise ersatz?"

## Status Ozone im JiMesh-Kontext (verifiziert)

- `deploy/datalake/defaults.yml` verifiziert: Datalake schreibt jeden Event via SigV4
  **1:1 in Apache Ozone's S3-Gateway** (`jimesh-ozone-s3g:9878`, `deploy/ozone`, das
  jimesh Duck-net), Requires `OZONE_S3_ACCESS_KEY/SECRET_KEY` (SigV4-Creds via
  `ozone s3 getsecret`).
- Fixpunkt (Operator-Budget-Doc jimeshOps ab236a5): S3/OSS-Datalake ist **self-hosted**
  im Fleet-Cluster; OpenSearch-SIEM sind ebenso self-hosted (Sentinel zu teuer).
- Eine **Managed Alternative** existiert allerdings erst ab **ADLS Gen2** aktiviert (bzw.
  Blob Tiering pay-as-you-go), siehe unten.

## Azure Managed-Ersatz (Azure Data Lake Storage Gen2 = ADLS)

| Eigenschaft | Apache Ozone (self-hosted) | **ADLS Gen2** (Azure Blob Hierarchy Namespace) |
|---|---|---|
| API/Semantik | S3-kompatible assicSigV4-Endpoint (SigV4) | Blob-REST + **Data Lake SDK (HNS)**, S3-kompatibler Gateway **nur via minio Proxy-Adapter Dritter** (nicht native) |
| Auth | SigV4-Static-Key (`ozone s3 getsecret`) | **Managed Identity** (kein Static-Key, A7-erfüllt!) + RBAC`
| Netzwerk | jimesh-net (Docker-only) | VNet-Performance + Azure-Private-Endpoint (privat), kein Public-IPv4 |
| Skalierung | Self-scaling über Cluster | Managed, petabyte-ready, Zonen-Redundanz |

**Kosten** (verifiziert, northeurope, Standard-LRS):
| Posten | Preis |
|---|---|
| Blob hot storage | ~€0.0208/GB/Monat |
| Operationen ~10.000 writes | ~€0.005/10k |
| Egress (Internet) | €0.05–0.087/GB |
| Private-Endpoint (per EP) | ~€7.30/Monat + Ingress €0.01-0.03/GB |
| ADLS Gen2 HNS-Setup | €0.00 (kein Δ vs. Blob hot) |
| ** Bei 10 GB Datalake/Monat → ink. Egress ≈ €1.07–2/Monat** | „verglichen mit Ozone im own fleet = node-hours only" |

## Ersetzt die self-hosted Ozone-Stack (in jamesh deploy/ozone):

| Container | Selbst-hosted | Managed-Ersatz |
|---|---|---|
| jimesh-ozone-s3g | S3-Gateway (SigV4-signiert) | **Direkter ADLS-SDK-Call im `datalaked` sink** |
| jimesh-ozone-om | Ozone-Mainframe-Management-Server | entfällt (managed HNS-Hierarchie) |
| jimesh-ozone-SCM | Storage-Container-Manager | entfällt (ZRS/LRS-Redundanz)+blob-Skala |
| **Datalaked (Go) sink** | S3-Gateway-Sink封建 | **ADLS-Sink** (path: `datalake-raw/<topic>/<events.jsonl>` und per jimesh-io-mode names) |

## Work Packages

| Nr | Task | Status |
|---|---|---|
| OZ-1 | `cmd/datalaked/sink.go` bekommt ein **ADLS**-Backend via env `DATALAKE_SINK=adls\|opensearch\|ozone` (wir haben bereits `opensearch`-Backend als zweites Backend aus Sprint-229 — das Pattern wiederverwenden) | [x] **feat-oz-adls-sink 434ee640** (JiMesh2, gepusht): drittes Backend `DATALAKE_SINK=adls` (default UNVERÄNDERT = ozone-s3, unknown→exit mit Fix-Zeile). REST-Shape je Record (api-version=2024-11-04, x-ms-version, JEDES Path-Segment escaped): `GET /?resource=account` (Startup-Probe, hns=false→fatal-HNS-Gate) · `GET/PUT /<fs>?resource=filesystem` (ensure, ozone-ensureBucket-Parity) · `PUT /<fs>/<objectKey>.jsonl?resource=file&mode=overwrite` → `PATCH ?action=append&position=0` (x-ms-content-md5) → `PATCH ?action=flush&position=<len>&close=true` — 1 JSONL-Row/Record, deterministischer objectKey-Twin, replay-idempotent; /status bekommt additive `adls`-Blöcke. |
| OZ-2 | Auth via **Managed Identity** (A7-Ansatz: kein Static-Key, keine veralteten SigV4-Creds) mit Stdlib-REST-call auf `vault.azure.com`-Bearer (wie `secrets-wrapper keyvault`-IMDS-Pattern) | [x] **feat-oz-adls-sink 434ee640**: IMDS-Rezept aus `secrets-wrapper/internal/secrets/keyvault/keyvault.go` übernommen (resource → `https://storage.azure.com/` statt vault.azure.net): Header `Metadata:true`, 3 Retries (backoff×attempt), Token-Cache 5min (+60s-Skew bei kurzem expires_in), Bearer lebt NUR im Header — Proof: 8 neue Tests in `cmd/datalaked/sink_test.go` (u.a. Token-Cache 2 Writes→1 IMDS-Fetch + ident. Bearer je DFS-Call; Bearer-never-leaks in Logs/Error-Strings; byte-exact Row + Server-Edge-MD5; Cross-Sink-Array-Envelope byte-gleich zum Sprint-229-Opensearch-Sink). Ehrliche Deviation: keine `x-ms-encryption-algorithm:MD5` — der Header ist CPK/AES256-only, `x-ms-content-md5` ist die Checksum-Realisation. |
| OZ-3 | Terraform `iac/terraform/azure/modules/adls` (Storage-Account `hns=true`, `private_endpoint` jimesh-jiness-net, VNet-Integration, output blob-connection-string as optional dbg) | [x] (uncommitted in jimeshIO-Working-Tree): `modules/adls` — `azurerm_storage_account` (`is_hns_enabled=true`, `account_replication_type=ZRS` Fleet-Redundanz, `min_tls_version=TLS1_2`, `shared_access_key_enabled=false` Industrieharden, Public-Access OFF) + `azurerm_storage_data_lake_gen2_filesystem` + `azurerm_private_endpoint` (subresource `dfs`, Pattern-Reuse redis) + `azurerm_role_assignment` **Storage Blob Data Contributor** auf die CP-Node-Identity (`system_assigned_principal_id` aus dem vm-Modul) + `dfs`-Zones-Slot im private-dns-Modul (`privatelink.dfs.core.windows.net`). **Bewusst KEIN** blob-connection-string-Output (Abweichung vom ursprünglichen Sketch: kein Static-Key-Eingang, README-Bootstrap-Sektion dokumentiert Ownership). Gates: `terraform init -backend=false` + `validate` grün (azurerm 4.81 plugin-cache), nie apply. |
| OZ-4 | Migration-Contract: „ozone-orientiertes JSONL → ADLS-JSONL" (Adressbasiert `datalake-raw/<topic>/<window>.jsonl`) + proofs (same byte-exact events pro topic wie Sprint-229-OP-OPENSEARCH-Isolation) | [ ] — **refiniert (H2, SECURITY-AUDIT-2026-10-15): das Sink-Landing-Pfad-Konzept ist jetzt TENANT-SCOPED**, nicht nur per-topic: Zielpfad-Shape `<fs>/tenant=<tenant_id>/<topic>/dt=<date>/<unixmicros>-p<partition>o<offset>.jsonl` (analog OpenSearch-Index-Namespace mit tenant-Präfix) — d.h. JEDE Migration/Bewegung dieser Row setzt einen `tenant=<tenant_id>`-Pfad-Segment-VOR das `<topic>`-Segment (preprocess → per-tenant sink), und der OZ-4-Cross-Tenant-Test beweist: ein Cross-Tenant-Write landet NIE im selben `<topic>/`-Folder-Präfix wie ein anderer Tenant (Folder-Präfix-Isolation, kein Topic-Naming-Vertrauen). Aktueller Stand: per-topic Contract (objectKey `<topic>/dt=...`) ist im JiMesh2-Code DOKUMENTIERT und test-locked (`cmd/datalaked/sink_test.go TestPerTopicTenantScopeContractBoundary`, operator-visibility: gleiche Topic = gleiches Folder-Präfix, verbindungslose Tenant-Schranke) — der Tenant-Prefix-Flip + Cross-Tenant-Leak-Assertion ist der erste Commit der OZ-4-Lane. |
| OZ-5 | Enterprise-Tier-Upgrade: nur Premium-User bekommen ADLS-Managed-Datalake als managed-featured-service (Add-on billing via Fraction-Base der Add-on-Stripe-Metering-Records-Analogie zu Databricks/Sentinel im BUDGET-MATRIX-Doc) | [ ] |

## Effekte auf GitHub-Repos

- **JiMesh**: kein Codebreak — ist Add-on (`DATALAKE_SINK=adls` env-tilt), default bleibt `ozone` (Sprint-229's `opensearch`-Backend-Muster ist genau die Pass-Sote für einweiteres).
- **jameshOps** Budget-Feature: Azure-Managed-Datalake ins Budget-Matrix-Doc (add-on „Datalake-managed" klar), Ops-EBäck (0 Administrationsaufwand für o3-node-Ordner).
- jimeshOps HDokt (this repo best change): new research doc to curve уте data that the user's budget plan portrayed.
