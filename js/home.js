/* =========================================================
   메인 페이지 전용
   - 최신 공지 4개 (공지 내용은 js/notice-data.js)
   - 관련 사이트 목록 (아래 RELATED_SITES 에서 추가·삭제)
     logo: images/related 폴더의 로고 파일 (정부 부처는 정부 상징 gov.png 를 같이 씀)
   ========================================================= */
const RELATED_SITES = [
  { name: "경상남도교육청", url: "https://www.gne.go.kr", logo: "images/related/gne.png" },
  { name: "행정안전부", url: "https://www.mois.go.kr", logo: "images/related/gov.png" },
  { name: "어린이놀이시설 안전관리시스템", url: "https://www.cpf.go.kr", logo: "images/related/gov.png" },
  { name: "중소벤처기업부", url: "https://www.mss.go.kr", logo: "images/related/gov.png" },
  { name: "한국여성경제인협회", url: "https://www.kwbiz.or.kr", logo: "images/related/kwbiz.png" },
  { name: "산업통상부", url: "https://www.motir.go.kr", logo: "images/related/gov.png" },
  { name: "기후에너지환경부", url: "https://www.mcee.go.kr", logo: "images/related/gov.png" },
  { name: "보건복지부", url: "https://www.mohw.go.kr", logo: "images/related/gov.png" },
  { name: "법제처", url: "https://www.moleg.go.kr", logo: "images/related/gov.png" },
  { name: "교육부", url: "https://www.moe.go.kr", logo: "images/related/gov.png" },
];

(function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // 공지 글을 불러와서 '공지' 상자와 '최근 작업' 칸을 채움
  fetchPosts().then((posts) => {
    // 최신 글 4개
    const latest = [...posts]
      .sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date))
      .slice(0, 4);
    document.getElementById("home-notices").innerHTML = latest.length
      ? latest.map((n) => `
        <li>
          <a class="title" href="notice.html#n${n.id}">[${esc(n.category)}] ${esc(n.title)}</a>
          <span class="date">${n.date.replaceAll("-", ".")}</span>
        </li>`).join("")
      : '<li><span class="title">아직 올라온 글이 없습니다.</span></li>';

    // 최근 작업: "소독"·"유지보수" 글 중 사진이 있는 최신 4개 (없으면 칸 전체를 숨김)
    const works = posts
      .filter((n) => (n.category === "소독" || n.category === "유지보수") && n.photos.length)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4);
    if (works.length) {
      document.getElementById("recent-works").innerHTML = works.map((n) => `
        <a class="work-card reveal" href="notice.html#n${n.id}">
          <div class="work-photo"><img src="${esc(n.photos[0])}" alt="${esc(n.title)}" loading="lazy"></div>
          <div class="work-info">
            <span class="badge ${n.category === "소독" ? "disinfect" : "repair"}">${n.category}</span>
            <strong>${esc(n.title)}</strong>
            <span class="date">${n.date.replaceAll("-", ".")}</span>
          </div>
        </a>`).join("");
      document.getElementById("recent-works-section").hidden = false;
      setupReveal();
    }
  }).catch(() => {
    document.getElementById("home-notices").innerHTML = '<li><span class="title">글을 불러오지 못했습니다.</span></li>';
  });

  // 관련 사이트
  document.getElementById("related-sites").innerHTML = RELATED_SITES.map((s) => `
    <a href="${s.url}" target="_blank" rel="noopener" title="${s.name} (새 창)">
      ${s.logo ? `<img src="${s.logo}" alt="" class="related-logo">` : ""}
      <span>${s.name}</span>
    </a>`).join("");

  // 숫자가 0부터 올라가는 효과 (화면에 보일 때 한 번)
  const counters = document.querySelectorAll(".count");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const to = Number(el.dataset.to);
        const start = performance.now();
        const step = (now) => {
          const t = Math.min((now - start) / 1400, 1);
          el.textContent = Math.round(to * (1 - Math.pow(1 - t, 3)));
          if (t < 1) requestAnimationFrame(step);
        };
        el.textContent = "0";
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => io.observe(el));
  }
})();
