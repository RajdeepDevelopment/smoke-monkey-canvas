import type { HierarchicalChainPreset } from '../library.types.js';
import type { RoleZone } from '../../../features/space/space.types.js';

export const HIERARCHICAL_CHAINS: HierarchicalChainPreset[] = [
  {
    "id": "chain-software-company",
    "name": "Software Company",
    "description": "Full end-to-end software product company org chart from Executive Board and CTO down to Engineers, QA, Product, and Sales.",
    "category": "Software",
    "domain": "Technology",
    "color": "#3b82f6",
    "icon": "Code",
    "nodes": [
      {
        "id": "sw-ceo",
        "roleTitle": "CEO",
        "name": "Chief Executive Officer",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead overarching company strategy, capital allocation, and executive alignment.",
        "workflowInstructions": "Set company vision and milestones. Delegate technology execution to CTO, operations to COO, and financials to CFO.",
        "delegationPolicy": "auto",
        "color": "#a855f7"
      },
      {
        "id": "sw-cto",
        "roleTitle": "CTO",
        "name": "Chief Technology Officer",
        "level": 1,
        "parentId": "sw-ceo",
        "responsibilities": "Own total engineering architecture, technical roadmap, and technology delivery.",
        "workflowInstructions": "Decompose executive milestones into engineering, QA, and infrastructure missions. Oversee technical managers.",
        "delegationPolicy": "auto",
        "color": "#3b82f6"
      },
      {
        "id": "sw-coo",
        "roleTitle": "COO",
        "name": "Chief Operating Officer",
        "level": 1,
        "parentId": "sw-ceo",
        "responsibilities": "Drive day-to-day business operations, product management, people ops, and sales.",
        "workflowInstructions": "Align Product, HR, and Sales with executive goals. Resolve operational blockers and monitor OKRs.",
        "delegationPolicy": "auto",
        "color": "#10b981"
      },
      {
        "id": "sw-cfo",
        "roleTitle": "CFO",
        "name": "Chief Financial Officer",
        "level": 1,
        "parentId": "sw-ceo",
        "responsibilities": "Oversee corporate finance, budgets, runway, and financial governance.",
        "workflowInstructions": "Ensure capital efficiency across engineering, cloud spend, and headcount planning.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "sw-eng-mgr",
        "roleTitle": "Engineering Manager",
        "name": "Software Engineering Management",
        "level": 2,
        "parentId": "sw-cto",
        "responsibilities": "Lead software engineering execution, squad delivery speed, and developer health.",
        "workflowInstructions": "Translate CTO directives into sprint goals. Direct Tech Leads, remove technical impediments, and report progress.",
        "delegationPolicy": "auto",
        "color": "#3b82f6"
      },
      {
        "id": "sw-qa-mgr",
        "roleTitle": "QA Manager",
        "name": "Quality Assurance Management",
        "level": 2,
        "parentId": "sw-cto",
        "responsibilities": "Lead software quality standards, automated test frameworks, and release sign-offs.",
        "workflowInstructions": "Direct QA engineers on test plans, load testing, regression sweeps, and defect triage.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "sw-devops-lead",
        "roleTitle": "DevOps Lead",
        "name": "DevOps & Infrastructure Lead",
        "level": 2,
        "parentId": "sw-cto",
        "responsibilities": "Own cloud infrastructure, CI/CD pipelines, container orchestration, and uptime.",
        "workflowInstructions": "Automate deployment environments, monitor reliability metrics, and enforce security policies.",
        "delegationPolicy": "auto",
        "color": "#ec4899"
      },
      {
        "id": "sw-tech-lead",
        "roleTitle": "Tech Lead",
        "name": "Core Technical Lead",
        "level": 3,
        "parentId": "sw-eng-mgr",
        "responsibilities": "Own squad architecture, code reviews, technical specifications, and implementation quality.",
        "workflowInstructions": "Receive sprint tickets from Engineering Manager. Divide tasks among Senior and Junior Developers and review code.",
        "delegationPolicy": "auto",
        "color": "#6366f1"
      },
      {
        "id": "sw-sr-dev",
        "roleTitle": "Senior Developer",
        "name": "Senior Software Engineer",
        "level": 4,
        "parentId": "sw-tech-lead",
        "responsibilities": "Implement core system architecture, complex business logic, and mentor developers.",
        "workflowInstructions": "Deliver production-grade code, unit tests, and documentation. Guide software engineers.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "sw-se",
        "roleTitle": "Software Engineer",
        "name": "Full-Stack Software Engineer",
        "level": 5,
        "parentId": "sw-sr-dev",
        "responsibilities": "Build feature components, REST APIs, and database migrations with automated tests.",
        "workflowInstructions": "Execute assigned user stories, write automated unit tests, and submit PRs for code review.",
        "delegationPolicy": "peers",
        "color": "#38bdf8"
      },
      {
        "id": "sw-jr-dev",
        "roleTitle": "Junior Developer",
        "name": "Associate Developer",
        "level": 5,
        "parentId": "sw-sr-dev",
        "responsibilities": "Implement bug fixes, UI tweaks, test suites, and documentation updates.",
        "workflowInstructions": "Follow team coding standards, implement scoped tasks, and seek guidance from Senior Developers.",
        "delegationPolicy": "up",
        "color": "#94a3b8"
      },
      {
        "id": "sw-qa-eng",
        "roleTitle": "QA Engineer",
        "name": "Quality & Test Automation Engineer",
        "level": 3,
        "parentId": "sw-qa-mgr",
        "responsibilities": "Write automated end-to-end tests, execute regression tests, and catch defects early.",
        "workflowInstructions": "Test deployed PRs in staging, file detailed bug tickets, and provide release verification logs.",
        "delegationPolicy": "both",
        "color": "#14b8a6"
      },
      {
        "id": "sw-devops-eng",
        "roleTitle": "DevOps Engineer",
        "name": "Site Reliability & Cloud Engineer",
        "level": 3,
        "parentId": "sw-devops-lead",
        "responsibilities": "Manage Kubernetes clusters, Terraform configs, Docker images, and monitoring alerts.",
        "workflowInstructions": "Provision infrastructure as code, optimize build pipelines, and troubleshoot staging/prod issues.",
        "delegationPolicy": "both",
        "color": "#f43f5e"
      },
      {
        "id": "sw-pm",
        "roleTitle": "Product Manager",
        "name": "Product Management",
        "level": 2,
        "parentId": "sw-coo",
        "responsibilities": "Define product vision, user requirements, user stories, and delivery priorities.",
        "workflowInstructions": "Synthesize user feedback into functional specifications and work closely with Tech Leads and Designers.",
        "delegationPolicy": "auto",
        "color": "#8b5cf6"
      },
      {
        "id": "sw-designer",
        "roleTitle": "Product Designer",
        "name": "UI/UX & Product Design",
        "level": 3,
        "parentId": "sw-pm",
        "responsibilities": "Create wireframes, high-fidelity prototypes, user journey maps, and design systems.",
        "workflowInstructions": "Deliver polished design specs and design tokens to Frontend Engineers.",
        "delegationPolicy": "peers",
        "color": "#d946ef"
      },
      {
        "id": "sw-hr-mgr",
        "roleTitle": "HR Manager",
        "name": "People Operations & HR",
        "level": 2,
        "parentId": "sw-coo",
        "responsibilities": "Oversee talent acquisition, team onboarding, culture, and compliance.",
        "workflowInstructions": "Manage recruitment pipeline and team well-being across all departments.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "sw-sales-mgr",
        "roleTitle": "Sales Manager",
        "name": "Enterprise Sales Management",
        "level": 2,
        "parentId": "sw-coo",
        "responsibilities": "Drive customer pipeline, enterprise revenue deals, and market expansion.",
        "workflowInstructions": "Direct sales executives, handle enterprise client proposals, and meet revenue targets.",
        "delegationPolicy": "auto",
        "color": "#f59e0b"
      },
      {
        "id": "sw-sales-exec",
        "roleTitle": "Sales Executive",
        "name": "Account & Sales Representative",
        "level": 3,
        "parentId": "sw-sales-mgr",
        "responsibilities": "Qualify leads, conduct software demos, and close sales opportunities.",
        "workflowInstructions": "Execute outreach campaigns, present product demonstrations, and manage CRM pipeline.",
        "delegationPolicy": "up",
        "color": "#fbbf24"
      }
    ]
  },
  {
    "id": "chain-hospital-org",
    "name": "Hospital & Healthcare",
    "description": "Comprehensive hospital governance structure connecting Medical Directorate, Clinical Departments, Nursing, Pharmacy, Labs, and Administration.",
    "category": "Healthcare",
    "domain": "Hospital",
    "color": "#e11d48",
    "icon": "HeartPulse",
    "nodes": [
      {
        "id": "hosp-dir",
        "roleTitle": "Hospital Director",
        "name": "Chief Hospital Director",
        "level": 0,
        "parentId": null,
        "responsibilities": "Accountable for clinical governance, patient care standards, hospital safety, and operational excellence.",
        "workflowInstructions": "Oversee clinical and administrative branches. Enforce medical ethics and quality accreditations.",
        "delegationPolicy": "auto",
        "color": "#e11d48"
      },
      {
        "id": "hosp-med-dir",
        "roleTitle": "Medical Director",
        "name": "Director of Medical Services",
        "level": 1,
        "parentId": "hosp-dir",
        "responsibilities": "Direct medical practice, clinical protocols, physician credentialing, and departmental chiefs.",
        "workflowInstructions": "Supervise clinical heads of department. Monitor patient outcomes, infection control, and clinical audits.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "hosp-admin",
        "roleTitle": "Hospital Administrator",
        "name": "Chief Administrative Officer",
        "level": 1,
        "parentId": "hosp-dir",
        "responsibilities": "Oversee non-clinical operations including pharmacy, pathology, finance, facilities, and HR.",
        "workflowInstructions": "Ensure smooth hospital logistics, regulatory compliance, and support services for clinical teams.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "hosp-hod",
        "roleTitle": "Head of Departments",
        "name": "Clinical Department Head",
        "level": 2,
        "parentId": "hosp-med-dir",
        "responsibilities": "Lead specialty medical departments (Surgery, Medicine, Pediatrics, Cardiology, Emergency).",
        "workflowInstructions": "Coordinate attending doctors and nursing leadership. Review critical cases and duty rosters.",
        "delegationPolicy": "auto",
        "color": "#2563eb"
      },
      {
        "id": "hosp-sr-doc",
        "roleTitle": "Senior Doctor",
        "name": "Senior Consultant Physician / Surgeon",
        "level": 3,
        "parentId": "hosp-hod",
        "responsibilities": "Conduct complex surgeries, diagnose critical conditions, and supervise resident physicians.",
        "workflowInstructions": "Lead clinical rounds, approve patient treatment plans, and mentor resident doctors.",
        "delegationPolicy": "auto",
        "color": "#3b82f6"
      },
      {
        "id": "hosp-res-doc",
        "roleTitle": "Resident Doctor",
        "name": "Resident Medical Officer",
        "level": 4,
        "parentId": "hosp-sr-doc",
        "responsibilities": "Provide direct ward patient care, order investigations, and respond to acute clinical changes.",
        "workflowInstructions": "Conduct patient examinations, document daily clinical notes, and manage inpatient admissions.",
        "delegationPolicy": "both",
        "color": "#0ea5e9"
      },
      {
        "id": "hosp-jr-doc",
        "roleTitle": "Junior Doctor",
        "name": "Junior Medical Resident / Intern",
        "level": 5,
        "parentId": "hosp-sr-doc",
        "responsibilities": "Assist in procedures, record patient history, perform blood draws, and update treatment charts.",
        "workflowInstructions": "Execute clinical tasks assigned by Senior and Resident doctors. Report status on ward rounds.",
        "delegationPolicy": "up",
        "color": "#67e8f9"
      },
      {
        "id": "hosp-head-nurse",
        "roleTitle": "Head Nurse",
        "name": "Nursing Superintendent / Ward Head",
        "level": 3,
        "parentId": "hosp-hod",
        "responsibilities": "Direct ward nursing staff, patient medication rounds, and bed occupancy coordination.",
        "workflowInstructions": "Supervise nursing shift handovers, medical supply readiness, and patient vital monitoring.",
        "delegationPolicy": "auto",
        "color": "#10b981"
      },
      {
        "id": "hosp-staff-nurse",
        "roleTitle": "Staff Nurse",
        "name": "Registered Staff Nurse",
        "level": 4,
        "parentId": "hosp-head-nurse",
        "responsibilities": "Administer IVs and medications, monitor patient vitals, and assist physicians in bedside care.",
        "workflowInstructions": "Execute physician orders, maintain accurate nursing charts, and comfort patients and families.",
        "delegationPolicy": "both",
        "color": "#34d399"
      },
      {
        "id": "hosp-nurse-asst",
        "roleTitle": "Nursing Assistant",
        "name": "Clinical Care Assistant",
        "level": 5,
        "parentId": "hosp-head-nurse",
        "responsibilities": "Assist patients with mobility, hygiene, patient transfers, and ward comfort.",
        "workflowInstructions": "Support staff nurses with vital checks, linen changes, and patient transport.",
        "delegationPolicy": "up",
        "color": "#6ee7b7"
      },
      {
        "id": "hosp-pharm-mgr",
        "roleTitle": "Pharmacy Manager",
        "name": "Chief Pharmacist / Pharmacy Head",
        "level": 2,
        "parentId": "hosp-admin",
        "responsibilities": "Ensure safe pharmaceutical inventory, drug formulary adherence, and prescription dispensing.",
        "workflowInstructions": "Manage pharmacy staff, track controlled drug registers, and prevent medication stockouts.",
        "delegationPolicy": "auto",
        "color": "#8b5cf6"
      },
      {
        "id": "hosp-pharmacist",
        "roleTitle": "Pharmacist",
        "name": "Hospital Dispensing Pharmacist",
        "level": 3,
        "parentId": "hosp-pharm-mgr",
        "responsibilities": "Verify doctor prescriptions for drug interactions, dose accuracy, and dispense medications.",
        "workflowInstructions": "Dispense prescribed medications, counsel patients, and monitor inpatient medication kits.",
        "delegationPolicy": "both",
        "color": "#a855f7"
      },
      {
        "id": "hosp-lab-mgr",
        "roleTitle": "Lab Manager",
        "name": "Pathology & Diagnostic Lab Manager",
        "level": 2,
        "parentId": "hosp-admin",
        "responsibilities": "Oversee laboratory testing operations, diagnostic calibration, and turnaround quality.",
        "workflowInstructions": "Ensure diagnostic accuracy across biochemistry, hematology, microbiology, and pathology.",
        "delegationPolicy": "auto",
        "color": "#d946ef"
      },
      {
        "id": "hosp-lab-tech",
        "roleTitle": "Lab Technician",
        "name": "Medical Laboratory Technician",
        "level": 3,
        "parentId": "hosp-lab-mgr",
        "responsibilities": "Process blood, tissue, and fluid samples using automated analyzers and report verified results.",
        "workflowInstructions": "Analyze specimens, flag critical emergency values immediately, and upload lab reports.",
        "delegationPolicy": "up",
        "color": "#f472b6"
      },
      {
        "id": "hosp-fin-mgr",
        "roleTitle": "Finance Manager",
        "name": "Hospital Billing & Finance Head",
        "level": 2,
        "parentId": "hosp-admin",
        "responsibilities": "Manage insurance claims, billing accuracy, patient revenue cycle, and financial audits.",
        "workflowInstructions": "Process cashless insurance claims, handle billing queries, and audit department expenses.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "hosp-hr-mgr",
        "roleTitle": "HR Manager",
        "name": "Hospital Human Resources",
        "level": 2,
        "parentId": "hosp-admin",
        "responsibilities": "Handle medical credentialing, nursing recruitment, shift scheduling, and staff retention.",
        "workflowInstructions": "Maintain medical licensing compliance and staff welfare programs.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "hosp-fac-mgr",
        "roleTitle": "Facilities Manager",
        "name": "Biomedical & Facilities Manager",
        "level": 2,
        "parentId": "hosp-admin",
        "responsibilities": "Maintain critical medical gas supplies, ICU backup power, HVAC sterilization, and hygiene.",
        "workflowInstructions": "Conduct routine biomedical equipment maintenance and environmental disinfection sweeps.",
        "delegationPolicy": "up",
        "color": "#64748b"
      }
    ]
  },
  {
    "id": "chain-banking-org",
    "name": "Banking Company",
    "description": "Enterprise banking institution structure covering Operations, Retail Branches, Credit Risk, Accounts, and Core Financial IT.",
    "category": "Banking",
    "domain": "Finance",
    "color": "#1e3a8a",
    "icon": "Landmark",
    "nodes": [
      {
        "id": "bank-ceo",
        "roleTitle": "Managing Director / CEO",
        "name": "Managing Director & CEO",
        "level": 0,
        "parentId": null,
        "responsibilities": "Accountable to the board for capital adequacy, regulatory standing, fiduciary trust, and institutional health.",
        "workflowInstructions": "Direct executive chiefs across operations, risk, finance, and credit to ensure prudential safety and growth.",
        "delegationPolicy": "auto",
        "color": "#1e3a8a"
      },
      {
        "id": "bank-coo",
        "roleTitle": "Chief Operating Officer",
        "name": "Chief Operating Officer",
        "level": 1,
        "parentId": "bank-ceo",
        "responsibilities": "Direct retail branch operations, payment clearing, customer service, and core banking systems.",
        "workflowInstructions": "Oversee branch network managers and IT operations. Enforce service level agreements and operational resilience.",
        "delegationPolicy": "auto",
        "color": "#0369a1"
      },
      {
        "id": "bank-cfo",
        "roleTitle": "Chief Financial Officer",
        "name": "Chief Financial Officer",
        "level": 1,
        "parentId": "bank-ceo",
        "responsibilities": "Manage bank liquidity, treasury operations, statutory reporting, and capital reserves.",
        "workflowInstructions": "Supervise accounting and treasury departments. Monitor Basel III capital ratios and financial audits.",
        "delegationPolicy": "auto",
        "color": "#047857"
      },
      {
        "id": "bank-cro",
        "roleTitle": "Chief Risk Officer",
        "name": "Chief Risk & Compliance Officer",
        "level": 1,
        "parentId": "bank-ceo",
        "responsibilities": "Lead enterprise risk governance, credit risk underwriting, AML/KYC compliance, and fraud prevention.",
        "workflowInstructions": "Establish risk tolerance boundaries, audit loan approvals, and liaise with central bank regulators.",
        "delegationPolicy": "auto",
        "color": "#b91c1c"
      },
      {
        "id": "bank-branch-mgr",
        "roleTitle": "Branch Manager",
        "name": "Retail Branch Manager",
        "level": 2,
        "parentId": "bank-coo",
        "responsibilities": "Lead branch retail banking operations, customer deposit growth, and cash security.",
        "workflowInstructions": "Supervise branch teams, audit daily cash reconciliations, and resolve high-value client issues.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "bank-asst-mgr",
        "roleTitle": "Assistant Branch Manager",
        "name": "Assistant Branch Manager",
        "level": 3,
        "parentId": "bank-branch-mgr",
        "responsibilities": "Manage daily branch floor operations, customer queues, and relationship managers.",
        "workflowInstructions": "Authorize teller override transactions, manage staff duty rotas, and escalate service exceptions.",
        "delegationPolicy": "auto",
        "color": "#38bdf8"
      },
      {
        "id": "bank-rel-mgr",
        "roleTitle": "Relationship Manager",
        "name": "Personal & Wealth Relationship Manager",
        "level": 4,
        "parentId": "bank-asst-mgr",
        "responsibilities": "Manage portfolios of high-net-worth clients, cross-sell investment and loan products, and ensure retention.",
        "workflowInstructions": "Advise retail clients, prepare credit applications, and coordinate with banking officers.",
        "delegationPolicy": "both",
        "color": "#7dd3fc"
      },
      {
        "id": "bank-officer",
        "roleTitle": "Banking Officer",
        "name": "General Banking Officer",
        "level": 5,
        "parentId": "bank-rel-mgr",
        "responsibilities": "Open new accounts, process wire transfers, check clearances, and handle customer service requests.",
        "workflowInstructions": "Execute customer banking requests in core banking system following KYC guidelines.",
        "delegationPolicy": "peers",
        "color": "#bae6fd"
      },
      {
        "id": "bank-cust-exec",
        "roleTitle": "Customer Service Executive",
        "name": "Customer Service Desk Executive",
        "level": 5,
        "parentId": "bank-rel-mgr",
        "responsibilities": "Handle customer inquiries, issue debit cards, update account details, and resolve service issues.",
        "workflowInstructions": "Deliver prompt branch customer service, log customer feedback, and assist self-service kiosks.",
        "delegationPolicy": "up",
        "color": "#38bdf8"
      },
      {
        "id": "bank-cash-mgr",
        "roleTitle": "Cash Operations Manager",
        "name": "Head Cashier / Vault Manager",
        "level": 3,
        "parentId": "bank-branch-mgr",
        "responsibilities": "Safeguard branch vault cash, manage ATM replenishments, and balance daily currency registers.",
        "workflowInstructions": "Oversee teller drawer cash limits, perform surprise vault counts, and coordinate armored transport.",
        "delegationPolicy": "auto",
        "color": "#f59e0b"
      },
      {
        "id": "bank-teller",
        "roleTitle": "Cashier / Teller",
        "name": "Counter Cashier & Teller",
        "level": 4,
        "parentId": "bank-cash-mgr",
        "responsibilities": "Process cash deposits, currency withdrawals, cashier checks, and foreign exchange.",
        "workflowInstructions": "Count currency accurately, verify signatures and counterfeit marks, and balance drawer daily.",
        "delegationPolicy": "up",
        "color": "#fbbf24"
      },
      {
        "id": "bank-credit-mgr",
        "roleTitle": "Credit Manager",
        "name": "Head of Credit Underwriting",
        "level": 2,
        "parentId": "bank-cro",
        "responsibilities": "Evaluate commercial and personal loan portfolios, collateral values, and debt-service ratios.",
        "workflowInstructions": "Approve or decline credit recommendations based on bank credit policy and risk appetite.",
        "delegationPolicy": "auto",
        "color": "#dc2626"
      },
      {
        "id": "bank-credit-analyst",
        "roleTitle": "Credit Analyst",
        "name": "Senior Credit Risk Analyst",
        "level": 3,
        "parentId": "bank-credit-mgr",
        "responsibilities": "Analyze financial statements, cash flows, and credit bureau scores of loan applicants.",
        "workflowInstructions": "Prepare credit appraisal memos and calculate risk-adjusted capital pricing for loan officers.",
        "delegationPolicy": "up",
        "color": "#ef4444"
      },
      {
        "id": "bank-comp-officer",
        "roleTitle": "Compliance Officer",
        "name": "AML & Regulatory Compliance Officer",
        "level": 2,
        "parentId": "bank-cro",
        "responsibilities": "Monitor suspicious transaction reports (STRs), sanction lists, and central bank regulations.",
        "workflowInstructions": "Investigate AML alerts, audit KYC onboarding documentation, and file regulatory filings.",
        "delegationPolicy": "up",
        "color": "#991b1b"
      },
      {
        "id": "bank-accts-mgr",
        "roleTitle": "Accounts Manager",
        "name": "Financial Accounting Manager",
        "level": 2,
        "parentId": "bank-cfo",
        "responsibilities": "Maintain general ledger integrity, interbank reconciliations, and tax compliance.",
        "workflowInstructions": "Reconcile daily balance sheets and prepare quarterly financial statements for audit.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "bank-accountant",
        "roleTitle": "Accountant",
        "name": "Senior Bank Accountant",
        "level": 3,
        "parentId": "bank-accts-mgr",
        "responsibilities": "Post journal entries, reconcile clearing house settlements, and audit expense vouchers.",
        "workflowInstructions": "Process automated ledger batch runs and flag settlement discrepancies.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "bank-it-mgr",
        "roleTitle": "IT Manager",
        "name": "Core Banking IT Manager",
        "level": 2,
        "parentId": "bank-coo",
        "responsibilities": "Ensure 99.999% uptime for core banking, ATM switch networks, mobile banking, and security.",
        "workflowInstructions": "Oversee database administrators, network engineers, and core banking system deployments.",
        "delegationPolicy": "auto",
        "color": "#6366f1"
      },
      {
        "id": "bank-it-eng",
        "roleTitle": "IT Support Engineer",
        "name": "Systems & Network Support Engineer",
        "level": 3,
        "parentId": "bank-it-mgr",
        "responsibilities": "Maintain branch hardware, local network switches, VPN connections, and teller terminals.",
        "workflowInstructions": "Troubleshoot workstation and printer connectivity and enforce desktop security configurations.",
        "delegationPolicy": "up",
        "color": "#818cf8"
      }
    ]
  },
  {
    "id": "chain-school-education-org",
    "name": "School & Educational Institution",
    "description": "Educational governance structure connecting Directorate, Principal, Academic Coordinators, Faculty, Examination, and Student Affairs.",
    "category": "Education",
    "domain": "Education",
    "color": "#4338ca",
    "icon": "GraduationCap",
    "nodes": [
      {
        "id": "edu-chair",
        "roleTitle": "Chairperson / Director",
        "name": "Chairperson of Board / Director",
        "level": 0,
        "parentId": null,
        "responsibilities": "Provide institutional vision, board governance, academic charter, and long-term endowment growth.",
        "workflowInstructions": "Hold Principal accountable for academic results, institutional reputation, and accreditation compliance.",
        "delegationPolicy": "auto",
        "color": "#4338ca"
      },
      {
        "id": "edu-principal",
        "roleTitle": "Principal",
        "name": "School Principal / Head of School",
        "level": 1,
        "parentId": "edu-chair",
        "responsibilities": "Lead academic quality, faculty management, pedagogical vision, and student discipline.",
        "workflowInstructions": "Oversee Vice Principal, Administration, Student Affairs, and IT. Review examination outcomes and faculty reviews.",
        "delegationPolicy": "auto",
        "color": "#4f46e5"
      },
      {
        "id": "edu-vp",
        "roleTitle": "Vice Principal",
        "name": "Vice Principal / Dean of Academics",
        "level": 2,
        "parentId": "edu-principal",
        "responsibilities": "Manage day-to-day academic schedules, curriculum delivery, and teacher evaluation.",
        "workflowInstructions": "Direct Academic Coordinators and Examination Controller. Supervise teacher lesson plans and parent relations.",
        "delegationPolicy": "auto",
        "color": "#6366f1"
      },
      {
        "id": "edu-acad-coord",
        "roleTitle": "Academic Coordinator",
        "name": "Curriculum & Academic Coordinator",
        "level": 3,
        "parentId": "edu-vp",
        "responsibilities": "Coordinate syllabus progress, interdisciplinary curriculum, and teaching methodology.",
        "workflowInstructions": "Meet weekly with Department Heads to review curriculum coverage and classroom assessments.",
        "delegationPolicy": "auto",
        "color": "#818cf8"
      },
      {
        "id": "edu-dept-head",
        "roleTitle": "Department Head",
        "name": "Academic Department Head (Science/Math/Lang)",
        "level": 4,
        "parentId": "edu-acad-coord",
        "responsibilities": "Lead subject faculty, lab practicals, textbook selection, and pedagogical standards.",
        "workflowInstructions": "Mentor teachers, conduct peer observations, and ensure alignment with board examinations.",
        "delegationPolicy": "auto",
        "color": "#a5b4fc"
      },
      {
        "id": "edu-sr-teacher",
        "roleTitle": "Senior Teacher",
        "name": "Senior Subject Faculty / Lecturer",
        "level": 5,
        "parentId": "edu-dept-head",
        "responsibilities": "Teach advanced courses, prepare students for competitive exams, and design exams.",
        "workflowInstructions": "Deliver engaging lectures, evaluate student papers, and mentor junior faculty members.",
        "delegationPolicy": "both",
        "color": "#2563eb"
      },
      {
        "id": "edu-teacher",
        "roleTitle": "Teacher",
        "name": "Classroom Teacher / Instructor",
        "level": 6,
        "parentId": "edu-sr-teacher",
        "responsibilities": "Deliver daily lesson plans, track student academic performance, and maintain attendance.",
        "workflowInstructions": "Conduct classes, grade assignments, hold office hours, and communicate with parents.",
        "delegationPolicy": "peers",
        "color": "#3b82f6"
      },
      {
        "id": "edu-asst-teacher",
        "roleTitle": "Assistant Teacher",
        "name": "Assistant Teacher / Teaching Aide",
        "level": 6,
        "parentId": "edu-sr-teacher",
        "responsibilities": "Assist with classroom materials, grading support, and small-group student tutoring.",
        "workflowInstructions": "Support senior teachers during demonstrations, organize handouts, and supervise study halls.",
        "delegationPolicy": "up",
        "color": "#93c5fd"
      },
      {
        "id": "edu-exam-ctrl",
        "roleTitle": "Examination Controller",
        "name": "Controller of Examinations",
        "level": 3,
        "parentId": "edu-vp",
        "responsibilities": "Oversee examination confidentiality, question paper generation, grading schedules, and report cards.",
        "workflowInstructions": "Supervise exam schedules, enforce anti-cheating protocols, and publish verified grade sheets.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "edu-exam-coord",
        "roleTitle": "Exam Coordinator",
        "name": "Assessment & Testing Coordinator",
        "level": 4,
        "parentId": "edu-exam-ctrl",
        "responsibilities": "Print secure question papers, assign exam proctors, and organize evaluation centers.",
        "workflowInstructions": "Manage examination hall logistics, collect answer booklets, and verify tabulation marks.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "edu-admin-officer",
        "roleTitle": "Administrative Officer",
        "name": "Chief Administrative Officer",
        "level": 2,
        "parentId": "edu-principal",
        "responsibilities": "Manage campus facilities, vendor contracts, transport fleet, fee collection, and office staff.",
        "workflowInstructions": "Supervise front office, billing counter, and admissions teams. Ensure safe campus logistics.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "edu-office-staff",
        "roleTitle": "Office Staff",
        "name": "School Registrar & Office Assistant",
        "level": 3,
        "parentId": "edu-admin-officer",
        "responsibilities": "Maintain student records, process enrollment verifications, and manage administrative inquiries.",
        "workflowInstructions": "Issue transfer certificates, manage student dossiers, and archive academic records.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "edu-admissions",
        "roleTitle": "Admissions Officer",
        "name": "Admissions & Outreach Counselor",
        "level": 3,
        "parentId": "edu-admin-officer",
        "responsibilities": "Conduct campus tours, evaluate applicant documentation, and manage admissions cycles.",
        "workflowInstructions": "Engage prospective families, administer entrance tests, and coordinate admission offers.",
        "delegationPolicy": "up",
        "color": "#34d399"
      },
      {
        "id": "edu-student-head",
        "roleTitle": "Student Affairs Head",
        "name": "Dean of Students / Student Affairs Head",
        "level": 2,
        "parentId": "edu-principal",
        "responsibilities": "Lead student welfare, extracurricular clubs, counseling services, and code of conduct.",
        "workflowInstructions": "Coordinate student council, organize campus sports/cultural events, and address bullying reports.",
        "delegationPolicy": "auto",
        "color": "#0891b2"
      },
      {
        "id": "edu-counselor",
        "roleTitle": "Counselor",
        "name": "School Psychologist & Guidance Counselor",
        "level": 3,
        "parentId": "edu-student-head",
        "responsibilities": "Provide confidential mental health support, career counseling, and university application guidance.",
        "workflowInstructions": "Conduct student counseling sessions, support neurodivergent learners, and write recommendation letters.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "edu-it-admin",
        "roleTitle": "IT Administrator",
        "name": "Campus IT Systems Administrator",
        "level": 2,
        "parentId": "edu-principal",
        "responsibilities": "Manage student LMS (Canvas/Blackboard), computer labs, campus Wi-Fi, and cybersecurity.",
        "workflowInstructions": "Maintain digital smartboards, reset student/faculty credentials, and safeguard student data.",
        "delegationPolicy": "auto",
        "color": "#7c3aed"
      },
      {
        "id": "edu-it-staff",
        "roleTitle": "IT Support Staff",
        "name": "Computer Lab & Helpdesk Technician",
        "level": 3,
        "parentId": "edu-it-admin",
        "responsibilities": "Support computer labs, troubleshoot classroom AV projectors, and maintain printer fleets.",
        "workflowInstructions": "Provide immediate classroom tech support and maintain lab computer operating images.",
        "delegationPolicy": "up",
        "color": "#8b5cf6"
      }
    ]
  },
  {
    "id": "chain-manufacturing-org",
    "name": "Manufacturing & Industrial Plant",
    "description": "Industrial production facility hierarchy from CEO and Plant Manager down to Production, QC, Maintenance, Warehouse, and Plant Safety.",
    "category": "Manufacturing",
    "domain": "Manufacturing",
    "color": "#ea580c",
    "icon": "Factory",
    "nodes": [
      {
        "id": "mfg-ceo",
        "roleTitle": "CEO",
        "name": "Chief Executive Officer",
        "level": 0,
        "parentId": null,
        "responsibilities": "Drive manufacturing output, customer delivery commitments, unit economics, and safety culture.",
        "workflowInstructions": "Direct Plant Manager, Supply Chain Director, and Finance. Enforce zero-harm industrial safety.",
        "delegationPolicy": "auto",
        "color": "#1e293b"
      },
      {
        "id": "mfg-plant-mgr",
        "roleTitle": "Plant Manager",
        "name": "General Plant Manager",
        "level": 1,
        "parentId": "mfg-ceo",
        "responsibilities": "Oversee factory operations, overall equipment effectiveness (OEE), scrap reduction, and production yields.",
        "workflowInstructions": "Supervise Production, QC, and Maintenance managers. Drive Lean Six Sigma efficiency programs.",
        "delegationPolicy": "auto",
        "color": "#ea580c"
      },
      {
        "id": "mfg-supply-dir",
        "roleTitle": "Supply Chain Director",
        "name": "Director of Supply Chain & Materials",
        "level": 1,
        "parentId": "mfg-ceo",
        "responsibilities": "Own raw material sourcing, supplier lead times, inventory turns, and warehouse logistics.",
        "workflowInstructions": "Supervise Procurement and Warehouse managers. Prevent raw material stockouts on active assembly lines.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "mfg-fin-mgr",
        "roleTitle": "Finance Manager",
        "name": "Plant Controller & Cost Accountant",
        "level": 1,
        "parentId": "mfg-ceo",
        "responsibilities": "Track standard product costing, scrap variance, capital expenditure, and payroll.",
        "workflowInstructions": "Report bill-of-materials (BOM) cost variances and monitor manufacturing overhead expenses.",
        "delegationPolicy": "up",
        "color": "#059669"
      },
      {
        "id": "mfg-prod-mgr",
        "roleTitle": "Production Manager",
        "name": "Industrial Production Manager",
        "level": 2,
        "parentId": "mfg-plant-mgr",
        "responsibilities": "Deliver daily shift production quotas across all assembly lines, machining cells, and finishing.",
        "workflowInstructions": "Schedule production shifts, monitor hourly line rate dashboards, and remove bottlenecks.",
        "delegationPolicy": "auto",
        "color": "#f97316"
      },
      {
        "id": "mfg-prod-sup",
        "roleTitle": "Production Supervisor",
        "name": "Shift Floor Supervisor",
        "level": 3,
        "parentId": "mfg-prod-mgr",
        "responsibilities": "Direct shop floor team of machine operators and assemblers. Enforce standard operating procedures (SOPs).",
        "workflowInstructions": "Conduct shift startup safety huddles, assign workstations, and track line changeovers.",
        "delegationPolicy": "auto",
        "color": "#fb923c"
      },
      {
        "id": "mfg-mach-op",
        "roleTitle": "Machine Operator",
        "name": "CNC / Machine Tool Operator",
        "level": 4,
        "parentId": "mfg-prod-sup",
        "responsibilities": "Operate automated CNC, pressing, stamping, or injection molding machinery according to job sheets.",
        "workflowInstructions": "Load raw stock, verify machine parameters, check first-piece dimensions, and report tool wear.",
        "delegationPolicy": "both",
        "color": "#fdba74"
      },
      {
        "id": "mfg-assem-wkr",
        "roleTitle": "Assembly Worker",
        "name": "Line Assembly Specialist",
        "level": 4,
        "parentId": "mfg-prod-sup",
        "responsibilities": "Assemble components into finished products using precision pneumatic and hand tools.",
        "workflowInstructions": "Follow assembly work instructions, inspect components before installation, and pass to next station.",
        "delegationPolicy": "up",
        "color": "#fed7aa"
      },
      {
        "id": "mfg-qc-mgr",
        "roleTitle": "Quality Control Manager",
        "name": "Quality Assurance & QC Manager",
        "level": 2,
        "parentId": "mfg-plant-mgr",
        "responsibilities": "Ensure ISO 9001 compliance, statistical process control (SPC), and non-conformance quarantine.",
        "workflowInstructions": "Direct quality inspectors, manage calibration standards, and lead customer audit inspections.",
        "delegationPolicy": "auto",
        "color": "#0891b2"
      },
      {
        "id": "mfg-qc-insp",
        "roleTitle": "Quality Inspector",
        "name": "Receiving & In-Process Quality Inspector",
        "level": 3,
        "parentId": "mfg-qc-mgr",
        "responsibilities": "Inspect parts using calipers, micrometers, and CMM machines. Log defect trends.",
        "workflowInstructions": "Perform in-process audits, quarantine out-of-spec batches, and issue non-conformance reports.",
        "delegationPolicy": "up",
        "color": "#06b6d4"
      },
      {
        "id": "mfg-maint-mgr",
        "roleTitle": "Maintenance Manager",
        "name": "Plant Engineering & Maintenance Head",
        "level": 2,
        "parentId": "mfg-plant-mgr",
        "responsibilities": "Lead total productive maintenance (TPM), predictive vibration analysis, and spare parts management.",
        "workflowInstructions": "Schedule preventative maintenance shutdowns, direct technicians, and minimize unplanned downtime.",
        "delegationPolicy": "auto",
        "color": "#475569"
      },
      {
        "id": "mfg-maint-eng",
        "roleTitle": "Maintenance Engineer",
        "name": "Electrical & Mechanical Systems Engineer",
        "level": 3,
        "parentId": "mfg-maint-mgr",
        "responsibilities": "Diagnose PLC faults, hydraulic failures, motor drives, and robotic arm breakdowns.",
        "workflowInstructions": "Troubleshoot electrical schematics, restore halted production lines, and document root causes.",
        "delegationPolicy": "both",
        "color": "#64748b"
      },
      {
        "id": "mfg-technician",
        "roleTitle": "Technician",
        "name": "Industrial Maintenance Technician",
        "level": 4,
        "parentId": "mfg-maint-mgr",
        "responsibilities": "Perform grease lubrication, belt replacements, sensor calibrations, and routine overhauls.",
        "workflowInstructions": "Complete daily work orders, log equipment meters, and store spare components.",
        "delegationPolicy": "up",
        "color": "#94a3b8"
      },
      {
        "id": "mfg-proc-mgr",
        "roleTitle": "Procurement Manager",
        "name": "Strategic Sourcing & Procurement Lead",
        "level": 2,
        "parentId": "mfg-supply-dir",
        "responsibilities": "Negotiate raw material pricing, supplier contracts, and dual-sourcing contingency plans.",
        "workflowInstructions": "Execute purchase contracts, monitor supplier on-time in-full (OTIF) delivery, and manage RFQs.",
        "delegationPolicy": "auto",
        "color": "#ca8a04"
      },
      {
        "id": "mfg-purch-off",
        "roleTitle": "Purchase Officer",
        "name": "Purchasing Officer / Buyer",
        "level": 3,
        "parentId": "mfg-proc-mgr",
        "responsibilities": "Issue purchase orders against ERP requisitions and expedite urgent production parts.",
        "workflowInstructions": "Track PO receipts, resolve invoice discrepancies, and communicate ship dates to plant teams.",
        "delegationPolicy": "up",
        "color": "#eab308"
      },
      {
        "id": "mfg-wh-mgr",
        "roleTitle": "Warehouse Manager",
        "name": "Finished Goods & Raw Material Warehouse Head",
        "level": 2,
        "parentId": "mfg-supply-dir",
        "responsibilities": "Manage inventory accuracy, warehouse space utilization, FIFO batch control, and loading docks.",
        "workflowInstructions": "Supervise warehouse shifts, conduct cycle counts, and coordinate freight dispatch.",
        "delegationPolicy": "auto",
        "color": "#b45309"
      },
      {
        "id": "mfg-wh-sup",
        "roleTitle": "Warehouse Supervisor",
        "name": "Shipping & Receiving Floor Supervisor",
        "level": 3,
        "parentId": "mfg-wh-mgr",
        "responsibilities": "Direct pallet staging, barcode scanning, packing slips, and trailer cross-docking.",
        "workflowInstructions": "Assign forklift drivers, verify incoming Bill of Ladings, and prioritize urgent outbound orders.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "mfg-wh-wkr",
        "roleTitle": "Warehouse Worker",
        "name": "Warehouse Associate & Forklift Operator",
        "level": 4,
        "parentId": "mfg-wh-sup",
        "responsibilities": "Operate high-reach forklifts, pick palletized orders, shrink-wrap pallets, and stage trailers.",
        "workflowInstructions": "Follow warehouse safety rules, scan barcode bin locations, and stage shipments accurately.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "mfg-safety-mgr",
        "roleTitle": "Safety Manager",
        "name": "EHS (Environmental Health & Safety) Manager",
        "level": 1,
        "parentId": "mfg-ceo",
        "responsibilities": "Enforce OSHA compliance, machine guarding, fire safety, chemical HAZMAT controls, and audits.",
        "workflowInstructions": "Investigate near-miss incidents, conduct safety drills, and lead safety committee reviews.",
        "delegationPolicy": "auto",
        "color": "#dc2626"
      },
      {
        "id": "mfg-safety-off",
        "roleTitle": "Safety Officer",
        "name": "Industrial Safety Inspector",
        "level": 2,
        "parentId": "mfg-safety-mgr",
        "responsibilities": "Conduct daily shop floor safety audits, verify PPE compliance, and inspect fire equipment.",
        "workflowInstructions": "Monitor lockout/tagout (LOTO) protocols, log safety infractions, and deliver safety training.",
        "delegationPolicy": "up",
        "color": "#ef4444"
      }
    ]
  },
  {
    "id": "chain-ecommerce-org",
    "name": "E-Commerce Company",
    "description": "Full digital retail organization connecting Technology, Merchandising, Digital Marketing, Fulfillment Operations, and Customer Experience.",
    "category": "E-Commerce",
    "domain": "Retail & Web",
    "color": "#7c3aed",
    "icon": "ShoppingCart",
    "nodes": [
      {
        "id": "ecom-ceo",
        "roleTitle": "CEO",
        "name": "Chief Executive Officer",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead GMV growth, customer lifetime value (LTV), unit economics, and omnichannel retail strategy.",
        "workflowInstructions": "Align Technology Director on platform stability and Business Director on merchandising and customer acquisition.",
        "delegationPolicy": "auto",
        "color": "#7c3aed"
      },
      {
        "id": "ecom-tech-dir",
        "roleTitle": "Technology Director",
        "name": "VP of Technology / CTO",
        "level": 1,
        "parentId": "ecom-ceo",
        "responsibilities": "Own high-traffic e-commerce storefront, checkout conversions, data platform, and cloud architecture.",
        "workflowInstructions": "Direct Engineering Manager and Data Manager. Enforce zero-downtime during peak shopping events (Black Friday).",
        "delegationPolicy": "auto",
        "color": "#2563eb"
      },
      {
        "id": "ecom-biz-dir",
        "roleTitle": "Business Director",
        "name": "Chief Commercial / Business Officer",
        "level": 1,
        "parentId": "ecom-ceo",
        "responsibilities": "Drive merchandising revenue, marketing campaigns, supply vendor relations, and customer happiness.",
        "workflowInstructions": "Lead Marketing, Category Management, and Fulfillment operations teams.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "ecom-eng-mgr",
        "roleTitle": "Engineering Manager",
        "name": "Storefront Engineering Manager",
        "level": 2,
        "parentId": "ecom-tech-dir",
        "responsibilities": "Manage engineering squads building search, catalog, shopping cart, payment gateways, and checkout.",
        "workflowInstructions": "Direct Frontend, Backend, and QA leads. Monitor site performance and payment latency.",
        "delegationPolicy": "auto",
        "color": "#3b82f6"
      },
      {
        "id": "ecom-fe-lead",
        "roleTitle": "Frontend Lead",
        "name": "Storefront Frontend Lead",
        "level": 3,
        "parentId": "ecom-eng-mgr",
        "responsibilities": "Own mobile-responsive checkout flow, core web vitals (LCP/CLS), and design system components.",
        "workflowInstructions": "Lead frontend engineers, conduct A/B testing on checkout buttons, and optimize page speed.",
        "delegationPolicy": "auto",
        "color": "#06b6d4"
      },
      {
        "id": "ecom-be-lead",
        "roleTitle": "Backend Lead",
        "name": "Order Management & API Lead",
        "level": 3,
        "parentId": "ecom-eng-mgr",
        "responsibilities": "Lead microservices for inventory reservation, payment processing (Stripe/PayPal), and tax calculation.",
        "workflowInstructions": "Design high-concurrency order processing pipelines, handle API rate limits, and ensure payment security.",
        "delegationPolicy": "auto",
        "color": "#6366f1"
      },
      {
        "id": "ecom-fe-dev",
        "roleTitle": "Frontend Developer",
        "name": "React / Next.js Storefront Developer",
        "level": 4,
        "parentId": "ecom-fe-lead",
        "responsibilities": "Build UI features for product detail pages (PDP), product listing pages (PLP), and user account portal.",
        "workflowInstructions": "Implement responsive designs, integrate analytics tags, and optimize client-side bundle size.",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "ecom-be-dev",
        "roleTitle": "Backend Developer",
        "name": "Node / Python Backend Engineer",
        "level": 4,
        "parentId": "ecom-be-lead",
        "responsibilities": "Implement catalog search APIs, shopping cart persistence, promo coupon logic, and webhook workers.",
        "workflowInstructions": "Write scalable backend microservices, database schemas, and unit test coverage.",
        "delegationPolicy": "both",
        "color": "#818cf8"
      },
      {
        "id": "ecom-qa-eng",
        "roleTitle": "QA Engineer",
        "name": "E-Commerce QA & Automation Engineer",
        "level": 3,
        "parentId": "ecom-eng-mgr",
        "responsibilities": "Test payment processing flows across multiple currencies, devices, fraud edge-cases, and promo codes.",
        "workflowInstructions": "Execute automated synthetic transactions and certify checkout reliability before major sales.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "ecom-data-mgr",
        "roleTitle": "Data Manager",
        "name": "Data Analytics & Engineering Manager",
        "level": 2,
        "parentId": "ecom-tech-dir",
        "responsibilities": "Manage consumer behavioral analytics, recommendation algorithms, customer churn models, and data warehouse.",
        "workflowInstructions": "Direct data analysts and build automated dashboards for merchandising and marketing teams.",
        "delegationPolicy": "auto",
        "color": "#d946ef"
      },
      {
        "id": "ecom-data-analyst",
        "roleTitle": "Data Analyst",
        "name": "E-Commerce Business Analyst",
        "level": 3,
        "parentId": "ecom-data-mgr",
        "responsibilities": "Analyze checkout drop-off funnels, product category margins, customer cohorts, and search queries.",
        "workflowInstructions": "Build SQL models, deliver conversion rate optimization (CRO) reports, and present insights.",
        "delegationPolicy": "up",
        "color": "#ec4899"
      },
      {
        "id": "ecom-mkt-mgr",
        "roleTitle": "Marketing Manager",
        "name": "Digital Acquisition & Growth Marketing Manager",
        "level": 2,
        "parentId": "ecom-biz-dir",
        "responsibilities": "Own blended customer acquisition cost (CAC), promotional calendar, email marketing, and social ads.",
        "workflowInstructions": "Direct SEO and Performance Marketing specialists to drive profitable customer traffic.",
        "delegationPolicy": "auto",
        "color": "#f59e0b"
      },
      {
        "id": "ecom-seo-spec",
        "roleTitle": "SEO Specialist",
        "name": "E-Commerce Technical SEO Specialist",
        "level": 3,
        "parentId": "ecom-mkt-mgr",
        "responsibilities": "Optimize category taxonomy, structured product schema markup, sitemaps, and organic rankings.",
        "workflowInstructions": "Audit technical crawl health, optimize meta descriptions, and build internal linking hierarchies.",
        "delegationPolicy": "both",
        "color": "#eab308"
      },
      {
        "id": "ecom-perf-marketer",
        "roleTitle": "Performance Marketer",
        "name": "Paid Ads & ROAS Specialist",
        "level": 3,
        "parentId": "ecom-mkt-mgr",
        "responsibilities": "Manage Google Shopping, Meta Product Ads, TikTok campaigns, and retargeting with high ROAS.",
        "workflowInstructions": "Test ad creatives, monitor cost-per-click (CPC), and optimize automated bidding algorithms.",
        "delegationPolicy": "up",
        "color": "#fbbf24"
      },
      {
        "id": "ecom-cat-mgr",
        "roleTitle": "Category Manager",
        "name": "Category Merchandising Manager",
        "level": 2,
        "parentId": "ecom-biz-dir",
        "responsibilities": "Select vendor brands, negotiate product wholesale margins, manage stock assortments, and promotions.",
        "workflowInstructions": "Monitor product sell-through rates, plan seasonal campaigns, and manage vendor relationships.",
        "delegationPolicy": "auto",
        "color": "#14b8a6"
      },
      {
        "id": "ecom-cat-exec",
        "roleTitle": "Category Executive",
        "name": "Merchandising & Catalog Specialist",
        "level": 3,
        "parentId": "ecom-cat-mgr",
        "responsibilities": "Upload product listings, ensure image gallery quality, manage SKU variants, and monitor competitor prices.",
        "workflowInstructions": "Create accurate product listings, verify attribute specs, and coordinate flash sale setups.",
        "delegationPolicy": "up",
        "color": "#2dd4bf"
      },
      {
        "id": "ecom-ops-mgr",
        "roleTitle": "Operations Manager",
        "name": "Fulfillment & Customer Support Head",
        "level": 2,
        "parentId": "ecom-biz-dir",
        "responsibilities": "Ensure fast same-day order picking, carrier parcel shipping, return logistics, and support resolution.",
        "workflowInstructions": "Oversee warehouse packing teams and customer support leadership to maintain CSAT > 90%.",
        "delegationPolicy": "auto",
        "color": "#ea580c"
      },
      {
        "id": "ecom-wh-staff",
        "roleTitle": "Warehouse Staff",
        "name": "Order Picker & Fulfillment Specialist",
        "level": 3,
        "parentId": "ecom-ops-mgr",
        "responsibilities": "Pick e-commerce orders from bins, pack with branded packaging, apply shipping labels, and hand off to carriers.",
        "workflowInstructions": "Fulfill orders within SLA, scan tracking numbers, and handle customer return inspections.",
        "delegationPolicy": "up",
        "color": "#f97316"
      },
      {
        "id": "ecom-supp-lead",
        "roleTitle": "Customer Support Lead",
        "name": "Customer Care & Retention Lead",
        "level": 3,
        "parentId": "ecom-ops-mgr",
        "responsibilities": "Manage live chat, email ticketing, refunds, exchange policies, and escalation desk.",
        "workflowInstructions": "Supervise support representatives, audit ticket response times, and train team on appeasement policies.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "ecom-supp-exec",
        "roleTitle": "Support Executive",
        "name": "Customer Service Representative",
        "level": 4,
        "parentId": "ecom-supp-lead",
        "responsibilities": "Assist customers with order tracking, size exchanges, payment issues, and returns.",
        "workflowInstructions": "Respond empathetically on chat/email, issue refund vouchers according to policy, and solve complaints.",
        "delegationPolicy": "up",
        "color": "#38bdf8"
      }
    ]
  },
  {
    "id": "chain-construction-org",
    "name": "Construction Company",
    "description": "General contracting and civil construction org connecting Project Directorate, Site Operations, Architecture, Quantity Surveying, and Site Safety.",
    "category": "Construction",
    "domain": "Engineering",
    "color": "#b45309",
    "icon": "HardHat",
    "nodes": [
      {
        "id": "const-md",
        "roleTitle": "Managing Director",
        "name": "Managing Director / Principal Contractor",
        "level": 0,
        "parentId": null,
        "responsibilities": "Accountable for client development, multi-million dollar tender wins, contractor joint ventures, and balance sheet.",
        "workflowInstructions": "Direct Project Director and Finance Manager. Enforce corporate safety and construction delivery quality.",
        "delegationPolicy": "auto",
        "color": "#78350f"
      },
      {
        "id": "const-proj-dir",
        "roleTitle": "Project Director",
        "name": "Director of Construction Projects",
        "level": 1,
        "parentId": "const-md",
        "responsibilities": "Oversee multiple commercial construction projects, structural engineering compliance, and master timelines.",
        "workflowInstructions": "Supervise Project Managers, Architects, Quantity Surveyors, and Safety. Review project milestone billing.",
        "delegationPolicy": "auto",
        "color": "#b45309"
      },
      {
        "id": "const-fin-mgr",
        "roleTitle": "Finance Manager",
        "name": "Commercial Accounts & Payroll Manager",
        "level": 1,
        "parentId": "const-md",
        "responsibilities": "Manage project cash flows, subcontractor payment applications, bonding, and bank guarantees.",
        "workflowInstructions": "Audit subcontractor invoices, release certified payment retentions, and manage project tax filings.",
        "delegationPolicy": "up",
        "color": "#047857"
      },
      {
        "id": "const-pm",
        "roleTitle": "Project Manager",
        "name": "Senior Construction Project Manager",
        "level": 2,
        "parentId": "const-proj-dir",
        "responsibilities": "Manage single jobsite delivery, general contractor coordination, critical path milestones, and client meetings.",
        "workflowInstructions": "Direct Site Engineers and Supervisors. Manage project RFI (Requests for Information) and change orders.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "const-site-eng",
        "roleTitle": "Site Engineer",
        "name": "Senior Civil / Site Engineer",
        "level": 3,
        "parentId": "const-pm",
        "responsibilities": "Set out building grid lines, inspect rebar before concrete pours, and review structural shop drawings.",
        "workflowInstructions": "Verify structural drawings against physical works, coordinate testing labs, and guide junior engineers.",
        "delegationPolicy": "both",
        "color": "#f59e0b"
      },
      {
        "id": "const-jr-eng",
        "roleTitle": "Junior Engineer",
        "name": "Assistant Field Engineer",
        "level": 4,
        "parentId": "const-site-eng",
        "responsibilities": "Survey site levels using total stations, log daily concrete delivery slips, and record daily site weather logs.",
        "workflowInstructions": "Assist site engineer with level checks, material slump tests, and compile daily contractor logs.",
        "delegationPolicy": "up",
        "color": "#fbbf24"
      },
      {
        "id": "const-site-sup",
        "roleTitle": "Site Supervisor",
        "name": "General Site Superintendent",
        "level": 3,
        "parentId": "const-pm",
        "responsibilities": "Coordinate daily jobsite trades, crane logistics, material delivery staging, and subcontractor sequencing.",
        "workflowInstructions": "Lead morning trade coordination meetings, enforce housekeeping, and maintain jobsite productivity.",
        "delegationPolicy": "auto",
        "color": "#ea580c"
      },
      {
        "id": "const-foreman",
        "roleTitle": "Foreman",
        "name": "Trade Foreman (Civil / MEP / Finishing)",
        "level": 4,
        "parentId": "const-site-sup",
        "responsibilities": "Direct specific crews of tradespeople (carpenters, steel fixers, masons, electricians).",
        "workflowInstructions": "Assign daily work batches, inspect workmanship quality, and ensure PPE compliance.",
        "delegationPolicy": "auto",
        "color": "#f97316"
      },
      {
        "id": "const-skilled-wkr",
        "roleTitle": "Skilled Worker",
        "name": "Journeyman Carpenter / Mason / Welder",
        "level": 5,
        "parentId": "const-foreman",
        "responsibilities": "Execute formwork carpentry, structural steel welding, masonry bricklaying, or pipefitting.",
        "workflowInstructions": "Follow engineering details, maintain tool safety, and construct structural elements to tolerance.",
        "delegationPolicy": "peers",
        "color": "#fdba74"
      },
      {
        "id": "const-laborer",
        "roleTitle": "General Laborer",
        "name": "Site Construction Laborer",
        "level": 5,
        "parentId": "const-foreman",
        "responsibilities": "Perform site cleanup, concrete wheelbarrow transport, excavation digging, and material staging.",
        "workflowInstructions": "Support skilled trades, assist material offloading, and maintain clean site egress paths.",
        "delegationPolicy": "up",
        "color": "#fed7aa"
      },
      {
        "id": "const-architect",
        "roleTitle": "Architect",
        "name": "Lead Project Architect",
        "level": 2,
        "parentId": "const-proj-dir",
        "responsibilities": "Ensure architectural design integrity, resolve site design queries, and review submittals.",
        "workflowInstructions": "Review contractor shop drawings, issue architectural clarifications, and supervise draftspersons.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "const-draftsperson",
        "roleTitle": "Draftsperson",
        "name": "BIM / CAD Draftsperson",
        "level": 3,
        "parentId": "const-architect",
        "responsibilities": "Produce 2D architectural revisions and 3D Revit BIM models for clash detection.",
        "workflowInstructions": "Update architectural drawings with site change orders and coordinate MEP service penetrations.",
        "delegationPolicy": "up",
        "color": "#38bdf8"
      },
      {
        "id": "const-qs",
        "roleTitle": "Quantity Surveyor",
        "name": "Chief Quantity Surveyor",
        "level": 2,
        "parentId": "const-proj-dir",
        "responsibilities": "Manage bill of quantities (BOQ), contractual variations, subcontractor valuations, and final accounts.",
        "workflowInstructions": "Certify subcontractor progress claims, prepare monthly cost reports, and manage contractual claims.",
        "delegationPolicy": "auto",
        "color": "#4f46e5"
      },
      {
        "id": "const-cost-est",
        "roleTitle": "Cost Estimator",
        "name": "Construction Cost Estimator",
        "level": 3,
        "parentId": "const-qs",
        "responsibilities": "Perform material quantity takeoffs from blueprints, request supplier quotes, and assemble tender bids.",
        "workflowInstructions": "Calculate labor hours, equipment rental costs, and material line items for competitive proposals.",
        "delegationPolicy": "up",
        "color": "#6366f1"
      },
      {
        "id": "const-safety-mgr",
        "roleTitle": "Safety Manager",
        "name": "Site HSE (Health & Safety) Director",
        "level": 2,
        "parentId": "const-proj-dir",
        "responsibilities": "Enforce scaffold safety, fall protection, crane rigging safety, and OSHA zero-incident goals.",
        "workflowInstructions": "Direct site safety officers, audit hazardous work permits (hot work, confined space), and investigate incidents.",
        "delegationPolicy": "auto",
        "color": "#dc2626"
      },
      {
        "id": "const-safety-off",
        "roleTitle": "Safety Officer",
        "name": "Site Safety & Environmental Officer",
        "level": 3,
        "parentId": "const-safety-mgr",
        "responsibilities": "Deliver site inductions for workers, inspect harnesses and scaffolding, and stop unsafe work.",
        "workflowInstructions": "Conduct daily toolbox talks, audit perimeter guardrails, and log daily safety checklists.",
        "delegationPolicy": "up",
        "color": "#ef4444"
      },
      {
        "id": "const-proc-mgr",
        "roleTitle": "Procurement Manager",
        "name": "Construction Procurement Manager",
        "level": 1,
        "parentId": "const-md",
        "responsibilities": "Negotiate bulk concrete, structural steel, rebar, heavy equipment rentals, and supplier terms.",
        "workflowInstructions": "Issue purchase agreements with major suppliers, lock in steel prices, and manage buyers.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "const-purch-off",
        "roleTitle": "Purchase Officer",
        "name": "Site Procurement & Logistics Officer",
        "level": 2,
        "parentId": "const-proc-mgr",
        "responsibilities": "Coordinate daily ready-mix concrete batch deliveries, order timber, and track material deliveries.",
        "workflowInstructions": "Dispatch purchase orders, verify delivery notes against POs, and resolve shipping delays.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-hospitality-hotel-org",
    "name": "Hotel / Hospitality Company",
    "description": "Luxury resort and hotel governance structure connecting General Management, Rooms Division, Food & Beverage, Housekeeping, Engineering, and Sales.",
    "category": "Hospitality",
    "domain": "Hotel & Resort",
    "color": "#9d174d",
    "icon": "Utensils",
    "nodes": [
      {
        "id": "hotel-gm",
        "roleTitle": "General Manager",
        "name": "General Manager / Managing Director",
        "level": 0,
        "parentId": null,
        "responsibilities": "Accountable for RevPAR (revenue per available room), guest satisfaction scores, Forbes star standards, and GOP.",
        "workflowInstructions": "Direct all department heads across Rooms, F&B, Housekeeping, Engineering, Sales, and HR.",
        "delegationPolicy": "auto",
        "color": "#831843"
      },
      {
        "id": "hotel-fo-mgr",
        "roleTitle": "Front Office Manager",
        "name": "Rooms Division / Front Office Manager",
        "level": 1,
        "parentId": "hotel-gm",
        "responsibilities": "Oversee guest arrival experiences, room inventory yield, concierge, and VIP protocol.",
        "workflowInstructions": "Direct reception supervisors and concierge. Monitor room check-ins, upgrades, and billing queries.",
        "delegationPolicy": "auto",
        "color": "#9d174d"
      },
      {
        "id": "hotel-rec-sup",
        "roleTitle": "Reception Supervisor",
        "name": "Front Desk Shift Supervisor",
        "level": 2,
        "parentId": "hotel-fo-mgr",
        "responsibilities": "Manage reception shift teams, room room assignments, keycards, and VIP escorting.",
        "workflowInstructions": "Balance cash floats, resolve guest complaints, and ensure smooth check-in/out queues.",
        "delegationPolicy": "auto",
        "color": "#be185d"
      },
      {
        "id": "hotel-rec",
        "roleTitle": "Receptionist",
        "name": "Guest Service Agent / Receptionist",
        "level": 3,
        "parentId": "hotel-rec-sup",
        "responsibilities": "Welcome guests warmly, process registrations, program room keys, and settle final folios.",
        "workflowInstructions": "Execute PMS room check-ins, promote hotel amenities, and answer guest requests promptly.",
        "delegationPolicy": "both",
        "color": "#db2777"
      },
      {
        "id": "hotel-concierge",
        "roleTitle": "Concierge",
        "name": "Chief Concierge (Les Clefs d'Or)",
        "level": 3,
        "parentId": "hotel-rec-sup",
        "responsibilities": "Assist guests with dining reservations, airport transfers, luxury excursions, and special requests.",
        "workflowInstructions": "Maintain partnerships with premier restaurants and transport providers to delight guests.",
        "delegationPolicy": "up",
        "color": "#f472b6"
      },
      {
        "id": "hotel-fb-mgr",
        "roleTitle": "Food and Beverage Manager",
        "name": "Director of Food & Beverage",
        "level": 1,
        "parentId": "hotel-gm",
        "responsibilities": "Oversee restaurants, banquet operations, room service, bars, food cost percentages, and culinary standards.",
        "workflowInstructions": "Direct Restaurant Managers and Executive Chefs. Drive dining revenue and wine cellar curation.",
        "delegationPolicy": "auto",
        "color": "#b45309"
      },
      {
        "id": "hotel-rest-mgr",
        "roleTitle": "Restaurant Manager",
        "name": "Fine Dining Restaurant Manager",
        "level": 2,
        "parentId": "hotel-fb-mgr",
        "responsibilities": "Lead front-of-house service staff, table reservations, beverage pairings, and dining ambiance.",
        "workflowInstructions": "Conduct pre-service shift briefings, manage floor captains, and ensure seamless guest dining service.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "hotel-head-chef",
        "roleTitle": "Head Chef",
        "name": "Executive Head Chef",
        "level": 3,
        "parentId": "hotel-rest-mgr",
        "responsibilities": "Design seasonal dining menus, direct kitchen brigade, uphold culinary hygiene, and control food waste.",
        "workflowInstructions": "Supervise kitchen food prep, expedite during dinner service, and approve recipe presentations.",
        "delegationPolicy": "auto",
        "color": "#ea580c"
      },
      {
        "id": "hotel-sous-chef",
        "roleTitle": "Sous Chef",
        "name": "Executive Sous Chef",
        "level": 4,
        "parentId": "hotel-head-chef",
        "responsibilities": "Manage kitchen section stations (saucier, grill, pastry), enforce cooking precision, and train line cooks.",
        "workflowInstructions": "Oversee mise-en-place prep, inspect incoming fresh produce, and run the pass during peak orders.",
        "delegationPolicy": "both",
        "color": "#f97316"
      },
      {
        "id": "hotel-cook",
        "roleTitle": "Cook",
        "name": "Line Cook / Chef de Partie",
        "level": 5,
        "parentId": "hotel-sous-chef",
        "responsibilities": "Cook dishes to order at designated station following recipe cards and presentation guides.",
        "workflowInstructions": "Prepare station ingredients, maintain sanitation, and cook food to temperature specifications.",
        "delegationPolicy": "up",
        "color": "#fb923c"
      },
      {
        "id": "hotel-service-staff",
        "roleTitle": "Service Staff",
        "name": "Food & Beverage Server / Captain",
        "level": 3,
        "parentId": "hotel-rest-mgr",
        "responsibilities": "Take guest food and beverage orders, deliver dishes gracefully, and provide wine service.",
        "workflowInstructions": "Describe menu specials, attend to guest table needs, and ensure exceptional dining memories.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "hotel-hk-mgr",
        "roleTitle": "Housekeeping Manager",
        "name": "Executive Housekeeper",
        "level": 1,
        "parentId": "hotel-gm",
        "responsibilities": "Ensure pristine cleanliness of all guest rooms, luxury suites, public spaces, and laundry operations.",
        "workflowInstructions": "Supervise housekeeping supervisors, manage linen inventory, and coordinate room turnaround with Front Office.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "hotel-hk-sup",
        "roleTitle": "Housekeeping Supervisor",
        "name": "Floor Housekeeping Supervisor",
        "level": 2,
        "parentId": "hotel-hk-mgr",
        "responsibilities": "Inspect guest rooms after cleaning, verify amenity setups, and release vacant clean rooms to Front Desk.",
        "workflowInstructions": "Audit room cleanliness against 50-point checklists, assign daily attendant room blocks, and report maintenance needs.",
        "delegationPolicy": "auto",
        "color": "#10b981"
      },
      {
        "id": "hotel-room-att",
        "roleTitle": "Room Attendant",
        "name": "Guest Room Attendant",
        "level": 3,
        "parentId": "hotel-hk-sup",
        "responsibilities": "Clean guest rooms, make luxury beds, sanitize bathrooms, and replenish luxury amenities.",
        "workflowInstructions": "Complete assigned room credits to five-star standard and respect guest privacy preferences.",
        "delegationPolicy": "up",
        "color": "#34d399"
      },
      {
        "id": "hotel-eng-mgr",
        "roleTitle": "Engineering Manager",
        "name": "Chief Engineer / Director of Engineering",
        "level": 1,
        "parentId": "hotel-gm",
        "responsibilities": "Maintain hotel HVAC systems, emergency power generators, swimming pools, boilers, and building structure.",
        "workflowInstructions": "Schedule preventative maintenance on hotel plant equipment and oversee emergency repair teams.",
        "delegationPolicy": "auto",
        "color": "#475569"
      },
      {
        "id": "hotel-maint-tech",
        "roleTitle": "Maintenance Technician",
        "name": "Hotel Maintenance Technician",
        "level": 2,
        "parentId": "hotel-eng-mgr",
        "responsibilities": "Fix room plumbing, TV electronics, air conditioning, and electrical fixtures promptly for guests.",
        "workflowInstructions": "Respond rapidly to guest work orders dispatched via hotel maintenance radio/app.",
        "delegationPolicy": "up",
        "color": "#64748b"
      },
      {
        "id": "hotel-sales-mgr",
        "roleTitle": "Sales and Marketing Manager",
        "name": "Director of Sales & Marketing",
        "level": 1,
        "parentId": "hotel-gm",
        "responsibilities": "Drive corporate group contracts, wedding banquets, travel agency partnerships, and room block bookings.",
        "workflowInstructions": "Direct sales executives, handle corporate RFP bids, and represent the hotel at travel trade fairs.",
        "delegationPolicy": "auto",
        "color": "#6366f1"
      },
      {
        "id": "hotel-sales-exec",
        "roleTitle": "Sales Executive",
        "name": "Corporate & Event Sales Executive",
        "level": 2,
        "parentId": "hotel-sales-mgr",
        "responsibilities": "Conduct hotel property tours for meeting planners, prepare banquet quotes, and close bookings.",
        "workflowInstructions": "Follow up on event inquiries, draft banquet event orders (BEOs), and ensure client satisfaction.",
        "delegationPolicy": "up",
        "color": "#818cf8"
      },
      {
        "id": "hotel-hr-mgr",
        "roleTitle": "HR Manager",
        "name": "Human Resources & Training Manager",
        "level": 1,
        "parentId": "hotel-gm",
        "responsibilities": "Lead hospitality service culture training, staff onboarding, employee cafeteria, and labor compliance.",
        "workflowInstructions": "Conduct hospitality standard orientations and manage seasonal hotel staffing pipelines.",
        "delegationPolicy": "up",
        "color": "#0284c7"
      }
    ]
  },
  {
    "id": "chain-agency-marketing-org",
    "name": "Digital Marketing Agency",
    "description": "Modern creative and growth agency structure connecting Agency Leadership, Creative Direction, Performance Marketing, and Client Services.",
    "category": "Marketing",
    "domain": "Digital Agency",
    "color": "#7c3aed",
    "icon": "Megaphone",
    "nodes": [
      {
        "id": "mktg-ceo",
        "roleTitle": "CEO / Agency Director",
        "name": "Chief Executive / Agency Principal",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead agency growth, marquee client pitches, creative reputation, and overall profitability.",
        "workflowInstructions": "Direct Creative, Marketing, and Client Services leadership. Inspire award-winning campaigns.",
        "delegationPolicy": "auto",
        "color": "#4c1d95"
      },
      {
        "id": "mktg-creative-dir",
        "roleTitle": "Creative Director",
        "name": "Executive Creative Director",
        "level": 1,
        "parentId": "mktg-ceo",
        "responsibilities": "Own agency creative output, brand vision, advertising conceptualization, and design excellence.",
        "workflowInstructions": "Direct Design Lead and Content Lead. Review campaign concepts, copy hooks, and visual aesthetics.",
        "delegationPolicy": "auto",
        "color": "#7c3aed"
      },
      {
        "id": "mktg-mktg-dir",
        "roleTitle": "Marketing Director",
        "name": "Director of Performance & Growth",
        "level": 1,
        "parentId": "mktg-ceo",
        "responsibilities": "Lead multi-channel digital acquisition, client ROAS, SEO architecture, and paid advertising.",
        "workflowInstructions": "Supervise SEO, Paid Ads, and Social Media managers. Review cross-client campaign performance.",
        "delegationPolicy": "auto",
        "color": "#2563eb"
      },
      {
        "id": "mktg-cs-dir",
        "roleTitle": "Client Services Director",
        "name": "Director of Client Services & Accounts",
        "level": 1,
        "parentId": "mktg-ceo",
        "responsibilities": "Own client retention, agency scope of work (SOW), account profitability, and client happiness.",
        "workflowInstructions": "Supervise Account Managers and Marketing Analysts. Oversee quarterly business reviews (QBRs).",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "mktg-design-lead",
        "roleTitle": "Design Lead",
        "name": "Head of Visual Design & Art Direction",
        "level": 2,
        "parentId": "mktg-creative-dir",
        "responsibilities": "Lead graphic designers and video editors. Create visual guidelines and campaign assets.",
        "workflowInstructions": "Assign creative briefs to designers, review design mockups, and ensure brand consistency.",
        "delegationPolicy": "auto",
        "color": "#a855f7"
      },
      {
        "id": "mktg-designer",
        "roleTitle": "Graphic Designer",
        "name": "Senior Brand & UI Graphic Designer",
        "level": 3,
        "parentId": "mktg-design-lead",
        "responsibilities": "Design ad banners, landing page visuals, brand identity kits, and infographics.",
        "workflowInstructions": "Execute creative briefs in Figma/Photoshop, iterate based on feedback, and export production assets.",
        "delegationPolicy": "both",
        "color": "#c084fc"
      },
      {
        "id": "mktg-video-ed",
        "roleTitle": "Video Editor",
        "name": "Motion Graphics & Video Producer",
        "level": 3,
        "parentId": "mktg-design-lead",
        "responsibilities": "Edit high-converting TikTok/Reels video ads, brand video commercials, and motion graphics.",
        "workflowInstructions": "Cut video footage, apply color grading, add animated captions, and deliver formats optimized for ads.",
        "delegationPolicy": "both",
        "color": "#d8b4fe"
      },
      {
        "id": "mktg-content-lead",
        "roleTitle": "Content Lead",
        "name": "Head of Copywriting & Content Strategy",
        "level": 2,
        "parentId": "mktg-creative-dir",
        "responsibilities": "Own content voice, persuasive copy frameworks, video scripts, and editorial calendar.",
        "workflowInstructions": "Direct Content Writers and Copywriters on campaign angles, headlines, and landing page messaging.",
        "delegationPolicy": "auto",
        "color": "#d946ef"
      },
      {
        "id": "mktg-writer",
        "roleTitle": "Content Writer",
        "name": "SEO & Long-Form Content Writer",
        "level": 3,
        "parentId": "mktg-content-lead",
        "responsibilities": "Write authoritative blog posts, case studies, whitepapers, and guides optimized for search.",
        "workflowInstructions": "Research topics, integrate target semantic keywords, and write engaging, well-structured articles.",
        "delegationPolicy": "both",
        "color": "#e879f9"
      },
      {
        "id": "mktg-copywriter",
        "roleTitle": "Copywriter",
        "name": "Direct Response & Ad Copywriter",
        "level": 3,
        "parentId": "mktg-content-lead",
        "responsibilities": "Write high-converting ad copy, landing page headlines, email sequences, and social captions.",
        "workflowInstructions": "Craft high-hook ad variations, A/B test angles, and refine calls-to-action.",
        "delegationPolicy": "both",
        "color": "#f0abfc"
      },
      {
        "id": "mktg-seo-mgr",
        "roleTitle": "SEO Manager",
        "name": "Organic Search & Technical SEO Lead",
        "level": 2,
        "parentId": "mktg-mktg-dir",
        "responsibilities": "Lead organic search strategy, technical SEO audits, backlink campaigns, and SERP visibility.",
        "workflowInstructions": "Direct SEO Specialists on technical fixes, keyword clustering, and algorithmic update recovery.",
        "delegationPolicy": "auto",
        "color": "#0891b2"
      },
      {
        "id": "mktg-seo-spec",
        "roleTitle": "SEO Specialist",
        "name": "Technical & On-Page SEO Specialist",
        "level": 3,
        "parentId": "mktg-seo-mgr",
        "responsibilities": "Conduct technical site crawls, optimize schema markup, fix crawl errors, and track keyword ranks.",
        "workflowInstructions": "Execute on-page optimization, audit Core Web Vitals, and build internal linking graphs.",
        "delegationPolicy": "up",
        "color": "#06b6d4"
      },
      {
        "id": "mktg-ads-mgr",
        "roleTitle": "Paid Ads Manager",
        "name": "Paid Media & PPC Manager",
        "level": 2,
        "parentId": "mktg-mktg-dir",
        "responsibilities": "Manage client ad budgets across Google Ads, Meta, LinkedIn, and programmatic channels.",
        "workflowInstructions": "Direct PPC specialists on bid management, negative keywords, audience segmentation, and budget pacing.",
        "delegationPolicy": "auto",
        "color": "#f59e0b"
      },
      {
        "id": "mktg-ppc-spec",
        "roleTitle": "PPC Specialist",
        "name": "Search & Social Ad Campaign Specialist",
        "level": 3,
        "parentId": "mktg-ads-mgr",
        "responsibilities": "Build ad campaigns, set up conversion tracking pixels, write ad headlines, and optimize bid tiers.",
        "workflowInstructions": "Monitor daily ROAS, pause underperforming ad sets, and scale winning campaigns.",
        "delegationPolicy": "up",
        "color": "#fbbf24"
      },
      {
        "id": "mktg-social-mgr",
        "roleTitle": "Social Media Manager",
        "name": "Organic Social & Community Manager",
        "level": 2,
        "parentId": "mktg-mktg-dir",
        "responsibilities": "Manage client brand presence on Instagram, LinkedIn, TikTok, Twitter/X, and YouTube.",
        "workflowInstructions": "Direct social media executives on content calendars, influencer outreach, and community engagement.",
        "delegationPolicy": "auto",
        "color": "#ec4899"
      },
      {
        "id": "mktg-social-exec",
        "roleTitle": "Social Media Executive",
        "name": "Social Community & Publishing Specialist",
        "level": 3,
        "parentId": "mktg-social-mgr",
        "responsibilities": "Schedule social posts, engage in comments and DMs, track viral trends, and monitor sentiment.",
        "workflowInstructions": "Publish approved posts, engage audience communities, and compile weekly engagement metrics.",
        "delegationPolicy": "up",
        "color": "#f472b6"
      },
      {
        "id": "mktg-acct-mgr",
        "roleTitle": "Account Manager",
        "name": "Senior Client Account Manager",
        "level": 2,
        "parentId": "mktg-cs-dir",
        "responsibilities": "Serve as primary client contact, lead status meetings, ensure timely deliverables, and upsell retainers.",
        "workflowInstructions": "Lead client communication, coordinate cross-department specialists, and ensure client expectations are exceeded.",
        "delegationPolicy": "auto",
        "color": "#10b981"
      },
      {
        "id": "mktg-acct-exec",
        "roleTitle": "Account Executive",
        "name": "Account Coordinator & Project Manager",
        "level": 3,
        "parentId": "mktg-acct-mgr",
        "responsibilities": "Organize client meeting notes, manage task timelines in Asana/Jira, and compile status updates.",
        "workflowInstructions": "Track project deliverables, route client feedback to creative teams, and support account manager.",
        "delegationPolicy": "up",
        "color": "#34d399"
      },
      {
        "id": "mktg-analyst",
        "roleTitle": "Marketing Analyst",
        "name": "Digital Marketing Analytics Specialist",
        "level": 2,
        "parentId": "mktg-cs-dir",
        "responsibilities": "Build Looker Studio and GA4 dashboards, attribute revenue to channels, and generate monthly client reports.",
        "workflowInstructions": "Analyze cross-platform marketing data, extract strategic insights, and build visual reports.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      }
    ]
  },
  {
    "id": "chain-logistics-supplychain-org",
    "name": "Logistics & Supply Chain Company",
    "description": "Global freight and supply chain operations connecting Operations, Fleet Transport, Distribution Warehouses, Customs Clearance, and Client Care.",
    "category": "Logistics",
    "domain": "Freight & Transport",
    "color": "#0f172a",
    "icon": "Truck",
    "nodes": [
      {
        "id": "log-ceo",
        "roleTitle": "CEO",
        "name": "Chief Executive Officer",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead global logistics network expansion, carrier partnerships, supply chain tech investments, and client trust.",
        "workflowInstructions": "Direct Operations Director, Finance Director, and Customer Service leadership.",
        "delegationPolicy": "auto",
        "color": "#0f172a"
      },
      {
        "id": "log-ops-dir",
        "roleTitle": "Operations Director",
        "name": "Chief Operating Officer / VP Operations",
        "level": 1,
        "parentId": "log-ceo",
        "responsibilities": "Oversee transport fleet, multi-site fulfillment centers, freight forwarding, and international customs.",
        "workflowInstructions": "Direct Transport, Warehouse, Logistics Coordination, and Customs managers. Maintain 99% on-time delivery.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "log-fin-dir",
        "roleTitle": "Finance Director",
        "name": "Chief Financial Officer",
        "level": 1,
        "parentId": "log-ceo",
        "responsibilities": "Oversee freight billing audit, fuel hedging, fleet capital leasing, and carrier settlements.",
        "workflowInstructions": "Supervise Accounts team and audit freight invoicing and logistics margin performance.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "log-trans-mgr",
        "roleTitle": "Transport Manager",
        "name": "Fleet & Line-Haul Transport Manager",
        "level": 2,
        "parentId": "log-ops-dir",
        "responsibilities": "Manage commercial truck fleet, line-haul lane schedules, driver safety, and fuel efficiency.",
        "workflowInstructions": "Supervise fleet supervisors, monitor GPS telematics, and ensure transport regulatory compliance.",
        "delegationPolicy": "auto",
        "color": "#0891b2"
      },
      {
        "id": "log-fleet-sup",
        "roleTitle": "Fleet Supervisor",
        "name": "Fleet Dispatch & Route Supervisor",
        "level": 3,
        "parentId": "log-trans-mgr",
        "responsibilities": "Dispatch trucks, manage driver duty hours (HOS/ELD), and handle on-road vehicle breakdowns.",
        "workflowInstructions": "Assign driver loads, monitor live transit checkpoints, and re-route trucks around weather/traffic.",
        "delegationPolicy": "auto",
        "color": "#06b6d4"
      },
      {
        "id": "log-driver",
        "roleTitle": "Driver",
        "name": "Commercial Heavy Vehicle Driver (CDL)",
        "level": 4,
        "parentId": "log-fleet-sup",
        "responsibilities": "Safely operate long-haul tractor-trailers, verify cargo securement, and complete delivery sign-offs.",
        "workflowInstructions": "Follow highway safety regulations, complete pre-trip vehicle inspections, and obtain digital Proof of Delivery.",
        "delegationPolicy": "up",
        "color": "#38bdf8"
      },
      {
        "id": "log-tech",
        "roleTitle": "Vehicle Maintenance Technician",
        "name": "Heavy Diesel & Fleet Mechanic",
        "level": 4,
        "parentId": "log-fleet-sup",
        "responsibilities": "Service commercial trucks, perform brake inspections, engine diagnostics, and safety overhauls.",
        "workflowInstructions": "Execute scheduled fleet maintenance and ensure zero roadside mechanical failures.",
        "delegationPolicy": "up",
        "color": "#64748b"
      },
      {
        "id": "log-wh-mgr",
        "roleTitle": "Warehouse Manager",
        "name": "Distribution Center General Manager",
        "level": 2,
        "parentId": "log-ops-dir",
        "responsibilities": "Manage 200,000+ sq ft fulfillment center, pallet racking, inbound cross-docking, and inventory counts.",
        "workflowInstructions": "Supervise warehouse supervisors, monitor order picking throughput, and maintain warehouse safety.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "log-wh-sup",
        "roleTitle": "Warehouse Supervisor",
        "name": "Warehouse Shift & Dock Supervisor",
        "level": 3,
        "parentId": "log-wh-mgr",
        "responsibilities": "Direct dock staging, container unloading, pallet consolidation, and shift associates.",
        "workflowInstructions": "Manage loading bay door assignments, balance shift labor, and resolve scanning discrepancies.",
        "delegationPolicy": "auto",
        "color": "#f59e0b"
      },
      {
        "id": "log-inv-ctrl",
        "roleTitle": "Inventory Controller",
        "name": "Inventory Control & QA Specialist",
        "level": 4,
        "parentId": "log-wh-sup",
        "responsibilities": "Perform cycle counts, reconcile inventory variances in WMS, and manage damaged freight.",
        "workflowInstructions": "Investigate inventory discrepancies, track bin locations, and audit SKU accuracy.",
        "delegationPolicy": "both",
        "color": "#fbbf24"
      },
      {
        "id": "log-wh-assoc",
        "roleTitle": "Warehouse Associate",
        "name": "Warehouse Specialist & Material Handler",
        "level": 4,
        "parentId": "log-wh-sup",
        "responsibilities": "Operate counterbalance forklifts, pick pallet orders, load shipping containers, and wrap pallets.",
        "workflowInstructions": "Scan barcodes accurately, follow dock safety procedures, and stage freight on time.",
        "delegationPolicy": "up",
        "color": "#fde047"
      },
      {
        "id": "log-coord",
        "roleTitle": "Logistics Coordinator",
        "name": "Freight Forwarding & Logistics Coordinator",
        "level": 2,
        "parentId": "log-ops-dir",
        "responsibilities": "Book ocean container and air freight shipments, track intermodal cargo, and optimize multimodal routes.",
        "workflowInstructions": "Coordinate with ocean shipping lines, airlines, and rail carriers to guarantee delivery windows.",
        "delegationPolicy": "auto",
        "color": "#2563eb"
      },
      {
        "id": "log-dispatch",
        "roleTitle": "Dispatch Officer",
        "name": "Freight Dispatcher",
        "level": 3,
        "parentId": "log-coord",
        "responsibilities": "Match shipper freight loads with available carrier capacity and negotiate spot freight rates.",
        "workflowInstructions": "Communicate with freight drivers, update load boards, and transmit rate confirmations.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "log-planner",
        "roleTitle": "Route Planner",
        "name": "Transport Network & Route Optimization Specialist",
        "level": 3,
        "parentId": "log-coord",
        "responsibilities": "Use routing algorithms to minimize mileage, avoid toll bottlenecks, and consolidate multi-drop deliveries.",
        "workflowInstructions": "Analyze lane costs, plan optimal transport routes, and reduce empty backhaul miles.",
        "delegationPolicy": "up",
        "color": "#60a5fa"
      },
      {
        "id": "log-customs-mgr",
        "roleTitle": "Customs Manager",
        "name": "Licensed Customs Brokerage Manager",
        "level": 2,
        "parentId": "log-ops-dir",
        "responsibilities": "Ensure international trade compliance, tariff code classification (HS Codes), and customs duty clearance.",
        "workflowInstructions": "Oversee customs documentation officers and liaise with border protection and customs authorities.",
        "delegationPolicy": "auto",
        "color": "#7c3aed"
      },
      {
        "id": "log-customs-off",
        "roleTitle": "Customs Documentation Officer",
        "name": "Customs Clearance & Import/Export Specialist",
        "level": 3,
        "parentId": "log-customs-mgr",
        "responsibilities": "Prepare commercial invoices, certificates of origin, bill of ladings, and customs entry declarations.",
        "workflowInstructions": "File customs entries, verify tariff classifications, and expedite port container releases.",
        "delegationPolicy": "up",
        "color": "#8b5cf6"
      },
      {
        "id": "log-accts-mgr",
        "roleTitle": "Accounts Manager",
        "name": "Freight Billing & Accounts Manager",
        "level": 2,
        "parentId": "log-fin-dir",
        "responsibilities": "Audit carrier freight bills, issue customer freight invoices, and resolve demurrage fees.",
        "workflowInstructions": "Process automated billing runs, audit detention charges, and manage accounts receivable.",
        "delegationPolicy": "auto",
        "color": "#10b981"
      },
      {
        "id": "log-accountant",
        "roleTitle": "Accountant",
        "name": "Logistics Financial Accountant",
        "level": 3,
        "parentId": "log-accts-mgr",
        "responsibilities": "Reconcile transport vendor statements, process carrier settlements, and audit expense manifests.",
        "workflowInstructions": "Verify delivery confirmations before releasing carrier payments and balance ledgers.",
        "delegationPolicy": "up",
        "color": "#34d399"
      },
      {
        "id": "log-cs-mgr",
        "roleTitle": "Customer Service Manager",
        "name": "Logistics Client Care & Tracking Manager",
        "level": 1,
        "parentId": "log-ceo",
        "responsibilities": "Manage cargo tracking helpdesk, key account shipment notifications, and freight claims.",
        "workflowInstructions": "Direct customer support team to provide real-time shipment visibility and resolve delivery delays.",
        "delegationPolicy": "auto",
        "color": "#ec4899"
      },
      {
        "id": "log-cs-exec",
        "roleTitle": "Customer Support Executive",
        "name": "Cargo Tracking & Support Specialist",
        "level": 2,
        "parentId": "log-cs-mgr",
        "responsibilities": "Answer shipper questions, provide GPS shipment updates, and assist with cargo insurance claims.",
        "workflowInstructions": "Provide proactive delivery delay notices and resolve customer inquiries with urgency.",
        "delegationPolicy": "up",
        "color": "#f472b6"
      }
    ]
  },
  {
    "id": "chain-enterprise-multidomain-tech",
    "name": "Enterprise Multi-Domain Tech (Microsoft Style)",
    "description": "Global enterprise matrix technology org connecting Executive Board, Cloud & AI Division, Productivity Apps, Core OS & Devices, and Enterprise Security.",
    "category": "Enterprise",
    "domain": "Enterprise Tech",
    "color": "#1e3a8a",
    "icon": "Building2",
    "nodes": [
      {
        "id": "ms-ceo",
        "roleTitle": "Executive Board & CEO",
        "name": "Chief Executive Officer & Board",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead global enterprise technology strategy, cloud infrastructure investments, AI research, and ecosystem trust.",
        "workflowInstructions": "Direct Executive Vice Presidents across Cloud & AI, Productivity Apps, and Enterprise Security.",
        "delegationPolicy": "auto",
        "color": "#1e3a8a"
      },
      {
        "id": "ms-evp-cloud",
        "roleTitle": "EVP Cloud & AI Platform",
        "name": "Executive VP - Cloud & AI Platform",
        "level": 1,
        "parentId": "ms-ceo",
        "responsibilities": "Lead global hyperscale cloud infrastructure, data centers, distributed systems, and frontier AI models.",
        "workflowInstructions": "Direct VP of Cloud Infrastructure and VP of AI Services. Drive multi-region cloud resilience.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "ms-evp-apps",
        "roleTitle": "EVP Productivity & Apps",
        "name": "Executive VP - Core Productivity & Apps",
        "level": 1,
        "parentId": "ms-ceo",
        "responsibilities": "Own enterprise workspace tools, collaborative office apps, web clients, and digital experiences.",
        "workflowInstructions": "Direct Vice Presidents of Application Engineering and design cross-platform collaborative suites.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "ms-evp-sec",
        "roleTitle": "EVP Security & Compliance",
        "name": "Executive VP - Enterprise Trust & Security",
        "level": 1,
        "parentId": "ms-ceo",
        "responsibilities": "Safeguard customer data across all cloud products, lead global threat intelligence, and zero-trust security.",
        "workflowInstructions": "Direct CISO and compliance leadership. Protect enterprise platforms against state-sponsored threats.",
        "delegationPolicy": "auto",
        "color": "#b91c1c"
      },
      {
        "id": "ms-vp-azure",
        "roleTitle": "VP Azure Core Infrastructure",
        "name": "VP - Hyperscale Cloud Infrastructure",
        "level": 2,
        "parentId": "ms-evp-cloud",
        "responsibilities": "Manage worldwide data center compute, hypervisor virtualization, and high-bandwidth SDN networks.",
        "workflowInstructions": "Lead Principal Cloud Architects and systems engineers to ensure 99.999% SLA across cloud regions.",
        "delegationPolicy": "auto",
        "color": "#0369a1"
      },
      {
        "id": "ms-vp-ai",
        "roleTitle": "VP AI Services & Cognitive",
        "name": "VP - Generative AI & Cognitive Services",
        "level": 2,
        "parentId": "ms-evp-cloud",
        "responsibilities": "Drive large language model inference clusters, vector databases, multimodal APIs, and AI agent frameworks.",
        "workflowInstructions": "Lead AI research scientists and MLOps platform teams to deliver state-of-the-art enterprise AI.",
        "delegationPolicy": "auto",
        "color": "#7c3aed"
      },
      {
        "id": "ms-cloud-arch",
        "roleTitle": "Principal Cloud Architect",
        "name": "Principal Distributed Systems Architect",
        "level": 3,
        "parentId": "ms-vp-azure",
        "responsibilities": "Design global distributed fault tolerance, geo-replication consensus, and hardware acceleration clusters.",
        "workflowInstructions": "Author RFC architecture specifications and guide cloud systems engineering teams.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "ms-cloud-eng",
        "roleTitle": "Cloud Systems Engineer",
        "name": "Staff Systems & Infrastructure Engineer",
        "level": 4,
        "parentId": "ms-cloud-arch",
        "responsibilities": "Build kernel-level virtualization drivers, automated datacenter failover, and hardware health monitors.",
        "workflowInstructions": "Implement low-latency C++/Rust systems code and maintain automated deployment pipelines.",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "ms-ai-sci",
        "roleTitle": "Principal AI Research Scientist",
        "name": "Principal Research Scientist - Frontier AI",
        "level": 3,
        "parentId": "ms-vp-ai",
        "responsibilities": "Train next-generation foundation models, reasoning engines, and reinforcement learning agent loops.",
        "workflowInstructions": "Conduct cutting-edge model training runs, benchmark safety guardrails, and publish advancements.",
        "delegationPolicy": "auto",
        "color": "#a855f7"
      },
      {
        "id": "ms-mlops-lead",
        "roleTitle": "MLOps Platform Lead",
        "name": "Lead MLOps & Inference Optimization Engineer",
        "level": 4,
        "parentId": "ms-ai-sci",
        "responsibilities": "Optimize GPU cluster utilization, vLLM/TensorRT model quantization, and sub-10ms token generation.",
        "workflowInstructions": "Scale model serving endpoints and automate weights deployment across GPU clusters.",
        "delegationPolicy": "both",
        "color": "#c084fc"
      },
      {
        "id": "ms-vp-app-eng",
        "roleTitle": "VP Core Apps Engineering",
        "name": "VP - Collaborative Apps & Platforms",
        "level": 2,
        "parentId": "ms-evp-apps",
        "responsibilities": "Lead application engineering across web, desktop, and mobile for global productivity tools.",
        "workflowInstructions": "Direct Tech Leads and product engineers to ship high-performance, real-time collaborative features.",
        "delegationPolicy": "auto",
        "color": "#047857"
      },
      {
        "id": "ms-app-lead",
        "roleTitle": "Tech Lead - Web Apps",
        "name": "Principal Tech Lead - Modern Web Suite",
        "level": 3,
        "parentId": "ms-vp-app-eng",
        "responsibilities": "Lead real-time collaborative document editing, WebAssembly canvas engines, and UI responsiveness.",
        "workflowInstructions": "Architect client-side state synchronization, review PRs, and mentor frontend/backend engineers.",
        "delegationPolicy": "auto",
        "color": "#10b981"
      },
      {
        "id": "ms-fe-eng",
        "roleTitle": "Staff Frontend Engineer",
        "name": "Staff Frontend Systems Engineer",
        "level": 4,
        "parentId": "ms-app-lead",
        "responsibilities": "Build accessible, high-framerate 60fps web UI components with strict security sandboxing.",
        "workflowInstructions": "Write production React/TypeScript components, optimize DOM rendering, and write unit tests.",
        "delegationPolicy": "peers",
        "color": "#34d399"
      },
      {
        "id": "ms-be-eng",
        "roleTitle": "Staff Backend Engineer",
        "name": "Staff Distributed Backend Engineer",
        "level": 4,
        "parentId": "ms-app-lead",
        "responsibilities": "Scale multi-tenant document microservices, operational transformation (OT) sync, and cloud persistence.",
        "workflowInstructions": "Implement high-throughput gRPC services, manage Cassandra/Cosmos data models, and benchmark latency.",
        "delegationPolicy": "peers",
        "color": "#6ee7b7"
      },
      {
        "id": "ms-ciso",
        "roleTitle": "Chief Information Security Officer",
        "name": "Chief Information Security Officer",
        "level": 2,
        "parentId": "ms-evp-sec",
        "responsibilities": "Lead enterprise defense, vulnerability management, red-teaming, and global SOC operations.",
        "workflowInstructions": "Supervise SecOps and Threat Intelligence teams. Coordinate emergency zero-day patch deployments.",
        "delegationPolicy": "auto",
        "color": "#dc2626"
      },
      {
        "id": "ms-sec-lead",
        "roleTitle": "Lead SecOps Engineer",
        "name": "Lead Security Operations & Incident Response",
        "level": 3,
        "parentId": "ms-ciso",
        "responsibilities": "Manage automated threat detection SIEM rules, zero-trust network boundaries, and incident playbooks.",
        "workflowInstructions": "Investigate security alerts, direct threat mitigation, and enforce multi-factor hardware keys.",
        "delegationPolicy": "both",
        "color": "#ef4444"
      },
      {
        "id": "ms-threat-analyst",
        "roleTitle": "Threat Intelligence Analyst",
        "name": "Senior Threat Intelligence Researcher",
        "level": 4,
        "parentId": "ms-sec-lead",
        "responsibilities": "Track advanced persistent threats (APT), analyze malicious malware signatures, and publish advisories.",
        "workflowInstructions": "Analyze adversary infrastructure, contribute detection rules to cloud firewalls, and brief leadership.",
        "delegationPolicy": "up",
        "color": "#f87171"
      },
      {
        "id": "ms-comp-officer",
        "roleTitle": "Compliance & Audit Officer",
        "name": "Global Compliance & Privacy Officer",
        "level": 3,
        "parentId": "ms-ciso",
        "responsibilities": "Ensure worldwide compliance with GDPR, HIPAA, SOC 2 Type II, FedRAMP, and ISO 27001.",
        "workflowInstructions": "Conduct internal security audits, liaise with external certifiers, and review data governance.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-yc-seed-startup",
    "name": "YC Seed Stage Startup",
    "companyName": "YC Seed Stage Startup",
    "description": "Lean high-velocity early-stage startup structure with solo/duo founders, rapid full-stack engineering, and AI prototyping.",
    "category": "Startups",
    "domain": "Early Stage Software",
    "color": "#f97316",
    "icon": "Rocket",
    "nodes": [
      {
        "id": "yc-ceo",
        "roleTitle": "CEO / Co-Founder",
        "name": "Chief Executive & Product Lead",
        "level": 0,
        "parentId": null,
        "responsibilities": "Drive product vision, fundraise with investors, talk to first 100 users, and close initial design partner deals.",
        "workflowInstructions": "Prioritize weekly product roadmap. Delegate feature build to Fullstack Engineer and AI research to AI Prototyper.",
        "delegationPolicy": "auto",
        "color": "#ea580c"
      },
      {
        "id": "yc-tech-lead",
        "roleTitle": "CTO / Fullstack Lead",
        "name": "Founding Engineer & CTO",
        "level": 1,
        "parentId": "yc-ceo",
        "responsibilities": "Build end-to-end web app, setup database architecture, ship daily production releases, and ensure zero downtime.",
        "workflowInstructions": "Break founder specifications into daily shipping increments. Review pull requests from Fullstack Developer.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "yc-fullstack",
        "roleTitle": "Full-Stack Engineer",
        "name": "Founding Full-Stack Developer",
        "level": 2,
        "parentId": "yc-tech-lead",
        "responsibilities": "Implement user-facing frontend components, write backend REST/tRPC APIs, and integrate third-party payment/auth SDKs.",
        "workflowInstructions": "Pick up sprint tickets, write clean TypeScript/React/Node code, fix user bugs, and deploy via Vercel/Fly.io.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "yc-ai-dev",
        "roleTitle": "AI Prototyper",
        "name": "Applied AI & Prompt Engineer",
        "level": 2,
        "parentId": "yc-tech-lead",
        "responsibilities": "Develop LLM prompts, evaluate model accuracy, build agent workflows, and optimize vector search embeddings.",
        "workflowInstructions": "Experiment with frontier model APIs, run automated eval benchmarks, and push production prompts to the codebase.",
        "delegationPolicy": "up",
        "color": "#8b5cf6"
      }
    ]
  },
  {
    "id": "chain-bootstrapped-micro-saas",
    "name": "Bootstrapped Micro-SaaS",
    "companyName": "Bootstrapped Micro-SaaS",
    "description": "Ultra-lean indie software business operated with minimal overhead, automated customer support, and outsourced design.",
    "category": "Startups",
    "domain": "Micro-SaaS",
    "color": "#10b981",
    "icon": "Zap",
    "nodes": [
      {
        "id": "msaas-founder",
        "roleTitle": "Solo Founder & Developer",
        "name": "Indie Hacker / Operator",
        "level": 0,
        "parentId": null,
        "responsibilities": "Maintain product codebase, manage monthly recurring revenue (MRR), prioritize feature requests, and lead customer retention.",
        "workflowInstructions": "Oversee support queries, direct freelance designer, and maintain CI/CD automated deployments.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "msaas-support",
        "roleTitle": "Customer Support Specialist",
        "name": "Community & Support Lead",
        "level": 1,
        "parentId": "msaas-founder",
        "responsibilities": "Handle frontline customer email and live chat, diagnose customer bug reports, and maintain public knowledge base docs.",
        "workflowInstructions": "Triage incoming help tickets. Escalate validated software bugs and reproducible errors directly to the Founder.",
        "delegationPolicy": "up",
        "color": "#0284c7"
      },
      {
        "id": "msaas-designer",
        "roleTitle": "Contract UI/UX Designer",
        "name": "Product Designer (Freelance)",
        "level": 1,
        "parentId": "msaas-founder",
        "responsibilities": "Design clean SaaS landing pages, onboarding modals, dashboard wireframes, and marketing visual assets.",
        "workflowInstructions": "Deliver Figma components and design tokens following the founder's lightweight product spec.",
        "delegationPolicy": "up",
        "color": "#d946ef"
      },
      {
        "id": "msaas-growth",
        "roleTitle": "Growth & SEO Marketer",
        "name": "Organic Acquisition Specialist",
        "level": 1,
        "parentId": "msaas-founder",
        "responsibilities": "Run programmatic SEO campaigns, publish comparison blog posts, build free mini-tools, and optimize conversion funnels.",
        "workflowInstructions": "Analyze organic search traffic, track keyword rankings, and recommend onboarding funnel improvements.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-stealth-ai-startup",
    "name": "Stealth AI Lab Startup",
    "companyName": "Stealth AI Lab Startup",
    "description": "Deep tech generative AI team focused on proprietary model fine-tuning, high-throughput GPU inference, and agentic orchestration.",
    "category": "Artificial Intelligence",
    "domain": "DeepTech AI",
    "color": "#8b5cf6",
    "icon": "Cpu",
    "nodes": [
      {
        "id": "stealth-ceo",
        "roleTitle": "CEO / Chief Scientist",
        "name": "Founder & AI Research Director",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead breakthrough model architecture vision, secure strategic GPU allocations, and align venture capital syndicate.",
        "workflowInstructions": "Set weekly research hypotheses. Direct Model Research Lead and Platform Architect on experimentation priorities.",
        "delegationPolicy": "auto",
        "color": "#7c3aed"
      },
      {
        "id": "stealth-res-lead",
        "roleTitle": "Head of AI Research",
        "name": "Principal ML Scientist",
        "level": 1,
        "parentId": "stealth-ceo",
        "responsibilities": "Design model architectures, training loss functions, synthetic data curation pipelines, and distillation strategies.",
        "workflowInstructions": "Direct ML Research Scientist on training runs and benchmark evaluations across reasoning and code generation tasks.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "stealth-ml-sci",
        "roleTitle": "ML Research Scientist",
        "name": "Applied Deep Learning Scientist",
        "level": 2,
        "parentId": "stealth-res-lead",
        "responsibilities": "Execute multi-node PyTorch pretraining and LoRA fine-tuning, curate datasets, and validate safety alignment benchmarks.",
        "workflowInstructions": "Run automated ablation studies, monitor WandB loss curves, and checkpoint model weights for deployment.",
        "delegationPolicy": "up",
        "color": "#a855f7"
      },
      {
        "id": "stealth-infra-lead",
        "roleTitle": "Head of AI Infrastructure",
        "name": "GPU Cluster & Platform Architect",
        "level": 1,
        "parentId": "stealth-ceo",
        "responsibilities": "Manage high-performance GPU clusters (H100/B200), Slurm job schedulers, InfiniBand networking, and low-latency inference.",
        "workflowInstructions": "Optimize vLLM / TensorRT-LLM serving endpoints and collaborate with Fullstack Dev on integration APIs.",
        "delegationPolicy": "both",
        "color": "#0ea5e9"
      },
      {
        "id": "stealth-ai-eng",
        "roleTitle": "Fullstack AI Engineer",
        "name": "Application & Agent Systems Dev",
        "level": 2,
        "parentId": "stealth-infra-lead",
        "responsibilities": "Build developer SDKs, customer streaming web interfaces, context window memory buffers, and tool-calling execution sandboxes.",
        "workflowInstructions": "Integrate inference endpoints into web applications and report model latency anomalies to Infrastructure.",
        "delegationPolicy": "up",
        "color": "#14b8a6"
      }
    ]
  },
  {
    "id": "chain-series-a-saas-scaleup",
    "name": "Series A SaaS Scaleup",
    "companyName": "Series A SaaS Scaleup",
    "description": "Growth-stage software company scaling from PMF to predictable revenue, introducing functional engineering and product squads.",
    "category": "Software",
    "domain": "B2B SaaS",
    "color": "#2563eb",
    "icon": "TrendingUp",
    "nodes": [
      {
        "id": "sa-ceo",
        "roleTitle": "CEO",
        "name": "Chief Executive Officer",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead executive company vision, board reporting, executive hiring, and cross-functional company OKR alignment.",
        "workflowInstructions": "Delegate technical strategy to VP Engineering, roadmap to Head of Product, and pipeline to Head of Growth.",
        "delegationPolicy": "auto",
        "color": "#1e40af"
      },
      {
        "id": "sa-vp-eng",
        "roleTitle": "VP of Engineering",
        "name": "Engineering Leadership Head",
        "level": 1,
        "parentId": "sa-ceo",
        "responsibilities": "Scale engineering organization, enforce architectural rigor, maintain deployment velocity, and remove team blockers.",
        "workflowInstructions": "Direct Tech Lead and QA Engineer. Ensure timely sprint delivery and technical debt reduction.",
        "delegationPolicy": "auto",
        "color": "#2563eb"
      },
      {
        "id": "sa-tech-lead",
        "roleTitle": "Tech Lead",
        "name": "Full-Stack Tech Lead",
        "level": 2,
        "parentId": "sa-vp-eng",
        "responsibilities": "Own application architecture, database schemas, code reviews, and squad technical task division.",
        "workflowInstructions": "Assign sprint user stories to Backend and Frontend developers, unblock technical roadblocks, and review PRs.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "sa-be-dev",
        "roleTitle": "Senior Backend Engineer",
        "name": "Core Backend Developer",
        "level": 3,
        "parentId": "sa-tech-lead",
        "responsibilities": "Build scalable microservices, manage PostgreSQL queries, implement background worker queues, and secure API endpoints.",
        "workflowInstructions": "Deliver robust backend APIs, write unit/integration tests, and support frontend integration.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "sa-fe-dev",
        "roleTitle": "Senior Frontend Engineer",
        "name": "UI & Web Client Developer",
        "level": 3,
        "parentId": "sa-tech-lead",
        "responsibilities": "Build high-performance React/Next.js client experiences, state management stores, and accessible design components.",
        "workflowInstructions": "Consume backend APIs, implement interactive interfaces, and ensure smooth cross-browser responsiveness.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "sa-qa",
        "roleTitle": "QA Automation Engineer",
        "name": "Software Quality Engineer",
        "level": 2,
        "parentId": "sa-vp-eng",
        "responsibilities": "Design automated Playwright/Cypress end-to-end testing suites and verify release builds before staging push.",
        "workflowInstructions": "File reproducible bug reports, verify fixes with engineers, and run automated smoke test pipelines.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "sa-head-prod",
        "roleTitle": "Head of Product",
        "name": "Product Strategy Lead",
        "level": 1,
        "parentId": "sa-ceo",
        "responsibilities": "Define quarterly product roadmap, analyze customer usage analytics, and prioritize high-value customer feature requests.",
        "workflowInstructions": "Direct Product Designer and coordinate release scope with VP Engineering and Tech Lead.",
        "delegationPolicy": "auto",
        "color": "#7c3aed"
      },
      {
        "id": "sa-designer",
        "roleTitle": "Senior Product Designer",
        "name": "UI/UX & Design Systems",
        "level": 2,
        "parentId": "sa-head-prod",
        "responsibilities": "Conduct customer discovery sessions, build interactive Figma prototypes, and maintain shared UI design tokens.",
        "workflowInstructions": "Handoff visual specifications and design assets to Frontend Developers, ensuring design fidelity.",
        "delegationPolicy": "both",
        "color": "#d946ef"
      },
      {
        "id": "sa-growth",
        "roleTitle": "Head of Growth",
        "name": "Growth Marketing & Acquisition",
        "level": 1,
        "parentId": "sa-ceo",
        "responsibilities": "Own user acquisition funnels, self-serve onboarding conversion rates, lifecycle email automation, and paid marketing.",
        "workflowInstructions": "Direct Growth Marketer to launch experiments, test pricing tiers, and optimize signup-to-paid conversions.",
        "delegationPolicy": "auto",
        "color": "#f59e0b"
      },
      {
        "id": "sa-growth-marketer",
        "roleTitle": "Growth Marketer",
        "name": "Performance & Content Specialist",
        "level": 2,
        "parentId": "sa-growth",
        "responsibilities": "Execute A/B tests on landing pages, run search ad campaigns, write customer case studies, and analyze churn metrics.",
        "workflowInstructions": "Report conversion analytics, manage CRM campaign triggers, and collaborate with Product on activation loops.",
        "delegationPolicy": "up",
        "color": "#fbbf24"
      }
    ]
  },
  {
    "id": "chain-series-b-b2b-saas",
    "name": "Series B Enterprise SaaS",
    "companyName": "Series B Enterprise SaaS",
    "description": "Mature multi-department enterprise software organization with specialized Product, Engineering, Sales, and Customer Success divisions.",
    "category": "Software",
    "domain": "Enterprise SaaS",
    "color": "#3b82f6",
    "icon": "Building",
    "nodes": [
      {
        "id": "sb-ceo",
        "roleTitle": "CEO",
        "name": "Chief Executive Officer",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead overall enterprise market penetration, strategic board governance, capital deployment, and organizational culture.",
        "workflowInstructions": "Align VP Engineering, VP Product, VP Sales, and VP Customer Success towards corporate annual recurring revenue (ARR) goals.",
        "delegationPolicy": "auto",
        "color": "#1e3a8a"
      },
      {
        "id": "sb-vp-eng",
        "roleTitle": "VP of Engineering",
        "name": "Engineering Organization Head",
        "level": 1,
        "parentId": "sb-ceo",
        "responsibilities": "Manage engineering squads, SOC2 compliance, uptime reliability, developer velocity, and infrastructure budgets.",
        "workflowInstructions": "Direct Engineering Managers, Cloud Architect, and Security Lead on technical delivery and SLAs.",
        "delegationPolicy": "auto",
        "color": "#2563eb"
      },
      {
        "id": "sb-eng-mgr",
        "roleTitle": "Engineering Manager",
        "name": "Squad Delivery Manager",
        "level": 2,
        "parentId": "sb-vp-eng",
        "responsibilities": "Lead sprint ceremonies, track burndown velocity, remove operational blockers, and mentor software developers.",
        "workflowInstructions": "Assign feature epics to Tech Leads, conduct 1-on-1s, and report sprint progress to VP Engineering.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "sb-tech-lead",
        "roleTitle": "Principal Tech Lead",
        "name": "Architecture & Technical Lead",
        "level": 3,
        "parentId": "sb-eng-mgr",
        "responsibilities": "Own system architecture, RFCs, technical debt refactoring, and code review standards.",
        "workflowInstructions": "Direct Senior Backend and Frontend engineers on technical specifications and pull requests.",
        "delegationPolicy": "both",
        "color": "#0ea5e9"
      },
      {
        "id": "sb-sr-be",
        "roleTitle": "Senior Backend Engineer",
        "name": "Distributed Systems Engineer",
        "level": 4,
        "parentId": "sb-tech-lead",
        "responsibilities": "Build fault-tolerant distributed services, optimize SQL query execution, and implement secure enterprise webhooks.",
        "workflowInstructions": "Write resilient microservice logic, publish API documentation, and handle database migrations.",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "sb-sr-fe",
        "roleTitle": "Senior Frontend Engineer",
        "name": "Enterprise Web Apps Specialist",
        "level": 4,
        "parentId": "sb-tech-lead",
        "responsibilities": "Build complex data tables, role-based access control (RBAC) UI, and real-time collaborative workspace canvas.",
        "workflowInstructions": "Deliver reusable React components, optimize virtualized lists, and write automated component tests.",
        "delegationPolicy": "both",
        "color": "#67e8f9"
      },
      {
        "id": "sb-devops",
        "roleTitle": "DevOps & Cloud Architect",
        "name": "Infrastructure & SRE Lead",
        "level": 2,
        "parentId": "sb-vp-eng",
        "responsibilities": "Own Kubernetes clusters, multi-region failover, Terraform infrastructure-as-code, and Prometheus/Datadog monitoring.",
        "workflowInstructions": "Maintain 99.95% production uptime, automate CI/CD pipeline tests, and manage cloud cost efficiency.",
        "delegationPolicy": "both",
        "color": "#ec4899"
      },
      {
        "id": "sb-vp-prod",
        "roleTitle": "VP of Product",
        "name": "Chief Product Officer",
        "level": 1,
        "parentId": "sb-ceo",
        "responsibilities": "Define multi-year enterprise product strategy, pricing packaging, marketplace integrations, and analyst relations (Gartner/Forrester).",
        "workflowInstructions": "Direct Product Managers and Design Director on user journey maps and release milestones.",
        "delegationPolicy": "auto",
        "color": "#7c3aed"
      },
      {
        "id": "sb-pm",
        "roleTitle": "Senior Product Manager",
        "name": "Enterprise Workflow PM",
        "level": 2,
        "parentId": "sb-vp-prod",
        "responsibilities": "Gather enterprise customer feedback, write detailed PRDs, coordinate user acceptance testing, and track adoption metrics.",
        "workflowInstructions": "Work closely with Engineering Manager to groom sprint backlogs and validate delivered features.",
        "delegationPolicy": "both",
        "color": "#a855f7"
      },
      {
        "id": "sb-designer",
        "roleTitle": "Lead Product Designer",
        "name": "UI/UX & User Research Lead",
        "level": 2,
        "parentId": "sb-vp-prod",
        "responsibilities": "Design intuitive enterprise workflows, complex configuration dashboards, and conduct usability testing interviews.",
        "workflowInstructions": "Deliver pixel-perfect Figma specs and collaborate with frontend developers during implementation reviews.",
        "delegationPolicy": "both",
        "color": "#d946ef"
      },
      {
        "id": "sb-vp-sales",
        "roleTitle": "VP of Sales",
        "name": "Head of Global Enterprise Sales",
        "level": 1,
        "parentId": "sb-ceo",
        "responsibilities": "Drive enterprise new logo acquisition, six-figure deal negotiations, territory planning, and sales quota attainment.",
        "workflowInstructions": "Direct Enterprise Account Executives and Solutions Engineers on enterprise RFP bids and executive demos.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "sb-ae",
        "roleTitle": "Enterprise Account Executive",
        "name": "Strategic Account Sales",
        "level": 2,
        "parentId": "sb-vp-sales",
        "responsibilities": "Prospect Fortune 500 accounts, conduct executive discovery calls, negotiate master services agreements (MSAs), and close contracts.",
        "workflowInstructions": "Partner with Solutions Engineer to run customized client demonstrations and handle procurement security reviews.",
        "delegationPolicy": "both",
        "color": "#f59e0b"
      },
      {
        "id": "sb-se",
        "roleTitle": "Solutions Engineer",
        "name": "Pre-Sales Technical Architect",
        "level": 2,
        "parentId": "sb-vp-sales",
        "responsibilities": "Build customized enterprise proof-of-concept (POC) integrations, answer technical security questionnaires, and demo APIs.",
        "workflowInstructions": "Unblock technical doubts during customer sales evaluations and hand off closed deals to Customer Success.",
        "delegationPolicy": "both",
        "color": "#fbbf24"
      },
      {
        "id": "sb-vp-cs",
        "roleTitle": "VP of Customer Success",
        "name": "Head of Client Retention & Growth",
        "level": 1,
        "parentId": "sb-ceo",
        "responsibilities": "Drive net revenue retention (NRR > 120%), client onboarding time-to-value, executive sponsor relationships, and renewals.",
        "workflowInstructions": "Direct Customer Success Managers on adoption health scores, quarterly business reviews (QBRs), and churn prevention.",
        "delegationPolicy": "auto",
        "color": "#059669"
      }
    ]
  },
  {
    "id": "chain-product-led-growth-saas",
    "name": "Product-Led Growth (PLG) SaaS",
    "companyName": "Product-Led Growth (PLG) SaaS",
    "description": "Freemium, self-serve SaaS company optimized for user activation, viral growth loops, automated onboarding, and product telemetry.",
    "category": "Software",
    "domain": "PLG SaaS",
    "color": "#06b6d4",
    "icon": "Flame",
    "nodes": [
      {
        "id": "plg-ceo",
        "roleTitle": "CEO",
        "name": "Chief Executive & Growth Strategist",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead product-first viral growth philosophy, self-serve monetization strategy, and capital allocation.",
        "workflowInstructions": "Direct CPO, Head of Growth Engineering, and Lead Data Scientist to accelerate activation and viral expansion.",
        "delegationPolicy": "auto",
        "color": "#0891b2"
      },
      {
        "id": "plg-cpo",
        "roleTitle": "Chief Product Officer",
        "name": "Head of Product & User Experience",
        "level": 1,
        "parentId": "plg-ceo",
        "responsibilities": "Drive product intuitive simplicity, frictionless sign-up flows, time-to-value velocity, and collaborative virality.",
        "workflowInstructions": "Direct Growth PM and Onboarding UX Designer on activation experiments and feature discovery popups.",
        "delegationPolicy": "auto",
        "color": "#7c3aed"
      },
      {
        "id": "plg-pm",
        "roleTitle": "Growth Product Manager",
        "name": "Onboarding & Activation PM",
        "level": 2,
        "parentId": "plg-cpo",
        "responsibilities": "Analyze user drop-off funnels, design interactive guided product tours, and formulate A/B test hypotheses.",
        "workflowInstructions": "Coordinate with Growth Engineer to launch onboarding experiments and track day-1/day-7 cohort retention.",
        "delegationPolicy": "both",
        "color": "#a855f7"
      },
      {
        "id": "plg-ux",
        "roleTitle": "Onboarding UX Designer",
        "name": "Product Growth & Interaction Designer",
        "level": 2,
        "parentId": "plg-cpo",
        "responsibilities": "Design delightful empty states, interactive checklists, contextual micro-copy, and celebratory milestone animations.",
        "workflowInstructions": "Deliver high-converting UI components that guide new users seamlessly to their 'Aha!' moment.",
        "delegationPolicy": "both",
        "color": "#d946ef"
      },
      {
        "id": "plg-head-eng",
        "roleTitle": "Head of Growth Engineering",
        "name": "Full-Stack Growth Tech Lead",
        "level": 1,
        "parentId": "plg-ceo",
        "responsibilities": "Lead engineering squad dedicated to rapid experimentation, referral mechanics, billing portals, and feature gating.",
        "workflowInstructions": "Direct Fullstack Growth Dev and Core Platform Dev on weekly experiment deployments and performance.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "plg-growth-dev",
        "roleTitle": "Growth Fullstack Developer",
        "name": "Experimentation & Feature Flags Dev",
        "level": 2,
        "parentId": "plg-head-eng",
        "responsibilities": "Implement client-side experiment variations using LaunchDarkly/PostHog, build payment checkout modals, and invite teammates UI.",
        "workflowInstructions": "Ship rapid code variations, track custom telemetry events, and iterate on winning experiment branches.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "plg-plat-dev",
        "roleTitle": "Core Platform Developer",
        "name": "Core App & Performance Engineer",
        "level": 2,
        "parentId": "plg-head-eng",
        "responsibilities": "Ensure sub-second page loads, optimize API latency, and maintain rock-solid uptime for millions of free-tier users.",
        "workflowInstructions": "Scale backend database queries, implement Redis caching, and maintain automated regression tests.",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "plg-data-head",
        "roleTitle": "Lead Product Data Scientist",
        "name": "Analytics & Telemetry Lead",
        "level": 1,
        "parentId": "plg-ceo",
        "responsibilities": "Own user event instrumentation, behavioral cohort clustering, conversion attribution models, and churn predictors.",
        "workflowInstructions": "Provide daily analytics dashboards to Product and Engineering on experiment significance and feature engagement.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "plg-data-analyst",
        "roleTitle": "Product Data Analyst",
        "name": "Growth Metrics & Funnel Analyst",
        "level": 2,
        "parentId": "plg-data-head",
        "responsibilities": "Write SQL transformations in dbt, build Amplitude/Mixpanel dashboards, and identify friction points in user journeys.",
        "workflowInstructions": "Deliver deep-dive cohort analysis reports and flag unexpected changes in user signup conversion.",
        "delegationPolicy": "up",
        "color": "#34d399"
      },
      {
        "id": "plg-lifecycle",
        "roleTitle": "Lifecycle Marketing Specialist",
        "name": "Email & In-App Messaging Lead",
        "level": 2,
        "parentId": "plg-cpo",
        "responsibilities": "Configure automated behavioral email sequences, trigger Slack/push notifications, and re-engage dormant users.",
        "workflowInstructions": "Segment users based on product activity milestones and optimize subject lines to boost user reactivation.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-api-first-developer-platform",
    "name": "API-First Developer Platform (Stripe/Twilio Style)",
    "companyName": "API-First Developer Platform (Stripe/Twilio Style)",
    "description": "Engineering-centric platform company delivering mission-critical REST/GraphQL APIs, multi-language SDKs, and developer docs.",
    "category": "Software",
    "domain": "Developer Tools",
    "color": "#6366f1",
    "icon": "Terminal",
    "nodes": [
      {
        "id": "api-ceo",
        "roleTitle": "CEO",
        "name": "Chief Executive & Developer Platform Evangelist",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead developer platform strategy, ecosystem partner relations, enterprise API pricing models, and developer trust.",
        "workflowInstructions": "Align VP of Engineering, Head of Developer Relations, and Product Director around developer experience excellence.",
        "delegationPolicy": "auto",
        "color": "#4338ca"
      },
      {
        "id": "api-vp-eng",
        "roleTitle": "VP of Engineering",
        "name": "Head of Platform & Distributed Systems",
        "level": 1,
        "parentId": "api-ceo",
        "responsibilities": "Ensure 99.999% API availability, sub-50ms global latency, fault-tolerant idempotency, and automated rate limiting.",
        "workflowInstructions": "Direct Core API Architect, SDK Engineering Lead, and Infrastructure SRE on platform delivery.",
        "delegationPolicy": "auto",
        "color": "#3b82f6"
      },
      {
        "id": "api-architect",
        "roleTitle": "Core API Architect",
        "name": "Principal Backend API Architect",
        "level": 2,
        "parentId": "api-vp-eng",
        "responsibilities": "Design OpenAPI/RESTful specifications, JSON payload contracts, webhook delivery infrastructure, and error schemas.",
        "workflowInstructions": "Enforce backward compatibility, review API change requests, and supervise Backend Services Developers.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "api-be-dev",
        "roleTitle": "Backend Services Developer",
        "name": "High-Concurrency API Engineer",
        "level": 3,
        "parentId": "api-architect",
        "responsibilities": "Implement high-throughput Go/Rust backend services, Redis token bucket rate limiters, and idempotency key locks.",
        "workflowInstructions": "Write comprehensive automated unit and load tests, monitor API response latency, and deploy microservices.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "api-sdk-lead",
        "roleTitle": "SDK Engineering Lead",
        "name": "Multi-Language SDK Architect",
        "level": 2,
        "parentId": "api-vp-eng",
        "responsibilities": "Maintain official client libraries in TypeScript, Python, Go, Java, Ruby, and PHP with automated code generation.",
        "workflowInstructions": "Ensure idiomatic language ergonomics, write automated SDK integration tests, and publish packages to npm/PyPI.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "api-sdk-dev",
        "roleTitle": "SDK & CLI Developer",
        "name": "Developer Tooling Engineer",
        "level": 3,
        "parentId": "api-sdk-lead",
        "responsibilities": "Build developer command-line interfaces (CLI), local sandbox mock servers, and interactive code generation tools.",
        "workflowInstructions": "Maintain code samples, fix community GitHub issues, and optimize SDK package install sizes.",
        "delegationPolicy": "up",
        "color": "#a855f7"
      },
      {
        "id": "api-head-devrel",
        "roleTitle": "Head of Developer Relations",
        "name": "Developer Community & DevRel Director",
        "level": 1,
        "parentId": "api-ceo",
        "responsibilities": "Lead worldwide developer advocacy, hackathons, developer conferences, Discord community, and technical content.",
        "workflowInstructions": "Direct Developer Advocates and Lead Technical Writer on documentation clarity and tutorials.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "api-tech-writer",
        "roleTitle": "Lead Technical Writer",
        "name": "API Documentation & Tutorials Lead",
        "level": 2,
        "parentId": "api-head-devrel",
        "responsibilities": "Write crystal-clear interactive API reference docs, quickstart guides, troubleshooting FAQs, and migration guides.",
        "workflowInstructions": "Test code snippets, maintain OpenAPI documentation portals (Mintlify/ReadMe), and gather feedback from developers.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "api-advocate",
        "roleTitle": "Developer Advocate",
        "name": "Developer Evangelist & Engineer",
        "level": 2,
        "parentId": "api-head-devrel",
        "responsibilities": "Create video tutorials, open-source template repositories, sample full-stack boilerplates, and livestream coding sessions.",
        "workflowInstructions": "Collect developer friction feedback from Discord/GitHub and report product enhancement tickets to API Architects.",
        "delegationPolicy": "up",
        "color": "#fbbf24"
      }
    ]
  },
  {
    "id": "chain-high-scale-distributed-saas",
    "name": "High-Scale Distributed SaaS",
    "companyName": "High-Scale Distributed SaaS",
    "description": "Tier-1 cloud software architecture serving billions of requests per month with multi-region database shards, Kafka, and SRE.",
    "category": "Software",
    "domain": "Cloud Distributed Systems",
    "color": "#1e3a8a",
    "icon": "Server",
    "nodes": [
      {
        "id": "dist-cto",
        "roleTitle": "Chief Technology Officer",
        "name": "CTO & VP Engineering",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead long-term distributed systems architecture, cloud infrastructure capital budget, and global technical resilience.",
        "workflowInstructions": "Direct VP Platform Engineering and VP Applications Engineering to uphold enterprise SLAs and zero-loss guarantees.",
        "delegationPolicy": "auto",
        "color": "#1e3a8a"
      },
      {
        "id": "dist-vp-plat",
        "roleTitle": "VP Platform Engineering",
        "name": "Infrastructure & Core Systems Head",
        "level": 1,
        "parentId": "dist-cto",
        "responsibilities": "Oversee multi-region Kubernetes clusters, database replication, distributed object storage, and 24/7 site reliability.",
        "workflowInstructions": "Direct Distributed Systems Architect, Storage Lead, and SRE Director on fault tolerance and disaster recovery.",
        "delegationPolicy": "auto",
        "color": "#2563eb"
      },
      {
        "id": "dist-sys-arch",
        "roleTitle": "Distributed Systems Architect",
        "name": "Principal Distributed Systems Engineer",
        "level": 2,
        "parentId": "dist-vp-plat",
        "responsibilities": "Design consensus algorithms, distributed locks, Kafka event streaming topologies, and geo-replicated data models.",
        "workflowInstructions": "Review architectural RFCs, eliminate single points of failure (SPOFs), and guide Core Backend developers.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "dist-db-lead",
        "roleTitle": "Lead Storage & Database Architect",
        "name": "Data Persistence Specialist",
        "level": 2,
        "parentId": "dist-vp-plat",
        "responsibilities": "Manage multi-terabyte PostgreSQL partitions, CockroachDB distributed nodes, Redis clustering, and automated backups.",
        "workflowInstructions": "Optimize query execution plans, prevent connection exhaustion, and automate point-in-time recovery testing.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "dist-sre-dir",
        "roleTitle": "Director of Site Reliability",
        "name": "Global SRE & Production Operations",
        "level": 2,
        "parentId": "dist-vp-plat",
        "responsibilities": "Enforce error budgets, manage on-call rotations, run chaos engineering game days, and lead high-severity post-mortems.",
        "workflowInstructions": "Direct Senior SREs and Observability Engineers to maintain 99.99% availability across global regions.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "dist-sre-eng",
        "roleTitle": "Senior Site Reliability Engineer",
        "name": "On-Call Reliability & Chaos Eng",
        "level": 3,
        "parentId": "dist-sre-dir",
        "responsibilities": "Automate Kubernetes cluster auto-scaling, write Terraform disaster recovery playbooks, and manage incident mitigation.",
        "workflowInstructions": "Respond to P1 alerts, triage network degradation, and conduct root cause analysis investigations.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "dist-obs-eng",
        "roleTitle": "Observability Engineer",
        "name": "Telemetry & Metrics Specialist",
        "level": 3,
        "parentId": "dist-sre-dir",
        "responsibilities": "Configure OpenTelemetry distributed tracing, Prometheus scraping, Grafana dashboards, and anomaly alerting thresholds.",
        "workflowInstructions": "Ensure complete trace coverage across microservice hops to identify 99th-percentile tail latency bottlenecks.",
        "delegationPolicy": "up",
        "color": "#34d399"
      },
      {
        "id": "dist-vp-app",
        "roleTitle": "VP Applications Engineering",
        "name": "Core Product Applications Head",
        "level": 1,
        "parentId": "dist-cto",
        "responsibilities": "Lead application service development, tenant isolation security, business logic microservices, and client platforms.",
        "workflowInstructions": "Direct Microservices Tech Lead, Web UI Lead, and QA Director on rapid and safe release trains.",
        "delegationPolicy": "auto",
        "color": "#7c3aed"
      },
      {
        "id": "dist-ms-lead",
        "roleTitle": "Microservices Tech Lead",
        "name": "Backend Services Architect",
        "level": 2,
        "parentId": "dist-vp-app",
        "responsibilities": "Lead squad of backend engineers building business domain services, billing workflows, and enterprise API gateways.",
        "workflowInstructions": "Decompose monolith features into independent services with strict gRPC / protobuf interface definitions.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "dist-be-dev1",
        "roleTitle": "Senior Services Engineer",
        "name": "Core Backend Developer",
        "level": 3,
        "parentId": "dist-ms-lead",
        "responsibilities": "Write high-throughput gRPC services in Go, integrate asynchronous message queues, and handle data synchronization.",
        "workflowInstructions": "Implement unit/integration tests and collaborate with Storage Architects on schema migrations.",
        "delegationPolicy": "both",
        "color": "#a855f7"
      },
      {
        "id": "dist-be-dev2",
        "roleTitle": "Backend Integration Engineer",
        "name": "External APIs & Webhooks Dev",
        "level": 3,
        "parentId": "dist-ms-lead",
        "responsibilities": "Build robust outgoing webhook workers with exponential backoff retries and integrate external partner APIs.",
        "workflowInstructions": "Ensure message delivery guarantees (at-least-once) and audit data payload formatting.",
        "delegationPolicy": "both",
        "color": "#c084fc"
      },
      {
        "id": "dist-ui-lead",
        "roleTitle": "Web Frontend Tech Lead",
        "name": "Client Performance Architect",
        "level": 2,
        "parentId": "dist-vp-app",
        "responsibilities": "Lead web application architecture, state caching, micro-frontend federation, and real-time WebSocket clients.",
        "workflowInstructions": "Direct Frontend Developers on code splitting, web vitals optimization, and offline data sync.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "dist-ui-dev",
        "roleTitle": "Senior Frontend Engineer",
        "name": "Client Application Developer",
        "level": 3,
        "parentId": "dist-ui-lead",
        "responsibilities": "Build reactive interfaces handling high-frequency real-time updates and virtualized data grids rendering 100k+ rows.",
        "workflowInstructions": "Implement WebSocket client listeners, optimistic UI updates, and accessibility compliance.",
        "delegationPolicy": "up",
        "color": "#38bdf8"
      },
      {
        "id": "dist-qa-dir",
        "roleTitle": "Director of Software Quality",
        "name": "Head of QA & Load Testing",
        "level": 2,
        "parentId": "dist-vp-app",
        "responsibilities": "Design synthetic load testing frameworks simulating 100,000 concurrent virtual users and automated regression suites.",
        "workflowInstructions": "Direct QA Automation Engineers on stress tests, chaos injection tests, and release sign-offs.",
        "delegationPolicy": "auto",
        "color": "#ea580c"
      },
      {
        "id": "dist-perf-qa",
        "roleTitle": "Performance & Stress QA Engineer",
        "name": "Distributed Load Testing Specialist",
        "level": 3,
        "parentId": "dist-qa-dir",
        "responsibilities": "Execute distributed k6 / Locust load tests against staging environments to identify memory leaks and lock contention.",
        "workflowInstructions": "Publish performance benchmarking reports and block releases that degrade P99 latency beyond thresholds.",
        "delegationPolicy": "up",
        "color": "#f97316"
      }
    ]
  },
  {
    "id": "chain-vertical-saas-legal",
    "name": "LegalTech Practice Management SaaS",
    "companyName": "LegalTech Practice Management SaaS",
    "description": "Specialized vertical software company catering to law firms with trust accounting, matter management, court calendaring, and secure document vaults.",
    "category": "Vertical SaaS",
    "domain": "LegalTech Software",
    "color": "#78350f",
    "icon": "Scale",
    "nodes": [
      {
        "id": "legal-ceo",
        "roleTitle": "CEO",
        "name": "Chief Executive & LegalTech Strategist",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead legal market expansion, law society compliance certifications, legal software acquisitions, and enterprise firm deals.",
        "workflowInstructions": "Align Head of Product, VP Engineering, and Head of Law Firm Success on legal regulatory standards.",
        "delegationPolicy": "auto",
        "color": "#78350f"
      },
      {
        "id": "legal-cpo",
        "roleTitle": "Head of Product",
        "name": "VP Legal Technology Product",
        "level": 1,
        "parentId": "legal-ceo",
        "responsibilities": "Design practice workflows: matter tracking, billable hour timers, trust accounting (IOLTA), and court docket integrations.",
        "workflowInstructions": "Direct Legal Domain PM and Legal UX Specialist on lawyer-friendly document and billing interfaces.",
        "delegationPolicy": "auto",
        "color": "#b45309"
      },
      {
        "id": "legal-pm",
        "roleTitle": "Legal Domain Product Manager",
        "name": "Matter & Billing Workflows PM",
        "level": 2,
        "parentId": "legal-cpo",
        "responsibilities": "Translate bar association trust accounting rules and litigation filing standards into software specifications.",
        "workflowInstructions": "Work with engineers to build automated conflict checks and timekeeper invoicing rules (LEDES format).",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "legal-ux",
        "roleTitle": "Legal UX Specialist",
        "name": "Product & Document Designer",
        "level": 2,
        "parentId": "legal-cpo",
        "responsibilities": "Design streamlined document viewers, redlining comparison tools, and fast keyboard-first billing time entry.",
        "workflowInstructions": "Conduct usability testing with paralegals and partners to reduce administrative friction.",
        "delegationPolicy": "both",
        "color": "#f59e0b"
      },
      {
        "id": "legal-vp-eng",
        "roleTitle": "VP of Engineering",
        "name": "Head of Secure Engineering",
        "level": 1,
        "parentId": "legal-ceo",
        "responsibilities": "Ensure strict SOC2 Type II compliance, client-side document encryption, HIPAA/GDPR standards, and 99.99% availability.",
        "workflowInstructions": "Direct Lead Fullstack Engineer and Security & Compliance Lead on software architecture.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "legal-lead-dev",
        "roleTitle": "Lead Fullstack Engineer",
        "name": "Core Legal Applications Lead",
        "level": 2,
        "parentId": "legal-vp-eng",
        "responsibilities": "Build secure PDF redaction engines, optical character recognition (OCR) search pipelines, and automated document generation.",
        "workflowInstructions": "Review code changes, maintain rigorous automated test suites, and deploy releases securely.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "legal-sec",
        "roleTitle": "Security & Compliance Lead",
        "name": "Information Security Officer",
        "level": 2,
        "parentId": "legal-vp-eng",
        "responsibilities": "Audit data encryption at rest (AES-256) and in transit, run automated vulnerability scans, and enforce strict RBAC.",
        "workflowInstructions": "Conduct penetration testing and certify data isolation between competing law firm tenants.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      },
      {
        "id": "legal-success",
        "roleTitle": "Head of Law Firm Success",
        "name": "Customer Success & Implementation Lead",
        "level": 1,
        "parentId": "legal-ceo",
        "responsibilities": "Manage legacy data migrations from old on-prem legal software, train legal staff, and prevent client churn.",
        "workflowInstructions": "Direct Onboarding Specialists to transition active law firm matters with zero accounting discrepancies.",
        "delegationPolicy": "up",
        "color": "#059669"
      }
    ]
  },
  {
    "id": "chain-vertical-saas-construction",
    "name": "Construction Field Operations SaaS",
    "companyName": "Construction Field Operations SaaS",
    "description": "Mobile-first vertical software for general contractors, jobsite daily logs, punch lists, BIM 3D blueprint viewing, and subcontractor scheduling.",
    "category": "Vertical SaaS",
    "domain": "ConTech Software",
    "color": "#d97706",
    "icon": "HardHat",
    "nodes": [
      {
        "id": "con-ceo",
        "roleTitle": "CEO",
        "name": "Chief Executive Officer",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead construction industry market share growth, general contractor enterprise contracts, and construction software partnerships.",
        "workflowInstructions": "Direct VP Product and VP Engineering to deliver robust offline-first software that works on muddy jobsites.",
        "delegationPolicy": "auto",
        "color": "#b45309"
      },
      {
        "id": "con-vp-prod",
        "roleTitle": "VP of Product",
        "name": "Field Operations Product Head",
        "level": 1,
        "parentId": "con-ceo",
        "responsibilities": "Define roadmap for daily jobsite logs, digital RFIs, subcontractor punch lists, and high-resolution blueprint markups.",
        "workflowInstructions": "Direct Field UX Designer and ConTech PM to test software directly with jobsite superintendents.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "con-pm",
        "roleTitle": "Field Operations Product Manager",
        "name": "RFI & Blueprints PM",
        "level": 2,
        "parentId": "con-vp-prod",
        "responsibilities": "Interview general contractors, trade foremen, and project engineers to design practical construction workflows.",
        "workflowInstructions": "Specify offline data synchronization rules and write user stories for the mobile development team.",
        "delegationPolicy": "both",
        "color": "#f59e0b"
      },
      {
        "id": "con-ux",
        "roleTitle": "Field UX Designer",
        "name": "Mobile & Tablet Interaction Designer",
        "level": 2,
        "parentId": "con-vp-prod",
        "responsibilities": "Design high-contrast UI readable under direct sunlight, oversized touch buttons for workers wearing work gloves, and simple photo markup tools.",
        "workflowInstructions": "Prototype tablet workflows for reviewing complex multi-gigabyte architectural blueprint PDF sets.",
        "delegationPolicy": "both",
        "color": "#fbbf24"
      },
      {
        "id": "con-vp-eng",
        "roleTitle": "VP of Engineering",
        "name": "Engineering & Mobile Head",
        "level": 1,
        "parentId": "con-ceo",
        "responsibilities": "Lead engineering organization building offline-first mobile apps (iOS/Android) and scalable web administration portals.",
        "workflowInstructions": "Direct Mobile Lead and Backend Lead on vector graphics rendering and sync protocols.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "con-mobile-lead",
        "roleTitle": "Lead Mobile Engineer",
        "name": "Offline-First Mobile Lead",
        "level": 2,
        "parentId": "con-vp-eng",
        "responsibilities": "Implement SQLite local offline database sync, background photo uploads over intermittent 4G/5G, and Apple Pencil blueprint annotation.",
        "workflowInstructions": "Optimize vector PDF rendering speed and prevent battery drain during full-day jobsite use.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "con-be-lead",
        "roleTitle": "Backend & 3D Viewer Lead",
        "name": "Cloud Sync & BIM Engineer",
        "level": 2,
        "parentId": "con-vp-eng",
        "responsibilities": "Build scalable cloud APIs for processing construction photos, generating daily field reports, and streaming 3D Revit BIM models.",
        "workflowInstructions": "Ensure robust data synchronization, automated daily log exports, and weather station API integrations.",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "con-success",
        "roleTitle": "Director of Field Success",
        "name": "Customer Training & Field Onboarding",
        "level": 1,
        "parentId": "con-ceo",
        "responsibilities": "Travel to construction job trailers, onboard superintendents and trade subcontractors, and ensure daily adoption.",
        "workflowInstructions": "Conduct hands-on jobsite training sessions and report usability impediments back to Product.",
        "delegationPolicy": "up",
        "color": "#059669"
      }
    ]
  },
  {
    "id": "chain-vertical-saas-restaurant-pos",
    "name": "Restaurant POS & Kitchen SaaS",
    "companyName": "Restaurant POS & Kitchen SaaS",
    "description": "Mission-critical cloud point-of-sale, kitchen display systems (KDS), table management, and delivery aggregator integrations.",
    "category": "Vertical SaaS",
    "domain": "Restaurant Tech",
    "color": "#dc2626",
    "icon": "UtensilsCrossed",
    "nodes": [
      {
        "id": "pos-ceo",
        "roleTitle": "CEO",
        "name": "Chief Executive Officer",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead restaurant brand expansion, merchant acquiring payment processing partnerships, and national franchise deals.",
        "workflowInstructions": "Direct VP Hardware/Firmware, VP Software Engineering, and Head of Merchant Operations.",
        "delegationPolicy": "auto",
        "color": "#991b1b"
      },
      {
        "id": "pos-vp-eng",
        "roleTitle": "VP of Software Engineering",
        "name": "Cloud & POS Platform Head",
        "level": 1,
        "parentId": "pos-ceo",
        "responsibilities": "Guarantee zero-downtime offline order survival: printers and kitchen screens must process orders even during internet outages.",
        "workflowInstructions": "Direct Core POS Tech Lead and Cloud Backend Architect on sub-second order dispatch.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "pos-tech-lead",
        "roleTitle": "Core POS Tech Lead",
        "name": "Offline POS & Terminal Lead",
        "level": 2,
        "parentId": "pos-vp-eng",
        "responsibilities": "Build local LAN peer-to-peer failover between POS terminals, thermal receipt printer drivers (ESC/POS), and payment card readers.",
        "workflowInstructions": "Supervise Terminal Client Developers and maintain rigorous automated test suites simulating restaurant rush hours.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "pos-dev",
        "roleTitle": "Terminal Client Developer",
        "name": "React Native / Electron POS Dev",
        "level": 3,
        "parentId": "pos-tech-lead",
        "responsibilities": "Build split-check calculations, tip screens, kitchen modifier builders (extra cheese, no onions), and table seating maps.",
        "workflowInstructions": "Test touch responsiveness, optimize memory consumption, and handle card reader EMV payment callbacks.",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "pos-be-lead",
        "roleTitle": "Cloud Backend & Integrations Lead",
        "name": "Order Gateway Architect",
        "level": 2,
        "parentId": "pos-vp-eng",
        "responsibilities": "Build integrations with food delivery platforms (DoorDash, UberEats), cloud inventory tracking, and sales analytics APIs.",
        "workflowInstructions": "Implement real-time menu synchronization and webhooks that inject online orders directly into kitchen queues.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "pos-hw-lead",
        "roleTitle": "Head of Hardware & Field QA",
        "name": "Embedded Hardware & Devices Lead",
        "level": 1,
        "parentId": "pos-ceo",
        "responsibilities": "Source and certify ruggedized Android touch tablets, countertop cash drawers, bar code scanners, and kitchen bump bars.",
        "workflowInstructions": "Direct Hardware QA Tester to run heat, grease, and durability testing on all restaurant hardware bundles.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "pos-hw-tester",
        "roleTitle": "Hardware QA & Device Tester",
        "name": "Kitchen Rig & Peripheral Tester",
        "level": 2,
        "parentId": "pos-hw-lead",
        "responsibilities": "Subject touch terminals and kitchen display controllers to continuous print loops, network disconnections, and static shocks.",
        "workflowInstructions": "Certify hardware reliability before shipping starter kits to new restaurant locations.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "pos-ops-lead",
        "roleTitle": "Head of Merchant Support",
        "name": "24/7 Restaurant Operations Lead",
        "level": 1,
        "parentId": "pos-ceo",
        "responsibilities": "Provide 24/7 emergency support during busy dinner rush hours, rapid hardware replacement dispatches, and menu setup assistance.",
        "workflowInstructions": "Direct Restaurant Support Leads to maintain sub-60-second emergency call answer times.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "pos-supp-rep",
        "roleTitle": "Emergency Support Specialist",
        "name": "Frontline Restaurant Dispatcher",
        "level": 2,
        "parentId": "pos-ops-lead",
        "responsibilities": "Answer restaurant calls during dinner rushes, troubleshoot offline network switches, reset thermal printers, and unblock orders.",
        "workflowInstructions": "Escalate reproducible software terminal crashes directly to the Core POS Tech Lead with high urgency.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-vertical-saas-real-estate",
    "name": "Real Estate PropTech SaaS",
    "companyName": "Real Estate PropTech SaaS",
    "description": "Comprehensive real estate broker platform featuring MLS feed synchronization, automated e-signatures, commission tracking, and virtual showings.",
    "category": "Vertical SaaS",
    "domain": "PropTech Software",
    "color": "#059669",
    "icon": "Home",
    "nodes": [
      {
        "id": "prop-ceo",
        "roleTitle": "CEO",
        "name": "Chief Executive Officer",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead brokerage network relationships, National Association of Realtors compliance, venture funding, and enterprise franchise expansion.",
        "workflowInstructions": "Direct Head of Product and VP Engineering on platform capabilities and transaction compliance.",
        "delegationPolicy": "auto",
        "color": "#064e3b"
      },
      {
        "id": "prop-cpo",
        "roleTitle": "Head of Product",
        "name": "PropTech Product Strategy Head",
        "level": 1,
        "parentId": "prop-ceo",
        "responsibilities": "Design digital closing rooms, automated commission disbursement splits, agent CRM workflows, and MLS property syndication.",
        "workflowInstructions": "Direct Real Estate Domain PM and UX Designer on intuitive client-facing portals.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "prop-pm",
        "roleTitle": "Real Estate Product Manager",
        "name": "Closing & Compliance PM",
        "level": 2,
        "parentId": "prop-cpo",
        "responsibilities": "Analyze real estate contract disclosures, state licensing rules, and broker transaction management workflows.",
        "workflowInstructions": "Write functional specifications for e-signature packets and transaction audit trails.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "prop-ux",
        "roleTitle": "Lead Product Designer",
        "name": "UI/UX & Client Portal Designer",
        "level": 2,
        "parentId": "prop-cpo",
        "responsibilities": "Design responsive listing galleries, interactive floor plans, e-signing mobile interfaces, and agent marketing flyers.",
        "workflowInstructions": "Conduct usability sessions with busy real estate agents on mobile devices.",
        "delegationPolicy": "both",
        "color": "#34d399"
      },
      {
        "id": "prop-vp-eng",
        "roleTitle": "VP of Engineering",
        "name": "Head of Real Estate Engineering",
        "level": 1,
        "parentId": "prop-ceo",
        "responsibilities": "Lead engineering teams building high-frequency MLS RETS/RESO Web API synchronization, document security, and cloud scalability.",
        "workflowInstructions": "Direct Lead Fullstack Engineer and Data Pipeline Lead on technical execution.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "prop-lead-dev",
        "roleTitle": "Lead Fullstack Engineer",
        "name": "Transaction Platform Lead",
        "level": 2,
        "parentId": "prop-vp-eng",
        "responsibilities": "Implement real-time collaboration on legal contract templates, PDF audit hashing, and multi-party signing workflows.",
        "workflowInstructions": "Review code changes, maintain high automated test coverage, and ensure zero document corruption.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "prop-data-eng",
        "roleTitle": "MLS Data Pipeline Engineer",
        "name": "RESO Web API & Sync Engineer",
        "level": 2,
        "parentId": "prop-vp-eng",
        "responsibilities": "Ingest and normalize data feeds from hundreds of regional MLS databases containing millions of active property listings.",
        "workflowInstructions": "Handle image CDN processing, geocoding coordinates, and real-time status updates (pending, sold, price drop).",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "prop-cs-lead",
        "roleTitle": "Head of Brokerage Onboarding",
        "name": "Customer Success & Training Lead",
        "level": 1,
        "parentId": "prop-ceo",
        "responsibilities": "Onboard premier real estate brokerages, import agent rosters, set up office compliance templates, and deliver live webinars.",
        "workflowInstructions": "Ensure high brokerage adoption, monitor agent engagement metrics, and prevent subscription cancellations.",
        "delegationPolicy": "up",
        "color": "#d97706"
      }
    ]
  },
  {
    "id": "chain-vertical-saas-healthcare-clinic",
    "name": "Healthcare Clinic & Telehealth SaaS",
    "companyName": "Healthcare Clinic & Telehealth SaaS",
    "description": "HIPAA-compliant medical software covering electronic health records (EHR), patient scheduling, WebRTC video visits, and insurance claims.",
    "category": "Healthcare",
    "domain": "HealthTech Software",
    "color": "#e11d48",
    "icon": "HeartPulse",
    "nodes": [
      {
        "id": "hsaas-ceo",
        "roleTitle": "CEO",
        "name": "Chief Executive & Digital Health Visionary",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead healthcare provider market expansion, insurance payer network partnerships, and health system enterprise contracts.",
        "workflowInstructions": "Direct Chief Medical Officer and VP Engineering on clinical validity and medical software governance.",
        "delegationPolicy": "auto",
        "color": "#9f1239"
      },
      {
        "id": "hsaas-cmo",
        "roleTitle": "Chief Medical Officer",
        "name": "Clinical Director & Quality Advisor",
        "level": 1,
        "parentId": "hsaas-ceo",
        "responsibilities": "Ensure clinical charting templates adhere to medical documentation standards, ICD-10 coding, and physician workflow efficiency.",
        "workflowInstructions": "Review medical intake forms, clinical decision support rules, and advise Product on doctor ergonomics.",
        "delegationPolicy": "auto",
        "color": "#be123c"
      },
      {
        "id": "hsaas-cpo",
        "roleTitle": "VP of Product",
        "name": "HealthTech Product Strategy Head",
        "level": 1,
        "parentId": "hsaas-ceo",
        "responsibilities": "Define roadmap for patient mobile portals, e-prescribing (EPCS), lab diagnostic integrations, and automated billing codes.",
        "workflowInstructions": "Direct Clinical UX Designer and HealthTech PM on physician and patient user journeys.",
        "delegationPolicy": "auto",
        "color": "#e11d48"
      },
      {
        "id": "hsaas-pm",
        "roleTitle": "Clinical Product Manager",
        "name": "EHR & Telehealth PM",
        "level": 2,
        "parentId": "hsaas-cpo",
        "responsibilities": "Translate clinical workflows and CMS documentation requirements into functional user stories for engineering squads.",
        "workflowInstructions": "Coordinate physician beta testing and validate patient intake questionnaire completion rates.",
        "delegationPolicy": "both",
        "color": "#fb7185"
      },
      {
        "id": "hsaas-ux",
        "roleTitle": "Clinical UX Designer",
        "name": "Medical Interface & Accessibility Designer",
        "level": 2,
        "parentId": "hsaas-cpo",
        "responsibilities": "Design uncluttered clinical charting screens that reduce doctor cognitive load, prevent prescription errors, and meet WCAG AAA.",
        "workflowInstructions": "Build fast keyboard shortcuts for doctors during high-volume patient consultations.",
        "delegationPolicy": "both",
        "color": "#fda4af"
      },
      {
        "id": "hsaas-vp-eng",
        "roleTitle": "VP of Engineering",
        "name": "Head of Healthcare Engineering",
        "level": 1,
        "parentId": "hsaas-ceo",
        "responsibilities": "Guarantee strict HIPAA security rule compliance, end-to-end encrypted video visits, audit logging, and 99.99% uptime.",
        "workflowInstructions": "Direct Core EHR Tech Lead and Telehealth Video Engineer on secure systems architecture.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "hsaas-tech-lead",
        "roleTitle": "Core EHR Tech Lead",
        "name": "Fullstack Medical Systems Lead",
        "level": 2,
        "parentId": "hsaas-vp-eng",
        "responsibilities": "Build secure HL7/FHIR healthcare interoperability APIs, electronic prescription integrations (Surescripts), and lab order pipelines.",
        "workflowInstructions": "Enforce immutable audit trails on all patient record accesses and lead code reviews.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "hsaas-webrtc",
        "roleTitle": "Telehealth Video Engineer",
        "name": "WebRTC & Real-Time Audio/Video Lead",
        "level": 2,
        "parentId": "hsaas-vp-eng",
        "responsibilities": "Implement peer-to-peer encrypted WebRTC video rooms with adaptive bitrate streaming for patients with slow home connections.",
        "workflowInstructions": "Ensure HIPAA encryption (DTLS-SRTP), zero video recording leaks, and seamless mobile browser support.",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "hsaas-sec",
        "roleTitle": "HIPAA Security & Privacy Officer",
        "name": "Healthcare Information Security Officer",
        "level": 2,
        "parentId": "hsaas-vp-eng",
        "responsibilities": "Oversee Business Associate Agreements (BAAs), conduct third-party security audits, and monitor access logs for anomalies.",
        "workflowInstructions": "Enforce role-based access control, multi-factor authentication, and employee HIPAA compliance training.",
        "delegationPolicy": "up",
        "color": "#7c3aed"
      },
      {
        "id": "hsaas-success",
        "roleTitle": "Director of Clinic Onboarding",
        "name": "Customer Success & Training Head",
        "level": 1,
        "parentId": "hsaas-ceo",
        "responsibilities": "Migrate patient demographic charts from legacy medical software, train clinic nurses and front desk staff, and handle billing onboarding.",
        "workflowInstructions": "Ensure medical practices achieve operational go-live on schedule with zero patient scheduling disruption.",
        "delegationPolicy": "up",
        "color": "#059669"
      }
    ]
  },
  {
    "id": "chain-commercial-open-core-oss",
    "name": "Commercial Open-Core Developer Platform",
    "companyName": "Commercial Open-Core Developer Platform",
    "description": "Open-source project backing a commercial cloud enterprise offering with vibrant community contributors, maintainers, and cloud SaaS.",
    "category": "Software",
    "domain": "Open-Core Software",
    "color": "#475569",
    "icon": "GitPullRequest",
    "nodes": [
      {
        "id": "oss-ceo",
        "roleTitle": "Executive Director & Founder",
        "name": "Open-Core CEO / Creator",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead open-source project direction, commercial cloud strategy, enterprise license tiering, and community governance.",
        "workflowInstructions": "Direct Open-Source Maintainer Lead and Cloud SaaS Engineering Lead to maintain balance between free and paid tiers.",
        "delegationPolicy": "auto",
        "color": "#1e293b"
      },
      {
        "id": "oss-core-lead",
        "roleTitle": "Core Project Lead Maintainer",
        "name": "Principal Open-Source Maintainer",
        "level": 1,
        "parentId": "oss-ceo",
        "responsibilities": "Review external GitHub community pull requests, lead core architectural RFCs, and release semantic versions.",
        "workflowInstructions": "Direct Core Engine Developer and Documentation Lead on public repository maintenance.",
        "delegationPolicy": "both",
        "color": "#475569"
      },
      {
        "id": "oss-core-dev",
        "roleTitle": "Core Engine Developer",
        "name": "Systems & Runtime Engineer",
        "level": 2,
        "parentId": "oss-core-lead",
        "responsibilities": "Implement core engine performance optimizations, write unit tests, fix community bug tickets, and refactor internals.",
        "workflowInstructions": "Engage with open-source contributors on GitHub Discussions and triage incoming pull requests.",
        "delegationPolicy": "both",
        "color": "#64748b"
      },
      {
        "id": "oss-doc-lead",
        "roleTitle": "Documentation & Tutorial Lead",
        "name": "Open-Source Technical Writer",
        "level": 2,
        "parentId": "oss-core-lead",
        "responsibilities": "Maintain public documentation, interactive tutorials, code recipes, and contribution guidelines (CONTRIBUTING.md).",
        "workflowInstructions": "Ensure docs match the latest release, verify code samples, and guide first-time open-source contributors.",
        "delegationPolicy": "up",
        "color": "#94a3b8"
      },
      {
        "id": "oss-cloud-lead",
        "roleTitle": "Cloud SaaS Tech Lead",
        "name": "Enterprise Managed Cloud Lead",
        "level": 1,
        "parentId": "oss-ceo",
        "responsibilities": "Build hosted enterprise cloud offering: multi-tenant cluster management, automated backups, and billing integration.",
        "workflowInstructions": "Direct Cloud Platform Engineers on provisioning automation, SOC2 controls, and enterprise SSO integrations.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "oss-cloud-dev",
        "roleTitle": "Cloud Platform Engineer",
        "name": "Managed Infrastructure Developer",
        "level": 2,
        "parentId": "oss-cloud-lead",
        "responsibilities": "Write Kubernetes operators to provision isolated customer clusters, configure automated TLS certificates, and manage metrics.",
        "workflowInstructions": "Maintain the web management dashboard and build enterprise team management features.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "oss-devrel",
        "roleTitle": "Head of Developer Community",
        "name": "Community Evangelist & DevRel",
        "level": 1,
        "parentId": "oss-ceo",
        "responsibilities": "Host community office hours, organize local user groups, spotlight community projects, and manage Discord/Slack channels.",
        "workflowInstructions": "Direct Community Moderator to nurture a friendly, supportive developer ecosystem.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "oss-mod",
        "roleTitle": "Community Moderator & Support",
        "name": "Contributor Experience Specialist",
        "level": 2,
        "parentId": "oss-devrel",
        "responsibilities": "Welcome new contributors, enforce code of conduct, tag incoming GitHub issues with appropriate labels, and help answer beginner questions.",
        "workflowInstructions": "Surface recurring user pain points to the Core Maintainers to improve onboarding ergonomics.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-agile-scrum-feature-squad",
    "name": "Agile Scrum Feature Squad",
    "companyName": "Agile Scrum Feature Squad",
    "description": "Autonomous squad delivering end-to-end user stories with dedicated Product Owner, Scrum Master, Fullstack Engineers, and QA Tester.",
    "category": "Software",
    "domain": "Agile Squad",
    "color": "#6366f1",
    "icon": "Layers",
    "nodes": [
      {
        "id": "squad-po",
        "roleTitle": "Product Owner",
        "name": "Feature Product Owner",
        "level": 0,
        "parentId": null,
        "responsibilities": "Own squad backlog prioritization, define acceptance criteria for user stories, and represent stakeholder interests.",
        "workflowInstructions": "Groom backlog weekly with the team. Accept or reject completed user stories during sprint review.",
        "delegationPolicy": "auto",
        "color": "#4338ca"
      },
      {
        "id": "squad-sm",
        "roleTitle": "Scrum Master",
        "name": "Agile Coach & Facilitator",
        "level": 1,
        "parentId": "squad-po",
        "responsibilities": "Facilitate daily standups, sprint planning, sprint retrospectives, and remove team impediments.",
        "workflowInstructions": "Track squad velocity metrics and protect the engineering team from mid-sprint scope creep.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "squad-tech-lead",
        "roleTitle": "Tech Lead",
        "name": "Senior Full-Stack Architect",
        "level": 1,
        "parentId": "squad-po",
        "responsibilities": "Lead architectural design, estimate story points, review code pull requests, and maintain squad code quality.",
        "workflowInstructions": "Direct Senior Fullstack Engineer and Associate Developer on technical implementation.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "squad-sr-dev",
        "roleTitle": "Senior Fullstack Engineer",
        "name": "Feature Implementation Specialist",
        "level": 2,
        "parentId": "squad-tech-lead",
        "responsibilities": "Build end-to-end feature components across frontend React UI and backend Node/Python endpoints with unit tests.",
        "workflowInstructions": "Collaborate on database schema migrations, write integration tests, and mentor associate engineers.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "squad-assoc-dev",
        "roleTitle": "Associate Developer",
        "name": "Software Engineer",
        "level": 3,
        "parentId": "squad-sr-dev",
        "responsibilities": "Implement user stories, fix assigned bug tickets, write unit tests, and participate in peer code reviews.",
        "workflowInstructions": "Adhere to squad coding conventions, update documentation, and seek guidance on complex edge cases.",
        "delegationPolicy": "up",
        "color": "#38bdf8"
      },
      {
        "id": "squad-qa",
        "roleTitle": "QA Automation Tester",
        "name": "Embedded Squad QA Engineer",
        "level": 1,
        "parentId": "squad-po",
        "responsibilities": "Verify completed user stories against acceptance criteria in staging before marking tickets done.",
        "workflowInstructions": "Write automated Playwright test scripts, test cross-browser compatibility, and file reproducible bug tickets.",
        "delegationPolicy": "both",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-rapid-mvp-prototyping-squad",
    "name": "Rapid MVP Prototyping Squad",
    "companyName": "Rapid MVP Prototyping Squad",
    "description": "Ultra-fast product lab dedicated to testing new market concepts, building working prototypes within 2 weeks, and validating user demand.",
    "category": "Software",
    "domain": "Innovation Lab",
    "color": "#ec4899",
    "icon": "Sparkles",
    "nodes": [
      {
        "id": "mvp-lead",
        "roleTitle": "Product Lab Director",
        "name": "Venture & Innovation Strategist",
        "level": 0,
        "parentId": null,
        "responsibilities": "Identify emerging market opportunities, define prototype validation hypotheses, and evaluate customer interest metrics.",
        "workflowInstructions": "Direct prototyping squad to ship functional interactive MVPs to target users within 10-14 days.",
        "delegationPolicy": "auto",
        "color": "#be185d"
      },
      {
        "id": "mvp-builder",
        "roleTitle": "Senior Fullstack Builder",
        "name": "Rapid Prototyping Engineer",
        "level": 1,
        "parentId": "mvp-lead",
        "responsibilities": "Ship working full-stack applications using Next.js, Supabase, Tailwind, and third-party APIs with incredible speed.",
        "workflowInstructions": "Build functional prototypes without over-engineering, implement core user value flows, and deploy to production URLs.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "mvp-designer",
        "roleTitle": "UI/UX Prototyper",
        "name": "Rapid Interaction & Visual Designer",
        "level": 1,
        "parentId": "mvp-lead",
        "responsibilities": "Create compelling interactive clickable mockups, landing page visual assets, and high-converting micro-copy in 48 hours.",
        "workflowInstructions": "Translate user problem statements into intuitive, modern interface flows that delight early adopters.",
        "delegationPolicy": "both",
        "color": "#d946ef"
      },
      {
        "id": "mvp-growth",
        "roleTitle": "Growth Experimenter",
        "name": "Customer Discovery & Demand Tester",
        "level": 1,
        "parentId": "mvp-lead",
        "responsibilities": "Set up targeted user acquisition tests, recruit target users for live testing sessions, and measure sign-up conversion.",
        "workflowInstructions": "Analyze whether user engagement validates the core hypothesis and present go/no-go recommendations to the Director.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-saas-helpdesk-escalation",
    "name": "SaaS Helpdesk & Engineering Escalation",
    "companyName": "SaaS Helpdesk & Engineering Escalation",
    "description": "End-to-end bug escalation loop where incoming customer service issues route through Support Leads to Tech Leads, Backend/Frontend Developers, QA Guild, and Release Management.",
    "category": "Customer Support",
    "domain": "Support to Engineering",
    "color": "#0284c7",
    "icon": "Headphones",
    "nodes": [
      {
        "id": "hd-vp-cs",
        "roleTitle": "VP of Customer Support",
        "name": "Customer Experience Leadership Head",
        "level": 0,
        "parentId": null,
        "responsibilities": "Oversee global customer satisfaction (CSAT > 95%), first response time SLAs, support staffing, and escalation policies.",
        "workflowInstructions": "Direct Support Team Lead and coordinate high-severity customer churn risks with VP Engineering.",
        "delegationPolicy": "auto",
        "color": "#0369a1"
      },
      {
        "id": "hd-supp-lead",
        "roleTitle": "Support Team Lead",
        "name": "Customer Support Operations Lead",
        "level": 1,
        "parentId": "hd-vp-cs",
        "responsibilities": "Manage support ticketing queues (Zendesk/Intercom), balance shift workload, review ticket resolution quality, and handle customer complaints.",
        "workflowInstructions": "Supervise Tier 1 and Tier 2 support reps. Route verified software bugs to the Escalation Bug Triage Lead.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "hd-t1-rep",
        "roleTitle": "Tier 1 Support Agent",
        "name": "Frontline Customer Service Rep",
        "level": 2,
        "parentId": "hd-supp-lead",
        "responsibilities": "Answer customer live chat and emails, resolve known configuration questions, guide users through FAQs, and gather initial bug details.",
        "workflowInstructions": "Request reproduction steps and screenshots from customers. Escalate complex or recurring issues to Tier 2 Technical Specialists.",
        "delegationPolicy": "up",
        "color": "#38bdf8"
      },
      {
        "id": "hd-t2-spec",
        "roleTitle": "Tier 2 Technical Specialist",
        "name": "Technical Support Investigator",
        "level": 2,
        "parentId": "hd-supp-lead",
        "responsibilities": "Reproduce customer issues in staging environments, inspect browser console errors, examine customer log files, and isolate root causes.",
        "workflowInstructions": "Document exact steps to reproduce (STR) and submit formal defect tickets to the Escalation Bug Triage Lead.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "hd-triage-lead",
        "roleTitle": "Escalation Bug Triage Lead",
        "name": "Support-Engineering Liaison & Triage Lead",
        "level": 1,
        "parentId": "hd-vp-cs",
        "responsibilities": "Bridge Customer Support and Software Engineering: assess severity (P1-P4), verify reproducible test cases, and assign bug tickets into active sprints.",
        "workflowInstructions": "Direct Core Backend and Frontend Tech Leads on urgent hotfixes. Keep Support updated on expected fix deployment timelines.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "hd-eng-lead",
        "roleTitle": "Engineering Tech Lead",
        "name": "Core Software Engineering Lead",
        "level": 2,
        "parentId": "hd-triage-lead",
        "responsibilities": "Assign bug tickets to appropriate backend or frontend developers, review bugfix pull requests, and maintain code stability.",
        "workflowInstructions": "Supervise Backend Developer and Frontend Developer on hotfix branches and ensure unit test coverage for regressions.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "hd-be-dev",
        "roleTitle": "Core Backend Developer",
        "name": "Backend Bugfix & API Specialist",
        "level": 3,
        "parentId": "hd-eng-lead",
        "responsibilities": "Investigate server logs, diagnose database query failures, patch corrupted data states, and fix REST/GraphQL API bugs.",
        "workflowInstructions": "Write automated regression test cases ensuring the bug cannot reoccur, and submit PR to Tech Lead.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "hd-fe-dev",
        "roleTitle": "Frontend Developer",
        "name": "Web & UI Bugfix Specialist",
        "level": 3,
        "parentId": "hd-eng-lead",
        "responsibilities": "Fix client-side state inconsistencies, patch UI rendering edge-cases across mobile and desktop browsers, and fix broken form validations.",
        "workflowInstructions": "Submit tested frontend bug fixes, verify responsive layouts, and request QA Guild verification.",
        "delegationPolicy": "both",
        "color": "#a855f7"
      },
      {
        "id": "hd-qa-lead",
        "roleTitle": "QA Guild Lead",
        "name": "Quality Assurance & Regression Lead",
        "level": 2,
        "parentId": "hd-triage-lead",
        "responsibilities": "Manage staging test environments, oversee test automation pipelines, and certify that hotfixes do not break adjacent features.",
        "workflowInstructions": "Direct QA Verification Engineer to re-test customer defect scenarios on staging builds before release sign-off.",
        "delegationPolicy": "auto",
        "color": "#10b981"
      },
      {
        "id": "hd-qa-eng",
        "roleTitle": "QA Verification Engineer",
        "name": "Defect Verification Specialist",
        "level": 3,
        "parentId": "hd-qa-lead",
        "responsibilities": "Execute reproduction test steps against bugfix staging builds, verify edge conditions, and perform smoke tests across browsers.",
        "workflowInstructions": "Sign off on defect verification or re-open tickets if issues persist under specific conditions.",
        "delegationPolicy": "up",
        "color": "#34d399"
      },
      {
        "id": "hd-rel-mgr",
        "roleTitle": "Release Manager",
        "name": "Deployment & Production Release Lead",
        "level": 2,
        "parentId": "hd-triage-lead",
        "responsibilities": "Coordinate production hotfix deployments, verify zero-downtime rolling updates, and monitor error rates in Datadog/Sentry.",
        "workflowInstructions": "Notify Support Team Lead once the hotfix is successfully deployed so customer agents can inform waiting clients.",
        "delegationPolicy": "both",
        "color": "#ea580c"
      }
    ]
  },
  {
    "id": "chain-customer-support-to-engineering",
    "name": "Support-to-Engineering Escalation Pipeline",
    "companyName": "Support-to-Engineering Escalation Pipeline",
    "description": "Streamlined escalation workflow connecting frontline customer service representatives with tier-2 diagnostics, engineering leads, bugfix developers, and release sign-off.",
    "category": "Customer Support",
    "domain": "IT Service Management",
    "color": "#0891b2",
    "icon": "GitMerge",
    "nodes": [
      {
        "id": "pipe-head-cx",
        "roleTitle": "Head of Customer Experience",
        "name": "VP Customer Service & Experience",
        "level": 0,
        "parentId": null,
        "responsibilities": "Define customer journey excellence, analyze customer feedback trends, enforce SLA response benchmarks, and champion user needs.",
        "workflowInstructions": "Direct Support Operations Lead and coordinate recurring defect patterns with Engineering leadership.",
        "delegationPolicy": "auto",
        "color": "#0e7490"
      },
      {
        "id": "pipe-ops-lead",
        "roleTitle": "Support Operations Lead",
        "name": "Helpdesk Operations Supervisor",
        "level": 1,
        "parentId": "pipe-head-cx",
        "responsibilities": "Oversee day-to-day customer support queues, monitor agent response speed, optimize automated macros, and resolve customer escalations.",
        "workflowInstructions": "Supervise Customer Support Representatives and route unresolved technical issues to the Technical Escalation Specialist.",
        "delegationPolicy": "auto",
        "color": "#0891b2"
      },
      {
        "id": "pipe-supp-rep",
        "roleTitle": "Customer Support Representative",
        "name": "Customer Care Specialist",
        "level": 2,
        "parentId": "pipe-ops-lead",
        "responsibilities": "Handle customer queries, identify user frustrations, verify account permissions, and test customer scenarios.",
        "workflowInstructions": "Collect error logs, record screen captures, and escalate non-configuration bugs to the Technical Escalation Specialist.",
        "delegationPolicy": "up",
        "color": "#06b6d4"
      },
      {
        "id": "pipe-esc-spec",
        "roleTitle": "Technical Escalation Specialist",
        "name": "Tier 2/3 Technical Investigator",
        "level": 2,
        "parentId": "pipe-ops-lead",
        "responsibilities": "Inspect API request/response payloads, query database read replicas to verify data consistency, and isolate reproducible software bugs.",
        "workflowInstructions": "Submit detailed Jira defect tickets with network HAR files and console logs directly to the Engineering Tech Lead.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "pipe-tech-lead",
        "roleTitle": "Engineering Tech Lead",
        "name": "Software Development Lead",
        "level": 1,
        "parentId": "pipe-head-cx",
        "responsibilities": "Triage escalated defects, determine architectural impact, prioritize hotfixes against current sprint work, and allocate developers.",
        "workflowInstructions": "Direct Core Bugfix Developer and QA Verification Engineer to implement and certify code fixes.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "pipe-bugfix-dev",
        "roleTitle": "Core Bugfix Developer",
        "name": "Fullstack Maintenance Engineer",
        "level": 2,
        "parentId": "pipe-tech-lead",
        "responsibilities": "Locate faulty code in repository, write defensive validation checks, repair database queries, and write automated regression tests.",
        "workflowInstructions": "Deploy fix to preview environment, verify fix with Technical Escalation Specialist, and open PR for review.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "pipe-qa-signoff",
        "roleTitle": "QA Release Sign-off Specialist",
        "name": "Quality & Acceptance Tester",
        "level": 2,
        "parentId": "pipe-tech-lead",
        "responsibilities": "Verify bug resolution on staging build, perform smoke regression test suite, and approve deployment to production.",
        "workflowInstructions": "Notify Support Operations Lead when the fix is deployed to close the customer ticket loop.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-enterprise-customer-success-ops",
    "name": "Enterprise Customer Success & Technical Onboarding",
    "companyName": "Enterprise Customer Success & Technical Onboarding",
    "description": "High-touch customer success organization handling multi-month enterprise software rollouts, custom solution architecture, and churn prevention.",
    "category": "Customer Support",
    "domain": "Enterprise Customer Success",
    "color": "#059669",
    "icon": "Users",
    "nodes": [
      {
        "id": "cs-vp",
        "roleTitle": "VP of Customer Success",
        "name": "Head of Client Growth & Retention",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead enterprise account retention, Net Promoter Score (NPS), gross margin on professional services, and executive business reviews.",
        "workflowInstructions": "Direct Director of Customer Success and Head of Professional Services on account health and adoption.",
        "delegationPolicy": "auto",
        "color": "#064e3b"
      },
      {
        "id": "cs-dir",
        "roleTitle": "Director of Customer Success",
        "name": "Strategic Accounts Director",
        "level": 1,
        "parentId": "cs-vp",
        "responsibilities": "Manage team of Strategic CSMs, monitor account engagement health scores, and lead proactive intervention on at-risk enterprise accounts.",
        "workflowInstructions": "Supervise Enterprise CSMs and coordinate with Sales on expansion and upsell opportunities.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "cs-csm",
        "roleTitle": "Strategic Enterprise CSM",
        "name": "Enterprise Customer Success Manager",
        "level": 2,
        "parentId": "cs-dir",
        "responsibilities": "Serve as primary trusted advisor for Fortune 500 accounts, lead quarterly business reviews (QBRs), and drive multi-department user adoption.",
        "workflowInstructions": "Track customer business outcomes, manage renewals, and escalate technical blockers to the Implementation Lead.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "cs-ps-head",
        "roleTitle": "Head of Professional Services",
        "name": "Technical Onboarding & Solutions Head",
        "level": 1,
        "parentId": "cs-vp",
        "responsibilities": "Oversee enterprise client implementations, custom integrations, enterprise data migrations, and statement-of-work (SOW) delivery.",
        "workflowInstructions": "Direct Implementation Lead and Solutions Architect on client delivery timelines.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "cs-impl-lead",
        "roleTitle": "Technical Implementation Lead",
        "name": "Client Onboarding Project Manager",
        "level": 2,
        "parentId": "cs-ps-head",
        "responsibilities": "Lead weekly client technical milestones, coordinate SSO/SAML configuration, manage user directory provisioning, and track go-live dates.",
        "workflowInstructions": "Supervise Integration Engineer on custom ETL data imports and API webhooks.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "cs-arch",
        "roleTitle": "Enterprise Solutions Architect",
        "name": "Principal Solution Architect",
        "level": 2,
        "parentId": "cs-ps-head",
        "responsibilities": "Design enterprise technical architectures, security boundaries, multi-region tenant configurations, and complex workflow designs.",
        "workflowInstructions": "Advise enterprise client IT directors and review technical integration feasibility.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "cs-integ-eng",
        "roleTitle": "Customer Integration Engineer",
        "name": "API & Data Migration Engineer",
        "level": 3,
        "parentId": "cs-impl-lead",
        "responsibilities": "Write custom Python/Node scripts to migrate customer legacy records, configure REST API webhooks, and validate data integrity.",
        "workflowInstructions": "Conduct client integration testing and resolve data mapping discrepancies.",
        "delegationPolicy": "up",
        "color": "#38bdf8"
      }
    ]
  },
  {
    "id": "chain-24x7-global-follow-the-sun-desk",
    "name": "24/7 Global Follow-the-Sun IT Service Desk",
    "companyName": "24/7 Global Follow-the-Sun IT Service Desk",
    "description": "Continuous 24/7 technical support network transitioning across Americas, EMEA, and APAC shifts with seamless ticket handover and SRE escalations.",
    "category": "Customer Support",
    "domain": "Global IT Support",
    "color": "#1e3a8a",
    "icon": "Clock",
    "nodes": [
      {
        "id": "gdesk-dir",
        "roleTitle": "Global Service Desk Director",
        "name": "Head of Global 24/7 Support",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead worldwide IT service desk operations, follow-the-sun shift handovers, enterprise SLA compliance, and support center budgets.",
        "workflowInstructions": "Supervise regional Shift Leads across Americas, EMEA, and APAC time zones.",
        "delegationPolicy": "auto",
        "color": "#1e3a8a"
      },
      {
        "id": "gdesk-us-lead",
        "roleTitle": "Americas Shift Lead",
        "name": "US Regional Support Manager",
        "level": 1,
        "parentId": "gdesk-dir",
        "responsibilities": "Manage Americas business hours support queue, conduct shift handovers from APAC, and handle high-priority enterprise escalations.",
        "workflowInstructions": "Direct Americas L1 Support Analysts and assign urgent tickets to L2 Senior Systems Admins.",
        "delegationPolicy": "both",
        "color": "#2563eb"
      },
      {
        "id": "gdesk-emea-lead",
        "roleTitle": "EMEA Shift Lead",
        "name": "Europe & Middle East Support Manager",
        "level": 1,
        "parentId": "gdesk-dir",
        "responsibilities": "Manage EMEA business hours support queue, conduct seamless shift handovers to Americas, and ensure multilingual ticket coverage.",
        "workflowInstructions": "Supervise EMEA L1 Support Analysts and coordinate with European enterprise accounts.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "gdesk-apac-lead",
        "roleTitle": "APAC Shift Lead",
        "name": "Asia-Pacific Regional Support Manager",
        "level": 1,
        "parentId": "gdesk-dir",
        "responsibilities": "Manage APAC business hours support queue, conduct overnight monitoring for global accounts, and handover tickets to EMEA.",
        "workflowInstructions": "Supervise APAC L1 Support Analysts and provide 24/7 emergency incident coverage.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "gdesk-l1-analyst",
        "roleTitle": "L1 Support Analyst",
        "name": "Global Frontline Helpdesk Analyst",
        "level": 2,
        "parentId": "gdesk-us-lead",
        "responsibilities": "Provide first-contact resolution for credential resets, account permissions, standard software configuration, and desktop VPN issues.",
        "workflowInstructions": "Document detailed troubleshooting logs and escalate unresolved technical issues to L2 Senior Systems Administrators.",
        "delegationPolicy": "up",
        "color": "#38bdf8"
      },
      {
        "id": "gdesk-l2-admin",
        "roleTitle": "L2 Senior Systems Administrator",
        "name": "Senior Technical Specialist",
        "level": 2,
        "parentId": "gdesk-us-lead",
        "responsibilities": "Diagnose server configuration issues, database access lockups, network firewall rules, and cloud infrastructure permissions.",
        "workflowInstructions": "Perform advanced troubleshooting and escalate widespread platform outages directly to the L3 Escalation Lead.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "gdesk-l3-lead",
        "roleTitle": "L3 Technical Escalation Lead",
        "name": "Senior Engineering & Systems Liaison",
        "level": 1,
        "parentId": "gdesk-dir",
        "responsibilities": "Manage severe production system incidents, coordinate deep diagnostic traces with core software engineering squads, and unblock high-impact issues.",
        "workflowInstructions": "Direct SRE Incident Commander during live system emergencies.",
        "delegationPolicy": "auto",
        "color": "#dc2626"
      },
      {
        "id": "gdesk-sre-ic",
        "roleTitle": "SRE Incident Commander",
        "name": "Site Reliability Incident Lead",
        "level": 2,
        "parentId": "gdesk-l3-lead",
        "responsibilities": "Declare major incident bridges, coordinate engineering responders, execute failover playbooks, and restore production system availability.",
        "workflowInstructions": "Publish real-time status updates on customer status pages and lead post-incident post-mortem investigations.",
        "delegationPolicy": "up",
        "color": "#ef4444"
      }
    ]
  },
  {
    "id": "chain-ai-automated-triage-support",
    "name": "AI-Automated Triage & Hybrid Support",
    "companyName": "AI-Automated Triage & Hybrid Support",
    "description": "Modern customer support setup featuring AI frontline bots, semantic intent classification, automated macro responses, and seamless human escalation.",
    "category": "Customer Support",
    "domain": "AI Customer Support",
    "color": "#8b5cf6",
    "icon": "Bot",
    "nodes": [
      {
        "id": "ai-supp-head",
        "roleTitle": "Head of Automated Support",
        "name": "Director of Support Technology & AI",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead support automation strategy, bot deflection rate targets (deflection > 60%), human-in-the-loop CSAT, and knowledge base vectorization.",
        "workflowInstructions": "Direct AI Bot Operations Lead and Human Tier 1 Support Supervisor.",
        "delegationPolicy": "auto",
        "color": "#6d28d9"
      },
      {
        "id": "ai-bot-lead",
        "roleTitle": "AI Bot Operations & Prompt Lead",
        "name": "Conversational AI Systems Lead",
        "level": 1,
        "parentId": "ai-supp-head",
        "responsibilities": "Design LLM prompt templates, fine-tune retrieval-augmented generation (RAG) over knowledge bases, and monitor bot hallucination rates.",
        "workflowInstructions": "Direct AI Bot Agent and optimize prompt deflection rules based on customer thumbs-down ratings.",
        "delegationPolicy": "auto",
        "color": "#8b5cf6"
      },
      {
        "id": "ai-bot-agent",
        "roleTitle": "Autonomous AI Frontline Agent",
        "name": "LLM Customer Triage Bot",
        "level": 2,
        "parentId": "ai-bot-lead",
        "responsibilities": "Instantly answer customer questions by querying vectorized documentation, suggest step-by-step troubleshooting, and classify intent.",
        "workflowInstructions": "Seamlessly route complex, angry, or high-value customer inquiries to Human Tier 1 Specialists with full conversation summary.",
        "delegationPolicy": "both",
        "color": "#a855f7"
      },
      {
        "id": "ai-human-sup",
        "roleTitle": "Human Support Supervisor",
        "name": "Tier 1 & Tier 2 Team Lead",
        "level": 1,
        "parentId": "ai-supp-head",
        "responsibilities": "Supervise human support specialists who receive escalated bot conversations, monitor sentiment analysis scores, and handle VIP tickets.",
        "workflowInstructions": "Direct Human Tier 1 Specialist and Technical Investigator on complex edge-cases.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "ai-t1-agent",
        "roleTitle": "Human Tier 1 Specialist",
        "name": "Escalation Support Specialist",
        "level": 2,
        "parentId": "ai-human-sup",
        "responsibilities": "Review AI-generated conversation summary, engage customer empathetically, test billing exceptions, and resolve account-specific blockers.",
        "workflowInstructions": "Escalate reproducible software errors to Technical Investigator with detailed customer logs.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "ai-t2-inv",
        "roleTitle": "Tier 2 Technical Investigator",
        "name": "Deep Technical Triage Specialist",
        "level": 2,
        "parentId": "ai-human-sup",
        "responsibilities": "Inspect API webhooks, verify backend database records, and isolate whether the issue is a bug, knowledge gap, or upstream outage.",
        "workflowInstructions": "File verified defect tickets with Engineering Liaison or update knowledge base articles for the AI bot.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "ai-eng-liaison",
        "roleTitle": "Engineering Liaison & Bug Fixer",
        "name": "Embedded Support Engineer",
        "level": 1,
        "parentId": "ai-supp-head",
        "responsibilities": "Review verified defect tickets, patch straightforward software bugs, write automated tests, and deploy hotfixes.",
        "workflowInstructions": "Keep Support team informed of release fixes so customers receive personalized resolution notifications.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-white-glove-tech-support",
    "name": "White-Glove VIP Technical Support",
    "companyName": "White-Glove VIP Technical Support",
    "description": "Dedicated premium support model for high-value enterprise accounts requiring dedicated named support engineers, 15-minute response SLAs, and direct engineering access.",
    "category": "Customer Support",
    "domain": "VIP Enterprise Support",
    "color": "#b45309",
    "icon": "ShieldCheck",
    "nodes": [
      {
        "id": "vip-dir",
        "roleTitle": "Director of Premium Support",
        "name": "White-Glove Service Operations Head",
        "level": 0,
        "parentId": null,
        "responsibilities": "Maintain 100% adherence to 15-minute response time SLAs, conduct executive relationship check-ins, and oversee VIP support tiers.",
        "workflowInstructions": "Direct Principal Support Engineer and VIP Escalation Manager on customer satisfaction.",
        "delegationPolicy": "auto",
        "color": "#78350f"
      },
      {
        "id": "vip-princ-eng",
        "roleTitle": "Principal Support Engineer",
        "name": "Lead Technical Account Engineer",
        "level": 1,
        "parentId": "vip-dir",
        "responsibilities": "Understand complex enterprise client infrastructure topologies, review client API integration architecture, and conduct periodic architecture reviews.",
        "workflowInstructions": "Direct Named Support Engineers on proactive system health audits and custom patch delivery.",
        "delegationPolicy": "both",
        "color": "#b45309"
      },
      {
        "id": "vip-named-eng",
        "roleTitle": "Named Enterprise Support Engineer",
        "name": "Dedicated Technical Account Specialist",
        "level": 2,
        "parentId": "vip-princ-eng",
        "responsibilities": "Serve as direct dedicated technical contact for assigned VIP accounts on shared Slack/Teams channels and private ticketing portals.",
        "workflowInstructions": "Investigate client issues immediately, inspect server telemetry, and reproduce complex multi-system integration bugs.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "vip-esc-mgr",
        "roleTitle": "VIP Escalation Manager",
        "name": "Executive Incident & Client Advocate",
        "level": 1,
        "parentId": "vip-dir",
        "responsibilities": "Coordinate emergency bridges during client critical incidents, provide hourly executive status briefs, and remove internal blockers.",
        "workflowInstructions": "Partner with Engineering Tech Leads to prioritize urgent hotfixes over regular sprint work.",
        "delegationPolicy": "both",
        "color": "#ea580c"
      },
      {
        "id": "vip-eng-lead",
        "roleTitle": "Engineering Escalation Lead",
        "name": "Core Software Engineering Liaison",
        "level": 2,
        "parentId": "vip-esc-mgr",
        "responsibilities": "Direct top-tier software engineers to analyze production memory dumps, write emergency patch builds, and verify system stability.",
        "workflowInstructions": "Ensure hotfixes are rigorously regression-tested before delivering custom client build artifacts.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "vip-qa-spec",
        "roleTitle": "QA VIP Regression Specialist",
        "name": "Dedicated Hotfix Verification Tester",
        "level": 3,
        "parentId": "vip-eng-lead",
        "responsibilities": "Test emergency hotfixes against replica customer datasets and verify zero regression before hotfix deployment.",
        "workflowInstructions": "Certify emergency build stability to give the VIP Escalation Manager confidence in production rollout.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-ecommerce-customer-care-ops",
    "name": "E-Commerce Customer Care & Returns Escalation",
    "companyName": "E-Commerce Customer Care & Returns Escalation",
    "description": "High-volume online retail customer support covering order tracking, returns processing, warehouse dispatch communication, and payment disputes.",
    "category": "Customer Support",
    "domain": "Retail Support",
    "color": "#ea580c",
    "icon": "ShoppingBag",
    "nodes": [
      {
        "id": "ecom-cx-head",
        "roleTitle": "VP of Customer Experience",
        "name": "Head of E-Commerce Care",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead customer care operations across chat, phone, and social media. Maintain CSAT > 90% and manage holiday peak season staffing.",
        "workflowInstructions": "Direct Live Chat Lead, Warehouse Escalation Lead, and Fraud & Payment Specialist.",
        "delegationPolicy": "auto",
        "color": "#c2410c"
      },
      {
        "id": "ecom-chat-lead",
        "roleTitle": "Live Chat & Frontline Lead",
        "name": "Customer Care Shift Supervisor",
        "level": 1,
        "parentId": "ecom-cx-head",
        "responsibilities": "Monitor live chat queues, average handle time (AHT), agent resolution quality, and customer refund authorization limits.",
        "workflowInstructions": "Supervise Customer Care Agents and assist with difficult or angry customer escalations.",
        "delegationPolicy": "auto",
        "color": "#ea580c"
      },
      {
        "id": "ecom-care-agent",
        "roleTitle": "Customer Care Agent",
        "name": "Frontline Chat & Email Specialist",
        "level": 2,
        "parentId": "ecom-chat-lead",
        "responsibilities": "Assist customers with order tracking, size/color exchanges, promo code errors, and return merchandise authorizations (RMA).",
        "workflowInstructions": "Process refunds within authorized thresholds and escalate missing shipments to the Warehouse Operations Liaison.",
        "delegationPolicy": "up",
        "color": "#f97316"
      },
      {
        "id": "ecom-wh-liaison",
        "roleTitle": "Warehouse Operations Liaison",
        "name": "Logistics & Fulfillment Support Lead",
        "level": 1,
        "parentId": "ecom-cx-head",
        "responsibilities": "Coordinate directly with physical fulfillment centers to halt incorrect shipments, expedite backordered items, and inspect damaged returns.",
        "workflowInstructions": "Direct Order Investigation Specialist to track down lost carrier parcels.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "ecom-order-spec",
        "roleTitle": "Order Investigation Specialist",
        "name": "Carrier & Parcel Claims Specialist",
        "level": 2,
        "parentId": "ecom-wh-liaison",
        "responsibilities": "Interface with shipping carriers (FedEx/UPS/DHL) to file lost package tracer claims, initiate address corrections, and coordinate reshipments.",
        "workflowInstructions": "Update order tracking records in the ERP and notify customers of updated arrival estimates.",
        "delegationPolicy": "up",
        "color": "#06b6d4"
      },
      {
        "id": "ecom-fraud-lead",
        "roleTitle": "Payment & Dispute Specialist",
        "name": "Chargeback & Anti-Fraud Analyst",
        "level": 1,
        "parentId": "ecom-cx-head",
        "responsibilities": "Investigate suspicious credit card transactions, defend illegitimate customer chargebacks with proof-of-delivery, and prevent fraud losses.",
        "workflowInstructions": "Configure automated fraud detection rules in Stripe/Sift and flag compromised customer accounts.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "ecom-dev-liaison",
        "roleTitle": "Storefront Bug Escalation Lead",
        "name": "E-Commerce Tech Support Engineer",
        "level": 1,
        "parentId": "ecom-cx-head",
        "responsibilities": "Monitor storefront checkout error rates, investigate failed payment webhooks, and escalate cart bugs directly to Core Engineering.",
        "workflowInstructions": "Reproduce mobile checkout glitches and verify that deployed fixes resolve customer purchase barriers.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-developer-community-support-hub",
    "name": "Developer Community & Technical Support Hub",
    "companyName": "Developer Community & Technical Support Hub",
    "description": "Community-centric technical support structure where developer advocates, forum moderators, and SDK maintainers triage technical coding questions.",
    "category": "Customer Support",
    "domain": "Dev Community Support",
    "color": "#6366f1",
    "icon": "MessageSquareCode",
    "nodes": [
      {
        "id": "dcom-head",
        "roleTitle": "Head of Developer Community",
        "name": "DevRel & Community Support Director",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead developer community strategy across GitHub, Discord, StackOverflow, and Discourse; track time-to-first-response on developer issues.",
        "workflowInstructions": "Direct DevRel Advocates and Technical Support Engineers to deliver world-class technical assistance.",
        "delegationPolicy": "auto",
        "color": "#4338ca"
      },
      {
        "id": "dcom-advocate",
        "roleTitle": "Senior Developer Advocate",
        "name": "Technical Community Champion",
        "level": 1,
        "parentId": "dcom-head",
        "responsibilities": "Answer complex architectural questions on Discord, create sample starter apps, write technical debugging guides, and host live Q&A.",
        "workflowInstructions": "Gather community developer feedback and champion feature improvements with product and engineering teams.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "dcom-mod",
        "roleTitle": "Community Forum Moderator",
        "name": "Discord & Forum Coordinator",
        "level": 1,
        "parentId": "dcom-head",
        "responsibilities": "Keep community channels organized, enforce code of conduct, tag unanswered questions, and surface high-frequency developer pain points.",
        "workflowInstructions": "Welcome new developers and connect them with relevant tutorials and documentation.",
        "delegationPolicy": "up",
        "color": "#818cf8"
      },
      {
        "id": "dcom-tech-eng",
        "roleTitle": "Technical Support Engineer",
        "name": "Developer Solutions Engineer",
        "level": 1,
        "parentId": "dcom-head",
        "responsibilities": "Reproduce developer code snippets, troubleshoot authentication errors, inspect network traces, and provide working code samples in GitHub issues.",
        "workflowInstructions": "File verified SDK and API defect tickets directly with the Core SDK Maintenance Developer.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "dcom-sdk-dev",
        "roleTitle": "SDK Maintenance Developer",
        "name": "Core Library & Bugfix Engineer",
        "level": 2,
        "parentId": "dcom-tech-eng",
        "responsibilities": "Fix bugs in client SDKs (TypeScript/Python/Go), release patch versions to package registries (npm/PyPI), and update changelogs.",
        "workflowInstructions": "Close the loop by commenting on original GitHub issues once the bugfix version is published.",
        "delegationPolicy": "up",
        "color": "#06b6d4"
      }
    ]
  },
  {
    "id": "chain-msp-helpdesk-tier123",
    "name": "Managed Service Provider (MSP) Multi-Tier Desk",
    "companyName": "Managed Service Provider (MSP) Multi-Tier Desk",
    "description": "Structured outsourced IT service desk supporting hundreds of corporate clients with Tier 1 dispatch, Tier 2 systems administration, and Tier 3 network engineering.",
    "category": "Customer Support",
    "domain": "MSP Helpdesk",
    "color": "#0891b2",
    "icon": "Network",
    "nodes": [
      {
        "id": "msp-mgr",
        "roleTitle": "MSP Helpdesk Manager",
        "name": "Service Desk Operations Director",
        "level": 0,
        "parentId": null,
        "responsibilities": "Manage multi-client service level agreements (SLAs), billable tech utilization, customer satisfaction metrics, and escalations.",
        "workflowInstructions": "Direct Tier 1 Dispatch, Tier 2 Systems Specialists, and Tier 3 Network Escalation Leads.",
        "delegationPolicy": "auto",
        "color": "#0e7490"
      },
      {
        "id": "msp-t1-dispatch",
        "roleTitle": "Tier 1 Dispatch & Triage Lead",
        "name": "Helpdesk Shift Supervisor",
        "level": 1,
        "parentId": "msp-mgr",
        "responsibilities": "Categorize incoming client tickets (email, phone, portal), verify SLA urgency, dispatch tickets to technicians, and handle password resets.",
        "workflowInstructions": "Supervise Tier 1 Technicians and monitor ticket queue aging.",
        "delegationPolicy": "auto",
        "color": "#0891b2"
      },
      {
        "id": "msp-t1-tech",
        "roleTitle": "Tier 1 Helpdesk Technician",
        "name": "Remote Desktop Support Specialist",
        "level": 2,
        "parentId": "msp-t1-dispatch",
        "responsibilities": "Perform remote desktop takeovers via ConnectWise/TeamViewer, troubleshoot Outlook email profiles, map network drives, and install printer drivers.",
        "workflowInstructions": "Document ticket resolution notes thoroughly and escalate complex issues to Tier 2 within 20 minutes.",
        "delegationPolicy": "up",
        "color": "#06b6d4"
      },
      {
        "id": "msp-t2-lead",
        "roleTitle": "Tier 2 Systems Administration Lead",
        "name": "Senior Systems Specialist",
        "level": 1,
        "parentId": "msp-mgr",
        "responsibilities": "Manage Microsoft 365 tenant configurations, Active Directory user permissions, Hyper-V/VMware virtual machines, and backup restorations.",
        "workflowInstructions": "Investigate recurring workstation software crashes and server performance degradations.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "msp-t3-lead",
        "roleTitle": "Tier 3 Network Escalation Specialist",
        "name": "Principal Network & Security Engineer",
        "level": 1,
        "parentId": "msp-mgr",
        "responsibilities": "Troubleshoot complex enterprise firewall policies (Fortinet/SonicWall), VLAN routing, site-to-site VPN drops, and cyber incident containment.",
        "workflowInstructions": "Provide highest-level technical escalations and lead root-cause analysis for major client outages.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "msp-field-lead",
        "roleTitle": "Field Service Dispatch Lead",
        "name": "On-Site Operations Lead",
        "level": 1,
        "parentId": "msp-mgr",
        "responsibilities": "Dispatch field technicians to client physical offices for server rack installations, cable patch terminations, and emergency hardware repairs.",
        "workflowInstructions": "Direct Field Technicians to complete on-site tickets within contractual emergency arrival SLAs.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "msp-field-tech",
        "roleTitle": "On-Site Field Technician",
        "name": "Hardware & Network Field Specialist",
        "level": 2,
        "parentId": "msp-field-lead",
        "responsibilities": "Travel to client sites to replace failed hard drives in RAID arrays, mount firewall appliances, replace network switches, and configure workstations.",
        "workflowInstructions": "Verify full network restoration before departing client facilities and document asset serial numbers.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-incident-response-swat",
    "name": "Critical Incident SWAT & Outage Escalation",
    "companyName": "Critical Incident SWAT & Outage Escalation",
    "description": "High-urgency emergency engineering structure mobilized during P0 outages to restore system uptime, manage customer communications, and prevent data loss.",
    "category": "Customer Support",
    "domain": "Incident Management",
    "color": "#dc2626",
    "icon": "AlertTriangle",
    "nodes": [
      {
        "id": "swat-ic",
        "roleTitle": "Incident Commander (IC)",
        "name": "Major Incident Operations Commander",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead live outage war room, make executive decisions on service cutovers or rollbacks, and assign technical investigation roles.",
        "workflowInstructions": "Direct Operations SRE, Core Application Lead, and Communications Lead to eliminate chaos and focus on rapid MTTR.",
        "delegationPolicy": "auto",
        "color": "#991b1b"
      },
      {
        "id": "swat-sre",
        "roleTitle": "Primary On-Call SRE",
        "name": "Infrastructure & Production Operations Lead",
        "level": 1,
        "parentId": "swat-ic",
        "responsibilities": "Inspect Kubernetes pod crash loops, analyze load balancer error spikes, roll back faulty infrastructure deployments, and manage database failovers.",
        "workflowInstructions": "Execute emergency mitigation playbooks and report telemetry trends to the Incident Commander.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "swat-app-lead",
        "roleTitle": "Secondary Application Lead",
        "name": "Application Code & Bug Triage Lead",
        "level": 1,
        "parentId": "swat-ic",
        "responsibilities": "Inspect recent code pull requests, analyze stack traces in Sentry, identify offending commits, and cherry-pick hotfixes.",
        "workflowInstructions": "Test emergency hotfix branches in isolated preview environments and prepare hotfix builds for deployment.",
        "delegationPolicy": "both",
        "color": "#ea580c"
      },
      {
        "id": "swat-comms",
        "roleTitle": "Customer Communications Lead",
        "name": "Customer Trust & Status Page Lead",
        "level": 1,
        "parentId": "swat-ic",
        "responsibilities": "Publish real-time incident status updates on public status pages (Statuspage.io), draft executive client briefs, and liaise with Support.",
        "workflowInstructions": "Translate complex technical updates into clear, transparent customer communications every 15-30 minutes.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "swat-scribe",
        "roleTitle": "Post-Mortem Scribe & Analyst",
        "name": "Incident Documentation Specialist",
        "level": 1,
        "parentId": "swat-ic",
        "responsibilities": "Document exact minute-by-minute timeline of events during the incident, record hypotheses tested, and draft the blameless post-mortem report.",
        "workflowInstructions": "Track follow-up prevention action items (action items assigned to engineering squads) to ensure the failure mode never repeats.",
        "delegationPolicy": "up",
        "color": "#475569"
      }
    ]
  },
  {
    "id": "chain-fintech-dispute-resolution",
    "name": "FinTech Dispute Resolution & Fraud Escalation",
    "companyName": "FinTech Dispute Resolution & Fraud Escalation",
    "description": "Financial technology dispute handling pipeline connecting customer service claims with fraud forensic investigation, card network rules, and core ledger developers.",
    "category": "Customer Support",
    "domain": "FinTech Support",
    "color": "#059669",
    "icon": "CreditCard",
    "nodes": [
      {
        "id": "disp-head",
        "roleTitle": "Head of Disputes & Financial Crime",
        "name": "Disputes & Fraud Operations Director",
        "level": 0,
        "parentId": null,
        "responsibilities": "Maintain bank chargeback win rates > 70%, ensure compliance with Visa/Mastercard operating regulations, and minimize fraud loss provisions.",
        "workflowInstructions": "Direct Frontline Dispute Supervisor, Fraud Forensic Lead, and Banking Integration Liaison.",
        "delegationPolicy": "auto",
        "color": "#064e3b"
      },
      {
        "id": "disp-sup",
        "roleTitle": "Frontline Dispute Supervisor",
        "name": "Customer Claims Team Lead",
        "level": 1,
        "parentId": "disp-head",
        "responsibilities": "Manage incoming customer transaction disputes, provisional credit disbursements, and statutory regulatory timelines (Regulation E).",
        "workflowInstructions": "Supervise Dispute Resolution Agents and escalate suspected organized fraud rings to Fraud Forensics.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "disp-agent",
        "roleTitle": "Dispute Resolution Agent",
        "name": "Customer Financial Claims Specialist",
        "level": 2,
        "parentId": "disp-sup",
        "responsibilities": "Review customer dispute claims, collect receipts and affidavits of unauthorized transactions, and determine dispute validity.",
        "workflowInstructions": "Issue provisional credits according to regulatory deadlines and submit chargebacks into card network portals.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "disp-fraud-lead",
        "roleTitle": "Fraud Forensics Lead",
        "name": "Financial Crime & Fraud Tech Specialist",
        "level": 1,
        "parentId": "disp-head",
        "responsibilities": "Analyze transaction device fingerprints, IP geolocation anomalies, card-testing attacks, and coordinated account takeover rings.",
        "workflowInstructions": "Configure fraud rules in machine learning engines (Sift/Stripe Radar) to block emerging attack vectors.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "disp-ledger-dev",
        "roleTitle": "Core Ledger Developer",
        "name": "Banking Ledger & Transaction Specialist",
        "level": 1,
        "parentId": "disp-head",
        "responsibilities": "Investigate double-charge anomalies, ledger settlement mismatches, and failed ACH reversal webhooks in the double-entry accounting engine.",
        "workflowInstructions": "Write database reconciliation scripts and fix payment processing race conditions.",
        "delegationPolicy": "up",
        "color": "#0284c7"
      }
    ]
  },
  {
    "id": "chain-telecom-customer-support-ops",
    "name": "Telecommunications Network Support & Escalation",
    "companyName": "Telecommunications Network Support & Escalation",
    "description": "Multi-tier telecom customer support resolving broadband outages, line diagnostic tests, customer dispatch scheduling, and fiber optic repair teams.",
    "category": "Customer Support",
    "domain": "Telecom Support",
    "color": "#2563eb",
    "icon": "Radio",
    "nodes": [
      {
        "id": "tel-vp",
        "roleTitle": "VP of Customer Service",
        "name": "Telecom Customer Operations Head",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead broadband and wireless customer satisfaction, average handle time (AHT), field dispatch cost efficiency, and customer churn reduction.",
        "workflowInstructions": "Direct Call Center Operations Lead and Network Operations Center (NOC) Escalation Lead.",
        "delegationPolicy": "auto",
        "color": "#1e40af"
      },
      {
        "id": "tel-cc-lead",
        "roleTitle": "Call Center Operations Lead",
        "name": "Customer Support Center Supervisor",
        "level": 1,
        "parentId": "tel-vp",
        "responsibilities": "Manage frontline telephone and digital chat queues, monitor real-time queue abandon rates, and coach customer service agents.",
        "workflowInstructions": "Supervise Tier 1 Support Agents and route suspected line faults to the Network Diagnostic Technician.",
        "delegationPolicy": "auto",
        "color": "#2563eb"
      },
      {
        "id": "tel-t1-rep",
        "roleTitle": "Tier 1 Telecom Support Agent",
        "name": "Broadband & Mobile Support Specialist",
        "level": 2,
        "parentId": "tel-cc-lead",
        "responsibilities": "Assist subscribers with Wi-Fi router reboot procedures, billing clarifications, plan upgrades, and basic connectivity checks.",
        "workflowInstructions": "Run automated line diagnostics and escalate confirmed physical signal degradation to the Network Diagnostic Technician.",
        "delegationPolicy": "up",
        "color": "#38bdf8"
      },
      {
        "id": "tel-diag-tech",
        "roleTitle": "Network Diagnostic Technician",
        "name": "Tier 2 Line Test Specialist",
        "level": 2,
        "parentId": "tel-cc-lead",
        "responsibilities": "Perform loopback testing, verify optical time-domain reflectometer (OTDR) readings, inspect DSLAM/OLT port status, and detect line noise.",
        "workflowInstructions": "Determine if issue requires truck rollout and schedule dispatch work orders with the Field Dispatch Lead.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "tel-field-lead",
        "roleTitle": "Field Dispatch & Fleet Lead",
        "name": "Outside Plant Dispatch Supervisor",
        "level": 1,
        "parentId": "tel-vp",
        "responsibilities": "Coordinate fleet of bucket trucks and technicians, assign geographic service territories, and ensure emergency fiber restoration within SLA.",
        "workflowInstructions": "Direct Fiber Splicing Technicians on physical repairs.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "tel-splice-tech",
        "roleTitle": "Fiber Splicing & Outside Technician",
        "name": "Field Network Infrastructure Specialist",
        "level": 2,
        "parentId": "tel-field-lead",
        "responsibilities": "Drive to customer premises or utility poles, locate cut fiber cables, perform fusion splicing, and replace faulty optical network terminals (ONT).",
        "workflowInstructions": "Verify optical decibel power levels and close field repair tickets via mobile app upon customer sign-off.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-product-management-studio",
    "name": "Product Management & Discovery Studio",
    "companyName": "Product Management & Discovery Studio",
    "description": "Comprehensive product organization connecting Chief Product Officer with Group PMs, UX Researchers, Technical PMs, and Data Analysts.",
    "category": "Product & Design",
    "domain": "Product Strategy",
    "color": "#7c3aed",
    "icon": "LayoutGrid",
    "nodes": [
      {
        "id": "prod-cpo",
        "roleTitle": "Chief Product Officer (CPO)",
        "name": "Head of Product Strategy",
        "level": 0,
        "parentId": null,
        "responsibilities": "Define multi-year product roadmap, competitive differentiation, capital resource allocation across squads, and executive board alignment.",
        "workflowInstructions": "Direct Group Product Managers and Lead UX Researcher on product discovery milestones.",
        "delegationPolicy": "auto",
        "color": "#5b21b6"
      },
      {
        "id": "prod-gpm-core",
        "roleTitle": "Group Product Manager - Core",
        "name": "Core Platform Product Head",
        "level": 1,
        "parentId": "prod-cpo",
        "responsibilities": "Oversee core feature roadmap, platform reliability features, enterprise workflow tools, and cross-squad architectural alignment.",
        "workflowInstructions": "Direct Senior PM Core and Technical PM on quarterly sprint planning and feature specifications.",
        "delegationPolicy": "auto",
        "color": "#7c3aed"
      },
      {
        "id": "prod-gpm-growth",
        "roleTitle": "Group Product Manager - Growth",
        "name": "Acquisition & Monetization Head",
        "level": 1,
        "parentId": "prod-cpo",
        "responsibilities": "Lead self-serve user acquisition funnels, pricing tier experiments, billing portals, and referral loop optimizations.",
        "workflowInstructions": "Supervise Senior PM Growth and Product Data Analyst on weekly experiment velocity.",
        "delegationPolicy": "auto",
        "color": "#6366f1"
      },
      {
        "id": "prod-pm-core",
        "roleTitle": "Senior Product Manager",
        "name": "Core Experience PM",
        "level": 2,
        "parentId": "prod-gpm-core",
        "responsibilities": "Write detailed Product Requirement Documents (PRDs), run customer discovery interviews, prioritize sprint backlogs, and track feature adoption.",
        "workflowInstructions": "Partner with Engineering Tech Leads and Product Designers during daily execution.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "prod-tpm",
        "roleTitle": "Technical Product Manager",
        "name": "API & Platform Integrations TPM",
        "level": 2,
        "parentId": "prod-gpm-core",
        "responsibilities": "Define technical API contracts, developer documentation schemas, partner integrations, and system scalability requirements.",
        "workflowInstructions": "Interface between engineering architects and non-technical business stakeholders.",
        "delegationPolicy": "both",
        "color": "#a855f7"
      },
      {
        "id": "prod-pm-growth",
        "roleTitle": "Senior PM - Growth & Monetization",
        "name": "Funnels & Conversion PM",
        "level": 2,
        "parentId": "prod-gpm-growth",
        "responsibilities": "Analyze onboarding funnel drop-offs, design interactive onboarding checklists, formulate A/B test variants, and optimize conversion.",
        "workflowInstructions": "Coordinate with growth engineers to launch rapid experiment cycles.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "prod-ux-lead",
        "roleTitle": "Lead UX Researcher",
        "name": "User Insights & Discovery Lead",
        "level": 1,
        "parentId": "prod-cpo",
        "responsibilities": "Conduct generative user research, customer usability testing sessions, persona mapping, and customer journey pain point synthesis.",
        "workflowInstructions": "Deliver actionable customer evidence to Product Managers and Designers to guide product priorities.",
        "delegationPolicy": "both",
        "color": "#d946ef"
      },
      {
        "id": "prod-analyst",
        "roleTitle": "Product Data Analyst",
        "name": "Telemetry & Behavioral Analytics Lead",
        "level": 2,
        "parentId": "prod-gpm-growth",
        "responsibilities": "Build Amplitude/Mixpanel retention cohort analyses, track daily active user (DAU) trends, and measure statistical significance of experiments.",
        "workflowInstructions": "Deliver weekly product performance scorecards to executive leadership.",
        "delegationPolicy": "up",
        "color": "#06b6d4"
      }
    ]
  },
  {
    "id": "chain-ux-research-design-studio",
    "name": "UX Research & Product Design Studio",
    "companyName": "UX Research & Product Design Studio",
    "description": "Design-led agency or in-house studio covering qualitative user research, design system tokens, interactive prototyping, and visual aesthetics.",
    "category": "Product & Design",
    "domain": "UI/UX Design",
    "color": "#d946ef",
    "icon": "Palette",
    "nodes": [
      {
        "id": "ux-dir",
        "roleTitle": "VP of Product Design",
        "name": "Head of Design & Brand Experience",
        "level": 0,
        "parentId": null,
        "responsibilities": "Champion human-centered design excellence, brand visual identity, design team culture, and cross-platform design cohesion.",
        "workflowInstructions": "Direct Design Systems Lead, Lead UX Researcher, and Principal Product Designer.",
        "delegationPolicy": "auto",
        "color": "#a21caf"
      },
      {
        "id": "ux-res-lead",
        "roleTitle": "Lead User Researcher",
        "name": "Customer Discovery & Usability Head",
        "level": 1,
        "parentId": "ux-dir",
        "responsibilities": "Lead moderated usability testing, customer contextual inquiry, ethnographic field studies, and card sorting experiments.",
        "workflowInstructions": "Synthesize user mental models into actionable design frameworks and product opportunity briefs.",
        "delegationPolicy": "both",
        "color": "#c026d3"
      },
      {
        "id": "ux-princ-des",
        "roleTitle": "Principal Product Designer",
        "name": "Lead Interaction Architect",
        "level": 1,
        "parentId": "ux-dir",
        "responsibilities": "Architect complex multi-step application workflows, information architecture, navigation paradigms, and high-fidelity wireframes.",
        "workflowInstructions": "Supervise Senior Product Designers on day-to-day feature mockups.",
        "delegationPolicy": "both",
        "color": "#d946ef"
      },
      {
        "id": "ux-sr-des",
        "roleTitle": "Senior Product Designer",
        "name": "UI/UX & Feature Designer",
        "level": 2,
        "parentId": "ux-princ-des",
        "responsibilities": "Create high-fidelity Figma components, responsive screen layouts, interactive clickable prototypes, and micro-interactions.",
        "workflowInstructions": "Handoff specifications to frontend engineers and conduct design quality assurance (QA) reviews on staging builds.",
        "delegationPolicy": "both",
        "color": "#e879f9"
      },
      {
        "id": "ux-visual-des",
        "roleTitle": "Visual & Brand Designer",
        "name": "Aesthetic & Marketing Visual Lead",
        "level": 2,
        "parentId": "ux-princ-des",
        "responsibilities": "Design custom vector illustrations, marketing landing page visual assets, icon libraries, and promotional graphics.",
        "workflowInstructions": "Ensure visual consistency across marketing web properties and product interfaces.",
        "delegationPolicy": "up",
        "color": "#f0abfc"
      },
      {
        "id": "ux-motion-des",
        "roleTitle": "Motion & Prototyping Designer",
        "name": "Micro-Interactions Specialist",
        "level": 2,
        "parentId": "ux-princ-des",
        "responsibilities": "Design fluid spring animations, state transition choreographies, celebration rewards, and animated SVG/Lottie assets.",
        "workflowInstructions": "Prototype micro-animations in Principle/Framer and supply animation timing curves to frontend developers.",
        "delegationPolicy": "up",
        "color": "#f472b6"
      }
    ]
  },
  {
    "id": "chain-design-systems-guild",
    "name": "Design Systems & Component Engineering Guild",
    "companyName": "Design Systems & Component Engineering Guild",
    "description": "Dedicated cross-functional guild managing enterprise UI component libraries, Figma design tokens, WCAG accessibility, and NPM packages.",
    "category": "Product & Design",
    "domain": "Design Systems",
    "color": "#ec4899",
    "icon": "Component",
    "nodes": [
      {
        "id": "ds-lead",
        "roleTitle": "Design Systems Lead",
        "name": "Director of Design Systems & Architecture",
        "level": 0,
        "parentId": null,
        "responsibilities": "Define design token architecture, cross-platform component standards, design system governance, and adoption across engineering squads.",
        "workflowInstructions": "Direct Staff Design Technologist and Lead UI Designer on component library releases.",
        "delegationPolicy": "auto",
        "color": "#be185d"
      },
      {
        "id": "ds-technologist",
        "roleTitle": "Staff Design Technologist",
        "name": "Design-to-Code Engineering Lead",
        "level": 1,
        "parentId": "ds-lead",
        "responsibilities": "Bridge Figma design tokens with React/Web Component codebases via Style Dictionary and automated CI/CD token pipelines.",
        "workflowInstructions": "Supervise Component Library Developers on NPM package releases and versioning.",
        "delegationPolicy": "both",
        "color": "#ec4899"
      },
      {
        "id": "ds-comp-dev",
        "roleTitle": "Component Library React Engineer",
        "name": "Core UI Component Developer",
        "level": 2,
        "parentId": "ds-technologist",
        "responsibilities": "Build robust, accessible, unstyled headless primitives using Radix/Floating UI, test across browsers, and write Storybook stories.",
        "workflowInstructions": "Publish semantic NPM packages, maintain zero runtime styling overhead, and optimize bundle sizes.",
        "delegationPolicy": "both",
        "color": "#f472b6"
      },
      {
        "id": "ds-designer",
        "roleTitle": "Senior Design Systems Designer",
        "name": "Figma Token & UI Component Lead",
        "level": 1,
        "parentId": "ds-lead",
        "responsibilities": "Maintain master Figma library with auto-layout, variants, light/dark themes, spacing grids, and component documentation.",
        "workflowInstructions": "Review squad design contributions and enforce design token adoption across all product mockups.",
        "delegationPolicy": "both",
        "color": "#d946ef"
      },
      {
        "id": "ds-a11y-spec",
        "roleTitle": "Accessibility (a11y) Specialist",
        "name": "WCAG 2.1 AAA Compliance Engineer",
        "level": 1,
        "parentId": "ds-lead",
        "responsibilities": "Audit components for keyboard navigation, screen reader ARIA landmarks, color contrast ratios, and focus rings.",
        "workflowInstructions": "Enforce automated axe-core accessibility checks in CI pipelines to prevent accessibility regressions.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-mobile-product-squad",
    "name": "Mobile-First iOS & Android Product Squad",
    "companyName": "Mobile-First iOS & Android Product Squad",
    "description": "High-performance mobile app squad delivering fluid iOS and Android experiences with native Swift/Kotlin/React Native, Mobile QA, and App Store Ops.",
    "category": "Product & Design",
    "domain": "Mobile Applications",
    "color": "#0284c7",
    "icon": "Smartphone",
    "nodes": [
      {
        "id": "mob-dir",
        "roleTitle": "Mobile Product Director",
        "name": "Head of Mobile Applications",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead mobile product roadmap, Apple App Store / Google Play ratings (> 4.8 stars), app launch velocity, and push notification engagement.",
        "workflowInstructions": "Direct Lead iOS Engineer, Lead Android Engineer, and Mobile Product Manager.",
        "delegationPolicy": "auto",
        "color": "#0369a1"
      },
      {
        "id": "mob-pm",
        "roleTitle": "Mobile Product Manager",
        "name": "Native Experience PM",
        "level": 1,
        "parentId": "mob-dir",
        "responsibilities": "Write user stories tailored for mobile gestures, location services, offline capabilities, and biometric authentication (FaceID).",
        "workflowInstructions": "Coordinate app release trains, track crash-free session rates (> 99.9%), and monitor store reviews.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "mob-designer",
        "roleTitle": "Mobile UI/UX Designer",
        "name": "iOS & Material Design Specialist",
        "level": 1,
        "parentId": "mob-dir",
        "responsibilities": "Design platform-idiomatic interfaces adhering to Apple Human Interface Guidelines and Google Material 3.",
        "workflowInstructions": "Deliver high-fidelity screen specs, haptic feedback guidelines, and interactive mobile prototypes.",
        "delegationPolicy": "both",
        "color": "#d946ef"
      },
      {
        "id": "mob-ios-lead",
        "roleTitle": "Lead iOS Engineer",
        "name": "Principal Swift / SwiftUI Architect",
        "level": 1,
        "parentId": "mob-dir",
        "responsibilities": "Architect clean Swift/SwiftUI mobile architecture, local CoreData/Realm storage, background sync, and push notifications.",
        "workflowInstructions": "Direct iOS Developer on feature implementation and ensure smooth 120Hz ProMotion animations.",
        "delegationPolicy": "both",
        "color": "#2563eb"
      },
      {
        "id": "mob-ios-dev",
        "roleTitle": "Senior iOS Developer",
        "name": "Swift & Metal Performance Developer",
        "level": 2,
        "parentId": "mob-ios-lead",
        "responsibilities": "Implement screen views, handle dynamic type sizing, integrate StoreKit in-app purchases, and optimize memory usage.",
        "workflowInstructions": "Write automated XCTest UI suites and resolve memory leaks using Xcode Instruments.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "mob-android-lead",
        "roleTitle": "Lead Android Engineer",
        "name": "Principal Kotlin / Jetpack Compose Architect",
        "level": 1,
        "parentId": "mob-dir",
        "responsibilities": "Architect modern Android applications using Kotlin, Jetpack Compose, Coroutines, and Room local databases.",
        "workflowInstructions": "Direct Android Developer on feature delivery, device fragmentation testing, and battery performance.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "mob-android-dev",
        "roleTitle": "Senior Android Developer",
        "name": "Kotlin & Compose UI Developer",
        "level": 2,
        "parentId": "mob-android-lead",
        "responsibilities": "Build reactive UI screens, handle varied screen aspect ratios and foldables, and integrate Google Play In-App Billing.",
        "workflowInstructions": "Optimize APK size with ProGuard/R8 and ensure smooth back-stack navigation handling.",
        "delegationPolicy": "both",
        "color": "#34d399"
      },
      {
        "id": "mob-qa-tester",
        "roleTitle": "Mobile QA Automation Tester",
        "name": "Appium & Device Farm Specialist",
        "level": 1,
        "parentId": "mob-dir",
        "responsibilities": "Run automated mobile test suites on cloud device farms (AWS Device Farm/BrowserStack) across 50+ real physical smartphones.",
        "workflowInstructions": "Verify zero crashes on low-end hardware, check network latency tolerance, and certify App Store release candidates.",
        "delegationPolicy": "up",
        "color": "#ea580c"
      }
    ]
  },
  {
    "id": "chain-voice-conversational-ux",
    "name": "Conversational AI & Voice Interaction Studio",
    "companyName": "Conversational AI & Voice Interaction Studio",
    "description": "Specialized voice AI and dialogue management team building interactive voice assistants, telephony bots, and speech synthesis pipelines.",
    "category": "Product & Design",
    "domain": "Conversational AI",
    "color": "#8b5cf6",
    "icon": "Mic",
    "nodes": [
      {
        "id": "vux-lead",
        "roleTitle": "Head of Conversational AI",
        "name": "Director of Voice & NLP Systems",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead voice assistant personality, speech recognition accuracy (WER < 5%), latency budgets (sub-500ms voice response), and telephony partnerships.",
        "workflowInstructions": "Direct Voice UX Designer, Speech Scientist, and Dialogue Engine Developer.",
        "delegationPolicy": "auto",
        "color": "#6d28d9"
      },
      {
        "id": "vux-designer",
        "roleTitle": "Voice UX Designer",
        "name": "Conversational Persona & Flow Architect",
        "level": 1,
        "parentId": "vux-lead",
        "responsibilities": "Design conversational dialogue trees, graceful error recovery loops, interruption handling (barge-in), and spoken language tone.",
        "workflowInstructions": "Write voice prompts that sound completely natural and avoid robotic repetition.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "vux-linguist",
        "roleTitle": "Computational Linguist",
        "name": "Language & Syntax Specialist",
        "level": 1,
        "parentId": "vux-lead",
        "responsibilities": "Curate phonetic lexicons, resolve multi-dialect speech variations, optimize slot-filling accuracy, and evaluate intent classification.",
        "workflowInstructions": "Train named entity recognition (NER) models for specialized industry vocabularies.",
        "delegationPolicy": "both",
        "color": "#a855f7"
      },
      {
        "id": "vux-speech-sci",
        "roleTitle": "Speech Scientist (ASR/TTS)",
        "name": "Audio & Neural Voice Specialist",
        "level": 1,
        "parentId": "vux-lead",
        "responsibilities": "Train neural text-to-speech (TTS) voice models with expressive prosody, tune automatic speech recognition (ASR) acoustic models.",
        "workflowInstructions": "Optimize streaming audio packetization to reduce latency over WebRTC and SIP telephone trunks.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "vux-dial-dev",
        "roleTitle": "Dialogue Systems Developer",
        "name": "Real-Time Conversation Engineer",
        "level": 2,
        "parentId": "vux-speech-sci",
        "responsibilities": "Implement stateful dialogue managers using finite state machines, LLM function calling, and fallback telephony routing.",
        "workflowInstructions": "Integrate Twilio Voice / Asterisk PBX backends and monitor call completion rates.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "vux-prompt-eng",
        "roleTitle": "Conversational Prompt Engineer",
        "name": "LLM Dialogue Flow Specialist",
        "level": 2,
        "parentId": "vux-designer",
        "responsibilities": "Craft context-aware system prompts that keep voice agents concise, conversational, and aligned with company guidelines.",
        "workflowInstructions": "Run automated eval suites on hundreds of recorded customer phone calls to score resolution rates.",
        "delegationPolicy": "up",
        "color": "#d946ef"
      }
    ]
  },
  {
    "id": "chain-growth-experimentation-team",
    "name": "Growth Experimentation & Funnel Optimization",
    "companyName": "Growth Experimentation & Funnel Optimization",
    "description": "High-tempo growth team running 10+ rapid A/B experiments weekly across landing pages, pricing grids, email nurture, and viral invitations.",
    "category": "Product & Design",
    "domain": "Growth Optimization",
    "color": "#f59e0b",
    "icon": "Zap",
    "nodes": [
      {
        "id": "grow-lead",
        "roleTitle": "VP of Growth",
        "name": "Head of Growth & User Acquisition",
        "level": 0,
        "parentId": null,
        "responsibilities": "Drive organic and paid user acquisition, blended customer acquisition cost (CAC), LTV/CAC ratios, and viral growth coefficients.",
        "workflowInstructions": "Direct Growth Product Manager, Growth Tech Lead, and Conversion Rate Optimization (CRO) Specialist.",
        "delegationPolicy": "auto",
        "color": "#b45309"
      },
      {
        "id": "grow-pm",
        "roleTitle": "Growth Product Manager",
        "name": "Experimentation & Funnels PM",
        "level": 1,
        "parentId": "grow-lead",
        "responsibilities": "Maintain the growth experimentation backlog, score hypotheses using ICE (Impact, Confidence, Ease), and monitor funnel metrics.",
        "workflowInstructions": "Partner with Growth Engineers and Designers to ship rapid feature flags and A/B variants.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "grow-tech-lead",
        "roleTitle": "Growth Engineering Tech Lead",
        "name": "Full-Stack Growth Lead",
        "level": 1,
        "parentId": "grow-lead",
        "responsibilities": "Lead rapid-deployment engineering team focused on landing page speed, telemetry instrumentation, and third-party tracking scripts.",
        "workflowInstructions": "Direct Fullstack Growth Developer to execute experiments with zero degradation to core app performance.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "grow-dev",
        "roleTitle": "Fullstack Growth Developer",
        "name": "Experiment Implementation Engineer",
        "level": 2,
        "parentId": "grow-tech-lead",
        "responsibilities": "Implement client-side experiment variations, personalize landing page headlines based on ad keywords, and build referral invite modals.",
        "workflowInstructions": "Ensure strict cookie consent compliance and clean event tracking in Segment/PostHog.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "grow-cro",
        "roleTitle": "Conversion Rate Optimization (CRO) Lead",
        "name": "Landing Page & UI Copy Specialist",
        "level": 1,
        "parentId": "grow-lead",
        "responsibilities": "Analyze heatmap recordings (Hotjar), user click maps, and form drop-off fields to redesign high-converting landing pages.",
        "workflowInstructions": "Craft persuasive headline copy, value proposition bullets, and customer testimonial carousels.",
        "delegationPolicy": "both",
        "color": "#ea580c"
      },
      {
        "id": "grow-scientist",
        "roleTitle": "Growth Data Scientist",
        "name": "Experimentation & Stats Specialist",
        "level": 1,
        "parentId": "grow-lead",
        "responsibilities": "Calculate statistical power, sample sizes, p-values, and guardrail metrics to declare statistically valid A/B test winners.",
        "workflowInstructions": "Prevent false positives from sample ratio mismatches (SRM) and deliver post-test insight reports.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-enterprise-ux-governance",
    "name": "Enterprise Design Operations & Governance",
    "companyName": "Enterprise Design Operations & Governance",
    "description": "Scalable design operations infrastructure overseeing tooling licenses, cross-department design consistency, usability labs, and accessibility compliance.",
    "category": "Product & Design",
    "domain": "Design Operations",
    "color": "#475569",
    "icon": "Briefcase",
    "nodes": [
      {
        "id": "desops-head",
        "roleTitle": "Chief Experience Officer (CXO)",
        "name": "Head of Enterprise Customer Experience",
        "level": 0,
        "parentId": null,
        "responsibilities": "Ensure design delivers measurable enterprise business value, customer retention, and brand differentiation.",
        "workflowInstructions": "Direct Design Operations (DesignOps) Manager and Principal Information Architect.",
        "delegationPolicy": "auto",
        "color": "#1e293b"
      },
      {
        "id": "desops-mgr",
        "roleTitle": "Design Operations Manager",
        "name": "DesignOps & Workflow Lead",
        "level": 1,
        "parentId": "desops-head",
        "responsibilities": "Manage design tooling budgets (Figma, Miro, UserTesting), streamline design-to-engineering handoffs, and manage designer onboarding.",
        "workflowInstructions": "Direct Usability Lab Coordinator and Design Systems Advocate.",
        "delegationPolicy": "auto",
        "color": "#475569"
      },
      {
        "id": "desops-arch",
        "roleTitle": "Principal Information Architect",
        "name": "Taxonomy & Navigation Architect",
        "level": 1,
        "parentId": "desops-head",
        "responsibilities": "Design scalable navigation structures for massive enterprise portals with thousands of settings, objects, and administrative dashboards.",
        "workflowInstructions": "Standardize search filtering semantics, breadcrumbs, and object relational models across squads.",
        "delegationPolicy": "both",
        "color": "#64748b"
      },
      {
        "id": "desops-lab",
        "roleTitle": "Usability Lab Coordinator",
        "name": "User Research Operations Lead",
        "level": 2,
        "parentId": "desops-mgr",
        "responsibilities": "Recruit verified enterprise user test participants, schedule remote user sessions, manage incentive payouts, and archive test video highlights.",
        "workflowInstructions": "Maintain participant pool diversity and handle user consent and NDA agreements.",
        "delegationPolicy": "up",
        "color": "#94a3b8"
      },
      {
        "id": "desops-a11y",
        "roleTitle": "Accessibility & Compliance Lead",
        "name": "Section 508 & WCAG Auditor",
        "level": 1,
        "parentId": "desops-head",
        "responsibilities": "Certify that all enterprise software interfaces comply with legal accessibility standards (ADA, Section 508, EN 301 549).",
        "workflowInstructions": "Provide Voluntary Product Accessibility Template (VPAT) documentation for government and enterprise RFP bids.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "desops-writer",
        "roleTitle": "UX Content Strategist",
        "name": "Product Microcopy & Tone Lead",
        "level": 2,
        "parentId": "desops-mgr",
        "responsibilities": "Write clear, jargon-free error messages, button labels, tooltip guides, and in-product empty state descriptions.",
        "workflowInstructions": "Maintain the company voice-and-tone guide and review strings before code freeze.",
        "delegationPolicy": "up",
        "color": "#d97706"
      },
      {
        "id": "desops-qa",
        "roleTitle": "Design Quality Assurance (QA) Specialist",
        "name": "Visual Fidelity Reviewer",
        "level": 2,
        "parentId": "desops-mgr",
        "responsibilities": "Inspect deployed staging builds against Figma source files to catch font mismatches, incorrect padding, and broken responsive breakpoints.",
        "workflowInstructions": "File visual polish tickets directly with frontend engineering squads before releases go live.",
        "delegationPolicy": "up",
        "color": "#ea580c"
      }
    ]
  },
  {
    "id": "chain-product-operations-org",
    "name": "Product Operations & Roadmap Governance",
    "companyName": "Product Operations & Roadmap Governance",
    "description": "Strategic operations arm supporting product teams with customer feedback aggregation, feature launch readiness, telemetry tooling, and process governance.",
    "category": "Product & Design",
    "domain": "Product Operations",
    "color": "#0891b2",
    "icon": "ClipboardCheck",
    "nodes": [
      {
        "id": "prodops-dir",
        "roleTitle": "Head of Product Operations",
        "name": "Director of Product Operations",
        "level": 0,
        "parentId": null,
        "responsibilities": "Streamline product decision-making, establish unified launch checklists, track company-wide OKRs, and bridge Product with Sales and Support.",
        "workflowInstructions": "Direct Launch Readiness Lead and Customer Feedback Systems Lead.",
        "delegationPolicy": "auto",
        "color": "#0e7490"
      },
      {
        "id": "prodops-launch",
        "roleTitle": "Launch Readiness Lead",
        "name": "Go-To-Market Product Coordinator",
        "level": 1,
        "parentId": "prodops-dir",
        "responsibilities": "Coordinate cross-functional feature launch checklists: ensure documentation is published, support teams are trained, and sales collateral is ready.",
        "workflowInstructions": "Manage internal alpha/beta testing programs and coordinate feature release timing with marketing.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "prodops-feedback",
        "roleTitle": "Customer Feedback Synthesizer",
        "name": "Voice of Customer Lead",
        "level": 1,
        "parentId": "prodops-dir",
        "responsibilities": "Aggregate product feedback from support tickets, sales loss reasons, social media mentions, and customer surveys into a single insights hub.",
        "workflowInstructions": "Categorize customer pain points by frequency and revenue impact to inform product prioritization.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "prodops-tooling",
        "roleTitle": "Product Tooling Administrator",
        "name": "Jira & Productboard Specialist",
        "level": 2,
        "parentId": "prodops-launch",
        "responsibilities": "Manage product management software stack, standardize roadmap templates, configure custom sprint fields, and automate status reports.",
        "workflowInstructions": "Train incoming Product Managers on standardized documentation and PRD templates.",
        "delegationPolicy": "up",
        "color": "#06b6d4"
      },
      {
        "id": "prodops-metrics",
        "roleTitle": "Product Metrics Specialist",
        "name": "Adoption & Engagement Analyst",
        "level": 2,
        "parentId": "prodops-feedback",
        "responsibilities": "Track feature adoption curves post-launch, monitor daily active feature usage, and flag low-adoption features for investigation.",
        "workflowInstructions": "Publish monthly feature success scorecards to executive stakeholders.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "prodops-comms",
        "roleTitle": "Release Communications Lead",
        "name": "Changelog & Release Notes Specialist",
        "level": 2,
        "parentId": "prodops-launch",
        "responsibilities": "Write customer-facing release notes, maintain public product changelogs, record feature walk-through demo videos, and notify customer teams.",
        "workflowInstructions": "Ensure customers and internal customer-facing teams clearly understand every software update.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-enterprise-sales-gtm",
    "name": "B2B Enterprise Software GTM & Sales",
    "companyName": "B2B Enterprise Software GTM & Sales",
    "description": "High-performing enterprise software revenue organization covering SDR prospecting, Enterprise Account Executives, Solutions Architects, and Deal Desk.",
    "category": "Sales & GTM",
    "domain": "Enterprise Sales",
    "color": "#d97706",
    "icon": "BadgeDollarSign",
    "nodes": [
      {
        "id": "esale-cro",
        "roleTitle": "Chief Revenue Officer (CRO)",
        "name": "Global Head of Revenue & Sales",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead global ARR growth targets, sales strategy, commission compensation plans, territory planning, and board revenue projections.",
        "workflowInstructions": "Direct VP Enterprise Sales, VP Solutions Engineering, and Head of Revenue Operations.",
        "delegationPolicy": "auto",
        "color": "#78350f"
      },
      {
        "id": "esale-vp-sales",
        "roleTitle": "VP of Enterprise Sales",
        "name": "Field Sales Leadership Head",
        "level": 1,
        "parentId": "esale-cro",
        "responsibilities": "Lead regional sales directors, review quarterly pipeline forecasts, coach strategic deal pursuits, and close seven-figure enterprise contracts.",
        "workflowInstructions": "Supervise Enterprise Account Executives and SDR Manager.",
        "delegationPolicy": "auto",
        "color": "#b45309"
      },
      {
        "id": "esale-sdr-mgr",
        "roleTitle": "Sales Development Manager",
        "name": "Inbound & Outbound SDR Lead",
        "level": 2,
        "parentId": "esale-vp-sales",
        "responsibilities": "Manage pipeline generation targets, cold outreach cadences, call coaching, lead routing, and outbound prospecting campaigns.",
        "workflowInstructions": "Supervise Inbound SDR and Outbound SDR.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "esale-in-sdr",
        "roleTitle": "Inbound SDR",
        "name": "Marketing Lead Qualification Specialist",
        "level": 3,
        "parentId": "esale-sdr-mgr",
        "responsibilities": "Rapidly qualify incoming marketing demo requests, assess company size and budget authority, and book discovery calls for Account Executives.",
        "workflowInstructions": "Maintain sub-5-minute lead response times and record qualification notes in Salesforce.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "esale-out-sdr",
        "roleTitle": "Outbound SDR",
        "name": "Account-Based Prospecting Specialist",
        "level": 3,
        "parentId": "esale-sdr-mgr",
        "responsibilities": "Execute hyper-personalized multi-touch email, phone, and LinkedIn outreach into targeted Fortune 500 decision-makers.",
        "workflowInstructions": "Identify key executive pain points and secure introductory discovery meetings.",
        "delegationPolicy": "up",
        "color": "#fbbf24"
      },
      {
        "id": "esale-strat-ae",
        "roleTitle": "Strategic Enterprise AE",
        "name": "Major Accounts Executive",
        "level": 2,
        "parentId": "esale-vp-sales",
        "responsibilities": "Manage complex 6-to-12 month sales cycles, navigate multi-stakeholder enterprise politics, negotiate legal MSAs, and close $250k+ ARR deals.",
        "workflowInstructions": "Partner with Solutions Architect to deliver tailored technical demonstrations and business value assessments.",
        "delegationPolicy": "both",
        "color": "#ea580c"
      },
      {
        "id": "esale-mm-ae",
        "roleTitle": "Mid-Market Account Executive",
        "name": "Commercial Accounts Executive",
        "level": 2,
        "parentId": "esale-vp-sales",
        "responsibilities": "Drive high-velocity deal closures for mid-sized corporate accounts, conduct compelling product demonstrations, and manage pipeline velocity.",
        "workflowInstructions": "Qualify budget, negotiate contracts, and meet quarterly sales quotas.",
        "delegationPolicy": "both",
        "color": "#f97316"
      },
      {
        "id": "esale-vp-se",
        "roleTitle": "VP of Solutions Engineering",
        "name": "Pre-Sales Technical Leadership",
        "level": 1,
        "parentId": "esale-cro",
        "responsibilities": "Lead worldwide pre-sales technical architecture, proof-of-concept (POC) win rates, and technical validation across enterprise pursuits.",
        "workflowInstructions": "Supervise Principal Solutions Architect and Enterprise Sales Engineers.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "esale-sa",
        "roleTitle": "Principal Solutions Architect",
        "name": "Enterprise Solution Architect",
        "level": 2,
        "parentId": "esale-vp-se",
        "responsibilities": "Design custom enterprise deployment architectures, lead deep-dive security and compliance discussions with client CISOs, and architect integrations.",
        "workflowInstructions": "Unblock complex technical objections and establish technical win criteria.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "esale-se",
        "roleTitle": "Enterprise Sales Engineer",
        "name": "Pre-Sales Technical Specialist",
        "level": 2,
        "parentId": "esale-vp-se",
        "responsibilities": "Configure customized live demo environments, answer technical RFP questionnaires, build API prototypes, and run customer technical trials.",
        "workflowInstructions": "Ensure prospective technical evaluators achieve successful proof-of-value validation.",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "esale-revops",
        "roleTitle": "Head of Revenue Operations",
        "name": "RevOps & Sales Strategy Director",
        "level": 1,
        "parentId": "esale-cro",
        "responsibilities": "Own sales tech stack (Salesforce, Gong, Clari), manage CRM data integrity, define territory assignments, and track sales efficiency metrics.",
        "workflowInstructions": "Direct Deal Desk Specialist on custom pricing and contractual approvals.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "esale-dealdesk",
        "roleTitle": "Deal Desk & Contracts Specialist",
        "name": "Enterprise Commercial Terms Analyst",
        "level": 2,
        "parentId": "esale-revops",
        "responsibilities": "Structure non-standard commercial pricing terms, multi-year payment schedules, software licensing discounts, and contract amendments.",
        "workflowInstructions": "Ensure compliance with revenue recognition rules and facilitate legal/finance approvals.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "esale-enablement",
        "roleTitle": "Sales Enablement Lead",
        "name": "Sales Methodology & Training Coach",
        "level": 2,
        "parentId": "esale-vp-sales",
        "responsibilities": "Train sales team on competitive battlecards, product updates, objection handling, and enterprise sales methodologies (MEDDPICC).",
        "workflowInstructions": "Certify new sales hires through rigorous mock customer pitch simulations.",
        "delegationPolicy": "up",
        "color": "#6366f1"
      },
      {
        "id": "esale-csm-liaison",
        "roleTitle": "Enterprise CSM Expansion Lead",
        "name": "Customer Growth & Renewals Lead",
        "level": 1,
        "parentId": "esale-cro",
        "responsibilities": "Partner with Account Executives to identify account expansion opportunities, manage enterprise contract renewals, and prevent revenue churn.",
        "workflowInstructions": "Track post-sale customer value realization and co-sell add-on products.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-developer-led-sales",
    "name": "Developer-Led & Open-Core GTM",
    "companyName": "Developer-Led & Open-Core GTM",
    "description": "Bottom-up developer sales model converting free open-source or self-serve developers into enterprise-wide procurement contracts.",
    "category": "Sales & GTM",
    "domain": "Developer Sales",
    "color": "#6366f1",
    "icon": "Code2",
    "nodes": [
      {
        "id": "dls-head",
        "roleTitle": "Head of Commercial Sales",
        "name": "Developer-Led GTM Director",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead bottom-up to top-down sales conversion strategy, developer product telemetry qualified leads (PQL), and enterprise ARR.",
        "workflowInstructions": "Direct Technical Sales Director and Developer Advocate Lead.",
        "delegationPolicy": "auto",
        "color": "#4338ca"
      },
      {
        "id": "dls-dir",
        "roleTitle": "Technical Sales Director",
        "name": "Enterprise Commercial Accounts Lead",
        "level": 1,
        "parentId": "dls-head",
        "responsibilities": "Identify corporate accounts where multiple engineering squads are actively using the free tool, and approach engineering VPs for enterprise licensing.",
        "workflowInstructions": "Direct Technical Account Executives and Sales Engineers.",
        "delegationPolicy": "auto",
        "color": "#6366f1"
      },
      {
        "id": "dls-tae",
        "roleTitle": "Technical Account Executive",
        "name": "Developer Product Account Exec",
        "level": 2,
        "parentId": "dls-dir",
        "responsibilities": "Engage engineering managers and CTOs at organizations with high organic developer usage, pitching centralized security, audit logs, and SSO.",
        "workflowInstructions": "Close enterprise organization-wide consolidation contracts.",
        "delegationPolicy": "both",
        "color": "#818cf8"
      },
      {
        "id": "dls-se",
        "roleTitle": "Technical Sales Engineer",
        "name": "Developer Solutions Architect",
        "level": 2,
        "parentId": "dls-dir",
        "responsibilities": "Lead technical proof-of-concepts, explain enterprise self-hosted cluster deployment options, and answer compliance questions.",
        "workflowInstructions": "Help client DevOps teams evaluate enterprise features in their own VPC/cloud environments.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "dls-devrel",
        "roleTitle": "Developer Advocate Lead",
        "name": "Community & Developer GTM Specialist",
        "level": 1,
        "parentId": "dls-head",
        "responsibilities": "Engage with community developers, identify internal champions inside target corporate accounts, and create technical migration blueprints.",
        "workflowInstructions": "Provide feedback to product on developer pain points that block enterprise expansion.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "dls-pql-analyst",
        "roleTitle": "Product-Qualified Lead (PQL) Analyst",
        "name": "Usage Telemetry & Lead Scoring",
        "level": 2,
        "parentId": "dls-dir",
        "responsibilities": "Analyze product usage signals (e.g. corporate domain signups, high API consumption, team invite spikes) to generate high-intent sales alerts.",
        "workflowInstructions": "Feed prioritized PQL targets into CRM for immediate sales outreach.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "dls-support-liaison",
        "roleTitle": "Developer Support Sales Liaison",
        "name": "Technical Account Onboarding",
        "level": 2,
        "parentId": "dls-dir",
        "responsibilities": "Ensure newly converted enterprise engineering teams receive priority technical onboarding and dedicated Slack support channels.",
        "workflowInstructions": "Prevent early developer churn by swiftly unblocking configuration questions.",
        "delegationPolicy": "up",
        "color": "#06b6d4"
      },
      {
        "id": "dls-legal-spec",
        "roleTitle": "Open Source & IP Licensing Specialist",
        "name": "Commercial Licensing Attorney",
        "level": 1,
        "parentId": "dls-head",
        "responsibilities": "Navigate enterprise legal reviews around open-source licenses (Apache 2.0 / BSL), indemnification clauses, and custom source-available terms.",
        "workflowInstructions": "Provide legal clearance to expedite procurement approvals.",
        "delegationPolicy": "up",
        "color": "#475569"
      }
    ]
  },
  {
    "id": "chain-high-velocity-inside-sales",
    "name": "High-Velocity Inside Sales SaaS",
    "companyName": "High-Velocity Inside Sales SaaS",
    "description": "Fast-paced transactional sales engine closing hundreds of high-margin subscriptions each month with rapid inbound qualification and live product demos.",
    "category": "Sales & GTM",
    "domain": "Inside Sales",
    "color": "#f59e0b",
    "icon": "PhoneCall",
    "nodes": [
      {
        "id": "isale-vp",
        "roleTitle": "VP of Inside Sales",
        "name": "Head of Inside Sales Operations",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead monthly sales revenue targets, sales rep productivity metrics, pipeline conversion ratios, and short sales cycle execution (< 30 days).",
        "workflowInstructions": "Direct Sales Floor Managers and Sales Enablement Coach.",
        "delegationPolicy": "auto",
        "color": "#b45309"
      },
      {
        "id": "isale-mgr",
        "roleTitle": "Sales Floor Manager",
        "name": "Inside Sales Team Supervisor",
        "level": 1,
        "parentId": "isale-vp",
        "responsibilities": "Conduct daily sales standups, monitor outbound call volumes, listen to recorded sales calls in Gong, and assist reps with closing deals.",
        "workflowInstructions": "Supervise Senior Account Executives and Product Demo Specialists.",
        "delegationPolicy": "auto",
        "color": "#d97706"
      },
      {
        "id": "isale-ae",
        "roleTitle": "Senior Account Executive",
        "name": "High-Velocity SaaS Closer",
        "level": 2,
        "parentId": "isale-mgr",
        "responsibilities": "Conduct high-energy 30-minute discovery and demo calls, demonstrate immediate software ROI, present pricing packages, and close subscriptions.",
        "workflowInstructions": "Maintain a rolling pipeline of 50+ active deals and achieve monthly sales quotas.",
        "delegationPolicy": "both",
        "color": "#f59e0b"
      },
      {
        "id": "isale-sdr",
        "roleTitle": "Inbound Sales Qualifier",
        "name": "Lead Qualification Specialist",
        "level": 2,
        "parentId": "isale-mgr",
        "responsibilities": "Call new website signups within 60 seconds, assess purchasing readiness, and book qualified prospects on AE calendars immediately.",
        "workflowInstructions": "Maximize lead-to-opportunity conversion rates.",
        "delegationPolicy": "up",
        "color": "#fbbf24"
      },
      {
        "id": "isale-demo",
        "roleTitle": "Product Demo Specialist",
        "name": "Interactive Showcase Specialist",
        "level": 2,
        "parentId": "isale-mgr",
        "responsibilities": "Host live daily group webinars and interactive Q&A product walkthroughs for hundreds of prospective trial users.",
        "workflowInstructions": "Answer prospect feature questions and route hot leads to Account Executives.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "isale-coach",
        "roleTitle": "Sales Enablement Coach",
        "name": "Pitch & Objection Handling Trainer",
        "level": 1,
        "parentId": "isale-vp",
        "responsibilities": "Analyze call recordings, coach reps on objection handling scripts, refine pricing negotiation techniques, and onboard new sales reps.",
        "workflowInstructions": "Improve overall sales floor win rates and shorten average ramp time for new hires.",
        "delegationPolicy": "up",
        "color": "#6366f1"
      },
      {
        "id": "isale-ops",
        "roleTitle": "Sales Operations Specialist",
        "name": "CRM & Pipeline Automation Lead",
        "level": 1,
        "parentId": "isale-vp",
        "responsibilities": "Automate CRM lead distribution rules, manage electronic signature workflows, and produce daily executive revenue dashboards.",
        "workflowInstructions": "Eliminate administrative friction so sales reps spend maximum time talking to prospects.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-channel-partners-tech",
    "name": "Global Channel Alliances & Partner Network",
    "companyName": "Global Channel Alliances & Partner Network",
    "description": "Indirect sales organization driving software revenue through system integrators, value-added resellers (VARs), and cloud marketplace co-selling.",
    "category": "Sales & GTM",
    "domain": "Channel Partnerships",
    "color": "#059669",
    "icon": "Handshake",
    "nodes": [
      {
        "id": "chan-vp",
        "roleTitle": "VP of Global Alliances",
        "name": "Head of Channel & Partner Sales",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead indirect partner revenue growth, global system integrator (GSI) master alliance agreements, and cloud marketplace co-sell partnerships.",
        "workflowInstructions": "Direct Channel Partner Director and Partner Solutions Architecture Lead.",
        "delegationPolicy": "auto",
        "color": "#064e3b"
      },
      {
        "id": "chan-dir",
        "roleTitle": "Channel Partner Director",
        "name": "Reseller & Alliance Network Lead",
        "level": 1,
        "parentId": "chan-vp",
        "responsibilities": "Recruit premier value-added resellers (VARs) and regional MSPs, negotiate partner tier margins, and manage co-marketing funds.",
        "workflowInstructions": "Supervise Channel Sales Managers across geographic territories.",
        "delegationPolicy": "auto",
        "color": "#059669"
      },
      {
        "id": "chan-csm",
        "roleTitle": "Channel Sales Manager",
        "name": "Regional Partner Manager",
        "level": 2,
        "parentId": "chan-dir",
        "responsibilities": "Support partner sales teams, participate in joint client pitches, track deal registrations to prevent channel conflict, and drive quotas.",
        "workflowInstructions": "Conduct partner business reviews and maintain active partner pipeline.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "chan-psa-lead",
        "roleTitle": "Partner Solutions Architecture Lead",
        "name": "Principal Alliance Architect",
        "level": 1,
        "parentId": "chan-vp",
        "responsibilities": "Design partner certification curricula, validate partner integration architectures, and lead technical partner advisory councils.",
        "workflowInstructions": "Supervise Partner Solutions Architects.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "chan-psa",
        "roleTitle": "Partner Solutions Architect",
        "name": "Pre-Sales Partner Technical Advisor",
        "level": 2,
        "parentId": "chan-psa-lead",
        "responsibilities": "Train partner sales engineers, assist partners on complex enterprise client RFP proposals, and troubleshoot proof-of-concept integrations.",
        "workflowInstructions": "Ensure partner technical staff are certified to deploy and configure the software.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "chan-mkt-mgr",
        "roleTitle": "Partner Marketing Manager",
        "name": "Co-Marketing & Events Lead",
        "level": 1,
        "parentId": "chan-vp",
        "responsibilities": "Create co-branded marketing collateral, partner battlecards, organize partner summit conferences, and run joint lead-generation webinars.",
        "workflowInstructions": "Manage market development funds (MDF) allocations and measure partner campaign ROI.",
        "delegationPolicy": "up",
        "color": "#d97706"
      },
      {
        "id": "chan-ops",
        "roleTitle": "Partner Operations Specialist",
        "name": "Deal Registration & Portal Lead",
        "level": 2,
        "parentId": "chan-dir",
        "responsibilities": "Manage the partner portal (PRM), process deal registrations, calculate monthly partner commission payouts, and audit partner compliance.",
        "workflowInstructions": "Resolve deal registration conflicts and maintain transparent partner records.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-revenue-operations-revops",
    "name": "Revenue Operations (RevOps) & CRM Architecture",
    "companyName": "Revenue Operations (RevOps) & CRM Architecture",
    "description": "Cross-functional operational backbone aligning Sales, Marketing, and Customer Success data, tooling, pipeline analytics, and compensation.",
    "category": "Sales & GTM",
    "domain": "Revenue Operations",
    "color": "#0891b2",
    "icon": "LineChart",
    "nodes": [
      {
        "id": "rev-dir",
        "roleTitle": "Head of Revenue Operations",
        "name": "Director of RevOps & GTM Strategy",
        "level": 0,
        "parentId": null,
        "responsibilities": "Unify go-to-market data, eliminate organizational silos between Sales/Marketing/CS, optimize revenue engine efficiency, and forecast revenue.",
        "workflowInstructions": "Direct CRM Systems Architect, Sales Compensation Lead, and Lead GTM Data Analyst.",
        "delegationPolicy": "auto",
        "color": "#0e7490"
      },
      {
        "id": "rev-crm-arch",
        "roleTitle": "CRM Systems Architect",
        "name": "Principal Salesforce / HubSpot Architect",
        "level": 1,
        "parentId": "rev-dir",
        "responsibilities": "Design custom CRM data models, automate lead routing rules, integrate billing webhooks, and maintain CPQ (Configure, Price, Quote) engines.",
        "workflowInstructions": "Supervise CRM Administrator on daily database hygiene and user permissions.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "rev-crm-admin",
        "roleTitle": "CRM Administrator",
        "name": "Salesforce & Sales Stack Specialist",
        "level": 2,
        "parentId": "rev-crm-arch",
        "responsibilities": "Build custom workflows, dashboards, and automated email alerts; manage user licensing; and troubleshoot sales team CRM blockers.",
        "workflowInstructions": "Maintain high data hygiene, eliminate duplicate accounts, and enforce required deal fields.",
        "delegationPolicy": "up",
        "color": "#06b6d4"
      },
      {
        "id": "rev-analyst",
        "roleTitle": "Lead GTM Data Analyst",
        "name": "Pipeline Analytics & Forecasting Lead",
        "level": 1,
        "parentId": "rev-dir",
        "responsibilities": "Build predictive pipeline forecasting models, analyze customer acquisition unit economics, and measure sales rep quota attainment.",
        "workflowInstructions": "Deliver weekly executive forecasting reports to the CEO and CRO.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "rev-comp",
        "roleTitle": "Sales Compensation & Commissions Lead",
        "name": "Incentive Plans & Commissions Analyst",
        "level": 1,
        "parentId": "rev-dir",
        "responsibilities": "Design sales commission compensation plans, model commission accelerators, audit monthly sales payouts, and resolve commission disputes.",
        "workflowInstructions": "Ensure sales compensation aligns with company cash collections and ARR milestones.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "rev-billing",
        "roleTitle": "Billing & Revenue Recognition Specialist",
        "name": "Finance & ASC 606 RevOps Specialist",
        "level": 2,
        "parentId": "rev-comp",
        "responsibilities": "Reconcile closed-won CRM contracts with billing invoices (Stripe/NetSuite), audit multi-year software payment schedules, and handle sales tax.",
        "workflowInstructions": "Ensure complete audit compliance for revenue recognition under ASC 606 standards.",
        "delegationPolicy": "up",
        "color": "#34d399"
      }
    ]
  },
  {
    "id": "chain-customer-marketing-expansion",
    "name": "Customer Marketing & Net Retention Expansion",
    "companyName": "Customer Marketing & Net Retention Expansion",
    "description": "Marketing and account management squad focused on expanding annual recurring revenue within existing accounts via customer advocacy and upsells.",
    "category": "Sales & GTM",
    "domain": "Account Expansion",
    "color": "#10b981",
    "icon": "Repeat",
    "nodes": [
      {
        "id": "cmkt-head",
        "roleTitle": "VP of Customer Marketing",
        "name": "Head of Account Expansion & Advocacy",
        "level": 0,
        "parentId": null,
        "responsibilities": "Drive Net Revenue Retention (NRR > 130%), customer advocacy, customer conference attendance, and client advisory board engagement.",
        "workflowInstructions": "Direct Account Expansion Manager and Customer Advocacy Lead.",
        "delegationPolicy": "auto",
        "color": "#047857"
      },
      {
        "id": "cmkt-exp-mgr",
        "roleTitle": "Account Expansion Manager",
        "name": "Existing Accounts Sales Specialist",
        "level": 1,
        "parentId": "cmkt-head",
        "responsibilities": "Identify expansion triggers (approaching seat limits, high API usage), propose premium feature add-on packages, and negotiate upsells.",
        "workflowInstructions": "Partner with Customer Success Managers to generate new pipeline from satisfied customer departments.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "cmkt-advocacy",
        "roleTitle": "Customer Advocacy Lead",
        "name": "Case Studies & References Specialist",
        "level": 1,
        "parentId": "cmkt-head",
        "responsibilities": "Interview enthusiastic customer leaders to produce video case studies, ROI whitepapers, customer quotes, and peer review site reviews (G2/Gartner).",
        "workflowInstructions": "Coordinate customer speakers for industry conferences and build reference pools for active sales deals.",
        "delegationPolicy": "both",
        "color": "#34d399"
      },
      {
        "id": "cmkt-cab-lead",
        "roleTitle": "Customer Advisory Board Lead",
        "name": "Executive Community & Events Specialist",
        "level": 1,
        "parentId": "cmkt-head",
        "responsibilities": "Organize bi-annual Customer Advisory Board (CAB) summits with senior client executives to review product direction and gather feedback.",
        "workflowInstructions": "Deepen strategic executive sponsor relationships to insulate key accounts against competitors.",
        "delegationPolicy": "up",
        "color": "#059669"
      },
      {
        "id": "cmkt-nurture",
        "roleTitle": "Customer Lifecycle Marketer",
        "name": "In-App Product Marketing Specialist",
        "level": 2,
        "parentId": "cmkt-advocacy",
        "responsibilities": "Create in-product feature announcements, monthly customer product newsletters, and educational webinars teaching advanced workflows.",
        "workflowInstructions": "Drive customer engagement with newly released premium features to stimulate expansion demand.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-technical-pre-sales-consulting",
    "name": "Pre-Sales Solutions Architecture & POC Consulting",
    "companyName": "Pre-Sales Solutions Architecture & POC Consulting",
    "description": "Specialized consultative technical sales team delivering enterprise proofs-of-concept, cloud architecture validation, and custom prototype builds.",
    "category": "Sales & GTM",
    "domain": "Solutions Architecture",
    "color": "#0284c7",
    "icon": "Layers",
    "nodes": [
      {
        "id": "presale-dir",
        "roleTitle": "Director of Pre-Sales Architecture",
        "name": "Global Pre-Sales Engineering Head",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead pre-sales technical win rates (> 80%), proof-of-concept (POC) completion speed, and technical relationship governance with enterprise clients.",
        "workflowInstructions": "Direct Lead Solutions Consultants and POC Prototype Developers.",
        "delegationPolicy": "auto",
        "color": "#0369a1"
      },
      {
        "id": "presale-lead-sc",
        "roleTitle": "Lead Solutions Consultant",
        "name": "Enterprise Technical Deal Strategist",
        "level": 1,
        "parentId": "presale-dir",
        "responsibilities": "Lead architectural discovery workshops with client IT executives, establish explicit criteria for technical victory, and architect solutions.",
        "workflowInstructions": "Supervise Enterprise Solutions Engineers across high-value prospective deals.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "presale-se",
        "roleTitle": "Senior Solutions Engineer",
        "name": "Pre-Sales Technical Specialist",
        "level": 2,
        "parentId": "presale-lead-sc",
        "responsibilities": "Deliver deep technical demonstrations, configure customized sandboxes with prospective client branding and dummy data, and answer technical RFPs.",
        "workflowInstructions": "Guide client evaluation teams through hands-on technical trials and answer architecture questions.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "presale-poc-dev",
        "roleTitle": "Enterprise POC Prototype Developer",
        "name": "Rapid Solutions Integration Engineer",
        "level": 1,
        "parentId": "presale-dir",
        "responsibilities": "Write custom integration scripts, connectors, and frontend sample dashboards demonstrating how the product connects with the client's internal APIs.",
        "workflowInstructions": "Build working technical demonstrations within 5 business days to amaze prospective customer leadership.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "presale-rfp",
        "roleTitle": "RFP & Technical Proposal Specialist",
        "name": "Bid Management & Compliance Specialist",
        "level": 1,
        "parentId": "presale-dir",
        "responsibilities": "Maintain a comprehensive library of verified technical answers, security documentation, SOC2 reports, and architectural blueprints for formal RFPs.",
        "workflowInstructions": "Assemble detailed 100+ page formal enterprise bid responses with rapid turnaround.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "presale-cloud-arch",
        "roleTitle": "Cloud Architecture Pre-Sales Specialist",
        "name": "AWS/Azure/GCP Deployment Specialist",
        "level": 2,
        "parentId": "presale-lead-sc",
        "responsibilities": "Validate client cloud security policies, private link configurations, container orchestration boundaries, and customer-managed encryption keys (CMEK).",
        "workflowInstructions": "Provide certified reference architecture diagrams for client information security approvals.",
        "delegationPolicy": "up",
        "color": "#3b82f6"
      },
      {
        "id": "presale-handoff",
        "roleTitle": "Post-Sale Technical Handoff Specialist",
        "name": "Implementation Transition Coordinator",
        "level": 2,
        "parentId": "presale-lead-sc",
        "responsibilities": "Document all customer technical configurations, custom code snippets, and customer expectations established during pre-sales.",
        "workflowInstructions": "Conduct seamless handover meetings with the Professional Services implementation team.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-b2b-field-sales-engineering",
    "name": "B2B Field Sales & Systems Engineering",
    "companyName": "B2B Field Sales & Systems Engineering",
    "description": "Territory-based field sales teams traveling to client headquarters for on-site executive presentations, architectural whiteboarding, and pilot trials.",
    "category": "Sales & GTM",
    "domain": "Field Sales",
    "color": "#2563eb",
    "icon": "Briefcase",
    "nodes": [
      {
        "id": "field-vp",
        "roleTitle": "VP of Field Sales",
        "name": "Head of Global Field Operations",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead strategic field sales revenue across global territories, enterprise customer summit relationships, and large-scale deal negotiations.",
        "workflowInstructions": "Direct Regional Field Sales Directors and Field Systems Engineering Leads.",
        "delegationPolicy": "auto",
        "color": "#1e40af"
      },
      {
        "id": "field-dir",
        "roleTitle": "Regional Field Sales Director",
        "name": "Territory Sales Leadership Head",
        "level": 1,
        "parentId": "field-vp",
        "responsibilities": "Manage senior field account executives across major metropolitan territories, coach executive relationship mapping, and close deals.",
        "workflowInstructions": "Supervise Field Account Executives.",
        "delegationPolicy": "auto",
        "color": "#2563eb"
      },
      {
        "id": "field-ae",
        "roleTitle": "Senior Field Account Executive",
        "name": "Regional Enterprise Account Lead",
        "level": 2,
        "parentId": "field-dir",
        "responsibilities": "Conduct on-site customer discovery meetings, build relationships with C-level client executives, and manage enterprise contract negotiations.",
        "workflowInstructions": "Partner with Field Systems Engineer on customized executive presentations and boardroom whiteboarding sessions.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "field-se-lead",
        "roleTitle": "Field Systems Engineering Lead",
        "name": "Director of Field Technical Specialists",
        "level": 1,
        "parentId": "field-vp",
        "responsibilities": "Lead territory field systems engineers, ensure demonstration environment reliability, and maintain deep technical pre-sales readiness.",
        "workflowInstructions": "Supervise Field Systems Engineers on client on-site visits.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "field-se",
        "roleTitle": "Senior Field Systems Engineer",
        "name": "On-Site Technical Solutions Architect",
        "level": 2,
        "parentId": "field-se-lead",
        "responsibilities": "Accompany Field AEs to on-site client headquarters, lead whiteboarding architecture sessions, deploy on-prem pilots, and answer security questions.",
        "workflowInstructions": "Build rapport with client technical evaluation leads and eliminate technical blockers.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "field-pilot",
        "roleTitle": "Field Pilot & Trial Specialist",
        "name": "Hands-On Customer Trial Engineer",
        "level": 2,
        "parentId": "field-se-lead",
        "responsibilities": "Install on-site software test clusters, assist client engineers with initial API integrations, and guide client teams through pilot success criteria.",
        "workflowInstructions": "Ensure the client achieves documented proof-of-concept success within 30 days.",
        "delegationPolicy": "up",
        "color": "#0891b2"
      },
      {
        "id": "field-exec-sponsor",
        "roleTitle": "Executive Briefing Center Coordinator",
        "name": "Executive Customer Experience Lead",
        "level": 1,
        "parentId": "field-vp",
        "responsibilities": "Organize high-impact Executive Briefing Center (EBC) days at company headquarters for visiting prospective C-suite delegations.",
        "workflowInstructions": "Coordinate executive keynotes, product roadmap previews, and gourmet dining experiences for marquee prospects.",
        "delegationPolicy": "up",
        "color": "#d97706"
      }
    ]
  },
  {
    "id": "chain-cloud-infrastructure-core",
    "name": "Cloud Infrastructure & Multi-Cloud Ops",
    "companyName": "Cloud Infrastructure & Multi-Cloud Ops",
    "description": "Enterprise cloud infrastructure division operating global AWS/GCP/Azure footprints, Kubernetes clusters, and infrastructure-as-code automation.",
    "category": "Cloud & DevOps",
    "domain": "Cloud Infrastructure",
    "color": "#0284c7",
    "icon": "Cloud",
    "nodes": [
      {
        "id": "cinfra-vp",
        "roleTitle": "VP of Cloud Infrastructure",
        "name": "Global Infrastructure Engineering Head",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead multi-million dollar cloud infrastructure strategy, multi-cloud resilience (AWS/GCP), 99.99% availability SLAs, and cloud security posture.",
        "workflowInstructions": "Direct Cloud Architecture Lead, Kubernetes Operations Lead, and DevOps Automation Lead.",
        "delegationPolicy": "auto",
        "color": "#0369a1"
      },
      {
        "id": "cinfra-arch",
        "roleTitle": "Principal Cloud Architect",
        "name": "Enterprise Cloud Systems Architect",
        "level": 1,
        "parentId": "cinfra-vp",
        "responsibilities": "Design multi-region cloud VPC topology, Transit Gateways, DirectConnect links, cloud IAM permission boundaries, and zero-trust perimeter.",
        "workflowInstructions": "Review cloud architectural RFCs and ensure compliance with security and cost benchmarks.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "cinfra-k8s-lead",
        "roleTitle": "Kubernetes Operations Lead",
        "name": "Container Platform & Orchestration Lead",
        "level": 1,
        "parentId": "cinfra-vp",
        "responsibilities": "Manage enterprise production EKS/GKE Kubernetes clusters, Service Mesh (Istio), cluster auto-scalers, and GitOps deployments (ArgoCD).",
        "workflowInstructions": "Supervise Kubernetes Platform Engineer on cluster upgrades and node pool reliability.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "cinfra-k8s-eng",
        "roleTitle": "Kubernetes Platform Engineer",
        "name": "Container Infrastructure Specialist",
        "level": 2,
        "parentId": "cinfra-k8s-lead",
        "responsibilities": "Maintain Helm charts, configure Kubernetes network policies, manage ingress controllers (Envoy), and optimize container resource requests.",
        "workflowInstructions": "Troubleshoot node resource starvation, pod eviction events, and container security profiles.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "cinfra-devops-lead",
        "roleTitle": "DevOps Automation Lead",
        "name": "CI/CD & Delivery Engineering Lead",
        "level": 1,
        "parentId": "cinfra-vp",
        "responsibilities": "Standardize enterprise Terraform infrastructure-as-code repositories, automated testing pipelines, and developer deployment environments.",
        "workflowInstructions": "Supervise CI/CD Pipeline Engineer and Terraform Infrastructure Engineer.",
        "delegationPolicy": "auto",
        "color": "#2563eb"
      },
      {
        "id": "cinfra-tf-eng",
        "roleTitle": "Terraform & IaC Engineer",
        "name": "Infrastructure-as-Code Specialist",
        "level": 2,
        "parentId": "cinfra-devops-lead",
        "responsibilities": "Write reusable modular Terraform / OpenTofu modules, manage state locking with Atlantis, and audit drift against cloud resources.",
        "workflowInstructions": "Automate cloud resource provisioning and enforce tagging policies for cost allocation.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "cinfra-cicd-eng",
        "roleTitle": "CI/CD Pipeline Engineer",
        "name": "Build & Release Automation Specialist",
        "level": 2,
        "parentId": "cinfra-devops-lead",
        "responsibilities": "Maintain GitHub Actions / GitLab CI runner pools, optimize Docker layer caching to reduce build times, and automate security scans.",
        "workflowInstructions": "Ensure developer PR build pipelines complete within sub-5-minute SLA.",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "cinfra-sre-lead",
        "roleTitle": "Principal SRE & Observability Lead",
        "name": "Site Reliability Leadership Head",
        "level": 1,
        "parentId": "cinfra-vp",
        "responsibilities": "Manage global production monitoring in Datadog/Prometheus, configure SLO alerting thresholds, and lead incident response reviews.",
        "workflowInstructions": "Supervise Cloud SRE on-call engineers.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "cinfra-sre-eng",
        "roleTitle": "Cloud SRE Engineer",
        "name": "On-Call Reliability & Telemetry Specialist",
        "level": 2,
        "parentId": "cinfra-sre-lead",
        "responsibilities": "Respond to production infrastructure alerts, investigate latency spikes, write automated self-healing scripts, and lead incident bridges.",
        "workflowInstructions": "Maintain runbooks and ensure zero single points of failure across infrastructure components.",
        "delegationPolicy": "both",
        "color": "#34d399"
      },
      {
        "id": "cinfra-sec-lead",
        "roleTitle": "Cloud Security Engineer",
        "name": "Cloud IAM & Posture Specialist",
        "level": 2,
        "parentId": "cinfra-arch",
        "responsibilities": "Audit cloud security groups, configure KMS encryption key rotations, run automated vulnerability scans (Wiz/Prisma), and remediate findings.",
        "workflowInstructions": "Enforce least-privilege cloud IAM policies and conduct perimeter penetration tests.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      },
      {
        "id": "cinfra-finops",
        "roleTitle": "Cloud FinOps Specialist",
        "name": "Cloud Cost Optimization Lead",
        "level": 2,
        "parentId": "cinfra-arch",
        "responsibilities": "Analyze AWS/GCP cost and usage reports (CUR), purchase Reserved Instances and Savings Plans, and identify idle zombie resources.",
        "workflowInstructions": "Deliver quarterly cloud spend optimization savings reports to executive management.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "cinfra-dr-spec",
        "roleTitle": "Disaster Recovery Specialist",
        "name": "Backup & Business Continuity Lead",
        "level": 2,
        "parentId": "cinfra-sre-lead",
        "responsibilities": "Conduct unannounced automated disaster recovery failover exercises between cloud regions, verify database snapshot integrity, and track RTO/RPO.",
        "workflowInstructions": "Certify that customer recovery point objective (RPO < 1 minute) is consistently met under simulated region failure.",
        "delegationPolicy": "up",
        "color": "#7c3aed"
      }
    ]
  },
  {
    "id": "chain-platform-engineering-idp",
    "name": "Platform Engineering & Internal Developer Platform",
    "companyName": "Platform Engineering & Internal Developer Platform",
    "description": "Modern engineering enablement team creating golden path developer portals (Backstage), self-service environment provisioning, and preview URLs.",
    "category": "Cloud & DevOps",
    "domain": "Platform Engineering",
    "color": "#6366f1",
    "icon": "Layers",
    "nodes": [
      {
        "id": "plat-dir",
        "roleTitle": "Director of Platform Engineering",
        "name": "Developer Experience (DevEx) Head",
        "level": 0,
        "parentId": null,
        "responsibilities": "Accelerate developer shipping velocity, reduce cognitive load on feature engineers, maintain internal developer platform (IDP), and track DORA metrics.",
        "workflowInstructions": "Direct Internal Developer Portal Lead and Environments Automation Lead.",
        "delegationPolicy": "auto",
        "color": "#4338ca"
      },
      {
        "id": "plat-idp-lead",
        "roleTitle": "Internal Developer Portal Lead",
        "name": "Backstage & Service Catalog Lead",
        "level": 1,
        "parentId": "plat-dir",
        "responsibilities": "Maintain unified developer portal (Backstage), software service catalog, automated service scaffolding templates, and API documentation index.",
        "workflowInstructions": "Supervise Portal Fullstack Developers on self-service developer plugins.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "plat-portal-dev",
        "roleTitle": "Portal Fullstack Developer",
        "name": "DevEx Tooling Engineer",
        "level": 2,
        "parentId": "plat-idp-lead",
        "responsibilities": "Build self-service Backstage plugins allowing developers to provision databases, request temporary permissions, and view deploy status in 1 click.",
        "workflowInstructions": "Integrate GitHub, Kubernetes, and Cloud provider APIs into a streamlined web interface.",
        "delegationPolicy": "both",
        "color": "#818cf8"
      },
      {
        "id": "plat-env-lead",
        "roleTitle": "Environments Automation Lead",
        "name": "Ephemeral Preview Environments Lead",
        "level": 1,
        "parentId": "plat-dir",
        "responsibilities": "Build automated ephemeral preview environments for every pull request, allowing designers and QA to test code in isolated cloud sandboxes.",
        "workflowInstructions": "Direct Kubernetes Automation Specialist on namespace lifecycle management and automatic teardown.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "plat-k8s-spec",
        "roleTitle": "Kubernetes Automation Specialist",
        "name": "Cluster Operator Developer",
        "level": 2,
        "parentId": "plat-env-lead",
        "responsibilities": "Write custom Kubernetes operators and CRDs (Custom Resource Definitions) that automate database seeding, mock services, and DNS routing.",
        "workflowInstructions": "Ensure isolated environments spin up in under 90 seconds and clean up automatically when PRs merge.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "plat-devex-meas",
        "roleTitle": "DevEx Metrics Analyst",
        "name": "DORA & Developer Productivity Specialist",
        "level": 1,
        "parentId": "plat-dir",
        "responsibilities": "Track deployment frequency, lead time for changes, change failure rate, and time-to-restore (DORA metrics), running quarterly developer surveys.",
        "workflowInstructions": "Identify friction points in developer workflows and recommend engineering process improvements.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "plat-docs-eng",
        "roleTitle": "Developer Enablement Engineer",
        "name": "Internal Documentation & Training Lead",
        "level": 2,
        "parentId": "plat-idp-lead",
        "responsibilities": "Write golden path tutorials, onboarding documentation for new engineering hires, sample starter code repositories, and CLI tools.",
        "workflowInstructions": "Shorten new engineer time-to-first-production-commit to under 48 hours.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "plat-sec-guard",
        "roleTitle": "Security Guardrails Specialist",
        "name": "Policy-as-Code Engineer",
        "level": 2,
        "parentId": "plat-env-lead",
        "responsibilities": "Write Open Policy Agent (OPA) / Kyverno admission controllers to enforce security, memory limits, and container restrictions automatically.",
        "workflowInstructions": "Prevent insecure configurations from ever reaching cluster runtime environments.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      }
    ]
  },
  {
    "id": "chain-site-reliability-engineering",
    "name": "Site Reliability Engineering (SRE) & Incident Ops",
    "companyName": "Site Reliability Engineering (SRE) & Incident Ops",
    "description": "Google-style SRE organization enforcing Service Level Objectives (SLOs), error budgets, automated toil reduction, and chaos engineering.",
    "category": "Cloud & DevOps",
    "domain": "Site Reliability",
    "color": "#10b981",
    "icon": "Activity",
    "nodes": [
      {
        "id": "sre-head",
        "roleTitle": "Head of Site Reliability",
        "name": "Director of SRE & Production Health",
        "level": 0,
        "parentId": null,
        "responsibilities": "Enforce organizational error budgets, defend production stability against premature feature launches, oversee 24/7 on-call, and eliminate operational toil.",
        "workflowInstructions": "Direct Production SRE Lead and Chaos Engineering Lead.",
        "delegationPolicy": "auto",
        "color": "#047857"
      },
      {
        "id": "sre-prod-lead",
        "roleTitle": "Production SRE Lead",
        "name": "Core Infrastructure SRE Manager",
        "level": 1,
        "parentId": "sre-head",
        "responsibilities": "Oversee on-call rotation schedules, review Sev-1 post-mortems, maintain production SLO dashboards, and ensure sub-5-minute alert response.",
        "workflowInstructions": "Supervise Senior Site Reliability Engineers on production troubleshooting.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "sre-sr-eng",
        "roleTitle": "Senior Site Reliability Engineer",
        "name": "On-Call Production Specialist",
        "level": 2,
        "parentId": "sre-prod-lead",
        "responsibilities": "Act as primary on-call responder for P1 outages, triage distributed system failures, execute automated mitigation scripts, and lead war rooms.",
        "workflowInstructions": "Write Go/Python automation to eliminate repetitive operational toil.",
        "delegationPolicy": "both",
        "color": "#34d399"
      },
      {
        "id": "sre-obs-spec",
        "roleTitle": "Telemetry & Observability Specialist",
        "name": "Prometheus & OpenTelemetry Lead",
        "level": 2,
        "parentId": "sre-prod-lead",
        "responsibilities": "Manage high-volume metrics collectors, distributed tracing pipelines (Jaeger/Tempo), centralized log streaming (Loki), and alerting thresholds.",
        "workflowInstructions": "Tune alert thresholds to prevent alert fatigue and guarantee critical anomaly detection.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "sre-chaos-lead",
        "roleTitle": "Chaos Engineering Lead",
        "name": "Resilience & Game Day Architect",
        "level": 1,
        "parentId": "sre-head",
        "responsibilities": "Design controlled failure injection experiments using Chaos Mesh / Gremlin, simulating fiber cuts, disk corruption, and memory spikes.",
        "workflowInstructions": "Direct Chaos Test Engineer to validate automated failover mechanisms.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "sre-chaos-eng",
        "roleTitle": "Chaos Test Engineer",
        "name": "Resilience Validation Specialist",
        "level": 2,
        "parentId": "sre-chaos-lead",
        "responsibilities": "Execute automated chaos tests during scheduled business hours to confirm that clusters self-heal without human intervention.",
        "workflowInstructions": "Document weaknesses discovered in microservice retry and circuit breaker logic.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "sre-post-mortem",
        "roleTitle": "Incident Analyst & Scribe",
        "name": "Root Cause Analysis Facilitator",
        "level": 1,
        "parentId": "sre-head",
        "responsibilities": "Facilitate blameless post-mortem retrospectives after outages, identify systemic failure causes, and assign tracked prevention Jira tickets.",
        "workflowInstructions": "Publish internal outage learnings to build a resilient engineering culture.",
        "delegationPolicy": "up",
        "color": "#0284c7"
      },
      {
        "id": "sre-cap-planner",
        "roleTitle": "Capacity & Performance Planner",
        "name": "Infrastructure Forecasting Specialist",
        "level": 2,
        "parentId": "sre-prod-lead",
        "responsibilities": "Model future cloud compute and storage growth based on user trends, predict holiday traffic surges, and conduct stress testing.",
        "workflowInstructions": "Ensure infrastructure capacity headroom is provisioned 60 days ahead of demand.",
        "delegationPolicy": "up",
        "color": "#6366f1"
      }
    ]
  },
  {
    "id": "chain-database-reliability-engineering",
    "name": "Database Reliability & Distributed Storage",
    "companyName": "Database Reliability & Distributed Storage",
    "description": "Mission-critical database administration team managing distributed SQL, Redis caches, zero-data-loss replication, and multi-terabyte migrations.",
    "category": "Cloud & DevOps",
    "domain": "Database Systems",
    "color": "#0891b2",
    "icon": "Database",
    "nodes": [
      {
        "id": "dbre-head",
        "roleTitle": "Head of Database Engineering",
        "name": "Director of Data Persistence",
        "level": 0,
        "parentId": null,
        "responsibilities": "Guarantee zero data loss (RPO = 0), sub-10ms query response times, database backup recovery verification, and database cloud cost efficiency.",
        "workflowInstructions": "Direct Relational Database Lead and Distributed NoSQL Lead.",
        "delegationPolicy": "auto",
        "color": "#0e7490"
      },
      {
        "id": "dbre-pg-lead",
        "roleTitle": "Relational Database Lead",
        "name": "PostgreSQL / MySQL Architect",
        "level": 1,
        "parentId": "dbre-head",
        "responsibilities": "Manage multi-terabyte PostgreSQL clusters, read replicas, connection poolers (PgBouncer), table partitioning, and high-availability failover (Patroni).",
        "workflowInstructions": "Supervise PostgreSQL DBA on index optimizations and query tuning.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "dbre-pg-dba",
        "roleTitle": "Senior PostgreSQL DBA",
        "name": "Query Optimization & Vacuum Specialist",
        "level": 2,
        "parentId": "dbre-pg-lead",
        "responsibilities": "Analyze slow query logs, optimize table indexing (B-Tree/GIN), tune autovacuum parameters to prevent table bloat, and resolve lock contention.",
        "workflowInstructions": "Review database schema migration scripts submitted by developers before production rollout.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "dbre-nosql-lead",
        "roleTitle": "Distributed NoSQL & Caching Lead",
        "name": "Redis & Cassandra Specialist",
        "level": 1,
        "parentId": "dbre-head",
        "responsibilities": "Architect distributed caching tiers (Redis Cluster), key-value stores, write-heavy event stores, and session state persistence.",
        "workflowInstructions": "Optimize cache hit ratios (> 98%) and configure memory eviction policies to prevent out-of-memory crashes.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "dbre-mig-eng",
        "roleTitle": "Database Migration Automation Engineer",
        "name": "Schema Migration & DDL Specialist",
        "level": 2,
        "parentId": "dbre-pg-lead",
        "responsibilities": "Automate zero-downtime database schema migrations using tools like gh-ost/Liquibase, avoiding exclusive table locks on live traffic.",
        "workflowInstructions": "Maintain backward compatibility during multi-stage application rollouts.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "dbre-backup-spec",
        "roleTitle": "Backup & Point-in-Time Recovery Specialist",
        "name": "Data Disaster Recovery Lead",
        "level": 1,
        "parentId": "dbre-head",
        "responsibilities": "Manage automated continuous Write-Ahead Log (WAL) archiving to S3, daily snapshots, and run daily automated restore verification drills.",
        "workflowInstructions": "Certify that any database can be restored to any second in time within the past 30 days.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "dbre-sec-eng",
        "roleTitle": "Database Security & Encryption Engineer",
        "name": "Data Masking & Compliance Specialist",
        "level": 1,
        "parentId": "dbre-head",
        "responsibilities": "Implement transparent data encryption (TDE), column-level PII encryption, database role-based permissions, and automated access auditing.",
        "workflowInstructions": "Ensure compliance with PCI-DSS, HIPAA, and GDPR database storage requirements.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      }
    ]
  },
  {
    "id": "chain-serverless-cloud-native",
    "name": "Serverless & Cloud-Native Event Systems",
    "companyName": "Serverless & Cloud-Native Event Systems",
    "description": "Modern serverless microservice team building ultra-low-cost, auto-scaling event pipelines using AWS Lambda, Cloudflare Workers, and EventBridge.",
    "category": "Cloud & DevOps",
    "domain": "Serverless Architecture",
    "color": "#f59e0b",
    "icon": "Zap",
    "nodes": [
      {
        "id": "sless-arch",
        "roleTitle": "Cloud Native Serverless Architect",
        "name": "Principal Serverless Systems Architect",
        "level": 0,
        "parentId": null,
        "responsibilities": "Design event-driven asynchronous architectures, serverless cold-start mitigation, micro-billing cost controls, and decoupled messaging.",
        "workflowInstructions": "Direct Serverless Application Engineer and Event Streaming Specialist.",
        "delegationPolicy": "auto",
        "color": "#b45309"
      },
      {
        "id": "sless-app-eng",
        "roleTitle": "Senior Serverless Application Engineer",
        "name": "AWS Lambda & Node/Go Specialist",
        "level": 1,
        "parentId": "sless-arch",
        "responsibilities": "Implement high-concurrency serverless microservices using AWS Lambda / Cloudflare Workers, API Gateway v2, and DynamoDB single-table design.",
        "workflowInstructions": "Minimize cold-start execution times, optimize function memory sizing, and handle dead-letter queues (DLQ).",
        "delegationPolicy": "both",
        "color": "#f59e0b"
      },
      {
        "id": "sless-event-spec",
        "roleTitle": "Event-Driven & Messaging Specialist",
        "name": "EventBridge & SQS Architect",
        "level": 1,
        "parentId": "sless-arch",
        "responsibilities": "Configure EventBridge event buses, FIFO message queues, fanout notifications, and step function state machines.",
        "workflowInstructions": "Design idempotent event consumers with automated replay capabilities for failed messages.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "sless-edge-dev",
        "roleTitle": "Edge Worker & CDN Developer",
        "name": "Cloudflare Workers & V8 Isolate Dev",
        "level": 1,
        "parentId": "sless-arch",
        "responsibilities": "Deploy distributed edge logic executing within 5ms of end users worldwide for geolocation routing, auth verification, and dynamic caching.",
        "workflowInstructions": "Leverage Cloudflare KV / D1 / Durable Objects for ultra-low-latency edge state.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "sless-mon-spec",
        "roleTitle": "Serverless Observability Specialist",
        "name": "Distributed Tracing & Logs Specialist",
        "level": 2,
        "parentId": "sless-app-eng",
        "responsibilities": "Instrument distributed traces across asynchronous event queues using AWS X-Ray and Lumigo, identifying message bottlenecks.",
        "workflowInstructions": "Monitor function invocation error rates, throttling alarms, and cloud billing spikes.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-finops-cloud-cost-optimization",
    "name": "FinOps & Cloud Cost Optimization Engineering",
    "companyName": "FinOps & Cloud Cost Optimization Engineering",
    "description": "Cross-functional cloud financial management team auditing millions in infrastructure spend, rightsizing workloads, and maximizing unit economics.",
    "category": "Cloud & DevOps",
    "domain": "Cloud FinOps",
    "color": "#10b981",
    "icon": "Coins",
    "nodes": [
      {
        "id": "finops-head",
        "roleTitle": "Head of Cloud FinOps",
        "name": "Director of Infrastructure Financial Ops",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead enterprise cloud cost governance, infrastructure spend reduction targets (> 25% savings), unit economics modeling, and executive reports.",
        "workflowInstructions": "Direct Cloud Cost Architect and FinOps Data Analyst.",
        "delegationPolicy": "auto",
        "color": "#047857"
      },
      {
        "id": "finops-arch",
        "roleTitle": "Cloud Cost Optimization Architect",
        "name": "Principal Cloud FinOps Architect",
        "level": 1,
        "parentId": "finops-head",
        "responsibilities": "Model multi-year cloud commit plans (Savings Plans, Reserved Instances), negotiate enterprise discount programs (EDP), and direct architectural rightsizing.",
        "workflowInstructions": "Supervise Resource Rightsizing Engineer on compute and storage optimizations.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "finops-rightsize",
        "roleTitle": "Resource Rightsizing Engineer",
        "name": "Kubernetes & Compute Optimization Eng",
        "level": 2,
        "parentId": "finops-arch",
        "responsibilities": "Implement automated pod rightsizing tools (Karpenter/Kubecost), migrate batch jobs to Spot/Preemptible instances, and optimize storage tiers.",
        "workflowInstructions": "Delete orphaned EBS volumes, clean untagged snapshots, and automate non-production dev cluster shutdowns after hours.",
        "delegationPolicy": "both",
        "color": "#34d399"
      },
      {
        "id": "finops-analyst",
        "roleTitle": "FinOps Data Analyst",
        "name": "Cloud Billing & Analytics Specialist",
        "level": 1,
        "parentId": "finops-head",
        "responsibilities": "Build detailed Looker/PowerBI dashboards analyzing AWS Cost and Usage Reports (CUR), attributing spend to specific product squads.",
        "workflowInstructions": "Deliver weekly cost variance reports to engineering managers to encourage frugal cloud culture.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "finops-gov",
        "roleTitle": "Cloud Tagging & Governance Specialist",
        "name": "Cloud Policy Automation Engineer",
        "level": 2,
        "parentId": "finops-arch",
        "responsibilities": "Write automated SCP policies and Terraform linters that reject the creation of any cloud resource lacking mandatory cost-center tags.",
        "workflowInstructions": "Maintain 100% cloud resource tag allocation across all production accounts.",
        "delegationPolicy": "up",
        "color": "#0284c7"
      }
    ]
  },
  {
    "id": "chain-multi-region-disaster-recovery",
    "name": "Multi-Region Active-Active & Disaster Recovery",
    "companyName": "Multi-Region Active-Active & Disaster Recovery",
    "description": "High-availability team delivering active-active multi-region cloud resilience with automated global DNS failover, cross-region replication, and drills.",
    "category": "Cloud & DevOps",
    "domain": "Disaster Recovery",
    "color": "#7c3aed",
    "icon": "Globe2",
    "nodes": [
      {
        "id": "mr-dir",
        "roleTitle": "Director of Business Continuity",
        "name": "Global Disaster Recovery Head",
        "level": 0,
        "parentId": null,
        "responsibilities": "Ensure business survival under catastrophic cloud regional failures, maintain multi-region operational readiness, and certify ISO 22301 compliance.",
        "workflowInstructions": "Direct Multi-Region Architect and Automated Failover Lead.",
        "delegationPolicy": "auto",
        "color": "#5b21b6"
      },
      {
        "id": "mr-arch",
        "roleTitle": "Multi-Region Cloud Architect",
        "name": "Active-Active Systems Architect",
        "level": 1,
        "parentId": "mr-dir",
        "responsibilities": "Design conflict-free replicated data types (CRDTs), bi-directional database replication (CockroachDB/Aurora Global), and anycast routing.",
        "workflowInstructions": "Supervise Cross-Region Data Replication Engineer.",
        "delegationPolicy": "both",
        "color": "#7c3aed"
      },
      {
        "id": "mr-repl-eng",
        "roleTitle": "Cross-Region Data Replication Engineer",
        "name": "Global Data Sync Specialist",
        "level": 2,
        "parentId": "mr-arch",
        "responsibilities": "Monitor asynchronous replication lag across continents, optimize network packet latency, and prevent split-brain write conflicts.",
        "workflowInstructions": "Maintain zero-loss replication buffers and automatic catch-up pipelines.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "mr-failover-lead",
        "roleTitle": "Automated Failover Lead",
        "name": "Global Traffic Routing Lead",
        "level": 1,
        "parentId": "mr-dir",
        "responsibilities": "Configure Route53 / Cloudflare global server load balancing (GSLB) health checks with sub-10-second automated failover triggers.",
        "workflowInstructions": "Supervise DR Automation Engineer on automated traffic draining scripts.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "mr-dr-eng",
        "roleTitle": "DR Automation Engineer",
        "name": "Failover Scripting & Drill Specialist",
        "level": 2,
        "parentId": "mr-failover-lead",
        "responsibilities": "Write automated disaster recovery runbooks that simulate complete cloud region blackouts, measure RTO/RPO, and verify data consistency.",
        "workflowInstructions": "Conduct quarterly unannounced executive failover simulations.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "mr-backup-lead",
        "roleTitle": "Immutable Backup & Ransomware Lead",
        "name": "Air-Gapped Storage Specialist",
        "level": 1,
        "parentId": "mr-dir",
        "responsibilities": "Maintain write-once-read-many (WORM) air-gapped immutable backup vaults in isolated cloud accounts protected against ransomware deletion.",
        "workflowInstructions": "Conduct cryptographic checksum verifications on all stored backup archives.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "mr-audit-spec",
        "roleTitle": "Business Continuity Auditor",
        "name": "Compliance & DR Reporting Lead",
        "level": 2,
        "parentId": "mr-dir",
        "responsibilities": "Compile disaster recovery certification reports for enterprise insurance underwriters, enterprise clients, and external regulatory auditors.",
        "workflowInstructions": "Maintain up-to-date business impact analysis (BIA) documentation.",
        "delegationPolicy": "up",
        "color": "#d97706"
      }
    ]
  },
  {
    "id": "chain-networking-sdn-infrastructure",
    "name": "Software-Defined Networking & Edge Routing",
    "companyName": "Software-Defined Networking & Edge Routing",
    "description": "Specialized network engineering team managing global multi-cloud mesh networks, BGP peering, WireGuard VPNs, and software-defined WAN.",
    "category": "Cloud & DevOps",
    "domain": "Network Engineering",
    "color": "#2563eb",
    "icon": "Network",
    "nodes": [
      {
        "id": "net-lead",
        "roleTitle": "Chief Network Architect",
        "name": "Head of Global Network Infrastructure",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead global software-defined WAN (SD-WAN) architecture, BGP peering at Internet Exchange Points (IXPs), latency optimization, and DDoS mitigation.",
        "workflowInstructions": "Direct Senior SDN Engineer and Network Security Specialist.",
        "delegationPolicy": "auto",
        "color": "#1e40af"
      },
      {
        "id": "net-sdn-eng",
        "roleTitle": "Senior SDN & Routing Engineer",
        "name": "Software-Defined Network Specialist",
        "level": 1,
        "parentId": "net-lead",
        "responsibilities": "Program dynamic routing policies, configure BGP communities, manage Anycast IP prefixes, and tune kernel network parameters (eBPF).",
        "workflowInstructions": "Direct Mesh Network Developer on point-to-point WireGuard tunnel overlays.",
        "delegationPolicy": "both",
        "color": "#2563eb"
      },
      {
        "id": "net-mesh-dev",
        "roleTitle": "Mesh Network Developer",
        "name": "WireGuard & Overlay Network Engineer",
        "level": 2,
        "parentId": "net-sdn-eng",
        "responsibilities": "Implement zero-configuration peer-to-peer overlay networks (Tailscale/Nebula style), automate NAT traversal (STUN/ICE), and maintain gateway daemons.",
        "workflowInstructions": "Ensure secure high-throughput cross-datacenter encrypted communications.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "net-sec-spec",
        "roleTitle": "Network Security & DDoS Specialist",
        "name": "Perimeter Defense Engineer",
        "level": 1,
        "parentId": "net-lead",
        "responsibilities": "Configure automated volumetric DDoS mitigation rules, inspect netflow traffic telemetry for amplification attacks, and maintain firewalls.",
        "workflowInstructions": "Partner with upstream transit providers to scrub malicious DDoS traffic during attacks.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "net-ebpf-dev",
        "roleTitle": "eBPF Systems Engineer",
        "name": "Linux Kernel & Fast Packet Processing",
        "level": 2,
        "parentId": "net-sdn-eng",
        "responsibilities": "Write high-performance eBPF programs in C attaching to XDP (eXpress Data Path) hooks for sub-microsecond packet filtering and load balancing.",
        "workflowInstructions": "Bypass standard Linux network stack overhead to achieve 40Gbps+ throughput per server node.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "net-telemetry",
        "roleTitle": "Network Telemetry & Latency Analyst",
        "name": "NetFlow & Packet Tracing Specialist",
        "level": 2,
        "parentId": "net-lead",
        "responsibilities": "Analyze sFlow/IPFIX telemetry data, track transatlantic packet transit latency, and detect fiber route flapping and packet loss.",
        "workflowInstructions": "Provide automated re-routing recommendations to avoid congested transit provider hops.",
        "delegationPolicy": "up",
        "color": "#059669"
      },
      {
        "id": "net-hardware",
        "roleTitle": "Datacenter Interconnect Specialist",
        "name": "Physical Cabling & Optical Transit Lead",
        "level": 2,
        "parentId": "net-lead",
        "responsibilities": "Manage optical transceivers, 100GbE switch port allocations, cross-connects with tier-1 carriers, and datacenter co-location cabinets.",
        "workflowInstructions": "Coordinate datacenter hands-and-feet technicians during physical hardware maintenance.",
        "delegationPolicy": "up",
        "color": "#475569"
      }
    ]
  },
  {
    "id": "chain-edge-computing-cdn-systems",
    "name": "Edge Computing & CDN Infrastructure",
    "companyName": "Edge Computing & CDN Infrastructure",
    "description": "Global edge delivery network operating distributed points-of-presence (PoPs), WebAssembly edge runtimes, dynamic caching, and video streaming origins.",
    "category": "Cloud & DevOps",
    "domain": "Edge Computing",
    "color": "#0891b2",
    "icon": "Cpu",
    "nodes": [
      {
        "id": "edge-dir",
        "roleTitle": "Head of Edge Infrastructure",
        "name": "Director of Global Edge Systems",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead worldwide Point-of-Presence (PoP) edge network, sub-20ms global delivery latency, edge worker compute platforms, and origin offload ratios (> 95%).",
        "workflowInstructions": "Direct Edge Runtime Architect and CDN Caching Specialist.",
        "delegationPolicy": "auto",
        "color": "#0e7490"
      },
      {
        "id": "edge-wasm-arch",
        "roleTitle": "Edge Runtime Architect",
        "name": "WebAssembly & V8 Isolate Lead",
        "level": 1,
        "parentId": "edge-dir",
        "responsibilities": "Design secure multi-tenant WebAssembly / V8 isolate execution sandboxes capable of starting in under 5 microseconds on bare-metal edge servers.",
        "workflowInstructions": "Supervise Edge Worker Developers on runtime APIs and memory limits.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "edge-worker-dev",
        "roleTitle": "Edge Worker Developer",
        "name": "Distributed Edge Logic Engineer",
        "level": 2,
        "parentId": "edge-wasm-arch",
        "responsibilities": "Build edge APIs for dynamic header rewrites, JWT token verification at the edge, A/B testing splits, and instant server-side personalization.",
        "workflowInstructions": "Test edge code across global edge locations and optimize bundle size.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "edge-cache-spec",
        "roleTitle": "CDN Caching & Origin Offload Specialist",
        "name": "Cache Purge & Invalidation Lead",
        "level": 1,
        "parentId": "edge-dir",
        "responsibilities": "Design tiered cache topologies, stale-while-revalidate policies, instant global cache purge protocols (< 150ms worldwide), and origin shields.",
        "workflowInstructions": "Prevent thundering herd stampedes onto origin databases during viral traffic spikes.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "edge-video-spec",
        "roleTitle": "Edge Video Delivery Specialist",
        "name": "HLS / DASH Streaming Optimization Lead",
        "level": 2,
        "parentId": "edge-cache-spec",
        "responsibilities": "Optimize video segment caching for 4K streaming, adaptive bitrate manifest manipulation, and chunked transfer encoding.",
        "workflowInstructions": "Ensure buffer-free playback for millions of concurrent live streaming viewers.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "edge-dns-spec",
        "roleTitle": "Anycast DNS & Geo-Routing Specialist",
        "name": "Latency-Based Routing Engineer",
        "level": 2,
        "parentId": "edge-dir",
        "responsibilities": "Manage authoritative Anycast DNS servers worldwide, health-check edge PoP saturation, and steer client traffic away from overloaded regions.",
        "workflowInstructions": "Maintain 100% DNS query uptime and optimize TTFB (Time to First Byte).",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "edge-sec-spec",
        "roleTitle": "Edge WAF & Bot Mitigation Specialist",
        "name": "Perimeter Rate Limiting Engineer",
        "level": 2,
        "parentId": "edge-dir",
        "responsibilities": "Deploy distributed Web Application Firewall (WAF) rule sets, challenge malicious scrapers with invisible JS PoW puzzles, and block credential stuffing.",
        "workflowInstructions": "Mitigate malicious automated traffic directly at the edge without touching customer origin servers.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      }
    ]
  },
  {
    "id": "chain-security-operations-center",
    "name": "Security Operations Center (SOC) & Threat Triage",
    "companyName": "Security Operations Center (SOC) & Threat Triage",
    "description": "24/7 cybersecurity operations center monitoring SIEM alerts, triaging indicators of compromise (IoC), executing containment, and forensic analysis.",
    "category": "Cybersecurity",
    "domain": "Security Operations",
    "color": "#dc2626",
    "icon": "ShieldAlert",
    "nodes": [
      {
        "id": "soc-ciso",
        "roleTitle": "Chief Information Security Officer (CISO)",
        "name": "Head of Enterprise Information Security",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead corporate cybersecurity posture, board risk committee briefings, cybersecurity insurance, and regulatory breach notification compliance.",
        "workflowInstructions": "Direct Director of Security Operations and Head of Threat Intelligence.",
        "delegationPolicy": "auto",
        "color": "#7f1d1d"
      },
      {
        "id": "soc-dir",
        "roleTitle": "Director of Security Operations",
        "name": "SOC & Incident Response Head",
        "level": 1,
        "parentId": "soc-ciso",
        "responsibilities": "Oversee 24/7 security monitoring center, mean time to detect (MTTD < 10 mins), mean time to contain (MTTC < 30 mins), and playbooks.",
        "workflowInstructions": "Supervise SOC Operations Manager and Incident Response Commander.",
        "delegationPolicy": "auto",
        "color": "#991b1b"
      },
      {
        "id": "soc-mgr",
        "roleTitle": "SOC Operations Manager",
        "name": "Security Monitoring Shift Lead",
        "level": 2,
        "parentId": "soc-dir",
        "responsibilities": "Manage Tier 1 and Tier 2 security analysts, tune SIEM correlation alerts (Splunk/Sentinel), and eliminate false positive alarm noise.",
        "workflowInstructions": "Assign incoming security alert incidents and monitor analyst triage SLAs.",
        "delegationPolicy": "auto",
        "color": "#b91c1c"
      },
      {
        "id": "soc-t1-analyst",
        "roleTitle": "Tier 1 Security Alert Triager",
        "name": "Frontline SOC Analyst",
        "level": 3,
        "parentId": "soc-mgr",
        "responsibilities": "Review incoming EDR and firewall security alerts, investigate IP reputations, verify phishing email submissions, and filter benign activity.",
        "workflowInstructions": "Escalate validated suspicious activity directly to Tier 2 Security Analysts within 15 minutes.",
        "delegationPolicy": "up",
        "color": "#ef4444"
      },
      {
        "id": "soc-t2-analyst",
        "roleTitle": "Tier 2 Security Analyst",
        "name": "Deep Threat Investigator",
        "level": 3,
        "parentId": "soc-mgr",
        "responsibilities": "Investigate suspicious process execution trees, anomalous PowerShell commands, unusual lateral movement, and data exfiltration alerts.",
        "workflowInstructions": "Correlate multi-source telemetry, isolate compromised endpoints via EDR, and escalate severe intrusions to Incident Response.",
        "delegationPolicy": "both",
        "color": "#f87171"
      },
      {
        "id": "soc-t3-hunter",
        "roleTitle": "Tier 3 Proactive Threat Hunter",
        "name": "Senior Adversary Hunting Specialist",
        "level": 2,
        "parentId": "soc-dir",
        "responsibilities": "Proactively search corporate networks for undetected adversary presence using MITRE ATT&CK techniques, memory dumps, and baseline deviations.",
        "workflowInstructions": "Develop new behavioral detection rules to stop emerging advanced persistent threats (APTs).",
        "delegationPolicy": "both",
        "color": "#ea580c"
      },
      {
        "id": "soc-ir-cmd",
        "roleTitle": "Incident Response Commander",
        "name": "Cyber Crisis Response Lead",
        "level": 2,
        "parentId": "soc-dir",
        "responsibilities": "Take operational command during active cyber breaches, coordinate network isolation, direct eradication procedures, and liaise with legal counsel.",
        "workflowInstructions": "Direct Digital Forensics Specialist on evidence preservation and timeline reconstruction.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "soc-forensics",
        "roleTitle": "Digital Forensics & Malware Specialist",
        "name": "Forensic Investigator & Reverse Engineer",
        "level": 3,
        "parentId": "soc-ir-cmd",
        "responsibilities": "Capture cryptographic disk and RAM images, perform static and dynamic malware disassembly in isolated sandboxes, and extract C2 indicators.",
        "workflowInstructions": "Produce legally admissible forensic root-cause analysis reports for law enforcement and regulators.",
        "delegationPolicy": "up",
        "color": "#7c3aed"
      },
      {
        "id": "soc-siem-eng",
        "roleTitle": "SIEM & Security Data Engineer",
        "name": "Detection Engineering Lead",
        "level": 2,
        "parentId": "soc-mgr",
        "responsibilities": "Maintain high-throughput log ingestion pipelines (Kafka, Splunk, Elastic), write automated SOAR playbook actions, and optimize search queries.",
        "workflowInstructions": "Ensure 100% endpoint and cloud audit log retention compliance for forensics.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "soc-vuln-mgr",
        "roleTitle": "Vulnerability Management Specialist",
        "name": "Asset Scanning & Patching Lead",
        "level": 2,
        "parentId": "soc-mgr",
        "responsibilities": "Run continuous automated vulnerability scans across corporate assets (Tenable/Qualys), prioritize CVE remediation based on real-world exploits.",
        "workflowInstructions": "Hold IT and engineering teams accountable to patching critical vulnerabilities within 14 days.",
        "delegationPolicy": "up",
        "color": "#d97706"
      },
      {
        "id": "soc-comms-lead",
        "roleTitle": "Breach Communications & Legal Liaison",
        "name": "Privacy & Regulatory Incident Officer",
        "level": 1,
        "parentId": "soc-ciso",
        "responsibilities": "Manage regulatory disclosure requirements (SEC 4-day rule, GDPR 72-hour notice), customer breach notifications, and public PR statements.",
        "workflowInstructions": "Protect attorney-client privilege during forensic investigations.",
        "delegationPolicy": "up",
        "color": "#475569"
      },
      {
        "id": "soc-train-spec",
        "roleTitle": "Security Awareness & Phishing Specialist",
        "name": "Human Risk & Training Lead",
        "level": 2,
        "parentId": "soc-ciso",
        "responsibilities": "Design simulated phishing campaigns to test employee vigilance, deliver interactive cybersecurity training, and reduce human risk factors.",
        "workflowInstructions": "Track employee click rates and deliver 1-on-1 coaching to repeat offenders.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-application-security-appsec",
    "name": "Application Security (AppSec) & DevSecOps",
    "companyName": "Application Security (AppSec) & DevSecOps",
    "description": "Software security engineering guild embedding automated security scanning (SAST/DAST/SCA), threat modeling, and bug bounty programs into CI/CD.",
    "category": "Cybersecurity",
    "domain": "AppSec",
    "color": "#b91c1c",
    "icon": "Code",
    "nodes": [
      {
        "id": "appsec-head",
        "roleTitle": "Head of Application Security",
        "name": "Director of Product Security & AppSec",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead secure software development lifecycle (SSDLC), eliminate OWASP Top 10 vulnerabilities, manage bug bounty budgets, and sign off on major releases.",
        "workflowInstructions": "Direct Principal AppSec Architect and Bug Bounty Program Manager.",
        "delegationPolicy": "auto",
        "color": "#7f1d1d"
      },
      {
        "id": "appsec-arch",
        "roleTitle": "Principal AppSec Architect",
        "name": "Security Architecture & Threat Modeling Lead",
        "level": 1,
        "parentId": "appsec-head",
        "responsibilities": "Lead architectural threat modeling workshops (STRIDE) during feature design, review cryptographic implementations, and design authorization frameworks.",
        "workflowInstructions": "Supervise Application Security Engineers on code reviews.",
        "delegationPolicy": "both",
        "color": "#991b1b"
      },
      {
        "id": "appsec-eng",
        "roleTitle": "Senior Application Security Engineer",
        "name": "Secure Code Review Specialist",
        "level": 2,
        "parentId": "appsec-arch",
        "responsibilities": "Perform manual secure code reviews on high-risk pull requests (auth logic, payment processing), audit third-party open-source libraries, and verify fixes.",
        "workflowInstructions": "Help software developers remediate security vulnerabilities without slowing down sprint velocity.",
        "delegationPolicy": "both",
        "color": "#b91c1c"
      },
      {
        "id": "appsec-ci-lead",
        "roleTitle": "DevSecOps Pipeline Engineer",
        "name": "Automated Security Tooling Lead",
        "level": 2,
        "parentId": "appsec-arch",
        "responsibilities": "Embed static analysis (SAST like Semgrep), dynamic analysis (DAST), software bill of materials (SBOM), and secret scanning directly into CI pipelines.",
        "workflowInstructions": "Configure automated PR blocking rules that reject any commit containing hardcoded API keys or high-severity vulnerabilities.",
        "delegationPolicy": "both",
        "color": "#ea580c"
      },
      {
        "id": "appsec-bounty-mgr",
        "roleTitle": "Bug Bounty Program Manager",
        "name": "HackerOne / Bugcrowd Triage Lead",
        "level": 1,
        "parentId": "appsec-head",
        "responsibilities": "Triage external security researcher vulnerability submissions, validate proof-of-concepts, calculate severity scores (CVSS), and award bounties.",
        "workflowInstructions": "Coordinate urgent hotfix patch validation with software engineering squads.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "appsec-pen-tester",
        "roleTitle": "Internal Web App Penetration Tester",
        "name": "Offensive AppSec Specialist",
        "level": 2,
        "parentId": "appsec-bounty-mgr",
        "responsibilities": "Perform deep manual penetration tests against new pre-production features, hunting for business logic bypasses, IDOR, SSRF, and SQL injections.",
        "workflowInstructions": "Provide clear reproduction scripts and remediation guidance to developers.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "appsec-crypto-spec",
        "roleTitle": "Applied Cryptography Specialist",
        "name": "Key Management & Encryption Lead",
        "level": 2,
        "parentId": "appsec-arch",
        "responsibilities": "Review cryptographic algorithms, TLS cipher suites, password hashing parameters (Argon2id), and secure enclave integrations.",
        "workflowInstructions": "Prevent subtle cryptographic implementation mistakes that lead to data compromise.",
        "delegationPolicy": "up",
        "color": "#7c3aed"
      },
      {
        "id": "appsec-champions",
        "roleTitle": "Security Champions Guild Lead",
        "name": "Developer Security Education Lead",
        "level": 2,
        "parentId": "appsec-head",
        "responsibilities": "Train embedded 'Security Champions' inside every software engineering squad, run secure coding capture-the-flag (CTF) workshops, and foster awareness.",
        "workflowInstructions": "Empower product developers to catch security issues early before code review.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-red-team-offensive-security",
    "name": "Red Team & Offensive Penetration Testing Lab",
    "companyName": "Red Team & Offensive Penetration Testing Lab",
    "description": "Elite offensive security operators executing simulated real-world cyber adversary attacks, network pivoting, social engineering, and evasion.",
    "category": "Cybersecurity",
    "domain": "Offensive Security",
    "color": "#dc2626",
    "icon": "Crosshair",
    "nodes": [
      {
        "id": "red-dir",
        "roleTitle": "Red Team Operations Director",
        "name": "Head of Offensive Security & Adversary Emulation",
        "level": 0,
        "parentId": null,
        "responsibilities": "Authorize targeted simulated adversary operations, ensure strict rules-of-engagement (ROE) safety, and measure blue team detection efficacy.",
        "workflowInstructions": "Direct Lead Penetration Tester and Physical Security Penetration Specialist.",
        "delegationPolicy": "auto",
        "color": "#7f1d1d"
      },
      {
        "id": "red-lead-pen",
        "roleTitle": "Lead Penetration Tester",
        "name": "Principal Offensive Operator",
        "level": 1,
        "parentId": "red-dir",
        "responsibilities": "Lead end-to-end multi-week adversary simulations, develop novel initial access payloads, orchestrate internal network pivoting, and compromise domain admin.",
        "workflowInstructions": "Supervise Web Exploitation Specialist and Network Intrusion Tester.",
        "delegationPolicy": "both",
        "color": "#991b1b"
      },
      {
        "id": "red-web-spec",
        "roleTitle": "Web & Cloud Exploitation Specialist",
        "name": "Application Exploitation Lead",
        "level": 2,
        "parentId": "red-lead-pen",
        "responsibilities": "Identify zero-day vulnerabilities in external facing web assets, exploit server-side request forgery (SSRF) to steal cloud IAM credentials, and pivot.",
        "workflowInstructions": "Chain multiple low-severity bugs into critical remote code execution (RCE).",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "red-net-intruder",
        "roleTitle": "Internal Network Intrusion Tester",
        "name": "Active Directory & EDR Evasion Specialist",
        "level": 2,
        "parentId": "red-lead-pen",
        "responsibilities": "Execute Kerberoasting, NTLM relay attacks, Active Directory certificate abuse, and bypass commercial Endpoint Detection & Response (EDR) agents.",
        "workflowInstructions": "Map internal network trust relationships to achieve complete domain dominance.",
        "delegationPolicy": "both",
        "color": "#ea580c"
      },
      {
        "id": "red-social-eng",
        "roleTitle": "Social Engineering Specialist",
        "name": "Human Exploitation & Spearphishing Lead",
        "level": 1,
        "parentId": "red-dir",
        "responsibilities": "Craft targeted executive spearphishing emails, execute voice vishing phone calls, and create cloned employee login portals to harvest MFA credentials.",
        "workflowInstructions": "Test organizational human resilience and report security training deficiencies.",
        "delegationPolicy": "up",
        "color": "#d97706"
      },
      {
        "id": "red-blue-liaison",
        "roleTitle": "Purple Team Exercise Coordinator",
        "name": "Blue Team Remediation Liaison",
        "level": 1,
        "parentId": "red-dir",
        "responsibilities": "Collaborate directly with defensive blue team analysts after exercises, sharing exact attack execution timestamps to calibrate SIEM detections.",
        "workflowInstructions": "Transform offensive insights into concrete defensive detection improvements.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-cloud-security-posture",
    "name": "Cloud Security Posture Management (CSPM)",
    "companyName": "Cloud Security Posture Management (CSPM)",
    "description": "Automated cloud security team enforcing continuous compliance across AWS, Azure, and GCP resources, container images, and IAM permissions.",
    "category": "Cybersecurity",
    "domain": "Cloud Security",
    "color": "#0284c7",
    "icon": "ShieldCheck",
    "nodes": [
      {
        "id": "cspm-dir",
        "roleTitle": "Director of Cloud Security",
        "name": "Cloud Security Architecture Head",
        "level": 0,
        "parentId": null,
        "responsibilities": "Eliminate cloud infrastructure misconfigurations, enforce zero-trust identity boundaries, ensure CIS benchmark compliance, and mitigate cloud risk.",
        "workflowInstructions": "Direct CSPM Tooling Lead and IAM Architect.",
        "delegationPolicy": "auto",
        "color": "#0369a1"
      },
      {
        "id": "cspm-tool-lead",
        "roleTitle": "CSPM Tooling & Automation Lead",
        "name": "Wiz / Prisma Cloud Systems Lead",
        "level": 1,
        "parentId": "cspm-dir",
        "responsibilities": "Deploy and tune agentless cloud security graph scanners, identify public cloud bucket exposures, and prioritize toxic combination attack paths.",
        "workflowInstructions": "Supervise Cloud Remediations Engineer on automated infrastructure patches.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "cspm-remediator",
        "roleTitle": "Cloud Security Remediations Engineer",
        "name": "Automated Security Remediation Lead",
        "level": 2,
        "parentId": "cspm-tool-lead",
        "responsibilities": "Write automated Lambda / Cloud Function responders that instantly isolate compromised EC2 instances and revoke over-privileged IAM keys.",
        "workflowInstructions": "Submit pull requests directly into infrastructure Terraform repos to remediate drift.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "cspm-iam-arch",
        "roleTitle": "Cloud IAM & Permissions Architect",
        "name": "Least-Privilege Security Architect",
        "level": 1,
        "parentId": "cspm-dir",
        "responsibilities": "Audit cloud identity permissions across thousands of roles, eliminate unused wildcard (*) permissions, and implement just-in-time access.",
        "workflowInstructions": "Enforce temporary credential generation and multi-factor authentication (MFA) on all cloud access.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "cspm-container-spec",
        "roleTitle": "Container & Kubernetes Security Specialist",
        "name": "Image Scanning & Runtime Guard Lead",
        "level": 2,
        "parentId": "cspm-tool-lead",
        "responsibilities": "Scan container images in registries for known CVEs, enforce read-only container root filesystems, and deploy runtime security agents (Falco).",
        "workflowInstructions": "Block unapproved container base images from deploying to production Kubernetes clusters.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "cspm-secrets-spec",
        "roleTitle": "Secrets Management & PKI Specialist",
        "name": "Vault & Key Operations Engineer",
        "level": 2,
        "parentId": "cspm-iam-arch",
        "responsibilities": "Manage enterprise HashiCorp Vault clusters, automated SSL/TLS certificate renewals (Let's Encrypt), and dynamic database secret leasing.",
        "workflowInstructions": "Prevent API tokens and credentials from ever being committed to git or stored in plain text.",
        "delegationPolicy": "up",
        "color": "#7c3aed"
      },
      {
        "id": "cspm-audit-spec",
        "roleTitle": "Cloud Compliance Auditor",
        "name": "SOC2 & ISO 27001 Cloud Auditor",
        "level": 2,
        "parentId": "cspm-dir",
        "responsibilities": "Generate continuous compliance evidence reports for SOC 2 Type II, ISO 27001, and HIPAA across all multi-cloud infrastructure accounts.",
        "workflowInstructions": "Provide certified audit documentation for enterprise procurement reviews.",
        "delegationPolicy": "up",
        "color": "#d97706"
      }
    ]
  },
  {
    "id": "chain-threat-intelligence-intel",
    "name": "Cyber Threat Intelligence (CTI) & Adversary Tracking",
    "companyName": "Cyber Threat Intelligence (CTI) & Adversary Tracking",
    "description": "Specialized intelligence unit monitoring dark web forums, tracking nation-state threat groups (APTs), analyzing malware samples, and sharing STIX/TAXII feeds.",
    "category": "Cybersecurity",
    "domain": "Threat Intelligence",
    "color": "#7c3aed",
    "icon": "Radar",
    "nodes": [
      {
        "id": "cti-dir",
        "roleTitle": "Head of Cyber Threat Intelligence",
        "name": "Director of Global Threat Intel",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead strategic intelligence briefings for executive leadership, assess geopolitical cyber risk, track active threat actors targeting the industry.",
        "workflowInstructions": "Direct Principal Threat Researcher and Malware Reverse Engineer.",
        "delegationPolicy": "auto",
        "color": "#5b21b6"
      },
      {
        "id": "cti-princ-res",
        "roleTitle": "Principal Threat Researcher",
        "name": "Adversary Campaign & APT Tracking Lead",
        "level": 1,
        "parentId": "cti-dir",
        "responsibilities": "Track advanced persistent threat (APT) campaign infrastructure, analyze adversary TTPs (Tactics, Techniques, and Procedures), and attribute attacks.",
        "workflowInstructions": "Supervise Dark Web Intelligence Analyst on undercover monitoring.",
        "delegationPolicy": "both",
        "color": "#7c3aed"
      },
      {
        "id": "cti-darkweb-analyst",
        "roleTitle": "Dark Web & Breach Monitoring Analyst",
        "name": "Undercover Threat Analyst",
        "level": 2,
        "parentId": "cti-princ-res",
        "responsibilities": "Monitor underground cybercrime forums, Telegram leak channels, and ransomware extortion blogs for leaked corporate credentials or stolen data.",
        "workflowInstructions": "Deliver immediate early warnings when corporate credentials or customer databases appear in illicit markets.",
        "delegationPolicy": "up",
        "color": "#8b5cf6"
      },
      {
        "id": "cti-malware-eng",
        "roleTitle": "Malware Reverse Engineer",
        "name": "Binary Disassembly & Sandbox Specialist",
        "level": 1,
        "parentId": "cti-dir",
        "responsibilities": "Disassemble malicious PE/ELF binaries in Ghidra/IDA Pro, decode obfuscated command-and-control (C2) protocols, and extract cryptographic keys.",
        "workflowInstructions": "Publish detailed malware technical teardowns and generate YARA detection rules.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "cti-feed-eng",
        "roleTitle": "Threat Intelligence Integration Engineer",
        "name": "STIX/TAXII & IoC Automation Lead",
        "level": 2,
        "parentId": "cti-princ-res",
        "responsibilities": "Ingest commercial and open-source threat feeds into MISP/OpenCTI platforms, deduplicate indicators of compromise (IoC), and push blocks to firewalls.",
        "workflowInstructions": "Automate real-time IP, domain, and file hash blocklists to corporate perimeter defenses.",
        "delegationPolicy": "up",
        "color": "#0284c7"
      },
      {
        "id": "cti-disseminator",
        "roleTitle": "Threat Intel Reporting Specialist",
        "name": "Strategic Intelligence Writer",
        "level": 2,
        "parentId": "cti-dir",
        "responsibilities": "Draft concise threat advisories for system administrators and write executive threat landscape reports summarizing active industry risks.",
        "workflowInstructions": "Ensure defensive teams understand emerging threat vectors before attacks occur.",
        "delegationPolicy": "up",
        "color": "#059669"
      }
    ]
  },
  {
    "id": "chain-it-governance-grc",
    "name": "IT Governance, Risk & Compliance (GRC)",
    "companyName": "IT Governance, Risk & Compliance (GRC)",
    "description": "Enterprise regulatory compliance team managing SOC 2, ISO 27001, GDPR privacy audits, third-party vendor risk assessments, and policy governance.",
    "category": "Cybersecurity",
    "domain": "GRC Compliance",
    "color": "#059669",
    "icon": "FileCheck",
    "nodes": [
      {
        "id": "grc-head",
        "roleTitle": "Chief Compliance Officer & Head of GRC",
        "name": "Director of IT Governance, Risk & Compliance",
        "level": 0,
        "parentId": null,
        "responsibilities": "Accountable for corporate regulatory standing, audit sign-offs (SOC2/ISO27001), corporate risk register, and data protection officer (DPO) duties.",
        "workflowInstructions": "Direct Information Security Compliance Lead and Vendor Risk Manager.",
        "delegationPolicy": "auto",
        "color": "#064e3b"
      },
      {
        "id": "grc-soc2-lead",
        "roleTitle": "SOC 2 & ISO 27001 Compliance Lead",
        "name": "Information Security Audit Specialist",
        "level": 1,
        "parentId": "grc-head",
        "responsibilities": "Coordinate with external independent CPA audit firms, collect evidence across thousands of technical controls, and maintain SOC 2 Type II reports.",
        "workflowInstructions": "Supervise Technical Evidence Collector on automated compliance platforms (Vanta/Drata).",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "grc-evidence-spec",
        "roleTitle": "Technical Evidence Collection Specialist",
        "name": "Audit Automation Specialist",
        "level": 2,
        "parentId": "grc-soc2-lead",
        "responsibilities": "Maintain automated evidence integrations connecting GitHub, AWS, Okta, and HR systems to prove compliance continuous monitoring.",
        "workflowInstructions": "Resolve compliance control gaps before annual audit observation periods.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "grc-privacy-off",
        "roleTitle": "Data Privacy Officer (DPO)",
        "name": "GDPR & CCPA Privacy Compliance Lead",
        "level": 1,
        "parentId": "grc-head",
        "responsibilities": "Ensure strict compliance with global data privacy regulations (GDPR, CCPA/CPRA), maintain Record of Processing Activities (ROPA), and handle DSARs.",
        "workflowInstructions": "Review software product architectures to ensure privacy-by-design and data minimization principles.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "grc-vendor-mgr",
        "roleTitle": "Vendor Third-Party Risk Manager",
        "name": "Third-Party Vendor Assessment Lead",
        "level": 1,
        "parentId": "grc-head",
        "responsibilities": "Perform security assessments on all new SaaS vendors (SIG/CAIQ questionnaires), review vendor SOC2 reports, and approve software procurement.",
        "workflowInstructions": "Ensure no third-party vendor compromises corporate supply chain security.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "grc-policy-writer",
        "roleTitle": "Security Policy & Training Coordinator",
        "name": "IT Governance Policy Specialist",
        "level": 2,
        "parentId": "grc-head",
        "responsibilities": "Draft and maintain corporate information security policies (Acceptable Use, Password Policy, Incident Response Plan), and track employee sign-offs.",
        "workflowInstructions": "Conduct annual policy reviews to ensure alignment with evolving regulatory mandates.",
        "delegationPolicy": "up",
        "color": "#475569"
      }
    ]
  },
  {
    "id": "chain-zero-trust-identity-iam",
    "name": "Zero Trust Identity & Access Management (IAM)",
    "companyName": "Zero Trust Identity & Access Management (IAM)",
    "description": "Enterprise identity team managing Okta single sign-on (SSO), FIDO2 passwordless authentication, privileged access management (PAM), and SCIM provisioning.",
    "category": "Cybersecurity",
    "domain": "Identity & Access",
    "color": "#6366f1",
    "icon": "Fingerprint",
    "nodes": [
      {
        "id": "iam-dir",
        "roleTitle": "Director of Identity & Access Management",
        "name": "Head of Enterprise IAM",
        "level": 0,
        "parentId": null,
        "responsibilities": "Enforce corporate zero-trust architecture: verify every access request explicitly, assume breach, and maintain least-privilege principles.",
        "workflowInstructions": "Direct Principal IAM Architect and Privileged Access Management Lead.",
        "delegationPolicy": "auto",
        "color": "#4338ca"
      },
      {
        "id": "iam-arch",
        "roleTitle": "Principal Identity Architect",
        "name": "Zero Trust Identity Architect",
        "level": 1,
        "parentId": "iam-dir",
        "responsibilities": "Architect Okta / Azure AD enterprise single sign-on (SSO), SAML/OIDC federation, passwordless FIDO2/WebAuthn hardware keys, and conditional access.",
        "workflowInstructions": "Supervise Directory Services & SCIM Engineer.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "iam-scim-eng",
        "roleTitle": "Directory Services & SCIM Engineer",
        "name": "Automated User Provisioning Lead",
        "level": 2,
        "parentId": "iam-arch",
        "responsibilities": "Build automated HR-driven user lifecycle workflows (Workday to Okta): automatically provision accounts on day 1 and revoke access within 60 seconds on departure.",
        "workflowInstructions": "Maintain SCIM connectors across 100+ corporate SaaS applications.",
        "delegationPolicy": "both",
        "color": "#818cf8"
      },
      {
        "id": "iam-pam-lead",
        "roleTitle": "Privileged Access Management (PAM) Lead",
        "name": "CyberArk / BeyondTrust Specialist",
        "level": 1,
        "parentId": "iam-dir",
        "responsibilities": "Manage privileged administrative credentials, automated password rotations, jump host bastion sessions, and just-in-time credential checkout.",
        "workflowInstructions": "Supervise Session Recording & Audit Analyst on administrator session logs.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "iam-session-auditor",
        "roleTitle": "PAM Audit & Session Analyst",
        "name": "Privileged Session Reviewer",
        "level": 2,
        "parentId": "iam-pam-lead",
        "responsibilities": "Audit keystroke logs and screen recordings of administrative sessions on production database servers, flagging unauthorized commands.",
        "workflowInstructions": "Ensure total accountability across all production root and database access events.",
        "delegationPolicy": "up",
        "color": "#ea580c"
      },
      {
        "id": "iam-cert-lead",
        "roleTitle": "Identity Governance & Access Review Lead",
        "name": "Quarterly Access Certification Lead",
        "level": 2,
        "parentId": "iam-arch",
        "responsibilities": "Conduct automated quarterly user access certifications (UAR) requiring managers to re-approve employee permissions to sensitive corporate systems.",
        "workflowInstructions": "Revoke orphaned access and maintain audit-ready certification logs.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "iam-mfa-spec",
        "roleTitle": "Hardware Security & MFA Specialist",
        "name": "YubiKey & WebAuthn Specialist",
        "level": 2,
        "parentId": "iam-arch",
        "responsibilities": "Deploy hardware security keys (YubiKeys) to all employees, eliminate SMS/phone-based MFA vulnerabilities, and enforce device health checks.",
        "workflowInstructions": "Block untrusted employee laptops from accessing corporate resources.",
        "delegationPolicy": "up",
        "color": "#0284c7"
      }
    ]
  },
  {
    "id": "chain-cryptographic-systems-security",
    "name": "Cryptographic Systems & PKI Infrastructure",
    "companyName": "Cryptographic Systems & PKI Infrastructure",
    "description": "Deep cryptographic engineering team managing hardware security modules (HSM), public key infrastructure (PKI), post-quantum algorithms, and code signing.",
    "category": "Cybersecurity",
    "domain": "Cryptography",
    "color": "#7c3aed",
    "icon": "Key",
    "nodes": [
      {
        "id": "crypto-head",
        "roleTitle": "Chief Cryptographer",
        "name": "Head of Cryptographic Systems",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead enterprise cryptographic governance, post-quantum cryptography migration, key custody ceremonies, and algorithmic security compliance.",
        "workflowInstructions": "Direct PKI Systems Architect and HSM Key Management Engineer.",
        "delegationPolicy": "auto",
        "color": "#5b21b6"
      },
      {
        "id": "crypto-pki-arch",
        "roleTitle": "Principal PKI Systems Architect",
        "name": "Public Key Infrastructure Architect",
        "level": 1,
        "parentId": "crypto-head",
        "responsibilities": "Architect internal root and intermediate Certificate Authorities (CAs), automated certificate issuance (ACME protocol), and mTLS policies.",
        "workflowInstructions": "Supervise Code Signing & Integrity Engineer.",
        "delegationPolicy": "both",
        "color": "#7c3aed"
      },
      {
        "id": "crypto-hsm-eng",
        "roleTitle": "HSM & Key Management Engineer",
        "name": "Hardware Security Module Specialist",
        "level": 1,
        "parentId": "crypto-head",
        "responsibilities": "Manage Thales / AWS CloudHSM clusters, execute multi-custodian quorum key generation ceremonies, and manage master encryption keys.",
        "workflowInstructions": "Enforce strict dual-control physical and logical boundaries on all cryptographic roots.",
        "delegationPolicy": "both",
        "color": "#a855f7"
      },
      {
        "id": "crypto-codesign",
        "roleTitle": "Code Signing & Artifact Integrity Engineer",
        "name": "Release Cryptography Specialist",
        "level": 2,
        "parentId": "crypto-pki-arch",
        "responsibilities": "Manage cryptographic code signing pipelines for production binaries, software releases, and Git commit GPG signatures.",
        "workflowInstructions": "Ensure all deployed software artifacts are cryptographically verified and tamper-evident.",
        "delegationPolicy": "up",
        "color": "#0284c7"
      },
      {
        "id": "crypto-pq-res",
        "roleTitle": "Post-Quantum Cryptography Researcher",
        "name": "Quantum-Resistant Algorithm Specialist",
        "level": 2,
        "parentId": "crypto-head",
        "responsibilities": "Evaluate and deploy NIST-standardized quantum-resistant cryptographic algorithms (ML-KEM, ML-DSA) across transport protocols.",
        "workflowInstructions": "Future-proof long-lived enterprise encrypted data against harvest-now-decrypt-later attacks.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-industrial-scada-security",
    "name": "Critical Infrastructure & Industrial SCADA Security",
    "companyName": "Critical Infrastructure & Industrial SCADA Security",
    "description": "Operational technology (OT) security team protecting industrial manufacturing plants, power grids, and SCADA control networks from cyber warfare.",
    "category": "Cybersecurity",
    "domain": "OT & SCADA Security",
    "color": "#dc2626",
    "icon": "ShieldOff",
    "nodes": [
      {
        "id": "scada-dir",
        "roleTitle": "Director of Operational Technology Security",
        "name": "Head of OT & ICS Security",
        "level": 0,
        "parentId": null,
        "responsibilities": "Protect industrial control systems (ICS) from state-sponsored cyber disruption, ensure ISA/IEC 62443 compliance, and maintain plant safety.",
        "workflowInstructions": "Direct SCADA Security Architect and ICS Incident Response Specialist.",
        "delegationPolicy": "auto",
        "color": "#7f1d1d"
      },
      {
        "id": "scada-arch",
        "roleTitle": "Principal SCADA Security Architect",
        "name": "Industrial Network Air-Gap Architect",
        "level": 1,
        "parentId": "scada-dir",
        "responsibilities": "Enforce strict Purdue Model industrial network segmentation, unidirectional security data diodes, and air-gapped engineering workstations.",
        "workflowInstructions": "Supervise Industrial Protocol Security Engineer.",
        "delegationPolicy": "both",
        "color": "#991b1b"
      },
      {
        "id": "scada-proto-eng",
        "roleTitle": "Industrial Protocol Security Engineer",
        "name": "Modbus / DNP3 / OPC-UA Specialist",
        "level": 2,
        "parentId": "scada-arch",
        "responsibilities": "Inspect and filter industrial control protocol commands (Modbus TCP, DNP3, Ethernet/IP) using deep packet inspection firewalls (Nozomi/Claroty).",
        "workflowInstructions": "Block unauthorized PLC logic upload and firmware modification attempts.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "scada-ir-spec",
        "roleTitle": "ICS Incident Response Specialist",
        "name": "Industrial Threat Containment Lead",
        "level": 1,
        "parentId": "scada-dir",
        "responsibilities": "Lead emergency response procedures for malware targeting physical machinery (Stuxnet/Industroyer variants), coordinating manual emergency shutdowns.",
        "workflowInstructions": "Conduct drills restoring PLCs and safety instrumented systems (SIS) from clean offline backups.",
        "delegationPolicy": "both",
        "color": "#ea580c"
      },
      {
        "id": "scada-plc-eng",
        "roleTitle": "PLC & Safety Systems Security Engineer",
        "name": "Embedded Industrial Firmware Specialist",
        "level": 2,
        "parentId": "scada-ir-spec",
        "responsibilities": "Audit Programmable Logic Controller (PLC) firmware, configure hardware physical run/program key switches, and verify ladder logic integrity.",
        "workflowInstructions": "Ensure safety instrumented systems (SIS) cannot be overridden by compromised plant networks.",
        "delegationPolicy": "up",
        "color": "#d97706"
      },
      {
        "id": "scada-sensor-spec",
        "roleTitle": "Industrial Sensor Telemetry Specialist",
        "name": "Physical Anomaly Detection Engineer",
        "level": 2,
        "parentId": "scada-arch",
        "responsibilities": "Monitor physical plant sensory telemetry (motor vibrations, pipe pressures, temperatures) to detect physical sabotage that evades digital logs.",
        "workflowInstructions": "Trigger automated alarms when physical measurements deviate from valid engineering bounds.",
        "delegationPolicy": "up",
        "color": "#0284c7"
      },
      {
        "id": "scada-field-auditor",
        "roleTitle": "Field Plant Security Auditor",
        "name": "On-Site Factory Security Inspector",
        "level": 2,
        "parentId": "scada-dir",
        "responsibilities": "Perform physical security audits across regional factory control rooms, inspect USB port locks on operator HMIs, and audit physical access logs.",
        "workflowInstructions": "Ensure strict physical security controls prevent rogue device attachments on plant floor networks.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-foundation-model-ai-lab",
    "name": "Foundation Model Pretraining AI Lab",
    "companyName": "Foundation Model Pretraining AI Lab",
    "description": "Frontier AI research laboratory training 100B+ parameter transformer models with distributed GPU clusters, dataset curation, and RLHF alignment.",
    "category": "Artificial Intelligence",
    "domain": "Frontier AI Research",
    "color": "#8b5cf6",
    "icon": "BrainCircuit",
    "nodes": [
      {
        "id": "fai-chief",
        "roleTitle": "Chief AI Scientist & Director",
        "name": "Head of Frontier AI Research",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead fundamental research direction, model scaling laws, strategic GPU compute allocation (10,000+ H100s), and AI safety charter.",
        "workflowInstructions": "Direct Director of Pretraining, Director of Post-Training, and Compute Infrastructure Lead.",
        "delegationPolicy": "auto",
        "color": "#6d28d9"
      },
      {
        "id": "fai-dir-pre",
        "roleTitle": "Director of Pretraining",
        "name": "Foundational Pretraining Research Head",
        "level": 1,
        "parentId": "fai-chief",
        "responsibilities": "Oversee multi-trillion token pretraining runs, model architecture innovations (MoE, Attention variants), and loss curve stability.",
        "workflowInstructions": "Supervise Distributed Training Architect and Data Curation Lead.",
        "delegationPolicy": "auto",
        "color": "#7c3aed"
      },
      {
        "id": "fai-dist-arch",
        "roleTitle": "Distributed Training Architect",
        "name": "Megatron-LM / DeepSpeed Lead",
        "level": 2,
        "parentId": "fai-dir-pre",
        "responsibilities": "Design 3D tensor parallelism (Tensor, Pipeline, Zero-3 Data Parallelism) across thousands of GPUs, optimizing MFU (Model Flops Utilization > 50%).",
        "workflowInstructions": "Direct Training Cluster Engineer to resolve gradient desynchronizations and GPU memory overflow.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "fai-train-eng",
        "roleTitle": "Training Cluster Engineer",
        "name": "PyTorch & Slurm Cluster Specialist",
        "level": 3,
        "parentId": "fai-dist-arch",
        "responsibilities": "Manage automated training checkpoint saves, auto-restart crashed training nodes without data loss, and monitor InfiniBand network collective health.",
        "workflowInstructions": "Write low-level CUDA kernels to accelerate attention layers and eliminate communication bottlenecks.",
        "delegationPolicy": "both",
        "color": "#a855f7"
      },
      {
        "id": "fai-data-lead",
        "roleTitle": "Dataset Curation & Synthetic Data Lead",
        "name": "Trillion-Token Corpus Architect",
        "level": 2,
        "parentId": "fai-dir-pre",
        "responsibilities": "Curate 15+ trillion token web-scale datasets, design deduplication pipelines (MinHash LSH), filter low-quality text, and synthesize reasoning datasets.",
        "workflowInstructions": "Supervise Data Filtering & Tokenization Specialist.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "fai-data-eng",
        "roleTitle": "Data Filtering & Tokenization Specialist",
        "name": "Large-Scale Data Pipeline Engineer",
        "level": 3,
        "parentId": "fai-data-lead",
        "responsibilities": "Train custom Byte-Pair Encoding (BPE) tokenizers, run Spark/Ray data cleaning jobs on petabyte-scale text dumps, and remove toxic content.",
        "workflowInstructions": "Deliver high-quality balanced token splits for pretraining batches.",
        "delegationPolicy": "up",
        "color": "#06b6d4"
      },
      {
        "id": "fai-dir-post",
        "roleTitle": "Director of Post-Training & Alignment",
        "name": "RLHF & Reasoning Alignment Head",
        "level": 1,
        "parentId": "fai-chief",
        "responsibilities": "Lead post-training alignment: Supervised Fine-Tuning (SFT), Reinforcement Learning from Human Feedback (RLHF / DPO), and multi-turn reasoning.",
        "workflowInstructions": "Supervise Alignment Scientist and Human Evaluation Lead.",
        "delegationPolicy": "auto",
        "color": "#ec4899"
      },
      {
        "id": "fai-rlhf-sci",
        "roleTitle": "Alignment & RLHF Scientist",
        "name": "Reinforcement Learning Specialist",
        "level": 2,
        "parentId": "fai-dir-post",
        "responsibilities": "Train reward models, implement PPO / DPO loss algorithms, and align model outputs for helpfulness, accuracy, and refusal of harmful requests.",
        "workflowInstructions": "Benchmark model reasoning on competitive math, coding (HumanEval), and multi-step logic datasets.",
        "delegationPolicy": "both",
        "color": "#f43f5e"
      },
      {
        "id": "fai-eval-lead",
        "roleTitle": "Automated Evaluation & Benchmarks Lead",
        "name": "LLM Benchmark Suite Architect",
        "level": 2,
        "parentId": "fai-dir-post",
        "responsibilities": "Design automated evaluation pipelines running thousands of test prompts across every checkpoint to detect regressions in reasoning or truthfulness.",
        "workflowInstructions": "Publish detailed model evaluation scorecards to determine checkpoint graduation.",
        "delegationPolicy": "up",
        "color": "#d946ef"
      },
      {
        "id": "fai-infra-lead",
        "roleTitle": "Compute Infrastructure Lead",
        "name": "GPU Supercomputer Architect",
        "level": 1,
        "parentId": "fai-chief",
        "responsibilities": "Manage supercomputer datacenter power, liquid cooling, high-speed InfiniBand switches, and NVMe distributed storage arrays (Lustre/GPFS).",
        "workflowInstructions": "Direct Hardware Reliability Engineer to detect failing GPU memory and optical cables before training runs fail.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "fai-hw-eng",
        "roleTitle": "GPU Reliability Engineer",
        "name": "Hardware Diagnostic & NCCL Specialist",
        "level": 2,
        "parentId": "fai-infra-lead",
        "responsibilities": "Run continuous NCCL all-reduce bandwidth tests, isolate thermal-throttling GPUs, and replace failed hardware with zero downtime.",
        "workflowInstructions": "Maintain 99.8% cluster compute availability for training jobs.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "fai-safety-lead",
        "roleTitle": "AI Safety & Red Teaming Lead",
        "name": "Model Red Team & Adversarial Testing Lead",
        "level": 1,
        "parentId": "fai-chief",
        "responsibilities": "Conduct extensive adversarial jailbreak testing, probe model refusal boundaries, evaluate bio/cyber risk capabilities, and write model system cards.",
        "workflowInstructions": "Ensure models comply with responsible AI safety frameworks before external API release.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "fai-red-tester",
        "roleTitle": "Adversarial Prompt Red Teamer",
        "name": "Jailbreak & Vulnerability Researcher",
        "level": 2,
        "parentId": "fai-safety-lead",
        "responsibilities": "Craft novel adversarial jailbreak prompts, prompt injections, and indirect context poisoning attacks to stress-test safety guardrails.",
        "workflowInstructions": "Catalog successful bypass techniques to train safety classifiers.",
        "delegationPolicy": "up",
        "color": "#ef4444"
      },
      {
        "id": "fai-api-release",
        "roleTitle": "Model Serving & Optimization Lead",
        "name": "TensorRT-LLM & vLLM Lead",
        "level": 2,
        "parentId": "fai-infra-lead",
        "responsibilities": "Quantize model weights (FP8/AWQ), optimize KV cache management (PagedAttention), and serve models with ultra-high tokens-per-second throughput.",
        "workflowInstructions": "Expose low-latency streaming endpoints to external developer APIs.",
        "delegationPolicy": "up",
        "color": "#3b82f6"
      }
    ]
  },
  {
    "id": "chain-generative-ai-product-squad",
    "name": "Generative AI & Autonomous Agent Squad",
    "companyName": "Generative AI & Autonomous Agent Squad",
    "description": "Applied generative AI squad building customer-facing autonomous agent workflows, RAG knowledge retrieval, and tool-calling sandboxes.",
    "category": "Artificial Intelligence",
    "domain": "Applied GenAI",
    "color": "#a855f7",
    "icon": "Bot",
    "nodes": [
      {
        "id": "genai-vp",
        "roleTitle": "VP of Generative AI Products",
        "name": "Head of Applied AI Engineering",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead enterprise generative AI product vision, model evaluation benchmarks, LLM token unit economics, and AI product safety.",
        "workflowInstructions": "Direct Principal AI Product Manager, RAG Systems Architect, and Agent Orchestration Lead.",
        "delegationPolicy": "auto",
        "color": "#7c3aed"
      },
      {
        "id": "genai-pm",
        "roleTitle": "Lead AI Product Manager",
        "name": "Autonomous Agent PM",
        "level": 1,
        "parentId": "genai-vp",
        "responsibilities": "Define agent personas, tool-use permissions, human-in-the-loop approval workflows, and target task completion rates.",
        "workflowInstructions": "Prioritize user workflows suitable for automation and analyze hallucination error logs.",
        "delegationPolicy": "both",
        "color": "#a855f7"
      },
      {
        "id": "genai-rag-arch",
        "roleTitle": "RAG Systems & Vector Search Architect",
        "name": "Knowledge Retrieval Specialist",
        "level": 1,
        "parentId": "genai-vp",
        "responsibilities": "Design hybrid search pipelines combining dense vector embeddings (Pinecone/Milvus), sparse BM25 keyword search, and cross-encoder re-ranking.",
        "workflowInstructions": "Supervise Document Ingestion Engineer on chunking strategies and metadata filtering.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "genai-doc-eng",
        "roleTitle": "Document Ingestion & Chunking Engineer",
        "name": "Unstructured Data ETL Specialist",
        "level": 2,
        "parentId": "genai-rag-arch",
        "responsibilities": "Extract clean markdown from messy customer PDFs, spreadsheets, and Word docs, apply semantic chunking boundaries, and generate embeddings.",
        "workflowInstructions": "Maintain high retrieval recall (> 95%) and eliminate irrelevant context noise.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "genai-agent-lead",
        "roleTitle": "Agent Orchestration & Tool-Calling Lead",
        "name": "LangGraph / Multi-Agent Architect",
        "level": 1,
        "parentId": "genai-vp",
        "responsibilities": "Build stateful multi-agent graphs, memory scratchpads, dynamic tool selection, and loop-termination guards to prevent infinite loops.",
        "workflowInstructions": "Supervise Tool Sandbox Security Engineer.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "genai-tool-dev",
        "roleTitle": "Tool Sandbox & Code Execution Engineer",
        "name": "Secure Execution Sandbox Developer",
        "level": 2,
        "parentId": "genai-agent-lead",
        "responsibilities": "Deploy isolated Docker/gVisor microVM execution sandboxes allowing agents to safely run Python scripts, shell commands, and API requests.",
        "workflowInstructions": "Enforce strict CPU/memory limits and prevent unauthorized network egress from agent sandboxes.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "genai-eval-eng",
        "roleTitle": "Prompt & LLM Evaluation Engineer",
        "name": "Ragas / TruLens Eval Specialist",
        "level": 2,
        "parentId": "genai-pm",
        "responsibilities": "Write automated synthetic evaluation test suites measuring faithfulness, answer relevance, context recall, and toxicity on every code commit.",
        "workflowInstructions": "Block prompt regressions before they reach production users.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "genai-fe-dev",
        "roleTitle": "AI Interaction Frontend Developer",
        "name": "Streaming Chat & Canvas UI Specialist",
        "level": 2,
        "parentId": "genai-pm",
        "responsibilities": "Build modern streaming markdown interfaces, token-by-token typewriter effects, interactive artifact canvases, and inline citations.",
        "workflowInstructions": "Optimize WebSocket event streaming and ensure responsive mobile interfaces.",
        "delegationPolicy": "up",
        "color": "#d946ef"
      }
    ]
  },
  {
    "id": "chain-modern-data-platform",
    "name": "Modern Data Platform & Data Engineering",
    "companyName": "Modern Data Platform & Data Engineering",
    "description": "Scalable cloud data warehouse division managing Snowflake/BigQuery, automated dbt SQL transformations, Airflow DAGs, and data governance.",
    "category": "Data & Analytics",
    "domain": "Data Platform",
    "color": "#0284c7",
    "icon": "Layers",
    "nodes": [
      {
        "id": "data-vp",
        "roleTitle": "VP of Data & Analytics",
        "name": "Chief Data Officer",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead enterprise data strategy, self-service data warehouse democratization, data governance compliance, and analytics infrastructure spend.",
        "workflowInstructions": "Direct Head of Data Engineering and Director of Business Intelligence.",
        "delegationPolicy": "auto",
        "color": "#0369a1"
      },
      {
        "id": "data-eng-head",
        "roleTitle": "Head of Data Engineering",
        "name": "Data Platform Architecture Lead",
        "level": 1,
        "parentId": "data-vp",
        "responsibilities": "Oversee enterprise data pipelines, lakehouse architecture (Iceberg/Delta), batch and streaming ingestion, and pipeline SLAs.",
        "workflowInstructions": "Supervise Senior Data Engineers and dbt Analytics Engineers.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "data-sr-eng",
        "roleTitle": "Senior Data Engineer",
        "name": "Batch & Streaming Pipeline Lead",
        "level": 2,
        "parentId": "data-eng-head",
        "responsibilities": "Build distributed Spark/Ray data pipelines, Airflow DAG orchestration, and CDC (Change Data Capture) from production databases.",
        "workflowInstructions": "Ensure data pipeline resilience, automated retries, and data validation checks with Great Expectations.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "data-dbt-lead",
        "roleTitle": "Lead Analytics Engineer (dbt)",
        "name": "Data Modeling & Semantic Layer Lead",
        "level": 2,
        "parentId": "data-eng-head",
        "responsibilities": "Design clean dimensional data models (star schema, facts, dimensions) in dbt, maintain metric definitions, and optimize SQL performance.",
        "workflowInstructions": "Supervise Analytics Engineer on model documentation and automated testing.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "data-dbt-dev",
        "roleTitle": "Analytics Engineer",
        "name": "SQL & dbt Transformation Specialist",
        "level": 3,
        "parentId": "data-dbt-lead",
        "responsibilities": "Write modular dbt models, configure incremental table loads, write custom schema tests, and publish data dictionary documentation.",
        "workflowInstructions": "Translate messy source data into business-ready reporting tables.",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "data-lake-eng",
        "roleTitle": "Data Lakehouse Infrastructure Engineer",
        "name": "Storage & Query Engine Specialist",
        "level": 2,
        "parentId": "data-eng-head",
        "responsibilities": "Manage object storage data lakes (S3/GCS), optimize Parquet file compaction, configure metadata catalogs, and tune query engines (Trino).",
        "workflowInstructions": "Reduce analytical query costs and speed up large-scale scans.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "data-bi-dir",
        "roleTitle": "Director of Business Intelligence",
        "name": "BI & Dashboards Leadership Head",
        "level": 1,
        "parentId": "data-vp",
        "responsibilities": "Lead executive dashboards, standardized KPIs across company departments, and self-service BI adoption in Looker/Tableau.",
        "workflowInstructions": "Supervise BI Developers and Financial Data Analysts.",
        "delegationPolicy": "auto",
        "color": "#10b981"
      },
      {
        "id": "data-bi-dev",
        "roleTitle": "Senior BI Dashboard Developer",
        "name": "Looker / Tableau Specialist",
        "level": 2,
        "parentId": "data-bi-dir",
        "responsibilities": "Build interactive executive dashboards, write LookML models, optimize dashboard query load times, and train business users.",
        "workflowInstructions": "Deliver intuitive visual insights that drive strategic business decisions.",
        "delegationPolicy": "both",
        "color": "#34d399"
      },
      {
        "id": "data-gov-lead",
        "roleTitle": "Data Governance & Quality Lead",
        "name": "Data Catalog & Lineage Specialist",
        "level": 1,
        "parentId": "data-vp",
        "responsibilities": "Enforce data cataloging (Atlan/DataHub), column-level data lineage, PII classification, and data access privacy controls.",
        "workflowInstructions": "Ensure strict compliance with GDPR/CCPA data retention and deletion policies.",
        "delegationPolicy": "both",
        "color": "#7c3aed"
      },
      {
        "id": "data-sec-spec",
        "roleTitle": "Data Security & Access Specialist",
        "name": "RBAC & Data Masking Engineer",
        "level": 2,
        "parentId": "data-gov-lead",
        "responsibilities": "Configure automated row-level security, column masking for sensitive customer data, and audit analytical query logs.",
        "workflowInstructions": "Prevent data leaks while granting verified analysts access to business metrics.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      },
      {
        "id": "data-ops-eng",
        "roleTitle": "DataOps & Observability Specialist",
        "name": "Pipeline Monitoring & Alerting Lead",
        "level": 2,
        "parentId": "data-eng-head",
        "responsibilities": "Monitor data freshness, schema drift alerts (Monte Carlo), and pipeline failure notifications in Slack.",
        "workflowInstructions": "Detect silent data corruption before erroneous metrics reach executive dashboards.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-machine-learning-operations",
    "name": "Machine Learning Operations (MLOps) & Pipeline",
    "companyName": "Machine Learning Operations (MLOps) & Pipeline",
    "description": "End-to-end MLOps team delivering automated model training, feature stores, model registry governance, canary deployments, and drift tracking.",
    "category": "Data & Analytics",
    "domain": "MLOps",
    "color": "#10b981",
    "icon": "Workflow",
    "nodes": [
      {
        "id": "mlops-head",
        "roleTitle": "Head of MLOps",
        "name": "Director of ML Infrastructure & Operations",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead automated model delivery lifecycle, reduce time-to-deploy for new models (from months to days), and ensure 99.99% inference uptime.",
        "workflowInstructions": "Direct ML Platform Architect and Model Monitoring Specialist.",
        "delegationPolicy": "auto",
        "color": "#047857"
      },
      {
        "id": "mlops-arch",
        "roleTitle": "Principal ML Platform Architect",
        "name": "Kubeflow / MLflow Infrastructure Lead",
        "level": 1,
        "parentId": "mlops-head",
        "responsibilities": "Architect reproducible training pipelines using Kubeflow / Argo, maintain central feature store (Feast), and model registry governance.",
        "workflowInstructions": "Supervise ML Pipeline Engineers on automated CI/CD for models.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "mlops-pipe-eng",
        "roleTitle": "ML Pipeline Engineer",
        "name": "Automated Training & Artifact Specialist",
        "level": 2,
        "parentId": "mlops-arch",
        "responsibilities": "Write automated training DAGs that trigger on new data arrival, run hyperparameter tuning (Optuna), and log versioned model artifacts.",
        "workflowInstructions": "Ensure 100% reproducibility between experimentation and production builds.",
        "delegationPolicy": "both",
        "color": "#34d399"
      },
      {
        "id": "mlops-feat-eng",
        "roleTitle": "Feature Store Engineer",
        "name": "Feast / Redis Real-Time Feature Lead",
        "level": 2,
        "parentId": "mlops-arch",
        "responsibilities": "Maintain online low-latency feature caches (Redis) and offline point-in-time correct training feature tables (Snowflake).",
        "workflowInstructions": "Prevent data leakage and train-serve feature skew.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "mlops-serve-lead",
        "roleTitle": "Model Serving & Deployment Lead",
        "name": "Triton / TorchServe Specialist",
        "level": 1,
        "parentId": "mlops-head",
        "responsibilities": "Deploy models behind high-throughput inference servers (Triton Inference Server), optimize GPU batching, and configure canary rollouts.",
        "workflowInstructions": "Supervise Low-Latency Inference Developer.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "mlops-inf-dev",
        "roleTitle": "Low-Latency Inference Developer",
        "name": "Model Quantization & C++ Specialist",
        "level": 2,
        "parentId": "mlops-serve-lead",
        "responsibilities": "Quantize neural network weights with TensorRT / ONNX Runtime, optimize C++ inference wrappers, and maintain sub-10ms P99 latency.",
        "workflowInstructions": "Scale GPU inference clusters based on incoming traffic volume.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "mlops-drift-spec",
        "roleTitle": "Model Monitoring & Drift Specialist",
        "name": "Evidently / Whylabs Monitoring Lead",
        "level": 1,
        "parentId": "mlops-head",
        "responsibilities": "Monitor real-time feature distribution drift (Kolmogorov-Smirnov tests), model prediction calibration, and concept drift in production.",
        "workflowInstructions": "Automatically trigger model retraining pipelines when prediction accuracy degrades below defined thresholds.",
        "delegationPolicy": "up",
        "color": "#d97706"
      },
      {
        "id": "mlops-qa-spec",
        "roleTitle": "ML Quality & Fairness Specialist",
        "name": "Model Validation & Bias Auditor",
        "level": 2,
        "parentId": "mlops-drift-spec",
        "responsibilities": "Test candidate models for demographic parity, disparate impact, adversarial robustness, and edge-case failure modes before deployment approval.",
        "workflowInstructions": "Certify model fairness and regulatory compliance.",
        "delegationPolicy": "up",
        "color": "#7c3aed"
      }
    ]
  },
  {
    "id": "chain-computer-vision-engineering",
    "name": "Computer Vision & Edge AI Lab",
    "companyName": "Computer Vision & Edge AI Lab",
    "description": "Deep learning computer vision team building real-time object detection, image segmentation, optical inspection, and edge camera inference.",
    "category": "Artificial Intelligence",
    "domain": "Computer Vision",
    "color": "#0891b2",
    "icon": "Eye",
    "nodes": [
      {
        "id": "cv-head",
        "roleTitle": "Head of Computer Vision",
        "name": "Director of Visual AI & Edge Perception",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead visual deep learning strategy, edge inference camera deployments, real-time FPS benchmarks (> 30 FPS on edge), and dataset annotation.",
        "workflowInstructions": "Direct Senior CV Scientist and Edge AI Deployment Lead.",
        "delegationPolicy": "auto",
        "color": "#0e7490"
      },
      {
        "id": "cv-sci",
        "roleTitle": "Senior Computer Vision Scientist",
        "name": "Deep Learning Object Detection Specialist",
        "level": 1,
        "parentId": "cv-head",
        "responsibilities": "Train state-of-the-art vision models (YOLO variants, Vision Transformers, Mask R-CNN), design loss functions, and curate image augmentations.",
        "workflowInstructions": "Supervise Model Training Engineer on ablation studies.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "cv-train-eng",
        "roleTitle": "Model Training Engineer",
        "name": "PyTorch & Dataset Augmentation Specialist",
        "level": 2,
        "parentId": "cv-sci",
        "responsibilities": "Train neural networks on multi-GPU nodes, apply synthetic shadow/lighting data augmentations, and evaluate mean Average Precision (mAP).",
        "workflowInstructions": "Deliver optimized model checkpoints ready for quantization.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "cv-annot-lead",
        "roleTitle": "Dataset & Annotation Lead",
        "name": "Image Labeling & Quality Head",
        "level": 2,
        "parentId": "cv-sci",
        "responsibilities": "Manage labeling teams and automated annotation pipelines for bounding boxes, polygon masks, and keypoints across millions of images.",
        "workflowInstructions": "Ensure 99%+ inter-annotator agreement and audit edge-case labeling guidelines.",
        "delegationPolicy": "up",
        "color": "#38bdf8"
      },
      {
        "id": "cv-edge-lead",
        "roleTitle": "Edge AI Deployment Lead",
        "name": "NVIDIA Jetson & TensorRT Specialist",
        "level": 1,
        "parentId": "cv-head",
        "responsibilities": "Optimize models for deployment on low-power edge hardware (NVIDIA Jetson, Raspberry Pi AI, Coral TPU), utilizing INT8 precision.",
        "workflowInstructions": "Direct Embedded Vision Developer on camera pipeline integrations.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "cv-embed-dev",
        "roleTitle": "Embedded Vision Developer",
        "name": "GStreamer & V4L2 Camera Engineer",
        "level": 2,
        "parentId": "cv-edge-lead",
        "responsibilities": "Build high-performance video ingest pipelines using GStreamer and OpenCV, handle hardware video decoding, and manage camera frame buffers.",
        "workflowInstructions": "Eliminate frame drops and optimize heat dissipation on industrial edge devices.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "cv-eval-spec",
        "roleTitle": "Field Vision QA & Benchmarking Specialist",
        "name": "Real-World Camera Verification Lead",
        "level": 2,
        "parentId": "cv-edge-lead",
        "responsibilities": "Test camera vision models under challenging physical conditions: low lighting, rain, lens flare, lens smudges, and high vibration.",
        "workflowInstructions": "Catalog real-world detection failure modes to guide synthetic data generation.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "cv-app-dev",
        "roleTitle": "Vision Application Fullstack Developer",
        "name": "Video Analytics Dashboard Developer",
        "level": 2,
        "parentId": "cv-head",
        "responsibilities": "Build web portals displaying real-time camera alerts, visual heatmaps, video playback archives, and bounding box inspection tools.",
        "workflowInstructions": "Integrate RTSP video streaming into modern browser interfaces using WebRTC.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-natural-language-processing",
    "name": "NLP & Semantic Vector Search Lab",
    "companyName": "NLP & Semantic Vector Search Lab",
    "description": "Specialized linguistic deep learning team delivering multilingual embedding models, hybrid BM25/vector search, and cross-encoder re-ranking.",
    "category": "Artificial Intelligence",
    "domain": "NLP & Search",
    "color": "#6366f1",
    "icon": "FileText",
    "nodes": [
      {
        "id": "nlp-dir",
        "roleTitle": "Director of NLP & Search",
        "name": "Head of Semantic Information Retrieval",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead search precision and recall (NDCG@10 > 0.85), multilingual search coverage, embedding model distillation, and vector database performance.",
        "workflowInstructions": "Direct NLP Research Lead and Vector Search Engine Architect.",
        "delegationPolicy": "auto",
        "color": "#4338ca"
      },
      {
        "id": "nlp-res-lead",
        "roleTitle": "NLP Research Lead",
        "name": "Principal Representation Learning Scientist",
        "level": 1,
        "parentId": "nlp-dir",
        "responsibilities": "Train contrastive embedding models, domain-adapted sentence transformers, and multilingual text classifiers.",
        "workflowInstructions": "Supervise Multilingual Specialist on language tokenization and cross-lingual transfer.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "nlp-multi-spec",
        "roleTitle": "Multilingual Tokenization Specialist",
        "name": "Linguistic & Polyglot Model Engineer",
        "level": 2,
        "parentId": "nlp-res-lead",
        "responsibilities": "Optimize tokenization vocabulary across 50+ languages (including CJK and right-to-left scripts), preventing subword fragmentation.",
        "workflowInstructions": "Evaluate cross-lingual semantic matching on benchmark datasets.",
        "delegationPolicy": "both",
        "color": "#818cf8"
      },
      {
        "id": "nlp-search-arch",
        "roleTitle": "Vector Search Engine Architect",
        "name": "HNSW / Milvus / Qdrant Architect",
        "level": 1,
        "parentId": "nlp-dir",
        "responsibilities": "Design scalable approximate nearest neighbor (ANN) vector indexing (HNSW, IVF-PQ), managing billions of high-dimensional vectors.",
        "workflowInstructions": "Direct Search Relevance Engineer on hybrid search fusion algorithms.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "nlp-rel-eng",
        "roleTitle": "Search Relevance Engineer",
        "name": "Reciprocal Rank Fusion Specialist",
        "level": 2,
        "parentId": "nlp-search-arch",
        "responsibilities": "Implement Reciprocal Rank Fusion (RRF) combining dense vector scores with BM25 keyword matches, followed by cross-encoder re-ranking.",
        "workflowInstructions": "A/B test search ranking algorithms on live customer query traffic.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "nlp-eval-spec",
        "roleTitle": "Search Benchmark & Eval Specialist",
        "name": "IR Metrics & Golden Test Set Lead",
        "level": 2,
        "parentId": "nlp-dir",
        "responsibilities": "Maintain curated golden evaluation datasets of complex user queries, measuring Mean Reciprocal Rank (MRR) and precision-at-k.",
        "workflowInstructions": "Detect semantic search regressions before deploying updated embedding models.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "nlp-ner-dev",
        "roleTitle": "Named Entity Recognition (NER) Developer",
        "name": "Entity Extraction & Linking Engineer",
        "level": 2,
        "parentId": "nlp-res-lead",
        "responsibilities": "Extract custom entities (companies, medical codes, legal terms) from unstructured text and link them into enterprise knowledge graphs.",
        "workflowInstructions": "Enhance document search filters with automatically extracted structured metadata.",
        "delegationPolicy": "up",
        "color": "#d97706"
      }
    ]
  },
  {
    "id": "chain-autonomous-ai-agents-team",
    "name": "Autonomous Multi-Agent Swarm Engineering",
    "companyName": "Autonomous Multi-Agent Swarm Engineering",
    "description": "Pioneering team building hierarchical multi-agent collaboration systems, task decomposition graphs, inter-agent messaging, and sandbox security.",
    "category": "Artificial Intelligence",
    "domain": "AI Agent Swarms",
    "color": "#8b5cf6",
    "icon": "Sparkles",
    "nodes": [
      {
        "id": "agent-lead",
        "roleTitle": "AI Agent System Architect",
        "name": "Head of Multi-Agent Systems",
        "level": 0,
        "parentId": null,
        "responsibilities": "Architect multi-agent coordination topologies (hierarchical, consensus, decentralized), agent memory persistence, and budget governance.",
        "workflowInstructions": "Direct Agent Graph Engineer and Agent Tool Sandbox Developer.",
        "delegationPolicy": "auto",
        "color": "#6d28d9"
      },
      {
        "id": "agent-graph-dev",
        "roleTitle": "Agent Graph & Workflow Engineer",
        "name": "Stateful Graph & Loop Specialist",
        "level": 1,
        "parentId": "agent-lead",
        "responsibilities": "Build stateful execution graphs with cycles, conditional edge branching, human interrupt breakpoints, and parallel tool dispatch.",
        "workflowInstructions": "Supervise Context Window & Memory Curator on conversation compaction.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "agent-mem-curator",
        "roleTitle": "Context Window & Memory Curator",
        "name": "Long-Term Agent Memory Engineer",
        "level": 2,
        "parentId": "agent-graph-dev",
        "responsibilities": "Implement semantic episodic memory retrieval, automatic context window summarization, and scratchpad state management.",
        "workflowInstructions": "Ensure agents maintain task context over hundreds of sequential execution steps without blowing token limits.",
        "delegationPolicy": "both",
        "color": "#a855f7"
      },
      {
        "id": "agent-sandbox-dev",
        "roleTitle": "Agent Tool Sandbox Developer",
        "name": "Secure Execution Environment Lead",
        "level": 1,
        "parentId": "agent-lead",
        "responsibilities": "Build isolated Docker/microVM sandboxes where agents execute bash scripts, compile code, read filesystem trees, and run browser subagents.",
        "workflowInstructions": "Enforce strict timeout policies, resource quotas, and egress network isolation.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "agent-eval-critic",
        "roleTitle": "Agent Evaluator & Critic Specialist",
        "name": "Task Success Benchmark Lead",
        "level": 1,
        "parentId": "agent-lead",
        "responsibilities": "Design automated evaluator agents that inspect peer agent task outputs against acceptance criteria, verifying completeness before finalizing.",
        "workflowInstructions": "Measure agent task completion rates across SWE-bench coding benchmarks.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "agent-cost-controller",
        "roleTitle": "Token Cost & Budget Controller",
        "name": "LLM Inference Cost Optimization",
        "level": 2,
        "parentId": "agent-lead",
        "responsibilities": "Implement real-time token spending limits per task, dynamic model routing (cheap models for triage, frontier models for complex reasoning).",
        "workflowInstructions": "Prevent runaway infinite loops from exhausting API budget quotas.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-business-intelligence-bi",
    "name": "Enterprise Business Intelligence & SQL Analytics",
    "companyName": "Enterprise Business Intelligence & SQL Analytics",
    "description": "Centralized data analytics bureau providing executive KPIs, automated SQL reporting, cohort modeling, and interactive business dashboards.",
    "category": "Data & Analytics",
    "domain": "Business Intelligence",
    "color": "#059669",
    "icon": "BarChart3",
    "nodes": [
      {
        "id": "bi-dir",
        "roleTitle": "Director of Business Intelligence",
        "name": "Head of Corporate Analytics",
        "level": 0,
        "parentId": null,
        "responsibilities": "Own single source of truth for corporate metrics (ARR, CAC, LTV, Churn), lead executive business reviews, and promote data-driven culture.",
        "workflowInstructions": "Direct Lead BI Architect and Senior Product Data Analyst.",
        "delegationPolicy": "auto",
        "color": "#064e3b"
      },
      {
        "id": "bi-arch",
        "roleTitle": "Lead BI Systems Architect",
        "name": "Semantic Data Model Lead",
        "level": 1,
        "parentId": "bi-dir",
        "responsibilities": "Design reusable semantic models, calculate complex enterprise metric calculations (ASC 606 revenue recognition), and govern BI user permissions.",
        "workflowInstructions": "Supervise BI Dashboard Developers on reporting quality.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "bi-dev",
        "roleTitle": "Senior BI Dashboard Developer",
        "name": "Tableau & PowerBI Specialist",
        "level": 2,
        "parentId": "bi-arch",
        "responsibilities": "Create responsive interactive executive dashboards, automate daily PDF email digests, and tune report query caching for sub-3-second load times.",
        "workflowInstructions": "Transform complex multi-table SQL queries into intuitive visual charts.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "bi-prod-analyst",
        "roleTitle": "Senior Product Data Analyst",
        "name": "Cohort & Retention Analyst",
        "level": 1,
        "parentId": "bi-dir",
        "responsibilities": "Perform deep-dive customer retention cohort analysis, track user feature adoption curves, and identify high-value customer behaviors.",
        "workflowInstructions": "Deliver actionable feature recommendations to product managers.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "bi-fin-analyst",
        "roleTitle": "Financial & Revenue Data Analyst",
        "name": "SaaS Metrics & Forecasting Analyst",
        "level": 2,
        "parentId": "bi-prod-analyst",
        "responsibilities": "Analyze customer churn reasons, model net revenue retention (NRR) cohorts, track sales pipeline conversion velocity, and forecast revenue.",
        "workflowInstructions": "Reconcile internal billing telemetry with audited bank statements.",
        "delegationPolicy": "up",
        "color": "#d97706"
      },
      {
        "id": "bi-data-trainer",
        "roleTitle": "Self-Service Analytics Trainer",
        "name": "Data Literacy & Enablement Lead",
        "level": 2,
        "parentId": "bi-arch",
        "responsibilities": "Host internal SQL workshops, maintain internal metric dictionaries, and coach business teams on building their own ad-hoc queries safely.",
        "workflowInstructions": "Empower non-technical departments while preserving semantic data consistency.",
        "delegationPolicy": "up",
        "color": "#6366f1"
      }
    ]
  },
  {
    "id": "chain-data-science-predictive-models",
    "name": "Predictive Data Science & Churn Modeling",
    "companyName": "Predictive Data Science & Churn Modeling",
    "description": "Applied data science squad training predictive customer lifetime value (LTV) models, churn early-warning alarms, and recommendation engines.",
    "category": "Data & Analytics",
    "domain": "Predictive Analytics",
    "color": "#d97706",
    "icon": "TrendingUp",
    "nodes": [
      {
        "id": "ds-head",
        "roleTitle": "Chief Data Scientist",
        "name": "Director of Applied Machine Learning",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead predictive data science roadmap, model ROI accountability, algorithmic fairness, and cross-department deployment.",
        "workflowInstructions": "Direct Lead Predictive Modeler and Personalization Algorithms Lead.",
        "delegationPolicy": "auto",
        "color": "#78350f"
      },
      {
        "id": "ds-model-lead",
        "roleTitle": "Lead Predictive Modeler",
        "name": "Churn & Lifetime Value (LTV) Lead",
        "level": 1,
        "parentId": "ds-head",
        "responsibilities": "Develop gradient-boosted decision tree models (XGBoost/LightGBM) predicting customer churn 60 days before contract expiration.",
        "workflowInstructions": "Supervise Feature Engineering Specialist and Model Deployment Engineer.",
        "delegationPolicy": "both",
        "color": "#b45309"
      },
      {
        "id": "ds-feat-eng",
        "roleTitle": "Feature Engineering Specialist",
        "name": "Customer Behavioral Signals Lead",
        "level": 2,
        "parentId": "ds-model-lead",
        "responsibilities": "Extract high-signal behavioral features (login frequency decline, ticket escalation count, unused seats) from raw event streams.",
        "workflowInstructions": "Maintain clean, reproducible training matrices with zero data leakage.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "ds-deploy-dev",
        "roleTitle": "Model Deployment Engineer",
        "name": "Production Scoring API Developer",
        "level": 2,
        "parentId": "ds-model-lead",
        "responsibilities": "Deploy real-time customer risk scoring microservices, streaming daily customer churn risk scores directly into Salesforce CRM.",
        "workflowInstructions": "Ensure sub-50ms API response times for online customer risk lookups.",
        "delegationPolicy": "both",
        "color": "#f59e0b"
      },
      {
        "id": "ds-rec-lead",
        "roleTitle": "Personalization & Recommendation Lead",
        "name": "Collaborative Filtering Specialist",
        "level": 1,
        "parentId": "ds-head",
        "responsibilities": "Build personalized product recommendation engines (two-tower neural networks, matrix factorization) to increase customer basket size.",
        "workflowInstructions": "A/B test recommendation algorithms in live production against baseline popularity ranks.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "ds-causal-analyst",
        "roleTitle": "Causal Inference & Uplift Analyst",
        "name": "Econometrics & Incrementality Lead",
        "level": 2,
        "parentId": "ds-rec-lead",
        "responsibilities": "Execute causal uplift modeling and synthetic control experiments to measure genuine incrementality of marketing campaigns.",
        "workflowInstructions": "Distinguish true promotional causation from customer organic intent.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "ds-ethics-auditor",
        "roleTitle": "Algorithm Ethics & Fair Lending Auditor",
        "name": "Model Bias Verification Specialist",
        "level": 2,
        "parentId": "ds-head",
        "responsibilities": "Audit predictive models for protected demographic bias, disparate impact, and model explainability (SHAP values).",
        "workflowInstructions": "Ensure compliance with Fair Housing / Equal Credit Opportunity regulations.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      }
    ]
  },
  {
    "id": "chain-real-time-streaming-analytics",
    "name": "Real-Time Event Streaming & Kafka Analytics",
    "companyName": "Real-Time Event Streaming & Kafka Analytics",
    "description": "High-throughput event streaming division processing millions of events per second with Apache Kafka, Apache Flink, and real-time dashboards.",
    "category": "Data & Analytics",
    "domain": "Stream Processing",
    "color": "#0891b2",
    "icon": "Radio",
    "nodes": [
      {
        "id": "stream-arch",
        "roleTitle": "Real-Time Streaming Systems Architect",
        "name": "Principal Event Streaming Architect",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead enterprise event-driven architecture, zero-message-loss guarantees, end-to-end stream latency budgets (< 100ms), and Kafka cluster scaling.",
        "workflowInstructions": "Direct Kafka Cluster Lead and Flink Stream Processing Lead.",
        "delegationPolicy": "auto",
        "color": "#0e7490"
      },
      {
        "id": "stream-kafka-lead",
        "roleTitle": "Kafka Cluster Operations Lead",
        "name": "Distributed Message Broker Specialist",
        "level": 1,
        "parentId": "stream-arch",
        "responsibilities": "Manage multi-broker Apache Kafka / Confluent clusters, partition rebalancing, topic retention policies, and schema registry contracts (Avro/Protobuf).",
        "workflowInstructions": "Supervise Kafka Systems Engineer on broker reliability.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "stream-kafka-eng",
        "roleTitle": "Kafka Systems Engineer",
        "name": "Broker Performance & Storage Specialist",
        "level": 2,
        "parentId": "stream-kafka-lead",
        "responsibilities": "Tune Kafka broker JVM heap, manage tiered storage to S3, optimize consumer group rebalances, and resolve partition consumer lag.",
        "workflowInstructions": "Ensure zero broker out-of-disk crashes during unexpected traffic surges.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "stream-flink-lead",
        "roleTitle": "Flink Stream Processing Lead",
        "name": "Stateful Stream Computing Specialist",
        "level": 1,
        "parentId": "stream-arch",
        "responsibilities": "Build stateful stream processing applications using Apache Flink / Spark Streaming, tumbling/sliding time window aggregations, and watermarks.",
        "workflowInstructions": "Supervise Stream Processing Developer on exactly-once processing semantics.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "stream-flink-dev",
        "roleTitle": "Stream Processing Developer",
        "name": "Real-Time Event Analytics Developer",
        "level": 2,
        "parentId": "stream-flink-lead",
        "responsibilities": "Implement real-time fraud detection rules, live session counting, and streaming aggregations with RocksDB state backend checkpointing.",
        "workflowInstructions": "Ensure stateful stream applications recover seamlessly from node failures.",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "stream-store-dev",
        "roleTitle": "Real-Time OLAP Database Engineer",
        "name": "ClickHouse / Apache Pinot Specialist",
        "level": 2,
        "parentId": "stream-arch",
        "responsibilities": "Manage real-time analytical databases (ClickHouse / StarRocks) ingesting 500,000 rows/second directly from Kafka topics.",
        "workflowInstructions": "Optimize columnar indexing to serve sub-50ms analytical queries to user dashboards.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "stream-mon-spec",
        "roleTitle": "Stream Telemetry & Lag Monitoring Specialist",
        "name": "Consumer Lag & End-to-End Tracing",
        "level": 2,
        "parentId": "stream-kafka-lead",
        "responsibilities": "Monitor real-time consumer lag metrics in Prometheus, alert on poisoned dead-letter messages, and track end-to-end event transit latency.",
        "workflowInstructions": "Ensure zero silent message drops across all event streaming pipelines.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-fintech-neobank-core",
    "name": "Neo-Bank Core Financial Platform",
    "companyName": "Neo-Bank Core Financial Platform",
    "description": "Modern digital banking engineering org operating double-entry general ledgers, virtual card issuance, ACH/wire rails, and AML compliance.",
    "category": "FinTech & Web3",
    "domain": "Digital Banking",
    "color": "#1e3a8a",
    "icon": "Landmark",
    "nodes": [
      {
        "id": "neo-cto",
        "roleTitle": "Chief Technology Officer - Banking",
        "name": "Head of Core Financial Engineering",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead financial ledger integrity, central bank regulatory standing, PCI-DSS Level 1 compliance, and 99.999% core banking availability.",
        "workflowInstructions": "Direct Core Ledger Architect, Payments Gateway Lead, and Head of Financial Crime Technology.",
        "delegationPolicy": "auto",
        "color": "#1e3a8a"
      },
      {
        "id": "neo-ledger-arch",
        "roleTitle": "Core Banking Ledger Architect",
        "name": "Double-Entry Ledger Specialist",
        "level": 1,
        "parentId": "neo-cto",
        "responsibilities": "Design immutable double-entry accounting ledger engine, sub-millisecond balance checks, ACID transactional locks, and multi-currency balances.",
        "workflowInstructions": "Supervise Senior Ledger Developer on audit trails.",
        "delegationPolicy": "both",
        "color": "#2563eb"
      },
      {
        "id": "neo-ledger-dev",
        "roleTitle": "Senior Ledger Developer",
        "name": "Immutable Ledger Engineer",
        "level": 2,
        "parentId": "neo-ledger-arch",
        "responsibilities": "Implement high-concurrency balance updates with optimistic concurrency locks, write automated ledger balance invariant tests, and prevent overdrafts.",
        "workflowInstructions": "Ensure debits and credits balance to the exact cent across millions of transactions.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "neo-card-lead",
        "roleTitle": "Card Issuing & Processing Lead",
        "name": "Visa / Mastercard Integration Specialist",
        "level": 1,
        "parentId": "neo-cto",
        "responsibilities": "Manage real-time authorization engine with card networks (Visa DPS / Marqeta), card tokenization (Apple Pay/Google Pay), and PIN encryption.",
        "workflowInstructions": "Supervise Card Authorization Developer on sub-500ms ISO 8583 message parsing.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "neo-card-dev",
        "roleTitle": "Card Authorization Developer",
        "name": "ISO 8583 / Card Rails Engineer",
        "level": 2,
        "parentId": "neo-card-lead",
        "responsibilities": "Process real-time card authorization requests, check merchant category codes (MCC), apply fraud rules, and approve/decline in under 200ms.",
        "workflowInstructions": "Maintain 100% authorization uptime during Black Friday shopping peaks.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "neo-rails-lead",
        "roleTitle": "Payment Rails Integration Lead",
        "name": "ACH, FedNow & Wire Specialist",
        "level": 1,
        "parentId": "neo-cto",
        "responsibilities": "Manage banking payment clearing rails: NACHA ACH file batch generation, FedNow instant rails, and SWIFT wire integrations.",
        "workflowInstructions": "Ensure strict compliance with Federal Reserve payment clearing windows.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "neo-aml-lead",
        "roleTitle": "Head of Financial Crime Technology",
        "name": "AML & Sanctions Screening Lead",
        "level": 1,
        "parentId": "neo-cto",
        "responsibilities": "Implement automated anti-money laundering (AML) transaction monitoring, OFAC sanctions list screening, and suspicious activity reports (SARs).",
        "workflowInstructions": "Direct Fraud Detection Engineer to block illicit money flows.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "neo-fraud-eng",
        "roleTitle": "Real-Time Fraud Detection Engineer",
        "name": "Financial Risk Rules Specialist",
        "level": 2,
        "parentId": "neo-aml-lead",
        "responsibilities": "Deploy real-time transaction scoring rules detecting velocity anomalies, card-testing attacks, and rapid account drains.",
        "workflowInstructions": "Trigger automated step-up biometric verification when risk scores spike.",
        "delegationPolicy": "both",
        "color": "#ea580c"
      },
      {
        "id": "neo-kyc-spec",
        "roleTitle": "KYC & Identity Verification Lead",
        "name": "Customer Identity Onboarding Specialist",
        "level": 2,
        "parentId": "neo-aml-lead",
        "responsibilities": "Automate customer identity verification (CIP/KYC), document liveness checks, and credit bureau lookups for new bank account signups.",
        "workflowInstructions": "Maintain 90%+ automated onboarding pass rate while stopping identity theft.",
        "delegationPolicy": "up",
        "color": "#d97706"
      },
      {
        "id": "neo-reconcile-eng",
        "roleTitle": "Financial Reconciliation Engineer",
        "name": "Daily Settlement & Clearing Specialist",
        "level": 2,
        "parentId": "neo-ledger-arch",
        "responsibilities": "Automate daily three-way financial reconciliation between internal ledgers, partner sponsor banks, and card network clearing files.",
        "workflowInstructions": "Flag settlement discrepancies immediately for operational review.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "neo-sec-off",
        "roleTitle": "PCI-DSS Security Officer",
        "name": "Financial Security & HSM Compliance",
        "level": 2,
        "parentId": "neo-cto",
        "responsibilities": "Enforce PCI-DSS Level 1 security controls, manage Hardware Security Modules (HSM) for PIN translation, and conduct penetration tests.",
        "workflowInstructions": "Certify annual Attestation of Compliance (AoC) for the banking platform.",
        "delegationPolicy": "up",
        "color": "#7c3aed"
      },
      {
        "id": "neo-mobile-dev",
        "roleTitle": "Banking App Mobile Lead",
        "name": "Secure Fintech Mobile Architect",
        "level": 2,
        "parentId": "neo-card-lead",
        "responsibilities": "Build native iOS/Android banking apps with biometric FaceID login, virtual card reveal with dynamic CVV, and instant transaction notifications.",
        "workflowInstructions": "Implement app-level certificate pinning and anti-tamper jailbreak detection.",
        "delegationPolicy": "up",
        "color": "#059669"
      }
    ]
  },
  {
    "id": "chain-payment-processing-gateway",
    "name": "Global Payment Gateway & Acquiring Engine",
    "companyName": "Global Payment Gateway & Acquiring Engine",
    "description": "High-volume online payment processor handling merchant checkout, global card acquiring, currency conversion, and fraud mitigation.",
    "category": "FinTech & Web3",
    "domain": "Payments Platform",
    "color": "#2563eb",
    "icon": "CreditCard",
    "nodes": [
      {
        "id": "pay-vp",
        "roleTitle": "VP of Payments Engineering",
        "name": "Global Payments Platform Head",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead payment authorization success rates (> 97%), interchange fee optimization, multi-currency settlement, and global card brand certifications.",
        "workflowInstructions": "Direct Payment Gateway Architect and Merchant Acquiring Lead.",
        "delegationPolicy": "auto",
        "color": "#1e40af"
      },
      {
        "id": "pay-gw-arch",
        "roleTitle": "Payment Gateway Architect",
        "name": "High-Concurrency Checkout Lead",
        "level": 1,
        "parentId": "pay-vp",
        "responsibilities": "Design resilient idempotent payment processing APIs, automated retries with smart routing across multiple acquirers, and card vault tokenization.",
        "workflowInstructions": "Supervise Gateway Core Developer on checkout reliability.",
        "delegationPolicy": "both",
        "color": "#2563eb"
      },
      {
        "id": "pay-gw-dev",
        "roleTitle": "Senior Gateway Core Developer",
        "name": "API & Webhook Engineer",
        "level": 2,
        "parentId": "pay-gw-arch",
        "responsibilities": "Implement payment intent state machines, 3D Secure 2.0 (3DS2) frictionless challenge flows, and webhook workers with exponential backoff.",
        "workflowInstructions": "Ensure sub-second payment confirmation and rock-solid idempotency.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "pay-vault-eng",
        "roleTitle": "Card Tokenization & Vault Engineer",
        "name": "PCI Level 1 Tokenization Specialist",
        "level": 2,
        "parentId": "pay-gw-arch",
        "responsibilities": "Maintain encrypted card data tokenization vault isolated from core infrastructure, generating non-sensitive tokens for merchant apps.",
        "workflowInstructions": "Enforce envelope encryption with AWS KMS and hardware security modules.",
        "delegationPolicy": "both",
        "color": "#7c3aed"
      },
      {
        "id": "pay-acq-lead",
        "roleTitle": "Merchant Acquiring & Network Lead",
        "name": "Card Network Protocol Specialist",
        "level": 1,
        "parentId": "pay-vp",
        "responsibilities": "Direct integration links to global payment acquirers, local payment methods (iDEAL, Pix, UPI), and direct card scheme connections.",
        "workflowInstructions": "Supervise Smart Routing Engineer on cost and authorization optimization.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "pay-route-eng",
        "roleTitle": "Smart Payment Routing Engineer",
        "name": "Interchange & Authorization Optimizer",
        "level": 2,
        "parentId": "pay-acq-lead",
        "responsibilities": "Build dynamic routing algorithms directing each card transaction to the acquirer with the highest historical approval rate and lowest fees.",
        "workflowInstructions": "Reroute failed transactions automatically to secondary acquirers within milliseconds.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "pay-settle-spec",
        "roleTitle": "Settlement & Currency Exchange Specialist",
        "name": "Multi-Currency Treasury Engineer",
        "level": 1,
        "parentId": "pay-vp",
        "responsibilities": "Manage multi-currency FX conversions, merchant payout batching via local bank transfers, and fee deduction calculations.",
        "workflowInstructions": "Ensure merchants receive accurate daily net payouts into their bank accounts.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "pay-fraud-lead",
        "roleTitle": "Payments Risk & Fraud Lead",
        "name": "Stripe Radar / Machine Learning Specialist",
        "level": 1,
        "parentId": "pay-vp",
        "responsibilities": "Deploy real-time machine learning models predicting card fraud and stolen card testing attacks before authorization submission.",
        "workflowInstructions": "Minimize merchant dispute rates (< 0.5%) to avoid card brand monitoring programs.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "pay-pci-auditor",
        "roleTitle": "PCI Compliance & Security Auditor",
        "name": "QSA Audit & Governance Specialist",
        "level": 2,
        "parentId": "pay-vp",
        "responsibilities": "Conduct continuous audits of network segmentation around cardholder data environment (CDE), quarterly ASV vulnerability scans.",
        "workflowInstructions": "Maintain the platform's PCI-DSS Level 1 certification status.",
        "delegationPolicy": "up",
        "color": "#991b1b"
      },
      {
        "id": "pay-sdk-dev",
        "roleTitle": "Checkout SDK Developer",
        "name": "Frontend Elements & Drop-In UI Specialist",
        "level": 2,
        "parentId": "pay-gw-arch",
        "responsibilities": "Build embeddable JavaScript / React checkout widgets (Elements) with client-side card field tokenization and autofocus formatting.",
        "workflowInstructions": "Ensure frictionless checkout conversions on mobile browsers.",
        "delegationPolicy": "up",
        "color": "#d97706"
      },
      {
        "id": "pay-dispute-eng",
        "roleTitle": "Dispute & Chargeback Automation Engineer",
        "name": "Network Representment Specialist",
        "level": 2,
        "parentId": "pay-settle-spec",
        "responsibilities": "Automate digital chargeback evidence submission to card networks (Visa Claims Resolution / Mastercard MasterCom).",
        "workflowInstructions": "Help merchants win back illegitimate friendly fraud chargebacks.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-algorithmic-high-frequency-trading",
    "name": "Algorithmic Quantitative & High-Frequency Trading",
    "companyName": "Algorithmic Quantitative & High-Frequency Trading",
    "description": "Proprietary quantitative trading firm operating ultra-low-latency market data feeds, custom FPGA execution, and algorithmic alpha strategies.",
    "category": "FinTech & Web3",
    "domain": "Quantitative Trading",
    "color": "#059669",
    "icon": "TrendingUp",
    "nodes": [
      {
        "id": "hft-head",
        "roleTitle": "Head of Quantitative Trading",
        "name": "Chief Investment & Trading Officer",
        "level": 0,
        "parentId": null,
        "responsibilities": "Oversee firm risk parameters, Sharpe ratio performance, capital allocation across trading desks, and exchange co-location facilities.",
        "workflowInstructions": "Direct Chief Risk Officer, Lead Quant Researcher, and Ultra-Low-Latency Engineering Lead.",
        "delegationPolicy": "auto",
        "color": "#064e3b"
      },
      {
        "id": "hft-cro",
        "roleTitle": "Chief Risk Officer",
        "name": "Real-Time Trading Risk Lead",
        "level": 1,
        "parentId": "hft-head",
        "responsibilities": "Enforce real-time position limits, maximum drawdown kill-switches, VaR calculations, and regulatory market manipulation compliance.",
        "workflowInstructions": "Supervise Risk Monitor Engineer on automated circuit breakers.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "hft-kill-eng",
        "roleTitle": "Kill-Switch & Risk Systems Engineer",
        "name": "Sub-Millisecond Risk Check Specialist",
        "level": 2,
        "parentId": "hft-cro",
        "responsibilities": "Implement hardware-level pre-trade risk checks that inspect every outbound order for price collar and fat-finger errors in under 20 nanoseconds.",
        "workflowInstructions": "Automatically cancel open orders if market volatility breaches defined thresholds.",
        "delegationPolicy": "up",
        "color": "#ef4444"
      },
      {
        "id": "hft-quant-lead",
        "roleTitle": "Lead Quantitative Researcher",
        "name": "Alpha Strategy & Statistical Arbitrage Head",
        "level": 1,
        "parentId": "hft-head",
        "responsibilities": "Formulate quantitative statistical arbitrage models, order book imbalance predictors, and cross-asset momentum algorithms.",
        "workflowInstructions": "Supervise Quantitative Researchers on backtesting simulations.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "hft-quant-res",
        "roleTitle": "Quantitative Researcher",
        "name": "Machine Learning & Backtesting Specialist",
        "level": 2,
        "parentId": "hft-quant-lead",
        "responsibilities": "Analyze tick-level historical order book data (Level 3 LOB), backtest execution algorithms against realistic slippage models, and optimize parameters.",
        "workflowInstructions": "Deliver profitable, high-Sharpe trading signals to execution engineers.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "hft-tech-lead",
        "roleTitle": "Ultra-Low-Latency Engineering Lead",
        "name": "C++ Systems & FPGA Architect",
        "level": 1,
        "parentId": "hft-head",
        "responsibilities": "Lead high-frequency trading technology: kernel-bypass networking (Solarflare OpenOnload), cache-line optimization, and FPGA hardware acceleration.",
        "workflowInstructions": "Supervise Low-Latency C++ Developers and FPGA Engineers.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "hft-cpp-dev",
        "roleTitle": "Senior Low-Latency C++ Developer",
        "name": "Modern C++20 Core Systems Specialist",
        "level": 2,
        "parentId": "hft-tech-lead",
        "responsibilities": "Write zero-allocation C++ trading execution engines using lock-free ring buffers, cache-friendly memory layouts, and CPU core pinning.",
        "workflowInstructions": "Achieve sub-microsecond tick-to-trade order turnaround time.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "hft-fpga-eng",
        "roleTitle": "FPGA Hardware Acceleration Engineer",
        "name": "Verilog / VHDL High-Speed Logic Specialist",
        "level": 2,
        "parentId": "hft-tech-lead",
        "responsibilities": "Program custom FPGA network cards that parse exchange market data packets and generate order execution packets directly in hardware logic.",
        "workflowInstructions": "Achieve nanosecond-level packet processing speeds bypassing host operating system kernels.",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "hft-feed-eng",
        "roleTitle": "Market Data Feed Handler Engineer",
        "name": "ITCH / OUCH Protocol Specialist",
        "level": 2,
        "parentId": "hft-tech-lead",
        "responsibilities": "Maintain direct fiber connectivity to exchange matching engines (NASDAQ, CME, Eurex), parsing binary multicast market data feeds.",
        "workflowInstructions": "Handle packet re-assembly and reconstruct full depth-of-book order books.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "hft-colo-spec",
        "roleTitle": "Co-Location & Network Infrastructure Specialist",
        "name": "Microwave & Fiber Transit Lead",
        "level": 2,
        "parentId": "hft-tech-lead",
        "responsibilities": "Manage physical server racks co-located inside financial exchange datacenters (Equinix NY4, LD4), microwave wireless links, and PTP clock sync.",
        "workflowInstructions": "Ensure nanosecond-level GPS time synchronization (IEEE 1588 PTP) across trading servers.",
        "delegationPolicy": "up",
        "color": "#d97706"
      },
      {
        "id": "hft-post-trade",
        "roleTitle": "Post-Trade Analytics & TCA Specialist",
        "name": "Transaction Cost Analysis (TCA) Lead",
        "level": 2,
        "parentId": "hft-quant-lead",
        "responsibilities": "Analyze execution slippage against arrival price, measure exchange queue position capture, and calculate effective exchange rebates.",
        "workflowInstructions": "Provide continuous optimization feedback to quantitative execution algorithms.",
        "delegationPolicy": "up",
        "color": "#7c3aed"
      }
    ]
  },
  {
    "id": "chain-defi-protocol-web3",
    "name": "Decentralized Finance (DeFi) & Smart Contracts",
    "companyName": "Decentralized Finance (DeFi) & Smart Contracts",
    "description": "Web3 engineering organization building automated market maker (AMM) liquidity pools, collateralized lending protocols, and audited smart contracts.",
    "category": "FinTech & Web3",
    "domain": "DeFi & Web3",
    "color": "#7c3aed",
    "icon": "Coins",
    "nodes": [
      {
        "id": "defi-arch",
        "roleTitle": "Protocol Lead & Chief Architect",
        "name": "DeFi Mechanism Design Architect",
        "level": 0,
        "parentId": null,
        "responsibilities": "Design protocol tokenomics, automated market maker (AMM) bonding curves, collateral liquidation mechanisms, and decentralized governance (DAO).",
        "workflowInstructions": "Direct Lead Solidity Developer and Smart Contract Security Lead.",
        "delegationPolicy": "auto",
        "color": "#5b21b6"
      },
      {
        "id": "defi-sol-lead",
        "roleTitle": "Lead Solidity / Rust Smart Contract Dev",
        "name": "Core Protocol Developer",
        "level": 1,
        "parentId": "defi-arch",
        "responsibilities": "Write gas-optimized, immutable smart contracts in Solidity / Rust, implement reentrancy guards, and manage multi-sig treasury contracts.",
        "workflowInstructions": "Supervise Smart Contract Developers and write comprehensive Foundry unit tests.",
        "delegationPolicy": "both",
        "color": "#7c3aed"
      },
      {
        "id": "defi-sol-dev",
        "roleTitle": "Smart Contract Developer",
        "name": "Foundry & Hardhat Specialist",
        "level": 2,
        "parentId": "defi-sol-lead",
        "responsibilities": "Implement lending vault contracts, flash loan adapters, and ERC-20 / ERC-4626 yield token standards with extensive property-based invariant fuzzing.",
        "workflowInstructions": "Achieve 100% test branch coverage using Foundry invariant testing.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "defi-sec-lead",
        "roleTitle": "Smart Contract Security Lead",
        "name": "Formal Verification & Audit Specialist",
        "level": 1,
        "parentId": "defi-arch",
        "responsibilities": "Conduct internal security audits hunting for flash loan price manipulation, oracle front-running, rounding errors, and reentrancy exploits.",
        "workflowInstructions": "Coordinate independent external security audits with top firms (CertiK/OpenZeppelin).",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "defi-oracle-spec",
        "roleTitle": "Chainlink & Oracle Integration Specialist",
        "name": "Price Feed & Keeper Automation Engineer",
        "level": 2,
        "parentId": "defi-sec-lead",
        "responsibilities": "Integrate decentralized price oracles (Chainlink/Pyth), implement time-weighted average price (TWAP) fallbacks, and configure automated liquidator bots.",
        "workflowInstructions": "Prevent protocol insolvency during market crashes.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "defi-fe-lead",
        "roleTitle": "Web3 Frontend Tech Lead",
        "name": "Wagmi / Viem / Ethers.js Developer",
        "level": 1,
        "parentId": "defi-arch",
        "responsibilities": "Build decentralized web interfaces connecting to MetaMask, WalletConnect, and Coinbase Wallet, handling transaction signing and gas estimation.",
        "workflowInstructions": "Provide clear transaction simulation previews to prevent user phishing errors.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "defi-indexer",
        "roleTitle": "Subgraphs & Blockchain Indexer Engineer",
        "name": "The Graph / Subsquid Specialist",
        "level": 2,
        "parentId": "defi-fe-lead",
        "responsibilities": "Deploy custom Subgraphs indexing on-chain swap events, user liquidity pool shares, historical yield APRs, and borrow balances into GraphQL APIs.",
        "workflowInstructions": "Ensure instant client-side data updates without lag.",
        "delegationPolicy": "up",
        "color": "#d97706"
      }
    ]
  },
  {
    "id": "chain-crypto-exchange-custody",
    "name": "Institutional Crypto Exchange & Cold Custody",
    "companyName": "Institutional Crypto Exchange & Cold Custody",
    "description": "High-security cryptocurrency exchange platform operating multi-sig cold storage vaults, high-speed order matching engines, and regulatory compliance.",
    "category": "FinTech & Web3",
    "domain": "Crypto Exchange",
    "color": "#f59e0b",
    "icon": "Boxes",
    "nodes": [
      {
        "id": "cex-head",
        "roleTitle": "Head of Crypto Exchange",
        "name": "Chief Executive & Trading Platform Head",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead institutional exchange volume, digital asset custody licensing (NYDFS BitLicense/SOC2), order matching reliability, and fiat on/off ramps.",
        "workflowInstructions": "Direct Matching Engine Architect, Head of Custody Security, and Chief Compliance Officer.",
        "delegationPolicy": "auto",
        "color": "#b45309"
      },
      {
        "id": "cex-match-arch",
        "roleTitle": "Order Matching Engine Architect",
        "name": "High-Throughput Exchange Core Lead",
        "level": 1,
        "parentId": "cex-head",
        "responsibilities": "Build deterministic, ultra-low-latency order matching engine in Go/C++ processing 200,000 orders/second with in-memory order books and journal replay.",
        "workflowInstructions": "Supervise Matching Engine Developer on order sequencing.",
        "delegationPolicy": "both",
        "color": "#f59e0b"
      },
      {
        "id": "cex-match-dev",
        "roleTitle": "Matching Engine Developer",
        "name": "Memory Order Book Specialist",
        "level": 2,
        "parentId": "cex-match-arch",
        "responsibilities": "Implement price-time priority matching logic, market and limit orders, cancel-replace operations, and real-time trade balance settlements.",
        "workflowInstructions": "Ensure zero race conditions during extreme market flash crashes.",
        "delegationPolicy": "both",
        "color": "#fbbf24"
      },
      {
        "id": "cex-custody-lead",
        "roleTitle": "Head of Digital Asset Custody",
        "name": "Cold Storage & Multi-Sig Architect",
        "level": 1,
        "parentId": "cex-head",
        "responsibilities": "Architect institutional multi-party computation (MPC) and air-gapped offline cold storage vaults holding billions in customer digital assets.",
        "workflowInstructions": "Supervise Cold Storage Operations Engineer on key ceremonies.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "cex-cold-eng",
        "roleTitle": "Cold Storage Operations Engineer",
        "name": "Air-Gapped Vault & Key Custodian",
        "level": 2,
        "parentId": "cex-custody-lead",
        "responsibilities": "Execute air-gapped offline transaction signing ceremonies in Faraday-caged physical vaults with multi-executive quorum approval.",
        "workflowInstructions": "Maintain 98%+ of customer assets in offline cold vaults protected against remote theft.",
        "delegationPolicy": "both",
        "color": "#ea580c"
      },
      {
        "id": "cex-hot-eng",
        "roleTitle": "Hot Wallet & Automated Withdrawal Engineer",
        "name": "Blockchain Node & UTXO Specialist",
        "level": 2,
        "parentId": "cex-custody-lead",
        "responsibilities": "Manage automated hot wallet sweepers, Bitcoin UTXO management, Ethereum gas fee estimators, and withdrawal velocity limiters.",
        "workflowInstructions": "Halt hot wallet withdrawals automatically if anomalous outflow velocity is detected.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "cex-node-lead",
        "roleTitle": "Blockchain Nodes Infrastructure Lead",
        "name": "Full Node RPC Cluster Specialist",
        "level": 2,
        "parentId": "cex-custody-lead",
        "responsibilities": "Maintain dedicated full nodes across Bitcoin, Ethereum, Solana, and major L2s, monitoring block reorganization events and mempool health.",
        "workflowInstructions": "Ensure zero RPC downtime for deposit credit confirmations.",
        "delegationPolicy": "up",
        "color": "#0284c7"
      },
      {
        "id": "cex-por-auditor",
        "roleTitle": "Proof of Reserves & Audit Specialist",
        "name": "Merkle Tree Proofs Engineer",
        "level": 1,
        "parentId": "cex-head",
        "responsibilities": "Publish cryptographic Merkle-tree Proof of Reserves (PoR) allowing every individual user to mathematically verify their funds are 100% backed.",
        "workflowInstructions": "Coordinate with independent auditing firms on monthly reserve attestations.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "cex-comp-off",
        "roleTitle": "Chief AML & Compliance Officer",
        "name": "Financial Crime & Sanctions Lead",
        "level": 1,
        "parentId": "cex-head",
        "responsibilities": "Enforce blockchain transaction analytics (Chainalysis/Elliptic), screen incoming crypto deposits against darknet ransomware addresses, and file SARs.",
        "workflowInstructions": "Freeze illicit funds and ensure full compliance with FATF Travel Rule.",
        "delegationPolicy": "both",
        "color": "#991b1b"
      },
      {
        "id": "cex-kyc-spec",
        "roleTitle": "Institutional KYC & Onboarding Specialist",
        "name": "Corporate Due Diligence Analyst",
        "level": 2,
        "parentId": "cex-comp-off",
        "responsibilities": "Perform deep corporate due diligence on hedge funds, family offices, and market makers applying for institutional trading accounts.",
        "workflowInstructions": "Verify ultimate beneficial owners (UBO) and corporate entity structures.",
        "delegationPolicy": "up",
        "color": "#7c3aed"
      },
      {
        "id": "cex-liq-mgr",
        "roleTitle": "Liquidity & Market Maker Manager",
        "name": "Institutional Order Book Depth Lead",
        "level": 2,
        "parentId": "cex-match-arch",
        "responsibilities": "Manage market maker rebate agreements, monitor spread tightness across trading pairs, and ensure deep bid/ask liquidity.",
        "workflowInstructions": "Prevent flash crashes by coordinating designated market maker obligations.",
        "delegationPolicy": "up",
        "color": "#06b6d4"
      },
      {
        "id": "cex-fiat-lead",
        "roleTitle": "Fiat Banking & Payment Rails Lead",
        "name": "Wire & ACH Gateway Specialist",
        "level": 2,
        "parentId": "cex-head",
        "responsibilities": "Manage banking relationships with crypto-friendly sponsor banks, automated wire confirmations, and SEPA/ACH fiat deposit clearing.",
        "workflowInstructions": "Ensure users experience fast, reliable fiat deposits and withdrawals.",
        "delegationPolicy": "up",
        "color": "#059669"
      }
    ]
  },
  {
    "id": "chain-insurtech-digital-underwriting",
    "name": "InsurTech Automated Underwriting & Actuarial",
    "companyName": "InsurTech Automated Underwriting & Actuarial",
    "description": "Next-generation insurance platform automating risk underwriting, actuarial pricing, policy issuance, and instant digital claims payouts.",
    "category": "FinTech & Web3",
    "domain": "InsurTech",
    "color": "#059669",
    "icon": "ShieldCheck",
    "nodes": [
      {
        "id": "ins-head",
        "roleTitle": "VP of InsurTech Engineering",
        "name": "Chief Technology & Underwriting Officer",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead digital insurance platform transformation, combined ratio targets (< 90%), automated policy binding (< 2 mins), and reinsurance compliance.",
        "workflowInstructions": "Direct Head of Automated Underwriting and Chief Actuary.",
        "delegationPolicy": "auto",
        "color": "#064e3b"
      },
      {
        "id": "ins-under-head",
        "roleTitle": "Head of Automated Underwriting",
        "name": "Algorithmic Risk Underwriting Lead",
        "level": 1,
        "parentId": "ins-head",
        "responsibilities": "Design automated underwriting rules engines, third-party data enrichment (credit, property history, telematics), and instant quote generation.",
        "workflowInstructions": "Supervise Underwriting Rules Developer.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "ins-under-dev",
        "roleTitle": "Underwriting Rules Developer",
        "name": "Decision Engine & Rule-Based Specialist",
        "level": 2,
        "parentId": "ins-under-head",
        "responsibilities": "Implement automated risk decision trees, API integrations with motor vehicle records (MVR) and property databases, and instant policy generation.",
        "workflowInstructions": "Automate instant approval for 80%+ of standard applicants.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "ins-actuary",
        "roleTitle": "Chief Actuary & Risk Modeler",
        "name": "Actuarial Science & Loss Ratio Lead",
        "level": 1,
        "parentId": "ins-head",
        "responsibilities": "Calculate loss cost reserves, catastrophe risk models, policy pricing elasticity tables, and file rate filings with state insurance commissioners.",
        "workflowInstructions": "Direct Actuarial Data Scientist on loss prediction models.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "ins-act-sci",
        "roleTitle": "Actuarial Data Scientist",
        "name": "Predictive Loss & Catastrophe Modeler",
        "level": 2,
        "parentId": "ins-actuary",
        "responsibilities": "Train machine learning models on decades of claim histories, climate risk maps, and demographic factors to price insurance policies with high precision.",
        "workflowInstructions": "Provide predictive loss projections to support profitable underwriting.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "ins-claims-head",
        "roleTitle": "Director of Digital Claims",
        "name": "Automated Claims Payout Lead",
        "level": 1,
        "parentId": "ins-head",
        "responsibilities": "Oversee mobile photo claim estimations, automated fraud screening, repair network dispatch, and instant digital payout rails.",
        "workflowInstructions": "Supervise Claims Automation Engineer.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "ins-claims-dev",
        "roleTitle": "Claims Automation Engineer",
        "name": "Computer Vision Damage Estimator",
        "level": 2,
        "parentId": "ins-claims-head",
        "responsibilities": "Build computer vision models analyzing customer damage photos (vehicle dents, cracked roofs) to generate instant repair cost estimates.",
        "workflowInstructions": "Trigger automated instant ACH claim payments for low-complexity verified claims.",
        "delegationPolicy": "both",
        "color": "#f59e0b"
      },
      {
        "id": "ins-reinsure-spec",
        "roleTitle": "Reinsurance & Compliance Specialist",
        "name": "Treaty Reporting & Regulatory Officer",
        "level": 2,
        "parentId": "ins-head",
        "responsibilities": "Manage treaty quota share reporting with global reinsurers (Munich Re/Swiss Re), calculate ceding commissions, and audit statutory surplus reserves.",
        "workflowInstructions": "Ensure company balance sheet solvency under catastrophic multi-claim events.",
        "delegationPolicy": "up",
        "color": "#7c3aed"
      }
    ]
  },
  {
    "id": "chain-wealthtech-robo-advisor",
    "name": "WealthTech Robo-Advisory & Portfolio Platform",
    "companyName": "WealthTech Robo-Advisory & Portfolio Platform",
    "description": "Automated digital wealth management firm executing algorithm-driven asset allocation, tax-loss harvesting, fractional share trading, and retirement plans.",
    "category": "FinTech & Web3",
    "domain": "WealthTech",
    "color": "#0891b2",
    "icon": "Coins",
    "nodes": [
      {
        "id": "wtech-cio",
        "roleTitle": "Chief Investment & Technology Officer",
        "name": "Head of Digital Wealth Solutions",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead algorithmic asset management, Modern Portfolio Theory (MPT) implementation, SEC/FINRA fiduciary compliance, and assets under management (AUM).",
        "workflowInstructions": "Direct Portfolio Algorithm Lead and Brokerage Integrations Architect.",
        "delegationPolicy": "auto",
        "color": "#0e7490"
      },
      {
        "id": "wtech-algo-lead",
        "roleTitle": "Portfolio Algorithms Lead",
        "name": "Automated Rebalancing Architect",
        "level": 1,
        "parentId": "wtech-cio",
        "responsibilities": "Design automated drift-based rebalancing algorithms, glide-path retirement portfolios, and daily automated tax-loss harvesting (TLH).",
        "workflowInstructions": "Supervise Portfolio Rebalancing Developer.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "wtech-rebal-dev",
        "roleTitle": "Portfolio Rebalancing Developer",
        "name": "Tax-Loss Harvesting Engineer",
        "level": 2,
        "parentId": "wtech-algo-lead",
        "responsibilities": "Implement algorithmic trade generation scanning thousands of user accounts daily, identifying tax-loss opportunities while avoiding IRS wash sales.",
        "workflowInstructions": "Generate batched fractional-share orders for market execution.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "wtech-brok-arch",
        "roleTitle": "Brokerage Integrations Architect",
        "name": "Clearing Broker & FIX Protocol Specialist",
        "level": 1,
        "parentId": "wtech-cio",
        "responsibilities": "Manage integrations with clearing brokerages (Apex Clearing / DriveWealth) using FIX protocol for fractional share execution and custody.",
        "workflowInstructions": "Supervise Fractional Trading Engineer.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "wtech-frac-dev",
        "roleTitle": "Fractional Trading & Settlement Engineer",
        "name": "Order Execution & Custody Specialist",
        "level": 2,
        "parentId": "wtech-brok-arch",
        "responsibilities": "Execute batched market orders, reconcile fractional share holdings down to 8 decimal places, and process dividend reinvestment (DRIP).",
        "workflowInstructions": "Ensure 100% daily share settlement accuracy with the clearing custodian.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "wtech-fin-plan",
        "roleTitle": "Digital Financial Planning Lead",
        "name": "Goals & Monte Carlo Simulation Specialist",
        "level": 2,
        "parentId": "wtech-algo-lead",
        "responsibilities": "Build Monte Carlo simulation engines calculating probability of retirement success across millions of randomized market scenarios.",
        "workflowInstructions": "Power interactive customer goal-setting and savings trajectory graphs.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "wtech-comp-off",
        "roleTitle": "Fiduciary Compliance Officer",
        "name": "SEC RIA & Fiduciary Compliance Lead",
        "level": 1,
        "parentId": "wtech-cio",
        "responsibilities": "Ensure algorithms adhere to fiduciary best-interest standards, file Form ADV documentation, and audit automated suitability questionnaires.",
        "workflowInstructions": "Protect customer financial wellbeing and maintain regulatory clearance.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      }
    ]
  },
  {
    "id": "chain-embedded-fintech-lending",
    "name": "Embedded Lending & Working Capital Platform",
    "companyName": "Embedded Lending & Working Capital Platform",
    "description": "B2B embedded lending platform delivering instant merchant cash advances, payroll-backed loans, automated credit scoring, and debt facility syndication.",
    "category": "FinTech & Web3",
    "domain": "Lending Platform",
    "color": "#059669",
    "icon": "Banknote",
    "nodes": [
      {
        "id": "lend-head",
        "roleTitle": "Head of Embedded Lending",
        "name": "VP Credit Products & Platform",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead loan origination volume, credit facility leverage, portfolio default rates (< 2%), and platform partner distribution deals.",
        "workflowInstructions": "Direct Credit Risk Modeling Lead, Loan Servicing Lead, and Capital Markets Manager.",
        "delegationPolicy": "auto",
        "color": "#064e3b"
      },
      {
        "id": "lend-risk-lead",
        "roleTitle": "Credit Risk Modeling Lead",
        "name": "Cash Flow Underwriting Architect",
        "level": 1,
        "parentId": "lend-head",
        "responsibilities": "Design real-time cash flow underwriting models analyzing merchant bank feeds (Plaid) and e-commerce sales history (Stripe/Shopify).",
        "workflowInstructions": "Supervise Credit Scoring Engineer.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "lend-score-eng",
        "roleTitle": "Credit Scoring & Underwriting Engineer",
        "name": "Instant Offer Generation Specialist",
        "level": 2,
        "parentId": "lend-risk-lead",
        "responsibilities": "Implement automated credit decisioning APIs: pull Plaid banking transactions, calculate average daily balance and revenue volatility, and generate loan offers.",
        "workflowInstructions": "Issue automated binding loan offers in under 30 seconds.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "lend-serv-lead",
        "roleTitle": "Loan Servicing & Repayment Lead",
        "name": "Automated Collection & Split Lead",
        "level": 1,
        "parentId": "lend-head",
        "responsibilities": "Manage loan servicing infrastructure: automated split payments deducting a percentage of daily merchant credit card sales until the advance is repaid.",
        "workflowInstructions": "Supervise Repayment Automation Developer.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "lend-repay-dev",
        "roleTitle": "Repayment Automation Developer",
        "name": "ACH Sweep & Daily Split Engineer",
        "level": 2,
        "parentId": "lend-serv-lead",
        "responsibilities": "Configure automated daily ACH split collections, track principal vs interest ledger breakdowns, and calculate early payoff discounts.",
        "workflowInstructions": "Maintain zero reconciliation discrepancies between loan ledgers and bank accounts.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "lend-cap-mgr",
        "roleTitle": "Capital Markets & Warehouse Facility Manager",
        "name": "Debt Facility & Investor Relations Lead",
        "level": 1,
        "parentId": "lend-head",
        "responsibilities": "Manage multi-million dollar warehouse credit facilities from institutional debt funds, track borrowing base formulas, and report covenants.",
        "workflowInstructions": "Ensure adequate loan capital availability to fund surging borrower demand.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "lend-partner-eng",
        "roleTitle": "Embedded Partner Integration Engineer",
        "name": "SDK & Embedded White-Label Lead",
        "level": 2,
        "parentId": "lend-head",
        "responsibilities": "Build white-label embedded lending widgets for SaaS platforms, allowing vertical SaaS companies to offer loans directly in their dashboards.",
        "workflowInstructions": "Provide turnkey drop-in lending components that maximize partner conversion.",
        "delegationPolicy": "up",
        "color": "#6366f1"
      },
      {
        "id": "lend-delinq-spec",
        "roleTitle": "Collections & Loss Recovery Specialist",
        "name": "Workout & Recovery Lead",
        "level": 2,
        "parentId": "lend-serv-lead",
        "responsibilities": "Monitor delinquent accounts, restructure repayment terms for struggling merchants, and coordinate recovery efforts on defaulted advances.",
        "workflowInstructions": "Minimize final net loss write-offs for the lending portfolio.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      }
    ]
  },
  {
    "id": "chain-global-it-consulting-firm",
    "name": "Global IT Systems Integrator & Consulting",
    "companyName": "Global IT Systems Integrator & Consulting",
    "description": "Enterprise IT consulting and systems integration practice (Accenture/Infosys style) delivering large-scale digital transformations, solution architecture, and offshore delivery.",
    "category": "IT Services",
    "domain": "IT Consulting",
    "color": "#2563eb",
    "icon": "Building2",
    "nodes": [
      {
        "id": "gcon-md",
        "roleTitle": "Managing Director & Practice Head",
        "name": "Senior Partner & Practice Leader",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead practice P&L ($50M+ annual billings), executive client C-suite relationships, strategic multi-year digital transformation contracts, and talent retention.",
        "workflowInstructions": "Direct Client Engagement Directors and Chief Solution Architect.",
        "delegationPolicy": "auto",
        "color": "#1e40af"
      },
      {
        "id": "gcon-eng-dir",
        "roleTitle": "Client Engagement Director",
        "name": "Client Account Delivery Partner",
        "level": 1,
        "parentId": "gcon-md",
        "responsibilities": "Oversee multi-project delivery portfolio, client governance committees, statement of work (SOW) milestone billings, and cross-functional team staffing.",
        "workflowInstructions": "Supervise Senior Technical Project Managers and Delivery Managers.",
        "delegationPolicy": "auto",
        "color": "#2563eb"
      },
      {
        "id": "gcon-csa",
        "roleTitle": "Chief Enterprise Solution Architect",
        "name": "Principal Advisory Architect",
        "level": 1,
        "parentId": "gcon-md",
        "responsibilities": "Architect multi-system enterprise integrations (SAP, Salesforce, AWS, legacy mainframes), review technical feasibility, and present to client CIOs.",
        "workflowInstructions": "Direct Domain Solution Architects and Technical Leads.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "gcon-pm",
        "roleTitle": "Senior Technical Project Manager",
        "name": "Agile Delivery & Scrum Master",
        "level": 2,
        "parentId": "gcon-eng-dir",
        "responsibilities": "Manage daily project sprints, burndown charts, client status reports, change request scope assessments, and risk registers in Jira/Smartsheet.",
        "workflowInstructions": "Direct Onsite Tech Leads and coordinate with offshore development centers.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "gcon-onsite-lead",
        "roleTitle": "Onsite Technical Lead",
        "name": "Client Technical Lead Architect",
        "level": 2,
        "parentId": "gcon-csa",
        "responsibilities": "Work directly at client offices bridging client IT managers with engineering squads, resolving architectural questions, and leading code reviews.",
        "workflowInstructions": "Direct Senior Technical Consultants and Offshore Squad Leads.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "gcon-sr-cons",
        "roleTitle": "Senior Technical Consultant",
        "name": "Fullstack Systems Consultant",
        "level": 3,
        "parentId": "gcon-onsite-lead",
        "responsibilities": "Build complex business logic components, design integration data mappers, and implement enterprise microservices.",
        "workflowInstructions": "Mentor associate consultants, write technical specifications, and review pull requests.",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "gcon-assoc-dev",
        "roleTitle": "Associate Software Engineer",
        "name": "Junior Systems Developer",
        "level": 4,
        "parentId": "gcon-sr-cons",
        "responsibilities": "Implement assigned feature tickets, write automated unit tests, and resolve defect tickets assigned from client UAT rounds.",
        "workflowInstructions": "Follow enterprise coding standards and update technical documentation.",
        "delegationPolicy": "up",
        "color": "#93c5fd"
      },
      {
        "id": "gcon-ba-lead",
        "roleTitle": "Lead Business Analyst",
        "name": "Functional Requirements Architect",
        "level": 2,
        "parentId": "gcon-eng-dir",
        "responsibilities": "Lead business discovery workshops, map complex 'As-Is' vs 'To-Be' business workflows, and translate client requirements into user stories.",
        "workflowInstructions": "Supervise Functional Business Analysts on traceability matrices.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "gcon-ba",
        "roleTitle": "Functional Business Analyst",
        "name": "User Story & Specification Analyst",
        "level": 3,
        "parentId": "gcon-ba-lead",
        "responsibilities": "Conduct stakeholder interviews, write detailed functional specifications, document business acceptance criteria, and assist client UAT.",
        "workflowInstructions": "Ensure engineering deliverables accurately match client operational workflows.",
        "delegationPolicy": "both",
        "color": "#f59e0b"
      },
      {
        "id": "gcon-qa-lead",
        "roleTitle": "QA & Test Delivery Lead",
        "name": "Enterprise Quality Assurance Head",
        "level": 2,
        "parentId": "gcon-eng-dir",
        "responsibilities": "Define master test strategy: functional testing, integration testing, performance stress tests, and automated regression suites.",
        "workflowInstructions": "Supervise Test Automation Engineers and coordinate user acceptance testing (UAT).",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "gcon-qa-eng",
        "roleTitle": "Test Automation Engineer",
        "name": "Selenium & API Automation Tester",
        "level": 3,
        "parentId": "gcon-qa-lead",
        "responsibilities": "Build automated end-to-end regression suites, test edge cases across integrated enterprise platforms, and log defect reports.",
        "workflowInstructions": "Validate resolved bugs on staging builds before client demonstration.",
        "delegationPolicy": "up",
        "color": "#34d399"
      },
      {
        "id": "gcon-change-mgr",
        "roleTitle": "Change Management & Training Specialist",
        "name": "Organizational Adoption Lead",
        "level": 2,
        "parentId": "gcon-eng-dir",
        "responsibilities": "Design employee training programs, interactive training manuals, and change resistance mitigation for thousands of client employees.",
        "workflowInstructions": "Ensure smooth enterprise adoption of newly deployed software systems.",
        "delegationPolicy": "up",
        "color": "#7c3aed"
      },
      {
        "id": "gcon-data-lead",
        "roleTitle": "Data Migration Lead",
        "name": "Legacy ETL & Cutover Architect",
        "level": 2,
        "parentId": "gcon-csa",
        "responsibilities": "Plan complex weekend production cutovers, extract data from legacy databases, validate schema transformations, and reconcile balances.",
        "workflowInstructions": "Ensure zero data loss during high-risk production system migrations.",
        "delegationPolicy": "both",
        "color": "#ea580c"
      },
      {
        "id": "gcon-sec-spec",
        "roleTitle": "Enterprise Security & Compliance Consultant",
        "name": "Regulatory & Infosec Advisor",
        "level": 2,
        "parentId": "gcon-csa",
        "responsibilities": "Audit client system security configurations against CIS benchmarks, GDPR, and enterprise access policies.",
        "workflowInstructions": "Provide formal security sign-off before client system go-live.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      },
      {
        "id": "gcon-support-mgr",
        "roleTitle": "Hypercare & Post-Launch Support Lead",
        "name": "Warranty Support Manager",
        "level": 2,
        "parentId": "gcon-eng-dir",
        "responsibilities": "Manage 90-day post-launch warranty hypercare, resolving critical Day-1 issues with emergency response squads.",
        "workflowInstructions": "Transition stable running systems to client internal IT teams upon contract completion.",
        "delegationPolicy": "up",
        "color": "#059669"
      }
    ]
  },
  {
    "id": "chain-managed-service-provider-msp",
    "name": "Managed IT Services Provider (MSP)",
    "companyName": "Managed IT Services Provider (MSP)",
    "description": "Outsourced IT department supporting small and mid-sized businesses with remote monitoring and management (RMM), helpdesk, network maintenance, and cybersecurity.",
    "category": "IT Services",
    "domain": "Managed IT",
    "color": "#0891b2",
    "icon": "Server",
    "nodes": [
      {
        "id": "msp-corp-dir",
        "roleTitle": "Managing Director / MSP Principal",
        "name": "MSP Business Owner & Principal",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead recurring managed service contracts, client retention, vendor partnerships (Microsoft, Dell, Cisco), and company profitability.",
        "workflowInstructions": "Direct Director of Client Operations and Principal Solutions Architect.",
        "delegationPolicy": "auto",
        "color": "#0e7490"
      },
      {
        "id": "msp-ops-dir",
        "roleTitle": "Director of Client Operations",
        "name": "Service Delivery & NOC Head",
        "level": 1,
        "parentId": "msp-corp-dir",
        "responsibilities": "Oversee 24/7 service desk SLAs, remote monitoring and management (RMM), technician utilization rates, and emergency dispatch.",
        "workflowInstructions": "Supervise Service Desk Manager and Field Engineering Lead.",
        "delegationPolicy": "auto",
        "color": "#0891b2"
      },
      {
        "id": "msp-desk-mgr",
        "roleTitle": "Service Desk Manager",
        "name": "Helpdesk Operations Supervisor",
        "level": 2,
        "parentId": "msp-ops-dir",
        "responsibilities": "Manage helpdesk ticket queues, monitor phone answer times, review ticket resolution notes, and resolve difficult client escalations.",
        "workflowInstructions": "Supervise Tier 1 Technicians and Tier 2 Systems Specialists.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "msp-t1-agent",
        "roleTitle": "Tier 1 Support Technician",
        "name": "Frontline Remote Support Specialist",
        "level": 3,
        "parentId": "msp-desk-mgr",
        "responsibilities": "Provide prompt remote desktop assistance for password resets, printer mappings, email configuration, and malware quarantine.",
        "workflowInstructions": "Document steps taken in PSA (Autotask/ConnectWise) and escalate complex issues within 20 minutes.",
        "delegationPolicy": "up",
        "color": "#38bdf8"
      },
      {
        "id": "msp-t2-spec",
        "roleTitle": "Tier 2 Systems Administrator",
        "name": "Senior Server & Cloud Specialist",
        "level": 3,
        "parentId": "msp-desk-mgr",
        "responsibilities": "Troubleshoot Windows Server Active Directory, Azure AD sync, Hyper-V virtual machines, Microsoft 365 licensing, and file share permissions.",
        "workflowInstructions": "Handle server patch management failures and complex workstation errors.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "msp-rmm-lead",
        "roleTitle": "RMM & Automation Engineer",
        "name": "Automated Scripting & Patching Lead",
        "level": 2,
        "parentId": "msp-ops-dir",
        "responsibilities": "Configure automated patch deployment schedules, deploy silent software updates, and write PowerShell automation scripts.",
        "workflowInstructions": "Maintain 99%+ workstation patch compliance across thousands of managed endpoints.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "msp-field-lead",
        "roleTitle": "Field Engineering Lead",
        "name": "On-Site Infrastructure Supervisor",
        "level": 2,
        "parentId": "msp-ops-dir",
        "responsibilities": "Schedule on-site customer visits, manage technician toolkits, and coordinate emergency hardware swap-outs.",
        "workflowInstructions": "Direct Field Technicians on physical office deployments.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "msp-field-tech",
        "roleTitle": "On-Site Systems Technician",
        "name": "Hardware Deployment & Cabling Specialist",
        "level": 3,
        "parentId": "msp-field-lead",
        "responsibilities": "Install rackmount servers, configure battery UPS units, terminate Cat6 ethernet cables, and set up dual-monitor workstations for client staff.",
        "workflowInstructions": "Verify full network connectivity before leaving client premises.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "msp-sec-lead",
        "roleTitle": "Managed Security Services (MSSP) Lead",
        "name": "Cybersecurity & EDR Specialist",
        "level": 1,
        "parentId": "msp-corp-dir",
        "responsibilities": "Manage client endpoint detection and response (SentinelOne/CrowdStrike), email spam filtering, dark web monitoring, and security assessments.",
        "workflowInstructions": "Contain compromised client machines remotely within minutes of infection.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "msp-backup-eng",
        "roleTitle": "Backup & Disaster Recovery Engineer",
        "name": "Datto / Veeam Backup Specialist",
        "level": 2,
        "parentId": "msp-ops-dir",
        "responsibilities": "Monitor daily cloud and on-premise image backups for all client servers, perform automated screenshot verification, and run recovery tests.",
        "workflowInstructions": "Ensure rapid client restoration during crypto-ransomware attacks.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "msp-vcio",
        "roleTitle": "Virtual CIO (vCIO) & Account Manager",
        "name": "Strategic IT Advisory Consultant",
        "level": 1,
        "parentId": "msp-corp-dir",
        "responsibilities": "Conduct quarterly technology reviews (QTR) with client business owners, present multi-year hardware lifecycle budgets, and propose upgrades.",
        "workflowInstructions": "Deepen client trust and drive technology modernization projects.",
        "delegationPolicy": "up",
        "color": "#7c3aed"
      }
    ]
  },
  {
    "id": "chain-cloud-migration-consultancy",
    "name": "Cloud Migration & App Modernization",
    "companyName": "Cloud Migration & App Modernization",
    "description": "Specialized cloud consultancy executing legacy datacenter lift-and-shift, containerization, microservice refactoring, and cloud native migrations.",
    "category": "IT Services",
    "domain": "Cloud Migration",
    "color": "#0284c7",
    "icon": "CloudUpload",
    "nodes": [
      {
        "id": "mig-lead",
        "roleTitle": "Cloud Migration Practice Director",
        "name": "Principal Cloud Transformation Partner",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead cloud migration practice revenues, cloud hyperscaler funding programs (AWS MAP / Azure AMMP), and enterprise migration timelines.",
        "workflowInstructions": "Direct Cloud Migration Master Architect and Delivery Manager.",
        "delegationPolicy": "auto",
        "color": "#0369a1"
      },
      {
        "id": "mig-arch",
        "roleTitle": "Cloud Migration Master Architect",
        "name": "AWS / Azure Migration Solutions Architect",
        "level": 1,
        "parentId": "mig-lead",
        "responsibilities": "Assess legacy datacenter application inventories (the 6 R's: Rehost, Replatform, Refactor, Repurchase, Retain, Retire), and design target VPCs.",
        "workflowInstructions": "Direct Infrastructure Migration Engineer and Database Modernization Lead.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "mig-infra-eng",
        "roleTitle": "Infrastructure Migration Engineer",
        "name": "Lift-and-Shift & IaC Specialist",
        "level": 2,
        "parentId": "mig-arch",
        "responsibilities": "Execute block-level server replications (AWS Application Migration Service / Azure Migrate), write automated Terraform target scripts, and test.",
        "workflowInstructions": "Execute cutover wave migrations during scheduled weekend maintenance windows.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "mig-db-lead",
        "roleTitle": "Database Modernization Lead",
        "name": "Oracle/SQL Server to Cloud DB Specialist",
        "level": 2,
        "parentId": "mig-arch",
        "responsibilities": "Migrate proprietary legacy databases (Oracle, MS SQL) to cloud-native engines (Amazon Aurora, Cloud SQL) using Database Migration Service (DMS).",
        "workflowInstructions": "Convert stored procedures and optimize queries for cloud architectures.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "mig-app-mod",
        "roleTitle": "Application Containerization Engineer",
        "name": "Docker & Kubernetes Modernization Specialist",
        "level": 2,
        "parentId": "mig-arch",
        "responsibilities": "Refactor legacy monolithic Java / .NET applications into lightweight containerized microservices ready for cloud deployment.",
        "workflowInstructions": "Eliminate hardcoded filesystem paths and extract external configurations into 12-factor cloud standards.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "mig-cutover-mgr",
        "roleTitle": "Cutover & Rollback Operations Manager",
        "name": "Wave Cutover Orchestration Lead",
        "level": 1,
        "parentId": "mig-lead",
        "responsibilities": "Orchestrate minute-by-minute cutover runbooks during final data synchronization, DNS record updates, and post-cutover smoke test verification.",
        "workflowInstructions": "Maintain verified rollback plans to protect client business continuity.",
        "delegationPolicy": "both",
        "color": "#ea580c"
      },
      {
        "id": "mig-test-eng",
        "roleTitle": "Performance & Validation Test Engineer",
        "name": "Post-Migration Verification Specialist",
        "level": 2,
        "parentId": "mig-cutover-mgr",
        "responsibilities": "Benchmark cloud application response times against on-premise baseline metrics, ensuring zero performance regression post-migration.",
        "workflowInstructions": "Certify that all integrations, batch jobs, and third-party APIs function flawlessly.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "mig-cost-opt",
        "roleTitle": "Cloud Optimization & FinOps Consultant",
        "name": "Post-Migration Rightsizing Specialist",
        "level": 2,
        "parentId": "mig-lead",
        "responsibilities": "Audit newly migrated cloud environments 30 days post-cutover to downsize overprovisioned VMs, terminate migration tools, and apply Savings Plans.",
        "workflowInstructions": "Deliver documented cloud cost reduction reports to client leadership.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-digital-transformation-agency",
    "name": "Digital Transformation & Agile Advisory",
    "companyName": "Digital Transformation & Agile Advisory",
    "description": "Management and technology consultancy guiding traditional enterprise companies through Agile reorganizations, cloud toolchain adoption, and culture shifts.",
    "category": "IT Services",
    "domain": "Agile Advisory",
    "color": "#7c3aed",
    "icon": "RefreshCw",
    "nodes": [
      {
        "id": "dt-lead",
        "roleTitle": "Digital Transformation Managing Director",
        "name": "Partner & Strategic Advisory Head",
        "level": 0,
        "parentId": null,
        "responsibilities": "Advise Fortune 500 boardrooms on digital disruption, digital operating models, agile organization restructuring, and digital product strategy.",
        "workflowInstructions": "Direct Enterprise Agile Coach and Digital Architecture Strategist.",
        "delegationPolicy": "auto",
        "color": "#5b21b6"
      },
      {
        "id": "dt-agile-coach",
        "roleTitle": "Principal Enterprise Agile Coach",
        "name": "Scaled Agile (SAFe) & Scrum Advisory Lead",
        "level": 1,
        "parentId": "dt-lead",
        "responsibilities": "Coach executive leadership and management on moving from rigid annual waterfall planning to quarterly Objectives & Key Results (OKRs).",
        "workflowInstructions": "Supervise Agile Transformation Coaches across client divisions.",
        "delegationPolicy": "both",
        "color": "#7c3aed"
      },
      {
        "id": "dt-coach",
        "roleTitle": "Agile Transformation Coach",
        "name": "Squad & Team Agile Mentor",
        "level": 2,
        "parentId": "dt-agile-coach",
        "responsibilities": "Embed directly inside client business and IT squads, facilitate sprint ceremonies, train product owners, and eliminate bureaucracy.",
        "workflowInstructions": "Foster an empowered, autonomous engineering culture with fast feedback loops.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "dt-arch-strat",
        "roleTitle": "Digital Architecture Strategist",
        "name": "Modern Toolchain & API Strategist",
        "level": 1,
        "parentId": "dt-lead",
        "responsibilities": "Guide client IT directors in dismantling legacy monolithic silos in favor of composable, API-first microservices and modern cloud toolchains.",
        "workflowInstructions": "Supervise DevOps Culture Consultant.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "dt-devops-cons",
        "roleTitle": "DevOps Culture & Tooling Consultant",
        "name": "CI/CD & Developer Experience Advisor",
        "level": 2,
        "parentId": "dt-arch-strat",
        "responsibilities": "Train client engineers on automated testing, trunk-based development, and infrastructure-as-code, shifting security left.",
        "workflowInstructions": "Eliminate manual handoff bottlenecks between developers and operations teams.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "dt-change-dir",
        "roleTitle": "Change Management Director",
        "name": "People Operations & Transformation Lead",
        "level": 1,
        "parentId": "dt-lead",
        "responsibilities": "Design comprehensive employee change enablement plans, addressing cultural anxiety, reskilling legacy developers, and tracking employee sentiment.",
        "workflowInstructions": "Supervise Training Curriculum Developer.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "dt-trainer",
        "roleTitle": "Training & Upskilling Lead",
        "name": "Digital Academy Specialist",
        "level": 2,
        "parentId": "dt-change-dir",
        "responsibilities": "Develop interactive bootcamps teaching modern cloud, Python, React, and product management skills to client employees.",
        "workflowInstructions": "Build internal client talent capabilities to sustain the transformation independently.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "dt-value-analyst",
        "roleTitle": "Value Realization & KPI Analyst",
        "name": "Transformation Impact Lead",
        "level": 2,
        "parentId": "dt-lead",
        "responsibilities": "Measure business outcomes of the transformation: time-to-market speed, customer satisfaction, developer retention, and operational cost savings.",
        "workflowInstructions": "Deliver quarterly transformation progress briefs to client executive committees.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "dt-prod-mentor",
        "roleTitle": "Product Operating Model Mentor",
        "name": "Product-Led Transformation Specialist",
        "level": 2,
        "parentId": "dt-agile-coach",
        "responsibilities": "Transition client project managers into true product managers who own business metrics, user discovery, and outcome-based backlogs.",
        "workflowInstructions": "Establish continuous customer discovery practices across teams.",
        "delegationPolicy": "up",
        "color": "#ec4899"
      }
    ]
  },
  {
    "id": "chain-boutique-web-agency",
    "name": "Boutique Digital Design & Web Studio",
    "companyName": "Boutique Digital Design & Web Studio",
    "description": "High-craft boutique web studio delivering award-winning, interactive digital brand experiences, headless Jamstack web apps, and bespoke design.",
    "category": "IT Services",
    "domain": "Creative Web Agency",
    "color": "#ec4899",
    "icon": "Sparkles",
    "nodes": [
      {
        "id": "bout-owner",
        "roleTitle": "Agency Principal / Creative Director",
        "name": "Founder & Executive Creative Director",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead agency vision, pitch marquee design projects to luxury and tech brands, maintain world-class craft standards, and win Awwwards.",
        "workflowInstructions": "Direct Lead Interactive Designer and Technical Lead.",
        "delegationPolicy": "auto",
        "color": "#be185d"
      },
      {
        "id": "bout-designer",
        "roleTitle": "Lead Interactive & UI Designer",
        "name": "Art Director & Brand Designer",
        "level": 1,
        "parentId": "bout-owner",
        "responsibilities": "Design bold typographic hierarchies, custom 3D web visuals, interactive wireframes, fluid motion layouts, and brand identities in Figma.",
        "workflowInstructions": "Supervise Motion & Interaction Designer.",
        "delegationPolicy": "both",
        "color": "#ec4899"
      },
      {
        "id": "bout-motion",
        "roleTitle": "Motion & Interaction Designer",
        "name": "Micro-Interactions & 3D Web Specialist",
        "level": 2,
        "parentId": "bout-designer",
        "responsibilities": "Create fluid scroll-driven animations, WebGL canvas shaders, Three.js 3D models, and interactive cursor effects.",
        "workflowInstructions": "Deliver interactive prototypes in Framer and provide GSAP animation curves to developers.",
        "delegationPolicy": "up",
        "color": "#f472b6"
      },
      {
        "id": "bout-tech-lead",
        "roleTitle": "Technical Lead & Frontend Developer",
        "name": "Creative Technologist & Jamstack Lead",
        "level": 1,
        "parentId": "bout-owner",
        "responsibilities": "Build pixel-perfect, ultra-responsive web experiences using Next.js, Tailwind CSS, GSAP, and headless CMS platforms (Sanity/Prismic).",
        "workflowInstructions": "Direct Fullstack Developer on API integrations and performance.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "bout-dev",
        "roleTitle": "Creative Frontend Developer",
        "name": "Next.js & Animation Specialist",
        "level": 2,
        "parentId": "bout-tech-lead",
        "responsibilities": "Implement seamless page transitions, accessible interactive menus, fast image loading optimizations, and CMS schema definitions.",
        "workflowInstructions": "Achieve 100/100 Google Lighthouse performance and accessibility scores.",
        "delegationPolicy": "up",
        "color": "#06b6d4"
      }
    ]
  },
  {
    "id": "chain-qa-testing-services-consultancy",
    "name": "QA & Test Automation Consultancy",
    "companyName": "QA & Test Automation Consultancy",
    "description": "Independent quality assurance consultancy providing outsourced automated test frameworks, performance load testing, mobile compatibility, and security audits.",
    "category": "IT Services",
    "domain": "QA Services",
    "color": "#10b981",
    "icon": "CheckCheck",
    "nodes": [
      {
        "id": "tcon-head",
        "roleTitle": "Head of QA & Testing Services",
        "name": "Managing Director of Quality Consulting",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead software testing practice revenue, test automation frameworks, client test assurance certifications, and QA delivery teams.",
        "workflowInstructions": "Direct Test Automation Architect and Performance Test Lead.",
        "delegationPolicy": "auto",
        "color": "#047857"
      },
      {
        "id": "tcon-auto-arch",
        "roleTitle": "Test Automation Architect",
        "name": "Playwright / Cypress Framework Specialist",
        "level": 1,
        "parentId": "tcon-head",
        "responsibilities": "Design scalable automated testing frameworks, integrate cross-browser test grids, parallel execution pipelines, and automated reporting.",
        "workflowInstructions": "Supervise Test Automation Engineers across client projects.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "tcon-auto-eng",
        "roleTitle": "Senior Test Automation Engineer",
        "name": "End-to-End Automation Specialist",
        "level": 2,
        "parentId": "tcon-auto-arch",
        "responsibilities": "Write robust automated end-to-end test suites in TypeScript/Python, implement visual regression testing (Percy/Chromatic), and eliminate flaky tests.",
        "workflowInstructions": "Integrate automated test runs into client CI/CD pull request gates.",
        "delegationPolicy": "both",
        "color": "#34d399"
      },
      {
        "id": "tcon-perf-lead",
        "roleTitle": "Performance & Load Testing Lead",
        "name": "k6 / JMeter Stress Testing Specialist",
        "level": 1,
        "parentId": "tcon-head",
        "responsibilities": "Model realistic user load profiles, simulate 100,000+ concurrent virtual users, and benchmark server response under Black Friday traffic spikes.",
        "workflowInstructions": "Identify database connection pool exhaustion, memory leaks, and CPU bottlenecks.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "tcon-mob-qa",
        "roleTitle": "Mobile QA & Device Matrix Specialist",
        "name": "iOS / Android Compatibility Lead",
        "level": 2,
        "parentId": "tcon-auto-arch",
        "responsibilities": "Execute automated and manual test matrices across 60+ real mobile smartphones, checking varied screen notches, OS versions, and network speeds.",
        "workflowInstructions": "Ensure mobile apps function smoothly across budget Android hardware.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "tcon-sec-tester",
        "roleTitle": "Security & Penetration Test Specialist",
        "name": "OWASP Application Security Tester",
        "level": 2,
        "parentId": "tcon-head",
        "responsibilities": "Execute black-box and grey-box security testing, scanning for SQL injection, authentication bypasses, broken access control, and XSS.",
        "workflowInstructions": "Provide prioritized remediation guides to client developers.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "tcon-manual-lead",
        "roleTitle": "Manual Exploratory QA Lead",
        "name": "Functional & Usability Test Lead",
        "level": 2,
        "parentId": "tcon-auto-arch",
        "responsibilities": "Perform creative exploratory testing, unearthing subtle business logic edge cases, broken multi-tab sessions, and payment rounding errors.",
        "workflowInstructions": "Write clear defect tickets with screen recordings and reproducible steps.",
        "delegationPolicy": "up",
        "color": "#ea580c"
      },
      {
        "id": "tcon-mgr",
        "roleTitle": "QA Client Delivery Manager",
        "name": "SLA & Test Audit Specialist",
        "level": 1,
        "parentId": "tcon-head",
        "responsibilities": "Track defect leakage rates (< 1%), test execution velocity, and delivery timelines; present formal test summary reports to client executives.",
        "workflowInstructions": "Certify software release quality before production deployment sign-off.",
        "delegationPolicy": "up",
        "color": "#6366f1"
      }
    ]
  },
  {
    "id": "chain-it-asset-procurement-consulting",
    "name": "IT Asset Management & Licensing Consulting",
    "companyName": "IT Asset Management & Licensing Consulting",
    "description": "Corporate IT asset management (ITAM) advisory optimizing software license portfolios (Microsoft, Oracle, Salesforce), hardware lifecycles, and audits.",
    "category": "IT Services",
    "domain": "ITAM Consulting",
    "color": "#d97706",
    "icon": "PackageCheck",
    "nodes": [
      {
        "id": "itam-dir",
        "roleTitle": "Director of IT Asset Management",
        "name": "ITAM Advisory Practice Leader",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead corporate IT asset governance, software license audit defense (Oracle/Microsoft audits), multi-million dollar procurement savings, and hardware tracking.",
        "workflowInstructions": "Direct Senior Software Asset Manager and Hardware Lifecycle Lead.",
        "delegationPolicy": "auto",
        "color": "#b45309"
      },
      {
        "id": "itam-sam-mgr",
        "roleTitle": "Senior Software Asset Manager",
        "name": "License Optimization Specialist",
        "level": 1,
        "parentId": "itam-dir",
        "responsibilities": "Analyze enterprise software entitlements, discover unused or under-utilized SaaS subscriptions, and rightsize licensing tiers.",
        "workflowInstructions": "Supervise License Audit Analyst on contract renewals and negotiation strategies.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "itam-audit-analyst",
        "roleTitle": "Software License Audit Analyst",
        "name": "Vendor Audit Defense Specialist",
        "level": 2,
        "parentId": "itam-sam-mgr",
        "responsibilities": "Run discovery scripts to calculate exact license consumption (per-core, per-user, virtualized CPU metrics), defending against vendor audit penalties.",
        "workflowInstructions": "Eliminate software licensing non-compliance exposure.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "itam-hw-lead",
        "roleTitle": "Hardware Lifecycle & Disposal Lead",
        "name": "Physical Asset & Logistics Specialist",
        "level": 1,
        "parentId": "itam-dir",
        "responsibilities": "Manage corporate employee laptop procurement, warranty renewals, automated MDM provisioning, and certified secure e-waste disposal.",
        "workflowInstructions": "Ensure DOD 5220.22-M certified data wiping on retired employee machines.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "itam-proc-spec",
        "roleTitle": "IT Procurement Specialist",
        "name": "Hardware & Vendor Negotiator",
        "level": 2,
        "parentId": "itam-dir",
        "responsibilities": "Negotiate bulk volume hardware discounts with computer manufacturers (Apple, Lenovo, Dell), manage warranty replacements, and track supply chains.",
        "workflowInstructions": "Ensure new hire equipment arrives configured before employee start dates.",
        "delegationPolicy": "up",
        "color": "#0284c7"
      }
    ]
  },
  {
    "id": "chain-cybersecurity-consulting-vapt",
    "name": "Cybersecurity Advisory & VAPT Consulting",
    "companyName": "Cybersecurity Advisory & VAPT Consulting",
    "description": "Professional security consulting firm delivering Vulnerability Assessment and Penetration Testing (VAPT), cloud architecture reviews, and board advisory.",
    "category": "IT Services",
    "domain": "Security Advisory",
    "color": "#dc2626",
    "icon": "ShieldAlert",
    "nodes": [
      {
        "id": "vapt-partner",
        "roleTitle": "Cybersecurity Consulting Partner",
        "name": "Managing Partner - Security Advisory",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead cybersecurity consulting practice, executive C-suite advisory, multi-client security program governance, and regulatory sign-offs.",
        "workflowInstructions": "Direct Principal Penetration Tester and Cloud Security Advisory Lead.",
        "delegationPolicy": "auto",
        "color": "#7f1d1d"
      },
      {
        "id": "vapt-lead-pen",
        "roleTitle": "Principal Penetration Tester",
        "name": "Head of Offensive VAPT Services",
        "level": 1,
        "parentId": "vapt-partner",
        "responsibilities": "Lead high-stakes black-box penetration tests against client networks, external perimeters, web portals, and mobile apps.",
        "workflowInstructions": "Supervise Senior Penetration Testers on vulnerability exploitation.",
        "delegationPolicy": "both",
        "color": "#991b1b"
      },
      {
        "id": "vapt-pen-tester",
        "roleTitle": "Senior Penetration Tester",
        "name": "Application & Network Exploitation Lead",
        "level": 2,
        "parentId": "vapt-lead-pen",
        "responsibilities": "Uncover critical remote code execution (RCE), authentication bypasses, broken object-level authorization (BOLA), and network lateral movement paths.",
        "workflowInstructions": "Document proof-of-concept exploits and write clear technical remediation advice.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "vapt-cloud-lead",
        "roleTitle": "Cloud Security Advisory Lead",
        "name": "AWS / Azure Configuration Reviewer",
        "level": 1,
        "parentId": "vapt-partner",
        "responsibilities": "Audit client cloud architecture against CIS Foundation Benchmarks, identify public storage buckets, overly permissive IAM roles, and missing encryption.",
        "workflowInstructions": "Provide prioritized cloud hardening blueprints to client engineering teams.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "vapt-soc-advisor",
        "roleTitle": "SOC & Incident Readiness Advisor",
        "name": "Blue Team Capability Consultant",
        "level": 1,
        "parentId": "vapt-partner",
        "responsibilities": "Evaluate client internal SOC detection capabilities, conduct tabletop incident response simulations with client executives, and refine playbooks.",
        "workflowInstructions": "Train client defensive teams to respond effectively to modern ransomware attacks.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "vapt-report-lead",
        "roleTitle": "Security Documentation & Report Lead",
        "name": "VAPT Deliverables Specialist",
        "level": 2,
        "parentId": "vapt-lead-pen",
        "responsibilities": "Transform complex technical vulnerability findings into executive-ready risk summaries and developer remediation roadmaps.",
        "workflowInstructions": "Deliver clean, authoritative audit reports suitable for board members and enterprise clients.",
        "delegationPolicy": "up",
        "color": "#475569"
      },
      {
        "id": "vapt-retest-spec",
        "roleTitle": "Remediation Verification Specialist",
        "name": "Patch Re-Testing Lead",
        "level": 2,
        "parentId": "vapt-lead-pen",
        "responsibilities": "Re-test identified vulnerabilities once client developers apply patches, certifying that vulnerabilities are genuinely resolved without regressions.",
        "workflowInstructions": "Issue official Clean Security Attestation Certificates upon successful remediation.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-aaa-game-studio",
    "name": "AAA Cross-Platform Game Studio",
    "companyName": "AAA Cross-Platform Game Studio",
    "description": "Full-scale premier game development studio creating blockbuster console and PC titles with 3D graphics engines, gameplay programming, physics, and game audio.",
    "category": "Game Development",
    "domain": "AAA Gaming",
    "color": "#7c3aed",
    "icon": "Gamepad2",
    "nodes": [
      {
        "id": "aaa-head",
        "roleTitle": "Studio Head & Executive Producer",
        "name": "Managing Director of Game Production",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead game studio vision, publisher relations, multi-million dollar production budgets, launch marketing milestones, and studio culture.",
        "workflowInstructions": "Direct Creative Game Director, Technical Director, and Studio Art Director.",
        "delegationPolicy": "auto",
        "color": "#5b21b6"
      },
      {
        "id": "aaa-creative-dir",
        "roleTitle": "Creative Game Director",
        "name": "Game Vision & Worldbuilding Lead",
        "level": 1,
        "parentId": "aaa-head",
        "responsibilities": "Define game narrative lore, core gameplay loops, artistic tone, emotional pacing, player progression mechanics, and design pillars.",
        "workflowInstructions": "Direct Lead Gameplay Designer and Lead Level Designer.",
        "delegationPolicy": "auto",
        "color": "#7c3aed"
      },
      {
        "id": "aaa-lead-gdes",
        "roleTitle": "Lead Gameplay Designer",
        "name": "Systems & Combat Design Lead",
        "level": 2,
        "parentId": "aaa-creative-dir",
        "responsibilities": "Design player combat feel, movement mechanics, weapon balancing tables, enemy AI behaviors, and camera interaction systems.",
        "workflowInstructions": "Supervise Gameplay Designers on prototyping mechanics in Unreal Engine.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "aaa-lead-lvl",
        "roleTitle": "Lead Level Designer",
        "name": "World Architecture & Mission Lead",
        "level": 2,
        "parentId": "aaa-creative-dir",
        "responsibilities": "Design immersive mission layouts, spatial pacing, environmental storytelling, puzzle mechanics, and combat arena encounters.",
        "workflowInstructions": "Direct Level Designers on whitebox blockouts and mission scripting.",
        "delegationPolicy": "both",
        "color": "#a855f7"
      },
      {
        "id": "aaa-tech-dir",
        "roleTitle": "Technical Director (CTO)",
        "name": "Game Engine & Technology Head",
        "level": 1,
        "parentId": "aaa-head",
        "responsibilities": "Direct core game engine technology, performance profiling across PlayStation/Xbox/PC (rock-solid 60 FPS), memory budgets, and graphics pipelines.",
        "workflowInstructions": "Supervise Lead Engine Programmer and Lead Gameplay Programmer.",
        "delegationPolicy": "auto",
        "color": "#0284c7"
      },
      {
        "id": "aaa-engine-prog",
        "roleTitle": "Lead 3D Engine & Graphics Architect",
        "name": "Rendering & Shader Architect",
        "level": 2,
        "parentId": "aaa-tech-dir",
        "responsibilities": "Optimize custom HLSL/GLSL shaders, DirectX 12 / Vulkan ray tracing pipelines, volumetric lighting, and global illumination.",
        "workflowInstructions": "Profile GPU memory caches and eliminate frame rate stuttering.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "aaa-game-prog",
        "roleTitle": "Lead Gameplay Programmer",
        "name": "Core Mechanics & C++ Systems Lead",
        "level": 2,
        "parentId": "aaa-tech-dir",
        "responsibilities": "Implement player character physics, responsive controls, animation state machines, and weapon hit-detection in C++.",
        "workflowInstructions": "Supervise Senior Gameplay Programmers on feature delivery.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "aaa-ai-prog",
        "roleTitle": "Lead AI Programmer",
        "name": "Enemy Behaviors & Navigation Specialist",
        "level": 3,
        "parentId": "aaa-game-prog",
        "responsibilities": "Build intelligent enemy squad behaviors using behavior trees, EQS (Environment Query System), dynamic cover selection, and tactical pathfinding.",
        "workflowInstructions": "Ensure enemies react realistically to player actions without unnatural omniscience.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "aaa-art-dir",
        "roleTitle": "Studio Art Director",
        "name": "Visual Aesthetics & Concept Lead",
        "level": 1,
        "parentId": "aaa-head",
        "responsibilities": "Establish visual art direction, color palettes, architectural themes, costume designs, and inspect asset fidelity.",
        "workflowInstructions": "Supervise Lead Technical Artist and Lead 3D Character Artist.",
        "delegationPolicy": "auto",
        "color": "#ec4899"
      },
      {
        "id": "aaa-tech-artist",
        "roleTitle": "Lead Technical Artist",
        "name": "Art Pipeline & Rigging Specialist",
        "level": 2,
        "parentId": "aaa-art-dir",
        "responsibilities": "Bridge art and engineering: build automated DCC exporter tools (Blender/Maya to Unreal), skin complex character rigs, and write shaders.",
        "workflowInstructions": "Enforce strict polygon counts and texture memory budgets across art teams.",
        "delegationPolicy": "both",
        "color": "#f43f5e"
      },
      {
        "id": "aaa-char-artist",
        "roleTitle": "Lead 3D Character Artist",
        "name": "ZBrush Sculpting & Texturing Specialist",
        "level": 2,
        "parentId": "aaa-art-dir",
        "responsibilities": "Sculpt hyper-realistic character models, create photorealistic PBR texture maps (Substance Painter), and optimize topology for facial deformation.",
        "workflowInstructions": "Deliver cinematic quality hero characters that meet rendering budgets.",
        "delegationPolicy": "both",
        "color": "#d946ef"
      },
      {
        "id": "aaa-audio-dir",
        "roleTitle": "Game Audio Director & Composer",
        "name": "Adaptive Music & Sound Design Lead",
        "level": 1,
        "parentId": "aaa-head",
        "responsibilities": "Compose dynamic interactive musical scores, oversee Foley sound recording, and design punchy weapon and atmospheric ambient sound effects.",
        "workflowInstructions": "Implement adaptive audio triggers in Wwise / FMOD.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "aaa-audio-eng",
        "roleTitle": "Technical Audio Engineer",
        "name": "Audio Integration & Spatial Sound Lead",
        "level": 2,
        "parentId": "aaa-audio-dir",
        "responsibilities": "Integrate Wwise audio engines into game code, configure 3D spatial HRTF headphone audio, environmental reverb zones, and occlusion filters.",
        "workflowInstructions": "Ensure zero audio popping or buffer latency during intense combat.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "aaa-qa-lead",
        "roleTitle": "Head of Game QA",
        "name": "Build Verification & Certification Lead",
        "level": 1,
        "parentId": "aaa-head",
        "responsibilities": "Manage multi-tier testing teams hunting gameplay collision bugs, quest blockers, performance drops, and platform certification standards (TRC/TCR).",
        "workflowInstructions": "Direct Build Verification Engineer to sign off on release candidates.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "aaa-qa-tester",
        "roleTitle": "Senior Gameplay QA Tester",
        "name": "Collision & Physics Bug Specialist",
        "level": 2,
        "parentId": "aaa-qa-lead",
        "responsibilities": "Stress test complex game systems: spam abilities, break out of level boundaries, force physics ragdoll anomalies, and log video bug reports.",
        "workflowInstructions": "Provide exact reproduction steps to gameplay engineers.",
        "delegationPolicy": "up",
        "color": "#34d399"
      },
      {
        "id": "aaa-prod-mgr",
        "roleTitle": "Technical Production Manager",
        "name": "Milestone Tracking & Sprint Producer",
        "level": 2,
        "parentId": "aaa-head",
        "responsibilities": "Manage cross-discipline asset pipelines, track thousands of art and code tasks in Hansoft/Jira, and coordinate milestone deliverables.",
        "workflowInstructions": "Prevent crunch through proactive dependency management.",
        "delegationPolicy": "up",
        "color": "#475569"
      }
    ]
  },
  {
    "id": "chain-indie-game-studio",
    "name": "Indie Game Development Studio",
    "companyName": "Indie Game Development Studio",
    "description": "Passionate, nimble independent game studio building creative, highly stylized 2D/3D indie gems with tight mechanics and distinct artistic vision.",
    "category": "Game Development",
    "domain": "Indie Gaming",
    "color": "#f97316",
    "icon": "Gamepad",
    "nodes": [
      {
        "id": "indie-dir",
        "roleTitle": "Indie Game Director & Founder",
        "name": "Creative Director & Lead Designer",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead game concept, aesthetic direction, publisher/Kickstarter pitching, community marketing on Steam/TikTok, and commercial launch.",
        "workflowInstructions": "Direct Lead Game Programmer and Lead Pixel/Concept Artist.",
        "delegationPolicy": "auto",
        "color": "#c2410c"
      },
      {
        "id": "indie-prog",
        "roleTitle": "Lead Game Programmer",
        "name": "Unity / Godot Engine Specialist",
        "level": 1,
        "parentId": "indie-dir",
        "responsibilities": "Build core gameplay mechanics, responsive character controls, save-state management, Steamworks SDK integration, and cross-platform ports.",
        "workflowInstructions": "Maintain high performance (smooth 60 FPS on Steam Deck) and clean modular codebase.",
        "delegationPolicy": "both",
        "color": "#f97316"
      },
      {
        "id": "indie-artist",
        "roleTitle": "Lead Pixel & Concept Artist",
        "name": "2D Animator & Visual Stylist",
        "level": 1,
        "parentId": "indie-dir",
        "responsibilities": "Create handcrafted pixel art sprite animations, evocative background parallax layers, UI HUD icons, and promotional Steam capsule artwork.",
        "workflowInstructions": "Ensure a distinct, instantly recognizable aesthetic identity that stands out in Steam discovery queues.",
        "delegationPolicy": "both",
        "color": "#d946ef"
      },
      {
        "id": "indie-audio",
        "roleTitle": "Sound Designer & Composer",
        "name": "Foley & Chiptune Music Specialist",
        "level": 1,
        "parentId": "indie-dir",
        "responsibilities": "Compose an unforgettable emotional musical soundtrack, record bespoke sound effects, and balance audio mixes for headphones.",
        "workflowInstructions": "Deliver audio assets ready for integration into game audio managers.",
        "delegationPolicy": "up",
        "color": "#8b5cf6"
      },
      {
        "id": "indie-comm",
        "roleTitle": "Community & Playtest Coordinator",
        "name": "Steam & Discord Community Lead",
        "level": 1,
        "parentId": "indie-dir",
        "responsibilities": "Organize closed beta playtests, collect player feedback on Discord, edit viral development clips for TikTok, and manage Steam demo releases.",
        "workflowInstructions": "Build an enthusiastic player wishlist community before launch.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-mobile-f2p-liveops-studio",
    "name": "Mobile Free-to-Play & LiveOps Game Studio",
    "companyName": "Mobile Free-to-Play & LiveOps Game Studio",
    "description": "Data-driven mobile gaming company running live operations, seasonal battle passes, gacha economies, push notifications, and monetization tuning.",
    "category": "Game Development",
    "domain": "Mobile Gaming",
    "color": "#d97706",
    "icon": "Trophy",
    "nodes": [
      {
        "id": "f2p-gm",
        "roleTitle": "General Manager / Executive Producer",
        "name": "Head of Mobile Game Franchise",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead daily active users (DAU), average revenue per daily active user (ARPDAU), 30-day retention metrics, and marketing UA budgets.",
        "workflowInstructions": "Direct LiveOps Director, Lead Game Economy Designer, and Mobile Tech Lead.",
        "delegationPolicy": "auto",
        "color": "#b45309"
      },
      {
        "id": "f2p-liveops-dir",
        "roleTitle": "LiveOps Director",
        "name": "Events Calendar & Content Delivery Lead",
        "level": 1,
        "parentId": "f2p-gm",
        "responsibilities": "Plan weekly live game events, seasonal battle passes, limited-time holiday tournaments, and push notification engagement campaigns.",
        "workflowInstructions": "Supervise LiveOps Operations Specialist on remote server event configurations.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "f2p-econ-des",
        "roleTitle": "Lead Game Economy Designer",
        "name": "Monetization & Virtual Goods Specialist",
        "level": 1,
        "parentId": "f2p-gm",
        "responsibilities": "Balance virtual currency sinks and faucets, design gacha drop probability tables, pricing tiers, and progression pacing to prevent inflation.",
        "workflowInstructions": "Model player progression curves and optimize conversion to paying players.",
        "delegationPolicy": "both",
        "color": "#f59e0b"
      },
      {
        "id": "f2p-tech-lead",
        "roleTitle": "Mobile Game Tech Lead",
        "name": "Unity Mobile Client & Server Architect",
        "level": 1,
        "parentId": "f2p-gm",
        "responsibilities": "Lead Unity mobile client optimization, asset bundle streaming, server authoritative validation, and in-app purchase verification.",
        "workflowInstructions": "Direct Senior Unity Game Developer and Backend Services Developer.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "f2p-unity-dev",
        "roleTitle": "Senior Unity Game Developer",
        "name": "Mobile Gameplay & UI Engineer",
        "level": 2,
        "parentId": "f2p-tech-lead",
        "responsibilities": "Implement animated store UI popups, reward wheel spinners, smooth touch controls, and optimize texture memory to prevent iOS out-of-memory crashes.",
        "workflowInstructions": "Ensure sub-3-second app startup time.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "f2p-be-dev",
        "roleTitle": "LiveOps Backend Developer",
        "name": "Go / Node Real-Time Server Engineer",
        "level": 2,
        "parentId": "f2p-tech-lead",
        "responsibilities": "Build scalable player profile databases, leaderboard systems, friend gifting mechanisms, and anti-cheat transaction receipt verification.",
        "workflowInstructions": "Handle millions of daily API requests with sub-50ms response latency.",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "f2p-data-sci",
        "roleTitle": "Game Data Scientist",
        "name": "Player Behavior & Retention Analyst",
        "level": 2,
        "parentId": "f2p-econ-des",
        "responsibilities": "Analyze churn predictive signals, segment whales vs free players, and optimize dynamic in-game offer targeting.",
        "workflowInstructions": "Deliver daily monetization and cohort retention scorecards to executive leadership.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "f2p-ua-lead",
        "roleTitle": "User Acquisition & AdTech Lead",
        "name": "Paid Marketing & ROAS Specialist",
        "level": 1,
        "parentId": "f2p-gm",
        "responsibilities": "Manage multi-million dollar performance ad budgets on Meta/TikTok/AppLovin, test playable ad creatives, and track D7 ROAS.",
        "workflowInstructions": "Scale acquisition campaigns profitably while monitoring cost per install (CPI).",
        "delegationPolicy": "both",
        "color": "#ec4899"
      },
      {
        "id": "f2p-qa-spec",
        "roleTitle": "LiveOps QA Specialist",
        "name": "In-App Purchase & Event Verification Tester",
        "level": 2,
        "parentId": "f2p-liveops-dir",
        "responsibilities": "Verify in-app purchase flows across sandbox test accounts, test seasonal event transition triggers, and verify reward drop distributions.",
        "workflowInstructions": "Ensure zero player progression resets during live game updates.",
        "delegationPolicy": "up",
        "color": "#059669"
      }
    ]
  },
  {
    "id": "chain-multiplayer-backend-anti-cheat",
    "name": "Multiplayer Backend & Anti-Cheat Infrastructure",
    "companyName": "Multiplayer Backend & Anti-Cheat Infrastructure",
    "description": "High-performance multiplayer networking squad managing dedicated game server orchestration (Agones), matchmaking, and kernel-level anti-cheat.",
    "category": "Game Development",
    "domain": "Multiplayer Tech",
    "color": "#dc2626",
    "icon": "ShieldCheck",
    "nodes": [
      {
        "id": "mp-lead",
        "roleTitle": "Multiplayer Infrastructure Director",
        "name": "Head of Online Systems & Networking",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead global game server fleet reliability, sub-30ms player matchmaking latency, DDoS resilience, and zero-tolerance anti-cheat enforcement.",
        "workflowInstructions": "Direct Dedicated Fleet Architect and Anti-Cheat Security Lead.",
        "delegationPolicy": "auto",
        "color": "#7f1d1d"
      },
      {
        "id": "mp-fleet-arch",
        "roleTitle": "Dedicated Server Fleet Architect",
        "name": "Agones / Kubernetes Server Fleet Lead",
        "level": 1,
        "parentId": "mp-lead",
        "responsibilities": "Architect global dedicated game server scaling across worldwide cloud edge locations, automating instant server spinning on player demand.",
        "workflowInstructions": "Supervise Game Server Networking Developer on low-latency UDP netcode.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "mp-net-dev",
        "roleTitle": "Game Server Networking Developer",
        "name": "UDP / WebRTC Real-Time Netcode Specialist",
        "level": 2,
        "parentId": "mp-fleet-arch",
        "responsibilities": "Write server-authoritative tick rate loops (64Hz/128Hz), client-side prediction, lag compensation rewind, and entity interpolation.",
        "workflowInstructions": "Ensure smooth gameplay feel even for players experiencing 100ms+ network ping.",
        "delegationPolicy": "both",
        "color": "#ea580c"
      },
      {
        "id": "mp-match-dev",
        "roleTitle": "Matchmaking & ELO Systems Engineer",
        "name": "Skill-Based Matchmaking (SBMM) Architect",
        "level": 2,
        "parentId": "mp-fleet-arch",
        "responsibilities": "Implement low-latency skill-based matchmaking (SBMM) algorithms pairing players by skill ratings, ping latency, and party sizes.",
        "workflowInstructions": "Balance fair competitive matches against sub-15-second queue wait times.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "mp-anticheat-lead",
        "roleTitle": "Anti-Cheat & Security Lead",
        "name": "Kernel-Level Protection Specialist",
        "level": 1,
        "parentId": "mp-lead",
        "responsibilities": "Develop client and server anti-cheat detection: identify memory injection, aimbots, speedhacks, and wallhack texture modifications.",
        "workflowInstructions": "Supervise Anti-Cheat Behavioral Analyst on automated ban waves.",
        "delegationPolicy": "both",
        "color": "#991b1b"
      },
      {
        "id": "mp-anticheat-analyst",
        "roleTitle": "Anti-Cheat Behavioral Analyst",
        "name": "Machine Learning Telemetry Specialist",
        "level": 2,
        "parentId": "mp-anticheat-lead",
        "responsibilities": "Train machine learning models analyzing player mouse movement trajectories, reaction times, and impossible headshot angles.",
        "workflowInstructions": "Trigger automated shadow-bans and ban suspicious accounts in coordinated ban waves.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "mp-ddos-spec",
        "roleTitle": "Game Network DDoS Specialist",
        "name": "UDP Flood & Game Packet Filtering Lead",
        "level": 2,
        "parentId": "mp-fleet-arch",
        "responsibilities": "Deploy automated packet scrubbers filtering malicious SYN floods and UDP reflection attacks targeting active game server matches.",
        "workflowInstructions": "Prevent match disconnects and protect player game rankings.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-vr-ar-spatial-computing",
    "name": "VR/AR & Spatial Computing Studio",
    "companyName": "VR/AR & Spatial Computing Studio",
    "description": "Spatial computing studio developing immersive mixed reality experiences for Apple Vision Pro, Meta Quest, and enterprise industrial simulations.",
    "category": "Game Development",
    "domain": "Spatial Computing",
    "color": "#8b5cf6",
    "icon": "Glasses",
    "nodes": [
      {
        "id": "xr-dir",
        "roleTitle": "XR Creative Director & Studio Head",
        "name": "Spatial Computing Studio Lead",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead mixed reality product vision, hand-tracking interaction paradigms, 90 FPS refresh rate comfort standards (zero motion sickness), and enterprise deals.",
        "workflowInstructions": "Direct Spatial Interaction Lead and 3D Optimization Architect.",
        "delegationPolicy": "auto",
        "color": "#6d28d9"
      },
      {
        "id": "xr-ui-lead",
        "roleTitle": "Spatial Interaction UX Lead",
        "name": "Gesture & Eye-Tracking Interaction Designer",
        "level": 1,
        "parentId": "xr-dir",
        "responsibilities": "Design natural spatial computing interfaces: eye-gaze tracking selection, micro-pinch gestures, 3D volumetric menus, and spatial audio feedback.",
        "workflowInstructions": "Ensure spatial UI elements feel grounded in physical reality.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "xr-unity-lead",
        "roleTitle": "Lead Unity / Unreal XR Developer",
        "name": "Mixed Reality Systems Architect",
        "level": 1,
        "parentId": "xr-dir",
        "responsibilities": "Build cross-platform XR applications using OpenXR, Meta Quest SDK, and Apple visionOS RealityKit/SwiftUI.",
        "workflowInstructions": "Supervise Spatial Developer on real-time physics interactions.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "xr-spatial-dev",
        "roleTitle": "Spatial Systems Developer",
        "name": "Hand Physics & Passthrough Specialist",
        "level": 2,
        "parentId": "xr-unity-lead",
        "responsibilities": "Implement precise virtual hand collision physics, real-world room spatial mesh occlusions, and high-fidelity video passthrough blending.",
        "workflowInstructions": "Eliminate visual jitter and maintain sub-15ms motion-to-photon latency.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "xr-opt-arch",
        "roleTitle": "3D Optimization & Rendering Specialist",
        "name": "VR Performance & Draw Call Architect",
        "level": 2,
        "parentId": "xr-unity-lead",
        "responsibilities": "Profile stereoscopic rendering pipelines, combine draw calls, bake static lighting, and implement foveated rendering.",
        "workflowInstructions": "Guarantee rock-solid 90 FPS / 120 FPS frame rates to prevent user motion discomfort.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "xr-char-artist",
        "roleTitle": "3D Spatial Asset & Rigging Artist",
        "name": "Volumetric 3D Model Specialist",
        "level": 2,
        "parentId": "xr-dir",
        "responsibilities": "Model detailed interactive 3D objects, configure realistic physically based rendering (PBR) materials, and rig models for spatial manipulation.",
        "workflowInstructions": "Balance visual photorealism with mobile headset GPU constraints.",
        "delegationPolicy": "up",
        "color": "#d97706"
      },
      {
        "id": "xr-tester",
        "roleTitle": "VR Ergonomics & QA Specialist",
        "name": "Headset Usability & Testing Lead",
        "level": 2,
        "parentId": "xr-dir",
        "responsibilities": "Conduct extensive comfort playtests wearing headsets, evaluating physical arm fatigue, neck strain, and spatial navigation clarity.",
        "workflowInstructions": "Identify interaction bugs and certify headset battery optimization.",
        "delegationPolicy": "up",
        "color": "#ec4899"
      }
    ]
  },
  {
    "id": "chain-video-game-qa-localization",
    "name": "Video Game QA & Global Localization Studio",
    "companyName": "Video Game QA & Global Localization Studio",
    "description": "Global gaming quality and linguistic adaptation bureau ensuring games meet console platform certification standards and cultural authenticity worldwide.",
    "category": "Game Development",
    "domain": "Game Localization",
    "color": "#059669",
    "icon": "Languages",
    "nodes": [
      {
        "id": "loc-dir",
        "roleTitle": "Localization & QA Studio Director",
        "name": "Global Quality & Languages Head",
        "level": 0,
        "parentId": null,
        "responsibilities": "Oversee simultaneous worldwide game shipping across 20+ languages, platform certification compliance (Sony/Microsoft/Nintendo), and translation quality.",
        "workflowInstructions": "Direct Lead Localization Coordinator and Lead Compliance QA Engineer.",
        "delegationPolicy": "auto",
        "color": "#064e3b"
      },
      {
        "id": "loc-coord",
        "roleTitle": "Lead Localization Coordinator",
        "name": "Linguistic Quality Assurance Lead",
        "level": 1,
        "parentId": "loc-dir",
        "responsibilities": "Manage multi-language translation pipelines, voiceover dubbing studios, subtitle synchronization, and in-game text string extraction.",
        "workflowInstructions": "Supervise Culturalization Specialist and Linguistic QA Testers.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "loc-cult-spec",
        "roleTitle": "Culturalization Specialist",
        "name": "Regional Context & Sensitivity Lead",
        "level": 2,
        "parentId": "loc-coord",
        "responsibilities": "Review game narrative, character costumes, symbols, and dialogue to ensure cultural appropriateness and legal compliance in international markets.",
        "workflowInstructions": "Prevent offensive misunderstandings and adapt cultural humor.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "loc-tester",
        "roleTitle": "Linguistic QA Tester",
        "name": "In-Game Language Quality Tester",
        "level": 2,
        "parentId": "loc-coord",
        "responsibilities": "Play through localized builds to catch text truncation, overlapping UI dialogue boxes, untranslated English strings, and inconsistent terminology.",
        "workflowInstructions": "Verify that dialogue subtitle timing matches voice acting performances.",
        "delegationPolicy": "up",
        "color": "#34d399"
      },
      {
        "id": "loc-cert-lead",
        "roleTitle": "Platform Compliance QA Lead",
        "name": "TRC / TCR Console Certification Specialist",
        "level": 1,
        "parentId": "loc-dir",
        "responsibilities": "Lead console platform compliance testing: verify controller disconnect handling, parental controls, user profile switching, and error message phrasing.",
        "workflowInstructions": "Supervise Compliance QA Tester on formal submission checklist audits.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "loc-cert-tester",
        "roleTitle": "Compliance QA Tester",
        "name": "First-Party Standards Specialist",
        "level": 2,
        "parentId": "loc-cert-lead",
        "responsibilities": "Subject game builds to strict first-party checklist tests (Sony TRC, Microsoft TCR, Nintendo Guidelines) to ensure first-time submission approval.",
        "workflowInstructions": "Prevent costly console submission rejections and launch delays.",
        "delegationPolicy": "up",
        "color": "#06b6d4"
      }
    ]
  },
  {
    "id": "chain-interactive-metaverse-3d-engine",
    "name": "Real-Time WebGL & 3D Graphics Engine Studio",
    "companyName": "Real-Time WebGL & 3D Graphics Engine Studio",
    "description": "Cutting-edge browser 3D graphics studio building WebGPU rendering engines, interactive architectural configurators, and multi-user spatial worlds.",
    "category": "Game Development",
    "domain": "Web Graphics",
    "color": "#0891b2",
    "icon": "Box",
    "nodes": [
      {
        "id": "web3d-dir",
        "roleTitle": "3D Graphics Studio Director",
        "name": "Chief Technology Officer - 3D Web",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead next-generation in-browser 3D capabilities, WebGPU engine adoption, photorealistic client visual configurators, and 60 FPS browser benchmarks.",
        "workflowInstructions": "Direct Lead WebGPU Engine Architect and Technical 3D Artist.",
        "delegationPolicy": "auto",
        "color": "#0e7490"
      },
      {
        "id": "web3d-arch",
        "roleTitle": "Lead WebGPU & Shader Architect",
        "name": "Browser Graphics Engine Architect",
        "level": 1,
        "parentId": "web3d-dir",
        "responsibilities": "Build custom WebGPU / WebGL rendering engines using WGSL shaders, deferred rendering pipelines, screen-space reflections, and bloom post-processing.",
        "workflowInstructions": "Supervise 3D Engine Developer on low-level compute pipelines.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "web3d-eng-dev",
        "roleTitle": "3D Engine Systems Developer",
        "name": "Three.js / Babylon.js Specialist",
        "level": 2,
        "parentId": "web3d-arch",
        "responsibilities": "Implement asset streaming loaders (glTF/DRACO compression), scene hierarchy graphs, frustum culling, and camera orbit controls.",
        "workflowInstructions": "Ensure 3D scenes load in under 2 seconds on mobile cellular connections.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "web3d-tech-artist",
        "roleTitle": "Lead Technical 3D Web Artist",
        "name": "glTF / PBR Optimization Specialist",
        "level": 1,
        "parentId": "web3d-dir",
        "responsibilities": "Optimize high-poly CAD engineering models into lightweight web-optimized glTF models with baked ambient occlusion and normal maps.",
        "workflowInstructions": "Achieve photorealistic automotive and architectural visual fidelity in browser viewports.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "web3d-shader-dev",
        "roleTitle": "Procedural Shader Developer",
        "name": "WGSL / GLSL Shader Specialist",
        "level": 2,
        "parentId": "web3d-arch",
        "responsibilities": "Write procedural materials: dynamic car paint with metallic flakes, animated water surfaces, photorealistic glass refractions, and cloth weaves.",
        "workflowInstructions": "Optimize fragment shader performance to eliminate thermal throttling.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "web3d-multi-dev",
        "roleTitle": "Multi-User Spatial Networking Developer",
        "name": "WebRTC & Colyseus Specialist",
        "level": 2,
        "parentId": "web3d-dir",
        "responsibilities": "Implement real-time spatial networking: synchronize user avatar positions, head rotations, and audio spatialization over WebSockets/WebRTC.",
        "workflowInstructions": "Allow thousands of remote users to explore interactive 3D virtual showrooms simultaneously.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "web3d-perf-eng",
        "roleTitle": "Browser Performance & FPS Profiler",
        "name": "Memory & WebGPU Profiling Specialist",
        "level": 2,
        "parentId": "web3d-arch",
        "responsibilities": "Profile GPU memory allocation, eliminate browser tab memory leaks, and tune dynamic level-of-detail (LOD) transitions.",
        "workflowInstructions": "Maintain buttery-smooth 60 FPS across low-end laptops and mobile tablets.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "web3d-ui-int",
        "roleTitle": "3D UI & Web Embed Integrator",
        "name": "React Three Fiber / DOM Overlay Lead",
        "level": 2,
        "parentId": "web3d-dir",
        "responsibilities": "Seamlessly bridge standard HTML/CSS DOM controls with 3D canvas viewports, creating interactive product customization hotspots and camera animations.",
        "workflowInstructions": "Deliver intuitive commercial configurators that drive e-commerce sales conversions.",
        "delegationPolicy": "up",
        "color": "#ec4899"
      }
    ]
  },
  {
    "id": "chain-healthtech-ehr-telemedicine",
    "name": "Telemedicine & Remote Patient Monitoring",
    "companyName": "Telemedicine & Remote Patient Monitoring",
    "description": "Comprehensive healthcare software org delivering HIPAA-compliant WebRTC video consultations, electronic prescription routing, and IoT vital monitoring.",
    "category": "Healthcare",
    "domain": "Telehealth",
    "color": "#e11d48",
    "icon": "Activity",
    "nodes": [
      {
        "id": "tele-vp",
        "roleTitle": "VP of HealthTech Engineering",
        "name": "Chief Technology Officer - Health Systems",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead clinical software safety, HIPAA/HITECH security certifications, EHR interoperability (HL7 FHIR), and 99.999% video consultation uptime.",
        "workflowInstructions": "Direct Telehealth Systems Architect, EHR Integration Lead, and Chief Medical Information Officer.",
        "delegationPolicy": "auto",
        "color": "#9f1239"
      },
      {
        "id": "tele-cmio",
        "roleTitle": "Chief Medical Information Officer (CMIO)",
        "name": "Clinical Workflow & Physician Ergonomics Head",
        "level": 1,
        "parentId": "tele-vp",
        "responsibilities": "Ensure clinical charting templates, e-prescribing validation (EPCS), and diagnostic lab order flows match standard medical board protocols.",
        "workflowInstructions": "Review software release candidates for patient safety and clinical documentation accuracy.",
        "delegationPolicy": "auto",
        "color": "#be123c"
      },
      {
        "id": "tele-arch",
        "roleTitle": "Telehealth Systems Architect",
        "name": "WebRTC Video & Real-Time Media Architect",
        "level": 1,
        "parentId": "tele-vp",
        "responsibilities": "Architect end-to-end encrypted WebRTC audio/video consultations, low-latency media gateways, and automatic network bandwidth adaptation.",
        "workflowInstructions": "Supervise Real-Time Video Engineer on packet loss resilience.",
        "delegationPolicy": "both",
        "color": "#e11d48"
      },
      {
        "id": "tele-video-eng",
        "roleTitle": "Real-Time Video Engineer",
        "name": "WebRTC & Media Server Specialist",
        "level": 2,
        "parentId": "tele-arch",
        "responsibilities": "Implement SFU/MCU video servers, optimize video codecs (AV1/H.264), eliminate audio echo, and build multi-party doctor-patient-specialist calls.",
        "workflowInstructions": "Ensure reliable video connections even for patients on rural cellular connections.",
        "delegationPolicy": "both",
        "color": "#fb7185"
      },
      {
        "id": "tele-ehr-lead",
        "roleTitle": "EHR Interoperability Lead",
        "name": "HL7 / FHIR Integration Specialist",
        "level": 1,
        "parentId": "tele-vp",
        "responsibilities": "Manage bidirectional clinical data integration with major hospital EHR systems (Epic, Cerner) using HL7 FHIR REST APIs and SMART on FHIR.",
        "workflowInstructions": "Supervise Medical Data Mapping Engineer on standard clinical taxonomies (SNOMED, LOINC).",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "tele-data-eng",
        "roleTitle": "Medical Data Mapping Engineer",
        "name": "FHIR Clinical Data Specialist",
        "level": 2,
        "parentId": "tele-ehr-lead",
        "responsibilities": "Map clinical vitals, medication histories, and allergy lists into standardized FHIR resources, ensuring zero data loss during sync.",
        "workflowInstructions": "Maintain immutable clinical audit trails on every medical record access.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "tele-eprescribe",
        "roleTitle": "E-Prescription & Pharmacy Integration Lead",
        "name": "Surescripts / NCPDP Specialist",
        "level": 2,
        "parentId": "tele-ehr-lead",
        "responsibilities": "Implement secure e-prescribing compliant with DEA Electronic Prescriptions for Controlled Substances (EPCS) regulations, routing to pharmacies.",
        "workflowInstructions": "Verify dual-factor authentication and pharmacy drug-drug interaction warning checks.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "tele-iot-lead",
        "roleTitle": "Remote Patient Monitoring (RPM) Lead",
        "name": "Medical IoT Vitals Specialist",
        "level": 1,
        "parentId": "tele-vp",
        "responsibilities": "Ingest continuous Bluetooth medical device telemetry (blood pressure cuffs, pulse oximeters, glucometers) into real-time patient charts.",
        "workflowInstructions": "Direct Alert Automation Engineer on critical patient vital thresholds.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "tele-alert-eng",
        "roleTitle": "Clinical Alert Automation Engineer",
        "name": "Emergency Triage Rules Specialist",
        "level": 2,
        "parentId": "tele-iot-lead",
        "responsibilities": "Build automated emergency triage rules: alert attending on-call physicians instantly via SMS/push if patient oxygen saturation drops dangerously.",
        "workflowInstructions": "Maintain high reliability on critical patient emergency alarms.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      },
      {
        "id": "tele-hipaa-sec",
        "roleTitle": "HIPAA Security & Privacy Officer",
        "name": "Healthcare Information Security Officer",
        "level": 1,
        "parentId": "tele-vp",
        "responsibilities": "Conduct annual HIPAA risk assessments, maintain Business Associate Agreements (BAAs), audit access logs, and enforce encryption at rest.",
        "workflowInstructions": "Ensure patient health information (PHI) is isolated and impenetrable.",
        "delegationPolicy": "both",
        "color": "#7c3aed"
      },
      {
        "id": "tele-bill-eng",
        "roleTitle": "Medical Billing & Insurance Claims Lead",
        "name": "EDI 837 / 835 Claims Specialist",
        "level": 2,
        "parentId": "tele-ehr-lead",
        "responsibilities": "Automate medical insurance claim generation (EDI 837), real-time patient copay eligibility verification (EDI 270/271), and billing reconciliation.",
        "workflowInstructions": "Accelerate clinic insurance reimbursement cycles.",
        "delegationPolicy": "up",
        "color": "#d97706"
      },
      {
        "id": "tele-pt-portal",
        "roleTitle": "Patient Portal Mobile Developer",
        "name": "iOS / Android Healthcare Specialist",
        "level": 2,
        "parentId": "tele-arch",
        "responsibilities": "Build accessible, multilingual patient mobile apps for booking appointments, joining video visits with 1 tap, and viewing lab results.",
        "workflowInstructions": "Ensure compliance with WCAG AAA accessibility for elderly and visually impaired patients.",
        "delegationPolicy": "up",
        "color": "#059669"
      }
    ]
  },
  {
    "id": "chain-medical-device-software-samd",
    "name": "Software as a Medical Device (SaMD)",
    "companyName": "Software as a Medical Device (SaMD)",
    "description": "Regulated medical device software organization building life-critical diagnostic tools under ISO 13485, IEC 62304, and FDA 510(k) clearance.",
    "category": "Healthcare",
    "domain": "Medical Device Software",
    "color": "#be123c",
    "icon": "Heart",
    "nodes": [
      {
        "id": "samd-vp",
        "roleTitle": "Head of Medical Device Software",
        "name": "VP Software Engineering & Quality",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead life-critical software governance, FDA 510(k) / PMA submission clearance, CE mark medical certifications, and ISO 13485 audits.",
        "workflowInstructions": "Direct Medical Software Quality Manager and Lead Verification & Validation Architect.",
        "delegationPolicy": "auto",
        "color": "#881337"
      },
      {
        "id": "samd-qa-mgr",
        "roleTitle": "ISO 13485 Quality Assurance Manager",
        "name": "Design Controls & Quality Systems Head",
        "level": 1,
        "parentId": "samd-vp",
        "responsibilities": "Enforce Design History File (DHF) completeness, hazard traceability matrices (ISO 14971 risk management), and design freeze approvals.",
        "workflowInstructions": "Direct Regulatory Affairs Specialist on formal submission filings.",
        "delegationPolicy": "auto",
        "color": "#9f1239"
      },
      {
        "id": "samd-reg-spec",
        "roleTitle": "FDA Regulatory Affairs Specialist",
        "name": "510(k) & De Novo Submission Lead",
        "level": 2,
        "parentId": "samd-qa-mgr",
        "responsibilities": "Prepare comprehensive technical documentation for FDA, EU MDR, and Health Canada submissions, coordinating reviewer inquiries.",
        "workflowInstructions": "Ensure every software specification links directly to patient safety risk mitigations.",
        "delegationPolicy": "both",
        "color": "#be123c"
      },
      {
        "id": "samd-arch",
        "roleTitle": "Principal Medical Software Architect",
        "name": "IEC 62304 Class C Systems Architect",
        "level": 1,
        "parentId": "samd-vp",
        "responsibilities": "Architect life-critical medical software compliant with IEC 62304 Class C (death or serious injury prevention), memory safety, and fail-safes.",
        "workflowInstructions": "Direct Embedded Medical Firmware Lead and Algorithmic Diagnostic Lead.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "samd-embed-lead",
        "roleTitle": "Embedded Medical Firmware Lead",
        "name": "Real-Time OS (RTOS) Medical Engineer",
        "level": 2,
        "parentId": "samd-arch",
        "responsibilities": "Develop deterministic real-time firmware in MISRA C++ on medical hardware microcontrollers, managing watchdog timers and fail-safe shutdowns.",
        "workflowInstructions": "Supervise Firmware Developer on hardware peripheral interfaces.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "samd-embed-dev",
        "roleTitle": "Embedded Medical Developer",
        "name": "Firmware Hardware Driver Specialist",
        "level": 3,
        "parentId": "samd-embed-lead",
        "responsibilities": "Implement hardware drivers for optical diagnostic sensors, motor pumps, and patient ECG leads with strict memory bounds.",
        "workflowInstructions": "Eliminate buffer overflows and unhandled interrupts.",
        "delegationPolicy": "both",
        "color": "#38bdf8"
      },
      {
        "id": "samd-algo-lead",
        "roleTitle": "Diagnostic Algorithm & ML Lead",
        "name": "Medical Image AI Specialist",
        "level": 2,
        "parentId": "samd-arch",
        "responsibilities": "Develop machine learning diagnostic algorithms (e.g. automated cancer lesion detection), validating sensitivity (> 99%) and specificity.",
        "workflowInstructions": "Lock algorithm weights and establish strict Good Machine Learning Practice (GMLP) documentation.",
        "delegationPolicy": "both",
        "color": "#7c3aed"
      },
      {
        "id": "samd-vv-lead",
        "roleTitle": "Lead Verification & Validation (V&V) Architect",
        "name": "Software V&V Directorate Head",
        "level": 1,
        "parentId": "samd-vp",
        "responsibilities": "Design comprehensive automated verification protocols, hardware-in-the-loop (HIL) simulators, and clinical validation studies.",
        "workflowInstructions": "Supervise V&V Test Engineers on formal protocol executions.",
        "delegationPolicy": "auto",
        "color": "#10b981"
      },
      {
        "id": "samd-vv-eng",
        "roleTitle": "Senior Medical V&V Test Engineer",
        "name": "Automated Protocol Execution Specialist",
        "level": 2,
        "parentId": "samd-vv-lead",
        "responsibilities": "Execute formal, immutable software test protocols against production builds, recording every test artifact in the Design History File.",
        "workflowInstructions": "Verify that every software safety requirement passes 100% of test cases.",
        "delegationPolicy": "up",
        "color": "#34d399"
      },
      {
        "id": "samd-cyber-spec",
        "roleTitle": "Medical Device Cybersecurity Specialist",
        "name": "FDA Cybersecurity Guidance Lead",
        "level": 2,
        "parentId": "samd-arch",
        "responsibilities": "Enforce post-market cybersecurity monitoring (AAMI TIR57), Software Bill of Materials (SBOM), and secure cryptographic firmware update verification.",
        "workflowInstructions": "Prevent remote tampering of connected medical devices.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      },
      {
        "id": "samd-human-factors",
        "roleTitle": "Human Factors & Usability Engineer",
        "name": "IEC 62366 Medical Usability Specialist",
        "level": 2,
        "parentId": "samd-qa-mgr",
        "responsibilities": "Conduct summative usability testing with clinicians, identifying potential user operation errors that could lead to medication or diagnosis errors.",
        "workflowInstructions": "Design foolproof interfaces that prevent catastrophic operator mistakes.",
        "delegationPolicy": "up",
        "color": "#d97706"
      }
    ]
  },
  {
    "id": "chain-biotech-genomics-pipeline",
    "name": "Bioinformatics & Genomics Processing Pipeline",
    "companyName": "Bioinformatics & Genomics Processing Pipeline",
    "description": "Computational biology and next-generation sequencing (NGS) data processing platform handling petabyte-scale genome alignment and variant calling.",
    "category": "Healthcare",
    "domain": "Bioinformatics",
    "color": "#059669",
    "icon": "Dna",
    "nodes": [
      {
        "id": "bio-head",
        "roleTitle": "Head of Computational Biology",
        "name": "Director of Bioinformatics & Genomics",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead genomic analysis pipelines, population-scale genetic discoveries, high-performance computing (HPC) research budgets, and clinical lab CLIA validation.",
        "workflowInstructions": "Direct Lead Bioinformatics Scientist and Cloud Genomics Architect.",
        "delegationPolicy": "auto",
        "color": "#064e3b"
      },
      {
        "id": "bio-sci-lead",
        "roleTitle": "Lead Bioinformatics Scientist",
        "name": "NGS Variant Calling & Genomics Specialist",
        "level": 1,
        "parentId": "bio-head",
        "responsibilities": "Design secondary and tertiary analysis pipelines for whole genome sequencing (WGS), single-cell RNA-seq, and somatic tumor mutations.",
        "workflowInstructions": "Supervise Bioinformaticians on GATK / BWA pipeline optimizations.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "bio-analyst",
        "roleTitle": "Bioinformatics Pipeline Engineer",
        "name": "Nextflow / Snakemake Specialist",
        "level": 2,
        "parentId": "bio-sci-lead",
        "responsibilities": "Write reproducible, containerized genomic workflows using Nextflow, Docker, and CWL across thousands of patient FASTQ samples.",
        "workflowInstructions": "Ensure deterministic alignment against human reference genomes (GRCh38).",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "bio-hpc-arch",
        "roleTitle": "Cloud Genomics Infrastructure Architect",
        "name": "AWS Batch / Slurm HPC Specialist",
        "level": 1,
        "parentId": "bio-head",
        "responsibilities": "Architect petabyte-scale cloud storage (AWS S3 Glacier), multi-thousand core Spot compute clusters, and high-throughput Lustre filesystems.",
        "workflowInstructions": "Reduce cost-per-genome analyzed while meeting clinical turnaround SLAs.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "bio-variant-curator",
        "roleTitle": "Clinical Genomic Variant Curator",
        "name": "ACMG Classification Specialist",
        "level": 2,
        "parentId": "bio-sci-lead",
        "responsibilities": "Curate detected single nucleotide polymorphisms (SNPs) and structural variants against ClinVar/gnomAD, classifying pathogenicity.",
        "workflowInstructions": "Deliver clinical genomic diagnosis reports to medical geneticists.",
        "delegationPolicy": "both",
        "color": "#7c3aed"
      },
      {
        "id": "bio-db-eng",
        "roleTitle": "Genomics Database Engineer",
        "name": "Hail / BigQuery Genetic Data Lead",
        "level": 2,
        "parentId": "bio-hpc-arch",
        "responsibilities": "Manage distributed genomic query engines (Hail / TileDB / BigQuery) querying billions of genetic variants across cohorts in seconds.",
        "workflowInstructions": "Enable researchers to run genome-wide association studies (GWAS) rapidly.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "bio-clia-qa",
        "roleTitle": "CLIA / CAP Clinical Laboratory QA Specialist",
        "name": "Genomic Assay Validation Lead",
        "level": 2,
        "parentId": "bio-head",
        "responsibilities": "Certify that automated pipelines comply with clinical laboratory validation standards (CLIA/CAP), verifying false-positive rates (< 0.001%).",
        "workflowInstructions": "Maintain certified audit trails for clinical diagnostic reports.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      },
      {
        "id": "bio-ui-dev",
        "roleTitle": "Genomic Visualization Developer",
        "name": "IGV / Genome Browser Fullstack Dev",
        "level": 2,
        "parentId": "bio-sci-lead",
        "responsibilities": "Build web-based genome browsers, interactive karyotype chromosome plots, and variant filtering dashboards for clinical researchers.",
        "workflowInstructions": "Render million-base-pair genetic alignments smoothly in browser canvases.",
        "delegationPolicy": "up",
        "color": "#d97706"
      }
    ]
  },
  {
    "id": "chain-automotive-software-vehicle",
    "name": "Automotive Software-Defined Vehicle (SDV)",
    "companyName": "Automotive Software-Defined Vehicle (SDV)",
    "description": "Autonomous vehicle and automotive software organization delivering AUTOSAR classic/adaptive stacks, ADAS computer vision, and over-the-air (OTA) updates.",
    "category": "DeepTech",
    "domain": "Automotive Software",
    "color": "#2563eb",
    "icon": "Car",
    "nodes": [
      {
        "id": "sdv-vp",
        "roleTitle": "VP of Vehicle Software",
        "name": "Head of Software-Defined Vehicle Engineering",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead vehicle software architecture, ISO 26262 ASIL-D functional safety compliance, Tier-1 OEM partnerships, and over-the-air fleet updating.",
        "workflowInstructions": "Direct Chief AUTOSAR Architect, ADAS Vision Lead, and Vehicle Telematics Director.",
        "delegationPolicy": "auto",
        "color": "#1e40af"
      },
      {
        "id": "sdv-autosar-arch",
        "roleTitle": "Chief AUTOSAR Architect",
        "name": "Adaptive & Classic AUTOSAR Specialist",
        "level": 1,
        "parentId": "sdv-vp",
        "responsibilities": "Design centralized vehicle zonal compute architecture, Ethernet backbones (SOME/IP), and embedded CAN/LIN microcontrollers.",
        "workflowInstructions": "Supervise Embedded AUTOSAR Developers on low-level ECU firmware.",
        "delegationPolicy": "both",
        "color": "#2563eb"
      },
      {
        "id": "sdv-ecu-dev",
        "roleTitle": "Senior Embedded ECU Developer",
        "name": "C / C++ Real-Time Vehicle Systems Specialist",
        "level": 2,
        "parentId": "sdv-autosar-arch",
        "responsibilities": "Implement chassis control firmware, brake-by-wire, steering actuators, and battery management systems (BMS) meeting ASIL-D standards.",
        "workflowInstructions": "Ensure microsecond response times and zero software watchdog resets.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "sdv-adas-lead",
        "roleTitle": "ADAS Perception & Vision Lead",
        "name": "Autonomous Driving Deep Learning Lead",
        "level": 1,
        "parentId": "sdv-vp",
        "responsibilities": "Lead camera, radar, and LiDAR sensor fusion algorithms for Level 2+/Level 3 autonomous driving (automatic emergency braking, lane centering).",
        "workflowInstructions": "Supervise Autonomous Driving Neural Network Engineer.",
        "delegationPolicy": "both",
        "color": "#7c3aed"
      },
      {
        "id": "sdv-adas-eng",
        "roleTitle": "Autonomous Driving Vision Engineer",
        "name": "Edge TensorRT & Object Detection Specialist",
        "level": 2,
        "parentId": "sdv-adas-lead",
        "responsibilities": "Train neural networks detecting pedestrians, road boundaries, traffic signs, and vehicles at 60 FPS on in-vehicle automotive compute chips.",
        "workflowInstructions": "Optimize sensor fusion latency to maximize vehicle braking reaction distance.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "sdv-safety-lead",
        "roleTitle": "Functional Safety Manager (ISO 26262)",
        "name": "ASIL-D Functional Safety Assessor",
        "level": 1,
        "parentId": "sdv-vp",
        "responsibilities": "Conduct hazard analysis and risk assessments (HARA), safety cases, and fault tree analyses (FTA), auditing every line of safety-critical code.",
        "workflowInstructions": "Certify that hardware or software faults automatically transition vehicles to a safe state.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "sdv-ota-lead",
        "roleTitle": "Over-The-Air (OTA) Update Lead",
        "name": "Uptane Secure Vehicle Flashing Specialist",
        "level": 1,
        "parentId": "sdv-vp",
        "responsibilities": "Build secure over-the-air firmware update system using Uptane cryptographic framework, dual-bank A/B partitioning, and rollback safety.",
        "workflowInstructions": "Supervise Cloud Telematics Engineer on fleet rollout campaigns.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "sdv-telematics",
        "roleTitle": "Cloud Telematics Engineer",
        "name": "MQTT / Vehicle IoT Cloud Specialist",
        "level": 2,
        "parentId": "sdv-ota-lead",
        "responsibilities": "Ingest millions of vehicle telemetry signals (battery degradation, motor temperatures, driving habits) into high-throughput cloud databases.",
        "workflowInstructions": "Trigger predictive maintenance service alerts before component failure occurs.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "sdv-hil-lead",
        "roleTitle": "Hardware-in-the-Loop (HIL) Test Lead",
        "name": "Vehicle Simulation & Rig Testing Lead",
        "level": 1,
        "parentId": "sdv-vp",
        "responsibilities": "Build physical hardware-in-the-loop (HIL) simulation test benches replicating real vehicle dynamics, sensor feeds, and electrical faults.",
        "workflowInstructions": "Supervise HIL Test Automation Engineer.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "sdv-hil-eng",
        "roleTitle": "HIL Test Automation Engineer",
        "name": "Automated Vehicle Testing Specialist",
        "level": 2,
        "parentId": "sdv-hil-lead",
        "responsibilities": "Run continuous automated simulation sweeps over millions of virtual miles, injecting sudden road obstacles and icy pavement conditions.",
        "workflowInstructions": "Certify software build stability before flashing physical vehicle prototypes.",
        "delegationPolicy": "up",
        "color": "#34d399"
      },
      {
        "id": "sdv-infotainment",
        "roleTitle": "In-Vehicle Infotainment (IVI) Lead",
        "name": "Android Automotive OS Specialist",
        "level": 2,
        "parentId": "sdv-autosar-arch",
        "responsibilities": "Build fluid cockpit touch display experiences (Android Automotive / Qt), digital instrument clusters, navigation, and voice controls.",
        "workflowInstructions": "Ensure infotainment system crashes never compromise critical driving controls.",
        "delegationPolicy": "up",
        "color": "#d97706"
      },
      {
        "id": "sdv-sec-lead",
        "roleTitle": "Vehicle Cybersecurity Engineer (ISO 21434)",
        "name": "Automotive Penetration Testing Specialist",
        "level": 2,
        "parentId": "sdv-safety-lead",
        "responsibilities": "Perform ethical hacking against in-vehicle networks, testing CAN bus injection, Bluetooth exploits, and gateway firewall rules.",
        "workflowInstructions": "Guarantee vehicle systems are protected against remote wireless hijacking.",
        "delegationPolicy": "up",
        "color": "#991b1b"
      },
      {
        "id": "sdv-field-tester",
        "roleTitle": "Vehicle Fleet Test Driver & Data Logger",
        "name": "Proving Ground Validation Specialist",
        "level": 2,
        "parentId": "sdv-hil-lead",
        "responsibilities": "Drive test vehicles on proving grounds, validate real-world steering and braking feel, and log edge-case sensor disconnects.",
        "workflowInstructions": "Provide direct engineering feedback to ADAS and Chassis leads.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-robotics-autonomous-systems",
    "name": "Robotics & Autonomous Drone Navigation",
    "companyName": "Robotics & Autonomous Drone Navigation",
    "description": "Autonomous robotics engineering team building mobile warehouse robots (AMR) and autonomous delivery drones with ROS 2, SLAM, and motion planning.",
    "category": "DeepTech",
    "domain": "Robotics Systems",
    "color": "#ea580c",
    "icon": "Bot",
    "nodes": [
      {
        "id": "rob-dir",
        "roleTitle": "Director of Robotics Engineering",
        "name": "Head of Autonomous Systems & Hardware",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead autonomous mobile robotics vision, warehouse fleet deployments, FAA drone clearance certifications, and zero-collision safety.",
        "workflowInstructions": "Direct Lead Motion Planning Scientist and Embedded Robotics Hardware Lead.",
        "delegationPolicy": "auto",
        "color": "#c2410c"
      },
      {
        "id": "rob-slam-lead",
        "roleTitle": "SLAM & State Estimation Lead",
        "name": "LiDAR Odometry & Mapping Specialist",
        "level": 1,
        "parentId": "rob-dir",
        "responsibilities": "Implement real-time Simultaneous Localization and Mapping (SLAM), LiDAR inertial odometry (LIO), and visual feature tracking.",
        "workflowInstructions": "Ensure sub-centimeter positioning accuracy in indoor GPS-denied environments.",
        "delegationPolicy": "both",
        "color": "#ea580c"
      },
      {
        "id": "rob-motion-lead",
        "roleTitle": "Motion Planning & Control Lead",
        "name": "Trajectory & MPC Control Specialist",
        "level": 1,
        "parentId": "rob-dir",
        "responsibilities": "Develop real-time obstacle avoidance algorithms, Model Predictive Control (MPC) trajectory tracking, and dynamic path replanning.",
        "workflowInstructions": "Supervise Robotics Controls Engineer on smooth motor velocity curves.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "rob-control-eng",
        "roleTitle": "Robotics Controls Engineer",
        "name": "Motor Inverters & Actuator Specialist",
        "level": 2,
        "parentId": "rob-motion-lead",
        "responsibilities": "Tune closed-loop PID and feedforward motor controller loops, brushless DC drive inverters, and wheel slip compensation algorithms.",
        "workflowInstructions": "Prevent robot tip-overs and ensure precise deceleration at docking stations.",
        "delegationPolicy": "both",
        "color": "#f59e0b"
      },
      {
        "id": "rob-ros-lead",
        "roleTitle": "ROS 2 Architecture & Middleware Lead",
        "name": "DDS & Real-Time Linux Specialist",
        "level": 1,
        "parentId": "rob-dir",
        "responsibilities": "Design modular ROS 2 node graph architecture, manage CycloneDDS QoS profiles, and configure real-time Linux kernels (PREEMPT_RT).",
        "workflowInstructions": "Supervise Embedded Robotics Software Engineer.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "rob-embed-eng",
        "roleTitle": "Embedded Robotics Software Engineer",
        "name": "C++ / Micro-ROS Firmware Specialist",
        "level": 2,
        "parentId": "rob-ros-lead",
        "responsibilities": "Interface microcontrollers with optical encoders, ultrasonic sensors, emergency stop relays, and battery management systems (BMS).",
        "workflowInstructions": "Ensure hardware emergency stops halt the robot within 10 milliseconds.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "rob-sim-spec",
        "roleTitle": "Simulation & Digital Twin Specialist",
        "name": "Gazebo / Isaac Sim Specialist",
        "level": 2,
        "parentId": "rob-motion-lead",
        "responsibilities": "Build photorealistic physics simulations in NVIDIA Isaac Sim / Gazebo replicating warehouse lighting, pallet racks, and slippery floors.",
        "workflowInstructions": "Simulate millions of robot travel hours virtually to catch pathing bugs before physical testing.",
        "delegationPolicy": "up",
        "color": "#7c3aed"
      },
      {
        "id": "rob-fleet-mgr",
        "roleTitle": "Fleet Management & Dispatch Lead",
        "name": "Cloud Fleet Operations Specialist",
        "level": 1,
        "parentId": "rob-dir",
        "responsibilities": "Develop centralized cloud fleet management web software coordinating warehouse robot traffic, battery charging schedules, and warehouse tasks.",
        "workflowInstructions": "Prevent gridlock in warehouse intersections and optimize travel distance.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "rob-field-tech",
        "roleTitle": "Field Deployment & Commissioning Technician",
        "name": "On-Site Factory Robotics Tech",
        "level": 2,
        "parentId": "rob-fleet-mgr",
        "responsibilities": "Deploy robot fleets at client distribution centers, map physical building floorplans, calibrate sensors, and train factory workers.",
        "workflowInstructions": "Resolve on-site mechanical and network connectivity hurdles.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-iot-connected-hardware-firmware",
    "name": "IoT Connected Hardware & Embedded Firmware",
    "companyName": "IoT Connected Hardware & Embedded Firmware",
    "description": "Mass-market smart device engineering company designing low-power connected hardware, embedded C/C++ RTOS firmware, MQTT cloud brokers, and apps.",
    "category": "DeepTech",
    "domain": "IoT & Firmware",
    "color": "#0891b2",
    "icon": "Radio",
    "nodes": [
      {
        "id": "iot-dir",
        "roleTitle": "VP of IoT Systems Engineering",
        "name": "Connected Hardware & Software Head",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead smart hardware roadmap, multi-year battery lifespans, low-cost bill-of-materials (BOM), FCC/CE certifications, and millions of connected devices.",
        "workflowInstructions": "Direct Embedded Firmware Architect and IoT Cloud Platform Lead.",
        "delegationPolicy": "auto",
        "color": "#0e7490"
      },
      {
        "id": "iot-firm-arch",
        "roleTitle": "Embedded Firmware Architect",
        "name": "FreeRTOS / Zephyr Firmware Lead",
        "level": 1,
        "parentId": "iot-dir",
        "responsibilities": "Architect power-optimized embedded firmware in modern C/C++ on ARM Cortex-M microcontrollers (Nordic nRF, ESP32, STM32) using Zephyr RTOS.",
        "workflowInstructions": "Supervise Low-Power Firmware Engineer on microamp sleep modes.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "iot-lowpower-eng",
        "roleTitle": "Low-Power Firmware Engineer",
        "name": "Battery Optimization & BLE Specialist",
        "level": 2,
        "parentId": "iot-firm-arch",
        "responsibilities": "Optimize sleep duty cycles, tune Bluetooth Low Energy (BLE 5.3) advertising intervals, and manage peripheral power rails.",
        "workflowInstructions": "Achieve 3+ year battery life on coin-cell batteries.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "iot-hw-lead",
        "roleTitle": "Principal Hardware Electrical Engineer",
        "name": "PCB Design & RF Hardware Specialist",
        "level": 1,
        "parentId": "iot-dir",
        "responsibilities": "Design multi-layer PCB schematics (Altium Designer), tune RF antenna impedance, pass EMC radiation compliance, and manage contract manufacturers.",
        "workflowInstructions": "Direct Hardware Prototyping Technician on circuit board revisions.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "iot-hw-tech",
        "roleTitle": "Hardware Prototyping Technician",
        "name": "SMD Soldering & Test Rig Specialist",
        "level": 2,
        "parentId": "iot-hw-lead",
        "responsibilities": "Assemble surface-mount prototypes, operate thermal imaging cameras and oscilloscopes, and build automated manufacturing factory test fixtures.",
        "workflowInstructions": "Ensure 100% factory floor test yield before shipment packaging.",
        "delegationPolicy": "both",
        "color": "#f59e0b"
      },
      {
        "id": "iot-cloud-lead",
        "roleTitle": "IoT Cloud & Connectivity Architect",
        "name": "MQTT / AWS IoT Core Specialist",
        "level": 1,
        "parentId": "iot-dir",
        "responsibilities": "Architect high-throughput cloud broker ingesting 100,000+ messages/second from global devices over TLS-encrypted MQTT / CoAP protocols.",
        "workflowInstructions": "Supervise Cloud IoT Backend Developer.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "iot-cloud-dev",
        "roleTitle": "Cloud IoT Backend Developer",
        "name": "Device Shadow & Telemetry Engineer",
        "level": 2,
        "parentId": "iot-cloud-lead",
        "responsibilities": "Maintain digital device twins (device shadows), process incoming telemetry into time-series databases, and manage firmware OTA campaigns.",
        "workflowInstructions": "Ensure safe, staggered OTA rollouts with automatic rollback on boot failure.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "iot-app-dev",
        "roleTitle": "Companion Mobile App Developer",
        "name": "React Native / BLE Mobile Specialist",
        "level": 2,
        "parentId": "iot-dir",
        "responsibilities": "Build iOS/Android mobile apps with seamless Bluetooth device pairing (NFC/BLE), Wi-Fi credential provisioning, and firmware update flashing.",
        "workflowInstructions": "Deliver effortless zero-configuration consumer setup.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "iot-qa-spec",
        "roleTitle": "Environmental Stress & Reliability QA",
        "name": "Thermal Chamber & Drop Test Specialist",
        "level": 2,
        "parentId": "iot-hw-lead",
        "responsibilities": "Subject devices to environmental stress screening (ESS): extreme thermal chambers (-40C to +85C), humidity, drop tests, and ESD static shocks.",
        "workflowInstructions": "Ensure hardware endures years of harsh environmental exposure.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      }
    ]
  },
  {
    "id": "chain-cleantech-smart-grid-software",
    "name": "CleanTech Renewable Energy & Smart Grid",
    "companyName": "CleanTech Renewable Energy & Smart Grid",
    "description": "Clean energy technology firm managing distributed solar/wind generation, utility battery storage systems, dynamic grid load balancing, and carbon credits.",
    "category": "DeepTech",
    "domain": "CleanTech & Energy",
    "color": "#059669",
    "icon": "Sun",
    "nodes": [
      {
        "id": "clean-vp",
        "roleTitle": "VP of CleanTech Software",
        "name": "Energy Transition Technology Head",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead grid software reliability, virtual power plant (VPP) trading profits, utility grid interconnection approvals, and decarbonization impact.",
        "workflowInstructions": "Direct Smart Grid Network Architect and Energy Forecasting Data Scientist.",
        "delegationPolicy": "auto",
        "color": "#064e3b"
      },
      {
        "id": "clean-grid-arch",
        "roleTitle": "Smart Grid Network Architect",
        "name": "Distributed Energy Resources (DER) Lead",
        "level": 1,
        "parentId": "clean-vp",
        "responsibilities": "Design Virtual Power Plant (VPP) software aggregating thousands of distributed residential batteries and solar arrays into a single utility-scale asset.",
        "workflowInstructions": "Supervise SCADA & Inverter Integration Engineer.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "clean-scada-eng",
        "roleTitle": "SCADA & Solar Inverter Engineer",
        "name": "Modbus / SunSpec Protocol Specialist",
        "level": 2,
        "parentId": "clean-grid-arch",
        "responsibilities": "Communicate with industrial solar inverters, grid batteries (Tesla Megapack), and utility SCADA switches via Modbus TCP and IEEE 2030.5.",
        "workflowInstructions": "Execute sub-second automated frequency response commands to stabilize grid fluctuations.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "clean-forecast-lead",
        "roleTitle": "Energy Forecasting Data Scientist",
        "name": "Solar / Wind Generation ML Lead",
        "level": 1,
        "parentId": "clean-vp",
        "responsibilities": "Train machine learning models analyzing satellite weather feeds, cloud cover vectors, and historical wind patterns to forecast energy generation 48 hours out.",
        "workflowInstructions": "Supervise Energy Market Trading Developer.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "clean-trade-dev",
        "roleTitle": "Energy Market Trading Developer",
        "name": "Automated Spot Market Trading Engineer",
        "level": 2,
        "parentId": "clean-forecast-lead",
        "responsibilities": "Build algorithmic trading engines executing automated bids in wholesale wholesale electricity spot markets (CAISO, ERCOT, PJM).",
        "workflowInstructions": "Charge battery assets when power prices are negative and discharge to the grid during peak pricing spikes.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "clean-batt-spec",
        "roleTitle": "Battery Degradation & Health Specialist",
        "name": "Lithium Chemistry Optimization Lead",
        "level": 2,
        "parentId": "clean-grid-arch",
        "responsibilities": "Model lithium-ion battery electrochemical degradation, optimizing charging state-of-charge (SoC) curves to maximize lifespan to 15+ years.",
        "workflowInstructions": "Balance short-term energy trading revenue against long-term battery asset health.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "clean-carbon-spec",
        "roleTitle": "Carbon Accounting & Scope 1-3 Specialist",
        "name": "Greenhouse Gas Data Lead",
        "level": 2,
        "parentId": "clean-vp",
        "responsibilities": "Calculate certified carbon offset credits, clean energy production certificates (RECs), and audit compliance for sustainability reports.",
        "workflowInstructions": "Ensure mathematical accuracy of verified carbon avoidance claims.",
        "delegationPolicy": "up",
        "color": "#34d399"
      },
      {
        "id": "clean-util-liaison",
        "roleTitle": "Utility Interconnection Compliance Lead",
        "name": "Grid Operator Standards Specialist",
        "level": 2,
        "parentId": "clean-vp",
        "responsibilities": "Ensure compliance with regional electric reliability standards (NERC CIP), anti-islanding safety protocols, and utility interconnection tariffs.",
        "workflowInstructions": "Maintain legal clearance for distributed grid power exports.",
        "delegationPolicy": "up",
        "color": "#475569"
      }
    ]
  },
  {
    "id": "chain-logistics-fleet-telematics",
    "name": "Fleet Telematics & Route Optimization Software",
    "companyName": "Fleet Telematics & Route Optimization Software",
    "description": "High-scale logistics software company running real-time GPS fleet tracking, automated vehicle route optimization, driver safety AI, and fuel reduction.",
    "category": "DeepTech",
    "domain": "Fleet Telematics",
    "color": "#0891b2",
    "icon": "Truck",
    "nodes": [
      {
        "id": "ftele-vp",
        "roleTitle": "VP of Fleet Software Engineering",
        "name": "Head of Commercial Fleet Technology",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead fleet tracking scale (100,000+ commercial trucks tracked live), route optimization algorithms (saving 15%+ fuel), and driver safety AI.",
        "workflowInstructions": "Direct Route Optimization Scientist and Telematics Platform Architect.",
        "delegationPolicy": "auto",
        "color": "#0e7490"
      },
      {
        "id": "ftele-opt-sci",
        "roleTitle": "Route Optimization Scientist",
        "name": "Vehicle Routing Problem (VRP) Specialist",
        "level": 1,
        "parentId": "ftele-vp",
        "responsibilities": "Develop multi-stop Vehicle Routing Problem algorithms with time windows, commercial vehicle height/weight restrictions, and traffic historical data.",
        "workflowInstructions": "Supervise Dispatch Algorithm Developer on real-time re-routing.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "ftele-algo-dev",
        "roleTitle": "Dispatch Algorithm Developer",
        "name": "Operations Research & Python Specialist",
        "level": 2,
        "parentId": "ftele-opt-sci",
        "responsibilities": "Build high-performance routing solvers using Google OR-Tools and custom heuristics, calculating optimal delivery sequences in seconds.",
        "workflowInstructions": "Reduce aggregate fleet travel miles and meet strict customer delivery delivery appointments.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "ftele-plat-arch",
        "roleTitle": "Telematics Platform Architect",
        "name": "High-Throughput GPS Streaming Lead",
        "level": 1,
        "parentId": "ftele-vp",
        "responsibilities": "Architect streaming ingestion platform processing billions of GPS coordinate breadcrumbs, vehicle CAN bus engine diagnostic codes, and geofence alerts.",
        "workflowInstructions": "Supervise Telematics Device Engineer on hardware protocols.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "ftele-device-eng",
        "roleTitle": "Telematics Device & OBD-II Engineer",
        "name": "Vehicle Bus (J1939 / OBD) Specialist",
        "level": 2,
        "parentId": "ftele-plat-arch",
        "responsibilities": "Parse heavy-duty truck engine diagnostic trouble codes (J1939 CAN bus), monitor real-time fuel consumption, engine temperatures, and brake wear.",
        "workflowInstructions": "Trigger predictive maintenance work orders before highway mechanical breakdowns.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "ftele-dashcam-ai",
        "roleTitle": "Driver Safety Dashcam AI Engineer",
        "name": "In-Cab Computer Vision Specialist",
        "level": 2,
        "parentId": "ftele-vp",
        "responsibilities": "Deploy edge AI dashcam models detecting driver distraction, cell phone usage, drowsiness, and harsh braking events in real-time.",
        "workflowInstructions": "Issue polite audio safety alerts to drivers and calculate fleet safety risk scores for commercial insurance discounts.",
        "delegationPolicy": "both",
        "color": "#7c3aed"
      },
      {
        "id": "ftele-driver-app",
        "roleTitle": "Driver Mobile Application Lead",
        "name": "React Native Fleet Client Specialist",
        "level": 2,
        "parentId": "ftele-vp",
        "responsibilities": "Build ruggedized tablet apps for commercial drivers: digital turn-by-turn navigation with truck clearance routing, e-DVIR inspection forms, and e-signatures.",
        "workflowInstructions": "Ensure compliance with FMCSA Electronic Logging Device (ELD) hours-of-service rules.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "ftele-dispatch-ui",
        "roleTitle": "Fleet Dispatch Portal Developer",
        "name": "Real-Time Map & Geospatial Specialist",
        "level": 2,
        "parentId": "ftele-plat-arch",
        "responsibilities": "Build responsive web dispatch control centers rendering thousands of moving trucks on interactive vector maps using Mapbox GL / Deck.gl.",
        "workflowInstructions": "Allow dispatchers to drag-and-drop emergency pickup orders smoothly onto active routes.",
        "delegationPolicy": "up",
        "color": "#d97706"
      },
      {
        "id": "ftele-fuel-analyst",
        "roleTitle": "Fuel Efficiency & Emissions Analyst",
        "name": "Fleet Carbon & Energy Specialist",
        "level": 2,
        "parentId": "ftele-opt-sci",
        "responsibilities": "Track engine idle time, excessive speeding, and tire pressure metrics to advise fleet managers on fuel cost reduction programs.",
        "workflowInstructions": "Help fleets cut thousands of gallons of wasted diesel each month.",
        "delegationPolicy": "up",
        "color": "#059669"
      }
    ]
  },
  {
    "id": "chain-aviation-flight-operations-software",
    "name": "Aviation Flight Operations & Crew Dispatch",
    "companyName": "Aviation Flight Operations & Crew Dispatch",
    "description": "Mission-critical airline software managing flight dispatch, FAA regulatory flight plans, crew duty schedule optimization, and fuel tankering.",
    "category": "DeepTech",
    "domain": "Aviation Software",
    "color": "#1e3a8a",
    "icon": "Plane",
    "nodes": [
      {
        "id": "air-head",
        "roleTitle": "Director of Airline Software Systems",
        "name": "Head of Flight Operations Technology",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead flight dispatch reliability (zero operational groundings), FAA Part 121 compliance, crew duty schedule legality, and fuel burn optimization.",
        "workflowInstructions": "Direct Flight Planning Architect and Crew Scheduling Lead.",
        "delegationPolicy": "auto",
        "color": "#1e3a8a"
      },
      {
        "id": "air-plan-arch",
        "roleTitle": "Flight Planning & Dispatch Architect",
        "name": "Aviation Navigational Data Lead",
        "level": 1,
        "parentId": "air-head",
        "responsibilities": "Design automated flight planning software calculating optimal high-altitude jet stream routing, minimum fuel burn, and alternate airport reserves.",
        "workflowInstructions": "Supervise Flight Plan Calculation Developer.",
        "delegationPolicy": "both",
        "color": "#2563eb"
      },
      {
        "id": "air-plan-dev",
        "roleTitle": "Flight Plan Calculation Developer",
        "name": "Aircraft Performance & Aerodynamics Specialist",
        "level": 2,
        "parentId": "air-plan-arch",
        "responsibilities": "Implement aircraft performance aerodynamic tables (Boeing/Airbus flight manuals), take-off weight limits, and weather NOTAM parsing.",
        "workflowInstructions": "Generate legally compliant operational flight plans (OFP) for licensed flight dispatchers.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "air-crew-lead",
        "roleTitle": "Crew Pairing & Scheduling Lead",
        "name": "Combinatorial Optimization Specialist",
        "level": 1,
        "parentId": "air-head",
        "responsibilities": "Develop optimization algorithms solving complex airline crew pairing, pilot duty rest rules (FAA Part 117), and union contract seniority rules.",
        "workflowInstructions": "Supervise Crew Scheduling Algorithm Engineer.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "air-crew-dev",
        "roleTitle": "Crew Scheduling Algorithm Engineer",
        "name": "Operations Research & CPLEX Specialist",
        "level": 2,
        "parentId": "air-crew-lead",
        "responsibilities": "Solve multi-thousand pilot pairing matrices using mixed-integer programming (CPLEX/Gurobi), minimizing deadhead flights and hotel costs.",
        "workflowInstructions": "Ensure zero illegal crew duty schedule assignments.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "air-acars-eng",
        "roleTitle": "Aircraft Telemetry & ACARS Engineer",
        "name": "ARINC 429 & Satellite Data Specialist",
        "level": 2,
        "parentId": "air-plan-arch",
        "responsibilities": "Ingest in-flight aircraft ACARS text messages, satellite positional reports, engine health telemetry, and turbulence reports.",
        "workflowInstructions": "Provide flight dispatchers with real-time situational awareness across worldwide flights.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "air-safety-spec",
        "roleTitle": "Aviation Safety & Regulatory Compliance Lead",
        "name": "FAA / EASA Regulatory Specialist",
        "level": 1,
        "parentId": "air-head",
        "responsibilities": "Audit flight planning algorithms against International Civil Aviation Organization (ICAO) standards, ETOPS ratings, and weight/balance safety.",
        "workflowInstructions": "Ensure complete audit readiness for civil aviation authority inspections.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      },
      {
        "id": "air-ops-coord",
        "roleTitle": "Network Operations Center (NOC) UI Lead",
        "name": "Emergency Aircraft Re-Route Specialist",
        "level": 2,
        "parentId": "air-head",
        "responsibilities": "Build real-time airline operations control center displays rendering worldwide weather storms, runway closures, and maintenance aircraft swaps.",
        "workflowInstructions": "Allow dispatchers to manage irregular operations (IROPS) during severe snowstorms seamlessly.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-legaltech-contract-intelligence",
    "name": "LegalTech AI Contract Intelligence & Redlining",
    "companyName": "LegalTech AI Contract Intelligence & Redlining",
    "description": "Generative AI legal platform executing automated contract review, risk clause extraction, redlining suggestions, and playbook compliance.",
    "category": "LegalTech",
    "domain": "LegalTech AI",
    "color": "#78350f",
    "icon": "Scale",
    "nodes": [
      {
        "id": "legai-vp",
        "roleTitle": "VP of LegalTech Engineering",
        "name": "Chief Technology Officer - Legal AI",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead automated contract review accuracy (> 98% precision on liability clauses), legal hallucination prevention, and enterprise law firm security.",
        "workflowInstructions": "Direct Legal NLP Scientist and Contract Playbook Architect.",
        "delegationPolicy": "auto",
        "color": "#451a03"
      },
      {
        "id": "legai-nlp-lead",
        "roleTitle": "Lead Legal NLP Scientist",
        "name": "Contract Understanding & Clause Extraction Lead",
        "level": 1,
        "parentId": "legai-vp",
        "responsibilities": "Train specialized domain LLMs fine-tuned on hundreds of thousands of commercial agreements (NDAs, MSAs, SaaS agreements, vendor contracts).",
        "workflowInstructions": "Supervise Clause Extraction Engineer on token boundary classification.",
        "delegationPolicy": "both",
        "color": "#78350f"
      },
      {
        "id": "legai-nlp-eng",
        "roleTitle": "Clause Extraction Engineer",
        "name": "Named Entity & Semantic Extraction Specialist",
        "level": 2,
        "parentId": "legai-nlp-lead",
        "responsibilities": "Extract indemnification caps, governing law jurisdictions, non-compete terms, and termination notice periods from messy scanned PDFs.",
        "workflowInstructions": "Populate structured contract metadata tables automatically.",
        "delegationPolicy": "both",
        "color": "#b45309"
      },
      {
        "id": "legai-play-arch",
        "roleTitle": "Contract Playbook & Rules Architect",
        "name": "Senior Legal Knowledge Engineer",
        "level": 1,
        "parentId": "legai-vp",
        "responsibilities": "Translate corporate legal negotiation playbooks into automated redlining logic (e.g. 'If limitation of liability > 12 months fees, flag and suggest standard clause').",
        "workflowInstructions": "Supervise Redlining Engine Developer.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "legai-redline-dev",
        "roleTitle": "Automated Redlining Engine Developer",
        "name": "DOCX Track Changes & Diff Specialist",
        "level": 2,
        "parentId": "legai-play-arch",
        "responsibilities": "Build native Microsoft Word DOCX manipulation engines that inject precise tracked changes and explanatory attorney comments automatically.",
        "workflowInstructions": "Ensure flawless formatting preservation on complex legal tables and numbering hierarchies.",
        "delegationPolicy": "both",
        "color": "#f59e0b"
      },
      {
        "id": "legai-word-add",
        "roleTitle": "Microsoft Word Add-In Lead Developer",
        "name": "Office.js & Attorney Workflow Specialist",
        "level": 2,
        "parentId": "legai-vp",
        "responsibilities": "Develop native Microsoft Word desktop and web add-ins allowing attorneys to click one button to analyze active open contracts.",
        "workflowInstructions": "Deliver sub-3-second clause analysis directly inside the lawyer's primary authoring environment.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "legai-sec-lead",
        "roleTitle": "Legal Confidentiality & Zero-Retention Lead",
        "name": "Attorney-Client Privilege Security Specialist",
        "level": 1,
        "parentId": "legai-vp",
        "responsibilities": "Enforce strict zero-data-retention agreements with LLM providers, ensuring client confidential agreements are never used for model training.",
        "workflowInstructions": "Guarantee total confidentiality and compliance with American Bar Association ethics opinions.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      },
      {
        "id": "legai-qa-eval",
        "roleTitle": "Legal Accuracy Evaluation Lead",
        "name": "Attorney Benchmark & Golden Set Lead",
        "level": 2,
        "parentId": "legai-nlp-lead",
        "responsibilities": "Curate benchmark test suites of complex, negotiated agreements, scoring automated redlining accuracy against senior partner peer reviews.",
        "workflowInstructions": "Prevent subtle legal misinterpretations from ever slipping into client contracts.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-govtech-citizen-portal",
    "name": "GovTech Secure Citizen Services Portal",
    "companyName": "GovTech Secure Citizen Services Portal",
    "description": "Public sector digital services org delivering accessible, secure citizen benefit applications, digital driver's licenses, and court scheduling.",
    "category": "GovTech",
    "domain": "Public Sector Tech",
    "color": "#1e3a8a",
    "icon": "Building",
    "nodes": [
      {
        "id": "gov-dir",
        "roleTitle": "GovTech Project Director",
        "name": "Public Sector Digital Services Head",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead statewide digital government modernization, FedRAMP / StateRAMP security compliance, Section 508 accessibility, and multi-agency adoption.",
        "workflowInstructions": "Direct Secure Identity Architect and Citizen Service Lead.",
        "delegationPolicy": "auto",
        "color": "#1e3a8a"
      },
      {
        "id": "gov-id-arch",
        "roleTitle": "Secure Citizen Identity Architect",
        "name": "Login.gov / Identity Proofing Specialist",
        "level": 1,
        "parentId": "gov-dir",
        "responsibilities": "Architect citizen digital identity verification (NIST IAL2 / AAL2 compliance), multi-agency single sign-on, and digital credential vaults.",
        "workflowInstructions": "Supervise Identity Verification Developer on biometric liveness checks.",
        "delegationPolicy": "both",
        "color": "#2563eb"
      },
      {
        "id": "gov-id-dev",
        "roleTitle": "Identity Verification Developer",
        "name": "Facial Verification & Driver's License Specialist",
        "level": 2,
        "parentId": "gov-id-arch",
        "responsibilities": "Implement secure mobile driver's license (mDL) ISO 18013-5 protocols and automated state DMV database record matching.",
        "workflowInstructions": "Prevent identity theft and fraudulent unemployment claims.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "gov-service-lead",
        "roleTitle": "Citizen Services Delivery Lead",
        "name": "Public Workflow & Benefit Forms Head",
        "level": 1,
        "parentId": "gov-dir",
        "responsibilities": "Digitize complex paper government processes: food stamp applications (SNAP), Medicaid renewals, business licensing, and property tax payments.",
        "workflowInstructions": "Direct Citizen Portal Frontend Developer and Case Management Lead.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "gov-fe-dev",
        "roleTitle": "Citizen Portal Frontend Developer",
        "name": "USWDS & Universal Accessibility Specialist",
        "level": 2,
        "parentId": "gov-service-lead",
        "responsibilities": "Build mobile-friendly web forms adhering strictly to U.S. Web Design System (USWDS) standards and WCAG 2.1 AAA accessibility.",
        "workflowInstructions": "Ensure citizens with screen readers, slow mobile data, or low digital literacy can complete government forms independently.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "gov-case-lead",
        "roleTitle": "Case Management & Eligibility Lead",
        "name": "Government Workflow Automation Specialist",
        "level": 2,
        "parentId": "gov-service-lead",
        "responsibilities": "Build automated case assignment queues for civil servants, eligibility calculation rules, and document attachment verification.",
        "workflowInstructions": "Cut citizen benefit approval wait times from weeks to under 48 hours.",
        "delegationPolicy": "both",
        "color": "#0891b2"
      },
      {
        "id": "gov-sec-officer",
        "roleTitle": "FedRAMP Security & Compliance Officer",
        "name": "Public Sector Information Security Officer",
        "level": 1,
        "parentId": "gov-dir",
        "responsibilities": "Enforce strict FedRAMP High / CJIS (Criminal Justice Information Services) data residency controls and continuous automated vulnerability scanning.",
        "workflowInstructions": "Maintain the platform's formal Authority to Operate (ATO).",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "gov-legacy-eng",
        "roleTitle": "Legacy Mainframe Integration Engineer",
        "name": "COBOL & Legacy State Database Specialist",
        "level": 2,
        "parentId": "gov-case-lead",
        "responsibilities": "Build secure API wrappers around 40-year-old state mainframe backends (COBOL / CICS), translating legacy batch files into modern JSON APIs.",
        "workflowInstructions": "Enable digital citizen interfaces without destabilizing core legacy government ledgers.",
        "delegationPolicy": "up",
        "color": "#d97706"
      },
      {
        "id": "gov-outreach",
        "roleTitle": "Multilingual Citizen Outreach Specialist",
        "name": "Plain Language & Translation Coordinator",
        "level": 2,
        "parentId": "gov-service-lead",
        "responsibilities": "Ensure all citizen forms and notices are written in plain 6th-grade reading level English and accurately translated into Spanish, Chinese, and regional languages.",
        "workflowInstructions": "Democratize access to public assistance for underserved communities.",
        "delegationPolicy": "up",
        "color": "#7c3aed"
      }
    ]
  },
  {
    "id": "chain-video-streaming-ott-infrastructure",
    "name": "Video Streaming & Global OTT Infrastructure",
    "companyName": "Video Streaming & Global OTT Infrastructure",
    "description": "High-scale video streaming engineering division operating live transcoding, global CDN edge origin delivery, video players, and DRM protection.",
    "category": "DeepTech",
    "domain": "Streaming Video",
    "color": "#dc2626",
    "icon": "Video",
    "nodes": [
      {
        "id": "ott-vp",
        "roleTitle": "VP of Video Engineering",
        "name": "Head of Streaming & Media Technology",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead video playback quality of experience (rebuffer rate < 0.5%), multi-CDN bandwidth costs, live event concurrency (10M+ simultaneous viewers), and DRM.",
        "workflowInstructions": "Direct Video Transcoding Architect and Video Player Engineering Lead.",
        "delegationPolicy": "auto",
        "color": "#991b1b"
      },
      {
        "id": "ott-trans-arch",
        "roleTitle": "Video Transcoding & Encoding Architect",
        "name": "HEVC / AV1 Compression Specialist",
        "level": 1,
        "parentId": "ott-vp",
        "responsibilities": "Design scalable cloud encoding pipelines (FFmpeg / AWS Elemental), optimizing per-title encoding ladders to minimize bitrate while preserving 4K HDR quality.",
        "workflowInstructions": "Supervise Live Streaming Transcoding Engineer.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "ott-live-eng",
        "roleTitle": "Live Video Streaming Engineer",
        "name": "Low-Latency HLS & CMAF Specialist",
        "level": 2,
        "parentId": "ott-trans-arch",
        "responsibilities": "Implement Low-Latency HLS (LL-HLS) and chunked CMAF streaming, achieving broadcast-parity sub-3-second live sports latency over the internet.",
        "workflowInstructions": "Eliminate stream delay during live sports broadcasts.",
        "delegationPolicy": "both",
        "color": "#ea580c"
      },
      {
        "id": "ott-cdn-lead",
        "roleTitle": "Multi-CDN Routing & Origin Lead",
        "name": "Global Media Distribution Architect",
        "level": 1,
        "parentId": "ott-vp",
        "responsibilities": "Manage multi-CDN switching architectures (Akamai, Cloudflare, Fastly), real-time CDN health telemetry, and high-throughput origin shielding.",
        "workflowInstructions": "Automatically route viewers away from degraded CDN providers within seconds.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "ott-player-lead",
        "roleTitle": "Video Player Engineering Lead",
        "name": "Shaka Player & HLS.js Architect",
        "level": 1,
        "parentId": "ott-vp",
        "responsibilities": "Lead video playback engine development across Smart TVs (Roku/Tizen/Android TV), Apple TV, web browsers, and iOS/Android mobile apps.",
        "workflowInstructions": "Supervise Adaptive Bitrate (ABR) Optimization Developer.",
        "delegationPolicy": "both",
        "color": "#2563eb"
      },
      {
        "id": "ott-abr-dev",
        "roleTitle": "Adaptive Bitrate (ABR) Developer",
        "name": "Bandwidth Estimation & Buffer Specialist",
        "level": 2,
        "parentId": "ott-player-lead",
        "responsibilities": "Build predictive buffer estimation algorithms that adjust video resolution smoothly without sudden jarring quality drops or playback stalls.",
        "workflowInstructions": "Optimize playback start time to sub-800 milliseconds.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "ott-drm-spec",
        "roleTitle": "Digital Rights Management (DRM) Specialist",
        "name": "Widevine / FairPlay / PlayReady Lead",
        "level": 2,
        "parentId": "ott-trans-arch",
        "responsibilities": "Manage Hollywood-studio-certified hardware DRM encryption: Widevine Level 1, Apple FairPlay, and Microsoft PlayReady with automated key rotation.",
        "workflowInstructions": "Prevent digital media piracy and screen recording leaks.",
        "delegationPolicy": "both",
        "color": "#7c3aed"
      },
      {
        "id": "ott-ad-spec",
        "roleTitle": "Server-Side Ad Insertion (SSAI) Engineer",
        "name": "VPAID / VAST Video Monetization Lead",
        "level": 2,
        "parentId": "ott-trans-arch",
        "responsibilities": "Seamlessly stitch targeted commercial ad segments directly into video manifest streams (SSAI), bypassing client-side ad blockers.",
        "workflowInstructions": "Ensure frame-accurate ad transitions without audio pops or buffering pauses.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "ott-qoe-analyst",
        "roleTitle": "Quality of Experience (QoE) Telemetry Lead",
        "name": "Conviva / Mux Video Analytics Specialist",
        "level": 2,
        "parentId": "ott-player-lead",
        "responsibilities": "Monitor real-time playback telemetry across millions of concurrent sessions: track video start failures, visual bitrate, and rebuffering ratios.",
        "workflowInstructions": "Alert engineering immediately if any device firmware experiences playback regressions.",
        "delegationPolicy": "up",
        "color": "#10b981"
      },
      {
        "id": "ott-sub-eng",
        "roleTitle": "Subtitles & Accessibility Specialist",
        "name": "WebVTT / Closed Captioning Lead",
        "level": 2,
        "parentId": "ott-player-lead",
        "responsibilities": "Ensure frame-synchronized closed captions, descriptive audio tracks for the visually impaired, and multi-language subtitle rendering.",
        "workflowInstructions": "Meet FCC closed-captioning compliance regulations across all devices.",
        "delegationPolicy": "up",
        "color": "#059669"
      },
      {
        "id": "ott-tv-dev",
        "roleTitle": "Smart TV App Platform Developer",
        "name": "Tizen / webOS / Roku Specialist",
        "level": 2,
        "parentId": "ott-player-lead",
        "responsibilities": "Optimize native video apps for resource-constrained Smart TV hardware with limited memory, ensuring smooth 60 FPS remote-control navigation.",
        "workflowInstructions": "Eliminate TV app crashes caused by limited system memory.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      },
      {
        "id": "ott-ingest-eng",
        "roleTitle": "Contribution & Broadcast Ingest Engineer",
        "name": "SRT & RTMP Satellite Uplink Specialist",
        "level": 2,
        "parentId": "ott-trans-arch",
        "responsibilities": "Manage redundant live video contribution feeds from stadium broadcast trucks over Secure Reliable Transport (SRT) and fiber satellite uplinks.",
        "workflowInstructions": "Maintain seamless hitless failover between primary and secondary contribution feeds.",
        "delegationPolicy": "up",
        "color": "#0891b2"
      }
    ]
  },
  {
    "id": "chain-adtech-real-time-bidding",
    "name": "AdTech Real-Time Bidding & DSP Engine",
    "companyName": "AdTech Real-Time Bidding & DSP Engine",
    "description": "Ultra-low-latency programmatic advertising exchange running sub-50ms demand-side platform (DSP) auctions, audience segmentation, and fraud detection.",
    "category": "DeepTech",
    "domain": "AdTech & Programmatic",
    "color": "#d97706",
    "icon": "TrendingUp",
    "nodes": [
      {
        "id": "ad-vp",
        "roleTitle": "Chief AdTech Architect & VP",
        "name": "Head of Programmatic Systems",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead programmatic auction scale (1M+ QPS), bid decision latency budgets (< 50ms), machine learning CTR prediction, and advertiser ROAS.",
        "workflowInstructions": "Direct DSP Engine Architect and Ad Fraud Prevention Lead.",
        "delegationPolicy": "auto",
        "color": "#78350f"
      },
      {
        "id": "ad-dsp-arch",
        "roleTitle": "DSP Bidding Engine Architect",
        "name": "OpenRTB / High-QPS C++ Specialist",
        "level": 1,
        "parentId": "ad-vp",
        "responsibilities": "Design ultra-high-throughput OpenRTB 2.5/3.0 bidding engine in C++/Rust processing millions of auction requests per second from supply-side platforms (SSPs).",
        "workflowInstructions": "Supervise Low-Latency Bidding Developer on auction loop optimizations.",
        "delegationPolicy": "both",
        "color": "#b45309"
      },
      {
        "id": "ad-bid-dev",
        "roleTitle": "Low-Latency Bidding Developer",
        "name": "Sub-20ms Auction Engine Specialist",
        "level": 2,
        "parentId": "ad-dsp-arch",
        "responsibilities": "Write zero-copy JSON/Protobuf bid request parsers, evaluate campaign targeting criteria, calculate dynamic bid pricing, and respond within 20ms.",
        "workflowInstructions": "Eliminate socket timeouts to avoid losing SSP auction revenue.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "ad-ctr-sci",
        "roleTitle": "CTR & Conversion Machine Learning Scientist",
        "name": "Real-Time Click Prediction Modeler",
        "level": 1,
        "parentId": "ad-vp",
        "responsibilities": "Train online logistic regression and neural CTR/CVR prediction models scoring the probability that an impression leads to a click or purchase.",
        "workflowInstructions": "Update model feature weights continuously in streaming memory as campaigns run.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "ad-dmp-lead",
        "roleTitle": "Data Management Platform (DMP) Lead",
        "name": "Audience Identity & Graph Specialist",
        "level": 1,
        "parentId": "ad-vp",
        "responsibilities": "Manage multi-terabyte audience identity graphs: cookie syncing, mobile advertising IDs (IDFA/GAID), IP clusters, and demographic interest segments.",
        "workflowInstructions": "Enable advertisers to target high-intent purchasing cohorts with high accuracy.",
        "delegationPolicy": "both",
        "color": "#7c3aed"
      },
      {
        "id": "ad-graph-eng",
        "roleTitle": "Audience Graph Data Engineer",
        "name": "Aerospike / RocksDB Key-Value Specialist",
        "level": 2,
        "parentId": "ad-dmp-lead",
        "responsibilities": "Maintain high-throughput distributed NoSQL databases (Aerospike) returning audience profile attributes in under 2 milliseconds during live auctions.",
        "workflowInstructions": "Handle billions of daily profile read/write lookups without latency degradation.",
        "delegationPolicy": "both",
        "color": "#8b5cf6"
      },
      {
        "id": "ad-fraud-lead",
        "roleTitle": "Ad Fraud & Bot Traffic Filter Lead",
        "name": "Invalid Traffic (IVT) Specialist",
        "level": 1,
        "parentId": "ad-vp",
        "responsibilities": "Detect and filter invalid traffic (IVT): headless scraper bots, automated click farms, hidden iframe ad stacking, and domain spoofing.",
        "workflowInstructions": "Block fraudulent bid requests to protect advertiser advertising budgets.",
        "delegationPolicy": "both",
        "color": "#dc2626"
      },
      {
        "id": "ad-pace-eng",
        "roleTitle": "Campaign Pacing & Budget Controller",
        "name": "Smooth Budget Allocation Specialist",
        "level": 2,
        "parentId": "ad-dsp-arch",
        "responsibilities": "Build PID control pacing algorithms that distribute advertiser budgets evenly across 24 hours while capitalizing on high-converting peak times.",
        "workflowInstructions": "Prevent campaigns from exhausting budgets prematurely early in the day.",
        "delegationPolicy": "both",
        "color": "#f59e0b"
      },
      {
        "id": "ad-ssp-integ",
        "roleTitle": "SSP & Exchange Integration Specialist",
        "name": "OpenRTB Protocol Compliance Lead",
        "level": 2,
        "parentId": "ad-dsp-arch",
        "responsibilities": "Maintain certified integration connections with premier supply exchanges (Google AdX, Magnite, PubMatic, OpenX) and resolve protocol anomalies.",
        "workflowInstructions": "Ensure optimal QPS traffic throttling and win rate tracking.",
        "delegationPolicy": "up",
        "color": "#0891b2"
      },
      {
        "id": "ad-privacy-spec",
        "roleTitle": "Privacy Sandbox & Clean Room Specialist",
        "name": "Cookieless Tracking & Privacy Lead",
        "level": 2,
        "parentId": "ad-dmp-lead",
        "responsibilities": "Implement Privacy Sandbox APIs (Protected Audience API), private data clean rooms (Snowflake/AWS), and contextual targeting alternatives.",
        "workflowInstructions": "Future-proof advertising revenue against the deprecation of third-party tracking cookies.",
        "delegationPolicy": "up",
        "color": "#059669"
      },
      {
        "id": "ad-reporting-eng",
        "roleTitle": "Attribution & Reporting Data Engineer",
        "name": "Real-Time ClickHouse Analytics Lead",
        "level": 2,
        "parentId": "ad-vp",
        "responsibilities": "Build real-time campaign reporting pipelines ingesting win notices, impression pixels, and conversion webhooks into ClickHouse.",
        "workflowInstructions": "Provide advertisers with up-to-the-minute spend and conversion dashboards.",
        "delegationPolicy": "up",
        "color": "#10b981"
      }
    ]
  },
  {
    "id": "chain-edtech-learning-management-system",
    "name": "EdTech Interactive Learning Management System",
    "companyName": "EdTech Interactive Learning Management System",
    "description": "Scalable educational technology platform delivering interactive virtual classrooms, auto-graded coding labs, gamified learning paths, and LMS integrations.",
    "category": "Education",
    "domain": "EdTech Software",
    "color": "#4338ca",
    "icon": "GraduationCap",
    "nodes": [
      {
        "id": "edt-head",
        "roleTitle": "Head of EdTech Engineering",
        "name": "VP Product & Education Technology",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead student course completion rates (> 80%), interactive virtual classroom scalability, school district LMS compliance, and student privacy (FERPA).",
        "workflowInstructions": "Direct Interactive Learning Architect and Student Assessment Lead.",
        "delegationPolicy": "auto",
        "color": "#312e81"
      },
      {
        "id": "edt-class-arch",
        "roleTitle": "Virtual Classroom Systems Architect",
        "name": "WebRTC & Interactive Whiteboard Lead",
        "level": 1,
        "parentId": "edt-head",
        "responsibilities": "Architect multi-student interactive video classrooms: synchronized whiteboards, breakout rooms, hand raising queues, and screen sharing.",
        "workflowInstructions": "Supervise Classroom Frontend Developer on collaborative canvas latency.",
        "delegationPolicy": "both",
        "color": "#4338ca"
      },
      {
        "id": "edt-class-dev",
        "roleTitle": "Interactive Classroom Developer",
        "name": "Collaborative Canvas & Audio Specialist",
        "level": 2,
        "parentId": "edt-class-arch",
        "responsibilities": "Build real-time interactive canvas drawing tools, synchronized video playback, and low-bandwidth student audio streaming.",
        "workflowInstructions": "Ensure reliable classroom connections for students using school Chromebooks.",
        "delegationPolicy": "both",
        "color": "#6366f1"
      },
      {
        "id": "edt-assess-lead",
        "roleTitle": "Automated Assessment & Grading Lead",
        "name": "Auto-Grader & Quiz Engine Architect",
        "level": 1,
        "parentId": "edt-head",
        "responsibilities": "Build automated grading engines for interactive coding exercises, mathematical equation solvers, and multiple-choice quizzes with instant feedback.",
        "workflowInstructions": "Supervise Code Sandbox Security Engineer.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "edt-box-eng",
        "roleTitle": "Code Execution Sandbox Engineer",
        "name": "Secure Student Code Runner Specialist",
        "level": 2,
        "parentId": "edt-assess-lead",
        "responsibilities": "Deploy secure, isolated container sandboxes that compile and run student Python, JavaScript, and Java code against hidden unit test cases.",
        "workflowInstructions": "Enforce strict timeouts and prevent student code from accessing internal network services.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "edt-game-des",
        "roleTitle": "Gamification & Learning Experience Designer",
        "name": "Student Engagement & Badges Specialist",
        "level": 2,
        "parentId": "edt-head",
        "responsibilities": "Design student streak mechanisms, milestone badges, XP progress levels, and celebratory reward animations to sustain daily learning habits.",
        "workflowInstructions": "Conduct usability research with K-12 and university students to maximize engagement.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "edt-lms-spec",
        "roleTitle": "LMS Interoperability Specialist",
        "name": "LTI 1.3 & SCORM Integration Lead",
        "level": 2,
        "parentId": "edt-class-arch",
        "responsibilities": "Build seamless integrations with existing university LMS platforms (Canvas, Blackboard, Moodle) via LTI 1.3 Advantage and OneRoster standards.",
        "workflowInstructions": "Automate single sign-on and sync assignment grades directly back into gradebooks.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "edt-privacy-off",
        "roleTitle": "Student Privacy & Compliance Officer",
        "name": "FERPA & COPPA Compliance Specialist",
        "level": 1,
        "parentId": "edt-head",
        "responsibilities": "Enforce strict adherence to student privacy laws (FERPA, COPPA, CSPC), ensuring zero student personal data is monetized or shared with third parties.",
        "workflowInstructions": "Maintain strict parental consent records and data deletion controls.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      }
    ]
  },
  {
    "id": "chain-proptech-real-estate-platform",
    "name": "PropTech 3D Virtual Touring & Valuation",
    "companyName": "PropTech 3D Virtual Touring & Valuation",
    "description": "Real estate technology platform providing immersive 3D photogrammetry virtual home tours, automated valuation models (AVM), and MLS feeds.",
    "category": "DeepTech",
    "domain": "PropTech 3D",
    "color": "#059669",
    "icon": "Home",
    "nodes": [
      {
        "id": "ptech-vp",
        "roleTitle": "VP of PropTech Engineering",
        "name": "Head of Real Estate Technology",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead 3D home scanning tech, automated property valuation accuracy (median error < 2%), MLS listing syndication speed, and virtual buyer conversion.",
        "workflowInstructions": "Direct 3D Virtual Tour Architect and Automated Valuation (AVM) Lead.",
        "delegationPolicy": "auto",
        "color": "#064e3b"
      },
      {
        "id": "ptech-tour-arch",
        "roleTitle": "3D Virtual Tour & Photogrammetry Architect",
        "name": "Spatial Media & WebGL Lead",
        "level": 1,
        "parentId": "ptech-vp",
        "responsibilities": "Build browser-based 3D walkthrough engine from 360-degree camera panoramas and LiDAR scans (Matterport style), generating dollhouse views.",
        "workflowInstructions": "Supervise 3D Web Viewer Developer on mobile performance.",
        "delegationPolicy": "both",
        "color": "#059669"
      },
      {
        "id": "ptech-tour-dev",
        "roleTitle": "3D Web Viewer Developer",
        "name": "Three.js / WebGL Spatial Specialist",
        "level": 2,
        "parentId": "ptech-tour-arch",
        "responsibilities": "Implement smooth camera floor-to-floor transitions, measurement measuring tape tools, and interactive room tags inside the 3D tour viewer.",
        "workflowInstructions": "Ensure high visual clarity and fast loading over mobile 4G connections.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "ptech-avm-lead",
        "roleTitle": "Automated Valuation Model (AVM) Lead",
        "name": "Real Estate Machine Learning Architect",
        "level": 1,
        "parentId": "ptech-vp",
        "responsibilities": "Train machine learning property valuation models analyzing recent neighborhood comps, square footage, school district ratings, and market trends.",
        "workflowInstructions": "Deliver daily updated automated home valuation estimates for millions of residential addresses.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "ptech-avm-eng",
        "roleTitle": "Real Estate Data Scientist",
        "name": "Spatial Hedonic Pricing Modeler",
        "level": 2,
        "parentId": "ptech-avm-lead",
        "responsibilities": "Incorporate spatial neighborhood embeddings, aerial satellite imagery features (pool presence, roof condition), and property tax history.",
        "workflowInstructions": "Continuously benchmark valuation accuracy against final closed sale prices.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "ptech-mls-lead",
        "roleTitle": "MLS Ingestion & RESO Web API Lead",
        "name": "Listing Data Normalization Specialist",
        "level": 2,
        "parentId": "ptech-vp",
        "responsibilities": "Ingest property listings from hundreds of regional MLS boards via RESO Web API, normalizing photo galleries, property attributes, and agent details.",
        "workflowInstructions": "Update listing status (new, pending, sold, price drop) within 60 seconds of MLS posting.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "ptech-floor-spec",
        "roleTitle": "Automated 2D/3D Floorplan Engineer",
        "name": "Computer Vision Floorplan Generator",
        "level": 2,
        "parentId": "ptech-tour-arch",
        "responsibilities": "Generate dimensional architectural floorplan schematics automatically from 360 camera scans using computer vision wall-boundary detection.",
        "workflowInstructions": "Calculate exact gross internal area (GIA) room measurements for buyer disclosures.",
        "delegationPolicy": "up",
        "color": "#7c3aed"
      },
      {
        "id": "ptech-buyer-ui",
        "roleTitle": "Real Estate Search Web & App Lead",
        "name": "Property Discovery Frontend Architect",
        "level": 2,
        "parentId": "ptech-vp",
        "responsibilities": "Build high-converting property search portals with interactive polygon map boundaries, commute time filters, and instant tour booking calendar.",
        "workflowInstructions": "Drive verified buyer tour requests to listing partner agents.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  },
  {
    "id": "chain-telecom-5g-open-ran",
    "name": "Telecommunications 5G Open RAN & Core Cloud",
    "companyName": "Telecommunications 5G Open RAN & Core Cloud",
    "description": "Next-generation telecom software company building virtualized 5G Core networks, Open RAN protocol software, network slicing, and edge cloud.",
    "category": "DeepTech",
    "domain": "5G Telecom",
    "color": "#2563eb",
    "icon": "Radio",
    "nodes": [
      {
        "id": "oran-vp",
        "roleTitle": "VP of Telecommunications Software",
        "name": "Head of 5G Systems & Open RAN",
        "level": 0,
        "parentId": null,
        "responsibilities": "Lead virtualized 5G Core software, O-RAN Alliance compliance, sub-1ms ultra-reliable low-latency (URLLC) communication, and carrier interoperability.",
        "workflowInstructions": "Direct 5G Core Network Architect and Open RAN Protocol Lead.",
        "delegationPolicy": "auto",
        "color": "#1e40af"
      },
      {
        "id": "oran-core-arch",
        "roleTitle": "5G Core Network Architect",
        "name": "Cloud-Native 5G Core (5GC) Specialist",
        "level": 1,
        "parentId": "oran-vp",
        "responsibilities": "Architect containerized 5G Core network functions (AMF, SMF, UPF, PCF) running on cloud infrastructure with service-based architecture (SBA).",
        "workflowInstructions": "Supervise User Plane Function (UPF) Developer on 100Gbps throughput.",
        "delegationPolicy": "both",
        "color": "#2563eb"
      },
      {
        "id": "oran-upf-dev",
        "roleTitle": "User Plane Function (UPF) Developer",
        "name": "DPDK & High-Speed Packet Specialist",
        "level": 2,
        "parentId": "oran-core-arch",
        "responsibilities": "Implement high-performance 5G User Plane Functions using Intel DPDK / VPP, processing millions of packet sessions per second with zero drop.",
        "workflowInstructions": "Route user traffic directly to edge computing nodes with minimal transit latency.",
        "delegationPolicy": "both",
        "color": "#3b82f6"
      },
      {
        "id": "oran-proto-lead",
        "roleTitle": "Open RAN Protocol Lead",
        "name": "O-RAN 7-2x Split & Protocol Specialist",
        "level": 1,
        "parentId": "oran-vp",
        "responsibilities": "Lead virtualized Distributed Unit (O-DU) and Centralized Unit (O-CU) protocol stacks according to O-RAN Alliance specifications.",
        "workflowInstructions": "Supervise Real-Time PHY & MAC Layer Engineer on radio interfaces.",
        "delegationPolicy": "both",
        "color": "#0284c7"
      },
      {
        "id": "oran-phy-eng",
        "roleTitle": "Real-Time PHY & MAC Layer Engineer",
        "name": "DSP & Low-Level Radio Protocol Specialist",
        "level": 2,
        "parentId": "oran-proto-lead",
        "responsibilities": "Implement 5G NR physical layer processing, beamforming weight calculations, and dynamic packet scheduling on FPGA/accelerated hardware.",
        "workflowInstructions": "Ensure microsecond synchronization with remote radio units (O-RU) over eCPRI front-haul.",
        "delegationPolicy": "both",
        "color": "#06b6d4"
      },
      {
        "id": "oran-slice-spec",
        "roleTitle": "Network Slicing & QoS Specialist",
        "name": "3GPP Network Slicing Lead",
        "level": 2,
        "parentId": "oran-core-arch",
        "responsibilities": "Implement end-to-end network slicing dedicating guaranteed bandwidth and latency partitions for autonomous vehicles, emergency services, and IoT.",
        "workflowInstructions": "Enforce strict Service Level Agreements (SLAs) across independent network slices.",
        "delegationPolicy": "both",
        "color": "#7c3aed"
      },
      {
        "id": "oran-ric-dev",
        "roleTitle": "RAN Intelligent Controller (RIC) Developer",
        "name": "xApp & AI Network Optimization Lead",
        "level": 2,
        "parentId": "oran-proto-lead",
        "responsibilities": "Develop near-real-time RIC xApps using machine learning to predict cell tower traffic congestion and dynamically balance radio power.",
        "workflowInstructions": "Maximize spectral efficiency across crowded urban cell towers.",
        "delegationPolicy": "both",
        "color": "#10b981"
      },
      {
        "id": "oran-carrier-qa",
        "roleTitle": "Carrier Interoperability & Test Lead",
        "name": "3GPP Conformance & Lab Testing Head",
        "level": 1,
        "parentId": "oran-vp",
        "responsibilities": "Manage telecom lab testing rigs verifying radio interoperability across commercial smartphones, base stations, and third-party radio vendors.",
        "workflowInstructions": "Certify 3GPP Release 16/17 compliance before carrier field trials.",
        "delegationPolicy": "both",
        "color": "#d97706"
      },
      {
        "id": "oran-cloud-eng",
        "roleTitle": "Telco Cloud Platform Engineer",
        "name": "OpenShift & Bare-Metal Kubernetes Lead",
        "level": 2,
        "parentId": "oran-core-arch",
        "responsibilities": "Deploy bare-metal edge Kubernetes clusters with SR-IOV, CPU pinning, and NUMA node topology awareness for telecom network functions.",
        "workflowInstructions": "Ensure telecommunications carrier-grade reliability (99.999% uptime).",
        "delegationPolicy": "up",
        "color": "#0891b2"
      },
      {
        "id": "oran-sec-lead",
        "roleTitle": "Telecom Cybersecurity Specialist",
        "name": "5G Network Security & Encryption Lead",
        "level": 2,
        "parentId": "oran-vp",
        "responsibilities": "Audit 5G subscription concealing identifiers (SUCI), AKA mutual authentication, and inter-network roaming security against IMSI catchers.",
        "workflowInstructions": "Protect cellular communications against state-sponsored wiretapping.",
        "delegationPolicy": "up",
        "color": "#dc2626"
      },
      {
        "id": "oran-field-spec",
        "roleTitle": "Field Network Deployment Specialist",
        "name": "Cell Site Integration & Drive Test Lead",
        "level": 2,
        "parentId": "oran-carrier-qa",
        "responsibilities": "Conduct cellular drive tests with specialized scanner equipment, measuring real-world 5G signal propagation, handover success, and throughput.",
        "workflowInstructions": "Tune cell tower antenna angles and transmission power based on field measurements.",
        "delegationPolicy": "up",
        "color": "#f59e0b"
      }
    ]
  }
];

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
  space: { x?: number; y?: number; width?: number; height?: number } = { x: 0, y: 0 },
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

  const spaceX = space.x ?? 0;
  const spaceY = space.y ?? 0;
  let rootX = spaceX + startOffset.x;
  for (const root of roots) {
    placeNode(root, rootX, spaceY + startOffset.y);
    rootX += (subtreeWidths.get(root.id) || nodeW) + hGap * 2;
  }

  // Calculate required bounding box
  const maxX = Math.max(...placedZones.map((z) => z.x + z.width));
  const maxY = Math.max(...placedZones.map((z) => z.y + z.height));

  const requiredWidth = Math.max(maxX - spaceX + startOffset.x, 720);
  const requiredHeight = Math.max(maxY - spaceY + startOffset.y, 520);

  return {
    zones: placedZones,
    requiredWidth,
    requiredHeight,
  };
}
