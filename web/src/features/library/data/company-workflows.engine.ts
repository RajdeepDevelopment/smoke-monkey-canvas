import type { CompanyPreset, CompanyScale } from '../library.types.js';

export interface WorkflowLevelGuidance {
  levelTitle: string;
  coreFocus: string;
  responsibilities: string[];
  workflowProtocols: string[];
}

export interface CompanyScaleWorkflow {
  cadence: string;
  level0: WorkflowLevelGuidance;
  level1: WorkflowLevelGuidance;
  level2: WorkflowLevelGuidance;
  level3?: WorkflowLevelGuidance;
}

export interface CompanyWorkflowSpec {
  companyId: string;
  domain: string;
  category: string;
  scales: {
    small: CompanyScaleWorkflow;
    mid: CompanyScaleWorkflow;
    large: CompanyScaleWorkflow;
  };
}

/** Registry of domain-specific workflows for stock companies */
export const COMPANY_WORKFLOW_REGISTRY: Map<string, CompanyWorkflowSpec> = new Map();

/** Register a workflow spec into the registry */
export function registerCompanyWorkflow(spec: CompanyWorkflowSpec): void {
  COMPANY_WORKFLOW_REGISTRY.set(spec.companyId, spec);
}

// ---------------------------------------------------------------------------
// 1. SaaS & Cloud Software Enterprise
// ---------------------------------------------------------------------------
registerCompanyWorkflow({
  companyId: 'company-saas-cloud',
  category: 'Software & SaaS',
  domain: 'Enterprise Cloud & Microservices',
  scales: {
    small: {
      cadence: 'Lean Weekly Sprints (High-Velocity MVP Delivery)',
      level0: {
        levelTitle: 'Executive Leadership (Level 0 - Founder / CEO)',
        coreFocus: 'Product-Market Fit, Sprint Objectives & Architecture Sign-Off',
        responsibilities: [
          'Set clear sprint objectives and prioritize user-facing feature MVP targets.',
          'Review aggregated technical demos and authorize release deployments.',
          'Eliminate organizational bottlenecks and maintain high team shipping velocity.',
        ],
        workflowProtocols: [
          'Delegate sprint epics DOWNWARD to engineering leads using delegate_task(communication_type: "delegate").',
          'Review pull request summaries and product demos submitted upward via threaded chat_id.',
          'Authorize production deployments and major third-party API adoptions.',
        ],
      },
      level1: {
        levelTitle: 'Engineering Leadership (Level 1 - CTO / Tech Lead)',
        coreFocus: 'Technical Architecture, PR Code Reviews & Squad Coordination',
        responsibilities: [
          'Translate executive sprint goals into concrete schema designs, API contracts, and PR tasks.',
          'Conduct strict pull request reviews checking for TypeScript types, error handling, and performance.',
          'Roll up verified sprint progress and test metrics UPWARD to the CEO.',
        ],
        workflowProtocols: [
          'Delegate modular coding tasks to developers via delegate_task(communication_type: "delegate").',
          'Require Playwright and unit test evidence before approving any PR deliverable.',
          'Submit aggregated milestone status to CEO using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Core Execution (Level 2 - Software & QA Engineers)',
        coreFocus: 'Feature Implementation, Automated Testing & Upward Deliverables',
        responsibilities: [
          'Implement modular, well-tested code following repository design patterns and ESLint rules.',
          'Write and run automated tests (Playwright E2E, Vitest/Jest unit tests) for all changes.',
          'Persist verified API contracts and architectural patterns into facts.md via manage_agent_memory.',
        ],
        workflowProtocols: [
          'Report completed code diffs and test logs UPWARD to Tech Lead using delegate_task(communication_type: "report_status", chat_id: ...).',
          'Request sign-off for database schema migrations via delegate_task(communication_type: "request_approval").',
          'Never assign tasks to superiors; escalate blocking bugs immediately upward.',
        ],
      },
    },
    mid: {
      cadence: 'Agile Two-Week Sprints with CI/CD & Automated Quality Gates',
      level0: {
        levelTitle: 'Executive Board (Level 0 - CEO / C-Suite)',
        coreFocus: 'Strategic OKRs, Reliability Standards & Department Oversight',
        responsibilities: [
          'Define quarterly business OKRs, customer retention targets, and cloud budget allocations.',
          'Review bi-weekly department status rollups from Engineering, Product, and QA leadership.',
          'Authorize major cloud infrastructure migrations and customer SLA commitments.',
        ],
        workflowProtocols: [
          'Assign strategic objectives to VP/Directors using delegate_task(communication_type: "delegate").',
          'Review high-level executive rollups and track milestone delivery in threaded chats.',
          'Give final executive approval for public release trains.',
        ],
      },
      level1: {
        levelTitle: 'Department Management (Level 1 - Eng Managers, QA Leads, DevOps Leads)',
        coreFocus: 'Sprint Backlog Decomp, PR Verification & Cross-Squad Orchestration',
        responsibilities: [
          'Decompose strategic OKRs into epics, user stories, acceptance criteria, and technical specs.',
          'Enforce CI/CD pipeline gating, Playwright regression testing, and code review standards.',
          'Manage cross-functional dependencies between frontend, backend, and cloud infrastructure.',
        ],
        workflowProtocols: [
          'Distribute feature tasks to execution squads using delegate_task(communication_type: "delegate").',
          'Review squad deliverables, test pass rates, and security scan reports.',
          'Synthesize squad achievements into rollups for Level 0 leadership using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Squad Execution (Level 2 - Fullstack Devs, QA Automators, SREs)',
        coreFocus: 'Feature Delivery, Microservice Integration & Automated Test Coverage',
        responsibilities: [
          'Build clean frontend components and microservice APIs with comprehensive unit/integration tests.',
          'Maintain 99.99% uptime, write Kubernetes manifests, and monitor telemetry alerts.',
          'Document reusable development recipes and service endpoints in procedural.md.',
        ],
        workflowProtocols: [
          'Submit completed tasks with git branch links and test results UPWARD using delegate_task(communication_type: "report_status", chat_id: ...).',
          'Request formal approval from Eng Manager for breaking API changes via delegate_task(communication_type: "request_approval").',
          'Coordinate peer integrations horizontally using delegate_task(communication_type: "inform").',
        ],
      },
    },
    large: {
      cadence: 'Multi-Squad Enterprise Release Trains with Zero-Downtime Blue/Green Deployments',
      level0: {
        levelTitle: 'Enterprise Executive Council (Level 0 - CEO, CTO, VP Eng)',
        coreFocus: 'Multi-Product Portfolio Strategy, Global Cloud Reliability & Enterprise Governance',
        responsibilities: [
          'Govern global engineering investments, multi-region data sovereignty, and compliance standards.',
          'Review cross-department performance dashboards and risk assessments from directors.',
          'Sanction enterprise mergers, major vendor agreements, and critical customer escalations.',
        ],
        workflowProtocols: [
          'Direct enterprise initiatives to Engineering Directors using delegate_task(communication_type: "delegate").',
          'Review executive summaries and risk mitigations delivered by management leads.',
          'Sign off on enterprise release readiness and security audit certifications.',
        ],
      },
      level1: {
        levelTitle: 'Engineering Directors & Managers (Level 1 - Platform, Core, QA, Security)',
        coreFocus: 'Release Train Management, Architecture Standards & Resource Allocation',
        responsibilities: [
          'Maintain architectural integrity across distributed microservices and event buses.',
          'Enforce strict code coverage thresholds (>85%), static analysis, and zero-trust security.',
          'Aggregate squad deliverables into comprehensive release notes and executive summaries.',
        ],
        workflowProtocols: [
          'Assign sprint deliverables to squad leads via parallel delegate_task calls.',
          'Review pull requests, benchmark regressions, and security vulnerability reports.',
          'Escalate platform blockers and present readiness reports to C-Suite via delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Specialist Engineers (Level 2 - Staff/Senior Engineers, QA, DevOps)',
        coreFocus: 'High-Concurrency Systems, Resilient Distributed Pipelines & Automated E2E Gates',
        responsibilities: [
          'Design and implement high-throughput REST/gRPC endpoints and idempotent worker queues.',
          'Execute end-to-end load tests, chaos engineering experiments, and disaster recovery runs.',
          'Record verified microservice schemas and performance profiles in facts.md.',
        ],
        workflowProtocols: [
          'Submit deliverables, benchmark metrics, and test logs UPWARD using delegate_task(communication_type: "report_status").',
          'Request manager approval for production database migrations via delegate_task(communication_type: "request_approval").',
          'Never bypass management; maintain strict reporting discipline.',
        ],
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 2. FinTech & Banking Enterprise
// ---------------------------------------------------------------------------
registerCompanyWorkflow({
  companyId: 'company-fintech-bank',
  category: 'Banking & Financial Services',
  domain: 'High-Integrity Core Banking & Payment Ledgers',
  scales: {
    small: {
      cadence: 'Continuous Ledger Reconciliation & Regulatory Compliance Audits',
      level0: {
        levelTitle: 'Executive Leadership (Level 0 - CEO / Managing Director)',
        coreFocus: 'Capital Adequacy, Regulatory Covenants & Partner Bank Approvals',
        responsibilities: [
          'Oversee capital reserve limits, liquidity thresholds, and regulatory licensing compliance.',
          'Review daily transaction volume rollups and partner bank settlement balances.',
          'Authorize new financial asset classes and custodial provider integrations.',
        ],
        workflowProtocols: [
          'Delegate compliance and core ledger milestones DOWNWARD via delegate_task(communication_type: "delegate").',
          'Review daily audit summaries and risk assessments submitted in review threads.',
          'Sign off on financial disclosures and treasury movements.',
        ],
      },
      level1: {
        levelTitle: 'Risk & Engineering Management (Level 1 - Head of FinTech / Compliance Lead)',
        coreFocus: 'Double-Entry Ledger Integrity, AML Rules & Transaction Monitoring',
        responsibilities: [
          'Enforce strict double-entry ledger invariants (sum of debits == sum of credits).',
          'Validate real-time AML/KYC screening, sanction list checks, and fraud scoring thresholds.',
          'Review core banking code and report verified reconciliation logs upward to leadership.',
        ],
        workflowProtocols: [
          'Assign transaction worker and API tasks to financial engineers via delegate_task(communication_type: "delegate").',
          'Audit all transaction ledger PRs with 100% mathematical invariant test verification.',
          'Report settlement metrics UPWARD to CEO via delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Financial Engineers & Analysts (Level 2 - Quant Devs & Analysts)',
        coreFocus: 'Atomic Transactions, Idempotency Keys & Ledger Verification Tests',
        responsibilities: [
          'Implement atomic double-entry database transactions with strict ACID guarantees.',
          'Write deterministic reconciliation tests verifying zero floating-point rounding errors.',
          'Persist accounting schemas and currency conversion rules in facts.md.',
        ],
        workflowProtocols: [
          'Submit transaction diffs and reconciliation audit proofs UPWARD using delegate_task(communication_type: "report_status").',
          'Request explicit approval from Compliance Lead before touching transfer limits via delegate_task(communication_type: "request_approval").',
          'Report any ledger imbalance as a blocking severity-1 event immediately.',
        ],
      },
    },
    mid: {
      cadence: 'Real-Time Clearing, Daily Settlement Runs & Continuous Risk VaR Gating',
      level0: {
        levelTitle: 'Executive Board (Level 0 - Chief Executive & Chief Risk Officer)',
        coreFocus: 'Enterprise Risk Management, Balance Sheet Exposure & Liquidity Governance',
        responsibilities: [
          'Govern institutional liquidity buffers, counterparty limits, and Value-at-Risk (VaR) ceilings.',
          'Review daily clearing house reconciliations and regulatory examination filings.',
          'Authorize multi-million dollar liquidity transfers and partner banking rails.',
        ],
        workflowProtocols: [
          'Delegate risk mandates to Treasury and Engineering managers via delegate_task(communication_type: "delegate").',
          'Review consolidated risk and settlement dashboards submitted by management.',
          'Authorize changes to capital reserve policies and reserve ratios.',
        ],
      },
      level1: {
        levelTitle: 'Treasury & FinTech Managers (Level 1 - Treasury Lead, Core Banking EM)',
        coreFocus: 'Settlement Pipeline Orchestration, PCI-DSS Gating & Audit Trails',
        responsibilities: [
          'Supervise ACH/SEPA/SWIFT clearing queues and automated exception handling.',
          'Enforce PCI-DSS Level 1 tokenization and HSM encryption for all cardholder data.',
          'Audit daily balance sheets and synthesize treasury health reports for executive review.',
        ],
        workflowProtocols: [
          'Delegate settlement microservice tasks to backend developers via delegate_task.',
          'Verify cryptographic audit logs and immutable ledger proofs before approving pull requests.',
          'Send daily clearing summaries UPWARD to CRO via delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Ledger Engineers & Compliance Analysts (Level 2 - ICs)',
        coreFocus: 'Idempotent Payment Webhooks, Cryptographic Hashing & Settlement Verification',
        responsibilities: [
          'Build idempotent payment ingestion webhooks with distributed locking (Redis/PostgreSQL).',
          'Execute automated stress tests simulating payment network timeouts and network partitions.',
          'Record partner bank API schemas and webhook signature verification routines in procedural.md.',
        ],
        workflowProtocols: [
          'Submit pull requests with complete audit logs UPWARD via delegate_task(communication_type: "report_status").',
          'Request manager approval for modifying fund settlement logic via delegate_task(communication_type: "request_approval").',
          'Never execute unverified ledger schema alterations.',
        ],
      },
    },
    large: {
      cadence: 'Multi-Currency Global Clearing, Basel III Capital Gating & 24/7 Fraud Interception',
      level0: {
        levelTitle: 'Board of Governors & C-Suite (Level 0 - CEO, CFO, CRO)',
        coreFocus: 'Global Regulatory Adherence, Institutional Liquidity & Fiduciary Stewardship',
        responsibilities: [
          'Ensure Basel III capital adequacy ratios, central bank reserve requirements, and stress testing.',
          'Evaluate macroeconomic exposure, foreign exchange hedging, and sovereign bond portfolios.',
          'Approve global clearing corridor integrations and custodial trust agreements.',
        ],
        workflowProtocols: [
          'Issue strategic mandates to Division Directors using delegate_task(communication_type: "delegate").',
          'Review aggregated global risk exposures and institutional compliance filings.',
          'Sign off on international regulatory filings and audit releases.',
        ],
      },
      level1: {
        levelTitle: 'Division Directors & Risk VPs (Level 1 - Core Banking, Risk, Compliance)',
        coreFocus: 'High-Frequency Settlement Engine Oversight & Zero-Trust Security Gating',
        responsibilities: [
          'Oversee multi-currency real-time gross settlement (RTGS) engines and liquidity routers.',
          'Enforce automated fraud detection model thresholds with sub-50ms inference SLAs.',
          'Synthesize multi-division financial ledgers into consolidated audit reports.',
        ],
        workflowProtocols: [
          'Assign ledger and security deliverables to squad leads via delegate_task.',
          'Inspect cryptographic proofs of solvency and penetration test results.',
          'Present audited settlement rollups to C-Suite via delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Senior Financial Engineers & Quant Analysts (Level 2 - ICs)',
        coreFocus: 'Ultra-Low Latency Ledger Transactions & Real-Time Balance Proving',
        responsibilities: [
          'Develop zero-allocation ledger algorithms and lock-free concurrency queues.',
          'Build automated regression tests testing fractional cents, currency peg shifts, and leap seconds.',
          'Document cryptographic hash chain verification routines in facts.md.',
        ],
        workflowProtocols: [
          'Report verified microservice deliverables UPWARD via delegate_task(communication_type: "report_status").',
          'Obtain formal multi-signature approval from Risk Lead via delegate_task(communication_type: "request_approval").',
          'Strictly follow segregation of duties; maintain zero unreviewed code changes.',
        ],
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 3. AI Research & Frontier Models Lab
// ---------------------------------------------------------------------------
registerCompanyWorkflow({
  companyId: 'company-ai-labs',
  category: 'AI Research & Frontier Models',
  domain: 'Large-Scale Deep Learning & Alignment',
  scales: {
    small: {
      cadence: 'Iterative Model Training Runs & Benchmark Evaluation Loops',
      level0: {
        levelTitle: 'Lab Director & Chief Scientist (Level 0)',
        coreFocus: 'Research Hypotheses, Compute Resource Allocation & Model Release Gates',
        responsibilities: [
          'Define core research objectives (e.g. reasoning tokens, multimodal attention, synthetic data).',
          'Authorize GPU cluster hours and major training checkpoint runs.',
          'Review benchmark score improvements (MMLU, HumanEval, GSM8K) and approve weights release.',
        ],
        workflowProtocols: [
          'Assign research tracks to the Lead ML Engineer using delegate_task(communication_type: "delegate").',
          'Review training loss graphs and eval benchmarks submitted in review threads.',
          'Authorize public model checkpoint releases and safety evaluations.',
        ],
      },
      level1: {
        levelTitle: 'Research Lead & ML Ops Lead (Level 1)',
        coreFocus: 'Dataset Pipeline Curation, Training Run Monitoring & Alignment Triage',
        responsibilities: [
          'Oversee dataset tokenization, deduplication, and quality filtering pipelines.',
          'Monitor loss convergence, gradient norms, and GPU memory utilization during training.',
          'Evaluate post-training alignment (DPO/RLHF) and compile benchmark rollups for the Chief Scientist.',
        ],
        workflowProtocols: [
          'Delegate tokenizer experiments and eval harness runs via delegate_task(communication_type: "delegate").',
          'Review automated eval scores and check for catastrophic forgetting.',
          'Submit checkpoint summaries UPWARD to Chief Scientist via delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'ML Engineers & Eval Specialists (Level 2 - ICs)',
        coreFocus: 'Model Architecture Code, PyTorch Distributed Loops & Automated Benchmarking',
        responsibilities: [
          'Write clean PyTorch/JAX code for transformer layers, attention mechanisms, and loss functions.',
          'Execute automated benchmark suites (HumanEval, GSM8k, MT-Bench) and record delta scores.',
          'Save model hyperparameter configs and dataset token counts in facts.md.',
        ],
        workflowProtocols: [
          'Submit training metrics, loss logs, and benchmark tables UPWARD using delegate_task(communication_type: "report_status").',
          'Request GPU compute allocation sign-off via delegate_task(communication_type: "request_approval").',
          'Escalate training gradient explosions or NaN losses immediately to Research Lead.',
        ],
      },
    },
    mid: {
      cadence: 'Multi-Stage Training Pipelines (Pretrain -> SFT -> RLHF -> Red-Teaming)',
      level0: {
        levelTitle: 'Scientific Council (Level 0 - Chief Scientist / Head of Research)',
        coreFocus: 'Frontier Capabilities Roadmap, Compute Budgeting & AI Safety Governance',
        responsibilities: [
          'Determine frontier research milestones, parameter budgets, and scaling law targets.',
          'Review comprehensive safety red-teaming reports and capability evaluations.',
          'Authorize multi-million token pretraining runs on distributed GPU clusters.',
        ],
        workflowProtocols: [
          'Issue capability mandates to Pretraining and Alignment Leads via delegate_task.',
          'Review weekly training loss trajectories and capability emergence reports.',
          'Approve final model weights for staging and deployment.',
        ],
      },
      level1: {
        levelTitle: 'Research Managers (Level 1 - Pretraining Lead, Alignment Lead, Eval Lead)',
        coreFocus: 'Distributed Training Optimization, Synthetic Data Generation & Safety Gating',
        responsibilities: [
          'Orchestrate 3D parallelism (Tensor, Pipeline, ZeRO-3) across GPU nodes.',
          'Curate multi-turn instruction datasets and supervise RLHF/DPO preference optimization.',
          'Synthesize model benchmark scores and alignment metrics for the Scientific Council.',
        ],
        workflowProtocols: [
          'Assign training script optimization and benchmark tasks via delegate_task.',
          'Verify model eval outputs and check against jailbreak test suites.',
          'Report training milestone status UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Research Engineers & Alignment Specialists (Level 2 - ICs)',
        coreFocus: 'Distributed Training Scripts, Kernel Optimization & Safety Evaluations',
        responsibilities: [
          'Optimize FlashAttention/CUDA kernels and implement distributed checkpointing (FSDP).',
          'Run automated red-teaming prompts to detect toxic outputs, prompt injections, and bias.',
          'Document verified learning rates, warm-up schedules, and tokenizer vocabs in procedural.md.',
        ],
        workflowProtocols: [
          'Submit checkpoint eval deltas and GPU efficiency metrics UPWARD using delegate_task(communication_type: "report_status").',
          'Request manager approval for launching full-cluster distributed jobs via delegate_task(communication_type: "request_approval").',
          'Never modify training hyperparameters without recording rationale.',
        ],
      },
    },
    large: {
      cadence: 'Continuous Multi-Modal Foundation Model Training & Autonomous Eval Verification',
      level0: {
        levelTitle: 'Executive Research Board (Level 0 - Chief Scientist, VP AI, AI Ethics Lead)',
        coreFocus: 'Next-Generation Foundation Models, Global Compute Infrastructure & Frontier Safety',
        responsibilities: [
          'Direct long-term artificial general intelligence research roadmaps and architecture breakthroughs.',
          'Oversee thousands of GPU/TPU nodes and multi-datacenter interconnect budgets.',
          'Enforce strict frontier model safety commitments, audit logging, and external red-teaming.',
        ],
        workflowProtocols: [
          'Commission strategic capability programs to Principal Research Leads via delegate_task.',
          'Review cross-modal benchmarks (vision, math, code, reasoning) and alignment certifications.',
          'Sanction public frontier model weight weights release and API tier deployment.',
        ],
      },
      level1: {
        levelTitle: 'Research Directors & Principal Scientists (Level 1)',
        coreFocus: 'Slurm/K8s Cluster Scheduling, Synthetic Reasoning Data & Rigorous Eval Governance',
        responsibilities: [
          'Lead multidisciplinary teams spanning pretraining, reasoning reinforcement, and multimodality.',
          'Implement automated checkpoint saving, failure recovery, and gradient drift detection.',
          'Aggregate evaluation matrices across thousands of academic and industry benchmarks.',
        ],
        workflowProtocols: [
          'Delegate specialized research subroutines to research squads using delegate_task.',
          'Review statistical significance of capability improvements and safety guardrail passes.',
          'Deliver weekly consolidated frontier progress briefs to the Executive Board via delegate_task.',
        ],
      },
      level2: {
        levelTitle: 'Senior Research Engineers & Data Scientists (Level 2 - ICs)',
        coreFocus: 'Model Implementations, High-Throughput Data Pipelines & Automated Testing',
        responsibilities: [
          'Build resilient data ingestion pipelines processing petabytes of multimodal tokens.',
          'Implement test suites asserting mathematical correctness of loss backpropagation.',
          'Record verified hardware FLOPs utilization (MFU) and scaling constants in facts.md.',
        ],
        workflowProtocols: [
          'Deliver completed model code, test suites, and eval charts UPWARD using delegate_task(communication_type: "report_status").',
          'Request multi-node GPU cluster allocation sign-offs via delegate_task(communication_type: "request_approval").',
          'Ensure reproducible seeds and deterministic eval runs for all experiments.',
        ],
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 4. Cybersecurity & Incident Response
// ---------------------------------------------------------------------------
registerCompanyWorkflow({
  companyId: 'company-cybersecurity-defense',
  category: 'Cybersecurity & Incident Response',
  domain: '24/7 SOC, Threat Intelligence & Zero-Trust Defense',
  scales: {
    small: {
      cadence: 'Continuous Threat Monitoring, SIEM Alert Triage & Rapid Containment',
      level0: {
        levelTitle: 'Security Director / CISO (Level 0)',
        coreFocus: 'Threat Landscape Posture, Incident Severity Declarations & Policy Sign-Off',
        responsibilities: [
          'Declare organization-wide incident severity levels (P1/P2/P3) and authorize network quarantines.',
          'Review daily SIEM alert distributions and vulnerability scanning summaries.',
          'Approve perimeter firewall rule alterations and zero-trust policy updates.',
        ],
        workflowProtocols: [
          'Delegate threat hunting and mitigation tasks DOWNWARD using delegate_task(communication_type: "delegate").',
          'Review forensic incident reports and IOC timelines submitted in review threads.',
          'Authorize public vulnerability disclosures and client incident notices.',
        ],
      },
      level1: {
        levelTitle: 'SOC Lead & Incident Commander (Level 1)',
        coreFocus: 'SIEM Correlation, Incident Playbook Execution & Containment Verification',
        responsibilities: [
          'Correlate multi-source telemetry (EDR, syslog, DNS, VPC flows) to detect adversary patterns.',
          'Direct incident containment playbooks: isolate infected hosts, revoke compromised tokens.',
          'Compile post-incident forensic reviews and report security posture upward to CISO.',
        ],
        workflowProtocols: [
          'Assign log analysis, memory dump parsing, and patch verification to SOC analysts via delegate_task.',
          'Verify indicator of compromise (IOC) remediations across all corporate endpoints.',
          'Submit incident post-mortems UPWARD to CISO using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'SOC Analysts & Pen Testers (Level 2 - ICs)',
        coreFocus: 'PCAP Analysis, YARA/Sigma Rule Crafting & Forensic Log Triage',
        responsibilities: [
          'Analyze network packet captures (PCAP), authenticate TLS handshakes, and inspect malware hashes.',
          'Craft precision YARA and Sigma detection rules to neutralize threat actor persistence.',
          'Record verified IOC hashes and firewall blocking rules in facts.md.',
        ],
        workflowProtocols: [
          'Report forensic findings and containment evidence UPWARD using delegate_task(communication_type: "report_status").',
          'Request formal approval from Incident Commander before revoking credentials via delegate_task(communication_type: "request_approval").',
          'Never execute unverified changes to live firewall or routing tables.',
        ],
      },
    },
    mid: {
      cadence: 'MITRE ATT&CK Mapping, 24/7 Tiered SOC & Automated SOAR Orchestration',
      level0: {
        levelTitle: 'Office of the CISO (Level 0)',
        coreFocus: 'Enterprise Risk Posture, Regulatory Cyber Compliance (SOC2/ISO27001) & Defense Strategy',
        responsibilities: [
          'Maintain compliance against SOC2 Type II, ISO 27001, and NIST Cybersecurity Framework.',
          'Review adversary threat intelligence briefs and approve major defense budget initiatives.',
          'Authorize enterprise containment measures during critical breach scenarios.',
        ],
        workflowProtocols: [
          'Direct defensive strategies to SOC Managers and Red Team leads via delegate_task.',
          'Review executive cyber posture dashboards and monthly compliance rollups.',
          'Sign off on annual penetration test findings and remediation roadmaps.',
        ],
      },
      level1: {
        levelTitle: 'SOC & CIRT Managers (Level 1 - SOC Manager, Lead Incident Handler)',
        coreFocus: 'SOAR Automation, Threat Hunting Workstreams & Vulnerability Prioritization',
        responsibilities: [
          'Manage 24/7 follow-the-sun SOC operations and automate alert triage via SOAR pipelines.',
          'Map emerging threats against the MITRE ATT&CK matrix and prioritize patch rollouts.',
          'Synthesize vulnerability metrics and active threat containment status for the CISO.',
        ],
        workflowProtocols: [
          'Distribute investigation tickets to Level 2 analysts using delegate_task.',
          'Audit forensic evidence integrity and confirm zero false-positives before signature deployment.',
          'Report threat mitigation metrics UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Cyber Analysts & Security Engineers (Level 2 - ICs)',
        coreFocus: 'EDR Telemetry Triage, Vulnerability Scanning & Exploit Verification',
        responsibilities: [
          'Triage endpoint detection & response (EDR) alerts, parse API audit logs, and isolate rogue processes.',
          'Run automated vulnerability scans (Nessus/Trivy) and verify patch effectiveness.',
          'Document attack vectors and forensic mitigation scripts in procedural.md.',
        ],
        workflowProtocols: [
          'Deliver incident analysis summaries and remediation pull requests UPWARD via delegate_task.',
          'Request manager approval for modifying intrusion prevention system (IPS) policies via delegate_task(communication_type: "request_approval").',
          'Escalate any privilege escalation anomaly immediately upward.',
        ],
      },
    },
    large: {
      cadence: 'Continuous Adversary Simulation, Zero-Trust Architecture & Autonomous Security Orchestration',
      level0: {
        levelTitle: 'Global Cyber Defense Command (Level 0 - Global CISO & Board Risk Committee)',
        coreFocus: 'Sovereign Threat Resilience, Supply Chain Defense & Zero-Trust Governance',
        responsibilities: [
          'Govern worldwide security operations centers, threat hunting units, and cryptanalysis squads.',
          'Review real-time threat intelligence feeds from international cyber defense agencies.',
          'Sanction zero-trust network microsegmentation policies across multi-cloud environments.',
        ],
        workflowProtocols: [
          'Issue defense directives to Regional Security Directors via delegate_task.',
          'Review enterprise breach resilience indices and global telemetry summaries.',
          'Authorize emergency enterprise isolation protocols in nation-state threat scenarios.',
        ],
      },
      level1: {
        levelTitle: 'Security Directors & CIRT Commanders (Level 1)',
        coreFocus: 'Threat Intelligence Correlation, Red/Blue Team Orchestration & Automated Defense',
        responsibilities: [
          'Direct purple-team exercises validating detection coverage across all enterprise endpoints.',
          'Supervise automated threat intelligence pipelines ingesting millions of daily IOC indicators.',
          'Aggregate defense posture reports and present executive risk briefings to CISO.',
        ],
        workflowProtocols: [
          'Assign forensic investigations and detection engineering tasks to senior analysts via delegate_task.',
          'Validate reverse-engineered malware analyses and defense sandbox reports.',
          'Submit consolidated risk posture briefs UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Senior Threat Hunters & Reverse Engineers (Level 2 - ICs)',
        coreFocus: 'Binary Disassembly, Memory Forensics & Resilient Zero-Trust Access Controls',
        responsibilities: [
          'Disassemble malicious binaries using Ghidra/IDA Pro to extract command-and-control (C2) URLs.',
          'Perform volatility memory analysis on compromised systems and extract in-memory credentials.',
          'Store verified detection signatures and threat actor tactics in facts.md.',
        ],
        workflowProtocols: [
          'Report forensic artifacts and mitigation code UPWARD via delegate_task(communication_type: "report_status").',
          'Request commander authorization for offensive adversary infrastructure takedowns via delegate_task(communication_type: "request_approval").',
          'Maintain chain of custody for all digital forensic evidence.',
        ],
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 5. E-Commerce & DTC Retail Enterprise
// ---------------------------------------------------------------------------
registerCompanyWorkflow({
  companyId: 'company-ecommerce-retail',
  category: 'E-Commerce & Retail',
  domain: 'High-Volume DTC Commerce, Inventory & Checkout CRO',
  scales: {
    small: {
      cadence: 'Weekly Catalog Drops, Checkout Conversion Optimization & Order Fulfillment',
      level0: {
        levelTitle: 'Founder & Retail Director (Level 0)',
        coreFocus: 'Merchandising Vision, Seasonal Sales Targets & Revenue Growth',
        responsibilities: [
          'Define seasonal product assortment, pricing margins, and promotional discounts.',
          'Review daily gross merchandise value (GMV), conversion rate, and average order value (AOV).',
          'Authorize supplier purchase orders and marketing campaign expenditures.',
        ],
        workflowProtocols: [
          'Delegate storefront and inventory operations DOWNWARD via delegate_task(communication_type: "delegate").',
          'Review checkout conversion analytics and customer feedback reports.',
          'Sign off on product launches and promotional flash sales.',
        ],
      },
      level1: {
        levelTitle: 'E-Commerce Operations Lead (Level 1)',
        coreFocus: 'Storefront UX, Inventory Sync & Payment Gateway Reliability',
        responsibilities: [
          'Manage Shopify/headless storefront catalogs, product imagery, and rich snippet schemas.',
          'Monitor inventory synchronization between warehouse stock and checkout inventory holds.',
          'Roll up sales telemetry and checkout drop-off analysis to the Founder.',
        ],
        workflowProtocols: [
          'Assign storefront tweaks, SEO optimization, and warehouse sync tasks to developers via delegate_task.',
          'Verify checkout flow integrity across mobile and desktop devices.',
          'Report weekly sales KPIs UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Storefront Dev & Operations Specialist (Level 2 - ICs)',
        coreFocus: 'Checkout Webhooks, Product Schema JSON-LD & 3PL Logistics',
        responsibilities: [
          'Implement robust Stripe/Shopify webhook handlers with idempotency and retry logic.',
          'Optimize Core Web Vitals (LCP, INP, CLS) to maximize mobile conversion rates.',
          'Record product inventory thresholds and shipping carrier rate tables in facts.md.',
        ],
        workflowProtocols: [
          'Submit storefront code updates and checkout test results UPWARD via delegate_task(communication_type: "report_status").',
          'Request manager approval for modifying price tables or discount codes via delegate_task(communication_type: "request_approval").',
          'Escalate inventory stockouts immediately upward.',
        ],
      },
    },
    mid: {
      cadence: 'Continuous A/B Testing, Multi-Warehouse 3PL Fulfillment & Omnichannel Retailing',
      level0: {
        levelTitle: 'Executive Retail Board (Level 0 - VP E-Commerce & VP Supply Chain)',
        coreFocus: 'Omnichannel GMV, Customer Acquisition Cost (CAC) vs LTV & Supply Chain Resilience',
        responsibilities: [
          'Set quarterly revenue targets across web, mobile app, and third-party marketplaces.',
          'Evaluate customer lifetime value (LTV), repeat purchase rate, and fulfillment unit economics.',
          'Authorize multi-warehouse 3PL logistics contracts and enterprise ERP integrations.',
        ],
        workflowProtocols: [
          'Delegate digital merchandising and logistics goals to department managers via delegate_task.',
          'Review bi-weekly margin analysis and fulfillment SLA compliance rollups.',
          'Approve global expansion into international currency and tax jurisdictions.',
        ],
      },
      level1: {
        levelTitle: 'Retail Managers (Level 1 - E-Commerce Lead, Merchandising Manager, Logistics Lead)',
        coreFocus: 'Conversion Rate Optimization (CRO), Stock Allocation & Cart Abandonment Recovery',
        responsibilities: [
          'Run multivariate A/B testing on product detail pages and checkout one-click buying.',
          'Oversee real-time inventory allocation across regional fulfillment distribution centers.',
          'Synthesize shopping funnel drop-off analytics for executive leadership.',
        ],
        workflowProtocols: [
          'Assign feature experiments and logistics automation tasks to squad members via delegate_task.',
          'Review conversion statistical significance and warehouse dispatch times.',
          'Deliver weekly performance briefs UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Fullstack Retail Engineers & Merchandisers (Level 2 - ICs)',
        coreFocus: 'Headless Storefront APIs, Inventory Webhooks & Cart Recovery Automations',
        responsibilities: [
          'Develop high-speed headless frontend components with Next.js/Vite and Algolia search.',
          'Write automated tests for cart calculations, tax engines (Avalara), and address validation.',
          'Store marketing pixel IDs and shipping carrier API schemas in procedural.md.',
        ],
        workflowProtocols: [
          'Submit tested PRs and checkout metrics UPWARD using delegate_task(communication_type: "report_status").',
          'Request manager approval before running bulk price modifications via delegate_task(communication_type: "request_approval").',
          'Coordinate customer service escalations with support peers via delegate_task(communication_type: "inform").',
        ],
      },
    },
    large: {
      cadence: 'Global Multi-Currency Commerce, Dynamic Pricing Engine & Autonomous Micro-Fulfillment',
      level0: {
        levelTitle: 'Global Retail Council (Level 0 - CEO, Chief Digital Officer, Chief Supply Officer)',
        coreFocus: 'Global Brand Market Share, Supply Chain Automation & Multi-Billion GMV Governance',
        responsibilities: [
          'Direct global multi-brand merchandising strategies and international retail expansion.',
          'Review autonomous micro-fulfillment center efficiency and global logistics freight costs.',
          'Sanction enterprise ERP (SAP/NetSuite) overhauls and global payment provider deals.',
        ],
        workflowProtocols: [
          'Issue strategic directives to Regional General Managers via delegate_task.',
          'Review consolidated global sales dashboards, margin trends, and supply chain risks.',
          'Authorize corporate sustainability and fair trade manufacturing certifications.',
        ],
      },
      level1: {
        levelTitle: 'Regional Directors & Engineering Managers (Level 1)',
        coreFocus: 'Micro-Frontend Architecture, Recommendation Engine AI & Cross-Dock Logistics',
        responsibilities: [
          'Supervise micro-frontend storefront platforms handling millions of concurrent peak users.',
          'Deploy real-time AI personalization engines driving personalized product recommendations.',
          'Aggregate multi-country fulfillment SLAs and present rollups to the Global Retail Council.',
        ],
        workflowProtocols: [
          'Delegate microservice and data pipeline tasks to engineering squads via delegate_task.',
          'Audit automated load tests simulating Black Friday/Cyber Monday traffic spikes.',
          'Deliver executive status reports UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Senior Commerce Engineers & Data Scientists (Level 2 - ICs)',
        coreFocus: 'High-Concurrency Checkout Services, Real-Time Fraud Scrubbing & Event Streaming',
        responsibilities: [
          'Build distributed checkout services with Kafka event streaming and optimistic inventory locking.',
          'Implement machine learning models to detect fraudulent credit card transactions in real-time.',
          'Record international VAT/tariff rules and currency hedging formulas in facts.md.',
        ],
        workflowProtocols: [
          'Deliver pull requests and load test benchmarks UPWARD via delegate_task(communication_type: "report_status").',
          'Obtain multi-stakeholder approval for payments engine modifications via delegate_task(communication_type: "request_approval").',
          'Strictly follow zero-downtime blue/green deployment protocols.',
        ],
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 6. Healthcare & Life Sciences Network
// ---------------------------------------------------------------------------
registerCompanyWorkflow({
  companyId: 'company-healthcare-network',
  category: 'Healthcare & Life Sciences',
  domain: 'HIPAA-Compliant EHR Interoperability & Patient Care Systems',
  scales: {
    small: {
      cadence: 'HIPAA Compliance Verifications, Telehealth Care Sprints & Audit Logging',
      level0: {
        levelTitle: 'Medical Director & Chief Clinical Officer (Level 0)',
        coreFocus: 'Patient Safety Protocols, HIPAA Compliance & Telehealth Quality of Care',
        responsibilities: [
          'Ensure all patient care pathways and telehealth services meet clinical governance standards.',
          'Review HIPAA audit compliance logs, patient data encryption, and BAA agreements.',
          'Authorize clinical partnerships, diagnostic tool integrations, and protocol updates.',
        ],
        workflowProtocols: [
          'Delegate clinical software and compliance tasks DOWNWARD via delegate_task(communication_type: "delegate").',
          'Review patient encounter summaries and quality-of-care audit findings.',
          'Sign off on clinical protocol releases and regulatory healthcare disclosures.',
        ],
      },
      level1: {
        levelTitle: 'Health Informatics Lead & HIPAA Officer (Level 1)',
        coreFocus: 'HL7/FHIR Protocol Implementation, PHI Encryption & EHR Integrations',
        responsibilities: [
          'Enforce strict Protected Health Information (PHI) access controls and AES-256 encryption.',
          'Supervise FHIR R4 / HL7 v2 messaging between patient portals and electronic health records.',
          'Roll up compliance audit reports and clinical uptime metrics to the Medical Director.',
        ],
        workflowProtocols: [
          'Assign FHIR endpoint and authentication tasks to healthcare developers via delegate_task.',
          'Review data validation rules ensuring 100% adherence to medical terminology standards (SNOMED, LOINC).',
          'Submit audit certifications UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Healthcare Software Engineers & Compliance Analysts (Level 2 - ICs)',
        coreFocus: 'FHIR Resources, Field-Level PHI Masking & Immutable Clinical Audit Logs',
        responsibilities: [
          'Implement HIPAA-compliant APIs with field-level PHI redaction and audit logging.',
          'Write automated tests validating patient consent boundaries and prescription validation.',
          'Record FHIR resource definitions and medical code lookup tables in facts.md.',
        ],
        workflowProtocols: [
          'Submit code diffs and HIPAA audit validation logs UPWARD via delegate_task(communication_type: "report_status").',
          'Request HIPAA Officer approval before modifying patient data schemas via delegate_task(communication_type: "request_approval").',
          'Escalate any unencrypted health record exposure immediately as a critical blocker.',
        ],
      },
    },
    mid: {
      cadence: 'Continuous Clinical Interoperability, EHR Integration & Patient Care Quality Assurance',
      level0: {
        levelTitle: 'Healthcare Executive Board (Level 0 - CMO, Chief Information Officer)',
        coreFocus: 'Hospital Network Reliability, Clinical Care Quality & Regulatory Accreditation',
        responsibilities: [
          'Maintain compliance with Joint Commission, HITECH, and federal health privacy mandates.',
          'Review hospital network EHR interoperability, patient readmission rates, and clinical safety.',
          'Approve health system medical imaging (DICOM) and laboratory information system (LIS) investments.',
        ],
        workflowProtocols: [
          'Delegate health IT and clinical workflow initiatives to department leads via delegate_task.',
          'Review quarterly clinical quality metrics and IT security risk assessments.',
          'Authorize hospital clinical software deployment into live clinical environments.',
        ],
      },
      level1: {
        levelTitle: 'Clinical IT & Informatics Managers (Level 1 - Lead Health Architect, Clinical Ops Manager)',
        coreFocus: 'EHR Gateway Reliability, Smart on FHIR Apps & Provider Workflow Optimization',
        responsibilities: [
          'Manage bidirectional EHR integration gateways (Epic, Cerner) with 99.999% uptime.',
          'Oversee computerized physician order entry (CPOE) and e-prescribing validation routines.',
          'Synthesize patient care technology KPIs and present briefings to the Executive Board.',
        ],
        workflowProtocols: [
          'Distribute integration and clinical module tasks to engineering squads via delegate_task.',
          'Audit automated test suites testing clinical decision support alert accuracy.',
          'Deliver system readiness reports UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Informatics Developers & QA Engineers (Level 2 - ICs)',
        coreFocus: 'SMART on FHIR Integrations, DICOM Imaging Parsers & Role-Based Patient Access',
        responsibilities: [
          'Build SMART on FHIR web applications adhering strictly to OAuth2 healthcare profiles.',
          'Execute end-to-end regression tests verifying that doctor/nurse role permissions cannot be bypassed.',
          'Store clinical terminology mappings and EHR sandbox credentials in procedural.md.',
        ],
        workflowProtocols: [
          'Submit integration pull requests with compliance test logs UPWARD via delegate_task.',
          'Obtain formal sign-off from Clinical Ops Lead before touching prescription workflows via delegate_task(communication_type: "request_approval").',
          'Maintain absolute separation of test synthetic data from real clinical records.',
        ],
      },
    },
    large: {
      cadence: 'Multi-Hospital Health System Integration, Real-Time Telemetry & Population Health Analytics',
      level0: {
        levelTitle: 'Health System Governing Board (Level 0 - CEO, CMO, Chief Medical Informatics Officer)',
        coreFocus: 'Enterprise Population Health, Medical Ethics & Multi-Facility Health System Stewardship',
        responsibilities: [
          'Govern regional healthcare delivery across dozens of hospital facilities and ambulatory clinics.',
          'Ensure adherence to international medical device regulations (FDA SaMD, EU MDR).',
          'Authorize multi-million dollar clinical trials data pipelines and genomic research platforms.',
        ],
        workflowProtocols: [
          'Commission clinical innovation programs to Health System Directors via delegate_task.',
          'Review consolidated patient safety telemetry, morbidity reviews, and compliance filings.',
          'Sign off on major health network federated data agreements and research covenants.',
        ],
      },
      level1: {
        levelTitle: 'Hospital System Directors & Clinical Informatics Chiefs (Level 1)',
        coreFocus: 'Federated Health Data Networks, Clinical AI Governance & Real-Time Patient Monitoring',
        responsibilities: [
          'Oversee real-time ICU telemetry ingestion pipelines processing vital signs at 100Hz.',
          'Enforce ethical clinical AI model validation to prevent algorithmic bias in triage.',
          'Aggregate health facility IT performance and present compliance briefs to Governing Board.',
        ],
        workflowProtocols: [
          'Delegate health microservice and compliance tasks to informatics leads via delegate_task.',
          'Audit data de-identification algorithms (Safe Harbor and Expert Determination methods).',
          'Report enterprise health IT uptime UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Senior Clinical Systems Engineers & Data Ethicists (Level 2 - ICs)',
        coreFocus: 'Fault-Tolerant Vital Sign Streaming, HIPAA Zero-Trust Infrastructure & HL7 v2/v3 Engines',
        responsibilities: [
          'Develop fault-tolerant clinical microservices with automatic zero-downtime failover.',
          'Run extensive fuzz testing on clinical HL7 parsers to prevent buffer overruns and malformed packets.',
          'Document clinical alert severity hierarchies and medical ontology schemas in facts.md.',
        ],
        workflowProtocols: [
          'Submit verified clinical software artifacts UPWARD via delegate_task(communication_type: "report_status").',
          'Obtain multi-physician sign-off before modifying clinical dosing calculators via delegate_task(communication_type: "request_approval").',
          'Adhere strictly to medical device software life-cycle processes (IEC 62304).',
        ],
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 7. Growth Marketing & Performance Demand Gen
// ---------------------------------------------------------------------------
registerCompanyWorkflow({
  companyId: 'company-growth-marketing',
  category: 'Marketing & Demand Gen',
  domain: 'High-Impact Performance Ads, ICP Research & Multi-Touch Attribution',
  scales: {
    small: {
      cadence: 'Weekly Growth Sprints, Rapid Creative A/B Testing & Funnel CRO',
      level0: {
        levelTitle: 'Head of Growth / Marketing Director (Level 0)',
        coreFocus: 'Customer Acquisition Strategy, CAC/LTV Ratios & Ad Budget Allocation',
        responsibilities: [
          'Set weekly pipeline generation targets, customer acquisition cost (CAC) ceilings, and ROAS goals.',
          'Review channel-level ad performance (Google Search, Meta, LinkedIn) and conversion velocity.',
          'Authorize paid advertising budget spend and creative campaign themes.',
        ],
        workflowProtocols: [
          'Delegate campaign briefs DOWNWARD to marketing specialists via delegate_task(communication_type: "delegate").',
          'Review creative variants, copy drafts, and landing page wireframes in review threads.',
          'Approve live campaign deployments and budget scale-up decisions.',
        ],
      },
      level1: {
        levelTitle: 'Performance Marketing Lead (Level 1)',
        coreFocus: 'Campaign Execution, Tracking Architecture (UTM/GTM) & Conversion Funnels',
        responsibilities: [
          'Structure paid ad campaigns with segmented audiences, negative keyword lists, and custom intent.',
          'Implement server-side tracking (Meta CAPI, Google Enhanced Conversions) for reliable attribution.',
          'Roll up weekly lead volume, cost-per-lead (CPL), and conversion rates to the Head of Growth.',
        ],
        workflowProtocols: [
          'Assign ad copy, creative graphics, and landing page tasks to specialists via delegate_task.',
          'Review ad copy for brand compliance, value proposition clarity, and high-converting hooks.',
          'Report campaign ROAS and attribution data UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Content Copywriters & Conversion Specialists (Level 2 - ICs)',
        coreFocus: 'High-Converting Ad Copy, Landing Page Variants & Analytics Tagging',
        responsibilities: [
          'Draft compelling ad headlines, hooks, and call-to-actions tailored to target ICP personas.',
          'Build responsive landing page variants with clear visual hierarchy and mobile page speed.',
          'Record top-performing ad copy formulas and UTM tracking conventions in facts.md.',
        ],
        workflowProtocols: [
          'Submit copy drafts and landing page URLs UPWARD using delegate_task(communication_type: "report_status").',
          'Request manager approval before increasing daily ad spend via delegate_task(communication_type: "request_approval").',
          'Never publish live marketing collateral without prior editorial sign-off.',
        ],
      },
    },
    mid: {
      cadence: 'Multi-Channel Demand Generation, Lifecycle Email Flows & Marketing Automation',
      level0: {
        levelTitle: 'Chief Marketing Officer (Level 0)',
        coreFocus: 'Brand Positioning, Omnichannel Revenue Contribution & Market Penetration',
        responsibilities: [
          'Govern quarterly marketing budgets, brand positioning, and enterprise pipeline contribution.',
          'Review multi-touch attribution models (first-touch, W-shaped, algorithmic) and payback periods.',
          'Authorize agency partnerships, major event sponsorships, and product launch blitzes.',
        ],
        workflowProtocols: [
          'Assign revenue targets to Demand Gen and Brand Directors via delegate_task.',
          'Review executive marketing dashboards and customer retention cohorts.',
          'Sign off on major company rebrands and flagship marketing campaigns.',
        ],
      },
      level1: {
        levelTitle: 'Demand Gen & Content Managers (Level 1 - Paid Media Manager, Content Lead)',
        coreFocus: 'Lead Scoring Models, Email Nurture Workflows & Marketing Automation',
        responsibilities: [
          'Manage marketing automation platforms (HubSpot/Marketo) and dynamic lead routing to sales.',
          'Coordinate content clusters, SEO pillar pages, and organic search ranking growth.',
          'Synthesize channel performance and present lead conversion briefs to CMO.',
        ],
        workflowProtocols: [
          'Distribute creative assignments and analytics audits to team members via delegate_task.',
          'Audit landing page conversion rates and verify lead qualification accuracy.',
          'Deliver weekly revenue attribution reports UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Performance Marketers & Media Designers (Level 2 - ICs)',
        coreFocus: 'Audience Targeting Experiments, Visual Ad Creatives & CRM Integrations',
        responsibilities: [
          'Configure lookalike and retargeting audiences across programmatic ad networks.',
          'Design high-contrast visual ad banners, motion assets, and interactive product calculators.',
          'Store audience segment definitions and email deliverability protocols in procedural.md.',
        ],
        workflowProtocols: [
          'Submit campaign results and conversion uplift evidence UPWARD via delegate_task.',
          'Request manager approval for modifying core CRM lifecycle triggers via delegate_task(communication_type: "request_approval").',
          'Coordinate product launch messaging horizontally with Product Marketing peers.',
        ],
      },
    },
    large: {
      cadence: 'Global Enterprise Brand Governance, Predictive Lead AI & Multi-Region Blitzscaling',
      level0: {
        levelTitle: 'Global Marketing Executive Board (Level 0 - CMO, VP Brand, VP Revenue Ops)',
        coreFocus: 'Global Market Leadership, Brand Equity & Enterprise Pipeline Generation',
        responsibilities: [
          'Oversee global marketing operations across North America, EMEA, and APAC regions.',
          'Evaluate enterprise sales pipeline velocity, customer acquisition efficiency, and net expansion.',
          'Authorize multi-million dollar annual media buys and global public relations strategies.',
        ],
        workflowProtocols: [
          'Direct international growth mandates to Regional Marketing Directors via delegate_task.',
          'Review global brand sentiment analysis and enterprise attribution matrices.',
          'Approve enterprise product keynote announcements and global partner summits.',
        ],
      },
      level1: {
        levelTitle: 'Regional Marketing Directors & Operations Leads (Level 1)',
        coreFocus: 'Predictive Lead Scoring, Account-Based Marketing (ABM) & Localized Campaigns',
        responsibilities: [
          'Execute high-touch ABM campaigns targeting Fortune 500 enterprise accounts.',
          'Deploy predictive AI models predicting account intent and likelihood-to-close.',
          'Aggregate regional revenue metrics and present consolidated rollups to the CMO.',
        ],
        workflowProtocols: [
          'Assign campaign sprints to localized marketing squads using delegate_task.',
          'Audit data privacy compliance across regions (GDPR, CCPA, CASL).',
          'Submit weekly enterprise pipeline health briefs UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Senior Growth Engineers & ABM Strategists (Level 2 - ICs)',
        coreFocus: 'Custom Conversion Tracking, Reverse ETL Data Pipelines & Dynamic Web Experiences',
        responsibilities: [
          'Build real-time reverse ETL pipelines syncing data warehouse intelligence to CRM systems.',
          'Implement dynamic landing page personalization serving bespoke content based on visitor IP domain.',
          'Record global ICP qualification criteria and attribution decay models in facts.md.',
        ],
        workflowProtocols: [
          'Deliver completed growth experiments and conversion analytics UPWARD via delegate_task.',
          'Obtain multi-stakeholder approval for global domain DNS or tracking tag changes via delegate_task(communication_type: "request_approval").',
          'Maintain absolute brand voice and visual consistency across all creative assets.',
        ],
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 8. Game Development & Creative Studio
// ---------------------------------------------------------------------------
registerCompanyWorkflow({
  companyId: 'company-gaming-studio',
  category: 'Game Development & Creative Studio',
  domain: '60FPS Frame Budgeting, Netcode Synchronization & Level Design',
  scales: {
    small: {
      cadence: 'Playable Vertical Slice Milestones, Netcode Sync & Frame Budgeting',
      level0: {
        levelTitle: 'Game Director & Creative Producer (Level 0)',
        coreFocus: 'Creative Vision, Core Gameplay Loop & Milestone Gate Sign-Off',
        responsibilities: [
          'Define game design documentation (GDD), aesthetic direction, and core gameplay mechanics.',
          'Playtest weekly builds, evaluate player friction points, and gate vertical slice milestones.',
          'Authorize game engine upgrades, external art outsourcing, and platform publishing commitments.',
        ],
        workflowProtocols: [
          'Delegate gameplay features and art asset briefs DOWNWARD via delegate_task(communication_type: "delegate").',
          'Review playable build capture videos and frame rate profiling benchmarks in review threads.',
          'Approve release of alpha/beta playtest builds to external testers.',
        ],
      },
      level1: {
        levelTitle: 'Lead Programmer & Technical Director (Level 1)',
        coreFocus: 'Netcode Architecture, Physics Determinism & 60FPS Frame Budgeting',
        responsibilities: [
          'Enforce strict 16.6ms per frame rendering budgets (draw calls, physics ticks, GC pauses).',
          'Oversee client-server netcode synchronization, lag compensation, and state replication.',
          'Roll up build stability metrics, crash rates, and playtest feedback to the Game Director.',
        ],
        workflowProtocols: [
          'Assign gameplay mechanics, UI systems, and audio integration to developers via delegate_task.',
          'Profile all pull requests to ensure zero memory leaks or physics desync bugs.',
          'Report milestone build status UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Gameplay Developers & 3D Artists (Level 2 - ICs)',
        coreFocus: 'Player Controllers, Hitbox Collisions, Shader Optimization & Level Assets',
        responsibilities: [
          'Implement responsive character movement, state machines, and combat animations.',
          'Optimize 3D mesh polygon counts, LOD hierarchies, and shader complexity.',
          'Store collision layer matrices and netcode packet formats in facts.md.',
        ],
        workflowProtocols: [
          'Submit gameplay code, asset files, and frame profiler captures UPWARD via delegate_task(communication_type: "report_status").',
          'Request Technical Director approval before modifying the core tick loop via delegate_task(communication_type: "request_approval").',
          'Never check in assets that violate the allocated texture memory budget.',
        ],
      },
    },
    mid: {
      cadence: 'Bi-Weekly Playable Sprints, Automated CI Build Verification & Multi-Platform Profiling',
      level0: {
        levelTitle: 'Studio Executive Board (Level 0 - Studio Head, Creative Director)',
        coreFocus: 'Franchise Roadmap, Publisher Milestones & Production Budget Governance',
        responsibilities: [
          'Manage multi-title release schedules, publisher contracts, and platform certification gates.',
          'Review playtest retention telemetry, player engagement data, and production burn rate.',
          'Sanction major engine architectural shifts and console platform porting initiatives.',
        ],
        workflowProtocols: [
          'Delegate milestone deliverables to Production and Technical Leads via delegate_task.',
          'Review bi-weekly playable milestone builds and user experience telemetry.',
          'Authorize public demo trailers and closed beta playtest announcements.',
        ],
      },
      level1: {
        levelTitle: 'Department Leads (Level 1 - Lead Producer, Art Director, Lead Systems Architect)',
        coreFocus: 'Sprint Backlog Grooming, Shader Optimization & Cross-Discipline Coordination',
        responsibilities: [
          'Maintain production velocity across gameplay, environment art, audio, and network backend.',
          'Audit shader compilation times, memory footprint on target hardware, and asset LODs.',
          'Synthesize sprint burndown and bug triage matrices for the Studio Head.',
        ],
        workflowProtocols: [
          'Distribute sprint tasks to programming and art squads using delegate_task.',
          'Inspect automated build machine logs to ensure zero compilation breaks.',
          'Deliver weekly production status briefs UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Game Programmers & Level Designers (Level 2 - ICs)',
        coreFocus: 'Mechanics Implementation, AI Behavior Trees & Level Lighting/NavMesh',
        responsibilities: [
          'Develop NPC behavior trees, pathfinding NavMesh queries, and spatial audio triggers.',
          'Construct interactive level geometry with optimized occlusion culling and lighting bakes.',
          'Record game balancing formulas and animation blend trees in procedural.md.',
        ],
        workflowProtocols: [
          'Submit completed mechanics and level design diffs UPWARD via delegate_task.',
          'Request Lead Architect approval for modifying save-game serializations via delegate_task(communication_type: "request_approval").',
          'Coordinate asset handoffs with 3D art peers using delegate_task(communication_type: "inform").',
        ],
      },
    },
    large: {
      cadence: 'AAA Multi-Platform Production, Continuous Playtest Telemetry & Live-Ops Service',
      level0: {
        levelTitle: 'AAA Studio Leadership (Level 0 - Executive Producer, Studio VP, Game Director)',
        coreFocus: 'Global Franchise IP, Multi-Platform Certifications (PS5/Xbox/PC) & Live-Ops Strategy',
        responsibilities: [
          'Direct multi-year franchise development, seasonal live-service roadmaps, and cross-platform play.',
          'Review global server backend load tests and platform certification compliance (Sony/MS/Valve).',
          'Authorize multi-million dollar live-service expansions and commercial licensing.',
        ],
        workflowProtocols: [
          'Commission production workstreams to Lead Directors via delegate_task.',
          'Review player churn predictive models and high-concurrency server telemetry.',
          'Sign off on master gold master builds for retail manufacture and digital submission.',
        ],
      },
      level1: {
        levelTitle: 'Technical Directors & Production Chiefs (Level 1)',
        coreFocus: 'Distributed Game Engine Pipelines, Deterministic Physics & Server Fleet Scalability',
        responsibilities: [
          'Supervise distributed engine teams optimizing custom rendering pipelines (DirectX 12/Vulkan).',
          'Enforce anti-cheat verification, server-side simulation authority, and matchmaker latency SLAs.',
          'Aggregate studio defect metrics and present certification readiness to Studio VP.',
        ],
        workflowProtocols: [
          'Assign specialized graphics and network subroutines to engineering squads via delegate_task.',
          'Audit automated performance stress tests running on dedicated console devkits.',
          'Deliver weekly technical health reports UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Senior Engine Programmers & Technical Artists (Level 2 - ICs)',
        coreFocus: 'GPU Compute Shaders, Low-Level SIMD Optimization & Dedicated Server Fleet',
        responsibilities: [
          'Write custom compute shaders for volumetric lighting, particle simulations, and cloth physics.',
          'Optimize CPU cache locality, eliminate virtual function overhead in tick loops, and profile frame bottlenecks.',
          'Document network replication protocols and GPU memory pools in facts.md.',
        ],
        workflowProtocols: [
          'Deliver profiling benchmarks and optimized engine diffs UPWARD via delegate_task.',
          'Obtain multi-director sign-off for memory allocator alterations via delegate_task(communication_type: "request_approval").',
          'Strictly follow trunk-based development with automated smoke tests on every commit.',
        ],
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 9. Supply Chain & Global Freight Logistics
// ---------------------------------------------------------------------------
registerCompanyWorkflow({
  companyId: 'company-freight-logistics',
  category: 'Supply Chain & Logistics',
  domain: 'Multimodal Freight Dispatch, EDI 204/214 & Demurrage Mitigation',
  scales: {
    small: {
      cadence: 'Real-Time Dispatch Scheduling, Bill-of-Lading Auditing & Route Optimization',
      level0: {
        levelTitle: 'Logistics Director / COO (Level 0)',
        coreFocus: 'Fleet Capacity, On-Time Delivery SLAs & Carrier Contract Negotiation',
        responsibilities: [
          'Define carrier network agreements, fleet utilization targets, and on-time delivery (OTD) thresholds.',
          'Review daily load dispatch volumes, fuel surcharges, and demurrage penalties.',
          'Authorize new broker partnerships and third-party logistics freight contracts.',
        ],
        workflowProtocols: [
          'Delegate dispatch operations and carrier onboarding DOWNWARD via delegate_task(communication_type: "delegate").',
          'Review daily exception logs and freight cost variance reports in review threads.',
          'Sign off on major freight claims settlements and route expansion plans.',
        ],
      },
      level1: {
        levelTitle: 'Dispatch & Fleet Operations Lead (Level 1)',
        coreFocus: 'Load Tender Matching, EDI Messaging & Customs Exception Management',
        responsibilities: [
          'Match available carrier capacity against shipper load tenders with optimal deadhead minimization.',
          'Supervise automated EDI 204 (Load Tender) and EDI 214 (Shipment Status) electronic transactions.',
          'Roll up dispatch efficiency, trailer detention fees, and carrier ratings to the Logistics Director.',
        ],
        workflowProtocols: [
          'Assign tracking and driver communication tickets to logistics coordinators via delegate_task.',
          'Audit electronic bills of lading (eBOL) for accuracy before authorizing freight settlement.',
          'Submit daily dispatch rollups UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Freight Coordinators & Customs Specialists (Level 2 - ICs)',
        coreFocus: 'GPS Telemetry Tracking, Detention Logging & Carrier Exception Triage',
        responsibilities: [
          'Monitor real-time truck/container GPS pings and flag transit delays before SLA breaches occur.',
          'Validate customs clearance paperwork, commercial invoices, and harmonized tariff codes (HTS).',
          'Record carrier insurance limits and route clearance restrictions in facts.md.',
        ],
        workflowProtocols: [
          'Submit delivery confirmations and detention timestamp proofs UPWARD via delegate_task(communication_type: "report_status").',
          'Request manager approval before issuing spot-market rate surges via delegate_task(communication_type: "request_approval").',
          'Escalate cargo damage or security seal discrepancies immediately as blocking incidents.',
        ],
      },
    },
    mid: {
      cadence: 'Multimodal Intermodal Dispatch, Dynamic Route Optimization & Carrier SLA Gating',
      level0: {
        levelTitle: 'Executive Supply Chain Board (Level 0 - VP Supply Chain, VP Operations)',
        coreFocus: 'Intermodal Network Efficiency, Port Demurrage Prevention & Regional Logistics Strategy',
        responsibilities: [
          'Govern regional supply chain corridors (rail, ocean, dry van, refrigerated freight).',
          'Review quarterly container turnaround times, detention cost curves, and driver retention.',
          'Authorize regional cross-dock warehouse leases and automated yard management software.',
        ],
        workflowProtocols: [
          'Delegate multimodal operational targets to Operations and Dispatch Managers via delegate_task.',
          'Review monthly carrier performance scorecards and cost-per-ton-mile analytics.',
          'Approve long-term ocean shipping line volume commitments.',
        ],
      },
      level1: {
        levelTitle: 'Operations & Compliance Managers (Level 1 - Dispatch Manager, Safety Lead)',
        coreFocus: 'Yard Management Optimization, DOT Hours-of-Service (HOS) & Freight Rate Hedging',
        responsibilities: [
          'Orchestrate real-time yard appointments and reduce driver turnaround dwell time under 45 minutes.',
          'Enforce strict DOT Hours-of-Service and hazardous materials (HAZMAT) transport compliance.',
          'Synthesize regional fleet efficiency and submit consolidated briefings to VP Supply Chain.',
        ],
        workflowProtocols: [
          'Distribute load scheduling and route optimization tickets to execution teams via delegate_task.',
          'Audit rate reconciliation discrepancies against contracted fuel index benchmarks.',
          'Deliver weekly operational performance reports UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Logistics Analysts & Dispatch Engineers (Level 2 - ICs)',
        coreFocus: 'Automated Load Building, Route Geofencing & EDI 990/210 Transaction Processing',
        responsibilities: [
          'Implement automated load consolidation algorithms maximizing trailer cubic volume utilization.',
          'Configure geofenced arrival/departure triggers to automate driver detention logging.',
          'Store intermodal terminal access codes and port demurrage schedules in procedural.md.',
        ],
        workflowProtocols: [
          'Submit route optimization results and carrier compliance data UPWARD via delegate_task.',
          'Request manager sign-off for premium air-freight diversions via delegate_task(communication_type: "request_approval").',
          'Coordinate cross-dock transfers horizontally with warehouse dock supervisors.',
        ],
      },
    },
    large: {
      cadence: 'Global Trade Corridor Orchestration, Autonomous Freight Clearing & Predictive Demurrage AI',
      level0: {
        levelTitle: 'Global Supply Chain Command (Level 0 - Chief Supply Chain Officer, Chief Commercial Officer)',
        coreFocus: 'Sovereign Port Infrastructure, Global Geopolitical Trade Lanes & Multi-Billion Logistics',
        responsibilities: [
          'Direct global intercontinental trade routes across maritime shipping, air cargo, and freight rail.',
          'Evaluate macroeconomic tariff shifts, customs regulations, and global canal throughput risks.',
          'Sanction enterprise TMS/WMS software integrations and autonomous electric fleet deployments.',
        ],
        workflowProtocols: [
          'Issue global supply chain directives to Regional General Managers via delegate_task.',
          'Review international container dwell heatmaps and enterprise margin rollups.',
          'Authorize emergency rerouting protocols during major port disruptions or geopolitical embargoes.',
        ],
      },
      level1: {
        levelTitle: 'Regional Directors & Global Customs Chiefs (Level 1)',
        coreFocus: 'Cross-Continent Trade Compliance, Predictive Supply Chain Telemetry & Automated Brokerage',
        responsibilities: [
          'Manage automated customs brokerage platforms processing tens of thousands of daily declarations.',
          'Deploy machine learning models predicting ocean port congestion and vessel transit delays.',
          'Aggregate global logistics metrics and present strategic briefings to the Executive Command.',
        ],
        workflowProtocols: [
          'Delegate corridor optimization tasks to specialized regional teams via delegate_task.',
          'Audit automated customs declaration filings ensuring zero tariff misclassification penalties.',
          'Deliver weekly global logistics health briefs UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Senior Logistics Engineers & Supply Chain Analysts (Level 2 - ICs)',
        coreFocus: 'Predictive Routing Algorithms, Blockchain Bill of Lading & IoT Cold-Chain Monitoring',
        responsibilities: [
          'Build real-time IoT temperature/humidity tracking pipelines for pharmaceutical cold-chain cargo.',
          'Develop predictive machine learning models optimizing fuel consumption and multi-stop delivery sequences.',
          'Document international maritime regulations (IMO 2020) and customs export codes in facts.md.',
        ],
        workflowProtocols: [
          'Deliver verified route data and telemetry analytics UPWARD via delegate_task.',
          'Obtain multi-director approval for chartering emergency maritime vessels via delegate_task(communication_type: "request_approval").',
          'Adhere strictly to international hazardous material transport protocols.',
        ],
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 10. Venture Capital & Private Equity
// ---------------------------------------------------------------------------
registerCompanyWorkflow({
  companyId: 'company-venture-capital',
  category: 'Venture Capital & Investments',
  domain: 'Deal Flow Sourcing, Investment Memos & DCF Valuation',
  scales: {
    small: {
      cadence: 'Weekly Investment Committee Sprints, Founder Due Diligence & Deal Sourcing',
      level0: {
        levelTitle: 'Managing Partner (Level 0)',
        coreFocus: 'Fund Investment Thesis, Partner Votes & Term Sheet Authorization',
        responsibilities: [
          'Set fund investment criteria, stage focus (Seed/Series A), and check size ranges.',
          'Lead weekly Investment Committee (IC) meetings and evaluate prospective startup pitches.',
          'Authorize binding term sheets, governance board seats, and capital call distributions.',
        ],
        workflowProtocols: [
          'Delegate deal sourcing and diligence workstreams DOWNWARD via delegate_task(communication_type: "delegate").',
          'Review investment memos, founder background investigations, and capitalization tables.',
          'Sign off on wire transfers and final legal closing documents.',
        ],
      },
      level1: {
        levelTitle: 'Investment Principal / Deal Lead (Level 1)',
        coreFocus: 'Diligence Orchestration, Financial Modeling Review & Deal Pipeline Management',
        responsibilities: [
          'Run comprehensive due diligence: customer reference calls, competitive landscape, and tech audit.',
          'Audit 3-statement financial models, unit economics (LTV/CAC), and pro-forma cap table scenarios.',
          'Synthesize deal findings into rigorous Investment Memos for the Managing Partner.',
        ],
        workflowProtocols: [
          'Assign market research and financial model builds to associates via delegate_task.',
          'Challenge market sizing (TAM/SAM) assumptions and verify customer cohort retention.',
          'Submit finalized investment memos UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Investment Associates & Analysts (Level 2 - ICs)',
        coreFocus: 'Financial Modeling, Competitor Matrix Mapping & Founder Background Checks',
        responsibilities: [
          'Construct discounted cash flow (DCF), comparable multiples, and sensitivity financial models.',
          'Map competitive landscape matrices and interview prospective portfolio customers.',
          'Record verified valuation benchmarks and founder background checks in facts.md.',
        ],
        workflowProtocols: [
          'Submit financial models and market research decks UPWARD via delegate_task(communication_type: "report_status").',
          'Request Principal approval before scheduling founder partner pitches via delegate_task(communication_type: "request_approval").',
          'Never share non-public diligence information outside authorized firm channels.',
        ],
      },
    },
    mid: {
      cadence: 'Multi-Stage Fund Deployment, Portfolio Governance & LP Reporting',
      level0: {
        levelTitle: 'General Partners & Investment Committee (Level 0)',
        coreFocus: 'Fund Deployment Pacing, LP Capital Management & Strategic Exit Governance',
        responsibilities: [
          'Manage fund capital pacing ($100M-$500M) across initial checks and follow-on reserve pools.',
          'Review quarterly LP financial reports, Internal Rate of Return (IRR), and Total Value to Paid-in (TVPI).',
          'Authorize M&A acquisitions, secondary share sales, and IPO registration statements.',
        ],
        workflowProtocols: [
          'Issue sector investment mandates (AI, FinTech, B2B SaaS) to Sector Directors via delegate_task.',
          'Review investment committee decks and cross-partner diligence findings.',
          'Vote on term sheet issuances and approve follow-on bridge financing.',
        ],
      },
      level1: {
        levelTitle: 'Sector Directors & General Counsel (Level 1 - FinTech Lead, Legal Partner)',
        coreFocus: 'Deal Negotiation, Term Sheet Covenants & Portfolio Board Representation',
        responsibilities: [
          'Negotiate liquidation preferences, pro-rata rights, and protective legal covenants.',
          'Support portfolio company executive hiring, revenue acceleration, and follow-on fundraising.',
          'Synthesize sector deal flow velocity and present rollups to the General Partners.',
        ],
        workflowProtocols: [
          'Distribute due diligence modules and cap table waterfall audits to associates via delegate_task.',
          'Inspect legal disclosures and verify intellectual property assignment agreements.',
          'Deliver weekly pipeline briefings UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Senior Investment Associates & Data Strategists (Level 2 - ICs)',
        coreFocus: 'Waterfall Cap Table Auditing, Proprietary Sourcing Algorithms & Market Maps',
        responsibilities: [
          'Build dynamic liquidation waterfall models simulating common vs preferred payout outcomes.',
          'Develop automated web scraping and signal monitoring tools to detect breakout startups early.',
          'Store verified investor syndicates and co-investment terms in procedural.md.',
        ],
        workflowProtocols: [
          'Submit verified valuation analyses and diligence dossiers UPWARD via delegate_task.',
          'Request partner approval for issuing non-binding letters of intent (LOI) via delegate_task(communication_type: "request_approval").',
          'Maintain rigorous confidentiality for all prospective investment targets.',
        ],
      },
    },
    large: {
      cadence: 'Multi-Fund Global Asset Management, Sovereign LP Relations & Cross-Border Buyouts',
      level0: {
        levelTitle: 'Executive Investment Council (Level 0 - Senior Managing Directors, Board of Governors)',
        coreFocus: 'Global Multi-Billion Asset Allocation, Sovereign Wealth Partnerships & Macroeconomic Strategy',
        responsibilities: [
          'Allocate multi-billion dollar capital across early-stage, growth equity, and private credit funds.',
          'Maintain relationships with sovereign wealth funds, pension endowments, and institutional LPs.',
          'Authorize major multi-hundred-million-dollar buyout transactions and global fund formation.',
        ],
        workflowProtocols: [
          'Commission sector investment programs to Global Practice Leaders via delegate_task.',
          'Review global fund performance benchmarks and macroeconomic liquidity stress tests.',
          'Sign off on flagship fund prospectuses and institutional LP distributions.',
        ],
      },
      level1: {
        levelTitle: 'Global Practice Directors & Chief Operating Officer (Level 1)',
        coreFocus: 'Syndicate Formation, Cross-Border Regulatory Clearance (CFIUS) & Portfolio Operations',
        responsibilities: [
          'Lead global co-investment syndicates with international institutional co-investors.',
          'Navigate antitrust and national security regulatory clearances (CFIUS/FDI).',
          'Aggregate global portfolio performance metrics and present executive briefs to the Council.',
        ],
        workflowProtocols: [
          'Assign multi-jurisdiction legal audits and valuation reviews to investment teams via delegate_task.',
          'Audit audited financial returns and verify compliance with international accounting standards.',
          'Submit quarterly fund performance reports UPWARD using delegate_task(communication_type: "report_status").',
        ],
      },
      level2: {
        levelTitle: 'Principal Associates & Quantitative Financial Engineers (Level 2 - ICs)',
        coreFocus: 'Complex Multi-Entity LBO Modeling, Risk Sensitivity Scenarios & Portfolio Analytics',
        responsibilities: [
          'Build leveraged buyout (LBO) debt amortization models and Monte Carlo portfolio return simulations.',
          'Execute automated portfolio performance tracking monitoring monthly MRR/ARR growth across 100+ startups.',
          'Document global fund tax structures (Delaware, Cayman, Luxembourg) in facts.md.',
        ],
        workflowProtocols: [
          'Deliver financial analyses and investment committee memos UPWARD via delegate_task.',
          'Obtain multi-partner authorization before issuing formal investment bids via delegate_task(communication_type: "request_approval").',
          'Ensure absolute adherence to SEC, FINRA, and global financial market conduct regulations.',
        ],
      },
    },
  },
});

// ---------------------------------------------------------------------------
// Dynamic Domain Workflow Generator (Scales effortlessly to 1,000+ companies)
// ---------------------------------------------------------------------------
export function generateDynamicDomainWorkflow(
  company: { id: string; name: string; domain: string; category: string; tagline?: string },
  scale: CompanyScale = 'mid',
): CompanyScaleWorkflow {
  const compName = company.name || 'Enterprise';
  const domain = company.domain || 'Technology & Operations';
  const category = company.category || 'Enterprise Business';

  return {
    cadence: `${scale.toUpperCase()} Scale: Structured Domain Operations & Continuous Quality Gates`,
    level0: {
      levelTitle: `Executive Leadership (Level 0 - C-Suite / Strategic Directors)`,
      coreFocus: `${compName} Strategic Direction, ${category} & ${domain} Objectives & Resource Governance`,
      responsibilities: [
        `Establish long-term vision, core KPIs, and operational standards for ${compName}.`,
        `Review aggregated department status reports and authorize major domain milestones.`,
        `Allocate organizational resources and approve critical external partnerships.`,
      ],
      workflowProtocols: [
        `Delegate strategic goals DOWNWARD to Level 1 managers using delegate_task(communication_type: "delegate").`,
        `Review milestone rollups and deliverable summaries submitted in review threads via chat_id.`,
        `Authorize release trains, major expenditures, and high-impact operational changes.`,
      ],
    },
    level1: {
      levelTitle: `Department Management (Level 1 - Leads & Coordinators)`,
      coreFocus: `${domain} Task Decomposition, PR/Deliverable Verification & Squad Leadership`,
      responsibilities: [
        `Translate executive strategy into actionable ${domain} project requirements and specifications.`,
        `Supervise Level 2 execution squads, enforce quality standards, and unblock cross-functional dependencies.`,
        `Synthesize squad deliverables and test metrics into concise executive status rollups.`,
      ],
      workflowProtocols: [
        `Distribute discrete work packages to squad specialists using delegate_task(communication_type: "delegate").`,
        `Review submitted deliverables, verify against acceptance criteria, and ensure zero regressions.`,
        `Report verified progress UPWARD to executive leadership using delegate_task(communication_type: "report_status").`,
      ],
    },
    level2: {
      levelTitle: `Specialist Execution (Level 2 - Hands-on Specialists & Engineers)`,
      coreFocus: `Concrete ${domain} Deliverables, Automated Verification & Upward Reporting`,
      responsibilities: [
        `Execute concrete tasks with precision, producing clean code, documents, or domain deliverables.`,
        `Run automated tests and validation assertions verifying deliverable correctness before reporting.`,
        `Record verified domain facts and reusable operational recipes into private MEMORY.md.`,
      ],
      workflowProtocols: [
        `Submit deliverables and test proof UPWARD to reporting manager using delegate_task(communication_type: "report_status", chat_id: ...).`,
        `Request formal manager approval for sensitive operations via delegate_task(communication_type: "request_approval").`,
        `Never assign tasks to superiors; escalate blockers immediately upward to your manager.`,
      ],
    },
  };
}

/**
 * Retrieve the exact scale workflow for a company (stock or dynamic)
 */
export function getCompanyScaleWorkflow(
  company: { id: string; name: string; domain: string; category: string; tagline?: string },
  scale: CompanyScale = 'mid',
): CompanyScaleWorkflow {
  const stockSpec = COMPANY_WORKFLOW_REGISTRY.get(company.id);
  if (stockSpec) {
    const scaleConfig = stockSpec.scales[scale] || stockSpec.scales.mid || stockSpec.scales.small;
    if (scaleConfig) return scaleConfig;
  }
  return generateDynamicDomainWorkflow(company, scale);
}

/**
 * Build the exact, level-specific system prompt for an agent.
 * Eliminates all other levels so zero tokens are wasted on irrelevant instructions!
 */
export function buildCompanyAgentPrompt(params: {
  company: CompanyPreset;
  scale: CompanyScale;
  agentName: string;
  roleTitle: string;
  level: number;
  zoneName: string;
  zoneResponsibilities?: string;
  zoneInstructions?: string;
  parentZoneName?: string;
  parentZoneRoleTitle?: string;
  baseSystemPrompt?: string;
}): string {
  const {
    company,
    scale,
    agentName,
    roleTitle,
    level,
    zoneName,
    zoneResponsibilities,
    zoneInstructions,
    parentZoneName,
    parentZoneRoleTitle,
    baseSystemPrompt,
  } = params;

  const scaleWorkflow = getCompanyScaleWorkflow(company, scale);

  // Pick ONLY the relevant level guidance
  let levelGuidance: WorkflowLevelGuidance;
  let levelType: 'executive' | 'management' | 'execution';

  if (level === 0) {
    levelGuidance = scaleWorkflow.level0;
    levelType = 'executive';
  } else if (level === 1) {
    levelGuidance = scaleWorkflow.level1;
    levelType = 'management';
  } else {
    levelGuidance = level >= 3 && scaleWorkflow.level3 ? scaleWorkflow.level3 : scaleWorkflow.level2;
    levelType = 'execution';
  }

  const promptSections: string[] = [
    `# ${agentName} — ${roleTitle}`,
    `You are an active specialist at **${company.name}** (${company.domain}).`,
    `Company Mission: ${company.tagline}`,
    `Operating Scale: ${scale.toUpperCase()} Scale (${scaleWorkflow.cadence})`,
    `Assigned Zone: "${zoneName}" (Level ${level} - ${roleTitle})`,
    zoneResponsibilities ? `Zone Responsibilities: ${zoneResponsibilities}` : '',
    zoneInstructions ? `Zone Workflow Instructions: ${zoneInstructions}` : '',
    parentZoneName
      ? `Reporting Line: Reports to leadership in "${parentZoneName}"${parentZoneRoleTitle ? ` (${parentZoneRoleTitle})` : ''}`
      : 'Reporting Line: Top-Tier Strategic Council (No superior within space)',
    '',
    `### YOUR ORGANIZATIONAL TIER & LEVEL-SPECIFIC WORKFLOW:`,
    `- **Tier**: ${levelGuidance.levelTitle}`,
    `- **Primary Focus**: ${levelGuidance.coreFocus}`,
    `- **Key Responsibilities**:`,
    ...levelGuidance.responsibilities.map((r) => `  • ${r}`),
    `- **Mandatory Workflow Protocols**:`,
    ...levelGuidance.workflowProtocols.map((p) => `  • ${p}`),
    '',
    `### INTER-AGENT COLLABORATION PROTOCOLS:`,
    `- **Threaded Context**: Always supply the returned \`chat_id\` when responding via \`delegate_task\` so work reviews and questions stay in a single threaded conversation.`,
    levelType === 'executive'
      ? `- **Executive Authority**: You direct strategy. Delegate subtasks downward to direct reports via \`delegate_task(communication_type: 'delegate')\`. Review aggregated status reports submitted by managers.`
      : levelType === 'management'
        ? `- **Managerial Bridge**: Ingest executive goals, delegate tasks downward via \`delegate_task(communication_type: 'delegate')\`, review PRs/deliverables, and report status UPWARD via \`delegate_task(communication_type: 'report_status')\`. Request executive approvals via \`delegate_task(communication_type: 'request_approval')\`.`
        : `- **Strict Execution Discipline**: You implement deliverables and report UPWARD via \`delegate_task(communication_type: 'report_status')\`. You do NOT delegate tasks to superiors. Escalate blockers upward to your direct manager.`,
    `- **Institutional Memory**: Persist verified facts into \`facts.md\` and reusable operational recipes into \`procedural.md\` using \`manage_agent_memory\`.`,
    `- **Edge-Case Playbook**: Consult your \`smartness.md\` playbook for standard reflexes on handling task failures, missing requirements, and production approval gates.`,
    '',
    '---',
    baseSystemPrompt || '',
  ];

  return promptSections.filter(Boolean).join('\n');
}
