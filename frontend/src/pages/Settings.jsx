import { useState } from "react";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Key,
  Loader2,
  ShieldAlert,
  User,
  XCircle,
} from "lucide-react";
import {
  AI_PROVIDERS,
  CUSTOM_PROVIDER_ID,
  clearAIKey,
  getProvider,
  hasUnsavedChanges,
  loadAIConfig,
  saveAIConfig,
} from "../config/aiProviders";
import { apiService } from "../services/api";

const DEFAULT_PROFILE_NAME = "学习探索者";
const DEFAULT_INSTITUTION = "Kaggle AI Academy";
const DEFAULT_MAJOR = "Computer Science";

function readInitialState() {
  const aiConfig = loadAIConfig();
  return {
    providerId: aiConfig.providerId,
    apiKey: aiConfig.apiKey,
    baseUrl: aiConfig.baseUrl,
    model: aiConfig.model,
    profileName: localStorage.getItem("student_profile_name") || DEFAULT_PROFILE_NAME,
    institution: localStorage.getItem("student_profile_institution") || DEFAULT_INSTITUTION,
    major: localStorage.getItem("student_profile_major") || DEFAULT_MAJOR,
  };
}

export default function Settings() {
  const [initial] = useState(readInitialState);

  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [providerId, setProviderId] = useState(initial.providerId);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [model, setModel] = useState(initial.model);

  const [profileName, setProfileName] = useState(initial.profileName);
  const [institution, setInstitution] = useState(initial.institution);
  const [major, setMajor] = useState(initial.major);

  const [aiSaved, setAiSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const activeProvider = getProvider(providerId);
  const savedConfig = loadAIConfig();
  const isDirty = hasUnsavedChanges({ providerId, apiKey, baseUrl, model });

  const handleProviderChange = (event) => {
    const nextId = event.target.value;
    setProviderId(nextId);
    if (nextId !== CUSTOM_PROVIDER_ID) {
      const preset = getProvider(nextId);
      setBaseUrl(preset.baseUrl);
      setModel(preset.model);
    }
  };

  const handleSaveProfile = (event) => {
    event.preventDefault();
    localStorage.setItem("student_profile_name", profileName.trim() || DEFAULT_PROFILE_NAME);
    localStorage.setItem("student_profile_institution", institution.trim());
    localStorage.setItem("student_profile_major", major.trim());

    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleSaveAIKey = () => {
    const trimmedBaseUrl = baseUrl.trim();
    if (!/^https?:\/\//i.test(trimmedBaseUrl)) {
      alert("AI 接口地址必须以 http:// 或 https:// 开头，请检查后重试。");
      return;
    }
    if (!model.trim()) {
      alert("请填写模型名称，例如 deepseek-chat。");
      return;
    }

    saveAIConfig({ providerId, apiKey, baseUrl: trimmedBaseUrl, model });
    setBaseUrl(trimmedBaseUrl);
    setModel(model.trim());
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    const trimmedBaseUrl = baseUrl.trim();
    const trimmedModel = model.trim();

    if (!/^https?:\/\//i.test(trimmedBaseUrl)) {
      setTestResult({ ok: false, message: "接口地址必须以 http:// 或 https:// 开头。" });
      return;
    }
    if (!trimmedModel) {
      setTestResult({ ok: false, message: "请填写模型名称，例如 deepseek-chat。" });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const data = await apiService.testAIConnection({
        apiKey: apiKey.trim(),
        baseUrl: trimmedBaseUrl,
        model: trimmedModel,
      });

      // A passing test is the strongest signal we have: persist it right away
      // so the header badge switches to the provider that was just verified.
      saveAIConfig({
        providerId,
        apiKey: apiKey.trim(),
        baseUrl: trimmedBaseUrl,
        model: trimmedModel,
      });
      setApiKey(apiKey.trim());
      setBaseUrl(trimmedBaseUrl);
      setModel(trimmedModel);

      setTestResult({
        ok: true,
        message: `${data.model || trimmedModel} 响应用时 ${data.latencyMs} ms，已保存并切换为「${
          activeProvider.shortName || activeProvider.name
        }」。`,
      });
    } catch (error) {
      setTestResult({ ok: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleClearKey = () => {
    clearAIKey();
    setApiKey("");
    alert("AI API 密钥已移除，智能代理在重新配置密钥前将无法生成内容。");
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Intro */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">智能代理设置</h1>
        <p className="text-xs text-text-secondary">
          配置个人资料并关联国内大模型 API 密钥，以启用实时智能代理推理。
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        {/* Profile Card */}
        <div className="glass-card rounded-2xl border p-6 bg-bg-card space-y-6">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 border-b border-border-card/30 pb-3">
            <User className="h-4.5 w-4.5 text-primary" />
            学生资料
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">姓名</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="例如：Jane Doe"
                className="input-field"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">学校 / 学院</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="例如：Polytechnic of Technology"
                className="input-field"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">专业</label>
              <input
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="例如：Software Engineering"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover font-semibold text-xs text-white py-2.5 rounded-xl shadow-md transition cursor-pointer"
            >
              {profileSaved ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  个人资料保存成功！
                </>
              ) : (
                "保存个人资料"
              )}
            </button>
          </form>
        </div>

        {/* AI Provider Panel */}
        <div className="glass-card rounded-2xl border p-6 bg-bg-card space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 border-b border-border-card/30 pb-3">
              <Key className="h-4.5 w-4.5 text-secondary" />
              国内大模型 API 配置
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">模型服务商</label>
              <select
                value={providerId}
                onChange={handleProviderChange}
                className="input-field w-full"
              >
                {AI_PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
              {activeProvider.docsUrl && (
                <a
                  href={activeProvider.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-secondary hover:underline"
                >
                  前往 {activeProvider.name} 控制台获取密钥
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">API 密钥</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
                className="input-field w-full"
              />
              <p className="text-[10px] text-text-muted">
                API 密钥仅缓存在浏览器本地存储中，不会保存到外部数据库。
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">接口地址（Base URL）</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.deepseek.com/v1"
                className="input-field w-full"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">模型名称</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="deepseek-chat"
                className="input-field w-full"
              />
              <p className="text-[10px] text-text-muted">
                切换服务商会自动填入默认地址与模型，也可手动改为其他 OpenAI 兼容接口。
              </p>
            </div>

            <div className="flex gap-2 items-start bg-yellow-500/10 border border-yellow-500/25 p-3.5 rounded-xl text-[10px] text-yellow-300">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">真实推理说明：</span>
                <p className="mt-1">
                  配置有效密钥后，所有生成结果均来自所选大模型的真实推理。若未配置密钥或调用失败，
                  后端会返回明确的错误提示，而不是伪造的演示内容。
                </p>
              </div>
            </div>

            {testResult && (
              <div
                className={`flex gap-2 items-start border p-3.5 rounded-xl text-[10px] ${
                  testResult.ok
                    ? "bg-success/10 border-success/25 text-success"
                    : "bg-accent/15 border-accent/20 text-accent"
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold">
                    {testResult.ok ? "连接成功：" : "连接失败："}
                  </span>
                  <p className="mt-1 break-all">{testResult.message}</p>
                </div>
              </div>
            )}

            {isDirty && (
              <div className="flex gap-2 items-start bg-yellow-500/10 border border-yellow-500/25 p-3.5 rounded-xl text-[10px] text-yellow-300">
                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">配置尚未保存：</span>
                  <p className="mt-1">
                    顶栏目前仍显示已保存的「{savedConfig.providerShortName}」。
                    点击「更新 API 配置」保存，或让「测试连接」成功一次，会自动保存并切换。
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-border-card/25">
            <button
              onClick={handleSaveAIKey}
              className="flex-1 bg-primary hover:bg-primary-hover font-semibold text-xs text-white py-2.5 rounded-xl transition cursor-pointer"
            >
              {aiSaved ? "已更新！" : "更新 API 配置"}
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center justify-center gap-1.5 border border-border-card hover:bg-bg-card-hover text-text-secondary font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {testing ? "测试中..." : "测试连接"}
            </button>
            {apiKey && (
              <button
                onClick={handleClearKey}
                className="bg-accent/15 border border-accent/20 hover:bg-accent/25 text-accent font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                清除密钥
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
