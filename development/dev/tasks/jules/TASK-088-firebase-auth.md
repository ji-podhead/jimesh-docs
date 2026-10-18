# TASK-088 — Firebase-Auth-Integration: Dual-Auth-Modus (Keycloak + Firebase OAuth)

**Quelle:** Operator 15.9. — Firebase-Projekt erstellt (jimesh-71d25), Config bereitgestellt
**Ziel:** Frontend fragt beim Login: "Keycloak oder OAuth?" — wenn OAuth, wählt der User GitHub oder Google (via Firebase)
**Status:** Konfiguration in .env + .env.example eingetragen, Implementierung offen

---

## Das Auth-Modell (3 Login-Buttons)

```
Login-Page:
┌─────────────────────────────────┐
│                                 │
│  [ JiMesh Dashboard ]           │
│                                 │
│  ┌───────────────────────────┐  │
│  │  🔑 Keycloak Login        │  │  ← bestehender Flow (RS256 JWT)
│  └───────────────────────────┘  │
│                                 │
│  ── oder ──                     │
│                                 │
│  ┌───────────────────────────┐  │
│  │  🐙 Login mit GitHub      │  │  ← Firebase → GitHubAuthProvider
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  🔵 Login mit Google      │  │  ← Firebase → GoogleAuthProvider
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

**VITE_AUTH_MODE steuert welche Buttons erscheinen:**
- `keycloak` → nur Keycloak-Button
- `firebase` → nur GitHub + Google (Firebase)
- `hybrid` → alle 3 Buttons (User wählt)

---

## 1. Frontend-Implementation

### 1a. Firebase-SDK Setup
```bash
npm install firebase
```

```typescript
// src/frontend/src/lib/firebase.ts (NEU)
import { initializeApp } from 'firebase/app'
import { getAuth, GithubAuthProvider, GoogleAuthProvider } from 'firebase/auth'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(app)
export const githubProvider = new GithubAuthProvider()
export const googleProvider = new GoogleAuthProvider()
```

### 1b. Login-Page (AuthGate erweitern)
```typescript
// src/frontend/src/components/auth-gate.tsx — erweitern
// 3 Buttons je nach VITE_AUTH_MODE:
// 1. Keycloak → bestehender Flow (/api/auth/oidc/login)
// 2. GitHub → signInWithPopup(auth, githubProvider)
// 3. Google → signInWithPopup(auth, googleProvider)
```

### 1c. Firebase-User → JiMesh-Session (die BRÜCKE)

**Das kritische Stück:** Firebase gibt ein `user`-Objekt zurück (mit UID, Email, Name, Photo). JiMesh braucht eine `dashboard_sessions`-Row (Token).

**Option A (empfohlen — Firebase-Token ans Backend):**
```
Frontend: signInWithPopup → Firebase-ID-Token (JWT)
       → POST /api/auth/firebase { idToken }
Backend: verify Firebase-ID-Token (Firebase Admin SDK, public keys von
       https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com)
       → Session-Row erstellen (source: 'firebase', sub: firebase-uid)
       → Session-Token zurückgeben (das bestehende jiMesh-Token-Format)
Frontend: speichert das JiMesh-Token → alle weiteren Calls nutzen es
```

**Option B (einfacher, aber unsicherer):**
```
Frontend: signInWithPopup → user-Objekt
       → POST /api/auth/firebase { uid, email, displayName } (ohne Token-Verifikation)
Backend: vertraut dem Frontend (⚠ security risk)
```

**Entscheidung: Option A** (Firebase-Admin-SDK zur Token-Verifikation, güvenli).

### 1d. Backend-Endpoint
```go
// src/backend/internal/auth/firebase_auth.go (NEU)
// POST /api/auth/firebase — verifiziert Firebase-ID-Token, erstellt Session
// Dependencies: firebase.google.com/go (Firebase Admin SDK, CGO-frei)
```

### 1e. i18n
- `auth.loginWithGithub` = "Login mit GitHub" / "Login with GitHub"
- `auth.loginWithGoogle` = "Login mit Google" / "Login with Google"
- `auth.or` = "oder" / "or"

---

## 2. Backend-Abhängigkeiten

```go
// go.mod — neue Dependencies
require (
    firebase.google.com/go/v4 v4.x.x  // Firebase Admin SDK
)
```
⚠ CGO-Freiheit prüfen: Firebase Admin SDK ist pure Go (keine CGO) — Mandat 7 OK.

---

## 3. Firebase Console Setup (Operator-Aktion)

1. Firebase Console → Projekt `jimesh-71d25`
2. Authentication → Sign-in method → GitHub aktivieren
   - Callback-URL kopieren
3. GitHub Developer Settings → OAuth-App registrieren
   - Callback-URL = Firebase-Callback-URL
   - Client-ID + Secret → in Firebase eintragen
4. Authentication → Sign-in method → Google aktivieren (gleicher Prozess)
5. Firebase Admin SDK Service-Account-Key herunterladen (JSON) → für das Backend

---

## 4. Google-Login-Daten (vom Operator bereitgestellt)

```
Project-ID: jimesh-71d25
Auth-Domain: jimesh-71d25.firebaseapp.com
API-Key: AIzaSyCVeR9P1FKnFYYC61w5TYOofdJzKTAoCf8 (public by design)
```

---

## 5. Acceptance-Kriterien

- [ ] Login-Page zeigt 3 Buttons (je nach VITE_AUTH_MODE)
- [ ] GitHub-Login funktioniert (Popup → GitHub → Firebase → JiMesh-Session)
- [ ] Google-Login funktioniert (Popup → Google → Firebase → JiMesh-Session)
- [ ] Keycloak-Login funktioniert unverändert (bestehender Flow)
- [ ] Firebase-Session-Token wird am Backend verifiziert (nicht vertraut)
- [ ] User-Row in der DB mit source='firebase' + firebase-uid
- [ ] Alle bestehenden Features (RBAC, Vault, Deployments) funktionieren mit Firebase-Usern
- [ ] .env.example dokumentiert alle VITE_FIREBASE_* Variablen

---

## 6. Constraints

- CGO_ENABLED=0 (Firebase Admin SDK ist pure Go — OK)
- Kein Casbin (OPA bleibt)
- Keycloak bleibt (parallel zu Firebase)
- Kein Clerk (Firebase ist direkt)
- Keine neuen Services (Firebase ist Cloud-Managed)
- VITE_FIREBASE_API_KEY ist public by design (Firebase Security Rules kontrollieren den Zugriff)

---

## 7. PROVIDER-CREDENTIALS: Eigenes Schema + Settings-UI

**Operator-Prinzip:** Provider-Credentials (GitHub-Token, Google-Token) sind **NICHT Vault-Secrets** —
sie sind per-USER, automatisch provisioniert beim Login, und live in den Settings sichtbar.
Der User muss NICHT erst zum Vault gehen um sie zu verwalten.

### 7a. Eigenes Schema: `provider_credentials`

```sql
CREATE TABLE IF NOT EXISTS provider_credentials (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,               -- der JiMesh-User (aus der Session)
    provider TEXT NOT NULL,              -- 'github' | 'google' | 'keycloak'
    access_token TEXT NOT NULL,          -- encrypted AES-GCM-256
    refresh_token TEXT,                  -- encrypted
    expires_at TIMESTAMPTZ,              -- Token-Ablauf (GitHub: 90d, Google: 1h+refresh)
    scopes TEXT,                         -- z.B. 'repo,read:user' für GitHub
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, provider)            -- ein Credential pro (User, Provider)
);
```

### 7b. Settings-UI: "Connected Accounts"

Im Haupt-Settings-Dialog (SettingsDialog.tsx) eine neue Sektion:

```
┌─────────────────────────────────────────────┐
│ SETTINGS                                     │
│ ┌─────────────────────────────────────────┐ │
│ │ 🔗 CONNECTED ACCOUNTS                    │ │
│ │ ┌─────────────────────────────────────┐ │ │
│ │ │ 🐙 GitHub    Connected ✓            │ │ │
│ │ │    Token expires in 30d             │ │ │
│ │ │    Scopes: repo, read:user          │ │ │
│ │ │    [Disconnect]  [Refresh Token]    │ │ │
│ │ └─────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────┐ │ │
│ │ │ 🔵 Google    Connected ✓            │ │ │
│ │ │    Token expires in 1h (auto-refresh)│ │ │
│ │ │    [Disconnect]                      │ │ │
│ │ └─────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────┐ │ │
│ │ │ 🔑 Keycloak  Not connected           │ │ │
│ │ │    [Connect]                         │ │ │
│ │ └─────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 7c. Backend-Routes

```go
// GET  /api/settings/credentials        — Liste der Connected Accounts (User-Scope)
// DELETE /api/settings/credentials/{provider} — Disconnect (Token aus DB löschen)
// POST /api/settings/credentials/{provider}/refresh — Token-Refresh (falls refresh_token vorhanden)
```

### 7d. Vault-Brücke (optional, für Apps die die Tokens brauchen)

Wenn eine App den GitHub-Token braucht:
- Der App kann über den bestehenden Vault-Access-Mechanismus darauf zugreifen
- ODER: ein dedizierter Endpoint `GET /api/settings/credentials/{provider}/token` (JIT-Token, shown-once)
- Die Credential ist KEIN Vault-Secret — sie hat ein eigenes Schema, aber Apps können DARAUF ZUGREIFEN über einen dedizierten Proxy

### 7e. Automatisches Provisioning

Beim Firebase-Login (signInWithPopup):
1. Firebase gibt das `user`-Objekt + den Provider-Access-Token zurück
2. Das Backend (POST /api/auth/firebase) verifiziert das Token und:
   - Erstellt/updated die `provider_credentials`-Row (access_token + refresh_token)
   - Erstellt die Session (bestehender Flow)
3. Die Settings-UI zeigt die Connected Accounts automatisch

### 7f. Token-Refresh

- GitHub: 90 Tage Gültigkeit (kein auto-refresh nötig, User kann manuell refreshen)
- Google: 1 Stunde Gültigkeit (auto-refresh via refresh_token — das Backend refreshed transparent)
- Keycloak: Session-basiert (kein separater Token)
