[Edit this page](https://github.com/google/gvisor/edit/master/g3doc/user_guide/sdk/go.md) [Create issue](https://github.com/google/gvisor/issues/new?title=+API+Reference)

> \[!WARNING\] **EXPERIMENTAL:** The APIs and tools described here are experimental and are **not meant for production use**.

The gVisor Go SDK (package `sandbox`) provides a simple API for creating gVisor sandboxes and executing commands inside them.

To use the SDK, you must have `runsc` installed on your system. Refer to the [Installation Guide](https://gvisor.dev/docs/user_guide/install/) for instructions.

## Import

```
import "gvisor.dev/gvisor/sandboxexec/sandbox"
```

## Functions

### New

```
func New(ctx context.Context, opts ...Option) (*Sandbox, error)
```

Spawns a new sandbox as a subprocess. The sandbox will be started and running in detached mode.

**Parameters:**

- `ctx`: Context for the execution.
- `opts`: Variadic list of options to configure the sandbox.

**Returns:**

- `*Sandbox`: A pointer to the created `Sandbox` object.
- `error`: An error if the sandbox creation fails.

## Types

### Sandbox

`Sandbox` represents a running gVisor sandbox.

#### Exec

```
func (s *Sandbox) Exec(ctx context.Context, cmd string, opts ...string) (stdout string, stderr string, err error)
```

Runs commands inside the running sandbox as long as the Sandbox is running.

**Parameters:**

- `ctx`: Context for the execution.
- `cmd`: The command to execute (e.g., `"uname"`, `"ls"`).
- `opts`: Arguments for the command.

**Returns:**

- `stdout`: Standard output of the command.
- `stderr`: Standard error of the command.
- `err`: Error if the execution fails.

#### Close

```
func (s *Sandbox) Close(ctx context.Context) error
```

Kills the sandbox processes and cleans up the state directory.

**Parameters:**

- `ctx`: Context for the execution.

**Returns:**

- `error`: An error if cleanup fails.

#### Bundle

```
func (s *Sandbox) Bundle() string
```

Returns the path to the OCI bundle directory for this sandbox.

### Option

`Option` is a function type used to configure a sandbox.

```
type Option func(*Options)
```

### Options

`Options` holds the configuration for a Sandbox.

```
type Options struct {
    // Has unexported fields
}
```

### WithRuntimeDir

```
func WithRuntimeDir(runtimeDir string) Option
```

Sets a custom runtime directory where bundle and state files are written.

### WithID

```
func WithID(id string) Option
```

Sets a specific sandbox ID. If not set, a unique ID will be generated automatically.

### WithNetworking

```
func WithNetworking(enabled bool) Option
```

Configures whether networking is enabled inside the sandbox.

> \[!IMPORTANT\] Enabling networking requires running as root.

---

For a practical example, see the [Quickstart](https://gvisor.dev/docs/sdk/go/quickstart/).