import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export interface GitRepoInfo {
  repoKey: string;
  repoSlug: string;
  repoName: string;
  owner?: string;
  remoteUrl?: string;
  rootPath: string;
  branch?: string;
}

export interface RepoMemoryPaths {
  dir: string;
  readmeFile: string;
  insightsFile: string;
  featuresFile: string;
  exploreFile: string;
  historyFile: string;
  metadataFile: string;
}

export interface RepoMetadata {
  repo_key: string;
  repo_slug: string;
  repo_name: string;
  owner?: string;
  remote_url?: string;
  root_path: string;
  branch?: string;
  created_at: string;
  updated_at: string;
  contributing_agents: Array<{
    agent_id: string;
    agent_name: string;
    last_run_at: string;
    task_count: number;
  }>;
}

const writeIfMissing = (file: string, content: string) => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, content, 'utf8');
  }
};

/**
 * Detect if a directory or any of its parents is inside a git repository,
 * and extract GitHub / remote origin details.
 */
export const detectGitRepository = (startPath: string): GitRepoInfo | null => {
  if (!startPath || !fs.existsSync(startPath)) {
    return null;
  }

  let current = path.resolve(startPath);
  const root = path.parse(current).root;
  let gitDir: string | null = null;
  let repoRoot: string | null = null;

  while (current && current !== root) {
    const candidate = path.join(current, '.git');
    if (fs.existsSync(candidate)) {
      gitDir = candidate;
      repoRoot = current;
      break;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  if (!gitDir || !repoRoot) {
    return null;
  }

  let remoteUrl: string | undefined;

  // 1. Try reading .git/config directly (fast, no subprocess)
  try {
    const configPath = fs.statSync(gitDir).isDirectory()
      ? path.join(gitDir, 'config')
      : gitDir; // submodule or git-worktree .git file
    if (fs.existsSync(configPath)) {
      const configText = fs.readFileSync(configPath, 'utf8');
      const match = configText.match(/\[remote\s+"origin"\][^\[]*?url\s*=\s*([^\r\n]+)/);
      if (match && match[1]) {
        remoteUrl = match[1].trim();
      }
    }
  } catch {}

  // 2. Fallback to git command
  if (!remoteUrl) {
    try {
      remoteUrl = execSync('git config --get remote.origin.url', {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'ignore'],
        encoding: 'utf8',
        timeout: 1000,
      }).trim();
    } catch {}
  }

  // Detect current branch
  let branch: string | undefined;
  try {
    const headPath = path.join(gitDir, 'HEAD');
    if (fs.existsSync(headPath)) {
      const headContent = fs.readFileSync(headPath, 'utf8').trim();
      if (headContent.startsWith('ref: refs/heads/')) {
        branch = headContent.replace('ref: refs/heads/', '');
      } else {
        branch = headContent.slice(0, 8);
      }
    }
  } catch {}

  const folderName = path.basename(repoRoot);
  let owner: string | undefined;
  let repoName = folderName;
  let repoSlug = folderName;
  let repoKey = folderName.replace(/[^a-z0-9_-]+/gi, '_');

  if (remoteUrl) {
    // Parse formats:
    // https://github.com/owner/repo.git or git@github.com:owner/repo.git
    const match = remoteUrl.match(/(?:[:/])([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?$/);
    if (match) {
      owner = match[1];
      repoName = match[2];
      repoSlug = `${owner}/${repoName}`;
      repoKey = `${owner}_${repoName}`.replace(/[^a-z0-9_-]+/gi, '_');
    }
  }

  return {
    repoKey,
    repoSlug,
    repoName,
    owner,
    remoteUrl,
    rootPath: repoRoot,
    branch,
  };
};

/** Build paths for a repository's common memory area */
export const buildRepoMemoryPaths = (commonRoot: string, repoKey: string): RepoMemoryPaths => {
  const dir = path.join(commonRoot, 'repositories', repoKey);
  return {
    dir,
    readmeFile: path.join(dir, 'README.md'),
    insightsFile: path.join(dir, 'insights.md'),
    featuresFile: path.join(dir, 'features.md'),
    exploreFile: path.join(dir, 'explore.md'),
    historyFile: path.join(dir, 'history.md'),
    metadataFile: path.join(dir, 'metadata.json'),
  };
};

const SEED_README = (info: GitRepoInfo) => `# Shared Repository Memory — ${info.repoSlug}

- **Repository**: \`${info.repoSlug}\`
- **Remote Origin**: ${info.remoteUrl || '(local repository)'}
- **Root Path**: \`${info.rootPath}\`
- **Branch**: ${info.branch || 'main'}

This folder is a **shared cross-agent knowledge base** for this repository.
All agents working on this project read and contribute to these files so insights,
feature plans, codebase exploration, and task history persist across all agents.

| File | Purpose |
| --- | --- |
| \`insights.md\` | Architectural patterns, tech stack conventions, quirks & gotchas |
| \`features.md\` | Feature catalog, planned capabilities, requirements & specs |
| \`explore.md\` | Codebase map: key routes, entry points, pages, component hierarchies |
| \`history.md\` | Cross-agent work log: tasks performed, PRs/branches, outcomes |
| \`metadata.json\` | Metadata & contributing agents registry |
`;

const SEED_INSIGHTS = (info: GitRepoInfo) => `# Project Insights & Architecture — ${info.repoSlug}

Deep architectural insights, framework conventions, quirks, gotchas, and environment setups discovered by agents working on this repository.

## Tech Stack & Architecture Overview
- **Primary Languages**:
- **Frameworks & Libraries**:
- **Build / Dev Tools**:
- **Package Manager**:

## Core Conventions & Patterns
<!-- Add architectural decisions, state management patterns, and coding conventions -->

## Quirks, Gotchas & Known Pitfalls
<!-- Document tricky edge cases, build issues, or environment prerequisites -->
`;

const SEED_FEATURES = (info: GitRepoInfo) => `# Feature Descriptions & Plans — ${info.repoSlug}

Catalog of features, roadmap plans, functional specifications, and user flows for this repository.

## Implemented Features
<!-- Document existing major features and how they work -->

## In-Progress & Planned Features
<!-- Document current roadmap items, proposed capabilities, or pending enhancements -->

## Feature Specifications & Requirements
<!-- Document detailed behavior expectations, user stories, and APIs -->
`;

const SEED_EXPLORE = (info: GitRepoInfo) => `# Codebase Exploration & Page Map — ${info.repoSlug}

Navigation guide for agents: directory layout, key pages/routes, component hierarchies, and entry points.

## Top-Level Directory Map
<!-- Breakdown of folders and their responsibilities -->

## Key Entry Points & Services
<!-- Core backend entry points, API routes, or main app initialization -->

## Frontend Pages & Routes
<!-- List of UI pages, routes, views, and core components -->

## Data Models & Stores
<!-- Important data structures, database schemas, and store locations -->
`;

const SEED_HISTORY = (info: GitRepoInfo, agentName: string) => `# Cross-Agent Activity History — ${info.repoSlug}

Chronological record of tasks executed on this repository by different agents.

## Log

### ${new Date().toISOString().split('T')[0]} — Initialized by ${agentName}
- Common repository memory initialized.
`;

/**
 * Ensure the shared repository memory directory and its markdown files exist,
 * and record the current agent in metadata and history.
 */
export const ensureRepoMemory = (
  commonRoot: string,
  repoInfo: GitRepoInfo,
  agentId: string,
  agentName: string,
  taskPrompt?: string,
): RepoMemoryPaths => {
  const paths = buildRepoMemoryPaths(commonRoot, repoInfo.repoKey);

  try {
    fs.mkdirSync(paths.dir, { recursive: true });

    writeIfMissing(paths.readmeFile, SEED_README(repoInfo));
    writeIfMissing(paths.insightsFile, SEED_INSIGHTS(repoInfo));
    writeIfMissing(paths.featuresFile, SEED_FEATURES(repoInfo));
    writeIfMissing(paths.exploreFile, SEED_EXPLORE(repoInfo));
    writeIfMissing(paths.historyFile, SEED_HISTORY(repoInfo, agentName));

    const now = new Date().toISOString();
    let meta: RepoMetadata;

    if (fs.existsSync(paths.metadataFile)) {
      try {
        meta = JSON.parse(fs.readFileSync(paths.metadataFile, 'utf8'));
      } catch {
        meta = {
          repo_key: repoInfo.repoKey,
          repo_slug: repoInfo.repoSlug,
          repo_name: repoInfo.repoName,
          owner: repoInfo.owner,
          remote_url: repoInfo.remoteUrl,
          root_path: repoInfo.rootPath,
          branch: repoInfo.branch,
          created_at: now,
          updated_at: now,
          contributing_agents: [],
        };
      }
    } else {
      meta = {
        repo_key: repoInfo.repoKey,
        repo_slug: repoInfo.repoSlug,
        repo_name: repoInfo.repoName,
        owner: repoInfo.owner,
        remote_url: repoInfo.remoteUrl,
        root_path: repoInfo.rootPath,
        branch: repoInfo.branch,
        created_at: now,
        updated_at: now,
        contributing_agents: [],
      };
    }

    meta.updated_at = now;
    meta.branch = repoInfo.branch || meta.branch;
    meta.remote_url = repoInfo.remoteUrl || meta.remote_url;

    const existingAgent = meta.contributing_agents.find((a) => a.agent_id === agentId);
    if (existingAgent) {
      existingAgent.last_run_at = now;
      existingAgent.agent_name = agentName;
      existingAgent.task_count = (existingAgent.task_count || 1) + 1;
    } else {
      meta.contributing_agents.push({
        agent_id: agentId,
        agent_name: agentName,
        last_run_at: now,
        task_count: 1,
      });
    }

    fs.writeFileSync(paths.metadataFile, JSON.stringify(meta, null, 2) + '\n', 'utf8');

    // Also register in root repositories.json catalog
    const catalogFile = path.join(commonRoot, 'repositories.json');
    let catalog: Record<string, unknown> = {};
    try {
      if (fs.existsSync(catalogFile)) {
        catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
      }
    } catch {}

    const repos = (catalog.repositories as Record<string, unknown>) || {};
    repos[repoInfo.repoKey] = {
      key: repoInfo.repoKey,
      slug: repoInfo.repoSlug,
      name: repoInfo.repoName,
      owner: repoInfo.owner,
      remote_url: repoInfo.remoteUrl,
      root_path: repoInfo.rootPath,
      branch: repoInfo.branch,
      updated_at: now,
      agents_count: meta.contributing_agents.length,
      memory_dir: paths.dir,
    };
    catalog.updated_at = now;
    catalog.repositories = repos;
    fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + '\n', 'utf8');

    // If a task prompt is present, append a concise note to history.md
    if (taskPrompt && taskPrompt.trim()) {
      try {
        const shortPrompt = taskPrompt.trim().slice(0, 160).replace(/[\r\n]+/g, ' ');
        const entry = `\n### ${now.split('T')[0]} — ${agentName} (${agentId})\n- **Task**: ${shortPrompt}\n`;
        fs.appendFileSync(paths.historyFile, entry, 'utf8');
      } catch {}
    }
  } catch (err) {
    console.warn(`[agent.repo-memory] Failed to ensure repository memory for ${repoInfo.repoSlug}:`, err);
  }

  return paths;
};

/**
 * Generate the system prompt block for common repository memory.
 * Instructs the agent on how to use and contribute to the cross-agent repository memory.
 */
export const repoMemoryPrompt = (
  repoInfo: GitRepoInfo,
  paths: RepoMemoryPaths,
): string => `## SHARED REPOSITORY MEMORY — ${repoInfo.repoSlug} (cross-agent project knowledge)
You are operating inside the Git repository "${repoInfo.repoSlug}" at "${repoInfo.rootPath}".
This repository has a shared cross-agent memory folder at:
"${paths.dir}"

Every agent working on this project shares this memory to build cumulative understanding of the codebase.
These files are safe to read with \`read_file\` and update with \`write_file\` or \`edit_file\`:

1. \`${paths.insightsFile}\` — Architectural insights, tech stack, conventions, patterns, quirks, gotchas.
2. \`${paths.featuresFile}\` — Feature descriptions, capabilities, roadmap plans, requirements.
3. \`${paths.exploreFile}\` — Codebase exploration map: key routes, entry points, pages, component hierarchies.
4. \`${paths.historyFile}\` — Activity log of tasks completed by all agents on this project.

### Repository memory rules:
- **BEFORE starting non-trivial tasks**: inspect \`insights.md\`, \`features.md\`, and \`explore.md\` to see what prior agents have learned, avoiding duplicate research and respecting established codebase patterns.
- **DURING/AFTER your run**: when you discover architectural quirks, map new components/routes, or implement/plan features, UPDATE these shared repository memory files so other agents benefit from your work.
- Keep entries factual, concise, and structured.`;

/**
 * Read the summary/content of the common repo memory files for API / UI display.
 */
export const getRepoMemorySummary = (commonRoot: string, repoKey: string) => {
  const paths = buildRepoMemoryPaths(commonRoot, repoKey);
  if (!fs.existsSync(paths.dir)) return null;

  const readSafe = (file: string) => {
    try {
      if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
    } catch {}
    return '';
  };

  let metadata: RepoMetadata | null = null;
  try {
    if (fs.existsSync(paths.metadataFile)) {
      metadata = JSON.parse(fs.readFileSync(paths.metadataFile, 'utf8'));
    }
  } catch {}

  return {
    dir: paths.dir,
    metadata,
    insights: readSafe(paths.insightsFile),
    features: readSafe(paths.featuresFile),
    explore: readSafe(paths.exploreFile),
    history: readSafe(paths.historyFile),
    files: {
      readme: paths.readmeFile,
      insights: paths.insightsFile,
      features: paths.featuresFile,
      explore: paths.exploreFile,
      history: paths.historyFile,
      metadata: paths.metadataFile,
    },
  };
};
