import http from 'node:http';
import { AgentRunner } from '../server/features/agent/agent.runner.js';
import { CoreDatabase } from '../server/features/core/database.db.js';

async function runMockServer(responseHandler: (parsed: any, turn: number) => any) {
  let turn = 0;
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      turn++;
      const parsed = JSON.parse(raw || '{}');
      const response = responseHandler(parsed, turn);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ model: 'mock-model', ...response }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as { port: number }).port;
  return {
    server,
    url: `http://127.0.0.1:${port}`,
    getTurnCount: () => turn,
  };
}

async function testScenario1_SuccessOnFirstAttempt() {
  console.log('\n--- Scenario 1: Agent calls mark_cron_job_success on first attempt ---');
  const mock = await runMockServer((parsed) => {
    const hasToolResult = (parsed.messages || []).some((m: any) => m.role === 'tool');
    if (hasToolResult) {
      return {
        message: {
          role: 'assistant',
          content: 'I have finished memory compaction.',
          tool_calls: [{ function: { name: 'finish_task', arguments: { summary: 'Compacted 3 files' } } }],
        },
      };
    }
    return {
      message: {
        role: 'assistant',
        content: 'Compacting workspace files now.',
        tool_calls: [
          {
            function: {
              name: 'mark_cron_job_success',
              arguments: { summary: 'Workspace Markdown Compactor completed: 3 memory files compacted to ~60 lines.' },
            },
          },
        ],
      },
    };
  });

  process.env.LLM_BASE_URL = mock.url;
  const runner = AgentRunner.getInstance();
  const db = runner.getDb();

  const testAgent = db.createAgent({
    id: `test-cron-agent-1-${Date.now()}`,
    name: 'Cron Test Agent 1',
    model: 'mock-model',
    provider: 'ollama',
    system_prompt: 'You are a test cron agent.',
    cron_schedule: '0 9 * * *',
    cron_enabled: 1,
    pos_x: 0,
    pos_y: 0,
    status: 'idle',
    last_run_at: null,
    next_run_at: null,
  });

  const job = db.createAgentCronJob({
    agent_id: testAgent.id,
    name: 'Workspace Markdown Compactor',
    prompt: 'Compact memory files and call mark_cron_job_success.',
    cron_schedule: '0 9 * * *',
    enabled: 1,
  });

  const run = await runner.runAgentAndWait(testAgent.id, 'cron', job.prompt, undefined, undefined, {
    jobId: job.id,
    jobName: job.name,
  });

  mock.server.close();

  const refreshedRun = db.getRun(run.id);
  const refreshedJob = db.getCronJob(job.id);

  const checks = {
    'Run status is completed': refreshedRun?.status === 'completed',
    'Run summary contains success summary': String(refreshedRun?.summary).includes('Workspace Markdown Compactor completed'),
    'Cron job last_status is completed': refreshedJob?.last_status === 'completed',
    'No retries were needed': (mock.getTurnCount() <= 3),
  };

  let allOk = true;
  for (const [desc, ok] of Object.entries(checks)) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'} - ${desc}`);
    if (!ok) allOk = false;
  }
  if (!allOk) throw new Error('Scenario 1 failed');
}

async function testScenario2_RetrySuccessOnAttempt2() {
  console.log('\n--- Scenario 2: Agent misses tool on attempt 1, succeeds on retry 1 ---');
  const state = { attempt1Finished: false };

  const mock = await runMockServer((parsed) => {
    // Check if the prompt has RETRY ATTEMPT
    const lastUserMsg = (parsed.messages || [])
      .filter((m: any) => m.role === 'user')
      .slice(-1)[0]?.content || '';

    const isRetry = lastUserMsg.includes('CRON RETRY ATTEMPT 1');

    if (!isRetry && !state.attempt1Finished) {
      // First attempt: stops without calling mark_cron_job_success
      state.attempt1Finished = true;
      return {
        message: {
          role: 'assistant',
          content: 'I did some work but forgot to call mark_cron_job_success.',
        },
      };
    }

    // On retry: calls mark_cron_job_success
    const hasToolResult = (parsed.messages || []).some((m: any) => m.role === 'tool');
    if (hasToolResult) {
      return {
        message: {
          role: 'assistant',
          content: 'Completed on retry.',
          tool_calls: [{ function: { name: 'finish_task', arguments: { summary: 'Done on retry' } } }],
        },
      };
    }

    return {
      message: {
        role: 'assistant',
        content: 'Apologies, now calling mark_cron_job_success.',
        tool_calls: [
          {
            function: {
              name: 'mark_cron_job_success',
              arguments: { summary: 'Successfully resolved on retry 1.' },
            },
          },
        ],
      },
    };
  });

  process.env.LLM_BASE_URL = mock.url;
  const runner = AgentRunner.getInstance();
  const db = runner.getDb();

  const testAgent = db.createAgent({
    id: `test-cron-agent-2-${Date.now()}`,
    name: 'Cron Test Agent 2',
    model: 'mock-model',
    provider: 'ollama',
    system_prompt: 'You are a test cron agent.',
    cron_schedule: '0 18 * * *',
    cron_enabled: 1,
    pos_x: 0,
    pos_y: 0,
    status: 'idle',
    last_run_at: null,
    next_run_at: null,
  });

  const job = db.createAgentCronJob({
    agent_id: testAgent.id,
    name: 'Daily EOD Task Summary',
    prompt: 'Summarize today tasks and call mark_cron_job_success.',
    cron_schedule: '0 18 * * *',
    enabled: 1,
  });

  const run = await runner.runAgentAndWait(testAgent.id, 'cron', job.prompt, undefined, undefined, {
    jobId: job.id,
    jobName: job.name,
  });

  mock.server.close();

  const refreshedRun = db.getRun(run.id);
  const refreshedJob = db.getCronJob(job.id);

  const checks = {
    'Run status is completed': refreshedRun?.status === 'completed',
    'Run summary contains retry success': String(refreshedRun?.summary).includes('Successfully resolved on retry 1'),
    'Cron job last_status is completed': refreshedJob?.last_status === 'completed',
    'Retry occurred': state.attempt1Finished === true,
  };

  let allOk = true;
  for (const [desc, ok] of Object.entries(checks)) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'} - ${desc}`);
    if (!ok) allOk = false;
  }
  if (!allOk) throw new Error('Scenario 2 failed');
}

async function testScenario3_FailAfter2RetriesWithLLMRemark() {
  console.log('\n--- Scenario 3: Agent fails after 2 retries, LLM explains failure reason ---');

  const mock = await runMockServer((parsed) => {
    const lastUserMsg = (parsed.messages || [])
      .filter((m: any) => m.role === 'user')
      .slice(-1)[0]?.content || '';

    if (lastUserMsg.includes('FINAL RETRY ATTEMPT 2')) {
      // Final retry: LLM gives the explanation why it failed
      return {
        message: {
          role: 'assistant',
          content: 'Unable to complete EOD summary: GitHub token is expired and workspace files are locked.',
        },
      };
    }

    // Earlier attempts: stops without calling mark_cron_job_success
    return {
      message: {
        role: 'assistant',
        content: 'Work was partially done but not finished.',
      },
    };
  });

  process.env.LLM_BASE_URL = mock.url;
  const runner = AgentRunner.getInstance();
  const db = runner.getDb();

  const testAgent = db.createAgent({
    id: `test-cron-agent-3-${Date.now()}`,
    name: 'Cron Test Agent 3',
    model: 'mock-model',
    provider: 'ollama',
    system_prompt: 'You are a test cron agent.',
    cron_schedule: '0 20 * * *',
    cron_enabled: 1,
    pos_x: 0,
    pos_y: 0,
    status: 'idle',
    last_run_at: null,
    next_run_at: null,
  });

  const job = db.createAgentCronJob({
    agent_id: testAgent.id,
    name: 'Self-Refinement & Specialization',
    prompt: 'Refine domain knowledge and call mark_cron_job_success.',
    cron_schedule: '0 20 * * *',
    enabled: 1,
  });

  const run = await runner.runAgentAndWait(testAgent.id, 'cron', job.prompt, undefined, undefined, {
    jobId: job.id,
    jobName: job.name,
  });

  mock.server.close();

  const refreshedRun = db.getRun(run.id);
  const refreshedJob = db.getCronJob(job.id);

  const checks = {
    'Run status is failed': refreshedRun?.status === 'failed',
    'Run error captures LLM failure remark': String(refreshedRun?.error).includes('GitHub token is expired and workspace files are locked'),
    'Cron job last_status is failed': refreshedJob?.last_status === 'failed',
    'Cron job last_error captures LLM remark': String(refreshedJob?.last_error).includes('GitHub token is expired and workspace files are locked'),
  };

  let allOk = true;
  for (const [desc, ok] of Object.entries(checks)) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'} - ${desc}`);
    if (!ok) allOk = false;
  }
  if (!allOk) throw new Error('Scenario 3 failed');
}

async function main() {
  try {
    await testScenario1_SuccessOnFirstAttempt();
    await testScenario2_RetrySuccessOnAttempt2();
    await testScenario3_FailAfter2RetriesWithLLMRemark();
    console.log('\n🎉 ALL 3 CRON RETRY & VERIFICATION SCENARIOS PASSED PERFECTLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  }
}

main();
