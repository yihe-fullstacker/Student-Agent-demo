import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Loader2, Minimize2 } from "lucide-react";
import { apiService } from "../services/api";

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "model",
      content: "你好！我是你的 **学业与职业成功智能助手**。今天我可以怎样帮助你提升学习，或规划职业发展路线？"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "如何制定学习计划？",
    "推荐一些软件工程项目",
    "什么是能力差距分析？"
  ]);

  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    // Add user message
    const userMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setLoading(true);

    // Retrieve study/career context if available in localstorage
    let context = {};
    try {
      const subject = localStorage.getItem("planner_subject");
      const career = localStorage.getItem("career_target");
      if (subject) context.subject = subject;
      if (career) context.career = career;
    } catch (e) {}

    try {
      // API payload requires the history to be formatted matching ChatMessage[]
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await apiService.sendChatMessage({
        message: query,
        history: historyPayload,
        context: context
      });

      setMessages((prev) => [
        ...prev,
        { role: "model", content: res.reply }
      ]);
      if (res.suggested_questions) {
        setSuggestions(res.suggested_questions);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { 
          role: "model", 
          content: error.message || "抱歉，连接 AI 服务失败。请检查网络连接或在设置页检查 API 密钥。"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Helper to format bot responses with basic markdown bolding
  const formatMessage = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="mb-4 flex h-[500px] w-[350px] flex-col rounded-2xl border border-border-card bg-bg-card shadow-2xl transition-all duration-300 sm:w-[400px]">
          {/* Header */}
          <div className="flex h-14 items-center justify-between border-b border-border-card bg-bg-dark/40 px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">学业与职业人工智能助手</h3>
                <span className="text-[10px] text-success flex items-center gap-1 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping"></span>
                  在线学习导师
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div 
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-primary text-white rounded-br-none" 
                      : "bg-bg-card-hover/70 text-text-secondary border border-border-card/30 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{formatMessage(msg.content)}</p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 max-w-[85%] rounded-2xl bg-bg-card-hover/70 px-4 py-3 text-sm text-text-muted border border-border-card/30 rounded-bl-none">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>智能代理正在思考...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts */}
          {suggestions.length > 0 && !loading && (
            <div className="px-4 py-2 border-t border-border-card/20 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s)}
                  className="text-xs bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition px-2.5 py-1.5 rounded-full"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input form */}
          <div className="p-3 border-t border-border-card bg-bg-dark/30">
            <div className="relative flex items-center">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="咨询学习规划、职业路线或考试问题..."
                className="w-full resize-none rounded-xl border border-border-card bg-bg-dark px-4 py-3 pr-12 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none h-11 leading-tight"
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="absolute right-2 rounded-lg p-1.5 text-primary hover:bg-primary/10 disabled:text-text-muted disabled:hover:bg-transparent"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform duration-200 glow-primary"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>
    </div>
  );
}
