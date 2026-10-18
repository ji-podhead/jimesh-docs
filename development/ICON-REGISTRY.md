# ICON-REGISTRY — Alle Assets und wo sie herkommen

> **Prinzip:** Logos/Brand-Assets liegen NICHT im Repo wenn sie eine CDN-URL haben.
> Wir halten lokale Kopien als Fallback (offline-Fähigkeit), aber jede Icon-Referenz
> führt auf die URSPRUNGS-Quelle. Neue Icons: hier eintragen + downloaden.

---

## 1. Integrations-Icons (assets/icons/integrations/)

| Icon | Datei | Quelle | Lizenz | Größe |
|---|---|---|---|---|
| OPNsense | opnsense.png | https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Opnsense-logo.svg/960px-Opnsense-logo.svg.png | BSD-2 (OPNsense) | 28K |
| Snyk | snyk.png | https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Snyk_Logo.svg/960px-Snyk_Logo.svg.png | Snyk Brand | 24K |
| Google Stitch | stitch.svg | https://app-companion-430619.appspot.com/static/stitch-word.svg | Google Brand | 4K |
| Figma | figma.png | https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/Figma-logo.svg/500px-Figma-logo.svg.png | Figma Brand Guidelines | 20K |
| Playwright | playwright.svg | https://raw.githubusercontent.com/microsoft/playwright/master/packages/web/src/assets/playwright-logo.svg | Apache-2.0 | 8K |
| DrawIO (diagrams.net) | drawio.png | https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Diagrams.net_Logo.svg/960px-Diagrams.net_Logo.svg.png | Apache-2.0 (DrawIO) | 28K |
| KasmWeb | kasm.svg | https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/kasm.svg | Kasm Brand (via homarr-labs) | 4K |

| **open-code-review** | open-code-review.svg | https://github.com/alibaba/open-code-review/raw/main/imgs/logo-core.svg | Apache-2.0 (Alibaba) | 4K |

| **ARTEMIS (Google)** | artemis.svg | https://github.com/google/artemis/raw/main/docs/assets/logo/logo.svg | Apache-2.0 (Google) | 4K |

## 2. Bestehende Security-Icons (assets/icons/others/)

| Icon | Datei | Verwendung |
|---|---|---|
| Wazuh | wazuh.svg | SIEM-Integration |
| Falco | falco.svg | eBPF-Runtime-Security |
| Checkov | checkov-generated-unverified.svg | IaC-Scanner |
| Coraza | coraza.svg | WAF |
| + 5 weitere | others/*.svg | siehe ls |

## 3. Dev-Tool-Logos (assets/icons/dev_logos/)

| Icon | Datei | Verwendung |
|---|---|---|
| Docker | docker.svg | Container-Badges |
| Go | go.svg | Backend |
| gVisor | gvisor.svg | Sandbox-Flag |
| Headscale | headscale.svg | VPN-Mesh |
| + 6 weitere | dev_logos/*.svg | siehe ls |

## 4. Agent-Icons (assets/icons/agents/ — PNG)

| Icon | Datei | Verwendung |
|---|---|---|
| Claude Code | claude-code.png | Agent-App |
| DSH (DeepSeek) | deepseek-harness.png | Agent-App |
| Gemini CLI | gemini-cli.png | Agent-App |
| OpenCode | opencode.png | Agent-App |
| Cursor | cursor.png | Agent-App |
| Codex | codex.png | Agent-App |
| + 10 weitere | agents/*.png | siehe ls |

## 5. Provider-Logos (assets/icons/providers/ — PNG)

| Icon | Datei | Verwendung |
|---|---|---|
| OpenAI | (in providers/) | LLM-Chain-Node |
| Anthropic | (in providers/) | LLM-Chain-Node |
| Nvidia | nvidia.png | LLM-Chain-Node |
| Cloudflare | cloudflare.png | Provider |
| Google | google.png | Provider |
| Groq | groq.png + groq-dark.png | LLM-Chain-Node |
| Mistral | mistral.png | LLM-Chain-Node |
| HuggingFace | huggingface.png | Provider |
| + 5 weitere | providers/*.png | siehe ls |

## 6. Network-Icons (assets/icons/network-icons-svg/ — 67 SVGs)

Cisco/Arista/Generic: Switch, Router, Firewall, Server, Cloud, Load-Balancer
→ Für Netzwerk-Topology-Diagramme

## 7. AWS-Icons (assets/icons/aws_svg/ — 311 SVGs)

Kompletter AWS-Icon-Satz (Analytics, Compute, Database, Networking, Security...)
→ Für Cloud-Provider-Integration

## 8. Brand-Assets (assets/icons/brand/ — 54 SVGs)

→ JiMesh-eigene Brand-Assets + Provider-Brand-Varianten

---

## FEHLENDE ICONS (noch herunterladen)

| Icon | Quelle | Für |
|---|---|---|
| Neon (DB) | https://neon.tech/brand | Neon-Plugin |
| Supabase | https://supabase.com/brand | Supabase-Plugin |
| Tinybird | https://tinybird.co/brand | Tinybird-Plugin |
| Context7 | https://context7.com | Context7-Plugin |
| v0 (Vercel) | https://v0.dev | v0-Plugin |
| Linear | https://linear.app/brand | Linear-Plugin |
| Langfuse | https://langfuse.com/brand | OTel-Export |
| Grafana Tempo | https://grafana.com/brand | OTel-Backend |
| Tailscale | https://tailscale.com/brand | VPN-Alternative |

## DOWNLOAD-HELPER

```bash
# Neues Icon hinzufügen:
curl -sL -o assets/icons/integrations/<name>.<ext> '<url>'
# Dann in diese Registry eintragen
```
