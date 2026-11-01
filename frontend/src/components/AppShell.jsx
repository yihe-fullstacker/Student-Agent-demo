import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { PATHS, appPath, sectionIdFromSegment } from "../routes/paths";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ChatBot from "./ChatBot";

// Pages
import Home from "../pages/Home";
import Dashboard from "../pages/Dashboard";
import StudyPlanner from "../pages/StudyPlanner";
import ExamPrep from "../pages/ExamPrep";
import CareerGuidance from "../pages/CareerGuidance";
import ProjectRecommend from "../pages/ProjectRecommend";
import Settings from "../pages/Settings";

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.replace(/^\/app\/?/, "").split("/")[0];
  const currentPage = sectionIdFromSegment(segment);
  const setCurrentPage = (id) => navigate(appPath(id));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!currentPage) return <Navigate to={PATHS.APP} replace />;

  const renderActivePage = () => {
    switch (currentPage) {
      case "home":
        return <Home setCurrentPage={setCurrentPage} />;
      case "dashboard":
        return <Dashboard setCurrentPage={setCurrentPage} />;
      case "planner":
        return <StudyPlanner />;
      case "examprep":
        return <ExamPrep />;
      case "career":
        return <CareerGuidance />;
      case "projects":
        return <ProjectRecommend />;
      case "settings":
        return <Settings />;
      default:
        return <Home setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-dark text-text-primary">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Bar */}
        <Header currentPage={currentPage} toggleSidebar={toggleSidebar} />

        {/* Dynamic Page Viewer */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-6xl">
            {renderActivePage()}
          </div>
        </main>
      </div>

      {/* Persistent Academic Chat Assistant */}
      <ChatBot />
    </div>
  );
}
