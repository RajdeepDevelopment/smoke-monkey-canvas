#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.resolve(here, '../web/src/features/agent/agent.templates.ts');
const SERVER_TARGET = path.resolve(here, '../server/features/agent/agent.stock-templates.json');

const content = fs.readFileSync(TARGET, 'utf8');

// Extract pieces
const mcpPurpose = content.match(/const MCP_PURPOSE[\s\S]*?^};\n\n/m)[0];
const buildPrompt = content.match(/function buildSystemPrompt[\s\S]*?^}\n\n/m)[0];
const skillNames = content.match(/const SKILL_NAMES[\s\S]*?^};\n\n/m)[0];

// Parse existing
const specStart = content.indexOf('const AGENT_SPECS: AgentSpec[] = [');
const specEnd = content.indexOf('\n];\n\nexport const ENTERPRISE_AGENT_TEMPLATES');
const specsSection = content.slice(specStart, specEnd + 3);

const existingSpecs = [];
const re = /\{\s*"id"\s*:/g;
let match;
while ((match = re.exec(specsSection)) !== null) {
  const start = match.index;
  let depth = 0;
  let inStr = false;
  let strChar = null;
  for (let i = start; i < specsSection.length; i++) {
    const c = specsSection[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === strChar) { inStr = false; strChar = null; }
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; strChar = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        const objStr = specsSection.slice(start, i + 1);
        try { existingSpecs.push(JSON.parse(objStr)); } catch {}
        break;
      }
    }
  }
}

// Generate smart agents
const smartAgents = [];

// Software Developers
for (let i = 1; i <= 50; i++) {
  const num = String(i).padStart(3, '0');
  smartAgents.push({
    id: `sd-${num}`,
    name: `Software Developer SD${i}`,
    category: 'Software Development',
    subcategory: i % 5 === 0 ? 'Backend & APIs' : i % 5 === 1 ? 'Frontend & UI' : i % 5 === 2 ? 'Full Stack' : i % 5 === 3 ? 'DevOps & CI/CD' : 'Platform & Infrastructure',
    specialty: i % 5 === 0 ? 'Backend Engineering' : i % 5 === 1 ? 'Frontend Engineering' : i % 5 === 2 ? 'Full Stack Development' : i % 5 === 3 ? 'DevOps Engineering' : 'Platform Engineering',
    role: 'Senior Software Engineer',
    description: `Software Developer SD${i} - Specialized in ${i % 5 === 0 ? 'backend systems, APIs, and microservices' : i % 5 === 1 ? 'frontend frameworks, UI/UX implementation' : i % 5 === 2 ? 'end-to-end product development' : i % 5 === 3 ? 'CI/CD, automation, and infrastructure' : 'scalable platform architecture'}.`,
    mission: `Write clean, testable, production-ready code. Collaborate effectively with product, QA, and DevOps teams. Continuously improve codebase quality and developer experience.`,
    duties: [
      'Design and implement features with proper testing',
      'Review pull requests and provide constructive feedback',
      'Debug and resolve production issues',
      'Optimize performance and scalability',
      'Document technical decisions and architecture',
      'Mentor junior developers and share knowledge',
      'Coordinate with cross-functional teams for seamless delivery'
    ],
    tags: ['Software', 'Development', 'Engineering', 'Code'],
    cron: null,
    mcps: ["git-mcp", "filesystem-mcp", "docker-mcp", "playwright-mcp"],
    skills: ['test-driven-development', 'code-review-and-quality', 'debugging-and-error-recovery', 'git-workflow-and-versioning', 'api-and-interface-design', 'performance-optimization'],
    policies: [],
    model: i % 2 === 0 ? 'nvidia/nemotron-3-ultra-550b-a55b' : 'gemini-4-argon',
    provider: i % 2 === 0 ? 'nvidia' : 'gemini'
  });
}

// Software Testers/QA
for (let i = 1; i <= 40; i++) {
  const num = String(i).padStart(3, '0');
  smartAgents.push({
    id: `st-${num}`,
    name: `Software Tester ST${i}`,
    category: 'Software Development',
    subcategory: 'Quality Assurance',
    specialty: i % 3 === 0 ? 'Automation Testing' : i % 3 === 1 ? 'Manual Testing' : 'Performance Testing',
    role: 'QA Engineer',
    description: `Software Tester ST${i} - Expert in ${i % 3 === 0 ? 'test automation with Playwright/Cypress' : i % 3 === 1 ? 'exploratory and manual testing' : 'load testing and performance validation'}.`,
    mission: 'Ensure product quality through comprehensive testing. Catch bugs early, validate requirements, and advocate for user experience.',
    duties: [
      'Create and execute test plans and test cases',
      'Automate regression tests and E2E flows',
      'Perform exploratory and edge case testing',
      'Report bugs with clear reproduction steps',
      'Validate fixes and conduct regression testing',
      'Coordinate with developers on quality standards',
      'Monitor production for quality issues'
    ],
    tags: ['QA', 'Testing', 'Quality', 'Automation'],
    cron: null,
    mcps: ["playwright-mcp", "puppeteer-mcp", "filesystem-mcp"],
    skills: ['test-driven-development', 'debugging-and-error-recovery', 'browser-testing-with-devtools', 'code-review-and-quality'],
    policies: [],
    model: i % 2 === 0 ? 'nvidia/nemotron-3-ultra-550b-a55b' : 'gemini-4-argon',
    provider: i % 2 === 0 ? 'nvidia' : 'gemini'
  });
}

// Digital Marketing
for (let i = 1; i <= 60; i++) {
  const num = String(i).padStart(3, '0');
  smartAgents.push({
    id: `dm-${num}`,
    name: `Digital Marketer DM${i}`,
    category: 'Sales & Marketing',
    subcategory: 'Demand Generation',
    specialty: i % 4 === 0 ? 'SEO & Content Marketing' : i % 4 === 1 ? 'Paid Advertising' : i % 4 === 2 ? 'Social Media Marketing' : 'Email & Automation',
    role: 'Digital Marketing Specialist',
    description: `Digital Marketer DM${i} - Focused on ${i % 4 === 0 ? 'SEO, content strategy, and organic growth' : i % 4 === 1 ? 'PPC, Meta ads, and paid campaigns' : i % 4 === 2 ? 'social media strategy and community building' : 'email marketing, automation, and nurturing'}.`,
    mission: 'Drive qualified traffic and conversions through data-driven marketing strategies. Optimize campaigns for ROI and scale what works.',
    duties: [
      'Plan and execute multi-channel marketing campaigns',
      'Conduct keyword research and SEO optimization',
      'Create and optimize ad campaigns',
      'Analyze campaign performance and ROI',
      'Build and nurture email/automation flows',
      'Coordinate with content and design teams',
      'Track attribution and conversion metrics'
    ],
    tags: ['Marketing', 'Digital', 'SEO', 'Growth'],
    cron: null,
    mcps: [],
    skills: ['copywriting', 'seo-audit', 'content-strategy', 'analytics', 'ab-testing', 'social'],
    policies: [],
    model: i % 2 === 0 ? 'nvidia/nemotron-3-ultra-550b-a55b' : 'gemini-4-argon',
    provider: i % 2 === 0 ? 'nvidia' : 'gemini'
  });
}

// SEO Specialists
for (let i = 1; i <= 30; i++) {
  const num = String(i).padStart(3, '0');
  smartAgents.push({
    id: `seo-${num}`,
    name: `SEO Specialist SEO${i}`,
    category: 'Sales & Marketing',
    subcategory: 'Growth Engine',
    specialty: i % 3 === 0 ? 'Technical SEO' : i % 3 === 1 ? 'Content SEO' : 'Local SEO',
    role: 'SEO Specialist',
    description: `SEO Specialist SEO${i} - Expert in ${i % 3 === 0 ? 'technical audits, site architecture, Core Web Vitals' : i % 3 === 1 ? 'content strategy, keyword research, link building' : 'local search, Google Business Profile, citations'}.`,
    mission: 'Improve organic visibility and drive qualified traffic through technical excellence and strategic content optimization.',
    duties: [
      'Conduct comprehensive SEO audits',
      'Fix technical SEO issues and improve site speed',
      'Research keywords and build content strategies',
      'Optimize on-page elements and schema markup',
      'Build high-quality backlinks',
      'Monitor rankings and organic traffic',
      'Coordinate with developers on technical implementations'
    ],
    tags: ['SEO', 'Search', 'Organic', 'Traffic'],
    cron: null,
    mcps: ["fetch-mcp"],
    skills: ['seo-audit', 'ai-seo', 'schema', 'content-strategy', 'technical-seo'],
    policies: [],
    model: i % 2 === 0 ? 'nvidia/nemotron-3-ultra-550b-a55b' : 'gemini-4-argon',
    provider: i % 2 === 0 ? 'nvidia' : 'gemini'
  });
}

// Add more categories...
const categories = [
  ['Data & Analytics', 'Data Engineer', ['Data Engineering', 'Modeling & Warehousing', 'Analytics & Insights'], 40],
  ['Product & Project Management', 'Product Manager', ['Product Strategy', 'Product Definition', 'Delivery & Execution'], 40],
  ['Security & SecOps', 'Security Analyst', ['Application Security', 'Cloud & Infrastructure Security', 'Detection & Response'], 35],
  ['Customer Experience', 'Support Specialist', ['Support Operations', 'Technical Support', 'Onboarding & Retention'], 35],
  ['People & Talent', 'HR Specialist', ['Recruiting & Hiring', 'Onboarding & Offboarding', 'People Analytics'], 30],
  ['Finance & Accounting', 'Finance Analyst', ['Accounting & Close', 'Planning & Forecasting', 'Revenue & Billing'], 30],
  ['Legal & Compliance', 'Legal Counsel', ['Contracts & Commercial', 'Privacy & Data Protection', 'Governance & Regulatory'], 25],
  ['AI & Machine Learning', 'AI Engineer', ['Model Evaluation', 'Prompting & Alignment', 'Retrieval Systems'], 40],
  ['Business Strategy & Operations', 'Strategy Consultant', ['Strategic Planning', 'Business Analysis', 'Process Optimization'], 35],
  ['IT & Operations', 'IT Specialist', ['Endpoints & Devices', 'IT Helpdesk', 'Infrastructure & Network'], 40],
];

for (const [cat, role, subs, count] of categories) {
  for (let i = 1; i <= count; i++) {
    const num = String(i).padStart(3, '0');
    const prefix = role.split(' ')[0].substring(0, 3).toUpperCase();
    smartAgents.push({
      id: `${prefix.toLowerCase()}-${num}`,
      name: `${role} ${prefix}${i}`,
      category: cat,
      subcategory: subs[i % subs.length],
      specialty: subs[i % subs.length],
      role,
      description: `${role} ${prefix}${i} - Specialized professional in ${cat.toLowerCase()} domain.`,
      mission: `Deliver exceptional results in ${cat.toLowerCase()}. Collaborate across teams, drive continuous improvement, and maintain high standards of quality and professionalism.`,
      duties: [
        `Execute ${cat.toLowerCase()} initiatives and projects`,
        'Analyze data and provide actionable insights',
        'Collaborate with cross-functional teams',
        'Maintain documentation and best practices',
        'Identify and solve complex problems',
        'Drive process improvements',
        'Ensure compliance with standards and policies'
      ],
      tags: cat.split(' ')[0].split('&')[0].trim().split(' '),
      cron: i % 4 === 0 ? '0 9 * * 1' : null,
      mcps: ["gmail"],
      skills: ['planning-and-task-breakdown', 'documentation-and-adrs', 'communication', 'problem-solving'],
      policies: [],
      model: i % 3 === 0 ? 'nvidia/nemotron-3-ultra-550b-a55b' : i % 3 === 1 ? 'gemini-4-argon' : 'gemini-3.8-flash',
      provider: i % 3 === 0 ? 'nvidia' : 'gemini'
    });
  }
}

const allSpecs = [...existingSpecs, ...smartAgents];

// Keep generated agents on the canonical MCP IDs. Older/manual names are
// aliases of the hosted MCP.ai entries and would otherwise reappear here.
const CANONICAL_MCP_NAMES = {
  'github-mcp-server': 'mcpai-github',
  'slack-mcp': 'mcpai-slack',
  'google-drive-mcp': 'mcpai-googledrive',
  'notion-mcp-server': 'mcpai-notion',
  gcal: 'mcpai-googlecalendar',
  gmail: 'mcpai-gmail',
};
for (const spec of allSpecs) {
  if (!Array.isArray(spec.mcps)) continue;
  spec.mcps = [...new Set(spec.mcps.map((name) => CANONICAL_MCP_NAMES[name] || name))];
}

console.log(`Total agents: ${allSpecs.length}`);

// Enhanced system prompt
function buildEnhancedPrompt(spec) {
  const parts = [];
  parts.push(`# AGENT IDENTITY
You are **${spec.name}** (${spec.role}).
Category: ${spec.category} | Subcategory: ${spec.subcategory || 'General'} | Specialty: ${spec.specialty || 'General'}`);

  parts.push(`## MISSION
${spec.mission}`);

  parts.push(`## CORE RESPONSIBILITIES
${(spec.duties || []).map((d, i) => `${i + 1}. ${d}`).join('\n')}`);

  parts.push(`## SPECIALTY FOCUS
Your primary expertise is in **${spec.specialty || spec.subcategory || spec.category}**. You excel at tasks related to this domain and can coordinate effectively with other specialists.`);

  parts.push(`## COORDINATION & TEAMWORK
- **Cross-functional collaboration**: Work seamlessly with other agents and teams based on project needs
- **Clear communication**: Provide concise, actionable updates and ask clarifying questions when needed
- **Handoffs**: When a task requires expertise outside your specialty, delegate to the appropriate specialist
- **Stakeholder management**: Keep relevant parties informed and aligned`);

  parts.push(`## SMART BEHAVIOR
- **Context awareness**: Understand the full picture before taking action
- **Proactive thinking**: Anticipate needs and potential issues
- **Tool selection**: Choose the right MCP, skill, or approach for each task
- **Quality first**: Validate your work before presenting it
- **Continuous learning**: Adapt and improve based on feedback
- **Self-improvement**: You can modify your own system prompt, add to your memory/fact files, or update your configuration to become more effective over time. When you identify ways to improve your performance, update your agent configuration files in the workspace.`);

  if (spec.mcps && spec.mcps.length) {
    parts.push(`## AVAILABLE MCP TOOLS
You have access to these MCP servers: ${spec.mcps.join(', ')}
Use them when they can help accomplish your tasks more effectively.`);
  }

  if (spec.skills && spec.skills.length) {
    parts.push(`## AVAILABLE SKILLS
You have access to these skills: ${spec.skills.join(', ')}
Load and apply relevant skills using the skill system when working on matching tasks.`);
  }

  parts.push(`## TASK SCOPE
**CAN DO:** Tasks within your specialty (${spec.specialty}), related domain work, coordination with team members, research and analysis in your area, documentation.
**SHOULD ESCALATE/DELEGATE:** Tasks requiring deep expertise in completely different domains outside your scope.

## OPERATING PRINCIPLES
- Think step by step before acting
- Use tools and skills when they add value
- Communicate clearly and professionally
- Deliver working solutions, not just analysis
- Document important decisions and rationale
- Maintain high quality standards
- Be efficient and pragmatic
- Learn from every interaction to improve

## OUTPUT GUIDELINES
- Provide clear, structured responses
- Include relevant details and next steps
- Use appropriate formatting
- Focus on actionable outcomes
- Tailor communication to the audience`);

  return parts.join('\n\n');
}

// Write file
const expandedDomains = ['All', ...new Set([...['Software Development','People & Talent','Finance & Accounting','Sales & Marketing','Customer Experience','Legal & Compliance','Data & Analytics','Security & SecOps','Product & Project Management','IT & Operations'], ...smartAgents.map(a=>a.category)])];
const domainsLiteral = expandedDomains.slice(1).map(d => `  '${d}',`).join('\n');

const out = `// Generated by tools/generate-smart-agents.mjs — ${allSpecs.length}+ smart agents
// Intelligent agents with detailed roles, responsibilities, MCPs, skills, and self-improvement capabilities
// Uses NVIDIA and Google Gemini models by default

export interface AgentTemplate {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  specialty?: string;
  role: string;
  description: string;
  system_prompt: string;
  default_model: string;
  provider: string;
  tags: string[];
  suggested_cron: string | null;
  policies?: string[];
  recommended_mcps?: string[];
  recommended_skills?: string[];
  isCustom?: boolean;
}

export const ENTERPRISE_CATEGORIES = [
  'All',
${domainsLiteral}
] as const;

export type EnterpriseCategory = (typeof ENTERPRISE_CATEGORIES)[number];

export const ENTERPRISE_DISCIPLINES: Record<string, readonly string[]> = {};

export const ENTERPRISE_SPECIALTIES: Record<string, readonly string[]> = {};

${mcpPurpose}
${buildPrompt}
${skillNames}
const AGENT_SPECS: AgentSpec[] = [
${allSpecs.map(s => `  ${JSON.stringify({...s, system_prompt: buildEnhancedPrompt(s)})},`).join('\n')}
];

export const ENTERPRISE_AGENT_TEMPLATES: AgentTemplate[] = AGENT_SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  category: spec.category,
  subcategory: spec.subcategory,
  specialty: spec.specialty,
  role: spec.role,
  description: spec.description,
  system_prompt: spec.system_prompt || buildEnhancedPrompt(spec),
  default_model: spec.model,
  provider: spec.provider,
  tags: spec.tags,
  suggested_cron: spec.cron,
  policies: spec.policies,
  recommended_mcps: spec.mcps,
  recommended_skills: spec.skills,
}));
`;

fs.writeFileSync(TARGET, out);
const serverStock = allSpecs.map((s) => ({
  id: s.id,
  name: s.name,
  category: s.category,
  subcategory: s.subcategory,
  specialty: s.specialty,
  role: s.role,
  description: s.description,
}));
fs.writeFileSync(SERVER_TARGET, JSON.stringify(serverStock, null, 2));
console.log('Done - generated', allSpecs.length, 'agents');
