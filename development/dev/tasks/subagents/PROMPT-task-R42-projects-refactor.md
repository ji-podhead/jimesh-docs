# TASK-R42 — ProjectsPage-Refactor (2.000+ Zeilen) + Mandat-2/3-Entsorgung

Rolle: Operator-Mandate M1–M7 (wie TASK-R41), zusätzlich:
- M2-No-Mock-SANCTION: Die folgenden Fake-Interaktionen werden ENTFERNT und durch echte Backend-Integrationen ERSETZT — nicht verschönert.
- M3-Ehrlichkeit: Deploy-Terminal zeigt ausschließlich servergestreamte Logs.

## KONTEXT (R39-Audit-Befunde, alle in ProjectsPage.tsx, 2.000+ Zeilen)
A. Fake Node Connection (`handleCreateNode`): "Connect Node" fügt nur ein localStorage-Objekt hinzu und meldet "Successfully connected" — null Netzwerk-/SSH-Call.
B. Fabrizierte Deploy-Logs: Deploy-Request ist echt, aber das Terminal erfindet clientseitig "[ssh] Authenticated successfully, [env] Docker active, 100% success!" — nicht vom Server gestreamt.
C. Persistenz-Täuschung: Settings → localStorage + "Settings saved" ohne Backend-PUT/POST (Mandat-3-Verstoß).
D. gVisor-Install am WORKSPACE statt am NODE (M1-Verstoß): `installGVisor`-Checkbox beim Workspace-Deploy — gVisor (`runsc`) ist eine Node-Eigenschaft.

## AUFGABE
1. Aufteilen: `ProjectsPage.tsx` in eigene Komponenten/Files — mindestens `NodeOnboarding`, `WorkspaceDeploy`, `SettingsSection`, `ProjectList`. Keine Verhaltensänderung bei bereits echten Flows.
2. Fake Node Connection: entfernen. Node-Onboarding läuft über die echte SSH-Node-Route (POST mit Credentials an das bestehende Backend-Endpoint; Credentials NIE in localStorage — Klartext-Secrets nur im Request-Body + Vault). Fehlerfälle laut anzeigen (SSH-Auth-Fail = sichtbarer Fehler).
3. Fabrizierte Deploy-Logs: entfernen. Terminal rendert ausschließlich den Server-Stream (SSE/WebSocket-Logs des Deploy-Endpoints). Kein clientseitig erfundenes Erfolgs-Log, keine Prozent-Animation ohne Server-Datum.
4. Settings-Persistenz: echte Backend-Route (PUT/POST auf die bestehende Settings-API) statt localStorage. Falls keine Settings-Route existiert: ehrlicher Empty-State + Task-File-Notiz (kein Fake-Endpoint erfinden — separater Backend-Task).
5. gVisor-Checkbox vom Workspace-Deploy auf die Node-Ebene verlagern (Install-Status am Node-Objekt, nicht pro Workspace).
6. Kein neues Feature — Refactor + Mandat-2/3-Entsorgung.

## ACCEPTANCE
- `ProjectsPage.tsx` < 800 Zeilen; Aufteilung dokumentiert.
- `grep "localStorage"` in ProjectsPage-Verwandtschaft: nur für UI-Präferenzen (Tabs/Sortierung), NIE für Node-Credentials, Node-Registrierung oder Settings.
- Deploy-Terminal: 100% Server-Stream (Code-Review im Task-File belegen).
- `make go-build` ✓ · `go-vet` ✓ · `gofmt` ✓ · Frontend-Typecheck ✓.

## LIVE-VERIFY (Mandat 6)
- "Connect Node" mit falschen Credentials → sichtbarer SSH-Fehler (kein "Successfully connected").
- Deploy gegen einen Test-Workspace → Terminal zeigt nur echte Server-Zeilen (auch bei Fail: lauter Fail, kein "100% success!").
- Settings-Save → Network-Tab zeigt den echten PUT/POST (oder ehrlicher Empty-State, falls Route fehlt).

## DOKU
- API_DOCS (genutzte Endpoints), Sprint-File, Task-File mit Code-Review-Evidence (Terminal-Render-Pfad).
- ABSCHLUSSBERICHT: Commit-Hash, Aufteilungs-Graf, Mandat-2/3-Evidence, Live-Verify-Curl-Auszüge.
