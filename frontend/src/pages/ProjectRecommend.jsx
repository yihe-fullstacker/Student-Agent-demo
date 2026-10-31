import React, { useState } from "react";
import { 
  Sparkles, 
  Loader2, 
  FolderGit2, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  BookOpen, 
  ListTodo, 
  Terminal
} from "lucide-react";
import { apiService } from "../services/api";

export default function ProjectRecommend() {
  // Form input states
  const [domain, setDomain] = useState("AI & Machine Learning");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [scope, setScope] = useState("Individual");
  
  const [techStack, setTechStack] = useState([]);
  const [techInput, setTechInput] = useState("");

  // Response states
  const [loading, setLoading] = useState(false);
  const [projectData, setProjectData] = useState(null);
  
  // UI states
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [activeProjectIdx, setActiveProjectIdx] = useState(0);

  const addTech = (e) => {
    e.preventDefault();
    if (techInput.trim() && !techStack.includes(techInput.trim())) {
      setTechStack([...techStack, techInput.trim()]);
      setTechInput("");
    }
  };

  const removeTech = (item) => {
    setTechStack(techStack.filter((t) => t !== item));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setActiveProjectIdx(0);
    setCopiedIndex(null);

    try {
      const res = await apiService.generateProjectRecommendations({
        domain: domain,
        difficulty: difficulty,
        tech_stack: techStack.length > 0 ? techStack : ["React", "CSS", "Vite"],
        project_scope: scope
      });

      setProjectData(res);

      // Increment recommended project count in localstorage
      try {
        const count = res.projects ? res.projects.length : 1;
        const currentCount = localStorage.getItem("saved_projects_count");
        const total = (currentCount ? parseInt(currentCount, 10) : 0) + count;
        localStorage.setItem("saved_projects_count", total.toString());
      } catch (err) {}

    } catch (err) {
      console.error(err);
      alert("Error generating recommendations. Please check settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReadme = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Intro */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Project Recommendation Agent</h1>
        <p className="text-xs text-text-secondary">Generate complete portfolio project briefs tailored to your tech stack, including features, milestones, and ready-to-use GitHub README templates.</p>
      </div>

      {loading ? (
        /* Loading skeleton */
        <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[300px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary font-bold">Agent is formulating project plans...</h3>
            <p className="text-xs text-text-muted mt-1">Assembling milestone scopes, feature specs, and formatting markdown READMEs.</p>
          </div>
        </div>
      ) : projectData ? (
        /* Results screen */
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Projects lists tabs on left column */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Recommendations</h3>
            <div className="space-y-3">
              {projectData.projects && projectData.projects.map((proj, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveProjectIdx(idx);
                    setCopiedIndex(null);
                  }}
                  className={`w-full text-left glass-card border p-4 rounded-xl transition flex flex-col gap-2 ${
                    activeProjectIdx === idx 
                      ? "border-primary bg-primary/5" 
                      : "border-border-card/60 bg-bg-card/45"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded ${
                      proj.difficulty === "Advanced" ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary"
                    }`}>
                      {proj.difficulty}
                    </span>
                    <span className="text-[9px] text-text-muted">{scope} Project</span>
                  </div>
                  <h4 className="text-xs font-bold text-text-primary line-clamp-1">{proj.title}</h4>
                  <p className="text-[10px] text-text-secondary line-clamp-2 leading-relaxed">{proj.description}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setProjectData(null)}
              className="w-full text-center text-xs font-bold border border-border-card bg-bg-card-hover text-text-secondary hover:text-text-primary py-3 rounded-xl transition cursor-pointer"
            >
              Adjust Parameters
            </button>
          </div>

          {/* Active project spec card on right 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {projectData.projects && projectData.projects[activeProjectIdx] && (
              <div className="glass-card rounded-2xl border p-6 bg-bg-card space-y-6">
                
                {/* Title block */}
                <div className="space-y-2 border-b border-border-card/30 pb-4">
                  <h2 className="text-lg font-bold text-text-primary">{projectData.projects[activeProjectIdx].title}</h2>
                  <p className="text-xs text-text-secondary leading-relaxed">{projectData.projects[activeProjectIdx].description}</p>
                </div>

                {/* Tech Stack tags */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Suggested Tech Stack</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {projectData.projects[activeProjectIdx].suggested_tech_stack.map((t, idx) => (
                      <span key={idx} className="text-[9px] font-bold bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-lg">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Key Features */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <ListTodo className="h-4 w-4 text-secondary" />
                    Core Project Features
                  </h4>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {projectData.projects[activeProjectIdx].key_features.map((feat, idx) => (
                      <li key={idx} className="flex gap-2 items-start text-xs text-text-secondary bg-bg-dark/20 p-2.5 rounded-lg border border-border-card/40">
                        <Check className="h-4 w-4 text-success shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Milestones */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Implementation Milestones
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {projectData.projects[activeProjectIdx].implementation_milestones.map((ms, idx) => (
                      <div key={idx} className="bg-bg-dark/40 border border-border-card p-3 rounded-xl flex flex-col justify-between gap-1">
                        <div>
                          <span className="text-[8px] font-bold text-secondary uppercase block">{ms.target_date}</span>
                          <h5 className="text-[10px] font-bold text-text-primary leading-tight mt-0.5">{ms.title}</h5>
                        </div>
                        <p className="text-[9px] text-text-secondary leading-normal mt-1">{ms.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* README Markdown block */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="h-4 w-4 text-success" />
                      GitHub README.md Template
                    </h4>
                    <button
                      onClick={() => handleCopyReadme(projectData.projects[activeProjectIdx].readme_template, activeProjectIdx)}
                      className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-hover border border-primary/20 bg-primary/5 hover:bg-primary/10 transition px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      {copiedIndex === activeProjectIdx ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-success" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Template
                        </>
                      )}
                    </button>
                  </div>
                  <div className="rounded-xl border border-border-card bg-bg-dark p-4 max-h-48 overflow-y-auto font-mono text-[10px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {projectData.projects[activeProjectIdx].readme_template}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      ) : (
        /* Form configuration view */
        <div className="glass-card rounded-2xl border p-6 bg-bg-card max-w-xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border-card/30 pb-3">
              <FolderGit2 className="h-5 w-5 text-primary" />
              Configure Project Advisor
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Domain select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Project Domain</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="input-field bg-bg-dark"
                >
                  <option value="Web Development">Web Development</option>
                  <option value="AI & Machine Learning">AI & Machine Learning</option>
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Mobile Applications">Mobile Applications</option>
                </select>
              </div>

              {/* Scope select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Working Scope</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="input-field bg-bg-dark"
                >
                  <option value="Individual">Individual Capstone</option>
                  <option value="Team">Team Hackathon</option>
                </select>
              </div>
            </div>

            {/* Difficulty select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Target Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="input-field bg-bg-dark"
              >
                <option value="Beginner">Beginner (Boilerplate scaffolding & storage)</option>
                <option value="Intermediate">Intermediate (APIs, charts & validation)</option>
                <option value="Advanced">Advanced (Agentic orchestration, Docker, full security)</option>
              </select>
            </div>

            {/* Tech Stack tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Tech Stack Preferences</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  placeholder="e.g. React, Python, FastAPI, Tailwind"
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={addTech}
                  className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/35 transition px-3 rounded-lg flex items-center justify-center font-bold text-xs"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {techStack.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 bg-bg-dark/40 border border-border-card/50 p-2.5 rounded-xl">
                  {techStack.map((tech, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center gap-1 bg-primary/10 border border-primary/25 text-primary text-xs font-semibold px-2.5 py-1 rounded-lg"
                    >
                      {tech}
                      <button 
                        type="button" 
                        onClick={() => removeTech(tech)}
                        className="text-text-secondary hover:text-accent font-bold"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover font-semibold text-sm text-text-primary py-3 rounded-xl shadow-lg shadow-primary/20 transition cursor-pointer"
            >
              Generate Portfolio Ideas
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
