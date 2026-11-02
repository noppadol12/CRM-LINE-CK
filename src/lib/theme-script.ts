// ไม่ใส่ "use client" — layout (server) ต้องอ่านค่าสตริงนี้ได้
export const THEME_KEY = "ck-theme";

/** สคริปต์รันก่อนหน้าแสดงผล — กันหน้าขาววาบตอนเปิดในโหมดมืด */
export const THEME_INIT_SCRIPT = `(()=>{try{var p=localStorage.getItem("${THEME_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);if(d)addEventListener("DOMContentLoaded",function(){var m=document.querySelector('meta[name="theme-color"]');if(m)m.content="#16181d"})}catch(e){}})()`;
