"use client";

import { useState } from "react";
import { Clock, FileText, ImageOff, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export type BubbleMessage = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  text: string | null;
  payload: Record<string, unknown> | null;
  lineMessageId: string | null;
  sentAt: Date;
  senderName: string | null;
  pending?: boolean;
};

const timeFmt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

function MediaImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-muted-foreground">
        <ImageOff className="size-4" /> ไฟล์หมดอายุใน LINE แล้ว
      </span>
    );
  }
  return (
    <a href={src} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element -- ไฟล์มาจาก LINE ผ่าน proxy ที่ต้องล็อกอิน */}
      <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="max-h-72 max-w-full rounded-xl object-contain" />
    </a>
  );
}

function Sticker({ id }: { id: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <p className="rounded-2xl border bg-card px-3.5 py-2 text-muted-foreground">[สติกเกอร์]</p>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- รูปสติกเกอร์สาธารณะจาก LINE CDN
    <img
      src={`https://stickershop.line-scdn.net/stickershop/v1/sticker/${id}/android/sticker.png`}
      alt="สติกเกอร์"
      onError={() => setFailed(true)}
      className="size-28 object-contain"
      loading="lazy"
    />
  );
}

function Content({ m, outbound }: { m: BubbleMessage; outbound: boolean }) {
  const media = m.lineMessageId ? `/api/line/content/${m.lineMessageId}` : null;
  const p = m.payload ?? {};

  switch (m.type) {
    case "IMAGE":
      return media ? <MediaImage src={media} alt="รูปจากลูกค้า" /> : <p className="px-3.5 py-2">[รูปภาพ]</p>;
    case "VIDEO":
      return media ? (
        <video src={media} controls preload="none" className="max-h-72 max-w-full rounded-xl bg-black" />
      ) : (
        <p className="px-3.5 py-2">[วิดีโอ]</p>
      );
    case "AUDIO":
      return media ? <audio src={media} controls preload="none" className="m-2 max-w-60" /> : <p className="px-3.5 py-2">[เสียง]</p>;
    case "FILE":
      return (
        <a href={media ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3.5 py-2.5 underline-offset-2 hover:underline">
          <FileText className="size-4 shrink-0" />
          <span className="break-all">{m.text ?? "ไฟล์"}</span>
        </a>
      );
    case "STICKER": {
      const id = p.stickerId as string | undefined;
      return id ? <Sticker id={id} /> : <p className="px-3.5 py-2">[สติกเกอร์]</p>;
    }
    case "LOCATION": {
      const lat = p.latitude as number | undefined;
      const lng = p.longitude as number | undefined;
      return (
        <a
          href={lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : "#"}
          target="_blank"
          rel="noreferrer"
          className="flex gap-2 px-3.5 py-2.5 hover:underline"
        >
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <span className="whitespace-pre-wrap">{m.text ?? "ตำแหน่ง"}</span>
        </a>
      );
    }
    case "TEXT":
      return <p className="px-3.5 py-2 break-words whitespace-pre-wrap">{m.text}</p>;
    default:
      return <p className={cn("px-3.5 py-2 italic", outbound ? "opacity-80" : "text-muted-foreground")}>[{m.type.toLowerCase()}]</p>;
  }
}

export function MessageBubble({ m }: { m: BubbleMessage }) {
  const outbound = m.direction === "OUTBOUND";
  const bare = m.type === "STICKER" || m.type === "IMAGE" || m.type === "VIDEO";

  return (
    <div className={cn("flex flex-col gap-1", outbound ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[min(80%,28rem)] overflow-hidden text-sm",
          bare
            ? "rounded-xl"
            : outbound
              ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
              : "rounded-2xl rounded-bl-md border bg-card",
          m.pending && "opacity-60",
        )}
      >
        <Content m={m} outbound={outbound} />
      </div>
      <span className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
        {m.pending ? (
          <>
            <Clock className="size-3" /> กำลังส่ง…
          </>
        ) : (
          <>
            {outbound && m.senderName && <span>{m.senderName} ·</span>}
            {timeFmt.format(m.sentAt)}
          </>
        )}
      </span>
    </div>
  );
}
