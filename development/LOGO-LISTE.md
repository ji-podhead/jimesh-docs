# LOGO-LISTE — Alle Brand-Assets und ihre Quellen

> **Prinzip:** OEM-Logos NICHT im Repo speichern — nur URLs dokumentieren oder generische lucide-react Icons.
> Für die Website: SVG-Links oder inline-SVGs die wir selbst gestalten.

---

## 1. VORHANDEN im Repo (assets/icons/integrations/)

| Logo | File | Typ | Quelle |
|---|---|---|---|
| ARTEMIS | artemis.svg | SVG | github.com/google/artemis |
| DrawIO | drawio.png | PNG | Wikimedia |
| Figma | figma.png | PNG | Wikimedia |
| KasmWeb | kasm.svg | SVG | homarr-labs CDN |
| open-code-review | open-code-review.svg | SVG | github.com/alibaba/open-code-review |
| OPNsense | opnsense.png | PNG | Wikimedia |
| Playwright | playwright.svg | SVG | github.com/microsoft/playwright |
| Snyk | snyk.png | PNG | Wikimedia |
| Stitch | stitch.svg | SVG | app-companion (Google) |

## 2. FEHLENDE OEM-LOGOS (für Plugin-Catalog + Website)

| Logo | CDN-URL | Für |
|---|---|---|
| **Neon** | https://neon.com/favicon.svg oder https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/neon.svg | Neon DB Plugin |
| **Supabase** | https://supabase.com/favicon.svg oder https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/supabase.svg | Supabase Plugin |
| **Tinybird** | https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/tinybird.svg | Tinybird Plugin |
| **Linear** | https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/linear.svg | Linear Plugin |
| **Langfuse** | https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/langfuse.svg | OTel Export |
| **Grafana** | https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/grafana.svg | Tempo Backend |
| **Tailscale** | https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/tailscale.svg | VPN |
| **v0 (Vercel)** | https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/vercel.svg | v0 Plugin |
| **Context7** | https://context7.com/favicon.ico | Context7 Plugin |
| **Wazuh** | ✅ assets/icons/others/wazuh.svg | SIEM |
| **Falco** | ✅ assets/icons/others/falco.svg | eBPF |
| **Docker** | ✅ assets/icons/dev_logos/docker.svg | Container |
| **Go** | ✅ assets/icons/dev_logos/go.svg | Backend |
| **gVisor** | ✅ assets/icons/dev_logos/gvisor.svg | Sandbox |
| **Headscale** | ✅ assets/icons/dev_logos/headscale.svg | VPN-Mesh |

## 3. HOMARR-LABS CDN als Universal-Quelle

https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/<name>.svg

Das homarr-labs Repo hat hunderte Brand-SVGs. Verfügbare (relevant für JiMesh):
neon, supabase, linear, grafana, tailscale, vercel, kasm, figma, playwright,
docker, github, openai, anthropic, google, cloudflare, mongodb, postgresql,
redis, nginx, keycloak, wazuh, falco, opnsense, pfsense

**Vorteil:** CDN-URLs — keine Repo-Speicherung nötig, immer aktuell.
**Nachteil:** Internet-Abhängigkeit — für offline: als Fallback lokal cachen.

## 4. LUCIDE-REACT GENERIC Icons (für Website)

Für generische UI-Icons auf der Website (KEINE OEM-Logos):
- Server, Database, Container, Network, Shield, Lock, Globe, Terminal,
  Bot, Wrench, Settings, Eye, Zap, Layers, GitBranch, Cloud, Cpu, MemoryStick,
  HardDrive, Activity, AlertTriangle, CheckCircle, ArrowRight, Menu, X

## 5. JIMESH EIGENES LOGO (selbst gestalten!)

Für die Website brauchen wir ein ECHTES JiMesh-Logo:
- Geometrisches Mesh-Network-Icon (knotenverbundene Punkte/Linien)
- Violet (#8b5cf6) als Primärfarbe
- Animierbar (SVG-Paths für draw-in Animation)
- Als SVG inline in der Website (keine externe URL)
