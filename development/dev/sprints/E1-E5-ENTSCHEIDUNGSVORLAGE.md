# E1–E5-Entscheidungsvorlage für den Operator (6.9.2026) — ENTSCHIEDEN

> Ursprüngliche Vorlage enthielt Copy-Paste-Reste aus einer unabhängigen
> KI-Chat-Session (u. a. ein themenfremder IP-Abuse-Lookup). Diese Fassung
> ersetzt sie; die getroffenen Entscheidungen sind final in
> `docs/research/DECISIONS.md` unter „E1–E5 — KLAF Foundation Follow-ups"
> festgehalten. WP2–4 sind entblockt.

## E1 — Wo läuft der Injection-Klassifikator? (blockierte WP2)

**Entscheidung:** Option D — Pure-Go via `purego`/ONNX-Runtime-FFI (dynamisches
Laden von `libonnxruntime.so` zur Laufzeit, kein Sidecar, kein cgo im
Hauptbinary). Fallback auf Option A (Rust-Sidecar, Unix-Socket) falls sich
purego als zu instabil erweist.

## E2 — Was passiert, wenn der Scanner ausfällt? (blockierte WP2)

**Entscheidung:** Fail-open, pro Scanner konfigurierbar, Default fail-open.
Betroffene Requests werden explizit als `scanners_bypassed=true` geloggt;
ein Fail-open-Wechsel löst einen High-Priority-Alert aus (kein stilles Fenster
wie beim Incident vom 5.9.).

## E3 — Payload-Aufbewahrung (DSGVO) (blockierte WP4)

**Entscheidung:** A — redigiert speichern (Secret-Muster beim Schreiben
maskiert), 30-Tage-Löschfrist, nur Operator-Rolle, jeder Zugriff auditiert.
AVV-Klärung (Art. 28 DSGVO) bleibt Bedingung, sobald JiMesh als Produkt an
Dritte geht.

## E4 — Ein Operator oder mehrere Benutzer? (blockierte WP3 + E3)

**Entscheidung:** B — Mehrbenutzer ab Sprint 20 (weicht von der Empfehlung A
ab). Vier-Augen-Prinzip, Rollenmodell, Selbst-Freigabe-Verbot. Erhöht die
Komplexität in WP3 gegenüber dem Ein-Operator-Default — bewusst in Kauf
genommen.

## E5 — Was darf eingefroren werden? (blockierte WP3)

**Entscheidung:** Alle Container, inklusive fremde/per Discovery gefundene
(weicht von der Empfehlung A „nur provisionierte" ab). Risiko: eine
Fehlzuordnung kann einen fremden Produktivdienst einfrieren — Operator hat
dieses Risiko bewusst akzeptiert statt der sichereren Warnung-only-Variante.
