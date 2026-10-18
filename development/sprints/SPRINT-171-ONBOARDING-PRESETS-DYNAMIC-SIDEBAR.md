# SPRINT-171 — Onboarding + Presets + Dynamic Sidebar (Jira-Style)

**Datum:** 4.10.2026
**Status:** 📋 PLANNED — Operator-Auftrag aus Prompt 111113, 111113
**Ziel:** **Self-Service Onboarding Flow** — User erstellt Project, wählt Preset (Jira-Style), Plugins, Utility Container wird automatisch deployed. Sidebar blendet nur das ein, was das Preset vorsieht (Context Keys).

---

## 1. Onboarding Flow (Webview im Dashboard)

### Schritt 1: Willkommen & Projekt-Typ

```
┌─────────────────────────────────────────────────────────┐
│  🚀 Willkommen bei JiMesh                                │
│                                                          │
│  Was möchtest du bauen?                                 │
│                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │ 💻 Dev  │  │ 🎨 Design │  │ 📈 Mktg │  │ ⚙️ Custom │
│  │ Code,   │  │ Assets,  │  │ Content,│  │ Leeres    │
│  │ Deploy  │  │ Prototyp  │  │ SEO     │  │ Projekt   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │
│                                                          │
│  [Weiter]                                                │
└─────────────────────────────────────────────────────────┘
```

### Schritt 2: Projekt-Details

```
┌─────────────────────────────────────────────────────────┐
│  Projekt erstellen                                       │
│                                                          │
│  Name:           [Mein neues Projekt        ]  ✓        │
│  Beschreibung:   [Beschreibung...          ]            │
│                                                          │
│  📦 Utility Container:  ☑  (code-server, SilverBullet,  │
│                            Git Graph, n8n, Claude Code) │
│                                                          │
│  📁 Git Repo:          ☑  Initialisieren (optional)     │
│  🔧 n8n Workflows:     ☐  Aktivieren                    │
│                                                          │
│  [Projekt erstellen]                                     │
└─────────────────────────────────────────────────────────┘
```

### Schritt 3: Plugin/Service Auswahl (Dynamic)

```
┌─────────────────────────────────────────────────────────┐
│  Services für dein Projekt wählen                        │
│                                                          │
│  Basierend auf Preset "Dev":                             │
│                                                          │
│  ☑  code-server (VS Code Web)        [Utility Container] │
│  ☑  SilverBullet (Notes)             [Utility Container] │
│  ☑  Git Graph (Git History)          [VS Code Extension] │
│  ☐  n8n (Workflows)                  [Utility Container] │
│  ☐  Claude Code (AI Coding)          [Utility Container] │
│  ☑  SAST/DAST Scanner               [Project Scope]      │
│  ☐  n8n Server                        [Worker]           │
│  ☐  DSH Deployment                    [Worker]           │
│                                                          │
│  [Fertigstellen] → Deploy startet automatisch            │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Presets (Jira-Style)

| Preset | Label | Icon | Default Services | Scope Selector |
|--------|-------|------|------------------|----------------|
| **dev** | Development | 💻 | code-server, SilverBullet, Git Graph, SAST/DAST, SAST/DAST | Project |
| **design** | Design | 🎨 | SilverBullet, Figma Export, Asset Pipeline | Project |
| **marketing** | Marketing | 📈 | SilverBullet, n8n (Content), SEO Tools, Analytics | Project |
| **devops** | DevOps | ⚙️ | code-server, n8n, Terraform, Kubernetes, Monitoring | Infra |
| **custom** | Leeres Projekt | ⚙️ | Keine (User wählt selbst) | Project |

**Preset Config (`presets.yaml`):**

```yaml
presets:
  dev:
    label: "Development"
    icon: "code"
    category: "projects"
    defaultServices:
      - code-server
      - silverbullet
      - git-graph
      - sast-dast
    scopeSelector: true
    multiSelect: true
  
  design:
    label: "Design"
    icon: "palette"
    category: "projects"
    defaultServices:
      - silverbullet
      - figma-export
      - asset-pipeline
    scopeSelector: true
    multiSelect: false
  
  marketing:
    label: "Marketing"
    icon: "trending-up"
    category: "projects"
    defaultServices:
      - silverbullet
      - n8n
      - seo-tools
      - analytics
    scopeSelector: true
    multiSelect: false
  
  custom:
    label: "Custom / Leer"
    icon: "plus"
    category: "projects"
    defaultServices: []
    scopeSelector: true
    multiSelect: true
```

---

## 3. Dynamic Sidebar (Context Keys)

**Architektur:** Wie in `section-nav.ts` — **Context Keys** steuern Sichtbarkeit.

### Context Key: `projectPreset`

```typescript
// section-nav.ts Erweiterung
export const navGroups: NavGroup[] = [
  {
    id: 'projects',
    labelKey: 'nav.projects',
    subgroups: [
      { id: 'servers', labelKey: 'nav.servers', when: 'projectPreset != "marketing"' },
      { id: 'files', labelKey: 'nav.files', when: 'utilityContainer == true' },
      { id: 'apps', labelKey: 'nav.apps', when: 'projectPreset != "marketing"' },
      { id: 'plugins', labelKey: 'nav.plugins', when: 'projectPreset != "marketing"' },
      { id: 'subagents', labelKey: 'nav.subagents', when: 'projectPreset == "dev" || projectPreset == "devops"' },
      { id: 'terminal', labelKey: 'nav.terminal', when: 'utilityContainer == true' },
      { id: 'sast-dast', labelKey: 'nav.sastDast', when: 'projectPreset == "dev" || projectPreset == "devops"' },
    ],
  },
  {
    id: 'infra',
    labelKey: 'nav.infra',
    subgroups: [
      { id: 'registries', labelKey: 'nav.registries' },
      { id: 'firewall', labelKey: 'nav.firewall' },
      { id: 'observability', labelKey: 'nav.observability' },
    ],
  },
  {
    id: 'firewall',
    labelKey: 'nav.firewall',
    // Firewall als eigene Kategorie (Operator-Entscheidung)
  },
  {
    id: 'ai',
    labelKey: 'nav.ai',
    subgroups: [
      { id: 'chat', labelKey: 'nav.chat' },
      { id: 'proxy', labelKey: 'nav.proxy' },
      { id: 'models', labelKey: 'nav.models' },
      { id: 'crews', labelKey: 'meshsquad.crews', when: 'meshsquadInstalled == true' },
    ],
  },
  {
    id: 'dbs',
    labelKey: 'nav.dbs',
    subgroups: [
      { id: 'backups', labelKey: 'nav.backups' },
      { id: 'discovery', labelKey: 'nav.discovery' },
      { id: 'datalake', labelKey: 'nav.datalake' },
    ],
  },
  {
    id: 'utility',
    labelKey: 'nav.utility',
    subgroups: [
      { id: 'dashboards', labelKey: 'nav.dashboards' },
      { id: 'builder', labelKey: 'nav.builder' },
      { id: 'secrets', labelKey: 'nav.secrets' },
      { id: 'email', labelKey: 'nav.email' },
      { id: 'admin', labelKey: 'nav.admin' },
      { id: 'chat', labelKey: 'nav.chat", when: "meshsquadInstalled != true" },
    ],
    // KEIN Scope-Selector (Operator-Entscheidung)
  },
];
```

**Context Key Injection (Backend → Frontend):**

```go
// Backend: GET /api/projects/{id}/context
func (h *Gateway) handleProjectContext(c *gin.Context) {
    project := getProject(c.Param("id"))
    c.JSON(200, gin.H{
        "projectPreset": project.Preset,        // "dev" | "design" | "marketing" | "custom"
        "utilityContainer": project.UtilityContainer,
        "meshsquadInstalled": project.MeshSquadEnabled,
        "features": project.EnabledFeatures,    // ["sast", "n8n", "claude-code", ...]
    })
}
```

**Frontend Injection (App.tsx):**

```tsx
// App.tsx
useEffect(() => {
  const ctx = await apiFetch(`/api/projects/${currentProjectId}/context`);
  // Setze Context Keys für section-nav.ts
  setProjectPreset(ctx.projectPreset);
  setUtilityContainer(ctx.utilityContainer);
  setMeshsquadInstalled(ctx.meshsquadInstalled);
}, [currentProjectId]);
```

---

## 4. Onboarding API

### `POST /api/onboarding/complete`

```go
type OnboardingRequest struct {
    Name        string   `json:"name" binding:"required,max=255"`
    Description string   `json:"description"`
    Preset      string   `json:"preset" binding:"required,oneof=dev design marketing devops custom"`
    Services    []string `json:"services"`  // Optional: override preset
    UtilityContainer bool `json:"utilityContainer"`
    GitRepo     bool     `json:"gitRepo"`
    N8nEnabled  bool     `json:"n8nEnabled"`
}

func (h *Gateway) handleOnboardingComplete(c *gin.Context) {
    req := parseRequest(c)
    
    // 1. Project erstellen
    project := store.CreateProject(req.Name, req.Description, req.Preset)
    
    // 2. Preset Services anwenden
    services := getPresetServices(req.Preset)
    if len(req.Services) > 0 {
        services = req.Services // Override
    }
    for _, svc := range services {
        store.EnableFeature(project.ID, svc)
    }
    
    // 3. Utility Container deployen (async, async task)
    if req.UtilityContainer {
        go deployUtilityContainer(project.ID)
    }
    
    // 4. Git Repo initialisieren
    if req.GitRepo {
        go initGitRepo(project.ID)
    }
    
    // 5. n8n aktivieren
    if req.N8nEnabled {
        go enableN8n(project.ID)
    }
    
    c.JSON(201, gin.H{
        "success": true,
        "project": project,
        "deployTaskId": deployTaskID, // Für Polling
    })
}
```

---

## 5. Dynamic Sidebar Implementation

### `section-nav.ts` — Context-Aware Groups

```typescript
// src/frontend/src/lib/section-nav.ts

interface NavGroup {
  id: string;
  labelKey: string;
  subgroups?: NavSubgroup[];
  when?: string;  // Context Key Expression
}

interface NavSubgroup {
  id: string;
  labelKey: string;
  route: string;
  when?: string;  // Context Key Expression
  icon?: string;
}

// Context Keys (werden zur Laufzeit evaluiert)
type ContextKeys = {
  projectPreset: string;        // "dev" | "design" | "marketing" | "devops" | "custom"
  utilityContainer: boolean;
  meshsquadInstalled: boolean;
  features: string[];           // ["sast", "n8n", "claude-code", ...]
}

// Evaluator (einfacher Expression Parser)
function evaluateWhen(expr: string, ctx: ContextKeys): boolean {
  // Unterstützt: ==, !=, &&, ||, in, !in
  // z.B. 'projectPreset != "marketing" && utilityContainer == true'
}

export const getNavGroups = (ctx: ContextKeys): NavGroup[] => {
  return NAV_GROUPS
    .filter(g => !g.when || evaluateWhen(g.when, ctx))
    .map(g => ({
      ...g,
      subgroups: g.subgroups?.filter(s => !s.when || evaluateWhen(s.when, ctx)) || [],
    }));
};
```

### Sidebar Rendering (HierarchySidebar.tsx)

```tsx
// HierarchySidebar.tsx
const context = useProjectContext(); // Holt Context Keys vom Backend
const navGroups = useMemo(() => getNavGroups(context), [context]);

return (
  <nav className="sidebar">
    {navGroups.map(group => (
      <Section key={group.id} group={group} />
    ))}
  </nav>
);
```

---

## 5. Presets & Plugin Selection UI

### `OnboardingWizard.tsx`

```tsx
// src/frontend/src/components/onboarding/OnboardingWizard.tsx

const STEPS = [
  { id: 'preset', title: 'Projekt-Typ', component: PresetSelector },
  { id: 'details', title: 'Details', component: ProjectDetails },
  { id: 'services', title: 'Services', component: ServiceSelector },
  { id: 'review', title: 'Prüfen', component: ReviewStep },
];

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    preset: 'dev',
    services: [],
    utilityContainer: true,
    gitRepo: true,
    n8nEnabled: false,
  });

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    const res = await apiFetch('/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.success) {
      navigate(`/workspaces/projects/${res.project.id}`);
    }
  };

  return (
    <WizardLayout steps={STEPS} currentStep={step} onNext={handleNext} onSubmit={handleSubmit}>
      <STEPS[step].component data={data} onChange={setData} />
    </WizardLayout>
  );
}
```

### `ServiceSelector.tsx` — Plugin/Service Selection

```tsx
// Dynamic: zeigt nur Services die zum Preset passen + alle optional
const availableServices = useMemo(() => {
  const presetServices = PRESETS[data.preset]?.defaultServices || [];
  const allServices = [...new Set([...presetServices, ...ALL_SERVICES])];
  return allServices.map(svc => ({
    ...svc,
    default: presetServices.includes(svc.id),
  }));
}, [data.preset]);

return (
  <div className="space-y-4">
    {availableServices.map(svc => (
      <label key={svc.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
        <input
          type="checkbox"
          checked={data.services.includes(svc.id)}
          onChange={e => setData(d => ({
            services: e.target.checked 
              ? [...d.services, svc.id] 
              : d.services.filter(s => s !== svc.id)
          })}
        />
        <div className="flex-1">
          <span className="font-medium">{svc.label}</span>
          <p className="text-xs text-muted-foreground">{svc.description}</p>
        </div>
        {svc.default && <Badge variant="secondary" className="text-xs">Default</Badge>}
      </label>
    ))}
  </div>
);
```

---

## 6. Acceptance Criteria

| # | Kriterium | Verifikation |
|---|-----------|--------------|
| 1 | Onboarding Wizard startet für neue User | Neu registrierter User → `/onboarding` → Wizard öffnet |
| 2 | Preset-Auswahl funktioniert | 4 Presets + Custom wählbar, Services aktualisieren sich |
| 3 | Plugin Selection speichert | Gewählte Services in `project.features` persisted |
| 3 | Context Keys gesetzt | `GET /api/projects/{id}/context` liefert korrekte Keys |
| 4 | Sidebar blendet korrekt | Sidebar zeigt nur Gruppen/Items die `when` erfüllen |
| 5 | Utility Container deployt | Preset "dev" → Utility Container deployed (Ansible) |
| 6 | Git Repo optional initialisiert | `gitRepo: true` → `git init` in Workspace |
| 6 | n8n optional aktiviert | `n8nEnabled: true` → n8n im Utility Container |

---

## 6. Files to Create

| File | Beschreibung |
|------|--------------|
| `docs/sprints/SPRINT-171-ONBOARDING-PRESETS-DYNAMIC-SIDEBAR.md` | **This Doc** |
| `src/frontend/src/components/onboarding/OnboardingWizard.tsx` | Wizard Container |
| `src/frontend/src/components/onboarding/PresetSelector.tsx` | Preset Selection |
| `src/frontend/src/components/onboarding/ProjectDetails.tsx` | Project Details Form |
| `src/frontend/src/components/onboarding/ServiceSelector.tsx` | Plugin/Service Selector |
| `src/frontend/src/components/onboarding/ReviewStep.tsx` | Review & Submit |
| `src/frontend/src/components/onboarding/OnboardingWizard.tsx` | Wizard Container |
| `src/frontend/src/lib/onboarding.ts` | Types, Presets Config, Helpers |
| `src/frontend/src/lib/section-nav.ts` | Context-Aware Nav Groups (Extension) |
| `src/frontend/src/views/OnboardingPage.tsx` | Page Route `/onboarding` |
| `src/backend/internal/gateway/onboarding.go` | API Handler |
| `src/backend/internal/store/onboarding.go` | Store Methods |
| `src/scripts/onboarding-translate.mjs` | i18n Keys für 60 Locales |
| `src/frontend/src/i18n/locales/en.json` | + Onboarding Keys |

---

## 6. Related Sprints

| Sprint | Relation |
|--------|----------|
| **S170** | Utility Container → wird bei Onboarding deployed |
| **S174** | Sessions/Traces → Context Keys für Session Propagation |
| **S182** | Dashboard Builder → Utility Container Tab |
| **S182** | Terminal → Default Utility Container |
| **S182** | Container Overview Widget → SSH Target |
| **S183** | Render Cache → Onboarding Pages profitieren |

---

## 7. Offene Fragen (Operator)

1. **Preset "devops":** Services finalisieren? (Terraform, Kubernetes, Monitoring)
2. **Preset "design":** Figma Export API — Mock oder echt?
3. **Plugin Dependencies:** Services können Abhängigkeiten haben? (n8n → Utility Container)
4. **Preset Migration:** Existierende Projekte migrieren?
5. **Default Preset:** Für neue User ohne Auswahl?

---

## 8. Related Sprints

| Sprint | Relation |
|--------|----------|
| **S170** | Utility Container → wird bei Onboarding deployed |
| **S174** | Sessions/Traces → Context Keys für Session Propagation |
| **S182** | Dashboard Builder → Utility Container Tab |
| **S182** | Terminal → Default Utility Container |
| **S182** | Container Overview Widget → SSH Target |
| **S174** | Sessions/Traces → Context Keys für Session Propagation |