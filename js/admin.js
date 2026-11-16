/* =========================================================
   관리자 페이지 (admin.html)
   - 로그인 / 로그아웃
   - 글 관리: 목록, 새 글, 수정, 삭제, 사진 올리기·지우기
   - 견적 신청: 목록, 상태 바꾸기, 메모, 삭제
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const BADGE = { 소독: "disinfect", 유지보수: "repair" };

  function notice(html) {
    const box = $("admin-notice");
    box.innerHTML = html;
    box.hidden = !html;
  }

  // ---------------------------------------------------------
  // 0. 시작
  // ---------------------------------------------------------
  if (!db) {
    notice(`<strong>아직 Supabase 가 연결되지 않았습니다.</strong><br>
      <code>js/supabase-config.js</code> 파일에 Project URL 과 anon 키를 넣으면 이 화면을 쓸 수 있습니다.`);
    return;
  }

  db.auth.getSession().then(({ data }) => (data.session ? enter() : showLogin()));

  function showLogin() {
    $("login-view").hidden = false;
    $("app-view").hidden = true;
    $("logout-btn").hidden = true;
  }

  async function enter() {
    const { data: ok, error } = await db.rpc("is_admin");
    if (error || !ok) {
      notice("이 계정은 관리자로 등록되어 있지 않습니다. Supabase 의 <code>admins</code> 표에 이메일을 추가해주세요.");
      $("logout-btn").hidden = false;
      $("login-view").hidden = true;
      return;
    }
    notice("");
    $("login-view").hidden = true;
    $("app-view").hidden = false;
    $("logout-btn").hidden = false;
    loadPosts();
    loadQuotes();
  }

  // ---------------------------------------------------------
  // 1. 로그인 / 로그아웃
  // ---------------------------------------------------------
  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("login-error");
    err.hidden = true;
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    const { error } = await db.auth.signInWithPassword({
      email: $("login-email").value.trim(),
      password: $("login-password").value,
    });
    btn.disabled = false;
    if (error) {
      err.textContent = "이메일 또는 비밀번호가 맞지 않습니다.";
      err.hidden = false;
      return;
    }
    $("login-password").value = "";
    enter();
  });

  $("logout-btn").addEventListener("click", async () => {
    await db.auth.signOut();
    notice("");
    showLogin();
  });

  // 탭 (글 관리 / 견적 신청)
  document.querySelectorAll(".admin-tabs button").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tabs button").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      $("posts-panel").hidden = tab.dataset.panel !== "posts-panel";
      $("quotes-panel").hidden = tab.dataset.panel !== "quotes-panel";
      $("editor-panel").hidden = true;
    });
  });

  // ---------------------------------------------------------
  // 2. 글 목록
  // ---------------------------------------------------------
  let posts = [];
  let postFilter = "전체";

  async function loadPosts() {
    $("post-list").innerHTML = '<p class="admin-empty">불러오는 중…</p>';
    const { data, error } = await db
      .from("posts")
      .select("*")
      .order("pinned", { ascending: false })
      .order("post_date", { ascending: false })
      .order("id", { ascending: false });
    if (error) {
      $("post-list").innerHTML = '<p class="admin-empty">글을 불러오지 못했습니다.</p>';
      return;
    }
    posts = data;
    renderPosts();
  }

  function renderPosts() {
    const list = posts.filter((p) => postFilter === "전체" || p.category === postFilter);
    $("post-list").innerHTML = list.length
      ? list.map((p) => `
        <div class="admin-row">
          ${p.photos.length ? `<img class="thumb" src="${esc(photoUrl(p.photos[0]))}" alt="">` : '<span class="thumb"><i class="ti ti-file-text"></i></span>'}
          <div class="info">
            <div class="meta"><span class="badge ${BADGE[p.category] || ""}">${esc(p.category)}</span>
              ${p.pinned ? '<span><i class="ti ti-pin"></i> 고정</span>' : ""}
              <span>${p.post_date.replaceAll("-", ".")}</span>
              ${p.photos.length ? `<span><i class="ti ti-photo"></i> ${p.photos.length}장</span>` : ""}</div>
            <strong>${esc(p.title)}</strong>
          </div>
          <div class="actions">
            <button class="btn btn-line btn-sm" data-edit="${p.id}"><i class="ti ti-edit"></i> 수정</button>
            <button class="btn btn-danger btn-sm" data-delete="${p.id}"><i class="ti ti-trash"></i> 삭제</button>
          </div>
        </div>`).join("")
      : `<p class="admin-empty">${postFilter === "전체" ? "아직 글이 없습니다" : `'${postFilter}' 분류에는 아직 글이 없습니다`}. 오른쪽 위 [새 글 쓰기] 를 눌러 올려보세요.</p>`;
  }

  document.querySelectorAll("#post-filter button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#post-filter button").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    postFilter = b.dataset.cat;
    renderPosts();
  }));

  $("post-list").addEventListener("click", async (e) => {
    const edit = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-delete]");
    if (edit) openEditor(posts.find((p) => p.id === Number(edit.dataset.edit)));
    if (del) {
      const p = posts.find((x) => x.id === Number(del.dataset.delete));
      if (!confirm(`"${p.title}" 글을 삭제할까요?\n사진도 함께 지워지고, 되돌릴 수 없습니다.`)) return;
      const { error } = await db.from("posts").delete().eq("id", p.id);
      if (error) return alert("삭제하지 못했습니다. 잠시 후 다시 시도해주세요.");
      if (p.photos.length) await db.storage.from(POST_BUCKET).remove(p.photos);
      loadPosts();
    }
  });

  // ---------------------------------------------------------
  // 3. 글 쓰기 / 수정
  // ---------------------------------------------------------
  let editing = null;        // 수정 중인 글 (새 글이면 null)
  // 사진 목록 (순서대로): { path } = 이미 올라간 사진, { file, url } = 새로 고른 사진
  let photoItems = [];

  $("new-post-btn").addEventListener("click", () => openEditor(null));
  $("cancel-post-btn").addEventListener("click", closeEditor);

  function clearNewPreviews() {
    photoItems.forEach((p) => p.url && URL.revokeObjectURL(p.url));
  }

  function openEditor(post) {
    editing = post;
    clearNewPreviews();
    photoItems = post ? post.photos.map((path) => ({ path })) : [];
    $("editor-title").textContent = post ? "글 수정" : "새 글 쓰기";
    document.querySelector(`#post-form input[name="category"][value="${post ? post.category : "공지"}"]`).checked = true;
    $("post-title").value = post ? post.title : "";
    $("post-date").value = post ? post.post_date : today();
    $("post-pinned").checked = post ? post.pinned : false;
    $("post-compare").checked = post ? !!post.compare : false;
    $("post-body").value = post ? post.body : "";
    $("post-error").hidden = true;
    renderThumbs();
    $("posts-panel").hidden = true;
    $("editor-panel").hidden = false;
    window.scrollTo({ top: 0 });
    $("post-title").focus();
  }

  function closeEditor() {
    $("editor-panel").hidden = true;
    $("posts-panel").hidden = false;
  }

  function renderThumbs() {
    const compare = $("post-compare").checked;
    $("thumb-list").innerHTML = photoItems.map((p, i) => `
      <div class="thumb-item">
        <img src="${p.path ? esc(photoUrl(p.path)) : p.url}" alt="">
        ${p.url ? '<span class="new-tag">새 사진</span>' : ""}
        ${i > 0 ? `<button type="button" class="move" data-move="${i}" aria-label="앞으로 옮기기"><i class="ti ti-arrow-left"></i></button>` : ""}
        <span class="order">${compare && i === 0 ? "작업 전" : compare && i === 1 ? "작업 후" : i + 1}</span>
        <button type="button" class="remove" data-remove="${i}" aria-label="사진 빼기"><i class="ti ti-x"></i></button>
      </div>`).join("");
  }
  $("post-compare").addEventListener("change", renderThumbs);

  $("thumb-list").addEventListener("click", (e) => {
    const rm = e.target.closest("[data-remove]");
    const mv = e.target.closest("[data-move]");
    if (rm) {
      const [item] = photoItems.splice(Number(rm.dataset.remove), 1);
      if (item.url) URL.revokeObjectURL(item.url);
    }
    if (mv) {
      const i = Number(mv.dataset.move);
      [photoItems[i - 1], photoItems[i]] = [photoItems[i], photoItems[i - 1]];
    }
    renderThumbs();
  });

  function addFiles(files) {
    [...files].filter((f) => f.type.startsWith("image/")).forEach((file) => photoItems.push({ file, url: URL.createObjectURL(file) }));
    renderThumbs();
  }
  $("post-photos").addEventListener("change", (e) => { addFiles(e.target.files); e.target.value = ""; });

  const zone = $("drop-zone");
  ["dragenter", "dragover"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove("over"); }));
  zone.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

  $("post-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("post-error");
    const title = $("post-title").value.trim();
    const date = $("post-date").value;
    if (!title || !date) {
      err.textContent = "제목과 날짜를 입력해주세요.";
      err.hidden = false;
      return;
    }
    if ($("post-compare").checked && photoItems.length < 2) {
      err.textContent = "작업 전·후 비교를 하려면 사진이 2장 이상 필요합니다.";
      err.hidden = false;
      return;
    }
    err.hidden = true;
    const btn = $("save-post-btn");
    const label = btn.innerHTML;
    btn.disabled = true;

    const uploaded = [];
    try {
      // 새 사진 줄여서 올리기 (순서 유지)
      const newCount = photoItems.filter((p) => p.file).length;
      const finalPaths = [];
      for (const p of photoItems) {
        if (p.path) { finalPaths.push(p.path); continue; }
        btn.textContent = `사진 올리는 중 ${uploaded.length + 1}/${newCount}…`;
        const blob = await resizeImage(p.file);
        const path = newPhotoPath("post");
        const { error } = await db.storage.from(POST_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        uploaded.push(path);
        finalPaths.push(path);
      }
      btn.textContent = "저장하는 중…";
      const row = {
        category: document.querySelector('#post-form input[name="category"]:checked').value,
        title,
        post_date: date,
        pinned: $("post-pinned").checked,
        compare: $("post-compare").checked,
        body: $("post-body").value.trim(),
        photos: finalPaths,
        updated_at: new Date().toISOString(),
      };
      const { error } = editing
        ? await db.from("posts").update(row).eq("id", editing.id)
        : await db.from("posts").insert(row);
      if (error) throw error;

      // 수정하면서 뺀 사진은 저장소에서도 지움
      if (editing) {
        const removed = editing.photos.filter((p) => !finalPaths.includes(p));
        if (removed.length) await db.storage.from(POST_BUCKET).remove(removed);
      }
      clearNewPreviews();
      photoItems = [];
      closeEditor();
      loadPosts();
    } catch (ex) {
      if (uploaded.length) await db.storage.from(POST_BUCKET).remove(uploaded);
      err.textContent = /compare/.test(ex?.message || "")
        ? "Supabase 에 '전·후 비교' 칸이 아직 없습니다. 안내드린 SQL 을 먼저 실행해주세요."
        : "저장하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.";
      err.hidden = false;
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  });

  // ---------------------------------------------------------
  // 4. 견적 신청
  // ---------------------------------------------------------
  let quotes = [];
  let quoteFilter = "전체";
  const STATUS_CLASS = { "새 신청": "status-new", 연락함: "status-contacted", 완료: "status-done" };

  async function loadQuotes() {
    $("quote-list").innerHTML = '<p class="admin-empty">불러오는 중…</p>';
    const { data, error } = await db.from("quotes").select("*").order("created_at", { ascending: false });
    if (error) {
      $("quote-list").innerHTML = '<p class="admin-empty">견적 신청을 불러오지 못했습니다.</p>';
      return;
    }
    quotes = data;
    const newCount = quotes.filter((q) => q.status === "새 신청").length;
    $("new-quote-count").textContent = newCount;
    $("new-quote-count").hidden = newCount === 0;
    renderQuotes();
  }

  async function renderQuotes() {
    const list = quotes.filter((q) => quoteFilter === "전체" || q.status === quoteFilter);
    if (!list.length) {
      $("quote-list").innerHTML = '<p class="admin-empty">해당하는 견적 신청이 없습니다.</p>';
      return;
    }
    // 견적 사진은 비공개라 1시간짜리 임시 주소를 받아서 보여줌
    const allPaths = list.flatMap((q) => q.photos);
    const urls = {};
    if (allPaths.length) {
      const { data } = await db.storage.from(QUOTE_BUCKET).createSignedUrls(allPaths, 3600);
      (data || []).forEach((d) => { if (d.signedUrl) urls[d.path] = d.signedUrl; });
    }
    $("quote-list").innerHTML = list.map((q) => `
      <article class="quote-card ${q.status === "새 신청" ? "is-new" : ""}">
        <div class="quote-top">
          <div>
            <span class="badge ${BADGE[q.service] || ""}">${esc(q.service)}</span>
            <span class="badge ${STATUS_CLASS[q.status]}">${esc(q.status)}</span>
            <h4>${esc(q.facility_name)} <small style="font-weight:400;color:var(--text-sub)">(${esc(q.facility_type)})</small></h4>
          </div>
          <span class="when">${new Date(q.created_at).toLocaleString("ko-KR")}</span>
        </div>
        <dl class="quote-grid">
          <dt>담당자</dt><dd>${esc(q.name)}${q.org ? ` · ${esc(q.org)}` : ""}</dd>
          <dt>연락처</dt><dd><a href="tel:${esc(q.phone.replace(/[^0-9]/g, ""))}">${esc(q.phone)}</a></dd>
          <dt>이메일</dt><dd>${q.email ? `<a href="mailto:${esc(q.email)}">${esc(q.email)}</a>` : "-"}</dd>
          <dt>${q.service === "소독" ? "면적" : ""}</dt><dd>${q.service === "소독" ? esc(q.area || "-") : ""}</dd>
          <dt>현장 주소</dt><dd class="wide">${esc(q.address)}</dd>
          ${q.detail ? `<dt>요청 내용</dt><dd class="wide">${esc(q.detail)}</dd>` : ""}
        </dl>
        ${q.photos.length ? `<div class="quote-photos">${q.photos.map((p) => urls[p] ? `<button data-photo="${esc(urls[p])}"><img src="${esc(urls[p])}" alt="현장 사진"></button>` : "").join("")}</div>` : ""}
        <div class="quote-foot">
          <label>처리 상태<br>
            <select data-status-id="${q.id}">
              ${["새 신청", "연락함", "완료"].map((s) => `<option ${s === q.status ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </label>
          <textarea data-memo-id="${q.id}" placeholder="메모 (예: 11/20 방문 약속, 견적 120만원 안내)">${esc(q.memo || "")}</textarea>
          <button class="btn btn-line btn-sm" data-save-memo="${q.id}"><i class="ti ti-device-floppy"></i> 메모 저장</button>
          <button class="btn btn-danger btn-sm" data-delete-quote="${q.id}"><i class="ti ti-trash"></i> 삭제</button>
        </div>
      </article>`).join("");
  }

  document.querySelectorAll("#quote-filter button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#quote-filter button").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    quoteFilter = b.dataset.status;
    renderQuotes();
  }));
  $("reload-quotes-btn").addEventListener("click", loadQuotes);

  $("quote-list").addEventListener("change", async (e) => {
    const sel = e.target.closest("[data-status-id]");
    if (!sel) return;
    const { error } = await db.from("quotes").update({ status: sel.value }).eq("id", Number(sel.dataset.statusId));
    if (error) return alert("상태를 바꾸지 못했습니다.");
    loadQuotes();
  });

  $("quote-list").addEventListener("click", async (e) => {
    const photo = e.target.closest("[data-photo]");
    const save = e.target.closest("[data-save-memo]");
    const del = e.target.closest("[data-delete-quote]");
    if (photo) openLightbox(photo.dataset.photo);
    if (save) {
      const id = Number(save.dataset.saveMemo);
      const memo = document.querySelector(`[data-memo-id="${id}"]`).value.trim();
      const { error } = await db.from("quotes").update({ memo: memo || null }).eq("id", id);
      save.innerHTML = error ? "저장 실패" : '<i class="ti ti-check"></i> 저장됨';
      setTimeout(() => (save.innerHTML = '<i class="ti ti-device-floppy"></i> 메모 저장'), 1500);
    }
    if (del) {
      const q = quotes.find((x) => x.id === Number(del.dataset.deleteQuote));
      if (!confirm(`"${q.facility_name}" 견적 신청을 삭제할까요?\n되돌릴 수 없습니다.`)) return;
      const { error } = await db.from("quotes").delete().eq("id", q.id);
      if (error) return alert("삭제하지 못했습니다.");
      if (q.photos.length) await db.storage.from(QUOTE_BUCKET).remove(q.photos);
      loadQuotes();
    }
  });

  // 사진 크게 보기
  const lightbox = $("lightbox");
  const lightboxImg = lightbox.querySelector("img");
  function openLightbox(src) { lightboxImg.src = src; lightbox.hidden = false; }
  lightbox.addEventListener("click", (e) => { if (e.target !== lightboxImg) { lightbox.hidden = true; lightboxImg.src = ""; } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") lightbox.hidden = true; });
})();
