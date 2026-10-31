import React, { useState } from "react";
import { 
  Sparkles, 
  Loader2, 
  Briefcase, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  Map, 
  Compass, 
  Clock 
} from "lucide-react";
import { apiService } from "../services/api";

export default function CareerGuidance() {
  // Form states
  const [career, setCareer] = useState("");
  const [academicLevel, setAcademicLevel] = useState("University");
  
  const [interests, setInterests] = useState([]);
  const [interestInput, setInterestInput] = useState("");
  
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");

  // Result state
  const [loading, setLoading] = useState(false);
  const [careerData, setCareerData] = useState(null);

  const addInterest = (e) => {
    e.preventDefault();
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setInterests([...interests, interestInput.trim()]);
      setInterestInput("");
    }
  };

  const removeInterest = (item) => {
    setInterests(interests.filter((i) => i !== item));
  };

  const addSkill = (e) => {
    e.preventDefault();
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (item) => {
    setSkills(skills.filter((s) => s !== item));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!career) return;

    setLoading(true);

    try {
      const res = await apiService.generateCareerGuidance({
        interests: interests.length > 0 ? interests : ["Tech", "Coding"],
        target_career: career,
        current_skills: skills.length > 0 ? skills : ["Computers"],
        academic_level: academicLevel
      });
      setCareerData(res);
      
      // Save context
      localStorage.setItem("career_target", career);
    } catch (err) {
      console.error(err);
      alert("Error mapping career path. Please check settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Intro */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Career Guidance Agent</h1>
        <p className="text-xs text-text-secondary">Analyze skill gaps, plan structured learning paths, and discover portfolio focus strategies matching your interests.</p>
      </div>

      {loading ? (
        /* Loading skeleton */
        <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[300px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary font-bold">Agent is surveying job roadmaps...</h3>
            <p className="text-xs text-text-muted mt-1">Cross-referencing global career requirements and filtering learning links.</p>
          </div>
        </div>
      ) : careerData ? (
        /* Guidance breakdown */
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Timeline Roadmap & Advice (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timeline phase blocks */}
            <div className="glass-card rounded-2xl border p-6 bg-bg-card space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-border-card/30">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Map className="h-4.5 w-4.5 text-primary" />
                  Development Roadmap for {careerData.target_career}
                </h3>
                <button
                  onClick={() => setCareerData(null)}
                  className="text-xs bg-bg-card-hover border border-border-card hover:text-text-primary px-3 py-1.5 rounded-xl text-text-secondary transition cursor-pointer"
                >
                  Edit profile
                </button>
              </div>

              {/* Phases */}
              <div className="relative pl-6 border-l border-border-card/60 ml-3 space-y-8">
                {careerData.roadmap.map((phase, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle icon */}
                    <div className="absolute -left-[35px] top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/50">
                      <Clock className="h-3 w-3" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h4 className="text-xs font-bold text-text-primary">{phase.phase_name}</h4>
                        <span className="text-[9px] bg-primary/10 border border-primary/25 text-primary font-bold px-2 py-0.5 rounded-full">
                          {phase.duration}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary leading-normal">{phase.description}</p>

                      {/* Skills to learn */}
                      <div className="space-y-1 pt-1.5">
                        <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block">Key topics to study:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {phase.skills_to_learn.map((sk, sIdx) => (
                            <span key={sIdx} className="text-[9px] bg-bg-dark/60 text-text-secondary px-2.5 py-1 border border-border-card/40 rounded-lg">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Resources */}
                      <div className="pt-2 border-t border-border-card/10 flex flex-wrap gap-2 items-center text-[10px]">
                        <span className="text-text-muted font-semibold">Recommended Resources:</span>
                        {phase.resources.map((res, rIdx) => (
                          <span key={rIdx} className="bg-secondary/10 border border-secondary/25 text-secondary px-2 py-0.5 rounded-md font-medium">
                            {res}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Internship portfolio advice */}
            <div className="glass-card rounded-2xl border p-6 bg-bg-card space-y-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 pb-3 border-b border-border-card/30">
                <Compass className="h-4.5 w-4.5 text-secondary" />
                Portfolio Strategies & Roles
              </h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {careerData.internship_recommendations.map((adv, idx) => (
                  <div key={idx} className="bg-bg-dark/30 border border-border-card/60 p-4 rounded-xl space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-text-primary leading-tight">{adv.role_title}</h4>
                      <p className="text-[10px] text-text-muted mt-0.5">Required: {adv.required_skills.join(", ")}</p>
                    </div>
                    <div className="bg-bg-card border border-border-card/40 p-2.5 rounded-lg">
                      <span className="text-[8px] font-bold text-primary uppercase block mb-1">Portfolio Pitch:</span>
                      <p className="text-[10px] text-text-secondary leading-normal">{adv.project_focus}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Skill gaps sidebar list (Right 1 col) */}
          <div className="space-y-6">
            <div className="glass-card rounded-2xl border p-6 bg-bg-card space-y-4">
              <div>
                <h3 className="text-sm font-bold text-text-primary pb-1">Skills Gap Analysis</h3>
                <p className="text-[10px] text-text-muted leading-relaxed">We cross-referenced your skills against typical requirements for {careerData.target_career}.</p>
              </div>

              <div className="space-y-3 pt-2 border-t border-border-card/20">
                {careerData.skills_gap_analysis.map((sk, idx) => (
                  <div key={idx} className="flex flex-col gap-1 border-b border-border-card/10 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-primary">{sk.skill_name}</span>
                      {sk.status === "Acquired" ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-success">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Acquired
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-warning">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Gap
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-text-secondary leading-normal">{sk.action_item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Industry focus */}
            <div className="glass-card rounded-2xl border p-6 bg-bg-card space-y-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 pb-2 border-b border-border-card/30">
                <Briefcase className="h-4.5 w-4.5 text-warning" />
                Active Hiring Sectors
              </h3>
              <ul className="space-y-2">
                {careerData.industries_hiring.map((ind, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                    <span>{ind}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      ) : (
        /* Form view */
        <div className="glass-card rounded-2xl border p-6 bg-bg-card max-w-xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border-card/30 pb-3">
              <Briefcase className="h-5 w-5 text-primary" />
              Analyze Career Target
            </h3>

            {/* Target Role input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Dream Career Role</label>
              <input
                type="text"
                required
                value={career}
                onChange={(e) => setCareer(e.target.value)}
                placeholder="e.g. AI Engineer, React Frontend Developer, Data Analyst"
                className="input-field"
              />
            </div>

            {/* Student Level */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Your Academic Category</label>
              <select
                value={academicLevel}
                onChange={(e) => setAcademicLevel(e.target.value)}
                className="input-field bg-bg-dark"
              >
                <option value="Polytechnic">Polytechnic Student</option>
                <option value="University">University Student</option>
                <option value="Self-Learner">Self-Learner / Bootcamp Grad</option>
                <option value="Job Seeker">Active Job Seeker</option>
              </select>
            </div>

            {/* Current Skills list tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Current Skills (What you already know)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="e.g. Python, SQL, HTML, Git"
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/35 transition px-3 rounded-lg flex items-center justify-center font-bold text-xs"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 bg-bg-dark/40 border border-border-card/50 p-2.5 rounded-xl">
                  {skills.map((skill, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center gap-1 bg-primary/10 border border-primary/25 text-primary text-xs font-semibold px-2.5 py-1 rounded-lg"
                    >
                      {skill}
                      <button 
                        type="button" 
                        onClick={() => removeSkill(skill)}
                        className="text-text-secondary hover:text-accent font-bold"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Interests list tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Interests / Fields of Curiosity</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  placeholder="e.g. Finance, Healthcare, Gaming, Security"
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={addInterest}
                  className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/35 transition px-3 rounded-lg flex items-center justify-center font-bold text-xs"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 bg-bg-dark/40 border border-border-card/50 p-2.5 rounded-xl">
                  {interests.map((interest, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center gap-1 bg-secondary/10 border border-secondary/25 text-secondary text-xs font-semibold px-2.5 py-1 rounded-lg"
                    >
                      {interest}
                      <button 
                        type="button" 
                        onClick={() => removeInterest(interest)}
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
              Analyze Skills Gap & Map Path
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
