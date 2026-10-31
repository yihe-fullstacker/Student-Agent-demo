import React, { useState, useEffect } from "react";
import { Sparkles, Key, User, BookOpen, Check, ShieldAlert } from "lucide-react";

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [profileName, setProfileName] = useState("Success Explorer");
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

    localStorage.setItem("student_profile_name", profileName.trim() || "Success Explorer");
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
    alert("Gemini API Key removed. The app will return to Offline Demo Mode.");
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Intro */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Agent Settings</h1>
        <p className="text-xs text-text-secondary">Configure your user profile and link your Gemini API key to activate live agent reasoning.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        
        {/* Profile Card */}
        <div className="glass-card rounded-2xl border p-6 bg-bg-card space-y-6">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 border-b border-border-card/30 pb-3">
            <User className="h-4.5 w-4.5 text-primary" />
            Student Credentials
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Full Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="input-field"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Institution / College</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. Polytechnic of Technology"
                className="input-field"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Academic Major</label>
              <input
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="e.g. Software Engineering"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover font-semibold text-xs text-text-primary py-2.5 rounded-xl shadow-md transition cursor-pointer"
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  Profile Saved Successfully!
                </>
              ) : (
                "Save Credentials"
              )}
            </button>
          </form>
        </div>

        {/* API Key Panel */}
        <div className="glass-card rounded-2xl border p-6 bg-bg-card space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 border-b border-border-card/30 pb-3">
              <Key className="h-4.5 w-4.5 text-secondary animate-pulse" />
              Gemini API Access Key
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">Gemini API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="input-field w-full"
              />
              <p className="text-[10px] text-text-muted">Your API key is cached locally in your secure browser storage. It is never stored on external databases.</p>
            </div>

            <div className="flex gap-2 items-start bg-yellow-500/10 border border-yellow-500/25 p-3.5 rounded-xl text-[10px] text-yellow-300">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Offline Demo Mode Notice:</span>
                <p className="mt-1">If no API key is specified (or if the backend server lacks a key), the application operates in demo mode using highly structured mock content tailored to your inputs. To experience active LLM reasoning, paste a Gemini key above.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border-card/25">
            <button
              onClick={handleSave}
              className="flex-1 bg-primary hover:bg-primary-hover font-semibold text-xs text-text-primary py-2.5 rounded-xl transition cursor-pointer"
            >
              {saved ? "Updated!" : "Update API Key"}
            </button>
            {apiKey && (
              <button
                onClick={handleClearKey}
                className="bg-accent/15 border border-accent/20 hover:bg-accent/25 text-accent font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                Clear Key
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
