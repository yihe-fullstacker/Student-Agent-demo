import React, { useState } from "react";
import { 
  Sparkles, 
  Loader2, 
  GraduationCap, 
  HelpCircle, 
  BookOpen, 
  ListChecks, 
  Check, 
  X,
  AlertCircle
} from "lucide-react";
import { apiService } from "../services/api";

export default function ExamPrep() {
  // Form input states
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("All");
  const [numQuestions, setNumQuestions] = useState(3);
  const [difficulty, setDifficulty] = useState("Intermediate");

  // Response states
  const [loading, setLoading] = useState(false);
  const [prepData, setPrepData] = useState(null);
  
  // Interactive Quiz states
  const [selectedAnswers, setSelectedAnswers] = useState({}); // {questionId: selectedOptionIndex}
  const [activeTab, setActiveTab] = useState("summary"); // summary, quiz, questions, checklist

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic) return;

    setLoading(true);
    setSelectedAnswers({});
    setActiveTab("summary");

    try {
      const res = await apiService.generateExamPrep({
        topic: topic,
        exam_format: format,
        number_of_questions: parseInt(numQuestions, 10),
        difficulty: difficulty
      });
      setPrepData(res);
    } catch (e) {
      console.error(e);
      alert("Error generating materials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qId, optionIdx, correctIdx) => {
    // Only allow selecting once
    if (selectedAnswers[qId] !== undefined) return;
    
    const newAnswers = { ...selectedAnswers, [qId]: optionIdx };
    setSelectedAnswers(newAnswers);

    // Save score to localstorage for dashboard calculations
    if (optionIdx === correctIdx) {
      try {
        const storedScores = localStorage.getItem("quiz_scores");
        const scores = storedScores ? JSON.parse(storedScores) : [];
        scores.push(100); // 100% on this question
        localStorage.setItem("quiz_scores", JSON.stringify(scores.slice(-20))); // cache last 20 answers
      } catch (err) {}
    } else {
      try {
        const storedScores = localStorage.getItem("quiz_scores");
        const scores = storedScores ? JSON.parse(storedScores) : [];
        scores.push(0); // 0% on this question
        localStorage.setItem("quiz_scores", JSON.stringify(scores.slice(-20)));
      } catch (err) {}
    }
  };

  // Basic markdown-like renderer helper
  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("# ")) {
        return <h2 key={idx} className="text-xl font-bold text-text-primary mt-4 mb-2">{line.replace("# ", "")}</h2>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={idx} className="text-base font-bold text-text-primary mt-3 mb-1.5">{line.replace("## ", "")}</h3>;
      }
      if (line.startsWith("* ") || line.startsWith("- ")) {
        return (
          <li key={idx} className="list-disc ml-5 text-xs text-text-secondary py-0.5">
            {line.replace(/^[\*\-]\s+/, "")}
          </li>
        );
      }
      if (line.match(/^\d+\.\s+/)) {
        return (
          <li key={idx} className="list-decimal ml-5 text-xs text-text-secondary py-0.5">
            {line.replace(/^\d+\.\s+/, "")}
          </li>
        );
      }
      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }
      
      // Handle bold tags **word**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={pIdx} className="text-white font-bold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return <p key={idx} className="text-xs text-text-secondary leading-relaxed my-1">{formattedLine}</p>;
    });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Exam Preparation Agent</h1>
        <p className="text-xs text-text-secondary">Generate summaries, solve interactive quizzes, and study sample exam questions to strengthen your confidence.</p>
      </div>

      {loading ? (
        /* Loading skeleton */
        <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[300px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary font-bold">Agent is formulating questions...</h3>
            <p className="text-xs text-text-muted mt-1">Reviewing conceptual boundaries and constructing practice sets.</p>
          </div>
        </div>
      ) : prepData ? (
        /* Result dashboard views */
        <div className="space-y-6">
          {/* Header Title bar */}
          <div className="glass-card rounded-2xl border p-4 bg-bg-card flex flex-wrap justify-between items-center gap-4">
            <div>
              <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Topic Preparation Pack</span>
              <h2 className="text-base font-bold text-text-primary truncate">{prepData.topic}</h2>
            </div>
            
            <button
              onClick={() => setPrepData(null)}
              className="text-xs border border-border-card bg-bg-card-hover px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary transition cursor-pointer"
            >
              Study Different Topic
            </button>
          </div>

          {/* Navigation tab links */}
          <div className="flex border-b border-border-card/30">
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition ${
                activeTab === "summary" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Summary
            </button>
            <button
              onClick={() => setActiveTab("quiz")}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition ${
                activeTab === "quiz" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              <HelpCircle className="h-4 w-4" />
              MCQ Quiz ({prepData.quizzes?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition ${
                activeTab === "questions" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              Sample Q&As
            </button>
            <button
              onClick={() => setActiveTab("checklist")}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition ${
                activeTab === "checklist" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              <ListChecks className="h-4 w-4" />
              Revision Tasks
            </button>
          </div>

          {/* Dynamic Tab Body */}
          <div className="glass-card rounded-2xl border p-6 bg-bg-card min-h-[300px]">
            
            {/* Tab: Summary */}
            {activeTab === "summary" && (
              <div className="space-y-4 max-w-3xl">
                {renderMarkdown(prepData.summary)}
              </div>
            )}

            {/* Tab: Quiz */}
            {activeTab === "quiz" && (
              <div className="space-y-8 max-w-2xl">
                {prepData.quizzes && prepData.quizzes.length > 0 ? (
                  prepData.quizzes.map((q, idx) => {
                    const selectedIdx = selectedAnswers[q.id];
                    const isAnswered = selectedIdx !== undefined;
                    
                    return (
                      <div key={q.id} className="space-y-3 bg-bg-dark/20 border border-border-card/60 p-4 rounded-xl">
                        <div className="flex gap-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/20 text-primary font-bold text-[10px] mt-0.5">
                            {idx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-text-primary leading-relaxed">{q.question}</h4>
                        </div>

                        {/* Options */}
                        <div className="grid gap-2 pl-7">
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = optIdx === q.correct_answer_index;
                            const isSelected = selectedIdx === optIdx;
                            
                            let optStyle = "border-border-card bg-bg-dark/40 text-text-secondary hover:border-primary/40 hover:bg-bg-dark/60";
                            
                            if (isAnswered) {
                              if (isCorrect) {
                                optStyle = "border-success bg-success/10 text-success";
                              } else if (isSelected) {
                                optStyle = "border-accent bg-accent/10 text-accent";
                              } else {
                                optStyle = "border-border-card/30 opacity-60 text-text-muted";
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                disabled={isAnswered}
                                onClick={() => handleSelectOption(q.id, optIdx, q.correct_answer_index)}
                                className={`w-full text-left text-xs px-4 py-2.5 rounded-lg border transition flex items-center justify-between cursor-pointer ${optStyle}`}
                              >
                                <span>{opt}</span>
                                {isAnswered && isCorrect && <Check className="h-4 w-4 text-success" />}
                                {isAnswered && isSelected && !isCorrect && <X className="h-4 w-4 text-accent" />}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation block */}
                        {isAnswered && (
                          <div className="mt-3 pl-7 border-t border-border-card/20 pt-3 flex gap-2 text-[10px] text-text-secondary leading-relaxed">
                            <AlertCircle className="h-4 w-4 text-primary shrink-0" />
                            <div>
                              <span className="font-bold text-text-primary">Explanation: </span>
                              {q.explanation}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-text-muted text-xs">No quiz questions generated for this focus. Try generating with format "All" or "MCQs".</div>
                )}
              </div>
            )}

            {/* Tab: Sample Q&As */}
            {activeTab === "questions" && (
              <div className="space-y-4 max-w-3xl">
                {prepData.important_questions && prepData.important_questions.length > 0 ? (
                  prepData.important_questions.map((q, idx) => (
                    <details key={idx} className="group border border-border-card/60 bg-bg-dark/20 rounded-xl p-4 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex items-center justify-between font-semibold text-xs text-text-primary cursor-pointer">
                        <span className="pr-4 leading-relaxed">{q.question}</span>
                        <span className="transition group-open:-rotate-180">
                          <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24" className="h-4 w-4 text-text-secondary"><path d="M6 9l6 6 6-6"></path></svg>
                        </span>
                      </summary>
                      <div className="mt-3 border-t border-border-card/20 pt-3 text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                        {q.sample_answer}
                      </div>
                    </details>
                  ))
                ) : (
                  <div className="text-center py-12 text-text-muted text-xs">No sample questions available.</div>
                )}
              </div>
            )}

            {/* Tab: Revision Checklist */}
            {activeTab === "checklist" && (
              <div className="max-w-xl">
                <ul className="space-y-3">
                  {prepData.checklist && prepData.checklist.map((item, idx) => (
                    <li key={idx} className="flex gap-3 items-start bg-bg-dark/30 border border-border-card/60 p-3 rounded-xl">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 border border-success/30 text-success">
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-xs text-text-secondary leading-relaxed mt-0.5">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>
      ) : (
        /* Setup Form view */
        <div className="glass-card rounded-2xl border p-6 bg-bg-card max-w-xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border-card/30 pb-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              Configure Topic Exam Prep
            </h3>

            {/* Topic Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Study Topic</label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Database Normalization, Big O Notation, Mitosis"
                className="input-field"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Format selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Study Materials Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="input-field bg-bg-dark"
                >
                  <option value="All">All Formats (Summary + MCQs + Q&As)</option>
                  <option value="MCQs">MCQ Quiz Practice Only</option>
                  <option value="Summary">Markdown Revision Guides Only</option>
                </select>
              </div>

              {/* Difficulty level */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Assessment Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="input-field bg-bg-dark"
                >
                  <option value="Beginner">Beginner (Basic vocab & recall)</option>
                  <option value="Intermediate">Intermediate (Application & calculations)</option>
                  <option value="Advanced">Advanced (Design, theory & edge cases)</option>
                </select>
              </div>
            </div>

            {/* Quiz count slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-text-secondary">Number of MCQ Questions</label>
                <span className="text-xs font-bold text-primary">{numQuestions} Questions</span>
              </div>
              <input
                type="range"
                min="3"
                max="8"
                value={numQuestions}
                onChange={(e) => setNumQuestions(e.target.value)}
                className="w-full accent-primary bg-bg-dark rounded-lg h-2 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover font-semibold text-sm text-text-primary py-3 rounded-xl shadow-lg shadow-primary/20 transition cursor-pointer"
            >
              Compose Exam Prep Guide
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
