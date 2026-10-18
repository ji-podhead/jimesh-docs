# Sprint 8: Enterprise-Architektur mit PostgreSQL, Debezium (CDC) & Apache Kafka

**Status:** 📋 Spezifiziert & Bereit für den Host-Umbau  
**Goal:** Ablösung der lokalen SQLite-Datei durch eine transaktionssichere, verteilte **PostgreSQL-Datenbank**, Echtzeit-Event-Erfassung via **Debezium (Change Data Capture)** im Write-Ahead-Log (WAL) und Verteilung aller DB-Änderungen über **Apache Kafka** an deine Trading-Bot-Infrastruktur.

---

## 🏗️ Das neue Enterprise-Architektur-Design

```
┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│  JiMesh Go       │   writes    │  PostgreSQL      │  CDC (WAL)  │  Debezium        │
│  Backend         │ ──────────► │  (Event Store)   │ ──────────► │  Connector       │
└──────────────────┘             └──────────────────┘             └──────────────────┘
                                                                           │
                                                                           ▼  Kafka Connect
┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│  Agent-Dash      │  SSE / gRPC   │  Redis Streams   │  mirrors    │  Apache Kafka    │
│  & Analytics     │ ◄──────────── │  (Live-Bus)      │ ◄────────── │  (Broker)        │
└──────────────────┘             └──────────────────┘             └──────────────────┘
```

---

## 📦 1. Die neue `docker-compose.enterprise.yml`

Diese Compose-Datei erweitert deinen Stack um PostgreSQL (mit aktiviertem Logical Replication für Debezium), Apache Kafka und Kafka Connect (Debezium):

```yaml
version: '3.8'

services:
  # 1. PostgreSQL (Transactional SSOT)
  postgres:
    image: postgres:16-alpine
    container_name: jimesh-postgres
    environment:
      - POSTGRES_DB=jimesh
      - POSTGRES_USER=jimesh
      - POSTGRES_PASSWORD=jimesh_secure_pass
    ports:
      - "5432:5432"
    volumes:
      - pg-data:/var/lib/postgresql/data
    # WICHTIG für Debezium: Logical Replication im WAL aktivieren!
    command: ["postgres", "-c", "wal_level=logical", "-c", "max_replication_slots=4", "-c", "max_wal_senders=4"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U jimesh -d jimesh"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 2. Redis Streams (Live Event Bus)
  redis:
    image: redis:alpine
    container_name: jimesh-redis
    ports:
      - "6380:6379"
    volumes:
      - redis-data:/data

  # 3. Zookeeper (Kafka Koordination)
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: jimesh-zookeeper
    environment:
      - ZOOKEEPER_CLIENT_PORT=2181
      - ZOOKEEPER_TICK_TIME=2000

  # 4. Apache Kafka (Event Broker)
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: jimesh-kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      - KAFKA_BROKER_ID=1
      - KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181
      - KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      - KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      - KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT
      - KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1

  # 5. Kafka Connect mit Debezium (Postgres CDC)
  connect:
    image: debezium/connect:2.5
    container_name: jimesh-debezium
    depends_on:
      - kafka
      - postgres
    ports:
      - "8083:8083"
    environment:
      - BOOTSTRAP_SERVERS=kafka:29092
      - GROUP_ID=1
      - CONFIG_STORAGE_TOPIC=my_connect_configs
      - OFFSET_STORAGE_TOPIC=my_connect_offsets
      - STATUS_STORAGE_TOPIC=my_connect_statuses
    # Mount des lokal gebauten Go WASM-Filters (SMT) in Debezium!
    volumes:
      - ./smt/mask_filter.wasm:/kafka/connect/debezium-connector-postgresql/mask_filter.wasm

volumes:
  pg-data:
  redis-data:
```

---

## 🛠️ 2. Debezium SMT Go-WASM-Filter (Sicherheits-Gate)

Um zu verhindern, dass deine Klartext-API-Keys aus der `keys`-Tabelle im Kafka-Broker oder im Data-Lake landen, schreiben wir eine **Single Message Transformation (SMT) in reinem Go** via TinyGo und WebAssembly.

### Der Go SMT Code (`smt/main.go`):

```go
package main

import (
	"encoding/json"
	"github.com/debezium/debezium-smt-go-pdk/v2/pdk"
)

//export transform
func transform(record pdk.Record) pdk.Record {
	// Prüfen, ob das Event aus der 'keys' Tabelle kommt
	if record.Source().Table != "keys" {
		return record
	}

	var value map[string]any
	if err := json.Unmarshal(record.Value(), &value); err != nil {
		return record
	}

	// Debezium JSON-Struktur: 'after' enthält den neuen Zustand der Zeile
	if after, ok := value["after"].(map[string]any); ok && after != nil {
		if val, exists := after["value"].(string); exists && val != "" {
			// Key-Wert unkenntlich machen (Maskieren!)
			after["value"] = "jimesh-sk-••••••••"
		}
	}

	newValue, _ := json.Marshal(value)
	return record.WithValue(newValue)
}

func main() {}
```

### Kompilieren zu WebAssembly (`.wasm`):
Führe diesen Befehl auf deinem Host aus (benötigt [TinyGo](https://tinygo.org)):
```bash
tinygo build -o smt/mask_filter.wasm -target=wasi smt/main.go
```

---

## 🛠️ 3. Debezium Connector + SMT aktivieren (REST-API-Call)

Sobald die Container hochgefahren sind, registrieren wir den PostgreSQL-Connector und hängen den lokal kompilierten Go-WASM-Filter (`mask_filter.wasm`) als SMT ein:

Führe diesen `curl`-Befehl direkt auf deinem Host aus:

```bash
curl -i -X POST -H "Accept:application/json" -H "Content-Type:application/json" \
  http://localhost:8083/connectors/ -d '{
  "name": "jimesh-postgres-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "tasks.max": "1",
    "plugin.name": "pgoutput",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "jimesh",
    "database.password": "jimesh_secure_pass",
    "database.dbname": "jimesh",
    "database.server.name": "jimesh_cdc",
    "table.include.list": "public.keys,public.quota_observations,public.sessions",
    "topic.prefix": "jimesh_cdc",
    
    // SMT Konfiguration (Hängt unseren Go WASM-Filter ein!)
    "transforms": "mask",
    "transforms.mask.type": "io.debezium.transforms.FilterWasm",
    "transforms.mask.wasm.path": "/kafka/connect/debezium-connector-postgresql/mask_filter.wasm"
  }
}'
```

---

## 💻 4. Go-Backend Anpassungen (Postgres Integration)

Um PostgreSQL im Go-Backend anzusprechen, ersetzen wir den SQLite-Treiber durch den CGO-freien pure-Go Postgres-Treiber **`github.com/jackc/pgx/v5`**:

### `go.mod` Erweiterung:
```go
require (
    github.com/jackc/pgx/v5 v5.5.0
)
```

### Database Connection in `store.go`:
```go
import (
    _ "github.com/jackc/pgx/v5/stdlib"
)

func OpenPostgres(connStr string) (*DB, error) {
    db, err := sql.Open("pgx", connStr)
    if err != nil {
        return nil, err
    }
    // Migrations-Skripte sind SQL-Standard-konform und laufen direkt auf Postgres!
    return &DB{sql: db}, nil
}
```

---

## ✅ Akzeptanzkriterien für den Deploy-Host

1. **`docker compose -f docker-compose.enterprise.yml up -d`** startet alle Container fehlerfrei.
2. Der Connector-Registrierungs-Call antwortet mit `201 Created`.
3. Test-Befehl auf dem Host zeigt, dass die Key-Werte in den Kafka-Events **maskiert** sind:
   ```bash
   docker exec -it jimesh-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic jimesh_cdc.public.keys --from-beginning
   # Output zeigt: "value": "jimesh-sk-••••••••"  <- Sicher!
   ```
