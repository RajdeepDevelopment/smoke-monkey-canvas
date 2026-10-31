import type { CompanyPreset, CompanyScale } from '../library.types.js';

export interface PlacedCompanyZone {
  id: string;
  chainNodeId: string;
  roleTitle: string;
  name: string;
  level: number;
  parentZoneId: string | null;
  responsibilities?: string;
  workflowInstructions?: string;
  delegationPolicy?: 'auto' | 'down' | 'up' | 'both' | 'peers';
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rectangle' | 'circle';
}

export interface PlacedCompanyAgent {
  zoneRoleTitle: string;
  zoneId: string;
  agentTemplateId: string;
  agentName?: string;
  roleTitle?: string;
  model?: string;
  provider?: string;
  systemPrompt?: string;
  recommended_mcps?: string[];
  recommended_skills?: string[];
  x: number;
  y: number;
}

export interface CompanyLayoutResult {
  space: {
    name: string;
    description?: string;
    category?: string;
    width: number;
    height: number;
    color: string;
    shape: 'rectangle' | 'circle';
    workflowPrompt?: string;
    workflowInstructions?: string;
    responsibilities?: string;
    projectBrief?: string;
  };
  zones: PlacedCompanyZone[];
  agents: PlacedCompanyAgent[];
  requiredWidth: number;
  requiredHeight: number;
}

export const COMPANY_PRESETS: CompanyPreset[] = [
  // 1. SaaS & Cloud Software Enterprise
  {
    id: 'company-saas-cloud',
    name: 'Apex Cloud Technologies',
    category: 'Software & SaaS',
    domain: 'Enterprise Cloud & Microservices',
    tagline: 'High-velocity B2B SaaS platform delivering scalable multi-tenant distributed cloud systems.',
    description: 'Complete turn-key cloud software enterprise with executive board, multi-tiered engineering hierarchy, DevOps infrastructure, automated QA testing, and product design squads.',
    icon: 'Code2',
    color: '#3b82f6',
    scales: {
      small: {
        scale: 'small',
        label: 'Startup / Lean Squad',
        headcountLabel: '6 Agents • 4 Zones',
        description: 'Lean agile startup with high execution velocity, direct founder-led engineering, and rapid release cycles.',
        space: {
          name: 'Apex Cloud Labs (Lean)',
          description: 'High-intensity startup office space optimized for fast shipping and zero bureaucracy.',
          category: 'Software',
          width: 1400,
          height: 820,
          color: '#3b82f6',
          shape: 'rectangle',
          workflowPrompt: 'Focus on shipping MVP features with high code quality, reliable unit tests, and continuous deployment.',
          workflowInstructions: '1. CEO sets weekly sprint objectives.\n2. CTO architects APIs and tech stack.\n3. Tech Lead and Senior Dev build features in PRs.\n4. QA tests pull requests before deployment.',
          responsibilities: 'Build, test, and ship core SaaS product features.'
        },
        zones: [
          {
            id: 'apex-sm-ceo',
            roleTitle: 'CEO',
            name: 'Executive Strategy & Vision',
            level: 0,
            parentId: null,
            responsibilities: 'Company direction, fundraising, and product-market fit.',
            workflowInstructions: 'Guide sprint priorities and review weekly product milestones.',
            color: '#a855f7',
            width: 280,
            height: 150
          },
          {
            id: 'apex-sm-cto',
            roleTitle: 'CTO',
            name: 'Engineering Architecture',
            level: 1,
            parentId: 'apex-sm-ceo',
            responsibilities: 'Core system architecture, tech stack selection, and scalability.',
            workflowInstructions: 'Review technical designs and unblock developers.',
            color: '#3b82f6',
            width: 280,
            height: 150
          },
          {
            id: 'apex-sm-lead',
            roleTitle: 'Tech Lead',
            name: 'Core Application Development',
            level: 2,
            parentId: 'apex-sm-cto',
            responsibilities: 'Feature delivery, pull request reviews, and code standards.',
            workflowInstructions: 'Implement API contracts and lead development sprints.',
            color: '#6366f1',
            width: 320,
            height: 150
          },
          {
            id: 'apex-sm-qa',
            roleTitle: 'QA Engineer',
            name: 'Verification & Quality Gates',
            level: 2,
            parentId: 'apex-sm-cto',
            responsibilities: 'Playwright test automation and bug reporting.',
            workflowInstructions: 'Run automated E2E tests on all PR branches.',
            color: '#06b6d4',
            width: 280,
            height: 150
          }
        ],
        agents: [
          { zoneRoleTitle: 'CEO', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, CEO', roleTitle: 'Chief Executive Officer' },
          { zoneRoleTitle: 'CTO', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Tech Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Senior Dev', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'QA Engineer', agentTemplateId: 'eng-qa-automation-engineer', agentName: 'Lucas Gray, QA Engineer', roleTitle: 'QA Automation Engineer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-associate-software-developer', agentName: 'Alex Rivera, Junior Dev', roleTitle: 'Associate Developer' }
        ]
      },
      mid: {
        scale: 'mid',
        label: 'Mid-Market Growth Scale',
        headcountLabel: '16 Agents • 8 Zones',
        description: 'Structured growth-stage SaaS company with dedicated engineering managers, QA managers, SRE infrastructure, and product managers.',
        space: {
          name: 'Apex Cloud Headquarters',
          description: 'Spacious multi-squad corporate headquarters with distinct zones for leadership, development, DevOps, and quality.',
          category: 'Software',
          width: 2200,
          height: 1150,
          color: '#3b82f6',
          shape: 'rectangle',
          workflowPrompt: 'Operate with agile two-week sprints. Deliver enterprise reliability, 99.99% uptime, robust API contracts, and user-friendly UX.',
          workflowInstructions: '1. Executive board sets quarterly OKRs.\n2. EM & PM break requirements into sprint epics.\n3. Tech leads & engineers write feature code and tests.\n4. DevOps leads maintain CI/CD pipelines and Kubernetes clusters.\n5. QA team enforces release sign-off criteria.',
          responsibilities: 'Enterprise cloud platform engineering, high-availability infrastructure, and rapid product iteration.'
        },
        zones: [
          {
            id: 'apex-md-ceo',
            roleTitle: 'CEO',
            name: 'Executive Board',
            level: 0,
            parentId: null,
            responsibilities: 'Enterprise strategy, capital allocation, and executive alignment.',
            workflowInstructions: 'Set quarterly strategic initiatives and review cross-squad health.',
            color: '#a855f7',
            width: 300,
            height: 155
          },
          {
            id: 'apex-md-cto',
            roleTitle: 'CTO',
            name: 'Technology Office',
            level: 1,
            parentId: 'apex-md-ceo',
            responsibilities: 'Engineering architecture, tech stack standards, and R&D.',
            workflowInstructions: 'Oversee Engineering Manager, DevOps Lead, and QA Manager.',
            color: '#3b82f6',
            width: 300,
            height: 155
          },
          {
            id: 'apex-md-coo',
            roleTitle: 'COO',
            name: 'Operations & People',
            level: 1,
            parentId: 'apex-md-ceo',
            responsibilities: 'Organizational throughput, HR ops, and sales enablement.',
            workflowInstructions: 'Align product delivery with customer success and sales teams.',
            color: '#10b981',
            width: 300,
            height: 155
          },
          {
            id: 'apex-md-em',
            roleTitle: 'Engineering Manager',
            name: 'Squad Engineering Management',
            level: 2,
            parentId: 'apex-md-cto',
            responsibilities: 'Sprint delivery velocity, developer health, and ticket backlog.',
            workflowInstructions: 'Coordinate daily standups, unblock engineers, and manage sprint burndown.',
            color: '#3b82f6',
            width: 310,
            height: 155
          },
          {
            id: 'apex-md-qa-mgr',
            roleTitle: 'QA Manager',
            name: 'Quality Assurance & Release Sign-Off',
            level: 2,
            parentId: 'apex-md-cto',
            responsibilities: 'Quality metrics, test automation frameworks, and staging sign-off.',
            workflowInstructions: 'Audit test coverage and conduct regression sweeps before releases.',
            color: '#06b6d4',
            width: 310,
            height: 155
          },
          {
            id: 'apex-md-devops',
            roleTitle: 'DevOps Lead',
            name: 'Cloud Infrastructure & SRE',
            level: 2,
            parentId: 'apex-md-cto',
            responsibilities: 'Kubernetes orchestration, CI/CD pipelines, and cloud security.',
            workflowInstructions: 'Maintain zero-downtime deployments and monitor cluster latency.',
            color: '#ec4899',
            width: 310,
            height: 155
          },
          {
            id: 'apex-md-devs',
            roleTitle: 'Tech Lead',
            name: 'Core Application Engineering',
            level: 3,
            parentId: 'apex-md-em',
            responsibilities: 'Feature development, full-stack microservices, and code reviews.',
            workflowInstructions: 'Write clean TypeScript/Node.js/React code with 85%+ test coverage.',
            color: '#6366f1',
            width: 380,
            height: 170
          },
          {
            id: 'apex-md-pm',
            roleTitle: 'Product Manager',
            name: 'Product Discovery & UX',
            level: 2,
            parentId: 'apex-md-coo',
            responsibilities: 'PRD writing, user story mapping, and design specifications.',
            workflowInstructions: 'Synthesize user feedback into prioritized backlog tickets.',
            color: '#f59e0b',
            width: 310,
            height: 155
          }
        ],
        agents: [
          { zoneRoleTitle: 'CEO', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, CEO', roleTitle: 'Chief Executive Officer' },
          { zoneRoleTitle: 'CTO', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'COO', agentTemplateId: 'lead-coo', agentName: 'Nadia Thorne, COO', roleTitle: 'Chief Operating Officer' },
          { zoneRoleTitle: 'Engineering Manager', agentTemplateId: 'eng-software-engineering-manager', agentName: 'David Kim, Engineering Manager', roleTitle: 'Software Engineering Manager' },
          { zoneRoleTitle: 'QA Manager', agentTemplateId: 'eng-qa-manager', agentName: 'Rachel Adams, QA Manager', roleTitle: 'QA Manager' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, DevOps Lead', roleTitle: 'DevOps & Cloud Lead' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Tech Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Senior Full-Stack', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Full-Stack Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-associate-software-developer', agentName: 'Maya Patel, Associate Dev', roleTitle: 'Associate Developer' },
          { zoneRoleTitle: 'QA Manager', agentTemplateId: 'eng-qa-automation-engineer', agentName: 'Lucas Gray, QA Automation', roleTitle: 'QA Automation Engineer' },
          { zoneRoleTitle: 'QA Manager', agentTemplateId: 'eng-flaky-test-quarantine', agentName: 'Test Sentinel Bot', roleTitle: 'Test Reliability Specialist' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-site-reliability-engineer', agentName: 'Chloe Bennett, SRE', roleTitle: 'Site Reliability Engineer' },
          { zoneRoleTitle: 'Product Manager', agentTemplateId: 'prod-principal-product-manager', agentName: 'Julian Croft, Principal PM', roleTitle: 'Principal Product Manager' },
          { zoneRoleTitle: 'Product Manager', agentTemplateId: 'prod-lead-product-designer', agentName: 'Aria Song, Lead Designer', roleTitle: 'Lead Product Designer' },
          { zoneRoleTitle: 'Operations & People', agentTemplateId: 'people-head-of-people-hr', agentName: 'Harper Wells, Head of HR', roleTitle: 'Head of People & HR' }
        ]
      },
      large: {
        scale: 'large',
        label: 'Global Enterprise Scale',
        headcountLabel: '30 Agents • 12 Zones',
        description: 'Comprehensive tier-one SaaS enterprise spanning C-Suite, VP of Engineering, SRE clusters, SecOps, QA squads, and commercial GTM.',
        space: {
          name: 'Apex Cloud Global Campus',
          description: 'Sprawling enterprise workspace with specialized departments for executive governance, platform engineering, security, and growth.',
          category: 'Software',
          width: 3200,
          height: 1600,
          color: '#3b82f6',
          shape: 'rectangle',
          workflowPrompt: 'Execute enterprise-grade multi-region operations with SOC2/ISO compliance, 99.999% SLA, and seamless cross-functional delivery.',
          workflowInstructions: '1. Executive leadership syncs weekly on corporate runway and market metrics.\n2. VP Eng coordinates across squad Engineering Managers and DevOps.\n3. SRE & SecOps enforce 24/7 telemetry monitoring and Zero Trust.\n4. Multiple squads ship concurrent microservices with automated gating.\n5. GTM teams drive customer acquisition and retention in lockstep.',
          responsibilities: 'Global SaaS platform operations, high-scale distributed systems, and enterprise compliance.'
        },
        zones: [
          { id: 'apex-lg-ceo', roleTitle: 'CEO', name: 'Executive Suite', level: 0, parentId: null, color: '#a855f7', width: 320, height: 160, responsibilities: 'Global enterprise direction, investor relations, and capital strategy.' },
          { id: 'apex-lg-cto', roleTitle: 'CTO', name: 'Chief Technology Office', level: 1, parentId: 'apex-lg-ceo', color: '#3b82f6', width: 300, height: 160, responsibilities: 'Global technology vision, architecture council, and patents.' },
          { id: 'apex-lg-coo', roleTitle: 'COO', name: 'Chief Operating Office', level: 1, parentId: 'apex-lg-ceo', color: '#10b981', width: 300, height: 160, responsibilities: 'Enterprise operations, supply, procurement, and HR.' },
          { id: 'apex-lg-cfo', roleTitle: 'CFO', name: 'Financial Governance', level: 1, parentId: 'apex-lg-ceo', color: '#f59e0b', width: 300, height: 160, responsibilities: 'Runway, cloud cost auditing, and corporate finance.' },
          { id: 'apex-lg-vpeng', roleTitle: 'VP of Engineering', name: 'VP Engineering Division', level: 2, parentId: 'apex-lg-cto', color: '#3b82f6', width: 320, height: 160, responsibilities: 'Global engineering operations, headcount, and squad alignment.' },
          { id: 'apex-lg-em', roleTitle: 'Engineering Manager', name: 'Core Squad Engineering', level: 3, parentId: 'apex-lg-vpeng', color: '#6366f1', width: 320, height: 160, responsibilities: 'Squad sprint execution, code velocity, and developer mentorship.' },
          { id: 'apex-lg-devops', roleTitle: 'DevOps Lead', name: 'Cloud Infrastructure & SRE', level: 3, parentId: 'apex-lg-vpeng', color: '#ec4899', width: 320, height: 160, responsibilities: 'Kubernetes multi-region clusters, Terraform, and disaster recovery.' },
          { id: 'apex-lg-qa', roleTitle: 'QA Manager', name: 'Enterprise QA & Release Gates', level: 3, parentId: 'apex-lg-vpeng', color: '#06b6d4', width: 320, height: 160, responsibilities: 'Automated test matrices, regression gating, and load testing.' },
          { id: 'apex-lg-ciso', roleTitle: 'CISO', name: 'Information Security & Compliance', level: 2, parentId: 'apex-lg-ceo', color: '#ef4444', width: 320, height: 160, responsibilities: 'SOC2, Zero Trust, vulnerability disclosure, and threat intel.' },
          { id: 'apex-lg-prod', roleTitle: 'Product Manager', name: 'Product Management & UX', level: 2, parentId: 'apex-lg-coo', color: '#f59e0b', width: 320, height: 160, responsibilities: 'Product roadmap, telemetry analytics, and customer interviews.' },
          { id: 'apex-lg-sales', roleTitle: 'Sales Manager', name: 'Enterprise Sales & GTM', level: 2, parentId: 'apex-lg-coo', color: '#10b981', width: 320, height: 160, responsibilities: 'Enterprise deal pipeline, quotas, and contract negotiations.' },
          { id: 'apex-lg-devs', roleTitle: 'Tech Lead', name: 'Core Full-Stack Squad', level: 4, parentId: 'apex-lg-em', color: '#3b82f6', width: 440, height: 180, responsibilities: 'Application development, API endpoints, microservices, and UI.' }
        ],
        agents: [
          { zoneRoleTitle: 'CEO', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, CEO', roleTitle: 'Chief Executive Officer' },
          { zoneRoleTitle: 'CTO', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'COO', agentTemplateId: 'lead-coo', agentName: 'Nadia Thorne, COO', roleTitle: 'Chief Operating Officer' },
          { zoneRoleTitle: 'CFO', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'VP of Engineering', agentTemplateId: 'eng-vp-engineering', agentName: 'Claire Zhang, VP Engineering', roleTitle: 'VP of Engineering' },
          { zoneRoleTitle: 'CISO', agentTemplateId: 'lead-ciso', agentName: 'Evan Cross, CISO', roleTitle: 'Chief Information Security Officer' },
          { zoneRoleTitle: 'Engineering Manager', agentTemplateId: 'eng-software-engineering-manager', agentName: 'David Kim, Engineering Manager', roleTitle: 'Software Engineering Manager' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, DevOps Lead', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-site-reliability-engineer', agentName: 'Chloe Bennett, SRE', roleTitle: 'Site Reliability Engineer' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-k8s-guardian', agentName: 'K8s Cluster Guardian', roleTitle: 'Platform Reliability Engineer' },
          { zoneRoleTitle: 'QA Manager', agentTemplateId: 'eng-qa-manager', agentName: 'Rachel Adams, QA Manager', roleTitle: 'QA Manager' },
          { zoneRoleTitle: 'QA Manager', agentTemplateId: 'eng-qa-automation-engineer', agentName: 'Lucas Gray, QA Automation', roleTitle: 'QA Automation Engineer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Tech Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Senior Dev', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Full-Stack Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-associate-software-developer', agentName: 'Maya Patel, Associate Dev', roleTitle: 'Associate Developer' },
          { zoneRoleTitle: 'Product Manager', agentTemplateId: 'prod-principal-product-manager', agentName: 'Julian Croft, Principal PM', roleTitle: 'Principal Product Manager' },
          { zoneRoleTitle: 'Product Manager', agentTemplateId: 'prod-lead-product-designer', agentName: 'Aria Song, Lead Designer', roleTitle: 'Lead Product Designer' },
          { zoneRoleTitle: 'Enterprise Sales & GTM', agentTemplateId: 'sales-enterprise-sales-manager', agentName: 'Jordan Cole, Sales Manager', roleTitle: 'Enterprise Sales Manager' },
          { zoneRoleTitle: 'Enterprise Sales & GTM', agentTemplateId: 'sales-account-executive', agentName: 'Olivia Hayes, Account Executive', roleTitle: 'Senior Account Executive' },
          { zoneRoleTitle: 'Information Security & Compliance', agentTemplateId: 'sec-soc-incident-lead', agentName: 'Tariq Mason, SOC Lead', roleTitle: 'SOC Manager' },
          { zoneRoleTitle: 'Financial Governance', agentTemplateId: 'eng-cloud-cost-sentinel', agentName: 'Cloud FinOps Sentinel', roleTitle: 'FinOps Engineer' },
          { zoneRoleTitle: 'Chief Operating Office', agentTemplateId: 'people-head-of-people-hr', agentName: 'Harper Wells, Head of HR', roleTitle: 'Head of People & HR' },
          { zoneRoleTitle: 'Core Squad Engineering', agentTemplateId: 'eng-code-quality-gate', agentName: 'PR Quality Gatekeeper', roleTitle: 'Code Review Gatekeeper' }
        ]
      }
    }
  },

  // 2. FinTech & Digital Banking Firm
  {
    id: 'company-fintech-bank',
    name: 'Aegis Financial Global',
    category: 'FinTech & Banking',
    domain: 'Digital Banking & Quantitative Trading',
    tagline: 'Institutional digital banking, high-frequency quantitative market modeling, and regulatory AML compliance.',
    description: 'Premier banking enterprise encompassing Bank Presidency, Risk Management (CRO), Quantitative Trading, Core Ledger Banking, and regulatory AML/BSA compliance officers.',
    icon: 'Landmark',
    color: '#10b981',
    scales: {
      small: {
        scale: 'small',
        label: 'FinTech Startup Squad',
        headcountLabel: '6 Agents • 4 Zones',
        description: 'Lean FinTech team focused on core ledger APIs, payment integrations, and baseline compliance.',
        space: {
          name: 'Aegis FinTech Labs (Lean)',
          description: 'Secure, modern FinTech space for rapid payment app and ledger development.',
          category: 'Finance & Banking',
          width: 1400,
          height: 820,
          color: '#10b981',
          shape: 'rectangle',
          workflowPrompt: 'Maintain strict financial accuracy, double-entry bookkeeping, and transaction idempotency.',
          workflowInstructions: '1. Bank President leads partner and liquidity relations.\n2. CRO sets transaction risk limits.\n3. Core Banking engineers write atomic debit/credit services.\n4. Compliance reviews flags.',
          responsibilities: 'Core banking ledger, payment rails, and regulatory oversight.'
        },
        zones: [
          { id: 'aeg-sm-pres', roleTitle: 'Bank President', name: 'Executive Banking Leadership', level: 0, parentId: null, color: '#10b981', width: 280, height: 150 },
          { id: 'aeg-sm-cro', roleTitle: 'Chief Risk Officer', name: 'Risk & Underwriting', level: 1, parentId: 'aeg-sm-pres', color: '#f59e0b', width: 280, height: 150 },
          { id: 'aeg-sm-core', roleTitle: 'Core Banking Engineer', name: 'Core Ledger & Payments', level: 2, parentId: 'aeg-sm-pres', color: '#3b82f6', width: 320, height: 150 },
          { id: 'aeg-sm-aml', roleTitle: 'Compliance Officer', name: 'AML & KYC Compliance', level: 2, parentId: 'aeg-sm-cro', color: '#ef4444', width: 280, height: 150 }
        ],
        agents: [
          { zoneRoleTitle: 'Bank President', agentTemplateId: 'fin-bank-president-md', agentName: 'Winston Sterling, President', roleTitle: 'Bank President' },
          { zoneRoleTitle: 'Chief Risk Officer', agentTemplateId: 'fin-chief-risk-officer-leader', agentName: 'Veronica Vance, CRO', roleTitle: 'Chief Risk Officer' },
          { zoneRoleTitle: 'Core Banking Engineer', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sanjay Kapoor, Lead Ledger Dev', roleTitle: 'Senior Ledger Engineer' },
          { zoneRoleTitle: 'Core Banking Engineer', agentTemplateId: 'eng-fullstack-developer', agentName: 'Maya Tanaka, Payments Dev', roleTitle: 'Payments Engineer' },
          { zoneRoleTitle: 'Compliance Officer', agentTemplateId: 'fin-compliance-aml-officer', agentName: 'Thomas Hayes, AML Officer', roleTitle: 'Compliance & AML Officer' },
          { zoneRoleTitle: 'Risk & Underwriting', agentTemplateId: 'fin-quantitative-trader-analyst', agentName: 'Gabriel Ortiz, Quant Analyst', roleTitle: 'Quantitative Analyst' }
        ]
      },
      mid: {
        scale: 'mid',
        label: 'Commercial Bank Scale',
        headcountLabel: '15 Agents • 7 Zones',
        description: 'Mid-size digital bank with full institutional governance, quantitative trading desks, fraud ops, and core banking.',
        space: {
          name: 'Aegis Financial Trading & Bank Floor',
          description: 'High-security financial institution space designed for real-time risk calculations, algorithmic trading, and KYC auditing.',
          category: 'Finance & Banking',
          width: 2200,
          height: 1150,
          color: '#10b981',
          shape: 'rectangle',
          workflowPrompt: 'Execute sub-millisecond payment processing, audited credit underwriting, and zero-defect regulatory reporting.',
          workflowInstructions: '1. Executive board reviews capital adequacy ratios.\n2. CRO enforces real-time VaR and exposure limits.\n3. Quants optimize algorithmic pricing and hedging.\n4. Core ledger engineering guarantees ACID transaction isolation.',
          responsibilities: 'Commercial banking operations, risk governance, and regulatory compliance.'
        },
        zones: [
          { id: 'aeg-md-pres', roleTitle: 'Bank President', name: 'President & Executive Committee', level: 0, parentId: null, color: '#10b981', width: 300, height: 155 },
          { id: 'aeg-md-cro', roleTitle: 'Chief Risk Officer', name: 'Risk Management Division', level: 1, parentId: 'aeg-md-pres', color: '#f59e0b', width: 300, height: 155 },
          { id: 'aeg-md-cfo', roleTitle: 'CFO', name: 'Treasury & Balance Sheet', level: 1, parentId: 'aeg-md-pres', color: '#10b981', width: 300, height: 155 },
          { id: 'aeg-md-quant', roleTitle: 'Quantitative Financial Analyst', name: 'Quantitative Trading & Modeling', level: 2, parentId: 'aeg-md-cro', color: '#6366f1', width: 320, height: 160 },
          { id: 'aeg-md-aml', roleTitle: 'Compliance Officer', name: 'Financial Crimes & AML Compliance', level: 2, parentId: 'aeg-md-cro', color: '#ef4444', width: 320, height: 160 },
          { id: 'aeg-md-tech', roleTitle: 'CTO', name: 'Banking Technology & Ledger Systems', level: 1, parentId: 'aeg-md-pres', color: '#3b82f6', width: 300, height: 155 },
          { id: 'aeg-md-core', roleTitle: 'Core Banking Engineer', name: 'Core Ledger & Settlement Squad', level: 2, parentId: 'aeg-md-tech', color: '#3b82f6', width: 360, height: 165 }
        ],
        agents: [
          { zoneRoleTitle: 'Bank President', agentTemplateId: 'fin-bank-president-md', agentName: 'Winston Sterling, President', roleTitle: 'Bank President' },
          { zoneRoleTitle: 'Chief Risk Officer', agentTemplateId: 'fin-chief-risk-officer-leader', agentName: 'Veronica Vance, CRO', roleTitle: 'Chief Risk Officer' },
          { zoneRoleTitle: 'CFO', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'CTO', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'Quantitative Financial Analyst', agentTemplateId: 'fin-quantitative-trader-analyst', agentName: 'Gabriel Ortiz, Quant Lead', roleTitle: 'Principal Quantitative Analyst' },
          { zoneRoleTitle: 'Quantitative Financial Analyst', agentTemplateId: 'fin-quantitative-trader-analyst', agentName: 'Seraphina Volkova, Model Risk', roleTitle: 'Algorithmic Pricing Specialist' },
          { zoneRoleTitle: 'Compliance Officer', agentTemplateId: 'fin-compliance-aml-officer', agentName: 'Thomas Hayes, AML Officer', roleTitle: 'Compliance Officer' },
          { zoneRoleTitle: 'Compliance Officer', agentTemplateId: 'fin-compliance-aml-officer', agentName: 'Zara Morrison, Sanctions Analyst', roleTitle: 'Sanctions & KYC Analyst' },
          { zoneRoleTitle: 'Core Banking Engineer', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sanjay Kapoor, Ledger Architect', roleTitle: 'Senior Ledger Engineer' },
          { zoneRoleTitle: 'Core Banking Engineer', agentTemplateId: 'eng-fullstack-developer', agentName: 'Maya Tanaka, Payments Dev', roleTitle: 'Payments Integration Engineer' },
          { zoneRoleTitle: 'Core Banking Engineer', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Tech Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Banking Technology & Ledger Systems', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, DevOps Lead', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'Risk Management Division', agentTemplateId: 'sec-soc-incident-lead', agentName: 'Tariq Mason, Fraud SecOps', roleTitle: 'Fraud Security Operations Lead' },
          { zoneRoleTitle: 'President & Executive Committee', agentTemplateId: 'lead-coo', agentName: 'Nadia Thorne, COO', roleTitle: 'Chief Operating Officer' },
          { zoneRoleTitle: 'Core Banking Engineer', agentTemplateId: 'eng-qa-automation-engineer', agentName: 'Lucas Gray, QA Engineer', roleTitle: 'Financial QA Automation' }
        ]
      },
      large: {
        scale: 'large',
        label: 'Global Investment Bank',
        headcountLabel: '28 Agents • 10 Zones',
        description: 'Tier-1 multinational financial institution with global markets, algorithmic liquidity desks, credit syndication, and sovereign regulatory compliance.',
        space: {
          name: 'Aegis Global Financial Plaza',
          description: 'Sprawling international banking headquarters equipped with high-availability transaction engines and comprehensive audit vaults.',
          category: 'Finance & Banking',
          width: 3200,
          height: 1550,
          color: '#10b981',
          shape: 'rectangle',
          workflowPrompt: 'Uphold global banking covenants (Basel III, Dodd-Frank, MiFID II). Maintain zero tolerance for risk breaches or unscheduled downtime.',
          workflowInstructions: '1. Executive Board oversees global balance sheet health and treasury.\n2. Risk committees audit trading desk exposures continuously.\n3. Core engineering squads deploy redundant payment gateways.\n4. Compliance ensures airtight reporting to central banks.',
          responsibilities: 'Global banking governance, institutional liquidity, capital underwriting, and systemic stability.'
        },
        zones: [
          { id: 'aeg-lg-pres', roleTitle: 'Bank President', name: 'Global Executive Board', level: 0, parentId: null, color: '#10b981', width: 320, height: 160 },
          { id: 'aeg-lg-cro', roleTitle: 'Chief Risk Officer', name: 'Global Risk Management', level: 1, parentId: 'aeg-lg-pres', color: '#f59e0b', width: 310, height: 160 },
          { id: 'aeg-lg-cfo', roleTitle: 'CFO', name: 'Treasury & Capital Management', level: 1, parentId: 'aeg-lg-pres', color: '#10b981', width: 310, height: 160 },
          { id: 'aeg-lg-cto', roleTitle: 'CTO', name: 'Global Banking Technology', level: 1, parentId: 'aeg-lg-pres', color: '#3b82f6', width: 310, height: 160 },
          { id: 'aeg-lg-quant', roleTitle: 'Quantitative Financial Analyst', name: 'Algorithmic Trading & Liquidity', level: 2, parentId: 'aeg-lg-cro', color: '#6366f1', width: 340, height: 165 },
          { id: 'aeg-lg-aml', roleTitle: 'Compliance Officer', name: 'Financial Crimes & Regulatory Audit', level: 2, parentId: 'aeg-lg-cro', color: '#ef4444', width: 340, height: 165 },
          { id: 'aeg-lg-ciso', roleTitle: 'CISO', name: 'Cybersecurity & Financial Vaults', level: 2, parentId: 'aeg-lg-pres', color: '#ef4444', width: 310, height: 160 },
          { id: 'aeg-lg-core', roleTitle: 'Core Banking Engineer', name: 'High-Throughput Ledger Systems', level: 2, parentId: 'aeg-lg-cto', color: '#3b82f6', width: 380, height: 170 },
          { id: 'aeg-lg-devops', roleTitle: 'DevOps Lead', name: 'Mission-Critical Cloud & SRE', level: 2, parentId: 'aeg-lg-cto', color: '#ec4899', width: 320, height: 160 },
          { id: 'aeg-lg-prod', roleTitle: 'Product Manager', name: 'Digital Banking Products', level: 2, parentId: 'aeg-lg-pres', color: '#f59e0b', width: 310, height: 160 }
        ],
        agents: [
          { zoneRoleTitle: 'Bank President', agentTemplateId: 'fin-bank-president-md', agentName: 'Winston Sterling, President', roleTitle: 'Bank President' },
          { zoneRoleTitle: 'Chief Risk Officer', agentTemplateId: 'fin-chief-risk-officer-leader', agentName: 'Veronica Vance, CRO', roleTitle: 'Chief Risk Officer' },
          { zoneRoleTitle: 'CFO', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'CTO', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'CISO', agentTemplateId: 'lead-ciso', agentName: 'Evan Cross, CISO', roleTitle: 'Chief Information Security Officer' },
          { zoneRoleTitle: 'Quantitative Financial Analyst', agentTemplateId: 'fin-quantitative-trader-analyst', agentName: 'Gabriel Ortiz, Quant Lead', roleTitle: 'Principal Quantitative Analyst' },
          { zoneRoleTitle: 'Quantitative Financial Analyst', agentTemplateId: 'fin-quantitative-trader-analyst', agentName: 'Seraphina Volkova, Model Risk', roleTitle: 'Algorithmic Pricing Specialist' },
          { zoneRoleTitle: 'Compliance Officer', agentTemplateId: 'fin-compliance-aml-officer', agentName: 'Thomas Hayes, AML Officer', roleTitle: 'Compliance Officer' },
          { zoneRoleTitle: 'Compliance Officer', agentTemplateId: 'fin-compliance-aml-officer', agentName: 'Zara Morrison, Sanctions Analyst', roleTitle: 'Sanctions & KYC Analyst' },
          { zoneRoleTitle: 'Core Banking Engineer', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Tech Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Core Banking Engineer', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sanjay Kapoor, Ledger Architect', roleTitle: 'Senior Ledger Engineer' },
          { zoneRoleTitle: 'Core Banking Engineer', agentTemplateId: 'eng-fullstack-developer', agentName: 'Maya Tanaka, Payments Dev', roleTitle: 'Payments Integration Engineer' },
          { zoneRoleTitle: 'Core Banking Engineer', agentTemplateId: 'eng-associate-software-developer', agentName: 'Alex Rivera, Junior Dev', roleTitle: 'Associate Developer' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, DevOps Lead', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-site-reliability-engineer', agentName: 'Chloe Bennett, SRE', roleTitle: 'Site Reliability Engineer' },
          { zoneRoleTitle: 'Product Manager', agentTemplateId: 'prod-principal-product-manager', agentName: 'Julian Croft, Principal PM', roleTitle: 'Principal Product Manager' },
          { zoneRoleTitle: 'Cybersecurity & Financial Vaults', agentTemplateId: 'sec-soc-incident-lead', agentName: 'Tariq Mason, SOC Lead', roleTitle: 'SOC Manager' }
        ]
      }
    }
  },

  // 3. AI & Autonomous Systems Research Lab
  {
    id: 'company-ai-labs',
    name: 'Nexus Intelligence Labs',
    category: 'AI & Research',
    domain: 'Foundation Models & Autonomous Agents',
    tagline: 'Pioneering frontier cognitive architectures, alignment guardrails, and distributed LLM serving.',
    description: 'Premier artificial intelligence laboratory bringing together Chief Scientists, AI Alignment researchers, LLM inference systems architects, and empirical benchmark evaluators.',
    icon: 'Brain',
    color: '#8b5cf6',
    scales: {
      small: {
        scale: 'small',
        label: 'AI Research Pod',
        headcountLabel: '6 Agents • 4 Zones',
        description: 'Elite research pod focused on model fine-tuning, synthetic data generation, and rapid benchmark evaluations.',
        space: {
          name: 'Nexus AI Pod (Lean)',
          description: 'High-focus computational space designed for iterative AI experimentation and prompt engineering.',
          category: 'AI & Research',
          width: 1400,
          height: 820,
          color: '#8b5cf6',
          shape: 'rectangle',
          workflowPrompt: 'Conduct empirical AI research with reproducible test datasets, safety checks, and ablation benchmarks.',
          workflowInstructions: '1. Chief Scientist formulates experiment hypotheses.\n2. LLM Architect manages compute pipelines.\n3. Research engineers run model evals.\n4. Alignment lead verifies safety constraints.',
          responsibilities: 'Frontier AI model experimentation and empirical evaluation.'
        },
        zones: [
          { id: 'nex-sm-sci', roleTitle: 'Chief Scientist', name: 'Scientific Research Direction', level: 0, parentId: null, color: '#8b5cf6', width: 280, height: 150 },
          { id: 'nex-sm-align', roleTitle: 'AI Alignment Lead', name: 'Model Safety & Guardrails', level: 1, parentId: 'nex-sm-sci', color: '#ec4899', width: 280, height: 150 },
          { id: 'nex-sm-arch', roleTitle: 'LLM Systems Architect', name: 'Inference & Distributed Compute', level: 1, parentId: 'nex-sm-sci', color: '#3b82f6', width: 300, height: 150 },
          { id: 'nex-sm-eval', roleTitle: 'AI Evaluation Specialist', name: 'Empirical Benchmarking & Evals', level: 2, parentId: 'nex-sm-align', color: '#06b6d4', width: 280, height: 150 }
        ],
        agents: [
          { zoneRoleTitle: 'Chief Scientist', agentTemplateId: 'ai-head-of-research', agentName: 'Dr. Alistair Vance, Chief Scientist', roleTitle: 'Head of AI Research & Chief Scientist' },
          { zoneRoleTitle: 'AI Alignment Lead', agentTemplateId: 'ai-principal-alignment-researcher', agentName: 'Dr. Mira Patel, Alignment Lead', roleTitle: 'Principal AI Alignment Researcher' },
          { zoneRoleTitle: 'LLM Systems Architect', agentTemplateId: 'ai-llm-systems-architect', agentName: 'Kai Sorenson, Systems Architect', roleTitle: 'LLM Systems & Inference Architect' },
          { zoneRoleTitle: 'AI Evaluation Specialist', agentTemplateId: 'ai-eval-benchmark-specialist', agentName: 'Zoe Sterling, Eval Specialist', roleTitle: 'AI Evaluation Specialist' },
          { zoneRoleTitle: 'Inference & Distributed Compute', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Devon Cross, GPU Engineer', roleTitle: 'Senior MLOps Engineer' },
          { zoneRoleTitle: 'Scientific Research Direction', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, Executive Sponsor', roleTitle: 'Executive Sponsor' }
        ]
      },
      mid: {
        scale: 'mid',
        label: 'Advanced AI Research Lab',
        headcountLabel: '16 Agents • 7 Zones',
        description: 'Fully equipped AI enterprise lab with dedicated clusters for pre-training, reinforcement learning (RLHF), safety red-teaming, and model deployment.',
        space: {
          name: 'Nexus Frontier Intelligence Lab',
          description: 'Spacious computational laboratory designed for multi-agent network simulation and frontier model benchmarking.',
          category: 'AI & Research',
          width: 2200,
          height: 1150,
          color: '#8b5cf6',
          shape: 'rectangle',
          workflowPrompt: 'Advance the frontiers of autonomous intelligence while enforcing strict mathematical alignment and zero hallucination gates.',
          workflowInstructions: '1. Chief Scientist defines multi-turn reasoning roadmaps.\n2. Systems architects optimize distributed GPU clusters.\n3. Alignment researchers test safety boundaries and jailbreaks.\n4. Evaluation leads benchmark accuracy against GSM8k, HumanEval, and MMLU-Pro.',
          responsibilities: 'Frontier model research, multi-agent harness engineering, and safety benchmarking.'
        },
        zones: [
          { id: 'nex-md-sci', roleTitle: 'Chief Scientist', name: 'Directorate of Scientific Research', level: 0, parentId: null, color: '#8b5cf6', width: 310, height: 155 },
          { id: 'nex-md-align', roleTitle: 'AI Alignment Lead', name: 'Alignment Science & Red Teaming', level: 1, parentId: 'nex-md-sci', color: '#ec4899', width: 310, height: 155 },
          { id: 'nex-md-arch', roleTitle: 'LLM Systems Architect', name: 'Distributed GPU Inference & Clusters', level: 1, parentId: 'nex-md-sci', color: '#3b82f6', width: 320, height: 160 },
          { id: 'nex-md-eval', roleTitle: 'AI Evaluation Specialist', name: 'Automated Benchmarking & Evals', level: 2, parentId: 'nex-md-align', color: '#06b6d4', width: 310, height: 155 },
          { id: 'nex-md-agent', roleTitle: 'Tech Lead', name: 'Agent Harness & Tool Orchestration', level: 2, parentId: 'nex-md-arch', color: '#6366f1', width: 340, height: 165 },
          { id: 'nex-md-devops', roleTitle: 'DevOps Lead', name: 'Cluster MLOps & Infrastructure', level: 2, parentId: 'nex-md-arch', color: '#ec4899', width: 310, height: 155 },
          { id: 'nex-md-prod', roleTitle: 'Product Manager', name: 'AI Product Strategy & Developer APIs', level: 1, parentId: 'nex-md-sci', color: '#f59e0b', width: 310, height: 155 }
        ],
        agents: [
          { zoneRoleTitle: 'Chief Scientist', agentTemplateId: 'ai-head-of-research', agentName: 'Dr. Alistair Vance, Chief Scientist', roleTitle: 'Head of AI Research & Chief Scientist' },
          { zoneRoleTitle: 'AI Alignment Lead', agentTemplateId: 'ai-principal-alignment-researcher', agentName: 'Dr. Mira Patel, Alignment Lead', roleTitle: 'Principal AI Alignment Researcher' },
          { zoneRoleTitle: 'LLM Systems Architect', agentTemplateId: 'ai-llm-systems-architect', agentName: 'Kai Sorenson, Systems Architect', roleTitle: 'LLM Systems & Inference Architect' },
          { zoneRoleTitle: 'AI Evaluation Specialist', agentTemplateId: 'ai-eval-benchmark-specialist', agentName: 'Zoe Sterling, Eval Specialist', roleTitle: 'AI Evaluation Specialist' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Agent Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Harness Engineer', roleTitle: 'Senior Full-Stack Engineer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, SDK Engineer', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'Cluster MLOps & Infrastructure', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, MLOps Lead', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'Cluster MLOps & Infrastructure', agentTemplateId: 'eng-site-reliability-engineer', agentName: 'Chloe Bennett, Cluster SRE', roleTitle: 'Site Reliability Engineer' },
          { zoneRoleTitle: 'AI Product Strategy & Developer APIs', agentTemplateId: 'prod-principal-product-manager', agentName: 'Julian Croft, Principal PM', roleTitle: 'Principal Product Manager' },
          { zoneRoleTitle: 'AI Product Strategy & Developer APIs', agentTemplateId: 'prod-lead-product-designer', agentName: 'Aria Song, UX Lead', roleTitle: 'Lead Product Designer' },
          { zoneRoleTitle: 'Directorate of Scientific Research', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, Executive Sponsor', roleTitle: 'Chief Executive Officer' },
          { zoneRoleTitle: 'Alignment Science & Red Teaming', agentTemplateId: 'sec-lead-penetration-tester', agentName: 'Dante Cole, Red Teamer', roleTitle: 'Lead Penetration Tester' },
          { zoneRoleTitle: 'Automated Benchmarking & Evals', agentTemplateId: 'eng-qa-automation-engineer', agentName: 'Lucas Gray, Benchmark Automation', roleTitle: 'QA Automation Engineer' },
          { zoneRoleTitle: 'Distributed GPU Inference & Clusters', agentTemplateId: 'eng-k8s-guardian', agentName: 'GPU Node Sentinel', roleTitle: 'Platform Reliability Engineer' },
          { zoneRoleTitle: 'Directorate of Scientific Research', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, Compute CFO', roleTitle: 'Chief Financial Officer' }
        ]
      },
      large: {
        scale: 'large',
        label: 'Frontier AI Institute',
        headcountLabel: '30 Agents • 11 Zones',
        description: 'Massive frontier AI institute orchestrating tens of thousands of GPUs, foundation model training runs, safety boards, and open-source tooling.',
        space: {
          name: 'Nexus Institute for Frontier Intelligence',
          description: 'Sprawling high-performance supercomputing AI research complex equipped for next-generation intelligence synthesis.',
          category: 'AI & Research',
          width: 3200,
          height: 1550,
          color: '#8b5cf6',
          shape: 'rectangle',
          workflowPrompt: 'Pioneer frontier AI capabilities with unmatched empirical rigor, mathematical safety proofs, and scalable multi-agent systems.',
          workflowInstructions: '1. Research Directorate outlines foundational model architectures.\n2. Pre-training cluster engineers monitor distributed gradient sync and loss curves.\n3. Post-training alignment team applies constitutional reinforcement learning.\n4. Benchmarking teams publish empirical ablations and safety audits.',
          responsibilities: 'Frontier AI pre-training, cognitive multi-agent loops, and international safety governance.'
        },
        zones: [
          { id: 'nex-lg-sci', roleTitle: 'Chief Scientist', name: 'Institute Directorate & Scientific Council', level: 0, parentId: null, color: '#8b5cf6', width: 320, height: 160 },
          { id: 'nex-lg-align', roleTitle: 'AI Alignment Lead', name: 'Safety, Alignment & Constitutional AI', level: 1, parentId: 'nex-lg-sci', color: '#ec4899', width: 320, height: 160 },
          { id: 'nex-lg-arch', roleTitle: 'LLM Systems Architect', name: 'Supercomputing & Inference Infrastructure', level: 1, parentId: 'nex-lg-sci', color: '#3b82f6', width: 320, height: 160 },
          { id: 'nex-lg-eval', roleTitle: 'AI Evaluation Specialist', name: 'Automated Evals & Safety Benchmarking', level: 2, parentId: 'nex-lg-align', color: '#06b6d4', width: 320, height: 160 },
          { id: 'nex-lg-agent', roleTitle: 'Tech Lead', name: 'Multi-Agent Autonomous Cognitive Loops', level: 2, parentId: 'nex-lg-arch', color: '#6366f1', width: 360, height: 165 },
          { id: 'nex-lg-devops', roleTitle: 'DevOps Lead', name: 'HPC Cluster SRE & GPU Orchestration', level: 2, parentId: 'nex-lg-arch', color: '#ec4899', width: 320, height: 160 },
          { id: 'nex-lg-sec', roleTitle: 'CISO', name: 'Model Weight Vaults & Threat Security', level: 1, parentId: 'nex-lg-sci', color: '#ef4444', width: 310, height: 160 },
          { id: 'nex-lg-prod', roleTitle: 'Product Manager', name: 'Enterprise API & Developer Platform', level: 2, parentId: 'nex-lg-sci', color: '#f59e0b', width: 310, height: 160 },
          { id: 'nex-lg-fin', roleTitle: 'CFO', name: 'Compute Capital & GPU Allocation', level: 1, parentId: 'nex-lg-sci', color: '#10b981', width: 300, height: 160 },
          { id: 'nex-lg-legal', roleTitle: 'Compliance Officer', name: 'AI Ethics & Regulatory Policy', level: 2, parentId: 'nex-lg-align', color: '#f59e0b', width: 310, height: 160 },
          { id: 'nex-lg-geng', roleTitle: 'Senior Developer', name: 'Applied Research & SDK Engineers', level: 3, parentId: 'nex-lg-agent', color: '#3b82f6', width: 400, height: 175 }
        ],
        agents: [
          { zoneRoleTitle: 'Chief Scientist', agentTemplateId: 'ai-head-of-research', agentName: 'Dr. Alistair Vance, Chief Scientist', roleTitle: 'Head of AI Research & Chief Scientist' },
          { zoneRoleTitle: 'AI Alignment Lead', agentTemplateId: 'ai-principal-alignment-researcher', agentName: 'Dr. Mira Patel, Alignment Lead', roleTitle: 'Principal AI Alignment Researcher' },
          { zoneRoleTitle: 'LLM Systems Architect', agentTemplateId: 'ai-llm-systems-architect', agentName: 'Kai Sorenson, Systems Architect', roleTitle: 'LLM Systems & Inference Architect' },
          { zoneRoleTitle: 'AI Evaluation Specialist', agentTemplateId: 'ai-eval-benchmark-specialist', agentName: 'Zoe Sterling, Eval Specialist', roleTitle: 'AI Evaluation Specialist' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Agent Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Senior Developer', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Senior Engineer', roleTitle: 'Senior Full-Stack Engineer' },
          { zoneRoleTitle: 'Senior Developer', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, SDK Engineer', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'Senior Developer', agentTemplateId: 'eng-associate-software-developer', agentName: 'Maya Patel, Assistant Researcher', roleTitle: 'Associate Developer' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, MLOps Lead', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-site-reliability-engineer', agentName: 'Chloe Bennett, Cluster SRE', roleTitle: 'Site Reliability Engineer' },
          { zoneRoleTitle: 'CISO', agentTemplateId: 'lead-ciso', agentName: 'Evan Cross, CISO', roleTitle: 'Chief Information Security Officer' },
          { zoneRoleTitle: 'CFO', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'Product Manager', agentTemplateId: 'prod-principal-product-manager', agentName: 'Julian Croft, Principal PM', roleTitle: 'Principal Product Manager' },
          { zoneRoleTitle: 'Product Manager', agentTemplateId: 'prod-lead-product-designer', agentName: 'Aria Song, UX Lead', roleTitle: 'Lead Product Designer' },
          { zoneRoleTitle: 'Compliance Officer', agentTemplateId: 'fin-compliance-aml-officer', agentName: 'Elena Rostova, Ethics Officer', roleTitle: 'AI Policy & Ethics Officer' }
        ]
      }
    }
  },

  // 4. Cybersecurity & SecOps Defense Firm
  {
    id: 'company-cybersecurity-defense',
    name: 'IronClad Cyber Defense',
    category: 'Security & SecOps',
    domain: 'Enterprise SOC, Threat Hunting & Red Teaming',
    tagline: 'Military-grade Zero Trust architecture, 24/7 security operations, offensive penetration testing, and incident response.',
    description: 'Premier cybersecurity defense enterprise with Chief Information Security Officer (CISO), SOC incident response, offensive red team architects, and cloud security leads.',
    icon: 'Shield',
    color: '#ef4444',
    scales: {
      small: {
        scale: 'small',
        label: 'Rapid Incident Unit',
        headcountLabel: '6 Agents • 4 Zones',
        description: 'Lean offensive & defensive security cell specialized in immediate vulnerability remediation and incident response.',
        space: {
          name: 'IronClad Incident Bunker (Lean)',
          description: 'Hardened cybersecurity operations room designed for emergency threat containment.',
          category: 'Security',
          width: 1400,
          height: 820,
          color: '#ef4444',
          shape: 'rectangle',
          workflowPrompt: 'Identify vulnerabilities, contain breaches, and verify Zero Trust access controls.',
          workflowInstructions: '1. CISO oversees security posture.\n2. SOC Lead triages intrusion alerts.\n3. Red Teamer exploits identified CVEs.\n4. Cloud SecOps patches infrastructure.',
          responsibilities: 'Security operations and rapid vulnerability remediation.'
        },
        zones: [
          { id: 'ic-sm-ciso', roleTitle: 'CISO', name: 'Security Command', level: 0, parentId: null, color: '#ef4444', width: 280, height: 150 },
          { id: 'ic-sm-soc', roleTitle: 'SOC Manager', name: 'SOC Incident Response', level: 1, parentId: 'ic-sm-ciso', color: '#f59e0b', width: 280, height: 150 },
          { id: 'ic-sm-red', roleTitle: 'Red Team Architect', name: 'Penetration Testing', level: 1, parentId: 'ic-sm-ciso', color: '#a855f7', width: 280, height: 150 },
          { id: 'ic-sm-cloud', roleTitle: 'DevOps Lead', name: 'Cloud Security Hardening', level: 2, parentId: 'ic-sm-soc', color: '#3b82f6', width: 300, height: 150 }
        ],
        agents: [
          { zoneRoleTitle: 'CISO', agentTemplateId: 'lead-ciso', agentName: 'Evan Cross, CISO', roleTitle: 'Chief Information Security Officer' },
          { zoneRoleTitle: 'SOC Manager', agentTemplateId: 'sec-soc-incident-lead', agentName: 'Tariq Mason, SOC Lead', roleTitle: 'SOC Manager & Incident Response' },
          { zoneRoleTitle: 'Red Team Architect', agentTemplateId: 'sec-lead-penetration-tester', agentName: 'Dante Cole, Red Team Lead', roleTitle: 'Lead Penetration Tester' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, SecOps Lead', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'SOC Incident Response', agentTemplateId: 'eng-site-reliability-engineer', agentName: 'Chloe Bennett, Sec SRE', roleTitle: 'Site Reliability Engineer' },
          { zoneRoleTitle: 'Security Command', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, Executive Sponsor', roleTitle: 'Chief Executive Officer' }
        ]
      },
      mid: {
        scale: 'mid',
        label: 'Enterprise SOC Defense Unit',
        headcountLabel: '15 Agents • 7 Zones',
        description: 'Full-spectrum enterprise cybersecurity firm with 24/7 SIEM monitoring, threat intelligence, red/blue teams, and regulatory compliance.',
        space: {
          name: 'IronClad Global Security Operations Center',
          description: 'State-of-the-art SOC control room with real-time threat maps, honeypot feeds, and forensic analysis benches.',
          category: 'Security',
          width: 2200,
          height: 1150,
          color: '#ef4444',
          shape: 'rectangle',
          workflowPrompt: 'Detect adversarial intrusion within seconds. Contain, isolate, and remediate all threats with forensic chain-of-custody.',
          workflowInstructions: '1. CISO sets Zero Trust policies.\n2. SOC monitors SIEM correlation rules 24/7.\n3. Red Team runs continuous breach simulations.\n4. Compliance ensures SOC2/ISO 27001 audit standards.',
          responsibilities: 'Enterprise cyber defense, active intrusion prevention, and digital forensics.'
        },
        zones: [
          { id: 'ic-md-ciso', roleTitle: 'CISO', name: 'Executive Security Office', level: 0, parentId: null, color: '#ef4444', width: 300, height: 155 },
          { id: 'ic-md-soc', roleTitle: 'SOC Manager', name: 'Security Operations Center (SOC)', level: 1, parentId: 'ic-md-ciso', color: '#f59e0b', width: 320, height: 160 },
          { id: 'ic-md-red', roleTitle: 'Red Team Architect', name: 'Offensive Security & Red Team', level: 1, parentId: 'ic-md-ciso', color: '#a855f7', width: 320, height: 160 },
          { id: 'ic-md-cloud', roleTitle: 'DevOps Lead', name: 'Cloud Infrastructure Hardening', level: 2, parentId: 'ic-md-soc', color: '#3b82f6', width: 320, height: 160 },
          { id: 'ic-md-comp', roleTitle: 'Compliance Officer', name: 'Governance, Risk & Compliance (GRC)', level: 1, parentId: 'ic-md-ciso', color: '#10b981', width: 300, height: 155 },
          { id: 'ic-md-forensic', roleTitle: 'Tech Lead', name: 'Malware Analysis & Forensics', level: 2, parentId: 'ic-md-soc', color: '#6366f1', width: 320, height: 160 },
          { id: 'ic-md-eng', roleTitle: 'Senior Developer', name: 'Security Tooling & Automation', level: 2, parentId: 'ic-md-cloud', color: '#3b82f6', width: 350, height: 165 }
        ],
        agents: [
          { zoneRoleTitle: 'CISO', agentTemplateId: 'lead-ciso', agentName: 'Evan Cross, CISO', roleTitle: 'Chief Information Security Officer' },
          { zoneRoleTitle: 'SOC Manager', agentTemplateId: 'sec-soc-incident-lead', agentName: 'Tariq Mason, SOC Lead', roleTitle: 'SOC Manager & Incident Response' },
          { zoneRoleTitle: 'Red Team Architect', agentTemplateId: 'sec-lead-penetration-tester', agentName: 'Dante Cole, Red Team Lead', roleTitle: 'Lead Penetration Tester' },
          { zoneRoleTitle: 'Compliance Officer', agentTemplateId: 'fin-compliance-aml-officer', agentName: 'Sloan Sterling, GRC Director', roleTitle: 'Compliance Officer' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, SecOps Lead', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Forensics Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Senior Developer', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Sec Automation', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Senior Developer', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Tooling Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'Security Operations Center (SOC)', agentTemplateId: 'eng-site-reliability-engineer', agentName: 'Chloe Bennett, Sec SRE', roleTitle: 'Site Reliability Engineer' },
          { zoneRoleTitle: 'Offensive Security & Red Team', agentTemplateId: 'eng-qa-automation-engineer', agentName: 'Lucas Gray, Exploit Harness', roleTitle: 'QA Automation Engineer' },
          { zoneRoleTitle: 'Executive Security Office', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, CEO', roleTitle: 'Chief Executive Officer' },
          { zoneRoleTitle: 'Governance, Risk & Compliance (GRC)', agentTemplateId: 'fin-chief-risk-officer-leader', agentName: 'Veronica Vance, Risk Lead', roleTitle: 'Chief Risk Officer' },
          { zoneRoleTitle: 'Cloud Infrastructure Hardening', agentTemplateId: 'eng-k8s-guardian', agentName: 'K8s Hardening Bot', roleTitle: 'Platform Reliability Engineer' },
          { zoneRoleTitle: 'Security Tooling & Automation', agentTemplateId: 'eng-associate-software-developer', agentName: 'Maya Patel, Junior Dev', roleTitle: 'Associate Developer' },
          { zoneRoleTitle: 'Executive Security Office', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, CTO', roleTitle: 'Chief Technology Officer' }
        ]
      },
      large: {
        scale: 'large',
        label: 'Defense & National SecOps',
        headcountLabel: '28 Agents • 10 Zones',
        description: 'Elite enterprise defense agency capable of nation-state threat hunting, zero-day research, air-gapped forensic audits, and critical infrastructure defense.',
        space: {
          name: 'IronClad Command Center',
          description: 'Ultra-secure SCIF-grade facility designed for multi-tier cyber warfare defense and global incident coordination.',
          category: 'Security',
          width: 3200,
          height: 1550,
          color: '#ef4444',
          shape: 'rectangle',
          workflowPrompt: 'Shield mission-critical infrastructure against advanced persistent threats (APTs). Enforce immutable telemetry and rapid incident eradication.',
          workflowInstructions: '1. CISO coordinates with executive leadership and defense boards.\n2. Blue Team manages continuous network packet inspection.\n3. Red Team executes black-box adversary simulations.\n4. Forensics team extracts IOCs and updates threat feeds.',
          responsibilities: 'National-grade cyber defense, proactive exploit neutralization, and zero trust governance.'
        },
        zones: [
          { id: 'ic-lg-ciso', roleTitle: 'CISO', name: 'Strategic Security Command', level: 0, parentId: null, color: '#ef4444', width: 320, height: 160 },
          { id: 'ic-lg-soc', roleTitle: 'SOC Manager', name: '24/7 Global SOC Triage', level: 1, parentId: 'ic-lg-ciso', color: '#f59e0b', width: 320, height: 160 },
          { id: 'ic-lg-red', roleTitle: 'Red Team Architect', name: 'Adversary Simulation & Zero-Day Lab', level: 1, parentId: 'ic-lg-ciso', color: '#a855f7', width: 340, height: 160 },
          { id: 'ic-lg-grc', roleTitle: 'Compliance Officer', name: 'Defense Compliance & ISO/FedRAMP', level: 1, parentId: 'ic-lg-ciso', color: '#10b981', width: 310, height: 160 },
          { id: 'ic-lg-cloud', roleTitle: 'DevOps Lead', name: 'Air-Gapped Cloud & SRE Infrastructure', level: 2, parentId: 'ic-lg-soc', color: '#3b82f6', width: 330, height: 160 },
          { id: 'ic-lg-forensic', roleTitle: 'Tech Lead', name: 'Digital Forensics & Reverse Engineering', level: 2, parentId: 'ic-lg-soc', color: '#6366f1', width: 330, height: 160 },
          { id: 'ic-lg-cto', roleTitle: 'CTO', name: 'Cryptographic & System Architecture', level: 1, parentId: 'ic-lg-ciso', color: '#3b82f6', width: 310, height: 160 },
          { id: 'ic-lg-eng', roleTitle: 'Senior Developer', name: 'Autonomous Defense Automation Squad', level: 3, parentId: 'ic-lg-cloud', color: '#3b82f6', width: 400, height: 175 },
          { id: 'ic-lg-risk', roleTitle: 'Chief Risk Officer', name: 'Operational & Geopolitical Risk', level: 1, parentId: 'ic-lg-ciso', color: '#f59e0b', width: 310, height: 160 },
          { id: 'ic-lg-pm', roleTitle: 'Product Manager', name: 'Security Product Delivery', level: 2, parentId: 'ic-lg-cto', color: '#f59e0b', width: 310, height: 160 }
        ],
        agents: [
          { zoneRoleTitle: 'CISO', agentTemplateId: 'lead-ciso', agentName: 'Evan Cross, CISO', roleTitle: 'Chief Information Security Officer' },
          { zoneRoleTitle: 'SOC Manager', agentTemplateId: 'sec-soc-incident-lead', agentName: 'Tariq Mason, SOC Lead', roleTitle: 'SOC Manager & Incident Response' },
          { zoneRoleTitle: 'Red Team Architect', agentTemplateId: 'sec-lead-penetration-tester', agentName: 'Dante Cole, Red Team Lead', roleTitle: 'Lead Penetration Tester' },
          { zoneRoleTitle: 'Compliance Officer', agentTemplateId: 'fin-compliance-aml-officer', agentName: 'Sloan Sterling, GRC Director', roleTitle: 'Compliance Officer' },
          { zoneRoleTitle: 'Chief Risk Officer', agentTemplateId: 'fin-chief-risk-officer-leader', agentName: 'Veronica Vance, CRO', roleTitle: 'Chief Risk Officer' },
          { zoneRoleTitle: 'CTO', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, SecOps Lead', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Forensics Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Senior Developer', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Sec Automation', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Senior Developer', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Tooling Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'Senior Developer', agentTemplateId: 'eng-associate-software-developer', agentName: 'Maya Patel, Junior Dev', roleTitle: 'Associate Developer' },
          { zoneRoleTitle: 'Air-Gapped Cloud & SRE Infrastructure', agentTemplateId: 'eng-site-reliability-engineer', agentName: 'Chloe Bennett, Sec SRE', roleTitle: 'Site Reliability Engineer' },
          { zoneRoleTitle: 'Strategic Security Command', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, CEO', roleTitle: 'Chief Executive Officer' },
          { zoneRoleTitle: 'Security Product Delivery', agentTemplateId: 'prod-principal-product-manager', agentName: 'Julian Croft, Principal PM', roleTitle: 'Principal Product Manager' }
        ]
      }
    }
  },

  // 5. Global E-Commerce & Retail Marketplace
  {
    id: 'company-ecommerce-retail',
    name: 'OmniCart Worldwide',
    category: 'E-Commerce & Retail',
    domain: 'Omnichannel Storefronts & Fulfillment Logistics',
    tagline: 'High-converting global retail marketplace with dynamic pricing, inventory synchronization, and automated returns.',
    description: 'Turn-key e-commerce enterprise featuring E-Commerce Directors, CRO Conversion Leads, Merchandising Specialists, Full-Stack Storefront Engineers, and 24/7 Customer Care.',
    icon: 'ShoppingBag',
    color: '#f59e0b',
    scales: {
      small: {
        scale: 'small',
        label: 'Boutique Storefront',
        headcountLabel: '6 Agents • 4 Zones',
        description: 'Lean direct-to-consumer online brand focused on Shopify merchandising, high-converting checkout, and rapid social growth.',
        space: {
          name: 'OmniCart Studio (Lean)',
          description: 'Creative retail office optimized for product photography, catalog updates, and order fulfillment.',
          category: 'E-Commerce',
          width: 1400,
          height: 820,
          color: '#f59e0b',
          shape: 'rectangle',
          workflowPrompt: 'Maximize conversion rate, average order value (AOV), and customer review ratings.',
          workflowInstructions: '1. E-Com Director sets product catalog.\n2. CRO Lead optimizes checkout funnel.\n3. Storefront Devs deploy Shopify features.\n4. Customer Support addresses tickets.',
          responsibilities: 'Online store management and customer order fulfillment.'
        },
        zones: [
          { id: 'omni-sm-dir', roleTitle: 'E-Commerce Director', name: 'Retail Brand Leadership', level: 0, parentId: null, color: '#f59e0b', width: 280, height: 150 },
          { id: 'omni-sm-cro', roleTitle: 'Growth Lead', name: 'Conversion Rate Optimization (CRO)', level: 1, parentId: 'omni-sm-dir', color: '#10b981', width: 280, height: 150 },
          { id: 'omni-sm-dev', roleTitle: 'Tech Lead', name: 'Storefront Engineering', level: 1, parentId: 'omni-sm-dir', color: '#3b82f6', width: 300, height: 150 },
          { id: 'omni-sm-cx', roleTitle: 'Product Manager', name: 'Catalog & Merchandising', level: 2, parentId: 'omni-sm-dir', color: '#a855f7', width: 280, height: 150 }
        ],
        agents: [
          { zoneRoleTitle: 'E-Commerce Director', agentTemplateId: 'ecom-ecommerce-director', agentName: 'Sienna Sterling, E-Com Director', roleTitle: 'Global E-Commerce Director' },
          { zoneRoleTitle: 'Growth Lead', agentTemplateId: 'mktg-performance-growth-lead', agentName: 'Tyler Reed, CRO Lead', roleTitle: 'Head of Performance Marketing' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Storefront Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Shopify Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'Product Manager', agentTemplateId: 'prod-principal-product-manager', agentName: 'Julian Croft, Merchandiser', roleTitle: 'Principal Product Manager' },
          { zoneRoleTitle: 'Retail Brand Leadership', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, Brand Founder', roleTitle: 'Chief Executive Officer' }
        ]
      },
      mid: {
        scale: 'mid',
        label: 'Omnichannel Retail Enterprise',
        headcountLabel: '15 Agents • 7 Zones',
        description: 'Multi-channel retail enterprise managing international warehouses, real-time inventory sync, dynamic pricing engines, and customer support.',
        space: {
          name: 'OmniCart Commerce Plaza',
          description: 'Expansive retail operations hub coordinating supply chain logistics, digital marketing, and automated customer care.',
          category: 'E-Commerce',
          width: 2200,
          height: 1150,
          color: '#f59e0b',
          shape: 'rectangle',
          workflowPrompt: 'Deliver fast, frictionless digital commerce with zero stockouts, automated dunning, and rapid international shipping.',
          workflowInstructions: '1. Retail leadership manages supplier lines and pricing margins.\n2. Growth team optimizes multi-channel ad spend.\n3. Logistics managers coordinate 3PL warehouse fulfillment.\n4. Engineers deploy responsive storefront widgets.',
          responsibilities: 'Global retail store operations, logistics fulfillment, and customer satisfaction.'
        },
        zones: [
          { id: 'omni-md-dir', roleTitle: 'E-Commerce Director', name: 'Executive Retail Leadership', level: 0, parentId: null, color: '#f59e0b', width: 310, height: 155 },
          { id: 'omni-md-cro', roleTitle: 'Growth Lead', name: 'Performance Marketing & CRO', level: 1, parentId: 'omni-md-dir', color: '#10b981', width: 310, height: 155 },
          { id: 'omni-md-tech', roleTitle: 'CTO', name: 'Storefront & Mobile Tech', level: 1, parentId: 'omni-md-dir', color: '#3b82f6', width: 310, height: 155 },
          { id: 'omni-md-log', roleTitle: 'Logistics Director', name: 'Supply Chain & Fulfillment', level: 1, parentId: 'omni-md-dir', color: '#6366f1', width: 310, height: 155 },
          { id: 'omni-md-devs', roleTitle: 'Tech Lead', name: 'Full-Stack Commerce Squad', level: 2, parentId: 'omni-md-tech', color: '#3b82f6', width: 360, height: 165 },
          { id: 'omni-md-qa', roleTitle: 'QA Manager', name: 'Payment & Checkout Quality', level: 2, parentId: 'omni-md-tech', color: '#06b6d4', width: 300, height: 155 },
          { id: 'omni-md-prod', roleTitle: 'Product Manager', name: 'Catalog & User Experience', level: 2, parentId: 'omni-md-cro', color: '#a855f7', width: 310, height: 155 }
        ],
        agents: [
          { zoneRoleTitle: 'E-Commerce Director', agentTemplateId: 'ecom-ecommerce-director', agentName: 'Sienna Sterling, E-Com Director', roleTitle: 'Global E-Commerce Director' },
          { zoneRoleTitle: 'Growth Lead', agentTemplateId: 'mktg-performance-growth-lead', agentName: 'Tyler Reed, CRO Lead', roleTitle: 'Head of Performance Marketing' },
          { zoneRoleTitle: 'CTO', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'Logistics Director', agentTemplateId: 'logistics-global-supply-director', agentName: 'Carlos Mendoza, Logistics Lead', roleTitle: 'Global Logistics Director' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Storefront Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Senior Dev', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Full-Stack Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'QA Manager', agentTemplateId: 'eng-qa-manager', agentName: 'Rachel Adams, QA Manager', roleTitle: 'QA Manager' },
          { zoneRoleTitle: 'QA Manager', agentTemplateId: 'eng-qa-automation-engineer', agentName: 'Lucas Gray, Checkout QA', roleTitle: 'QA Automation Engineer' },
          { zoneRoleTitle: 'Product Manager', agentTemplateId: 'prod-principal-product-manager', agentName: 'Julian Croft, Principal PM', roleTitle: 'Principal Product Manager' },
          { zoneRoleTitle: 'Product Manager', agentTemplateId: 'prod-lead-product-designer', agentName: 'Aria Song, UX Lead', roleTitle: 'Lead Product Designer' },
          { zoneRoleTitle: 'Executive Retail Leadership', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, CEO', roleTitle: 'Chief Executive Officer' },
          { zoneRoleTitle: 'Executive Retail Leadership', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'Storefront & Mobile Tech', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, DevOps Lead', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'Performance Marketing & CRO', agentTemplateId: 'mktg-principal-seo-strategist', agentName: 'Gemma Ward, SEO Lead', roleTitle: 'Principal SEO Strategist' }
        ]
      },
      large: {
        scale: 'large',
        label: 'Global Marketplace Empire',
        headcountLabel: '28 Agents • 10 Zones',
        description: 'Global retail empire managing multi-currency checkouts, dropshipping merchant portals, customs brokerage, and millions of daily orders.',
        space: {
          name: 'OmniCart Global Marketplace Campus',
          description: 'High-capacity retail headquarters featuring 24/7 global operations, automated dispatch grids, and inventory reconciliation systems.',
          category: 'E-Commerce',
          width: 3200,
          height: 1550,
          color: '#f59e0b',
          shape: 'rectangle',
          workflowPrompt: 'Operate global 24/7 retail marketplace with PCI-DSS Level 1 compliance, dynamic pricing, and sub-second inventory sync.',
          workflowInstructions: '1. Executive leadership optimizes international supplier contracts.\n2. Storefront squads maintain high-throughput checkout microservices.\n3. Supply chain leads automate warehouse robotics and carrier APIs.\n4. Growth team manages multi-million dollar performance budgets.',
          responsibilities: 'Global retail marketplace engineering, multi-warehouse logistics, and worldwide customer fulfillment.'
        },
        zones: [
          { id: 'omni-lg-dir', roleTitle: 'E-Commerce Director', name: 'Global Marketplace Directorate', level: 0, parentId: null, color: '#f59e0b', width: 320, height: 160 },
          { id: 'omni-lg-cto', roleTitle: 'CTO', name: 'Marketplace Engineering Division', level: 1, parentId: 'omni-lg-dir', color: '#3b82f6', width: 310, height: 160 },
          { id: 'omni-lg-log', roleTitle: 'Logistics Director', name: 'Global Logistics & Supply Chain', level: 1, parentId: 'omni-lg-dir', color: '#6366f1', width: 320, height: 160 },
          { id: 'omni-lg-cro', roleTitle: 'Growth Lead', name: 'Global Growth & Merchandising', level: 1, parentId: 'omni-lg-dir', color: '#10b981', width: 310, height: 160 },
          { id: 'omni-lg-cfo', roleTitle: 'CFO', name: 'Treasury, Tariffs & Financial Ops', level: 1, parentId: 'omni-lg-dir', color: '#f59e0b', width: 310, height: 160 },
          { id: 'omni-lg-devs', roleTitle: 'Tech Lead', name: 'High-Concurrency Checkout Squad', level: 2, parentId: 'omni-lg-cto', color: '#3b82f6', width: 400, height: 175 },
          { id: 'omni-lg-devops', roleTitle: 'DevOps Lead', name: 'Cloud Infrastructure & Edge CDNs', level: 2, parentId: 'omni-lg-cto', color: '#ec4899', width: 320, height: 160 },
          { id: 'omni-lg-qa', roleTitle: 'QA Manager', name: 'Payment Gating & Automated Testing', level: 2, parentId: 'omni-lg-cto', color: '#06b6d4', width: 310, height: 160 },
          { id: 'omni-lg-ciso', roleTitle: 'CISO', name: 'PCI-DSS Compliance & Security', level: 2, parentId: 'omni-lg-dir', color: '#ef4444', width: 310, height: 160 },
          { id: 'omni-lg-prod', roleTitle: 'Product Manager', name: 'Merchant Portal & Buyer Journey', level: 2, parentId: 'omni-lg-cro', color: '#a855f7', width: 310, height: 160 }
        ],
        agents: [
          { zoneRoleTitle: 'E-Commerce Director', agentTemplateId: 'ecom-ecommerce-director', agentName: 'Sienna Sterling, E-Com Director', roleTitle: 'Global E-Commerce Director' },
          { zoneRoleTitle: 'CTO', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'Logistics Director', agentTemplateId: 'logistics-global-supply-director', agentName: 'Carlos Mendoza, Logistics Lead', roleTitle: 'Global Logistics Director' },
          { zoneRoleTitle: 'Growth Lead', agentTemplateId: 'mktg-performance-growth-lead', agentName: 'Tyler Reed, CRO Lead', roleTitle: 'Head of Performance Marketing' },
          { zoneRoleTitle: 'CFO', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'CISO', agentTemplateId: 'lead-ciso', agentName: 'Evan Cross, CISO', roleTitle: 'Chief Information Security Officer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Storefront Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'High-Concurrency Checkout Squad', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Senior Dev', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'High-Concurrency Checkout Squad', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Full-Stack Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'High-Concurrency Checkout Squad', agentTemplateId: 'eng-associate-software-developer', agentName: 'Maya Patel, Junior Dev', roleTitle: 'Associate Developer' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, DevOps Lead', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-site-reliability-engineer', agentName: 'Chloe Bennett, SRE', roleTitle: 'Site Reliability Engineer' },
          { zoneRoleTitle: 'QA Manager', agentTemplateId: 'eng-qa-manager', agentName: 'Rachel Adams, QA Manager', roleTitle: 'QA Manager' },
          { zoneRoleTitle: 'Product Manager', agentTemplateId: 'prod-principal-product-manager', agentName: 'Julian Croft, Principal PM', roleTitle: 'Principal Product Manager' }
        ]
      }
    }
  },

  // 6. Healthcare & Telemedicine Network
  {
    id: 'company-healthcare-network',
    name: 'CarePulse Health Alliance',
    category: 'Healthcare & Medicine',
    domain: 'Clinical Care, Telemedicine & HIPAA Systems',
    tagline: 'Compassionate evidence-based clinical care network with secure electronic health records and telehealth consultations.',
    description: 'Premier health alliance uniting Hospital Directors, Chief Medical Officers (CMO), HIPAA Privacy Officers, clinical informatics engineers, and patient care coordinators.',
    icon: 'Heart',
    color: '#06b6d4',
    scales: {
      small: {
        scale: 'small',
        label: 'Clinical Care Unit',
        headcountLabel: '6 Agents • 4 Zones',
        description: 'Lean outpatient clinic or telehealth squad focused on patient scheduling, virtual consultations, and HIPAA compliance.',
        space: {
          name: 'CarePulse Telehealth Clinic (Lean)',
          description: 'Confidential clinical space designed for secure telemedicine triage and electronic charting.',
          category: 'Healthcare',
          width: 1400,
          height: 820,
          color: '#06b6d4',
          shape: 'rectangle',
          workflowPrompt: 'Deliver compassionate clinical care with strict HIPAA confidentiality and evidence-based diagnostic protocols.',
          workflowInstructions: '1. Hospital Director manages clinical staffing.\n2. Medical Director approves clinical care pathways.\n3. HIPAA Officer audits access to medical records.\n4. Clinical engineers maintain secure EHR portals.',
          responsibilities: 'Patient care delivery, telehealth scheduling, and medical records privacy.'
        },
        zones: [
          { id: 'care-sm-dir', roleTitle: 'Hospital Director', name: 'Clinical Administration', level: 0, parentId: null, color: '#06b6d4', width: 280, height: 150 },
          { id: 'care-sm-cmo', roleTitle: 'Medical Director', name: 'Clinical Protocol & Physician Lead', level: 1, parentId: 'care-sm-dir', color: '#10b981', width: 280, height: 150 },
          { id: 'care-sm-hipaa', roleTitle: 'HIPAA Compliance Officer', name: 'Patient Privacy & HIPAA Compliance', level: 1, parentId: 'care-sm-dir', color: '#ef4444', width: 300, height: 150 },
          { id: 'care-sm-eng', roleTitle: 'Senior Developer', name: 'EHR & Telehealth Portal', level: 2, parentId: 'care-sm-cmo', color: '#3b82f6', width: 280, height: 150 }
        ],
        agents: [
          { zoneRoleTitle: 'Hospital Director', agentTemplateId: 'health-hospital-director', agentName: 'Dr. Evelyn Reed, Hospital Director', roleTitle: 'Hospital & Healthcare Director' },
          { zoneRoleTitle: 'Medical Director', agentTemplateId: 'health-medical-director', agentName: 'Dr. Gregory House, Chief Medical Officer', roleTitle: 'Chief Medical Officer' },
          { zoneRoleTitle: 'HIPAA Compliance Officer', agentTemplateId: 'health-hipaa-compliance-officer', agentName: 'Brenda Vance, HIPAA Officer', roleTitle: 'HIPAA Privacy Officer' },
          { zoneRoleTitle: 'Senior Developer', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, EHR Engineer', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'EHR & Telehealth Portal', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Full-Stack Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'Clinical Administration', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, Board Director', roleTitle: 'Chief Executive Officer' }
        ]
      },
      mid: {
        scale: 'mid',
        label: 'Regional Hospital Network',
        headcountLabel: '15 Agents • 7 Zones',
        description: 'Comprehensive hospital health network coordinating emergency triage, specialist physicians, inpatient wards, and clinical trial informatics.',
        space: {
          name: 'CarePulse Regional Medical Pavilion',
          description: 'Integrated medical center coordinating clinical outpatient clinics, surgical suites, and encrypted EHR telemetry.',
          category: 'Healthcare',
          width: 2200,
          height: 1150,
          color: '#06b6d4',
          shape: 'rectangle',
          workflowPrompt: 'Prioritize patient safety and rapid clinical diagnosis. Adhere strictly to clinical quality and patient consent guidelines.',
          workflowInstructions: '1. Hospital Director manages bed capacity and staff allocations.\n2. Medical Director oversees clinical department heads.\n3. HIPAA Officer continuously audits EHR chart access.\n4. Engineering team ensures 100% EHR uptime.',
          responsibilities: 'Regional healthcare operations, clinical governance, and electronic medical record management.'
        },
        zones: [
          { id: 'care-md-dir', roleTitle: 'Hospital Director', name: 'Hospital Executive Leadership', level: 0, parentId: null, color: '#06b6d4', width: 310, height: 155 },
          { id: 'care-md-cmo', roleTitle: 'Medical Director', name: 'Clinical Medicine & Physicians', level: 1, parentId: 'care-md-dir', color: '#10b981', width: 310, height: 155 },
          { id: 'care-md-hipaa', roleTitle: 'HIPAA Compliance Officer', name: 'HIPAA & Medical Regulatory Compliance', level: 1, parentId: 'care-md-dir', color: '#ef4444', width: 320, height: 160 },
          { id: 'care-md-tech', roleTitle: 'CTO', name: 'Healthcare Informatics & Technology', level: 1, parentId: 'care-md-dir', color: '#3b82f6', width: 310, height: 155 },
          { id: 'care-md-ehr', roleTitle: 'Tech Lead', name: 'EHR & HL7/FHIR Data Squad', level: 2, parentId: 'care-md-tech', color: '#6366f1', width: 350, height: 165 },
          { id: 'care-md-ops', roleTitle: 'COO', name: 'Hospital Facility & Staff Operations', level: 1, parentId: 'care-md-dir', color: '#f59e0b', width: 310, height: 155 },
          { id: 'care-md-qa', roleTitle: 'QA Manager', name: 'Clinical Quality & Safety Audits', level: 2, parentId: 'care-md-cmo', color: '#06b6d4', width: 310, height: 155 }
        ],
        agents: [
          { zoneRoleTitle: 'Hospital Director', agentTemplateId: 'health-hospital-director', agentName: 'Dr. Evelyn Reed, Hospital Director', roleTitle: 'Hospital & Healthcare Director' },
          { zoneRoleTitle: 'Medical Director', agentTemplateId: 'health-medical-director', agentName: 'Dr. Gregory House, Chief Medical Officer', roleTitle: 'Chief Medical Officer' },
          { zoneRoleTitle: 'HIPAA Compliance Officer', agentTemplateId: 'health-hipaa-compliance-officer', agentName: 'Brenda Vance, HIPAA Officer', roleTitle: 'HIPAA Privacy Officer' },
          { zoneRoleTitle: 'CTO', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Health Informatics Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, FHIR Engineer', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Telehealth Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'COO', agentTemplateId: 'lead-coo', agentName: 'Nadia Thorne, COO', roleTitle: 'Chief Operating Officer' },
          { zoneRoleTitle: 'QA Manager', agentTemplateId: 'eng-qa-manager', agentName: 'Rachel Adams, Quality Director', roleTitle: 'QA Manager' },
          { zoneRoleTitle: 'Healthcare Informatics & Technology', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, Health Cloud Lead', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'Healthcare Informatics & Technology', agentTemplateId: 'eng-site-reliability-engineer', agentName: 'Chloe Bennett, Clinic SRE', roleTitle: 'Site Reliability Engineer' },
          { zoneRoleTitle: 'Hospital Executive Leadership', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, Board Chair', roleTitle: 'Chief Executive Officer' },
          { zoneRoleTitle: 'Hospital Executive Leadership', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'Clinical Medicine & Physicians', agentTemplateId: 'people-head-of-people-hr', agentName: 'Harper Wells, Medical Staffing', roleTitle: 'Head of People & HR' },
          { zoneRoleTitle: 'Clinical Quality & Safety Audits', agentTemplateId: 'eng-qa-automation-engineer', agentName: 'Lucas Gray, Compliance QA', roleTitle: 'QA Automation Engineer' }
        ]
      },
      large: {
        scale: 'large',
        label: 'Academic Medical Health System',
        headcountLabel: '28 Agents • 10 Zones',
        description: 'Nationwide healthcare consortium integrating tertiary academic medical centers, clinical research institutes, and statewide telehealth.',
        space: {
          name: 'CarePulse Health System Global Campus',
          description: 'Sprawling medical campus designed for clinical trial data coordination, multi-hospital bed routing, and secure health data exchanges.',
          category: 'Healthcare',
          width: 3200,
          height: 1550,
          color: '#06b6d4',
          shape: 'rectangle',
          workflowPrompt: 'Execute clinical healthcare operations with zero medical errors, rapid ER triage, and uncompromised patient health data privacy.',
          workflowInstructions: '1. Executive board allocates clinical facilities and specialty research grants.\n2. Chief Medical Officer convenes clinical department chiefs weekly.\n3. Information security and HIPAA officers protect medical telemetry.\n4. Informatics squads support thousands of simultaneous physician charts.',
          responsibilities: 'Academic health system administration, clinical research, and regional emergency healthcare.'
        },
        zones: [
          { id: 'care-lg-dir', roleTitle: 'Hospital Director', name: 'Health System Directorate', level: 0, parentId: null, color: '#06b6d4', width: 320, height: 160 },
          { id: 'care-lg-cmo', roleTitle: 'Medical Director', name: 'Physicians & Clinical Protocols', level: 1, parentId: 'care-lg-dir', color: '#10b981', width: 310, height: 160 },
          { id: 'care-lg-hipaa', roleTitle: 'HIPAA Compliance Officer', name: 'HIPAA Security & Bioethics', level: 1, parentId: 'care-lg-dir', color: '#ef4444', width: 310, height: 160 },
          { id: 'care-lg-cto', roleTitle: 'CTO', name: 'Health Technology & Telehealth', level: 1, parentId: 'care-lg-dir', color: '#3b82f6', width: 310, height: 160 },
          { id: 'care-lg-coo', roleTitle: 'COO', name: 'Hospital Logistics & Clinical Staffing', level: 1, parentId: 'care-lg-dir', color: '#f59e0b', width: 310, height: 160 },
          { id: 'care-lg-cfo', roleTitle: 'CFO', name: 'Health Economics & Capital Planning', level: 1, parentId: 'care-lg-dir', color: '#10b981', width: 310, height: 160 },
          { id: 'care-lg-ehr', roleTitle: 'Tech Lead', name: 'Core EHR & Health Cloud Squad', level: 2, parentId: 'care-lg-cto', color: '#6366f1', width: 400, height: 175 },
          { id: 'care-lg-devops', roleTitle: 'DevOps Lead', name: 'HIPAA Cloud SRE & High Availability', level: 2, parentId: 'care-lg-cto', color: '#ec4899', width: 320, height: 160 },
          { id: 'care-lg-ciso', roleTitle: 'CISO', name: 'Cybersecurity & Medical Device Defense', level: 2, parentId: 'care-lg-hipaa', color: '#ef4444', width: 310, height: 160 },
          { id: 'care-lg-qa', roleTitle: 'QA Manager', name: 'Accreditation & Clinical Audits', level: 2, parentId: 'care-lg-cmo', color: '#06b6d4', width: 310, height: 160 }
        ],
        agents: [
          { zoneRoleTitle: 'Hospital Director', agentTemplateId: 'health-hospital-director', agentName: 'Dr. Evelyn Reed, Hospital Director', roleTitle: 'Hospital & Healthcare Director' },
          { zoneRoleTitle: 'Medical Director', agentTemplateId: 'health-medical-director', agentName: 'Dr. Gregory House, CMO', roleTitle: 'Chief Medical Officer' },
          { zoneRoleTitle: 'HIPAA Compliance Officer', agentTemplateId: 'health-hipaa-compliance-officer', agentName: 'Brenda Vance, HIPAA Officer', roleTitle: 'HIPAA Privacy Officer' },
          { zoneRoleTitle: 'CTO', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'COO', agentTemplateId: 'lead-coo', agentName: 'Nadia Thorne, COO', roleTitle: 'Chief Operating Officer' },
          { zoneRoleTitle: 'CFO', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'CISO', agentTemplateId: 'lead-ciso', agentName: 'Evan Cross, CISO', roleTitle: 'Chief Information Security Officer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Health Informatics Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Core EHR & Health Cloud Squad', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, FHIR Engineer', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Core EHR & Health Cloud Squad', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Telehealth Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, Health Cloud Lead', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-site-reliability-engineer', agentName: 'Chloe Bennett, Clinic SRE', roleTitle: 'Site Reliability Engineer' },
          { zoneRoleTitle: 'QA Manager', agentTemplateId: 'eng-qa-manager', agentName: 'Rachel Adams, Quality Director', roleTitle: 'QA Manager' },
          { zoneRoleTitle: 'Accreditation & Clinical Audits', agentTemplateId: 'eng-qa-automation-engineer', agentName: 'Lucas Gray, Compliance QA', roleTitle: 'QA Automation Engineer' }
        ]
      }
    }
  },

  // 7. Digital Growth & Performance Marketing Agency
  {
    id: 'company-growth-marketing',
    name: 'HyperScale Media Agency',
    category: 'Sales & Marketing',
    domain: 'Omnichannel Performance Marketing & SEO',
    tagline: 'High-ROI digital growth agency driving multi-channel customer acquisition, viral creative campaigns, and organic search dominance.',
    description: 'Premier performance marketing firm combining Creative Agency Directors, Performance Growth Leads, Principal SEO Strategists, and high-converting copywriters.',
    icon: 'Megaphone',
    color: '#ec4899',
    scales: {
      small: {
        scale: 'small',
        label: 'Growth Marketing Squad',
        headcountLabel: '6 Agents • 4 Zones',
        description: 'Agile growth squad designed for rapid ad creative iteration, landing page testing, and organic search growth.',
        space: {
          name: 'HyperScale Creative Studio (Lean)',
          description: 'High-energy agency workspace tailored for rapid creative production and daily campaign optimization.',
          category: 'Marketing',
          width: 1400,
          height: 820,
          color: '#ec4899',
          shape: 'rectangle',
          workflowPrompt: 'Deliver high-ROAS marketing campaigns with persuasive copywriting and rigorous multivariate landing page tests.',
          workflowInstructions: '1. Managing Director sets client growth targets.\n2. Growth Lead optimizes ad budgets across Meta/Google.\n3. SEO strategist builds organic topic clusters.\n4. Copywriter authors persuasive ad hooks.',
          responsibilities: 'Paid customer acquisition, organic SEO rankings, and creative conversion design.'
        },
        zones: [
          { id: 'hyp-sm-dir', roleTitle: 'Creative Director', name: 'Agency Leadership', level: 0, parentId: null, color: '#ec4899', width: 280, height: 150 },
          { id: 'hyp-sm-growth', roleTitle: 'Growth Lead', name: 'Performance Marketing (PPC)', level: 1, parentId: 'hyp-sm-dir', color: '#10b981', width: 280, height: 150 },
          { id: 'hyp-sm-seo', roleTitle: 'Principal SEO Strategist', name: 'SEO & Organic Growth', level: 1, parentId: 'hyp-sm-dir', color: '#3b82f6', width: 300, height: 150 },
          { id: 'hyp-sm-copy', roleTitle: 'Product Designer', name: 'Creative Copy & Design', level: 2, parentId: 'hyp-sm-growth', color: '#f59e0b', width: 280, height: 150 }
        ],
        agents: [
          { zoneRoleTitle: 'Creative Director', agentTemplateId: 'mktg-agency-managing-director', agentName: 'Cassandra Cole, Agency MD', roleTitle: 'Marketing Agency Managing Director' },
          { zoneRoleTitle: 'Growth Lead', agentTemplateId: 'mktg-performance-growth-lead', agentName: 'Tyler Reed, Growth Lead', roleTitle: 'Head of Performance Marketing' },
          { zoneRoleTitle: 'Principal SEO Strategist', agentTemplateId: 'mktg-principal-seo-strategist', agentName: 'Gemma Ward, SEO Lead', roleTitle: 'Principal SEO Strategist' },
          { zoneRoleTitle: 'Product Designer', agentTemplateId: 'prod-lead-product-designer', agentName: 'Aria Song, Creative Designer', roleTitle: 'Lead Product Designer' },
          { zoneRoleTitle: 'Performance Marketing (PPC)', agentTemplateId: 'sales-account-executive', agentName: 'Jordan Cole, Client Director', roleTitle: 'Senior Account Executive' },
          { zoneRoleTitle: 'Agency Leadership', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, Agency Founder', roleTitle: 'Chief Executive Officer' }
        ]
      },
      mid: {
        scale: 'mid',
        label: 'Full-Service Digital Agency',
        headcountLabel: '15 Agents • 7 Zones',
        description: 'Full-service digital growth firm managing programmatic DSPs, organic search clusters, viral brand campaigns, and client account growth.',
        space: {
          name: 'HyperScale Agency Headquarters',
          description: 'Spacious creative headquarters with media buying rooms, SEO audit suites, and design review theaters.',
          category: 'Marketing',
          width: 2200,
          height: 1150,
          color: '#ec4899',
          shape: 'rectangle',
          workflowPrompt: 'Drive measurable business outcomes for clients through data-backed attribution modeling and world-class storytelling.',
          workflowInstructions: '1. Managing Director directs quarterly client growth roadmaps.\n2. Media buyers adjust daily ad bids and analyze payback.\n3. SEO engineers audit technical indexability and Core Web Vitals.\n4. Design team ships high-converting interactive landing pages.',
          responsibilities: 'Full-service marketing campaigns, brand identity, and client revenue expansion.'
        },
        zones: [
          { id: 'hyp-md-dir', roleTitle: 'Creative Director', name: 'Executive Agency Directorate', level: 0, parentId: null, color: '#ec4899', width: 310, height: 155 },
          { id: 'hyp-md-growth', roleTitle: 'Growth Lead', name: 'Paid Media & Ad Networks', level: 1, parentId: 'hyp-md-dir', color: '#10b981', width: 310, height: 155 },
          { id: 'hyp-md-seo', roleTitle: 'Principal SEO Strategist', name: 'Technical SEO & Content Strategy', level: 1, parentId: 'hyp-md-dir', color: '#3b82f6', width: 320, height: 160 },
          { id: 'hyp-md-sales', roleTitle: 'Sales Manager', name: 'Client Accounts & Client Success', level: 1, parentId: 'hyp-md-dir', color: '#f59e0b', width: 310, height: 155 },
          { id: 'hyp-md-dev', roleTitle: 'Tech Lead', name: 'Web Engineering & Landing Pages', level: 2, parentId: 'hyp-md-growth', color: '#6366f1', width: 350, height: 165 },
          { id: 'hyp-md-creative', roleTitle: 'Product Designer', name: 'Visual Branding & UI/UX', level: 2, parentId: 'hyp-md-dir', color: '#ec4899', width: 310, height: 155 },
          { id: 'hyp-md-analytics', roleTitle: 'Quantitative Financial Analyst', name: 'Attribution & Marketing Analytics', level: 2, parentId: 'hyp-md-growth', color: '#10b981', width: 320, height: 160 }
        ],
        agents: [
          { zoneRoleTitle: 'Creative Director', agentTemplateId: 'mktg-agency-managing-director', agentName: 'Cassandra Cole, Agency MD', roleTitle: 'Marketing Agency Managing Director' },
          { zoneRoleTitle: 'Growth Lead', agentTemplateId: 'mktg-performance-growth-lead', agentName: 'Tyler Reed, Growth Lead', roleTitle: 'Head of Performance Marketing' },
          { zoneRoleTitle: 'Principal SEO Strategist', agentTemplateId: 'mktg-principal-seo-strategist', agentName: 'Gemma Ward, SEO Lead', roleTitle: 'Principal SEO Strategist' },
          { zoneRoleTitle: 'Sales Manager', agentTemplateId: 'sales-enterprise-sales-manager', agentName: 'Jordan Cole, Client Director', roleTitle: 'Enterprise Sales Manager' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Web Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Frontend Architect', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Web Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'Product Designer', agentTemplateId: 'prod-lead-product-designer', agentName: 'Aria Song, Design Lead', roleTitle: 'Lead Product Designer' },
          { zoneRoleTitle: 'Quantitative Financial Analyst', agentTemplateId: 'fin-quantitative-trader-analyst', agentName: 'Gabriel Ortiz, Marketing Analyst', roleTitle: 'Quantitative Financial Analyst' },
          { zoneRoleTitle: 'Client Accounts & Client Success', agentTemplateId: 'sales-account-executive', agentName: 'Olivia Hayes, Account Manager', roleTitle: 'Senior Account Executive' },
          { zoneRoleTitle: 'Executive Agency Directorate', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, Agency Founder', roleTitle: 'Chief Executive Officer' },
          { zoneRoleTitle: 'Executive Agency Directorate', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'Web Engineering & Landing Pages', agentTemplateId: 'eng-qa-automation-engineer', agentName: 'Lucas Gray, Conversion QA', roleTitle: 'QA Automation Engineer' },
          { zoneRoleTitle: 'Paid Media & Ad Networks', agentTemplateId: 'lead-cro', agentName: 'Derrick Vance, Revenue Officer', roleTitle: 'Chief Revenue Officer' },
          { zoneRoleTitle: 'Executive Agency Directorate', agentTemplateId: 'people-head-of-people-hr', agentName: 'Harper Wells, Talent Director', roleTitle: 'Head of People & HR' }
        ]
      },
      large: {
        scale: 'large',
        label: 'Global Media Agency Network',
        headcountLabel: '28 Agents • 10 Zones',
        description: 'Global advertising and media powerhouse driving international omnichannel campaigns, media buying, programmatic ads, and global branding.',
        space: {
          name: 'HyperScale Worldwide Media Network Campus',
          description: 'Multinational agency space orchestrating global media buys across hundreds of corporate clients.',
          category: 'Marketing',
          width: 3200,
          height: 1550,
          color: '#ec4899',
          shape: 'rectangle',
          workflowPrompt: 'Execute global brand campaigns with multi-million dollar programmatic ad buys and rigorous econometric attribution.',
          workflowInstructions: '1. Executive board sets global client acquisition priorities.\n2. Regional directors execute performance media across search and social.\n3. Production squads ship high-impact creative video and landing pages.\n4. Technical SEO team audits international multi-lingual site domains.',
          responsibilities: 'Global digital media buying, international SEO, and brand growth.'
        },
        zones: [
          { id: 'hyp-lg-dir', roleTitle: 'Creative Director', name: 'Global Media Directorate', level: 0, parentId: null, color: '#ec4899', width: 320, height: 160 },
          { id: 'hyp-lg-growth', roleTitle: 'Growth Lead', name: 'Global Media Buying & Programmatic', level: 1, parentId: 'hyp-lg-dir', color: '#10b981', width: 320, height: 160 },
          { id: 'hyp-lg-seo', roleTitle: 'Principal SEO Strategist', name: 'International Technical SEO', level: 1, parentId: 'hyp-lg-dir', color: '#3b82f6', width: 320, height: 160 },
          { id: 'hyp-lg-sales', roleTitle: 'Sales Manager', name: 'Enterprise Client Relationships', level: 1, parentId: 'hyp-lg-dir', color: '#f59e0b', width: 310, height: 160 },
          { id: 'hyp-lg-cfo', roleTitle: 'CFO', name: 'Media Budget & Client Financials', level: 1, parentId: 'hyp-lg-dir', color: '#10b981', width: 310, height: 160 },
          { id: 'hyp-lg-dev', roleTitle: 'Tech Lead', name: 'Headless Web & Conversion Tech', level: 2, parentId: 'hyp-lg-growth', color: '#6366f1', width: 400, height: 175 },
          { id: 'hyp-lg-design', roleTitle: 'Product Designer', name: 'Brand Creative & Visual Design', level: 2, parentId: 'hyp-lg-dir', color: '#ec4899', width: 320, height: 160 },
          { id: 'hyp-lg-cro', roleTitle: 'Chief Revenue Officer', name: 'Revenue Operations & Expansion', level: 1, parentId: 'hyp-lg-dir', color: '#f59e0b', width: 310, height: 160 },
          { id: 'hyp-lg-cto', roleTitle: 'CTO', name: 'Marketing Tech Stack Architecture', level: 1, parentId: 'hyp-lg-dir', color: '#3b82f6', width: 310, height: 160 },
          { id: 'hyp-lg-qa', roleTitle: 'QA Manager', name: 'Analytics & Campaign Tracking QA', level: 2, parentId: 'hyp-lg-growth', color: '#06b6d4', width: 310, height: 160 }
        ],
        agents: [
          { zoneRoleTitle: 'Creative Director', agentTemplateId: 'mktg-agency-managing-director', agentName: 'Cassandra Cole, Agency MD', roleTitle: 'Marketing Agency Managing Director' },
          { zoneRoleTitle: 'Growth Lead', agentTemplateId: 'mktg-performance-growth-lead', agentName: 'Tyler Reed, Growth Lead', roleTitle: 'Head of Performance Marketing' },
          { zoneRoleTitle: 'Principal SEO Strategist', agentTemplateId: 'mktg-principal-seo-strategist', agentName: 'Gemma Ward, SEO Lead', roleTitle: 'Principal SEO Strategist' },
          { zoneRoleTitle: 'Sales Manager', agentTemplateId: 'sales-enterprise-sales-manager', agentName: 'Jordan Cole, Client Director', roleTitle: 'Enterprise Sales Manager' },
          { zoneRoleTitle: 'CFO', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'Chief Revenue Officer', agentTemplateId: 'lead-cro', agentName: 'Derrick Vance, CRO', roleTitle: 'Chief Revenue Officer' },
          { zoneRoleTitle: 'CTO', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Web Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Headless Web & Conversion Tech', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Frontend Architect', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Headless Web & Conversion Tech', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Web Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'Product Designer', agentTemplateId: 'prod-lead-product-designer', agentName: 'Aria Song, Design Lead', roleTitle: 'Lead Product Designer' },
          { zoneRoleTitle: 'QA Manager', agentTemplateId: 'eng-qa-manager', agentName: 'Rachel Adams, Analytics QA', roleTitle: 'QA Manager' }
        ]
      }
    }
  },

  // 8. Gaming & Interactive Entertainment Studio
  {
    id: 'company-gaming-studio',
    name: 'PixelForge Interactive',
    category: 'Gaming & Entertainment',
    domain: 'Game Engines, 3D Art & Physics Mechanics',
    tagline: 'High-fidelity AAA game studio developing immersive 3D interactive experiences, physics engines, and captivating narrative worlds.',
    description: 'World-class game studio featuring Studio Game Directors, Lead Game Engine Programmers, 3D Technical Artists, and Gameplay Systems Designers.',
    icon: 'Gamepad2',
    color: '#6366f1',
    scales: {
      small: {
        scale: 'small',
        label: 'Indie Game Squad',
        headcountLabel: '6 Agents • 4 Zones',
        description: 'Nimble indie game studio crafting innovative gameplay mechanics, tight controller loops, and distinctive art direction.',
        space: {
          name: 'PixelForge Indie Studio (Lean)',
          description: 'Creative game jam studio tailored for rapid prototype iteration and playable build playtesting.',
          category: 'Gaming',
          width: 1400,
          height: 820,
          color: '#6366f1',
          shape: 'rectangle',
          workflowPrompt: 'Iterate rapidly toward a compelling 30-second gameplay core loop with 60 FPS performance.',
          workflowInstructions: '1. Game Director refines mechanics and controls.\n2. Engine dev implements physics and shaders.\n3. Technical artist imports optimized 3D assets.\n4. QA tests collision and frametimes.',
          responsibilities: 'Core gameplay design, rendering, and playtesting.'
        },
        zones: [
          { id: 'pix-sm-dir', roleTitle: 'Game Director', name: 'Creative Game Direction', level: 0, parentId: null, color: '#6366f1', width: 280, height: 150 },
          { id: 'pix-sm-eng', roleTitle: 'Lead Game Engine Programmer', name: 'Engine & Physics Programming', level: 1, parentId: 'pix-sm-dir', color: '#3b82f6', width: 300, height: 150 },
          { id: 'pix-sm-art', roleTitle: 'Lead 3D Technical Artist', name: '3D Art & Visual Assets', level: 1, parentId: 'pix-sm-dir', color: '#ec4899', width: 280, height: 150 },
          { id: 'pix-sm-qa', roleTitle: 'QA Engineer', name: 'Playtesting & Bug Hunting', level: 2, parentId: 'pix-sm-eng', color: '#06b6d4', width: 280, height: 150 }
        ],
        agents: [
          { zoneRoleTitle: 'Game Director', agentTemplateId: 'game-studio-director', agentName: 'Kaelen Drake, Game Director', roleTitle: 'Studio Game Director' },
          { zoneRoleTitle: 'Lead Game Engine Programmer', agentTemplateId: 'game-lead-engine-programmer', agentName: 'Axel Thorne, Engine Lead', roleTitle: 'Lead Game Engine Programmer' },
          { zoneRoleTitle: 'Lead 3D Technical Artist', agentTemplateId: 'game-3d-technical-artist', agentName: 'Lyra Vance, 3D Artist', roleTitle: 'Lead 3D Technical Artist' },
          { zoneRoleTitle: 'QA Engineer', agentTemplateId: 'eng-qa-automation-engineer', agentName: 'Lucas Gray, Playtester', roleTitle: 'QA Playtest Engineer' },
          { zoneRoleTitle: 'Engine & Physics Programming', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Gameplay Coder', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Creative Game Direction', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, Executive Producer', roleTitle: 'Chief Executive Officer' }
        ]
      },
      mid: {
        scale: 'mid',
        label: 'Mid-Tier Game Studio',
        headcountLabel: '15 Agents • 7 Zones',
        description: 'Experienced game development studio producing cross-platform console/PC titles with multi-threaded physics, shaders, and multiplayer netcode.',
        space: {
          name: 'PixelForge Development Studio',
          description: 'Spacious game production studio with sound recording suites, motion capture rigs, and dedicated build servers.',
          category: 'Gaming',
          width: 2200,
          height: 1150,
          color: '#6366f1',
          shape: 'rectangle',
          workflowPrompt: 'Deliver immersive 60+ FPS gameplay with robust multiplayer netcode, zero memory leaks, and memorable visual art.',
          workflowInstructions: '1. Game Director coordinates narrative and level progression.\n2. Engine team optimizes GPU rendering draw calls.\n3. Art team builds PBR materials and 3D character rigs.\n4. QA team stress-tests multiplayer latency and physics bugs.',
          responsibilities: 'Cross-platform game development, physics simulation, and multiplayer networking.'
        },
        zones: [
          { id: 'pix-md-dir', roleTitle: 'Game Director', name: 'Studio Executive & Game Direction', level: 0, parentId: null, color: '#6366f1', width: 310, height: 155 },
          { id: 'pix-md-eng', roleTitle: 'Lead Game Engine Programmer', name: 'Game Engine & Graphics Core', level: 1, parentId: 'pix-md-dir', color: '#3b82f6', width: 320, height: 160 },
          { id: 'pix-md-art', roleTitle: 'Lead 3D Technical Artist', name: '3D Art, VFX & Shaders', level: 1, parentId: 'pix-md-dir', color: '#ec4899', width: 310, height: 155 },
          { id: 'pix-md-prod', roleTitle: 'Product Manager', name: 'Game Production & Milestones', level: 1, parentId: 'pix-md-dir', color: '#f59e0b', width: 310, height: 155 },
          { id: 'pix-md-gameplay', roleTitle: 'Tech Lead', name: 'Gameplay Systems & Mechanics', level: 2, parentId: 'pix-md-eng', color: '#6366f1', width: 350, height: 165 },
          { id: 'pix-md-qa', roleTitle: 'QA Manager', name: 'Playtesting & Frametime QA', level: 2, parentId: 'pix-md-eng', color: '#06b6d4', width: 310, height: 155 },
          { id: 'pix-md-infra', roleTitle: 'DevOps Lead', name: 'Build Farms & Multiplayer Servers', level: 2, parentId: 'pix-md-eng', color: '#ec4899', width: 310, height: 155 }
        ],
        agents: [
          { zoneRoleTitle: 'Game Director', agentTemplateId: 'game-studio-director', agentName: 'Kaelen Drake, Game Director', roleTitle: 'Studio Game Director' },
          { zoneRoleTitle: 'Lead Game Engine Programmer', agentTemplateId: 'game-lead-engine-programmer', agentName: 'Axel Thorne, Engine Lead', roleTitle: 'Lead Game Engine Programmer' },
          { zoneRoleTitle: 'Lead 3D Technical Artist', agentTemplateId: 'game-3d-technical-artist', agentName: 'Lyra Vance, 3D Artist', roleTitle: 'Lead 3D Technical Artist' },
          { zoneRoleTitle: 'Product Manager', agentTemplateId: 'prod-principal-product-manager', agentName: 'Julian Croft, Executive Producer', roleTitle: 'Principal Product Manager' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Gameplay Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Systems Programmer', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, UI Programmer', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'QA Manager', agentTemplateId: 'eng-qa-manager', agentName: 'Rachel Adams, QA Manager', roleTitle: 'QA Manager' },
          { zoneRoleTitle: 'QA Manager', agentTemplateId: 'eng-qa-automation-engineer', agentName: 'Lucas Gray, Playtest QA', roleTitle: 'QA Automation Engineer' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, Netcode DevOps', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-site-reliability-engineer', agentName: 'Chloe Bennett, Dedicated Servers', roleTitle: 'Site Reliability Engineer' },
          { zoneRoleTitle: 'Studio Executive & Game Direction', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, Studio Head', roleTitle: 'Chief Executive Officer' },
          { zoneRoleTitle: 'Studio Executive & Game Direction', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: '3D Art, VFX & Shaders', agentTemplateId: 'prod-lead-product-designer', agentName: 'Aria Song, UI Artist', roleTitle: 'Lead Product Designer' },
          { zoneRoleTitle: 'Gameplay Systems & Mechanics', agentTemplateId: 'eng-associate-software-developer', agentName: 'Alex Rivera, Junior Coder', roleTitle: 'Associate Developer' }
        ]
      },
      large: {
        scale: 'large',
        label: 'AAA Global Game Studio',
        headcountLabel: '28 Agents • 10 Zones',
        description: 'Major AAA multi-studio enterprise shipping blockbuster open-world titles, procedural worlds, ray tracing, and massive multiplayer infrastructure.',
        space: {
          name: 'PixelForge AAA Production Campus',
          description: 'State-of-the-art entertainment studio campus with dedicated motion-capture stages, photogrammetry labs, and global server cluster grids.',
          category: 'Gaming',
          width: 3200,
          height: 1550,
          color: '#6366f1',
          shape: 'rectangle',
          workflowPrompt: 'Deliver visually stunning, photorealistic AAA gaming titles with 120 FPS fidelity, low-latency netcode, and engaging emergent storytelling.',
          workflowInstructions: '1. Studio leadership balances publisher milestones and creative vision.\n2. Engine and graphics architects push modern GPU APIs (DirectX 12 / Vulkan).\n3. Technical artists maintain photorealistic asset pipelines and shaders.\n4. Global network engineers manage distributed game server fleets.',
          responsibilities: 'Blockbuster game production, physics simulation, multiplayer architecture, and worldwide release.'
        },
        zones: [
          { id: 'pix-lg-dir', roleTitle: 'Game Director', name: 'Executive Studio Directorate', level: 0, parentId: null, color: '#6366f1', width: 320, height: 160 },
          { id: 'pix-lg-eng', roleTitle: 'Lead Game Engine Programmer', name: 'Game Engine & Low-Level Graphics', level: 1, parentId: 'pix-lg-dir', color: '#3b82f6', width: 330, height: 160 },
          { id: 'pix-lg-art', roleTitle: 'Lead 3D Technical Artist', name: 'Technical Art, Shaders & Photogrammetry', level: 1, parentId: 'pix-lg-dir', color: '#ec4899', width: 330, height: 160 },
          { id: 'pix-lg-prod', roleTitle: 'Product Manager', name: 'Executive Production & Milestones', level: 1, parentId: 'pix-lg-dir', color: '#f59e0b', width: 310, height: 160 },
          { id: 'pix-lg-net', roleTitle: 'DevOps Lead', name: 'Multiplayer Infrastructure & Backend Cloud', level: 2, parentId: 'pix-lg-eng', color: '#ec4899', width: 330, height: 160 },
          { id: 'pix-lg-gameplay', roleTitle: 'Tech Lead', name: 'Core Gameplay Systems & AI', level: 2, parentId: 'pix-lg-eng', color: '#6366f1', width: 400, height: 175 },
          { id: 'pix-lg-cfo', roleTitle: 'CFO', name: 'Production Budget & Royalties', level: 1, parentId: 'pix-lg-dir', color: '#10b981', width: 310, height: 160 },
          { id: 'pix-lg-ciso', roleTitle: 'CISO', name: 'Anti-Cheat & DRM Security', level: 2, parentId: 'pix-lg-dir', color: '#ef4444', width: 310, height: 160 },
          { id: 'pix-lg-qa', roleTitle: 'QA Manager', name: 'Rigorous Playtesting & Physics QA', level: 2, parentId: 'pix-lg-eng', color: '#06b6d4', width: 310, height: 160 },
          { id: 'pix-lg-audio', roleTitle: 'Product Designer', name: 'Audio Design & UI Polish', level: 2, parentId: 'pix-lg-art', color: '#f59e0b', width: 310, height: 160 }
        ],
        agents: [
          { zoneRoleTitle: 'Game Director', agentTemplateId: 'game-studio-director', agentName: 'Kaelen Drake, Game Director', roleTitle: 'Studio Game Director' },
          { zoneRoleTitle: 'Lead Game Engine Programmer', agentTemplateId: 'game-lead-engine-programmer', agentName: 'Axel Thorne, Engine Lead', roleTitle: 'Lead Game Engine Programmer' },
          { zoneRoleTitle: 'Lead 3D Technical Artist', agentTemplateId: 'game-3d-technical-artist', agentName: 'Lyra Vance, 3D Artist', roleTitle: 'Lead 3D Technical Artist' },
          { zoneRoleTitle: 'Product Manager', agentTemplateId: 'prod-principal-product-manager', agentName: 'Julian Croft, Executive Producer', roleTitle: 'Principal Product Manager' },
          { zoneRoleTitle: 'CFO', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'CISO', agentTemplateId: 'lead-ciso', agentName: 'Evan Cross, Anti-Cheat Lead', roleTitle: 'Chief Information Security Officer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Gameplay Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Core Gameplay Systems & AI', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Systems Programmer', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Core Gameplay Systems & AI', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, UI Programmer', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, Netcode DevOps', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-site-reliability-engineer', agentName: 'Chloe Bennett, Dedicated Servers', roleTitle: 'Site Reliability Engineer' },
          { zoneRoleTitle: 'QA Manager', agentTemplateId: 'eng-qa-manager', agentName: 'Rachel Adams, QA Manager', roleTitle: 'QA Manager' }
        ]
      }
    }
  },

  // 9. Supply Chain & Global Logistics Network
  {
    id: 'company-freight-logistics',
    name: 'StreamLine Global Freight',
    category: 'Supply Chain & Logistics',
    domain: 'Multimodal Freight, Customs & Fleet Dispatch',
    tagline: 'End-to-end global supply chain network orchestrating multimodal freight routes, customs clearance, and warehouse IoT automation.',
    description: 'High-efficiency logistics corporation featuring Global Logistics Directors, Freight Route Dispatch Managers, Customs Compliance Officers, and Warehouse Operations Leads.',
    icon: 'Car',
    color: '#14b8a6',
    scales: {
      small: {
        scale: 'small',
        label: 'Regional Freight Hub',
        headcountLabel: '6 Agents • 4 Zones',
        description: 'Lean dispatch team coordinating regional truck freight, bill of lading documentation, and local warehouse docking.',
        space: {
          name: 'StreamLine Freight Hub (Lean)',
          description: 'Fast-paced logistics depot focused on route dispatching and driver coordination.',
          category: 'Logistics',
          width: 1400,
          height: 820,
          color: '#14b8a6',
          shape: 'rectangle',
          workflowPrompt: 'Minimize transit delays, optimize route fuel burn, and maintain 100% on-time delivery metrics.',
          workflowInstructions: '1. Logistics Director oversees carrier contracts.\n2. Dispatch Manager routes daily truck shipments.\n3. Customs Specialist verifies shipping manifests.\n4. Warehouse engineer logs RFID inventory.',
          responsibilities: 'Regional carrier dispatching and freight tracking.'
        },
        zones: [
          { id: 'sl-sm-dir', roleTitle: 'Logistics Director', name: 'Logistics Operations', level: 0, parentId: null, color: '#14b8a6', width: 280, height: 150 },
          { id: 'sl-sm-disp', roleTitle: 'Logistics Director', name: 'Route Dispatch & Fleet Tracking', level: 1, parentId: 'sl-sm-dir', color: '#3b82f6', width: 280, height: 150 },
          { id: 'sl-sm-cust', roleTitle: 'Compliance Officer', name: 'Customs & Port Manifests', level: 1, parentId: 'sl-sm-dir', color: '#f59e0b', width: 280, height: 150 },
          { id: 'sl-sm-eng', roleTitle: 'Senior Developer', name: 'Telematics & Warehouse APIs', level: 2, parentId: 'sl-sm-disp', color: '#6366f1', width: 300, height: 150 }
        ],
        agents: [
          { zoneRoleTitle: 'Logistics Director', agentTemplateId: 'logistics-global-supply-director', agentName: 'Carlos Mendoza, Logistics Director', roleTitle: 'Global Logistics Director' },
          { zoneRoleTitle: 'Compliance Officer', agentTemplateId: 'fin-compliance-aml-officer', agentName: 'Elena Rostova, Customs Officer', roleTitle: 'Customs Compliance Officer' },
          { zoneRoleTitle: 'Senior Developer', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Telematics Dev', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Telematics & Warehouse APIs', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Full-Stack Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'Route Dispatch & Fleet Tracking', agentTemplateId: 'sales-account-executive', agentName: 'Jordan Cole, Carrier Rep', roleTitle: 'Senior Account Executive' },
          { zoneRoleTitle: 'Logistics Operations', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, Executive Sponsor', roleTitle: 'Chief Executive Officer' }
        ]
      },
      mid: {
        scale: 'mid',
        label: 'Multimodal Freight Enterprise',
        headcountLabel: '15 Agents • 7 Zones',
        description: 'Cross-border logistics enterprise managing ocean cargo containers, air cargo charters, cross-docking distribution, and real-time IoT tracking.',
        space: {
          name: 'StreamLine Global Logistics Operations Center',
          description: 'Spacious freight command center featuring real-time maritime vessel telemetry and automated warehouse inventory dashboards.',
          category: 'Logistics',
          width: 2200,
          height: 1150,
          color: '#14b8a6',
          shape: 'rectangle',
          workflowPrompt: 'Ensure frictionless multimodal transit across ports, rails, and highways with automated customs clearance.',
          workflowInstructions: '1. Executive management balances carrier fuel hedging and long-term lane contracts.\n2. Dispatchers reroute shipments around weather and port congestion.\n3. Customs officers guarantee compliance with international trade tariffs.\n4. Software engineers maintain real-time GPS tracking APIs.',
          responsibilities: 'Multimodal supply chain execution, freight dispatching, and customs compliance.'
        },
        zones: [
          { id: 'sl-md-dir', roleTitle: 'Logistics Director', name: 'Global Logistics Executive', level: 0, parentId: null, color: '#14b8a6', width: 310, height: 155 },
          { id: 'sl-md-disp', roleTitle: 'Logistics Director', name: 'Multimodal Dispatch & Carrier Network', level: 1, parentId: 'sl-md-dir', color: '#3b82f6', width: 330, height: 160 },
          { id: 'sl-md-cust', roleTitle: 'Compliance Officer', name: 'Customs, Tariffs & Trade Compliance', level: 1, parentId: 'sl-md-dir', color: '#f59e0b', width: 320, height: 160 },
          { id: 'sl-md-tech', roleTitle: 'CTO', name: 'Logistics Software & IoT Telematics', level: 1, parentId: 'sl-md-dir', color: '#6366f1', width: 310, height: 155 },
          { id: 'sl-md-devs', roleTitle: 'Tech Lead', name: 'Fleet Telematics & Route Optimization', level: 2, parentId: 'sl-md-tech', color: '#3b82f6', width: 360, height: 165 },
          { id: 'sl-md-ware', roleTitle: 'COO', name: 'Warehouse Fulfillment & Automation', level: 1, parentId: 'sl-md-dir', color: '#10b981', width: 310, height: 155 },
          { id: 'sl-md-sre', roleTitle: 'DevOps Lead', name: 'High-Availability Logistics Cloud', level: 2, parentId: 'sl-md-tech', color: '#ec4899', width: 310, height: 155 }
        ],
        agents: [
          { zoneRoleTitle: 'Logistics Director', agentTemplateId: 'logistics-global-supply-director', agentName: 'Carlos Mendoza, Logistics Director', roleTitle: 'Global Logistics Director' },
          { zoneRoleTitle: 'Compliance Officer', agentTemplateId: 'fin-compliance-aml-officer', agentName: 'Elena Rostova, Customs Officer', roleTitle: 'Customs Compliance Officer' },
          { zoneRoleTitle: 'CTO', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'COO', agentTemplateId: 'lead-coo', agentName: 'Nadia Thorne, COO', roleTitle: 'Chief Operating Officer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Fleet Tech Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Route Algorithmic Dev', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Driver App Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, Telematics SRE', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-site-reliability-engineer', agentName: 'Chloe Bennett, IoT SRE', roleTitle: 'Site Reliability Engineer' },
          { zoneRoleTitle: 'Global Logistics Executive', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, CEO', roleTitle: 'Chief Executive Officer' },
          { zoneRoleTitle: 'Global Logistics Executive', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'Multimodal Dispatch & Carrier Network', agentTemplateId: 'sales-enterprise-sales-manager', agentName: 'Jordan Cole, Carrier Lead', roleTitle: 'Enterprise Sales Manager' },
          { zoneRoleTitle: 'Multimodal Dispatch & Carrier Network', agentTemplateId: 'sales-account-executive', agentName: 'Olivia Hayes, Dispatch Account Rep', roleTitle: 'Senior Account Executive' },
          { zoneRoleTitle: 'Fleet Telematics & Route Optimization', agentTemplateId: 'eng-associate-software-developer', agentName: 'Alex Rivera, Junior Dev', roleTitle: 'Associate Developer' },
          { zoneRoleTitle: 'Global Logistics Executive', agentTemplateId: 'people-head-of-people-hr', agentName: 'Harper Wells, Fleet HR', roleTitle: 'Head of People & HR' }
        ]
      },
      large: {
        scale: 'large',
        label: 'Global Supply Chain Conglomerate',
        headcountLabel: '28 Agents • 10 Zones',
        description: 'Global freight and maritime conglomerate operating container vessels, air cargo hubs, automated fulfillment robotics, and international trade governance.',
        space: {
          name: 'StreamLine Global Freight Command Center',
          description: 'Worldwide maritime and freight coordination campus with satellite telematics tracking thousands of concurrent shipments.',
          category: 'Logistics',
          width: 3200,
          height: 1550,
          color: '#14b8a6',
          shape: 'rectangle',
          workflowPrompt: 'Orchestrate global multimodal freight movements with zero customs delays and dynamic automated rerouting.',
          workflowInstructions: '1. Executive leadership optimizes global shipping lanes and fuel risk hedging.\n2. Dispatch centers monitor continuous maritime AIS and GPS tracking.\n3. Customs compliance team validates documentation across international ports.\n4. Software engineering team guarantees sub-second telematics streaming.',
          responsibilities: 'Global maritime freight, automated logistics distribution, and trade compliance.'
        },
        zones: [
          { id: 'sl-lg-dir', roleTitle: 'Logistics Director', name: 'Global Supply Chain Directorate', level: 0, parentId: null, color: '#14b8a6', width: 320, height: 160 },
          { id: 'sl-lg-disp', roleTitle: 'Logistics Director', name: 'Global Multimodal Dispatch Grid', level: 1, parentId: 'sl-lg-dir', color: '#3b82f6', width: 330, height: 160 },
          { id: 'sl-lg-cust', roleTitle: 'Compliance Officer', name: 'International Customs & Tariffs', level: 1, parentId: 'sl-lg-dir', color: '#f59e0b', width: 320, height: 160 },
          { id: 'sl-lg-cto', roleTitle: 'CTO', name: 'Global Telematics & Automation Tech', level: 1, parentId: 'sl-lg-dir', color: '#6366f1', width: 320, height: 160 },
          { id: 'sl-lg-cfo', roleTitle: 'CFO', name: 'Freight Treasury & Fuel Hedging', level: 1, parentId: 'sl-lg-dir', color: '#10b981', width: 310, height: 160 },
          { id: 'sl-lg-coo', roleTitle: 'COO', name: 'Maritime & Terminal Operations', level: 1, parentId: 'sl-lg-dir', color: '#f59e0b', width: 310, height: 160 },
          { id: 'sl-lg-devs', roleTitle: 'Tech Lead', name: 'Core Route Optimization & Telematics', level: 2, parentId: 'sl-lg-cto', color: '#3b82f6', width: 400, height: 175 },
          { id: 'sl-lg-sre', roleTitle: 'DevOps Lead', name: 'Global High-Availability SRE', level: 2, parentId: 'sl-lg-cto', color: '#ec4899', width: 320, height: 160 },
          { id: 'sl-lg-ciso', roleTitle: 'CISO', name: 'Fleet Cybersecurity & GPS Security', level: 2, parentId: 'sl-lg-dir', color: '#ef4444', width: 310, height: 160 },
          { id: 'sl-lg-sales', roleTitle: 'Sales Manager', name: 'Global Enterprise Freight Sales', level: 2, parentId: 'sl-lg-coo', color: '#10b981', width: 310, height: 160 }
        ],
        agents: [
          { zoneRoleTitle: 'Logistics Director', agentTemplateId: 'logistics-global-supply-director', agentName: 'Carlos Mendoza, Logistics Director', roleTitle: 'Global Logistics Director' },
          { zoneRoleTitle: 'Compliance Officer', agentTemplateId: 'fin-compliance-aml-officer', agentName: 'Elena Rostova, Customs Officer', roleTitle: 'Customs Compliance Officer' },
          { zoneRoleTitle: 'CTO', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'CFO', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'COO', agentTemplateId: 'lead-coo', agentName: 'Nadia Thorne, COO', roleTitle: 'Chief Operating Officer' },
          { zoneRoleTitle: 'CISO', agentTemplateId: 'lead-ciso', agentName: 'Evan Cross, CISO', roleTitle: 'Chief Information Security Officer' },
          { zoneRoleTitle: 'Tech Lead', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Fleet Tech Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Core Route Optimization & Telematics', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Route Algorithmic Dev', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Core Route Optimization & Telematics', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Driver App Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-devops-infrastructure-lead', agentName: 'Vikram Patel, Telematics SRE', roleTitle: 'DevOps Lead' },
          { zoneRoleTitle: 'DevOps Lead', agentTemplateId: 'eng-site-reliability-engineer', agentName: 'Chloe Bennett, IoT SRE', roleTitle: 'Site Reliability Engineer' },
          { zoneRoleTitle: 'Global Supply Chain Directorate', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, CEO', roleTitle: 'Chief Executive Officer' },
          { zoneRoleTitle: 'Global Enterprise Freight Sales', agentTemplateId: 'sales-enterprise-sales-manager', agentName: 'Jordan Cole, Carrier Lead', roleTitle: 'Enterprise Sales Manager' },
          { zoneRoleTitle: 'Global Enterprise Freight Sales', agentTemplateId: 'sales-account-executive', agentName: 'Olivia Hayes, Dispatch Account Rep', roleTitle: 'Senior Account Executive' }
        ]
      }
    }
  },

  // 10. Venture Capital & Startup Studio
  {
    id: 'company-venture-capital',
    name: 'Vanguard Ventures & Labs',
    category: 'Venture Capital & Investment',
    domain: 'Seed-to-Growth Investing & Startup Incubation',
    tagline: 'Premier venture capital partnership investing in category-defining AI, deeptech, and software enterprises.',
    description: 'Elite investment firm featuring Managing General Partners, Due Diligence Principals, Financial Valuation Modelers, and Portfolio Operations Partners.',
    icon: 'Briefcase',
    color: '#8b5cf6',
    scales: {
      small: {
        scale: 'small',
        label: 'Seed Investment Syndicate',
        headcountLabel: '5 Agents • 3 Zones',
        description: 'Lean venture syndicate focused on founder discovery, term sheet evaluation, and early-stage angel investing.',
        space: {
          name: 'Vanguard Angel Syndicate (Lean)',
          description: 'High-signal partner room for pitch deck screening and founder deal memos.',
          category: 'Venture Capital',
          width: 1400,
          height: 820,
          color: '#8b5cf6',
          shape: 'rectangle',
          workflowPrompt: 'Evaluate investment opportunities with high founder signal, defensible technology moats, and large addressable markets.',
          workflowInstructions: '1. Managing Partner reviews inbound pitch decks.\n2. Diligence lead audits code and cap tables.\n3. Analyst models returns.\n4. Issue term sheets.',
          responsibilities: 'Early-stage venture deal flow and founder evaluation.'
        },
        zones: [
          { id: 'vg-sm-gp', roleTitle: 'Managing Partner', name: 'Investment Committee', level: 0, parentId: null, color: '#8b5cf6', width: 280, height: 150 },
          { id: 'vg-sm-dil', roleTitle: 'Managing Partner', name: 'Technical Due Diligence', level: 1, parentId: 'vg-sm-gp', color: '#3b82f6', width: 280, height: 150 },
          { id: 'vg-sm-fin', roleTitle: 'Quantitative Financial Analyst', name: 'Valuation & Return Modeling', level: 1, parentId: 'vg-sm-gp', color: '#10b981', width: 300, height: 150 }
        ],
        agents: [
          { zoneRoleTitle: 'Managing Partner', agentTemplateId: 'vc-managing-general-partner', agentName: 'Sterling Vance, Managing Partner', roleTitle: 'Venture Capital Managing Partner' },
          { zoneRoleTitle: 'Technical Due Diligence', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, Venture CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'Quantitative Financial Analyst', agentTemplateId: 'fin-quantitative-trader-analyst', agentName: 'Gabriel Ortiz, Valuation Analyst', roleTitle: 'Quantitative Financial Analyst' },
          { zoneRoleTitle: 'Investment Committee', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, Fund CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'Investment Committee', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, Senior Advisor', roleTitle: 'Chief Executive Officer' }
        ]
      },
      mid: {
        scale: 'mid',
        label: 'Growth Venture Fund',
        headcountLabel: '14 Agents • 6 Zones',
        description: 'Multi-stage venture fund with dedicated investment teams, technical diligence auditors, platform support, and legal counsel.',
        space: {
          name: 'Vanguard Ventures Partnership Suite',
          description: 'Sophisticated investment boardroom equipped for founder pitch evaluations, financial modeling, and portfolio ops.',
          category: 'Venture Capital',
          width: 2200,
          height: 1150,
          color: '#8b5cf6',
          shape: 'rectangle',
          workflowPrompt: 'Back category-defining founders. Conduct rigorous financial underwriting and technical diligence.',
          workflowInstructions: '1. Partners evaluate pipeline deals during Monday meeting.\n2. Technical diligence engineers review codebase quality and unit economics.\n3. Legal and compliance verify cap tables and investor rights.\n4. Platform team assists portfolio companies with recruiting.',
          responsibilities: 'Venture capital investment, portfolio acceleration, and LP reporting.'
        },
        zones: [
          { id: 'vg-md-gp', roleTitle: 'Managing Partner', name: 'General Partnership & IC', level: 0, parentId: null, color: '#8b5cf6', width: 310, height: 155 },
          { id: 'vg-md-dil', roleTitle: 'Managing Partner', name: 'Technical Diligence & Architecture', level: 1, parentId: 'vg-md-gp', color: '#3b82f6', width: 320, height: 160 },
          { id: 'vg-md-fin', roleTitle: 'CFO', name: 'Fund Treasury & Valuation Models', level: 1, parentId: 'vg-md-gp', color: '#10b981', width: 310, height: 155 },
          { id: 'vg-md-plat', roleTitle: 'COO', name: 'Portfolio Operations & Platform', level: 1, parentId: 'vg-md-gp', color: '#f59e0b', width: 310, height: 155 },
          { id: 'vg-md-legal', roleTitle: 'Compliance Officer', name: 'Legal Counsel & Term Sheets', level: 2, parentId: 'vg-md-gp', color: '#ef4444', width: 310, height: 155 },
          { id: 'vg-md-analyst', roleTitle: 'Quantitative Financial Analyst', name: 'Investment Analysis & TAM Research', level: 2, parentId: 'vg-md-fin', color: '#6366f1', width: 330, height: 160 }
        ],
        agents: [
          { zoneRoleTitle: 'Managing Partner', agentTemplateId: 'vc-managing-general-partner', agentName: 'Sterling Vance, Managing Partner', roleTitle: 'Venture Capital Managing Partner' },
          { zoneRoleTitle: 'Technical Diligence & Architecture', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, Diligence CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'CFO', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, Fund CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'COO', agentTemplateId: 'lead-coo', agentName: 'Nadia Thorne, Platform Partner', roleTitle: 'Chief Operating Officer' },
          { zoneRoleTitle: 'Compliance Officer', agentTemplateId: 'fin-compliance-aml-officer', agentName: 'Elena Rostova, Venture Counsel', roleTitle: 'Compliance Officer' },
          { zoneRoleTitle: 'Quantitative Financial Analyst', agentTemplateId: 'fin-quantitative-trader-analyst', agentName: 'Gabriel Ortiz, Valuation Analyst', roleTitle: 'Quantitative Financial Analyst' },
          { zoneRoleTitle: 'Technical Diligence & Architecture', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Code Auditor', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'General Partnership & IC', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, Senior Partner', roleTitle: 'Chief Executive Officer' },
          { zoneRoleTitle: 'Portfolio Operations & Platform', agentTemplateId: 'people-head-of-people-hr', agentName: 'Harper Wells, Talent Partner', roleTitle: 'Head of People & HR' },
          { zoneRoleTitle: 'Portfolio Operations & Platform', agentTemplateId: 'mktg-performance-growth-lead', agentName: 'Tyler Reed, Growth Advisor', roleTitle: 'Head of Performance Marketing' },
          { zoneRoleTitle: 'Investment Analysis & TAM Research', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Technical Evaluator', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Technical Diligence & Architecture', agentTemplateId: 'lead-ciso', agentName: 'Evan Cross, Security Diligence', roleTitle: 'Chief Information Security Officer' },
          { zoneRoleTitle: 'General Partnership & IC', agentTemplateId: 'lead-cro', agentName: 'Derrick Vance, GTM Partner', roleTitle: 'Chief Revenue Officer' },
          { zoneRoleTitle: 'Portfolio Operations & Platform', agentTemplateId: 'prod-principal-product-manager', agentName: 'Julian Croft, Product Partner', roleTitle: 'Principal Product Manager' }
        ]
      },
      large: {
        scale: 'large',
        label: 'Global Multi-Stage VC & Studio',
        headcountLabel: '26 Agents • 9 Zones',
        description: 'Multi-billion dollar global venture firm and startup foundry incubating and financing deeptech, AI, and enterprise software companies.',
        space: {
          name: 'Vanguard Global Ventures & Studio Campus',
          description: 'Premier venture capital complex designed for international limited partner summits, startup incubation, and executive portfolio acceleration.',
          category: 'Venture Capital',
          width: 3200,
          height: 1550,
          color: '#8b5cf6',
          shape: 'rectangle',
          workflowPrompt: 'Allocate investment capital to category-defining founders and accelerate portfolio market dominance.',
          workflowInstructions: '1. Investment committee evaluates growth rounds and liquidity events.\n2. Diligence leads conduct technical, legal, and financial audits.\n3. Studio team incubates new venture-backed enterprises from zero to one.\n4. LP relations reports quarterly IRR, TVPI, and DPI returns.',
          responsibilities: 'Global venture capital fund management, incubation studio operations, and startup acceleration.'
        },
        zones: [
          { id: 'vg-lg-gp', roleTitle: 'Managing Partner', name: 'Global Investment Committee', level: 0, parentId: null, color: '#8b5cf6', width: 320, height: 160 },
          { id: 'vg-lg-dil', roleTitle: 'Managing Partner', name: 'DeepTech & Code Diligence', level: 1, parentId: 'vg-lg-gp', color: '#3b82f6', width: 320, height: 160 },
          { id: 'vg-lg-cfo', roleTitle: 'CFO', name: 'Fund Treasury & Limited Partner Reporting', level: 1, parentId: 'vg-lg-gp', color: '#10b981', width: 320, height: 160 },
          { id: 'vg-lg-plat', roleTitle: 'COO', name: 'Platform, Talent & Portfolio GTM', level: 1, parentId: 'vg-lg-gp', color: '#f59e0b', width: 320, height: 160 },
          { id: 'vg-lg-legal', roleTitle: 'Compliance Officer', name: 'Venture Legal & SEC Compliance', level: 1, parentId: 'vg-lg-gp', color: '#ef4444', width: 310, height: 160 },
          { id: 'vg-lg-studio', roleTitle: 'CTO', name: 'Startup Studio Incubation Squad', level: 2, parentId: 'vg-lg-dil', color: '#6366f1', width: 380, height: 170 },
          { id: 'vg-lg-cro', roleTitle: 'Chief Revenue Officer', name: 'Portfolio Revenue Acceleration', level: 2, parentId: 'vg-lg-plat', color: '#f59e0b', width: 310, height: 160 },
          { id: 'vg-lg-ciso', roleTitle: 'CISO', name: 'Cybersecurity Due Diligence', level: 2, parentId: 'vg-lg-dil', color: '#ef4444', width: 310, height: 160 },
          { id: 'vg-lg-fin', roleTitle: 'Quantitative Financial Analyst', name: 'Financial Modeling & Cap Table Math', level: 2, parentId: 'vg-lg-cfo', color: '#10b981', width: 320, height: 160 }
        ],
        agents: [
          { zoneRoleTitle: 'Managing Partner', agentTemplateId: 'vc-managing-general-partner', agentName: 'Sterling Vance, Managing Partner', roleTitle: 'Venture Capital Managing Partner' },
          { zoneRoleTitle: 'DeepTech & Code Diligence', agentTemplateId: 'lead-cto', agentName: 'Marcus Chen, Diligence CTO', roleTitle: 'Chief Technology Officer' },
          { zoneRoleTitle: 'CFO', agentTemplateId: 'lead-cfo', agentName: 'Arthur Sterling, Fund CFO', roleTitle: 'Chief Financial Officer' },
          { zoneRoleTitle: 'COO', agentTemplateId: 'lead-coo', agentName: 'Nadia Thorne, Platform Partner', roleTitle: 'Chief Operating Officer' },
          { zoneRoleTitle: 'Compliance Officer', agentTemplateId: 'fin-compliance-aml-officer', agentName: 'Elena Rostova, Venture Counsel', roleTitle: 'Compliance Officer' },
          { zoneRoleTitle: 'CISO', agentTemplateId: 'lead-ciso', agentName: 'Evan Cross, Security Diligence', roleTitle: 'Chief Information Security Officer' },
          { zoneRoleTitle: 'Chief Revenue Officer', agentTemplateId: 'lead-cro', agentName: 'Derrick Vance, GTM Partner', roleTitle: 'Chief Revenue Officer' },
          { zoneRoleTitle: 'Quantitative Financial Analyst', agentTemplateId: 'fin-quantitative-trader-analyst', agentName: 'Gabriel Ortiz, Valuation Analyst', roleTitle: 'Quantitative Financial Analyst' },
          { zoneRoleTitle: 'Startup Studio Incubation Squad', agentTemplateId: 'eng-core-tech-lead', agentName: 'Devon Reed, Studio Tech Lead', roleTitle: 'Core Technical Lead' },
          { zoneRoleTitle: 'Startup Studio Incubation Squad', agentTemplateId: 'eng-senior-software-engineer', agentName: 'Sophia Lin, Studio Engineer', roleTitle: 'Senior Software Engineer' },
          { zoneRoleTitle: 'Startup Studio Incubation Squad', agentTemplateId: 'eng-fullstack-developer', agentName: 'Liam Foster, Prototype Dev', roleTitle: 'Full-Stack Developer' },
          { zoneRoleTitle: 'Platform, Talent & Portfolio GTM', agentTemplateId: 'people-head-of-people-hr', agentName: 'Harper Wells, Talent Partner', roleTitle: 'Head of People & HR' },
          { zoneRoleTitle: 'Global Investment Committee', agentTemplateId: 'lead-ceo', agentName: 'Elena Vance, Senior Partner', roleTitle: 'Chief Executive Officer' },
          { zoneRoleTitle: 'Startup Studio Incubation Squad', agentTemplateId: 'prod-principal-product-manager', agentName: 'Julian Croft, Incubation PM', roleTitle: 'Principal Product Manager' }
        ]
      }
    }
  }
];

/**
 * Calculates a structured hierarchical layout for a company preset at the given scale,
 * positioning all zones and placing assigned agents inside their corresponding zones.
 */
export function getZoneSizeForAgents(agentCount: number): { width: number; height: number; cols: number } {
  if (agentCount <= 1) {
    return { width: 320, height: 240, cols: 1 };
  }
  if (agentCount === 2) {
    return { width: 500, height: 240, cols: 2 };
  }
  if (agentCount === 3) {
    return { width: 740, height: 240, cols: 3 };
  }
  if (agentCount === 4) {
    return { width: 500, height: 420, cols: 2 };
  }
  if (agentCount <= 6) {
    return { width: 740, height: 420, cols: 3 };
  }
  if (agentCount <= 9) {
    return { width: 740, height: 600, cols: 3 };
  }
  if (agentCount <= 12) {
    return { width: 960, height: 600, cols: 4 };
  }
  const cols = 4;
  const rows = Math.ceil(agentCount / cols);
  return {
    width: 960,
    height: 48 + rows * 160 + (rows - 1) * 20 + 28,
    cols,
  };
}

export function layoutCompany(
  company: CompanyPreset,
  scaleKey: CompanyScale = 'mid',
  spaceOrigin = { x: 0, y: 0 },
): CompanyLayoutResult {
  const scaleConfig = company.scales[scaleKey] || company.scales.mid;
  const { zones: rawNodes, space: spaceConfig, agents: agentConfigs } = scaleConfig;

  function findMatchingNode(zoneRoleTitle: string): (typeof rawNodes)[0] {
    const target = (zoneRoleTitle || '').toLowerCase().trim();
    return (
      rawNodes.find((n) => n.roleTitle.toLowerCase() === target) ||
      rawNodes.find((n) => n.name.toLowerCase() === target) ||
      rawNodes.find((n) => n.name.toLowerCase().includes(target)) ||
      rawNodes.find((n) => target.includes(n.roleTitle.toLowerCase())) ||
      rawNodes[0]
    );
  }

  // Calculate exact headcount per zone node to dynamically expand zones to fit all agents
  const agentCountsByNodeId = new Map<string, number>();
  for (const ac of agentConfigs) {
    const matchedNode = findMatchingNode(ac.zoneRoleTitle);
    if (matchedNode) {
      agentCountsByNodeId.set(matchedNode.id, (agentCountsByNodeId.get(matchedNode.id) || 0) + 1);
    }
  }

  const zoneSizes = new Map<string, { width: number; height: number; cols: number }>();
  for (const n of rawNodes) {
    const count = agentCountsByNodeId.get(n.id) || 1;
    zoneSizes.set(n.id, getZoneSizeForAgents(count));
  }

  const hGap = 80;
  const vGap = 120;

  const childrenMap = new Map<string, typeof rawNodes>();
  const roots: typeof rawNodes = [];
  const nodeMap = new Map<string, (typeof rawNodes)[0]>();

  for (const n of rawNodes) {
    nodeMap.set(n.id, n);
    childrenMap.set(n.id, []);
  }

  for (const n of rawNodes) {
    if (n.parentId && childrenMap.has(n.parentId)) {
      childrenMap.get(n.parentId)!.push(n);
    } else {
      roots.push(n);
    }
  }

  const subtreeWidths = new Map<string, number>();
  function calculateSubtreeWidth(node: (typeof rawNodes)[0]): number {
    const kids = childrenMap.get(node.id) || [];
    const nodeDim = zoneSizes.get(node.id)!;
    if (kids.length === 0) {
      subtreeWidths.set(node.id, nodeDim.width);
      return nodeDim.width;
    }
    const kidsWidth = kids.reduce((sum, kid) => sum + calculateSubtreeWidth(kid), 0) + (kids.length - 1) * hGap;
    const width = Math.max(nodeDim.width, kidsWidth);
    subtreeWidths.set(node.id, width);
    return width;
  }

  for (const root of roots) {
    calculateSubtreeWidth(root);
  }

  const generatedIdMap = new Map<string, string>();
  for (const n of rawNodes) {
    const uniqueId = `rz-${company.id}-${scaleKey}-${n.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    generatedIdMap.set(n.id, uniqueId);
  }

  const placedZones: PlacedCompanyZone[] = [];
  const startOffset = { x: 80, y: 90 };

  // Track max level heights to offset vertical rows properly
  const levelHeights = new Map<number, number>();
  for (const n of rawNodes) {
    const dim = zoneSizes.get(n.id)!;
    levelHeights.set(n.level, Math.max(levelHeights.get(n.level) || 0, dim.height));
  }

  function getLevelTopY(baseY: number, level: number): number {
    let accY = baseY;
    for (let l = 0; l < level; l++) {
      accY += (levelHeights.get(l) || 260) + vGap;
    }
    return accY;
  }

  function placeNode(node: (typeof rawNodes)[0], currentX: number, baseY: number) {
    const nodeDim = zoneSizes.get(node.id)!;
    const sWidth = subtreeWidths.get(node.id) || nodeDim.width;
    const zW = nodeDim.width;
    const zH = nodeDim.height;
    const x = Math.round(currentX + (sWidth - zW) / 2);
    const y = Math.round(getLevelTopY(baseY, node.level));
    const uniqueId = generatedIdMap.get(node.id)!;
    const parentId = node.parentId ? generatedIdMap.get(node.parentId) ?? null : null;

    placedZones.push({
      id: uniqueId,
      chainNodeId: node.id,
      name: node.name,
      roleTitle: node.roleTitle,
      level: node.level,
      parentZoneId: parentId,
      responsibilities: node.responsibilities,
      workflowInstructions: node.workflowInstructions,
      delegationPolicy: node.delegationPolicy ?? 'auto',
      color: node.color || company.color,
      x,
      y,
      width: zW,
      height: zH,
      shape: 'rectangle',
    });

    const kids = childrenMap.get(node.id) || [];
    if (kids.length > 0) {
      const totalKidsWidth =
        kids.reduce((sum, kid) => sum + (subtreeWidths.get(kid.id) || zoneSizes.get(kid.id)!.width), 0) +
        (kids.length - 1) * hGap;
      let kidX = currentX + (sWidth - totalKidsWidth) / 2;
      for (const kid of kids) {
        placeNode(kid, kidX, baseY);
        kidX += (subtreeWidths.get(kid.id) || zoneSizes.get(kid.id)!.width) + hGap;
      }
    }
  }

  let rootX = spaceOrigin.x + startOffset.x;
  for (const root of roots) {
    placeNode(root, rootX, spaceOrigin.y + startOffset.y);
    rootX += (subtreeWidths.get(root.id) || zoneSizes.get(root.id)!.width) + hGap * 2;
  }

  const maxX = Math.max(...placedZones.map((z) => z.x + z.width));
  const maxY = Math.max(...placedZones.map((z) => z.y + z.height));

  const requiredWidth = Math.max(maxX - spaceOrigin.x + startOffset.x + 80, spaceConfig.width || 1800);
  const requiredHeight = Math.max(maxY - spaceOrigin.y + startOffset.y + 120, spaceConfig.height || 1100);

  // Group agents to zones and calculate coordinates inside the zone with proper separation
  const placedAgents: PlacedCompanyAgent[] = [];
  const agentsPerZone = new Map<string, number>();

  for (const agentConfig of agentConfigs) {
    const targetNode = findMatchingNode(agentConfig.zoneRoleTitle);
    const matchingZone =
      placedZones.find((z) => z.chainNodeId === targetNode.id) ||
      placedZones.find((z) => z.roleTitle === agentConfig.zoneRoleTitle) ||
      placedZones[0];

    if (!matchingZone) continue;

    const count = agentsPerZone.get(matchingZone.id) || 0;
    agentsPerZone.set(matchingZone.id, count + 1);

    const dim = zoneSizes.get(matchingZone.chainNodeId) || { width: matchingZone.width, height: matchingZone.height, cols: 1 };
    const col = count % dim.cols;
    const row = Math.floor(count / dim.cols);

    // Each avatar pod node is ~210px wide and 160px high
    const avatarW = 210;
    const avatarH = 160;
    const gapX = 24;
    const gapY = 20;

    // Center grid horizontally inside the zone
    const totalGridWidth = dim.cols * avatarW + (dim.cols - 1) * gapX;
    const startX = Math.round(matchingZone.x + Math.max(16, (matchingZone.width - totalGridWidth) / 2));
    const startY = Math.round(matchingZone.y + 48);

    const slotX = startX + col * (avatarW + gapX);
    const slotY = startY + row * (avatarH + gapY);

    placedAgents.push({
      ...agentConfig,
      zoneId: matchingZone.id,
      x: slotX,
      y: slotY,
    });
  }

  return {
    space: {
      ...spaceConfig,
      width: requiredWidth,
      height: requiredHeight,
    },
    zones: placedZones,
    agents: placedAgents,
    requiredWidth,
    requiredHeight,
  };
}
