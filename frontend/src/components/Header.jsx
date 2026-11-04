import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Sparkles, AlertTriangle, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { PATHS } from "../routes/paths";
import { loadAIConfig } from "../config/aiProviders";
import { apiService } from "../services/api";

export default function Header({ currentPage, toggleSidebar }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate(PATHS.HOME, { replace: true });
  };
  const [hasApiKey, setHasApiKey] = useState(false);
  const [serverConnected, setServerConnected] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [modelName, setModelName] = useState("");
  const [serverModel, setServerModel] = useState("");
  const [studentName, setStudentName] = useState("学习探索者");

  useEffect(() => {
    // Check if the AI provider is configured in local storage
    const checkSettings = () => {
      const aiConfig = loadAIConfig();
      const name = localStorage.getItem("student_profile_name");
      setHasApiKey(!!aiConfig.apiKey);
      setProviderName(aiConfig.providerShortName || aiConfig.providerName);
      setModelName(aiConfig.model);
      if (name) setStudentName(name);
    };

    // The backend may already hold a key in its .env file
    apiService.getAIStatus().then((status) => {
      setServerConnected(!!status.configured);
      setServerModel(status.model || "");
    });

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
      case "home": return "概览";
      case "dashboard": return "学习分析";
      case "planner": return "学习计划";
      case "examprep": return "考试备考";
      case "career": return "职业指导";
      case "projects": return "项目推荐";
      case "settings": return "智能代理设置";
      default: return "学习成功智能助理";
    }
  };

  const isConnected = hasApiKey || serverConnected;
  const statusLabel = (
    hasApiKey
      ? [providerName, modelName].filter(Boolean).join(" · ")
      : serverModel
        ? `AI · ${serverModel}`
        : "AI 已连接"
  ) || "AI 已连接";

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
        {/* AI provider status */}
        <div className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs md:flex bg-bg-dark border border-border-card">
          {isConnected ? (
            <>
              <Sparkles className="h-3.5 w-3.5 text-success animate-pulse" />
              <span className="text-success font-medium">{statusLabel}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              <span className="text-warning font-medium">未配置 AI 密钥</span>
            </>
          )}
        </div>

        {/* Date indicator */}
        <div className="hidden text-xs text-text-secondary xl:block">
          {new Date().toLocaleDateString("zh-CN", { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
        </div>

        {/* Profile indicator */}
        <div className="flex items-center gap-2 border-l border-border-card pl-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-text-primary">{studentName}</p>
            <p className="text-[10px] text-text-muted">学生资料</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
            {studentName.charAt(0).toUpperCase()}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="退出登录"
            aria-label="退出登录"
            className="ml-1 flex items-center gap-1 rounded-lg border border-border-card px-2 py-1.5 text-xs text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline">退出</span>
          </button>
        </div>
      </div>
    </header>
  );
}
