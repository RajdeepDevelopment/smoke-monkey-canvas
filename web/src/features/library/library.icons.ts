import type { LucideIcon } from 'lucide-react';
import {
  Package, WandSparkles, BrainCircuit, Wrench,
  Code2, ShieldCheck, CloudCog, ChartColumnIncreasing, Megaphone, Headphones,
  ListChecks, CircleDollarSign, Globe, LayoutGrid, FlaskConical, Gauge,
  Network, Activity, Scale, Kanban, Server, CircleUserRound,
  Compass, PencilLine, FolderOpen, Terminal, FlaskConical as Beaker,
  GitBranch, ListTodo, Box, Rocket, UserRoundCog, TextCursorInput,
  Database, BookOpen, Building2,
  Armchair, Smile, Leaf, Zap, Target, PartyPopper, Meh, ThumbsUp,
  Heart, HandHeart, HeartHandshake, Flower2, Hourglass, Shield, Sparkles,
  Coffee, Glasses, Radio, Gamepad2, Briefcase, Star, Crown, ClipboardList,
  Newspaper, TrendingUp, Sword, CircleCheck, Annoyed, Minus, TriangleAlert,
  Handshake, CircleHelp, Search, Lightbulb, Brain, ScrollText, Feather,
  Swords, Laugh, Smartphone, Table, Workflow, BarChart3, Blocks, GanttChart,
  GitFork, SquareCode, SquareTerminal, ArrowRightLeft, FileDiff, AlignLeft,
  AlignJustify, ListOrdered, List, Heading, Type, MessageCircleQuestion,
  Braces, Settings2, FileSpreadsheet, FileText, Presentation, Columns3,
  ListTree, MessagesSquare,
} from 'lucide-react';

/**
 * Every icon used in the Library Sidebar comes from lucide-react (the library
 * already used for the approved MCP `Package` glyph) or from the hand-authored
 * brand set in `common/brand-icons.tsx`. Emoji are intentionally not used: they
 * render differently per platform and read as unfinished next to SVG marks.
 */

/** Section header marks for the collapsed icon rail. */
export const LIB_TAB_ICONS: Record<string, LucideIcon> = {
  companies: Briefcase,
  mcp: Package,
  spaces: Building2,
  zones: Network,
  skills: WandSparkles,
  agents: BrainCircuit,
  tools: Wrench,
  personality: UserRoundCog,
  output: TextCursorInput,
};

/** Fallback accent per rail tab, used for the tile gradient. */
export const LIB_TAB_COLORS: Record<string, string> = {
  companies: '#6366f1',
  mcp: '#f97316',
  spaces: '#38bdf8',
  zones: '#a855f7',
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

/**
 * Curated glyph per personality-preset id. Ids come from the server catalogue in
 * `server/features/agent/agent.presets.ts`; when a preset is added there and not
 * registered here it falls back to its category mark, so the sidebar never
 * regresses to a single repeated tab icon.
 */
const PERSONALITY_PRESET_ICONS: Record<string, LucideIcon> = {
  // Tone & Mood
  'cool-laidback': Armchair,
  'warm-friendly': Smile,
  'calm-gentle': Leaf,
  'energetic-upbeat': Zap,
  'serious-focused': Target,
  'playful-witty': PartyPopper,
  'dry-humorous': Meh,
  encouraging: ThumbsUp,
  // Warm & Emotional
  'loving-affectionate': Heart,
  'caring-nurturing': HandHeart,
  empathetic: HeartHandshake,
  'romantic-poetic': Flower2,
  sentimental: Hourglass,
  protective: Shield,
  // Age & Generation
  'gen-z': Sparkles,
  millennial: Coffee,
  'gen-x': Glasses,
  boomer: Radio,
  teenager: Gamepad2,
  'young-professional': Briefcase,
  'childlike-wonder': Star,
  // Professional Personas
  'formal-corporate': Building2,
  'executive-brief': Crown,
  'startup-hustle': Rocket,
  'enterprise-architect': Network,
  consultant: ClipboardList,
  'news-anchor': Newspaper,
  'legal-counsel': Scale,
  'financial-advisor': TrendingUp,
  'mentor-coach': Compass,
  // Direct & Blunt
  'blunt-direct': Sword,
  'no-nonsense': CircleCheck,
  sardonic: Annoyed,
  terse: Minus,
  'brutally-honest': TriangleAlert,
  diplomatic: Handshake,
  // Academic & Scholarly
  socratic: CircleHelp,
  researcher: BookOpen,
  skeptic: Search,
  philosopher: Lightbulb,
  'technical-sage': Brain,
  scientific: FlaskConical,
  // Creative & Narrative
  storyteller: ScrollText,
  poet: Feather,
  gamemaster: Swords,
  comedian: Laugh,
  // Technical & Domain
  'senior-engineer': Code2,
  sre: Activity,
  'data-scientist': ChartColumnIncreasing,
  troubleshooter: Wrench,
};

const PERSONALITY_CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Tone & Mood': Smile,
  'Warm & Emotional': Heart,
  'Age & Generation': Smartphone,
  'Professional Personas': Briefcase,
  'Direct & Blunt': Sword,
  'Academic & Scholarly': BookOpen,
  'Creative & Narrative': Feather,
  'Technical & Domain': Code2,
};

/** Curated glyph per output-style id; falls back to the category mark. */
const OUTPUT_PRESET_ICONS: Record<string, LucideIcon> = {
  // Visual & Structured
  'table-first': Table,
  'mermaid-diagram': Workflow,
  'charts-widgets': BarChart3,
  'ascii-diagram': Blocks,
  'mind-map': Network,
  timeline: GanttChart,
  flowchart: GitFork,
  // Code & Technical
  'code-blocks': SquareCode,
  'shell-commands': SquareTerminal,
  'sql-queries': Database,
  'api-curl': ArrowRightLeft,
  'diff-patch': FileDiff,
  'unit-tests': FlaskConical,
  // Structure & Length
  'tldr-first': AlignLeft,
  'verbose-detailed': AlignJustify,
  'numbered-steps': ListOrdered,
  'bullets-only': List,
  'headed-sections': Heading,
  'prose-essay': Type,
  faq: MessageCircleQuestion,
  // Data & Config
  'json-output': Braces,
  'yaml-config': Settings2,
  'csv-delimited': FileSpreadsheet,
  'markdown-report': FileText,
  'executive-summary': Presentation,
  // Reasoning & Interaction
  'comparison-matrix': Columns3,
  checklist: ListChecks,
  'decision-tree': ListTree,
  'leading-questions': MessagesSquare,
  'one-line-answers': Minus,
};

const OUTPUT_CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Visual & Structured': LayoutGrid,
  'Code & Technical': Code2,
  'Structure & Length': ListOrdered,
  'Data & Config': Database,
  'Reasoning & Interaction': Workflow,
};

/**
 * Resolve a distinctive icon for a persona card: exact preset id first, then the
 * category, then the section mark as a last resort.
 */
export const personalityPresetIcon = (id: string, category?: string): LucideIcon =>
  PERSONALITY_PRESET_ICONS[id] ||
  (category ? PERSONALITY_CATEGORY_ICONS[category] : undefined) ||
  UserRoundCog;

/** Resolve a distinctive icon for an output-style card (same fallback order). */
export const outputPresetIcon = (id: string, category?: string): LucideIcon =>
  OUTPUT_PRESET_ICONS[id] ||
  (category ? OUTPUT_CATEGORY_ICONS[category] : undefined) ||
  TextCursorInput;

/** `owner/repo` -> `owner`, tolerating a bare owner or a full URL. */
export const githubOwner = (repo: string): string => {
  const cleaned = (repo || '')
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/^\/+/, '')
    .trim();
  return cleaned.split('/')[0] || cleaned;
};

/**
 * Canonical live logo URL for a repo's owner. GitHub serves a public avatar for
 * any account at `github.com/<owner>.png`, so the real project mark loads
 * without bundling a per-repo image map.
 */
export const githubOwnerAvatarUrl = (repo: string, size = 64): string =>
  `https://github.com/${githubOwner(repo)}.png?size=${size}`;
