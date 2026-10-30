"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { baht, bahtCompact } from "@/lib/deal-stages";
import { thNumber } from "@/lib/utils";

/** สีแท่งเดียวทั้งหน้า — เขียวของแบรนด์ (#00a24f, คอนทราสต์ 3.3:1 บนพื้นขาว) ชื่อหมวดอยู่บนแกนแล้ว */
const BAR = "#00a24f";
const GRID = "#e8e8ec";
const AXIS = "#6b6b76";
const monthFmt = new Intl.DateTimeFormat("th-TH", { month: "short", year: "2-digit", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });

type TipRow = { label: string; value: string };

function TooltipBox({ title, rows }: { title: string; rows: TipRow[] }) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex justify-between gap-4 text-muted-foreground">
          <span>{r.label}</span>
          <span className="font-medium text-foreground tabular-nums">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

const axisProps = { tick: { fill: AXIS, fontSize: 12 }, tickLine: false, axisLine: false } as const;

/** ยอดปิดการขายรายเดือน */
export function MonthlyWonChart({ data }: { data: { month: string; amount: number; deals: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: monthFmt.format(new Date(`${d.month}-01T00:00:00Z`)) }));
  const max = Math.max(...rows.map((r) => r.amount));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 20, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis {...axisProps} width={48} tickFormatter={(v: number) => bahtCompact.format(v)} />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as (typeof rows)[number] | undefined;
            if (!active || !p) return null;
            return <TooltipBox title={p.label} rows={[{ label: "ยอดปิดการขาย", value: baht.format(p.amount) }, { label: "จำนวนดีล", value: `${p.deals}` }]} />;
          }}
        />
        <Bar dataKey="amount" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={36}>
          {/* ป้ายเฉพาะแท่งสูงสุด ไม่ใส่ทุกแท่ง */}
          <LabelList
            dataKey="amount"
            position="top"
            content={(props) => {
              const { x, y, width, value } = props as { x: number; y: number; width: number; value: number };
              if (!value || value !== max) return null;
              return (
                <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fill="#3f3f46">
                  {bahtCompact.format(value)}
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** แท่งแนวนอนแบบมีชื่อหมวดบนแกน (ขั้นดีล / เหตุผลที่ไม่ซื้อ) */
export function HorizontalBars({
  data,
  valueLabel,
  format: formatKind = "number",
  secondary,
}: {
  data: { label: string; value: number; extra?: string }[];
  valueLabel: string;
  /** ส่งเป็นชื่อรูปแบบ เพราะส่งฟังก์ชันจาก Server Component ไม่ได้ */
  format?: "number" | "baht";
  secondary?: string;
}) {
  const format = (v: number) => (formatKind === "baht" ? (v ? `฿${bahtCompact.format(v)}` : "—") : thNumber.format(v));
  const height = Math.max(120, data.length * 44 + 16);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 0 }} barCategoryGap="30%">
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" {...axisProps} width={112} />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
            if (!active || !p) return null;
            const rows = [{ label: valueLabel, value: format(p.value) }];
            if (secondary && p.extra) rows.push({ label: secondary, value: p.extra });
            return <TooltipBox title={p.label} rows={rows} />;
          }}
        />
        <Bar dataKey="value" fill={BAR} radius={[0, 4, 4, 0]} maxBarSize={22} minPointSize={2}>
          <LabelList dataKey="value" position="right" formatter={(v) => format(Number(v))} style={{ fontSize: 12, fill: "#3f3f46" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** กิจกรรมรายวัน (ใช้คู่กันเป็น small multiples — แกนแยก ไม่ใช้สองแกนในกราฟเดียว) */
export function DailyBars({
  data,
  dataKey,
  label,
  height = 160,
}: {
  data: { day: string; inbound: number; customers: number; newCustomers: number }[];
  dataKey: "inbound" | "newCustomers";
  label: string;
  height?: number;
}) {
  const rows = data.map((d) => ({ ...d, label: dayFmt.format(new Date(`${d.day}T00:00:00Z`)) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...axisProps} width={32} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as (typeof rows)[number] | undefined;
            if (!active || !p) return null;
            const r = [{ label, value: thNumber.format(p[dataKey]) }];
            if (dataKey === "inbound") r.push({ label: "จากลูกค้า", value: `${thNumber.format(p.customers)} ราย` });
            return <TooltipBox title={p.label} rows={r} />;
          }}
        />
        <Bar dataKey={dataKey} fill={BAR} radius={[3, 3, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
