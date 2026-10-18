# SPRINT-49 — Honest-Degradation-Fixes (Firewall/Plugins/Security), Deploy-Blocker dokumentiert

**Status:** ✅ DONE (2026-09-27) — 3 Subagents parallel gelaufen. Überraschendes Ergebnis: 8 von 9
BACKLOG-Punkten (#162 teilweise, #168, #169, #171) waren bereits durch frühere Commits (`0e26fd3`,
`d896849`, `18f1c71`, `8ce45a0`, `9200883`, alle 21.-26.9.) gefixt — BACKLOG.md war nur nicht
nachgezogen. Ein echter, NEUER Bug wurde dabei gefunden: siehe "Echter Fund" unten.

## Echter Fund (nicht im ursprünglichen BACKLOG-Eintrag)

Der vorige Fix von #162s Failover-Statistik (Commit `0e26fd3`) ersetzte die erfundenen Literale
("100% Recovered"/"18ms") durch `chains.filter(c => c.health === 'healthy').length` und
`c.hops?.length` — **aber weder `health` noch `hops` existieren im `Chain`/`ChainData`-Modell**,
weder im Go-Backend noch im TS-Interface. Das kompilierte optisch "echt", war aber totes Feld-Access
(`undefined`), das still immer `0/N Recovered` und `1.0 hops avg` gerendert hätte — eine subtilere
Wiederholung genau des "Green Lie"-Musters, das das Mandat verbietet, plus zwei echte
`TS2339`-Compile-Fehler. Gefixt: ehrlicher "Not tracked"-Zustand mit Erklärung, `ShieldQuestion`
statt fälschlich-grünem `ShieldCheck`. Verifiziert: `tsc` clean (die 2 echten Fehler weg), `next build`
erfolgreich, Vitest 275/275 grün.
**Auslöser:** Operator, 2026-09-27 — "die sidebar ist der horror", gefolgt von einer Design-vs-Realität-
Analyse (Prompt 1 `docs/PROMPTS-STITCH-DESIGN.md` vs. `HierarchySidebar.tsx`) und der Frage "was ist
mit der firewall wieso kann man nix installieren oder projects oder deployments/app nix funktioniert".
**Betroffen:** `src/frontend/src/views/ProxyChainsPage.tsx`, `PluginInstallWizardDialog.tsx`,
`PluginSettingsPage.tsx`, `SecurityFindingsPage.tsx`

---

## Zwei völlig verschiedene Kategorien von "funktioniert nicht" — nicht vermischen

**Kategorie A — Frontend zeigt Fake-Zustände statt echter Prüfungen (Code-Fix, subagent-geeignet,
kein Produktions-/Remote-Zugriff nötig):**

| # | Datei | Fund |
|---|---|---|
| 162 | `ProxyChainsPage.tsx:763` | `key.status \|\| 'healthy'` — Key ohne Status wird als "healthy" angezeigt. Plus: `"eBPF Token Gate: Enforced"`-Badge ohne Prüfung (Z.288-294), "Simulate Prompt Route"-Button ohne `onClick` (Z.296-299), erfundene Failover-Statistik "100% Recovered"/"18ms" (Z.360-366), "Verify Node Config" zeigt nur Fake-Toast (Z.779-785) |
| 168 | `PluginInstallWizardDialog.tsx` | `handleTestConnection` (Z.88-94) ist ein `setTimeout`, meldet nach 600ms IMMER Erfolg; Capability-Liste in Schritt 3 (Z.420-442) für jedes Plugin identisch hartcodiert statt aus dem Manifest |
| 169 | `PluginSettingsPage.tsx` | "Save & Reload" (Z.308), "Discard Changes" (Z.305), "Sideload Plugin" (Z.98-101) haben KEIN `onClick` — komplett tot. "Live Plugin Event Stream" (Z.281-300) ist eine hartcodierte Zeile |
| 171 | `SecurityFindingsPage.tsx:72` | nutzt generisches `/api/sdk/logs?type=audit&level=ERROR` statt des bereits existierenden, dedizierten `POST /api/projects/{id}/iac-files/scan`-Backends — reines Wiring-Problem, kein Backend-Gap |

Fix-Prinzip (Repo-Mandat, siehe `discord_reporting.py:18` in jimesh-crew und `DashboardBuilderPage.tsx`s
ehrliches Phase-2-Banner als Vorbild): wo kein echter Check möglich ist, **klar als "nicht verfügbar"
kennzeichnen statt einen falschen Erfolg zu simulieren** — kein stiller Mock, keine erfundenen Zahlen.

**Kategorie B — Echte Infrastruktur-/Credential-Blocker (NICHT subagent-geeignet, kein Code-Fix,
braucht den Operator):**

| # | Fund |
|---|---|
| 123 | Control-Plane-Eintrag für `trading` existiert (`type=ssh, endpoint=100.64.0.6:22`), aber **Credentials für den ssh-Typ wurden nie hinterlegt** — ohne die kann kein echter Deploy/Provision-Call laufen |
| 126 | Direkter SSH-Zugriff auf `trading`s öffentliche IP (`187.124.2.174`) ist blockiert ("Connection timed out", Firewall-Drop-Charakteristik) — der normale Ansible-Weg (`make redeploy`/`make provision-node`) ist damit komplett blockiert. Einzig funktionierender Weg: VPN-Tunnel über Headscale, Port 2222 (heute mehrfach live verifiziert) |
| — | **gVisor-Erinnerung des Operators: "GVISOR IST IM IAC CODE"** — `src/scripts/init-gvisor.sh`/`install-gvisor.sh` + `internal/deploy/node_provision.go` installieren `runsc` bereits automatisch per SSH-Provisioning. Kein manuelles `runtime: runsc` in irgendeiner docker-compose.yml nachtragen (Fehler, der in jimesh-crew RM26 schon einmal gemacht und korrigiert wurde) — dieselbe Regel gilt hier |

Kategorie B braucht: (a) echte SSH-Credentials für den `trading`-Control-Plane-Eintrag vom Operator,
(b) eine Netzwerk-Untersuchung, warum die Public-IP blockt (Hypothese aus #126: IPv6-vs-IPv4-Mismatch
im `deploy/ssh-allowlist`, ungeprüft) — **kein Subagent startet hierzu selbstständig SSH-Verbindungen
oder Firewall-Änderungen gegen den echten Server**, das bleibt explizit beim Operator/einer
freigegebenen Session.

## Nicht Teil dieses Sprints (zu groß, eigener Sprint nötig)
- #170 (Integrations-Seite: fehlendes "Active Deployments"-Sidecar-Management) — ganzes fehlendes
  Feature, kein kleiner Fix.
- #128 (Deployment-Detail-Seite hat keine Route) — braucht erst eine Routing-/Daten-Entscheidung.
- Der ScopeSelectorModal-vs-einfacher-Baum-Rückbau (Sidebar-Diskussion von vorhin) — eigener Sprint,
  UX-Entscheidung nötig, kein reiner Bugfix.
