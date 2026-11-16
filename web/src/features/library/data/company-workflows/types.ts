export interface WorkAreaSpec {
  name: string;
  roles: string[];
  focus: string;
  targets: string;
}

export interface WorkflowPipelineSpec {
  title: string;
  steps: string[];
}

export interface LeadershipRulesSpec {
  title: string;
  rules: string[];
}

export interface CompanyTargetsSpec {
  primarySla?: string;
  qualityStandard?: string;
  sprintVelocity?: string;
  etaDiscipline: string;
  [key: string]: string | undefined;
}

export interface ZoneSpecificPromptSpec {
  roleTitle: string;
  name: string;
  responsibilities: string;
  workflowInstructions: string;
  dedicatedZonePrompt: string;
}

export interface CompanyWorkflowJson {
  id: string;
  name: string;
  category: string;
  domain: string;
  tagline: string;
  operatingCadence: string;
  workAreas: WorkAreaSpec[];
  targets: CompanyTargetsSpec;
  workflows: {
    featureDevelopment: WorkflowPipelineSpec;
    bugTriageAndResolution: WorkflowPipelineSpec;
    initialProjectOnboarding: WorkflowPipelineSpec;
    leadershipRules: LeadershipRulesSpec;
    [key: string]: WorkflowPipelineSpec | LeadershipRulesSpec;
  };
  zoneSpecificPrompts?: Record<string, ZoneSpecificPromptSpec>;
}
