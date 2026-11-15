/* =========================================================
   견적문의 신청서
   - 필수 항목 검사
   - 소독/유지보수 페이지에서 넘어오면 해당 서비스 미리 선택
   ※ 지금은 화면에서만 접수 완료가 보입니다.
     실제로 신청 내용을 받으려면 2단계에서 sendQuote() 를 연결합니다.
   ========================================================= */
(function () {
  const form = document.getElementById("quote-form");
  const success = document.getElementById("quote-success");

  // 주소에 ?service=disinfection 이 붙어 오면 해당 항목을 미리 체크
  const preset = new URLSearchParams(location.search).get("service");
  const presetMap = { disinfection: "소독", maintenance: "유지보수" };
  if (presetMap[preset]) {
    form.querySelector(`input[name="service"][value="${presetMap[preset]}"]`).checked = true;
  }

  // 고른 서비스에 따라 칸 보이기/숨기기
  // - 소독: 면적 칸만 보임
  // - 유지보수: 요청 내용 칸만 보임
  const detailField = document.getElementById("detail-field");
  const areaField = document.getElementById("area-field");
  function toggleDetail() {
    const service = form.querySelector('input[name="service"]:checked')?.value;
    detailField.hidden = service !== "유지보수";
    areaField.hidden = service !== "소독";
  }
  form.querySelectorAll('input[name="service"]').forEach((i) => i.addEventListener("change", toggleDetail));
  toggleDetail();

  const val = (n) => form.elements[n].value.trim();
  const photos = form.elements.photos;

  // 항목별 검사 규칙 (true 면 통과)
  const rules = {
    service: () => form.querySelectorAll('input[name="service"]:checked').length > 0,
    facilityType: () => !!form.querySelector('input[name="facilityType"]:checked'),
    facilityName: () => val("facilityName") !== "",
    address: () => val("address") !== "",
    name: () => val("name") !== "",
    phone: () => /^[0-9\-\s]{9,14}$/.test(val("phone")),
    email: () => val("email") === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("email")),
    agree: () => form.elements.agree.checked,
  };

  function check(key) {
    const field = form.querySelector(`[data-required="${key}"]`);
    const ok = rules[key]();
    field.classList.toggle("invalid", !ok);
    return ok;
  }

  // 고치면 바로 오류 표시가 사라지도록
  form.addEventListener("input", (e) => {
    const field = e.target.closest("[data-required]");
    if (field && field.classList.contains("invalid")) check(field.dataset.required);
  });
  form.addEventListener("change", (e) => {
    const field = e.target.closest("[data-required]");
    if (field && field.classList.contains("invalid")) check(field.dataset.required);
  });

  // 사진은 5장까지만
  photos.addEventListener("change", () => {
    if (photos.files.length > 5) {
      alert("사진은 최대 5장까지 올릴 수 있습니다.");
      photos.value = "";
    }
  });

  // 신청서 내용 → Supabase quotes 표의 칸 이름에 맞춤
  function collect() {
    const f = form.elements;
    const opt = (v) => (v && v.trim() ? v.trim() : null);
    return {
      service: form.querySelector('input[name="service"]:checked').value,
      facility_type: form.querySelector('input[name="facilityType"]:checked').value,
      facility_name: val("facilityName"),
      address: val("address"),
      area: areaField.hidden ? null : opt(f.area.value),
      detail: detailField.hidden ? null : opt(f.detail.value),
      name: val("name"),
      org: opt(f.org.value),
      phone: val("phone"),
      email: opt(f.email.value),
    };
  }

  // Supabase 에 저장 (사진은 줄여서 quote-photos 저장소에 먼저 올림)
  async function sendQuote(data) {
    if (!db) throw new Error("not-configured");
    const paths = [];
    for (const file of [...photos.files].slice(0, 5)) {
      const blob = await resizeImage(file);
      const path = newPhotoPath("quote");
      const { error } = await db.storage.from(QUOTE_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      paths.push(path);
    }
    const { error } = await db.from("quotes").insert({ ...data, photos: paths });
    if (error) throw error;
  }

  const submitError = document.getElementById("submit-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const results = Object.keys(rules).map(check);
    if (results.includes(false)) {
      form.querySelector(".invalid").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const button = form.querySelector(".form-submit");
    const label = button.innerHTML;
    button.disabled = true;
    button.textContent = "접수 중…";
    submitError.hidden = true;
    try {
      await sendQuote(collect());
      form.style.display = "none";
      success.classList.add("show");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      // 접수가 안 됐으면 솔직하게 알리고 전화를 안내
      submitError.hidden = false;
      button.disabled = false;
      button.innerHTML = label;
    }
  });
})();
