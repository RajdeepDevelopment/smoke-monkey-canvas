import { Router, type Request, type Response } from 'express';
import { SpaceDb } from './space.db.js';
import { AgentDb } from '../agent/agent.db.js';
import { AgentRunner } from '../agent/agent.runner.js';
import { CoreWsServer } from '../core/ws.server.js';
import { CoreDatabase } from '../core/database.db.js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ExploreReport, RunEventRecord } from '../agent/agent.types.js';

const execFileAsync = promisify(execFile);

export function loadCreatorConfig(): any {
  try {
    const configPath = path.resolve(process.cwd(), 'server/features/creator/company-creator-agent.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.warn('[CreatorConfig] Could not load company-creator-agent.json:', e);
  }
  return null;
}

export function resolveDefaultProviderAndModel(
  requestedProvider?: string,
  requestedModel?: string,
): { provider: string; model: string } {
  if (requestedProvider && requestedModel) {
    return { provider: requestedProvider, model: requestedModel };
  }
  const creatorConfig = loadCreatorConfig();
  if (
    !requestedProvider &&
    creatorConfig?.agent?.provider &&
    creatorConfig.agent.provider !== 'default' &&
    creatorConfig?.agent?.model &&
    creatorConfig.agent.model !== 'default'
  ) {
    return { provider: creatorConfig.agent.provider, model: creatorConfig.agent.model };
  }

  const coreDb = CoreDatabase.getInstance();
  const allSettings = coreDb.getAllSettings();
  if (allSettings['NVIDIA_API_KEY'] || process.env.NVIDIA_API_KEY) {
    return {
      provider: requestedProvider || 'nvidia',
      model: requestedModel || 'nvidia/nemotron-3.5-lightning-30b-a3b',
    };
  }
  if (allSettings['ANTHROPIC_API_KEY'] || process.env.ANTHROPIC_API_KEY) {
    return {
      provider: requestedProvider || 'anthropic',
      model: requestedModel || 'claude-3-7-sonnet',
    };
  }
  if (allSettings['OPENAI_API_KEY'] || process.env.OPENAI_API_KEY) {
    return {
      provider: requestedProvider || 'openai',
      model: requestedModel || 'gpt-4o',
    };
  }
  if (allSettings['GEMINI_API_KEY'] || process.env.GEMINI_API_KEY) {
    return {
      provider: requestedProvider || 'gemini',
      model: requestedModel || 'gemini-2.5-flash',
    };
  }
  if (allSettings['GROQ_API_KEY'] || process.env.GROQ_API_KEY) {
    return {
      provider: requestedProvider || 'groq',
      model: requestedModel || 'llama-3.3-70b-versatile',
    };
  }
  if (allSettings['OPENROUTER_API_KEY'] || process.env.OPENROUTER_API_KEY) {
    return {
      provider: requestedProvider || 'openrouter',
      model: requestedModel || 'anthropic/claude-3.5-sonnet',
    };
  }

  return {
    provider: requestedProvider || 'nvidia',
    model: requestedModel || 'nvidia/nemotron-3.5-lightning-30b-a3b',
  };
}

export async function prepareGitWorkspace(gitUrl?: string | null, localPath?: string | null): Promise<string | null> {
  if (localPath) {
    const candidatePath = path.isAbsolute(localPath) ? localPath : path.resolve(process.cwd(), localPath);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }
  if (!gitUrl || !gitUrl.startsWith('http')) {
    return localPath || null;
  }
  try {
    const repoName = gitUrl.replace(/\.git$/, '').split('/').pop() || 'repo';
    const reposDir = path.resolve(process.cwd(), '.smoke-repos');
    if (!fs.existsSync(reposDir)) {
      fs.mkdirSync(reposDir, { recursive: true });
    }
    const targetDir = path.join(reposDir, repoName);
    if (fs.existsSync(path.join(targetDir, '.git'))) {
      console.log(`[Git] Pulling latest changes in ${targetDir}...`);
      await execFileAsync('git', ['-C', targetDir, 'pull', '--depth=1']).catch(() => {});
    } else {
      console.log(`[Git] Cloning ${gitUrl} into ${targetDir}...`);
      await execFileAsync('git', ['clone', '--depth=1', gitUrl, targetDir]);
    }
    return targetDir;
  } catch (err) {
    console.warn(`[Git] Failed to clone/pull ${gitUrl}:`, err);
    return null;
  }
}

function buildExplorerSystemPrompt(session: {
  brief_markdown: string | null;
  attached_docs: Array<{ filename: string; content: string }>;
  git_url: string | null;
  git_local_path: string | null;
  tech_stack: string[];
  company_name: string;
}): string {
  const creatorConfig = loadCreatorConfig();
  const docsSection = session.attached_docs.length > 0
    ? `\n\n## Attached Documentation Files\n${session.attached_docs.map((d) => `### ${d.filename}\n${d.content}`).join('\n\n---\n\n')}`
    : '';

  const gitSection = session.git_url
    ? `\n\n## Git Repository\nURL: ${session.git_url}\nClone it and explore: README, package.json/requirements.txt/Cargo.toml, top-level folder structure, key source directories.`
    : session.git_local_path
    ? `\n\n## Local Git Repository\nPath: ${session.git_local_path}\nExplore: README, package.json/requirements.txt/Cargo.toml, top-level folder structure, key source directories.`
    : '';

  const stackSection = session.tech_stack.length > 0
    ? `\n\n## Known Tech Stack\n${session.tech_stack.join(', ')}`
    : '';

  const configGuidance = creatorConfig ? `
## DEVELOPER CONFIGURATION (loaded from server/features/creator/company-creator-agent.json)
**Exploration Protocol**:
${(creatorConfig.systemPrompt?.explorationProtocol || []).map((p: string) => `- ${p}`).join('\n')}

**Task Decomposition Guidelines**:
${(creatorConfig.systemPrompt?.taskDecompositionRules || []).map((r: string) => `- ${r}`).join('\n')}

**Role Assignment Rules**:
- Max features: ${creatorConfig.taskRules?.maxFeatures || 15}
- Roles to prioritize: ${(creatorConfig.taskRules?.alwaysCreateRoles || []).join(', ')}
` : '';

  return `You are the PROJECT EXPLORER for "${session.company_name}".

Your ONLY job is to analyze the submitted project documentation and produce a structured Explore Report.
Do NOT create agents, zones, or any canvas elements. Just explore and report.

## Project Brief
${session.brief_markdown || '(No brief provided)'}${docsSection}${gitSection}${stackSection}
${configGuidance}

## YOUR MISSION

Analyze everything above and call \`submit_explore_report\` with a JSON report following this schema exactly:

{
  "company_name": "...",
  "company_type": "software_product|agency|internal_tooling|non_tech",
  "tech_stack": ["Node.js", "React", ...],
  "project_summary": "2-3 sentence overview",
  "features": [
    {
      "id": "feat_auth",
      "name": "Authentication & Authorization",
      "description": "What this feature does",
      "folders": ["/src/auth", "/src/middleware"],
      "key_files": ["/src/auth/index.ts"],
      "complexity": "high|medium|low",
      "suggested_agent_name": "Auth Engineer"
    }
  ],
  "zones_plan": [
    {
      "name": "Engineering",
      "role_title": "Engineering Division",
      "description": "...",
      "color": "#3b82f6",
      "sub_zones": [
        { "name": "Backend", "role_title": "Backend Team", "features": ["feat_auth", "feat_api"] }
      ]
    }
  ],
  "managers_plan": [
    {
      "name": "Backend Lead",
      "zone": "Backend",
      "manages_features": ["feat_auth", "feat_api"],
      "description": "Manages backend feature delivery"
    }
  ],
  "required_mcps": ["github", "filesystem"],
  "agent_count_estimate": 8,
  "explore_summary": "Concise executive summary of findings"
}

Rules:
- Each feature should map to exactly ONE dedicated agent (leaf agent)
- Group related features into zones logically
- If a Git repo is provided, actually read the file tree to identify real folders
- Keep feature IDs simple snake_case prefixed with feat_
- Call submit_explore_report when done — this is your ONLY deliverable`;
}

function buildArchitectSystemPrompt(
  report: ExploreReport,
  sessionId: string,
  spaceId: string,
  assignedProvider: string,
  assignedModel: string,
): string {
  const creatorConfig = loadCreatorConfig();
  const configSection = creatorConfig ? `
## DEVELOPER CONFIGURATION RULES (from server/features/creator/company-creator-agent.json):
- Identity: ${creatorConfig.systemPrompt?.identity || ''}
- Hierarchy Rules:
${(creatorConfig.systemPrompt?.hierarchyBuildingRules || []).map((r: string) => `  • ${r}`).join('\n')}
- Technical Agent Injections:
${(creatorConfig.systemPrompt?.agentSpecializationRules?.technical?.memoryInjects || []).map((m: string) => `  • ${m}`).join('\n')}
- Non-Technical Agent Injections:
${(creatorConfig.systemPrompt?.agentSpecializationRules?.nonTechnical?.memoryInjects || []).map((m: string) => `  • ${m}`).join('\n')}
- System Constraints:
${(creatorConfig.systemPrompt?.constraints || []).map((c: string) => `  • ${c}`).join('\n')}
` : '';

  return `You are the COMPANY CREATOR & ARCHITECT AGENT for "${report.company_name}".

Your mission is to construct the complete, production-grade company organization on the Smoke Monkey Canvas.
You MUST execute the build in the strict sequential phases detailed below.

================================================================================
CRITICAL AI MODEL UNIFORMITY DIRECTIVE:
• User-Selected Engine: Provider = "${assignedProvider}", Model = "${assignedModel}"
• MANDATORY: Every single agent you create using canvas_create_agent MUST receive:
    provider="${assignedProvider}"
    model="${assignedModel}"
Do NOT change this model or default to any other model. All company agents must run uniformly on the user's chosen engine.
================================================================================

## Explore Report Data
${JSON.stringify(report, null, 2)}
${configSection}

## EXECUTE THESE PHASES IN STRICT CHRONOLOGICAL ORDER:

### ── PHASE 1: HIERARCHICAL ZONES FINALIZATION (MANDATORY BEFORE ANY AGENTS) ──
CRITICAL: DO NOT CREATE ANY AGENTS IN THIS PHASE. You MUST create all department and squad zones FIRST so the floor has proper physical rooms ready. If agents are created before zones exist, they will float in empty space without containment.

1. Call canvas_list_zones({ space_id: "${spaceId}" }) to inspect any existing zones.
2. Finalize & Create Parent Department Zones:
   For each major division in zones_plan (e.g. Executive Leadership, Engineering Division, QA & Operations, Product & Growth):
   - Call canvas_create_zone with:
     • name: Division name (e.g. "Engineering Division")
     • roleTitle: Leadership title (e.g. "Engineering Leadership")
     • level: 0
     • color: Distinct division hex color (e.g. #3b82f6 for Engineering, #10b981 for Executive, #8b5cf6 for Product, #f59e0b for Operations)
     • space_id: "${spaceId}"
     • width: 960, height: 420
     • responsibilities: Functional scope of this entire division
     • workflowInstructions: Division-wide operational SOPs
   - Record the returned zone_id for each parent zone.
3. Finalize & Create Nested Squad Sub-Zones:
   For each sub_zone inside a division (e.g. Backend Squad, Frontend Squad, Data Platform, Security, Sales & Outreach):
   - Call canvas_create_zone with:
     • name: Squad name (e.g. "Backend Squad")
     • roleTitle: Squad lead title (e.g. "Backend Lead")
     • level: 1
     • parentZoneId: <parent_zone_id from step 2>
     • space_id: "${spaceId}"
     • color: Matching accent color
     • width: 440, height: 280
     • responsibilities: Feature domain responsibilities
   - Record the returned zone_id for each squad sub-zone.

DO NOT PROCEED TO PHASE 2 UNTIL ALL HIERARCHICAL ZONES ARE ESTABLISHED ON CANVAS.

### ── PHASE 2: LEADERSHIP & DEDICATED LEAF AGENT DEPLOYMENT ──
With all zones physically placed, deploy the team into their designated rooms:

1. Create CTO / Technical Director:
   - Call canvas_create_agent:
     • name: "${report.company_name} CTO"
     • role: "Chief Technology Officer"
     • specialty: "Full System Architecture & Technical Delivery"
     • description: "Executive technical director governing all ${report.features?.length || 0} features and engineering squads"
     • zone_id: <executive_zone_id>
     • provider: "${assignedProvider}"
     • model: "${assignedModel}"
     • system_prompt: "You are the CTO of ${report.company_name}. You govern architecture and delegate work down to your domain managers using get_project_explore and canvas delegation tools. Never write implementation code directly — inspect agent profiles and delegate tasks to the appropriate team manager."

2. Create Domain Managers (one per department / main zone):
   For each manager in managers_plan:
   - Call canvas_create_agent:
     • name: manager.name (e.g. "Backend Engineering Lead", "Frontend Lead", "Growth Lead")
     • role: "Engineering Manager — " + manager.zone
     • specialty: "Domain Manager for " + manager.manages_features.join(', ')
     • description: manager.description
     • zone_id: <squad_or_department_zone_id>
     • provider: "${assignedProvider}"
     • model: "${assignedModel}"
     • system_prompt: "You are the " + manager.name + " for ${report.company_name}. You manage the following features: " + manager.manages_features.join(', ') + ". You receive directives from the CTO and delegate tasks to your dedicated leaf engineers. Inspect your leaf agents' specialties and coordinate feature delivery."
   - Connect reports-to line:
     canvas_connect_agents({ source_agent_id: cto_id, target_agent_id: manager_id, type: "reports_to" })

3. Create Dedicated Leaf Feature Agents (Engineers & Specialists):
   For each feature in features:
   - Call canvas_create_agent:
     • name: feature.suggested_agent_name (e.g. "Auth & Security Engineer", "Billing Specialist", "UI Component Engineer", "Sales & Outreach Specialist")
     • role: "Dedicated Owner — " + feature.name
     • specialty: feature.name + " (" + feature.folders.join(', ') + ")"
     • description: "Sole owner of " + feature.name + ". Folders: " + feature.folders.join(', ') + ". Key files: " + (feature.key_files || []).join(', ')
     • zone_id: <appropriate_sub_zone_id>
     • provider: "${assignedProvider}"
     • model: "${assignedModel}"
     • system_prompt: "You are the dedicated " + feature.suggested_agent_name + " for ${report.company_name}. Your owned feature is '" + feature.name + "'. Your dedicated folders are: " + feature.folders.join(', ') + ". You are the sole owner of these paths and already know this feature deeply from your memory — work directly on them without re-exploring the codebase. Call project_explore if you need surrounding context."
   - Connect reports-to line from their domain manager:
     canvas_connect_agents({ source_agent_id: manager_id, target_agent_id: leaf_agent_id, type: "reports_to" })
   - If this feature shares API contracts with another feature agent, connect peer collaboration line:
     canvas_connect_agents({ source_agent_id: leaf_agent_id, target_agent_id: peer_agent_id, type: "peer" })
   - Schedule 3-hour drift check:
     schedule_cron_job({ agent_id: leaf_agent_id, name: "Feature Sync — " + feature.name, cron_schedule: "0 */3 * * *", prompt: "[FEATURE SYNC — 3-HOUR DRIFT CHECK]\\nOwned feature: " + feature.name + "\\nOwned folders: " + feature.folders.join(', ') + "\\n\\n1. Check if any file in your owned folders changed in the last 3 hours.\\n2. If NO files changed: invoke mark_cron_job_success('No changes.') and STOP.\\n3. If files CHANGED: review diffs and update memory." })

### ── PHASE 3: DEEP AGENT MEMORY INJECTION (DEDICATED MD FILES PER AGENT) ──
CRITICAL: To ensure no agent has to re-read or hunt through raw files every time a task arrives, you must directly inject complete, dedicated markdown memory files into each agent using canvas_update_agent_memory.

For EVERY created agent (CTO, Managers, and Leaf Agents), write:
1. facts.md (dimension: "facts", mode: "replace"):
   - For Technical Engineers:
     • Feature Name & Architectural Role
     • Owned Folders & Exact Key Files list
     • Tech Stack, Frameworks & Libraries
     • API Contracts, Schemas, Endpoints & Database Tables
     • Upstream/Downstream Dependencies
   - For Non-Technical / Sales / Growth Agents:
     • Product Value Proposition & Solution Overview
     • Pricing Tiers, Packaging & Licensing
     • Target Customer Personas (ICP) & Qualification Criteria
     • Competitive Battlecard & Objections Handling Rebuttals
   - For CTO:
     • Master Project Architecture & Technology Blueprint
     • Full Feature Matrix & Org Chart mapping each feature to its dedicated agent owner
   - For Domain Managers:
     • Squad Mission & Scope
     • List of managed feature agents with their owned paths and roles
2. identity.md (dimension: "identity", mode: "replace"):
   - Exact Role Title, Operational Boundaries, and Domain Authority:
     "I am the dedicated owner of {feature}. My jurisdiction covers {folders}. For any changes outside my boundary, I escalate to {manager} or collaborate with peer agent {peer}."
3. procedural.md (dimension: "procedural", mode: "replace"):
   - Step-by-step SOP for receiving tasks, inspecting owned files, making targeted code modifications, running tests, and reporting completion.
   - Exact Tool Usage Protocol (see Phase 4).
4. semantic.md (dimension: "semantic", mode: "replace"):
   - Domain Concepts, Business Logic Rules, Feature Terminology, and Data Contracts.
5. associative.md (dimension: "associative", mode: "replace"):
   - Component Dependencies, Service-to-Service Links, API Route Callers, and Shared Data Models.
6. reflective.md (dimension: "reflective", mode: "replace"):
   - Known Constraints, Non-Goals, Security Policies, Edge Cases to Guard Against, and Architectural Invariants.
7. prospective.md (dimension: "prospective", mode: "replace"):
   - Scheduled feature sync routines (3-hour drift check cron job) and upcoming sprint backlog intentions.
8. preferences.md (dimension: "preferences", mode: "replace"):
   - Code standards: TypeScript strict conventions, clean modular separation, ESLint rules, and error-handling formatting.
9. episodic.md (dimension: "episodic", mode: "replace"):
   - Inception record: Timestamp of agent creation, initial feature brief, and initial code baseline.
10. working.md (dimension: "working", mode: "replace"):
   - Active task scratchpad initialized with readiness status for new sprint requests.

### ── PHASE 4: MCP ATTACHMENT & TOOL PROTOCOL CONFIGURATION ──
Connect the necessary MCP servers to each agent via canvas_attach_mcp and document their usage protocol:
1. Technical Feature Engineers:
   - canvas_attach_mcp({ agent_id, mcp_name: "filesystem" }) — for reading, editing, and listing files in owned folders.
   - canvas_attach_mcp({ agent_id, mcp_name: "github" }) — for Git branch, PR, and commit operations.
   - canvas_attach_mcp({ agent_id, mcp_name: "search" }) — for searching external APIs, docs, and stack traces.
2. Leadership (CTO & Domain Managers):
   - canvas_attach_mcp({ agent_id, mcp_name: "smoke-monkey-canvas" }) — for inspecting the canvas, reviewing subordinate status, and delegating tasks.
   - canvas_attach_mcp({ agent_id, mcp_name: "search" }) — for architecture and tech evaluation.
3. Non-Technical Agents (Sales, Marketing, Calling):
   - canvas_attach_mcp({ agent_id, mcp_name: "search" }) — for lead prospecting, competitor research, and market data.
4. Tool Protocol SOP (injected into procedural.md):
   "• When reading or writing code in your owned folders: Use filesystem tools (read_file, list_directory).
   • When researching external libraries, errors, or market data: Use search / web-search tools.
   • When reporting results to management or delegating: Use canvas communication tools."

### ── PHASE 5: SPATIAL LAYOUT & CANVAS UI AUDIT ──
1. Call canvas_audit_ui({ space_id: "${spaceId}", auto_fix: true }).
2. Verify zero card overlap, clean single-row spacing inside zones, and downward reporting flow (CTO above Managers above Engineers).

### ── PHASE 6: BUILD VERIFICATION & FINAL DEPLOYMENT ──
Call submit_build_complete:
submit_build_complete({
  session_id: "${sessionId}",
  summary: "Completed 6-phase company deployment: Established hierarchical zones, hired leadership and specialized leaf engineers on ${assignedModel}, injected 5-D cognitive memory files, attached required MCPs, and verified layout.",
  zones_created: <number of zones created>,
  agents_created: <number of agents created>,
  mcps_attached: <number of MCPs attached>
})

Space ID: ${spaceId}
Session ID: ${sessionId}

BEGIN IMMEDIATELY WITH PHASE 1 (HIERARCHICAL ZONES). Do not describe what you will do — invoke canvas_create_zone now.`;
}

export function createExploreRouter(): Router {
  const router = Router();
  const spaceDb = new SpaceDb();
  const agentDb = new AgentDb();
  const wsServer = CoreWsServer.getInstance();

  // POST /api/explore — start an explore session
  router.post('/', async (req: Request, res: Response) => {
    try {
      const {
        space_id,
        brief_markdown,
        attached_docs,
        git_url,
        git_local_path,
        tech_stack,
        sync_interval_hours,
        company_name,
        provider,
        model,
      } = req.body as {
        space_id: string;
        brief_markdown?: string;
        attached_docs?: Array<{ filename: string; content: string }>;
        git_url?: string;
        git_local_path?: string;
        tech_stack?: string[];
        sync_interval_hours?: number;
        company_name?: string;
        provider?: string;
        model?: string;
      };

      if (!space_id) {
        return res.status(400).json({ error: 'space_id is required' });
      }

      // If Git repository or local path provided, sync/clone and link to space
      const resolvedWorkingDir = await prepareGitWorkspace(git_url, git_local_path);
      if (resolvedWorkingDir || git_url || brief_markdown) {
        spaceDb.updateWorkspaceSpace(space_id, {
          repoUrl: git_url || undefined,
          workingDir: resolvedWorkingDir || git_local_path || undefined,
          projectBrief: brief_markdown || undefined,
        });
      }

      const { provider: resolvedProvider, model: resolvedModel } = resolveDefaultProviderAndModel(provider, model);

      // Create the session record
      const session = spaceDb.createExploreSession({
        space_id,
        brief_markdown: brief_markdown ?? null,
        attached_docs: attached_docs ?? [],
        git_url: git_url ?? null,
        git_local_path: (resolvedWorkingDir || git_local_path) ?? null,
        tech_stack: tech_stack ?? [],
        sync_interval_hours: sync_interval_hours ?? 3,
        provider: resolvedProvider,
        model: resolvedModel,
      });

      const resolvedCompanyName = company_name?.trim() || 'Company';

      // Build explorer system prompt
      const explorerPrompt = buildExplorerSystemPrompt({
        brief_markdown: brief_markdown ?? null,
        attached_docs: attached_docs ?? [],
        git_url: git_url ?? null,
        git_local_path: (resolvedWorkingDir || git_local_path) ?? null,
        tech_stack: tech_stack ?? [],
        company_name: resolvedCompanyName,
      });

      // Create the Explorer Agent
      const explorerAgentId = `explorer_${Date.now()}_${randomUUID().slice(0, 6)}`;
      agentDb.createAgent({
        id: explorerAgentId,
        name: `Explorer — ${resolvedCompanyName}`,
        model: resolvedModel,
        provider: resolvedProvider,
        system_prompt: explorerPrompt,
        cron_schedule: null,
        cron_enabled: 0,
        pos_x: -9999,
        pos_y: -9999,
        status: 'idle',
        last_run_at: null,
        next_run_at: null,
        agent_tier: 'architect',
        owned_space_id: space_id,
      } as any);

      // Bind agent to space
      spaceDb.setAgentSpace(explorerAgentId, space_id);

      // Link explorer agent to session
      spaceDb.updateExploreSession(session.id, {
        status: 'exploring',
        explorer_agent_id: explorerAgentId,
      });

      // Run the explorer agent
      const runner = AgentRunner.getInstance();
      runner.runAgent(
        explorerAgentId,
        'manual',
        `[EXPLORE PHASE] Analyze the project brief and all attached documentation. Call submit_explore_report when done. Session ID: ${session.id}`,
        undefined,
        undefined,
        { jobName: 'Explore Phase' },
      ).catch((err) => {
        console.error('[Explore] Explorer agent failed:', err);
        spaceDb.updateExploreSession(session.id, { status: 'failed' });
        wsServer.broadcast({ type: 'explore_failed', sessionId: session.id, error: String(err) });
      });

      wsServer.broadcast({
        type: 'explore_started',
        sessionId: session.id,
        spaceId: space_id,
        explorerAgentId,
      });

      return res.status(201).json({ session, explorerAgentId });
    } catch (err) {
      console.error('[Explore] POST error:', err);
      return res.status(500).json({ error: String(err) });
    }
  });

  // GET /api/explore/:sessionId
  router.get('/:sessionId', (req: Request, res: Response) => {
    const rawId = req.params.sessionId;
    const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;
    const session = spaceDb.getExploreSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    return res.json(session);
  });

  // GET /api/explore/:sessionId/report
  router.get('/:sessionId/report', (req: Request, res: Response) => {
    const rawId = req.params.sessionId;
    const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;
    const session = spaceDb.getExploreSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!session.explore_report_json) return res.status(404).json({ error: 'Report not ready' });
    try {
      return res.json(JSON.parse(session.explore_report_json));
    } catch {
      return res.status(500).json({ error: 'Invalid report JSON' });
    }
  });

  // GET /api/explore/:sessionId/events — return reconstructed runtime terminal events for resume on refresh
  router.get('/:sessionId/events', (req: Request, res: Response) => {
    const rawId = req.params.sessionId;
    const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;
    const session = spaceDb.getExploreSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const rawEvents: RunEventRecord[] = [];

    // Explorer runs
    if (session.explorer_agent_id) {
      const runs = agentDb.getAgentRuns(session.explorer_agent_id, 10);
      for (const r of [...runs].reverse()) {
        const evs = agentDb.getRunEvents(r.id);
        rawEvents.push(...evs);
      }
    }

    // Architect runs
    if (session.architect_agent_id) {
      const runs = agentDb.getAgentRuns(session.architect_agent_id, 10);
      for (const r of [...runs].reverse()) {
        const evs = agentDb.getRunEvents(r.id);
        rawEvents.push(...evs);
      }
    }

    // Sort chronologically
    rawEvents.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

    const runtimeEvents: any[] = [];
    const toolMap = new Map<string, any>();

    for (const raw of rawEvents) {
      const ts = new Date(raw.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      let payload: any = {};
      try {
        payload = typeof raw.payload_json === 'string' ? JSON.parse(raw.payload_json) : raw.payload_json;
      } catch {}

      if (raw.event_type === 'step.started') {
        runtimeEvents.push({
          id: `step_${raw.id}`,
          type: 'step',
          title: `Step ${payload?.step || ''}`,
          content: `Step ${payload?.step || ''} started`,
          timestamp: ts,
          status: 'running',
        });
      } else if (raw.event_type === 'text.thought') {
        const delta = payload?.delta || '';
        if (delta) {
          const last = runtimeEvents[runtimeEvents.length - 1];
          if (last && last.type === 'thought') {
            last.content += delta;
          } else {
            runtimeEvents.push({
              id: `thought_${raw.id}`,
              type: 'thought',
              title: 'Agent Reasoning',
              content: delta,
              timestamp: ts,
            });
          }
        }
      } else if (raw.event_type === 'tool.started') {
        const toolCallId = payload?.toolCallId || String(raw.id);
        const ev = {
          id: `tool_${toolCallId}`,
          type: 'tool',
          toolName: payload?.toolName || 'tool',
          args: payload?.args,
          content: `Executing tool: ${payload?.toolName || 'tool'}`,
          timestamp: ts,
          status: 'running',
        };
        toolMap.set(toolCallId, ev);
        runtimeEvents.push(ev);
      } else if (raw.event_type === 'tool.completed') {
        const toolCallId = payload?.toolCallId;
        const ev = toolCallId ? toolMap.get(toolCallId) : null;
        if (ev) {
          ev.status = 'success';
          ev.result = payload?.result;
          ev.content = `✓ Completed: ${ev.toolName || 'tool'}`;
        }
      } else if (raw.event_type === 'tool.failed') {
        const toolCallId = payload?.toolCallId;
        const ev = toolCallId ? toolMap.get(toolCallId) : null;
        if (ev) {
          ev.status = 'error';
          ev.content = `✖ Failed ${ev.toolName || 'tool'}: ${payload?.error || ''}`;
        }
      } else if (raw.event_type === 'text.delta') {
        const delta = payload?.delta || '';
        if (delta) {
          const last = runtimeEvents[runtimeEvents.length - 1];
          if (last && last.type === 'text') {
            last.content += delta;
          } else {
            runtimeEvents.push({
              id: `text_${raw.id}`,
              type: 'text',
              content: delta,
              timestamp: ts,
            });
          }
        }
      }
    }

    const activeAgentId = session.architect_agent_id || session.explorer_agent_id;

    return res.json({
      sessionId: session.id,
      status: session.status,
      activeAgentId,
      explorerAgentId: session.explorer_agent_id,
      architectAgentId: session.architect_agent_id,
      events: runtimeEvents,
    });
  });

  // POST /api/explore/:sessionId/accept — user accepts report, trigger Phase 2
  router.post('/:sessionId/accept', async (req: Request, res: Response) => {
    try {
      const rawId = req.params.sessionId;
      const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;
      const session = spaceDb.getExploreSession(sessionId);
      if (!session) return res.status(404).json({ error: 'Session not found' });
      if (!session.explore_report_json) return res.status(400).json({ error: 'No report to accept' });

      // A double-click, or a resubmit after the first request hasn't
      // visibly completed yet (the real-world trigger — the architect build
      // this route kicks off isn't instant), used to create a second
      // Architect agent that built the whole company again: nothing here
      // checked whether a build was already underway or done, and the
      // status write happened only after creating the (first) agent. Reject
      // outright once a build has started, and do it before any of the
      // agent-creation work below. See #18.
      if (session.status === 'building' || session.status === 'built') {
        return res.status(409).json({
          error: `Explore session is already ${session.status}.`,
          status: session.status,
          architectAgentId: session.architect_agent_id || null,
        });
      }

      const report: ExploreReport = JSON.parse(session.explore_report_json);

      const { provider: resolvedProvider, model: resolvedModel } = resolveDefaultProviderAndModel(
        req.body?.provider || session.provider,
        req.body?.model || session.model,
      );

      // Create Architect Agent
      const architectAgentId = `architect_${Date.now()}_${randomUUID().slice(0, 6)}`;

      // Flip the status to 'building' before any agent-creation work starts,
      // not after — the narrowest possible window between the check above
      // and this write is the only thing a race could still slip through,
      // and this closes it as tightly as the synchronous DB layer allows.
      spaceDb.updateExploreSession(sessionId, {
        status: 'building',
        architect_agent_id: architectAgentId,
      });

      agentDb.createAgent({
        id: architectAgentId,
        name: `Architect — ${report.company_name}`,
        model: resolvedModel,
        provider: resolvedProvider,
        system_prompt: buildArchitectSystemPrompt(report, session.id, session.space_id, resolvedProvider, resolvedModel),
        cron_schedule: null,
        cron_enabled: 0,
        pos_x: -9999,
        pos_y: -9999,
        status: 'idle',
        last_run_at: null,
        next_run_at: null,
        agent_tier: 'architect',
        owned_space_id: session.space_id,
      } as any);

      // Bind architect agent to space
      spaceDb.setAgentSpace(architectAgentId, session.space_id);

      // (status + architect_agent_id already written above, before agent creation)

      // Attach Canvas MCP strictly scoped to this space
      const mcpId = `mcp_${Date.now()}_${randomUUID().slice(0, 6)}`;
      agentDb.addAgentMcp({
        id: mcpId,
        agent_id: architectAgentId,
        mcp_name: 'smoke-monkey-canvas',
        label: 'Canvas MCP',
        config_json: JSON.stringify({ spaceId: session.space_id, args: ['--space-id', session.space_id] }),
        enabled: 1,
        source: 'canvas',
      });

      const runner = AgentRunner.getInstance();
      runner.runAgent(
        architectAgentId,
        'manual',
        `[BUILD PHASE] Build the full team for ${report.company_name}. Follow your system prompt steps exactly. Session ID: ${session.id}`,
        undefined,
        undefined,
        { jobName: 'Build Phase' },
      ).catch((err) => {
        console.error('[Build] Architect agent failed:', err);
        wsServer.broadcast({ type: 'build_failed', sessionId: session.id, error: String(err) });
      });

      wsServer.broadcast({
        type: 'build_started',
        sessionId: session.id,
        spaceId: session.space_id,
        architectAgentId,
      });

      return res.status(200).json({ architectAgentId, message: 'Build phase started' });
    } catch (err) {
      console.error('[Explore] Accept error:', err);
      return res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/explore/:sessionId/sync — re-trigger exploration for an existing session
  router.post('/:sessionId/sync', async (req: Request, res: Response) => {
    try {
      const rawId = req.params.sessionId;
      const sessionId = Array.isArray(rawId) ? rawId[0] : String(rawId);
      const session = spaceDb.getExploreSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Reset session status back to 'exploring'
      spaceDb.updateExploreSession(sessionId, { status: 'exploring', explore_report_json: null });

      const space = spaceDb.getWorkspaceSpace(session.space_id);
      const companyName = space?.name || 'Company';

      const attachedDocs = session.attached_docs_json ? JSON.parse(session.attached_docs_json) : [];
      const techStack = session.tech_stack_json ? JSON.parse(session.tech_stack_json) : [];

      const { provider: resolvedProvider, model: resolvedModel } = resolveDefaultProviderAndModel(
        req.body?.provider || session.provider,
        req.body?.model || session.model,
      );

      const explorerPrompt = buildExplorerSystemPrompt({
        brief_markdown: session.brief_markdown,
        attached_docs: attachedDocs,
        git_url: session.git_url,
        git_local_path: session.git_local_path,
        tech_stack: techStack,
        company_name: companyName,
      });

      const explorerAgentId = `explorer_sync_${Date.now()}_${randomUUID().slice(0, 6)}`;
      agentDb.createAgent({
        id: explorerAgentId,
        name: `Explorer (Sync) — ${companyName}`,
        model: resolvedModel,
        provider: resolvedProvider,
        system_prompt: explorerPrompt,
        cron_schedule: null,
        cron_enabled: 0,
        pos_x: -9999,
        pos_y: -9999,
        status: 'idle',
        last_run_at: null,
        next_run_at: null,
        agent_tier: 'architect',
        owned_space_id: session.space_id,
      } as any);

      spaceDb.setAgentSpace(explorerAgentId, session.space_id);
      spaceDb.updateExploreSession(sessionId, { explorer_agent_id: explorerAgentId });

      const runner = AgentRunner.getInstance();
      runner.runAgent(
        explorerAgentId,
        'manual',
        `[SYNC PHASE] Re-analyze the project and call submit_explore_report with updated findings. Session ID: ${sessionId}`,
        undefined,
        undefined,
        { jobName: 'Sync Phase' },
      ).catch((err: Error) => {
        console.error('[Sync] Explorer agent failed:', err);
        spaceDb.updateExploreSession(sessionId, { status: 'failed' });
        wsServer.broadcast({ type: 'explore_failed', sessionId, error: String(err) });
      });

      wsServer.broadcast({ type: 'explore_started', sessionId, spaceId: session.space_id, explorerAgentId });

      return res.status(200).json({ sessionId, explorerAgentId, message: 'Sync started' });
    } catch (err) {
      console.error('[Explore] Sync error:', err);
      return res.status(500).json({ error: String(err) });
    }
  });

  // GET /api/explore — list sessions (optional space filter)
  router.get('/', (req: Request, res: Response) => {
    const spaceId = typeof req.query.space_id === 'string' ? req.query.space_id : undefined;
    return res.json(spaceDb.listExploreSessions(spaceId));
  });

  return router;
}
