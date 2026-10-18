# Dashboard-Login — Stand 28.9.2026

**Aktuell einziger funktionierender Weg: Keycloak/OIDC** (der direkte Passwort-Login ist entweder
kaputt oder — sobald der Auth-Hardening-Fix deployed ist — sowieso standardmäßig deaktiviert).

## Keycloak-Login (jimesh-Realm-Admin-User)

- URL: Login-Screen → Option "mit Keycloak/SSO anmelden" (nicht das Passwort-Formular)
- User/Email: `admin@jimesh.local`
- Passwort: identisch mit `JIMESH_ADMIN_PASSWORD` aus der Root-`.env`
  (`/home/ji/projects/jimesh/.env`, Zeile 37) — Wert dort nachschlagen, wird hier bewusst nicht
  wiederholt.

## Falls der direkte Passwort-Login noch aktiv/kaputt ist

`dashboard_password_hash` in Postgres zurücksetzen (öffnet den Setup-Screen neu):
```
ssh trading 'docker exec jimesh-postgres psql -U jimesh -d jimesh -c "DELETE FROM settings WHERE key = '\''dashboard_password_hash'\'';"'
```
Danach Browser hart neu laden (Ctrl+Shift+R). Bei Remote-Zugriff (nicht loopback): One-Time-Code
aus den Logs:
```
ssh trading 'docker logs jimesh-backend 2>&1 | grep -i "setup code"'
```

## Keycloak-Master-Realm-Admin (verwaltet Keycloak selbst, NICHT die App)

- User: `kcadmin`
- Passwort: `KC_BOOTSTRAP_ADMIN_PASSWORD` aus derselben `.env`, Zeile 40.

## Status Auth-Hardening (SPRINT-148, uncommitted)

Direkter Passwort-Login wird standardmäßig deaktiviert (403), Rate-Limiting eingebaut. Noch nicht
committed, noch nicht auf trading deployed. Sobald deployed: Keycloak ist der EINZIGE Weg rein.
