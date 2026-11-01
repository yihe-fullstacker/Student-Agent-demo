export default function PageLoader() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center bg-[#f9fafb]" role="status">
      <div className="flex items-center gap-3 rounded-full border border-slate-200/60 bg-white px-5 py-2.5 text-[13px] font-semibold text-[#0a1b33] shadow-sm">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#0a152d]" />
        Loading…
      </div>
    </div>
  );
}
