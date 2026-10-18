## Logical Decoding Output Plug-in Installation for PostgreSQL

This document describes the database setup required for streaming data changes out of [PostgreSQL](https://www.postgresql.org/). This comprises configuration applying to the database itself as well as the installation of the [decoderbufs](https://github.com/debezium/postgres-decoderbufs) logical decoding output plug-in. The installation and the tests are performed at the following environment/configuration:

As of Debezium 0.10, the connector supports PostgreSQL 10+ logical replication streaming using *pgoutput*. This means that a logical decoding output plug-in is no longer necessary and changes can be emitted directly from the replication stream by the connector.

## Logical Decoding Plug-ins

Logical decoding is the process of extracting all persistent changes to a database’s tables into a coherent, easy to understand format which can be interpreted without detailed knowledge of the database’s internal state.

As of PostgreSQL 9.4, logical decoding is implemented by decoding the contents of the write-ahead log, which describe changes on a storage level, into an application-specific form such as a stream of tuples or SQL statements. In the context of logical replication, a slot represents a stream of changes that can be replayed to a client in the order they were made on the origin server. Each slot streams a sequence of changes from a single database. The output plug-ins transform the data from the write-ahead log’s internal representation into the format the consumer of a replication slot desires. Plug-ins are written in C, compiled, and installed on the machine which runs the PostgreSQL server, and they use a number of PostgreSQL specific APIs, as described by the [PostgreSQL documentation](https://www.postgresql.org/docs/14/logicaldecoding-output-plugin.html).

Debezium’s PostgreSQL connector works with one of Debezium’s supported logical decoding plug-ins,

to encode the changes in either [Protobuf](https://github.com/google/protobuf) format or [Logical replication](https://www.postgresql.org/docs/current/protocol-logicalrep-message-formats.html) format.

For simplicity, Debezium also provides a container image based on a vanilla [PostgreSQL server image](https://github.com/debezium/container-images/tree/main/postgres/14) on top of which it compiles and installs the plug-ins.

The Debezium logical decoding plug-ins have only been installed and tested on *Linux* machines. For Windows and other platforms it may require different installation steps

#### Differences between Plug-ins

All up-to-date differences are tracked in a test suite [Java class](https://github.com/debezium/debezium/blob/main/debezium-connector-postgres/src/test/java/io/debezium/connector/postgresql/DecoderDifferences.java).

More information about the logical decoding and output plug-ins can be found at:

### Installation

At the current installation example, the [decoderbufs](https://github.com/debezium/postgres-decoderbufs) output plug-in for logical decoding is used. The decoderbufs output plug-in produces a Protobuf message per database change. Each message contains new/old tuples for an updated table row.. The plug-in **compilation and installation** is performed by executing the related commands extracted from the [Debezium Dockerfile](https://github.com/debezium/container-images/blob/main/postgres/14/Dockerfile).

Before executing the commands, make sure that the user has the privileges to write the `decoderbufs` library at the PostgreSQL `*lib*` directory (at the test environment, the directory is: `/usr/lib64/pgsql/`). Also note that the installation process requires the PostgreSQL utility [pg\_config](https://www.postgresql.org/docs/11/app-pgconfig.html). Verify that the `PATH` environment variable is set so as the utility can be found. If not, update the `PATH` environment variable appropriately. For example at the test environment:

```bash
$ git clone https://github.com/debezium/postgres-decoderbufs -b v{debezium-version} --single-branch \
&& cd postgres-decoderbufs \
&& make && make install \
&& cd .. \
&& rm -rf postgres-decoderbufs
```

```bash
Cloning into 'postgres-decoderbufs'...
remote: Enumerating objects: 288, done.
remote: Counting objects: 100% (4/4), done.
remote: Compressing objects: 100% (4/4), done.
remote: Total 288 (delta 0), reused 1 (delta 0), pack-reused 284
Receiving objects: 100% (288/288), 91.62 KiB | 3.66 MiB/s, done.
Resolving deltas: 100% (131/131), done.
Note: switching to 'c9b00aa8c093fa77e08b256bb09d33069a30db86'.

You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by switching back to a branch.

If you want to create a new branch to retain commits you create, you may
do so (now or later) by using -c with the switch command. Example:

  git switch -c <new-branch-name>

Or undo this operation with:

  git switch -

Turn off this advice by setting config variable advice.detachedHead to false

gcc -Wall -Wmissing-prototypes -Wpointer-arith -Wdeclaration-after-statement -Wendif-labels -Wmissing-format-attribute -Wformat-security -fno-strict-aliasing -fwrapv -fexcess-precision=standard -Wno-format-truncation -Wno-stringop-truncation -O2 -g -pipe -Wall -Werror=format-security -Wp,-D_FORTIFY_SOURCE=2 -Wp,-D_GLIBCXX_ASSERTIONS -fexceptions -fstack-protector-strong -grecord-gcc-switches -specs=/usr/lib/rpm/redhat/redhat-hardened-cc1 -specs=/usr/lib/rpm/redhat/redhat-annobin-cc1 -m64 -mtune=generic -fasynchronous-unwind-tables -fstack-clash-protection -fcf-protection -fPIC -std=c11  -I/usr/local/include  -I. -I./ -I/usr/include/pgsql/server -I/usr/include/pgsql/internal  -D_GNU_SOURCE -I/usr/include/libxml2   -c -o src/decoderbufs.o src/decoderbufs.c
gcc -Wall -Wmissing-prototypes -Wpointer-arith -Wdeclaration-after-statement -Wendif-labels -Wmissing-format-attribute -Wformat-security -fno-strict-aliasing -fwrapv -fexcess-precision=standard -Wno-format-truncation -Wno-stringop-truncation -O2 -g -pipe -Wall -Werror=format-security -Wp,-D_FORTIFY_SOURCE=2 -Wp,-D_GLIBCXX_ASSERTIONS -fexceptions -fstack-protector-strong -grecord-gcc-switches -specs=/usr/lib/rpm/redhat/redhat-hardened-cc1 -specs=/usr/lib/rpm/redhat/redhat-annobin-cc1 -m64 -mtune=generic -fasynchronous-unwind-tables -fstack-clash-protection -fcf-protection -fPIC -std=c11  -I/usr/local/include  -I. -I./ -I/usr/include/pgsql/server -I/usr/include/pgsql/internal  -D_GNU_SOURCE -I/usr/include/libxml2   -c -o src/proto/pg_logicaldec.pb-c.o src/proto/pg_logicaldec.pb-c.c
gcc -Wall -Wmissing-prototypes -Wpointer-arith -Wdeclaration-after-statement -Wendif-labels -Wmissing-format-attribute -Wformat-security -fno-strict-aliasing -fwrapv -fexcess-precision=standard -Wno-format-truncation -Wno-stringop-truncation -O2 -g -pipe -Wall -Werror=format-security -Wp,-D_FORTIFY_SOURCE=2 -Wp,-D_GLIBCXX_ASSERTIONS -fexceptions -fstack-protector-strong -grecord-gcc-switches -specs=/usr/lib/rpm/redhat/redhat-hardened-cc1 -specs=/usr/lib/rpm/redhat/redhat-annobin-cc1 -m64 -mtune=generic -fasynchronous-unwind-tables -fstack-clash-protection -fcf-protection -fPIC -shared -o decoderbufs.so src/decoderbufs.o src/proto/pg_logicaldec.pb-c.o -L/usr/lib64  -Wl,-z,relro  -Wl,-z,now -specs=/usr/lib/rpm/redhat/redhat-hardened-ld  -Wl,--as-needed  -lprotobuf-c
/usr/bin/mkdir -p '/usr/lib64/pgsql'
/usr/bin/mkdir -p '/usr/share/pgsql/extension'
/usr/bin/install -c -m 755  decoderbufs.so '/usr/lib64/pgsql/decoderbufs.so'
/usr/bin/install -c -m 644 .//decoderbufs.control '/usr/share/pgsql/extension/'
```

### Installation on Fedora 30+

Debezium provides [RPM package](https://apps.fedoraproject.org/packages/postgres-decoderbufs) for Fedora operating system too. The package is updated always after a final Debezium release is done. To use the RPM in question just issue the standard Fedora installation command:

```bash
$ sudo dnf -y install postgres-decoderbufs
```

The rest of the configuration is same as described below.

### PostgreSQL Server Configuration

Once the **decoderbufs** plug-in has been installed, the database server should be configured.

### Setting up libraries, WAL and replication parameters

Add the following lines at the end of the `postgresql.conf` PostgreSQL configuration file in order to include the plug-in at the shared libraries and to adjust some [WAL](https://www.postgresql.org/docs/14/runtime-config-wal.html) and [streaming replication](https://www.postgresql.org/docs/14/runtime-config-replication.html) settings. The configuration is extracted from [postgresql.conf.sample](https://github.com/debezium/container-images/blob/main/postgres/14/postgresql.conf.sample). You may need to modify it, if for example you have additionally installed `shared_preload_libraries`.

***postgresql.conf*** *, configuration file parameters settings*

```
############ REPLICATION ##############
# MODULES
shared_preload_libraries = 'decoderbufs'   (1)

# REPLICATION
wal_level = logical                     (2)
max_wal_senders = 4                     (3)
max_replication_slots = 4               (4)
```

| **1** | tells the server that it should load at startup the `decoderbufs` (the name of the plug-in is set in [decoderbufs](https://github.com/debezium/postgres-decoderbufs/blob/main/Makefile) Makefile) |
| --- | --- |
| **2** | tells the server that it should use logical decoding with the write-ahead log |
| **3** | tells the server that it should use a maximum of `4` separate processes for processing WAL changes |
| **4** | tells the server that it should allow a maximum of `4` replication slots to be created for streaming WAL changes |

Debezium uses PostgreSQL’s logical decoding, which uses replication slots. Replication slots are guaranteed to retain all WAL required for Debezium even during Debezium outages. It is important for this reason to closely monitor replication slots to avoid too much disk consumption and other conditions that can happen such as catalog bloat if a Debezium slot stays unused for too long. For more information please see the official Postgres docs on [this subject](https://www.postgresql.org/docs/current/warm-standby.html#STREAMING-REPLICATION-SLOTS).

We strongly recommend reading and understanding [the official documentation](https://www.postgresql.org/docs/14/wal-configuration.html) regarding the mechanics and configuration of the PostgreSQL write-ahead log.

### Setting up replication permissions

Replication can only be performed by a database user that has appropriate permissions and only for a configured number of hosts. In order to give a user replication permissions, define a PostgreSQL role that has *at least* the `REPLICATION` and `LOGIN` permissions. For example:

```sql
CREATE ROLE name REPLICATION LOGIN;
```

Superusers have by default both of the above roles.

Add the following lines at the end of the `pg_hba.conf` PostgreSQL configuration file, so as to configure the [client authentication](https://www.postgresql.org/docs/14/auth-pg-hba-conf.html) for the database replication. The PostgreSQL server should allow replication to take place between the server machine and the host on which the Debezium PostgreSQL connector is running.

Note that the authentication refers to the database superuser `postgres`. You may change this accordingly, if some other user with `REPLICATION` and `LOGIN` permissions has been created.

***pg\_hba.conf*** *, configuration file parameters settings*

```
############ REPLICATION ##############
local   replication     postgres                          trust        (1)
host    replication     postgres  127.0.0.1/32            trust        (2)
host    replication     postgres  ::1/128                 trust        (3)
```

| **1** | tells the server to allow replication for `postgres` locally (i.e. on the server machine) |
| --- | --- |
| **2** | tells the server to allow `postgres` on `localhost` to receive replication changes using `IPV4` |
| **3** | tells the server to allow `postgres` on `localhost` to receive replication changes using `IPV6` |

See [the PostgreSQL documentation](https://www.postgresql.org/docs/14/datatype-net-types.html) for more information on network masks.