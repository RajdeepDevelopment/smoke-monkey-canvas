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
        id: 'nvidia/nemotron-3.5-lightning-30b-a3b',
        label: 'Nemotron 3.5 Lightning 30B',
        description: 'Instant response times for fast verification and monitoring.',
      },
      {
        id: 'nvidia/nemotron-3.5-bolt-e4b',
        label: 'Nemotron 3.5 Bolt E4B',
        description: 'Compact edge model for high-throughput background tasks.',
      },
      {
        id: 'nvidia/nemotron-3-nano-30b-a3b',
        label: 'Nemotron 3 Nano 30B',
        description: 'Ultra-low latency, highly cost-effective agent reasoning.',
      },
      {
        id: 'deepseek-ai/deepseek-v4-pro',
        label: 'DeepSeek V4 Pro (NVIDIA)',
        description: 'Frontier open reasoning and coding with a 1M-token context.',
      },
      {
        id: 'deepseek-ai/deepseek-v4-flash',
        label: 'DeepSeek V4 Flash (NVIDIA)',
        description: 'Fast, low-cost DeepSeek V4 inference for agent loops.',
      },
      {
        id: 'moonshotai/kimi-k3',
        label: 'Kimi K3 (NVIDIA)',
        description: 'Long-horizon coding and knowledge work with native vision.',
      },
      {
        id: 'z-ai/glm-5.3',
        label: 'GLM-5.3 (NVIDIA)',
        description: 'State-of-the-art open coding and agentic model from Z.ai.',
      },
      {
        id: 'minimaxai/minimax-m2.7',
        label: 'MiniMax M2.7 (NVIDIA)',
        description: 'Efficient multilingual reasoning and tool use.',
      },
      {
        id: 'qwen/qwen3-next-80b-a3b-instruct',
        label: 'Qwen3 Next 80B (NVIDIA)',
        description: 'High-throughput Qwen MoE for general agentic workloads.',
      },
      {
        id: 'openai/gpt-oss-120b',
        label: 'GPT-OSS 120B (NVIDIA)',
        description: 'OpenAI open-weight flagship hosted on NVIDIA NIM.',
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
        id: 'gemini-4-argon',
        label: 'Gemini 4 Argon ★',
        description: 'Google flagship reasoning model with a unified 1M-token context.',
        isDefault: true,
      },
      {
        id: 'gemini-3.8-flash',
        label: 'Gemini 3.8 Flash',
        description: 'Most intelligent Flash model for long-horizon coding and agents.',
      },
      {
        id: 'gemini-3.6-flash',
        label: 'Gemini 3.6 Flash',
        description: 'Previous-generation Flash balancing speed and multimodal depth.',
      },
      {
        id: 'gemini-3.5-flash-lite',
        label: 'Gemini 3.5 Flash-Lite',
        description: 'Ultra-low latency, cost-efficient model for high-volume automation.',
      },
      {
        id: 'gemini-3.1-flash-lite',
        label: 'Gemini 3.1 Flash-Lite',
        description: 'Frontier-class performance at a fraction of the cost.',
      },
      {
        id: 'gemini-3.1-pro-preview',
        label: 'Gemini 3.1 Pro (Preview)',
        description: 'Deep reasoning for complex research and planning workflows.',
      },
      {
        id: 'gemma-4-31b-it',
        label: 'Gemma 4 31B Instruct',
        description: 'Google open weights model fine-tuned for instruction following.',
      },
      {
        id: 'gemma-4-26b-a4b-it',
        label: 'Gemma 4 26B A4B Instruct',
        description: 'Efficient open MoE model for fast local and cloud tasks.',
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
        id: 'anthropic/claude-sonnet-5.5',
        label: 'Claude Sonnet 5.5 (OpenRouter) ★',
        description: 'Best tool-calling reliability for multi-step autonomous agents.',
        isDefault: true,
      },
      {
        id: 'anthropic/claude-opus-5.5',
        label: 'Claude Opus 5.5 (OpenRouter)',
        description: 'Maximum depth analysis and complex architectural refactors.',
      },
      {
        id: 'anthropic/claude-fable-5.1',
        label: 'Claude Fable 5.1 (OpenRouter)',
        description: 'Demanding reasoning and long-horizon agentic work.',
      },
      {
        id: 'anthropic/claude-haiku-5.5',
        label: 'Claude Haiku 5.5 (OpenRouter)',
        description: 'Fast, low-cost classification, extraction, and routing.',
      },
      {
        id: 'openai/gpt-6-astra',
        label: 'GPT-6 Astra (OpenRouter)',
        description: 'OpenAI flagship for complex reasoning and coding.',
      },
      {
        id: 'openai/gpt-6.1-sol',
        label: 'GPT-6.1 Sol (OpenRouter)',
        description: 'Near-flagship intelligence at a lower cost.',
      },
      {
        id: 'openai/gpt-6-luna',
        label: 'GPT-6 Luna (OpenRouter)',
        description: 'Cost-sensitive, high-volume OpenAI workloads.',
      },
      {
        id: 'google/gemini-4-argon',
        label: 'Gemini 4 Argon (OpenRouter)',
        description: 'Google flagship reasoning with a 1M-token context.',
      },
      {
        id: 'google/gemini-3.8-flash',
        label: 'Gemini 3.8 Flash (OpenRouter)',
        description: 'Fast, high-intelligence Gemini for agent loops.',
      },
      {
        id: 'deepseek/deepseek-v4-pro-0813',
        label: 'DeepSeek V4 Pro (OpenRouter)',
        description: 'Cutting-edge coding performance at a fraction of cloud cost.',
      },
      {
        id: 'deepseek/deepseek-v4.1-flash',
        label: 'DeepSeek V4.1 Flash (OpenRouter)',
        description: 'Low-cost multimodal reasoning with a 1M-token context.',
      },
      {
        id: 'qwen/qwen3.8-max-0902',
        label: 'Qwen 3.8 Max (OpenRouter)',
        description: 'Top-tier multilingual foundation model with native vision.',
      },
      {
        id: 'qwen/qwen3-coder-flash',
        label: 'Qwen 3 Coder Flash (OpenRouter)',
        description: 'Specialized for code generation, patch creation, and AST analysis.',
      },
      {
        id: 'moonshotai/kimi-k3.1-pro',
        label: 'Kimi K3.1 Pro (OpenRouter)',
        description: 'Long-context coding and knowledge work.',
      },
      {
        id: 'z-ai/glm-5.3',
        label: 'GLM-5.3 (OpenRouter)',
        description: 'Open-weight coding and agentic leader from Z.ai.',
      },
      {
        id: 'minimax/minimax-m3.1-flash',
        label: 'MiniMax M3.1 Flash (OpenRouter)',
        description: 'Fast, low-cost multimodal agent model.',
      },
      {
        id: 'meta/muse-spark-1.3',
        label: 'Muse Spark 1.3 (OpenRouter)',
        description: 'Meta open-weight general reasoning model.',
      },
      {
        id: 'x-ai/grok-4.7',
        label: 'xAI Grok 4.7 (OpenRouter)',
        description: 'Fast, sharp reasoning for code and analysis tasks.',
      },
      {
        id: 'mistralai/mistral-large-4-0',
        label: 'Mistral Large 4 (OpenRouter)',
        description: 'State-of-the-art open multimodal model with strong tool calling.',
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
        id: 'claude-opus-5-5',
        label: 'Claude Opus 5.5 ★',
        description: 'Best model for long-running agentic coding and knowledge work.',
        isDefault: true,
      },
      {
        id: 'claude-fable-5-1',
        label: 'Claude Fable 5.1',
        description: 'Demanding reasoning and long-horizon agentic work.',
      },
      {
        id: 'claude-sonnet-5-5',
        label: 'Claude Sonnet 5.5',
        description: 'Best combination of speed and intelligence for everyday agents.',
      },
      {
        id: 'claude-haiku-5-5',
        label: 'Claude Haiku 5.5',
        description: 'High-volume, latency-sensitive classification and routing.',
      },
      {
        id: 'claude-opus-5',
        label: 'Claude Opus 5',
        description: 'Previous-generation Opus, still available as a legacy model.',
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
        id: 'gpt-6-astra',
        label: 'GPT-6 Astra ★',
        description: 'OpenAI flagship for the most demanding reasoning and coding.',
        isDefault: true,
      },
      {
        id: 'gpt-6.1-sol',
        label: 'GPT-6.1 Sol',
        description: 'Near-Astra performance for complex work at a lower cost.',
      },
      {
        id: 'gpt-6-luna',
        label: 'GPT-6 Luna',
        description: 'Most efficient model for focused, high-volume tasks.',
      },
      {
        id: 'gpt-6-sol',
        label: 'GPT-6 Sol',
        description: 'Built to power complex coding and agentic workflows.',
      },
      {
        id: 'gpt-5.6-sol',
        label: 'GPT-5.6 Sol',
        description: 'Previous-generation flagship for complex professional work.',
      },
      {
        id: 'gpt-5.6-terra',
        label: 'GPT-5.6 Terra',
        description: 'Previous-generation model balancing intelligence and cost.',
      },
      {
        id: 'gpt-5.6-luna',
        label: 'GPT-5.6 Luna',
        description: 'Previous-generation model optimized for cost-sensitive workloads.',
      },
      {
        id: 'gpt-5.5',
        label: 'GPT-5.5',
        description: 'Legacy model for coding and professional work.',
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
        id: 'grok-4.7',
        label: 'Grok 4.7 ★',
        description: 'xAI flagship for code, chat, and complex reasoning.',
        isDefault: true,
      },
      {
        id: 'grok-4.6',
        label: 'Grok 4.6',
        description: 'Previous flagship with a 500k context window.',
      },
      {
        id: 'grok-4.5',
        label: 'Grok 4.5',
        description: 'Balanced reasoning and speed for production agents.',
      },
      {
        id: 'grok-4.3',
        label: 'Grok 4.3',
        description: '1M-token context at a lower price point.',
      },
      {
        id: 'grok-4.20-0309-reasoning',
        label: 'Grok 4.20 Reasoning',
        description: 'Extended reasoning with a 1M-token context.',
      },
      {
        id: 'grok-4.20-0309-non-reasoning',
        label: 'Grok 4.20 Non-Reasoning',
        description: 'Low-latency variant without extended thinking.',
      },
      {
        id: 'grok-4.20-multi-agent-0309',
        label: 'Grok 4.20 Multi-Agent',
        description: 'Tuned for multi-agent orchestration workloads.',
      },
      {
        id: 'grok-build-0.1',
        label: 'Grok Build 0.1',
        description: 'Agentic coding model for build and refactor workflows.',
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
        id: 'deepseek-v4-pro',
        label: 'DeepSeek V4 Pro ★',
        description: 'Flagship reasoning and coding with a 1M-token context.',
        isDefault: true,
      },
      {
        id: 'deepseek-flash',
        label: 'DeepSeek V4.1 Flash',
        description: 'Low-cost multimodal reasoning and high-volume agent work.',
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
        id: 'openai/gpt-oss-120b',
        label: 'GPT-OSS 120B (Groq) ★',
        description: 'Blazing fast open-weight flagship at 500+ tokens/sec.',
        isDefault: true,
      },
      {
        id: 'openai/gpt-oss-20b',
        label: 'GPT-OSS 20B (Groq)',
        description: 'Sub-second latency for fast checks and high-volume tasks.',
      },
      {
        id: 'qwen/qwen3.8-27b',
        label: 'Qwen 3.8 27B (Groq)',
        description: 'Efficient multimodal model at 450+ tokens/sec.',
      },
      {
        id: 'minimaxai/minimax-m2.7',
        label: 'MiniMax M2.7 (Groq)',
        description: 'Fast multilingual reasoning in preview on Groq LPUs.',
      },
      {
        id: 'whisper-large-v3-turbo',
        label: 'Whisper Large V3 Turbo',
        description: 'Low-cost speech transcription at 400x real-time.',
      },
      {
        id: 'whisper-large-v3',
        label: 'Whisper Large V3',
        description: 'High-accuracy multilingual speech transcription.',
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
        id: 'qwen3.8-max',
        label: 'Qwen 3.8 Max ★',
        description: 'Flagship Qwen model with native vision and a 1M-token context.',
        isDefault: true,
      },
      {
        id: 'qwen3.8-flash',
        label: 'Qwen 3.8 Flash',
        description: 'Fast multimodal reasoning for high-concurrency agents.',
      },
      {
        id: 'qwen3.7-max',
        label: 'Qwen 3.7 Max',
        description: 'Previous-generation flagship with strong coding and vision.',
      },
      {
        id: 'qwen3.7-plus',
        label: 'Qwen 3.7 Plus',
        description: 'Balanced performance for general agentic tasks.',
      },
      {
        id: 'qwen3-coder-flash',
        label: 'Qwen 3 Coder Flash',
        description: 'Specialized code generation and repository editing.',
      },
      {
        id: 'qwen3.8-27b',
        label: 'Qwen 3.8 27B',
        description: 'Dense vision-language model for efficient local-style workloads.',
      },
      {
        id: 'deepseek-v4.1-flash',
        label: 'DeepSeek V4.1 Flash (DashScope)',
        description: 'Low-cost multimodal reasoning hosted by Alibaba Cloud.',
      },
      {
        id: 'kimi-k3',
        label: 'Kimi K3 (DashScope)',
        description: '2.8T-parameter open model for long-context programming.',
      },
      {
        id: 'glm-5.3',
        label: 'GLM-5.3 (DashScope)',
        description: 'Open-weight coding and agentic leader from Z.ai.',
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
        id: 'mistral-medium-2604',
        label: 'Mistral Medium 3.5 ★',
        description: 'Frontier-class multimodal model optimized for agentic coding.',
        isDefault: true,
      },
      {
        id: 'mistral-large-4',
        label: 'Mistral Large 4',
        description: 'State-of-the-art open multimodal model with a 1M-token context.',
      },
      {
        id: 'mistral-large-2512',
        label: 'Mistral Large 3',
        description: 'Open-weight general-purpose multimodal model.',
      },
      {
        id: 'mistral-small-2603',
        label: 'Mistral Small 4',
        description: 'Hybrid instruct, reasoning, and coding model at low cost.',
      },
      {
        id: 'codestral-2508',
        label: 'Codestral 25.08',
        description: 'Specialized model for code completion and synthesis.',
      },
      {
        id: 'ministral-14b-2512',
        label: 'Ministral 3 14B',
        description: 'Powerful text and vision model for edge deployment.',
      },
      {
        id: 'zai-glm-5-3',
        label: 'Z.ai GLM 5.3',
        description: 'Third-party open-weight model with a 1M-token context.',
      },
      {
        id: 'zai-glm-5-3-flash',
        label: 'Z.ai GLM 5.3 Flash',
        description: 'Fast multimodal variant optimized for agentic workflows.',
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
        id: 'deepseek-ai/DeepSeek-V4-Pro-0813',
        label: 'DeepSeek V4 Pro 0813 ★',
        description: 'Flagship open reasoning and coding model on Together.',
        isDefault: true,
      },
      {
        id: 'deepseek-ai/DeepSeek-V4.1-Flash',
        label: 'DeepSeek V4.1 Flash',
        description: 'Low-cost multimodal reasoning with a 1M-token context.',
      },
      {
        id: 'Qwen/Qwen3.8-Flash',
        label: 'Qwen 3.8 Flash (Together)',
        description: 'Fast multimodal model for high-concurrency agents.',
      },
      {
        id: 'Qwen/Qwen3.6-Plus',
        label: 'Qwen 3.6 Plus (Together)',
        description: 'Balanced multilingual model with a 1M-token context.',
      },
      {
        id: 'moonshotai/Kimi-K3',
        label: 'Kimi K3 (Together)',
        description: 'Long-context coding and knowledge work.',
      },
      {
        id: 'zai-org/GLM-5.3',
        label: 'GLM-5.3 (Together)',
        description: 'Open-weight coding and agentic leader from Z.ai.',
      },
      {
        id: 'MiniMaxAI/MiniMax-M3.1-Flash',
        label: 'MiniMax M3.1 Flash (Together)',
        description: 'Fast, low-cost multimodal agent model.',
      },
      {
        id: 'meta-models/Muse-Glimmer-30B',
        label: 'Muse Glimmer 30B (Together)',
        description: 'Efficient Meta open model for general workloads.',
      },
      {
        id: 'openai/gpt-oss-120b',
        label: 'GPT-OSS 120B (Together)',
        description: 'OpenAI open-weight flagship on Together inference.',
      },
      {
        id: 'nvidia/NVIDIA-Nemotron-3.5-Super-VL',
        label: 'Nemotron 3.5 Super VL',
        description: 'NVIDIA vision-language model for document and image analysis.',
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
        id: 'gpt-oss-120b',
        label: 'GPT-OSS 120B (Cerebras WSE) ★',
        description: 'Extreme speed (~3,000 tokens/sec) on Cerebras Wafer-Scale Engine.',
        isDefault: true,
      },
      {
        id: 'qwen-3.8-27b',
        label: 'Qwen 3.8 27B (Cerebras WSE)',
        description: 'Ultra-fast multimodal model at ~1,850 tokens/sec.',
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
        id: 'qwen3:8b',
        label: 'Local Qwen 3 8B (Ollama) ★',
        description: 'Runs completely offline and keyless on your local machine.',
        isDefault: true,
      },
      {
        id: 'gemma3:latest',
        label: 'Local Gemma 3 (Ollama)',
        description: 'Google open-weight model running through your local runtime.',
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
