/**
 * test-delegation-safety.ts
 *
 * Unit tests for multi-level delegation safety in AgentRunner:
 *   - Self-delegation prevention
 *   - Cycle detection (A→B→A, A→B→C→A)
 *   - Cascade sub-delegation closure (when B closes, C is auto-closed)
 *   - Suspended-chat guard (isSessionBusyWithDelegation)
 *   - Chain cleanup after delegation completes
 *
 * Run with: npx tsx tests/test-delegation-safety.ts
 */

// ─── Minimal stub of AgentRunner's delegation chain logic ────────────────────
// We test the pure logic in isolation without spinning up a real server.

type DelegationClosurePayload = {
  chatId: string;
  status: 'completed' | 'failed' | 'blocked';
  summary: string;
  deliverables?: string[];
  closedByAgentId: string;
  closedAt: string;
};

type ActiveRunContext = {
  runId: string;
  agentId: string;
  sessionId: string;
  status: 'running' | 'completed' | 'failed';
  harness?: { abort(): void };
  delegationClosure?: DelegationClosurePayload;
};

type ActiveDelegationRecord = {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  taskTitle?: string;
  sessionId?: string;
  startedAt: string;
};

// Inline the pure methods we are testing (copy of the actual implementation)
class DelegationSafetyEngine {
  private delegationChains = new Map<string, string[]>();
  private sessionParent = new Map<string, string>();
  private sessionChildren = new Map<string, Set<string>>();
  private delegationClosures = new Map<string, DelegationClosurePayload>();
  private activeDelegations = new Map<string, ActiveDelegationRecord>();
  private activeRuns = new Map<string, ActiveRunContext>();

  // ── helpers mirrored from AgentRunner ────────────────────────────────────

  getDelegationChain(sessionId: string): string[] {
    return this.delegationChains.get(sessionId) || [];
  }

  registerDelegationChain(
    callerAgentId: string,
    targetAgentId: string,
    childSessionId: string,
    parentSessionId?: string,
  ): { allowed: boolean; reason?: string } {
    if (callerAgentId === targetAgentId) {
      return {
        allowed: false,
        reason: `Self-delegation is not allowed: agent "${callerAgentId}" cannot delegate a task to itself.`,
      };
    }

    const ancestorChain: string[] = parentSessionId
      ? [...(this.delegationChains.get(parentSessionId) || [])]
      : [];

    if (ancestorChain.includes(targetAgentId)) {
      const visual = [...ancestorChain, callerAgentId, targetAgentId].join(' → ');
      return {
        allowed: false,
        reason: `Circular delegation detected: agent "${targetAgentId}" is already in the delegation chain [${visual}].`,
      };
    }

    const newChain = parentSessionId
      ? [...ancestorChain, targetAgentId]
      : [callerAgentId, targetAgentId];
    this.delegationChains.set(childSessionId, newChain);

    if (parentSessionId) {
      this.sessionParent.set(childSessionId, parentSessionId);
      const siblings = this.sessionChildren.get(parentSessionId) || new Set<string>();
      siblings.add(childSessionId);
      this.sessionChildren.set(parentSessionId, siblings);
    }

    return { allowed: true };
  }

  isSessionBusyWithDelegation(sessionId: string): boolean {
    for (const del of this.activeDelegations.values()) {
      if (del.sessionId === sessionId) return true;
    }
    return false;
  }

  recordDelegationClosure(sessionId: string, closure: DelegationClosurePayload): void {
    this.delegationClosures.set(sessionId, closure);
    const run = this.getRunForSession(sessionId);
    if (run) run.delegationClosure = closure;
  }

  getDelegationClosure(sessionId: string): DelegationClosurePayload | undefined {
    return this.delegationClosures.get(sessionId);
  }

  propagateSubDelegationClose(parentSessionId: string, closedByAgentId: string): void {
    const children = this.sessionChildren.get(parentSessionId);
    if (!children || children.size === 0) return;

    for (const childSessionId of children) {
      const childRun = this.getRunForSession(childSessionId);
      if (!childRun) continue;
      if (this.delegationClosures.has(childSessionId)) continue;

      const cascadeClosure: DelegationClosurePayload = {
        chatId: childSessionId,
        status: 'failed',
        summary: `Parent session "${parentSessionId}" was closed by agent "${closedByAgentId}". Sub-delegation terminated.`,
        deliverables: [],
        closedByAgentId,
        closedAt: new Date().toISOString(),
      };

      this.recordDelegationClosure(childSessionId, cascadeClosure);

      try {
        childRun.harness?.abort();
      } catch {}

      this.propagateSubDelegationClose(childSessionId, closedByAgentId);
    }
  }

  cleanupDelegationChain(sessionId: string): void {
    const parentSessionId = this.sessionParent.get(sessionId);
    if (parentSessionId) {
      const siblings = this.sessionChildren.get(parentSessionId);
      if (siblings) {
        siblings.delete(sessionId);
        if (siblings.size === 0) this.sessionChildren.delete(parentSessionId);
      }
      this.sessionParent.delete(sessionId);
    }
    this.delegationChains.delete(sessionId);
  }

  // ── test helpers ─────────────────────────────────────────────────────────

  registerActiveDelegation(sourceAgentId: string, targetAgentId: string, sessionId: string): string {
    const id = `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.activeDelegations.set(id, { id, sourceAgentId, targetAgentId, sessionId, startedAt: new Date().toISOString() });
    return id;
  }

  unregisterActiveDelegation(id: string): void {
    this.activeDelegations.delete(id);
  }

  addActiveRun(run: ActiveRunContext): void {
    this.activeRuns.set(run.runId, run);
  }

  getRunForSession(sessionId: string): ActiveRunContext | undefined {
    for (const run of this.activeRuns.values()) {
      if (run.sessionId === sessionId && run.status === 'running') return run;
    }
    return undefined;
  }
}

// ─── Test runner ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// ─── Scenario 1: Self-delegation rejected ────────────────────────────────────
{
  console.log('\n── Scenario 1: Self-delegation rejected ──');
  const engine = new DelegationSafetyEngine();
  const result = engine.registerDelegationChain('agent1', 'agent1', 'session_self', undefined);
  assert(!result.allowed, 'registerDelegationChain returns allowed=false for self-delegation');
  assert(result.reason?.includes('Self-delegation') ?? false, 'Reason mentions "Self-delegation"');
  assert(engine.getDelegationChain('session_self').length === 0, 'No chain stored for rejected delegation');
}

// ─── Scenario 2: Two-level cycle (A→B→A) rejected ────────────────────────────
{
  console.log('\n── Scenario 2: Two-level cycle (A→B→A) rejected ──');
  const engine = new DelegationSafetyEngine();

  // A delegates to B on session_ab
  const r1 = engine.registerDelegationChain('agent1', 'agent2', 'session_ab', undefined);
  assert(r1.allowed, 'A→B delegation allowed');
  assert(engine.getDelegationChain('session_ab').join(',') === 'agent1,agent2', 'Chain is [agent1,agent2]');

  // B then tries to delegate back to A on session_ba (parent = session_ab)
  const r2 = engine.registerDelegationChain('agent2', 'agent1', 'session_ba', 'session_ab');
  assert(!r2.allowed, 'B→A delegation blocked (cycle)');
  assert(r2.reason?.includes('Circular') ?? false, 'Reason mentions "Circular"');
  assert(engine.getDelegationChain('session_ba').length === 0, 'No chain stored for cycle attempt');
}

// ─── Scenario 3: Three-level chain (A→B→C) allowed ───────────────────────────
{
  console.log('\n── Scenario 3: Three-level chain (A→B→C) allowed ──');
  const engine = new DelegationSafetyEngine();

  const r1 = engine.registerDelegationChain('agent1', 'agent2', 'session_ab', undefined);
  assert(r1.allowed, 'A→B allowed');

  const r2 = engine.registerDelegationChain('agent2', 'agent3', 'session_bc', 'session_ab');
  assert(r2.allowed, 'B→C allowed (no cycle)');
  assert(engine.getDelegationChain('session_bc').join(',') === 'agent1,agent2,agent3', 'Chain is [agent1,agent2,agent3]');
}

// ─── Scenario 4: Four-level cycle (A→B→C→A) rejected ────────────────────────
{
  console.log('\n── Scenario 4: Three-level cycle (A→B→C→A) rejected ──');
  const engine = new DelegationSafetyEngine();

  engine.registerDelegationChain('agent1', 'agent2', 'session_ab', undefined);
  engine.registerDelegationChain('agent2', 'agent3', 'session_bc', 'session_ab');

  // C tries to call A — should be blocked
  const r3 = engine.registerDelegationChain('agent3', 'agent1', 'session_ca', 'session_bc');
  assert(!r3.allowed, 'C→A blocked (cycle through chain)');
  assert(r3.reason?.includes('Circular') ?? false, 'Reason mentions "Circular"');
}

// ─── Scenario 5: Cascade sub-delegation closure ───────────────────────────────
{
  console.log('\n── Scenario 5: Cascade close — B closes, C auto-closed ──');
  const engine = new DelegationSafetyEngine();

  // A→B on session_ab
  engine.registerDelegationChain('agent1', 'agent2', 'session_ab', undefined);
  // B→C on session_bc (child of session_ab)
  engine.registerDelegationChain('agent2', 'agent3', 'session_bc', 'session_ab');

  // Register a fake running run for C on session_bc
  let aborted = false;
  engine.addActiveRun({
    runId: 'run_c',
    agentId: 'agent3',
    sessionId: 'session_bc',
    status: 'running',
    harness: { abort() { aborted = true; } },
  });

  // B closes its task on session_ab → should cascade-close session_bc
  engine.propagateSubDelegationClose('session_ab', 'agent2');

  const closureOnC = engine.getDelegationClosure('session_bc');
  assert(closureOnC !== undefined, 'session_bc got a cascade closure');
  assert(closureOnC?.status === 'failed', 'Cascade closure status is "failed"');
  assert(closureOnC?.summary.includes('Parent session') ?? false, 'Summary mentions parent session');
  assert(aborted, 'Harness abort() was called on child run');
}

// ─── Scenario 6: Suspended-chat guard ─────────────────────────────────────────
{
  console.log('\n── Scenario 6: Suspended-chat guard ──');
  const engine = new DelegationSafetyEngine();

  // Register an active delegation on session_busy
  engine.registerActiveDelegation('agent1', 'agent2', 'session_busy');
  assert(engine.isSessionBusyWithDelegation('session_busy'), 'Session is busy with active delegation');
  assert(!engine.isSessionBusyWithDelegation('session_free'), 'Other session is not busy');
}

// ─── Scenario 7: Chain cleanup after completion ───────────────────────────────
{
  console.log('\n── Scenario 7: Chain cleanup after completion ──');
  const engine = new DelegationSafetyEngine();

  engine.registerDelegationChain('agent1', 'agent2', 'session_ab', undefined);
  engine.registerDelegationChain('agent2', 'agent3', 'session_bc', 'session_ab');

  assert(engine.getDelegationChain('session_bc').length > 0, 'session_bc chain exists before cleanup');

  engine.cleanupDelegationChain('session_bc');
  assert(engine.getDelegationChain('session_bc').length === 0, 'session_bc chain cleared after cleanup');

  // session_ab should no longer list session_bc as a child
  // (we can verify by trying another child and seeing siblings set is handled)
  engine.cleanupDelegationChain('session_ab');
  assert(engine.getDelegationChain('session_ab').length === 0, 'session_ab chain cleared after cleanup');
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n══════════════════════════════════`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('❌ Some tests FAILED');
  process.exit(1);
} else {
  console.log('✅ All delegation safety tests passed!');
}
