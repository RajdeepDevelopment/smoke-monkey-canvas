import json
import os

with open("scratch/build_data.py") as f:
    text = f.read()

loc = {}
exec(text, {}, loc)
chains = loc["chains"]

# 1. Generate hierarchical-chains.data.ts
chains_ts = """import type { HierarchicalChainPreset } from '../library.types.js';
import type { RoleZone } from '../../../features/space/space.types.js';

export const HIERARCHICAL_CHAINS: HierarchicalChainPreset[] = """ + json.dumps(chains, indent=2) + """;

export interface HierarchicalLayoutResult {
  zones: (Omit<RoleZone, 'id'> & { id: string; chainNodeId: string })[];
  requiredWidth: number;
  requiredHeight: number;
}

/**
 * Calculates absolute coordinates for an entire company hierarchical chain
 * so all reporting tiers form a clean top-to-bottom flowchart tree inside the space.
 */
export function layoutHierarchicalChain(
  chain: HierarchicalChainPreset,
  space: { x: number; y: number; width?: number; height?: number },
  startOffset = { x: 36, y: 70 },
  nodeDimensions = { width: 300, height: 160 },
  spacing = { horizontalGap: 36, verticalGap: 85 },
): HierarchicalLayoutResult {
  const { width: nodeW, height: nodeH } = nodeDimensions;
  const { horizontalGap: hGap, verticalGap: vGap } = spacing;

  const childrenMap = new Map<string, typeof chain.nodes>();
  const roots: typeof chain.nodes = [];
  const nodeMap = new Map<string, (typeof chain.nodes)[0]>();

  for (const n of chain.nodes) {
    nodeMap.set(n.id, n);
    childrenMap.set(n.id, []);
  }

  for (const n of chain.nodes) {
    if (n.parentId && childrenMap.has(n.parentId)) {
      childrenMap.get(n.parentId)!.push(n);
    } else {
      roots.push(n);
    }
  }

  // Calculate width of each subtree recursively
  const subtreeWidths = new Map<string, number>();
  function calculateSubtreeWidth(node: (typeof chain.nodes)[0]): number {
    const kids = childrenMap.get(node.id) || [];
    if (kids.length === 0) {
      subtreeWidths.set(node.id, nodeW);
      return nodeW;
    }
    const kidsWidth = kids.reduce((sum, kid) => sum + calculateSubtreeWidth(kid), 0) + (kids.length - 1) * hGap;
    const width = Math.max(nodeW, kidsWidth);
    subtreeWidths.set(node.id, width);
    return width;
  }

  for (const root of roots) {
    calculateSubtreeWidth(root);
  }

  // Generate unique IDs for every node so parents and children are linked
  const generatedIdMap = new Map<string, string>();
  for (const n of chain.nodes) {
    const uniqueId = `rz-${chain.id}-${n.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    generatedIdMap.set(n.id, uniqueId);
  }

  const placedZones: (Omit<RoleZone, 'id'> & { id: string; chainNodeId: string })[] = [];

  function placeNode(
    node: (typeof chain.nodes)[0],
    currentX: number,
    baseY: number,
  ) {
    const sWidth = subtreeWidths.get(node.id) || nodeW;
    const x = Math.round(currentX + (sWidth - nodeW) / 2);
    const y = Math.round(baseY + node.level * (nodeH + vGap));
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
      x,
      y,
      width: nodeW,
      height: nodeH,
      color: node.color || '#3b82f6',
      shape: 'rectangle',
    });

    const kids = childrenMap.get(node.id) || [];
    if (kids.length > 0) {
      const totalKidsWidth = kids.reduce((sum, kid) => sum + (subtreeWidths.get(kid.id) || nodeW), 0) + (kids.length - 1) * hGap;
      let kidX = currentX + (sWidth - totalKidsWidth) / 2;
      for (const kid of kids) {
        placeNode(kid, kidX, baseY);
        kidX += (subtreeWidths.get(kid.id) || nodeW) + hGap;
      }
    }
  }

  let rootX = space.x + startOffset.x;
  for (const root of roots) {
    placeNode(root, rootX, space.y + startOffset.y);
    rootX += (subtreeWidths.get(root.id) || nodeW) + hGap * 2;
  }

  // Calculate required bounding box
  const minX = Math.min(...placedZones.map((z) => z.x));
  const maxX = Math.max(...placedZones.map((z) => z.x + z.width));
  const minY = Math.min(...placedZones.map((z) => z.y));
  const maxY = Math.max(...placedZones.map((z) => z.y + z.height));

  const requiredWidth = Math.max(maxX - space.x + startOffset.x, 720);
  const requiredHeight = Math.max(maxY - space.y + startOffset.y, 520);

  return {
    zones: placedZones,
    requiredWidth,
    requiredHeight,
  };
}
"""

with open("web/src/features/library/data/hierarchical-chains.data.ts", "w") as f:
    f.write(chains_ts)

print("Wrote web/src/features/library/data/hierarchical-chains.data.ts")

# 2. Extract every node from all 11 chains to form individual RoleZonePresets
single_presets = []
seen_roles = set()

# First add all nodes from the chains with proper category and domain
for chain in chains:
    for node in chain["nodes"]:
        role_key = f"{node['roleTitle'].strip().lower()}-{chain['category'].lower()}"
        if role_key in seen_roles:
            continue
        seen_roles.add(role_key)
        preset = {
            "name": f"{node['name']} ({chain['category']})",
            "roleTitle": node["roleTitle"],
            "level": node["level"],
            "category": chain["category"],
            "description": f"{chain['name']} designation for {node['roleTitle']}. {node.get('responsibilities', '')}",
            "responsibilities": node.get("responsibilities", ""),
            "workflowInstructions": node.get("workflowInstructions", ""),
            "delegationPolicy": node.get("delegationPolicy", "auto"),
            "width": 320,
            "height": 160,
            "color": node.get("color", chain["color"]),
            "shape": "rectangle",
            "icon": chain.get("icon", "Network")
        }
        single_presets.append(preset)

print(f"Extracted {len(single_presets)} presets directly from chains.")

# Additional specialized industry presets to exceed 250+
additional_presets = [
    # AI & Machine Learning
    {"name": "Chief AI Officer", "roleTitle": "Chief AI Officer", "level": 0, "category": "AI & Data", "description": "Owns corporate AI strategy, frontier model adoption, compute allocation, and AI governance.", "responsibilities": "Lead enterprise AI transformation, oversee research scientists and safety teams.", "workflowInstructions": "Set AI roadmaps, establish ethics and safety guardrails, and audit model performance.", "delegationPolicy": "auto", "color": "#7c3aed", "icon": "Brain"},
    {"name": "AI Safety & Alignment Lead", "roleTitle": "AI Safety Lead", "level": 2, "category": "AI & Data", "description": "Audits model alignment, red-teaming, prompt injection defense, and output guardrails.", "responsibilities": "Perform red-teaming, evaluate bias/hallucination, and certify production deployments.", "workflowInstructions": "Execute automated adversarial benchmarks and block unsafe model releases.", "delegationPolicy": "both", "color": "#dc2626", "icon": "ShieldAlert"},
    {"name": "Prompt Engineer & LLM Evaluator", "roleTitle": "Prompt Engineer", "level": 3, "category": "AI & Data", "description": "Designs system prompts, few-shot contexts, tool call schemas, and evaluation benchmarks.", "responsibilities": "Craft system directives, evaluate prompt regressions, and optimize token efficiency.", "workflowInstructions": "Benchmark prompt variants against test suites and refine system instructions.", "delegationPolicy": "peers", "color": "#9333ea", "icon": "Sparkles"},
    {"name": "Vector Database Architect", "roleTitle": "Vector DB Architect", "level": 3, "category": "AI & Data", "description": "Specializes in high-dimensional embedding search, hybrid keyword-vector retrieval, and RAG indexes.", "responsibilities": "Optimize semantic search recall, chunking strategies, and HNSW index latency.", "workflowInstructions": "Benchmark retrieval precision and maintain embedding database clusters.", "delegationPolicy": "both", "color": "#0284c7", "icon": "Database"},
    {"name": "Agentic Loop Architect", "roleTitle": "Agentic Loop Architect", "level": 2, "category": "AI & Data", "description": "Designs multi-agent orchestration, state machines, tool delegation policies, and loop guards.", "responsibilities": "Architect agent loop phases, compaction policies, and supervisor-worker trees.", "workflowInstructions": "Ensure agent task convergence, prevent execution infinite loops, and audit tool safety.", "delegationPolicy": "auto", "color": "#3b82f6", "icon": "Bot"},

    # Cloud & Site Reliability
    {"name": "Site Reliability Engineering (SRE) Lead", "roleTitle": "SRE Lead", "level": 2, "category": "Engineering", "description": "Enforces error budgets, SLO/SLA monitoring, automated chaos testing, and postmortems.", "responsibilities": "Lead incident postmortems, automate self-healing infrastructure, and track availability.", "workflowInstructions": "Monitor error budgets and implement automated rollback triggers.", "delegationPolicy": "both", "color": "#ea580c", "icon": "Activity"},
    {"name": "Cloud FinOps Manager", "roleTitle": "FinOps Manager", "level": 2, "category": "Leadership", "description": "Monitors AWS/Azure/GCP cloud consumption, reserved instance utilization, and unit cost.", "responsibilities": "Identify idle cloud resources, rightsize clusters, and optimize cloud billing.", "workflowInstructions": "Publish monthly cloud cost breakdowns and set departmental budget limits.", "delegationPolicy": "both", "color": "#059669", "icon": "CircleDollarSign"},
    {"name": "Database Administrator (DBA)", "roleTitle": "Database Administrator", "level": 3, "category": "Engineering", "description": "Maintains PostgreSQL/MySQL clusters, index optimization, query tuning, and replication.", "responsibilities": "Monitor slow queries, manage read replicas, and test point-in-time disaster recovery.", "workflowInstructions": "Analyze query explain plans, optimize missing indexes, and manage backups.", "delegationPolicy": "both", "color": "#0284c7", "icon": "Database"},
    {"name": "Mobile iOS Lead", "roleTitle": "iOS Lead Engineer", "level": 3, "category": "Engineering", "description": "Owns Swift/SwiftUI mobile architecture, App Store releases, and mobile performance.", "responsibilities": "Build native iOS user experiences and manage App Store review guidelines.", "workflowInstructions": "Review iOS PRs, optimize memory foot-print, and ensure 60fps animations.", "delegationPolicy": "both", "color": "#06b6d4", "icon": "Smartphone"},
    {"name": "Mobile Android Lead", "roleTitle": "Android Lead Engineer", "level": 3, "category": "Engineering", "description": "Owns Kotlin/Jetpack Compose architecture, Play Store releases, and battery efficiency.", "responsibilities": "Build native Android features and ensure compatibility across device form-factors.", "workflowInstructions": "Review Android PRs, optimize background battery consumption, and manage Gradle builds.", "delegationPolicy": "both", "color": "#10b981", "icon": "Smartphone"},

    # Product & Agile Delivery
    {"name": "Chief Product Officer (CPO)", "roleTitle": "Chief Product Officer", "level": 0, "category": "Product", "description": "Owns total product portfolio strategy, customer retention metrics, and roadmap vision.", "responsibilities": "Lead global product management, UX research, and product marketing.", "workflowInstructions": "Align company strategic goals with user product offerings and market needs.", "delegationPolicy": "auto", "color": "#7c3aed", "icon": "Briefcase"},
    {"name": "Agile Delivery Lead / Scrum Master", "roleTitle": "Scrum Master", "level": 3, "category": "Product", "description": "Facilitates sprint planning, daily standups, backlog refinement, and blocker removal.", "responsibilities": "Track sprint velocity, remove operational team blockers, and run retrospectives.", "workflowInstructions": "Facilitate agile ceremonies, track sprint burn-down, and protect team focus.", "delegationPolicy": "peers", "color": "#8b5cf6", "icon": "Kanban"},
    {"name": "Growth Product Manager", "roleTitle": "Growth PM", "level": 2, "category": "Product", "description": "Focuses on user activation funnels, viral referral loops, conversion experiments, and onboarding.", "responsibilities": "Run continuous A/B growth experiments and optimize user time-to-value.", "workflowInstructions": "Hypothesize conversion improvements, run multivariate tests, and scale winning flows.", "delegationPolicy": "both", "color": "#f59e0b", "icon": "TrendingUp"},
    {"name": "User Experience (UX) Researcher", "roleTitle": "UX Researcher", "level": 3, "category": "Product", "description": "Conducts user interviews, usability testing, heatmaps analysis, and customer feedback loops.", "responsibilities": "Deliver qualitative and quantitative user research insights to product teams.", "workflowInstructions": "Conduct user testing sessions, synthesize pain points, and write user research reports.", "delegationPolicy": "peers", "color": "#d946ef", "icon": "Users"},

    # Security, Pen-Testing & Risk
    {"name": "Penetration Tester / Ethical Hacker", "roleTitle": "Penetration Tester", "level": 3, "category": "Security", "description": "Identifies web vulnerabilities (OWASP Top 10), network exploits, and privilege escalations.", "responsibilities": "Execute authorized red-team penetration tests and document zero-day vulnerabilities.", "workflowInstructions": "Attempt exploits in staging, write reproducible proof-of-concept reports, and verify patches.", "delegationPolicy": "both", "color": "#dc2626", "icon": "Bug"},
    {"name": "SOC Analyst (Tier 2/3)", "roleTitle": "SOC Analyst", "level": 4, "category": "Security", "description": "Monitors real-time SIEM alerts, detects credential brute-force, and investigates anomalies.", "responsibilities": "Triage security events, isolate compromised hosts, and analyze network packet pcaps.", "workflowInstructions": "Investigate security alerts, block malicious IPs, and escalate critical breaches.", "delegationPolicy": "up", "color": "#ef4444", "icon": "Shield"},
    {"name": "Data Privacy Officer (DPO)", "roleTitle": "Data Privacy Officer", "level": 2, "category": "Security", "description": "Oversees worldwide compliance with GDPR, CCPA/CPRA, and user data rights management.", "responsibilities": "Manage data retention schedules, privacy impact assessments, and consent logs.", "workflowInstructions": "Audit personal data storage, review vendor privacy agreements, and handle user data deletion requests.", "delegationPolicy": "both", "color": "#b91c1c", "icon": "Lock"},

    # Specialized Healthcare
    {"name": "Chief Medical Officer (CMO)", "roleTitle": "Chief Medical Officer", "level": 0, "category": "Healthcare", "description": "Highest clinical executive responsible for clinical excellence, medical standards, and patient safety.", "responsibilities": "Govern clinical policy across all specialties and represent the hospital on medical boards.", "workflowInstructions": "Lead medical council, enforce evidence-based clinical protocols, and evaluate doctor credentials.", "delegationPolicy": "auto", "color": "#e11d48", "icon": "Stethoscope"},
    {"name": "Chief of Surgery", "roleTitle": "Chief of Surgery", "level": 1, "category": "Healthcare", "description": "Directs operating theaters, surgical suites, sterile processing, and surgeon scheduling.", "responsibilities": "Ensure surgical safety checklists, post-op recovery outcomes, and OR efficiency.", "workflowInstructions": "Manage operating room allocations, review surgical mortality audits, and mentor surgeons.", "delegationPolicy": "auto", "color": "#be185d", "icon": "Scissors"},
    {"name": "ICU Nurse Lead", "roleTitle": "ICU Nurse Lead", "level": 3, "category": "Healthcare", "description": "Supervises intensive care life support, ventilator monitoring, and critical hemodynamic medication.", "responsibilities": "Manage critical care nursing shifts, ventilator alarms, and emergency resuscitations.", "workflowInstructions": "Coordinate intensive care protocols and communicate with attending intensivists.", "delegationPolicy": "both", "color": "#059669", "icon": "Activity"},

    # Specialized Finance & Quant
    {"name": "Chief Investment Officer (CIO)", "roleTitle": "Chief Investment Officer", "level": 0, "category": "Banking", "description": "Oversees multi-asset investment portfolios, asset allocation strategies, and market risk.", "responsibilities": "Direct asset management teams, macro economic forecasting, and portfolio returns.", "workflowInstructions": "Set strategic asset allocation weights and review quarterly portfolio performance.", "delegationPolicy": "auto", "color": "#1e3a8a", "icon": "TrendingUp"},
    {"name": "Quantitative Trading Analyst", "roleTitle": "Quant Analyst", "level": 3, "category": "Banking", "description": "Builds statistical arbitrage models, algorithmic execution strategies, and backtests.", "responsibilities": "Develop mathematical trading algorithms and analyze high-frequency market microstructure.", "workflowInstructions": "Backtest quantitative models on tick data and calibrate execution parameters.", "delegationPolicy": "both", "color": "#2563eb", "icon": "Binary"},
    {"name": "AML & Fraud Investigator", "roleTitle": "AML Investigator", "level": 3, "category": "Banking", "description": "Investigates money laundering alerts, shell company structures, and sanctions evasion.", "responsibilities": "Analyze complex transaction flows and draft Suspicious Activity Reports (SARs).", "workflowInstructions": "Examine flagged wire transfers, trace beneficiary networks, and report to authorities.", "delegationPolicy": "up", "color": "#991b1b", "icon": "Search"},

    # Specialized Legal & Corporate
    {"name": "General Counsel / Chief Legal Officer", "roleTitle": "General Counsel", "level": 1, "category": "Leadership", "description": "Manages enterprise legal affairs, intellectual property, litigation defense, and commercial contracts.", "responsibilities": "Protect company against legal liabilities, draft shareholder resolutions, and manage outside counsel.", "workflowInstructions": "Review high-stakes enterprise contracts and advise executive board on legal risks.", "delegationPolicy": "auto", "color": "#475569", "icon": "Scale"},
    {"name": "Commercial Contracts Manager", "roleTitle": "Contracts Manager", "level": 2, "category": "Leadership", "description": "Drafts Master Services Agreements (MSAs), Statements of Work (SOWs), and vendor NDAs.", "responsibilities": "Negotiate contract terms, indemnification limits, and payment schedules.", "workflowInstructions": "Review customer redlines, maintain standard contract templates, and track renewals.", "delegationPolicy": "up", "color": "#64748b", "icon": "FileText"},
]

for ap in additional_presets:
    ap["width"] = 320
    ap["height"] = 160
    ap["shape"] = "rectangle"
    single_presets.append(ap)

print(f"Total single designation presets: {len(single_presets)}")

# Write role-zones.data.ts
role_zones_ts = """import type { RoleZonePreset } from '../library.types.js';

export const ROLE_ZONE_PRESETS: RoleZonePreset[] = """ + json.dumps(single_presets, indent=2) + """;
"""

with open("web/src/features/library/data/role-zones.data.ts", "w") as f:
    f.write(role_zones_ts)

print("Wrote web/src/features/library/data/role-zones.data.ts successfully!")

extra_25 = [
    {"name": "Big Data Architect", "roleTitle": "Big Data Architect", "level": 2, "category": "AI & Data", "description": "Designs petabyte-scale distributed data lakes (Spark/Kafka/Iceberg), streaming pipelines, and schema governance.", "responsibilities": "Architect distributed compute clusters, optimize Parquet storage, and enforce data lake reliability.", "workflowInstructions": "Design streaming ingestion pipelines, monitor data pipeline latency, and review data modeling PRs.", "delegationPolicy": "auto", "color": "#0284c7", "icon": "Database"},
    {"name": "MLOps Platform Engineer", "roleTitle": "MLOps Engineer", "level": 3, "category": "AI & Data", "description": "Manages automated model training pipelines, feature stores (Feast), model registries, and canary rollouts.", "responsibilities": "Automate model retraining triggers, monitor data drift, and package models as microservices.", "workflowInstructions": "Deploy model inference containers with Kubernetes, optimize GPU allocation, and set latency alarms.", "delegationPolicy": "both", "color": "#7c3aed", "icon": "Cpu"},
    {"name": "Analytics Engineer", "roleTitle": "Analytics Engineer", "level": 3, "category": "AI & Data", "description": "Builds production dbt transformation models, tested data marts, and documented dimensional schemas.", "responsibilities": "Transform raw event streams into clean analytics marts with unit tests and documentation.", "workflowInstructions": "Write modular SQL dbt models, maintain dimensional lineage, and publish documented views.", "delegationPolicy": "peers", "color": "#38bdf8", "icon": "BarChart3"},
    {"name": "Business Intelligence (BI) Developer", "roleTitle": "BI Developer", "level": 4, "category": "AI & Data", "description": "Creates executive KPI dashboards, self-service Tableau/PowerBI semantic models, and automated alerts.", "responsibilities": "Deliver intuitive executive dashboards, calculate complex business metrics, and train business users.", "workflowInstructions": "Design dashboard visualizations, validate data accuracy against general ledgers, and automate reports.", "delegationPolicy": "up", "color": "#60a5fa", "icon": "LineChart"},
    {"name": "Natural Language Processing (NLP) Specialist", "roleTitle": "NLP Specialist", "level": 3, "category": "AI & Data", "description": "Builds specialized NER tokenizers, sentiment classification models, and embedding fine-tuning.", "responsibilities": "Fine-tune domain-specific transformer models on proprietary unstructured text corpora.", "workflowInstructions": "Benchmark F1 accuracy, optimize tokenizer vocabularies, and deploy low-latency inference services.", "delegationPolicy": "both", "color": "#8b5cf6", "icon": "FileText"},
    {"name": "Computer Vision Engineer", "roleTitle": "Computer Vision Engineer", "level": 3, "category": "AI & Data", "description": "Builds object detection (YOLO), semantic segmentation, edge camera inference, and image processing.", "responsibilities": "Train convolutional neural networks, optimize models with TensorRT, and deploy on edge devices.", "workflowInstructions": "Annotate training image sets, benchmark mAP accuracy, and optimize real-time FPS throughput.", "delegationPolicy": "both", "color": "#a855f7", "icon": "Eye"},

    # Product & Design Systems
    {"name": "Design Systems Lead", "roleTitle": "Design Systems Lead", "level": 2, "category": "Product", "description": "Owns the corporate design system, Figma component library, accessibility tokens, and style guide.", "responsibilities": "Govern cross-platform UI consistency, WCAG 2.1 AA accessibility, and token sync with code.", "workflowInstructions": "Review component contributions, maintain token documentation, and collaborate with Frontend Leads.", "delegationPolicy": "both", "color": "#d946ef", "icon": "Palette"},
    {"name": "Interaction & Motion Designer", "roleTitle": "Motion Designer", "level": 3, "category": "Product", "description": "Creates dynamic micro-interactions, canvas animation curves, transition states, and interactive prototypes.", "responsibilities": "Design intuitive motion choreography that enhances usability and delights users.", "workflowInstructions": "Prototype motion sequences, export Lottie/CSS animation parameters, and guide developers.", "delegationPolicy": "peers", "color": "#ec4899", "icon": "Sparkles"},
    {"name": "Technical Product Manager (TPM)", "roleTitle": "Technical PM", "level": 2, "category": "Product", "description": "Owns API schemas, developer documentation, backend microservice dependencies, and data flow specifications.", "responsibilities": "Translate complex technical capabilities into clear developer specifications and roadmaps.", "workflowInstructions": "Author detailed API specifications, sequence diagrams, and unblock backend engineering squads.", "delegationPolicy": "both", "color": "#6366f1", "icon": "Terminal"},
    {"name": "Release Train Engineer (RTE)", "roleTitle": "Release Train Engineer", "level": 2, "category": "Product", "description": "Coordinates multi-squad quarterly planning, dependency management, and enterprise release trains.", "responsibilities": "Facilitate program increment (PI) planning, track cross-team dependency risks, and streamline releases.", "workflowInstructions": "Maintain program boards, escalate cross-squad blockers, and report delivery predictability.", "delegationPolicy": "auto", "color": "#4f46e5", "icon": "GitFork"},

    # Infrastructure & DevOps
    {"name": "Platform Infrastructure Engineer", "roleTitle": "Platform Engineer", "level": 3, "category": "Engineering", "description": "Builds developer platform tooling, internal developer portal (Backstage), and self-service cloud templates.", "responsibilities": "Reduce developer cognitive load by providing self-service deployment blueprints.", "workflowInstructions": "Maintain Helm charts, provision automated preview environments, and optimize CI build speed.", "delegationPolicy": "both", "color": "#0284c7", "icon": "Server"},
    {"name": "DevSecOps Lead", "roleTitle": "DevSecOps Lead", "level": 2, "category": "Security", "description": "Embeds automated static (SAST), dynamic (DAST), and software composition analysis (SCA) into CI/CD.", "responsibilities": "Shift security left, scan Docker images for CVEs, and prevent secrets in git commits.", "workflowInstructions": "Configure pipeline security gates, triage dependency vulnerability alerts, and train engineers.", "delegationPolicy": "both", "color": "#b91c1c", "icon": "ShieldCheck"},
    {"name": "Chaos & Resilience Engineer", "roleTitle": "Chaos Engineer", "level": 3, "category": "Engineering", "description": "Injects deliberate network latency, pod terminations, and region failures to test system resilience.", "responsibilities": "Prove high-availability hypotheses and verify automatic failover mechanisms under stress.", "workflowInstructions": "Schedule controlled chaos experiments in staging, document failure recovery, and fix weak points.", "delegationPolicy": "both", "color": "#ea580c", "icon": "Zap"},

    # Sales & Customer Engineering
    {"name": "Chief Revenue Officer (CRO)", "roleTitle": "Chief Revenue Officer", "level": 0, "category": "Leadership", "description": "Unifies global sales, marketing acquisition, solutions architecture, and customer lifetime value.", "responsibilities": "Deliver annual recurring revenue (ARR) targets, sales compensation models, and global expansion.", "workflowInstructions": "Direct sales leadership and review quarterly revenue pacing against corporate plan.", "delegationPolicy": "auto", "color": "#047857", "icon": "DollarSign"},
    {"name": "Pre-Sales Solutions Architect", "roleTitle": "Solutions Architect", "level": 2, "category": "Engineering", "description": "Partners with sales on technical qualification, RFP architectural answers, and customer proof-of-concepts.", "responsibilities": "Demonstrate technical viability of platform architecture to client enterprise architects and CISOs.", "workflowInstructions": "Design tailored customer architecture diagrams, run technical POCs, and unblock enterprise deals.", "delegationPolicy": "both", "color": "#2563eb", "icon": "Network"},
    {"name": "Customer Success Director", "roleTitle": "Customer Success Director", "level": 1, "category": "Leadership", "description": "Ensures enterprise net revenue retention (NRR), customer health scoring, and executive sponsorship.", "responsibilities": "Prevent customer churn, identify expansion opportunities, and direct customer success managers.", "workflowInstructions": "Review account health dashboards, conduct executive escalation meetings, and drive retention.", "delegationPolicy": "auto", "color": "#059669", "icon": "Smile"},
    {"name": "Technical Account Manager (TAM)", "roleTitle": "Technical Account Manager", "level": 3, "category": "Leadership", "description": "Dedicated technical advisor for strategic enterprise accounts, leading quarterly reviews and technical guidance.", "responsibilities": "Serve as trusted technical advisor, expedite support tickets, and share best practices.", "workflowInstructions": "Run weekly customer engineering syncs, track support ticket SLAs, and advocate for customer needs.", "delegationPolicy": "both", "color": "#0891b2", "icon": "UserCheck"},

    # Healthcare Specialties
    {"name": "Clinical Pharmacologist", "roleTitle": "Clinical Pharmacologist", "level": 2, "category": "Healthcare", "description": "Analyzes drug pharmacokinetics, complex clinical dosing, and adverse drug reaction reporting.", "responsibilities": "Guide physicians on personalized medication regimens and oversee clinical trial drug management.", "workflowInstructions": "Review complex patient drug therapies, audit adverse reactions, and update clinical guidelines.", "delegationPolicy": "both", "color": "#9333ea", "icon": "Pill"},
    {"name": "Radiology Specialist", "roleTitle": "Radiologist", "level": 2, "category": "Healthcare", "description": "Interprets MRI, CT scans, ultrasound, and digital X-rays to diagnose internal pathologies.", "responsibilities": "Provide urgent radiology consultations, interpret scans with high accuracy, and write diagnostic reports.", "workflowInstructions": "Read diagnostic imaging queues, flag emergency trauma findings to surgical teams immediately.", "delegationPolicy": "both", "color": "#0284c7", "icon": "Scan"},

    # Finance Specialties
    {"name": "Algorithmic Trading Strategist", "roleTitle": "Algo Trader", "level": 2, "category": "Banking", "description": "Designs automated order routing, dark pool execution, and smart order execution algorithms.", "responsibilities": "Minimize market impact, optimize execution slippage, and monitor automated trading safety switches.", "workflowInstructions": "Calibrate execution parameters in real-time, test kill-switches, and optimize fill rates.", "delegationPolicy": "auto", "color": "#1e3a8a", "icon": "TrendingUp"},
    {"name": "Treasury Operations Lead", "roleTitle": "Treasury Lead", "level": 2, "category": "Banking", "description": "Manages overnight money market placements, interbank foreign exchange, and liquidity cushions.", "responsibilities": "Balance daily bank liquidity positions and invest surplus cash in low-risk securities.", "workflowInstructions": "Monitor intraday central bank settlement accounts and execute interbank money market transactions.", "delegationPolicy": "both", "color": "#047857", "icon": "Coins"},

    # Industrial & Logistics
    {"name": "Industrial Automation Engineer", "roleTitle": "Automation Engineer", "level": 3, "category": "Manufacturing", "description": "Programs Siemens/Allen-Bradley PLCs, SCADA visualization screens, and industrial robotic arms.", "responsibilities": "Write industrial automation logic, commission production equipment, and optimize cycle times.", "workflowInstructions": "Debug ladder logic programs, connect IoT telemetry sensors, and update electrical schematics.", "delegationPolicy": "both", "color": "#ea580c", "icon": "Cpu"},
    {"name": "Continuous Improvement (Lean) Lead", "roleTitle": "Lean Six Sigma Lead", "level": 2, "category": "Manufacturing", "description": "Leads Kaizen events, 5S workplace organization, value stream mapping, and root cause analysis.", "responsibilities": "Eliminate manufacturing muda (waste), improve first-pass yield, and train yellow/green belts.", "workflowInstructions": "Facilitate plant Kaizen workshops, track cost-saving projects, and audit 5S standards.", "delegationPolicy": "auto", "color": "#d97706", "icon": "TrendingUp"},
    {"name": "Supply Chain Network Planner", "roleTitle": "Supply Chain Planner", "level": 3, "category": "Logistics", "description": "Forecasts customer demand, plans distribution center safety stocks, and prevents supply bullwhips.", "responsibilities": "Model supply chain lead times, calculate economic order quantities (EOQ), and optimize stock.", "workflowInstructions": "Run weekly S&OP supply-demand reconciliations and issue production replenishment forecasts.", "delegationPolicy": "both", "color": "#2563eb", "icon": "Share2"}
]

for ap in extra_25:
    ap["width"] = 320
    ap["height"] = 160
    ap["shape"] = "rectangle"
    single_presets.append(ap)

print(f"Total single designation presets now: {len(single_presets)}")

# Re-write role-zones.data.ts
role_zones_ts = """import type { RoleZonePreset } from '../library.types.js';

export const ROLE_ZONE_PRESETS: RoleZonePreset[] = """ + json.dumps(single_presets, indent=2) + """;
"""

with open("web/src/features/library/data/role-zones.data.ts", "w") as f:
    f.write(role_zones_ts)

print("Updated web/src/features/library/data/role-zones.data.ts with 250+ presets!")
