#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_FILE = path.join(ROOT, 'assets/catalog/mcpai-all-explore.json');
const OUT_FILE = path.join(ROOT, 'server/features/mcp/mcp.stock.mcpai.ts');

if (!fs.existsSync(RAW_FILE)) {
  console.error('Missing raw catalog file at', RAW_FILE);
  process.exit(1);
}

const items = JSON.parse(fs.readFileSync(RAW_FILE, 'utf8'));

function classify(item) {
  const slug = (item.slug || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const rawDesc = (item.description || '').toLowerCase();

  // Extract explicit hint if present: "use N tools for <hint> straight from your AI agent"
  const hintMatch = rawDesc.match(/use \d+ tools for ([^.]+?) straight from/i);
  const hint = hintMatch ? hintMatch[1].trim() : '';

  // Clean boilerplate
  const desc = rawDesc
    .replace(/straight from your ai agent/g, '')
    .replace(/for your ai agent/g, '')
    .replace(/with your ai agent/g, '')
    .replace(/connect your \S+ account and use \d+ tools/g, '');
  const all = `${slug} ${name} ${desc} ${hint}`;

  const inSlugOrName = (...words) => words.some((w) => slug.includes(w) || name.includes(w));
  const inAll = (...words) => words.some((w) => all.includes(w));
  const hintIs = (...words) => words.some((w) => hint === w || hint.includes(w));

  // 1. Legal (lawsuits, court cases, CNJ, DJEN, Jusbrasil, lawyers, Ministério Público)
  if (
    hintIs('legal', 'law', 'compliance & legal') ||
    inSlugOrName('processo', 'tribunal', 'judicial', 'juridic', 'lawsuit', 'justica', 'stf', 'stj', 'tst', 'trf', 'tjsp', 'oab', 'datajud', 'djen', 'jurisprudencia', 'cndt', 'advocac', 'legal', 'litigation', 'audiencia', 'intimacao', 'precatorio', 'astrea', 'jus', 'inquerito', 'mandado', 'acordao', 'diario_justica', 'projudi', 'pje', 'esaj', 'eproc', 'calculo-pensao') ||
    slug.startsWith('mp_') || slug.startsWith('tjsp_') || slug.startsWith('trf_') || slug.startsWith('trt_') || slug.startsWith('tst_') || slug.startsWith('stf_') || slug.startsWith('stj_') ||
    inAll('pesquisa de jurisprudência', 'processos judiciais', 'tribunais brasileiros', 'diário de justiça', 'ações judiciais', 'peças jurídicas', 'inquérito civil', 'ministério público', 'cálculo de pensão')
  ) {
    return 'Legal';
  }

  // 2. Tax & compliance (Receita Federal, Sefaz, ECAC, CNPJ status, NF-e, certidões, tributário, fiscal, compliance, impostos)
  if (
    hintIs('taxes', 'tax', 'compliance', 'accounting') ||
    inSlugOrName('receita', 'tribut', 'imposto', 'fiscal', 'nfe', 'danfe', 'sintegra', 'certidao', 'compliance', 'simples_nacional', 'divida_ativa', 'pgfn', 'serasa', 'spc', 'sancoes', 'leniencia', 'ceis', 'cnep', 'cepim', 'cgu', 'tcu', 'tax', 'audit', 'esg', 'fatca', 'aml', 'kyc', 'darf', 'irpf', 'irpj', 'bacen', 'sefaz', 'ecac', 'dctf', 'iss', 'icms', 'cnd', 'dasn', 'defis', 'decore', 'fincen') ||
    slug.startsWith('sefaz_') || slug.startsWith('ecac_') || slug.startsWith('receita_') ||
    inAll('receita federal', 'situação cadastral', 'certidão negativa', 'dívida ativa', 'regularidade fiscal', 'nota fiscal', 'situação do cpf', 'sefaz', 'secretaria da fazenda', 'tributária', 'fincen', 'financial crimes')
  ) {
    return 'Tax & compliance';
  }

  // 3. Vehicles & traffic (DETRAN, Frotas, vehicles, traffic, plates, fines)
  if (
    hintIs('fleet management', 'transportation', 'automotive') ||
    inSlugOrName('detran', 'veiculo', 'veiculo_', 'veiculos', 'placa', 'frota', 'multa', 'ipva', 'cnh', 'renavam', 'traffic', 'vehicle', 'automotive', 'denatran', 'senatran', 'fipe', 'combustivel', 'pedagio', 'carfax', 'vin', 'radar', 'fleetio', 'tomtom') ||
    slug.startsWith('detran_') ||
    inAll('consulta de placa', 'dados do veículo', 'dados de veículos', 'multas de trânsito', 'veículos por proprietário', 'pontos na cnh', 'licenciamento', 'tabela fipe', 'fleet management')
  ) {
    return 'Vehicles & traffic';
  }

  // 4. Public data lookups (Registries, public records, notary, cartório, ARISP, ONR, IBGE, CEP, address lookups)
  if (
    inSlugOrName('cartorio', 'notary', 'protesto', 'cep', 'ibge', 'endereco', 'address', 'lookup', 'cadastro', 'brasilapi', 'registradores', 'matricula', 'arisp', 'onr', 'cenprot', 'sirc', 'sirene', 'geocoding', 'postcode', 'zipcode', 'capivara', 'beneficios_sociais', 'caf_') ||
    slug.startsWith('registradores_') || slug.startsWith('cartorio_') || slug.startsWith('onr_') ||
    inAll('dados cadastrais', 'consulta pública', 'certidão de nascimento', 'protestos em cartório', 'registro civil', 'localização por cep', 'matrícula de imóvel', 'arisp', 'social benefits', 'family farming registry')
  ) {
    return 'Public data lookups';
  }

  // 5. Government & tenders (Licitações, compras públicas, prefeituras, editais, diários governamentais)
  if (
    inSlugOrName('licitacao', 'licitacoes', 'comprasnet', 'pregao', 'edital', 'governo', 'government', 'tenders', 'dou', 'dou_', 'prefeitura', 'camara', 'senado', 'transparencia', 'portal_transparencia', 'diario_oficial', 'siafi', 'siconv', 'tse_') ||
    slug.startsWith('pref_') || slug.startsWith('dou_') || slug.startsWith('gov_') || slug.startsWith('tse_') ||
    inAll('licitações públicas', 'compras governamentais', 'diário oficial da união', 'pregão eletrônico', 'contratos públicos', 'prefeitura municipal', 'electoral court')
  ) {
    return 'Government & tenders';
  }

  // 6. Web Scraping & Search (Web search, scraping, crawlers, SERP, browser automation)
  if (
    hintIs('web scraping', 'search') ||
    inSlugOrName('scraping', 'scraper', 'crawler', 'spider', 'crawl', 'brave', 'tavily', 'firecrawl', 'puppeteer', 'playwright', 'apify', 'browserbase', 'scrapingbee', 'diffbot', 'serpapi', 'linkup', 'jina', 'brightdata', 'zenrows', 'oxylabs', 'duckduckgo', 'bing_search', 'google_search', 'web_search') ||
    inAll('web scraping', 'search engine', 'crawl websites', 'extract web data', 'browser automation', 'serp results')
  ) {
    return 'Web Scraping & Search';
  }

  // 7. Databases & Storage (Postgres, MySQL, MongoDB, Redis, Supabase, Pinecone, Qdrant, Chroma, SQL, NoSQL)
  if (
    hintIs('databases', 'database') ||
    inSlugOrName('database', 'postgres', 'postgresql', 'mysql', 'mariadb', 'mongodb', 'redis', 'supabase', 'sqlite', 'qdrant', 'pinecone', 'chroma', 'weaviate', 'milvus', 'snowflake', 'bigquery', 'dynamodb', 'couchbase', 'neon', 'planetscale', 'cockroachdb', 'meilisearch', 'elasticsearch', 'opensearch', 'clickhouse', 'timescale', 'faiss', 'surrealdb', 'fauna', 'prisma', 'drizzle', 'nocodb') ||
    inAll('sql database', 'vector database', 'relational database', 'nosql store', 'database queries', 'table schemas', 'vector search', 'key-value store')
  ) {
    return 'Databases & Storage';
  }

  // 8. DevOps & Cloud (Docker, Kubernetes, AWS, Azure, GCP, Cloudflare, Terraform, Vercel, Netlify, Monitoring, CI/CD)
  if (
    hintIs('server monitoring', 'it operations', 'developer tools and devops') ||
    inSlugOrName('devops', 'docker', 'kubernetes', 'k8s', 'aws', 'azure', 'gcp', 'google_cloud', 'cloudflare', 'terraform', 'vercel', 'netlify', 'render', 'railway', 'digitalocean', 'heroku', 'argocd', 'helm', 'prometheus', 'datadog', 'grafana', 'pagerduty', 'betterstack', 'sentry', 'cloudwatch', 'ansible', 'serverless', 'lambda', 'openfaas', 'traefik', 'nginx', 'caddy', 'portainer', 'backstage', 'hostinger', 'incident_io', 'remote_retrieval') ||
    inAll('cloud infrastructure', 'container management', 'continuous integration', 'deployment pipeline', 'server monitoring', 'kubernetes cluster', 'cloud services', 'incident management', 'hosting provider')
  ) {
    return 'DevOps & Cloud';
  }

  // 9. Code & Git (Git, GitHub, GitLab, Bitbucket, npm, PyPI, IDE, compiler, linter, debugging)
  if (
    inSlugOrName('github', 'gitlab', 'bitbucket', 'git', 'npm', 'pypi', 'cargo', 'nuget', 'maven', 'compiler', 'linter', 'debugger', 'prettier', 'eslint', 'sonarqube', 'coderabbit', 'hackerrank', 'dadata', 'graphql', 'swagger', 'postman', 'insomnia', 'terminal', 'shell', 'bash', 'zsh', 'code', 'snippet', 'ast', 'typescript', 'python', 'golang', 'rust', 'simplelocalize') ||
    inAll('source code', 'version control', 'code review', 'git repository', 'package manager', 'syntax checking', 'coding interviews')
  ) {
    return 'Code & Git';
  }

  // 10. Artificial intelligence (AI, LLMs, OpenAI, Anthropic, Gemini, Claude, Replicate, Mistral, Speech/Vision)
  if (
    hintIs('artificial intelligence', 'ai chatbots', 'ai content generation', 'ai agents', 'ai sales tools', 'ai models', 'ai assistants', 'ai safety and compliance', 'transcription') ||
    inSlugOrName('openai', 'anthropic', 'gemini', 'claude', 'heygen', 'captions', 'huggingface', 'replicate', 'elevenlabs', 'elevenreader', 'midjourney', 'stable_diffusion', 'whisper', 'prompt', 'genai', 'groq', 'perplexity', 'cohere', 'notebooklm', 'mistral', 'deepseek', 'langchain', 'llamaindex', 'runpod', 'together_ai', 'fireworks', 'assemblyai', 'deepgram', 'fal_ai', 'cohere', 'vectorshift', 'get_transcribe', 'autobound', 'contentdrips') ||
    /\b(ai|llm|genai|gpt|rag)\b/.test(slug) ||
    /\b(ai|llm|genai|gpt|rag)\b/.test(name) ||
    inAll('artificial intelligence', 'ai models', 'large language model', 'generative ai', 'voice synthesis', 'video generation', 'neural network', 'vector embeddings', 'speech-to-text', 'text-to-speech')
  ) {
    return 'Artificial intelligence';
  }

  // 11. Documents & files (PDF, Drive, Dropbox, Box, OneDrive, OCR, Contracts, Spreadsheets)
  if (
    hintIs('documents', 'document data extraction', 'e-signatures', 'spreadsheets', 'file management and storage', 'content and files') ||
    inSlugOrName('pdf', 'drive', 'google_drive', 'dropbox', 'box', 'onedrive', 'document', 'doc', 'spreadsheet', 'excel', 'csv', 'ocr', 'docusign', 'clicksign', 'contractbook', 'contract', 'veryfi', 'pandadoc', 'adobe_sign', 'zapsign', 'eversign', 'dromo', 'googlesheets') ||
    inAll('document conversion', 'pdf files', 'cloud storage', 'electronic signature', 'contract lifecycle', 'document data extraction', 'e-signature')
  ) {
    return 'Documents & files';
  }

  // 12. Marketing & Social (Mailchimp, Ads, SEO, Social media marketing, Newsletters)
  if (
    hintIs('marketing automation', 'social media marketing', 'email newsletters', 'marketing', 'url shortener', 'ads and conversion', 'reviews') ||
    inSlugOrName('marketing', 'mailchimp', 'activecampaign', 'activetrail', 'adwords', 'google_ads', 'facebook_ads', 'meta_ads', 'instagram', 'linkedin', 'twitter', 'tiktok', 'social_media', 'post', 'buffer', 'hootsuite', 'seo', 'semrush', 'ahrefs', 'rd_station', 'leads2b', 'ad_library', 'socialdl', 'pinterest', 'reddit', 'cutt_ly', 'bouncify', 'customerio') ||
    inAll('social media marketing', 'email marketing campaigns', 'publish posts', 'ad management', 'search engine optimization', 'social media', 'url shortener')
  ) {
    return 'Marketing';
  }

  // 13. Sales & CRM (HubSpot, Salesforce, Pipedrive, Leads, CRM, Deals)
  if (
    hintIs('crm', 'sales and crm', 'contact management', 'proposals and invoices') ||
    inSlugOrName('crm', 'hubspot', 'salesforce', 'pipedrive', 'zoho', 'leads', 'prospect', 'pipeline', 'deals', 'vendas', 'sales', 'aeroleads', 'apollo', 'kommo', 'parma', 'close_crm', 'copper', 'follow_up_boss') ||
    inAll('sales pipeline', 'lead generation', 'customer relationship management', 'prospecting', 'sales team')
  ) {
    return 'Sales & CRM';
  }

  // 14. Communication (email, messaging, telephony, chat)
  if (
    hintIs('email', 'phone and sms', 'communication', 'notifications', 'transactional email', 'team chat', 'drip emails', 'video conferencing') ||
    inSlugOrName('gmail', 'slack', 'discord', 'whatsapp', 'telegram', 'twilio', 'sms', 'email', 'mail', 'inbox', 'telephony', 'voip', 'zapi', 'evolution_api', 'callingly', 'messagebird', 'plivo', 'sendgrid', 'postmark', 'resend', 'brevo', 'mailgun', 'beamer', 'kapso', 'lettr', 'outlook') ||
    inAll('send and receive emails', 'send messages', 'whatsapp account', 'chat messages', 'inbox management', 'sms messages', 'phone calls', 'transactional email', 'notifications')
  ) {
    return 'Communication';
  }

  // 15. Productivity & Workflow (calendar, notion, asana, trello, linear, jira, tasks, scheduling, booking)
  if (
    hintIs('project management', 'productivity', 'scheduling and booking', 'event management', 'time tracking', 'task management', 'product management', 'team collaboration', 'webinars', 'notes', 'bookmarks', 'meeting assistants') ||
    inSlugOrName('googlecalendar', 'calendar', 'calcom', 'calendly', 'notion', 'asana', 'trello', 'linear', 'jira', 'todoist', 'clickup', 'monday', 'task', 'agenda', 'scheduling', 'productivity', 'notes', 'workspace', 'zapier', 'n8n', 'make_com', 'booqable', 'airtable', 'supersaas', 'passcreator', 'productboard', 'mem') ||
    inAll('schedule meetings', 'calendar events', 'task management', 'project management', 'workflow automation', 'booking system', 'rental management', 'event management')
  ) {
    return 'Productivity';
  }

  // 16. Finance & payments (Stripe, PayPal, Banks, Open Finance, PIX, Invoices, Accounting, Currency, Crypto)
  if (
    hintIs('accounting', 'payment processing', 'fundraising', 'commerce') ||
    inSlugOrName('finance', 'banking', 'banco', 'bank', 'payment', 'pagamento', 'pix', 'boleto', 'stripe', 'paypal', 'getnet', 'contaazul', 'asaas', 'cielo', 'stone', 'pagseguro', 'openfinance', 'invoice', 'fatura', 'extrato', 'accounting', 'billing', 'crypto', 'wallet', 'invest', 'b3', 'cambio', 'olist', 'fixer', 'ko_fi', 'fundraising', 'currency', 'exchange', 'omie', 'revolut', 'wise', 'monzo', 'plaid', 'polymarket', 'pocketsmith', 'coinmarketcap') ||
    inAll('bank accounts', 'credit card processing', 'payment gateway', 'financial transactions', 'bank statements', 'currency data', 'exchange rates', 'donations', 'cryptocurrency')
  ) {
    return 'Finance & payments';
  }

  // 17. Content & design (Figma, Canva, Adobe, Unsplash, Images, Video, Audio, 3D, Website builders)
  if (
    hintIs('images and design', 'video and audio', 'website builders', 'website and app building', 'app builder') ||
    inSlugOrName('figma', 'canva', 'design', 'image', 'video', 'youtube', 'vimeo', 'audio', 'music', 'podcast', 'photo', 'font', 'graphic', 'art', 'banner', 'unsplash', 'shutterstock', 'amara', 'subtitle', 'plasmic', 'blender', 'sketch', 'smugmug', 'zeplin', 'screenshot_fyi') ||
    inAll('graphic design', 'image editing', 'video editing', 'youtube videos', 'creative assets', 'subtitles and captions', '3d product models')
  ) {
    return 'Content & design';
  }

  // 18. E-commerce & retail (Shopify, WooCommerce, VTEX, Mercado Livre, Store)
  if (
    hintIs('ecommerce') ||
    inSlugOrName('ecommerce', 'shopify', 'woocommerce', 'vtex', 'magento', 'mercadolivre', 'mercado_livre', 'shopee', 'amazon', 'store', 'cart', 'checkout', 'orders', 'loja', 'produtos', 'varejo', 'retail', 'goody', 'printful', 'bigcommerce', 'etsy', 'modelry') ||
    inAll('online store', 'product catalog', 'order management', 'shopping cart', 'physical products', 'ecommerce')
  ) {
    return 'E-commerce & retail';
  }

  // 19. Analytics & BI (Google Analytics, Mixpanel, Tableau, PostHog, Metrics, Dovetail)
  if (
    hintIs('analytics', 'business intelligence') ||
    inSlugOrName('analytics', 'google_analytics', 'mixpanel', 'posthog', 'tableau', 'powerbi', 'metabase', 'dashboard', 'metrics', 'relatorio', 'bi', 'telemetry', 'dovetail', 'amplitude', 'heap', 'hex') ||
    inAll('business intelligence', 'web analytics', 'event tracking', 'reporting dashboard', 'survey responses')
  ) {
    return 'Analytics & BI';
  }

  // 20. Security & identity (1Password, Vault, Auth0, Okta, Firewall, CVE, Threat)
  if (
    hintIs('security and identity') ||
    inSlugOrName('1password', 'bitwarden', 'vault', 'auth0', 'okta', 'firewall', 'security', 'cve', 'vulnerability', 'ssl', 'cert', 'abuseipdb', 'threat', 'pentest', 'iam', 'biometria', 'antifraud', 'x_force', 'crowdstrike', 'virustotal', 'shodan', 'ipdata', 'anonyflow') ||
    inAll('password manager', 'secret management', 'identity provider', 'vulnerability scanning', 'firewall rules', 'threat intelligence', 'cybersecurity')
  ) {
    return 'Security & identity';
  }

  // 21. Customer support (Zendesk, Intercom, Freshdesk, Tickets, Helpdesk)
  if (
    hintIs('customer support', 'customer appreciation') ||
    inSlugOrName('support', 'zendesk', 'intercom', 'freshdesk', 'helpdesk', 'ticket', 'atendimento', 'sac', 'feedback', 'reclame_aqui', 'crisp', 'frontapp', 'gorgias') ||
    inAll('customer service', 'support tickets', 'help desk', 'customer feedback')
  ) {
    return 'Customer support';
  }

  // 22. HR & people (Workday, BambooHR, Greenhouse, Payroll, Recruiting)
  if (
    hintIs('human resources', 'talent and recruitment') ||
    inSlugOrName('hr', 'recruiting', 'rh', 'folha', 'payroll', 'employee', 'funcionario', 'talent', 'vagas', 'contratacao', 'bamboohr', 'greenhouse', 'workday', 'gupy', 'lever', 'personio') ||
    inAll('human resources', 'job candidates', 'payroll management', 'employee directory', 'talent recruitment')
  ) {
    return 'HR & people';
  }

  // 23. Education (Courses, LMS, School, University, Learning, Quizzes)
  if (
    hintIs('education', 'online courses') ||
    inSlugOrName('education', 'educacao', 'school', 'escola', 'university', 'universidade', 'course', 'curso', 'lms', 'learning', 'quiz', 'academic', 'enem', 'classmarker', 'canvas_lms', 'moodle', 'coursera') ||
    inAll('online courses', 'learning management system', 'student records', 'educational content', 'quiz maker', 'online exams')
  ) {
    return 'Education';
  }

  // 24. Health & wellness (Medical, Clinic, Hospital, Fitness, Doctor)
  if (
    hintIs('fitness') ||
    inSlugOrName('health', 'saude', 'medic', 'clinic', 'hospital', 'fitness', 'wellness', 'nutrition', 'pharma', 'farmacia', 'doctor', 'patient', 'sus', 'fitbit', 'strava') ||
    inAll('medical records', 'patient management', 'healthcare data', 'fitness tracking')
  ) {
    return 'Health & wellness';
  }

  // 25. Lifestyle & Travel (Weather, Travel, Flight, Hotel, Food, Restaurant, News, Transit)
  if (
    hintIs('news and lifestyle', 'lifestyle and entertainment') ||
    inSlugOrName('weather', 'clima', 'tempo', 'travel', 'viagem', 'hotel', 'flight', 'voo', 'food', 'restaurant', 'recipe', 'game', 'sport', 'spotify', 'cinema', 'news', 'world_news', 'sncf', 'train', 'transit', 'uber', 'airbnb', 'tripadvisor') ||
    inAll('weather forecast', 'flight booking', 'hotel reservations', 'restaurant search', 'news sources', 'passenger-information')
  ) {
    return 'Lifestyle';
  }

  // 26. Development & infra (Remaining developer tools, APIs, SDKs)
  return 'Development & infra';
}

function deriveWhenToUse(item, category) {
  const desc = (item.description || '').trim();
  const name = item.name || item.slug;
  const tools = item.toolsCount || 1;

  const useMatch = desc.match(/use (?:when|for|to) ([^.]+)/i);
  if (useMatch && useMatch[1].length > 10 && useMatch[1].length < 130) {
    return `Use ${useMatch[0].slice(4).trim().replace(/^,\s*/, '')}`;
  }

  const firstSentence = desc.split(/\.\s+/)[0];
  if (
    firstSentence &&
    firstSentence.length > 20 &&
    firstSentence.length < 150 &&
    !firstSentence.toLowerCase().startsWith('connect your') &&
    !firstSentence.toLowerCase().startsWith('mcp.ai-hosted')
  ) {
    return (
      firstSentence
        .replace(/^agregates?/i, 'Aggregate')
        .replace(/^publishes?/i, 'Publish')
        .replace(/^access to/i, 'Access') + '.'
    );
  }

  return `Connect ${name} (${tools} tools) for ${category.toLowerCase()} operations and automated agent tasks.`;
}

const esc = (s) => (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');

const valid = items.filter((it) => it.slug && /^[a-z0-9_]+$/i.test(it.slug));
console.log(`Processing ${valid.length} valid catalog entries...`);

const lines = valid.map((r) => {
  const name = `mcpai-${r.slug}`;
  const label = esc(r.name || r.slug);
  const category = classify(r);
  const desc = esc(
    r.description || `Hosted MCP for ${r.name || r.slug} with ${r.toolsCount || 1} tools.`
  );
  const whenToUse = esc(deriveWhenToUse(r, category));
  const toolsCount = Number(r.toolsCount) || 1;
  const url = r.installUrl?.startsWith('http') ? r.installUrl : `https://api.mcp.ai/p_${r.slug}`;
  const iconUrl = r.logoUrl || `https://mcp-ai-public-assets.s3.amazonaws.com/logos/${r.slug}.svg`;

  return `  { name: '${name}', label: '${label}', category: '${category}', description: '${desc}', whenToUse: '${whenToUse}', toolsCount: ${toolsCount}, url: '${url}', envKeys: [], authType: 'oauth', iconUrl: '${iconUrl}', isMcpAi: true },`;
});

const header = `// Generated from MCP.ai comprehensive catalogue. Every entry is a hosted
// remote MCP endpoint at https://api.mcp.ai/p_<slug> that advertises MCP OAuth
// (protected-resource metadata + dynamic client registration + PKCE), so Connect
// uses the shared authorization flow.
import type { StockMcp } from './mcp.stock.js';

export const MCPAI_MCPS: StockMcp[] = [
`;

const output = header + lines.join('\n') + '\n];\n';
fs.writeFileSync(OUT_FILE, output, 'utf8');
console.log(`Successfully wrote ${valid.length} entries to ${path.relative(ROOT, OUT_FILE)} (${Math.round(output.length / 1024)} KB)`);
