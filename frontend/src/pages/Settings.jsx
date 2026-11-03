import React, { useState, useEffect } from "react";
import { Sparkles, Key, User, BookOpen, Check, ShieldAlert } from "lucide-react";

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [profileName, setProfileName] = useState("学习探索者");
  const [institution, setInstitution] = useState("Kaggle AI Academy");
  const [major, setMajor] = useState("Computer Science");
  
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem("student_gemini_api_key");
    const name = localStorage.getItem("student_profile_name");
    const inst = localStorage.getItem("student_profile_institution");
    const maj = localStorage.getItem("student_profile_major");

    if (key) setApiKey(key);
    if (name) setProfileName(name);
    if (inst) setInstitution(inst);
    if (maj) setMajor(maj);
  }, []);

  const handleSave = (e) => {
    e.preventDefault();

    if (apiKey.trim()) {
      localStorage.setItem("student_gemini_api_key", apiKey.trim());
    } else {
      localStorage.removeItem("student_gemini_api_key");
    }

    localStorage.setItem("student_profile_name", profileName.trim() || "学习探索者");
    localStorage.setItem("student_profile_institution", institution.trim());
    localStorage.setItem("student_profile_major", major.trim());

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 2000);
  };

  const handleClearKey = () => {
    localStorage.removeItem("student_gemini_api_key");
    setApiKey("");
    alert("Gemini API 密钥已移除，应用将恢复为离线演示模式。");
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Intro */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">智能代理设置</h1>
        <p className="text-xs text-text-secondary">配置个人资料并关联 Gemini API 密钥，以启用实时智能代理推理。</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        
        {/* Profile Card */}
        <div className="glass-card rounded-2xl border p-6 bg-bg-card space-y-6">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 border-b border-border-card/30 pb-3">
            <User className="h-4.5 w-4.5 text-primary" />
            学生资料
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
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
              {saved ? (
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

        {/* API Key Panel */}
        <div className="glass-card rounded-2xl border p-6 bg-bg-card space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 border-b border-border-card/30 pb-3">
              <Key className="h-4.5 w-4.5 text-secondary animate-pulse" />
              Gemini API 访问密钥
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">Gemini API 密钥</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="input-field w-full"
              />
              <p className="text-[10px] text-text-muted">API 密钥仅缓存在浏览器本地存储中，不会保存到外部数据库。</p>
            </div>

            <div className="flex gap-2 items-start bg-yellow-500/10 border border-yellow-500/25 p-3.5 rounded-xl text-[10px] text-yellow-300">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">离线演示模式说明：</span>
                <p className="mt-1">如果未提供 API 密钥，或后端服务器没有配置密钥，应用将使用根据输入生成的结构化模拟内容运行。如需体验实时大模型推理，请在上方填写 Gemini 密钥。</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border-card/25">
            <button
              onClick={handleSave}
              className="flex-1 bg-primary hover:bg-primary-hover font-semibold text-xs text-white py-2.5 rounded-xl transition cursor-pointer"
            >
              {saved ? "已更新！" : "更新 API 密钥"}
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
