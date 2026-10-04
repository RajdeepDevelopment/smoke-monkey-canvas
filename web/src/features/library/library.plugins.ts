import type { StockSkillItem, LibraryPlugin, PluginCategory } from './library.types.js';

export type { LibraryPlugin, PluginCategory };

/**
 * Curated catalog of widely used, GitHub-hosted agent plugins and skill packs.
 *
 * Every entry was verified against the GitHub REST API on `VERIFIED_AT`; star
 * counts are an explicit point-in-time snapshot rather than a live lookup, so
 * the UI labels them as approximate. Repositories below the 2,000-star floor
 * are intentionally excluded.
 */
export const VERIFIED_AT = '2026-10-04';

/** Minimum popularity gate applied when curating this list. */
export const PLUGIN_MIN_STARS = 2000;

const PLUGINS: LibraryPlugin[] = [
  {
    repo: 'anthropics/skills',
    stars: 179577,
    license: 'Unlicensed',
    description: 'Official Agent Skills reference repository from Anthropic.',
    category: 'Skills',
    usage:
      'Reference the skill authoring format. Point doc/pdf/pptx/xlsx work at these bundled skills for consistent document handling.',
  },
  {
    repo: 'obra/superpowers',
    stars: 295055,
    license: 'MIT',
    description: 'An agentic skills framework and software development methodology.',
    category: 'Skills',
    usage:
      'Apply disciplined TDD, planning and review loops. Follow the methodology stages before writing code.',
  },
  {
    repo: 'punkpeye/awesome-mcp-servers',
    stars: 95810,
    license: 'MIT',
    description: 'The largest curated collection of MCP servers.',
    category: 'MCP Registries',
    usage:
      'Browse this directory when an integration is missing from the stock catalog to find the right MCP server for a capability.',
  },
  {
    repo: 'modelcontextprotocol/servers',
    stars: 90994,
    license: 'Other',
    description: 'Reference MCP server implementations maintained by the protocol authors.',
    category: 'MCP Servers',
    usage:
      'Consult for canonical request/response shapes when building or debugging an MCP server integration.',
  },
  {
    repo: 'anthropics/claude-code',
    stars: 149339,
    license: 'Unlicensed',
    description: 'Anthropic agentic coding tool for the terminal.',
    category: 'Agent Runtimes',
    usage:
      'Mirror its permission model and tool-use conventions: plan, confirm destructive actions, and keep edits scoped.',
  },
  {
    repo: 'openai/codex',
    stars: 127793,
    license: 'Apache-2.0',
    description: 'Lightweight coding agent that runs in your terminal.',
    category: 'Agent Runtimes',
    usage:
      'Adopt its sandboxed, approval-gated execution model when running untrusted commands.',
  },
  {
    repo: 'google-gemini/gemini-cli',
    stars: 107227,
    license: 'Apache-2.0',
    description: 'Open-source agent bringing Gemini directly into your terminal.',
    category: 'Agent Runtimes',
    usage:
      'Use as a reference for large-context repository exploration strategies.',
  },
  {
    repo: 'ComposioHQ/awesome-claude-skills',
    stars: 76453,
    license: 'Unlicensed',
    description: 'Curated Claude Skills, resources and workflow customizations.',
    category: 'Skills',
    usage:
      'Source reusable workflow skills for SaaS and business automation tasks.',
  },
  {
    repo: 'hesreallyhim/awesome-claude-code',
    stars: 55042,
    license: 'Other',
    description: 'Hand-picked collection of top-tier agent skills, plugins and tooling.',
    category: 'Skills',
    usage:
      'Reference for plugin structure, status lines and agent tooling configuration.',
  },
  {
    repo: 'aaif-goose/goose',
    stars: 54927,
    license: 'Apache-2.0',
    description: 'Extensible open-source AI agent that installs, runs and tests code.',
    category: 'Agent Runtimes',
    usage:
      'Follow its extension-based tool model for adding capabilities without forking the agent.',
  },
  {
    repo: 'ChromeDevTools/chrome-devtools-mcp',
    stars: 52935,
    license: 'Apache-2.0',
    description: 'Chrome DevTools access for coding agents.',
    category: 'MCP Servers',
    npmPackage: 'chrome-devtools-mcp',
    usage:
      'Inspect real runtime state — console errors, network requests, DOM and performance traces — instead of guessing at frontend bugs.',
  },
  {
    repo: 'upstash/context7',
    stars: 62657,
    license: 'MIT',
    description: 'Up-to-date code documentation for LLMs and AI code editors.',
    category: 'MCP Servers',
    npmPackage: '@upstash/context7-mcp',
    usage:
      'Resolve a library name to a Context7 library ID and pull current docs before writing code against an unfamiliar API.',
  },
  {
    repo: 'sickn33/agentic-awesome-skills',
    stars: 47237,
    license: 'MIT',
    description: 'Agent-first control plane over 2,400+ skills with CLI, catalog and plugins.',
    category: 'Plugin Marketplace',
    usage:
      'Use its catalog and installer to discover and add skills programmatically rather than one at a time.',
  },
  {
    repo: 'wshobson/agents',
    stars: 40183,
    license: 'MIT',
    description: 'Multi-harness agentic plugin marketplace for Claude Code, Codex, Cursor and Copilot.',
    category: 'Plugin Marketplace',
    usage:
      'Add as a marketplace to resolve and install agent plugins that are shared across coding harnesses.',
  },
  {
    repo: 'github/awesome-copilot',
    stars: 39680,
    license: 'MIT',
    description: 'Community instructions, agents, skills and configs for GitHub Copilot.',
    category: 'Skills',
    usage:
      'Borrow prompt and instruction patterns vetted inside GitHub Copilot.',
  },
  {
    repo: 'VoltAgent/awesome-agent-skills',
    stars: 35185,
    license: 'MIT',
    description: '1000+ agent skills from official dev teams and the community.',
    category: 'Skills',
    usage:
      'Search this index when a task has no matching stock skill; it spans Claude Code, Codex, Gemini CLI and Cursor.',
  },
  {
    repo: 'github/github-mcp-server',
    stars: 33353,
    license: 'MIT',
    description: 'GitHub’s official MCP Server.',
    category: 'MCP Servers',
    npmPackage: '@modelcontextprotocol/server-github',
    usage:
      'Manage issues, pull requests, code search and workflows through natural language.',
  },
  {
    repo: 'davila7/claude-code-templates',
    stars: 32360,
    license: 'MIT',
    description: 'CLI tool for configuring and monitoring agent coding setups.',
    category: 'Plugin Marketplace',
    usage:
      'Scaffold and monitor multi-agent configurations from the command line.',
  },
  {
    repo: 'e2b-dev/awesome-ai-agents',
    stars: 30266,
    license: 'Other',
    description: 'A list of AI autonomous agents.',
    category: 'Skills',
    usage:
      'Survey existing agent architectures before designing a new autonomous agent.',
  },
  {
    repo: 'alirezarezvani/claude-skills',
    stars: 27542,
    license: 'MIT',
    description: '380+ skills and plugins spanning engineering, marketing, product and compliance.',
    category: 'Skills',
    usage:
      'Pull domain-specific playbooks for non-engineering functions such as marketing, legal and finance.',
  },
  {
    repo: 'RooCodeInc/Roo-Code',
    stars: 24289,
    license: 'Apache-2.0',
    description: 'A whole dev team of AI agents inside your code editor.',
    category: 'Agent Runtimes',
    usage:
      'Use its mode-based delegation pattern to route tasks to specialised sub-agents.',
  },
  {
    repo: 'continuedev/continue',
    stars: 36106,
    license: 'Apache-2.0',
    description: 'Open-source coding agent.',
    category: 'Agent Runtimes',
    usage:
      'Reference for open model-provider integration and configurable agent blocks.',
  },
  {
    repo: 'microsoft/playwright-mcp',
    stars: 37804,
    license: 'Apache-2.0',
    description: 'Playwright MCP server for browser automation.',
    category: 'MCP Servers',
    npmPackage: '@playwright/mcp',
    usage:
      'Drive the browser via accessibility snapshots rather than screenshots for reliable UI verification.',
  },
  {
    repo: 'googleapis/mcp-toolbox',
    stars: 16563,
    license: 'Apache-2.0',
    description: 'Open-source MCP server for databases.',
    category: 'MCP Servers',
    usage:
      'Query and administer databases through a single tool interface across supported engines.',
  },
  {
    repo: 'awslabs/mcp',
    stars: 9750,
    license: 'Apache-2.0',
    description: 'Open source MCP Servers for AWS.',
    category: 'MCP Servers',
    usage:
      'Automate AWS resource inspection and operations with least-privilege scoped credentials.',
  },
  {
    repo: 'firecrawl/firecrawl-mcp-server',
    stars: 7550,
    license: 'MIT',
    description: 'Web scraping and search MCP server.',
    category: 'MCP Servers',
    npmPackage: 'firecrawl-mcp',
    usage:
      'Scrape, crawl and search the live web to return agent-ready context instead of raw HTML.',
  },
  {
    repo: 'modelcontextprotocol/registry',
    stars: 7314,
    license: 'Other',
    description: 'Community-driven registry service for MCP servers.',
    category: 'MCP Registries',
    usage:
      'Look up canonical server metadata and install metadata when wiring a new MCP integration.',
  },
  {
    repo: 'exa-labs/exa-mcp-server',
    stars: 5075,
    license: 'MIT',
    description: 'MCP for web search and crawling.',
    category: 'MCP Servers',
    usage:
      'Retrieve semantically similar pages for research tasks where keyword search underperforms.',
  },
  {
    repo: 'heilcheng/awesome-agent-skills',
    stars: 6258,
    license: 'MIT',
    description: 'Tutorials, guides and agent skill directories.',
    category: 'Skills',
    usage:
      'Follow the setup guides to wire skills into Codex, VS Code, Antigravity and Gemini CLI.',
  },
  {
    repo: 'supabase/mcp',
    stars: 2929,
    license: 'Apache-2.0',
    description: 'Connect Supabase to your AI assistants.',
    category: 'MCP Servers',
    usage:
      'Inspect schemas, run queries and apply migrations against a Supabase project.',
  },
  {
    repo: 'affaan-m/ECC',
    stars: 272571,
    license: 'MIT',
    description:
      'The agent harness performance optimization system. Skills, instincts, memory, security, and research-first dev…',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when state must survive across sessions.',
  },
  {
    repo: 'NousResearch/hermes-agent',
    stars: 251083,
    license: 'MIT',
    description:
      'The agent that grows with you',
    category: 'Coding Agents',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'n8n-io/n8n',
    stars: 206624,
    license: 'NOASSERTION',
    description:
      'Fair-code workflow automation platform with native AI capabilities.',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'Significant-Gravitas/AutoGPT',
    stars: 187647,
    license: 'NOASSERTION',
    description:
      'AutoGPT is the vision of accessible AI for everyone, to use and to build on.',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'DietrichGebert/ponytail',
    stars: 154181,
    license: 'MIT',
    description:
      'Makes your AI agent think like the laziest senior dev in the room. The best code is the code you never wrote',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Check the README before wiring it into an agent.',
  },
  {
    repo: 'langchain-ai/langchain',
    stars: 147426,
    license: 'MIT',
    description:
      'The agent engineering platform',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'Shubhamsaboo/awesome-llm-apps',
    stars: 140678,
    license: 'Apache-2.0',
    description:
      '100+ AI Agents, Agent Skills and RAG Apps - Free and Open Source',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit when you want written guidance loaded, not tools called.',
  },
  {
    repo: 'github/spec-kit',
    stars: 140068,
    license: 'MIT',
    description:
      'Toolkit to help you get started with SDD or any other process',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'farion1231/cc-switch',
    stars: 139904,
    license: 'MIT',
    description:
      'A cross-platform desktop All-in-One assistant for Claude Code, Codex, OpenCode, OpenClaw, Grok Build & Hermes Agent.',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'nextlevelbuilder/ui-ux-pro-max-skill',
    stars: 132905,
    license: 'MIT',
    description:
      'An AI skill that provides design intelligence for building professional UI/UX across multiple platforms',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit for UI and visual design work.',
  },
  {
    repo: 'Graphify-Labs/graphify',
    stars: 123661,
    license: 'Apache-2.0',
    description:
      'Turn any codebase, with its docs, SQL schemas, configs, and PDFs, into a queryable knowledge graph.',
    category: 'Knowledge & RAG',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when the task needs retrieval over a document corpus.',
  },
  {
    repo: 'JuliusBrussee/caveman',
    stars: 109712,
    license: 'Apache-2.0',
    description:
      'why use many token when few token do trick. Viral skill + proxy for coding agents that cuts 65% of tokens by t…',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit when you want written guidance loaded, not tools called.',
  },
  {
    repo: 'TauricResearch/TradingAgents',
    stars: 109695,
    license: 'Apache-2.0',
    description:
      'TradingAgents: Multi-Agents LLM Financial Trading Framework',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit for multi-agent or parallel execution patterns.',
  },
  {
    repo: 'addyosmani/agent-skills',
    stars: 100980,
    license: 'MIT',
    description:
      'Production-grade engineering skills for AI coding agents',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit when you want written guidance loaded, not tools called.',
  },
  {
    repo: 'nexu-io/open-design',
    stars: 99366,
    license: 'Apache-2.0',
    description:
      'Best DeepSeek Harness Design Plugin. The open-source Claude Design alternative.  Local-first desktop app.',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit for UI and visual design work.',
  },
  {
    repo: 'thedotmack/claude-mem',
    stars: 95848,
    license: 'Apache-2.0',
    description:
      'Persistent Context Across Sessions for Every Agent – Captures everything your agent does during sessions, comp…',
    category: 'Agent Memory',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when state must survive across sessions.',
  },
  {
    repo: 'Leonxlnx/taste-skill',
    stars: 92460,
    license: 'MIT',
    description:
      'Taste-Skill - gives your AI good taste. stops the AI from generating boring, generic slop',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit when you want written guidance loaded, not tools called.',
  },
  {
    repo: 'infiniflow/ragflow',
    stars: 91659,
    license: 'Apache-2.0',
    description:
      'RAGFlow is a leading open-source Retrieval-Augmented Generation (RAG) engine that fuses cutting-edge RAG with…',
    category: 'Knowledge & RAG',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when the task needs retrieval over a document corpus.',
  },
  {
    repo: 'Panniantong/Agent-Reach',
    stars: 90300,
    license: 'MIT',
    description:
      'Give your AI agent eyes to see the entire internet. Read & search Twitter, Reddit, YouTube, GitHub, Bilibili…',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit when the task needs retrieval over a document corpus.',
  },
  {
    repo: 'OpenHands/OpenHands',
    stars: 89953,
    license: 'MIT',
    description:
      'OpenHands: AI-Driven Development',
    category: 'Coding Agents',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'D4Vinci/Scrapling',
    stars: 85571,
    license: 'BSD-3-Clause',
    description:
      'An adaptive Web Scraping framework that handles everything from a single request to a full-scale crawl! Don\'t…',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when the agent must drive or read the live web.',
  },
  {
    repo: 'unclecode/crawl4ai',
    stars: 84736,
    license: 'Apache-2.0',
    description:
      'Open-source web crawler and scraper for LLMs and AI agents: any website into clean, LLM-ready Markdown.',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when the agent must drive or read the live web.',
  },
  {
    repo: 'stablyai/orca',
    stars: 84666,
    license: 'MIT',
    description:
      'Orca is the ADE for working with a fleet of parallel agents. Run any coding agent with your own subscription.',
    category: 'Coding Agents',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'tt-a1i/archify',
    stars: 76933,
    license: 'MIT',
    description:
      'Turn any idea, plan, or codebase into a beautiful interactive diagram.',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Check the README before wiring it into an agent.',
  },
  {
    repo: 'headroomlabs-ai/headroom',
    stars: 74381,
    license: 'Apache-2.0',
    description:
      'Compress tool outputs, logs, files, and RAG chunks before they reach the LLM.',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when the task needs retrieval over a document corpus.',
  },
  {
    repo: 'ruvnet/ruflo',
    stars: 73830,
    license: 'MIT',
    description:
      'The original agent harness. Deploy intelligent multi-player swarms, coordinate autonomous workflows, and build…',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit for multi-agent or parallel execution patterns.',
  },
  {
    repo: 'career-ops-hq/career-ops',
    stars: 73436,
    license: 'MIT',
    description:
      'Open-source AI job search agent and job finder: scan job boards, score each job 1-5 against your CV before you…',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when the task needs retrieval over a document corpus.',
  },
  {
    repo: 'FoundationAgents/MetaGPT',
    stars: 70734,
    license: 'MIT',
    description:
      'The Multi-Agent Framework: First AI Software Company, Towards Natural Language Programming',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit for multi-agent or parallel execution patterns.',
  },
  {
    repo: 'Mintplex-Labs/anything-llm',
    stars: 66702,
    license: 'MIT',
    description:
      'Stop renting your intelligence. Own it with AnythingLLM.',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'mvanhorn/last30days-skill',
    stars: 63476,
    license: 'MIT',
    description:
      'AI agent skill that researches any topic across Reddit, X, YouTube, HN, Polymarket, and the web - then synthes…',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit for open-ended research and synthesis.',
  },
  {
    repo: 'microsoft/autogen',
    stars: 61251,
    license: 'CC-BY-4.0',
    description:
      'A programming framework for agentic AI',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'blader/humanizer',
    stars: 53864,
    license: 'MIT',
    description:
      'Agent skill that removes signs of AI-generated writing from text',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit when you want written guidance loaded, not tools called.',
  },
  {
    repo: 'ayghri/i-have-adhd',
    stars: 53337,
    license: 'MIT',
    description:
      'A skill to stop your coding agent from burying the answer. ADHD-friendly output',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit when you want written guidance loaded, not tools called.',
  },
  {
    repo: 'kepano/obsidian-skills',
    stars: 49134,
    license: 'MIT',
    description:
      'Agent skills for Obsidian. Teach your agent to use Obsidian CLI and open formats including Markdown, Bases, JS…',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit when you want written guidance loaded, not tools called.',
  },
  {
    repo: 'HKUDS/nanobot',
    stars: 48778,
    license: 'MIT',
    description:
      'Ultra-lightweight, open-source, self-hosted personal AI agent framework in Python with WebUI, tools, memory, M…',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when state must survive across sessions.',
  },
  {
    repo: 'K-Dense-AI/scientific-agent-skills',
    stars: 47541,
    license: 'MIT',
    description:
      'Turn any AI agent into an AI Scientist. The #1 Agent Skills library for science, used by 250,000+ scientists worldwide.',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit when you want written guidance loaded, not tools called.',
  },
  {
    repo: 'zhayujie/CowAgent',
    stars: 47227,
    license: 'MIT',
    description:
      'Open-source personal AI assistant & Agent Harness. Plans tasks, runs tools and skills, self-evolves with memory and knowledge.',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when state must survive across sessions.',
  },
  {
    repo: 'DeusData/codebase-memory-mcp',
    stars: 45774,
    license: 'MIT',
    description:
      'High-performance code intelligence MCP server. Indexes codebases into a persistent knowledge graph — average r…',
    category: 'MCP Servers',
    usage:
      'Add to the agent\'s mcp.json so its tools become callable capabilities. Best fit when the task needs retrieval over a document corpus.',
  },
  {
    repo: 'vectorize-io/hindsight',
    stars: 45276,
    license: 'MIT',
    description:
      'Hindsight: Agent Memory That Learns',
    category: 'Agent Memory',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when state must survive across sessions.',
  },
  {
    repo: 'alibaba/open-code-review',
    stars: 43616,
    license: 'Apache-2.0',
    description:
      'Secure, fast, efficient, battle-tested at Alibaba\'s scale.',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit for security review and hardening work.',
  },
  {
    repo: 'agno-agi/agno',
    stars: 42544,
    license: 'Apache-2.0',
    description:
      'Build, run, and manage agent platforms',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: '666ghj/BettaFish',
    stars: 42332,
    license: 'GPL-2.0',
    description:
      'Agent舆情分析助手，打破信息茧房，还原舆情原貌，预测未来走向，辅助决策！从0',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'herdrdev/herdr',
    stars: 42150,
    license: 'Apache-2.0',
    description:
      'the runtime your coding agents live on',
    category: 'Coding Agents',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'AstrBotDevs/AstrBot',
    stars: 41381,
    license: 'AGPL-3.0',
    description:
      'AI Agent Assistant & development framework that integrates lots of IM platforms, LLMs, plugins and AI feature…',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'Hmbown/Codewhale',
    stars: 41038,
    license: 'MIT',
    description:
      'Open-source coding agent for your terminal, built in Rust and on a journey of continuous community improvement.',
    category: 'Coding Agents',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit for terminal and command-line driven work.',
  },
  {
    repo: 'tinyhumansai/openhuman',
    stars: 40582,
    license: 'GPL-3.0',
    description:
      'OpenHuman is the fastest, cheapest, most efficient open-source agent harness. Written in Rust',
    category: 'Coding Agents',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'Yeachan-Heo/oh-my-claudecode',
    stars: 39571,
    license: 'MIT',
    description:
      'Teams-first Multi-agent orchestration for Claude Code',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit for multi-agent or parallel execution patterns.',
  },
  {
    repo: 'bytedance/UI-TARS-desktop',
    stars: 39207,
    license: 'Apache-2.0',
    description:
      'The Open-Source Multimodal AI Agent Stack: Connecting Cutting-Edge AI Models and Agent Infra',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'volcengine/OpenViking',
    stars: 39188,
    license: 'AGPL-3.0',
    description:
      'Self-evolving Context Database for AI Agents. Unify Agent Memory, Knowledge RAG and Skills',
    category: 'Agent Memory',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when state must survive across sessions.',
  },
  {
    repo: 'chatchat-space/Langchain-Chatchat',
    stars: 38670,
    license: 'Apache-2.0',
    description:
      'Langchain-Chatchat（原Langchain-ChatGLM）基于 Langchain 与 ChatGLM, Qwen 与 Llama 等语言模型的 RAG 与 Agent 应用 | Langchain-C…',
    category: 'Knowledge & RAG',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when the task needs retrieval over a document corpus.',
  },
  {
    repo: 'ashishpatel26/500-AI-Agents-Projects',
    stars: 38300,
    license: 'MIT',
    description:
      'The 500 AI Agents Projects is a curated collection of AI agent use cases across various industries.',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Check the README before wiring it into an agent.',
  },
  {
    repo: 'esengine/DeepSeek-Reasonix',
    stars: 35735,
    license: 'MIT',
    description:
      'A reliable coding agent for complex software engineering tasks',
    category: 'Coding Agents',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'langfuse/langfuse',
    stars: 35358,
    license: 'NOASSERTION',
    description:
      'Open source agent evals & observability: Trace, evaluate, and improve LLM applications with one open platform',
    category: 'Observability',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when you need to trace, evaluate or debug agent runs.',
  },
  {
    repo: 'HKUDS/Vibe-Trading',
    stars: 34554,
    license: 'MIT',
    description:
      'Vibe-Trading: Your Personal Trading Agent',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'can1357/oh-my-pi',
    stars: 34244,
    license: 'MIT',
    description:
      'Coding agent with the IDE wired in. Built by Stencil Labs',
    category: 'Coding Agents',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'vercel-labs/skills',
    stars: 33089,
    license: 'MIT',
    description:
      'The open agent skills tool - npx skills',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit when you want written guidance loaded, not tools called.',
  },
  {
    repo: 'Tencent/WeKnora',
    stars: 31958,
    license: 'NOASSERTION',
    description:
      'Open-source LLM knowledge platform: turn raw documents into a queryable RAG, an autonomous reasoning agent, an…',
    category: 'Knowledge & RAG',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when the task needs retrieval over a document corpus.',
  },
  {
    repo: 'feder-cr/invisible_playwright_mcp',
    stars: 31769,
    license: 'MIT',
    description:
      'Playwright MCP server undetected by anti-bots and captchas: AI agent browses the web on anti-detect stealth Fi…',
    category: 'MCP Servers',
    usage:
      'Add to the agent\'s mcp.json so its tools become callable capabilities. Best fit when the agent must drive or read the live web.',
  },
  {
    repo: 'googleworkspace/cli',
    stars: 31242,
    license: 'Apache-2.0',
    description:
      'Google Workspace CLI — one command-line tool for Drive, Gmail, Calendar, Sheets, Docs, Chat, Admin, and more.',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit for terminal and command-line driven work.',
  },
  {
    repo: 'oraios/serena',
    stars: 29976,
    license: 'NOASSERTION',
    description:
      'A powerful MCP toolkit for coding, providing semantic retrieval and editing capabilities - the IDE for your ag…',
    category: 'MCP Servers',
    usage:
      'Add to the agent\'s mcp.json so its tools become callable capabilities. Best fit when the task needs retrieval over a document corpus.',
  },
  {
    repo: 'ahujasid/mcp-for-blender',
    stars: 29950,
    license: 'MIT',
    description:
      'Community plugin to control Blender 3D with any LLM of your choice.',
    category: 'MCP Servers',
    usage:
      'Add to the agent\'s mcp.json so its tools become callable capabilities. Check the README before wiring it into an agent.',
  },
  {
    repo: 'assafelovic/gpt-researcher',
    stars: 29905,
    license: 'Apache-2.0',
    description:
      'An autonomous agent that conducts deep research on any data using any LLM providers',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit for open-ended research and synthesis.',
  },
  {
    repo: 'openai/openai-agents-python',
    stars: 29827,
    license: 'MIT',
    description:
      'A lightweight, powerful framework for multi-agent workflows',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit for multi-agent or parallel execution patterns.',
  },
  {
    repo: 'jackwener/OpenCLI',
    stars: 29816,
    license: 'Apache-2.0',
    description:
      'Make Any Website into CLI & Use your logged-in browser by AI agent',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when the agent must drive or read the live web.',
  },
  {
    repo: 'alibaba/page-agent',
    stars: 29323,
    license: 'MIT',
    description:
      'JavaScript in-page GUI agent. Control web interfaces with natural language',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when the agent must drive or read the live web.',
  },
  {
    repo: 'rohitg00/agentmemory',
    stars: 29128,
    license: 'Apache-2.0',
    description:
      '1 Persistent memory for AI coding agents based on real-world benchmarks',
    category: 'Agent Memory',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when state must survive across sessions.',
  },
  {
    repo: 'QwenLM/qwen-code',
    stars: 28299,
    license: 'Apache-2.0',
    description:
      'An open-source AI coding agent that lives in your terminal',
    category: 'Coding Agents',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit for terminal and command-line driven work.',
  },
  {
    repo: 'BloopAI/vibe-kanban',
    stars: 28259,
    license: 'Apache-2.0',
    description:
      'Get 10X more out of Claude Code, Codex or any coding agent',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'PrefectHQ/fastmcp',
    stars: 27969,
    license: 'Apache-2.0',
    description:
      'The fast, Pythonic way to build MCP servers and clients',
    category: 'Agent Runtimes',
    usage:
      'Add to the agent\'s mcp.json so its tools become callable capabilities. Best fit when you want the capability exposed as MCP tools.',
  },
  {
    repo: 'TencentCloud/TencentDB-Agent-Memory',
    stars: 27684,
    license: 'NOASSERTION',
    description:
      'TencentDB Agent Memory is a team-level memory hub for AI Agents — turning conversations, docs, and code into f…',
    category: 'Agent Memory',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when state must survive across sessions.',
  },
  {
    repo: 'gastownhall/beads',
    stars: 27623,
    license: 'MIT',
    description:
      'Beads - A memory upgrade for your coding agent',
    category: 'Agent Memory',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when state must survive across sessions.',
  },
  {
    repo: 'manaflow-ai/cmux',
    stars: 27598,
    license: 'NOASSERTION',
    description:
      'Open source Ghostty-based macOS terminal with vertical tabs and notifications for AI coding agents.',
    category: 'Coding Agents',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit for terminal and command-line driven work.',
  },
  {
    repo: 'Kilo-Org/kilocode',
    stars: 27488,
    license: 'MIT',
    description:
      'Kilo is the all-in-one agentic engineering platform.',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'Fosowl/agenticSeek',
    stars: 27421,
    license: 'GPL-3.0',
    description:
      'Fully Local Manus AI. No APIs, No $200 monthly bills.',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'OthmanAdi/planning-with-files',
    stars: 27278,
    license: 'MIT',
    description:
      'Persistent file-based planning for AI coding agents and long-running tasks.',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit for long-running tasks that need durable state.',
  },
  {
    repo: 'op7418/guizang-ppt-skill',
    stars: 27225,
    license: 'AGPL-3.0',
    description:
      'AI-agent Skill for generating polished HTML slide decks: editorial magazine and Swiss layouts, image prompts…',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit for UI and visual design work.',
  },
  {
    repo: 'onlook-dev/onlook',
    stars: 26856,
    license: 'Apache-2.0',
    description:
      'The Developer Tool for Designers • An Open-Source AI-First Design tool • Visually build, style, and edit your…',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit for UI and visual design work.',
  },
  {
    repo: 'deepset-ai/haystack',
    stars: 26646,
    license: 'Apache-2.0',
    description:
      'Open-source AI orchestration framework for building context-engineered, production-ready LLM applications.',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when state must survive across sessions.',
  },
  {
    repo: 'zai-org/Open-AutoGLM',
    stars: 26344,
    license: 'Apache-2.0',
    description:
      'An Open Phone Agent Model & Framework. Unlocking the AI Phone for Everyone',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'agentskills/agentskills',
    stars: 25899,
    license: 'Apache-2.0',
    description:
      'Specification and documentation for Agent Skills',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit when you want written guidance loaded, not tools called.',
  },
  {
    repo: 'mksglu/context-mode',
    stars: 25334,
    license: 'NOASSERTION',
    description:
      'Context window optimization for AI coding agents. Sandboxes tool output (98% reduction), persists session memo…',
    category: 'Observability',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when state must survive across sessions.',
  },
  {
    repo: 'titanwings/distilly',
    stars: 25284,
    license: 'MIT',
    description:
      'Distilly — Distill how they think into reusable Skills for any Agent or Bot.',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit when you want written guidance loaded, not tools called.',
  },
  {
    repo: 'activepieces/activepieces',
    stars: 24894,
    license: 'NOASSERTION',
    description:
      'AI Agents & MCPs & AI Workflow Automation • (~400 MCP servers for AI agents) • AI Automation / AI Agent with M…',
    category: 'Agent Runtimes',
    usage:
      'Add to the agent\'s mcp.json so its tools become callable capabilities. Best fit when you want the capability exposed as MCP tools.',
  },
  {
    repo: 'alchaincyf/huashu-design',
    stars: 24578,
    license: 'MIT',
    description:
      'Huashu Design · HTML-native design skill for Claude Code · Claude Code 里 HTML 原生的设计 skill · 高保真原型 / 幻灯片 / 动画 +…',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit for UI and visual design work.',
  },
  {
    repo: 'modelcontextprotocol/python-sdk',
    stars: 24479,
    license: 'MIT',
    description:
      'The official Python SDK for Model Context Protocol servers and clients',
    category: 'Agent Runtimes',
    usage:
      'Add to the agent\'s mcp.json so its tools become callable capabilities. Best fit when state must survive across sessions.',
  },
  {
    repo: 'cloudflare/security-audit-skill',
    stars: 23998,
    license: 'MIT',
    description:
      'A coding-agent skill for multi-phase security audits with independently verified, machine-readable findings',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit for security review and hardening work.',
  },
  {
    repo: 'czlonkowski/n8n-mcp',
    stars: 23036,
    license: 'MIT',
    description:
      'A MCP for Claude Desktop / Claude Code / Windsurf / Cursor to build n8n workflows for you',
    category: 'MCP Servers',
    usage:
      'Add to the agent\'s mcp.json so its tools become callable capabilities. Best fit when you want the capability exposed as MCP tools.',
  },
  {
    repo: '1Panel-dev/MaxKB',
    stars: 22900,
    license: 'GPL-3.0',
    description:
      'MaxKB is an open-source platform for building enterprise-grade agents',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'comet-ml/opik',
    stars: 22370,
    license: 'Apache-2.0',
    description:
      'Debug, evaluate, and monitor your LLM applications, RAG systems, and agentic workflows with comprehensive trac…',
    category: 'Observability',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when the task needs retrieval over a document corpus.',
  },
  {
    repo: 'coze-dev/coze-studio',
    stars: 21674,
    license: 'Apache-2.0',
    description:
      'An AI agent development platform with all-in-one visual tools, simplifying agent creation, debugging, and depl…',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit when you need to trace, evaluate or debug agent runs.',
  },
  {
    repo: 'KKKKhazix/khazix-skills',
    stars: 21147,
    license: 'MIT',
    description:
      'AI Skills 合集 | Agent Skills: leader（帮你定义目标）, neat-freak 洁癖, hv-analysis, khazix-writer & more — Claude Code, C…',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit when you want written guidance loaded, not tools called.',
  },
  {
    repo: 'google/skills',
    stars: 20924,
    license: 'Apache-2.0',
    description:
      'Agent Skills for Google products and technologies',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit when you want written guidance loaded, not tools called.',
  },
  {
    repo: 'SWE-agent/SWE-agent',
    stars: 20486,
    license: 'MIT',
    description:
      'SWE-agent takes a GitHub issue and tries to automatically fix it, using your LM of choice.',
    category: 'Coding Agents',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: '1jehuang/jcode',
    stars: 20296,
    license: 'MIT',
    description:
      'High performance coding agent harness written in rust',
    category: 'Coding Agents',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'eosphoros-ai/DB-GPT',
    stars: 20077,
    license: 'MIT',
    description:
      'open-source agentic AI data assistant for the next generation of AI + Data products',
    category: 'Knowledge & RAG',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'Alibaba-NLP/DeepResearch',
    stars: 20003,
    license: 'Apache-2.0',
    description:
      'Tongyi Deep Research, the Leading Open-source Deep Research Agent',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit for open-ended research and synthesis.',
  },
  {
    repo: 'dzhng/deep-research',
    stars: 19754,
    license: 'MIT',
    description:
      'An AI-powered research assistant that performs iterative, deep research on any topic by combining search engin…',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit for open-ended research and synthesis.',
  },
  {
    repo: 'elizaOS/eliza',
    stars: 19536,
    license: 'MIT',
    description:
      'Open source agentic operating system',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'getpaseo/paseo',
    stars: 19414,
    license: 'NOASSERTION',
    description:
      'Orchestrate multiple coding agents from desktop and mobile',
    category: 'Coding Agents',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Best fit for multi-agent or parallel execution patterns.',
  },
  {
    repo: 'agent0ai/agent-zero',
    stars: 19369,
    license: 'NOASSERTION',
    description:
      'Agent Zero AI framework',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README before wiring it into an agent.',
  },
  {
    repo: 'mem0ai/mem0',
    stars: 66556,
    license: 'Apache-2.0',
    description:
      'The Memory Layer for AI Agents - Drop-in memory infrastructure for AI agents and apps. Context that persists.',
    category: 'Agent Memory',
    usage:
      'Adopt as the durable memory layer so state survives across sessions. Best fit when context size or spend needs controlling.',
  },
  {
    repo: 'MemPalace/mempalace',
    stars: 59405,
    license: 'MIT',
    description:
      'The best-benchmarked open-source AI memory system. And it\'s free',
    category: 'Agent Memory',
    usage:
      'Adopt as the durable memory layer so state survives across sessions. Best fit when context size or spend needs controlling.',
  },
  {
    repo: 'anthropics/claude-plugins-official',
    stars: 37369,
    license: 'Apache-2.0',
    description:
      'Official, Anthropic-managed directory of high quality Claude Code Plugins',
    category: 'Plugin Marketplace',
    usage:
      'Browse for installable extensions matching the agent\'s target environment. Check the README for the exact tool surface before wiring it in.',
  },
  {
    repo: 'GLips/Figma-Context-MCP',
    stars: 15951,
    license: 'MIT',
    description:
      'MCP server to provide Figma layout information to AI coding agents like Cursor',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for design-system and component work.',
  },
  {
    repo: 'hangwin/mcp-chrome',
    stars: 12463,
    license: 'MIT',
    description:
      'Chrome MCP Server is a Chrome extension-based Model Context Protocol (MCP) server that exposes your Chrome bro…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when the agent must drive or read the live web.',
  },
  {
    repo: '0x4m4/hexstrike-ai',
    stars: 12315,
    license: 'MIT',
    description:
      'HexStrike AI MCP Agents is an advanced MCP server that lets AI agents (Claude, GPT, Copilot, etc.) autonomousl…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for security testing and authorised assessment.',
  },
  {
    repo: 'LaurieWired/GhidraMCP',
    stars: 10268,
    license: 'Apache-2.0',
    description:
      'MCP Server for Ghidra',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for reverse engineering and binary analysis.',
  },
  {
    repo: 'wonderwhy-er/DesktopCommanderMCP',
    stars: 9910,
    license: 'MIT',
    description:
      'This is MCP server for Claude that gives it terminal control, file system search and diff file editing capabil…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Check the README for the exact tool surface before wiring it in.',
  },
  {
    repo: 'apify/apify-mcp-server',
    stars: 9567,
    license: 'MIT',
    description:
      'The Apify MCP server enables your AI agents to extract data from social media, search engines, maps, e-commerc…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Check the README for the exact tool surface before wiring it in.',
  },
  {
    repo: 'mobile-next/mobile-mcp',
    stars: 8631,
    license: 'Apache-2.0',
    description:
      'Model Context Protocol Server for Mobile Automation and Scraping (iOS, Android, Emulators, Simulators and Real…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when the agent must drive or read the live web.',
  },
  {
    repo: 'idosal/git-mcp',
    stars: 8449,
    license: 'Apache-2.0',
    description:
      'Put an end to code hallucinations! GitMCP is a free, open-source, remote MCP server for any GitHub project',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for issue tracker and wiki work.',
  },
  {
    repo: 'google-labs-code/stitch-skills',
    stars: 8422,
    license: 'Apache-2.0',
    description:
      'A library of Agent Skills designed to work with the Stitch MCP server.',
    category: 'Skills',
    usage:
      'Attach to an agent and cite it from the prompt when the task matches. Best fit for design-system and component work.',
  },
  {
    repo: 'yzfly/Awesome-MCP-ZH',
    stars: 7706,
    license: 'MIT',
    description:
      'MCP 资源精选， MCP指南，Claude MCP，MCP Servers, MCP Clients',
    category: 'MCP Registries',
    usage:
      'Use as a directory to discover further MCP servers to add. Check the README for the exact tool surface before wiring it in.',
  },
  {
    repo: 'CursorTouch/Windows-MCP',
    stars: 7670,
    license: 'MIT',
    description:
      'MCP Server for Computer Use in Windows',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Check the README for the exact tool surface before wiring it in.',
  },
  {
    repo: 'BrowserMCP/mcp',
    stars: 7155,
    license: 'Apache-2.0',
    description:
      'Browser MCP is a Model Context Provider (MCP) server that allows AI applications to control your browser',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when the agent must drive or read the live web.',
  },
  {
    repo: 'Gentleman-Programming/engram',
    stars: 7026,
    license: 'MIT',
    description:
      'Persistent memory system for AI coding agents. Agent-agnostic Go binary with SQLite + FTS5, MCP server, HTTP A…',
    category: 'Agent Memory',
    usage:
      'Adopt as the durable memory layer so state survives across sessions. Best fit for infrastructure and data access.',
  },
  {
    repo: 'getsentry/MobileBuildMCP',
    stars: 6457,
    license: 'MIT',
    description:
      'A Model Context Protocol (MCP) server and CLI that provides tools for agent use when working on iOS and macOS…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for mobile app automation.',
  },
  {
    repo: 'lharries/whatsapp-mcp',
    stars: 6388,
    license: 'MIT',
    description:
      'WhatsApp MCP server',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Check the README for the exact tool surface before wiring it in.',
  },
  {
    repo: 'epiral/bb-browser',
    stars: 6231,
    license: 'MIT',
    description:
      'Your browser is the API. CLI + MCP server for AI agents to control Chrome with your login state',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when the agent must drive or read the live web.',
  },
  {
    repo: 'jacob-bd/gemini-notebook-mcp-cli',
    stars: 6224,
    license: 'MIT',
    description:
      'Programmatic access to Gemini Notebook - via command-line interface (CLI), Model Context Protocol (MCP) server…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when context size or spend needs controlling.',
  },
  {
    repo: 'Q00/ouroboros',
    stars: 6178,
    license: 'MIT',
    description:
      'Agent OS: the agent gets smarter on its own. We just hold the line: Interview-gated, staged evaluation, budgeted evolution loop.',
    category: 'Agent Runtimes',
    usage:
      'Adopt its architecture directly; this is a framework or platform, not a drop-in tool. Check the README for the exact tool surface before wiring it in.',
  },
  {
    repo: 'sooperset/mcp-atlassian',
    stars: 5965,
    license: 'MIT',
    description:
      'MCP server for Atlassian tools (Confluence, Jira',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for issue tracker and wiki work.',
  },
  {
    repo: 'Coding-Solo/godot-mcp',
    stars: 5929,
    license: 'MIT',
    description:
      'MCP server for interfacing with Godot game engine. Provides tools for launching the editor, running projects…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for creative and media tooling.',
  },
  {
    repo: 'executeautomation/mcp-playwright',
    stars: 5661,
    license: 'MIT',
    description:
      'Playwright Model Context Protocol Server - Tool to automate Browsers and APIs in Claude Desktop, Cline, Cursor…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when the agent must drive or read the live web.',
  },
  {
    repo: 'atilaahmettaner/tradingview-mcp',
    stars: 4909,
    license: 'MIT',
    description:
      'TradingView MCP server — real-time market data, technical analysis, screeners & backtesting for Claude, ChatGP…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for research and data-gathering tasks.',
  },
  {
    repo: 'aipotheosis-labs/aci',
    stars: 4905,
    license: 'Apache-2.0',
    description:
      'ACI.dev is the open source tool-calling platform that hooks up 600+ tools into any agentic IDE or custom AI ag…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Check the README for the exact tool surface before wiring it in.',
  },
  {
    repo: 'callstack/agent-device',
    stars: 4884,
    license: 'MIT',
    description:
      'Mobile app automation and verification for AI coding agents.',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for mobile app automation.',
  },
  {
    repo: 'makenotion/notion-mcp-server',
    stars: 4658,
    license: 'MIT',
    description:
      'Official Notion MCP Server',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when Notion is the source of truth.',
  },
  {
    repo: 'MarkusPfundstein/mcp-obsidian',
    stars: 4456,
    license: 'MIT',
    description:
      'MCP server that interacts with Obsidian via the Obsidian rest API community plugin',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Check the README for the exact tool surface before wiring it in.',
  },
  {
    repo: 'open-webui/mcpo',
    stars: 4389,
    license: 'MIT',
    description:
      'A simple, secure MCP-to-OpenAPI proxy server',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Check the README for the exact tool surface before wiring it in.',
  },
  {
    repo: 'Pimzino/spec-workflow-mcp',
    stars: 4302,
    license: 'GPL-3.0',
    description:
      'A Model Context Protocol (MCP) server that provides structured spec-driven development workflow tools for AI-a…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when context size or spend needs controlling.',
  },
  {
    repo: 'CodeGraphContext/CodeGraphContext',
    stars: 4242,
    license: 'MIT',
    description:
      'An MCP server plus a CLI tool that indexes local code into a graph database to provide context to AI assistant…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for infrastructure and data access.',
  },
  {
    repo: 'haris-musa/excel-mcp-server',
    stars: 4212,
    license: 'MIT',
    description:
      'A Model Context Protocol server for Excel file manipulation',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for office-document automation.',
  },
  {
    repo: 'Manavarya09/design-extract',
    stars: 4167,
    license: 'MIT',
    description:
      'Extract any website\'s complete design system with one command.',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for design-system and component work.',
  },
  {
    repo: 'bethington/ghidra-mcp',
    stars: 4124,
    license: 'Apache-2.0',
    description:
      'Ghidra MCP Server — 200+ MCP tools for AI-powered reverse engineering.',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for reverse engineering and binary analysis.',
  },
  {
    repo: 'Minidoracat/mcp-feedback-enhanced',
    stars: 3762,
    license: 'NOASSERTION',
    description:
      'Enhanced MCP server for interactive user feedback and command execution in AI-assisted development, featuring…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when a human must approve agent actions.',
  },
  {
    repo: 'microsoft/mcp',
    stars: 3730,
    license: 'MIT',
    description:
      'Catalog of official Microsoft MCP (Model Context Protocol) server implementations for AI-powered data access a…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when context size or spend needs controlling.',
  },
  {
    repo: 'stickerdaniel/linkedin-mcp-server',
    stars: 3727,
    license: 'Apache-2.0',
    description:
      'Open-source MCP server for LinkedIn. Give Claude and any MCP-compatible AI agent access to profiles, companies…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for research and data-gathering tasks.',
  },
  {
    repo: 'irinabuht12-oss/google-ads-meta-ads-mcp',
    stars: 3687,
    license: 'MIT',
    description:
      'Google Ads MCP server + Meta Ads MCP (Facebook Ads MCP) + GA4 + Search Console in one hosted remote MCP for Cl…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for research and data-gathering tasks.',
  },
  {
    repo: 'laravel/boost',
    stars: 3644,
    license: 'MIT',
    description:
      'Laravel-focused MCP server for augmenting your AI powered local development experience',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Check the README for the exact tool surface before wiring it in.',
  },
  {
    repo: 'Ryze-AI-Adgent/open-seo-mcp-skills',
    stars: 3627,
    license: 'MIT',
    description:
      'Free SEO MCP server + open-source SEO and GEO skills for Claude: keyword research, rank tracking, audits, back…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for research and data-gathering tasks.',
  },
  {
    repo: 'bytebase/dbhub',
    stars: 3602,
    license: 'MIT',
    description:
      'Token conscious database MCP server for Postgres, MySQL, SQL Server, Oracle, MariaDB, SQLite',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for infrastructure and data access.',
  },
  {
    repo: 'skyhook-io/radar',
    stars: 3592,
    license: 'Apache-2.0',
    description:
      'The missing open-source Kubernetes UI with a built-in MCP server for AI agents. See what\'s broken, why, and what changed.',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for design-system and component work.',
  },
  {
    repo: 'grafana/mcp-grafana',
    stars: 3525,
    license: 'Apache-2.0',
    description:
      'MCP server for Grafana',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for dashboards and metrics work.',
  },
  {
    repo: 'samuelgursky/davinci-resolve-mcp',
    stars: 3331,
    license: 'MIT',
    description:
      'MCP server integration for DaVinci Resolve Studio',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for creative and media tooling.',
  },
  {
    repo: 'taylorwilsdon/google_workspace_mcp',
    stars: 3280,
    license: 'MIT',
    description:
      'Control Gmail, Google Calendar, Docs, Sheets, Slides, Chat, Forms, Tasks, Search & Drive with AI - Comprehensi…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for office-document automation.',
  },
  {
    repo: 'blazickjp/arxiv-mcp-server',
    stars: 3188,
    license: 'Apache-2.0',
    description:
      'A local MCP server for agent literature work. Original-LaTeX section reads, BibTeX from arXiv metadata, and topic watches.',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for research and data-gathering tasks.',
  },
  {
    repo: 'Jpisnice/shadcn-ui-mcp-server',
    stars: 3021,
    license: 'MIT',
    description:
      'A mcp server to allow LLMS gain context about shadcn ui component structure,usage and installation,compaitable…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for design-system and component work.',
  },
  {
    repo: 'zcaceres/markdownify-mcp',
    stars: 2999,
    license: 'MIT',
    description:
      'A Model Context Protocol server for converting almost anything to Markdown',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when context size or spend needs controlling.',
  },
  {
    repo: 'coddingtonbear/obsidian-local-rest-api',
    stars: 2986,
    license: 'MIT',
    description:
      'A secure REST API and Model Context Protocol (MCP) server for your vault',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when context size or spend needs controlling.',
  },
  {
    repo: 'zhizhuodemao/js-reverse-mcp',
    stars: 2883,
    license: 'Apache-2.0',
    description:
      'AI Agent-first JS 逆向 MCP Server：有头 Chrome 调试、断点、网络/WebSocket 分析、Patchright 反检测，可选 CloakBrowser',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for reverse engineering and binary analysis.',
  },
  {
    repo: 'hi-godot/godot-ai',
    stars: 2777,
    license: 'MIT',
    description:
      'Production-grade MCP server and AI tools for the Godot engine. A Snap to install. Totally free and fun',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for creative and media tooling.',
  },
  {
    repo: 'jgravelle/jcodemunch-mcp',
    stars: 2729,
    license: 'NOASSERTION',
    description:
      'Cut AI token costs 95%+ on code exploration. The leading MCP server for precise, symbol-level GitHub code retr…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for issue tracker and wiki work.',
  },
  {
    repo: 'brightdata/brightdata-mcp',
    stars: 2661,
    license: 'MIT',
    description:
      'A powerful Model Context Protocol (MCP) server that provides an all-in-one solution for public web access',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when the agent must drive or read the live web.',
  },
  {
    repo: 'neka-nat/freecad-mcp',
    stars: 2659,
    license: 'MIT',
    description:
      'FreeCAD MCP(Model Context Protocol) server',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for creative and media tooling.',
  },
  {
    repo: 'perplexityai/modelcontextprotocol',
    stars: 2550,
    license: 'MIT',
    description:
      'The official MCP server implementation for the Perplexity API Platform',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Check the README for the exact tool surface before wiring it in.',
  },
  {
    repo: 'yctimlin/mcp_excalidraw',
    stars: 2498,
    license: 'MIT',
    description:
      'MCP server and Claude Code skill for Excalidraw — programmatic canvas toolkit to create, edit, and export diag…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for creative and media tooling.',
  },
  {
    repo: 'tavily-ai/tavily-mcp',
    stars: 2417,
    license: 'MIT',
    description:
      'Production ready MCP server with real-time search, extract, map & crawl',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when the agent must drive or read the live web.',
  },
  {
    repo: 'knowsuchagency/mcp2cli',
    stars: 2415,
    license: 'MIT',
    description:
      'Turn any MCP, OpenAPI, or GraphQL server into a CLI — at runtime, with zero codegen',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for spec-driven or code-graph workflows.',
  },
  {
    repo: 'redhat-et/ripwire',
    stars: 2393,
    license: 'Apache-2.0',
    description:
      'The ripgrep of AI context: a zero-dependency C++23 CLI + MCP server for coding agents.',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when context size or spend needs controlling.',
  },
  {
    repo: '0xMassi/webclaw',
    stars: 2366,
    license: 'AGPL-3.0',
    description:
      'Fast, local-first web content extraction for LLMs. Scrape, crawl, extract structured data — all from Rust.',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when the agent must drive or read the live web.',
  },
  {
    repo: 'financial-datasets/mcp-server',
    stars: 2300,
    license: 'MIT',
    description:
      'An MCP server for interacting with the Financial Datasets stock market API',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for research and data-gathering tasks.',
  },
  {
    repo: 'joshuayoes/ios-simulator-mcp',
    stars: 2186,
    license: 'MIT',
    description:
      'MCP server for interacting with the iOS simulator',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for mobile app automation.',
  },
  {
    repo: 'duty1g/x64dbg-mcp-server',
    stars: 2178,
    license: 'MIT',
    description:
      'x64dbg-MCP Server is a native MCP (Model Context Protocol) plugin for x64dbg that exposes the debugger\'s full…',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for reverse engineering and binary analysis.',
  },
  {
    repo: 'containers/kubernetes-mcp-server',
    stars: 2142,
    license: 'Apache-2.0',
    description:
      'Model Context Protocol (MCP) server for Kubernetes and OpenShift',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for infrastructure and data access.',
  },
  {
    repo: 'benborla/mcp-server-mysql',
    stars: 2141,
    license: 'MIT',
    description:
      'A Model Context Protocol server that provides read-only access to MySQL databases.',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for infrastructure and data access.',
  },
  {
    repo: 'A9T9/RPA',
    stars: 2061,
    license: 'NOASSERTION',
    description:
      'Browser and desktop automation with an MCP server for AI assistants.',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit when the agent must drive or read the live web.',
  },
  {
    repo: 'microsoft/azure-devops-mcp',
    stars: 2043,
    license: 'MIT',
    description:
      'The MCP server for Azure DevOps, bringing the power of Azure DevOps directly to your agents',
    category: 'MCP Servers',
    usage:
      'Register in the agent\'s mcp.json so these tools become callable. Best fit for issue tracker and wiki work.',
  },
];

/** Defensive gate: never surface a repo below the curated popularity floor. */
export const CUSTOM_PLUGINS: LibraryPlugin[] = PLUGINS.filter(
  (p) => p.stars >= PLUGIN_MIN_STARS,
).sort((a, b) => b.stars - a.stars);

/** GitHub's own compact star formatting: 179577 -> "179.6k". */
export function formatStars(stars: number): string {
  if (stars >= 1000) {
    const k = stars / 1000;
    return `${k >= 100 ? Math.round(k) : k.toFixed(1)}k`;
  }
  return String(stars);
}

/** Numeric grouping for tooltips: 179577 -> "179,577". */
export function formatStarExact(stars: number): string {
  return stars.toLocaleString('en-US');
}

const licenseLabel = (spdx: string): string =>
  spdx === 'Unlicensed' ? 'No license' : spdx === 'Other' ? 'Custom license' : spdx;

/**
 * Renders a plugin as a skill directive so dropping it onto an agent reuses the
 * existing skill-attach path. The agent gains the repo's provenance and a
 * concrete usage note rather than an actual runtime install — pulling and
 * executing third-party plugin code from a drag gesture is not something this
 * canvas should do implicitly.
 */
export function pluginToSkillItem(plugin: LibraryPlugin): StockSkillItem {
  const install = plugin.npmPackage
    ? `npx -y ${plugin.npmPackage}`
    : `git clone https://github.com/${plugin.repo}.git`;

  return {
    id: `plugin:${plugin.repo}`,
    name: plugin.repo,
    description: plugin.description,
    category: plugin.category,
    tags: ['plugin', plugin.category.toLowerCase(), plugin.license.toLowerCase()],
    content: [
      `# ${plugin.repo}`,
      '',
      plugin.description,
      '',
      '## Provenance',
      `- Repository: https://github.com/${plugin.repo}`,
      `- Stars: ~${formatStarExact(plugin.stars)} (GitHub API snapshot, ${VERIFIED_AT})`,
      `- License: ${licenseLabel(plugin.license)}`,
      `- Category: ${plugin.category}`,
      '',
      '## How to use it',
      plugin.usage,
      '',
      '## Getting it locally',
      '```bash',
      install,
      '```',
      '',
      `Read the README of ${plugin.repo} before relying on its interfaces, and check that the`,
      `license (${licenseLabel(plugin.license)}) permits your intended use.`,
    ].join('\n'),
    plugin,
  };
}