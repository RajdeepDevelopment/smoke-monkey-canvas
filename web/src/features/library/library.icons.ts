import type { LucideIcon } from 'lucide-react';
import {
  Package, WandSparkles, BrainCircuit, Wrench,
  Code2, ShieldCheck, CloudCog, ChartColumnIncreasing, Megaphone, Headphones,
  ListChecks, CircleDollarSign, Globe, LayoutGrid, FlaskConical, Gauge,
  Network, Activity, Scale, Kanban, Server, CircleUserRound,
  Compass, PencilLine, FolderOpen, Terminal, FlaskConical as Beaker,
  GitBranch, ListTodo, Box, Rocket, UserRoundCog, TextCursorInput,
  Database, BookOpen,
} from 'lucide-react';

/**
 * Every icon used in the Library Sidebar comes from lucide-react (the library
 * already used for the approved MCP `Package` glyph) or from the hand-authored
 * brand set in `common/brand-icons.tsx`. Emoji are intentionally not used: they
 * render differently per platform and read as unfinished next to SVG marks.
 */

/** Section header marks for the collapsed icon rail. */
export const LIB_TAB_ICONS: Record<string, LucideIcon> = {
  mcp: Package,
  skills: WandSparkles,
  agents: BrainCircuit,
  tools: Wrench,
  personality: UserRoundCog,
  output: TextCursorInput,
};

/** Fallback accent per rail tab, used for the tile gradient. */
export const LIB_TAB_COLORS: Record<string, string> = {
  mcp: '#f97316',
  skills: '#a78bfa',
  agents: '#10b981',
  tools: '#06b6d4',
  personality: '#ec4899',
  output: '#8b5cf6',
};

const SKILL_CATEGORY_ICONS: Record<string, LucideIcon> = {
  Engineering: Code2,
  'Engineering & DevOps': Code2,
  'Backend & APIs': Server,
  'Frontend & UI': LayoutGrid,
  'DevOps & CI/CD': CloudCog,
  DevOps: CloudCog,
  'QA & Testing': FlaskConical,
  'Security & Hardening': ShieldCheck,
  Security: ShieldCheck,
  'Security & SecOps': ShieldCheck,
  'Performance & Optimization': Gauge,
  'Architecture & Planning': Network,
  'Review & Code Quality': Code2,
  'Observability & Debugging': Activity,
  'Customer Support & Success': Headphones,
  'Sales & Marketing': Megaphone,
  Marketing: Megaphone,
  Support: Headphones,
  'Legal & Compliance': Scale,
  'Finance & Accounting': CircleDollarSign,
  Finance: CircleDollarSign,
  'Data & Business Intelligence': ChartColumnIncreasing,
  Data: ChartColumnIncreasing,
  'Product & Project Management': Kanban,
  Productivity: ListChecks,
  'Web Scraping & Research': Globe,
  'Operations & IT Admin': Server,
  'HR & People Operations': CircleUserRound,
  'Software Development': Code2,
  'People & Talent': CircleUserRound,
  'Customer Experience': Headphones,
  'Data & Analytics': ChartColumnIncreasing,
  'IT & Operations': Server,
};

/** Skill category accents, extended to cover the server's SKILL_CATEGORIES. */
export const SKILL_CATEGORY_COLORS: Record<string, string> = {
  Engineering: '#f97316',
  'Engineering & DevOps': '#f97316',
  'Backend & APIs': '#f97316',
  'Frontend & UI': '#ec4899',
  'DevOps & CI/CD': '#3b82f6',
  DevOps: '#3b82f6',
  'QA & Testing': '#10b981',
  'Security & Hardening': '#ef4444',
  Security: '#ef4444',
  'Security & SecOps': '#ef4444',
  'Performance & Optimization': '#f59e0b',
  'Architecture & Planning': '#8b5cf6',
  'Review & Code Quality': '#a78bfa',
  'Observability & Debugging': '#22d3ee',
  'Customer Support & Success': '#10b981',
  Support: '#10b981',
  'Sales & Marketing': '#ec4899',
  Marketing: '#ec4899',
  'Legal & Compliance': '#6366f1',
  'Finance & Accounting': '#06b6d4',
  Finance: '#06b6d4',
  'Data & Business Intelligence': '#8b5cf6',
  Data: '#8b5cf6',
  'Product & Project Management': '#0ea5e9',
  Productivity: '#f59e0b',
  'Web Scraping & Research': '#14b8a6',
  'Operations & IT Admin': '#475569',
  'HR & People Operations': '#d946ef',
  'Software Development': '#f97316',
  'People & Talent': '#d946ef',
  'Customer Experience': '#10b981',
  'Data & Analytics': '#8b5cf6',
  'IT & Operations': '#475569',
};

export const skillCategoryIcon = (category: string): LucideIcon =>
  SKILL_CATEGORY_ICONS[category] || WandSparkles;

export const skillCategoryColor = (category: string): string =>
  SKILL_CATEGORY_COLORS[category] || '#64748b';

/** Agent-template categories reuse the skill accent/icon tables where names match. */
export const agentCategoryIcon = (category: string): LucideIcon =>
  SKILL_CATEGORY_ICONS[category] || BrainCircuit;

export const agentCategoryColor = (category: string): string =>
  SKILL_CATEGORY_COLORS[category] || '#10b981';

/** Curated icon per toolkit id; ids come from TOOL_KITS in library.data.ts. */
export const TOOLKIT_ICONS: Record<string, LucideIcon> = {
  navigator: Compass,
  editor: PencilLine,
  files: FolderOpen,
  shell: Terminal,
  testing: Beaker,
  git: GitBranch,
  planning: ListTodo,
  toolbelt: Box,
  autonomy: Rocket,
};

export const toolkitIcon = (id: string): LucideIcon => TOOLKIT_ICONS[id] || Wrench;

/** Categories used by the custom GitHub plugin catalog. */
export const PLUGIN_CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Skills': WandSparkles,
  'MCP Servers': Package,
  'MCP Registries': Network,
  'Plugin Marketplace': Box,
  'Coding Agents': Terminal,
  'Agent Runtimes': BrainCircuit,
  'Agent Memory': Database,
  'Observability': Activity,
  'Knowledge & RAG': BookOpen,
};

export const PLUGIN_CATEGORY_COLORS: Record<string, string> = {
  'Skills': '#a78bfa',
  'MCP Servers': '#06b6d4',
  'MCP Registries': '#0ea5e9',
  'Plugin Marketplace': '#f97316',
  'Coding Agents': '#22c55e',
  'Agent Runtimes': '#10b981',
  'Agent Memory': '#ec4899',
  'Observability': '#f59e0b',
  'Knowledge & RAG': '#6366f1',
};

export const pluginCategoryIcon = (category: string): LucideIcon =>
  PLUGIN_CATEGORY_ICONS[category] || Package;

export const pluginCategoryColor = (category: string): string =>
  PLUGIN_CATEGORY_COLORS[category] || '#64748b';
