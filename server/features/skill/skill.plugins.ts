import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** The original curated batch was verified on this date; newer rows carry their own. */
const DEFAULT_VERIFIED_AT = '2026-10-04';

export interface GitHubPluginEntry {
  repo: string;
  stars: number;
  license: string;
  description: string;
  category: string;
  usage: string;
  npmPackage?: string;
  /** GitHub API snapshot date for this row's star count. */
  verified?: string;
}

export interface PluginSkillItem {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
  isPlugin: boolean;
  repo: string;
  stars?: number;
  license?: string;
}

export function pluginToSkillItem(plugin: GitHubPluginEntry): PluginSkillItem {
  const parts = plugin.repo.split('/');
  const owner = parts[0] || '';
  const repoName = parts[1] || plugin.repo;
  const install = plugin.npmPackage
    ? `npx -y ${plugin.npmPackage}`
    : `git clone https://github.com/${plugin.repo}.git`;

  return {
    id: `plugin:${plugin.repo}`,
    name: plugin.repo,
    description: plugin.description,
    category: plugin.category || 'Skills',
    tags: ['plugin', (plugin.category || '').toLowerCase(), (plugin.license || '').toLowerCase(), owner, repoName],
    content: [
      `# ${plugin.repo}`,
      '',
      plugin.description,
      '',
      '## Provenance',
      `- Repository: https://github.com/${plugin.repo}`,
      `- Stars: ~${(plugin.stars || 0).toLocaleString()} (GitHub API snapshot, ${plugin.verified ?? DEFAULT_VERIFIED_AT})`,
      `- License: ${plugin.license || 'Open Source'}`,
      `- Category: ${plugin.category || 'Skills'}`,
      '',
      '## How to use it',
      plugin.usage || `Teach your agent to leverage ${plugin.repo} directives and workflows.`,
      '',
      '## Getting it locally',
      '```bash',
      install,
      '```',
      '',
      `Read the README of ${plugin.repo} before relying on its interfaces.`,
    ].join('\n'),
    isPlugin: true,
    repo: plugin.repo,
    stars: plugin.stars,
    license: plugin.license,
  };
}

let cachedPluginSkills: PluginSkillItem[] | null = null;

export function loadGitHubPluginSkills(): PluginSkillItem[] {
  if (cachedPluginSkills) return cachedPluginSkills;

  const jsonPath = join(__dirname, 'skill.plugins.json');
  if (!existsSync(jsonPath)) {
    return [];
  }

  try {
    const raw = readFileSync(jsonPath, 'utf8');
    const list = JSON.parse(raw) as GitHubPluginEntry[];
    cachedPluginSkills = list.map(pluginToSkillItem);
    return cachedPluginSkills;
  } catch (err) {
    console.warn('[skill.plugins] Failed to load skill.plugins.json:', err);
    return [];
  }
}
