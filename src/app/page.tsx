export default function Home() {
  const checks = [
    { label: "Next.js App Router", done: true },
    { label: "Tailwind CSS", done: true },
    { label: "Deploy บน Vercel", done: true },
    { label: "ฐานข้อมูล Prisma + Supabase", done: true },
    { label: "ระบบล็อกอิน (Phase 2)", done: false },
  ];

  return (
    <main className="flex flex-1 items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06C755] text-lg font-semibold text-white">
            CK
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">CK CRM</h1>
            <p className="text-sm text-slate-500">CRM เชื่อมต่อ LINE OA</p>
          </div>
        </div>
        <ul className="space-y-3">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  c.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                }`}
              >
                {c.done ? "✓" : "•"}
              </span>
              <span className={c.done ? "text-slate-800" : "text-slate-400"}>{c.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
