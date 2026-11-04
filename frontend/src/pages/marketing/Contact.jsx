import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import PageHeader from "../../components/marketing/PageHeader";

const FAQ = [
  { q: "平台需要付费吗？", a: "当前为演示版本，可使用任意邮箱和密码登录体验。" },
  { q: "没有大模型 API Key 能用吗？", a: "可以浏览全部界面；生成类功能需要在设置页填写国内大模型 API 密钥（如 DeepSeek）后才能返回真实结果。" },
  { q: "我的数据存在哪里？", a: "演示版的登录状态与设置仅保存在浏览器本地存储中。" },
];

const EMPTY = { name: "", email: "", subject: "", message: "" };
const input =
  "w-full rounded-2xl border border-transparent bg-slate-100/90 px-4 py-3 text-[14px] text-[#0a152d] outline-none transition focus:border-[#0a152d]/20 focus:bg-white focus:ring-2 focus:ring-[#0a152d]/10";

function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = "请填写姓名";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "请输入有效邮箱";
  if (!v.subject.trim()) e.subject = "请填写主题";
  if (v.message.trim().length < 10) e.message = "留言至少 10 个字符";
  return e;
}

export default function Contact() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length === 0) setSent(true);
  };

  const field = (k, label, el) => (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">{label}</span>
      {el}
      {errors[k] && <span className="mt-1 block text-[12px] text-rose-600">{errors[k]}</span>}
    </label>
  );

  return (
    <>
      <PageHeader eyebrow="Get in touch" title={<>Let&apos;s talk about<br />your learning goals</>}
        description="有问题或建议？填写下方表单。注意：这是演示表单，提交不会真正发送任何消息。" />

      <section className="mx-auto mt-6 grid w-full max-w-[1400px] gap-6 lg:grid-cols-5">
        <div className="rounded-[32px] border border-slate-200/50 bg-white p-8 lg:col-span-3">
          {sent ? (
            <div className="flex flex-col items-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <h2 className="mt-4 font-display text-[22px] font-semibold text-[#0a1b33]">已收到（演示）</h2>
              <p className="mt-2 max-w-sm text-[14px] text-[#64748b]">感谢 {values.name}！这是 demo 环境，消息并未实际发送。</p>
              <button type="button" onClick={() => { setValues(EMPTY); setSent(false); }}
                className="mt-6 rounded-full border border-slate-200/70 bg-white px-5 py-2.5 text-[12px] font-semibold text-[#0a1b33] shadow-sm hover:border-slate-300">
                再写一条
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {field("name", "姓名", <input className={input} value={values.name} onChange={set("name")} autoComplete="name" />)}
                {field("email", "邮箱", <input type="email" className={input} value={values.email} onChange={set("email")} autoComplete="email" />)}
              </div>
              {field("subject", "主题", <input className={input} value={values.subject} onChange={set("subject")} />)}
              {field("message", "留言", <textarea rows={5} className={input} value={values.message} onChange={set("message")} />)}
              <button type="submit"
                className="w-full rounded-full bg-[#0a152d] px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_12px_30px_rgba(10,21,45,0.28)] transition hover:bg-[#1a2a4d]">
                提交（演示）
              </button>
            </form>
          )}
        </div>

        <div className="rounded-[32px] border border-slate-200/50 bg-white p-8 lg:col-span-2">
          <h2 className="font-display text-[22px] font-semibold tracking-tight text-[#0a1b33]">FAQ</h2>
          <div className="mt-4 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl bg-[#f9fafb] p-4">
                <summary className="cursor-pointer list-none text-[14px] font-semibold text-[#0a1b33]">{f.q}</summary>
                <p className="mt-2 text-[13px] leading-relaxed text-[#64748b]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
