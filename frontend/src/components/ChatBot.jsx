import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Loader2, Minimize2, BookOpen } from "lucide-react";
import { apiService } from "../services/api";

const WELCOME_MSG = {
  role: "model",
  content:
    "你好！我是你的 **AI 考研助手（AssistantAgent）**。我可以结合考研知识库为你解答政治、英语、数学、408 专业课及备考规划问题。",
  sources: [],
  source: "llm",
};

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "如何规划408与数学复习时间？",
    "错题太多怎么动态调整计划？",
    "英语阅读怎么提分？",
  ]);
  const historyLoadedRef = useRef(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!isOpen || historyLoadedRef.current) return undefined;
    historyLoadedRef.current = true;
    let active = true;
    apiService
      .getChatHistory("default")
      .then((res) => {
        if (!active) return;
        if (Array.isArray(res.messages) && res.messages.length > 0) {
          setMessages([WELCOME_MSG, ...res.messages]);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setLoading(true);

    const context = {};
    try {
      const subject = localStorage.getItem("planner_subject");
      const career = localStorage.getItem("career_target");
      if (subject) context.subject = subject;
      if (career) context.career = career;
    } catch {
      // ignore storage access issues
    }

    try {
      const historyPayload = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiService.sendChatMessage({
        message: query,
        history: historyPayload,
        context,
        session_id: "default",
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: res.reply,
          sources: res.sources || [],
          source: res.source || "llm",
        },
      ]);
      if (res.suggested_questions?.length) {
        setSuggestions(res.suggested_questions);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content:
            error.message ||
            "抱歉，连接 AI 服务失败。请检查网络连接或在设置页检查 API 密钥。",
          sources: [],
          source: "fallback",
        },
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

  const formatMessage = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 flex h-[520px] w-[360px] flex-col rounded-2xl border border-border-card bg-bg-card shadow-2xl transition-all duration-300 sm:w-[410px]">
          <div className="flex h-14 items-center justify-between border-b border-border-card bg-bg-dark/40 px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">AI 考研知识问答助手</h3>
                <span className="text-[10px] text-success flex items-center gap-1 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping"></span>
                  RAG 知识库增强在线
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-card-hover hover:text-text-primary cursor-pointer"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed space-y-2 ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-br-none"
                      : "bg-bg-card-hover/70 text-text-secondary border border-border-card/30 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{formatMessage(msg.content)}</p>

                  {msg.role !== "user" && msg.source === "fallback" && (
                    <span className="inline-block rounded bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                      基础模式回复（未检索伪造来源）
                    </span>
                  )}

                  {msg.role !== "user" && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                    <div className="border-t border-border-card/30 pt-2 space-y-1">
                      <p className="text-[10px] font-bold text-primary flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        知识库参考来源：
                      </p>
                      {msg.sources.map((src, sIdx) => (
                        <p key={sIdx} className="text-[10px] text-text-muted">
                          [{sIdx + 1}] {src.title}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 max-w-[85%] rounded-2xl bg-bg-card-hover/70 px-4 py-3 text-sm text-text-muted border border-border-card/30 rounded-bl-none">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>正在检索考研知识库并生成回答...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {suggestions.length > 0 && !loading && (
            <div className="px-4 py-2 border-t border-border-card/20 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(s)}
                  className="text-xs bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition px-2.5 py-1.5 rounded-full cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-border-card bg-bg-dark/30">
            <div className="relative flex items-center">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="咨询考研规划、专业课考点或择校建议..."
                className="w-full resize-none rounded-xl border border-border-card bg-bg-dark px-4 py-3 pr-12 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none h-11 leading-tight"
                rows={1}
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="absolute right-2 rounded-lg p-1.5 text-primary hover:bg-primary/10 disabled:text-text-muted disabled:hover:bg-transparent cursor-pointer"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform duration-200 glow-primary cursor-pointer"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>
    </div>
  );
}
