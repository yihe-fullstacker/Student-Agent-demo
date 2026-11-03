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
      const wt = req.weak_topics && req.weak_topics.length > 0 ? req.weak_topics : ["核心原理"];

      const weekly_schedule = Array.from({ length: weeks }, (_, wIndex) => {
        const weekNum = wIndex + 1;
        const mainTopic = wIndex === 0 
          ? `${sub}基础`
          : wIndex === weeks - 1 
            ? "模拟考试与主动回忆"
            : `${sub}进阶与薄弱环节（${wt[wIndex % wt.length]}）`;
            
        return {
          week_number: weekNum,
          weekly_goal: `深入理解“${mainTopic}”，并完成应用练习。`,
          days: [
            {
              day_name: "周一",
              topic: mainTopic,
              subtopics: [`${mainTopic}基础`, "核心定义"],
              duration_hours: req.daily_hours,
              priority: "高",
              activities: [`阅读“${mainTopic}”的课堂笔记`, "用学习卡片整理关键定义"]
            },
            {
              day_name: "周三",
              topic: mainTopic,
              subtopics: [`${mainTopic}的实际应用`],
              duration_hours: req.daily_hours,
              priority: "高",
              activities: [`完成 5 道关于“${mainTopic}”的练习`, "借助参考教材解决疑难问题"]
            },
            {
              day_name: "周五",
              topic: mainTopic,
              subtopics: [`${mainTopic}与薄弱环节复习`],
              duration_hours: req.daily_hours,
              priority: "中",
              activities: [`完成“${mainTopic}”的限时主动回忆测验`, "更新错题记录"]
            }
          ]
        };
      });

      return {
        subject_name: sub,
        weekly_schedule,
        milestones: [
          {
            title: "基础巩固",
            target_date: "第一周结束",
            description: `复习 ${sub} 的教学大纲并掌握入门内容。`
          },
          {
            title: "薄弱环节强化",
            target_date: `第 ${Math.ceil(weeks / 2)} 周结束`,
            description: `完成以下薄弱主题的深入复习与测验：${wt.join("、")}。`
          },
          {
            title: "完整模拟测评",
            target_date: "考试前 3 天",
            description: "在限时条件下完成往年试卷，并达到 85% 以上。"
          }
        ],
        exam_readiness_checklist: [
          `整理 ${sub} 的所有重点公式与推导过程`,
          `重新完成与以下薄弱主题相关的作业题：${wt.slice(0, 3).join("、")}`,
          "在安静环境中完成一次限时模拟考试",
          "考前一晚保证至少 8 小时睡眠"
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
# 学习指南：${topic}
本概要适合 **${req.difficulty}** 阶段的学习者。

## 核心理论
* **主要范式**：理解该主题分析数据模式或系统状态的基本原理。
* **模块化组成**：将复杂主题拆分为独立的小模块，便于理解和排错。
* **泛化能力**：学习目标不仅是掌握教材示例，还要能把知识应用到新场景。

## 复习建议
1. 使用**主动回忆**，在不查看参考资料的情况下画出系统结构图。
2. 建立简单的模拟接口或方程，验证参数在极端情况下的变化。
        `,
        important_questions: [
          {
            question: `支配 ${topic} 的三条最基本规则是什么？`,
            sample_answer: `三条核心规则如下：
1. **简约原则**：在能够解释数据的前提下，最简单的方案通常最有效。
2. **一致性原则**：数据输入和格式应保持一致。
3. **验证原则**：学习示例与测试示例必须分开。`
          },
          {
            question: `学生如何验证自己已经掌握 ${topic} 的实践概念？`,
            sample_answer: `当你能够用简单语言向同伴讲解该主题（费曼学习法）、在不查阅指南的情况下独立编写代码或公式，并能诊断已有示例中的错误时，就说明已经掌握。`
          }
        ],
        quizzes: Array.from({ length: req.number_of_questions || 3 }, (_, i) => ({
          id: i + 1,
          question: `在 ${topic} 中，哪一项对保证系统准确性最关键？`,
          options: [
            "只反复记忆，从不进行测试",
            "使用经过验证的高质量学习资源，并主动进行模拟测试",
            "使用过时的代码语法编写脚本",
            "只把资料保存在纯文本文件夹中"
          ],
          correct_answer_index: 1,
          explanation: "高质量数据、结构化的主动测试和验证，能够显著提升长期记忆效果与实际应用能力。"
        })),
        checklist: [
          `阅读 ${topic} 的结构化知识概要`,
          "使用费曼学习法讲解核心概念",
          "完成全部互动选择题",
          "复习重点问题的参考答案"
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
            ? "已经掌握该技能，可通过复杂项目进一步巩固并展示在作品集中。"
            : `通过官方文档学习 ${s} 基础知识，并完成一个专项练习项目。`
        };
      });

      return {
        target_career: career,
        skills_gap_analysis,
        roadmap: [
          {
            phase_name: "第一阶段：技术基础",
            duration: "第 1-4 周",
            description: "学习编程语言核心语法、Git 协作流程和本地开发环境的基础知识。",
            skills_to_learn: skills.slice(0, 2),
            resources: ["freeCodeCamp 基础教程", "Git 官方交互式指南"]
          },
          {
            phase_name: "第二阶段：项目架构",
            duration: "第 5-8 周",
            description: "集成数据库操作并构建 REST API，实现数据记录的读取与管理。",
            skills_to_learn: skills.slice(2, 4),
            resources: ["FastAPI / Express 官方教程", "SQLBolt 互动课程"]
          },
          {
            phase_name: "第三阶段：测试与云端部署",
            duration: "第 9-12 周",
            description: "编写基础单元测试、使用 Docker 配置运行环境，并将应用部署上线。",
            skills_to_learn: skills.slice(4),
            resources: ["Render 部署检查清单", "Jest/Pytest 测试入门"]
          }
        ],
        internship_recommendations: [
          {
            role_title: `${career} 初级实习生`,
            required_skills: skills.slice(0, 3),
            project_focus: `围绕 ${req.interests.join("、")} 构建带数据库持久化功能的网页仪表盘。`
          },
          {
            role_title: "开源技术贡献者",
            required_skills: ["Git", "Code documentation"],
            project_focus: "为热门开源项目提交缺陷修复和文档改进。"
          }
        ],
        industries_hiring: ["金融科技公司", "软件即服务初创企业", "医疗信息技术团队", "数字设计机构"]
      };
    });
  },

  // 4. Generate Project Recommendations
  generateProjectRecommendations: async (payload) => {
    return postRequest("/api/projects", payload, (req) => {
      const dom = req.domain;
      const domainLabels = {
        "Web Development": "网页开发",
        "AI & Machine Learning": "人工智能与机器学习",
        "Software Engineering": "软件工程",
        "Mobile Applications": "移动应用",
      };
      const domainName = domainLabels[dom] || dom;
      const stack = req.tech_stack && req.tech_stack.length > 0 ? req.tech_stack : ["HTML", "JS", "CSS"];
      const stack_str = stack.join(", ");
      
      return {
        projects: [
          {
            title: `智学助手 - ${domainName}智能应用`,
            difficulty: req.difficulty,
            description: `使用 ${stack_str} 构建的响应式学生仪表盘，用于简化日常学习管理任务。`,
            key_features: [
              "响应式学生仪表盘",
              "使用本地存储管理学习笔记",
              "集成外部接口服务",
              "用结构化图表展示每周进度"
            ],
            suggested_tech_stack: stack,
            implementation_milestones: [
              {
                title: "初始化项目并搭建界面",
                target_date: "第一阶段",
                description: "创建页面结构、设置网格样式并完成导航面板。"
              },
              {
                title: "接入本地状态管理",
                target_date: "第二阶段",
                description: "编写本地存储逻辑，保存设置、用户资料和笔记内容。"
              },
              {
                title: "接口调用与项目部署",
                target_date: "第三阶段",
                description: "连接后端接口，并将构建产物部署到 Web 服务器。"
              }
            ],
            readme_template: `
# 智学助手 - ${domainName}智能应用
一个面向学生的高质量作品集项目，难度级别为 **${req.difficulty}**。

## 技术栈
* **前端技术**：${stack.join(" / ")}
* **部署平台**：GitHub Pages / Vercel

## 核心功能
* 响应式仪表盘布局
* 使用 LocalStorage 提供离线支持
* 简洁流畅的页面交互

## 运行方式
1. 克隆项目：\`git clone https://github.com/example/edusmart.git\`
2. 在浏览器中打开 \`index.html\`，或运行 \`npm run dev\`
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

      if (msg.includes("hi") || msg.includes("hello") || msg.includes("你好")) {
        reply = "你好！我是你的**学业与职业成功助手**，可以协助你制定学习计划、准备考试、规划职业路线和选择作品集项目。";
        questions = ["如何制定学习计划？", "目前有哪些热门职业方向？", "我可以做哪些项目？"];
      } else if (msg.includes("plan") || msg.includes("schedule") || msg.includes("计划") || msg.includes("学习")) {
        reply = "结构化的学习安排可以减少焦虑并提升记忆效果。你可以进入侧边栏的**学习计划**页面，填写科目和考试日期，我会生成每日清单。也可以使用**间隔重复**提升复习效果。";
        questions = ["什么是间隔重复？", "如何缓解考试压力？", "建议采用怎样的学习间隔？"];
      } else if (msg.includes("career") || msg.includes("job") || msg.includes("职业") || msg.includes("工作")) {
        reply = "请进入**职业指导**页面，填写兴趣和当前技能水平。我会生成个性化成长路线，并分析你需要补齐的**技能差距**。";
        questions = ["哪些项目适合写进简历？", "如何准备技术面试？", "网页开发需要哪些技能？"];
      } else {
        reply = "坚持练习和结构化规划是取得学业成功的关键。可以尝试把学习时间拆分为 25 分钟一个周期（番茄工作法），并通过小型项目练习所学概念。如果你需要某个具体科目的帮助，可以继续告诉我。";
        questions = ["介绍一下番茄工作法", "有哪些适合学生的项目？", "请解释主动回忆。"];
      }

      return {
        reply,
        suggested_questions: questions
      };
    });
  }
};
