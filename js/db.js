/* =========================================================
   Supabase 데이터 연결 (공지 글 읽기, 사진 주소, 사진 줄이기)
   필요한 순서: supabase.min.js → supabase-config.js → db.js
   ========================================================= */
const DB_READY = typeof supabase !== "undefined" && SUPABASE_URL && SUPABASE_ANON_KEY;
const db = DB_READY ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const POST_BUCKET = "post-photos";
const QUOTE_BUCKET = "quote-photos";

// 저장소 안의 사진 위치 → 홈페이지에서 쓸 수 있는 주소
function photoUrl(path) {
  if (!path) return "";
  if (/^(https?:)?\/\//.test(path) || path.startsWith("images/")) return path; // 예전 방식 사진
  return db ? db.storage.from(POST_BUCKET).getPublicUrl(path).data.publicUrl : path;
}

// 글 목록 가져오기 (Supabase 가 연결 안 돼 있으면 notice-data.js 의 예전 글)
async function fetchPosts() {
  if (!db) {
    return (typeof NOTICES !== "undefined" ? NOTICES : []).map((n) => ({ ...n, photos: n.photos || [] }));
  }
  const { data, error } = await db
    .from("posts")
    .select("id, category, title, body, post_date, pinned, photos")
    .order("pinned", { ascending: false })
    .order("post_date", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;
  return data.map((p) => ({
    id: p.id,
    category: p.category,
    title: p.title,
    body: p.body,
    date: p.post_date,
    pinned: p.pinned,
    photos: (p.photos || []).map(photoUrl),
  }));
}

// 사진 줄이기: 긴 쪽 최대 1600px, JPEG 로 저장 (휴대폰 사진 5MB → 300KB 안팎)
function resizeImage(file, maxSize = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("사진 변환 실패"))), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("사진을 읽을 수 없습니다")); };
    img.src = url;
  });
}

// 저장할 파일 이름 (겹치지 않게)
function newPhotoPath(prefix) {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const rand = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
  return `${prefix ? prefix + "/" : ""}${ymd}/${rand}.jpg`;
}
