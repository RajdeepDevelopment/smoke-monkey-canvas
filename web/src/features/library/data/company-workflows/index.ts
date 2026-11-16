import type { CompanyWorkflowJson } from './types.js';

import saasCloud from './company-saas-cloud.json' with { type: 'json' };
import fintechBank from './company-fintech-bank.json' with { type: 'json' };
import aiLabs from './company-ai-labs.json' with { type: 'json' };
import cyberDefense from './company-cybersecurity-defense.json' with { type: 'json' };
import ecommerceRetail from './company-ecommerce-retail.json' with { type: 'json' };
import healthNetwork from './company-healthcare-network.json' with { type: 'json' };
import growthMarketing from './company-growth-marketing.json' with { type: 'json' };
import gamingStudio from './company-gaming-studio.json' with { type: 'json' };
import freightLogistics from './company-freight-logistics.json' with { type: 'json' };
import ventureCapital from './company-venture-capital.json' with { type: 'json' };

export * from './types.js';

export const ALL_COMPANY_WORKFLOW_JSONS: CompanyWorkflowJson[] = [
  saasCloud as CompanyWorkflowJson,
  fintechBank as CompanyWorkflowJson,
  aiLabs as CompanyWorkflowJson,
  cyberDefense as CompanyWorkflowJson,
  ecommerceRetail as CompanyWorkflowJson,
  healthNetwork as CompanyWorkflowJson,
  growthMarketing as CompanyWorkflowJson,
  gamingStudio as CompanyWorkflowJson,
  freightLogistics as CompanyWorkflowJson,
  ventureCapital as CompanyWorkflowJson,
];

export const COMPANY_WORKFLOW_JSON_MAP = new Map<string, CompanyWorkflowJson>(
  ALL_COMPANY_WORKFLOW_JSONS.map((c) => [c.id, c]),
);

export function getCompanyWorkflowJson(companyIdOrName: string): CompanyWorkflowJson | null {
  if (!companyIdOrName) return null;
  const direct = COMPANY_WORKFLOW_JSON_MAP.get(companyIdOrName);
  if (direct) return direct;

  const clean = companyIdOrName.toLowerCase().trim();
  for (const wf of ALL_COMPANY_WORKFLOW_JSONS) {
    if (
      clean.includes(wf.id) ||
      clean.includes(wf.name.toLowerCase()) ||
      clean.includes(wf.category.toLowerCase()) ||
      clean.includes(wf.domain.toLowerCase())
    ) {
      return wf;
    }
  }

  if (clean.includes('saas') || clean.includes('cloud') || clean.includes('software') || clean.includes('apex')) {
    return saasCloud as CompanyWorkflowJson;
  }
  if (clean.includes('fintech') || clean.includes('bank') || clean.includes('trading') || clean.includes('aegis')) {
    return fintechBank as CompanyWorkflowJson;
  }
  if (/(^|[\s_-])ai($|[\s_-])/.test(clean) || clean.includes('openai') || clean.includes('intelligence') || clean.includes('foundation') || clean.includes('nexus')) {
    return aiLabs as CompanyWorkflowJson;
  }
  if (clean.includes('cyber') || clean.includes('security') || clean.includes('soc') || clean.includes('ironclad')) {
    return cyberDefense as CompanyWorkflowJson;
  }
  if (clean.includes('ecommerce') || clean.includes('retail') || clean.includes('checkout') || clean.includes('omnicart')) {
    return ecommerceRetail as CompanyWorkflowJson;
  }
  if (clean.includes('health') || clean.includes('medical') || clean.includes('hipaa') || clean.includes('carepulse')) {
    return healthNetwork as CompanyWorkflowJson;
  }
  if (clean.includes('marketing') || clean.includes('growth') || clean.includes('agency') || clean.includes('hyperscale')) {
    return growthMarketing as CompanyWorkflowJson;
  }
  if (clean.includes('game') || clean.includes('gaming') || clean.includes('studio') || clean.includes('pixelforge')) {
    return gamingStudio as CompanyWorkflowJson;
  }
  if (clean.includes('freight') || clean.includes('logistics') || clean.includes('supply') || clean.includes('streamline')) {
    return freightLogistics as CompanyWorkflowJson;
  }
  if (clean.includes('venture') || clean.includes('capital') || clean.includes('syndicate') || clean.includes('vanguard')) {
    return ventureCapital as CompanyWorkflowJson;
  }

  return null;
}

export function getCompanyWorkflowFields(companyIdOrName: string): {
  workflowPrompt: string;
  workflowInstructions: string;
  responsibilities: string;
} {
  const json = getCompanyWorkflowJson(companyIdOrName);
  if (!json) {
    return {
      workflowPrompt: 'Operate with high reliability, automated quality gates, and strict delegation.',
      workflowInstructions: '1. Leadership sets strategic objectives.\n2. Management orchestrates squads.\n3. Specialists execute and test.',
      responsibilities: 'Enterprise domain execution.',
    };
  }
  return formatCompanyWorkflow(json);
}

export function formatCompanyWorkflow(json: CompanyWorkflowJson): {
  workflowPrompt: string;
  workflowInstructions: string;
  responsibilities: string;
} {
  const workflowPrompt = [
    `Operate as a high-performing enterprise in ${json.domain}.`,
    `Operating Cadence: ${json.operatingCadence}`,
    `Performance & Reliability Targets: ${json.targets.primarySla || '99.99% availability'} | Quality Standard: ${json.targets.qualityStandard || '85%+ automated coverage'} | Velocity: ${json.targets.sprintVelocity || 'Continuous release'} | ETA Discipline: ${json.targets.etaDiscipline}`,
  ].join('\n');

  const workAreasSection = json.workAreas
    .map((w) => `• **${w.name}** (${w.roles.join(', ')}): ${w.focus} [Target: ${w.targets}]`)
    .join('\n');

  const featureSteps = json.workflows.featureDevelopment?.steps?.join('\n') || '';
  const bugSteps = json.workflows.bugTriageAndResolution?.steps?.join('\n') || '';
  const onboardingSteps = json.workflows.initialProjectOnboarding?.steps?.join('\n') || '';
  const leadershipRules = json.workflows.leadershipRules?.rules?.map((r) => `• ${r}`).join('\n') || '';

  const workflowInstructions = [
    `### FUNCTIONAL WORK AREAS & SPECIALIZATION:`,
    workAreasSection,
    '',
    `### STEP-BY-STEP OPERATIONAL PIPELINES:`,
    '',
    `#### 1. FEATURE DEVELOPMENT PIPELINE (MANAGEMENT TRIAGE -> DEVELOPER ASSIGNMENT -> ETA COMMITMENT -> ACTIVE FOLLOW-UPS):`,
    featureSteps,
    '',
    `#### 2. DEFECT DISCOVERY & BUG RESOLUTION LIFECYCLE (QA DISCOVERY -> MANAGEMENT APPROVAL -> ETA COMMITMENT -> FIX & REGRESSION TEST):`,
    bugSteps,
    '',
    `#### 3. FIRST-TIME PROJECT ONBOARDING & CODEBASE EXPLORATION PROTOCOL:`,
    onboardingSteps,
    '',
    `#### 4. STRICT LEADERSHIP FIDELITY & NON-CODING POLICY:`,
    leadershipRules,
  ].filter(Boolean).join('\n');

  const responsibilities = json.workAreas
    .map((w) => `${w.name} owns ${w.focus.toLowerCase()}`)
    .join('; ');

  return {
    workflowPrompt,
    workflowInstructions,
    responsibilities,
  };
}
