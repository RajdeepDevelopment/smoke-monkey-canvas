#!/usr/bin/env node
// Regenerates web/src/features/agent/agent.templates.ts.
//
// The taxonomy below is the single source of truth for the 3-level agent
// hierarchy (Domain → Discipline → Specialty). The generator:
//   1. Parses the existing AGENT_SPECS JSON literals from the target file.
//   2. Applies RENAME (broader top-level domain names), MOVE (cross-domain
//      relocations) and TAX (per-agent discipline + specialty).
//   3. Re-emits the file, preserving MCP_PURPOSE, buildSystemPrompt and
//      SKILL_NAMES verbatim, while adding subcategory/specialty fields and
//      exporting ENTERPRISE_DISCIPLINES + ENTERPRISE_SPECIALTIES.
//   4. Validates id uniqueness, taxonomy coverage, and that every
//      recommended_mcps / recommended_skills entry exists in the catalogs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.resolve(here, '../web/src/features/agent/agent.templates.ts');

// ─────────────────────────────────────────────────────────────────────────────
// Taxonomy definition (source of truth)
// ─────────────────────────────────────────────────────────────────────────────

const DOMAINS = [
  'Software Development',
  'People & Talent',
  'Finance & Accounting',
  'Sales & Marketing',
  'Customer Experience',
  'Legal & Compliance',
  'Data & Analytics',
  'Security & SecOps',
  'Product & Project Management',
  'IT & Operations',
];

const RENAME = {
  'Engineering & DevOps': 'Software Development',
  'HR & People Operations': 'People & Talent',
  'Customer Support & Success': 'Customer Experience',
  'Data & Business Intelligence': 'Data & Analytics',
  'Operations & IT Admin': 'IT & Operations',
};

const MOVE = {
  'eng-dependency-supply-chain': 'Security & SecOps',
  'eng-sbom-archivist': 'Security & SecOps',
  'eng-vuln-triage': 'Security & SecOps',
};

// ordered: domain -> { discipline -> [specialties] }
const TAXONOMY = {
  'Software Development': {
    'DevOps & CI/CD': ['CI/CD Pipelines', 'Build & Cache', 'Release Engineering', 'Version Control', 'Development Environments'],
    'Code Quality & Review': ['Pull Request Review', 'Test Reliability', 'Refactoring', 'Type Safety'],
    'Backend & APIs': ['API Contracts', 'Schema Migrations', 'Event Streaming'],
    'Observability & Performance': ['Runtime Performance', 'Memory & Runtime Health', 'SLOs & Error Budgets', 'Dashboards', 'Uptime Monitoring', 'Log Analysis', 'Incident Response', 'Postmortems'],
    'Platform & Infrastructure': ['Infrastructure as Code', 'Containers & Images', 'Kubernetes Platform', 'Helm & GitOps', 'Cloud Cost & FinOps'],
  },
  'People & Talent': {
    'Recruiting & Hiring': ['Sourcing & Talent Pipeline', 'Pipeline & ATS Operations', 'Interview Coordination', 'Rubrics & Assessment', 'Reference & Background Checks', 'Hire Decisions', 'Early-Career Programs'],
    'Onboarding & Offboarding': ['Onboarding Experience', 'Offboarding & Deprovisioning'],
    'Total Rewards & Payroll': ['Compensation & Equity', 'Payroll & Statutory Compliance', 'Benefits Administration'],
    'Performance & Leadership': ['Review Cycles', 'Succession Planning', 'Learning & Development', 'Compliance Training', 'Workforce Planning'],
    'People Analytics': ['Retention & Flight Risk', 'Exit & Turnover', 'Leave & Absenteeism', 'HRIS Data Governance', 'DEI & Pay Equity'],
    'Culture & Engagement': ['Engagement Surveys', 'Pulse Surveys', 'Culture & Events', 'Org Design'],
    'People Ops & Policy': ['HR Self-Service Concierge', 'HR Policy Authoring', 'Employee Relations', 'Remote & Hybrid Policy'],
  },
  'Finance & Accounting': {
    'Accounting & Close': ['Receivables & Collections', 'Payables & Vendor Payments', 'Month-End Close', 'Close Governance', 'Bank Reconciliation', 'Refunds & Adjustments', 'Intercompany Reconciliation'],
    'Planning & Forecasting': ['Budgets & Rolling Forecasts', 'Variance Analysis', 'Runway & Cash', 'Cash Flow Forecasting', 'Spend Accountability', 'Unit Economics', 'Financial Narratives', 'Board & Investor Reporting'],
    'Revenue & Billing': ['Revenue Recognition', 'Subscription Billing', 'Revenue Leakage', 'Pricing & Packaging', 'Sales Commissions'],
    'Treasury & Risk': ['FX & Currency Risk', 'Cap Table & Equity', 'Procurement & Spend'],
    'Payroll & Tax': ['VAT & Sales Tax', 'Tax Calendar & Filings', 'Payroll Validation'],
    'Internal Audit & Controls': ['Expense & Spend Policy', 'Fraud & Anomaly Detection', 'External Audit Support', 'Treasury Controls'],
  },
  'Sales & Marketing': {
    'Sales Development': ['Outbound Sequencing', 'Account Research', 'Demo & Discovery', 'Enablement & Battlecards', 'Quotes & Pricing Proposals'],
    'Revenue Operations': ['CRM Hygiene', 'Pipeline Forecasting', 'Partners & Channels', 'Win/Loss Analysis'],
    'Demand Generation': ['ABM Campaigns', 'Lifecycle Email', 'Events & Webinars', 'Event Follow-Up', 'Deliverability'],
    'Brand & Content': ['Content Strategy', 'Positioning & Launch', 'Social Content', 'PR & Reputation', 'Brand Voice', 'Ecommerce Copy', 'Content Repurposing'],
    'Growth Engine': ['SEO & Organic', 'CRO & Landing Pages', 'Pre-Launch QA', 'Paid Ads'],
    'Marketing Analysis': ['Campaign Analytics', 'Voice of Customer', 'Market Intelligence', 'Marketing Operations'],
    'Go-to-Market': ['Competitive Intelligence'],
  },
  'Customer Experience': {
    'Support Operations': ['Triage & Routing', 'SLA Monitoring', 'Helpdesk Ops', 'Critical Ticket Monitoring', 'Escalations', 'Macros & Canned Replies', 'Quality Assurance', 'Billing & Refunds'],
    'Technical Support': ['API & SDK Support', 'Bug Triage & Escalation', 'Data Export & Migration', 'Security & Privacy Support'],
    'Onboarding & Retention': ['Customer Onboarding', 'Account Health', 'Churn Prevention', 'Renewals & Expansion', 'QBRs & Executive Reviews', 'Time-to-Value'],
    'Insights & Reporting': ['CSAT & NPS', 'Support Briefings'],
    'Content & Learning': ['Knowledge Base', 'Docs Coverage', 'Customer Training', 'Agent Coaching'],
    'Voice of Customer': ['Community & Forums', 'Empathy & De-escalation', 'Announcements & Outages', 'VoC Mining', 'Support-to-Product', 'Feedback to Product'],
  },
  'Legal & Compliance': {
    'Contracts & Commercial': ['Contract Review', 'MSA & SOW Negotiation', 'NDA & Paperwork', 'Terms & Policy Pages', 'Clause Library'],
    'Privacy & Data Protection': ['DPA Review', 'DSAR Processing', 'Privacy Impact Assessments', 'Data Mapping & Inventory', 'Subprocessor Register', 'Consent & Cookies', 'Breach & Incident Privacy'],
    'Governance & Regulatory': ['Compliance Programs', 'Regulatory Monitoring', 'Vendor Risk', 'AML Screening', 'Export Controls', 'Conflict of Interest', 'AI Governance', 'Board Minutes'],
    'Employment & IP': ['Employment Law', 'Open Source Licenses', 'Trademarks & Copyright', 'IP Watch'],
    'Legal Operations': ['Litigation Holds', 'Records Retention', 'Dispute Intake', 'Compliance Training', 'Policy Drafting', 'Legal KB & FAQs'],
  },
  'Data & Analytics': {
    'Data Engineering': ['ETL & Pipelines', 'Real-Time Streaming', 'Backfills & Repair', 'Data Cleansing'],
    'Modeling & Warehousing': ['Data Warehousing', 'Semantic Layer', 'Metrics Layer', 'Catalog & Lineage'],
    'Analytics & Insights': ['Dashboard Design', 'Executive View', 'Executive Reporting', 'Funnel Analysis', 'Ad-Hoc Funnel Explainer', 'Cohorts & Retention', 'Geospatial Analysis', 'Ad-Hoc Reporting', 'Log & Event Analysis', 'Query Performance'],
    'Data Quality & Reliability': ['Query Latency', 'Data Quality', 'Freshness', 'Drift Detection', 'Vector Index Health', 'KPI Definitions', 'dbt Project Health', 'Tagging & Taxonomy'],
    'ML & Experimentation': ['Embeddings & RAG', 'Experiment Analysis', 'ML Governance', 'Forecasting'],
  },
  'Security & SecOps': {
    'Application Security': ['API Security', 'SAST & DAST', 'Container Scanning', 'Supply Chain', 'SBOM & Provenance'],
    'Cloud & Infrastructure Security': ['Cloud Posture', 'Kubernetes Security', 'WAF & Edge', 'Network & Firewalls', 'PKI & Certificates', 'Endpoint Hardening', 'Backup Integrity'],
    'Identity & Access': ['Access Design', 'Authentication Hygiene', 'Access Reviews', 'Privileged Access', 'Secure Onboarding'],
    'Vulnerability Management': ['Triage & Prioritization', 'Scan Orchestration', 'Secrets & Credentials', 'Threat Intelligence', 'Malware IOCs', 'External Exposure'],
    'Detection & Response': ['Incident Response', 'SIEM & Threat Hunting', 'Data Loss Prevention', 'Phishing & Awareness'],
    'Security Governance': ['Threat Modeling', 'Penetration Testing', 'Vendor Security', 'AI Security Governance'],
  },
  'Product & Project Management': {
    'Product Strategy': ['Roadmapping', 'Competitive Gaps', 'Competitor Watch', 'Market Research', 'Pricing & Packaging', 'OKRs & Goals', 'Product Metrics', 'Health & Retention Score', 'Experiments', 'Discovery'],
    'Product Definition': ['PRDs', 'User Stories', 'Technical Specs', 'Backlog Refinement', 'Spec Review', 'Support Synthesis'],
    'User Research': ['Research Programs', 'Feedback Loops'],
    'Delivery & Execution': ['Beta Programs', 'Feature Flags', 'Launch Orchestration', 'Release Communications', 'Sprint Execution', 'Estimation', 'Retrospectives', 'Launch Risk Review'],
    'Program Management': ['Program Status', 'Risk Register', 'Stakeholder Comms', 'Product Compliance'],
  },
  'IT & Operations': {
    'Endpoints & Devices': ['Asset & Inventory', 'Device Policy & MDM', 'Fleet Health', 'Desktop Deployment', 'Printing & Peripherals', 'Office Setup', 'Endpoint Malware Response'],
    'IT Helpdesk': ['SLAs & Flow', 'Access Provisioning', 'Exit Deprovisioning', 'On-Call Schedules', 'Incident Comms'],
    'Identity & Access': ['SSO & Federation', 'Workspace Administration', 'Token & Secret Rotation', 'Remote Access'],
    'Collaboration & Apps': ['Messaging Governance', 'Distributed Work Ops'],
    'Infrastructure & Network': ['Network & VPN', 'DNS & Email Routing', 'Datacenter Environment', 'File & Print Services', 'Patch Compliance', 'Backup & DR'],
    'IT Finance & Vendors': ['SaaS Spend', 'Cloud Billing', 'Vendor Contracts', 'License Compliance'],
    'Compliance & Audit': ['Access & Change Logs', 'Audit Log Consolidation'],
  },
};

// Format: id -> [discipline, specialty]
const TAX = {
  // ── Software Development (27) ──
  'eng-ci-cd-optimizer': ['DevOps & CI/CD', 'CI/CD Pipelines'],
  'eng-build-cache-steward': ['DevOps & CI/CD', 'Build & Cache'],
  'eng-monorepo-splitter': ['DevOps & CI/CD', 'Build & Cache'],
  'eng-progressive-delivery': ['DevOps & CI/CD', 'Release Engineering'],
  'eng-release-cadence': ['DevOps & CI/CD', 'Release Engineering'],
  'eng-git-hygiene-robot': ['DevOps & CI/CD', 'Version Control'],
  'eng-repro-env-builder': ['DevOps & CI/CD', 'Development Environments'],
  'eng-code-quality-gate': ['Code Quality & Review', 'Pull Request Review'],
  'eng-flaky-test-quarantine': ['Code Quality & Review', 'Test Reliability'],
  'eng-dead-code-remover': ['Code Quality & Review', 'Refactoring'],
  'eng-ts-strict-migrator': ['Code Quality & Review', 'Type Safety'],
  'eng-api-contract-linter': ['Backend & APIs', 'API Contracts'],
  'eng-schema-migrator': ['Backend & APIs', 'Schema Migrations'],
  'eng-message-queue-steward': ['Backend & APIs', 'Event Streaming'],
  'eng-perf-profiler': ['Observability & Performance', 'Runtime Performance'],
  'eng-memory-leak-hunter': ['Observability & Performance', 'Memory & Runtime Health'],
  'eng-slo-engineer': ['Observability & Performance', 'SLOs & Error Budgets'],
  'eng-dashboard-builder': ['Observability & Performance', 'Dashboards'],
  'eng-runtime-heartbeat': ['Observability & Performance', 'Uptime Monitoring'],
  'eng-log-anomaly-spotter': ['Observability & Performance', 'Log Analysis'],
  'eng-incident-commander': ['Observability & Performance', 'Incident Response'],
  'eng-postmortem-writer': ['Observability & Performance', 'Postmortems'],
  'eng-iac-reviewer': ['Platform & Infrastructure', 'Infrastructure as Code'],
  'eng-docker-slimmer': ['Platform & Infrastructure', 'Containers & Images'],
  'eng-k8s-guardian': ['Platform & Infrastructure', 'Kubernetes Platform'],
  'eng-helm-chart-admin': ['Platform & Infrastructure', 'Helm & GitOps'],
  'eng-cloud-cost-sentinel': ['Platform & Infrastructure', 'Cloud Cost & FinOps'],

  // ── Security & SecOps (33) ──
  'sec-apiscan': ['Application Security', 'API Security'],
  'sec-code-scan': ['Application Security', 'SAST & DAST'],
  'sec-container-image-scan': ['Application Security', 'Container Scanning'],
  'sec-supply-chain': ['Application Security', 'Supply Chain'],
  'eng-dependency-supply-chain': ['Application Security', 'Supply Chain'],
  'eng-sbom-archivist': ['Application Security', 'SBOM & Provenance'],
  'sec-cloud-posture': ['Cloud & Infrastructure Security', 'Cloud Posture'],
  'sec-k8s-sec': ['Cloud & Infrastructure Security', 'Kubernetes Security'],
  'sec-cloudflare-guard': ['Cloud & Infrastructure Security', 'WAF & Edge'],
  'sec-network-firewall': ['Cloud & Infrastructure Security', 'Network & Firewalls'],
  'sec-certificate-warden': ['Cloud & Infrastructure Security', 'PKI & Certificates'],
  'sec-endpoint-hardener': ['Cloud & Infrastructure Security', 'Endpoint Hardening'],
  'sec-backup-integrity': ['Cloud & Infrastructure Security', 'Backup Integrity'],
  'sec-iam-reviewer': ['Identity & Access', 'Access Design'],
  'sec-password-audit': ['Identity & Access', 'Authentication Hygiene'],
  'sec-access-review': ['Identity & Access', 'Access Reviews'],
  'sec-privileged-session': ['Identity & Access', 'Privileged Access'],
  'sec-onboarding-sec': ['Identity & Access', 'Secure Onboarding'],
  'sec-secret-scanner': ['Vulnerability Management', 'Secrets & Credentials'],
  'sec-vuln-triage': ['Vulnerability Management', 'Triage & Prioritization'],
  'eng-vuln-triage': ['Vulnerability Management', 'Triage & Prioritization'],
  'sec-vuln-scan-orchestrator': ['Vulnerability Management', 'Scan Orchestration'],
  'sec-threat-intel-feed': ['Vulnerability Management', 'Threat Intelligence'],
  'sec-malware-ioc': ['Vulnerability Management', 'Malware IOCs'],
  'sec-google-scan': ['Vulnerability Management', 'External Exposure'],
  'sec-ir-coordinator': ['Detection & Response', 'Incident Response'],
  'sec-logs-threat': ['Detection & Response', 'SIEM & Threat Hunting'],
  'sec-dlp-monitor': ['Detection & Response', 'Data Loss Prevention'],
  'sec-phishing-sim': ['Detection & Response', 'Phishing & Awareness'],
  'sec-threat-mtg': ['Security Governance', 'Threat Modeling'],
  'sec-pentest-plan': ['Security Governance', 'Penetration Testing'],
  'sec-vendor-security': ['Security Governance', 'Vendor Security'],
  'sec-ai-governance': ['Security Governance', 'AI Security Governance'],

  // ── People & Talent (30) ──
  'hr-recruiter-sourcer': ['Recruiting & Hiring', 'Sourcing & Talent Pipeline'],
  'hr-ats-cleaner': ['Recruiting & Hiring', 'Pipeline & ATS Operations'],
  'hr-interview-coordinator': ['Recruiting & Hiring', 'Interview Coordination'],
  'hr-rubric-designer': ['Recruiting & Hiring', 'Rubrics & Assessment'],
  'hr-reference-checker': ['Recruiting & Hiring', 'Reference & Background Checks'],
  'hr-hire-decision-memo': ['Recruiting & Hiring', 'Hire Decisions'],
  'hr-internship-coordinator': ['Recruiting & Hiring', 'Early-Career Programs'],
  'hr-onboarding-concierge': ['Onboarding & Offboarding', 'Onboarding Experience'],
  'hr-offboarding-deprovisioner': ['Onboarding & Offboarding', 'Offboarding & Deprovisioning'],
  'hr-people-ops-bot': ['People Ops & Policy', 'HR Self-Service Concierge'],
  'hr-policy-writer': ['People Ops & Policy', 'HR Policy Authoring'],
  'hr-employee-relations': ['People Ops & Policy', 'Employee Relations'],
  'hr-remote-work-policy': ['People Ops & Policy', 'Remote & Hybrid Policy'],
  'hr-comp-benchmarker': ['Total Rewards & Payroll', 'Compensation & Equity'],
  'hr-payroll-compliance': ['Total Rewards & Payroll', 'Payroll & Statutory Compliance'],
  'hr-benefits-admin': ['Total Rewards & Payroll', 'Benefits Administration'],
  'hr-perf-review-scheduler': ['Performance & Leadership', 'Review Cycles'],
  'hr-talent-review-lead': ['Performance & Leadership', 'Succession Planning'],
  'hr-ld-program-lead': ['Performance & Leadership', 'Learning & Development'],
  'hr-compliance-trainer': ['Performance & Leadership', 'Compliance Training'],
  'hr-workforce-planner': ['Performance & Leadership', 'Workforce Planning'],
  'hr-hris-steward': ['People Analytics', 'HRIS Data Governance'],
  'hr-retention-risk': ['People Analytics', 'Retention & Flight Risk'],
  'hr-exit-interviewer': ['People Analytics', 'Exit & Turnover'],
  'hr-absenteeism-analyst': ['People Analytics', 'Leave & Absenteeism'],
  'hr-dei-watchdog': ['People Analytics', 'DEI & Pay Equity'],
  'hr-engagement-survey': ['Culture & Engagement', 'Engagement Surveys'],
  'hr-pulse-checker': ['Culture & Engagement', 'Pulse Surveys'],
  'hr-culture-program': ['Culture & Engagement', 'Culture & Events'],
  'hr-org-chart-admin': ['Culture & Engagement', 'Org Design'],

  // ── Finance & Accounting (30) ──
  'fin-ar-collections': ['Accounting & Close', 'Receivables & Collections'],
  'fin-ap-clerk': ['Accounting & Close', 'Payables & Vendor Payments'],
  'fin-close-automator': ['Accounting & Close', 'Month-End Close'],
  'fin-close-checklist': ['Accounting & Close', 'Close Governance'],
  'fin-bank-reconciler': ['Accounting & Close', 'Bank Reconciliation'],
  'fin-credit-memo': ['Accounting & Close', 'Refunds & Adjustments'],
  'fin-subsidiary-reconciler': ['Accounting & Close', 'Intercompany Reconciliation'],
  'fin-cfo-analyst': ['Planning & Forecasting', 'Budgets & Rolling Forecasts'],
  'fin-budget-drilldown': ['Planning & Forecasting', 'Variance Analysis'],
  'fin-runway-guard': ['Planning & Forecasting', 'Runway & Cash'],
  'fin-cio': ['Planning & Forecasting', 'Cash Flow Forecasting'],
  'fin-use-of-funds': ['Planning & Forecasting', 'Spend Accountability'],
  'fin-initial-revenue-model': ['Planning & Forecasting', 'Unit Economics'],
  'fin-statement-writer': ['Planning & Forecasting', 'Financial Narratives'],
  'fin-committee-secretary': ['Planning & Forecasting', 'Board & Investor Reporting'],
  'fin-revenue-recognizer': ['Revenue & Billing', 'Revenue Recognition'],
  'fin-billing-systems': ['Revenue & Billing', 'Subscription Billing'],
  'fin-revenue-lag-watch': ['Revenue & Billing', 'Revenue Leakage'],
  'fin-pricing-analyst': ['Revenue & Billing', 'Pricing & Packaging'],
  'fin-commission-calc': ['Revenue & Billing', 'Sales Commissions'],
  'fin-currency-risk': ['Treasury & Risk', 'FX & Currency Risk'],
  'fin-cap-table-owner': ['Treasury & Risk', 'Cap Table & Equity'],
  'fin-procurement-analyst': ['Treasury & Risk', 'Procurement & Spend'],
  'fin-vat-expert': ['Payroll & Tax', 'VAT & Sales Tax'],
  'fin-tax-calendar': ['Payroll & Tax', 'Tax Calendar & Filings'],
  'fin-boost-payroll': ['Payroll & Tax', 'Payroll Validation'],
  'fin-expense-auditor': ['Internal Audit & Controls', 'Expense & Spend Policy'],
  'fin-forensic-flag': ['Internal Audit & Controls', 'Fraud & Anomaly Detection'],
  'fin-audit-support': ['Internal Audit & Controls', 'External Audit Support'],
  'fin-treasury-compliance': ['Internal Audit & Controls', 'Treasury Controls'],

  // ── Sales & Marketing (30) ──
  'sm-outbound-sdr': ['Sales Development', 'Outbound Sequencing'],
  'sm-account-insight': ['Sales Development', 'Account Research'],
  'sm-demo-scripter': ['Sales Development', 'Demo & Discovery'],
  'sm-sales-enablement': ['Sales Development', 'Enablement & Battlecards'],
  'sm-quote-designer': ['Sales Development', 'Quotes & Pricing Proposals'],
  'sm-crm-hygiene': ['Revenue Operations', 'CRM Hygiene'],
  'sm-pipeline-forecaster': ['Revenue Operations', 'Pipeline Forecasting'],
  'sm-partner-channel': ['Revenue Operations', 'Partners & Channels'],
  'sm-win-loss-lead': ['Revenue Operations', 'Win/Loss Analysis'],
  'sm-abm-campaigner': ['Demand Generation', 'ABM Campaigns'],
  'sm-lifecycle-email': ['Demand Generation', 'Lifecycle Email'],
  'sm-events-webinar': ['Demand Generation', 'Events & Webinars'],
  'sm-webinar-postproducer': ['Demand Generation', 'Event Follow-Up'],
  'sm-cold-email-validator': ['Demand Generation', 'Deliverability'],
  'sm-content-marketer': ['Brand & Content', 'Content Strategy'],
  'sm-product-marketer': ['Brand & Content', 'Positioning & Launch'],
  'sm-social-media': ['Brand & Content', 'Social Content'],
  'sm-pr-reputation': ['Brand & Content', 'PR & Reputation'],
  'sm-brand-assets': ['Brand & Content', 'Brand Voice'],
  'sm-fashion-plp': ['Brand & Content', 'Ecommerce Copy'],
  'sm-content-repurposer': ['Brand & Content', 'Content Repurposing'],
  'sm-seo-specialist': ['Growth Engine', 'SEO & Organic'],
  'sm-landing-page-auditor': ['Growth Engine', 'CRO & Landing Pages'],
  'sm-landing-audit': ['Growth Engine', 'Pre-Launch QA'],
  'sm-display-ad-analyst': ['Growth Engine', 'Paid Ads'],
  'sm-campaign-analyst': ['Marketing Analysis', 'Campaign Analytics'],
  'sm-customer-voice': ['Marketing Analysis', 'Voice of Customer'],
  'sm-market-link-scan': ['Marketing Analysis', 'Market Intelligence'],
  'sm-slack-bytes': ['Marketing Analysis', 'Marketing Operations'],
  'sm-jc-analyst': ['Go-to-Market', 'Competitive Intelligence'],

  // ── Customer Experience (30) ──
  'cs-triage-router': ['Support Operations', 'Triage & Routing'],
  'cs-sla-watchdog': ['Support Operations', 'SLA Monitoring'],
  'cs-helpdesk-ops': ['Support Operations', 'Helpdesk Ops'],
  'cs-critical-ticket-sentinel': ['Support Operations', 'Critical Ticket Monitoring'],
  'cs-escalation-coordinator': ['Support Operations', 'Escalations'],
  'cs-macros-writer': ['Support Operations', 'Macros & Canned Replies'],
  'cs-quality-assurer': ['Support Operations', 'Quality Assurance'],
  'cs-billing-support': ['Support Operations', 'Billing & Refunds'],
  'cs-api-support-engineer': ['Technical Support', 'API & SDK Support'],
  'cs-bug-liaison': ['Technical Support', 'Bug Triage & Escalation'],
  'cs-data-export-specialist': ['Technical Support', 'Data Export & Migration'],
  'cs-security-support': ['Technical Support', 'Security & Privacy Support'],
  'cs-onboarding-specialist': ['Onboarding & Retention', 'Customer Onboarding'],
  'cs-health-scorer': ['Onboarding & Retention', 'Account Health'],
  'cs-churn-preventer': ['Onboarding & Retention', 'Churn Prevention'],
  'cs-renewal-specialist': ['Onboarding & Retention', 'Renewals & Expansion'],
  'cs-qbr-builder': ['Onboarding & Retention', 'QBRs & Executive Reviews'],
  'cs-rtv-stall-finder': ['Onboarding & Retention', 'Time-to-Value'],
  'cs-csat-analyst': ['Insights & Reporting', 'CSAT & NPS'],
  'cs-weekly-support-brief': ['Insights & Reporting', 'Support Briefings'],
  'cs-kb-writer': ['Content & Learning', 'Knowledge Base'],
  'cs-docs-gap-hunter': ['Content & Learning', 'Docs Coverage'],
  'cs-training-producer': ['Content & Learning', 'Customer Training'],
  'cs-agent-coach': ['Content & Learning', 'Agent Coaching'],
  'cs-community-manager': ['Voice of Customer', 'Community & Forums'],
  'cs-empathy-coach': ['Voice of Customer', 'Empathy & De-escalation'],
  'cs-announcement-drafter': ['Voice of Customer', 'Announcements & Outages'],
  'cs-voice-of-customer': ['Voice of Customer', 'VoC Mining'],
  'cs-voice-to-product': ['Voice of Customer', 'Support-to-Product'],
  'cs-feedback-to-product': ['Voice of Customer', 'Feedback to Product'],

  // ── Legal & Compliance (30) ──
  'lg-contract-reviewer': ['Contracts & Commercial', 'Contract Review'],
  'lg-msa-negotiatior': ['Contracts & Commercial', 'MSA & SOW Negotiation'],
  'lg-nda-queue': ['Contracts & Commercial', 'NDA & Paperwork'],
  'lg-terms-writer': ['Contracts & Commercial', 'Terms & Policy Pages'],
  'lg-contract-clause-lib': ['Contracts & Commercial', 'Clause Library'],
  'lg-dpa-reviewer': ['Privacy & Data Protection', 'DPA Review'],
  'lg-dsar-processor': ['Privacy & Data Protection', 'DSAR Processing'],
  'lg-pia-facilitator': ['Privacy & Data Protection', 'Privacy Impact Assessments'],
  'lg-data-mapping': ['Privacy & Data Protection', 'Data Mapping & Inventory'],
  'lg-subprocessor-track': ['Privacy & Data Protection', 'Subprocessor Register'],
  'lg-cookie-consent-auditor': ['Privacy & Data Protection', 'Consent & Cookies'],
  'lg-incident-privacy': ['Privacy & Data Protection', 'Breach & Incident Privacy'],
  'lg-compliance-program': ['Governance & Regulatory', 'Compliance Programs'],
  'lg-reg-change-monitor': ['Governance & Regulatory', 'Regulatory Monitoring'],
  'lg-vendor-risk-reviewer': ['Governance & Regulatory', 'Vendor Risk'],
  'lg-anti-money-laundering': ['Governance & Regulatory', 'AML Screening'],
  'lg-export-control': ['Governance & Regulatory', 'Export Controls'],
  'lg-coi-register': ['Governance & Regulatory', 'Conflict of Interest'],
  'lg-ai-governance': ['Governance & Regulatory', 'AI Governance'],
  'lg-board-minutes': ['Governance & Regulatory', 'Board Minutes'],
  'lg-employ-law-review': ['Employment & IP', 'Employment Law'],
  'lg-os-license-reviewer': ['Employment & IP', 'Open Source Licenses'],
  'lg-copyright-sentinel': ['Employment & IP', 'Trademarks & Copyright'],
  'lg-ip-trademark-watch': ['Employment & IP', 'IP Watch'],
  'lg-litigation-hold': ['Legal Operations', 'Litigation Holds'],
  'lg-records-retention': ['Legal Operations', 'Records Retention'],
  'lg-dispute-intake': ['Legal Operations', 'Dispute Intake'],
  'lg-training-completeness': ['Legal Operations', 'Compliance Training'],
  'lg-policy-drafter': ['Legal Operations', 'Policy Drafting'],
  'lg-legal-kb': ['Legal Operations', 'Legal KB & FAQs'],

  // ── Data & Analytics (30) ──
  'bi-pipeline-engineer': ['Data Engineering', 'ETL & Pipelines'],
  'bi-realtime-stream': ['Data Engineering', 'Real-Time Streaming'],
  'bi-backfill-coordinator': ['Data Engineering', 'Backfills & Repair'],
  'bi-data-cleaner': ['Data Engineering', 'Data Cleansing'],
  'bi-data-modeler': ['Modeling & Warehousing', 'Data Warehousing'],
  'bi-semantic-layer': ['Modeling & Warehousing', 'Semantic Layer'],
  'bi-metrics-ordinator': ['Modeling & Warehousing', 'Metrics Layer'],
  'bi-catalog-curator': ['Modeling & Warehousing', 'Catalog & Lineage'],
  'bi-dashboard-designer': ['Analytics & Insights', 'Dashboard Design'],
  'bi-exec-dashboard': ['Analytics & Insights', 'Executive View'],
  'bi-analytics-reporter': ['Analytics & Insights', 'Executive Reporting'],
  'bi-funnel-analyst': ['Analytics & Insights', 'Funnel Analysis'],
  'bi-abhoc-funnel': ['Analytics & Insights', 'Ad-Hoc Funnel Explainer'],
  'bi-user-cohorts': ['Analytics & Insights', 'Cohorts & Retention'],
  'bi-geo-analyst': ['Analytics & Insights', 'Geospatial Analysis'],
  'bi-csv-reporter': ['Analytics & Insights', 'Ad-Hoc Reporting'],
  'bi-raw-log-analyst': ['Analytics & Insights', 'Log & Event Analysis'],
  'bi-sql-optimizer': ['Analytics & Insights', 'Query Performance'],
  'bi-query-latency-siren': ['Data Quality & Reliability', 'Query Latency'],
  'bi-quality-sentinel': ['Data Quality & Reliability', 'Data Quality'],
  'bi-warehouse-freshness': ['Data Quality & Reliability', 'Freshness'],
  'bi-drift-watch': ['Data Quality & Reliability', 'Drift Detection'],
  'bi-vector-health': ['Data Quality & Reliability', 'Vector Index Health'],
  'bi-kpi-definition-audit': ['Data Quality & Reliability', 'KPI Definitions'],
  'bi-dbt-health': ['Data Quality & Reliability', 'dbt Project Health'],
  'bi-tag-taxonomy': ['Data Quality & Reliability', 'Tagging & Taxonomy'],
  'bi-embedding-architect': ['ML & Experimentation', 'Embeddings & RAG'],
  'bi-experiment-analyst': ['ML & Experimentation', 'Experiment Analysis'],
  'bi-model-governance': ['ML & Experimentation', 'ML Governance'],
  'bi-forecaster': ['ML & Experimentation', 'Forecasting'],

  // ── Product & Project Management (30) ──
  'pm-roadmap-planner': ['Product Strategy', 'Roadmapping'],
  'pm-competitive-gap': ['Product Strategy', 'Competitive Gaps'],
  'pm-competitive-sentinel': ['Product Strategy', 'Competitor Watch'],
  'pm-market-summary': ['Product Strategy', 'Market Research'],
  'pm-pricing-strategist': ['Product Strategy', 'Pricing & Packaging'],
  'pm-okr-manager': ['Product Strategy', 'OKRs & Goals'],
  'pm-metrics-analyst': ['Product Strategy', 'Product Metrics'],
  'pm-health-score': ['Product Strategy', 'Health & Retention Score'],
  'pm-abtest-designer': ['Product Strategy', 'Experiments'],
  'pm-discovery-lead': ['Product Strategy', 'Discovery'],
  'pm-prd-writer': ['Product Definition', 'PRDs'],
  'pm-user-story-crafter': ['Product Definition', 'User Stories'],
  'pm-tech-spec': ['Product Definition', 'Technical Specs'],
  'pm-backlog-refiner': ['Product Definition', 'Backlog Refinement'],
  'pm-internal-llm': ['Product Definition', 'Spec Review'],
  'pm-support-pm': ['Product Definition', 'Support Synthesis'],
  'pm-user-research-ops': ['User Research', 'Research Programs'],
  'pm-nps-owner': ['User Research', 'Feedback Loops'],
  'pm-beta-coordinator': ['Delivery & Execution', 'Beta Programs'],
  'pm-feature-flag': ['Delivery & Execution', 'Feature Flags'],
  'pm-release-manager': ['Delivery & Execution', 'Launch Orchestration'],
  'pm-changelog-writer': ['Delivery & Execution', 'Release Communications'],
  'pm-sprint-facilitator': ['Delivery & Execution', 'Sprint Execution'],
  'pm-estimation-coach': ['Delivery & Execution', 'Estimation'],
  'pm-rtb-retro': ['Delivery & Execution', 'Retrospectives'],
  'pm-launch-sec': ['Delivery & Execution', 'Launch Risk Review'],
  'pm-pmo-tracker': ['Program Management', 'Program Status'],
  'pm-risk-register': ['Program Management', 'Risk Register'],
  'pm-stakeholder-brief': ['Program Management', 'Stakeholder Comms'],
  'pm-sec-compliance': ['Program Management', 'Product Compliance'],

  // ── IT & Operations (30) ──
  'ops-asset-tracker': ['Endpoints & Devices', 'Asset & Inventory'],
  'ops-mdm-admin': ['Endpoints & Devices', 'Device Policy & MDM'],
  'ops-fleet-reporter': ['Endpoints & Devices', 'Fleet Health'],
  'ops-acceptance-desktop': ['Endpoints & Devices', 'Desktop Deployment'],
  'ops-printer-periph': ['Endpoints & Devices', 'Printing & Peripherals'],
  'ops-coldstart': ['Endpoints & Devices', 'Office Setup'],
  'ops-malware-responder': ['Endpoints & Devices', 'Endpoint Malware Response'],
  'ops-helpdesk-sla': ['IT Helpdesk', 'SLAs & Flow'],
  'ops-onboarding-it': ['IT Helpdesk', 'Access Provisioning'],
  'ops-offboarding-it': ['IT Helpdesk', 'Exit Deprovisioning'],
  'ops-oncall-duty': ['IT Helpdesk', 'On-Call Schedules'],
  'ops-incident-it': ['IT Helpdesk', 'Incident Comms'],
  'ops-sso-admin': ['Identity & Access', 'SSO & Federation'],
  'ops-gsuite-admin': ['Identity & Access', 'Workspace Administration'],
  'ops-token-rotator': ['Identity & Access', 'Token & Secret Rotation'],
  'ops-vpn-remote-admin': ['Identity & Access', 'Remote Access'],
  'ops-slack-admin': ['Collaboration & Apps', 'Messaging Governance'],
  'ops-timezone-remote': ['Collaboration & Apps', 'Distributed Work Ops'],
  'ops-network-admin': ['Infrastructure & Network', 'Network & VPN'],
  'ops-dns-watch': ['Infrastructure & Network', 'DNS & Email Routing'],
  'ops-datacenter-health': ['Infrastructure & Network', 'Datacenter Environment'],
  'ops-file-server-admin': ['Infrastructure & Network', 'File & Print Services'],
  'ops-patch-manager': ['Infrastructure & Network', 'Patch Compliance'],
  'ops-backup-drill': ['Infrastructure & Network', 'Backup & DR'],
  'ops-saas-budget': ['IT Finance & Vendors', 'SaaS Spend'],
  'ops-provider-billing': ['IT Finance & Vendors', 'Cloud Billing'],
  'ops-vendor-contracts': ['IT Finance & Vendors', 'Vendor Contracts'],
  'ops-license-handler': ['IT Finance & Vendors', 'License Compliance'],
  'ops-audit-trail': ['Compliance & Audit', 'Access & Change Logs'],
  'ops-audit-log-collector': ['Compliance & Audit', 'Audit Log Consolidation'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Extraction from the existing file
// ─────────────────────────────────────────────────────────────────────────────

let src = '';
try {
  src = fs.readFileSync(TARGET, 'utf8');
} catch {
  console.error(`[generate-agents] Cannot read ${TARGET}`);
  process.exit(1);
}

const sliceBetween = (startMarker, endMarker) => {
  const i = src.indexOf(startMarker);
  if (i === -1) throw new Error(`Missing boundary marker: ${startMarker}`);
  const j = src.indexOf(endMarker, i + startMarker.length);
  if (j === -1) throw new Error(`Missing end marker after: ${startMarker}`);
  return src.slice(i, j).replace(/\s+$/, '') + '\n';
};

const parseCatalogKeys = (block) => {
  const keys = [];
  const re = /^\s*"([^"]+)":/gm;
  let m;
  while ((m = re.exec(block)) !== null) keys.push(m[1]);
  return new Set(keys);
};

const mcpPurposeBlock = sliceBetween('const MCP_PURPOSE', 'function buildSystemPrompt');
const mcpKeys = parseCatalogKeys(mcpPurposeBlock);

const systemPromptBlock = sliceBetween('function buildSystemPrompt', 'const SKILL_NAMES');
const skillNamesBlock = sliceBetween('const SKILL_NAMES', 'const AGENT_SPECS');
const skillKeys = parseCatalogKeys(skillNamesBlock);

const specsRaw = sliceBetween('const AGENT_SPECS: AgentSpec[] = [', 'export const ENTERPRISE_AGENT_TEMPLATES');

const specs = [];
for (const line of specsRaw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{"id":')) continue;
  const clean = trimmed.replace(/,$/, '');
  const spec = JSON.parse(clean);
  specs.push(spec);
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation + classification
// ─────────────────────────────────────────────────────────────────────────────

if (specs.length !== 300) {
  console.error(`[generate-agents] Expected 300 specs, found ${specs.length}`);
  process.exit(1);
}

const seen = new Set();
const errors = [];
const byDomain = Object.fromEntries(DOMAINS.map((d) => [d, []]));

for (const spec of specs) {
  if (seen.has(spec.id)) errors.push(`duplicate id: ${spec.id}`);
  seen.add(spec.id);

  const domain = MOVE[spec.id] || RENAME[spec.category] || spec.category;
  if (!DOMAINS.includes(domain)) errors.push(`${spec.id}: unknown domain "${domain}"`);

  const tax = TAX[spec.id];
  if (!tax) {
    errors.push(`${spec.id}: missing taxonomy entry`);
    continue;
  }
  const [discipline, specialty] = tax;
  const discSet = TAXONOMY[domain];
  if (!discSet) {
    errors.push(`${spec.id}: no disciplines for domain "${domain}"`);
    continue;
  }
  if (!Array.isArray(discSet[discipline])) {
    errors.push(`${spec.id}: discipline "${discipline}" not in ${domain}`);
  } else if (!discSet[discipline].includes(specialty)) {
    errors.push(`${spec.id}: specialty "${specialty}" not under ${domain} / ${discipline}`);
  }

  for (const m of spec.mcps || []) {
    if (!mcpKeys.has(m)) errors.push(`${spec.id}: unknown MCP "${m}"`);
  }
  for (const s of spec.skills || []) {
    if (!skillKeys.has(s)) errors.push(`${spec.id}: unknown skill "${s}"`);
  }

  spec.category = domain;
  spec.subcategory = discipline;
  spec.specialty = specialty;
  byDomain[domain].push(spec);
}

if (errors.length) {
  console.error(`[generate-agents] ${errors.length} validation error(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

for (const d of DOMAINS) {
  const expected = TAXONOMY[d];
  const actual = byDomain[d].length;
  console.log(`[generate-agents] ${d}: ${actual}`);
  let specCount = 0;
  for (const [disc, specials] of Object.entries(expected)) {
    const n = byDomain[d].filter((s) => s.subcategory === disc).length;
    specCount += n;
    console.log(`   ${disc} (${n}): ${specials.join(' / ')}`);
  }
  if (specCount !== actual) {
    console.error(`[generate-agents] discipline count mismatch in ${d}: ${specCount} != ${actual}`);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Serialization
// ─────────────────────────────────────────────────────────────────────────────

const specNames = {
  'Software Development': 'SOFTWARE DEVELOPMENT',
  'People & Talent': 'PEOPLE & TALENT',
  'Finance & Accounting': 'FINANCE & ACCOUNTING',
  'Sales & Marketing': 'SALES & MARKETING',
  'Customer Experience': 'CUSTOMER EXPERIENCE',
  'Legal & Compliance': 'LEGAL & COMPLIANCE',
  'Data & Analytics': 'DATA & ANALYTICS',
  'Security & SecOps': 'SECURITY & SECOPS',
  'Product & Project Management': 'PRODUCT & PROJECT MANAGEMENT',
  'IT & Operations': 'IT & OPERATIONS',
};

const specBlocks = DOMAINS.map((d) => {
  const lines = byDomain[d].map((s) => `  ${JSON.stringify(s)},`);
  return `  // ── ${specNames[d]} (${byDomain[d].length}) ──\n${lines.join('\n')}`;
}).join('\n');

const domainsLiteral = DOMAINS.map((d) => `  '${d}',`).join('\n');

const disciplinesLiteral = DOMAINS.map((d) => {
  const discs = Object.keys(TAXONOMY[d]);
  const inner = discs.map((x) => `    '${x}',`).join('\n');
  return `  '${d}': [\n${inner}\n  ],`;
}).join('\n');

const specialtiesLiteral = DOMAINS.map((d) => {
  return Object.entries(TAXONOMY[d]).map(([disc, specials]) => {
    const inner = specials.map((x) => `    '${x}',`).join('\n');
    return `  '${d} :: ${disc}': [\n${inner}\n  ],`;
  }).join('\n');
}).join('\n');

const out = `// Generated by tools/generate-agents.mjs — do not edit by hand.
// 300 enterprise agents across 10 domains in a 3-level taxonomy
// (Domain → Discipline → Specialty). Every recommended_mcps / recommended_skills
// entry is validated against the stock MCP catalog and the seeded skill catalog
// at generation time.

export interface AgentTemplate {
  id: string;
  name: string;
  category: string;      // L1 domain
  subcategory?: string;  // L2 discipline
  specialty?: string;    // L3 specialty
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

/** L2 disciplines per domain, ordered. */
export const ENTERPRISE_DISCIPLINES: Record<string, readonly string[]> = {
${disciplinesLiteral}
};

/** L3 specialties keyed by \`\${domain} :: \${discipline}\`. */
export const ENTERPRISE_SPECIALTIES: Record<string, readonly string[]> = {
${specialtiesLiteral}
};

interface AgentSpec {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  specialty: string;
  role: string;
  description: string;
  mission: string;
  duties: string[];
  tags: string[];
  cron: string | null;
  mcps: string[];
  skills: string[];
  policies: string[];
  model: string;
  provider: string;
}

${mcpPurposeBlock}
${systemPromptBlock}
${skillNamesBlock}
const AGENT_SPECS: AgentSpec[] = [
${specBlocks}
];

export const ENTERPRISE_AGENT_TEMPLATES: AgentTemplate[] = AGENT_SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  category: spec.category,
  subcategory: spec.subcategory,
  specialty: spec.specialty,
  role: spec.role,
  description: spec.description,
  system_prompt: buildSystemPrompt(spec),
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
console.log(`[generate-agents] Wrote ${TARGET} (${specs.length} agents)`);