#!/usr/bin/env python3
import json

hierarchical_chains = [
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
                "parentId": None,
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
                "parentId": None,
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
    }
]

print("Base chains mapped successfully.")
