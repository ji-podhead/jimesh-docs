# SPRINT-178 — Safe Local LLM + abgesicherter Chatbot (Vercel × Cloudflare × Tailscale)

**Status:** Planung (WP0/Anforderungs-Sammlung) — kein Deploy, kein Code außer Doku
**Anlass:** Operator-Order vom 1.10.2026, nach dem **Tutario-Inzident**

---

## Anlass (rechtlich bindend für diesen Sprint)

Der bestehende Chatbot wurde auf der **Tutario-Seite getestet** → **Abmahnung**. Daraus folgt
zwei harte Regeln, die vor jedem anderen Requirement gelten:

1. Der Chatbot wird **komplett neu geschrieben** — kein Weiterbetrieb, keine Wiederverwendung
   des bisherigen Verhaltens.
2. **Kein Test, kein Probebetrieb, kein Embedding auf fremden Domains.** Nur eigene Domains,
   eigene Testinstanzen, eigene Nutzer. Das ist keine Präferenz, sondern die Bedingung, unter
   der es dieses Feature überhaupt gibt.

---

## Operator-Order (verbatim, 1.10.2026)

> „stimmt wir sind endlich auf jimesh, kann ich deploen da? ich wurde ewgen dem tutario
> incident von saits abgemahnt weil wir den chatbot auf der tutario seite getestet haben,
> also müssen wir den wohl neuschrieben, aber dann halt sicher. das liegt bei ihc24.
> können wir nicht wenn wir die cuda treiber installiert haben ein safe local llm irgendwie
> bauen wo man garantieren kann das die cotnaner nicht exposed sind und man das secure als
> chatbot oder internen chat für die firma benutzen kann? wir hosten bei vercel aber für den
> chatbot würde ich dann eine subpage machen die ein eigenes robots txt hat damit man das
> nciht so leicht ficken kann aber die hauptseite halt nice für seo und scraper ausgelegt
> bleibt, nur unser chatbot für humans halt ordentlcihe x-authentication header und owasp
> rules bei cloudflare hat und nen captcha und dass wir erstmal krass limitieren und
> ratemllimiten aber für ein google login mehr quota geben und das trotzdem userfreudlich
> ist, nur halt sicher. das ding wäre dann das wir das über den jwt token und serverside
> halt die leute ratelimiten oder blocken wenn sie von versicherungen abweichen und nicht
> eingeloggt sind und eventuell statt nur llamaguard sogar noch jev oder descicion models
> einbinden und dann einfach auch so nen algorithmishcen chatbot benutzen bei bestimmten
> fragen die general sind oder wenn wir in ner grauzone sind wo wir nicht wissen ob das ein
> human ist, ode reinfach bei formular daten die wir abfragen als widget oder generll widgets
> also reactiv+proactive. das muss wegen local dann wiegesagt safe über ein vercell app und
> tailscale/headscale laufen mit cloudflare als middleware und dann noch unsere hardcore
> rules und dann am ende auf der local llm aber da sollen keine ports offen sein oder sonst
> was und x-headers + jwt headers + ratelimiting basierend auf den header ttl das wir das
> garnicht erst speichern müssen wenn wir jemand blacklisten das ist direkt über secure form
> und jwt und localstorage in seinem browser geklärt. auch wenn er nicht eingeloggt ist dann
> halt trotzdem über jwt und nen cookie und seine ip oder so auch direktverknüpft oder in dem
> format das wir das späeter direkt für das crm benutzen können oder den irgendwie validieren
> können und das nicht selber spechern müssen wenn wir den flaggen, oder dann am ende sogar
> noch competitors draus ziehen oder den angriefer zurückverfolgen und daraus analyse machen
> etc“

---

## Zielbild (aus der Order abgeleitet, in der Reihenfolge der Pfadlänge)

```
Nutzer ──► Cloudflare  (WAF/OWASP-Managed-Rules, Rate-Limiting-Rules, Turnstile/Captcha,
           Bot-Rules, Bot-Management)          ← einziger öffentlich erreichbarer Punkt
             │
             ├──► Vercel  (Hauptseite: SEO/Scraping-freundlich;
             │            /chat: eigene robots.txt mit Disallow, eigener Cache-Header)
             │
             └──► Gateway-Policy (JWT-Prüfung, Quota, TTL-Bound Rate-Limit,
                                  Safety-Gate) ──► Mesh (tailscale/headscale)
                                                        │
                                                        ▼
                                          Local LLM auf CUDA
                                          • Container ohne publish-Port
                                          • nur per Tailnet-Adresse/loopback erreichbar
                                          • kein Ingress, kein 0.0.0.0-Listener
```

**Kernprinzip:** Der einzige öffentliche Port ist Cloudflare. Alles dahinter existiert nur im
Mesh (bzw. bei Vercel ohnehin nur als App ohne eigenen Server-Port in der öffentlichen
Zone) — genau die Garantie, die der Operator für die Container fordert.

---

## Die sechs Subsysteme

### S1 — Local LLM auf CUDA (kein offener Port)
* Treiber/Stack: `nvidia-container-toolkit` + CUDA-Image; Inferenz-Server bindet
  **nur** auf `127.0.0.1` bzw. die Tailnet-Adresse (nie `0.0.0.0`), ohne `ports:`
  im Docker-Compose-Sinn.
* Erreichbarkeit ausschließlich aus dem Mesh (client2/gateway-Container per
  `curl http://<tailnet-ip>:<port>`), Firewall ohne jede public Regel.
* Modell/Quantisierung: **offene Entscheidung** (siehe Offene Punkte).

### S2 — Vercel: zwei Seiten, zwei Signale
* Hauptseite: unverändert SEO-/Scraper-orientiert.
* `/chat`-Subpage: **eigene `robots.txt`** (`Disallow: /chat/`), eigene
  `X-Robots-Tag: noindex, nofollow`, Cache-Header so, dass kein öffentlicher Cache
  die Seite ausliefert.
* Kein Chatbot-Embedding auf Seiten Dritter (Tutario-Regel).

### S3 — Cloudflare als Middleware
* OWASP-Managed-Rules (WAF) + eigene Rate-Limiting-Rules pro Route.
* Turnstile/Captcha für **nicht** eingeloggte Nutzer; Google-Login-Nutzer ohne
  Challenge, aber mit höherer Quota.
* Cloudflare Tunnel → kein offener Port am Host, kein direkter Zugriff auf Vercel-/
  Gateway-Backends.

### S4 — Auth, Rate-Limit, Blacklisting **ohne Server-Speicherung**
* Stateless-Modell: die **TTL des JWT** IST die Sperre — abgelaufenes Token gilt nichts
  mehr, kein Redis-, kein DB-Eintrag nötig. Blacklist = Token nicht verlängern.
* Quota-Schlüssel: JWT-`sub` (eingeloggt) → höhere Quota; sonst
  `HMAC(IP, Server-Secret)` + Cookie → **nicht** Klartext-IP speichern, aber im
  HMAC-Format, das später direkt ins CRM übernommen/validiert werden kann.
* Header-Set: `Authorization: Bearer …`, `X-Request-Id`, `X-Client-TTL`, Turnstile-Token.
* Abweichungen (von Versicherung/Regel abweichende Anfragen) → automatisch niedrigere
  Quota bis Token-Ablauf, danach automatisch frei.

### S5 — Safety-/Entscheidungs-Stack (statt reinem LlamaGuard)
* Moderation-/Policy-Gate vor der Inferenz **und** nach der Antwort.
* **Grauzone (unbekannter Mensch / generische Frage)** → statt teurer Modellantwort
  den **algorithmischen Chatbot** (formularbasiert, deterministisch, verifizierbar).
* Reactive + proactive Widgets (Formular-Datenabfrage, Nachfragen).
* Der Vergleich/Vorspann zu „JEV oder Decision-Models" wird in WP0 als konkrete
  Auswahl entschieden (Anbieter, Latenz, Kosten, Selbst-Hostbarkeit) — nicht offen
  im Code stehen gelassen.

### S6 — Analyse/Weiterverwendung
* Flags/Auffälligkeiten im CRM-tauglichen Format (HMAC-IP, JWT-`sub`, Zeitfenster),
  ohne dass wir Rohdaten (echte IP) lange halten müssen.
* Abgleich/Wettbewerber-Analyse nur aus eigenen Traffic-Logs — **niemals** aus
  Daten, die durch Anfragen auf fremden Seiten entstanden sind.

---

## Aussperrungs-Regeln (gelten weiterhin, S176)

1. Alter headscale (trading) unberührt; superleos Host-Tailscale unberührt; podheads
   primäre Verbindungen unberührt (`client-join.sh` bleibt bridge-Mode).
2. Zweites Tailnet: eigener Pool `10.80.0.0/16`, eigene v6-Range, eigene `base_domain`.
3. **Kein Deploy ohne explizite Operator-Bestätigung** — besonders: kein Deploy der
   Chatbot-Subpage, solange die Tutario-Frage nicht final geklärt ist.

---

## Work Packages (Reihenfolge)

| WP | Inhalt | Abhängig von |
|----|--------|--------------|
| WP0 | Recherche & Entscheidung: CUDA-Node, Modell/Quantisierung, Safety-Gate-Anbieter (LlamaGuard vs. Decision-/Eval-Modell), Cloudflare-Plan (Free/Pro: Rate-Limit-Features), Domain der Subpage | — |
| WP1 | Local-LLM-Stack (Compose, GPU, `127.0.0.1`-Bind, kein publish-Port, Healthcheck) | WP0 |
| WP2 | Gateway-Policy: JWT-Issuer/Prüfung, TTL-basierter Rate-Limit, HMAC-IP-Identität, Quota-Tiers (Gast/Google) | WP0 |
| WP3 | Vercel-Subpage `/chat` + eigene `robots.txt` + `X-Robots-Tag` | WP2 |
| WP4 | Cloudflare: WAF-Rules, Rate-Limit-Rules, Turnstile, Tunnel (ein einziger öffentlicher Pfad) | WP3 |
| WP5 | Widgets (reactive + proactive) + algorithmischer Grauzonen-Chatbot | WP1, WP2 |
| WP6 | Safety-Gate vor/nach Inferenz, Logging-Format für CRM/Analyse | WP1, WP5 |
| WP7 | Doku-Mandat (API_DOCS, dieses File, Backlog) + Testfall-Katalog inkl. „kein Test auf fremden Domains" | alle |

**Acceptance Criteria (Sprint-Gesamt):**

1. Local-LLM-Container: **kein** veröffentlichter Port (`docker port` leer), nur per
   Tailnet-Adresse antwortbar; vom Host aus per Public-IP inakzessibel (bewiesen mit
   Portscan, nicht behauptet).
2. `/chat` liefert eigene `robots.txt` mit `Disallow`, Hauptseite unverändert.
3. Nicht eingeloggt: Turnstile + striktes Rate-Limit; mit Google-Login: höhere Quota,
   keine Challenge — nachweisbar anhand der Regeln, nicht nur im Code.
4. Blacklisting braucht keinen Server-State: abgelaufenes Token wird ohne Lookup
   abgelehnt (Test).
5. Grauzonen-Fragen laufen in den deterministischen Chatbot statt ins LLM (Test).
6. Dokumentation vollständig (API_DOCS + Sprint + Backlog), keine Mocks.

---

## Offene Punkte (brauchen Operator-Entscheidung, Blocker für WP0)

1. **GPU**: Auf welchem Node liegt die CUDA-Karte (trading / superleo / dritter)? Modell,
   VRAM, Treiberstand (`nvidia-smi`) — ungeprüft, keine Annahme treffen.
2. **Modell**: Größe/Quantisierung/Architektur für den Token-Budget-Fall.
3. **Cloudflare**: Zone/Plan vorhanden? Managed-OWASP + Rate-Limiting + Turnstile
   brauchen je nach Plan unterschiedliche Konfiguration.
4. **Domain** der Chatbot-Subpage und woher sie betrieben wird (Vercel-Projekt/Team).
5. **Safety-Gate**: LlamaGuard-Weiterführung, Selbst-Host eines Decision-/Eval-Modells
   oder kommerzieller Dienst (Datenschutz: Firmenchat-Inhalte).
6. **Aufbewahrung**: wie lange das HMAC-IP-Fenster im CRM-relevanten Format geführt wird.

---

## API-Surface (Stand 1.10.2026 — was WIRKLICH existiert)

Maschinen-Check neu gelaufen (`/tmp/opencode/route_check.py`, Methodenpräfixe ausgewertet):
**305 Code-Routen / 283 Doku-Pfade.** Ergebnis:

* **Alle Gateway-Routen sind dokumentiert** — 0 fehlend.
* Die 3 scheinbar fehlenden gehören zu **anderen Binaries**, nicht zur Gateway-Surface:
  `cmd/jimesh-router` (`/ws/` — Doku-Zuhause ist `cmd/jimesh-router/README.md`, TASK-033)
  und `cmd/datalaked` (`/status`, `/healthz` → in `API_DOCS.md` §Datalake nachgetragen).
* Umgekehrt 13 Doku-Einträge ohne direkte Registrierung — geprüft, alle ehrlich:
  Query-Schema-Notation (`/api/analytics/by-key?range=`), Platzhalter (`/api/*`),**bewusst
  tote** Einträge (`/api/streams/logs` — schon in der Doku als „kein Handler" markiert),
  **nicht bei uns liegende** URLs (`/v1/health/ready` = NIM-Upstream-Probe, `/v1/realtime`
  = Backlog) und „if ever wired up"-Vermerke (`/api/quota/headroom`).

**Bestehende Routen, die der Roundtrip benutzt (real, dokumentiert):**

| Route | Rolle im Roundtrip |
|---|---|
| `POST /v1/chat/completions` (`internal/ai/aihandlers.go:51`) | eigentlicher Inferenz-Call, OpenAI-kompatibel, Stream- und Non-Stream |
| `GET /v1/chat/completions/ws` (`aihandlers.go:52`) | WebSocket-Variante (MsgSec) |
| `POST /v1/embeddings` (`aihandlers.go:53`) | Embeddings für Widget-/Kontext-Abgleich |
| `GET /v1/route`, `GET /v1/score` (`gateway.go:238-239`) | Routing-Entscheidung ohne Upstream-Call |
| `GET /v1/models` (`gateway.go:236`) | Modell-Liste (öffentlich, kein Chat) |

**Geplant in S178 — existiert NOCH NICHT, deshalb hier als Kontrakt, nicht als Endpoint:**

| Route (geplant) | Zweck | Status |
|---|---|---|
| `POST /v1/chat/roundtrip` | ein einziger End-to-End-Aufruf: JWT/HMAC-Identität prüfen → TTL-Quota → Safety-Gate → `POST /v1/chat/completions` (Local LLM) → Safety-Gate (Antwort) → Response inkl. Widget-Entscheid | **nicht implementiert** |
| `GET /v1/chat/roundtrip/limits` | ehrliche Rest-Quota + `Retry-After` für den aktuellen Token/Cookie | **nicht implementiert** |

> Reihenfolge-Pflicht: solange die Handler nicht existieren, stehen sie in `API_DOCS.md` als
> **geplant (nicht implementiert)** — kein Abschnitt darf so tun, als liefen sie (Mandat 2).

---

## FULL-ROUNDTRIP-PROMPT (vollständig, ausführbar — WP1–WP7 in einem Rutsch)

> Zweck: dieser Prompt ist das einzige Dokument, das ein ausführender Agent braucht.
> Er ist gegen den Code oben und gegen die Operator-Order verifiziert. Jeder Schritt endet
> mit einem Verifikationsbefehl; „fertig" heißt nur, wenn der Befehl so lief wie beschrieben.

### A. Harte Constraints (brechen beendet den Auftrag, nichts davon ist verhandelbar)

1. **Tutario-Regel:** kein Test, kein Embedding, kein Probebetrieb auf irgendeiner fremden
   Domain. Testinstanzen ausschließlich auf eigenen Domains/Hostnames.
2. **Ein einziger öffentlicher Pfad:** Cloudflare. Kein zweiter offener Port, keine
   Public-IP auf dem Local-LLM-Host (`docker port` muss leer sein).
3. **Alte Tailnets bleiben unberührt** (trading-headscale, superleos Host-Tailscale,
   podheads Primärverbindung; `client-join.sh` bleibt bridge-Mode).
4. **Kein Mock, kein Fake:** fehlt etwas, antwortet der Endpunkt ehrlich (`503`/`501` mit
   Grund) statt einer erfundenen Antwort (Mandat 2).
5. **Blacklisting ohne Server-State:** die JWT-TTL ist die Sperre; keine Redis/DB-Zeile pro
   gesperrtem Nutzer (Mandat 3 gilt weiter: Nutzer-Arbeit überlebt Restarts — hier ist
   bewusst *nichts* zu speichern, weil das Token selbst die Sperre ist).
6. **Kein Deploy ohne explizite Operator-Bestätigung** (Mandat 6).
7. **Doku im selben Change:** `docs/API_DOCS.md` (alle neuen Routen), dieses Sprint-File,
   `docs/backlog/BACKLOG.md`, und §17 aus MANDATES.md (neue Pflicht).

### B. Zielarchitektur (Hop für Hop, inkl. Header)

```
[Browser]
   │  POST /v1/chat/roundtrip
   │  Authorization: Bearer <JWT ttl=…>
   │  X-Request-Id, X-Client-Ttl, X-Turnstile-Token, Cookie: jx_guest=<HMAC>
   ▼
[Cloudflare]  ← einziger öffentlicher Pfad
   OWASP Managed Rules (block) · Rate-Limiting-Rule /v1/chat/roundtrip · Turnstile (Gäste)
   ▼
[Vercel: Next.js]
   /            SEO, Scraper-freundlich
   /chat        robots.txt: Disallow: /chat/ + X-Robots-Tag: noindex, nofollow
   ▼
[JiMesh Gateway (Go, internal/gateway + internal/chat)]
   1. Identität: JWT verifizieren (exp/aud/iss)  ── ungültig/abgelaufen → 401, KEIN Lookup
   2. Identität (Gast): Cookie jx_guest = HMAC(IP+UA, SERVER_SECRET) → Key
   3. Quota: Token-Key = jwt.sub (TIER_GOOGLE/TIER_USER) bzw. HMAC-Key (TIER_GUEST)
      → über Limit → 429 + Retry-After (aus JWT-TTL abgeleitet, kein Zähler-Store)
   4. Safety-Gate INPUT  (LlamaGuard/Decision-Modell) → Grauzone → algorithmischer Bot
   5. POST /v1/chat/completions  (Local LLM, Nur-Mesh)
   6. Safety-Gate OUTPUT → Kontext verwerfen/ersetzen, falls Regelverstoß
   7. Response + Widget-Entscheid (reactive/proactive) + X-Quota-* Header
   ▼
[Local LLM, CUDA-Container, publish: KEINE]
   nur erreichbar über Tailnet-Adresse/loopback; kein 0.0.0.0; kein Ingress
```

### C. WP-Feinplan mit Dateien, Verifikation und Acceptance je Schritt

**WP1 — Local-LLM-Stack**
* Dateien: `deploy/llm/docker-compose.yml`, `deploy/llm/README.md`, ggf.
  `deploy/llm/ansible-task.yml` (gleiche Role-Muster wie die bestehenden Deployments).
* Anforderungen: `nvidia-container-toolkit` vorhanden (Vorauscheck `nvidia-smi`),
  `ports:` **gar nicht gesetzt**, `network_mode` so, dass nur der Mesh-Zugriff geht,
  `127.0.0.1`-Bind im Inferenz-Server, Healthcheck-Endpoint intern.
* Verifikation: `docker port <name>` → leer; `curl -m3 http://<tailnet-ip>:<port>/health`
  aus dem Mesh → 200; vom Host per Public-IP → muss **Timeout/Refused** sein (beweisen,
  nicht behaupten: `nc -zv <public-ip> <port>`).
* Acceptance: Ports-Scan-Ergebnis ins Sprint-File kopiert (Mandat 6).

**WP2 — Gateway-Policy (`internal/chat/`)**
* Identität/Tier/Quota/TTL wie in B; Fehlerkodes ehrlich: `401` (Token fehlt/abgelaufen),
  `429` + `Retry-After` (Quota), `403` (Turnstile fehlt/ungültig), `503` (LLM nicht
  erreichbar), `501` (Safety-Gate nicht konfiguriert — nie still „durchwinken").
* HMAC-Format: `hmac_sha256(SERVER_SECRET, ip + "|" + ua_salt)[:16]` hex — das ist das
  CRM-taugliche Flagging-Format ohne Klartext-IP.
* Verifikation: Unit-Tests (exp-TTL, Rate-Over-Limit, HMAC-Stabilität, kein Lookup beim
  Blacklisten) + `make go-vet && make go-build`.
* Acceptance: Test beweist, dass ein abgelaufenes Token **ohne jeden Datenbank-/Redis-
  Zugriff** abgelehnt wird (Mock-frei: Prüfung an der Zeit, nicht an einer Sperrliste).

**WP3 — Vercel-Subpage**
* `app/chat/page.tsx` (oder Vorlage), `public/robots.txt` mit `Disallow: /chat/`,
  Route-Header `X-Robots-Tag: noindex, nofollow`, `Cache-Control: private, no-store`,
  Hauptseite unverändert.
* Verifikation: `curl -sI https://<eigene-domain>/chat` → Header da; `curl -s
  https://<eigene-domain>/robots.txt` → Disallow vorhanden; Hauptseite → unverändert.
* Acceptance: Screenshots/Headers ins Sprint-File.

**WP4 — Cloudflare**
* WAF: OWASP Managed Ruleset an, Exception-Registry statt Global-Aus (siehe S177).
* Rate-Limiting-Rule auf `/v1/chat/roundtrip` (Gästebucket streng, getuner Bucket für
  eingeloggte), Turnstile für Gäste, Tunnel zu den Backends, keine Public-IP am Host.
* Verifikation: Regel-Export (Terraform/`wrangler`-Konfiguration, die **im Repo liegt**
  statt nur im CF-Dashboard), Testanfrage ohne Turnstile-Token → 403.
* Acceptance: Konfigurationsdatei im Repo + Curl-Nachweis.

**WP5 — Widgets + algorithmischer Grauzonen-Bot**
* Widget-Kontrakt (reactive = Antwort enthält Widget-Anfrage; proactive = ungebetene
  Nachfrage nach fehlenden Formulardaten):
  `{kind: "form"|"choice"|"confirm", fields: [{name, label, type, required, options?}],
  prefill?: {…}, onSubmit: "roundtrip-resume"}`
* Deterministischer Bot: Regelwerk für generische Fragen/Grauzone (Intent-Listen +
  Antwortvorlagen), **vor** dem LLM-Aufruf; niemals als „vom Modell erzeugt" getarnt
  (Mandat 2 → Feld `source: "rule"|"model"` in der Response).
* Verifikation: Testfallkatalog (min. 20 Fälle: generisch, grauzige, injection-artig,
  Formularfälle) → erwarteter `source` je Fall.

**WP6 — Safety-Gate**
* Auswahl in WP0 (offene Entscheidung 5): LlamaGuard-Weiterführung, selbst gehostetes
  Decision-/Eval-Modell oder Dienst. Gate läuft **vor** der Inferenz (Prompt) und **nach**
  der Antwort (Output), Ergebnis als `{verdict: allow|block|gray, reason}`.
* `gray` → WP5-Bot; `block` → ehrliche 403 mit neutralem Text (keine Regel-Details
  zurückspiegeln); `allow` → LLM.
* Verifikation: Guard-Tests gegen Policy-Fixtures, inkl. Prompt-Injection-Fall
  (Bestand: API_DOCS-Notiz zum Injection-Test auf `/v1/chat/completions`).

**WP7 — Doku + Testkatalog**
* `API_DOCS.md`: `POST /v1/chat/roundtrip` und `GET /v1/chat/roundtrip/limits` von
  „geplant" auf „live" umschreiben (Payload, Response, Fehlercodes, Header).
* Sprint-File: Status, Verifikationsbefehle mit echten Ausgaben, offene Punkte.
* Backlog: Spiegel; `MANDATES.md` §17 gespiegelt.
* Testkatalog enthält die Regel **„keine fremden Domains"** als Pflicht-Case.

### D. Offene Entscheidungen (Blocker, brauchen den Operator — 6 Stück, siehe oben)

1 CUDA-Node/Modell · 2 Quantisierung/Token-Budget · 3 Cloudflare-Zone+Plan ·
4 Domain/Projekt der Subpage · 5 Safety-Gate-Auswahl · 6 Aufbewahrung HMAC-Fenster.

**Antwort des Operators auf diese 6 Punkte ist die einzige Voraussetzung, um WP1 zu starten.**

---

## History

* 1.10.2026 — Order des Operators aufgenommen (verbatim), Zielbild + WP-Zerlegung +
  Acceptance formuliert, Anforderungen aus dem Tutario-Inzident als harte Regel
  vorgestellt. **Noch kein Code, kein Deploy.**
* 1.10.2026 (später) — **API-Surface geprüft** (Routen-Check 305/283, alle Gateway-Routen
  dokumentiert; `cmd/datalaked`-Routen in API_DOCS nachgetragen), **FULL-ROUNDTRIP-PROMPT**
  (Teile A–D) + geplante Roundtrip-Routen als Kontrakt ergänzt, **§17 „Rechtliche Verstöße
  melden"** in `MANDATES.md` (Case: Tutario-Abmahnung).
