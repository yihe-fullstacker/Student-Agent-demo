import { motion } from "motion/react";
import AuthButtons from "../marketing/AuthButtons";
import FloatingNav from "../marketing/FloatingNav";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260505_101331_74f9b798-3f00-4e86-8a01-377aa16ffeaa.mp4";

export function Hero() {
  return (
    <section className="relative w-full max-w-[1400px] mx-auto rounded-[48px] bg-white border border-slate-200/50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.03)] overflow-hidden h-[600px] flex flex-col">
      {/* Video layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
        <video
          src={VIDEO_SRC}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover scale-105 transition-transform duration-1000"
        />
      </div>

      {/* Content layer */}
      <div className="relative z-20 flex-1 px-8 md:px-16 pt-12 md:pt-16 flex flex-col items-start">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="font-display font-medium text-[42px] md:text-[56px] tracking-tight text-[#0a1b33] leading-[1.1]">
            Smart Student Success,
            <br />
            powered by AI agents
          </h1>

          <p className="mt-5 font-sans text-[14px] md:text-[15px] text-[#64748b] max-w-md leading-relaxed">
            量身定制的学习路线图、模拟考试、技能差距分析，以及可直接用于作品集的项目——
            专为学生、实践者和终身学习者打造。
          </p>

          <div className="mt-8">
            <AuthButtons />
          </div>
        </motion.div>
      </div>

      {/* Floating bottom navbar */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
        <FloatingNav />
      </div>
    </section>
  );
}

