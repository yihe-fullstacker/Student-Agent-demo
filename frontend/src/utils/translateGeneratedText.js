const literalReplacements = {
  "Fundamental concepts": "基础概念",
  "Fundamentals & Fundamental concepts": "基础与核心概念",
  "Practice Exams & Revision": "练习题与阶段复习",
  "Week 1 Benchmark": "第一周基准测试",
  "End of Week 1": "第一周结束",
  "Weak Topics Mastery": "薄弱主题掌握",
  "Exam Readiness": "考试备考准备",
  "3 Days before Exam": "考试前 3 天",
  "Introduction & Core Fundamentals": "入门与核心基础",
  "Intermediate Concepts & Structuring": "进阶概念与知识结构",
  "Advanced Implementation & Practice": "高级实践与项目应用",
  "Mock Testing & Final Review": "模拟测试与最终复习",
};

const replacements = [
  [/^Deep dive into (.+)$/i, "深入学习 $1"],
  [/^Comprehensive revision of (.+)$/i, "$1 综合复习"],
  [/^Extended study of (.+)$/i, "$1 拓展学习"],
  [/^End of Week (\d+)$/i, "第 $1 周结束"],
  [/^Master (.+) and complete practice exercises\.$/i, "掌握 $1，并完成练习题。"],
  [/^Read study guides or textbooks on (.+)$/i, "阅读关于 $1 的学习指南或教材"],
  [/^Solve 5 practice problems on (.+)$/i, "完成 5 道关于 $1 的练习题"],
  [/^Write summary notes for (.+)$/i, "为 $1 整理总结笔记"],
  [/^Complete fundamentals of (.+) and solve introductory assignments\.$/i, "完成 $1 的基础内容并解答入门练习。"],
  [/^Complete review and exercises for weak topics: (.+)\.$/i, "复习并完成以下薄弱主题的练习：$1。"],
  [/^Achieve >80% on mock quizzes and complete the revision checklist\.$/i, "模拟测验正确率达到 80% 以上，并完成复习清单。"],
  [/^Review summary notes for all key chapters of (.+)$/i, "复习 $1 各重点章节的总结笔记"],
  [/^Spend extra time reviewing notes on (.+)$/i, "额外安排时间复习以下主题笔记：$1"],
  [/^Take at least two full-length mock exams$/i, "至少完成两套完整的模拟考试"],
  [/^Ensure all formulas and definitions are memorized$/i, "确保熟记所有公式和定义"],
  [/^Review mistake logs from practice quizzes$/i, "回顾练习测验中的错题记录"],
  [/^Fundamentals & Fundamental concepts - Section (\d+)$/i, "基础与核心概念 - 第 $1 节"],
  [/^Fundamentals & (.+) - Section (\d+)$/i, "$1 基础 - 第 $2 节"],
  [/^(.+) - Section (\d+)$/i, "$1 - 第 $2 节"],
];

const embeddedReplacements = [
  [/Fundamentals & Fundamental concepts/gi, "基础与核心概念"],
  [/Fundamental concepts/gi, "基础概念"],
  [/\bSection (\d+)\b/gi, "第 $1 节"],
];

export function translateGeneratedText(text) {
  if (!text) return text;
  if (literalReplacements[text]) return literalReplacements[text];

  const matched = replacements.find(([pattern]) => pattern.test(text));
  let translated = matched ? text.replace(matched[0], matched[1]) : text;
  embeddedReplacements.forEach(([pattern, replacement]) => {
    translated = translated.replace(pattern, replacement);
  });
  return translated;
}
