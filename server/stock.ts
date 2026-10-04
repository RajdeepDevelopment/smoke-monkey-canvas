export interface StockMcp {
  name: string;
  label: string;
  category: string;
  description: string;
  command?: string;
  args?: string[];
  url?: string;
  envKeys: string[];
  keyGetUrl?: string;
  keyGetLabel?: string;
}

export const STOCK_MCPS: StockMcp[] = [
  {
    name: 'firecrawl-mcp',
    label: 'Firecrawl',
    category: 'Web & Scraping',
    description: 'Scrape, crawl, and search the web for AI agents — perfect for background job searches, price monitors, and research.',
    command: 'npx',
    args: ['-y', 'firecrawl-mcp'],
    envKeys: ['FIRECRAWL_API_KEY'],
    keyGetUrl: 'https://firecrawl.dev',
    keyGetLabel: 'Get FIRECRAWL_API_KEY',
  },
  {
    name: 'tavily-mcp',
    label: 'Tavily Search',
    category: 'Web & Scraping',
    description: 'Fast, AI-native web search engine tailored for LLMs and autonomous agents.',
    command: 'npx',
    args: ['-y', 'tavily-mcp@latest'],
    envKeys: ['TAVILY_API_KEY'],
    keyGetUrl: 'https://app.tavily.com',
    keyGetLabel: 'Get TAVILY_API_KEY',
  },
  {
    name: 'github-mcp-server',
    label: 'GitHub',
    category: 'Code & Git',
    description: 'Inspect repositories, issues, pull requests, files, and automate GitHub operations.',
    command: 'npx',
    args: ['-y', 'github-mcp-server'],
    envKeys: ['GITHUB_TOKEN'],
    keyGetUrl: 'https://github.com/settings/tokens',
    keyGetLabel: 'Get GITHUB_TOKEN',
  },
  {
    name: 'filesystem-mcp',
    label: 'Local Filesystem',
    category: 'Code & Git',
    description: 'Read, write, search, and list local filesystem directories with controlled boundaries.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem'],
    envKeys: [],
  },
  {
    name: 'sqlite',
    label: 'SQLite Database',
    category: 'Databases & Storage',
    description: 'Query and manage local SQLite databases with SQL queries and schema introspection.',
    command: 'npx',
    args: ['-y', '@socketkit/sqlite-mcp'],
    envKeys: [],
  },
  {
    name: 'postgres-mcp-server',
    label: 'PostgreSQL',
    category: 'Databases & Storage',
    description: 'Run SQL queries, inspect tables, schemas, and performance on PostgreSQL databases.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    envKeys: ['POSTGRES_URL'],
  },
  {
    name: 'playwright-mcp',
    label: 'Playwright Browser',
    category: 'Web & Scraping',
    description: 'Autonomous browser navigation, clicking, typing, taking screenshots, and verifying web applications.',
    command: 'npx',
    args: ['-y', '@playwright/mcp@latest'],
    envKeys: [],
  },
  {
    name: 'exa-mcp',
    label: 'Exa Neural Search',
    category: 'Web & Scraping',
    description: 'Semantic neural web search engine optimized for finding research papers, companies, and content.',
    command: 'npx',
    args: ['-y', 'exa-mcp-server'],
    envKeys: ['EXA_API_KEY'],
    keyGetUrl: 'https://exa.ai',
    keyGetLabel: 'Get EXA_API_KEY',
  },
  {
    name: 'memory-mcp',
    label: 'Knowledge Memory Graph',
    category: 'AI & Knowledge',
    description: 'Persistent knowledge graph memory allowing the agent to remember facts, relations, and context across turns.',
    command: 'npx',
    args: ['-y', 'memory-mcp'],
    envKeys: [],
  },
];
