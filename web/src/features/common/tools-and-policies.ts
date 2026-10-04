export interface BuiltinToolMeta {
  name: string;
  label: string;
  category: 'Filesystem' | 'Terminal' | 'Search' | 'Git' | 'Agent' | 'Skills & MCP';
  description: string;
}

export const BUILTIN_TOOLS: BuiltinToolMeta[] = [
  // Filesystem (9)
  { name: 'read_file', label: 'Read File', category: 'Filesystem', description: 'Inspect file contents with optional line range offsets' },
  { name: 'write_file', label: 'Write File', category: 'Filesystem', description: 'Create new files or overwrite existing files in workspace' },
  { name: 'edit_file', label: 'Edit File', category: 'Filesystem', description: 'Single contiguous block replacement with exact string match' },
  { name: 'line_edit', label: 'Line Edit', category: 'Filesystem', description: 'Insert, replace, or delete lines by line numbers' },
  { name: 'replace_lines', label: 'Replace Lines', category: 'Filesystem', description: 'Drop-in replacement for specified line intervals' },
  { name: 'apply_patch', label: 'Apply Patch', category: 'Filesystem', description: 'Apply standard unified diff patch files to source trees' },
  { name: 'delete_file', label: 'Delete File', category: 'Filesystem', description: 'Permanently remove files with safety guards' },
  { name: 'list_dir', label: 'List Directory', category: 'Filesystem', description: 'Enumerate directory files, sizes, and folder structure' },
  { name: 'inspect_dir', label: 'Inspect Directory', category: 'Filesystem', description: 'Deep overview of workspace tree and directory statistics' },

  // Terminal (2)
  { name: 'run_command', label: 'Run Shell Command', category: 'Terminal', description: 'Execute bash/shell command with stdout and exit codes' },
  { name: 'run_test', label: 'Run Tests', category: 'Terminal', description: 'Execute project test suite and analyze pass/fail statistics' },

  // Search (2)
  { name: 'glob_find', label: 'Glob Pattern Search', category: 'Search', description: 'Fast pattern matching to find filenames across directories' },
  { name: 'grep_search', label: 'Grep Regex Search', category: 'Search', description: 'Ripgrep pattern searching across codebase files' },

  // Git (3)
  { name: 'git_status', label: 'Git Status', category: 'Git', description: 'View current git working tree modifications and staged files' },
  { name: 'git_diff', label: 'Git Diff', category: 'Git', description: 'Inspect uncommitted changes and branch differences' },
  { name: 'git_log', label: 'Git Commit Log', category: 'Git', description: 'Review recent commit history and author messages' },

  // Agent (4)
  { name: 'ask_user', label: 'Ask User Question', category: 'Agent', description: 'Pause execution to ask user a blocking or clarifying question' },
  { name: 'context_manage', label: 'Sub-Context Manager', category: 'Agent', description: 'Activate and deactivate dynamic domain sub-contexts' },
  { name: 'finish_task', label: 'Finish Task & Finalize', category: 'Agent', description: 'Signal task completion with final prose report summary' },
  { name: 'todo_write', label: 'Update Task TODOs', category: 'Agent', description: 'Maintain step-by-step progress checklist for the run' },

  // Skills & MCP (4)
  { name: 'mcp_inspect', label: 'Inspect Stock MCPs', category: 'Skills & MCP', description: 'Discover available external MCP server capabilities' },
  { name: 'mcp_approve', label: 'Request MCP Approval', category: 'Skills & MCP', description: 'Ask user permission to attach a new MCP server' },
  { name: 'skill_list', label: 'List Registered Skills', category: 'Skills & MCP', description: 'Catalog all available just-in-time skills' },
  { name: 'skill_use', label: 'Activate Skill', category: 'Skills & MCP', description: 'Load specialized domain instructions into run context' },
];

export interface StockPolicy {
  id: string;
  name: string;
  rule: string;
  description: string;
  category: 'Safety' | 'Quality' | 'Security' | 'Scope';
}

export const STOCK_POLICIES: StockPolicy[] = [
  {
    id: 'readonly-guard',
    name: 'Read-Only Guard',
    rule: 'Never delete or permanently overwrite existing project files. If changes are requested, inspect first and ask before destructive actions.',
    description: 'Prohibits delete_file and destructive modifications.',
    category: 'Safety',
  },
  {
    id: 'security-secrets',
    name: 'Secret Shield',
    rule: 'Never print, log, or commit environment variables, API keys, private tokens, or authentication credentials in answers or files.',
    description: 'Strictly blocks token leakage and credentials exposure.',
    category: 'Security',
  },
  {
    id: 'verify-first',
    name: 'Verification Gate',
    rule: 'Always run verification or tests (e.g. typecheck or run_test) and confirm everything passes before calling finish_task.',
    description: 'Mandates test execution before finishing any task.',
    category: 'Quality',
  },
  {
    id: 'repo-bounded',
    name: 'Workspace Boundary',
    rule: 'Stay strictly within the current workspace project directory. Never inspect, read, or modify parent directories, system files, or /tmp.',
    description: 'Confines all agent operations within the active project root.',
    category: 'Scope',
  },
  {
    id: 'no-git-push',
    name: 'No Remote Git Mutation',
    rule: 'Do not run git push, git reset --hard, or force operations that can mutate remote branches or erase git history.',
    description: 'Safeguards remote git repositories from inadvertent pushes.',
    category: 'Safety',
  },
  {
    id: 'concise-reports',
    name: 'Clean Executive Summary',
    rule: 'Provide structured, crisp executive summaries in finish_task with bullet points of changes made, without dumping raw json or verbose logs.',
    description: 'Ensures final deliverables are clear and user-friendly.',
    category: 'Quality',
  },
];
