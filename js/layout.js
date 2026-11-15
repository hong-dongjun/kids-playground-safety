/* =========================================================
   공통 상단 메뉴 + 하단 정보
   회사 이름, 전화번호, 주소, 메뉴는 여기만 고치면 모든 페이지에 적용됩니다.
   ========================================================= */
const SITE = {
  name: "어린이놀이시설안전관리",
  ceo: "정나영",
  bizNo: "665-32-00055",
  tel: "1577-2448",
  fax: "0303-0948-3330",
  email: "kpl@kplay.or.kr",
  address: "(51778) 경남 창원시 마산합포구 현동7길 35 센스빌딩 2층 204호",
  hours: "평일 08:30 - 17:30 (토·일·공휴일 휴무)",
};

// 안전교육은 외부 교육기관 사이트(kplays.or.kr)로 연결합니다.
const EDU_LINKS = {
  main: "https://www.kplays.or.kr/app/cp_u02",
  online: "https://www.kplays.or.kr/app/cp_u02/onlnedu/class/",
  offline: "https://www.kplays.or.kr/app/cp_u02/oflnedu/class/",
};

const MENU = [
  { id: "about", label: "회사소개", href: "about.html" },
  { id: "disinfection", label: "소독", href: "disinfection.html" },
  { id: "maintenance", label: "유지보수", href: "maintenance.html" },
  { id: "notice", label: "공지", href: "notice.html" },
  { id: "edu", label: "안전교육", href: EDU_LINKS.main, external: true },
  { id: "quote", label: "견적문의", href: "quote.html", cta: true },
];

function renderHeader() {
  const current = document.body.dataset.page;
  const links = MENU.map((m) => {
    const cls = [m.cta ? "gnb-cta" : "", m.external ? "ext" : "", m.id === current ? "active" : ""]
      .filter(Boolean).join(" ");
    const ext = m.external ? ' target="_blank" rel="noopener" title="외부 교육기관 사이트로 이동"' : "";
    const icon = m.external ? ' <i class="ti ti-external-link" aria-hidden="true"></i>' : "";
    return `<a href="${m.href}" class="${cls}"${ext}>${m.label}${icon}</a>`;
  }).join("");

  document.getElementById("site-header").innerHTML = `
    <div class="topbar">
      <div class="container topbar-inner">
        <span><i class="ti ti-shield-check" aria-hidden="true"></i> 2015년부터 어린이놀이시설 소독·유지보수</span>
        <span class="topbar-contact">
          <a href="tel:${SITE.tel.replaceAll("-", "")}"><i class="ti ti-phone" aria-hidden="true"></i> ${SITE.tel}</a>
          <span>${SITE.hours}</span>
        </span>
      </div>
    </div>
    <header class="site-header">
      <div class="container header-inner">
        <a href="index.html" class="logo"><img src="images/logo.png" alt="" class="logo-img">${SITE.name}</a>
        <button class="menu-toggle" aria-label="메뉴 열기" aria-expanded="false"><i class="ti ti-menu-2"></i></button>
        <nav class="gnb" aria-label="주 메뉴">${links}</nav>
      </div>
    </header>`;

  const toggle = document.querySelector(".menu-toggle");
  const gnb = document.querySelector(".gnb");
  toggle.addEventListener("click", () => {
    const open = gnb.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
    toggle.innerHTML = open ? '<i class="ti ti-x"></i>' : '<i class="ti ti-menu-2"></i>';
  });
}

function renderFooter() {
  document.getElementById("site-footer").innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-top">
          <span class="logo"><img src="images/logo.png" alt="" class="logo-img">${SITE.name}</span>
          <div class="footer-links">
            <a href="about.html">회사소개</a>
            <a href="quote.html">견적문의</a>
            <a href="notice.html">공지</a>
            <a href="${EDU_LINKS.main}" target="_blank" rel="noopener">안전교육 (외부)</a>
            <a href="#">개인정보처리방침</a>
            <a href="admin.html" class="footer-admin">관리자</a>
          </div>
        </div>
        <div class="footer-info">
          <span>상호: ${SITE.name}</span><span>대표: ${SITE.ceo}</span><span>사업자등록번호: ${SITE.bizNo}</span><br>
          <span>주소: ${SITE.address}</span><span>전화: ${SITE.tel}</span><span>팩스: ${SITE.fax}</span><span>이메일: ${SITE.email}</span><br>
          <span>고객센터: ${SITE.hours}</span>
        </div>
        <p class="copyright">© ${new Date().getFullYear()} ${SITE.name}. All rights reserved.</p>
      </div>
    </footer>`;
}

// 화면 오른쪽 아래에 늘 떠 있는 전화 상담 + 맨 위로 버튼
function renderFloating() {
  const box = document.createElement("div");
  box.className = "float-call";
  box.innerHTML = `
    <a class="float-tel" href="tel:${SITE.tel.replaceAll("-", "")}" title="전화 상담">
      <i class="ti ti-phone" aria-hidden="true"></i>
      <span><small>전화 상담</small><strong>${SITE.tel}</strong></span>
    </a>
    <button class="float-top" aria-label="맨 위로"><i class="ti ti-arrow-up"></i></button>`;
  document.body.appendChild(box);
  const topBtn = box.querySelector(".float-top");
  topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  const onScroll = () => box.classList.toggle("scrolled", window.scrollY > 400);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// 스크롤해서 화면에 들어올 때 살짝 떠오르는 효과 (class="reveal" 이 붙은 요소)
function setupReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("visible"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach((el) => io.observe(el));
}

// 페이지 안에서 data-site="tel" 처럼 표시된 곳에 회사 정보를 채웁니다.
function fillSiteInfo() {
  document.querySelectorAll("[data-site]").forEach((el) => {
    el.textContent = SITE[el.dataset.site] || "";
  });
  document.querySelectorAll("[data-edu]").forEach((el) => {
    el.href = EDU_LINKS[el.dataset.edu];
    el.target = "_blank";
    el.rel = "noopener";
  });
}

renderHeader();
renderFooter();
renderFloating();
fillSiteInfo();
setupReveal();
