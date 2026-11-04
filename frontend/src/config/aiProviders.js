// Domestic LLM providers exposed on the Settings page.
// Every preset below speaks the OpenAI-compatible Chat Completions API,
// so switching providers only changes the base URL and model name.

export const AI_PROVIDERS = [
  {
    id: "deepseek",
    name: "DeepSeek",
    shortName: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    docsUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "qwen",
    name: "通义千问（阿里云百炼）",
    shortName: "通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    docsUrl: "https://bailian.console.aliyun.com/",
  },
  {
    id: "zhipu",
    name: "智谱 GLM",
    shortName: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-flash",
    docsUrl: "https://open.bigmodel.cn/usercenter/apikeys",
  },
  {
    id: "moonshot",
    name: "Kimi（月之暗面）",
    shortName: "Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
    docsUrl: "https://platform.moonshot.cn/console/api-keys",
  },
  {
    id: "siliconflow",
    name: "硅基流动 SiliconFlow",
    shortName: "硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "deepseek-ai/DeepSeek-V3",
    docsUrl: "https://cloud.siliconflow.cn/account/ak",
  },
  {
    id: "custom",
    name: "自定义（OpenAI 兼容接口）",
    shortName: "自定义",
    baseUrl: "",
    model: "",
    docsUrl: "",
  },
];

export const CUSTOM_PROVIDER_ID = "custom";
export const DEFAULT_PROVIDER_ID = "deepseek";

export const STORAGE_KEYS = {
  providerId: "student_ai_provider",
  apiKey: "student_ai_api_key",
  baseUrl: "student_ai_base_url",
  model: "student_ai_model",
  // Gemini key from the previous version; cleaned up on save.
  legacyApiKey: "student_gemini_api_key",
};

export function getProvider(providerId) {
  return (
    AI_PROVIDERS.find((provider) => provider.id === providerId) ||
    AI_PROVIDERS.find((provider) => provider.id === DEFAULT_PROVIDER_ID)
  );
}

export function loadAIConfig() {
  const provider = getProvider(localStorage.getItem(STORAGE_KEYS.providerId));
  return {
    providerId: provider.id,
    providerName: provider.name,
    providerShortName: provider.shortName || provider.name,
    apiKey: localStorage.getItem(STORAGE_KEYS.apiKey) || "",
    baseUrl: localStorage.getItem(STORAGE_KEYS.baseUrl) || provider.baseUrl,
    model: localStorage.getItem(STORAGE_KEYS.model) || provider.model,
  };
}

/** True when the form values differ from what is currently saved. */
export function hasUnsavedChanges({ providerId, apiKey, baseUrl, model }) {
  const saved = loadAIConfig();
  return (
    saved.providerId !== providerId ||
    saved.apiKey !== (apiKey || "").trim() ||
    saved.baseUrl !== (baseUrl || "").trim() ||
    saved.model !== (model || "").trim()
  );
}

function saveOrRemove(key, value) {
  const trimmed = (value || "").trim();
  if (trimmed) {
    localStorage.setItem(key, trimmed);
  } else {
    localStorage.removeItem(key);
  }
}

export function saveAIConfig({ providerId, apiKey, baseUrl, model }) {
  localStorage.setItem(STORAGE_KEYS.providerId, providerId || DEFAULT_PROVIDER_ID);
  saveOrRemove(STORAGE_KEYS.apiKey, apiKey);
  saveOrRemove(STORAGE_KEYS.baseUrl, baseUrl);
  saveOrRemove(STORAGE_KEYS.model, model);
  localStorage.removeItem(STORAGE_KEYS.legacyApiKey);
}

export function clearAIKey() {
  localStorage.removeItem(STORAGE_KEYS.apiKey);
  localStorage.removeItem(STORAGE_KEYS.legacyApiKey);
}
