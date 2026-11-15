/* =========================================================
   공지 게시판 화면
   - 분류 탭(전체/공지/소독/유지보수), 검색, 클릭하면 본문 펼치기
   - 사진이 있는 글은 본문 아래 사진 바둑판, 누르면 크게 보기
   - 글은 관리자 페이지(admin.html)에서 쓰고, Supabase 에서 불러옵니다. (js/db.js)
   ========================================================= */
(function () {
  const board = document.getElementById("notice-board");
  let posts = [];
  const tabs = document.querySelectorAll(".tabs button");
  const keywordInput = document.getElementById("notice-keyword");
  let category = "전체";
  // 분류별 표시 색 (css/style.css 의 .badge.xxx)
  const BADGE_CLASS = { 소독: "disinfect", 유지보수: "repair" };
  let keyword = "";

  const escape = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // 본문 속 전화번호(1577-2448, 055-123-4567 등)를 누르면 바로 전화 걸리게 링크로 바꿈
  const linkPhones = (html) => html.replace(/\b(1[5-9]\d{2}-\d{4}|0\d{1,2}-\d{3,4}-\d{4})\b/g,
    (num) => `<a class="tel-link" href="tel:${num.replaceAll("-", "")}">${num}</a>`);

  function render() {
    const items = posts
      .filter((n) => category === "전체" || n.category === category)
      .filter((n) => !keyword || (n.title + n.body).toLowerCase().includes(keyword))
      .sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date));

    if (items.length === 0) {
      board.innerHTML = `<p class="board-empty">${posts.length ? "찾는 글이 없습니다." : "아직 올라온 글이 없습니다."}</p>`;
      return;
    }

    board.innerHTML = items.map((n) => `
      <div class="board-item" id="n${n.id}">
        <button class="board-row" aria-expanded="false">
          <span class="badge ${BADGE_CLASS[n.category] || ""}">${n.category}</span>
          <span class="board-title">${n.pinned ? '<i class="ti ti-pin pin" aria-label="고정글"></i>' : ""}${escape(n.title)}${n.photos && n.photos.length ? ' <i class="ti ti-photo has-photo" aria-label="사진 있음"></i>' : ""}</span>
          <span class="board-date">${n.date.replaceAll("-", ".")}</span>
        </button>
        <div class="board-body">${linkPhones(escape(n.body))}${photoGrid(n)}</div>
      </div>`).join("");
  }

  // 사진 바둑판 (notice-data.js 의 photos)
  function photoGrid(n) {
    if (!n.photos || n.photos.length === 0) return "";
    return `<div class="photo-grid">${n.photos.map((src, i) => `
      <button class="photo-thumb" data-src="${escape(src)}" aria-label="${escape(n.title)} 사진 ${i + 1} 크게 보기">
        <img src="${escape(src)}" alt="${escape(n.title)} 사진 ${i + 1}" loading="lazy">
      </button>`).join("")}</div>`;
  }

  // 사진 크게 보기
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = lightbox.querySelector("img");
  function closeLightbox() { lightbox.hidden = true; lightboxImg.src = ""; }
  lightbox.addEventListener("click", (e) => { if (e.target !== lightboxImg) closeLightbox(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !lightbox.hidden) closeLightbox(); });

  board.addEventListener("click", (e) => {
    const thumb = e.target.closest(".photo-thumb");
    if (thumb) {
      lightboxImg.src = thumb.dataset.src;
      lightboxImg.alt = thumb.querySelector("img").alt;
      lightbox.hidden = false;
      return;
    }
    const row = e.target.closest(".board-row");
    if (!row) return;
    const item = row.parentElement;
    const open = item.classList.toggle("open");
    row.setAttribute("aria-expanded", open);
  });

  tabs.forEach((tab) => tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    category = tab.dataset.cat;
    render();
  }));

  document.getElementById("notice-search").addEventListener("submit", (e) => {
    e.preventDefault();
    keyword = keywordInput.value.trim().toLowerCase();
    render();
  });

  board.innerHTML = '<p class="board-empty">글을 불러오는 중…</p>';
  fetchPosts()
    .then((data) => {
      posts = data;
      render();
      // 메인에서 특정 글을 눌러 들어오면 (notice.html#n5) 그 글을 펼쳐서 보여줌
      const target = /^#n\d+$/.test(location.hash) && document.querySelector(location.hash);
      if (target) {
        target.classList.add("open");
        target.querySelector(".board-row").setAttribute("aria-expanded", "true");
        target.scrollIntoView({ block: "center" });
      }
    })
    .catch(() => {
      board.innerHTML = '<p class="board-empty">글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>';
    });
})();
