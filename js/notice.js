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

  // 쪽 나누기: 한 쪽에 PAGE_SIZE 개씩
  const PAGE_SIZE = 10;
  let page = 1;
  const pager = document.createElement("nav");
  pager.className = "pager";
  pager.setAttribute("aria-label", "쪽 번호");
  board.after(pager);

  function filtered() {
    return posts
      .filter((n) => category === "전체" || n.category === category)
      .filter((n) => !keyword || (n.title + n.body).toLowerCase().includes(keyword))
      .sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date));
  }

  function renderPager(total) {
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages <= 1) { pager.innerHTML = ""; return; }
    // 현재 쪽 주변으로 최대 5개 번호
    let start = Math.max(1, page - 2);
    const end = Math.min(pages, start + 4);
    start = Math.max(1, end - 4);
    const btn = (p, label, extra = "") =>
      `<button data-page="${p}" ${extra} ${p === page && !extra ? 'class="active" aria-current="page"' : ""}>${label}</button>`;
    let html = btn(Math.max(1, page - 1), '<i class="ti ti-chevron-left"></i>', `aria-label="이전 쪽" ${page === 1 ? "disabled" : ""}`);
    if (start > 1) html += btn(1, "1") + (start > 2 ? "<span>…</span>" : "");
    for (let p = start; p <= end; p++) html += btn(p, p);
    if (end < pages) html += (end < pages - 1 ? "<span>…</span>" : "") + btn(pages, pages);
    html += btn(Math.min(pages, page + 1), '<i class="ti ti-chevron-right"></i>', `aria-label="다음 쪽" ${page === pages ? "disabled" : ""}`);
    pager.innerHTML = html;
  }

  pager.addEventListener("click", (e) => {
    const b = e.target.closest("[data-page]");
    if (!b || b.disabled) return;
    page = Number(b.dataset.page);
    render();
    board.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function render() {
    const all = filtered();
    const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    if (page > pages) page = pages;
    const items = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    renderPager(all.length);

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

  // 사진: '전·후 비교'로 체크한 글은 첫 두 장을 비교 화면으로, 나머지는 바둑판
  function photoGrid(n) {
    if (!n.photos || n.photos.length === 0) return "";
    const useCompare = n.compare && n.photos.length >= 2;
    const rest = useCompare ? n.photos.slice(2) : n.photos;
    const compare = useCompare ? compareHtml(n.photos[0], n.photos[1], n.title) : "";
    if (!rest.length) return compare;
    return `${compare}<div class="photo-grid">${rest.map((src, i) => `
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
    page = 1;
    render();
  }));

  document.getElementById("notice-search").addEventListener("submit", (e) => {
    e.preventDefault();
    keyword = keywordInput.value.trim().toLowerCase();
    page = 1;
    render();
  });

  board.innerHTML = '<p class="board-empty">글을 불러오는 중…</p>';
  fetchPosts()
    .then((data) => {
      posts = data;
      // 메인에서 특정 글을 눌러 들어오면 (notice.html#n5) 그 글이 있는 쪽을 열고 펼쳐서 보여줌
      const wanted = /^#n\d+$/.test(location.hash) ? Number(location.hash.slice(2)) : null;
      const index = wanted ? filtered().findIndex((p) => p.id === wanted) : -1;
      if (index >= 0) page = Math.floor(index / PAGE_SIZE) + 1;
      render();
      const target = wanted && document.querySelector(location.hash);
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
