import React, { useEffect, useState } from "react";
import { Menu, Bell, Sparkles, Key, AlertTriangle } from "lucide-react";

export default function Header({ currentPage, toggleSidebar }) {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [studentName, setStudentName] = useState("Success Explorer");

  useEffect(() => {
    // Check if key exists in local storage
    const checkSettings = () => {
      const key = localStorage.getItem("student_gemini_api_key");
      const name = localStorage.getItem("student_profile_name");
      setHasApiKey(!!key);
      if (name) setStudentName(name);
    };

    checkSettings();
    
    // Listen for storage changes to update live
    window.addEventListener("storage", checkSettings);
    
    // Periodic local storage polling because standard react state doesn't trigger storage event on same tab
    const interval = setInterval(checkSettings, 1000);

    return () => {
      window.removeEventListener("storage", checkSettings);
      clearInterval(interval);
    };
  }, []);

  const getPageTitle = () => {
    switch (currentPage) {
      case "home": return "Overview Dashboard";
      case "dashboard": return "My Learning Analytics";
      case "planner": return "AI Study Planner";
      case "examprep": return "Exam Prep Agent";
      case "career": return "Career Guidance Agent";
      case "projects": return "Project Recommendations";
      case "settings": return "Agent Settings";
      default: return "Smart Student Success Agent";
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-card bg-bg-card/40 px-6 backdrop-blur-md sticky top-0 z-30">
      {/* Mobile Toggle & Title */}
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar} 
          className="rounded-lg p-2 text-text-secondary hover:bg-bg-card-hover hover:text-text-primary lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-text-primary md:text-lg">{getPageTitle()}</h2>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Gemini API Key status */}
        <div className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs md:flex bg-bg-dark border border-border-card">
          {hasApiKey ? (
            <>
              <Sparkles className="h-3.5 w-3.5 text-success animate-pulse" />
              <span className="text-success font-medium">Gemini Connected</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              <span className="text-warning font-medium">Demo Mode (Mock API)</span>
            </>
          )}
        </div>

        {/* Date indicator */}
        <div className="hidden text-xs text-text-secondary xl:block">
          {new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
        </div>

        {/* Profile indicator */}
        <div className="flex items-center gap-2 border-l border-border-card pl-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-text-primary">{studentName}</p>
            <p className="text-[10px] text-text-muted">Student Profile</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
            {studentName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
