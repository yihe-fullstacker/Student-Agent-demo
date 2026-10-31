import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ChatBot from "./components/ChatBot";

// Pages
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import StudyPlanner from "./pages/StudyPlanner";
import ExamPrep from "./pages/ExamPrep";
import CareerGuidance from "./pages/CareerGuidance";
import ProjectRecommend from "./pages/ProjectRecommend";
import Settings from "./pages/Settings";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

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
