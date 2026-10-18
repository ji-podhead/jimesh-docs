# Stitch Design Prompt: PyTorch Lightning Integration for JiMesh

## Context
- **Project**: JiMesh - AI infrastructure orchestration dashboard
- **Tech Stack**: React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, react-router-dom
- **Theme**: Dark-first, CSS variables for theming, 60 i18n locales
- **Integration Target**: PyTorch Lightning training jobs on SquadMesh workers
- **Existing Components**: Reuse shadcn/ui (Button, Card, Table, Tabs, Progress, Badge, Dialog, etc.), TanStack Query patterns, lucide-react icons

## Design Prompt

### PyTorch Lightning Training Dashboard (LightningDashboardPage)

**Route**: `/lightning` (under Models section in sidebar)

**Three-Tab Layout**:
1. **Runs Tab** - Training run management table
2. **Models Tab** - Model registry with stage promotion
3. **Experiments Tab** - Experiment grouping and comparison

---

### Tab 1: Runs (Training Jobs)

**Top Bar**: 
- Search input (filter by run name, experiment)
- Status filter dropdown (All/Pending/Running/Completed/Failed/Stopped)
- Experiment filter dropdown
- "New Training Run" button (opens dialog)

**Main Table** (TanStack Query, refetchInterval: 30s):
| Column | Details |
|--------|---------|
| Run | Name, ID (monospace) |
| Experiment | Badge with experiment name |
| Status | Badge with colored icon (Running=🟢, Completed=✅, Failed=❌, Running=🟢, Pending=⏳, Stopped=🟠) |
| Progress | Progress bar (epoch/maxEpochs) + "epoch/maxEpochs (XX%)" |
| Train Loss | Monospace, 3 decimals |
| Val Loss | Monospace, 3 decimals |
| Duration | Human readable (e.g., "2h 34m") |
| GPU % | Progress bar (0-100%) + percentage |
| Actions | Icon buttons: 👁 View, 📊 Compare, ⬇ Download, ⏹ Stop |

**Row Click**: Opens Run Detail drawer (right side) with:
- Metrics charts (loss curves, LR schedule) - recharts
- Hyperparameters (JSON view)
- Artifacts list (checkpoints, ONNX exports) with download
- "Compare" button → opens comparison view

**Empty State**: "No training runs yet" with "Create First Run" button

**Loading**: Skeleton rows

**Error State**: Inline error with retry button

---

### Tab 2: Models (Model Registry)

**Table Columns**: Model, Version, Stage (Badge: Production=green, Staging=amber, Archived=gray), Source Run, Val Loss, Val Acc, Size, Actions

**Stage Badges**: Production=🟢, Staging=🟡, Archived=⚫

**Actions**: 🚀 Deploy to SquadMesh, ⬇ Download ONNX, 📊 Compare

**Model Detail Drawer**: Version history, metrics comparison, deploy to SquadMesh worker

---

### Tab 3: Experiments

**Table**: Experiment Name, Runs Count, Best Run, Best Val Acc, Created, Actions (👁 View Runs, 📊 Compare)

**Experiment Detail**: Leaderboard of runs, metric comparison chart

---

### New Training Run Dialog (3-Step Wizard)

**Step 1: Configuration**
- Experiment selector (dropdown + "Create New")
- Run name
- Lightning config (YAML editor or form):
  - Model (dropdown from registry or custom)
  - Dataset (selector)
  - Hyperparameters form (lr, batch_size, epochs, optimizer, etc.)
  - Trainer config (accelerator, devices, precision, strategy, max_epochs)
  - Callbacks (EarlyStopping, ModelCheckpoint, JimeshCallback)

**Step 2: Compute**
- Runtime selector (gVisor, Workerd, Cloudflare, AWS Lambda, GCP Cloud Run)
- Resources (CPU, Memory, Disk, GPU checkbox)
- Replicas / auto-scale config
- SquadMesh worker pool selector

**Step 3: Review & Launch**
- Summary of all config
- Estimated cost/time
- "Start Training" button

---

### Run Detail Drawer (Right Side Panel)

**Header**: Run name, status badge, experiment badge, progress bar

**Tabs**:
1. **Metrics** - Real-time charts (loss curves, LR, custom metrics) via SSE/WebSocket
2. **Hyperparameters** - JSON editor/viewer
3. **Artifacts** - Checkpoints, ONNX exports, logs with download
4. **Logs** - Real-time log streaming (tail -f style)

**Action Bar**: Stop, Pause, Download Artifacts, Compare

---

### Visual Design (Stitch/Material 3)

**Color Tokens** (from index.css):
```css
--color-primary: oklch(0.68 0.22 280);        /* #d0bcff - violet */
--color-primary-container: oklch(0.35 0.15 280); /* #a078ff */
--color-surface: oklch(0.045 0.01 280);       /* #12131d */
--color-surface-variant: oklch(0.18 0.01 280); /* #333440 */
--color-on-surface: oklch(0.94 0.01 280);
--color-emerald-400: #34d399;  /* success */
--color-red-400: #f87171;      /* error */
--color-amber-400: #fbbf24;    /* warning */
--color-primary-400: #a78bfa;  /* primary */
```

**Typography** (JetBrains Mono for code/metrics):
```css
--font-mono: 'JetBrains Mono Variable';
--font-size-code-sm: 0.6875rem;
--font-size-code-md: 0.8125rem;
--font-size-body-md: 0.875rem;
--font-size-headline-sm: 1.125rem;
--font-size-label-caps: 0.6875rem; /* uppercase, tracking-wide */
```

**Spacing**: Custom scale (space-xs=4px, space-sm=8px, space-md=12px, space-lg=20px, space-xl=32px)

**Border Radius**: DEFAULT=2px, lg=4px, xl=8px, full=12px

**Icons**: Material Symbols Outlined (already loaded in index.css)

---

### Integration Points (Backend Contract)

**API Endpoints** (to be implemented in jimesh backend):
```
GET    /api/lightning/runs?status=&experiment=&search=     → List runs
POST   /api/lightning/runs                                 → Create run
GET    /api/lightning/runs/{id}                            → Get run detail
GET    /api/lightning/runs/{id}/metrics                    → Real-time metrics (SSE)
GET    /api/lightning/runs/{id}/artifacts                  → List artifacts
POST   /api/lightning/runs/{id}/stop                       → Stop run
POST   /api/lightning/runs/{id}/compare                    → Compare runs

GET    /api/lightning/models                               → List models
POST   /api/lightning/models                               → Register model
POST   /api/lightning/models/{id}/stage                    → Promote stage
POST   /api/lightning/models/{id}/deploy                   → Deploy to SquadMesh

GET    /api/lightning/experiments                          → List experiments
POST   /api/lightning/experiments                          → Create experiment
```

**SquadMesh Worker Integration**:
- Training runs submit as SquadMesh jobs
- Metrics streamed via Redis Streams → jimesh API → SSE to dashboard
- Artifacts uploaded to S3/Ozone via jimesh artifact storage
- Model registry integrated with jimesh model registry API

---

### Component Structure

```
src/frontend/src/views/
├── LightningDashboardPage.tsx      # Main page with 3 tabs
├── lightning/
│   ├── LightningRunsTab.tsx        # Runs table + search/filters
│   ├── LightningModelsTab.tsx      # Model registry table
│   ├── LightningExperimentsTab.tsx # Experiments table
│   ├── RunDetailDrawer.tsx         # Right-side drawer
│   ├── NewRunDialog.tsx            # 3-step wizard
│   ├── RunDetailTabs.tsx           # Metrics/Hyperparams/Artifacts/Logs tabs
│   ├── MetricsCharts.tsx           # Recharts loss curves, LR
│   ├── ArtifactsList.tsx           # Checkpoints, ONNX, logs
│   ├── LogsStream.tsx              # Real-time log streaming
│   └── NewRunWizard.tsx            # 3-step wizard component
```

---

### Stitch Generation Notes

1. **Generate all 7 components** as separate screens
2. **Use existing shadcn/ui components** - don't create new primitives
3. **Follow existing patterns** in codebase (TanStack Query, PageHeader, Card, Table, Dialog)
4. **Use existing i18n keys** - add lightning.* namespace to en.json/de.json
5. **Dark mode first** - all colors from CSS variables
6. **Responsive** - mobile: stacked cards, desktop: tables
7. **Accessibility** - proper ARIA labels, keyboard nav, focus states
7. **Icons**: Material Symbols Outlined only (already loaded)

---

### Deliverables

Generate these files as separate Stitch screens:
1. `LightningDashboardPage` - Main 3-tab layout
2. `LightningRunsTab` - Runs table with filters
3. `LightningModelsTab` - Model registry
4. `LightningExperimentsTab` - Experiments list
5. `NewRunWizard` - 3-step dialog
6. `RunDetailDrawer` - Right-side panel with tabs
6. `MetricsCharts` - Recharts components
7. `ArtifactsList` - Checkpoints/ONNX download

**Reference Designs**: Use `assets/design-assets/stitch/jimesh-distributed-trace-detail-dsh-agent-session.html` for drawer pattern, `assets/design-assets/stitch/jimesh-tool-call-inspector.html` for tabs/artifact pattern.
