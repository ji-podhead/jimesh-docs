## Debezium Management Platform

This project is currently in an incubating state. The exact semantics, configuration options, and so forth are subject to change, based on the feedback that we receive.

Debezium Management Platform aims to simplify the deployment of Debezium to various environments in a highly opinionated manner. To achieve this goal, the platform uses a data-centric view of Debezium components.

Implementing the platform represents a natural evolution from Debezium Server. Past releases provided the Debezium operator to simplify operation in Kubernetes environments. With the introduction of the platform, Debezium now provides a high-level abstraction to deploy your data pipelines in different environments while leveraging Debezium Server.

## Basic concepts

You can use the Debezium Management Platform to configure and manage the following components in your environment:

Source

Specifies the database from which you want Debezium to read data.

Destination

Specifies the sink destination where you want Debezium to send data.

Connection

Specifies the connection details that Debezium needs to communicate with a data source or destination.

Transform

Specifies how Debezium transforms a data event as it flows through the pipeline.

Pipeline

Specifies how data flows from a source to a destination while being transformed along the way. Each pipeline consists of a source, one or more transforms, and a destination.

After you define a pipeline, it is deployed based on how you configure the platform.

Each pipeline is mapped to a Debezium Server instance. For the Kubernetes environment (currently, the only supported environment) the server instance corresponds to a `DebeziumServer` custom resource.

Debezium Platform

![](https://www.youtube.com/watch?v=VTc7pyaqXjM)

### Architecture

The platform is composed of the following components:

Conductor

The back-end component that provides a set of APIs to orchestrate and control Debezium deployments.

Stage

The front-end component that provides a user interface to interact with the Conductor.

The conductor component itself is composed of the following subcomponents:

API Server

The main entry point. It provides a set of APIs to interact with the platform.

Watcher

The component that is responsible for the actual communication with the deployment environment (for example, the Debezium Operator in a Kubernetes cluster).

![Debezium Platform Architecture](https://debezium.io/documentation/reference/stable/_images/debezium-platform-architecture.svg)

## Installation

Currently, the only supported environment is Kubernetes.

Prerequisites

- Helm
- Kubernetes cluster with an ingress controller

Installation is provided through a [Helm](https://helm.sh/) chart.

Procedure

1. Enter the following command to add the Debezium charts repository:
	```bash
	helm repo add debezium https://charts.debezium.io
	```
2. Enter one of the following commands to install the latest stable version of the platform that you want:
	```bash
	helm install debezium-platform debezium/debezium-platform --set database.enabled=true --set domain.name=platform.debezium.io
	```
	Or, to use an OCI artifact to install the platform, enter the following command:
	```bash
	helm install debezium-platform --set database.enabled=true --set domain.name=platform.debezium.io oci://quay.io/debezium-charts/debezium-platform
	```
	The `domain.name` is the only required property; it is used as `host` in the `Ingress` definition.
	In the preceding examples, the `database.enabled` property is used. This property helps to simplify deployment in testing environments by automatically deploying the PostgreSQL database that is required by the conductor service. When deploying in a production environment, do not enable automatic deployment of the PostgreSQL database. Instead, specify an existing database instance, by setting the `database.name`, `database.host`, and other properties required to connect to the database. See the following table for more information.

The following table lists all the chart’s properties:

<table><colgroup><col> <col> <col></colgroup><thead><tr><th>Name</th><th>Description</th><th>Default</th></tr></thead><tbody><tr><th colspan="3"><p>Domain</p></th></tr><tr><td><p>domain.name</p></td><td><p>Domain used as the ingress host.</p></td><td><p>""</p></td></tr><tr><td><p>domain.url</p></td><td><p>Domain used as the ingress host (DEPRECATED). Use <code>domain.name</code> instead.</p></td><td><p>""</p></td></tr><tr><th colspan="3"><p>Stage</p></th></tr><tr><td><p>stage.image</p></td><td><p>Image that Helm uses to deploy the stage (UI) pod.</p></td><td><p>quay.io/debezium/platform-stage:<release_tag></p></td></tr><tr><td><p>stage.imagePullPolicy</p></td><td><p>Image pull policy for the stage container. If empty, defaults to <code>IfNotPresent</code>.</p></td><td><p>IfNotPresent</p></td></tr><tr><th colspan="3"><p>Conductor</p></th></tr><tr><td><p>conductor.image</p></td><td><p>Image that Helm uses to deploy the conductor pod.</p></td><td><p>quay.io/debezium/platform-conductor:<release_tag></p></td></tr><tr><td><p>conductor.imagePullPolicy</p></td><td><p>Image pull policy for the conductor container. If empty, defaults to <code>IfNotPresent</code>.</p></td><td><p>IfNotPresent</p></td></tr><tr><td><p>conductor.offset.existingConfigMap</p></td><td><p>Name of the ConfigMap that stores conductor offsets. If no value is specified, Helm creates a ConfigMap automatically.</p></td><td><p>""</p></td></tr><tr><td><p>conductor.descriptors.official.enabled</p></td><td><p>Enables official Debezium descriptors, which are downloaded via ORAS at startup.</p></td><td><p>true</p></td></tr><tr><td><p>conductor.descriptors.official.registry</p></td><td><p>OCI registry hosting the descriptor artifact.</p></td><td><p>quay.io</p></td></tr><tr><td><p>conductor.descriptors.official.image</p></td><td><p>Image name for the descriptor OCI artifact.</p></td><td><p>debezium/debezium-descriptors</p></td></tr><tr><td><p>conductor.descriptors.official.tag</p></td><td><p>Image tag for the descriptor OCI artifact.</p></td><td><p>nightly</p></td></tr><tr><td><p>conductor.descriptors.official.mountPath</p></td><td><p>Path where descriptors are downloaded inside the container.</p></td><td><p>/opt/descriptors</p></td></tr><tr><td><p>conductor.extraVolumes</p></td><td><p>Extra volumes to add to the conductor deployment.</p></td><td><p>[]</p></td></tr><tr><td><p>conductor.extraVolumeMounts</p></td><td><p>Extra volume mounts to add to the conductor container.</p></td><td><p>[]</p></td></tr><tr><th colspan="3"><p>Server</p></th></tr><tr><td><p>server.image</p></td><td><p>Image for Debezium Server instances created by pipelines. If empty, the operator’s <code>ServerImageProvider</code> determines the image.</p></td><td><p>""</p></td></tr><tr><th colspan="3"><p>Ingress</p></th></tr><tr><td><p>ingress.enabled</p></td><td><p>Enables the ingress resource for conductor and stage.</p></td><td><p>true</p></td></tr><tr><td><p>ingress.className</p></td><td><p>Optional ingress class name.</p></td><td><p>""</p></td></tr><tr><td><p>ingress.annotations</p></td><td><p>Extra ingress annotations.</p></td><td><p>{}</p></td></tr><tr><td><p>ingress.tls.enabled</p></td><td><p>Enables the TLS section on the ingress.</p></td><td><p>false</p></td></tr><tr><td><p>ingress.tls.secretName</p></td><td><p>Secret name used when TLS is enabled.</p></td><td><p>""</p></td></tr><tr><th colspan="3"><p>Database</p></th></tr><tr><td><p>database.enabled</p></td><td><p>Enables Helm to install PostgreSQL.</p></td><td><p>false</p></td></tr><tr><td><p>database.name</p></td><td><p>Name of an existing database where you want the platform to store data.</p></td><td><p>postgres</p></td></tr><tr><td><p>database.host</p></td><td><p>Host of the database that you want the platform to use.</p></td><td><p>postgres</p></td></tr><tr><td><p>database.auth.existingSecret</p></td><td><p>Name of the secret that stores the <code>username</code> and <code>password</code> that the platform uses to authenticate with the database. If no value is specified, Helm automatically creates a secret based on the credentials that you provide in the <code>database.auth.username</code> and <code>database.auth.password</code> properties.</p><p>If you provide a value for this property, do not set <code>database.auth.username</code> or <code>database.auth.password</code>.</p></td><td><p>""</p></td></tr><tr><td><p>database.auth.username</p></td><td><p>Username through which the platform connects to the database.</p></td><td><p>user</p></td></tr><tr><td><p>database.auth.password</p></td><td><p>Password for the user specified by <code>database.auth.username</code>.</p></td><td><p>password</p></td></tr><tr><th colspan="3"><p>Offset storage</p></th></tr><tr><td><p>offset.reusePlatformDatabase</p></td><td><p>Specifies whether pipelines use the configured platform database to store offsets. To configure pipelines to use a different, dedicated database to store offsets, set the value to <code>false</code>.</p></td><td><p>true</p></td></tr><tr><td><p>offset.database.name</p></td><td><p>Name of the database that the platform uses to store offsets.</p></td><td><p>postgres</p></td></tr><tr><td><p>offset.database.host</p></td><td><p>Host for the database where the platform stores offsets.</p></td><td><p>postgres</p></td></tr><tr><td><p>offset.database.port</p></td><td><p>Port through which the platform connects to the database where it stores offsets.</p></td><td><p>5432</p></td></tr><tr><td><p>offset.database.auth.existingSecret</p></td><td><p>Name of the secret that stores the <code>username</code> and <code>password</code> that the platform uses to authenticate with the database that stores offsets. If you do not specify a value, the platform uses the values of the <code>offset.database.auth.username</code> and <code>offset.database.auth.password</code> properties to authenticate with the database.</p><p>If you provide the name of a secret, do not set the <code>offset.database.auth.username</code> and <code>offset.database.auth.password</code> properties.</p></td><td><p>""</p></td></tr><tr><td><p>offset.database.auth.username</p></td><td><p>Username through which the platform connects to the offsets database.</p></td><td><p>user</p></td></tr><tr><td><p>offset.database.auth.password</p></td><td><p>Password for the offsets database user specified by <code>offset.database.auth.username</code>.</p></td><td><p>password</p></td></tr><tr><th colspan="3"><p>Schema history storage</p></th></tr><tr><td><p>schemaHistory.reusePlatformDatabase</p></td><td><p>Specifies whether pipelines use the configured platform database to store the schema history. To configure pipelines to use a different, dedicated database to store the schema history, set the value to <code>false</code>.</p></td><td><p>true</p></td></tr><tr><td><p>schemaHistory.database.name</p></td><td><p>Name of the dedicated database where the platform stores the schema history.</p></td><td><p>postgres</p></td></tr><tr><td><p>schemaHistory.database.host</p></td><td><p>Host for the dedicated database where the platform stores the schema history.</p></td><td><p>postgres</p></td></tr><tr><td><p>schemaHistory.database.port</p></td><td><p>Port through which the platform connects to the dedicated database where it stores the schema history.</p></td><td><p>5432</p></td></tr><tr><td><p>schemaHistory.database.auth.existingSecret</p></td><td><p>Name of the secret that stores the <code>username</code> and <code>password</code> that the platform uses to authenticate with the database that stores the schema history. If you do not specify a value, the platform uses the values of the <code>schemaHistory.database.auth.username</code> and <code>schemaHistory.database.auth.password</code> properties to authenticate with the database.</p><p>If you provide the name of a secret, do not set the <code>schemaHistory.database.auth.username</code> and <code>schemaHistory.database.auth.password</code> properties.</p></td><td><p>""</p></td></tr><tr><td><p>schemaHistory.database.auth.username</p></td><td><p>Username through which the platform connects to the schema history database.</p></td><td><p>user</p></td></tr><tr><td><p>schemaHistory.database.auth.password</p></td><td><p>Password for the schema history database user specified by <code>schemaHistory.database.auth.username</code> property.</p></td><td><p>password</p></td></tr><tr><th colspan="3"><p>Debezium Operator</p></th></tr><tr><td><p>debezium-operator.enabled</p></td><td><p>Enables the installation of the Debezium Operator by the chart.</p></td><td><p>true</p></td></tr><tr><th colspan="3"><p>Pipeline</p></th></tr><tr><td><p>pipeline.labels</p></td><td><p>Map of labels to apply to <code>DebeziumServer</code> custom resources created by pipelines. These labels are merged with the internal <code>debezium.io/conductor-id</code> label.</p></td><td><p>{}</p></td></tr><tr><th colspan="3"><p>Monitoring</p></th></tr><tr><td><p>monitoring.otel.enabled</p></td><td><p>Enables the OpenTelemetry monitoring infrastructure. Requires the OpenTelemetry Operator to be installed. For more information, see <a href="#debezium-platform-monitoring-enabling">Enabling monitoring</a>.</p></td><td><p>false</p></td></tr><tr><td><p>monitoring.otel.collector.image</p></td><td><p>OpenTelemetry Collector image. Must include the Prometheus exporter. If empty, the operator’s default image is used.</p></td><td><p>""</p></td></tr><tr><td><p>monitoring.otel.collector.replicas</p></td><td><p>Number of OpenTelemetry Collector replicas.</p></td><td><p>1</p></td></tr><tr><td><p>monitoring.otel.collector.receivers.grpc.port</p></td><td><p>Port for the OTLP gRPC receiver.</p></td><td><p>4317</p></td></tr><tr><td><p>monitoring.otel.collector.receivers.http.port</p></td><td><p>Port for the OTLP HTTP receiver.</p></td><td><p>4318</p></td></tr><tr><td><p>monitoring.otel.collector.processors.batch.timeout</p></td><td><p>Batch processor flush timeout.</p></td><td><p>5s</p></td></tr><tr><td><p>monitoring.otel.collector.processors.batch.sendBatchSize</p></td><td><p>Maximum number of metrics per batch.</p></td><td><p>512</p></td></tr><tr><td><p>monitoring.otel.collector.exporters.prometheus.port</p></td><td><p>Port on which the Prometheus exporter listens.</p></td><td><p>8889</p></td></tr><tr><td><p>monitoring.otel.collector.exporters.prometheus.resourceToTelemetryConversion</p></td><td><p>Converts OpenTelemetry resource attributes to Prometheus labels.</p></td><td><p>true</p></td></tr><tr><td><p>monitoring.otel.collector.exporters.prometheus.constLabels</p></td><td><p>Static labels added to all exported metrics.</p></td><td><p>{platform: debezium}</p></td></tr><tr><td><p>monitoring.panels.additionalPanelsPath</p></td><td><p>Path to a YAML file that contains additional monitoring panels. Panels are merged with built-in defaults; matching IDs override built-in panels. For more information, see <a href="#debezium-platform-monitoring-custom-panels">Custom monitoring panels</a>.</p></td><td><p>""</p></td></tr><tr><td><p>monitoring.prometheus.url</p></td><td><p>URL of the Prometheus instance used by the Conductor to query metrics. <strong>Required</strong> when <code>monitoring.otel.enabled</code> is <code>true</code>.</p></td><td><p>""</p></td></tr><tr><td><p>monitoring.prometheus.serviceMonitor.enabled</p></td><td><p>Creates a <code>ServiceMonitor</code> for automatic Prometheus scraping. Requires the Prometheus Operator to be installed.</p></td><td><p>true</p></td></tr><tr><td><p>monitoring.prometheus.serviceMonitor.scrapeInterval</p></td><td><p>Prometheus scrape interval.</p></td><td><p>15s</p></td></tr><tr><td><p>monitoring.prometheus.serviceMonitor.labels</p></td><td><p>Labels for Prometheus Operator <code>ServiceMonitor</code> discovery. Must match the <code>serviceMonitorSelector</code> labels configured in your Prometheus instance.</p></td><td><p>{prometheus: kube-prometheus}</p></td></tr><tr><th colspan="3"><p>Other</p></th></tr><tr><td><p>env</p></td><td><p>List of environment variables to pass to the conductor.</p></td><td><p>[]</p></td></tr></tbody></table>

## Using the platform

You can use the platform UI to perform a number of different tasks.

### Defining connections

Use the **Connection** section of the UI to define the connections to the database that hosts your source data and to your data sink. You can configure connections to any database that Debezium supports as either a data source or destination sink. The connections that you create can be shared by multiple sources and destinations.

#### Creating a connection

You can create a connection for any source or destination that is available in the connection catalog. The connection catalog lists the source databases that Debezium can read from, and the sink destinations that Debezium Server can write to.

Procedure

1. From the platform UI, open the **Connection** menu.
2. Click **Add connection** to open the **Connection catalog** page.
3. Click **Source** or **Destination** to filter the list by connection type, and then select the required connection card.
4. In the configuration form, specify the connection name and predefined properties, and specify any custom properties in the **Additional properties** section.
5. Click **Verify** to validate the configuration and ensure that Debezium can establish a connections with the database source or sink.
6. After you verify the connection, click **Create connection**.

#### Deleting a connection

Prerequisites

- The connection that you want to delete is not in use in any source or destination.

Procedure

- From the platform UI, open the **Connection** menu, click the **Action** menu for the connection that you want to delete, and then click **Delete**.

An error results if you attempt to delete a connection that is in use. If the operation returns an error, verify that the connection is no longer used in any sources or destinations, and then repeat the delete operation.

#### Editing a connection

To edit a connection, from the platform UI, open the **Connection** menu, click the **Action** menu for the connection that you want to edit, and then click **Edit**.

### Defining sources

Use the **Source** section of the UI to specify the database that hosts your data. You can configure any database that Debezium supports as a source. The source that you create can be shared among multiple pipelines. Changes to a source are reflected in every pipeline that uses it.

#### Creating a source

You can use either of the following editors to configure a source:

Form Editor

Enables you to specify the name, description, and connection of the source, along with a list of properties. For a connection, you can select the predefined source connection, or click **Create connection** to create a new connection. For more information, see [Creating a connection](#debezium-platform-creating-a-connection). For a complete list of the properties that are available for a connector, see the connector documentation.

Smart Editor

Provides a way to define the source configuration in JSON format. You can also use the editor to reformat source configurations that are designed for Debezium connectors in Kafka Connect or Debezium Server environment for use in the platform. The editor automatically applies the JSON formatting that the platform requires to the specified source configuration.

|  | ![Debezium platform - Create source toolbar](https://debezium.io/documentation/reference/stable/_images/create-source-toolbar.png)  You can create source configurations based on existing Debezium configurations, such as the configuration for a Debezium connector for Kafka Connect, or a Debezium Server configuration.  From the toolbar on the **Source catalog** page, select **Create using smart editor**. |
| --- | --- |

Create, edit and remove a source

![](https://www.youtube.com/watch?v=CVY4Y4kAs_E)

#### Configuring a source with the Smart Editor

You can use the **Smart Editor** to specify the JSON that defines the source configuration. You can enter and edit `JSON` directly in the editor, or paste `JSON` from an external source into the editor. The JSON that you use to configure a data source in the Debezium management platform is nearly identical to the JSON in the `config` section that defines the configuration for a Debezium connector on Kafka Connect or in the Debezium Server.

To reuse an existing Debezium connector configuration, you can upload a file that contains the configuration, or you can copy and paste the configuration into the **Smart Editor**. Stage UI intelligently recognizes the format of the configuration that you provide, and prompts you to reformat it for use by the platform.

For example, consider the following JSON for specifying the configuration of a Debezium MySQL connector on Kafka Connect:

```json
{
  "name": "inventory-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "tasks.max": "1",
    "database.hostname": "mysql",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "dbz",
    "database.server.id": "184054",
    "topic.prefix": "dbserver1",
    "database.include.list": "inventory"
  }
}
```

When you add this JSON to the **Smart Editor**, it detects that it is formatted for Kafka Connect and displays an alert.

![Debezium UI smart editor - Kafka connect](https://debezium.io/documentation/reference/stable/_images/Debezium-platform-smart-editor-kafka.png)

The Smart Editor toolbar then displays an **Auto Format** option, as shown in the preceding figure. The Autoformat option automatically converts the provided JSON into the required Debezium Platform JSON format.

The following image shows the JSON that results after you use the Autoformat option to convert the configuration for a MySQL data source. Optionally, you can edit the JSON to update the value of the `name` field or populate the\` description\` field.

![Debezium platform smart editor - source](https://debezium.io/documentation/reference/stable/_images/debezium-platform-smart-editor-source.png)

Th following example shows the platform configuration JSON after updates to the **name** and **description** fields.

```json
{
    "name": "my-source",
    "description": "This is my first source",
    "type": "io.debezium.connector.mysql.MySqlConnector",
    "schema": "schema123",
    "vaults": [],
    "config": {
        "database.hostname": "mysql",
        "database.port": "3306",
        "database.user": "debezium",
        "database.password": "dbz",
        "database.server.id": "184054",
        "topic.prefix": "dbserver1",
        "database.include.list": "inventory"
    }
}
```

Similarly, you can open a Debezium Server configuration in the **Smart Editor** to automatically extract the source configuration and reformat it for use in the Debezium platform. For more information, see [Configuring a destination with the Smart Editor](#debezium-platform-configuring-a-destination-with-the-smart-editor).

#### Deleting a source

Prerequisites

- The source that you want to delete is not in use in any pipeline.

Procedure

- From the platform UI, open the **Source** menu, click the **Action** menu for the source that you want to delete, and then click **Delete**.

An error results if you attempt to delete a source that is in use. If the operation returns an error, verify that the source is no longer used in any pipeline, and then repeat the delete operation.

#### Editing a source

To edit a source, from the platform UI, open to the **Source** menu, click the **Action** menu of the source that you want to edit, and then click **Edit**.

Editing a source affects all pipelines that use it. Before you submit a change, a message notifies you that pipelines that use the source will restart.

#### Enabling signaling

Prerequisites

- You have sufficient access privileges to create a table on the source database.

The Debezium signaling mechanism provides a way to modify the behavior of a connector, or to trigger a one-time action. In the Debezium management platform, signaling actions are performed via the source connector’s **SourceSignalChannel**. For more information about signaling, see [Enabling the source signaling channel](https://debezium.io/documentation/reference/stable/configuration/signalling.html#debezium-signaling-enabling-source-signaling-channel).

To enable the signaling for a data pipeline, you must set up signaling in the source connector configuration.

![Edit source confirmation modal](https://debezium.io/documentation/reference/stable/_images/Debezium-platform-signalling.png)

The signaling data collection, which you create on the source database, is designated exclusively for communicating with Debezium. The signaling data collection must be unique to each connector instance.

![Edit source confirmation modal](https://debezium.io/documentation/reference/stable/_images/Debezium-platform-signalling-modal.png)

1. In the dialog box, provide the **Signaling collection name** and run the provided DDL query to create a signaling data collection in your source database.
2. Click **Verify** to check whether the signaling data collection is set up correctly.
3. Click **Done** to save the signaling collection.

![Signalling setup done](https://debezium.io/documentation/reference/stable/_images/Debezium-platform-signalling-done.png)

### Defining destinations

Use the **Destination** section of the UI to specify the data sink to which the platform sends source data. All Debezium Server sinks are available as destination. When you create a destination, it can be shared between different pipelines, which means that every change to a destination will be reflected in every pipeline that uses it.

Create, edit and remove a destination

![](https://www.youtube.com/watch?v=vijxIYwOR4k)

#### Creating a destination

Use the **Destination** section of the UI to configure the sink destinations to which the platform sends data. You can use either of the following editors to configure a destination:

Form Editor

Enables you to specify the name, description, and connection of the destination, along with a list of properties. For a connection, you can select the predefined source connection, or click **Create connection** to create a new connection. For more information, see [Creating a connection](#debezium-platform-creating-a-connection). For a complete list of the properties that are available for a sink connector, see the connector documentation.

Smart Editor

Enables you to define the sink configuration in JSON. Alternately, you can extract a Debezium Server sink configuration and automatically reformat it for use in the platform.

To create a sink destination from an existing Debezium Server configuration, from the **Destination catalog** page, click **Create using smart editor**.

#### Configuring a destination with the Smart Editor

You can use the **Smart Editor** to specify the JSON that defines the source configuration. You can enter and edit `JSON` directly in the editor, or paste `JSON` from an external source into the editor. With a few small differences, the JSON that you use to configure a destination in the **Smart Editor** is nearly identical to the configuration that you use to define a Debezium Server `sink`.

You can directly use a Debezium Server configuration by either uploading it, or pasting it into the Smart Editor. The Stage UI intelligently recognizes the configuration type and prompts you to reformat it for use by the platform. The editor automatically extracts the Debezium server sink configuration and converts it into the JSON format that the platform supports.

For example, consider the following properties from a Debezium Server configuration:

```properties
# ...

debezium.sink.type=pubsub
debezium.sink.pubsub.project.id=debezium-tutorial-local
debezium.sink.pubsub.address=pubsub:8085
debezium.source.connector.class=io.debezium.connector.mysql.MySqlConnector
debezium.source.database.hostname=mysql
debezium.source.database.server.id=223344
debezium.source.database.port=3306
debezium.source.database.user=debezium
debezium.source.database.password=dbz
debezium.source.schema.history.internal=io.debezium.storage.file.history.FileSchemaHistory
debezium.source.schema.history.internal.file.filename=data/schema.dat
debezium.source.offset.storage.file.filename=data/offsets.dat
debezium.source.offset.flush.interval.ms=0
debezium.source.topic.prefix=tutorial
debezium.source.database.include.list=inventory
debezium.source.table.include.list=inventory.customers

# ..
```

When you add the preceding properties file to the Smart Editor, it confirms that it recognizes the file as a Debezium Server configuration.

![Debezium UI smart editor - Server](https://debezium.io/documentation/reference/stable/_images/debezium-smart-editor-server.png)

The Smart Editor toolbar displays an **Auto Format** option, as shown in the preceding image. Select this option to automatically extract the sink configuration and convert the sink properties into the JSON format that the Debezium Platform supports.

The following image shows the JSON that results after the editor automatically formats the publish-subscribe sink properties that you added. Edit the JSON to update the value of the `name` field, and optionally populate the `description` field.

![Debezium platform smart editor - Sink](https://debezium.io/documentation/reference/stable/_images/debezium-platform-smart-editor-sink.png)

After you update the name and description, the following JSON results:

```json
{
  "name": "my-sink",
  "description": "This is my first sink",
  "type": "pubsub",
  "schema": "schema123",
  "vaults": [],
  "config": {
    "debezium.sink.pubsub.project.id": "debezium-tutorial-local",
    "debezium.sink.pubsub.address": "pubsub:8085"
  }
}
```

#### Deleting a destination

Prerequisites

- The sink that you want to delete is not in use in any pipeline.

Procedure

- From the platform UI, open the **Destination** menu, click the **Action** menu of the destination you want to delete, and then click **Delete**.

An error results if you attempt to delete a destination that is in use. If the operation returns an error, verify that the destination is no longer used in any pipeline, and then repeat the delete operation.

#### Editing a destination

To edit a destination, go to the `Destination` menu and then click the `action` menu of the destination you want to edit, then click `Edit`.

|  | Editing a destination affects all pipelines that use it. After you make a change, a confirmation message informs you that pipelines that use the destination will restart. |
| --- | --- |

### Managing transforms

Use the **Transforms** section of the platform UI to manage the transformations that you want to use in your data pipeline.

Currently, the platform supports all single message transformations provided by Debezium as well as any Kafka Connect transformations.

Transformations are shared among pipelines. When you modify a transformation, the changes are reflected in all pipelines that use the transformation.

Create, edit and remove a transform

![](https://www.youtube.com/watch?v=UCc4A4o6HiU)

#### Creating a transformation

Use the **Transforms** section of the platform UI to specify the configure and manage single message transformations.

You can use either of the following editors to configure transformations:

**Form Editor**

Enables you to specify the name, type, and description of the transformation. You can also set additional configuration options that are specific to the transform type.

Optionally, if you want to apply the transformation only to records that meet specific criteria, you can specify a predicate. You can choose the predicate from a list, and set its properties.

**Smart Editor**

Enables you to use JSON to configure the transformation.

#### Using the Smart Editor to configure transformations

You can use the **Smart Editor** to specify the JSON that defines the transform configuration. You can enter and edit `JSON` directly in the editor, or paste `JSON` from an external source into the editor.

The format for configuring transformations in the Smart Editor differs from the Kafka Connect format that Debezium uses to configure transformations, but you can easily convert between formats.

Typically, entries in the configuration of a transformation are prefixed with `transforms.*<transform_name>*` where `*<transform_name*` is the name assigned to the transformation.

For example, in Debezium, the following configuration is used with the `unwrap` (`ExtractNewRecordState`) transformation:

```properties
# ...

transforms=unwrap
transforms.unwrap.type=io.debezium.transforms.ExtractNewRecordState
transforms.unwrap.add.fields=op
transforms.unwrap.add.headers=db,table
predicates=onlyProducts
predicates.onlyProducts.type=org.apache.kafka.connect.transforms.predicates.TopicNameMatches
predicates.onlyProducts.pattern=inventory.inventory.products

# ..
```

To adapt this configuration for use in Debezium platform, convert the properties that include the prefix `transforms.unwrap`, except for `transforms.unwrap.type`, to JSON format. Apply the same process to convert predicate statements.

|  | **Smart Editor** support for directly using the Kafka Connect configuration format is planned for a future release. |
| --- | --- |

After you convert the Debezium configuration for the `unwrap` transformation, the following JSON results:

```json
{
  "name": "Debezium marker",
  "description": "Extract Debezium payloa d",
  "type": "io.debezium.transforms.ExtractNewRecordState",
  "schema": "string",
  "vaults": [],
  "config": {
    "add.fields": "op",
    "add.headers": "db,table"
  },
  "predicate": {
    "type": "org.apache.kafka.connect.transforms.predicates.TopicNameMatches",
    "config": {
      "pattern": "inventory.inventory.products"
    },
    "negate": false
  }
}
```

#### Editing transformations

From the platform UI, open the **Transform** menu, click the **Action** menu for the transformation that you want to edit, and then click **Edit**.

|  | Editing a transformation affects all pipelines that use it. |
| --- | --- |

#### Deleting a transformation

Prerequisites

- The transformation that you want to delete is not in use in any pipeline.

Procedure

- From the platform UI, open the **Transform** menu, click the **Action** menu of the transformation you want to delete, and then click **Delete**.
	An error results if you attempt to delete a transformation that is in use. If the operation returns an error, verify that the transformation is no longer used in any pipeline, and then repeat the delete operation.

### Creating and managing pipelines

The pipeline section is the place where you connect the "dots". You can define where your data comes, how to eventually transform them and where they should go.

Create, edit and remove a pipeline

![](https://www.youtube.com/watch?v=cY7TS0nWBoY)

#### Creating a pipeline

1. From the platform UI, open the **Pipeline** menu, and then click **Create your first pipeline**. The **Pipeline Designer** opens. From the **Pipeline designer**, specify the components that you want to add to your data pipeline.
2. Click the **\+ Source** box to add a source, and then choose a previously created source, or create a new source.
3. (Optional) Click the **\+ Transform** box to apply one or more transformations.
4. Click the **\+ Destination** box to add a destination,and then choose a previously created destination, or create a new destination.

The sequence in which Debezium applies transformations to the source is significant and affects the final output. Verify that the sequence that you specify results in the expected output.

In the Pipeline designer\* you can delete a transform, or alter the sequence of applied transforms. For more information about using the **Pipeline designer**, see [using the **Pipeline designer** to remove and order transformations](#debezium-platform-using-the-pipeline-designer-to-remove-and-order-transformations).

|  | Transformations that are configured with a predicate are marked with a predicate icon (). A tooltip shows the name of the predicate type. |
| --- | --- |

![Debezium platform pipeline](https://debezium.io/documentation/reference/stable/_images/debezium-platform-pipeline.png)

After you finish designing your pipeline, click **Configure Pipeline**, and then specify the name, description, and logging level for the pipeline.

#### Creating a pipeline from a Debezium Server configuration

The **Pipeline designer** provides an option to create data pipeline resources (that is, source, destination, and transforms) by uploading an existing Debezium Server configuration properties file.

- In the **Pipeline designer**, click **DBZ server config**, upload, or drag and drop a Debezium server properties file, and then click **Create**. The designer creates the Source, Transforms, and Destination for the pipeline, based on the Debezium server configuration that you provided.

![Debezium platform pipeline server modal](https://debezium.io/documentation/reference/stable/_images/debezium-platform-pipeline-server-modal.png)

|  | The source and destination names are generated automatically. |
| --- | --- |

#### Deleting a pipeline

From the platform UI, open the **Pipeline** menu, click the **Action** menu for the pipeline that you want to delete, and then click **Delete**. The deletion removes only the pipeline: the source, destination, and any transformations are not deleted.

#### Editing a pipeline

1. From the platform UI, open the **Pipeline** menu, click the **Action** menu for the pipeline that you want to edit, and then click **Edit**.
2. In the **Pipeline designer**, modify transformations as needed. For more information about using the pipeline designer, see [Using the Pipeline designer to remove and order transformations](#debezium-platform-using-the-pipeline-designer-to-remove-and-order-transformations).
3. Click **Save and next** to edit the name, description, and log level properties of the pipeline.

##### Using the Pipeline designer to remove and order transformations

From the **Pipeline designer**, you can delete transformations, or rearrange the order in which they run.

Deleting a transformation

1. From the **Pipeline designer**, click the pencil icon () in the **Transform** box.
2. From the **Transform list**, click the trash icon next to the name of the transform.

Rearranging transformations

If you configure a connector to use multiple transformations, you can use the **Transform list** in the **Pipeline designer** to specify the order in which they are applied. The first transformation in the list processes the message first.

1. From the **Pipeline designer**, click the pencil icon () in the **Transform** box.
2. From the **Transform list**, drag transformations into the order in which you want to apply them, and then click **Apply**.

#### Monitoring the pipeline

To assist you in monitoring activity in the pipeline, the platform provides you with quick access to pipeline logs.

Procedure

1. From the platform UI, click **Pipeline**, click the name of the pipeline you want to monitor, and then click **Pipeline logs**.

![Debezium platform pipeline server modal](https://debezium.io/documentation/reference/stable/_images/debezium-platform-pipeline-logs.png)

1. Download the logs, toggle to full screen view, search the log for a relevant section, or click **Grep notifications** to search for the `[Notification Service]`.

#### Pipeline actions

To modify data pipeline components, you can use Debezium signaling to trigger specific actions.

Prerequisites

- Signaling is enabled for the source connector. For more information see [Enabling signaling](#debezium-platform-enable-signalling).

Procedure

1. From the Platform UI, open the pipeline overview page, and click the **Pipeline actions** tab.

![Debezium platform - Pipeline action list](https://debezium.io/documentation/reference/stable/_images/Debezium-platform-action-list.png)

1. Select an action from the dropdown list. A form appears that shows fields that are relevant to the selected action.
2. Edit the fields as needed.
	The **Action Id** field is prefilled with a UUID string. You can update the default value, but always ensure that the value is unique for each action.
3. After you finish editing the form, click **Submit** to trigger an action.

## Pipeline monitoring

The Debezium Management Platform provides built-in monitoring capabilities that enable you to observe pipeline health and performance directly from the Stage UI. By using the integrated monitoring dashboard, you can track key metrics such as event throughput, replication lag, queue utilization, and snapshot progress without requiring external monitoring tools or separate authentication.

The monitoring infrastructure is based on industry-standard open-source components: [OpenTelemetry](https://opentelemetry.io/) for metrics collection and [Prometheus](https://prometheus.io/) for metrics storage.

### Monitoring architecture

The monitoring system consists of the following components working together to collect, store, and display pipeline metrics:

Debezium Server

Each pipeline runs as a Debezium Server instance that exports metrics via OpenTelemetry (OTLP protocol).

OpenTelemetry Collector

Receives metrics from all Debezium Server instances and exports them in Prometheus format.

Prometheus

Scrapes metrics from the OpenTelemetry Collector and stores them as time-series data.

Conductor API

Queries Prometheus to retrieve metrics and serves them to the Stage UI through a REST API. The Conductor substitutes pipeline-specific identifiers into predefined queries and enforces access control.

Stage UI

Displays interactive monitoring dashboards with configurable time ranges and auto-refresh.

![Debezium platform monitoring architecture](https://debezium.io/documentation/reference/stable/_images/debezium-platform-monitoring-architecture.svg)

### Monitoring dashboard

To access the monitoring dashboard for a pipeline, navigate to the pipeline detail page and click the **Monitoring** tab.

![Debezium platform monitoring dashboard](https://debezium.io/documentation/reference/stable/_images/debezium-platform-monitoring-dashboard.png)

The monitoring dashboard provides the following controls:

Time range

Select the time window for the displayed metrics. Available presets include 5 minutes, 15 minutes, 30 minutes, 1 hour, 6 hours, 12 hours, and 24 hours. You can also specify a custom time range with specific start and end timestamps.

Refresh interval

Configure how often the dashboard automatically refreshes its data. Available options include off (manual refresh), 15 seconds, 30 seconds, 1 minute, and 5 minutes.

![Debezium platform monitoring toolbar](https://debezium.io/documentation/reference/stable/_images/debezium-platform-monitoring-toolbar.png)

### Built-in monitoring panels

The platform ships with a set of built-in monitoring panels organized into the following categories: streaming and snapshot.

#### Streaming panels

The streaming panels display metrics about the ongoing change data capture process.

![Debezium platform streaming monitoring panels](https://debezium.io/documentation/reference/stable/_images/debezium-platform-monitoring-streaming-panels.png)

| Panel | Unit | Description |
| --- | --- | --- |
| Streaming Event Count Rate | events/s | Rate of streaming change data capture events per second, grouped by event type (create, update, delete). Displayed as an area chart. |
| Source Lag | seconds | Time between a change occurring in the source database and Debezium processing it. Displayed as a line chart. |
| Time Since Last Event | seconds | Elapsed time since the last change event was processed. Useful for detecting stalled pipelines. Displayed as a line chart. |
| Erroneous Events Rate | events/s | Rate of events that resulted in an error during processing. Displayed as a line chart. |
| Events Filtered Rate | events/s | Rate of events excluded by the connector filter configuration. Displayed as an area chart. |
| Committed Transactions Rate | transactions/s | Rate of committed transactions processed from the source database. Displayed as an area chart. |
| Connection Status | — | Whether the connector is connected to the source database and listening for changes. Displayed as a donut chart. |
| Queue Utilization | % | Percentage of the internal event queue currently in use. High utilization may indicate that the destination cannot keep up with the source. Displayed as a donut chart. |
| Queue Size Utilization | % | Percentage of the internal event queue byte capacity currently in use. Displayed as a donut chart. |

#### Snapshot panels

The snapshot panels display metrics about the initial snapshot process when a pipeline first starts or when a snapshot is triggered.

The following image shows the snapshot panels while a snapshot is in progress:

![Debezium platform snapshot monitoring panels - snapshot in progress](https://debezium.io/documentation/reference/stable/_images/debezium-platform-monitoring-snapshot-running-panels.png)

The following image shows the snapshot panels after the snapshot has completed:

![Debezium platform snapshot monitoring panels - snapshot completed](https://debezium.io/documentation/reference/stable/_images/debezium-platform-monitoring-snapshot-panels.png)

| Panel | Unit | Description |
| --- | --- | --- |
| Snapshot Table Progress | tables remaining | Number of tables remaining to be captured during the snapshot. Displayed as a donut chart. |
| Snapshot Duration | seconds | Total elapsed time of the current or most recent snapshot. Displayed as a line chart. |
| Snapshot Status | — | Current snapshot lifecycle state: running, completed, aborted, or skipped. Displayed as a donut chart. |

### Prerequisites

Before you enable monitoring in the Debezium Platform, install the following operators in your Kubernetes cluster.

#### OpenTelemetry Operator (required)

The [OpenTelemetry Operator](https://github.com/open-telemetry/opentelemetry-operator) manages the `OpenTelemetryCollector` custom resource that the platform Helm chart creates.

Install the operator by using Helm:

```bash
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm install opentelemetry-operator open-telemetry/opentelemetry-operator \
  -n opentelemetry-operator-system --create-namespace \
  --set admissionWebhooks.certManager.enabled=false \
  --set admissionWebhooks.autoGenerateCert.enabled=true
```

The preceding command uses Helm auto-generated self-signed certificates for the operator webhooks, which is suitable for development and testing environments. For production environments, use a proper certificate management solution such as [cert-manager](https://cert-manager.io/) or provide your own certificates. See the [OTel Operator Helm chart documentation](https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-operator) for all available options.

|  | The OpenTelemetry Collector must include the **Prometheus exporter** component. The base `otelcol` distribution includes this component, but when the OpenTelemetry Operator is installed by using Helm, it defaults to the `otelcol-k8s` distribution, which does **not** include the Prometheus exporter.  If your operator uses the `k8s` distribution, override the collector image by setting `monitoring.otel.collector.image` in your Helm values. For example:  - Base distribution: `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector:<version>` - Contrib distribution: `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:<version>`  See the [opentelemetry-collector-releases](https://github.com/open-telemetry/opentelemetry-collector-releases) repository for available distributions and their included components. |
| --- | --- |

#### Prometheus Operator (optional)

The [Prometheus Operator](https://github.com/prometheus-operator/prometheus-operator) is required only if you want the Helm chart to create a `ServiceMonitor` for automatic Prometheus scraping. It is commonly installed through the [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) chart:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace
```

If you already have a Prometheus instance that does not use the Prometheus Operator, see [Using an external Prometheus instance](#debezium-platform-monitoring-external-prometheus).

### Enabling monitoring

To enable the monitoring infrastructure, set `monitoring.otel.enabled` to `true` and provide the Prometheus URL in your Helm values.

Procedure

1. Create a values file or add the following to your existing Helm values:
	```yaml
	monitoring:
	  otel:
	    enabled: true
	    collector:
	      # Override the collector image if needed (see Prerequisites)
	      image: ""
	  prometheus:
	    url: "http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090"  (1)
	    serviceMonitor:
	      enabled: true
	      labels:
	        prometheus: kube-prometheus
	```
	| **1** | Required. Set the URL to match your Prometheus installation. The example assumes `kube-prometheus-stack` installed in the `monitoring` namespace with default settings. |
	| --- | --- |
2. Install or upgrade the platform with the monitoring values:
	```bash
	helm upgrade --install debezium-platform debezium/debezium-platform \
	  --set database.enabled=true \
	  --set domain.name=platform.debezium.io \
	  -f monitoring-values.yaml
	```

When monitoring is enabled, the Helm chart automatically:

- Creates an `OpenTelemetryCollector` custom resource that is configured with OTLP receivers, a batch processor, and a Prometheus exporter.
- Creates a `ServiceMonitor` (if `monitoring.prometheus.serviceMonitor.enabled` is `true`) for automatic Prometheus scraping.
- Configures each pipeline’s Debezium Server to export metrics to the OpenTelemetry Collector.

### Monitoring configuration reference

The following table lists the Helm chart properties for configuring monitoring.

| Name | Description | Default |
| --- | --- | --- |
| monitoring.otel.enabled | Enables the OpenTelemetry monitoring infrastructure. Requires the OpenTelemetry Operator to be installed. | false |
| monitoring.otel.collector.image | OpenTelemetry Collector image. Must include the Prometheus exporter. If empty, the operator’s default image is used. | "" |
| monitoring.otel.collector.replicas | Number of OpenTelemetry Collector replicas. | 1 |
| monitoring.otel.collector.receivers.grpc.port | Port for the OTLP gRPC receiver. | 4317 |
| monitoring.otel.collector.receivers.http.port | Port for the OTLP HTTP receiver. | 4318 |
| monitoring.otel.collector.processors.batch.timeout | Batch processor flush timeout. | 5s |
| monitoring.otel.collector.processors.batch.sendBatchSize | Maximum number of metrics per batch. | 512 |
| monitoring.otel.collector.exporters.prometheus.port | Port on which the Prometheus exporter listens. | 8889 |
| monitoring.otel.collector.exporters.prometheus.resourceToTelemetryConversion | Converts OpenTelemetry resource attributes to Prometheus labels. | true |
| monitoring.otel.collector.exporters.prometheus.constLabels | Static labels added to all exported metrics. | {platform: debezium} |
| monitoring.prometheus.url | URL of the Prometheus instance used by the Conductor to query metrics. **Required** when `monitoring.otel.enabled` is `true`. | "" |
| monitoring.prometheus.serviceMonitor.enabled | Creates a `ServiceMonitor` for automatic Prometheus scraping. Requires the Prometheus Operator to be installed. | true |
| monitoring.prometheus.serviceMonitor.scrapeInterval | Prometheus scrape interval. | 15s |
| monitoring.prometheus.serviceMonitor.labels | Labels for Prometheus Operator `ServiceMonitor` discovery. Must match the `serviceMonitorSelector` labels configured in your Prometheus instance. | {prometheus: kube-prometheus} |
| monitoring.panels.additionalPanelsPath | Path to a YAML file that contains additional monitoring panels. Panels are merged with built-in defaults. Panels with matching `id` values override the built-in panels. | "" |

### Custom monitoring panels

You can extend the built-in monitoring dashboard by adding custom panels or overriding existing ones. Custom panels are defined in a YAML file and mounted into the Conductor container.

#### Panel definition format

Each panel is defined with the following fields:

```yaml
panels:
  - id: my-custom-panel           (1)
    title: "Custom Metric"         (2)
    description: "Description"     (3)
    category: streaming            (4)
    query: 'rate(my_metric{service_name="{{pipeline_id}}"}[5m])'  (5)
    unit: ops/s                    (6)
    visualization:                 (7)
      type: line
      suggestedStep: 15s
```

| **1** | Unique identifier. If it matches a built-in panel ID, the custom definition overrides the built-in one. |
| --- | --- |
| **2** | Display title shown in the dashboard. |
| **3** | Description shown as a tooltip. |
| **4** | Category grouping: `streaming` or `snapshot`. |
| **5** | PromQL query. Use `{{pipeline_id}}` as a placeholder for the pipeline identifier. |
| **6** | Unit label displayed on the chart axis. |
| **7** | Visualization configuration: `type` can be `line`, `area`, or `donut-utilization`. For more information about chart types, see the [PatternFly charts documentation](https://www.patternfly.org/charts/about-charts). |

#### Adding custom panels

Procedure

1. Create a YAML file that contains your panel definitions (for example, `panels.yml`).
2. Create a Kubernetes ConfigMap from the file:
	```bash
	kubectl create configmap custom-panels \
	  --from-file=panels.yml \
	  -n debezium-platform
	```
3. Configure the Helm chart to mount the ConfigMap and set the panels path.
	You can mount the ConfigMap in two ways:
	Mount the ConfigMap as a directory. Kubernetes automatically propagates ConfigMap updates to the mounted volume, and the Conductor periodically reloads the panels file without requiring a pod restart.
	```yaml
	conductor:
	  extraVolumes:
	    - name: custom-panels
	      configMap:
	        name: custom-panels
	  extraVolumeMounts:
	    - name: custom-panels
	      mountPath: /opt/config
	      readOnly: true
	monitoring:
	  panels:
	    additionalPanelsPath: /opt/config/panels.yml
	```
	**Option 2: `subPath` mount**
	Mount only the specific file by using `subPath`. This approach avoids creating extra files in the mount directory, but Kubernetes does not automatically update `subPath` mounts when the ConfigMap changes. You must restart the Conductor pod to pick up changes.
	```yaml
	conductor:
	  extraVolumes:
	    - name: custom-panels
	      configMap:
	        name: custom-panels
	  extraVolumeMounts:
	    - name: custom-panels
	      mountPath: /opt/config/panels.yml
	      subPath: panels.yml
	      readOnly: true
	monitoring:
	  panels:
	    additionalPanelsPath: /opt/config/panels.yml
	```
4. Upgrade the Helm release to apply the changes:
	```bash
	helm upgrade debezium-platform debezium/debezium-platform \
	  -n debezium-platform -f values.yaml
	```

The Conductor automatically merges custom panels with the built-in defaults. Panels with matching `id` values override the corresponding built-in panels.

### Using an external Prometheus instance

If you already have a Prometheus instance running in your cluster and you do not use the Prometheus Operator, you can point the platform to your existing Prometheus and disable the `ServiceMonitor`.

Procedure

1. Set `monitoring.prometheus.url` to the URL of your Prometheus instance and disable the `ServiceMonitor`:
	```yaml
	monitoring:
	  otel:
	    enabled: true
	  prometheus:
	    url: "http://prometheus.monitoring.svc.cluster.local:9090"
	    serviceMonitor:
	      enabled: false
	```
2. Add a scrape configuration to your Prometheus configuration to scrape the OpenTelemetry Collector:
	```yaml
	scrape_configs:
	  - job_name: 'otel-collector'
	    scrape_interval: 15s
	    static_configs:
	      - targets: ['debezium-platform-otel-collector-collector.<namespace>.svc.cluster.local:8889']
	```
	Replace `<namespace>` with the namespace where the Debezium Platform is deployed.