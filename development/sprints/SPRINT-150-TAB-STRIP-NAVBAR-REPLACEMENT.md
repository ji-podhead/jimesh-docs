# SPRINT-150 — Tab-Leiste statt Navbar (Phase 2 aus SPRINT-149)

**Status:** 📋 Geplant, NICHT gebaut. Vollständiges Design in
`docs/sprints/SPRINT-149-UIUX-REDESIGN-NAVBAR-SIDEBAR.md`, Abschnitt "Top bar → tab strip".

## Auftrag, verbatim (Operator, 28.9.)

> "ich will das wir die navbar da oben komplett rausnehmen. was wir machen ist das wir den
> aktuellen tab den man angeklickt hat oben in soner filer/tab leiste hat und man kann die da
> anpinnen."

## Was zu tun ist (Zusammenfassung, Details in SPRINT-149)

1. Die aktuelle Navbar (`App.tsx:267-452`, `Navbar()`) durch eine Browser-Tab-artige Leiste
   ersetzen.
2. State-Modell: offene Tabs, aktiver Tab, gepinnte Tabs — Persistenz klären (localStorage vs.
   Backend).
3. Routing-Interaktion: öffnet ein Sidebar-Klick einen neuen Tab, oder nutzt er einen bestehenden?
4. Was bleibt als schmale globale Leiste (Operator hat das explizit erlaubt): User-Menü/Logout,
   Command-Palette, Notifications — zu entscheiden anhand dessen, was heute real da ist.

## Task-Tabelle

| Nr | Task | Status |
|---|---|---|
| S150-1 | Tab-State-Modell + Persistenz entscheiden und implementieren | [ ] geplant |
| S150-2 | Tab-Leiste-Komponente (UI, Pin/Unpin, Schließen) | [ ] geplant |
| S150-3 | Routing-Integration (Sidebar-Klick → Tab öffnen/fokussieren) | [ ] geplant |
| S150-4 | Alte `Navbar()` aus `App.tsx` entfernen, schmale globale Restleiste falls nötig | [ ] geplant |
| S150-5 | Migrations-Pfad für bestehende Bookmarks/Deep-Links | [ ] geplant |
| S150-6 | Tests + i18n + Operator-Live-Review (größter Blast-Radius der ganzen Redesign-Serie —
  explizit NICHT unbeaufsichtigt bauen) | [ ] geplant |
