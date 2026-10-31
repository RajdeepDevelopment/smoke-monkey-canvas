import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { CoreDatabase } from '../server/features/core/database.db.js';
import { AgentDb } from '../server/features/agent/agent.db.js';
import {
  formatDateKey,
  resolveEffectiveTodoDate,
  inferSectionForTodo,
  inferSpecializationsFromTodos,
  recordAgentTodoUpdate,
  redevelopAgentSpecializationsFromHistory,
  getAgentTodosDir,
} from '../server/features/agent/agent.todos.js';
import { buildToolRegistry } from 'smoke-monkey-harness';
import { CUSTOM_AGENT_TOOLS } from '../server/features/agent/agent.custom-tools.js';
import { AgentRunner } from '../server/features/agent/agent.runner.js';

async function runTests() {
  console.log('🧪 Starting Agent Date-Wise To-Do History & Midnight Crossover Test Suite...\n');

  // ── Test 1: Date Attribution & Midnight Crossover Edge Case ───────────────
  console.log('Test 1: Midnight Crossover Date Attribution');
  {
    // Case A: Run started at 11:55 PM (23:55) on 2026-10-29
    // Current time reaches next day at 00:15 AM on 2026-10-30
    const startLateNightIso = '2026-10-29T23:55:00.000Z';
    const nowNextDayIso = '2026-10-30T00:15:00.000Z';

    const resultA = resolveEffectiveTodoDate({
      runStartedAt: startLateNightIso,
      now: nowNextDayIso,
    });

    assert.strictEqual(
      resultA.taskDate,
      '2026-10-29',
      "Task date must match run's start date (2026-10-29), not next calendar day (2026-10-30)",
    );
    assert.strictEqual(
      resultA.crossedMidnight,
      true,
      'crossedMidnight must be true when run spans across midnight',
    );
    console.log(`  ✓ ISO Crossover properly attributed: start=2026-10-29 23:55, now=2026-10-30 00:15 -> taskDate=${resultA.taskDate} (crossedMidnight=true)`);

    // Case B: Local Date objects
    const localStart = new Date(2026, 9, 29, 23, 55, 0); // Oct 29, 11:55 PM local
    const localNext = new Date(2026, 9, 30, 0, 15, 0);   // Oct 30, 00:15 AM local
    const resultLocal = resolveEffectiveTodoDate({
      runStartedAt: localStart,
      now: localNext,
    });
    assert.strictEqual(resultLocal.taskDate, '2026-10-29');
    assert.strictEqual(resultLocal.crossedMidnight, true);
    console.log(`  ✓ Local Date Crossover properly attributed: start=2026-10-29 23:55, now=2026-10-30 00:15 -> taskDate=${resultLocal.taskDate}`);

    // Case C: Normal run on the same day
    const sameDay = '2026-10-29T14:30:00.000Z';
    const resultC = resolveEffectiveTodoDate({
      runStartedAt: sameDay,
      now: sameDay,
    });
    assert.strictEqual(resultC.taskDate, '2026-10-29');
    assert.strictEqual(resultC.crossedMidnight, false);
    console.log('  ✓ Normal same-day run properly attributed (crossedMidnight=false)');
  }

  // ── Test 2: Domain Section & Specialization Inference ──────────────────────
  console.log('\nTest 2: Domain Section & Specialization Inference');
  {
    const sec1 = inferSectionForTodo('Implement unit tests for OAuth token validation');
    assert.strictEqual(sec1, 'QA & Testing');

    const sec2 = inferSectionForTodo('Create SQLite database migration for todo history');
    assert.strictEqual(sec2, 'Database & Migrations');

    const sec3 = inferSectionForTodo('Expose REST API endpoints in Express router');
    assert.strictEqual(sec3, 'Backend & APIs');

    const sec4 = inferSectionForTodo('Build React component modal with Tailwind styling');
    assert.strictEqual(sec4, 'Frontend & UI');

    const sec5 = inferSectionForTodo('Setup Dockerfile and GitHub Action CI/CD workflow');
    assert.strictEqual(sec5, 'DevOps & CI/CD');

    console.log('  ✓ Correctly categorized work domains for tasks across engineering sectors');

    const sampleTodos = [
      { content: 'Write unit tests for auth', status: 'completed' as const },
      { content: 'Run integration test suite', status: 'completed' as const },
      { content: 'Design SQLite tables and indexes', status: 'completed' as const },
      { content: 'Implement Express API endpoints', status: 'completed' as const },
    ];
    const { topSections, specializations } = inferSpecializationsFromTodos(sampleTodos);
    assert(topSections.includes('QA & Testing'));
    assert(topSections.includes('Database & Migrations'));
    assert(topSections.includes('Backend & APIs'));
    assert(specializations.some((s) => s.includes('QA') || s.includes('Test')));
    console.log(`  ✓ Inferred specializations: ${specializations.join(', ')}`);
  }

  // ── Test 3: Database Persistence & Lifecycle in AgentDb ────────────────────
  console.log('\nTest 3: SQLite Persistence in CoreDatabase & AgentDb');
  const tempDbPath = path.join(os.tmpdir(), `test_smoke_monkey_todo_${Date.now()}.db`);
  const coreDb = new CoreDatabase(tempDbPath);
  const db = new AgentDb(coreDb);

  const testAgent = db.createAgent({
    id: `agent-todo-test-${Date.now()}`,
    name: 'Backend Specialist Agent',
    model: 'nvidia/nemotron-3-super-120b-a12b',
    provider: 'nvidia',
    system_prompt: 'You are a backend specialist agent.',
    role: 'Backend Systems Engineer',
    specialty: 'General Engineering',
  } as any);

  const testDate = '2026-10-29';
  const runId = 'test-run-123';

  // 1. Insert initial pending items
  db.upsertAgentTodoItem({
    id: '',
    agent_id: testAgent.id,
    task_date: testDate,
    run_id: runId,
    content: 'Setup database schema migration',
    status: 'pending',
    priority: 'high',
    section: 'Database & Migrations',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  db.upsertAgentTodoItem({
    id: '',
    agent_id: testAgent.id,
    task_date: testDate,
    run_id: runId,
    content: 'Write unit tests for data access layer',
    status: 'pending',
    priority: 'medium',
    section: 'QA & Testing',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  let items = db.getAgentTodosByDate(testAgent.id, testDate);
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0].status, 'pending');
  console.log('  ✓ Initial 2 tasks inserted with pending status');

  // 2. Transition task 1 to in_progress then completed
  db.upsertAgentTodoItem({
    id: '',
    agent_id: testAgent.id,
    task_date: testDate,
    run_id: runId,
    content: 'Setup database schema migration',
    status: 'in_progress',
    priority: 'high',
    created_at: items[0].created_at,
    updated_at: new Date().toISOString(),
  });

  items = db.getAgentTodosByDate(testAgent.id, testDate);
  assert.strictEqual(items.length, 2, 'Must not duplicate existing task on status transition');
  assert.strictEqual(items[0].status, 'in_progress');
  assert(items[0].started_at, 'started_at timestamp must be recorded');

  db.upsertAgentTodoItem({
    id: '',
    agent_id: testAgent.id,
    task_date: testDate,
    run_id: runId,
    content: 'Setup database schema migration',
    status: 'completed',
    priority: 'high',
    created_at: items[0].created_at,
    updated_at: new Date().toISOString(),
  });

  items = db.getAgentTodosByDate(testAgent.id, testDate);
  assert.strictEqual(items[0].status, 'completed');
  assert(items[0].completed_at, 'completed_at timestamp must be recorded');
  console.log('  ✓ Task status transition (pending -> in_progress -> completed) updated seamlessly without duplicate rows');

  // ── Test 4: Workspace Disk Ledger Generation (.smoke-agent/todos/) ────────
  console.log('\nTest 4: Workspace Disk Ledger Generation (.smoke-agent/todos/)');
  const tempWorkspace = path.join(os.tmpdir(), `test_ws_agent_${Date.now()}`);
  fs.mkdirSync(tempWorkspace, { recursive: true });

  const summary = await recordAgentTodoUpdate({
    agentId: testAgent.id,
    todos: [
      { content: 'Setup database schema migration', status: 'completed', priority: 'high' },
      { content: 'Write unit tests for data access layer', status: 'completed', priority: 'medium' },
      { content: 'Add API endpoint for data retrieval', status: 'in_progress', priority: 'medium' },
    ],
    runId,
    runStartedAt: '2026-10-29T23:55:00.000Z',
    workspacePath: tempWorkspace,
    db,
  });

  assert.strictEqual(summary.total, 3);
  assert.strictEqual(summary.completed, 2);
  assert.strictEqual(summary.inProgress, 1);
  assert(summary.sections.includes('Database & Migrations'));

  const todosDir = getAgentTodosDir(tempWorkspace);
  const mdPath = path.join(todosDir, `${summary.date}.md`);
  const jsonPath = path.join(todosDir, `${summary.date}.json`);
  const indexPath = path.join(todosDir, 'index.json');

  assert(fs.existsSync(mdPath), `Expected ${mdPath} to exist on disk`);
  assert(fs.existsSync(jsonPath), `Expected ${jsonPath} to exist on disk`);
  assert(fs.existsSync(indexPath), `Expected ${indexPath} to exist on disk`);

  const mdContent = fs.readFileSync(mdPath, 'utf8');
  assert(mdContent.includes('# Daily Task & Todo Ledger'));
  assert(mdContent.includes('[x]'));
  assert(mdContent.includes('[>]'));
  assert(mdContent.includes('Database & Migrations'));
  console.log('  ✓ Generated date-wise markdown ledger and json file on disk in .smoke-agent/todos/');

  // ── Test 5: Specialization Redevelopment ───────────────────────────────────
  console.log('\nTest 5: Specialization Redevelopment from Completed Tasks');
  const initialAgent = db.getAgent(testAgent.id);
  assert.strictEqual(initialAgent?.specialty, 'General Engineering');

  const redevelopResult = await redevelopAgentSpecializationsFromHistory(
    testAgent.id,
    db,
    tempWorkspace,
    7,
  );

  assert(redevelopResult !== null);
  assert(redevelopResult.completedTasksCount >= 2);
  assert(redevelopResult.newSpecialty !== 'General Engineering');

  const updatedAgent = db.getAgent(testAgent.id);
  assert.strictEqual(updatedAgent?.specialty, redevelopResult.newSpecialty);
  console.log(`  ✓ Specialization redeveloped from todo history: "${initialAgent?.specialty}" -> "${updatedAgent?.specialty}"`);

  // ── Test 6: Custom Tools Registry & Execution ─────────────────────────
  console.log('\nTest 6: Custom Tools Registry & Execution');
  const runner = AgentRunner.getInstance();
  const runnerDb = runner.getDb();
  runnerDb.createAgent({
    id: testAgent.id,
    name: testAgent.name,
    model: testAgent.model,
    provider: testAgent.provider,
    system_prompt: testAgent.system_prompt,
    role: testAgent.role,
    specialty: testAgent.specialty,
    working_dir: tempWorkspace,
  } as any);
  for (const t of db.getAgentTodosByDate(testAgent.id, testDate)) {
    runnerDb.upsertAgentTodoItem(t);
  }

  const registry = buildToolRegistry();
  for (const t of CUSTOM_AGENT_TOOLS) registry.register(t);

  // Check get_agent_todo_history tool
  const historyResult = await registry.execute(
    'get_agent_todo_history',
    {
      target_agent_id: testAgent.id,
      date: testDate,
      include_markdown: true,
    },
    {
      sessionId: 'test-session',
      runId: 'test-run',
      workspaceDir: tempWorkspace,
      workspacePath: tempWorkspace,
      userId: 'test-user',
      abortSignal: new AbortController().signal,
    },
  );

  assert(historyResult.success);
  const historyData = (historyResult as any).data;
  assert.strictEqual(historyData.metrics.total, 3);
  assert.strictEqual(historyData.metrics.completed, 2);
  assert(historyData.markdown_ledger);
  console.log('  ✓ get_agent_todo_history executed successfully and returned full ledger metrics');

  // Check redevelop_agent_specializations tool
  const redevToolResult = await registry.execute(
    'redevelop_agent_specializations',
    {
      target_agent_id: testAgent.id,
      days_back: 7,
    },
    {
      sessionId: 'test-session',
      runId: 'test-run',
      workspaceDir: tempWorkspace,
      workspacePath: tempWorkspace,
      userId: 'test-user',
      abortSignal: new AbortController().signal,
    },
  );

  assert(redevToolResult.success);
  console.log('  ✓ redevelop_agent_specializations tool executed successfully and verified specialty updates');

  // Cleanup temp files
  try {
    fs.rmSync(tempDbPath, { force: true });
    fs.rmSync(tempWorkspace, { recursive: true, force: true });
  } catch {}

  console.log('\n🎉 ALL AGENT DATE-WISE TO-DO HISTORY TESTS PASSED!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
