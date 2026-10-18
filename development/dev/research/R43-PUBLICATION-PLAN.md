
---

## Anhang C — Articles/Blogs-Move (15.9., Operator-Entscheidung)

- `docs/articles/` (20 MB, 83 Dateien: SIEM-Artikel, eBPF, entropy-cascades,
  llm-mesh-intro, learning-router, brand-SVGs + gemini-svg-prompts) ist AUS
  JiMesh entfernt — die Artikel sind Operator-Content, kein Produktkontext.
- **Ziel-Repo:** Operator kümmert sich — Portfolio-Repo oder eigenes Blog-Repo
  (Entscheidung beim Operator). Die Artikel inkl. SVGs/PDFs/PNGs liegen in der
  Git-History dieses Repos (private) und können von dort exakt so in das
  Ziel-Repo übernommen werden (`git show <rev>:docs/articles/...`).
- Public-Export: `docs/articles/**` war schon auf der EXCLUDED-Liste; jetzt
  auch im Privaten nicht mehr im Working-Tree (historische Sprint-Referenzen
  auf Artikel-Pfade bleiben als Aufzeichnung stehen — die Pfade verweisen auf
  die History, nicht auf lebende Dateien).
- `jimesh-mark.tsx`: Dead-Path-Kommentar bereinigt (Komponente ist seit dem
  Brand-Port unabhängig von der SVG-Quelle).
