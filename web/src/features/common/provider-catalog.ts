export interface ModelOption {
  id: string;
  label: string;
  description: string;
  isDefault?: boolean;
}

export interface ProviderOption {
  id: string;
  name: string;
  apiKeyName: string;
  models: ModelOption[];
}

export const PROVIDER_CATALOG: ProviderOption[] = [
  // ── 1. NVIDIA Hosted NIM ──────────────────────────────────────────────────
  {
    id: 'nvidia',
    name: 'NVIDIA Hosted NIM',
    apiKeyName: 'NVIDIA_API_KEY',
    models: [
      {
        id: 'nvidia/nemotron-3-super-120b-a12b',
        label: 'Nemotron 3 Super 120B ★',
        description: 'Flagship agentic reasoning and tool execution on NVIDIA NIM.',
        isDefault: true,
      },
      {
        id: 'nvidia/nemotron-3-ultra-550b-a55b',
        label: 'Nemotron 3 Ultra 550B',
        description: 'Ultra-scale MoE reasoning powerhouse for complex workflows.',
      },
      {
        id: 'nvidia/nemotron-3-nano-30b-a3b',
        label: 'Nemotron 3 Nano 30B',
        description: 'Ultra-low latency, highly cost-effective agent reasoning.',
      },
      {
        id: 'nvidia/nemotron-3.5-lightning',
        label: 'Nemotron 3.5 Lightning',
        description: 'Instant response times for fast verification and monitoring.',
      },
      {
        id: 'deepseek-ai/deepseek-r1',
        label: 'DeepSeek R1 (NVIDIA)',
        description: 'Advanced reasoning, chain-of-thought, and math problem solving.',
      },
      {
        id: 'mistralai/mistral-large-2-instruct',
        label: 'Mistral Large 2 (NVIDIA)',
        description: 'Accurate structured tool calling and coding benchmark leader.',
      },
      {
        id: 'meta/llama-3.3-70b-instruct',
        label: 'Llama 3.3 70B Instruct',
        description: 'High performance open weights workhorse on NVIDIA NIM.',
      },
      {
        id: 'meta/llama-3.1-405b-instruct',
        label: 'Llama 3.1 405B Instruct',
        description: 'Massive open foundation model for deep architectural reasoning.',
      },
      {
        id: 'qwen/qwen2.5-coder-32b-instruct',
        label: 'Qwen 2.5 Coder 32B',
        description: 'Code-specialized model with high code generation precision.',
      },
    ],
  },

  // ── 2. Google Gemini ─────────────────────────────────────────────────────
  {
    id: 'gemini',
    name: 'Google Gemini',
    apiKeyName: 'GEMINI_API_KEY',
    models: [
      {
        id: 'gemini-2.5-pro',
        label: 'Gemini 2.5 Pro ★',
        description: 'Google flagship reasoning model with massive multimodal capabilities.',
        isDefault: true,
      },
      {
        id: 'gemini-2.5-flash',
        label: 'Gemini 2.5 Flash',
        description: 'High-speed, cost-effective multimodal workhorse for agent loops.',
      },
      {
        id: 'gemini-2.5-flash-lite',
        label: 'Gemini 2.5 Flash Lite',
        description: 'Ultra-low latency inference for background cron monitors.',
      },
      {
        id: 'gemini-2.0-flash',
        label: 'Gemini 2.0 Flash',
        description: 'Real-time speed with native agentic tool execution.',
      },
      {
        id: 'gemini-1.5-pro',
        label: 'Gemini 1.5 Pro',
        description: 'Massive 2M token context window for large repository ingestion.',
      },
      {
        id: 'gemini-1.5-flash',
        label: 'Gemini 1.5 Flash',
        description: 'Fast, high-throughput daily workhorse.',
      },
      {
        id: 'gemma-3-27b-it',
        label: 'Gemma 3 27B Instruct',
        description: 'Latest Google open weights model fine-tuned for instruction following.',
      },
      {
        id: 'gemma-3-12b-it',
        label: 'Gemma 3 12B Instruct',
        description: 'Lightweight Google open model for fast local and cloud tasks.',
      },
    ],
  },

  // ── 3. OpenRouter Unified ────────────────────────────────────────────────
  {
    id: 'openrouter',
    name: 'OpenRouter Unified',
    apiKeyName: 'OPENROUTER_API_KEY',
    models: [
      {
        id: 'anthropic/claude-sonnet-4.6',
        label: 'Claude Sonnet 4.6 (OpenRouter) ★',
        description: 'Best tool-calling reliability for multi-step autonomous agents.',
        isDefault: true,
      },
      {
        id: 'anthropic/claude-3.7-sonnet',
        label: 'Claude 3.7 Sonnet (OpenRouter)',
        description: 'Hybrid reasoning model with dynamic thinking tokens.',
      },
      {
        id: 'anthropic/claude-opus-5',
        label: 'Claude Opus 5 (OpenRouter)',
        description: 'Maximum depth analysis and complex architectural refactors.',
      },
      {
        id: 'openai/gpt-5.6-luna-pro',
        label: 'GPT-5.6 Luna Pro (OpenRouter)',
        description: 'OpenAI flagship with extended reasoning and zero tool errors.',
      },
      {
        id: 'openai/gpt-5.6-luna',
        label: 'GPT-5.6 Luna (OpenRouter)',
        description: 'Fast, high-precision code generation and tool calling.',
      },
      {
        id: 'google/gemini-3.7-flash',
        label: 'Gemini 3.7 Flash (OpenRouter)',
        description: 'Fastest model with solid tool-calling for rapid task loops.',
      },
      {
        id: 'google/gemini-2.5-pro',
        label: 'Gemini 2.5 Pro (OpenRouter)',
        description: 'Deep reasoning with extended context through OpenRouter.',
      },
      {
        id: 'deepseek/deepseek-v4-pro',
        label: 'DeepSeek V4 Pro (OpenRouter)',
        description: 'Cutting-edge coding performance at fraction of cloud cost.',
      },
      {
        id: 'deepseek/deepseek-r1',
        label: 'DeepSeek R1 (OpenRouter)',
        description: 'Pure chain-of-thought open reasoning model.',
      },
      {
        id: 'qwen/qwen3-coder',
        label: 'Qwen 3 Coder (OpenRouter)',
        description: 'Specialized for code generation, patch creation, and AST analysis.',
      },
      {
        id: 'qwen/qwen3.8-max',
        label: 'Qwen 3.8 Max (OpenRouter)',
        description: 'Top-tier multilingual foundation model.',
      },
      {
        id: 'meta-llama/llama-4-maverick',
        label: 'Llama 4 Maverick (OpenRouter)',
        description: 'Next-generation open weights architecture.',
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        label: 'Llama 3.3 70B (OpenRouter)',
        description: 'Meta open weights hosted via OpenRouter.',
      },
      {
        id: 'mistralai/mistral-large-2512',
        label: 'Mistral Large 2512 (OpenRouter)',
        description: 'Structured JSON and function-calling leader.',
      },
      {
        id: 'x-ai/grok-4.6',
        label: 'xAI Grok 4.6 (OpenRouter)',
        description: 'Fast, sharp reasoning for code tasks.',
      },
      {
        id: 'openrouter/auto',
        label: 'OpenRouter Auto Router',
        description: 'Automatically routes to lowest latency & highest availability model.',
      },
    ],
  },

  // ── 4. Anthropic Claude ──────────────────────────────────────────────────
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    apiKeyName: 'ANTHROPIC_API_KEY',
    models: [
      {
        id: 'claude-3-7-sonnet-20250219',
        label: 'Claude 3.7 Sonnet ★',
        description: 'Latest hybrid reasoning model with dynamic thinking tokens.',
        isDefault: true,
      },
      {
        id: 'claude-3-5-sonnet-latest',
        label: 'Claude 3.5 Sonnet',
        description: 'Industry benchmark for software engineering and tool use.',
      },
      {
        id: 'claude-3-5-haiku-latest',
        label: 'Claude 3.5 Haiku',
        description: 'Sub-second latency with high reasoning intelligence.',
      },
      {
        id: 'claude-3-opus-20240229',
        label: 'Claude 3 Opus',
        description: 'Top-tier complex analysis and deep comprehension.',
      },
    ],
  },

  // ── 5. OpenAI ────────────────────────────────────────────────────────────
  {
    id: 'openai',
    name: 'OpenAI',
    apiKeyName: 'OPENAI_API_KEY',
    models: [
      {
        id: 'gpt-4o',
        label: 'GPT-4o ★',
        description: 'High-speed flagship omni model for text, reasoning, and tools.',
        isDefault: true,
      },
      {
        id: 'gpt-4o-mini',
        label: 'GPT-4o Mini',
        description: 'Fast, lightweight and cost-efficient for routine tasks.',
      },
      {
        id: 'o1',
        label: 'OpenAI o1',
        description: 'Full reasoning model designed for complex planning and coding.',
      },
      {
        id: 'o3-mini',
        label: 'OpenAI o3-mini',
        description: 'Efficient reasoning model with adjustable reasoning effort.',
      },
      {
        id: 'chatgpt-4o-latest',
        label: 'ChatGPT 4o Latest',
        description: 'Continuously updated production ChatGPT model.',
      },
    ],
  },

  // ── 6. xAI — Grok ────────────────────────────────────────────────────────
  {
    id: 'xai',
    name: 'xAI — Grok',
    apiKeyName: 'XAI_API_KEY',
    models: [
      {
        id: 'grok-2-1212',
        label: 'Grok 2 ★',
        description: 'Flagship reasoning and code intelligence from xAI.',
        isDefault: true,
      },
      {
        id: 'grok-2-vision-1212',
        label: 'Grok 2 Vision',
        description: 'Multimodal vision and document analysis model.',
      },
      {
        id: 'grok-beta',
        label: 'Grok Beta',
        description: 'Experimental fast inference preview.',
      },
    ],
  },

  // ── 7. DeepSeek AI ───────────────────────────────────────────────────────
  {
    id: 'deepseek',
    name: 'DeepSeek AI Direct',
    apiKeyName: 'DEEPSEEK_API_KEY',
    models: [
      {
        id: 'deepseek-chat',
        label: 'DeepSeek V3 (Chat) ★',
        description: 'General language and code powerhouse with top benchmark scores.',
        isDefault: true,
      },
      {
        id: 'deepseek-reasoner',
        label: 'DeepSeek R1 (Reasoner)',
        description: 'Full chain-of-thought reasoning for complex engineering decisions.',
      },
    ],
  },

  // ── 8. Groq LPUs ─────────────────────────────────────────────────────────
  {
    id: 'groq',
    name: 'Groq LPUs',
    apiKeyName: 'GROQ_API_KEY',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        label: 'Llama 3.3 70B (Groq) ★',
        description: 'Blazing fast inference speed (500+ tokens/sec).',
        isDefault: true,
      },
      {
        id: 'llama-3.1-8b-instant',
        label: 'Llama 3.1 8B Instant',
        description: 'Sub-100ms response time for fast checks and scraping.',
      },
      {
        id: 'deepseek-r1-distill-llama-70b',
        label: 'DeepSeek R1 Distill 70B (Groq)',
        description: 'High-speed reasoning model on specialized Groq LPUs.',
      },
      {
        id: 'mixtral-8x7b-32768',
        label: 'Mixtral 8x7B (Groq)',
        description: 'MoE high-throughput with 32k context.',
      },
    ],
  },

  // ── 9. Qwen / Alibaba DashScope ──────────────────────────────────────────
  {
    id: 'qwen',
    name: 'Qwen / DashScope',
    apiKeyName: 'QWEN_API_KEY',
    models: [
      {
        id: 'qwen-max',
        label: 'Qwen Max ★',
        description: 'Flagship Qwen foundation model with superior multilingual intelligence.',
        isDefault: true,
      },
      {
        id: 'qwen2.5-coder-32b-instruct',
        label: 'Qwen 2.5 Coder 32B',
        description: 'Code-specialized model with high code generation precision.',
      },
      {
        id: 'qwen-plus',
        label: 'Qwen Plus',
        description: 'Balanced performance for general agentic tasks.',
      },
      {
        id: 'qwen-turbo',
        label: 'Qwen Turbo',
        description: 'High-speed, cost-effective inference.',
      },
    ],
  },

  // ── 10. Mistral AI ───────────────────────────────────────────────────────
  {
    id: 'mistral',
    name: 'Mistral AI',
    apiKeyName: 'MISTRAL_API_KEY',
    models: [
      {
        id: 'mistral-large-latest',
        label: 'Mistral Large 2 ★',
        description: 'Top-tier reasoning, 128k context, and benchmark-leading tool calling.',
        isDefault: true,
      },
      {
        id: 'codestral-latest',
        label: 'Codestral',
        description: 'Specialized 22B model for code completion and synthesis.',
      },
      {
        id: 'mistral-small-latest',
        label: 'Mistral Small',
        description: 'Fast, responsive model for routine automation tasks.',
      },
    ],
  },

  // ── 11. Together AI ──────────────────────────────────────────────────────
  {
    id: 'together',
    name: 'Together AI',
    apiKeyName: 'TOGETHER_API_KEY',
    models: [
      {
        id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        label: 'Llama 3.3 70B Turbo ★',
        description: 'High-speed open model on Together inference engine.',
        isDefault: true,
      },
      {
        id: 'deepseek-ai/DeepSeek-R1',
        label: 'DeepSeek R1 (Together)',
        description: 'Open reasoning model hosted on Together infrastructure.',
      },
      {
        id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
        label: 'Qwen 2.5 Coder 32B (Together)',
        description: 'Code-optimized open model.',
      },
    ],
  },

  // ── 12. Cerebras Fast Inference ──────────────────────────────────────────
  {
    id: 'cerebras',
    name: 'Cerebras Fast Inference',
    apiKeyName: 'CEREBRAS_API_KEY',
    models: [
      {
        id: 'llama3.3-70b',
        label: 'Llama 3.3 70B (Cerebras WSE) ★',
        description: 'Extreme speed (2,000+ tokens/sec) on Cerebras Wafer-Scale Engine.',
        isDefault: true,
      },
      {
        id: 'llama3.1-8b',
        label: 'Llama 3.1 8B (Cerebras WSE)',
        description: 'Instantaneous sub-50ms latency for real-time monitoring.',
      },
    ],
  },

  // ── 13. Local / OmniRoute (Keyless) ──────────────────────────────────────
  {
    id: 'omniroute',
    name: 'OmniRoute / Local (Free, Keyless)',
    apiKeyName: 'OMNIROUTE_API_KEY',
    models: [
      {
        id: 'llama3.2:latest',
        label: 'Local Llama 3.2 (Ollama / Local) ★',
        description: 'Runs completely offline and keyless on local machine.',
        isDefault: true,
      },
      {
        id: 'qwen2.5-coder:latest',
        label: 'Local Qwen 2.5 Coder',
        description: 'Local code assistant with zero telemetry.',
      },
      {
        id: 'deepseek-r1:latest',
        label: 'Local DeepSeek R1',
        description: 'Offline reasoning and planning model.',
      },
    ],
  },
];

export function getProvider(id: string): ProviderOption {
  return PROVIDER_CATALOG.find((p) => p.id === id) || PROVIDER_CATALOG[0];
}

export function getDefaultModelForProvider(providerId: string): string {
  const p = getProvider(providerId);
  const def = p.models.find((m) => m.isDefault);
  return def ? def.id : p.models[0].id;
}
