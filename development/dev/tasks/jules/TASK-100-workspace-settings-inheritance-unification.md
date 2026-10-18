
---

## WP5 — Auth-Settings-UI + GitHub-Secret-Vererbung + PAT-Eingabe

### 5a. Auth-Settings-UI (OAuth nachträglich ändern)

**Settings → Authentication:**

```
┌─────────────────────────────────────────┐
│ AUTHENTICATION                          │
│ ┌─────────────────────────────────────┐ │
│ │ Auth-Mode: [Keycloak ▼]             │ │ ← keycloak | firebase | hybrid
│ │                                     │ │
│ │ ▸ Keycloak (aktiv)                  │ │
│ │   Server: https://keycloak:8081    │ │
│ │   Realm: jimesh                    │ │
│ │                                     │ │
│ │ ▸ Firebase (konfiguriert)           │ │
│ │   Project-ID: jimesh-71d25         │ │
│ │   GitHub-Login: [an] [aus]         │ │
│ │   Google-Login: [an] [aus]         │ │
│ │   [Firebase-Konfiguration ändern]   │ │
│ │                                     │ │
│ │ ▸ Master-Password                    │ │
│ │   [Passwort ändern]                 │ │ ← ChangeCredentialsModal
│ │                                     │ │
│ │ ▸ Später OAuth hinzufügen?           │ │
│ │   Der Auth-Mode kann jederzeit      │ │
│ │   geändert werden (Settings-UI).    │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

- Auth-Mode ist eine Setting (`auth_mode`), NICHT hartcodiert
- Änderbar im Settings-Dialog (auch nach dem ersten Start)
- Wenn kein OAuth: Master-Password via ChangeCredentialsModal (existiert bereits, auth-gate.tsx:379)
- Wenn OAuth später hinzugefügt: Firebase-Config im Settings-Dialog eintragen → auth_mode auf 'hybrid' → Login-Page zeigt alle Optionen

### 5b. GitHub-Secret-Vererbung (Workspace → Project → App)

**Das Override-Pattern:**

```
Secret-Lookup-Kette (von unten nach oben):
  App braucht github_token
    → App-Level Secret? (parent_type=app, key=github_token)
      → JA: nutzen
      → NEIN: weiter nach oben
    → Project-Level Secret? (parent_type=project, key=github_token)
      → JA: nutzen (Override)
      → NEIN: weiter nach oben
    → Workspace-Level Secret? (parent_type=workspace, key=github_token)
      → JA: nutzen (Workspace-Default)
      → NEIN: kein Secret → ehrlicher Error
```

**Backend:** Lookup-Kette implementieren in der neuen `/api/secrets`-Route (TASK-099-WP1):
```go
func (s *Server) resolveSecret(parentType, parentID, key string) (*Secret, error) {
    // 1. App-Level
    if parentType == "app" {
        if sec, err := s.store.GetSecret("app", parentID, key); err == nil {
            return sec, nil
        }
        // 2. Project-Level (vom App's Parent-Project)
        if projectID := s.getAppProject(parentID); projectID != "" {
            if sec, err := s.store.GetSecret("project", projectID, key); err == nil {
                return sec, nil // ← OVERRIDE
            }
        }
    }
    // 3. Workspace-Level (vom Project's Parent-Workspace)
    if workspaceID := s.getProjectWorkspace(parentID); workspaceID != "" {
        if sec, err := s.store.GetSecret("workspace", workspaceID, key); err == nil {
            return sec, nil // ← Workspace-Default
        }
    }
    return nil, ErrSecretNotFound
}
```

### 5c. Secret-Auswahl-Dialog (im Project/App-Deploy)

**Im Deploy-Dialog oder Project-Settings:**

```tsx
// components/workspaces/SecretSelectionDialog.tsx
interface SecretSelectionDialogProps {
  secretKey: string // z.B. "github_token"
  scope: { workspaceId: string; projectId?: string; appId?: string }
  onSecretSelected: (secretId: string) => void
}

// Drei Optionen:
// 1. Workspace-Default verwenden (vererbt — zeigt den Workspace-Secret-Namen)
// 2. Bestehendes Secret auswählen (Dropdown: alle Secrets mit key=github_token in diesem Scope)
// 3. Neues Secret erstellen (PAT-Eingabefeld: "GitHub PAT eingeben" + [Erstellen])
```

**Das UI:**
```
GitHub Secret:
  ○ Workspace-Default: "ghp_workspace_..." ✓ (vererbt)
  ○ Bestehendes Secret: [Dropdown: github_token_a, github_token_b] 
  ○ Neues erstellen:    [GitHub PAT: ___________] [Erstellen]
```

### Acceptance

- [ ] Settings-Dialog hat eine Authentication-Sektion (Auth-Mode auswählbar, Firebase-Config änderbar, Master-Password änderbar)
- [ ] Auth-Mode ist nachträglich änderbar (auch nach dem ersten Start)
- [ ] Master-Password ändern funktioniert ohne OAuth (ChangeCredentialsModal)
- [ ] GitHub-Secret-Vererbung: Workspace-Default → Project-Override → App-Override
- [ ] Secret-Auswahl-Dialog: 3 Optionen (vererbt / bestehendes / neues mit PAT-Eingabe)
- [ ] PAT-Eingabefeld erstellt ein neues Secret im richtigen Scope
- [ ] Die Lookup-Kette ist ehrlich: kein Secret → klarer Error, kein stiller Fallback
