import assert from 'node:assert';
import { SpaceDb } from '../server/features/space/space.db.js';
import { AgentDb } from '../server/features/agent/agent.db.js';
import { CUSTOM_AGENT_TOOLS } from '../server/features/agent/agent.custom-tools.js';
import { ensureAgentWorkspace } from '../server/features/agent/agent.manifest.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

async function runExploreSystemTests() {
  console.log('\n🧪 [TEST] Starting 3-Phase Explore System Validation...\n');

  const spaceDb = new SpaceDb();
  const agentDb = new AgentDb();

  // Clean test space
  const testSpaceId = `space_explore_test_${Date.now()}`;
  spaceDb.createWorkspaceSpace({
    id: testSpaceId,
    name: 'Apex SaaS Cloud Corp',
    description: 'Enterprise Cloud Management Platform',
    color: '#6366f1',
    shape: 'rectangle',
    width: 1400,
    height: 900,
    x: 0,
    y: 0,
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 1. Phase 1: Explore Intake & Session Creation
  // ────────────────────────────────────────────────────────────────────────────
  console.log('▶ Testing Phase 1: Intake Session Creation...');
  const session = spaceDb.createExploreSession({
    space_id: testSpaceId,
    brief_markdown: `# Apex SaaS Cloud Corp
We are building a cloud management control plane.
Key capabilities:
1. Authentication & RBAC (folders: /src/auth, /src/middleware)
2. Billing & Subscriptions (folders: /src/billing, /src/stripe)
3. Infrastructure Provisioning (folders: /src/infra, /src/cloud)`,
    attached_docs: [
      { filename: 'architecture.md', content: '# System Architecture\nUses Next.js, Express, PostgreSQL.' },
      { filename: 'specs.md', content: '# Feature Specifications\nOAuth 2.0 with GitHub & Google.' },
    ],
    git_url: 'https://github.com/apex-cloud/core-platform',
    tech_stack: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
    sync_interval_hours: 3,
  });

  assert.ok(session.id, 'Session should have an ID');
  assert.strictEqual(session.status, 'pending');
  assert.strictEqual(session.sync_interval_hours, 3);
  console.log(`  ✅ Session created: ${session.id} (Status: ${session.status})`);

  // ────────────────────────────────────────────────────────────────────────────
  // 2. Phase 1: submit_explore_report Tool Execution
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Testing Phase 1: submit_explore_report Tool...');
  const submitTool = CUSTOM_AGENT_TOOLS.find((t) => t.name === 'submit_explore_report');
  assert.ok(submitTool, 'submit_explore_report tool must be registered');

  const sampleReport = {
    company_name: 'Apex SaaS Cloud Corp',
    company_type: 'software_product' as const,
    tech_stack: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
    project_summary: 'Enterprise Cloud Management Platform with RBAC, Billing, and Infra provisioners.',
    features: [
      {
        id: 'feat_auth',
        name: 'Authentication & RBAC',
        description: 'Multi-tenant auth, session tokens, JWTs, and role permissions',
        folders: ['/src/auth', '/src/middleware'],
        key_files: ['/src/auth/index.ts', '/src/auth/rbac.ts'],
        complexity: 'high' as const,
        suggested_agent_name: 'Auth Security Engineer',
      },
      {
        id: 'feat_billing',
        name: 'Billing & Invoicing',
        description: 'Stripe webhook handling, usage-based subscriptions, and invoice generation',
        folders: ['/src/billing', '/src/stripe'],
        key_files: ['/src/billing/service.ts'],
        complexity: 'medium' as const,
        suggested_agent_name: 'Billing Specialist',
      },
      {
        id: 'feat_infra',
        name: 'Cloud Provisioning',
        description: 'Terraform runner and container deployment controller',
        folders: ['/src/infra', '/src/cloud'],
        key_files: ['/src/infra/deployer.ts'],
        complexity: 'high' as const,
        suggested_agent_name: 'DevOps Architect',
      },
    ],
    zones_plan: [
      {
        name: 'Core Platform Engineering',
        role_title: 'Engineering Division',
        description: 'Platform foundations and backend microservices',
        color: '#3b82f6',
        sub_zones: [
          { name: 'Security & Auth', features: ['feat_auth'] },
          { name: 'Finance & Payments', features: ['feat_billing'] },
          { name: 'Infrastructure & Ops', features: ['feat_infra'] },
        ],
      },
    ],
    managers_plan: [
      {
        name: 'Backend Engineering Manager',
        zone: 'Core Platform Engineering',
        manages_features: ['feat_auth', 'feat_billing', 'feat_infra'],
        description: 'Oversees service architecture, schedules deliverables, and routes incoming tasks',
      },
    ],
    required_mcps: ['smoke-monkey-canvas', 'github', 'filesystem', 'postgres'],
    agent_count_estimate: 5,
    explore_summary: 'Comprehensive cloud SaaS platform with 3 distinct feature boundaries and 1 executive engineering zone.',
    session_id: session.id,
  };

  const submitRes: any = await submitTool.execute(sampleReport, { agentId: 'explorer_test_1' } as any);
  assert.ok(submitRes.success, 'submit_explore_report should succeed');

  const refreshedSession = spaceDb.getExploreSession(session.id);
  assert.strictEqual(refreshedSession?.status, 'complete', 'Session should be marked complete');
  assert.ok(refreshedSession?.explore_report_json, 'Session must store report JSON');
  console.log(`  ✅ submit_explore_report succeeded (Session status: ${refreshedSession.status})`);

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Project Explore Tool & Querying Parameters
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Testing get_project_explore and project_explore Tools...');
  const exploreTool = CUSTOM_AGENT_TOOLS.find((t) => t.name === 'project_explore');
  const getExploreTool = CUSTOM_AGENT_TOOLS.find((t) => t.name === 'get_project_explore');
  assert.ok(exploreTool, 'project_explore tool must exist');
  assert.ok(getExploreTool, 'get_project_explore tool must exist');

  // Test overview/summary
  const overviewRes: any = await exploreTool.execute({ space_id: testSpaceId, parameter: 'overview' }, {} as any);
  assert.ok(overviewRes.success, 'overview query should succeed');
  assert.strictEqual(overviewRes.data.company_name, 'Apex SaaS Cloud Corp');
  assert.strictEqual(overviewRes.data.total_features, 3);
  console.log('  ✅ project_explore(parameter: "overview") returned 3 features');

  // Test features list
  const featuresRes: any = await exploreTool.execute({ space_id: testSpaceId, parameter: 'features' }, {} as any);
  assert.ok(featuresRes.success);
  assert.strictEqual(featuresRes.data.length, 3);
  console.log('  ✅ project_explore(parameter: "features") returned catalog');

  // Test feature detail
  const detailRes: any = await exploreTool.execute({ space_id: testSpaceId, feature_name: 'Authentication' }, {} as any);
  assert.ok(detailRes.success);
  assert.strictEqual(detailRes.data.id, 'feat_auth');
  assert.deepStrictEqual(detailRes.data.folders, ['/src/auth', '/src/middleware']);
  console.log('  ✅ project_explore(feature_name: "Authentication") returned /src/auth folders');

  // Test folder mapping
  const folderMapRes: any = await exploreTool.execute({ space_id: testSpaceId, folder_path: '/src/billing/service.ts' }, {} as any);
  assert.ok(folderMapRes.success);
  assert.strictEqual(folderMapRes.data[0].feature_id, 'feat_billing');
  assert.strictEqual(folderMapRes.data[0].suggested_agent_name, 'Billing Specialist');
  console.log(`  ✅ project_explore(folder_path: "/src/billing/service.ts") correctly routed to "${folderMapRes.data[0].suggested_agent_name}"`);

  // Test free-text search
  const queryRes: any = await exploreTool.execute({ space_id: testSpaceId, query: 'Stripe' }, {} as any);
  assert.ok(queryRes.success);
  assert.strictEqual(queryRes.data.matchingFeatures.length, 1);
  assert.strictEqual(queryRes.data.matchingFeatures[0].id, 'feat_billing');
  console.log('  ✅ project_explore(query: "Stripe") found matching billing feature');

  // ────────────────────────────────────────────────────────────────────────────
  // 4. Phase 2: Dedicated Feature Agent Creation & Memory Seeding
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Testing Phase 2: Dedicated Feature Agent Creation & Memory Matrix...');
  const testAgentId = `agent_leaf_test_${Date.now()}`;
  const leafAgent = agentDb.createAgent({
    id: testAgentId,
    name: 'Devon Reed, Auth Security Engineer',
    model: 'nvidia/nemotron-3-ultra-550b-a55b',
    provider: 'nvidia',
    system_prompt: 'You are the dedicated Auth Security Engineer for Apex SaaS Cloud Corp. Your owned feature: Authentication & RBAC. Your folders: /src/auth, /src/middleware.',
    cron_schedule: '0 */3 * * *',
    cron_enabled: 1,
    pos_x: 320,
    pos_y: 200,
    role: 'Security Specialist',
    specialty: 'Authentication & RBAC — /src/auth, /src/middleware',
    description: 'Sole owner of authentication and authorization protocols',
    agent_tier: 'leaf',
    owned_space_id: testSpaceId,
  } as any);

  agentDb.updateAgentFeatureOwnership(testAgentId, [
    {
      feature_id: 'feat_auth',
      feature: 'Authentication & RBAC',
      folders: ['/src/auth', '/src/middleware'],
      key_files: ['/src/auth/index.ts', '/src/auth/rbac.ts'],
      description: 'Multi-tenant auth and permissions',
      complexity: 'high',
    },
  ]);

  const ownership = agentDb.getAgentFeatureOwnership(testAgentId);
  assert.strictEqual(ownership.length, 1);
  assert.strictEqual(ownership[0].feature_id, 'feat_auth');
  assert.deepStrictEqual(ownership[0].folders, ['/src/auth', '/src/middleware']);
  console.log(`  ✅ Agent ${leafAgent.name} assigned dedicated feature ownership: ${ownership[0].feature}`);

  // Test workspace seeding & feature-sync.sh automation
  const testWorkspace = path.join(os.tmpdir(), `smoke-test-ws-${Date.now()}`);
  const ws = ensureAgentWorkspace(testWorkspace, testAgentId, leafAgent.name, leafAgent.system_prompt);

  const syncScript = path.join(ws.automationDir, 'feature-sync.sh');
  assert.ok(fs.existsSync(syncScript), 'feature-sync.sh automation script must be seeded');
  const syncContent = fs.readFileSync(syncScript, 'utf8');
  assert.ok(syncContent.includes('find'), 'feature-sync.sh must include file change detection');
  console.log('  ✅ Automation script feature-sync.sh automatically seeded in agent workspace');

  // ────────────────────────────────────────────────────────────────────────────
  // 5. Phase 3: 3-Hour Sync Cron & Last Sync Updating
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Testing Phase 3: 3-Hour Sync Execution & Drift State...');
  const markSuccessTool = CUSTOM_AGENT_TOOLS.find((t) => t.name === 'mark_cron_job_success');
  assert.ok(markSuccessTool, 'mark_cron_job_success tool must exist');

  agentDb.updateAgentLastSync(testAgentId);
  const updatedAgent = agentDb.getAgent(testAgentId);
  assert.ok(updatedAgent?.last_sync_at, 'Agent must record last_sync_at timestamp');
  console.log(`  ✅ Agent last_sync_at updated: ${updatedAgent?.last_sync_at}`);

  // Clean temp test dir
  try {
    fs.rmSync(testWorkspace, { recursive: true, force: true });
    agentDb.deleteAgent(testAgentId);
    spaceDb.deleteWorkspaceSpace(testSpaceId);
  } catch {}

  console.log('\n🎉 ALL 3-PHASE EXPLORE SYSTEM TESTS PASSED SUCCESSFULLY!\n');
}

runExploreSystemTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
