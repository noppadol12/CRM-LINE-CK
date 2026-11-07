import "server-only";
import nodemailer from "nodemailer";

/**
 * ส่งอีเมลผ่าน SMTP (เช่น Gmail + App Password)
 * env: SMTP_USER, SMTP_PASS (จำเป็น) · SMTP_HOST (ค่าเริ่มต้น smtp.gmail.com) · SMTP_PORT (465) · SMTP_FROM
 */
export function mailEnabled() {
  return Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
}

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;
function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER!.trim(), pass: process.env.SMTP_PASS!.replace(/\s/g, "") },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transport;
}

export async function sendMail(opts: { to: string; subject: string; text: string; html: string }) {
  const from = process.env.SMTP_FROM?.trim() || `CK CRM <${process.env.SMTP_USER!.trim()}>`;
  await getTransport().sendMail({ from, ...opts });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function resetPasswordEmail(name: string, link: string, minutes: number) {
  const text = `สวัสดีคุณ ${name}\n\nมีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชี CK CRM ของคุณ\nกดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ใช้ได้ภายใน ${minutes} นาที และใช้ได้ครั้งเดียว):\n\n${link}\n\nถ้าคุณไม่ได้ขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้ตามปกติ`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:12px;border:1px solid #e4e4e7">
<tr><td style="padding:28px 28px 8px"><div style="display:inline-block;background:#00a24f;color:#fff;font-weight:700;border-radius:8px;padding:6px 10px;font-size:14px">CK CRM</div></td></tr>
<tr><td style="padding:12px 28px 0;font-size:18px;font-weight:600">ตั้งรหัสผ่านใหม่</td></tr>
<tr><td style="padding:8px 28px 0;font-size:14px;line-height:1.7;color:#3f3f46">สวัสดีคุณ ${esc(name)}<br>มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ กดปุ่มด้านล่างภายใน ${minutes} นาที (ใช้ได้ครั้งเดียว)</td></tr>
<tr><td style="padding:24px 28px"><a href="${esc(link)}" style="display:inline-block;background:#00a24f;color:#fff;text-decoration:none;font-weight:600;border-radius:8px;padding:12px 22px;font-size:15px">ตั้งรหัสผ่านใหม่</a></td></tr>
<tr><td style="padding:0 28px 28px;font-size:12px;line-height:1.6;color:#71717a">ถ้าคุณไม่ได้ขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้ตามปกติ<br>ปุ่มกดไม่ได้? คัดลอกลิงก์นี้: <span style="word-break:break-all">${esc(link)}</span></td></tr>
</table></td></tr></table></body></html>`;
  return { subject: "ตั้งรหัสผ่านใหม่ · CK CRM", text, html };
}
