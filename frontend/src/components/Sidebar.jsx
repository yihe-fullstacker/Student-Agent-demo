import { 
  BookOpen, 
  LayoutDashboard, 
  UserCheck,
  Calendar, 
  CheckSquare,
  ClipboardList,
  GraduationCap, 
  School,
  Settings as SettingsIcon,
  X,
  Sparkles
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export default function Sidebar({ currentPage, setCurrentPage, isOpen, toggleSidebar }) {
  const { user } = useAuth();
  const displayName = user?.nickname || user?.username || "学习探索者";
  const displaySub = user?.email || "活跃学习者";
  const menuItems = [
    { id: "home", label: "考研首页", icon: BookOpen },
    { id: "dashboard", label: "考研仪表盘", icon: LayoutDashboard },
    { id: "profile", label: "考生档案", icon: UserCheck },
    { id: "planner", label: "AI考研规划", icon: Calendar },
    { id: "today", label: "今日任务", icon: CheckSquare },
    { id: "records", label: "学习记录", icon: ClipboardList },
    { id: "examprep", label: "刷题与错题本", icon: GraduationCap },
    { id: "school", label: "择校分析", icon: School },
    { id: "settings", label: "设置", icon: SettingsIcon },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border-card bg-bg-card transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo Section */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border-card">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight text-text-primary">Smart Student</h1>
              <span className="text-xs text-secondary font-semibold">Success Agent</span>
            </div>
          </div>
          <button 
            onClick={toggleSidebar} 
            className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-card-hover hover:text-text-primary lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  if (isOpen) toggleSidebar();
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? "bg-primary text-white shadow-lg shadow-primary/25" 
                    : "text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-text-primary" : "text-text-secondary"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Card / Meta */}
        <div className="p-4 border-t border-border-card">
          <div className="flex items-center gap-3 rounded-xl bg-bg-dark/50 p-3 border border-border-card">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-secondary font-bold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-text-primary">{displayName}</p>
              <p className="truncate text-[10px] text-text-muted">{displaySub}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
