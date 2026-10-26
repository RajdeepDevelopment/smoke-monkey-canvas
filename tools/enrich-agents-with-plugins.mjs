#!/usr/bin/env node
/**
 * Enrich AGENT_SPECS with GitHub plugin repos.
 *
 * Usage:
 *   node tools/enrich-agents-with-plugins.mjs            # dry-run + samples
 *   node tools/enrich-agents-with-plugins.mjs --write    # patch agent.templates.ts
 *   node tools/enrich-agents-with-plugins.mjs --dedupe   # suggest/remove duplicate AI Ethics rows
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TEMPLATE_FILE = process.env.AGENT_TEMPLATE_FILE || path.join(ROOT, 'web/src/features/agent/agent.templates.ts');
const PLUGIN_FILE = path.join(ROOT, 'server/features/skill/skill.plugins.json');
const WRITE = process.argv.includes('--write');
const DEDUPE = process.argv.includes('--dedupe');
const UNIQUE_ONLY = process.argv.includes('--unique-only');
const AUDIT_OUT = process.env.AGENT_PLUGIN_AUDIT || '/tmp/agent-plugin-audit.json';

const SEEDS = {
  software: `
    obra/superpowers addyosmani/agent-skills Jeffallan/claude-skills github/awesome-copilot
    anthropics/claude-code openai/codex google-gemini/gemini-cli continuedev/continue
    opencode-ai/opencode Kilo-Org/kilocode RooCodeInc/Roo-Code aaif-goose/goose
    plandex-ai/plandex OpenHands/OpenHands SWE-agent/SWE-agent humanlayer/humanlayer
    trailhq/Trail-Code jgravelle/jcodemunch-mcp oraios/serena DeusData/codebase-memory-mcp
    upstash/context7 github/github-mcp-server idosal/git-mcp ChromeDevTools/chrome-devtools-mcp
    microsoft/playwright-mcp executeautomation/mcp-playwright modelcontextprotocol/servers
    modelcontextprotocol/typescript-sdk PrefectHQ/fastmcp containers/kubernetes-mcp-server
    skyhook-io/radar grafana/mcp-grafana openstatusHQ/openstatus TykTechnologies/tyk
    tadata-org/fastapi_mcp InsForge/InsForge supabase/mcp laravel/boost
    Jpisnice/shadcn-ui-mcp-server nextlevelbuilder/ui-ux-pro-max-skill
    thedaviddias/Front-End-Checklist daytonaio/daytona e2b-dev/E2B dapr/dapr
    Effect-TS/effect affaan-m/ECC anthropics/claude-plugins-official wshobson/agents
    davila7/claude-code-templates VoltAgent/awesome-claude-code-subagents stablyai/orca
    superset-sh/superset github/spec-kit Pimzino/spec-workflow-mcp
    eyaltoledano/claude-task-master BloopAI/vibe-kanban kestra-io/kestra
    triggerdotdev/trigger.dev n8n-io/n8n activepieces/activepieces PrefectHQ/prefect
    bytebase/dbhub benborla/mcp-server-mysql googleapis/mcp-toolbox mobile-next/mobile-mcp
    CursorTouch/Windows-MCP wonderwhy-er/DesktopCommanderMCP CodeGraphContext/CodeGraphContext
    xerj-org/xerj redhat-et/ripwire phuryn/pm-skills docmost/docmost
  `,
  data: `
    infiniflow/ragflow Tencent/WeKnora eosphoros-ai/DB-GPT langgenius/dify
    FlowiseAI/Flowise run-llama/llama_index milvus-io/milvus langchain-ai/langgraph
    HKUDS/LightRAG microsoft/graphrag getzep/graphiti vanna-ai/vanna Canner/WrenAI
    dataelement/bisheng open-metadata/OpenMetadata apache/doris StarTrail-org/LEANN
    RyanCodrai/turbovec activeloopai/deeplake chroma-core/chroma zilliztech/claude-context
    googleapis/mcp-toolbox bytebase/dbhub benborla/mcp-server-mysql
    cocoindex-io/cocoindex pathwaycom/serviette VectifyAI/PageIndex PrefectHQ/prefect
    mlflow/mlflow langfuse/langfuse comet-ml/opik promptfoo/promptfoo kestra-io/kestra
    rocketride-org/rocketride-server ConardLi/easy-dataset StarTrail-org/PixelRAG
    Future-House/paper-qa xberg-io/xberg neuml/txtai Graphify-Labs/graphify
    onyx-dot-app/onyx docsGPT? no
  `,
  security: `
    NVIDIA/SkillSpector cloudflare/security-audit-skill mukul975/Anthropic-Cybersecurity-Skills
    zhaoxuya520/reverse-skill 0x4m4/hexstrike-ai vxcontrol/pentagi LaurieWired/GhidraMCP
    bethington/ghidra-mcp mrexodia/ida-pro-mcp duty1g/x64dbg-mcp-server morluto/rea
    Infisical/infisical SigNoz/signoz cilium/cilium kubeshark/kubeshark
    openobserve/openobserve netdata/netdata Tracer-Cloud/opensre promptfoo/promptfoo
    ccfos/nightingale jaegertracing/jaeger apache/skywalking openzipkin/zipkin
    thanos-io/thanos VictoriaMetrics/VictoriaMetrics kubesphere/kubesphere gojue/ecapture
    affaan-m/ECC CloakHQ/CloakBrowser NopeCHALLC/nopecha-extension TykTechnologies/tyk
    openstatusHQ/openstatus open-metadata/OpenMetadata dolthub/dolt
  `,
  ethics: `
    NVIDIA/SkillSpector promptfoo/promptfoo anthropics/claude-for-legal
    open-metadata/OpenMetadata mukul975/Anthropic-Cybersecurity-Skills
    cloudflare/security-audit-skill docmost/docmost Infisical/infisical dolthub/dolt
    Tencent/WeKnora infiniflow/ragflow open-webui/open-webui LibreChat-AI/LibreChat
    tw93/Kami blader/humanizer anthropics/skills
  `,
  sales_marketing: `
    coreyhaines31/marketingskills AgriciDaniel/claude-ads AgriciDaniel/claude-seo
    zubair-trabzada/geo-seo-claude Ryze-AI-Adgent/open-seo-mcp-skills
    irinabuht12-oss/google-ads-meta-ads-mcp dreammis/social-auto-upload
    stickerdaniel/linkedin-mcp-server xpzouying/xiaohongshu-mcp
    Evil0ctal/Douyin_TikTok_Download_API JoeanAmier/XHS-Downloader sansan0/TrendRadar
    666ghj/BettaFish koala73/worldmonitor enescingoz/awesome-n8n-templates
    apify/apify-mcp-server Panniantong/Agent-Reach mvanhorn/last30days-skill
    ConardLi/garden-skills
  `,
  customer: `
    emcie-co/parlant langbot-app/LangBot AstrBotDevs/AstrBot nanocoai/nanoclaw
    holaboss-ai/holaOS docmost/docmost arc53/DocsGPT Cinnamon/kotaemon khoj-ai/khoj
    Tencent/WeKnora open-webui/open-webui LibreChat-AI/LibreChat CherryHQ/cherry-studio
    lobehub/lobehub rowboatlabs/rowboat TencentCloud/Octop enescingoz/awesome-n8n-templates
    activepieces/activepieces n8n-io/n8n FlowiseAI/Flowise simstudioai/sim
    coze-dev/coze-studio labring/FastGPT 1Panel-dev/MaxKB langgenius/dify
    infiniflow/ragflow onyx-dot-app/onyx lharries/whatsapp-mcp
  `,
  legal: `
    anthropics/claude-for-legal open-metadata/OpenMetadata docmost/docmost dolthub/dolt
    PaddlePaddle/PaddleOCR opendataloader-project/opendataloader-pdf xberg-io/xberg
    zcaceres/markdownify-mcp arc53/DocsGPT Cinnamon/kotaemon infiniflow/ragflow
    Tencent/WeKnora NVIDIA/SkillSpector cloudflare/security-audit-skill
    mukul975/Anthropic-Cybersecurity-Skills promptfoo/promptfoo Infisical/infisical
    openobserve/openobserve SigNoz/signoz enescingoz/awesome-n8n-templates
    activepieces/activepieces n8n-io/n8n tw93/Kami blader/humanizer
    ComposioHQ/awesome-claude-skills alirezarezvani/claude-skills anthropics/skills
  `,
  hr: `
    career-ops-hq/career-ops ai-job-search-dev/ai-job-search reactive-resume/reactive-resume
    docmost/docmost khoj-ai/khoj Tencent/WeKnora infiniflow/ragflow open-webui/open-webui
    LibreChat-AI/LibreChat CherryHQ/cherry-studio lobehub/lobehub
    enescingoz/awesome-n8n-templates activepieces/activepieces n8n-io/n8n simstudioai/sim
    labring/FastGPT 1Panel-dev/MaxKB PaddlePaddle/PaddleOCR zcaceres/markdownify-mcp
    tw93/Kami blader/humanizer anthropics/skills ComposioHQ/awesome-claude-skills
    alirezarezvani/claude-skills langgenius/dify FlowiseAI/Flowise rowboatlabs/rowboat
    TencentCloud/Octop
  `,
  finance: `
    financial-datasets/mcp-server Fincept-Corporation/FinceptTerminal vanna-ai/vanna
    Canner/WrenAI eosphoros-ai/DB-GPT open-metadata/OpenMetadata dolthub/dolt
    docmost/docmost infiniflow/ragflow Tencent/WeKnora enescingoz/awesome-n8n-templates
    activepieces/activepieces n8n-io/n8n kestra-io/kestra PrefectHQ/prefect
    mlflow/mlflow langfuse/langfuse openstatusHQ/openstatus Infisical/infisical
    anthropics/claude-for-legal tw93/Kami anthropics/skills
  `,
  product: `
    phuryn/pm-skills github/spec-kit Pimzino/spec-workflow-mcp eyaltoledano/claude-task-master
    BloopAI/vibe-kanban mcp-use/mcp-use ag-ui-protocol/ag-ui simstudioai/sim
    FlowiseAI/Flowise n8n-io/n8n activepieces/activepieces obra/superpowers
    Panniantong/Agent-Reach dzhng/deep-research assafelovic/gpt-researcher
    Alibaba-NLP/DeepResearch mvanhorn/last30days-skill kestra-io/kestra docmost/docmost
  `,
  it_ops: `
    netdata/netdata SigNoz/signoz openobserve/openobserve VictoriaMetrics/VictoriaMetrics
    grafana/pyroscope grafana/mcp-grafana openstatusHQ/openstatus ccfos/nightingale
    hyperdxio/hyperdx highlight/highlight jaegertracing/jaeger openzipkin/zipkin
    apache/skywalking thanos-io/thanos kubeshark/kubeshark kubesphere/kubesphere
    containers/kubernetes-mcp-server skyhook-io/radar cilium/cilium 0xJacky/nginx-ui
    TykTechnologies/tyk Infisical/infisical mikeroyal/Self-Hosting-Guide
    pranshuparmar/witr vectordotdev/vector Tracer-Cloud/opensre awslabs/mcp microsoft/mcp
    taylorwilsdon/google_workspace_mcp googleworkspace/cli kestra-io/kestra n8n-io/n8n
    activepieces/activepieces docmost/docmost rowboatlabs/rowboat daytonaio/daytona
    e2b-dev/E2B dapr/dapr InsForge/InsForge supabase/mcp bytebase/dbhub
    googleapis/mcp-toolbox modelcontextprotocol/servers wonderwhy-er/DesktopCommanderMCP
    mobile-next/mobile-mcp CursorTouch/Windows-MCP bytebot-ai/bytebot
  `,
  ai: `
    anthropics/skills obra/superpowers promptfoo/promptfoo langfuse/langfuse
    mlflow/mlflow comet-ml/opik mem0ai/mem0 letta-ai/letta topoteretes/cognee
    memvid/memvid MemoriLabs/Memori NevaMind-AI/memU EverMind-AI/EverOS
    vectorize-io/hindsight thedotmack/claude-mem TencentCloud/TencentDB-Agent-Memory
    Graphify-Labs/graphify infiniflow/ragflow microsoft/graphrag getzep/graphiti
    HKUDS/LightRAG langchain-ai/langgraph run-llama/llama_index
    dair-ai/Prompt-Engineering-Guide humanlayer/12-factor-agents FoundationAgents/MetaGPT
    microsoft/autogen crewAIInc/crewAI agno-agi/agno google/adk-python
    pydantic/pydantic-ai openai/openai-agents-python langchain-ai/langchain
    NVIDIA/SkillSpector headroomlabs-ai/headroom mksglu/context-mode NVIDIA/NemoClaw
    aden-hive/hive ruvnet/ruflo agentscope-ai/agentscope deepseek-ai/deepseek-harness
    HKUDS/AutoAgent MervinPraison/PraisonAI elizaOS/eliza agent0ai/agent-zero
  `,
  business: `
    phuryn/pm-skills coreyhaines31/marketingskills anthropics/knowledge-work-plugins
    anthropics/skills docmost/docmost n8n-io/n8n activepieces/activepieces
    kestra-io/kestra FlowiseAI/Flowise simstudioai/sim open-webui/open-webui
    LibreChat-AI/LibreChat lobehub/lobehub xbtlin/ai-berkshire
    Fincept-Corporation/FinceptTerminal TauricResearch/TradingAgents HKUDS/Vibe-Trading
    OpenByteInc/QuantDinger hummingbot/hummingbot atilaahmettaner/tradingview-mcp
    Panniantong/Agent-Reach mvanhorn/last30days-skill sansan0/TrendRadar 666ghj/BettaFish
    koala73/worldmonitor tw93/Kami blader/humanizer enescingoz/awesome-n8n-templates
    rowboatlabs/rowboat TencentCloud/Octop
  `,
  design_content: `
    nextlevelbuilder/ui-ux-pro-max-skill nexu-io/open-design Leonxlnx/taste-skill
    blader/humanizer op7418/Humanizer-zh tw93/Kami op7418/guizang-ppt-skill
    cathrynlavery/diagram-design tt-a1i/archify Agents365-ai/drawio-skill
    DayuanJiang/next-ai-draw-io Manavarya09/design-extract GLips/Figma-Context-MCP
    Jpisnice/shadcn-ui-mcp-server nexu-io/html-anything ConardLi/garden-skills
    latent-spaces/brag hypit-ai/hypit Vincentwei1021/video-shotcraft
    krillinai/OpenCreator HBAI-Ltd/Toonflow-app calesthio/OpenMontage waooAI/waoowaoo
    ahujasid/mcp-for-blender neka-nat/freecad-mcp pascalorg/editor img2threejs/img2threejs
    earthtojake/text-to-cad samuelgursky/davinci-resolve-mcp jub0t/Concat
    2noise/ChatTTS modelscope/FunASR PaddlePaddle/PaddleOCR
    opendataloader-project/opendataloader-pdf zcaceres/markdownify-mcp xberg-io/xberg
    docmost/docmost
  `,
  education: `
    HKUDS/DeepTutor shareAI-lab/learn-claude-code
    The-Pocket/PocketFlow-Tutorial-Codebase-Knowledge EKKOLearnAI/ekko-studio
    harvard-edge/cs249r_book patchy631/ai-engineering-hub
    NirDiamant/RAG_Techniques NirDiamant/GenAI_Agents
    NirDiamant/agents-towards-production anthropics/skills
    docmost/docmost n8n-io/n8n blader/humanizer
  `,
  healthcare: `
    K-Dense-AI/scientific-agent-skills Imbad0202/academic-research-skills
    Future-House/paper-qa PaddlePaddle/PaddleOCR
    opendataloader-project/opendataloader-pdf xberg-io/xberg
    infiniflow/ragflow Tencent/WeKnora docmost/docmost
    anthropics/claude-for-legal Infisical/infisical open-metadata/OpenMetadata
  `,
  research: `
    Imbad0202/academic-research-skills K-Dense-AI/scientific-agent-skills
    Future-House/paper-qa assafelovic/gpt-researcher dzhng/deep-research
    Alibaba-NLP/DeepResearch microsoft/graphrag infiniflow/ragflow
    docmost/docmost anthropics/skills Graphify-Labs/graphify
    StarTrail-org/LEANN VectifyAI/PageIndex
  `,
  public_sector: `
    anthropics/claude-for-legal open-metadata/OpenMetadata docmost/docmost
    dolthub/dolt enescingoz/awesome-n8n-templates n8n-io/n8n
    activepieces/activepieces kestra-io/kestra tw93/Kami blader/humanizer
    infiniflow/ragflow Infisical/infisical phuryn/pm-skills
  `,
  operations: `
    phuryn/pm-skills open-metadata/OpenMetadata Canner/WrenAI vanna-ai/vanna
    dolthub/dolt docmost/docmost n8n-io/n8n kestra-io/kestra
    netdata/netdata openobserve/openobserve SigNoz/signoz
    containers/kubernetes-mcp-server infiniflow/ragflow
  `,
};

for (const [domain, raw] of Object.entries(SEEDS)) {
  SEEDS[domain] = raw.split(/\s+/).filter((repo) => repo && !repo.includes('?') && repo !== 'no');
}

const DOMAIN_FALLBACK = {
  software: ['obra/superpowers', 'github/github-mcp-server', 'upstash/context7', 'github/spec-kit', 'docmost/docmost', 'n8n-io/n8n'],
  data: ['infiniflow/ragflow', 'open-metadata/OpenMetadata', 'vanna-ai/vanna', 'langchain-ai/langgraph', 'n8n-io/n8n', 'docmost/docmost'],
  security: ['NVIDIA/SkillSpector', 'openobserve/openobserve', 'SigNoz/signoz', 'Infisical/infisical', 'promptfoo/promptfoo', 'containers/kubernetes-mcp-server'],
  ethics: ['NVIDIA/SkillSpector', 'anthropics/claude-for-legal', 'open-metadata/OpenMetadata', 'promptfoo/promptfoo', 'docmost/docmost', 'Infisical/infisical'],
  sales_marketing: ['coreyhaines31/marketingskills', 'AgriciDaniel/claude-seo', 'AgriciDaniel/claude-ads', 'apify/apify-mcp-server', 'n8n-io/n8n', 'docmost/docmost'],
  customer: ['emcie-co/parlant', 'Cinnamon/kotaemon', 'khoj-ai/khoj', 'docmost/docmost', 'n8n-io/n8n', 'langbot-app/LangBot'],
  legal: ['anthropics/claude-for-legal', 'open-metadata/OpenMetadata', 'docmost/docmost', 'dolthub/dolt', 'Infisical/infisical', 'n8n-io/n8n'],
  hr: ['career-ops-hq/career-ops', 'reactive-resume/reactive-resume', 'docmost/docmost', 'khoj-ai/khoj', 'n8n-io/n8n', 'blader/humanizer'],
  finance: ['financial-datasets/mcp-server', 'vanna-ai/vanna', 'Canner/WrenAI', 'open-metadata/OpenMetadata', 'dolthub/dolt', 'docmost/docmost'],
  product: ['phuryn/pm-skills', 'github/spec-kit', 'BloopAI/vibe-kanban', 'GLips/Figma-Context-MCP', 'docmost/docmost', 'n8n-io/n8n'],
  it_ops: ['netdata/netdata', 'SigNoz/signoz', 'openobserve/openobserve', 'containers/kubernetes-mcp-server', 'Infisical/infisical', 'docmost/docmost'],
  ai: ['anthropics/skills', 'obra/superpowers', 'langfuse/langfuse', 'promptfoo/promptfoo', 'infiniflow/ragflow', 'microsoft/autogen'],
  business: ['phuryn/pm-skills', 'coreyhaines31/marketingskills', 'docmost/docmost', 'n8n-io/n8n', 'kestra-io/kestra', 'Panniantong/Agent-Reach'],
  design_content: ['nextlevelbuilder/ui-ux-pro-max-skill', 'blader/humanizer', 'tw93/Kami', 'GLips/Figma-Context-MCP', 'cathrynlavery/diagram-design', 'docmost/docmost'],
  education: ['HKUDS/DeepTutor', 'shareAI-lab/learn-claude-code', 'NirDiamant/GenAI_Agents', 'anthropics/skills', 'docmost/docmost', 'n8n-io/n8n'],
  healthcare: ['K-Dense-AI/scientific-agent-skills', 'Future-House/paper-qa', 'infiniflow/ragflow', 'docmost/docmost', 'anthropics/claude-for-legal', 'Infisical/infisical'],
  research: ['Imbad0202/academic-research-skills', 'Future-House/paper-qa', 'assafelovic/gpt-researcher', 'microsoft/graphrag', 'infiniflow/ragflow', 'docmost/docmost'],
  public_sector: ['anthropics/claude-for-legal', 'open-metadata/OpenMetadata', 'docmost/docmost', 'dolthub/dolt', 'n8n-io/n8n', 'phuryn/pm-skills'],
  operations: ['netdata/netdata', 'openobserve/openobserve', 'SigNoz/signoz', 'containers/kubernetes-mcp-server', 'docmost/docmost', 'n8n-io/n8n'],
};

const UNIVERSAL_FALLBACK = ['n8n-io/n8n', 'docmost/docmost', 'anthropics/skills', 'obra/superpowers'];

const CATEGORY_DOMAIN = {
  'Software Development': 'software',
  'Engineering Leadership': 'software',
  'People & Talent': 'hr',
  'Finance & Accounting': 'finance',
  'Sales & Marketing': 'sales_marketing',
  'Growth & Analytics': 'sales_marketing',
  'Customer Experience': 'customer',
  'Customer Success': 'customer',
  'Legal & Compliance': 'legal',
  'Data & Analytics': 'data',
  'Data Governance': 'data',
  'Security & SecOps': 'security',
  'Platform Security': 'security',
  'Product & Project Management': 'product',
  'Product Operations': 'product',
  'IT & Operations': 'it_ops',
  'AI & Machine Learning': 'ai',
  'Business Strategy & Operations': 'business',
  'Revenue Operations': 'sales_marketing',
  'Corporate Communications': 'design_content',
  'Design & UX': 'design_content',
  'Content, Media & Creative': 'design_content',
  'Education & Learning': 'education',
  'Healthcare & Life Sciences': 'healthcare',
  'E-commerce & Retail': 'sales_marketing',
  'Manufacturing & Supply Chain': 'business',
  'Research & Academia': 'research',
  'Public Sector & Nonprofit': 'public_sector',
};

const DOMAIN_KEYWORDS = {
  software: 'code coding developer programming git github review refactor test debug build deploy devops ci cd kubernetes docker infra api sdk typescript python rust browser playwright cli terminal ide editor monorepo release',
  data: 'data sql database warehouse analytics etl pipeline bi dashboard metric rag vector embedding dataset ml model experiment notebook knowledge graph index search',
  security: 'security vulnerability pentest exploit malware threat cve audit compliance privacy secret identity auth forensics reverse soc siem incident firewall',
  ethics: 'ethics ethical responsible governance safety bias fairness transparency compliance policy regulation',
  sales_marketing: 'seo marketing ads advertising social content brand growth campaign email copy lead crm sales linkedin twitter instagram tiktok youtube video influencer conversion funnel',
  customer: 'customer support crm helpdesk ticketing chat chatwoot zendesk intercom whatsapp discord telegram community success onboarding feedback survey',
  legal: 'legal law contract compliance privacy gdpr policy regulation governance audit ip patent terms nda',
  hr: 'hr people recruit hiring job resume candidate onboarding offboarding payroll benefits performance culture employee talent interview career',
  finance: 'finance financial accounting invoice expense budget forecast treasury tax audit revenue billing payroll ledger close fp a procurement vendor spend',
  product: 'product project roadmap spec prd task kanban sprint agile backlog research ux design figma prototype feature',
  it_ops: 'it ops helpdesk endpoint device network infrastructure monitoring observability logging incident on call cloud server kubernetes docker vm backup zabbix prometheus grafana pagerduty',
  ai: 'ai agent llm prompt model rag memory mcp embedding vector fine tune eval inference multimodal vision speech tts image diffusion',
  design_content: 'design ui ux figma image video animation 3d cad blender draw diagram ppt slide document pdf ocr writing copy content thumbnail logo brand',
  education: 'education learning teach teaching tutor course curriculum student school lesson assessment lms pedagogy training classroom academic',
  healthcare: 'health healthcare medical clinical patient hospital pharma biotech genomics hipaa fhir ehr trial diagnosis treatment lab radiology',
  research: 'research academic paper scholar arxiv science scientific experiment study journal university thesis citation peer review grant',
  public_sector: 'public government civic nonprofit ngo policy grant constituent municipal legislation regulation transparency volunteer donor',
  operations: 'manufacturing supply chain logistics warehouse inventory procurement supplier production plant factory erp maintenance quality safety',
  business: 'business strategy operations consulting finance market research competitor analysis planning kpi okr process automation workflow crm erp project revenue growth partnership procurement',
};

const STOP = new Set('the a an and or for with without from into onto of to in on at by is are be as it its this that these those your you our we they their using use used via per across about over under more most less least very can will should could would may might must not no all any each other such than then when where which who whom whose what why how also just only own same so some'.split(' '));

const tokenize = (input) =>
  String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP.has(token) && !/^\d+$/.test(token));

const ngrams = (input) => {
  const unigrams = tokenize(input);
  const grams = [...unigrams];
  for (let i = 0; i < unigrams.length - 1; i++) grams.push(`${unigrams[i]} ${unigrams[i + 1]}`);
  return grams;
};

function extractSpecs(fileText) {
  const start = fileText.indexOf('const AGENT_SPECS: AgentSpec[] = [');
  const end = fileText.indexOf('\n];\n\nexport const ENTERPRISE_AGENT_TEMPLATES', start);
  if (start < 0 || end < 0) throw new Error('Could not locate AGENT_SPECS block');
  const lines = fileText.slice(start, end).split('\n');
  const specs = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim().replace(/,$/, '');
    if (!trimmed.startsWith('{')) continue;
    specs.push({ lineIndex: i, line, spec: JSON.parse(trimmed) });
  }
  return { start, end, lines, specs };
}

function isGenerated(spec) {
  return (
    /^[a-z]+-\d+$/.test(spec.id) ||
    / \d+$/.test(spec.name) ||
    /\b[A-Z]{2,}\d+$/.test(spec.name)
  );
}

function domainFor(spec) {
  const text = `${spec.name} ${spec.subcategory || ''} ${spec.specialty || ''}`;
  if (/ai ethics|responsible ai|ethical ai|ai governance|algorithmic fairness|model risk/i.test(text)) return 'ethics';
  return CATEGORY_DOMAIN[spec.category] || 'business';
}

// Some specialties legitimately draw tools from a second pool. Merging the
// pools (rather than dumping leftovers) keeps design/content plugins with the
// marketing and product agents that actually use them.
const SECONDARY_DOMAIN_RULES = [
  {
    primary: 'sales_marketing',
    secondary: 'design_content',
    match: /brand|content|creative|copy|social|video|design|growth|seo|ads|advertis|campaign|influencer|communications/i,
  },
  {
    primary: 'sales_marketing',
    secondary: 'customer',
    match: /retail|e-commerce|shopper|loyalty|retention|returns|customer experience|support|review|service/i,
  },
  {
    primary: 'design_content',
    secondary: 'sales_marketing',
    match: /seo|social|marketing|campaign|growth|newsletter|creator|influencer|brand|content strategy/i,
  },
  {
    primary: 'education',
    secondary: 'design_content',
    match: /course|curriculum|content|video|presentation|learning experience|instructional/i,
  },
  {
    primary: 'healthcare',
    secondary: 'legal',
    match: /privacy|hipaa|regulatory|compliance|quality|ethics/i,
  },
  {
    primary: 'research',
    secondary: 'data',
    match: /analysis|data|statistic|quantitative|software|pipeline|reproducib/i,
  },
  {
    primary: 'public_sector',
    secondary: 'legal',
    match: /policy|legislation|regulation|transparency|compliance|grant|benefits/i,
  },
  {
    primary: 'operations',
    secondary: 'data',
    match: /data|analytics|forecast|inventory|planning|erp|telemetry/i,
  },
  {
    primary: 'product',
    secondary: 'design_content',
    match: /design|ux|user research|research|prototype|figma|discovery/i,
  },
  {
    primary: 'business',
    secondary: 'design_content',
    match: /brand|content|communications|marketing|creative|design/i,
  },
  {
    primary: 'business',
    secondary: 'operations',
    match: /manufactur|production|plant|warehouse|maintenance|iot|automation|quality|safety|supply chain|inventory|procurement|logistics/i,
  },
  {
    primary: 'data',
    secondary: 'ai',
    match: /ai|ml|machine learning|llm|model|rag|vector|embedding|agent/i,
  },
  {
    primary: 'software',
    secondary: 'ai',
    match: /ai|ml|machine learning|llm|model|rag|embedding|agent/i,
  },
  {
    primary: 'it_ops',
    secondary: 'finance',
    match: /finance|vendor|spend|budget|license|procurement|cost|contract/i,
  },
  {
    primary: 'it_ops',
    secondary: 'security',
    match: /endpoint|device|patch|encryption|fleet|mdm|vulnerab|siem|identity/i,
  },
  {
    primary: 'customer',
    secondary: 'sales_marketing',
    match: /churn|renewal|upsell|expansion|advocacy|community|marketing|announcement|growth/i,
  },
  {
    primary: 'customer',
    secondary: 'product',
    match: /feedback|feature request|bug|roadmap|voice of customer|research/i,
  },
  {
    primary: 'hr',
    secondary: 'finance',
    match: /payroll|benefits|compensation|total rewards/i,
  },
];

function domainsFor(spec) {
  const primary = domainFor(spec);
  const text = `${spec.name} ${spec.subcategory || ''} ${spec.specialty || ''} ${(spec.tags || []).join(' ')}`;
  const domains = [primary];
  for (const rule of SECONDARY_DOMAIN_RULES) {
    if (primary === rule.primary && rule.match.test(text)) domains.push(rule.secondary);
  }
  return [...new Set(domains)];
}

function mergePools(domains, pools) {
  const seen = new Set();
  const merged = [];
  for (const domain of domains) {
    for (const entry of pools[domain] || []) {
      const key = entry.plugin.repo.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(entry);
    }
  }
  return merged;
}

function loadPlugins() {
  const plugins = JSON.parse(fs.readFileSync(PLUGIN_FILE, 'utf8'));
  const byRepo = new Map(plugins.map((plugin) => [plugin.repo.toLowerCase(), plugin]));

  const seedDomains = new Map();
  const missingSeeds = [];
  for (const [domain, repos] of Object.entries(SEEDS)) {
    for (const repo of repos) {
      const key = repo.toLowerCase();
      if (!byRepo.has(key)) {
        missingSeeds.push(`${domain}:${repo}`);
        continue;
      }
      if (!seedDomains.has(key)) seedDomains.set(key, new Set());
      seedDomains.get(key).add(domain);
    }
  }

  const keywords = Object.fromEntries(
    Object.entries(DOMAIN_KEYWORDS).map(([domain, words]) => [domain, new Set(words.split(/\s+/))]),
  );

  for (const plugin of plugins) {
    const key = plugin.repo.toLowerCase();
    if (!seedDomains.has(key)) {
      const text = tokenize(`${plugin.repo} ${plugin.category || ''} ${plugin.description || ''} ${Array.isArray(plugin.usage) ? plugin.usage.join(' ') : plugin.usage || ''}`);
      const hits = [];
      for (const [domain, words] of Object.entries(keywords)) {
        if (text.some((token) => words.has(token))) hits.push(domain);
      }
      seedDomains.set(key, new Set(hits.length ? hits : ['business']));
    }
  }

  const doc = new Map();
  for (const plugin of plugins) {
    const weights = new Map();
    const add = (input, weight) => {
      for (const gram of ngrams(input)) {
        if (!weights.has(gram) || weights.get(gram) < weight) weights.set(gram, weight);
      }
    };
    add(plugin.repo.replace(/[/_-]/g, ' '), 3);
    add(plugin.description, 1);
    add(Array.isArray(plugin.usage) ? plugin.usage.join(' ') : plugin.usage, 2);
    add(plugin.category, 1.5);
    const norm = Math.sqrt([...weights.values()].reduce((sum, value) => sum + value * value, 0)) || 1;
    doc.set(plugin.repo.toLowerCase(), { plugin, weights, norm });
  }

  const df = new Map();
  for (const { weights } of doc.values()) for (const token of weights.keys()) df.set(token, (df.get(token) || 0) + 1);
  const idf = new Map();
  for (const [token, frequency] of df) idf.set(token, Math.log((plugins.length + 1) / (frequency + 1)) + 1);

  const pools = {};
  const fallback = {};
  for (const domain of Object.keys(SEEDS)) {
    const fallbackRepos = (DOMAIN_FALLBACK[domain] || [])
      .map((repo) => repo.toLowerCase())
      .filter((repo) => byRepo.has(repo));
    const repos = [...new Set([...(SEEDS[domain] || []).map((repo) => repo.toLowerCase()), ...fallbackRepos])]
      .filter((repo) => byRepo.has(repo));
    pools[domain] = repos.map((repo) => doc.get(repo));
    fallback[domain] = fallbackRepos.map((repo) => byRepo.get(repo).repo);
  }

  return { plugins, byRepo, doc, idf, seedDomains, pools, fallback, missingSeeds };
}

function profileFor(spec) {
  const weights = new Map();
  const add = (input, weight) => {
    if (!input) return;
    for (const gram of ngrams(input)) {
      if (!weights.has(gram) || weights.get(gram) < weight) weights.set(gram, weight);
    }
  };
  add(spec.name, 5);
  add(spec.subcategory, 5);
  add(spec.specialty, 7);
  add(spec.role, 3);
  add((spec.tags || []).join(' '), 4);
  add(spec.description, 2);
  add((spec.duties || []).join(' '), 1);
  const norm = Math.sqrt([...weights.values()].reduce((sum, value) => sum + value * value, 0)) || 1;
  return { weights, norm };
}

function score(profile, doc, idf) {
  let total = 0;
  for (const [token, agentWeight] of profile.weights) {
    const pluginWeight = doc.weights.get(token);
    if (pluginWeight) total += agentWeight * pluginWeight * (idf.get(token) || 1);
  }
  return total / (profile.norm * doc.norm);
}

function selectPlugins(spec, data) {
  const domains = domainsFor(spec);
  const domain = domains[0];
  const profile = profileFor(spec);
  const rank = (pool, threshold) =>
    pool
      .map((entry) => ({ repo: entry.plugin.repo, score: score(profile, entry, data.idf) }))
      .filter((hit) => hit.score > threshold);

  const primary = rank(data.pools[domain] || data.pools.business, 0.02).sort((a, b) => b.score - a.score);
  const secondary = rank(mergePools(domains.slice(1), data.pools), 0.06).sort((a, b) => b.score - a.score);

  const selected = [];
  const seen = new Set();
  const add = (repo, scoreValue) => {
    const key = repo.toLowerCase();
    if (seen.has(key) || selected.length >= 6) return;
    seen.add(key);
    selected.push({ repo, score: scoreValue ?? 0 });
  };

  // Domain fit comes first. Secondary-domain matches only fill remaining slots,
  // so a relevant education or healthcare seed is never crowded out by a
  // generic design or marketing repo with a slightly higher lexical score.
  for (const hit of primary) {
    const plugin = data.byRepo.get(hit.repo.toLowerCase());
    add(plugin?.repo || hit.repo, hit.score);
  }
  for (const hit of secondary) {
    const plugin = data.byRepo.get(hit.repo.toLowerCase());
    add(plugin?.repo || hit.repo, hit.score);
  }

  // Prefer neutral tools from the agent's own domain before falling back to
  // cross-domain utilities.
  for (const repo of data.fallback[domain] || []) {
    if (selected.length >= 2) break;
    const plugin = data.byRepo.get(repo.toLowerCase());
    if (plugin) add(plugin.repo, 0);
  }
  for (const repo of UNIVERSAL_FALLBACK) {
    if (selected.length >= 2) break;
    const plugin = data.byRepo.get(repo.toLowerCase());
    if (plugin) add(plugin.repo, 0);
  }

  return { domain, domains, selected };
}

function main() {
  const fileText = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  const { lines, specs } = extractSpecs(fileText);
  const data = loadPlugins();

  if (data.missingSeeds.length) {
    console.warn(`Ignoring ${data.missingSeeds.length} seeds not in catalog:`);
    console.warn(data.missingSeeds.slice(0, 20).join('\n'));
  }

  const generatedEntries = new Set(specs.filter((entry) => isGenerated(entry.spec)).map((entry) => entry.spec.id));
  let workingSpecs = specs;
  if (UNIQUE_ONLY) {
    workingSpecs = specs.filter((entry) => !generatedEntries.has(entry.spec.id));
  }

  const duplicateNames = new Map();
  for (const entry of workingSpecs) {
    const key = entry.spec.name;
    if (!duplicateNames.has(key)) duplicateNames.set(key, []);
    duplicateNames.get(key).push(entry);
  }
  const duplicateEntries = new Set();
  for (const entries of duplicateNames.values()) {
    if (entries.length > 1) for (const entry of entries.slice(1)) duplicateEntries.add(entry.spec.id);
  }
  if (DEDUPE && !UNIQUE_ONLY) {
    workingSpecs = workingSpecs.filter((entry) => !duplicateEntries.has(entry.spec.id));
  }
  const removedEntries = new Set(
    specs.filter((entry) => !workingSpecs.some((kept) => kept.spec.id === entry.spec.id)).map((entry) => entry.spec.id),
  );

  const assignments = new Map(); // plugin repo -> Set(agent ids)
  const agentPlugins = new Map();
  const domainCounts = {};

  for (const entry of workingSpecs) {
    const { domain, domains, selected } = selectPlugins(entry.spec, data);
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    const repos = selected.map((hit) => hit.repo);
    agentPlugins.set(entry.spec.id, { entry, domain, domains, selected, repos });
    for (const repo of repos) {
      const key = repo.toLowerCase();
      if (!assignments.has(key)) assignments.set(key, new Set());
      assignments.get(key).add(entry.spec.id);
    }
  }

  const profiles = new Map(specs.map((entry) => [entry.spec.id, profileFor(entry.spec)]));
  const uniqueAgents = workingSpecs;

  // Report what stayed unused, but never force a plugin onto an agent that
  // does not match it. The previous "coverage pass" filled empty slots with
  // unrelated tools, which made the library look generated and noisy.
  const unused = data.plugins.filter((plugin) => !assignments.has(plugin.repo.toLowerCase()));
  const agentDomains = new Map(uniqueAgents.map((entry) => [entry.spec.id, domainsFor(entry.spec)]));
  const unusedDiagnostics = [];
  for (const plugin of unused) {
    const key = plugin.repo.toLowerCase();
    const doc = data.doc.get(key);
    const pluginDomains = new Set(data.seedDomains.get(key) || ['business']);
    const candidates = [];
    for (const entry of uniqueAgents) {
      const domains = agentDomains.get(entry.spec.id);
      if (!domains.some((domain) => pluginDomains.has(domain))) continue;
      candidates.push({ entry, score: score(profiles.get(entry.spec.id), doc, data.idf) });
    }
    candidates.sort((a, b) => b.score - a.score);
    unusedDiagnostics.push({
      repo: plugin.repo,
      domains: [...pluginDomains],
      best: candidates[0]
        ? { id: candidates[0].entry.spec.id, score: Number(candidates[0].score.toFixed(4)) }
        : null,
    });
  }

  for (const [, value] of agentPlugins) {
    value.repos = [...new Set(value.repos)];
    value.selected = value.selected.filter((hit) => value.repos.includes(hit.repo));
  }

  const usage = [...assignments.entries()].map(([repo, agents]) => ({ repo, count: agents.size }));
  usage.sort((a, b) => a.count - b.count);

  const audit = {
    generatedAt: new Date().toISOString(),
    agents: workingSpecs.length,
    parsedAgents: specs.length,
    removedAgents: removedEntries.size,
    plugins: data.plugins.length,
    domains: domainCounts,
    coverage: {
      usedPlugins: assignments.size,
      unusedPlugins: data.plugins.length - assignments.size,
      minUses: usage[0]?.count ?? 0,
      maxUses: usage.at(-1)?.count ?? 0,
      unusedRepos: data.plugins.filter((plugin) => !assignments.has(plugin.repo.toLowerCase()) || assignments.get(plugin.repo.toLowerCase()).size === 0).map((plugin) => plugin.repo),
      unusedCandidates: unusedDiagnostics
        .filter((diagnostic) => !assignments.has(diagnostic.repo.toLowerCase()))
        .sort((a, b) => (b.best?.score ?? 0) - (a.best?.score ?? 0)),
      leastUsed: usage.slice(0, 20),
      mostUsed: usage.slice(-20).reverse(),
    },
    duplicateNames: [...duplicateNames.entries()].filter(([, entries]) => entries.length > 1).length,
    duplicateRows: duplicateEntries.size,
    generatedRows: generatedEntries.size,
    sampleAgents: [...agentPlugins.values()].map(({ entry, domain, domains, selected }) => ({
      id: entry.spec.id,
      name: entry.spec.name,
      category: entry.spec.category,
      specialty: entry.spec.specialty,
      domain,
      domains,
      plugins: selected.map((hit) => ({ repo: hit.repo, score: Number(hit.score.toFixed(3)) })),
    })),
  };

  fs.writeFileSync(AUDIT_OUT, JSON.stringify(audit, null, 2));
  console.log(`Parsed ${specs.length} agents; keeping ${workingSpecs.length} (${removedEntries.size} removed) and ${data.plugins.length} plugins`);
  console.log('Domain counts:', domainCounts);
  console.log(`Plugin coverage: ${assignments.size}/${data.plugins.length} used; min ${audit.coverage.minUses}, max ${audit.coverage.maxUses}`);
  if (audit.coverage.unusedPlugins) console.log('Unused:', audit.coverage.unusedPlugins);
  console.log('Duplicate names:', audit.duplicateNames, 'duplicate rows:', audit.duplicateRows);
  console.log('Audit:', AUDIT_OUT);
  for (const sample of audit.sampleAgents.slice(0, 12)) {
    console.log(`\n${sample.id} | ${sample.category} | ${sample.specialty || '-'} -> ${sample.domain}`);
    console.log(sample.plugins.map((hit) => `  ${hit.repo} (${hit.score})`).join('\n'));
  }

  if (WRITE) {
    const replacements = new Map();
    const lastLineIndex = workingSpecs.at(-1)?.lineIndex;
    for (const { entry, repos } of agentPlugins.values()) {
      const next = JSON.stringify({ ...entry.spec, skills: repos });
      replacements.set(entry.lineIndex, entry.lineIndex === lastLineIndex ? next : `${next},`);
    }
    const removedLineIndexes = new Set(
      specs.filter((entry) => removedEntries.has(entry.spec.id)).map((entry) => entry.lineIndex),
    );
    const nextLines = lines
      .map((line, index) => (removedLineIndexes.has(index) ? null : replacements.get(index) ?? line))
      .filter((line) => line !== null);
    const arrayStart = fileText.indexOf('const AGENT_SPECS: AgentSpec[] = [');
    const arrayEnd = fileText.indexOf('\n];\n\nexport const ENTERPRISE_AGENT_TEMPLATES');
    const nextText = fileText.slice(0, arrayStart) + nextLines.join('\n') + fileText.slice(arrayEnd);
    fs.writeFileSync(TEMPLATE_FILE, nextText);
    console.log(`Patched ${TEMPLATE_FILE}; wrote ${workingSpecs.length} agents`);
  }
}

main();
