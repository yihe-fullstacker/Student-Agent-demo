// API Client service for communicating with FastAPI Backend
// with local mock failover in case the backend server is offline.

const DEFAULT_API_URL = "http://localhost:8000";
const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

// Helper to get headers with dynamic Gemini API Key from localStorage
const getHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
  };
  const key = localStorage.getItem("student_gemini_api_key");
  if (key) {
    headers["X-Gemini-API-Key"] = key;
  }
  return headers;
};

// Generic post request with automatic mock fallback on failure
async function postRequest(endpoint, payload, mockFallback) {
  try {
    console.log(`Sending request to backend: ${API_URL}${endpoint}`);
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`Backend connection failed for ${endpoint}. Using frontend client mock fallback. Details:`, error.message);
    
    // Simulate loading delay for a realistic AI feel
    await new Promise((resolve) => setTimeout(resolve, 800));
    return mockFallback(payload);
  }
}

export const apiService = {
  // 1. Generate Study Plan
  generateStudyPlan: async (payload) => {
    return postRequest("/api/planner", payload, (req) => {
      // Calculate weeks until exam
      let weeks = 4;
      try {
        const days = Math.ceil((new Date(req.exam_date) - new Date()) / (1000 * 60 * 60 * 24));
        weeks = days > 0 ? Math.min(Math.max(1, Math.ceil(days / 7)), 8) : 4;
      } catch (e) {}

      const sub = req.subject_name;
      const wt = req.weak_topics && req.weak_topics.length > 0 ? req.weak_topics : ["Core Principles"];

      const weekly_schedule = Array.from({ length: weeks }, (_, wIndex) => {
        const weekNum = wIndex + 1;
        const mainTopic = wIndex === 0 
          ? `Foundations of ${sub}` 
          : wIndex === weeks - 1 
            ? "Mock Exams & Active Recall" 
            : `Advanced ${sub} & Weak Areas (${wt[wIndex % wt.length]})`;
            
        return {
          week_number: weekNum,
          weekly_goal: `Develop solid comprehension of ${mainTopic} and solve application exercises.`,
          days: [
            {
              day_name: "Monday",
              topic: mainTopic,
              subtopics: [`${mainTopic} Fundamentals`, "Definitions"],
              duration_hours: req.daily_hours,
              priority: "High",
              activities: [`Study lecture notes on ${mainTopic}`, `Write out key definitions in flashcard format`]
            },
            {
              day_name: "Wednesday",
              topic: mainTopic,
              subtopics: [`Practical application of ${mainTopic}`],
              duration_hours: req.daily_hours,
              priority: "High",
              activities: [`Solve 5 workbook exercises on ${mainTopic}`, `Address doubts using reference textbooks`]
            },
            {
              day_name: "Friday",
              topic: mainTopic,
              subtopics: [`Review of ${mainTopic} and weak spots`],
              duration_hours: req.daily_hours,
              priority: "Medium",
              activities: [`Complete a timed active recall quiz on ${mainTopic}`, `Update mistake tracker log`]
            }
          ]
        };
      });

      return {
        subject_name: sub,
        weekly_schedule,
        milestones: [
          {
            title: "Basics Consolidation",
            target_date: "End of Week 1",
            description: `Review syllabus and master introductory material for ${sub}.`
          },
          {
            title: "Weak Spots Target",
            target_date: `End of Week ${Math.ceil(weeks / 2)}`,
            description: `Deep dive revision and quizzes completed for weak topics: ${wt.join(", ")}.`
          },
          {
            title: "Full Mock Assessment",
            target_date: "3 Days before Exam",
            description: "Solve past-year exam paper under timed conditions and score above 85%."
          }
        ],
        exam_readiness_checklist: [
          `Summarize all key formulas and derivations in ${sub}`,
          `Re-solve homework questions related to weak topics: ${wt.slice(0, 3).join(", ")}`,
          "Simulate a quiet, timed mock exam",
          "Ensure healthy sleep of at least 8 hours the night before"
        ]
      };
    });
  },

  // 2. Generate Exam Prep Material
  generateExamPrep: async (payload) => {
    return postRequest("/api/exam-prep", payload, (req) => {
      const topic = req.topic;
      return {
        topic,
        summary: `
# Study Guide: ${topic}
This summary is tailored for **${req.difficulty}** level studies.

## Key Theoretical Concepts
* **Primary Paradigm**: This subject establishes structured principles to analyze data patterns or system states.
* **Component Modularity**: Breaking down complex topics into distinct, smaller components ensures easier troubleshooting.
* **Generalization**: The ultimate goal is ensuring the models/concepts apply to new, unseen scenarios, not just textbook examples.

## Revision Tips
1. Use **active recall** to sketch the system diagram without looking at reference materials.
2. Build simple mock interfaces or equations to verify how parameters behave under extremes.
        `,
        important_questions: [
          {
            question: `What are the three most fundamental rules governing ${topic}?`,
            sample_answer: `The three rules are: 
1. **Rule of Parsimony**: The simplest explanation or architecture that fits the data is usually best.
2. **Rule of Consistency**: Data inputs and formatting must remain uniform across files.
3. **Rule of Validation**: Always separate your training/study examples from your test/assessment examples.`
          },
          {
            question: `Explain how a student can verify their mastery of ${topic} practical concepts.`,
            sample_answer: `Mastery is verified when you can teach the topic to a peer in simple terms (Feynman Technique), write clean code/formulas from scratch without looking up guides, and diagnose errors in pre-existing broken examples.`
          }
        ],
        quizzes: Array.from({ length: req.number_of_questions || 3 }, (_, i) => ({
          id: i + 1,
          question: `In context of ${topic}, which factor is the most crucial for ensuring system accuracy?`,
          options: [
            "Continuous memorization without testing",
            "High quality, validated learning resources and active mock testing",
            "Writing scripts in outdated coding syntaxes",
            "Storing resources in plain text folders only"
          ],
          correct_answer_index: 1,
          explanation: "High quality data, structured active testing, and validation are proven to yield the best long-term retention and application scores."
        })),
        checklist: [
          `Read the structured summary for ${topic}`,
          "Explain the Feynman technique for the core concept",
          "Complete all interactive multiple-choice quiz questions",
          "Review sample answers for important questions"
        ]
      };
    });
  },

  // 3. Generate Career Guidance
  generateCareerGuidance: async (payload) => {
    return postRequest("/api/career", payload, (req) => {
      const career = req.target_career;
      const skills = ["Systems Design", "Data Structures", "Database Management", "Git Version Control", "REST API Development", "Testing & QA"];
      
      const skills_gap_analysis = skills.map((s, index) => {
        const isAcquired = req.current_skills.some(cs => cs.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(cs.toLowerCase()));
        return {
          skill_name: s,
          status: isAcquired ? "Acquired" : "Gap",
          action_item: isAcquired 
            ? "Already proficient. Build complex projects using this skill to display on portfolio." 
            : `Set up a dedicated project to learn ${s} fundamentals using official documentation.`
        };
      });

      return {
        target_career: career,
        skills_gap_analysis,
        roadmap: [
          {
            phase_name: "Phase 1: Basic Technical Foundations",
            duration: "Weeks 1-4",
            description: "Learn core scripting language syntaxes, git workflow, and basics of local coding environments.",
            skills_to_learn: skills.slice(0, 2),
            resources: ["freeCodeCamp basics tutorials", "git-scm interactive guides"]
          },
          {
            phase_name: "Phase 2: Project Architecture",
            duration: "Weeks 5-8",
            description: "Integrate database operations and construct REST APIs to handle database records.",
            skills_to_learn: skills.slice(2, 4),
            resources: ["FastAPI / Express Official Tutorial docs", "SQLBolt interactive lessons"]
          },
          {
            phase_name: "Phase 3: Testing & Cloud Deployments",
            duration: "Weeks 9-12",
            description: "Write basic unit tests, dockerize the environment, and deploy applications live.",
            skills_to_learn: skills.slice(4),
            resources: ["Render deployment checklist", "Jest/Pytest testing introductions"]
          }
        ],
        internship_recommendations: [
          {
            role_title: `Junior ${career} Intern`,
            required_skills: skills.slice(0, 3),
            project_focus: `Build a web dashboard matching interests in ${req.interests.join(", ")} with database persistence.`
          },
          {
            role_title: "Open Source Tech Contributor",
            required_skills: ["Git", "Code documentation"],
            project_focus: "Submit pull requests fixing minor bugs and writing documentation in popular community repositories."
          }
        ],
        industries_hiring: ["FinTech Companies", "SaaS Startups", "Healthcare IT Teams", "Digital Design Agencies"]
      };
    });
  },

  // 4. Generate Project Recommendations
  generateProjectRecommendations: async (payload) => {
    return postRequest("/api/projects", payload, (req) => {
      const dom = req.domain;
      const stack = req.tech_stack && req.tech_stack.length > 0 ? req.tech_stack : ["HTML", "JS", "CSS"];
      const stack_str = stack.join(", ");
      
      return {
        projects: [
          {
            title: `EduSmart - Intelligent ${dom} Assistant`,
            difficulty: req.difficulty,
            description: `A responsive student-targeted dashboard built with ${stack_str} that simplifies school administration tasks.`,
            key_features: [
              "Responsive grid user dashboard",
              "Local storage notes management widget",
              "External APIs integrations",
              "Structured charts visualizing weekly progress metrics"
            ],
            suggested_tech_stack: stack,
            implementation_milestones: [
              {
                title: "Initialize & Build UI Layout",
                target_date: "Phase 1",
                description: "Create HTML pages, integrate grid styling, and mount navigation panels."
              },
              {
                title: "Local State Integration",
                target_date: "Phase 2",
                description: "Write local storage hooks to cache settings, user profiles, and notes inputs."
              },
              {
                title: "API Calls and Deployments",
                target_date: "Phase 3",
                description: "Wire fetch requests to servers and deploy static bundle to web servers."
              }
            ],
            readme_template: `
# EduSmart - Intelligent ${dom} Assistant
A premium student portfolio project built as a **${req.difficulty}** challenge.

## Tech Stack
* **Frontend**: ${stack.join(" / ")}
* **Hosting**: GitHub Pages / Vercel

## Key Features
* Responsive UI Dashboard Grid
* Offline support via LocalStorage
* Clean layout with smooth transitions

## How to Run
1. Clone the project: \`git clone https://github.com/example/edusmart.git\`
2. Open \`index.html\` in browser or run \`npm run dev\`
            `
          }
        ]
      };
    });
  },

  // 5. Conversational Academic Chat Assistant
  sendChatMessage: async (payload) => {
    return postRequest("/api/chat", payload, (req) => {
      const msg = req.message.toLowerCase();
      let reply = "";
      let questions = [];

      if (msg.includes("hi") || msg.includes("hello")) {
        reply = "Hi there! I am your **Academic and Career Success Assistant**. I'm here to support your learning journey. Ask me any question about study planning, exam preparation, career paths, or portfolios!";
        questions = ["How do I create a study planner?", "What career paths are trending?", "What projects can I build?"];
      } else if (msg.includes("plan") || msg.includes("schedule")) {
        reply = "Having a structured study schedule reduces anxiety and boosts learning retention. You can use the **Study Planner** tab on the sidebar to input your subjects and dates, and I will generate a day-by-day checklist. Try using techniques like **Spaced Repetition** for optimal outcomes.";
        questions = ["What is Spaced Repetition?", "How do I deal with exam stress?", "Suggest study intervals."];
      } else if (msg.includes("career") || msg.includes("job")) {
        reply = "For career guidance, click on the **Career Guidance** tab. Tell me your interests and current skill levels, and I'll generate a personalized roadmap and outline your **skills gaps** so you know exactly what to learn next.";
        questions = ["What projects look good on a resume?", "How do I study for tech interviews?", "Suggest skills for web dev."];
      } else {
        reply = "I understand! Consistent practice and structured planning are key to academic success. Try to break your study sessions into 25-minute blocks (Pomodoro Technique) and build small projects to practice concepts. Let me know if you need help with a specific subject.";
        questions = ["Tell me about the Pomodoro Technique", "What are good student projects?", "Explain active recall."];
      }

      return {
        reply,
        suggested_questions: questions
      };
    });
  }
};
