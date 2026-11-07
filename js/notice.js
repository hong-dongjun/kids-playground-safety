/* =========================================================
   공지·공시 게시판 화면
   - 분류 탭(전체/공지/공시), 검색, 클릭하면 본문 펼치기
   - 글 내용은 js/notice-data.js 에 있습니다.
   ========================================================= */
(function () {
  const board = document.getElementById("notice-board");
  const tabs = document.querySelectorAll(".tabs button");
  const keywordInput = document.getElementById("notice-keyword");
  let category = "전체";
  let keyword = "";

  const escape = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function render() {
    const items = NOTICES
      .filter((n) => category === "전체" || n.category === category)
      .filter((n) => !keyword || (n.title + n.body).toLowerCase().includes(keyword))
      .sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date));

    if (items.length === 0) {
      board.innerHTML = '<p class="board-empty">찾는 글이 없습니다.</p>';
      return;
    }

    board.innerHTML = items.map((n) => `
      <div class="board-item" id="n${n.id}">
        <button class="board-row" aria-expanded="false">
          <span class="badge ${n.category === "공시" ? "disclosure" : ""}">${n.category}</span>
          <span class="board-title">${n.pinned ? '<i class="ti ti-pin pin" aria-label="고정글"></i>' : ""}${escape(n.title)}</span>
          <span class="board-date">${n.date.replaceAll("-", ".")}</span>
        </button>
        <div class="board-body">${escape(n.body)}</div>
      </div>`).join("");
  }

  board.addEventListener("click", (e) => {
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

  render();

  // 메인에서 특정 글을 눌러 들어오면 (notice.html#n5) 그 글을 펼쳐서 보여줌
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) {
      target.classList.add("open");
      target.querySelector(".board-row").setAttribute("aria-expanded", "true");
      target.scrollIntoView({ block: "center" });
    }
  }
})();
