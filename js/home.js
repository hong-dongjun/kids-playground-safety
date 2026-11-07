/* =========================================================
   메인 페이지 전용
   - 최신 공지 4개 (공지 내용은 js/notice-data.js)
   - 관련 사이트 목록 (아래 RELATED_SITES 에서 추가·삭제)
   ========================================================= */
const RELATED_SITES = [
  { name: "경상남도교육청", url: "https://www.gne.go.kr" },
  { name: "행정안전부", url: "https://www.mois.go.kr" },
  { name: "어린이놀이시설 안전관리시스템", url: "https://www.cpf.go.kr" },
  { name: "중소벤처기업부", url: "https://www.mss.go.kr" },
  { name: "한국여성경제인협회", url: "https://www.kwbiz.or.kr" },
  { name: "산업통상부", url: "https://www.motir.go.kr" },
  { name: "기후에너지환경부", url: "https://www.mcee.go.kr" },
  { name: "보건복지부", url: "https://www.mohw.go.kr" },
  { name: "법제처", url: "https://www.moleg.go.kr" },
  { name: "교육부", url: "https://www.moe.go.kr" },
];

(function () {
  // 최신 공지 4개
  const list = document.getElementById("home-notices");
  const latest = [...NOTICES]
    .sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date))
    .slice(0, 4);

  list.innerHTML = latest.map((n) => `
    <li>
      <a class="title" href="notice.html#n${n.id}">[${n.category}] ${n.title}</a>
      <span class="date">${n.date.replaceAll("-", ".")}</span>
    </li>`).join("");

  // 관련 사이트
  document.getElementById("related-sites").innerHTML = RELATED_SITES.map((s) => `
    <a href="${s.url}" target="_blank" rel="noopener" title="${s.name} (새 창)">
      ${s.name} <i class="ti ti-external-link" aria-hidden="true"></i>
    </a>`).join("");
})();
