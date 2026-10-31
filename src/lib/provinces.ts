/** 77 จังหวัด แบ่ง 6 ภาค (ตามการแบ่งภาคทางภูมิศาสตร์) — ใช้ได้ทั้ง server และ client */
export const REGIONS = [
  { key: "north", name: "ภาคเหนือ", provinces: ["เชียงราย", "เชียงใหม่", "น่าน", "พะเยา", "แพร่", "แม่ฮ่องสอน", "ลำปาง", "ลำพูน", "อุตรดิตถ์"] },
  {
    key: "northeast",
    name: "ภาคตะวันออกเฉียงเหนือ",
    provinces: [
      "กาฬสินธุ์", "ขอนแก่น", "ชัยภูมิ", "นครพนม", "นครราชสีมา", "บึงกาฬ", "บุรีรัมย์", "มหาสารคาม", "มุกดาหาร", "ยโสธร",
      "ร้อยเอ็ด", "เลย", "ศรีสะเกษ", "สกลนคร", "สุรินทร์", "หนองคาย", "หนองบัวลำภู", "อำนาจเจริญ", "อุดรธานี", "อุบลราชธานี",
    ],
  },
  {
    key: "central",
    name: "ภาคกลาง",
    provinces: [
      "กรุงเทพมหานคร", "กำแพงเพชร", "ชัยนาท", "นครนายก", "นครปฐม", "นครสวรรค์", "นนทบุรี", "ปทุมธานี", "พระนครศรีอยุธยา", "พิจิตร", "พิษณุโลก",
      "เพชรบูรณ์", "ลพบุรี", "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร", "สระบุรี", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "อ่างทอง", "อุทัยธานี",
    ],
  },
  { key: "east", name: "ภาคตะวันออก", provinces: ["จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ตราด", "ปราจีนบุรี", "ระยอง", "สระแก้ว"] },
  { key: "west", name: "ภาคตะวันตก", provinces: ["กาญจนบุรี", "ตาก", "ประจวบคีรีขันธ์", "เพชรบุรี", "ราชบุรี"] },
  {
    key: "south",
    name: "ภาคใต้",
    provinces: ["กระบี่", "ชุมพร", "ตรัง", "นครศรีธรรมราช", "นราธิวาส", "ปัตตานี", "พังงา", "พัทลุง", "ภูเก็ต", "ยะลา", "ระนอง", "สงขลา", "สตูล", "สุราษฎร์ธานี"],
  },
] as const;

export const PROVINCES: string[] = REGIONS.flatMap((r) => [...r.provinces]);
export const isProvince = (p: string | null | undefined): p is string => Boolean(p && PROVINCES.includes(p));
export const regionOf = (p: string) => REGIONS.find((r) => (r.provinces as readonly string[]).includes(p));

export const CARRIER_KINDS: Record<string, string> = {
  freight: "ขนส่งต่างจังหวัด / รถร่วม",
  parcel: "พัสดุด่วน",
  post: "ไปรษณีย์",
  ondemand: "รถเรียก (Lalamove ฯลฯ)",
};
export const PAYMENT_LABEL: Record<string, string> = { origin: "เก็บต้นทาง", destination: "เก็บปลายทาง", both: "ต้นทาง/ปลายทาง" };

/**
 * ขนส่งพัสดุทั่วประเทศที่ใส่ให้ตั้งแต่แรก (ผู้ใช้แก้ไข/ปิดใช้งาน/ลบได้ — สร้างครั้งเดียว)
 * ลิงก์เช็คพัสดุใส่ {เลขพัสดุ} ได้ถ้าเว็บนั้นรองรับ ไม่งั้นลูกค้ากดลิงก์แล้วกรอกเลขเอง
 */
export const BUILTIN_CARRIERS = [
  { id: "flash-express", name: "Flash Express (แฟลช)", kind: "parcel", trackingUrl: "https://www.flashexpress.co.th/fle/tracking" },
  { id: "thailand-post-ems", name: "EMS ไปรษณีย์ไทย", kind: "post", trackingUrl: "https://track.thailandpost.co.th/" },
];

/** ลิงก์ติดตามพัสดุจาก template เช่น https://track.example.com/?no={เลขพัสดุ} */
/** ลิงก์ใส่เลขพัสดุให้อัตโนมัติไหม (ไม่ใส่ = ลูกค้าต้องกรอกเลขเองในหน้าเว็บ) */
export const trackingLinkPrefills = (template: string | null | undefined) => Boolean(template && /\{เลขพัสดุ\}|\{tracking\}/.test(template));

export function trackingLink(template: string | null | undefined, trackingNo: string | null | undefined) {
  if (!template || !trackingNo) return null;
  const url = template.replace(/\{เลขพัสดุ\}|\{tracking\}/g, encodeURIComponent(trackingNo.trim()));
  return /^https?:\/\//.test(url) ? url : null;
}
