import { LABEL_CARRIERS, type Label, type LabelLayout, type Sender } from "@/lib/labels";

const dateFmt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit" });
const showDate = (d: string) => {
  const t = new Date(`${d}T12:00:00+07:00`);
  return Number.isNaN(t.getTime()) ? d : dateFmt.format(t);
};

function Check({ on, size }: { on: boolean; size: number }) {
  return (
    <span className="lbl-check" style={{ width: size, height: size }}>
      {on && (
        <svg width={size - 5} height={size - 5} viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 12.5 9.5 18 20 6" />
        </svg>
      )}
    </span>
  );
}

function Logo({ size }: { size: number }) {
  return (
    <span className="lbl-logo" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      CK
    </span>
  );
}

function SenderRow({ sender, big }: { sender: Sender; big?: boolean }) {
  return (
    <div className="lbl-sender">
      <Logo size={big ? 40 : 34} />
      <div className="lbl-sender-text">
        <div>
          <span className="lbl-muted-strong">ผู้ส่ง</span> <b className="lbl-sender-name">{sender.name}</b>
          {sender.phone && <b className="lbl-sender-name"> · {sender.phone}</b>}
        </div>
        <div>{sender.address}</div>
      </div>
    </div>
  );
}

function Recipient({ l }: { l: Label }) {
  return (
    <div className="lbl-to">
      <div className="lbl-to-head">
        <span className="lbl-tag">ผู้รับ</span>
        {l.ref && <span className="lbl-ref">อ้างอิง {l.ref}</span>}
      </div>
      <div className="lbl-name">{l.name}</div>
      {l.company && <div className="lbl-company">{l.company}</div>}
      {l.phone && <div className="lbl-phone">โทร {l.phone}</div>}
      <div className="lbl-address">{l.address}</div>
      {l.note && <div className="lbl-note">หมายเหตุ: {l.note}</div>}
    </div>
  );
}

function Carriers({ value, size }: { value: string; size: number }) {
  return (
    <div className="lbl-carriers">
      {LABEL_CARRIERS.map((c) => (
        <span key={c.key} className={value === c.key ? "lbl-carrier on" : "lbl-carrier"}>
          <Check on={value === c.key} size={size} />
          {c.name}
        </span>
      ))}
    </div>
  );
}

/** ใบเล็ก (4 ช่องต่อ A4) */
function SmallLabel({ l, sender }: { l: Label; sender: Sender }) {
  return (
    <div className="lbl lbl-sm">
      <SenderRow sender={sender} />
      <Recipient l={l} />
      <div className="lbl-table">
        <div className="lbl-cell lbl-span">
          <div className="lbl-k">ขนส่ง</div>
          <Carriers value={l.carrier} size={15} />
        </div>
        <div className="lbl-cell lbl-br">
          <div className="lbl-k">วันที่ส่ง</div>
          <div className="lbl-v">{showDate(l.date)}</div>
        </div>
        <div className="lbl-cell lbl-box-cell">
          <div className="lbl-k">กล่อง</div>
          <div className="lbl-box">{l.box}</div>
        </div>
      </div>
    </div>
  );
}

/** ใบใหญ่ (A5 แนวนอน 2 ใบต่อ A4) */
function LargeLabel({ l, sender }: { l: Label; sender: Sender }) {
  return (
    <div className="lbl lbl-lg">
      <SenderRow sender={sender} big />
      <div className="lbl-lg-body">
        <Recipient l={l} />
        <div className="lbl-side">
          <div className="lbl-cell lbl-bb">
            <div className="lbl-k">ขนส่ง</div>
            <Carriers value={l.carrier} size={20} />
          </div>
          <div className="lbl-cell lbl-bb">
            <div className="lbl-k">วันที่ส่ง</div>
            <div className="lbl-v">{showDate(l.date)}</div>
          </div>
          <div className="lbl-cell">
            <div className="lbl-k">กล่อง</div>
            <div className="lbl-box">{l.box}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Scissors({ style }: { style: React.CSSProperties }) {
  return (
    <svg className="lbl-scissors" style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88" />
      <path d="M14.47 14.48 20 20" />
      <path d="M8.12 8.12 12 12" />
    </svg>
  );
}

/** แผ่น A4 พร้อมกรอบตัด — 4 หรือ 2 ใบต่อแผ่น */
export function LabelSheets({ labels, layout, sender }: { labels: Label[]; layout: LabelLayout; sender: Sender }) {
  const per = layout === "4" ? 4 : 2;
  const pages: Label[][] = [];
  for (let i = 0; i < labels.length; i += per) pages.push(labels.slice(i, i + per));

  return (
    <>
      <style>{SHEET_CSS}</style>
      {pages.map((page, p) => (
        <section key={p} className="sheet" aria-label={`แผ่นที่ ${p + 1}`}>
          <div className="sheet-head">
            <span>ตัดตามเส้นกรอบ</span>
            <span>
              {sender.name} · ใบปะหน้า {layout === "4" ? "A4 / 4 ช่อง" : "A5 / 2 ใบ"} · แผ่น {p + 1}/{pages.length}
            </span>
          </div>
          <div className={layout === "4" ? "sheet-grid g4" : "sheet-grid g2"}>
            {Array.from({ length: per }, (_, i) => {
              const l = page[i];
              return (
                <div key={i} className="slot">
                  {l ? layout === "4" ? <SmallLabel l={l} sender={sender} /> : <LargeLabel l={l} sender={sender} /> : null}
                </div>
              );
            })}
          </div>
          <Scissors style={{ left: "1.2mm", top: "calc(7mm + (297mm - 13.5mm) / 2 - 7px)" }} />
          {layout === "4" && <Scissors style={{ left: "calc(105mm - 7px)", bottom: "1.2mm", transform: "rotate(90deg)" }} />}
        </section>
      ))}
    </>
  );
}

const SHEET_CSS = `
@page { size: A4 portrait; margin: 0; }
.sheet { width: 210mm; height: 297mm; box-sizing: border-box; padding: 7mm 6.5mm 6.5mm; position: relative; background: #fff; color: #111;
  font-family: var(--font-sans-thai), system-ui, sans-serif; margin: 0 auto 24px; box-shadow: 0 1px 3px rgba(0,0,0,.12), 0 8px 24px rgba(0,0,0,.08);
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sheet-head { position: absolute; top: 2mm; left: 6.5mm; right: 6.5mm; display: flex; justify-content: space-between; font-size: 10.5px; color: #777; }
.sheet-grid { width: 100%; height: 100%; box-sizing: border-box; display: grid; border: 1.5px solid #222; }
.sheet-grid.g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); }
.sheet-grid.g2 { grid-template-rows: repeat(2, minmax(0, 1fr)); }
.g4 .slot:nth-child(odd) { border-right: 1.5px solid #222; }
.g4 .slot:nth-child(-n+2), .g2 .slot:first-child { border-bottom: 1.5px solid #222; }
.slot { min-width: 0; min-height: 0; overflow: hidden; }
.lbl-scissors { position: absolute; }
.lbl { box-sizing: border-box; height: 100%; display: flex; flex-direction: column; }
.lbl-sm { padding: 20px 20px 18px; gap: 12px; }
.lbl-lg { padding: 26px 30px 24px; gap: 16px; }
.lbl-sender { display: flex; gap: 10px; align-items: flex-start; padding-bottom: 10px; border-bottom: 1px solid #d4d4d4; }
.lbl-lg .lbl-sender { gap: 12px; align-items: center; padding-bottom: 12px; }
.lbl-logo { flex: none; border-radius: 8px; background: #00a24f; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.lbl-sender-text { min-width: 0; font-size: 11.5px; line-height: 1.45; color: #333; }
.lbl-lg .lbl-sender-text { font-size: 13px; }
.lbl-sender-name { font-size: 13px; color: #111; }
.lbl-lg .lbl-sender-name { font-size: 15px; }
.lbl-muted-strong { font-weight: 600; color: #555; }
.lbl-to { flex: 1 1 auto; min-height: 0; min-width: 0; display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
.lbl-to-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.lbl-lg .lbl-to-head { justify-content: flex-start; }
.lbl-tag { font-size: 12px; font-weight: 700; background: #111; color: #fff; padding: 2px 10px; border-radius: 4px; }
.lbl-lg .lbl-tag { font-size: 14px; padding: 2px 12px; border-radius: 5px; }
.lbl-ref { font-size: 11px; color: #555; }
.lbl-lg .lbl-ref { font-size: 12.5px; }
.lbl-name { font-size: 21px; font-weight: 700; line-height: 1.3; margin-top: 4px; overflow-wrap: anywhere; }
.lbl-lg .lbl-name { font-size: 28px; margin-top: 6px; }
.lbl-company { font-size: 14px; font-weight: 500; line-height: 1.35; color: #333; }
.lbl-lg .lbl-company { font-size: 17px; }
.lbl-phone { font-size: 19px; font-weight: 700; line-height: 1.3; margin-top: 2px; }
.lbl-lg .lbl-phone { font-size: 24px; }
.lbl-address { font-size: 15.5px; line-height: 1.5; margin-top: 4px; white-space: pre-line; overflow-wrap: anywhere; }
.lbl-lg .lbl-address { font-size: 20px; line-height: 1.55; margin-top: 6px; }
.lbl-note { margin-top: 6px; align-self: flex-start; font-size: 12.5px; line-height: 1.4; border: 1px solid #111; border-radius: 6px; padding: 5px 9px; }
.lbl-lg .lbl-note { margin-top: 10px; font-size: 14.5px; border-width: 1.5px; border-radius: 8px; padding: 6px 12px; }
.lbl-table { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border: 1.5px solid #111; border-radius: 8px; overflow: hidden; flex: none; }
.lbl-cell { padding: 6px 10px; }
.lbl-span { grid-column: 1 / -1; border-bottom: 1px solid #111; padding: 7px 10px; }
.lbl-br { border-right: 1px solid #111; }
.lbl-box-cell { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.lbl-k { font-size: 10.5px; color: #555; }
.lbl-span .lbl-k { margin-bottom: 4px; }
.lbl-v { font-size: 14px; font-weight: 700; line-height: 1.3; }
.lbl-box { font-size: 22px; font-weight: 700; line-height: 1.1; }
.lbl-carriers { display: flex; flex-wrap: wrap; gap: 6px 14px; }
.lbl-carrier { display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 500; }
.lbl-carrier.on { font-weight: 700; }
.lbl-check { flex: none; box-sizing: border-box; border: 1.5px solid #111; border-radius: 3px; display: flex; align-items: center; justify-content: center; }
.lbl-lg-body { flex: 1 1 auto; min-height: 0; display: flex; gap: 22px; }
.lbl-side { flex: none; width: 200px; align-self: flex-start; display: flex; flex-direction: column; border: 2px solid #111; border-radius: 10px; overflow: hidden; }
.lbl-side .lbl-cell { padding: 9px 12px; }
.lbl-bb { border-bottom: 1.5px solid #111; }
.lbl-lg .lbl-k { font-size: 12px; }
.lbl-lg .lbl-v { font-size: 16px; }
.lbl-lg .lbl-box { font-size: 34px; }
.lbl-lg .lbl-carriers { flex-direction: column; gap: 7px; margin-top: 6px; }
.lbl-lg .lbl-carrier { font-size: 17px; gap: 9px; }
.lbl-lg .lbl-check { border-width: 2px; border-radius: 4px; }
@media screen { .sheet { zoom: var(--sheet-zoom, 1); } }
@media print {
  html, body { background: #fff !important; }
  .no-print { display: none !important; }
  .sheet { margin: 0; box-shadow: none; break-after: page; }
  .sheet:last-of-type { break-after: auto; }
}
`;
