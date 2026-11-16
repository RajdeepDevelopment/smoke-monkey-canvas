/**
 * 🐒 Smoke Monkey Canvas Model Context Protocol (MCP) Server
 *
 * Implements the full Model Context Protocol (JSON-RPC 2.0 lines over stdio)
 * exposing complete spatial multi-agent canvas architecture and governance:
 *   - Spaces / Companies (presets, creation, updates, bounds, workflows)
 *   - Role & Department Zones (creation, repositioning, hierarchy, responsibilities)
 *   - Agents (hiring, role updates, specialty, models, prompts, placement)
 *   - API Keys & Credentials (NVIDIA, Anthropic, OpenAI, Gemini, Groq, etc.)
 *   - 10-Dimension Cognitive Memory Matrix (read, write, append, cascade)
 *   - Skills & MCPs Attachments (catalog discovery, attach, detach)
 *   - Hierarchy & Reporting Links (connect, disconnect, trace lines)
 *   - Execution & Delegation (run agent, stop agent, delegate tasks)
 *
 * Operating Modes:
 *   - Global Mode: Operates across all spaces, default when no space is specified.
 *   - Scoped Mode: Scoped to a specific space/company via CLI argument `--space-id <id>`
 *     or environment variable `CANVAS_SPACE_ID` / `SPACE_ID`.
 */

import * as readline from 'node:readline';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';

import { CoreDatabase } from '../core/database.db.js';
import { SpaceDb } from '../space/space.db.js';
import { AgentDb } from '../agent/agent.db.js';
import { resolveAgentWorkspace, reconcileSystemPromptWithProfile } from '../agent/agent.prompt.js';
import { ensureAgentWorkspace, MEMORY_FILES } from '../agent/agent.manifest.js';
import { COMPANY_PRESETS, layoutCompany } from '../../../web/src/features/library/data/companies.data.js';
import type { CompanyPreset, CompanyScale } from '../../../web/src/features/library/library.types.js';
import { ENTERPRISE_AGENT_TEMPLATES, type AgentTemplate } from '../../../web/src/features/agent/agent.templates.js';
import { STOCK_MCPS } from '../mcp/mcp.stock.manual.js';
import { SKILL_CATEGORIES } from '../core/database.db.js';
import { calculateNextRun } from '../../cron.js';

// ── Diagnostic Logging (STDERR ONLY to keep STDOUT 100% pure JSON-RPC) ──────
const logErr = (...args: unknown[]) => {
  process.stderr.write(`[canvas-mcp] ${args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}\n`);
};

// ── Command-Line & Environment Configuration ────────────────────────────────
const argv = process.argv.slice(2);
let configuredSpaceId: string | null = process.env.CANVAS_SPACE_ID || process.env.SPACE_ID || null;
let configuredPort = Number(process.env.PORT || 3333);
let customDbPath: string | undefined = process.env.SMOKE_CANVAS_DB || undefined;

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === '--space-id' || arg === '-s') {
    configuredSpaceId = argv[++i] || null;
  } else if (arg === '--port' || arg === '-p') {
    const p = Number(argv[++i]);
    if (!isNaN(p)) configuredPort = p;
  } else if (arg === '--db') {
    customDbPath = argv[++i];
  }
}

export function setConfiguredSpaceId(id: string | null): void {
  configuredSpaceId = id;
}

export function getConfiguredSpaceId(): string | null {
  return configuredSpaceId || process.env.CANVAS_SPACE_ID || process.env.SPACE_ID || null;
}

// ── Database & Service Initialization ───────────────────────────────────────
const coreDb = CoreDatabase.getInstance(customDbPath);
const spaceDb = new SpaceDb(coreDb);
const agentDb = new AgentDb(coreDb);

logErr(`Started Smoke Monkey Canvas MCP Server. Scoped Space ID: ${configuredSpaceId || '(global)'}`);

/** Helper to resolve target space ID with robust environment and strict sandboxing */
function resolveSpace(paramSpaceId?: string | null): string | null {
  const effectiveScopedId = getConfiguredSpaceId();
  if (effectiveScopedId) {
    if (paramSpaceId && paramSpaceId.trim() && paramSpaceId.trim() !== effectiveScopedId) {
      logErr(`Security violation: cross-space operation blocked. Agent is strictly restricted to space "${effectiveScopedId}", requested "${paramSpaceId}"`);
      throw new Error(`Access denied: This agent is strictly restricted to space "${effectiveScopedId}". Cross-space operations on "${paramSpaceId}" are forbidden.`);
    }
    return effectiveScopedId;
  }
  const explicit = paramSpaceId?.trim();
  if (explicit) return explicit;
  const envSpace = process.env.CANVAS_SPACE_ID || process.env.SPACE_ID;
  if (envSpace?.trim()) return envSpace.trim();
  const allSpaces = spaceDb.getWorkspaceSpaces();
  if (allSpaces.length > 0) return allSpaces[0].id;
  return null;
}

/** Assert agent belongs to the scoped space */
function assertAgentInScope(agentId?: string | null): void {
  const effectiveScopedId = getConfiguredSpaceId();
  if (!effectiveScopedId || !agentId) return;
  const agentSpaceId = spaceDb.getAgentSpaceId(agentId);
  const agent = agentDb.getAgent(agentId);
  const belongs = (agentSpaceId === effectiveScopedId) || (agent?.owned_space_id === effectiveScopedId);
  if (!belongs) {
    logErr(`Access denied: Agent "${agentId}" does not belong to configured space "${effectiveScopedId}"`);
    throw new Error(`Access denied: Agent "${agentId}" belongs to a different space. Cross-space operations are strictly forbidden.`);
  }
}

/** Assert zone belongs to the scoped space */
function assertZoneInScope(zoneId?: string | null): void {
  const effectiveScopedId = getConfiguredSpaceId();
  if (!effectiveScopedId || !zoneId) return;
  const zone = spaceDb.getZone(zoneId);
  if (zone && zone.spaceId && zone.spaceId !== effectiveScopedId) {
    logErr(`Access denied: Zone "${zoneId}" belongs to space "${zone.spaceId}", not "${effectiveScopedId}"`);
    throw new Error(`Access denied: Zone "${zoneId}" belongs to a different space. Cross-space operations are strictly forbidden.`);
  }
}

/** Helper to call running canvas HTTP server if available */
async function callCanvasApi<T = unknown>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const url = `http://127.0.0.1:${configuredPort}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: T | undefined;
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = text as unknown as T;
    }
    return { ok: res.ok, status: res.status, data, error: !res.ok ? text : undefined };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, error: `Canvas HTTP server unreachable at ${url}: ${msg}` };
  }
}

// ── Canonical API Key Normalization ─────────────────────────────────────────
const API_KEY_MAP: Record<string, string> = {
  nvidia: 'NVIDIA_API_KEY',
  nvidia_api_key: 'NVIDIA_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
  anthropic_api_key: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  openai_api_key: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  google: 'GEMINI_API_KEY',
  gemini_api_key: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
  groq_api_key: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  openrouter_api_key: 'OPENROUTER_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  mistral_api_key: 'MISTRAL_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
  perplexity_api_key: 'PERPLEXITY_API_KEY',
  together: 'TOGETHER_API_KEY',
  together_api_key: 'TOGETHER_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  deepseek_api_key: 'DEEPSEEK_API_KEY',
  github: 'GITHUB_TOKEN',
  github_token: 'GITHUB_TOKEN',
  slack: 'SLACK_BOT_TOKEN',
  slack_token: 'SLACK_BOT_TOKEN',
};

function normalizeKeyName(input: string): string {
  const clean = input.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return API_KEY_MAP[clean] || input.trim().toUpperCase();
}

// ── 10-Dimension Cognitive Memory Matrix Keys ───────────────────────────────
const VALID_MEMORY_FILES = [
  'facts.md',
  'semantic.md',
  'associative.md',
  'procedural.md',
  'reflective.md',
  'prospective.md',
  'identity.md',
  'preferences.md',
  'working.md',
  'episodic.md',
];

function normalizeMemoryFileName(name: string): string {
  const base = name.trim().toLowerCase().replace(/\.md$/, '');
  const candidate = `${base}.md`;
  if (VALID_MEMORY_FILES.includes(candidate)) {
    return candidate;
  }
  return 'facts.md';
}

// ── Standard Operating Procedure (SOP) & Spatial Layout Rules ───────────────
export const CANVAS_MCP_SOP = `# SMOKE MONKEY CANVAS — AGENT STANDARD OPERATING PROCEDURE (SOP) & SPATIAL RULES

This MCP server grants autonomous and external AI agents complete governance over the Smoke Monkey Canvas multi-agent spatial workspace.
When creating, moving, sizing, or architecting companies, zones, and agents, all agents MUST strictly follow these mandatory spatial rules to avoid visual defects (such as agent card stacking, wire criss-crossing, and out-of-bounds nodes).

---

## 1. MANDATORY SPATIAL RULE: ZERO AGENT STACKING / CARD COLLISION
- **Card Footprint**: Every agent card/pod occupies ~220px width × ~160px height (or ~168px avatar pod width).
- **CRITICAL**: NEVER place two agents at identical coordinates! Card stacking makes agents visually invisible and unselectable.
- **Horizontal Clearance**: In any row, maintain a minimum gap of **240px to 270px** between agent centers (\`dx = 240px\`).
- **Dynamic Slot Calculation Formula**:
  - For a single horizontal row inside a zone:
    - \`pos_x = zone.x + 50 + (slotIndex * 240)\`
    - \`pos_y = zone.y + 75\`
  - For multi-row zones (e.g., 6+ agents or compact zones):
    - \`cols = Math.max(1, Math.floor((zone.width - 40) / 240))\`
    - \`col = slotIndex % cols\`, \`row = Math.floor(slotIndex / cols)\`
    - \`pos_x = zone.x + 50 + (col * 240)\`
    - \`pos_y = zone.y + 75 + (row * 160)\`
- **Zone Dimensions**:
  - Always size zone before creating agents: \`width >= Math.max(520, agentsCount * 240 + 80)\`, \`height >= 280\`.
  - For 3 agents in 1 row: zone \`width >= 800px\`, \`height >= 280px\`.
  - For 4 agents in 1 row: zone \`width >= 1040px\`, \`height >= 280px\`.
  - For 5 agents in 1 row: zone \`width >= 1280px\`, \`height >= 280px\`.
  - For 6 agents in 1 row: zone \`width >= 1520px\`, \`height >= 280px\`.

---

## 2. MANDATORY SPATIAL RULE: ZERO ZONE OVERLAPS (BOUNDING BOX INTERSECTION)
- Sibling zones on the same tier MUST NEVER OVERLAP horizontally or vertically!
- **Horizontal Gap**: Maintain at least **100px horizontal clearance** between adjacent zones (\`zone2.x >= zone1.x + zone1.width + 100\`).
- **Vertical Gap**: Maintain at least **80px vertical clearance** between hierarchy tiers (\`tier2.y >= tier1.y + tier1.height + 80\`).
- Never place two zones with identical or overlapping coordinates. If creating multiple zones on the same tier, calculate:
  - First zone: \`x = 100\`
  - Second zone: \`x = zone1.x + zone1.width + 100\`
  - Third zone: \`x = zone2.x + zone2.width + 100\`
- Parent space bounds MUST be updated to enclose all zones with at least 120px padding.

---

## 3. MANDATORY BOUNDS RULE: POSITIVE COORDINATES ONLY
- Never assign negative coordinates (\`x < 0\` or \`y < 0\`) to any space, zone, or agent.
- Keep all canvas elements within clean positive coordinates with at least 80px margin from \`(0, 0)\`.
- Use \`canvas_update_space\` to ensure space bounds encompass all zones with generous padding (e.g. \`x: 0, y: 0, width: 6400, height: 1700\`).

---

## 4. MANDATORY HIERARCHY RULE: CLEAN TOP-TO-BOTTOM FLOW (ZERO CRISS-CROSSING)
- Visual hierarchy lines in Smoke Monkey Canvas are drawn from the **bottom handle** (\`role-zone-child\`) of a parent zone to the **top handle** (\`role-zone-parent\`) of a child zone.
- **Vertical Ordering**: A parent zone MUST ALWAYS be placed physically ABOVE its child zones (\`parent.y + parent.height < child.y\`).
- **Horizontal Alignment**: Place child squads directly underneath or symmetrically clustered below their managing zone.
- **NO Far-Flung Stragglers**: Never place a child zone on the far opposite side of unrelated departments, which forces connecting wires to slice horizontally through intermediate zones.

---

## 5. STANDARD 4-TIER ENTERPRISE TOPOLOGY
When organizing or expanding an enterprise company, adhere to this balanced 4-tier geometry:
- **Tier 0 (Y ≈ 80px, Top Center)**: Executive Boardroom & Strategy (Level 0: CEO, COO, CFO).
- **Tier 1 (Y ≈ 440px, Department Leadership)**:
  - Left Flank: Enterprise Sales (GTM) & 24/7 Global Customer Support.
  - Center: Office of the CTO & Protocol Architecture (directly under Executive Boardroom).
  - Right Flank: Information Security Labs (CISO) & Product Management (CPO).
- **Tier 2 (Y ≈ 800px, Core Engineering Squads)**:
  - Deep technical delivery squads (e.g., Packet Engine, Microservices, Core Engine) clustered directly beneath the CTO.
- **Tier 3 (Y ≈ 1160px, Verification, SRE & Telemetry UI)**:
  - QA Fuzzing & Compliance, Cloud Infrastructure / SRE, and Observability / Frontend Consoles.

---

## 6. MANDATORY VERIFICATION: canvas_audit_ui (ZERO DEFECT POLICY)
Whenever you create, reposition, hire, or modify spaces, zones, or agents, you MUST call \`canvas_audit_ui\` before completing your work!
\`canvas_audit_ui\` automatically inspects:
1. **Agent Collisions**: Overlapping cards, stacked agents, or insufficient clearance (\`dx < 200px\`, \`dy < 100px\`).
2. **Zone Overlaps**: Overlapping department zone boundaries.
3. **Out-of-Zone Agents**: Agents positioned outside department zones.
4. **Out-of-Bounds Elements**: Elements placed outside space boundaries or with negative coordinates.
5. **Orphaned Zones**: Zones referencing non-existent spaces.
6. **Hierarchy Inversions**: Parent zones placed below child zones.
If any issue is detected (\`status: "FAIL"\`), you can run \`canvas_audit_ui\` with \`{ auto_fix: true }\` to automatically correct agent positions, expand zones, and align geometry, or manually reposition them using \`canvas_reposition_agents\` and \`canvas_update_zone\`.
NEVER report a task as complete if \`canvas_audit_ui\` reports any defects.

---

## 7. MANDATORY ORDER OF OPERATIONS TO CREATE / EXPAND A TEAM
When any agent or tool caller is instructed to create, build, or expand a team of agents on the canvas, you MUST execute the following strict 6-step lifecycle in order:

1. **TARGET YOUR SPACE**:
   Identify your assigned Space ID from your prompt credentials or environment (\`CANVAS_SPACE_ID\`). Always supply \`space_id: "<your_space_id>"\`. Never create on or switch to another space.

2. **STEP 1 — CREATE / SETUP THE DEPARTMENT ZONE WITH PROMPT**:
   Before creating agents, create the designated role zone (or identify an existing zone):
   - Call \`canvas_create_zone\` with:
     - \`space_id\`: your space ID.
     - \`name\`: Descriptive department / squad name (e.g., "Distributed Microservices Squad").
     - \`roleTitle\`: Department leadership title (e.g., "Engineering Manager").
     - \`level\`: Tier level (0 for Executive, 1 for Directorate, 2 for Squad Lead/Manager, 3 for Core Specialists).
     - \`parentZoneId\`: Superior zone ID in reporting hierarchy.
     - \`responsibilities\`: Detailed domain responsibilities and scope.
     - \`workflowInstructions\` (ZONE PROMPT): Explicit day-to-day workflow prompt, coding standards, test requirements, and operational rules for agents in this zone.
     - \`width\`, \`height\`, \`x\`, \`y\`: Position on the canvas (Tier 0: y=80, Tier 1: y=440, Tier 2: y=800, Tier 3: y=1160; width >= agents_count * 240 + 80).

3. **STEP 2 — CREATE SPECIALIZED AGENT(S) INSIDE THE ZONE**:
   Create each agent stationed directly inside the zone:
   - Call \`canvas_create_agent\` with:
     - \`space_id\`: your space ID.
     - \`zone_id\`: The ID of the zone created in Step 1.
     - \`name\`: Full professional name and title (e.g., "David Kim, Senior Microservices Engineer").
     - \`role\`: Specific functional role.
     - \`specialty\`: Specialized technical domain.
     - \`model\` & \`provider\`.
     - \`pos_x\`, \`pos_y\`: Single-row clearance coordinates inside zone (\`pos_x = zone.x + 50 + slotIndex * 240, pos_y = zone.y + 75\`).
     - \`system_prompt\`: Domain-specialized system prompt adhering to the zone prompt.

4. **STEP 3 — ATTACH MCP SERVERS & SKILLS TO EACH AGENT**:
   Equip the new agent with execution capabilities:
   - Call \`canvas_attach_mcp\` with \`agent_id\` and \`mcp_name\` (e.g. \`github-mcp-server\`, \`firecrawl-mcp\`, \`smoke-monkey-canvas\`, etc.).
   - Call \`canvas_attach_skill\` with \`agent_id\` and \`skill_name\` or \`skill_id\` from the catalog.

5. **STEP 4 — CONNECT REPORTING & PEER COMMUNICATION LINES**:
   - Call \`canvas_connect_agents\` with \`connection_type: "reports_to"\` between manager and subordinates.
   - Call \`canvas_connect_agents\` with \`connection_type: "peer"\` between squad colleagues.

6. **STEP 5 — AUDIT CANVAS UI QUALITY**:
   - Call \`canvas_audit_ui\` with \`{ space_id: "<your_space_id>", auto_fix: true }\`.
   - Verify 100/100 score, zero agent collisions, zero zone overlaps, and all agents inside their zones.
`;

// ── Tool Definitions Catalog (39 Tools) ─────────────────────────────────────
export const CANVAS_TOOL_DEFINITIONS = [
  // ── Category 1: Spaces & Companies ──
  {
    name: 'canvas_list_spaces',
    description: 'List all workspace spaces / companies registered on Smoke Monkey Canvas with id, name, category, dimensions, coordinates, color, and agent count.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Optional keyword to search across space names, descriptions, or categories' },
      },
    },
  },
  {
    name: 'canvas_get_space',
    description: 'Retrieve full details of a specific company space, including organizational workflow prompt, responsibilities, workflow instructions, member zones, and contained agents.',
    inputSchema: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: 'ID of the space. Defaults to the active scoped space if omitted.' },
      },
    },
  },
  {
    name: 'canvas_create_space',
    description: 'Create a new enterprise company / office space on the canvas with customizable dimensions, colors, organizational charter, and workflow prompts.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Company or Office Space name (e.g. "Apex Cloud Technologies")' },
        description: { type: 'string', description: 'Corporate overview or business description' },
        roleTitle: { type: 'string', description: 'Primary organizational role or headquarters label' },
        color: { type: 'string', description: 'Hex color code for the space border/theme (e.g. "#3b82f6")' },
        shape: { type: 'string', enum: ['rectangle', 'circle'], description: 'Visual shape on canvas' },
        width: { type: 'number', description: 'Width on canvas (default: 1800)' },
        height: { type: 'number', description: 'Height on canvas (default: 1200)' },
        x: { type: 'number', description: 'Top-left X coordinate on canvas (default: 0)' },
        y: { type: 'number', description: 'Top-left Y coordinate on canvas (default: 0)' },
        workflowPrompt: { type: 'string', description: 'Master company workflow prompt, quality gates, and cultural tenets' },
        workflowInstructions: { type: 'string', description: 'Step-by-step organizational operating instructions' },
        responsibilities: { type: 'string', description: 'Core functional responsibilities of this office space' },
        delegationPolicy: { type: 'string', enum: ['auto', 'down', 'up', 'both', 'peers'], description: 'Default delegation policy' },
      },
      required: ['name'],
    },
  },
  {
    name: 'canvas_update_space',
    description: 'Update properties, dimensions, position, or workflow prompts of an existing workspace space / company.',
    inputSchema: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: 'ID of the space to update. Defaults to the active scoped space.' },
        name: { type: 'string', description: 'New space name' },
        description: { type: 'string', description: 'New description' },
        roleTitle: { type: 'string', description: 'New role title' },
        color: { type: 'string', description: 'Hex color code' },
        shape: { type: 'string', enum: ['rectangle', 'circle'] },
        width: { type: 'number', description: 'New width' },
        height: { type: 'number', description: 'New height' },
        x: { type: 'number', description: 'New X position' },
        y: { type: 'number', description: 'New Y position' },
        workflowPrompt: { type: 'string', description: 'Updated workflow prompt' },
        workflowInstructions: { type: 'string', description: 'Updated workflow instructions' },
        responsibilities: { type: 'string', description: 'Updated responsibilities' },
        delegationPolicy: { type: 'string', enum: ['auto', 'down', 'up', 'both', 'peers'] },
      },
    },
  },
  {
    name: 'canvas_delete_space',
    description: 'Delete a company / office space from the canvas. Optionally removes its contained zones and unassigns member agents.',
    inputSchema: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: 'ID of the space to delete' },
        delete_contained_zones: { type: 'boolean', description: 'If true, also deletes all role zones belonging to this space (default: false)' },
      },
      required: ['space_id'],
    },
  },
  {
    name: 'canvas_list_company_presets',
    description: 'List the 10 built-in industry company presets (SaaS, FinTech, AI Labs, Cybersecurity, E-Commerce, Logistics, Gaming, Marketing, Healthcare, Venture Capital) with available scales and architectures.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'canvas_deploy_company_preset',
    description: 'Deploy a complete multi-agent company preset with full organizational hierarchy, role zones, agent pods, and workflows onto the canvas.',
    inputSchema: {
      type: 'object',
      properties: {
        preset_id: {
          type: 'string',
          description: 'Company preset ID (e.g. "company-saas-cloud", "company-fintech-bank", "company-ai-labs", "company-cybersecurity-defense", "company-ecommerce-retail", "company-freight-logistics", "company-gaming-studio", "company-growth-marketing", "company-healthcare-network", "company-venture-capital")',
        },
        scale: { type: 'string', enum: ['small', 'mid', 'large'], description: 'Company size/scale: small (core team), mid (standard company), large (multi-squad enterprise). Defaults to "mid".' },
        space_name: { type: 'string', description: 'Optional custom name for the created office space' },
        origin_x: { type: 'number', description: 'Canvas X coordinate to position top-left of company space (default: 0)' },
        origin_y: { type: 'number', description: 'Canvas Y coordinate to position top-left of company space (default: 0)' },
      },
      required: ['preset_id'],
    },
  },

  // ── Category 2: Role & Department Zones ──
  {
    name: 'canvas_list_zones',
    description: 'List department and functional role zones on the canvas, optionally filtered by space_id. Includes parent zone relationships, dimensions, and assigned agents.',
    inputSchema: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: 'Filter zones by space ID. Defaults to scoped space if active.' },
      },
    },
  },
  {
    name: 'canvas_get_zone',
    description: 'Retrieve detailed information of a specific zone, including its parent zone, child zones, responsibilities, workflow instructions, and stationed agents.',
    inputSchema: {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'ID of the zone' },
      },
      required: ['zone_id'],
    },
  },
  {
    name: 'canvas_create_zone',
    description: 'Create a new department / functional role zone on the canvas. SOP RULE: Size zone to comfortably contain its agents (width >= 40 + count*250px, height >= 270px). Position parent zones physically ABOVE child zones (parent.y + parent.height < child.y) so hierarchy lines flow cleanly downwards without criss-crossing.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Zone name (e.g. "Core Platform Engineering")' },
        roleTitle: { type: 'string', description: 'Station role title (e.g. "Platform Architect")' },
        level: { type: 'number', description: 'Hierarchy level: 0=Executive, 1=Management/Lead, 2=Senior/IC, 3=Specialist (default: 1)' },
        parentZoneId: { type: 'string', description: 'ID of parent zone for hierarchical reporting and task delegation' },
        space_id: { type: 'string', description: 'Space ID this zone belongs to. Defaults to scoped space.' },
        color: { type: 'string', description: 'Hex border/accent color (e.g. "#10b981")' },
        shape: { type: 'string', enum: ['rectangle', 'circle'] },
        width: { type: 'number', description: 'Zone width on canvas (default: 480)' },
        height: { type: 'number', description: 'Zone height on canvas (default: 320)' },
        x: { type: 'number', description: 'X position on canvas' },
        y: { type: 'number', description: 'Y position on canvas' },
        responsibilities: { type: 'string', description: 'Core functional responsibilities of this zone' },
        workflowInstructions: { type: 'string', description: 'Numbered operational SOPs and workflow rules' },
        delegationPolicy: { type: 'string', enum: ['auto', 'down', 'up', 'both', 'peers'], description: 'Delegation policy (default: auto)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'canvas_update_zone',
    description: 'Update an existing zone: change dimensions, move position, adjust parent zone hierarchy, or update responsibilities.',
    inputSchema: {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'ID of the zone to update' },
        name: { type: 'string', description: 'Updated zone name' },
        roleTitle: { type: 'string', description: 'Updated role title' },
        level: { type: 'number', description: 'Updated hierarchy level' },
        parentZoneId: { type: 'string', description: 'Updated parent zone ID' },
        color: { type: 'string', description: 'Updated color hex' },
        shape: { type: 'string', enum: ['rectangle', 'circle'] },
        width: { type: 'number', description: 'Updated width' },
        height: { type: 'number', description: 'Updated height' },
        x: { type: 'number', description: 'Updated X position' },
        y: { type: 'number', description: 'Updated Y position' },
        responsibilities: { type: 'string', description: 'Updated responsibilities' },
        workflowInstructions: { type: 'string', description: 'Updated workflow instructions' },
        delegationPolicy: { type: 'string', enum: ['auto', 'down', 'up', 'both', 'peers'] },
      },
      required: ['zone_id'],
    },
  },
  {
    name: 'canvas_delete_zone',
    description: 'Delete a zone from the canvas. Any child zones are automatically re-parented to preserve organizational hierarchy.',
    inputSchema: {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'ID of the zone to delete' },
      },
      required: ['zone_id'],
    },
  },
  {
    name: 'canvas_batch_reposition_zones',
    description: 'Batch reposition and resize multiple zones at once on the canvas. SOP RULE: Symmetrically align zones into standard 4-tier enterprise topology (Level 0 Boardroom top center, Level 1 Leadership row, Level 2 Core squads under CTO, Level 3 QA/SRE/UI). Never use negative coordinates. Always keep parent zones physically above child squads.',
    inputSchema: {
      type: 'object',
      properties: {
        zones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Zone ID' },
              x: { type: 'number', description: 'New X position' },
              y: { type: 'number', description: 'New Y position' },
              width: { type: 'number', description: 'Optional new width' },
              height: { type: 'number', description: 'Optional new height' },
            },
            required: ['id', 'x', 'y'],
          },
          description: 'Array of zone positions to update',
        },
      },
      required: ['zones'],
    },
  },

  // ── Category 3: Agents & Squad Architecture ──
  {
    name: 'canvas_list_agents',
    description: 'List agents on the canvas, optionally filtered by space, zone, or operational status. Returns role, specialty, model, provider, coordinates, and tools count.',
    inputSchema: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: 'Filter agents belonging to a specific space. Defaults to scoped space if active.' },
        zone_id: { type: 'string', description: 'Filter agents located inside a specific zone' },
        status: { type: 'string', enum: ['idle', 'running', 'scheduled', 'stopped', 'error'], description: 'Filter by current status' },
      },
    },
  },
  {
    name: 'canvas_get_agent',
    description: 'Get complete profile and runtime configuration of an agent: system prompt, model, provider, specialty, cron jobs, attached MCPs, skills, connections, and memory summary.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID to inspect' },
      },
      required: ['agent_id'],
    },
  },
  {
    name: 'canvas_create_agent',
    description: 'Hire / create a new autonomous AI agent on the canvas. SOP RULE: NEVER place agents at identical coordinates (card collision)! When placing in a zone, compute distinct slot pos_x = zone.x + 60 + slotIndex*250 and pos_y = zone.y + 75. Automatically sets up workspace and initializes 10-D memory matrix.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Agent full name (e.g. "Devon Reed, Tech Lead")' },
        role: { type: 'string', description: 'Organizational role (e.g. "Technical Lead")' },
        specialty: { type: 'string', description: 'Technical specialty (e.g. "Distributed Systems & Golang")' },
        description: { type: 'string', description: 'One-line description of duties' },
        model: { type: 'string', description: 'Model identifier (default: "nvidia/nemotron-3.5-lightning-30b-a3b")' },
        provider: { type: 'string', description: 'Provider name (default: "nvidia")' },
        system_prompt: { type: 'string', description: 'Core system prompt instructions' },
        space_id: { type: 'string', description: 'Space ID this agent belongs to. Defaults to scoped space.' },
        zone_id: { type: 'string', description: 'Zone ID to position this agent inside' },
        pos_x: { type: 'number', description: 'Canvas X position (default: 300)' },
        pos_y: { type: 'number', description: 'Canvas Y position (default: 200)' },
        cron_schedule: { type: 'string', description: 'Optional cron schedule (e.g. "0 9 * * 1-5")' },
        cron_enabled: { type: 'boolean', description: 'Enable cron schedule upon creation' },
        working_dir: { type: 'string', description: 'Custom working directory (optional)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'canvas_update_agent',
    description: 'Update an agent profile: adjust role, specialty, description, AI model, provider, system prompt, cron schedule, status, or position.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID to update' },
        name: { type: 'string', description: 'Updated name' },
        role: { type: 'string', description: 'Updated role title' },
        specialty: { type: 'string', description: 'Updated technical specialty' },
        description: { type: 'string', description: 'Updated description' },
        model: { type: 'string', description: 'Updated model' },
        provider: { type: 'string', description: 'Updated provider' },
        system_prompt: { type: 'string', description: 'Updated system prompt' },
        cron_schedule: { type: 'string', description: 'Updated cron schedule' },
        cron_enabled: { type: 'boolean', description: 'Enable/disable cron schedule' },
        pos_x: { type: 'number', description: 'Updated X position' },
        pos_y: { type: 'number', description: 'Updated Y position' },
        status: { type: 'string', enum: ['idle', 'running', 'scheduled', 'stopped'] },
        working_dir: { type: 'string', description: 'Updated working directory' },
      },
      required: ['agent_id'],
    },
  },
  {
    name: 'canvas_delete_agent',
    description: 'Terminate / remove an agent from the canvas. Cleans up database records, memberships, cron jobs, and peer connections.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID to delete' },
      },
      required: ['agent_id'],
    },
  },
  {
    name: 'canvas_move_agent_to_zone',
    description: 'Relocate an agent into a target zone. Automatically computes clean pod coordinates inside the zone and updates space membership.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID to move' },
        zone_id: { type: 'string', description: 'Destination zone ID' },
        slot_index: { type: 'number', description: 'Optional zero-based slot index in the zone grid' },
      },
      required: ['agent_id', 'zone_id'],
    },
  },
  {
    name: 'canvas_reposition_agents',
    description: 'Batch update canvas coordinates for multiple agents. SOP RULE: Ensure every agent has a unique coordinate with minimum 240px-270px horizontal clearance. Never place cards on top of each other.',
    inputSchema: {
      type: 'object',
      properties: {
        agents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Agent ID' },
              pos_x: { type: 'number', description: 'X position' },
              pos_y: { type: 'number', description: 'Y position' },
              space_id: { type: 'string', description: 'Optional new space ID' },
            },
            required: ['id', 'pos_x', 'pos_y'],
          },
          description: 'Array of agent position updates',
        },
      },
      required: ['agents'],
    },
  },

  // ── Category 4: API Keys & Credentials ──
  {
    name: 'canvas_set_api_key',
    description: 'Configure an API key or access token for an AI provider (NVIDIA, Anthropic, OpenAI, Gemini, Groq, OpenRouter, Mistral, Perplexity, Together, DeepSeek) or external tool (GitHub, Slack). Saved securely in database settings and environment.',
    inputSchema: {
      type: 'object',
      properties: {
        provider_or_service: {
          type: 'string',
          description: 'Name of the provider or service (e.g. "nvidia", "anthropic", "openai", "gemini", "groq", "openrouter", "github", or exact env var like "NVIDIA_API_KEY")',
        },
        api_key: {
          type: 'string',
          description: 'Secret API key or token string',
        },
      },
      required: ['provider_or_service', 'api_key'],
    },
  },
  {
    name: 'canvas_get_provider_status',
    description: 'Inspect configured AI provider credentials and check readiness status across models and services without revealing secret key values.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // ── Category 5: 10-Dimension Cognitive Memory Matrix ──
  {
    name: 'canvas_get_agent_memory',
    description: 'Inspect an agent\'s persistent cognitive memory. Reads all 10 dimensions or a specific memory file (facts, semantic, associative, procedural, reflective, prospective, identity, preferences, working, episodic).',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID' },
        dimension: {
          type: 'string',
          enum: ['facts', 'semantic', 'associative', 'procedural', 'reflective', 'prospective', 'identity', 'preferences', 'working', 'episodic'],
          description: 'Specific memory dimension to read. If omitted, returns an overview of all 10 files with summaries and sizes.',
        },
      },
      required: ['agent_id'],
    },
  },
  {
    name: 'canvas_update_agent_memory',
    description: 'Write, replace, or append verified knowledge, architecture, procedural recipes, or reflections to an agent\'s cognitive memory file.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID' },
        dimension: {
          type: 'string',
          enum: ['facts', 'semantic', 'associative', 'procedural', 'reflective', 'prospective', 'identity', 'preferences', 'working', 'episodic'],
          description: 'Target memory dimension file to modify',
        },
        content: { type: 'string', description: 'Markdown content to write or append' },
        mode: { type: 'string', enum: ['replace', 'append'], description: 'Write mode: "append" adds to the end of the file, "replace" overwrites the entire file. Defaults to "append".' },
      },
      required: ['agent_id', 'dimension', 'content'],
    },
  },
  {
    name: 'canvas_cascade_memory',
    description: 'Cascade organizational knowledge, ground truth facts, or master procedural runbooks from a leadership agent (e.g. CTO or CEO) down to subordinate squads or all agents in a space.',
    inputSchema: {
      type: 'object',
      properties: {
        source_agent_id: { type: 'string', description: 'Leadership agent ID providing the authoritative memory' },
        target_agent_ids: { type: 'array', items: { type: 'string' }, description: 'Specific target agent IDs to update. If omitted, cascades to all subordinate agents in the space.' },
        space_id: { type: 'string', description: 'Target space ID. Defaults to scoped space.' },
        dimensions: {
          type: 'array',
          items: { type: 'string', enum: ['facts', 'semantic', 'associative', 'procedural', 'reflective', 'prospective', 'identity', 'preferences', 'working', 'episodic'] },
          description: 'Dimensions to cascade (default: ["facts", "procedural"])',
        },
      },
      required: ['source_agent_id'],
    },
  },

  // ── Category 6: Skills & MCPs Attachments ──
  {
    name: 'canvas_list_available_skills',
    description: 'List all stock skills and custom skills available in the Smoke Monkey catalog with category, name, and description.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional skill category filter' },
        search: { type: 'string', description: 'Optional search keyword' },
      },
    },
  },
  {
    name: 'canvas_list_available_mcps',
    description: 'List stock and catalog MCP servers available to be attached to agents (GitHub, Slack, Filesystem, Playwright, Fetch, Database, etc.) with required environment keys.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional category filter' },
        search: { type: 'string', description: 'Optional search keyword' },
      },
    },
  },
  {
    name: 'canvas_attach_skill',
    description: 'Attach a skill from the catalog or author a custom skill on an agent.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID' },
        skill_name: { type: 'string', description: 'Skill name from catalog or custom skill name' },
        description: { type: 'string', description: 'Optional skill description' },
        content: { type: 'string', description: 'Skill markdown workflow content (required for custom skills)' },
      },
      required: ['agent_id', 'skill_name'],
    },
  },
  {
    name: 'canvas_detach_skill',
    description: 'Remove a skill attachment from an agent.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID' },
        skill_name_or_id: { type: 'string', description: 'Skill name or attachment ID' },
      },
      required: ['agent_id', 'skill_name_or_id'],
    },
  },
  {
    name: 'canvas_attach_mcp',
    description: 'Attach an MCP server to an agent with customized environment variables or arguments.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID' },
        mcp_name: { type: 'string', description: 'MCP server name from catalog (e.g. "github-mcp-server", "filesystem-mcp", "playwright-mcp")' },
        label: { type: 'string', description: 'Optional human-readable label' },
        config: { type: 'object', description: 'Optional JSON configuration containing env, command, or args overrides' },
      },
      required: ['agent_id', 'mcp_name'],
    },
  },
  {
    name: 'canvas_detach_mcp',
    description: 'Detach an MCP server from an agent.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID' },
        mcp_name_or_id: { type: 'string', description: 'MCP server name or attachment ID to remove' },
      },
      required: ['agent_id', 'mcp_name_or_id'],
    },
  },

  // ── Category 7: Hierarchy & Reporting Connections ──
  {
    name: 'canvas_list_connections',
    description: 'List active agent-to-agent reporting connections and delegation pathways on the canvas.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Optional agent ID to filter connections for' },
        space_id: { type: 'string', description: 'Optional space ID filter. Defaults to scoped space if active.' },
      },
    },
  },
  {
    name: 'canvas_connect_agents',
    description: 'Create an explicit reporting / collaboration connection between two agents on the canvas.',
    inputSchema: {
      type: 'object',
      properties: {
        source_agent_id: { type: 'string', description: 'Superior / delegating agent ID' },
        target_agent_id: { type: 'string', description: 'Subordinate / receiving agent ID' },
      },
      required: ['source_agent_id', 'target_agent_id'],
    },
  },
  {
    name: 'canvas_disconnect_agents',
    description: 'Remove an explicit reporting / collaboration connection between two agents.',
    inputSchema: {
      type: 'object',
      properties: {
        source_agent_id: { type: 'string', description: 'Source agent ID' },
        target_agent_id: { type: 'string', description: 'Target agent ID' },
        connection_id: { type: 'string', description: 'Optional direct connection record ID' },
      },
    },
  },

  // ── Category 8: Execution, Runs & Tasks ──
  {
    name: 'canvas_run_agent',
    description: 'Trigger an execution run for an agent with a specific task prompt or instruction.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID to execute' },
        prompt: { type: 'string', description: 'Task prompt or instruction' },
      },
      required: ['agent_id', 'prompt'],
    },
  },
  {
    name: 'canvas_stop_agent',
    description: 'Halt / stop an active execution run for an agent.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID to stop' },
      },
      required: ['agent_id'],
    },
  },
  {
    name: 'canvas_delegate_task',
    description: 'Send a delegated task from a superior agent to a subordinate agent with instructions and task title.',
    inputSchema: {
      type: 'object',
      properties: {
        from_agent_id: { type: 'string', description: 'Delegating agent ID' },
        to_agent_id: { type: 'string', description: 'Target agent ID' },
        task_title: { type: 'string', description: 'Short task title' },
        instructions: { type: 'string', description: 'Detailed delegation instructions and expected deliverable' },
      },
      required: ['from_agent_id', 'to_agent_id', 'task_title', 'instructions'],
    },
  },
  // ── Category 10: Canvas Layout & UI Governance ──
  {
    name: 'canvas_audit_ui',
    description: 'Comprehensive UI quality, layout, and collision auditor for Smoke Monkey Canvas. Checks for: overlapping agents (stacked cards), overlapping zones, agents placed outside their designated zones, out-of-bounds elements, orphaned zones, and hierarchy flow inversions. Returns a score (0-100), PASS/FAIL status, itemized issue descriptions, and visual layout metrics. Set auto_fix: true to automatically resolve all layout defects.',
    inputSchema: {
      type: 'object',
      properties: {
        space_id: {
          type: 'string',
          description: 'Optional space ID to audit. Defaults to active scoped space or audits all spaces.',
        },
        auto_fix: {
          type: 'boolean',
          description: 'If true, automatically repairs detected layout defects (relocates agents into neat horizontal rows inside their zones, expands zones if crowded, fixes space bounds, and prunes orphaned zones).',
        },
        min_agent_clearance_x: {
          type: 'number',
          description: 'Minimum required horizontal distance between agent centers in pixels (default: 200).',
        },
        min_agent_clearance_y: {
          type: 'number',
          description: 'Minimum required vertical distance between agent centers in pixels (default: 100).',
        },
      },
    },
  },
  {
    name: 'canvas_check_layout',
    description: 'Alias for canvas_audit_ui. Audits the canvas for overlapping agents, overlapping zones, out-of-zone agents, out-of-bounds elements, and hierarchy flow inversions.',
    inputSchema: {
      type: 'object',
      properties: {
        space_id: {
          type: 'string',
          description: 'Optional space ID to audit.',
        },
        auto_fix: {
          type: 'boolean',
          description: 'If true, automatically repairs detected layout defects.',
        },
      },
    },
  },
  {
    name: 'canvas_get_explore_report',
    description: 'Retrieve the project exploration report for a company space. Returns features, folder ownership, zone plan, and tech stack. Use this to route tasks to the correct feature agent.',
    inputSchema: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: 'Company space ID' },
        query_type: {
          type: 'string',
          enum: ['summary', 'features', 'folder_map', 'full'],
          description: 'What to retrieve: summary (overview), features (feature list), folder_map (find owner of path), full',
        },
        folder_path: { type: 'string', description: 'For folder_map — find feature owner of this path' },
      },
    },
  },
];

// ── MCP Server Protocol Implementation ──────────────────────────────────────
export class CanvasMcpServer {
  private static instance: CanvasMcpServer | null = null;
  private rl?: readline.Interface;

  constructor() {}

  static getInstance(): CanvasMcpServer {
    if (!CanvasMcpServer.instance) {
      CanvasMcpServer.instance = new CanvasMcpServer();
    }
    return CanvasMcpServer.instance;
  }

  start(): void {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
      });
    }
    this.rl.on('line', async (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let msg: { id?: string | number | null; method?: string; params?: Record<string, any> };
      try {
        msg = JSON.parse(trimmed);
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;
      if (msg.id == null) {
        // Notification
        if (msg.method === 'notifications/initialized') {
          logErr('Received notifications/initialized');
        }
        return;
      }

      const respond = (payload: Record<string, unknown>) => {
        const out = JSON.stringify({ jsonrpc: '2.0', id: msg.id, ...payload });
        process.stdout.write(out + '\n');
      };

      try {
        switch (msg.method) {
          case 'initialize': {
            respond({
              result: {
                protocolVersion: msg.params?.protocolVersion ?? '2024-11-05',
                capabilities: { tools: {}, resources: {}, prompts: {} },
                serverInfo: {
                  name: 'smoke-monkey-canvas',
                  version: '1.3.2',
                  description: 'Smoke Monkey Canvas Multi-Agent Spatial Workspace MCP Server',
                },
                instructions: CANVAS_MCP_SOP,
              },
            });
            break;
          }

          case 'ping': {
            respond({ result: {} });
            break;
          }

          case 'prompts/list': {
            respond({
              result: {
                prompts: [
                  {
                    name: 'spatial_canvas_layout_sop',
                    description: 'Standard Operating Procedure (SOP) for spatial canvas layout, non-overlapping agent placement, zone sizing, and hierarchical flow.',
                    arguments: [],
                  },
                  {
                    name: 'enterprise_company_scaffold_sop',
                    description: 'Standard Operating Procedure (SOP) for architecting a multi-agent company or department with proper zones and leadership lines.',
                    arguments: [
                      {
                        name: 'company_name',
                        description: 'Name of the company or department to architect',
                        required: false,
                      },
                    ],
                  },
                ],
              },
            });
            break;
          }

          case 'prompts/get': {
            const promptName = String(msg.params?.name || '');
            if (promptName === 'spatial_canvas_layout_sop') {
              respond({
                result: {
                  description: 'Standard Operating Procedure (SOP) for spatial canvas layout, non-overlapping agent placement, and hierarchical flow.',
                  messages: [
                    {
                      role: 'user',
                      content: {
                        type: 'text',
                        text: CANVAS_MCP_SOP,
                      },
                    },
                  ],
                },
              });
            } else if (promptName === 'enterprise_company_scaffold_sop') {
              const comp = msg.params?.arguments?.company_name || 'Enterprise Organization';
              respond({
                result: {
                  description: `Standard Operating Procedure for scaffolding ${comp}`,
                  messages: [
                    {
                      role: 'user',
                      content: {
                        type: 'text',
                        text: `${CANVAS_MCP_SOP}\n\n### Application to ${comp}:\nApply the 4-tier symmetrical topology when creating zones and hiring agents for ${comp}. Ensure minimum 250px horizontal clearance between agent pods and zero coordinate overlap.`,
                      },
                    },
                  ],
                },
              });
            } else {
              respond({
                error: {
                  code: -32602,
                  message: `Unknown prompt: ${promptName}`,
                },
              });
            }
            break;
          }

          case 'tools/list': {
            respond({ result: { tools: CANVAS_TOOL_DEFINITIONS } });
            break;
          }

          case 'resources/list': {
            respond({
              result: {
                resources: [
                  {
                    uri: 'canvas://spaces',
                    name: 'Canvas Spaces',
                    description: 'All registered workspace spaces and companies on canvas',
                    mimeType: 'application/json',
                  },
                  {
                    uri: 'canvas://zones',
                    name: 'Canvas Zones',
                    description: 'All department and functional role zones on canvas',
                    mimeType: 'application/json',
                  },
                  {
                    uri: 'canvas://agents',
                    name: 'Canvas Agents',
                    description: 'All active agents across canvas spaces',
                    mimeType: 'application/json',
                  },
                  {
                    uri: 'canvas://status',
                    name: 'Canvas System Status',
                    description: 'Summary counts and health status of the canvas system',
                    mimeType: 'application/json',
                  },
                ],
              },
            });
            break;
          }

          case 'resources/read': {
            const uri = String(msg.params?.uri || '');
            let contentsText = '{}';
            if (uri === 'canvas://spaces') {
              contentsText = JSON.stringify(spaceDb.getWorkspaceSpaces(), null, 2);
            } else if (uri === 'canvas://zones') {
              contentsText = JSON.stringify(spaceDb.getZones(configuredSpaceId), null, 2);
            } else if (uri === 'canvas://agents') {
              contentsText = JSON.stringify(agentDb.getAllAgents(), null, 2);
            } else if (uri === 'canvas://status') {
              const spaces = spaceDb.getWorkspaceSpaces();
              const zones = spaceDb.getZones(configuredSpaceId);
              const agents = agentDb.getAllAgents();
              contentsText = JSON.stringify(
                {
                  scopedSpaceId: configuredSpaceId,
                  totalSpaces: spaces.length,
                  totalZones: zones.length,
                  totalAgents: agents.length,
                  activeAgents: agents.filter((a) => a.status === 'running').length,
                  idleAgents: agents.filter((a) => a.status === 'idle').length,
                  scheduledAgents: agents.filter((a) => a.status === 'scheduled').length,
                },
                null,
                2,
              );
            }
            respond({
              result: {
                contents: [{ uri, mimeType: 'application/json', text: contentsText }],
              },
            });
            break;
          }

          case 'tools/call': {
            const toolName = msg.params?.name;
            const args = msg.params?.arguments || {};
            const result = await this.executeTool(toolName, args);
            respond({ result });
            break;
          }

          default: {
            respond({
              error: { code: -32601, message: `Method not found: ${msg.method}` },
            });
          }
        }
      } catch (err: unknown) {
        const msgText = err instanceof Error ? err.message : String(err);
        logErr(`Error handling ${msg.method}:`, msgText);
        respond({
          result: {
            content: [{ type: 'text', text: `Error: ${msgText}` }],
            isError: true,
          },
        });
      }
    });
  }

  public async executeTool(name: string, args: Record<string, any>): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
    try {
      switch (name) {
        // ── Category 1: Spaces & Companies ────────────────────────────────
        case 'canvas_list_spaces': {
          const search = typeof args.search === 'string' ? args.search.toLowerCase() : null;
          const spaces = spaceDb.getWorkspaceSpaces();
          const allAgents = agentDb.getAllAgents();
          const memberships = coreDb.db.prepare('SELECT space_id, agent_id FROM space_agent_memberships').all() as Array<{ space_id: string; agent_id: string }>;
          const agentsBySpace = new Map<string, number>();
          for (const m of memberships) {
            agentsBySpace.set(m.space_id, (agentsBySpace.get(m.space_id) || 0) + 1);
          }

          const filtered = spaces.filter((s) => {
            if (!search) return true;
            return (
              (s.name && s.name.toLowerCase().includes(search)) ||
              (s.description && s.description.toLowerCase().includes(search)) ||
              (s.roleTitle && s.roleTitle.toLowerCase().includes(search))
            );
          });

          const summary = filtered.map((s) => ({
            id: s.id,
            name: s.name,
            roleTitle: s.roleTitle,
            description: s.description,
            color: s.color,
            shape: s.shape,
            level: s.level,
            bounds: { x: s.x, y: s.y, width: s.width, height: s.height },
            delegationPolicy: s.delegationPolicy,
            agentCount: agentsBySpace.get(s.id) || 0,
            hasWorkflowPrompt: Boolean(s.workflowPrompt),
          }));

          return {
            content: [{
              type: 'text',
              text: `Registered Spaces (${filtered.length}):\n${JSON.stringify(summary, null, 2)}`,
            }],
          };
        }

        case 'canvas_get_space': {
          const spaceId = resolveSpace(args.space_id);
          if (!spaceId) {
            return {
              content: [{ type: 'text', text: 'Error: No space_id specified and no default space is configured.' }],
              isError: true,
            };
          }
          const space = spaceDb.getWorkspaceSpace(spaceId);
          if (!space) {
            return {
              content: [{ type: 'text', text: `Error: Space "${spaceId}" not found.` }],
              isError: true,
            };
          }
          const zones = spaceDb.getZones(spaceId);
          const prompt = spaceDb.getWorkspacePrompt(spaceId);
          const memberAgentIds = spaceDb.getSpaceAgentIds(spaceId);
          const agents = agentDb.getAllAgents().filter((a) => memberAgentIds.includes(a.id));

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(
                {
                  space,
                  workspacePrompt: prompt.prompt || space.workflowPrompt || '',
                  zonesCount: zones.length,
                  zones: zones.map((z) => ({ id: z.id, name: z.name, roleTitle: z.roleTitle, level: z.level, parentZoneId: z.parentZoneId })),
                  agentsCount: agents.length,
                  agents: agents.map((a) => ({ id: a.id, name: a.name, role: a.role, specialty: a.specialty, status: a.status })),
                },
                null,
                2,
              ),
            }],
          };
        }

        case 'canvas_create_space': {
          if (configuredSpaceId) {
            return {
              content: [{ type: 'text', text: `Access denied: Space-scoped agent restricted to space "${configuredSpaceId}" cannot create new spaces.` }],
              isError: true,
            };
          }
          const created = spaceDb.createWorkspaceSpace({
            name: args.name,
            description: args.description,
            roleTitle: args.roleTitle,
            color: args.color,
            shape: args.shape,
            width: args.width,
            height: args.height,
            x: args.x,
            y: args.y,
            workflowPrompt: args.workflowPrompt,
            workflowInstructions: args.workflowInstructions,
            responsibilities: args.responsibilities,
            delegationPolicy: args.delegationPolicy,
          });

          if (args.workflowPrompt) {
            spaceDb.saveWorkspacePrompt(created.id, created.name, args.workflowPrompt);
          }

          return {
            content: [{
              type: 'text',
              text: `Created Office Space successfully:\n${JSON.stringify(created, null, 2)}`,
            }],
          };
        }

        case 'canvas_update_space': {
          const spaceId = resolveSpace(args.space_id);
          if (!spaceId) {
            return {
              content: [{ type: 'text', text: 'Error: No space_id specified.' }],
              isError: true,
            };
          }
          const patch: Record<string, unknown> = {};
          if (args.name !== undefined) patch.name = args.name;
          if (args.description !== undefined) patch.description = args.description;
          if (args.roleTitle !== undefined) patch.roleTitle = args.roleTitle;
          if (args.color !== undefined) patch.color = args.color;
          if (args.shape !== undefined) patch.shape = args.shape;
          if (args.width !== undefined) patch.width = args.width;
          if (args.height !== undefined) patch.height = args.height;
          if (args.x !== undefined) patch.x = args.x;
          if (args.y !== undefined) patch.y = args.y;
          if (args.workflowPrompt !== undefined) patch.workflowPrompt = args.workflowPrompt;
          if (args.workflowInstructions !== undefined) patch.workflowInstructions = args.workflowInstructions;
          if (args.responsibilities !== undefined) patch.responsibilities = args.responsibilities;
          if (args.delegationPolicy !== undefined) patch.delegationPolicy = args.delegationPolicy;

          const updated = spaceDb.updateWorkspaceSpace(spaceId, patch);
          if (!updated) {
            return {
              content: [{ type: 'text', text: `Error: Space "${spaceId}" not found.` }],
              isError: true,
            };
          }
          if (args.workflowPrompt !== undefined) {
            spaceDb.saveWorkspacePrompt(spaceId, updated.name, args.workflowPrompt);
          }

          return {
            content: [{
              type: 'text',
              text: `Updated Office Space successfully:\n${JSON.stringify(updated, null, 2)}`,
            }],
          };
        }

        case 'canvas_delete_space': {
          if (configuredSpaceId) {
            return {
              content: [{ type: 'text', text: `Access denied: Space-scoped agent restricted to space "${configuredSpaceId}" cannot delete spaces.` }],
              isError: true,
            };
          }
          const spaceId = args.space_id;
          if (!spaceId) {
            return { content: [{ type: 'text', text: 'Error: space_id is required.' }], isError: true };
          }
          const deleteContainedZones = Boolean(args.delete_contained_zones);
          const deletedZonesCount = deleteContainedZones ? spaceDb.getZones(spaceId).length : 0;
          const ok = spaceDb.deleteWorkspaceSpace(spaceId, { deleteZones: deleteContainedZones });
          return {
            content: [{
              type: 'text',
              text: ok
                ? `Deleted Space "${spaceId}" successfully. Unassigned member agents. ${deleteContainedZones ? `Deleted ${deletedZonesCount} contained zones.` : 'Contained zones were detached from the space.'}`
                : `Space "${spaceId}" was not found or could not be deleted.`,
            }],
          };
        }

        case 'canvas_list_company_presets': {
          const presets = COMPANY_PRESETS.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            description: p.description,
            color: p.color,
            scales: Object.keys(p.scales),
            leadershipChain: p.scales.mid?.zones.find((z) => z.level === 0)?.name,
          }));

          return {
            content: [{
              type: 'text',
              text: `Available Company Presets (${presets.length}):\n${JSON.stringify(presets, null, 2)}`,
            }],
          };
        }

        case 'canvas_deploy_company_preset': {
          const presetId = args.preset_id?.trim();
          const scaleKey: CompanyScale = (args.scale as CompanyScale) || 'mid';
          const preset = COMPANY_PRESETS.find((p) => p.id === presetId || p.name.toLowerCase().includes(presetId.toLowerCase()));
          if (!preset) {
            return {
              content: [{ type: 'text', text: `Error: Company preset "${presetId}" not found. Call canvas_list_company_presets to view options.` }],
              isError: true,
            };
          }

          const scaleConfig = preset.scales[scaleKey] || preset.scales.mid;
          const originX = typeof args.origin_x === 'number' ? args.origin_x : 0;
          const originY = typeof args.origin_y === 'number' ? args.origin_y : 0;

          // 1. Compute dynamic company layout
          const layout = layoutCompany(preset, scaleKey, { x: originX, y: originY });

          // 2. Create the unified Office Space on canvas
          const spaceName = args.space_name?.trim() || scaleConfig.space.name;
          const createdSpace = spaceDb.createWorkspaceSpace({
            name: spaceName,
            description: scaleConfig.space.description,
            workflowPrompt: layout.space.workflowPrompt || scaleConfig.space.workflowPrompt,
            workflowInstructions: layout.space.workflowInstructions || scaleConfig.space.workflowInstructions,
            responsibilities: layout.space.responsibilities || scaleConfig.space.responsibilities,
            delegationPolicy: scaleConfig.space.delegationPolicy || 'auto',
            x: originX,
            y: originY,
            width: layout.requiredWidth,
            height: layout.requiredHeight,
            color: scaleConfig.space.color,
            shape: 'rectangle',
          });

          // Save space prompt
          const completeWf = [
            createdSpace.workflowPrompt || '',
            createdSpace.workflowInstructions ? `\n${createdSpace.workflowInstructions}` : '',
            createdSpace.responsibilities ? `\n### ORGANIZATIONAL RESPONSIBILITIES:\n${createdSpace.responsibilities}` : '',
          ].filter(Boolean).join('\n');
          if (completeWf) {
            spaceDb.saveWorkspacePrompt(createdSpace.id, createdSpace.name, completeWf);
          }

          // 3. Create all zones
          const zoneInputs = layout.zones.map((zone) => ({
            id: zone.id,
            name: zone.name,
            roleTitle: zone.roleTitle,
            level: zone.level,
            parentZoneId: zone.parentZoneId,
            spaceId: createdSpace.id,
            color: zone.color,
            shape: zone.shape || 'rectangle',
            width: zone.width,
            height: zone.height,
            x: zone.x,
            y: zone.y,
            responsibilities: zone.responsibilities,
            workflowInstructions: zone.workflowInstructions,
            delegationPolicy: zone.delegationPolicy || 'auto',
          }));
          spaceDb.createZonesBatch(zoneInputs);

          // 4. Create agents and establish memberships
          const templateMap = new Map<string, AgentTemplate>();
          for (const t of ENTERPRISE_AGENT_TEMPLATES) {
            templateMap.set(t.id, t);
          }

          const createdAgents: Array<{ id: string; name: string; role: string; zoneId: string }> = [];
          for (const pa of layout.agents) {
            const tmpl =
              templateMap.get(pa.agentTemplateId) ||
              ENTERPRISE_AGENT_TEMPLATES.find(
                (t) => (pa.agentName && t.name.toLowerCase() === pa.agentName.toLowerCase()) || t.role === pa.roleTitle,
              ) ||
              ENTERPRISE_AGENT_TEMPLATES[0];

            const agentId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const agentName = pa.agentName || pa.roleTitle || tmpl?.name || 'Specialist';
            const agentRole = pa.roleTitle || tmpl?.role || 'Team Member';
            const agentModel = tmpl?.default_model || 'nvidia/nemotron-3.5-lightning-30b-a3b';
            const agentProvider = tmpl?.provider || 'nvidia';
            const agentPrompt = tmpl?.system_prompt || `You are an autonomous specialist at ${spaceName}. Complete assigned tasks efficiently with the tools and MCPs available.`;

            // Insert into agents table
            const agent = agentDb.createAgent({
              id: agentId,
              name: agentName,
              model: agentModel,
              provider: agentProvider,
              system_prompt: agentPrompt,
              cron_schedule: tmpl?.suggested_cron ?? null,
              cron_enabled: tmpl?.suggested_cron ? 1 : 0,
              pos_x: pa.x,
              pos_y: pa.y,
              status: 'idle',
              role: agentRole,
              specialty: tmpl?.specialty ?? null,
              description: tmpl?.description ?? null,
              last_run_at: null,
              next_run_at: null,
            });

            // Assign space membership
            spaceDb.setAgentSpace(agentId, createdSpace.id);

            // Ensure workspace and initialize 10-dimension memory
            try {
              const ws = resolveAgentWorkspace(agent);
              ensureAgentWorkspace(ws, agent.id, agent.name, agent.system_prompt);
            } catch (err) {
              logErr(`Could not ensure workspace for agent ${agentId}:`, err);
            }

            // Attach recommended MCPs if specified
            if (Array.isArray(tmpl?.recommended_mcps)) {
              for (const mcpName of tmpl.recommended_mcps) {
                try {
                  agentDb.addAgentMcp({
                    id: `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    agent_id: agentId,
                    mcp_name: mcpName,
                    label: mcpName,
                    config_json: '{}',
                    enabled: 1,
                  });
                } catch {}
              }
            }

            // Attach recommended skills if specified
            if (Array.isArray(tmpl?.recommended_skills)) {
              for (const skillName of tmpl.recommended_skills) {
                try {
                  agentDb.addAgentSkill({
                    id: `skill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    agent_id: agentId,
                    skill_name: skillName,
                    description: null,
                    content: `# ${skillName}\nOperational instructions and workflows.`,
                    enabled: 1,
                  });
                } catch {}
              }
            }

            createdAgents.push({ id: agentId, name: agentName, role: agentRole, zoneId: pa.zoneId });
          }

          return {
            content: [{
              type: 'text',
              text: `Successfully deployed company preset "${preset.name}" (${scaleKey.toUpperCase()} scale)!\n` +
                `Office Space: "${createdSpace.name}" (ID: ${createdSpace.id})\n` +
                `Zones created: ${zoneInputs.length}\n` +
                `Agents deployed: ${createdAgents.length}\n` +
                `Details:\n${JSON.stringify({ spaceId: createdSpace.id, zonesCount: zoneInputs.length, agentsCount: createdAgents.length, agents: createdAgents }, null, 2)}`,
            }],
          };
        }

        // ── Category 2: Role & Department Zones ───────────────────────────
        case 'canvas_list_zones': {
          const spaceId = resolveSpace(args.space_id);
          const zones = spaceDb.getZones(spaceId);
          const allAgents = agentDb.getAllAgents();
          const list = zones.map((z) => {
            const stationed = allAgents.filter(
              (a) =>
                a.pos_x >= z.x - 30 &&
                a.pos_x <= z.x + z.width + 30 &&
                a.pos_y >= z.y - 30 &&
                a.pos_y <= z.y + z.height + 30,
            );
            return {
              id: z.id,
              name: z.name,
              roleTitle: z.roleTitle,
              level: z.level,
              parentZoneId: z.parentZoneId,
              spaceId: z.spaceId,
              color: z.color,
              shape: z.shape,
              dimensions: { x: z.x, y: z.y, width: z.width, height: z.height },
              responsibilities: z.responsibilities,
              delegationPolicy: z.delegationPolicy,
              stationedAgentsCount: stationed.length,
              stationedAgents: stationed.map((a) => ({ id: a.id, name: a.name, role: a.role })),
            };
          });

          return {
            content: [{
              type: 'text',
              text: `Role Zones (${list.length}):\n${JSON.stringify(list, null, 2)}`,
            }],
          };
        }

        case 'canvas_get_zone': {
          const zoneId = args.zone_id;
          if (!zoneId) {
            return { content: [{ type: 'text', text: 'Error: zone_id is required.' }], isError: true };
          }
          assertZoneInScope(zoneId);
          const zone = spaceDb.getZone(zoneId);
          if (!zone) {
            return { content: [{ type: 'text', text: `Error: Zone "${zoneId}" not found.` }], isError: true };
          }
          const allZones = spaceDb.getZones();
          const parent = zone.parentZoneId ? allZones.find((z) => z.id === zone.parentZoneId) : null;
          const children = allZones.filter((z) => z.parentZoneId === zone.id);
          const allAgents = agentDb.getAllAgents();
          const stationed = allAgents.filter(
            (a) =>
              a.pos_x >= zone.x - 30 &&
              a.pos_x <= zone.x + zone.width + 30 &&
              a.pos_y >= zone.y - 30 &&
              a.pos_y <= zone.y + zone.height + 30,
          );

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(
                {
                  zone,
                  parentZone: parent ? { id: parent.id, name: parent.name, roleTitle: parent.roleTitle } : null,
                  childZones: children.map((c) => ({ id: c.id, name: c.name, roleTitle: c.roleTitle, level: c.level })),
                  stationedAgents: stationed.map((a) => ({ id: a.id, name: a.name, role: a.role, specialty: a.specialty })),
                },
                null,
                2,
              ),
            }],
          };
        }

        case 'canvas_create_zone': {
          let spaceId = resolveSpace(args.space_id);
          if (!spaceId && args.parentZoneId) {
            const parent = spaceDb.getZone(args.parentZoneId);
            if (parent?.spaceId) spaceId = parent.spaceId;
          }
          if (!spaceId) {
            const allSpaces = spaceDb.getWorkspaceSpaces();
            if (allSpaces.length > 0) spaceId = allSpaces[0].id;
          }

          const existingZones = spaceId ? spaceDb.getZones(spaceId) : spaceDb.getZones();

          // 1. Duplicate Zone Prevention: Check if zone with same name already exists in this space
          const existingMatch = existingZones.find((z) => z.name.trim().toLowerCase() === String(args.name || '').trim().toLowerCase());
          if (existingMatch && !args.allow_duplicate) {
            return {
              content: [{
                type: 'text',
                text: `Zone "${existingMatch.name}" already exists in this space (ID: "${existingMatch.id}"). Reusing existing department zone to prevent duplicate overlapping zones:\n${JSON.stringify(existingMatch, null, 2)}`,
              }],
            };
          }

          let width = Number.isFinite(args.width) && args.width > 0 ? Number(args.width) : 600;
          let height = Number.isFinite(args.height) && args.height > 0 ? Number(args.height) : 280;

          // Determine tier level
          let level = typeof args.level === 'number' && Number.isFinite(args.level) ? Number(args.level) : -1;
          if (level < 0 && args.parentZoneId) {
            const parent = spaceDb.getZone(args.parentZoneId);
            if (parent) level = (parent.level ?? 0) + 1;
          }
          if (level < 0) {
            const lowerName = (args.name || '').toLowerCase();
            if (lowerName.includes('board') || lowerName.includes('executive') || lowerName.includes('c-suite') || lowerName.includes('ceo') || lowerName.includes('strategy')) {
              level = 0;
            } else if (lowerName.includes('cto') || lowerName.includes('ciso') || lowerName.includes('cpo') || lowerName.includes('vp') || lowerName.includes('director') || lowerName.includes('leadership')) {
              level = 1;
            } else if (lowerName.includes('squad') || lowerName.includes('engine') || lowerName.includes('microservices') || lowerName.includes('platform') || lowerName.includes('team')) {
              level = 2;
            } else if (lowerName.includes('qa') || lowerName.includes('fuzzing') || lowerName.includes('sre') || lowerName.includes('cloud') || lowerName.includes('observability') || lowerName.includes('ui') || lowerName.includes('console')) {
              level = 3;
            } else {
              level = 2;
            }
          }
          level = Math.max(0, Math.min(4, Math.floor(level)));

          const tierYMap: Record<number, number> = { 0: 80, 1: 440, 2: 800, 3: 1160, 4: 1520 };
          const tierY = tierYMap[level] ?? (80 + level * 360);

          let targetX = Number.isFinite(args.x) ? Number(args.x) : null;
          let targetY = Number.isFinite(args.y) ? Number(args.y) : tierY;
          let layoutNotice: string | null = null;

          // Check if candidate bounding box collides with any existing zone (buffer 80px horizontal, 60px vertical)
          const doesRectCollide = (cx: number, cy: number, cw: number, ch: number, bufferX = 80, bufferY = 60) => {
            return existingZones.find((ez) => {
              const noOverlap =
                cx + cw + bufferX <= ez.x ||
                cx >= ez.x + ez.width + bufferX ||
                cy + ch + bufferY <= ez.y ||
                cy >= ez.y + ez.height + bufferY;
              return !noOverlap;
            });
          };

          // Find zones on this tier
          const tierZones = existingZones
            .filter((z) => Math.abs(z.y - tierY) < 180 || z.level === level)
            .sort((a, b) => a.x - b.x);

          if (targetX === null) {
            targetY = tierY;
            if (tierZones.length === 0) {
              targetX = level === 0 ? 2750 : 100;
            } else {
              const rightmost = tierZones[tierZones.length - 1];
              targetX = Math.round(rightmost.x + rightmost.width + 100);
            }
          } else {
            // Check collision with ANY existing zone
            const collides = doesRectCollide(targetX, targetY, width, height);
            if (collides) {
              const rightmost = tierZones.length > 0 ? tierZones[tierZones.length - 1] : null;
              const safeX = rightmost ? Math.round(rightmost.x + rightmost.width + 100) : 100;
              layoutNotice = `[Auto-Layout Safety] Provided coordinates (${targetX}, ${targetY}) overlapped with existing zone "${collides.name}". Automatically repositioned to non-overlapping slot at (${safeX}, ${tierY}) with 100px clearance.`;
              targetX = safeX;
              targetY = tierY;
            }
          }

          // Expand parent space bounds if necessary
          if (spaceId) {
            const space = spaceDb.getWorkspaceSpace(spaceId);
            if (space) {
              const neededW = Math.max(space.width, targetX + width + 240);
              const neededH = Math.max(space.height, targetY + height + 240);
              if (neededW > space.width || neededH > space.height) {
                spaceDb.updateWorkspaceSpace(spaceId, { width: neededW, height: neededH });
                void callCanvasApi(`/api/space/spaces/${spaceId}`, 'PATCH', { width: neededW, height: neededH });
              }
            }
          }

          const zone = spaceDb.createZone({
            name: args.name,
            roleTitle: args.roleTitle,
            level,
            parentZoneId: args.parentZoneId,
            spaceId: spaceId || undefined,
            color: args.color,
            shape: args.shape,
            width,
            height,
            x: targetX,
            y: targetY,
            responsibilities: args.responsibilities,
            workflowInstructions: args.workflowInstructions,
            delegationPolicy: args.delegationPolicy,
          });

          // Broadcast to running Web UI
          void callCanvasApi(`/api/space/zones/${zone.id}`, 'PATCH', {
            x: targetX,
            y: targetY,
            width,
            height,
            level,
            spaceId,
          });

          return {
            content: [{
              type: 'text',
              text: `Created Zone successfully:\n${JSON.stringify(zone, null, 2)}${layoutNotice ? `\n\n⚠️ ${layoutNotice}` : ''}`,
            }],
          };
        }

        case 'canvas_update_zone': {
          const zoneId = args.zone_id;
          if (!zoneId) {
            return { content: [{ type: 'text', text: 'Error: zone_id is required.' }], isError: true };
          }
          assertZoneInScope(zoneId);
          const patch: Record<string, unknown> = {};
          if (args.name !== undefined) patch.name = args.name;
          if (args.roleTitle !== undefined) patch.roleTitle = args.roleTitle;
          if (args.level !== undefined) patch.level = args.level;
          if (args.parentZoneId !== undefined) patch.parentZoneId = args.parentZoneId;
          if (args.color !== undefined) patch.color = args.color;
          if (args.shape !== undefined) patch.shape = args.shape;
          if (args.width !== undefined) patch.width = args.width;
          if (args.height !== undefined) patch.height = args.height;
          if (args.x !== undefined) patch.x = args.x;
          if (args.y !== undefined) patch.y = args.y;
          if (args.responsibilities !== undefined) patch.responsibilities = args.responsibilities;
          if (args.workflowInstructions !== undefined) patch.workflowInstructions = args.workflowInstructions;
          if (args.delegationPolicy !== undefined) patch.delegationPolicy = args.delegationPolicy;

          const updated = spaceDb.updateZone(zoneId, patch);

          if (!updated) {
            return { content: [{ type: 'text', text: `Error: Zone "${zoneId}" not found.` }], isError: true };
          }

          // Broadcast to Web UI
          void callCanvasApi(`/api/space/zones/${zoneId}`, 'PATCH', patch);

          // If position or width changed, enforce non-overlapping clearance for all sibling zones
          if (patch.x !== undefined || patch.width !== undefined || patch.y !== undefined) {
            const spaceId = updated.spaceId || resolveSpace();
            if (spaceId) {
              const allZones = spaceDb.getZones(spaceId);
              const allAgents = agentDb.getAllAgents();
              const siblingZones = allZones
                .filter((sz) => sz.id !== updated.id && Math.abs(sz.y - updated.y) < 180 && sz.x > updated.x)
                .sort((a, b) => a.x - b.x);

              let prevRight = updated.x + updated.width;
              for (const sz of siblingZones) {
                if (sz.x < prevRight + 100) {
                  const newX = prevRight + 100;
                  const shiftX = newX - sz.x;
                  spaceDb.updateZone(sz.id, { x: newX });
                  void callCanvasApi(`/api/space/zones/${sz.id}`, 'PATCH', { x: newX });

                  const contained = allAgents.filter(
                    (ca) => ca.pos_x >= sz.x - 20 && ca.pos_x <= sz.x + sz.width + 20 && Math.abs(ca.pos_y - sz.y) < 200
                  );
                  for (const ca of contained) {
                    const newPosX = ca.pos_x + shiftX;
                    agentDb.updateAgent(ca.id, { pos_x: newPosX });
                    spaceDb.updateNodePosition(ca.id, newPosX, ca.pos_y, spaceId);
                    ca.pos_x = newPosX;
                  }
                  prevRight = newX + sz.width;
                } else {
                  prevRight = sz.x + sz.width;
                }
              }
            }
          }

          return {
            content: [{
              type: 'text',
              text: `Updated Zone successfully:\n${JSON.stringify(updated, null, 2)}`,
            }],
          };
        }

        case 'canvas_delete_zone': {
          const zoneId = args.zone_id;
          if (!zoneId) {
            return { content: [{ type: 'text', text: 'Error: zone_id is required.' }], isError: true };
          }
          assertZoneInScope(zoneId);
          const ok = spaceDb.deleteZone(zoneId);
          return {
            content: [{
              type: 'text',
              text: ok
                ? `Deleted Zone "${zoneId}" successfully. Any descendant zones have been re-parented.`
                : `Zone "${zoneId}" not found.`,
            }],
          };
        }

        case 'canvas_batch_reposition_zones': {
          const zones = Array.isArray(args.zones) ? args.zones : [];
          let updatedCount = 0;
          for (const item of zones) {
            if (!item.id || typeof item.x !== 'number' || typeof item.y !== 'number') continue;
            const patch = {
              x: item.x,
              y: item.y,
              ...(typeof item.width === 'number' ? { width: item.width } : {}),
              ...(typeof item.height === 'number' ? { height: item.height } : {}),
            };
            spaceDb.updateZone(item.id, patch);
            await callCanvasApi(`/api/space/zones/${item.id}`, 'PATCH', patch).catch(() => {});
            updatedCount++;
          }

          return {
            content: [{
              type: 'text',
              text: `Repositioned ${updatedCount} zones on the canvas.`,
            }],
          };
        }

        // ── Category 3: Agents & Squad Architecture ───────────────────────
        case 'canvas_list_agents': {
          const spaceId = resolveSpace(args.space_id);
          const zoneId = args.zone_id?.trim();
          const status = args.status?.trim();

          let agents = agentDb.getAllAgents();
          if (spaceId) {
            const memberIds = new Set(spaceDb.getSpaceAgentIds(spaceId));
            agents = agents.filter((a) => memberIds.has(a.id));
          }

          if (zoneId) {
            const zone = spaceDb.getZone(zoneId);
            if (zone) {
              agents = agents.filter(
                (a) =>
                  a.pos_x >= zone.x - 30 &&
                  a.pos_x <= zone.x + zone.width + 30 &&
                  a.pos_y >= zone.y - 30 &&
                  a.pos_y <= zone.y + zone.height + 30,
              );
            }
          }

          if (status) {
            agents = agents.filter((a) => a.status === status);
          }

          const zones = spaceId ? spaceDb.getZones(spaceId) : spaceDb.getZones();
          const list = agents.map((a) => {
            const zone = zones.find(
              (z) =>
                a.pos_x >= z.x - 30 &&
                a.pos_x <= z.x + z.width + 30 &&
                a.pos_y >= z.y - 30 &&
                a.pos_y <= z.y + z.height + 30,
            );
            const mcps = agentDb.getAgentMcps(a.id);
            const skills = agentDb.getAgentSkills(a.id);

            return {
              id: a.id,
              name: a.name,
              role: a.role,
              specialty: a.specialty,
              description: a.description,
              model: a.model,
              provider: a.provider,
              status: a.status,
              zone: zone ? { id: zone.id, name: zone.name, roleTitle: zone.roleTitle } : null,
              position: { x: a.pos_x, y: a.pos_y },
              enabledMcpsCount: mcps.filter((m) => m.enabled === 1).length,
              enabledSkillsCount: skills.filter((s) => s.enabled === 1).length,
              cronSchedule: a.cron_schedule,
              cronEnabled: Boolean(a.cron_enabled),
            };
          });

          return {
            content: [{
              type: 'text',
              text: `Agents (${list.length}):\n${JSON.stringify(list, null, 2)}`,
            }],
          };
        }

        case 'canvas_get_agent': {
          const agentId = args.agent_id;
          if (!agentId) {
            return { content: [{ type: 'text', text: 'Error: agent_id is required.' }], isError: true };
          }
          assertAgentInScope(agentId);
          const agent = agentDb.getAgent(agentId);
          if (!agent) {
            return { content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }], isError: true };
          }
          const mcps = agentDb.getAgentMcps(agentId);
          const skills = agentDb.getAgentSkills(agentId);
          const connections = agentDb.getAgentConnections(agentId);
          const spaceId = spaceDb.getAgentSpaceId(agentId);
          const runs = agentDb.getAgentRuns(agentId, 3);

          const zones = spaceDb.getZones();
          const zone = zones.find(
            (z) =>
              agent.pos_x >= z.x - 30 &&
              agent.pos_x <= z.x + z.width + 30 &&
              agent.pos_y >= z.y - 30 &&
              agent.pos_y <= z.y + z.height + 30,
          );

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(
                {
                  agent,
                  spaceId,
                  zone: zone ? { id: zone.id, name: zone.name, roleTitle: zone.roleTitle } : null,
                  mcps: mcps.map((m) => ({ id: m.id, name: m.mcp_name, label: m.label, enabled: Boolean(m.enabled) })),
                  skills: skills.map((s) => ({ id: s.id, name: s.skill_name, enabled: Boolean(s.enabled) })),
                  connectionsCount: connections.length,
                  latestRuns: runs.map((r) => ({ id: r.id, status: r.status, startedAt: r.started_at, summary: r.summary })),
                },
                null,
                2,
              ),
            }],
          };
        }

        case 'canvas_create_agent': {
          let spaceId = resolveSpace(args.space_id);
          if (!spaceId && args.zone_id) {
            const targetZone = spaceDb.getZone(args.zone_id);
            if (targetZone?.spaceId) spaceId = targetZone.spaceId;
          }
          if (!spaceId) {
            const allSpaces = spaceDb.getWorkspaceSpaces();
            if (allSpaces.length > 0) spaceId = allSpaces[0].id;
          }

          const id = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const cronSchedule = args.cron_schedule || null;
          const cronEnabled = args.cron_enabled ? 1 : 0;
          let nextRunAt: string | null = null;
          if (cronEnabled && cronSchedule) {
            nextRunAt = calculateNextRun(cronSchedule);
          }

          let posX = typeof args.pos_x === 'number' ? args.pos_x : null;
          let posY = typeof args.pos_y === 'number' ? args.pos_y : null;
          let layoutNotice: string | null = null;

          const allAgents = agentDb.getAllAgents();
          const allSpaceAgents = spaceId
            ? allAgents.filter((a) => {
                const spaceAgentIds = new Set(spaceDb.getSpaceAgentIds(spaceId));
                return spaceAgentIds.has(a.id);
              })
            : allAgents;
          const allZones = spaceId ? spaceDb.getZones(spaceId) : spaceDb.getZones();

          // Robust zone resolution: by ID, by exact name, by substring, or by role/specialty matching
          let targetZone = args.zone_id ? spaceDb.getZone(args.zone_id) : null;
          if (!targetZone && args.zone_id) {
            const searchName = String(args.zone_id).trim().toLowerCase();
            targetZone = allZones.find((z) => z.name.toLowerCase() === searchName || z.name.toLowerCase().includes(searchName)) || null;
          }
          if (!targetZone && spaceId) {
            const text = `${args.role || ''} ${args.specialty || ''} ${args.name || ''} ${args.system_prompt || ''}`.toLowerCase();
            targetZone = allZones.find((z) => {
              const zname = z.name.toLowerCase();
              const zrole = (z.roleTitle || '').toLowerCase();
              const tokens = [...zname.split(/\s+/), ...zrole.split(/\s+/)].filter((t) => t.length > 3);
              return tokens.some((tok) => text.includes(tok));
            }) || null;
          }

          if (targetZone) {
            // Find existing agents stationed in or assigned to this zone (scoped to this space)
            const agentsInZone = allSpaceAgents.filter((a) =>
              (a.pos_x >= targetZone.x - 30 &&
               a.pos_x <= targetZone.x + targetZone.width + 30 &&
               a.pos_y >= targetZone.y - 30 &&
               a.pos_y <= targetZone.y + targetZone.height + 30) ||
              (a.system_prompt && a.system_prompt.includes(targetZone.name))
            );

            let slot = typeof args.slot_index === 'number' ? args.slot_index : 0;
            if (typeof args.slot_index !== 'number') {
              const occupiedSlots = new Set<number>();
              for (const az of agentsInZone) {
                const calculatedSlot = Math.round((az.pos_x - (targetZone.x + 50)) / 240);
                if (calculatedSlot >= 0) occupiedSlots.add(calculatedSlot);
              }
              while (occupiedSlots.has(slot)) {
                slot++;
              }
            }
            const slotX = Math.round(targetZone.x + 50 + slot * 240);
            const slotY = Math.round(targetZone.y + 75);

            if (posX === null || posY === null) {
              posX = slotX;
              posY = slotY;
            } else {
              // Check collision with ANY existing agent in the space
              const collides = allSpaceAgents.find(
                (a) => Math.abs(a.pos_x - posX!) < 200 && Math.abs(a.pos_y - posY!) < 120
              );
              const isInsideZone =
                posX >= targetZone.x - 10 &&
                posX <= targetZone.x + targetZone.width + 10 &&
                posY >= targetZone.y - 10 &&
                posY <= targetZone.y + targetZone.height + 10;

              if (collides || !isInsideZone) {
                layoutNotice = collides
                  ? `[Auto-Layout Safety] Requested coordinates (${posX}, ${posY}) collided with agent "${collides.name}". Automatically stationed inside zone "${targetZone.name}" at slot ${slot} (${slotX}, ${slotY}).`
                  : `[Auto-Layout Safety] Requested coordinates (${posX}, ${posY}) were outside zone "${targetZone.name}". Automatically stationed inside zone at slot ${slot} (${slotX}, ${slotY}).`;
                posX = slotX;
                posY = slotY;
              }
            }

            // Ensure zone is wide enough to contain the new agent without clipping
            const requiredZoneWidth = Math.max(targetZone.width, (slot + 1) * 240 + 80);
            if (targetZone.width < requiredZoneWidth) {
              spaceDb.updateZone(targetZone.id, { width: requiredZoneWidth });
              void callCanvasApi(`/api/space/zones/${targetZone.id}`, 'PATCH', { width: requiredZoneWidth });
              targetZone.width = requiredZoneWidth;

              // CASCADE SHIFT ALL RIGHTWARD SIBLING ZONES ON THIS TIER!
              const siblingZones = allZones
                .filter((sz) => sz.id !== targetZone.id && Math.abs(sz.y - targetZone.y) < 180 && sz.x > targetZone.x)
                .sort((a, b) => a.x - b.x);

              let prevRight = targetZone.x + requiredZoneWidth;
              for (const sz of siblingZones) {
                if (sz.x < prevRight + 100) {
                  const newX = prevRight + 100;
                  const shiftX = newX - sz.x;
                  spaceDb.updateZone(sz.id, { x: newX });
                  void callCanvasApi(`/api/space/zones/${sz.id}`, 'PATCH', { x: newX });

                  const contained = allSpaceAgents.filter(
                    (ca) => ca.pos_x >= sz.x - 20 && ca.pos_x <= sz.x + sz.width + 20 && Math.abs(ca.pos_y - sz.y) < 200
                  );
                  for (const ca of contained) {
                    const newPosX = ca.pos_x + shiftX;
                    agentDb.updateAgent(ca.id, { pos_x: newPosX });
                    spaceDb.updateNodePosition(ca.id, newPosX, ca.pos_y, spaceId || undefined);
                    ca.pos_x = newPosX;
                  }
                  prevRight = newX + sz.width;
                } else {
                  prevRight = sz.x + sz.width;
                }
              }
            }
          } else {
            // Standalone agent: place in neat 4-column grid below all department zones
            const maxZoneBottom = allZones.length > 0 ? Math.max(...allZones.map((z) => z.y + z.height), 400) : 400;
            const startY = maxZoneBottom + 120;
            const standaloneAgents = allSpaceAgents.filter(
              (a) => !allZones.some((z) => a.pos_x >= z.x - 20 && a.pos_x <= z.x + z.width + 20 && a.pos_y >= z.y - 20 && a.pos_y <= z.y + z.height + 20)
            );
            const occupiedGrid = new Set(standaloneAgents.map((a) => `${Math.round(a.pos_x)},${Math.round(a.pos_y)}`));
            let freeIdx = 0;
            let gridX = 100;
            let gridY = startY;
            while (true) {
              const col = freeIdx % 4;
              const row = Math.floor(freeIdx / 4);
              const candX = Math.round(100 + col * 320);
              const candY = Math.round(startY + row * 220);
              if (!occupiedGrid.has(`${candX},${candY}`)) {
                gridX = candX;
                gridY = candY;
                break;
              }
              freeIdx++;
            }

            if (posX === null || posY === null) {
              posX = gridX;
              posY = gridY;
            } else {
              const collides = allSpaceAgents.find(
                (a) => Math.abs(a.pos_x - posX!) < 200 && Math.abs(a.pos_y - posY!) < 120
              );
              if (collides) {
                posX = gridX;
                posY = gridY;
                layoutNotice = `[Auto-Layout Safety] Coordinates collided with agent "${collides.name}". Repositioned to grid slot (${posX}, ${posY}).`;
              }
            }
          }

          let defaultModel = 'nvidia/nemotron-3.5-lightning-30b-a3b';
          let defaultProvider = 'nvidia';
          if (spaceId) {
            try {
              const sessions = spaceDb.listExploreSessions(spaceId);
              if (sessions.length > 0 && sessions[0].model) {
                defaultModel = sessions[0].model;
                defaultProvider = sessions[0].provider || 'nvidia';
              }
            } catch {}
          }

          const created = agentDb.createAgent({
            id,
            name: args.name,
            model: args.model || defaultModel,
            provider: args.provider || defaultProvider,
            system_prompt:
              args.system_prompt ||
              'You are an autonomous AI specialist agent created on Smoke Monkey Canvas. Complete assigned tasks efficiently with the tools and MCPs available.',
            cron_schedule: cronSchedule,
            cron_enabled: cronEnabled,
            pos_x: posX,
            pos_y: posY,
            status: cronEnabled ? 'scheduled' : 'idle',
            last_run_at: null,
            next_run_at: nextRunAt,
            role: args.role || 'Specialist',
            specialty: args.specialty || null,
            description: args.description || null,
            working_dir: args.working_dir || null,
            agent_tier: args.agent_tier || 'leaf',
            owned_space_id: spaceId || null,
          } as any);

          if (args.feature_ownership) {
            try {
              const fo = Array.isArray(args.feature_ownership)
                ? args.feature_ownership
                : JSON.parse(args.feature_ownership);
              agentDb.updateAgentFeatureOwnership(id, fo);
            } catch {}
          }

          if (spaceId) {
            spaceDb.setAgentSpace(id, spaceId);
          }

          // Broadcast agent position to running canvas HTTP server
          void callCanvasApi('/api/space/nodes/positions', 'PATCH', {
            positions: [{ id, posX, posY, spaceId: spaceId || null }],
          });

          // Initialize workspace and 10-dimension memory
          try {
            const ws = resolveAgentWorkspace(created);
            ensureAgentWorkspace(ws, created.id, created.name, created.system_prompt);
          } catch (err) {
            logErr('Failed ensuring workspace for created agent:', err);
          }

          return {
            content: [{
              type: 'text',
              text: `Created Agent successfully:\n${JSON.stringify(created, null, 2)}${layoutNotice ? `\n\n⚠️ ${layoutNotice}` : ''}`,
            }],
          };
        }

        case 'canvas_update_agent': {
          const agentId = args.agent_id;
          if (!agentId) {
            return { content: [{ type: 'text', text: 'Error: agent_id is required.' }], isError: true };
          }
          assertAgentInScope(agentId);
          const currentAgent = agentDb.getAgent(agentId);
          if (!currentAgent) {
            return { content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }], isError: true };
          }
          const patch: Record<string, unknown> = {};
          if (args.name !== undefined) patch.name = args.name;
          if (args.role !== undefined) patch.role = args.role;
          if (args.specialty !== undefined) patch.specialty = args.specialty;
          if (args.description !== undefined) patch.description = args.description;
          if (args.model !== undefined) patch.model = args.model;
          if (args.provider !== undefined) patch.provider = args.provider;
          if (args.system_prompt !== undefined) {
            patch.system_prompt = args.system_prompt;
          } else if (args.role !== undefined || args.name !== undefined || args.description !== undefined || args.specialty !== undefined) {
            patch.system_prompt = reconcileSystemPromptWithProfile(currentAgent.system_prompt, {
              name: (args.name as string) ?? currentAgent.name,
              role: (args.role as string) ?? currentAgent.role,
              description: (args.description as string) ?? currentAgent.description,
              specialty: (args.specialty as string) ?? currentAgent.specialty,
            });
          }
          if (args.cron_schedule !== undefined) patch.cron_schedule = args.cron_schedule;
          if (args.cron_enabled !== undefined) {
            patch.cron_enabled = args.cron_enabled ? 1 : 0;
            if (args.cron_enabled && (args.cron_schedule || patch.cron_schedule)) {
              patch.next_run_at = calculateNextRun((args.cron_schedule || patch.cron_schedule) as string);
              patch.status = 'scheduled';
            } else if (!args.cron_enabled) {
              patch.next_run_at = null;
              patch.status = 'idle';
            }
          }
          if (typeof args.pos_x === 'number') patch.pos_x = args.pos_x;
          if (typeof args.pos_y === 'number') patch.pos_y = args.pos_y;
          if (args.status !== undefined) patch.status = args.status;
          if (args.working_dir !== undefined) patch.working_dir = args.working_dir;
          if (args.agent_tier !== undefined) patch.agent_tier = args.agent_tier;
          if (args.owned_space_id !== undefined) patch.owned_space_id = args.owned_space_id;

          const updated = agentDb.updateAgent(agentId, patch);
          if (!updated) {
            return { content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }], isError: true };
          }

          if (patch.system_prompt) {
            try {
              const workspace = resolveAgentWorkspace(updated);
              const ws = ensureAgentWorkspace(workspace, updated.id, updated.name, updated.system_prompt);
              if (ws.systemPromptFile) {
                writeFileSync(ws.systemPromptFile, `${patch.system_prompt}\n`, 'utf8');
              }
            } catch (err) {
              logErr(`[canvas-mcp] Failed to sync systemPromptFile for ${agentId}:`, err);
            }
          }

          if (args.feature_ownership !== undefined) {
            try {
              const fo = Array.isArray(args.feature_ownership)
                ? args.feature_ownership
                : JSON.parse(args.feature_ownership);
              agentDb.updateAgentFeatureOwnership(agentId, fo);
            } catch {}
          }

          return {
            content: [{
              type: 'text',
              text: `Updated Agent successfully:\n${JSON.stringify(updated, null, 2)}`,
            }],
          };
        }

        case 'canvas_delete_agent': {
          const agentId = args.agent_id;
          if (!agentId) {
            return { content: [{ type: 'text', text: 'Error: agent_id is required.' }], isError: true };
          }
          assertAgentInScope(agentId);
          const ok = agentDb.deleteAgent(agentId);
          return {
            content: [{
              type: 'text',
              text: ok ? `Deleted agent "${agentId}" and associated records successfully.` : `Agent "${agentId}" not found.`,
            }],
          };
        }

        case 'canvas_move_agent_to_zone': {
          const agentId = args.agent_id;
          const zoneId = args.zone_id;
          if (!agentId || !zoneId) {
            return { content: [{ type: 'text', text: 'Error: agent_id and zone_id are required.' }], isError: true };
          }
          assertAgentInScope(agentId);
          assertZoneInScope(zoneId);
          const agent = agentDb.getAgent(agentId);
          if (!agent) {
            return { content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }], isError: true };
          }
          const zone = spaceDb.getZone(zoneId);
          if (!zone) {
            return { content: [{ type: 'text', text: `Error: Zone "${zoneId}" not found.` }], isError: true };
          }

          const avatarW = 210;
          const avatarH = 160;
          const gapX = 24;
          const gapY = 20;
          const cols = Math.max(1, Math.floor((zone.width - 32) / (avatarW + gapX)));

          let slotIndex = typeof args.slot_index === 'number' ? args.slot_index : null;
          if (slotIndex === null) {
            const occupied = new Set<string>();
            for (const other of agentDb.getAllAgents()) {
              if (other.id === agentId) continue;
              const insideZone =
                other.pos_x >= zone.x &&
                other.pos_x <= zone.x + zone.width &&
                other.pos_y >= zone.y &&
                other.pos_y <= zone.y + zone.height;
              if (!insideZone) continue;
              const otherCol = Math.max(0, Math.round((other.pos_x - (zone.x + 20)) / (avatarW + gapX)));
              const otherRow = Math.max(0, Math.round((other.pos_y - (zone.y + 48)) / (avatarH + gapY)));
              occupied.add(`${otherCol},${otherRow}`);
            }
            let candidate = 0;
            while (occupied.has(`${candidate % cols},${Math.floor(candidate / cols)}`)) {
              candidate++;
            }
            slotIndex = candidate;
          }

          const col = slotIndex % cols;
          const row = Math.floor(slotIndex / cols);

          const newX = Math.round(zone.x + 20 + col * (avatarW + gapX));
          const newY = Math.round(zone.y + 48 + row * (avatarH + gapY));

          agentDb.updateAgent(agentId, { pos_x: newX, pos_y: newY });
          if (zone.spaceId) {
            spaceDb.setAgentSpace(agentId, zone.spaceId);
          }

          return {
            content: [{
              type: 'text',
              text: `Moved agent "${agent.name}" into zone "${zone.name}" at coordinates (${newX}, ${newY}).`,
            }],
          };
        }

        case 'canvas_reposition_agents': {
          const requested = Array.isArray(args.agents) ? args.agents : [];
          const valid = requested.filter((a) => {
            if (!a || typeof a.id !== 'string') return false;
            if (typeof a.pos_x !== 'number' || typeof a.pos_y !== 'number') return false;
            return Boolean(agentDb.getAgent(a.id));
          });
          const positions = valid.map((a) => ({
            id: a.id,
            posX: a.pos_x,
            posY: a.pos_y,
            spaceId: a.space_id,
          }));
          if (positions.length > 0) {
            spaceDb.updateNodePositions(positions);
            // Broadcast to running web canvas via HTTP API so the UI moves agent cards in real time
            await callCanvasApi('/api/space/nodes/positions', 'PATCH', { positions }).catch(() => {});
          }

          const skipped = requested.length - positions.length;
          return {
            content: [{
              type: 'text',
              text: `Batch repositioned ${positions.length} agents successfully.${skipped > 0 ? ` Skipped ${skipped} invalid or unknown agent entr${skipped === 1 ? 'y' : 'ies'}.` : ''}`,
            }],
          };
        }

        // ── Category 4: API Keys & Credentials ────────────────────────────
        case 'canvas_set_api_key': {
          const keyName = normalizeKeyName(String(args.provider_or_service || ''));
          const keyValue = String(args.api_key || '').trim();
          if (!keyName || !keyValue) {
            return {
              content: [{ type: 'text', text: 'Error: Both provider_or_service and api_key must be supplied.' }],
              isError: true,
            };
          }

          coreDb.setSetting(keyName, keyValue);

          const knownEnvKeys = new Set<string>([
            'NVIDIA_API_KEY',
            'ANTHROPIC_API_KEY',
            'OPENAI_API_KEY',
            'GEMINI_API_KEY',
            'GROQ_API_KEY',
            'OPENROUTER_API_KEY',
            'MISTRAL_API_KEY',
            'PERPLEXITY_API_KEY',
            'TOGETHER_API_KEY',
            'DEEPSEEK_API_KEY',
            'GITHUB_TOKEN',
            'SLACK_BOT_TOKEN',
          ]);
          for (const mcp of STOCK_MCPS) {
            for (const envKey of mcp.envKeys ?? []) knownEnvKeys.add(envKey);
          }
          const envPropagated = knownEnvKeys.has(keyName);
          if (envPropagated) {
            process.env[keyName] = keyValue;
          }

          const masked = keyValue.length > 12
            ? `${keyValue.slice(0, 4)}...${keyValue.slice(-4)}`
            : '••••••••';
          return {
            content: [{
              type: 'text',
              text: `Saved credential for ${keyName} (${masked}) into database settings${envPropagated ? ' and environment' : ' (unrecognized env key; environment propagation skipped)'} successfully.`,
            }],
          };
        }

        case 'canvas_get_provider_status': {
          const allSettings = coreDb.getAllSettings();
          const providers = [
            { provider: 'NVIDIA NIM', key: 'NVIDIA_API_KEY' },
            { provider: 'Anthropic Claude', key: 'ANTHROPIC_API_KEY' },
            { provider: 'OpenAI GPT', key: 'OPENAI_API_KEY' },
            { provider: 'Google Gemini', key: 'GEMINI_API_KEY' },
            { provider: 'Groq', key: 'GROQ_API_KEY' },
            { provider: 'OpenRouter', key: 'OPENROUTER_API_KEY' },
            { provider: 'Mistral', key: 'MISTRAL_API_KEY' },
            { provider: 'Perplexity', key: 'PERPLEXITY_API_KEY' },
            { provider: 'Together AI', key: 'TOGETHER_API_KEY' },
            { provider: 'DeepSeek', key: 'DEEPSEEK_API_KEY' },
            { provider: 'GitHub', key: 'GITHUB_TOKEN' },
            { provider: 'Slack', key: 'SLACK_BOT_TOKEN' },
          ];

          const report = providers.map((p) => {
            const val = allSettings[p.key] || process.env[p.key];
            const isConfigured = Boolean(val && val.length > 5);
            return {
              provider: p.provider,
              keyName: p.key,
              configured: isConfigured,
              masked: isConfigured
                ? (val!.length > 12 ? `${val!.slice(0, 4)}...${val!.slice(-4)}` : '••••••••')
                : null,
            };
          });

          return {
            content: [{
              type: 'text',
              text: `AI Provider Credentials Status:\n${JSON.stringify(report, null, 2)}`,
            }],
          };
        }

        // ── Category 5: 10-Dimension Cognitive Memory Matrix ──────────────
        case 'canvas_get_agent_memory': {
          const agentId = args.agent_id;
          if (!agentId) {
            return { content: [{ type: 'text', text: 'Error: agent_id is required.' }], isError: true };
          }
          assertAgentInScope(agentId);
          const agent = agentDb.getAgent(agentId);
          if (!agent) {
            return { content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }], isError: true };
          }
          const ws = resolveAgentWorkspace(agent);
          const memoryDir = join(ws, '.smoke-agent', 'memory');
          if (!existsSync(memoryDir)) {
            ensureAgentWorkspace(ws, agent.id, agent.name, agent.system_prompt);
          }

          const requestedDim = args.dimension ? normalizeMemoryFileName(args.dimension) : null;
          if (requestedDim) {
            const filePath = join(memoryDir, requestedDim);
            if (!existsSync(filePath)) {
              return {
                content: [{ type: 'text', text: `Memory file "${requestedDim}" does not exist yet for ${agent.name}.` }],
              };
            }
            const body = readFileSync(filePath, 'utf8');
            return {
              content: [{
                type: 'text',
                text: `Agent ${agent.name} — ${requestedDim} (${body.split('\n').length} lines):\n\n${body}`,
              }],
            };
          }

          // Return overview of all 10 dimensions
          const overview: Record<string, { lines: number; bytes: number; preview: string }> = {};
          for (const file of VALID_MEMORY_FILES) {
            const p = join(memoryDir, file);
            if (existsSync(p)) {
              const text = readFileSync(p, 'utf8');
              const lines = text.split('\n');
              overview[file] = {
                lines: lines.length,
                bytes: Buffer.byteLength(text, 'utf8'),
                preview: lines.slice(0, 10).join('\n'),
              };
            } else {
              overview[file] = { lines: 0, bytes: 0, preview: '(empty / not created)' };
            }
          }

          return {
            content: [{
              type: 'text',
              text: `10-Dimension Cognitive Memory Matrix for ${agent.name}:\n${JSON.stringify(overview, null, 2)}`,
            }],
          };
        }

        case 'canvas_update_agent_memory': {
          const agentId = args.agent_id;
          const dimension = args.dimension;
          const content = args.content;
          const mode = args.mode === 'replace' ? 'replace' : 'append';
          if (!agentId || !dimension || content === undefined) {
            return { content: [{ type: 'text', text: 'Error: agent_id, dimension, and content are required.' }], isError: true };
          }
          assertAgentInScope(agentId);

          const agent = agentDb.getAgent(agentId);
          if (!agent) {
            return { content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }], isError: true };
          }
          const ws = resolveAgentWorkspace(agent);
          const memoryDir = join(ws, '.smoke-agent', 'memory');
          if (!existsSync(memoryDir)) {
            mkdirSync(memoryDir, { recursive: true });
          }

          const fileName = normalizeMemoryFileName(dimension);
          const filePath = join(memoryDir, fileName);

          if (mode === 'replace') {
            writeFileSync(filePath, `${content.trim()}\n`, 'utf8');
          } else {
            const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
            const updated = `${existing.trim()}\n\n${content.trim()}\n`;
            writeFileSync(filePath, updated, 'utf8');
          }

          return {
            content: [{
              type: 'text',
              text: `Successfully updated ${fileName} for ${agent.name} (mode: ${mode}).`,
            }],
          };
        }

        case 'canvas_cascade_memory': {
          const sourceAgentId = args.source_agent_id;
          if (!sourceAgentId) {
            return { content: [{ type: 'text', text: 'Error: source_agent_id is required.' }], isError: true };
          }
          const sourceAgent = agentDb.getAgent(sourceAgentId);
          if (!sourceAgent) {
            return { content: [{ type: 'text', text: `Error: Source agent "${sourceAgentId}" not found.` }], isError: true };
          }

          const sourceWs = resolveAgentWorkspace(sourceAgent);
          const sourceMemoryDir = join(sourceWs, '.smoke-agent', 'memory');
          const dimensionsToCascade = Array.isArray(args.dimensions) && args.dimensions.length > 0
            ? args.dimensions.map(normalizeMemoryFileName)
            : ['facts.md', 'procedural.md'];

          // Determine target agents
          let targets: string[] = [];
          if (Array.isArray(args.target_agent_ids) && args.target_agent_ids.length > 0) {
            targets = args.target_agent_ids;
          } else {
            const explicitSpaceId = typeof args.space_id === 'string' ? args.space_id.trim() : '';
            if (explicitSpaceId && !spaceDb.getWorkspaceSpace(explicitSpaceId)) {
              return {
                content: [{ type: 'text', text: `Error: Space "${explicitSpaceId}" not found.` }],
                isError: true,
              };
            }
            if (!explicitSpaceId && !configuredSpaceId) {
              return {
                content: [{
                  type: 'text',
                  text: 'Error: canvas_cascade_memory requires either target_agent_ids or an explicit space_id to avoid cascading to every agent on the canvas.',
                }],
                isError: true,
              };
            }
            const spaceId = resolveSpace(args.space_id);
            if (!spaceId) {
              return {
                content: [{ type: 'text', text: 'Error: No valid target space was resolved for this cascade.' }],
                isError: true,
              };
            }
            targets = spaceDb.getSpaceAgentIds(spaceId).filter((id) => id !== sourceAgentId);
          }

          let updatedAgentsCount = 0;
          for (const targetId of targets) {
            const targetAgent = agentDb.getAgent(targetId);
            if (!targetAgent) continue;
            const targetWs = resolveAgentWorkspace(targetAgent);
            const targetMemDir = join(targetWs, '.smoke-agent', 'memory');
            if (!existsSync(targetMemDir)) mkdirSync(targetMemDir, { recursive: true });

            for (const dimFile of dimensionsToCascade) {
              const srcFile = join(sourceMemoryDir, dimFile);
              if (!existsSync(srcFile)) continue;
              const sourceContent = readFileSync(srcFile, 'utf8');
              const destFile = join(targetMemDir, dimFile);

              const cascadeNotice = `\n\n<!-- CASCADED FROM LEADERSHIP (${sourceAgent.name}) AT ${new Date().toISOString()} -->\n${sourceContent}`;
              const existing = existsSync(destFile) ? readFileSync(destFile, 'utf8') : '';
              writeFileSync(destFile, `${existing.trim()}\n${cascadeNotice}\n`, 'utf8');
            }
            updatedAgentsCount++;
          }

          return {
            content: [{
              type: 'text',
              text: `Cascaded ${dimensionsToCascade.join(', ')} from ${sourceAgent.name} to ${updatedAgentsCount} subordinate agents.`,
            }],
          };
        }

        // ── Category 6: Skills & MCPs Attachments ─────────────────────────
        case 'canvas_list_available_skills': {
          const cat = args.category?.trim();
          const search = args.search?.trim().toLowerCase();
          const stock = coreDb.getAllStockSkills();

          const filtered = stock.filter((s) => {
            if (cat && s.category !== cat) return false;
            if (search && !s.name.toLowerCase().includes(search) && !(s.description && s.description.toLowerCase().includes(search))) return false;
            return true;
          });

          return {
            content: [{
              type: 'text',
              text: `Available Skills (${filtered.length}):\n${JSON.stringify(filtered.map((s) => ({ id: s.id, category: s.category, name: s.name, description: s.description })), null, 2)}`,
            }],
          };
        }

        case 'canvas_list_available_mcps': {
          const cat = args.category?.trim();
          const search = args.search?.trim().toLowerCase();
          const filtered = STOCK_MCPS.filter((m) => {
            if (cat && m.category !== cat) return false;
            if (search && !m.name.toLowerCase().includes(search) && !m.label.toLowerCase().includes(search) && !m.description.toLowerCase().includes(search)) return false;
            return true;
          });

          return {
            content: [{
              type: 'text',
              text: `Available MCP Servers (${filtered.length}):\n${JSON.stringify(filtered.map((m) => ({ name: m.name, label: m.label, category: m.category, description: m.description, authType: m.authType, requiredEnv: m.envKeys })), null, 2)}`,
            }],
          };
        }

        case 'canvas_attach_skill': {
          const agentId = args.agent_id;
          const skillName = args.skill_name?.trim();
          if (!agentId || !skillName) {
            return { content: [{ type: 'text', text: 'Error: agent_id and skill_name are required.' }], isError: true };
          }
          assertAgentInScope(agentId);
          const id = `skill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const skill = agentDb.upsertAgentSkill({
            id,
            agent_id: agentId,
            skill_name: skillName,
            description: args.description || null,
            content: args.content || `# ${skillName}\nWorkflow instructions.`,
            enabled: 1,
          });

          return {
            content: [{
              type: 'text',
              text: `Attached skill "${skillName}" to agent "${agentId}":\n${JSON.stringify(skill, null, 2)}`,
            }],
          };
        }

        case 'canvas_detach_skill': {
          const agentId = args.agent_id;
          const identifier = args.skill_name_or_id;
          if (!agentId || !identifier) {
            return { content: [{ type: 'text', text: 'Error: agent_id and skill_name_or_id are required.' }], isError: true };
          }
          assertAgentInScope(agentId);
          const skills = agentDb.getAgentSkills(agentId);
          const target = skills.find((s) => s.id === identifier || s.skill_name.toLowerCase() === identifier.toLowerCase());
          if (!target) {
            return { content: [{ type: 'text', text: `Skill "${identifier}" was not attached to agent "${agentId}".` }], isError: true };
          }
          agentDb.deleteAgentSkill(target.id, agentId);
          return {
            content: [{
              type: 'text',
              text: `Detached skill "${target.skill_name}" from agent "${agentId}".`,
            }],
          };
        }

        case 'canvas_attach_mcp': {
          const agentId = args.agent_id;
          const mcpName = args.mcp_name?.trim();
          if (!agentId || !mcpName) {
            return { content: [{ type: 'text', text: 'Error: agent_id and mcp_name are required.' }], isError: true };
          }
          assertAgentInScope(agentId);
          const id = `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const stock = STOCK_MCPS.find((s) => s.name === mcpName);
          const label = args.label || stock?.label || mcpName;
          const configJson = args.config ? JSON.stringify(args.config) : '{}';

          const mcp = agentDb.upsertAgentMcp({
            id,
            agent_id: agentId,
            mcp_name: mcpName,
            label,
            config_json: configJson,
            enabled: 1,
          });

          return {
            content: [{
              type: 'text',
              text: `Attached MCP "${mcpName}" to agent "${agentId}":\n${JSON.stringify(mcp, null, 2)}`,
            }],
          };
        }

        case 'canvas_detach_mcp': {
          const agentId = args.agent_id;
          const identifier = args.mcp_name_or_id;
          if (!agentId || !identifier) {
            return { content: [{ type: 'text', text: 'Error: agent_id and mcp_name_or_id are required.' }], isError: true };
          }
          assertAgentInScope(agentId);
          const attachedMcps = agentDb.getAgentMcps(agentId);
          const target = attachedMcps.find(
            (m) => m.id === identifier || m.mcp_name.toLowerCase() === identifier.toLowerCase(),
          );
          if (!target) {
            return {
              content: [{ type: 'text', text: `MCP "${identifier}" was not attached to agent "${agentId}".` }],
              isError: true,
            };
          }
          agentDb.deleteAgentMcp(target.id, agentId);
          return {
            content: [{
              type: 'text',
              text: `Detached MCP "${target.mcp_name}" from agent "${agentId}".`,
            }],
          };
        }

        // ── Category 7: Hierarchy & Reporting Connections ─────────────────
        case 'canvas_list_connections': {
          const agentId = args.agent_id?.trim();
          const connections = agentDb.getAgentConnections(agentId);
          const allAgents = new Map(agentDb.getAllAgents().map((a) => [a.id, a]));

          const list = connections.map((c) => {
            const src = allAgents.get(c.source_agent_id);
            const tgt = allAgents.get(c.target_agent_id);
            return {
              id: c.id,
              sourceAgent: src ? { id: src.id, name: src.name, role: src.role } : { id: c.source_agent_id },
              targetAgent: tgt ? { id: tgt.id, name: tgt.name, role: tgt.role } : { id: c.target_agent_id },
              createdAt: c.created_at,
            };
          });

          return {
            content: [{
              type: 'text',
              text: `Agent Connections (${list.length}):\n${JSON.stringify(list, null, 2)}`,
            }],
          };
        }

        case 'canvas_connect_agents': {
          const srcId = args.source_agent_id;
          const tgtId = args.target_agent_id;
          if (!srcId || !tgtId) {
            return { content: [{ type: 'text', text: 'Error: Both source_agent_id and target_agent_id are required.' }], isError: true };
          }
          assertAgentInScope(srcId);
          assertAgentInScope(tgtId);
          const conn = agentDb.createAgentConnection(srcId, tgtId);
          return {
            content: [{
              type: 'text',
              text: `Created reporting connection between "${srcId}" and "${tgtId}":\n${JSON.stringify(conn, null, 2)}`,
            }],
          };
        }

        case 'canvas_disconnect_agents': {
          if (args.connection_id) {
            agentDb.deleteAgentConnection(args.connection_id);
            return { content: [{ type: 'text', text: `Deleted connection record "${args.connection_id}".` }] };
          }
          if (args.source_agent_id && args.target_agent_id) {
            assertAgentInScope(args.source_agent_id);
            assertAgentInScope(args.target_agent_id);
            agentDb.deleteAgentConnectionBetween(args.source_agent_id, args.target_agent_id);
            return { content: [{ type: 'text', text: `Removed connection between "${args.source_agent_id}" and "${args.target_agent_id}".` }] };
          }
          return {
            content: [{ type: 'text', text: 'Error: Specify either connection_id or both source_agent_id and target_agent_id.' }],
            isError: true,
          };
        }

        // ── Category 8: Execution, Runs & Delegation ──────────────────────
        case 'canvas_run_agent': {
          const agentId = args.agent_id;
          const prompt = args.prompt;
          if (!agentId || !prompt) {
            return { content: [{ type: 'text', text: 'Error: agent_id and prompt are required.' }], isError: true };
          }
          assertAgentInScope(agentId);
          if (!agentDb.getAgent(agentId)) {
            return { content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }], isError: true };
          }

          // Trigger run via canvas HTTP server if running
          const res = await callCanvasApi<{ success: boolean; run: { id: string; status: string } }>(
            `/api/agents/${agentId}/run`,
            'POST',
            { prompt },
          );

          if (res.ok) {
            return {
              content: [{
                type: 'text',
                text: `Execution run triggered for agent "${agentId}":\n${JSON.stringify(res.data, null, 2)}`,
              }],
            };
          }

          // Fallback: create run directly in database
          const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          agentDb.createRun({
            id: runId,
            agent_id: agentId,
            trigger_type: 'manual',
            status: 'queued',
            task_prompt: prompt,
          });

          return {
            content: [{
              type: 'text',
              text: `Queued execution run "${runId}" for agent "${agentId}". (Note: Canvas HTTP daemon was not reachable directly, run queued in DB).`,
            }],
          };
        }

        case 'canvas_stop_agent': {
          const agentId = args.agent_id;
          if (!agentId) {
            return { content: [{ type: 'text', text: 'Error: agent_id is required.' }], isError: true };
          }
          assertAgentInScope(agentId);
          const stopAgent = agentDb.getAgent(agentId);
          if (!stopAgent) {
            return { content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }], isError: true };
          }

          const res = await callCanvasApi(`/api/agents/${agentId}/stop`, 'POST');
          if (res.ok) {
            return {
              content: [{
                type: 'text',
                text: `Agent "${agentId}" run halted successfully via Canvas service.`,
              }],
            };
          }

          // Direct status update fallback: mark any active runs cancelled so the
          // canvas does not leave them stuck in "running" forever.
          const now = new Date().toISOString();
          const cancelled: string[] = [];
          for (const run of agentDb.getAgentRuns(agentId, 20)) {
            if (run.status === 'running' || run.status === 'queued') {
              agentDb.updateRun(run.id, {
                status: 'cancelled',
                completed_at: now,
                error: run.error ?? 'Stopped via canvas_stop_agent (Canvas service unavailable).',
              });
              cancelled.push(run.id);
            }
          }
          agentDb.updateAgent(agentId, { status: 'idle' });
          return {
            content: [{
              type: 'text',
              text: `Halted agent "${agentId}" and set status to idle.${cancelled.length > 0 ? ` Cancelled runs: ${cancelled.join(', ')}.` : ''}`,
            }],
          };
        }

        case 'canvas_delegate_task': {
          const fromId = args.from_agent_id;
          const toId = args.to_agent_id;
          const title = args.task_title;
          const instructions = args.instructions;
          if (!fromId || !toId || !title || !instructions) {
            return {
              content: [{ type: 'text', text: 'Error: from_agent_id, to_agent_id, task_title, and instructions are required.' }],
              isError: true,
            };
          }

          const res = await callCanvasApi<{ success: boolean; runId?: string }>(
            `/api/agents/${fromId}/delegate`,
            'POST',
            {
              targetAgentId: toId,
              taskTitle: title,
              instructions,
              communicationType: 'delegate',
            },
          );

          if (res.ok) {
            return {
              content: [{
                type: 'text',
                text: `Task "${title}" delegated from ${fromId} to ${toId}:\n${JSON.stringify(res.data, null, 2)}`,
              }],
            };
          }

          // Direct delegation run trigger fallback
          const runRes = await callCanvasApi(
            `/api/agents/${toId}/run`,
            'POST',
            { prompt: `## Delegated Task: ${title}\nFrom: ${fromId}\n\n${instructions}` },
          );

          if (!runRes.ok) {
            return {
              content: [{
                type: 'text',
                text: `Error: delegation failed and fallback run could not be started for "${toId}": ${JSON.stringify(runRes.data ?? runRes, null, 2)}`,
              }],
              isError: true,
            };
          }

          return {
            content: [{
              type: 'text',
              text: `Delegation initiated for ${toId}:\n${JSON.stringify(runRes.data || runRes, null, 2)}`,
            }],
          };
        }

        // ── Category 10: Canvas Layout & UI Governance ────────────────────
        case 'canvas_audit_ui':
        case 'canvas_check_layout': {
          return this.executeUiAudit(args);
        }

        // ── Category 11: Explore Phase & Project Knowledge ────────────────
        case 'canvas_get_explore_report': {
          const { SpaceDb } = await import('../space/space.db.js');
          const spaceDb = new SpaceDb();
          const spaceIdArg = args.space_id?.trim();
          if (!spaceIdArg) {
            return { content: [{ type: 'text', text: 'Error: space_id is required.' }], isError: true };
          }
          const session = spaceDb.getExploreSessionBySpace(spaceIdArg);
          if (!session || !session.explore_report_json) {
            return { content: [{ type: 'text', text: `No explore report found for space ${spaceIdArg}. Run an explore session first.` }], isError: true };
          }
          let report: any;
          try { report = JSON.parse(session.explore_report_json); } catch {
            return { content: [{ type: 'text', text: 'Invalid report JSON.' }], isError: true };
          }
          const qt = args.query_type || 'summary';
          if (qt === 'full') return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }] };
          if (qt === 'features') return { content: [{ type: 'text', text: JSON.stringify(report.features || [], null, 2) }] };
          if (qt === 'folder_map') {
            const fp = args.folder_path?.trim();
            const matches = (report.features || []).filter((f: any) =>
              (f.folders || []).some((fo: string) => fp && (fo === fp || fp.startsWith(fo) || fo.startsWith(fp)))
            );
            return { content: [{ type: 'text', text: JSON.stringify(matches, null, 2) }] };
          }
          const summary = {
            company_name: report.company_name,
            tech_stack: report.tech_stack,
            feature_count: report.features?.length,
            agent_count_estimate: report.agent_count_estimate,
            explore_summary: report.explore_summary,
          };
          return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
        }

        default: {
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${msg}` }],
        isError: true,
      };
    }
  }

  public async executeUiAudit(args: Record<string, any>): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
    const minAgentClearanceX = typeof args.min_agent_clearance_x === 'number' ? args.min_agent_clearance_x : 200;
    const minAgentClearanceY = typeof args.min_agent_clearance_y === 'number' ? args.min_agent_clearance_y : 100;
    const autoFix = Boolean(args.auto_fix);

    // 1. Clean up any orphaned zones immediately if autoFix is requested
    let prunedOrphanedCount = 0;
    const orphanedRows = coreDb.db.prepare(`
      SELECT id, name, space_id FROM space_zones
      WHERE space_id IS NOT NULL AND space_id NOT IN (SELECT id FROM workspace_spaces)
    `).all() as Array<{ id: string; name: string; space_id: string }>;

    if (autoFix && orphanedRows.length > 0) {
      prunedOrphanedCount = spaceDb.cleanupOrphanedZones();
    }

    // 2. Identify target space
    const requestedSpaceId = typeof args.space_id === 'string' ? args.space_id.trim() : '';
    if (requestedSpaceId && !spaceDb.getWorkspaceSpace(requestedSpaceId)) {
      return {
        content: [{ type: 'text', text: `Error: Space "${requestedSpaceId}" not found.` }],
        isError: true,
      };
    }
    const targetSpaceId = resolveSpace(args.space_id);
    const allSpaces = spaceDb.getWorkspaceSpaces();
    const activeSpace = targetSpaceId ? allSpaces.find((s) => s.id === targetSpaceId) : allSpaces[0] || null;

    // 3. Load zones & agents
    let zones = activeSpace ? spaceDb.getZones(activeSpace.id) : spaceDb.getZones();
    const validSpaceIds = new Set(allSpaces.map((s) => s.id));
    zones = zones.filter((z) => !z.spaceId || validSpaceIds.has(z.spaceId));

    interface UiAuditIssue {
      type: string;
      severity: 'error' | 'warning';
      title: string;
      details: string;
      affectedIds: string[];
    }

    const issues: UiAuditIssue[] = [];

    const isPointInsideZone = (zone: { x: number; y: number; width: number; height: number }, x: number, y: number) => {
      const pad = 24;
      if (x >= zone.x - pad && x <= zone.x + zone.width + pad && y >= zone.y - pad && y <= zone.y + zone.height + pad) {
        return true;
      }
      const cx = x + 100;
      const cy = y + 80;
      return cx >= zone.x && cx <= zone.x + zone.width && cy >= zone.y && cy <= zone.y + zone.height;
    };

    let agents = agentDb.getAllAgents();
    if (activeSpace && allSpaces.length > 1) {
      const spaceAgentIds = new Set(spaceDb.getSpaceAgentIds(activeSpace.id));
      agents = agents.filter(
        (a) =>
          spaceAgentIds.has(a.id) ||
          zones.some((z) => isPointInsideZone(z, a.pos_x, a.pos_y)) ||
          (a.pos_x >= activeSpace.x &&
            a.pos_x <= activeSpace.x + activeSpace.width &&
            a.pos_y >= activeSpace.y &&
            a.pos_y <= activeSpace.y + activeSpace.height) ||
          (a.system_prompt && a.system_prompt.includes(activeSpace.name)),
      );
    }

    // A. Orphaned Zones Check
    if (!autoFix && orphanedRows.length > 0) {
      for (const row of orphanedRows) {
        issues.push({
          type: 'orphaned_zone',
          severity: 'error',
          title: `Orphaned Zone: "${row.name}"`,
          details: `Zone references deleted or non-existent space ID "${row.space_id}". This creates phantom ghost zones on the canvas. Run with auto_fix: true to prune.`,
          affectedIds: [row.id],
        });
      }
    }

    // B. Negative Coordinates Check
    for (const z of zones) {
      if (z.x < 0 || z.y < 0) {
        issues.push({
          type: 'negative_coordinates',
          severity: 'error',
          title: `Zone "${z.name}" has negative coordinates (${z.x}, ${z.y})`,
          details: `All zones must have positive coordinates strictly >= 0.`,
          affectedIds: [z.id],
        });
      }
    }
    for (const a of agents) {
      if (a.pos_x < 0 || a.pos_y < 0) {
        issues.push({
          type: 'negative_coordinates',
          severity: 'error',
          title: `Agent "${a.name}" has negative coordinates (${a.pos_x}, ${a.pos_y})`,
          details: `All agents must have positive coordinates strictly >= 0.`,
          affectedIds: [a.id],
        });
      }
    }

    // C. Zone Overlaps Check
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        const z1 = zones[i];
        const z2 = zones[j];
        if (z1.spaceId && z2.spaceId && z1.spaceId !== z2.spaceId) continue;

        const minX = Math.max(z1.x, z2.x);
        const maxX = Math.min(z1.x + z1.width, z2.x + z2.width);
        const minY = Math.max(z1.y, z2.y);
        const maxY = Math.min(z1.y + z1.height, z2.y + z2.height);

        if (maxX > minX && maxY > minY) {
          const overlapW = Math.round(maxX - minX);
          const overlapH = Math.round(maxY - minY);
          issues.push({
            type: 'zone_overlap',
            severity: 'error',
            title: `Zone Overlap: "${z1.name}" and "${z2.name}"`,
            details: `Zones overlap by ${overlapW}px × ${overlapH}px. Zone 1: [x:${z1.x}, y:${z1.y}, w:${z1.width}, h:${z1.height}], Zone 2: [x:${z2.x}, y:${z2.y}, w:${z2.width}, h:${z2.height}]. Maintain minimum 80px clearance.`,
            affectedIds: [z1.id, z2.id],
          });
        }
      }
    }

    // D. Agent Collisions Check (Stacked cards)
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const a1 = agents[i];
        const a2 = agents[j];
        const dx = Math.abs(a1.pos_x - a2.pos_x);
        const dy = Math.abs(a1.pos_y - a2.pos_y);

        if (dx < minAgentClearanceX && dy < minAgentClearanceY) {
          issues.push({
            type: 'agent_collision',
            severity: 'error',
            title: `Agent Card Collision: "${a1.name}" & "${a2.name}"`,
            details: `Agents are stacked / overlapping (dx: ${Math.round(dx)}px < ${minAgentClearanceX}px, dy: ${Math.round(dy)}px < ${minAgentClearanceY}px) at (${a1.pos_x}, ${a1.pos_y}) and (${a2.pos_x}, ${a2.pos_y}). Cards overlap on canvas.`,
            affectedIds: [a1.id, a2.id],
          });
        }
      }
    }

    // E. Agents In-Zone & Boundary Check
    for (const a of agents) {
      const matchZone = zones.find((z) => isPointInsideZone(z, a.pos_x, a.pos_y));
      if (!matchZone) {
        issues.push({
          type: 'agent_outside_zone',
          severity: 'error',
          title: `Agent Outside Zone: "${a.name}"`,
          details: `Agent coordinates (${a.pos_x}, ${a.pos_y}) are floating in blank space outside all department zones.`,
          affectedIds: [a.id],
        });
      } else {
        if (a.pos_x + 190 > matchZone.x + matchZone.width) {
          issues.push({
            type: 'zone_crowding',
            severity: 'warning',
            title: `Agent "${a.name}" exceeds right edge of zone "${matchZone.name}"`,
            details: `Agent right edge (x: ${a.pos_x + 190}) exceeds zone width boundary (x: ${matchZone.x + matchZone.width}). Zone width should be expanded.`,
            affectedIds: [a.id, matchZone.id],
          });
        }
        if (a.pos_y + 130 > matchZone.y + matchZone.height) {
          issues.push({
            type: 'zone_crowding',
            severity: 'warning',
            title: `Agent "${a.name}" exceeds bottom edge of zone "${matchZone.name}"`,
            details: `Agent bottom edge (y: ${a.pos_y + 130}) exceeds zone height boundary (y: ${matchZone.y + matchZone.height}).`,
            affectedIds: [a.id, matchZone.id],
          });
        }
      }
    }

    // F. Space Bounding Box Check
    if (activeSpace) {
      for (const z of zones) {
        if (z.x < activeSpace.x || z.y < activeSpace.y || (z.x + z.width) > (activeSpace.x + activeSpace.width) || (z.y + z.height) > (activeSpace.y + activeSpace.height)) {
          issues.push({
            type: 'element_outside_space',
            severity: 'error',
            title: `Zone "${z.name}" outside Space Bounds`,
            details: `Zone [x:${z.x}, y:${z.y}, w:${z.width}, h:${z.height}] extends outside Office Space "${activeSpace.name}" bounds [x:${activeSpace.x}, y:${activeSpace.y}, w:${activeSpace.width}, h:${activeSpace.height}].`,
            affectedIds: [z.id, activeSpace.id],
          });
        }
      }
      for (const a of agents) {
        if (a.pos_x < activeSpace.x || a.pos_y < activeSpace.y || a.pos_x > (activeSpace.x + activeSpace.width) || a.pos_y > (activeSpace.y + activeSpace.height)) {
          issues.push({
            type: 'element_outside_space',
            severity: 'error',
            title: `Agent "${a.name}" outside Space Bounds`,
            details: `Agent at (${a.pos_x}, ${a.pos_y}) is outside Office Space "${activeSpace.name}" boundary.`,
            affectedIds: [a.id, activeSpace.id],
          });
        }
      }
    }

    // G. Hierarchy Flow Inversions
    for (const z of zones) {
      if (z.parentZoneId) {
        const parent = zones.find((p) => p.id === z.parentZoneId);
        if (parent && z.y <= parent.y + 80) {
          issues.push({
            type: 'hierarchy_inversion',
            severity: 'warning',
            title: `Hierarchy Inversion: "${parent.name}" -> "${z.name}"`,
            details: `Subordinate zone is at y=${z.y} while managing parent zone is at y=${parent.y}. Parent zones must be positioned above child squads in top-to-bottom hierarchy flow.`,
            affectedIds: [parent.id, z.id],
          });
        }
      }
    }

    // ── Metric Counts ───────────────────────────────────────────────────────
    const agentCollisionsCount = issues.filter((i) => i.type === 'agent_collision').length;
    const zoneOverlapsCount = issues.filter((i) => i.type === 'zone_overlap').length;
    const agentsOutsideZoneCount = issues.filter((i) => i.type === 'agent_outside_zone').length;
    const elementsOutsideSpaceCount = issues.filter((i) => i.type === 'element_outside_space').length;
    const orphanedZonesCount = issues.filter((i) => i.type === 'orphaned_zone').length;
    const hierarchyInversionsCount = issues.filter((i) => i.type === 'hierarchy_inversion').length;
    const negativeCoordinatesCount = issues.filter((i) => i.type === 'negative_coordinates').length;
    const zoneCrowdingCount = issues.filter((i) => i.type === 'zone_crowding').length;

    // ── AUTO-FIX ENGINE ─────────────────────────────────────────────────────
    let repairedStats: any = undefined;
    if (autoFix && activeSpace) {
      let repositionedAgentsCount = 0;
      let expandedZonesCount = 0;
      let consolidatedDuplicateZonesCount = 0;
      const movedPositions: Array<{ id: string; posX: number; posY: number; spaceId: string }> = [];

      // Step 0: Consolidate any duplicate zones in this space (same name created multiple times)
      const nameMap = new Map<string, typeof zones>();
      for (const z of zones) {
        const key = z.name.trim().toLowerCase();
        if (!nameMap.has(key)) nameMap.set(key, []);
        nameMap.get(key)!.push(z);
      }
      for (const [key, matchingZones] of nameMap.entries()) {
        if (matchingZones.length > 1) {
          const primaryZone = matchingZones[0];
          for (let i = 1; i < matchingZones.length; i++) {
            const redundantZone = matchingZones[i];
            for (const a of agents) {
              if (isPointInsideZone(redundantZone, a.pos_x, a.pos_y)) {
                a.pos_x = primaryZone.x + 50;
                a.pos_y = primaryZone.y + 75;
              }
            }
            spaceDb.deleteZone(redundantZone.id);
            consolidatedDuplicateZonesCount++;
          }
        }
      }

      if (consolidatedDuplicateZonesCount > 0) {
        zones = spaceDb.getZones(activeSpace.id).filter((z) => !z.spaceId || validSpaceIds.has(z.spaceId));
      }

      // Step 1: Assign each agent to its best designated zone
      const zoneAgentMap = new Map<string, typeof agents>();
      for (const z of zones) {
        zoneAgentMap.set(z.id, []);
      }
      const standaloneAgents: typeof agents = [];

      for (const a of agents) {
        let bestZoneId: string | null = null;
        for (const z of zones) {
          if (a.system_prompt && (a.system_prompt.includes(`(${z.name})`) || a.system_prompt.includes(z.name))) {
            bestZoneId = z.id;
            break;
          }
        }
        if (!bestZoneId) {
          const text = `${a.role || ''} ${a.specialty || ''} ${a.name} ${a.description || ''}`.toLowerCase();
          for (const z of zones) {
            const zname = z.name.toLowerCase();
            const zrole = (z.roleTitle || '').toLowerCase();
            const ztokens = [...zname.split(/\s+/), ...zrole.split(/\s+/)].filter((t) => t.length > 3);
            if (ztokens.some((token) => text.includes(token))) {
              bestZoneId = z.id;
              break;
            }
          }
        }
        if (!bestZoneId && zones.length > 0) {
          const sorted = [...zones].sort((z1, z2) => {
            const d1 = Math.hypot(a.pos_x - (z1.x + z1.width / 2), a.pos_y - (z1.y + z1.height / 2));
            const d2 = Math.hypot(a.pos_x - (z2.x + z2.width / 2), a.pos_y - (z2.y + z2.height / 2));
            return d1 - d2;
          });
          bestZoneId = sorted[0]?.id || null;
        }

        if (bestZoneId && zoneAgentMap.has(bestZoneId)) {
          zoneAgentMap.get(bestZoneId)!.push(a);
        } else {
          standaloneAgents.push(a);
        }
      }

      // Step 2: Compute REQUIRED DIMENSIONS for each zone BEFORE placing them!
      // Zone sizing MUST precede coordinate assignment so zones never expand into each other later!
      for (const z of zones) {
        const assigned = zoneAgentMap.get(z.id) || [];
        const agentCount = assigned.length;
        const minW = Math.max(520, agentCount * 240 + 80);
        if (z.width < minW) {
          z.width = minW;
          expandedZonesCount++;
        }
        z.height = 280;
      }

      // Step 3: Determine each zone's Hierarchy Level (Tier 0 to Tier 4)
      for (const z of zones) {
        let level = typeof z.level === 'number' && Number.isFinite(z.level) ? z.level : -1;
        if (level < 0) {
          const lower = (z.name + ' ' + (z.roleTitle || '')).toLowerCase();
          if (lower.includes('board') || lower.includes('executive') || lower.includes('ceo') || lower.includes('strategy')) {
            level = 0;
          } else if (lower.includes('cto') || lower.includes('ciso') || lower.includes('cpo') || lower.includes('vp') || lower.includes('director') || lower.includes('leadership')) {
            level = 1;
          } else if (lower.includes('squad') || lower.includes('team') || lower.includes('engine') || lower.includes('microservices') || lower.includes('core')) {
            level = 2;
          } else if (lower.includes('qa') || lower.includes('fuzzing') || lower.includes('sre') || lower.includes('cloud') || lower.includes('observability') || lower.includes('ui') || lower.includes('console')) {
            level = 3;
          } else {
            level = 2;
          }
        }
        z.level = Math.max(0, Math.min(4, Math.floor(level)));
      }

      // Step 4: Group zones by tier level and layout along strictly non-overlapping horizontal bands
      const tierMap = new Map<number, typeof zones>();
      for (let l = 0; l <= 4; l++) tierMap.set(l, []);
      for (const z of zones) {
        const lvl = z.level ?? 2;
        tierMap.get(lvl)!.push(z);
      }

      const tierYMap: Record<number, number> = { 0: 80, 1: 440, 2: 800, 3: 1160, 4: 1520 };
      const horizontalGap = 100;
      let maxCanvasWidth = 3200;

      // First, place Tier 1, 2, 3, 4 zones left-to-right with guaranteed horizontalGap
      for (let lvl = 1; lvl <= 4; lvl++) {
        const tierZones = tierMap.get(lvl)!;
        if (tierZones.length === 0) continue;
        tierZones.sort((a, b) => a.x - b.x);

        let curX = 100;
        const targetY = tierYMap[lvl];
        for (const z of tierZones) {
          z.x = curX;
          z.y = targetY;
          spaceDb.updateZone(z.id, { x: curX, y: targetY, width: z.width, height: z.height, level: lvl });
          void callCanvasApi(`/api/space/zones/${z.id}`, 'PATCH', { x: curX, y: targetY, width: z.width, height: z.height, level: lvl });
          curX += z.width + horizontalGap;
        }
        if (curX > maxCanvasWidth) maxCanvasWidth = curX;
      }

      // Now place Tier 0 (Executive Boardroom): Center it above the rest of the canvas!
      const tier0Zones = tierMap.get(0)!;
      if (tier0Zones.length > 0) {
        tier0Zones.sort((a, b) => a.x - b.x);
        const totalT0Width = tier0Zones.reduce((sum, z) => sum + z.width, 0) + (tier0Zones.length - 1) * horizontalGap;
        let startX = Math.max(100, Math.round((maxCanvasWidth - totalT0Width) / 2));
        for (const z of tier0Zones) {
          z.x = startX;
          z.y = tierYMap[0];
          spaceDb.updateZone(z.id, { x: startX, y: tierYMap[0], width: z.width, height: z.height, level: 0 });
          void callCanvasApi(`/api/space/zones/${z.id}`, 'PATCH', { x: startX, y: tierYMap[0], width: z.width, height: z.height, level: 0 });
          startX += z.width + horizontalGap;
        }
        if (startX > maxCanvasWidth) maxCanvasWidth = startX;
      }

      // Step 5: Station all agents neatly inside their zones in non-overlapping single-row slots
      for (const zone of zones) {
        const assigned = zoneAgentMap.get(zone.id) || [];
        for (let slot = 0; slot < assigned.length; slot++) {
          const a = assigned[slot];
          const newX = Math.round(zone.x + 50 + slot * 240);
          const newY = Math.round(zone.y + 75);
          if (a.pos_x !== newX || a.pos_y !== newY) {
            agentDb.updateAgent(a.id, { pos_x: newX, pos_y: newY });
            spaceDb.updateNodePosition(a.id, newX, newY, activeSpace.id);
            movedPositions.push({ id: a.id, posX: newX, posY: newY, spaceId: activeSpace.id });
            repositionedAgentsCount++;
            a.pos_x = newX;
            a.pos_y = newY;
          }
          spaceDb.setAgentSpace(a.id, activeSpace.id);
        }
      }

      // Step 5.5: Station standalone agents in neat 4-column grid below all zones
      if (standaloneAgents.length > 0) {
        const maxZoneBottom = zones.length > 0 ? Math.max(...zones.map((z) => z.y + z.height), 400) : 400;
        const startY = maxZoneBottom + 120;
        for (let sIdx = 0; sIdx < standaloneAgents.length; sIdx++) {
          const a = standaloneAgents[sIdx];
          const col = sIdx % 4;
          const row = Math.floor(sIdx / 4);
          const newX = Math.round(100 + col * 320);
          const newY = Math.round(startY + row * 220);
          if (a.pos_x !== newX || a.pos_y !== newY) {
            agentDb.updateAgent(a.id, { pos_x: newX, pos_y: newY });
            spaceDb.updateNodePosition(a.id, newX, newY, activeSpace.id);
            movedPositions.push({ id: a.id, posX: newX, posY: newY, spaceId: activeSpace.id });
            repositionedAgentsCount++;
            a.pos_x = newX;
            a.pos_y = newY;
          }
          spaceDb.setAgentSpace(a.id, activeSpace.id);
        }
      }

      // Step 6: Expand parent space bounding box to fit all zones and agents comfortably
      const maxZoneRight = Math.max(...zones.map((z) => z.x + z.width), maxCanvasWidth) + 120;
      const maxZoneBottom = Math.max(...zones.map((z) => z.y + z.height), 1400) + 120;
      const targetSpaceW = Math.max(activeSpace.width, maxZoneRight, 4000);
      const targetSpaceH = Math.max(activeSpace.height, maxZoneBottom, 1600);

      let adjustedSpaceBounds = false;
      if (activeSpace.x !== 0 || activeSpace.y !== 0 || activeSpace.width < targetSpaceW || activeSpace.height < targetSpaceH) {
        spaceDb.updateWorkspaceSpace(activeSpace.id, { x: 0, y: 0, width: targetSpaceW, height: targetSpaceH });
        void callCanvasApi(`/api/space/spaces/${activeSpace.id}`, 'PATCH', { x: 0, y: 0, width: targetSpaceW, height: targetSpaceH });
        adjustedSpaceBounds = true;
      }

      if (movedPositions.length > 0) {
        await callCanvasApi('/api/space/nodes/positions', 'PATCH', { positions: movedPositions });
      }

      repairedStats = {
        repositionedAgentsCount,
        expandedZonesCount,
        consolidatedDuplicateZonesCount,
        prunedOrphanedZonesCount: prunedOrphanedCount,
        adjustedSpaceBounds,
      };

      return this.executeUiAudit({ ...args, auto_fix: false, _after_repair: repairedStats });
    }

    // ── SCORE & REPORT COMPUTATION ──────────────────────────────────────────
    const penalty =
      agentCollisionsCount * 20 +
      zoneOverlapsCount * 25 +
      agentsOutsideZoneCount * 15 +
      elementsOutsideSpaceCount * 10 +
      orphanedZonesCount * 20 +
      negativeCoordinatesCount * 15 +
      hierarchyInversionsCount * 10 +
      zoneCrowdingCount * 5;

    const score = Math.max(0, 100 - penalty);
    const status = score >= 95 && agentCollisionsCount === 0 && zoneOverlapsCount === 0 && agentsOutsideZoneCount === 0 ? 'PASS' : 'FAIL';

    const recommendations: string[] = [];
    if (agentCollisionsCount > 0) {
      recommendations.push('Run canvas_audit_ui with { auto_fix: true } or call canvas_reposition_agents to enforce 240px horizontal clearance.');
    }
    if (zoneOverlapsCount > 0) {
      recommendations.push('Reposition overlapping zones with canvas_update_zone to maintain at least 80px horizontal gap and 100px vertical gap.');
    }
    if (agentsOutsideZoneCount > 0) {
      recommendations.push('Move misplaced agents into their department zones with canvas_move_agent_to_zone or { auto_fix: true }.');
    }
    if (elementsOutsideSpaceCount > 0) {
      recommendations.push('Expand office space boundary with canvas_update_space to comfortably enclose all zones and agents.');
    }
    if (orphanedZonesCount > 0) {
      recommendations.push('Prune orphaned zones belonging to deleted spaces by running canvas_audit_ui with { auto_fix: true }.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Canvas UI layout is clean, symmetrical, and presentation-ready. No action needed.');
    }

    const report = {
      status,
      score,
      spaceId: activeSpace?.id || null,
      spaceName: activeSpace?.name || null,
      stats: {
        totalSpaces: allSpaces.length,
        totalZones: zones.length,
        totalAgents: agents.length,
        agentCollisionsCount,
        zoneOverlapsCount,
        agentsOutsideZoneCount,
        elementsOutsideSpaceCount,
        orphanedZonesCount,
        hierarchyInversionsCount,
        negativeCoordinatesCount,
        zoneCrowdingCount,
      },
      issues,
      recommendations,
      repaired: args._after_repair || repairedStats,
    };

    const badge = status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    let text = `# 🔬 Canvas UI Quality & Layout Audit: ${badge} (Score: ${score}/100)\n\n`;
    text += `**Target Space**: ${activeSpace ? `"${activeSpace.name}" (\`${activeSpace.id}\`)` : '(All Spaces)'}\n`;
    text += `**Inspected**: ${allSpaces.length} Space(s), ${zones.length} Department Zone(s), ${agents.length} Agent(s)\n\n`;

    if (report.repaired) {
      text += `### 🛠️ Auto-Fix Actions Performed:\n`;
      text += `- Repositioned Agents: ${report.repaired.repositionedAgentsCount}\n`;
      text += `- Expanded Crowded Zones: ${report.repaired.expandedZonesCount}\n`;
      text += `- Pruned Orphaned Zones: ${report.repaired.prunedOrphanedZonesCount}\n`;
      text += `- Adjusted Space Bounds: ${report.repaired.adjustedSpaceBounds ? 'YES' : 'NO'}\n\n`;
    }

    text += `### 📊 Diagnostic Metrics:\n`;
    text += `| Metric | Count | Status |\n`;
    text += `| :--- | :---: | :--- |\n`;
    text += `| Agent Collisions (Stacked Cards) | ${agentCollisionsCount} | ${agentCollisionsCount === 0 ? '✅ 0' : `⚠️ ${agentCollisionsCount} (FAIL)`} |\n`;
    text += `| Zone Overlaps (Rect Intersection) | ${zoneOverlapsCount} | ${zoneOverlapsCount === 0 ? '✅ 0' : `⚠️ ${zoneOverlapsCount} (FAIL)`} |\n`;
    text += `| Out-of-Zone Agents | ${agentsOutsideZoneCount} | ${agentsOutsideZoneCount === 0 ? '✅ 0' : `⚠️ ${agentsOutsideZoneCount} (FAIL)`} |\n`;
    text += `| Elements Outside Space Bounds | ${elementsOutsideSpaceCount} | ${elementsOutsideSpaceCount === 0 ? '✅ 0' : `⚠️ ${elementsOutsideSpaceCount} (FAIL)`} |\n`;
    text += `| Orphaned Zones (Ghost Zones) | ${orphanedZonesCount} | ${orphanedZonesCount === 0 ? '✅ 0' : `⚠️ ${orphanedZonesCount} (FAIL)`} |\n`;
    text += `| Hierarchy Flow Inversions | ${hierarchyInversionsCount} | ${hierarchyInversionsCount === 0 ? '✅ 0' : `ℹ️ ${hierarchyInversionsCount} (Warning)`} |\n`;
    text += `| Negative Coordinates | ${negativeCoordinatesCount} | ${negativeCoordinatesCount === 0 ? '✅ 0' : `⚠️ ${negativeCoordinatesCount} (FAIL)`} |\n`;
    text += `| Zone Crowding / Clipping | ${zoneCrowdingCount} | ${zoneCrowdingCount === 0 ? '✅ 0' : `ℹ️ ${zoneCrowdingCount} (Warning)`} |\n\n`;

    if (issues.length > 0) {
      text += `### ⚠️ Detected Layout Issues (${issues.length}):\n`;
      for (let i = 0; i < Math.min(issues.length, 15); i++) {
        const iss = issues[i];
        text += `${i + 1}. **[${iss.severity.toUpperCase()}] ${iss.title}**\n   ${iss.details}\n`;
      }
      if (issues.length > 15) {
        text += `\n*... and ${issues.length - 15} more issues (omitted for brevity)*\n`;
      }
      text += `\n`;
    }

    text += `### 💡 Recommendations:\n`;
    for (const rec of recommendations) {
      text += `- ${rec}\n`;
    }

    text += `\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\``;

    return {
      content: [{ type: 'text', text }],
      isError: status === 'FAIL',
    };
  }
}

// ── Auto-Start Stdio Server when run directly ───────────────────────────────
const isMainScript = process.argv[1] && (
  process.argv[1].endsWith('canvas-mcp.server.js') ||
  process.argv[1].endsWith('canvas-mcp.server.ts')
);
if (isMainScript) {
  const server = new CanvasMcpServer();
  server.start();
}
