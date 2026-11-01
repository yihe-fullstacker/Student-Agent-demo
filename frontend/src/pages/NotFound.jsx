import { Link } from "react-router-dom";
import { PATHS } from "../routes/paths";

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-[1400px] flex-col items-center rounded-[48px] border border-slate-200/50 bg-white px-8 py-24 text-center">
      <p className="font-display text-[80px] font-medium leading-none tracking-tight text-[#0a1b33]">404</p>
      <h1 className="mt-4 text-[20px] font-semibold text-[#0a1b33]">页面不存在</h1>
      <p className="mt-2 text-[14px] text-[#64748b]">你访问的地址可能已移动或从未存在。</p>
      <Link to={PATHS.HOME} className="mt-8 rounded-full bg-[#0a152d] px-7 py-3 text-[13px] font-semibold text-white shadow-[0_12px_30px_rgba(10,21,45,0.25)]">
        返回首页
      </Link>
    </section>
  );
}
