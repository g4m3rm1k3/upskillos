// src/components/tutor/tutorProviders.js
// Static config for all AI providers and models available in the tutor panel.

export const PROVIDERS = [
  {
    id: 'webllm',
    label: 'Free · In-Browser AI',
    badge: 'Free',
    description:
      'Runs entirely on your device using WebGPU. Nothing leaves your browser. First use downloads the model (900 MB – 2 GB).',
    requiresKey: false,
    models: [
      {
        id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        label: 'Llama 3.2 1B',
        note: '~900 MB · Lightest; shared with the app’s other AI features',
      },
      {
        id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
        label: 'Llama 3.2 3B',
        note: '~1.5 GB · General purpose',
      },
      {
        id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
        label: 'Phi-3.5 Mini 3.8B',
        note: '~2 GB · General purpose',
      },
      {
        id: 'Qwen2.5-Math-1.5B-Instruct-q4f16_1-MLC',
        label: 'Qwen2.5-Math 1.5B',
        note: '~900 MB · Math-specialized',
      },
    ],
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    badge: 'Free tier',
    description: 'Thousands of open models. Free tier available at huggingface.co.',
    requiresKey: true,
    keyPlaceholder: 'hf_...',
    keyHref: 'https://huggingface.co/settings/tokens',
    protocol: 'huggingface',
    models: [
      { id: 'meta-llama/Llama-3.2-3B-Instruct', label: 'Llama 3.2 3B', note: 'Free tier' },
      { id: 'mistralai/Mistral-7B-Instruct-v0.3', label: 'Mistral 7B', note: 'Free tier' },
      { id: 'Qwen/Qwen2.5-Math-7B-Instruct', label: 'Qwen2.5-Math 7B', note: 'Math-focused' },
      { id: 'microsoft/Phi-3.5-mini-instruct', label: 'Phi-3.5 Mini', note: 'Efficient' },
    ],
  },
  {
    id: 'groq',
    label: 'Groq',
    badge: 'Free tier',
    description: 'Very fast cloud inference. Free tier available at console.groq.com.',
    requiresKey: true,
    keyPlaceholder: 'gsk_...',
    keyHref: 'https://console.groq.com/keys',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    protocol: 'openai',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', note: 'Best quality' },
      { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek-R1 70B', note: 'Math reasoning' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', note: 'Fastest' },
      { id: 'gemma2-9b-it', label: 'Gemma 2 9B', note: 'Google model' },
    ],
  },
  {
    id: 'anthropic',
    label: 'Claude · Anthropic',
    badge: 'Paid',
    description: 'Best math reasoning. Paid per-message. Get a key at console.anthropic.com.',
    requiresKey: true,
    keyPlaceholder: 'sk-ant-...',
    keyHref: 'https://console.anthropic.com/settings/keys',
    protocol: 'anthropic',
    models: [
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', note: '~$0.001/msg · Fast' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', note: 'Best quality' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI · GPT',
    badge: 'Paid',
    description: 'GPT models. Paid per-message. Get a key at platform.openai.com.',
    requiresKey: true,
    keyPlaceholder: 'sk-...',
    keyHref: 'https://platform.openai.com/api-keys',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    protocol: 'openai',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', note: 'Fast · cheap' },
      { id: 'gpt-4o', label: 'GPT-4o', note: 'Best quality' },
    ],
  },
  {
    id: 'google',
    label: 'Gemini · Google',
    badge: 'Free tier',
    description: 'Gemini models. Free tier available at aistudio.google.com.',
    requiresKey: true,
    keyPlaceholder: 'AIza...',
    keyHref: 'https://aistudio.google.com/app/apikey',
    protocol: 'google',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', note: 'Free tier · Fastest' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', note: 'Free tier' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', note: 'More capable' },
    ],
  },
]

export function getProvider(id) {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0]
}

export const STORAGE_KEY = 'opencalc_tutor'

export const DEFAULT_SETTINGS = {
  provider: 'webllm',
  model: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',   // the model every other in-app AI feature already uses
  keys: {}, // { [providerId]: apiKey }
}
