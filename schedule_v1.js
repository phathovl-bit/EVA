(() => {
  const STORE_KEY = "eva_tkb_schedules_v1";
  const ROADMAP_STORE_KEY = "eva_personal_roadmaps_v1";
  let initialized = false;
  let state = defaultState();
  let roadmapCurrent = null;
  let roadmapSavedId = null;
  let roadmapKnowledgeText = "";
  let roadmapProgress = {};
  let allLoadedRows = [];
  let latestRenderedRows = [];

  const SUBJECT_GROUPS = [
    { group: "Tieu hoc", items: ["Tieng Viet", "Toan", "Tu nhien xa hoi", "Dao duc", "Lich su va Dia ly", "Khoa hoc", "Tin hoc", "Cong nghe", "Ngoai ngu", "Am nhac", "My thuat", "The duc", "Hoat dong trai nghiem"] },
    { group: "THCS", items: ["Ngu van", "Toan", "Tieng Anh", "Khoa hoc tu nhien", "Vat ly", "Hoa hoc", "Sinh hoc", "Lich su", "Dia ly", "GDCD", "Tin hoc", "Cong nghe", "Am nhac", "My thuat", "The duc", "Hoat dong trai nghiem"] },
    { group: "THPT", items: ["Ngu van", "Toan", "Tieng Anh", "Vat ly", "Hoa hoc", "Sinh hoc", "Lich su", "Dia ly", "GDKTPL", "Tin hoc", "Cong nghe", "QPAN", "The duc", "Am nhac", "My thuat", "Hoat dong trai nghiem"] },
  ];

  function defaultState() {
    return {
      teachers: [],
      classes: [],
      generated: null,
      aiPrefs: { mode: "balanced", avoidPeriod5: false, compact: false },
      selectedSavedId: null,
    };
  }

  function id(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m]));
  }

  function getSaved() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); } catch { return []; }
  }

  function setSaved(items) {
    localStorage.setItem(STORE_KEY, JSON.stringify(items));
  }

  function getSavedRoadmaps() {
    try { return JSON.parse(localStorage.getItem(ROADMAP_STORE_KEY) || "[]"); } catch { return []; }
  }

  function setSavedRoadmaps(items) {
    localStorage.setItem(ROADMAP_STORE_KEY, JSON.stringify(items));
  }

  function el(idValue) {
    return document.getElementById(idValue);
  }

  function ensureScheduleUIInitialized() {
    if (initialized) return;
    if (!el("page-schedule") && !el("page-roadmap") && !el("page-results")) return;
    initialized = true;

    injectScheduleTypographyStyle();
    populateSubjectSelect();
    wireTopTabs();
    wireBuilderActions();
    wireRoadmapActions();
    wireResultsActions();
    appendAiLog("bot", "Huong dan: Them giao vien -> Them lop -> Keo giao vien vao lop -> Nhap so tiet -> Tao tu dong.");
    appendRoadmapLog("bot", "EVA se lap lo trinh mem hon, co phien ban nhe khi ban ban, va uu tien dung viec can dat thay vi nhat dinh phai hoc cho day.");
    hydrateResultsFromLastSession();
    switchTkbTab(window.__evaScheduleTargetTab || "list");
  }

  window.ensureScheduleUIInitialized = ensureScheduleUIInitialized;

  function injectScheduleTypographyStyle() {
    if (document.getElementById("eva-schedule-v1-style")) return;
    const style = document.createElement("style");
    style.id = "eva-schedule-v1-style";
    style.textContent = `
      #page-schedule, #page-schedule *, #page-roadmap, #page-roadmap *, #page-results, #page-results * {
        font-family: 'Be Vietnam Pro','Inter','Segoe UI',system-ui,sans-serif;
      }
      #page-schedule .modal-btn, #page-roadmap .modal-btn, #page-results .modal-btn {
        letter-spacing: 0;
      }
      #page-schedule i.fas,
      #page-schedule i.fa,
      #page-schedule i.far,
      #page-schedule i.fab,
      #page-roadmap i.fas,
      #page-roadmap i.fa,
      #page-roadmap i.far,
      #page-roadmap i.fab,
      #page-results i.fas,
      #page-results i.fa,
      #page-results i.far,
      #page-results i.fab {
        font-family: "Font Awesome 6 Free", "Font Awesome 6 Brands" !important;
        font-weight: 900 !important;
      }
      #page-schedule input, #page-schedule select, #page-schedule textarea,
      #page-roadmap input, #page-roadmap select, #page-roadmap textarea,
      #page-results input, #page-results select, #page-results textarea {
        font-size: 14px;
        line-height: 1.45;
      }
      #page-schedule table td, #page-schedule table th,
      #page-results table td, #page-results table th {
        line-height: 1.35;
      }
      #page-roadmap .roadmap-card {
        border: 1px solid #273142;
        border-radius: 12px;
        background: #0f141d;
        padding: 12px;
      }
      #page-roadmap .roadmap-field {
        width: 100%;
        background: #22242b;
        color: #fff;
        border: 1px solid #3b3f4a;
        border-radius: 12px;
        padding: 11px 12px;
        outline: none;
      }
      #page-roadmap .roadmap-field:focus {
        border-color: #60a5fa;
        box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.12);
      }
      #page-roadmap .roadmap-soft-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(139, 92, 246, 0.1);
        color: #c4b5fd;
        border: 1px solid rgba(139, 92, 246, 0.25);
        border-radius: 12px;
        padding: 11px 12px;
        cursor: pointer;
      }
      #page-roadmap .roadmap-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid #334155;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
        color: #cbd5e1;
        background: #111827;
      }
      #page-results .results-chip {
        display: inline-flex;
        align-items: center;
        border: 1px solid #334155;
        border-radius: 999px;
        padding: 4px 8px;
        font-size: 12px;
        background: #111827;
        color: #e5e7eb;
      }
      #page-results .results-ok {
        color: #22c55e;
        font-weight: 700;
      }
      #page-results .results-dash {
        color: #94a3b8;
        font-weight: 700;
      }
      @media (max-width: 1080px) {
        #page-results #eva-results-toolbar {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 980px) {
        #page-roadmap #tkb-roadmap-view > div,
        #page-schedule #tkb-create-view > div {
          grid-template-columns: 1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function populateSubjectSelect() {
    const select = el("tkb-teacher-subject");
    const other = el("tkb-subject-other");
    if (!select) return;
    select.innerHTML =
      '<option value="">-- Chon mon --</option>' +
      SUBJECT_GROUPS.map((g) => `<optgroup label="${esc(g.group)}">${g.items.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}</optgroup>`).join("") +
      '<option value="__other__">Khac...</option>';
    select.onchange = () => {
      const on = select.value === "__other__";
      if (other) other.style.display = on ? "block" : "none";
      if (!on && other) other.value = "";
    };
  }

  function wireTopTabs() {
    const listBtn = el("tkb-tab-list");
    const createBtn = el("tkb-tab-create");
    const roadmapBtn = el("tkb-tab-roadmap");
    const resultsBtn = el("tkb-tab-results");
    if (listBtn) listBtn.onclick = () => switchTkbTab("list");
    if (createBtn) createBtn.onclick = () => switchTkbTab("create");
    window.switchTkbTab = switchTkbTab;
  }

  function switchTkbTab(mode) {
    const tabs = ["list", "create"];
    tabs.forEach((name) => {
      const btn = el(`tkb-tab-${name}`);
      if (btn) btn.classList.toggle("active", name === mode);
    });
    setDisplay("tkb-list-view", mode === "list");
    setDisplay("tkb-create-view", mode === "create");
    renderSchedulePage();
  }

  function setDisplay(idValue, on) {
    const node = el(idValue);
    if (!node) return;
    node.style.display = on ? (idValue === "tkb-list-view" ? "block" : "flex") : "none";
  }

  function wireBuilderActions() {
    el("tkb-add-teacher")?.addEventListener("click", addTeacher);
    el("tkb-add-class")?.addEventListener("click", addClass);
    el("tkb-reset-builder")?.addEventListener("click", resetBuilder);
    el("tkb-generate")?.addEventListener("click", () => {
      const r = generateScheduleWithValidation();
      if (!r) return;
      state.generated = r;
      renderSchedulePreview();
      appendAiLog("bot", `Da tao TKB (${r.stats.placed}/${r.stats.totalLessons} tiet).`);
    });
    el("tkb-save")?.addEventListener("click", saveCurrentSchedule);
    el("tkb-ai-send")?.addEventListener("click", handleAiInput);
    el("tkb-ai-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") handleAiInput(); });
    el("tkb-ai-btn-balance")?.addEventListener("click", () => runLocalAI("dan deu tiet"));
    el("tkb-ai-btn-compact")?.addEventListener("click", () => runLocalAI("giam tiet trong"));
    el("tkb-ai-btn-avoid5")?.addEventListener("click", () => runLocalAI("tranh tiet 5"));
  }

  function wireRoadmapActions() {
    el("btn-plan")?.addEventListener("click", generatePersonalRoadmap);
    el("plan-goal")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") generatePersonalRoadmap();
    });
    window.openRoadmapKnowledgeModal = openRoadmapKnowledgeModal;
    window.closeRoadmapKnowledgeModal = closeRoadmapKnowledgeModal;
    window.loadRoadmapKnowledge = loadRoadmapKnowledge;
    window.onRoadmapSubjectChange = onRoadmapSubjectChange;
  }

  function wireResultsActions() {
    el("eva-results-load-btn")?.addEventListener("click", loadIntegratedResults);
    el("eva-results-refresh-btn")?.addEventListener("click", loadIntegratedResults);
    el("eva-results-export-btn")?.addEventListener("click", exportResultsCsv);
    el("eva-results-search-text")?.addEventListener("input", () => {
      latestRenderedRows = applyResultsSearch(allLoadedRows, el("eva-results-search-text")?.value || "");
      renderResultsTable(latestRenderedRows);
      renderResultsSummary();
    });
  }

  function addTeacher() {
    const name = (el("tkb-teacher-name")?.value || "").trim();
    let subject = (el("tkb-teacher-subject")?.value || "").trim();
    if (subject === "__other__") subject = (el("tkb-subject-other")?.value || "").trim();
    if (!name || !subject) return alert("Nhap ten giao vien va mon day.");
    state.teachers.push({ id: id("teacher"), name, subject });
    el("tkb-teacher-name").value = "";
    if (el("tkb-teacher-subject")) el("tkb-teacher-subject").value = "";
    if (el("tkb-subject-other")) {
      el("tkb-subject-other").value = "";
      el("tkb-subject-other").style.display = "none";
    }
    state.generated = null;
    renderScheduleBuilder();
  }

  function addClass() {
    const name = (el("tkb-class-name")?.value || "").trim();
    if (!name) return alert("Nhap ten lop.");
    if (state.classes.some((c) => c.name.toLowerCase() === name.toLowerCase())) return alert("Lop da ton tai.");
    state.classes.push({ id: id("class"), name, mode: "morning", assignments: [] });
    el("tkb-class-name").value = "";
    state.generated = null;
    renderScheduleBuilder();
  }

  function resetBuilder() {
    if (!confirm("Lam moi du lieu TKB dang tao?")) return;
    state = defaultState();
    if (el("tkb-name-input")) el("tkb-name-input").value = "";
    renderSchedulePage();
  }

  function renderSchedulePage() {
    renderScheduleListView();
    renderScheduleBuilder();
    renderRoadmapSavedList();
    renderRoadmapOutput();
    renderRoadmapPlansContainer();
    renderResultsSummary();
  }

  window.renderSchedulePage = renderSchedulePage;

  function renderScheduleListView() {
    const host = el("tkb-list-cards");
    if (!host) return;
    const items = getSaved();
    if (!items.length) {
      host.innerHTML = '<div style="grid-column:1/-1;color:#9ca3af;border:1px dashed #374151;border-radius:12px;padding:18px;text-align:center;">Chua co TKB nao. Bam <b>+ Tao moi</b> de bat dau.</div>';
      return;
    }
    host.innerHTML = items.map((it) => `
      <div style="background:#111318;border:1px solid #2b2f39;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;">
        <div style="color:#fff;font-weight:700;">${esc(it.name || "TKB EVA")}</div>
        <div style="color:#9ca3af;font-size:0.8rem;">${new Date(it.createdAt || Date.now()).toLocaleString()}</div>
        <div style="color:#cbd5e1;font-size:0.88rem; line-height:1.45;">${(it.classes || []).length} lop | ${(it.teachers || []).length} giao vien</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="modal-btn" style="background:#2563eb;" onclick="loadSavedTkbToBuilder('${it.id}')">Mo</button>
          <button type="button" class="modal-btn" style="background:#374151;" onclick="duplicateSavedTkb('${it.id}')">Nhan ban</button>
          <button type="button" class="modal-btn" style="background:#7f1d1d;" onclick="deleteSavedTkb('${it.id}')">Xoa</button>
        </div>
      </div>`).join("");
  }

  function renderScheduleBuilder() {
    const teacherPool = el("tkb-teacher-pool");
    const classCards = el("tkb-class-cards");
    if (!teacherPool || !classCards) return;

    teacherPool.innerHTML = state.teachers.length ? state.teachers.map((t) => `
      <div draggable="true" class="tkb-teacher-chip" data-teacher-id="${t.id}" style="display:inline-flex;align-items:center;gap:6px;background:#1f2937;border:1px solid #374151;color:#fff;border-radius:999px;padding:8px 10px;cursor:grab;">
        <span style="font-weight:700;">${esc(t.name)}</span>
        <span style="color:#93c5fd;font-size:0.8rem;">${esc(t.subject)}</span>
        <button type="button" style="border:none;background:none;color:#fca5a5;cursor:pointer;" onclick="removeTkbTeacher('${t.id}')">x</button>
      </div>`).join("") : '<div style="color:#9ca3af;font-size:0.88rem; line-height:1.45;">Chua co giao vien.</div>';

    classCards.innerHTML = state.classes.length ? state.classes.map((cls) => `
      <div style="border:1px solid #2b2f39;border-radius:12px;padding:10px;background:#171a21;" data-class-card="${cls.id}">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;">
          <div style="font-weight:700;color:#fff;">${esc(cls.name)}</div>
          <div style="display:flex;gap:6px;align-items:center;">
            <select data-class-mode="${cls.id}" style="background:#22242b;color:#fff;border:1px solid #3b3f4a;border-radius:8px;padding:6px;font-size:0.8rem;">
              <option value="morning" ${cls.mode === "morning" ? "selected" : ""}>Sang</option>
              <option value="afternoon" ${cls.mode === "afternoon" ? "selected" : ""}>Chieu</option>
              <option value="both" ${cls.mode === "both" ? "selected" : ""}>Ca ngay</option>
            </select>
            <button type="button" class="modal-btn" style="background:#7f1d1d;padding:4px 8px;font-size:0.75rem;" onclick="removeTkbClass('${cls.id}')">Xoa lop</button>
          </div>
        </div>
        <div data-class-drop="${cls.id}" style="margin-top:8px;border:1px dashed #475569;border-radius:10px;padding:8px;min-height:42px;color:#9ca3af;font-size:0.8rem;">Keo the giao vien vao day de gan giao vien + mon cho lop.</div>
        <div data-class-assignments="${cls.id}" style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">${renderAssignmentRows(cls)}</div>
      </div>`).join("") : '<div style="color:#9ca3af;font-size:0.88rem; line-height:1.45;">Chua co lop.</div>';

    teacherPool.querySelectorAll(".tkb-teacher-chip").forEach((chip) => {
      chip.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", chip.dataset.teacherId || "");
      });
    });
    classCards.querySelectorAll("[data-class-drop]").forEach((zone) => {
      zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.style.borderColor = "#60a5fa"; });
      zone.addEventListener("dragleave", () => { zone.style.borderColor = "#475569"; });
      zone.addEventListener("drop", (e) => {
        e.preventDefault();
        zone.style.borderColor = "#475569";
        const teacherId = e.dataTransfer.getData("text/plain");
        assignTeacherToClass(zone.dataset.classDrop, teacherId);
      });
    });
    classCards.querySelectorAll("[data-class-mode]").forEach((sel) => {
      sel.addEventListener("change", () => {
        const cls = state.classes.find((c) => c.id === sel.dataset.classMode);
        if (!cls) return;
        cls.mode = sel.value;
        state.generated = null;
        renderSchedulePreview();
      });
    });
    classCards.querySelectorAll("[data-asg-periods]").forEach((inp) => {
      inp.addEventListener("change", () => setAsgField(inp.dataset.classId, inp.dataset.asgId, "periods", Math.max(1, Number(inp.value || 1))));
    });
    classCards.querySelectorAll("[data-asg-lock]").forEach((cb) => {
      cb.addEventListener("change", () => setAsgField(cb.dataset.classId, cb.dataset.asgId, "locked", !!cb.checked));
    });

    renderSchedulePreview();
  }

  function renderAssignmentRows(cls) {
    if (!cls.assignments.length) return '<div style="color:#94a3b8;font-size:0.78rem;">Chua gan giao vien-mon cho lop nay.</div>';
    return cls.assignments.map((a) => `
      <div style="display:grid;grid-template-columns:1fr auto auto auto;gap:8px;align-items:center;background:#111318;border:1px solid #2b2f39;border-radius:10px;padding:8px;">
        <div><div style="color:#fff;font-weight:600;font-size:0.84rem;">${esc(a.subject)} - ${esc(a.teacherName)}</div></div>
        <label style="display:flex;align-items:center;gap:6px;color:#ddd;font-size:0.78rem;">Tiet/tuan
          <input type="number" min="1" max="20" value="${Number(a.periods || 1)}" data-asg-periods data-class-id="${cls.id}" data-asg-id="${a.id}" style="width:54px;background:#22242b;color:#fff;border:1px solid #3b3f4a;border-radius:8px;padding:4px 6px;">
        </label>
        <label style="display:flex;align-items:center;gap:4px;color:#ddd;font-size:0.75rem;"><input type="checkbox" ${a.locked ? "checked" : ""} data-asg-lock data-class-id="${cls.id}" data-asg-id="${a.id}">Khoa</label>
        <button type="button" class="modal-btn" style="background:#374151;padding:4px 8px;font-size:0.75rem;" onclick="removeTkbAssignment('${cls.id}','${a.id}')">Xoa</button>
      </div>`).join("");
  }

  function assignTeacherToClass(classId, teacherId) {
    const cls = state.classes.find((c) => c.id === classId);
    const t = state.teachers.find((x) => x.id === teacherId);
    if (!cls || !t) return;
    if (cls.assignments.some((a) => a.teacherId === t.id && a.subject === t.subject)) return;
    cls.assignments.push({ id: id("asg"), teacherId: t.id, teacherName: t.name, subject: t.subject, periods: 1, locked: false });
    state.generated = null;
    renderScheduleBuilder();
  }

  function setAsgField(classId, asgId, field, value) {
    const cls = state.classes.find((c) => c.id === classId);
    const asg = cls?.assignments.find((a) => a.id === asgId);
    if (!asg) return;
    asg[field] = value;
    state.generated = null;
    renderSchedulePreview();
  }

  function removeTkbTeacher(teacherId) {
    state.teachers = state.teachers.filter((t) => t.id !== teacherId);
    state.classes.forEach((c) => c.assignments = c.assignments.filter((a) => a.teacherId !== teacherId));
    state.generated = null;
    renderScheduleBuilder();
  }

  function removeTkbClass(classId) {
    state.classes = state.classes.filter((c) => c.id !== classId);
    state.generated = null;
    renderScheduleBuilder();
  }

  function removeTkbAssignment(classId, asgId) {
    const cls = state.classes.find((c) => c.id === classId);
    if (!cls) return;
    cls.assignments = cls.assignments.filter((a) => a.id !== asgId);
    state.generated = null;
    renderScheduleBuilder();
  }

  window.removeTkbTeacher = removeTkbTeacher;
  window.removeTkbClass = removeTkbClass;
  window.removeTkbAssignment = removeTkbAssignment;

  function validateBuilder() {
    const errs = [];
    if (!state.teachers.length) errs.push("Chua co giao vien.");
    if (!state.classes.length) errs.push("Chua co lop.");
    state.classes.forEach((c) => {
      if (!c.assignments.length) errs.push(`Lop ${c.name} chua duoc gan mon/giao vien.`);
      c.assignments.forEach((a) => { if (!(Number(a.periods) > 0)) errs.push(`${c.name} - ${a.subject} chua co so tiet hop le.`); });
    });
    const host = el("tkb-builder-warnings");
    if (host) host.innerHTML = errs.map((x) => `<div>- ${esc(x)}</div>`).join("");
    return errs;
  }

  function generateScheduleWithValidation() {
    if (validateBuilder().length) return null;
    return generateSchedule(state, {
      sixDays: !!el("tkb-days-6")?.checked,
      avoidPeriod5: !!el("tkb-avoid-period5")?.checked || !!state.aiPrefs.avoidPeriod5,
      compact: !!state.aiPrefs.compact,
      mode: state.aiPrefs.mode || "balanced",
    });
  }

  function availablePeriods(mode) {
    if (mode === "afternoon") return [6, 7, 8, 9, 10];
    if (mode === "both") return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return [1, 2, 3, 4, 5];
  }

  function generateSchedule(s, prefs) {
    const days = prefs.sixDays ? ["T2", "T3", "T4", "T5", "T6", "T7"] : ["T2", "T3", "T4", "T5", "T6"];
    const classTables = {};
    const teacherBusy = new Set();
    const warnings = [];
    let totalLessons = 0;
    let placed = 0;

    s.classes.forEach((c) => {
      classTables[c.id] = { classId: c.id, className: c.name, mode: c.mode, grid: {} };
      days.forEach((d) => { classTables[c.id].grid[d] = {}; });
    });

    const tasks = [];
    s.classes.forEach((c) => c.assignments.forEach((a) => {
      for (let i = 0; i < Number(a.periods || 0); i += 1) {
        totalLessons += 1;
        tasks.push({ classId: c.id, className: c.name, teacherId: a.teacherId, teacherName: a.teacherName, subject: a.subject, locked: !!a.locked, seq: i });
      }
    }));

    tasks.sort((a, b) => {
      if (a.locked !== b.locked) return Number(b.locked) - Number(a.locked);
      if (prefs.compact) return a.className.localeCompare(b.className);
      return a.subject.localeCompare(b.subject);
    });

    const daySubjectCount = new Map();
    const keyDS = (cid, d, sub) => `${cid}|${d}|${sub}`;
    const keyT = (tid, d, p) => `${tid}|${d}|${p}`;

    for (const t of tasks) {
      const cls = s.classes.find((c) => c.id === t.classId);
      const allowed = availablePeriods(cls.mode);
      const candidates = [];
      for (const d of days) {
        for (const p of allowed) {
          if (classTables[t.classId].grid[d][p]) continue;
          if (teacherBusy.has(keyT(t.teacherId, d, p))) continue;
          let score = Math.random() * 0.02;
          if (prefs.avoidPeriod5 && p === 5) score -= 3;
          const sameSubDay = daySubjectCount.get(keyDS(t.classId, d, t.subject)) || 0;
          if (prefs.compact) {
            score += Object.keys(classTables[t.classId].grid[d]).length * 0.5;
            if (classTables[t.classId].grid[d][p - 1]) score += 1.2;
            if (classTables[t.classId].grid[d][p + 1]) score += 1.2;
          } else {
            score -= sameSubDay * 2.5;
            score -= Object.keys(classTables[t.classId].grid[d]).length * 0.2;
          }
          if (/Toan|Ngu van|Tieng Anh/i.test(t.subject) && p <= 2) score += 0.5;
          candidates.push({ d, p, score });
        }
      }
      candidates.sort((a, b) => b.score - a.score);
      const pick = candidates[0];
      if (!pick) {
        warnings.push(`Khong xep duoc ${t.subject} - ${t.className} (${t.teacherName})`);
        continue;
      }
      classTables[t.classId].grid[pick.d][pick.p] = { subject: t.subject, teacherName: t.teacherName, teacherId: t.teacherId };
      teacherBusy.add(keyT(t.teacherId, pick.d, pick.p));
      daySubjectCount.set(keyDS(t.classId, pick.d, t.subject), (daySubjectCount.get(keyDS(t.classId, pick.d, t.subject)) || 0) + 1);
      placed += 1;
    }

    return { days, classTables, warnings, prefs, stats: { totalLessons, placed } };
  }

  function renderSchedulePreview() {
    const host = el("tkb-preview-area");
    const meta = el("tkb-preview-meta");
    if (!host) return;
    if (!state.generated) {
      host.innerHTML = '<div style="color:#9ca3af;border:1px dashed #374151;border-radius:10px;padding:16px;">Chua tao TKB. Sau khi gan du lieu, bam <b>Tao tu dong</b>.</div>';
      if (meta) meta.textContent = "";
      return;
    }
    const g = state.generated;
    if (meta) meta.textContent = `${g.stats.placed}/${g.stats.totalLessons} tiet`;
    host.innerHTML = Object.values(g.classTables).map((ct) => renderClassTable(ct, g.days)).join("") +
      (g.warnings.length ? `<div style="margin-top:10px;color:#fca5a5;font-size:0.88rem; line-height:1.45;">${g.warnings.map((w) => `<div>- ${esc(w)}</div>`).join("")}</div>` : "");
  }

  function renderClassTable(ct, days) {
    const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return `<div style="margin-bottom:12px;border:1px solid #2b2f39;border-radius:12px;overflow:hidden;background:#111318;">
      <div style="display:flex;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid #2b2f39;">
        <div style="color:#fff;font-weight:700;">${esc(ct.className)}</div>
        <div style="color:#9ca3af;font-size:0.78rem;">${ct.mode === "morning" ? "Sang" : ct.mode === "afternoon" ? "Chieu" : "Ca ngay"} | 45p/tiet</div>
      </div>
      <div style="overflow:auto;">
        <table style="width:100%;min-width:720px;border-collapse:collapse;font-size:0.78rem;">
          <thead><tr><th style="padding:8px;border-bottom:1px solid #2b2f39;color:#cbd5e1;">Tiet</th>${days.map((d) => `<th style="padding:8px;border-bottom:1px solid #2b2f39;color:#cbd5e1;">${d}</th>`).join("")}</tr></thead>
          <tbody>${periods.map((p) => `<tr><td style="padding:8px;border-bottom:1px solid #1f2937;color:#93c5fd;text-align:center;font-weight:700;">${p}</td>${days.map((d) => renderCell(ct.grid[d]?.[p], p, ct.mode)).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>
    </div>`;
  }

  function renderCell(cell, p, mode) {
    const disabled = (mode === "morning" && p > 5) || (mode === "afternoon" && p < 6);
    if (disabled) return '<td style="padding:6px;border-bottom:1px solid #1f2937;background:#0b0d12;color:#4b5563;text-align:center;">-</td>';
    if (!cell) return '<td style="padding:6px;border-bottom:1px solid #1f2937;background:#0f1117;color:#6b7280;text-align:center;">trong</td>';
    return `<td style="padding:6px;border-bottom:1px solid #1f2937;"><div style="background:#1f2937;border:1px solid #334155;border-radius:8px;padding:6px;"><div style="color:#fff;font-weight:600;">${esc(cell.subject)}</div><div style="color:#93c5fd;font-size:0.74rem;">${esc(cell.teacherName)}</div></div></td>`;
  }

  function appendAiLog(role, msg) {
    const log = el("tkb-ai-log");
    if (!log) return;
    const row = document.createElement("div");
    row.style.marginBottom = "8px";
    row.innerHTML = `<div style="color:${role === "bot" ? "#93c5fd" : "#fff"};font-weight:600;margin-bottom:2px;">${role === "bot" ? "AI" : "Ban"}</div><div>${esc(msg)}</div>`;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function handleAiInput() {
    const input = el("tkb-ai-input");
    const q = (input?.value || "").trim();
    if (!q) return;
    if (input) input.value = "";
    appendAiLog("user", q);
    runLocalAI(q);
  }

  function runLocalAI(cmd) {
    const t = String(cmd || "").toLowerCase();
    let changed = false;
    if (t.includes("tranh tiet 5")) {
      state.aiPrefs.avoidPeriod5 = true;
      if (el("tkb-avoid-period5")) el("tkb-avoid-period5").checked = true;
      appendAiLog("bot", "Da bat uu tien tranh tiet 5.");
      changed = true;
    }
    if (t.includes("giam tiet trong") || t.includes("gom")) {
      state.aiPrefs.compact = true;
      state.aiPrefs.mode = "compact";
      appendAiLog("bot", "Se xep lai theo huong giam tiet trong.");
      changed = true;
    }
    if (t.includes("dan deu")) {
      state.aiPrefs.compact = false;
      state.aiPrefs.mode = "balanced";
      appendAiLog("bot", "Se xep lai theo huong dan deu cac mon.");
      changed = true;
    }
    if (!changed && !t.includes("xep lai") && !t.includes("toi uu")) {
      appendAiLog("bot", 'AI local hieu tot cac lenh: "xep lai", "dan deu", "giam tiet trong", "tranh tiet 5".');
      return;
    }
    const r = generateScheduleWithValidation();
    if (!r) return;
    state.generated = r;
    renderSchedulePreview();
    appendAiLog("bot", `Da cap nhat TKB (${r.stats.placed}/${r.stats.totalLessons} tiet).`);
  }

  function saveCurrentSchedule() {
    if (!state.generated) return alert("Hay tao TKB truoc khi luu.");
    const name = (el("tkb-name-input")?.value || "").trim() || `TKB EVA ${new Date().toLocaleDateString()}`;
    const rec = {
      id: state.selectedSavedId || id("savedtkb"),
      name,
      createdAt: new Date().toISOString(),
      teachers: state.teachers,
      classes: state.classes,
      generated: state.generated,
      aiPrefs: state.aiPrefs,
    };
    const items = getSaved();
    const idx = items.findIndex((x) => x.id === rec.id);
    if (idx >= 0) items[idx] = rec; else items.unshift(rec);
    setSaved(items);
    state.selectedSavedId = rec.id;
    appendAiLog("bot", `Da luu TKB vao kho: ${name}`);
    renderScheduleListView();
  }

  function loadSavedTkbToBuilder(idValue) {
    const rec = getSaved().find((x) => x.id === idValue);
    if (!rec) return;
    state = {
      teachers: JSON.parse(JSON.stringify(rec.teachers || [])),
      classes: JSON.parse(JSON.stringify(rec.classes || [])),
      generated: rec.generated || null,
      aiPrefs: { mode: "balanced", avoidPeriod5: false, compact: false, ...(rec.aiPrefs || {}) },
      selectedSavedId: rec.id,
    };
    if (el("tkb-name-input")) el("tkb-name-input").value = rec.name || "";
    window.switchTkbTab?.("create");
    renderScheduleBuilder();
    appendAiLog("bot", `Da mo TKB: ${rec.name}`);
  }

  function duplicateSavedTkb(idValue) {
    const rec = getSaved().find((x) => x.id === idValue);
    if (!rec) return;
    const copy = { ...rec, id: id("savedtkb"), name: `${rec.name || "TKB"} (ban sao)`, createdAt: new Date().toISOString() };
    const items = getSaved();
    items.unshift(copy);
    setSaved(items);
    renderScheduleListView();
  }

  function deleteSavedTkb(idValue) {
    if (!confirm("Xoa TKB nay?")) return;
    setSaved(getSaved().filter((x) => x.id !== idValue));
    renderScheduleListView();
  }

  window.loadSavedTkbToBuilder = loadSavedTkbToBuilder;
  window.duplicateSavedTkb = duplicateSavedTkb;
  window.deleteSavedTkb = deleteSavedTkb;

  function onRoadmapSubjectChange() {
    const subject = String(el("subject-selector")?.value || "").trim();
    const status = el("knowledge-status");
    if (!subject) return;
    setRoadmapStatus(`ÄÃ£ chá»n mÃ´n: ${subject}`);
    if (status && !roadmapKnowledgeText) status.textContent = "ChÆ°a náº¡p. Nháº¥n Ä‘á»ƒ náº¡p tÃ i liá»‡u";
  }

  function openRoadmapKnowledgeModal() {
    const modal = el("knowledge-modal");
    if (!modal) return;
    modal.style.display = "flex";
    if (el("knowledge-input")) el("knowledge-input").value = roadmapKnowledgeText || "";
  }

  function closeRoadmapKnowledgeModal() {
    const modal = el("knowledge-modal");
    if (!modal) return;
    modal.style.display = "none";
  }

  function loadRoadmapKnowledge() {
    roadmapKnowledgeText = String(el("knowledge-input")?.value || "").trim();
    const status = el("knowledge-status");
    if (status) {
      status.textContent = roadmapKnowledgeText ? "ÄÃ£ náº¡p tÃ i liá»‡u" : "ChÆ°a náº¡p. Nháº¥n Ä‘á»ƒ náº¡p tÃ i liá»‡u";
      status.style.color = roadmapKnowledgeText ? "#4ade80" : "";
    }
    closeRoadmapKnowledgeModal();
    setRoadmapStatus(roadmapKnowledgeText ? "ÄÃ£ náº¡p nguá»“n kiáº¿n thá»©c cho roadmap." : "ÄÃ£ xÃ³a nguá»“n kiáº¿n thá»©c.");
  }

  async function generatePersonalRoadmap() {
    const form = {
      subject: (el("subject-selector")?.value || el("roadmap-subject")?.value || "").trim(),
      goal: (el("plan-goal")?.value || el("roadmap-goal")?.value || "").trim(),
      days: Math.max(3, Number(el("roadmap-days")?.value || 14)),
      minutes: Math.max(15, Number(el("roadmap-minutes")?.value || 45)),
      level: String(el("roadmap-level")?.value || "chua_ro"),
      intensity: String(el("roadmap-intensity")?.value || "vua_suc"),
      notes: (el("roadmap-notes")?.value || "").trim(),
    };

    if (!form.subject || !form.goal) {
      setRoadmapStatus("Nhap mon hoc/chuyen de va muc tieu truoc da.", true);
      return;
    }

    const mismatch = detectRoadmapSubjectMismatch(form.subject, form.goal);
    if (mismatch) {
      setRoadmapStatus(`Muc tieu cua ban co ve dang nhac sang mon ${mismatch}. Kiem tra lai de EVA lap lo trinh dung mon nhe.`, true);
      return;
    }

    const btn = el("btn-plan") || el("roadmap-generate-btn");
    const loading = el("plan-loading");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "â³ Äang thiáº¿t láº­p lá»™ trÃ¬nh...";
    }
    if (loading) loading.style.display = "block";
    setRoadmapStatus("EVA dang tao lo trinh ca nhan...");
    appendRoadmapLog("user", `${form.subject} | ${form.goal}`);

    try {
      const prompt = buildRoadmapPrompt(form);
      const raw = await askRoadmapModel(prompt);
      const parsed = extractRoadmapJson(raw);
      roadmapCurrent = normalizeRoadmapData(parsed, form);
      roadmapSavedId = roadmapCurrent.id;
      const items = getSavedRoadmaps().filter((item) => item.id !== roadmapCurrent.id);
      items.unshift({ ...roadmapCurrent });
      setSavedRoadmaps(items.slice(0, 8));
      renderRoadmapOutput();
      renderRoadmapSavedList();
      renderRoadmapPlansContainer();
      appendRoadmapLog("bot", roadmapCurrent.coachNote || roadmapCurrent.summary || "Da tao xong lo trinh.");
      setRoadmapStatus("ÄÃ£ táº¡o lá»™ trÃ¬nh cÃ¡ nhÃ¢n.");
    } catch (err) {
      setRoadmapStatus(err?.message || "Khong tao duoc lo trinh luc nay.", true);
      appendRoadmapLog("bot", err?.message || "Khong tao duoc lo trinh luc nay.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "âœ¨ LÃªn Káº¿ Hoáº¡ch";
      }
      if (loading) loading.style.display = "none";
    }
  }

  async function askRoadmapModel(prompt) {
    if (typeof window.callWorkerChat !== "function") {
      throw new Error("Khong tim thay callWorkerChat de goi worker.");
    }
    return await window.callWorkerChat(prompt, {
      model: "gemini-3.1-flash-lite-preview",
      role: "user",
      task: "analysis",
    });
  }

  function detectRoadmapSubjectMismatch(subject, goal) {
    const normalizedSubject = String(subject || "").trim().toLowerCase();
    const normalizedGoal = String(goal || "").trim().toLowerCase();
    if (!normalizedSubject || !normalizedGoal) return "";
    const groups = {
      "toan": ["toan", "dai so", "hinh hoc"],
      "ngu van": ["van", "ngu van", "van hoc"],
      "tieng anh": ["anh", "tieng anh", "ielts", "toeic"],
      "vat ly": ["ly", "vat ly"],
      "hoa hoc": ["hoa", "hoa hoc", "phan ung"],
      "sinh hoc": ["sinh", "sinh hoc"],
      "lich su": ["su", "lich su"],
      "dia ly": ["dia", "dia ly"],
      "tin hoc": ["tin", "tin hoc", "lap trinh"],
    };

    let matchedSubjectKey = "";
    Object.keys(groups).some((key) => {
      if (normalizedSubject.includes(key)) {
        matchedSubjectKey = key;
        return true;
      }
      return false;
    });
    if (!matchedSubjectKey) return "";

    for (const [key, aliases] of Object.entries(groups)) {
      if (key === matchedSubjectKey) continue;
      if (aliases.some((alias) => normalizedGoal.includes(alias))) return key;
    }
    return "";
  }

  function buildRoadmapPrompt(form) {
    const scoreSummary = getScoreSummary();
    const convoSummary = getConversationSummary();
    const lastSession = getLastExamSessionSummary();
    return `Ban la EVA, mot co van hoc tap than thien, noi tu nhien, am ap, khong len lop, khong khoa truong, khong tra loi kieu may moc.

Hay tao mot lo trinh hoc tap ca nhan bang tieng Viet cho hoc sinh theo thong tin sau:
- Mon/chuyen de: ${form.subject}
- Muc tieu: ${form.goal}
- So ngay: ${form.days}
- So phut hoc moi ngay: ${form.minutes}
- Muc do hien tai: ${form.level}
- Cuong do mong muon: ${form.intensity}
- Ghi chu them: ${form.notes || "khong co"}
- Nguon kien thuc do hoc sinh nap: ${roadmapKnowledgeText || "khong co"}

Du lieu bo tro:
- Tong hop diem/ket qua gan day: ${scoreSummary}
- Lich su tro chuyen gan day: ${convoSummary}
- Dot thi online gan nhat: ${lastSession}

Yeu cau:
- Viet lo trinh thuc te, linh hoat, khong qua may moc.
- Moi ngay chi de xuat nhung viec co the lam duoc trong ${form.minutes} phut, uu tien it ma chat.
- Neu hoc sinh ban, moi ngay phai co 1 phien ban nhe hon, khong gay cam giac bi dut nhá»‹p.
- Neu thay hoc sinh dang yeu nen, uu tien on nen truoc roi moi nang cao.
- Loi khuyen phai nghe tu nhien, nhu mot nguoi dong hanh dang noi chuyen voi hoc sinh that.
- Tranh viet kieu khau hieu hoac checklist vo cam. Moi task nen cu the va de bat tay vao hoc ngay.
- Neu muc tieu qua lon, tu dong chia nho thanh moc vua suc.

Chi tra ve JSON hop le, khong markdown, khong giai thich ngoai JSON.
Schema:
{
  "title": "string",
  "summary": "string",
  "todayFocus": "string",
  "coachNote": "string",
  "habits": ["string"],
  "milestones": [{"label":"string","outcome":"string"}],
  "schedule": [
    {
      "day": 1,
      "title": "string",
      "focus": "string",
      "tasks": ["string"],
      "lightVersion": "string",
      "successCheck": "string"
    }
  ]
}`;
  }

  function getScoreSummary() {
    const classes = typeof window.getClasses === "function" ? (window.getClasses() || []) : [];
    const summaries = [];
    classes.forEach((cls) => {
      const scores = [];
      (cls.students || []).forEach((st) => {
        if (Number.isFinite(Number(st.lastScore))) scores.push(Number(st.lastScore));
        else if (Array.isArray(st.scores)) {
          st.scores.forEach((s) => {
            if (Number.isFinite(Number(s?.score))) scores.push(Number(s.score));
          });
        }
      });
      if (!scores.length) return;
      const avg = scores.reduce((sum, item) => sum + item, 0) / scores.length;
      summaries.push(`${cls.name || "lop"}: trung binh ${avg.toFixed(1)} (${scores.length} dau diem)`);
    });
    return summaries.length ? summaries.slice(0, 4).join(" | ") : "chua co du lieu diem noi bo";
  }

  function getConversationSummary() {
    try {
      const raw = JSON.parse(localStorage.getItem("eva_conversation_history") || "[]");
      if (!Array.isArray(raw) || !raw.length) return "chua co du lieu";
      return raw.slice(-6).map((m) => `${m.role === "user" ? "Hoc sinh" : "EVA"}: ${String(m?.parts?.[0]?.text || "").slice(0, 120)}`).join(" || ");
    } catch {
      return "chua co du lieu";
    }
  }

  function getLastExamSessionSummary() {
    try {
      const session = JSON.parse(localStorage.getItem("eva_last_online_exam_session") || "null");
      if (!session) return "chua co";
      return `lop ${session.className || "chua ro"}, phong ${session.roomCode || "?"}, ${session.studentCount || 0} hoc sinh`;
    } catch {
      return "chua co";
    }
  }

  function extractRoadmapJson(raw) {
    const text = String(raw || "").trim();
    if (!text) throw new Error("Model khong tra ve noi dung.");
    const cleaned = text.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    }
    throw new Error("Khong doc duoc JSON lo trinh tu model.");
  }

  function normalizeRoadmapData(data, form) {
    const schedule = Array.isArray(data?.schedule) ? data.schedule : [];
    return {
      id: roadmapSavedId || id("roadmap"),
      createdAt: new Date().toISOString(),
      subject: form.subject,
      goal: form.goal,
      days: form.days,
      minutes: form.minutes,
      level: form.level,
      intensity: form.intensity,
      notes: form.notes,
      title: String(data?.title || `Lo trinh ${form.subject}`).trim(),
      summary: String(data?.summary || "").trim(),
      todayFocus: String(data?.todayFocus || "").trim(),
      coachNote: String(data?.coachNote || "").trim(),
      habits: Array.isArray(data?.habits) ? data.habits.map((x) => String(x || "").trim()).filter(Boolean) : [],
      milestones: Array.isArray(data?.milestones) ? data.milestones.map((item) => ({
        label: String(item?.label || "").trim(),
        outcome: String(item?.outcome || "").trim(),
      })).filter((x) => x.label || x.outcome) : [],
      schedule: schedule.map((item, idx) => ({
        day: Number(item?.day || idx + 1),
        title: String(item?.title || `Ngay ${idx + 1}`).trim(),
        focus: String(item?.focus || "").trim(),
        tasks: Array.isArray(item?.tasks) ? item.tasks.map((x) => String(x || "").trim()).filter(Boolean) : [],
        lightVersion: String(item?.lightVersion || "").trim(),
        successCheck: String(item?.successCheck || "").trim(),
      })),
    };
  }

  function renderRoadmapOutput() {
    const host = el("roadmap-output");
    if (!host) return;
    if (!roadmapCurrent) {
      host.innerHTML = '<div style="color:#9ca3af; line-height:1.5;">Chua co lo trinh. Hay nhap muc tieu roi bam <b>Tao lo trinh</b>.</div>';
      return;
    }
    host.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div class="roadmap-card">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
            <div>
              <div style="color:#fff;font-weight:700;font-size:1.05rem;">${esc(roadmapCurrent.title)}</div>
              <div style="color:#9ca3af;font-size:0.82rem;margin-top:4px;">${esc(roadmapCurrent.subject)} | ${esc(roadmapCurrent.goal)}</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <span class="roadmap-pill">${roadmapCurrent.days} ngay</span>
              <span class="roadmap-pill">${roadmapCurrent.minutes} phut/ngay</span>
              <span class="roadmap-pill">${esc(roadmapCurrent.intensity)}</span>
            </div>
          </div>
          <div style="color:#cbd5e1;line-height:1.55;margin-top:12px;">${esc(roadmapCurrent.summary || "Lo trinh da san sang.")}</div>
          ${roadmapCurrent.todayFocus ? `<div style="margin-top:12px;padding:10px 12px;border-radius:10px;background:#111827;border:1px solid #334155;"><div style="color:#93c5fd;font-weight:700;margin-bottom:4px;">Hom nay nen tap trung</div><div style="color:#e5e7eb;line-height:1.55;">${esc(roadmapCurrent.todayFocus)}</div></div>` : ""}
          ${roadmapCurrent.coachNote ? `<div style="margin-top:12px;padding:10px 12px;border-radius:10px;background:#1a2332;border:1px solid #334155;"><div style="color:#c4b5fd;font-weight:700;margin-bottom:4px;">Nhan tu EVA</div><div style="color:#e5e7eb;line-height:1.55;">${esc(roadmapCurrent.coachNote)}</div></div>` : ""}
        </div>
        ${roadmapCurrent.habits.length ? `<div class="roadmap-card"><div style="color:#fff;font-weight:700;margin-bottom:10px;">Nhip hoc EVA goi y</div>${roadmapCurrent.habits.map((h) => `<div style="color:#cbd5e1;line-height:1.5;margin-bottom:6px;">- ${esc(h)}</div>`).join("")}</div>` : ""}
        ${roadmapCurrent.milestones.length ? `<div class="roadmap-card"><div style="color:#fff;font-weight:700;margin-bottom:10px;">Cot moc</div>${roadmapCurrent.milestones.map((m) => `<div style="display:flex;flex-direction:column;gap:4px;padding:10px 0;border-bottom:1px solid #1f2937;"><div style="color:#93c5fd;font-weight:700;">${esc(m.label)}</div><div style="color:#cbd5e1;line-height:1.5;">${esc(m.outcome)}</div></div>`).join("")}</div>` : ""}
        <div class="roadmap-card">
          <div style="color:#fff;font-weight:700;margin-bottom:10px;">Lich hoc tung ngay</div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${roadmapCurrent.schedule.map((day) => `
              <div style="border:1px solid #273142;border-radius:12px;padding:12px;background:#0b1220;">
                <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;">
                  <div style="color:#fff;font-weight:700;">Ngay ${day.day} - ${esc(day.title)}</div>
                  <span class="roadmap-pill">${esc(day.focus || "tap trung on tap")}</span>
                </div>
                ${day.tasks.length ? `<div style="margin-top:10px;color:#cbd5e1;line-height:1.5;">${day.tasks.map((task) => `<div style="margin-bottom:6px;">- ${esc(task)}</div>`).join("")}</div>` : ""}
                ${day.lightVersion ? `<div style="margin-top:10px;padding:10px;border-radius:10px;background:#111827;border:1px dashed #334155;"><div style="color:#fcd34d;font-weight:700;margin-bottom:4px;">Neu hom do ban ban</div><div style="color:#e5e7eb;line-height:1.5;">${esc(day.lightVersion)}</div></div>` : ""}
                ${day.successCheck ? `<div style="margin-top:10px;color:#93c5fd;font-size:0.82rem;">Xong ngay khi: ${esc(day.successCheck)}</div>` : ""}
              </div>`).join("")}
          </div>
        </div>
      </div>`;
  }

  function renderRoadmapPlansContainer() {
    const host = el("plans-container");
    if (!host) return;
    const items = getSavedRoadmaps();
    if (!items.length) {
      host.innerHTML = "";
      return;
    }
    host.innerHTML = items.map((plan) => renderRoadmapPlanCard(plan)).join("");
  }

  function renderRoadmapPlanCard(plan) {
    const totalDays = Math.min(Math.max(Number(plan.days || plan.schedule?.length || 7), 1), 30);
    const visibleDay = roadmapProgress[plan.id] || 1;
    const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    const planTitle = plan.subject || "Lộ trình EVA";
    const summaryText = plan.summary || plan.coachNote || "Lộ trình đã sẵn sàng.";
    const dayIcons = Array.from({ length: Math.min(totalDays, 7) }, (_, idx) => {
      const done = idx + 1 < visibleDay;
      return `<div style="display:flex; flex-direction:column; align-items:center; gap:6px; min-width:36px;">
        <span style="font-size:1.55rem; filter:${done ? "drop-shadow(0 0 10px rgba(255,165,0,0.7))" : "none"}; opacity:${done ? "1" : "0.35"};">&#128293;</span>
        <span style="font-size:0.7rem; color:rgba(255,255,255,0.82); font-weight:600;">${labels[idx]}</span>
      </div>`;
    }).join("");

    return `
      <div style="background:#1e293b; border:1px solid #334155; border-radius:18px; padding:16px; box-shadow:0 10px 30px rgba(0,0,0,0.18);">
        <div style="background:linear-gradient(135deg,#4f46e5,#8b5cf6,#ec4899); border:1px solid rgba(255,255,255,0.1); border-radius:22px; padding:18px; color:#fff; position:relative; overflow:hidden; margin-bottom:16px;">
          <div style="position:absolute; top:-24px; right:-20px; width:130px; height:130px; background:rgba(255,255,255,0.08); border-radius:999px; filter:blur(20px);"></div>
          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:18px; position:relative; z-index:1;">
            <h2 style="font-size:2rem; line-height:1; font-weight:900; margin:0;">${esc(planTitle)}</h2>
            <span style="font-size:0.8rem; font-weight:700; color:rgba(255,255,255,0.92); background:rgba(255,255,255,0.18); padding:8px 12px; border-radius:999px; border:1px solid rgba(255,255,255,0.18);">${esc(plan.goal || "")}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:14px; flex-wrap:wrap; position:relative; z-index:1;">
            <div style="display:flex; align-items:center; gap:8px; font-size:1.35rem; font-weight:800;">
              <span>&#128293;</span>
              <span>Chuỗi</span>
            </div>
            <button type="button" onclick="revealRoadmapNextDay('${plan.id}')" style="border:none; background:#fff; color:#6d28d9; border-radius:999px; padding:10px 14px; font-size:0.8rem; font-weight:800; cursor:pointer;">
              ${visibleDay > totalDays ? "Hoàn thành!" : `Tiếp tục ngày ${visibleDay}`}
            </button>
          </div>
          <div style="display:flex; justify-content:space-between; gap:6px; margin-top:14px; position:relative; z-index:1;">${dayIcons}</div>
        </div>
        <div style="display:flex; gap:10px; align-items:flex-start; margin-bottom:16px;">
          <div style="width:28px; height:28px; border-radius:999px; background:rgba(59,130,246,0.15); color:#60a5fa; display:flex; align-items:center; justify-content:center; flex-shrink:0;">i</div>
          <p style="margin:0; color:#cbd5e1; font-size:0.92rem; line-height:1.65;">"${esc(summaryText)}"</p>
        </div>
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${(plan.schedule || []).map((day) => {
            const hidden = Number(day.day) > visibleDay;
            const done = Number(day.day) < visibleDay;
            const studyTopic = encodeURIComponent(String(day.focus || plan.subject || "").trim());
            return `
            <div style="display:${hidden ? "none" : "block"}; background:${done ? "rgba(20,83,45,0.18)" : "rgba(17,24,39,0.5)"}; border:1px solid ${done ? "rgba(34,197,94,0.35)" : "rgba(55,65,81,0.8)"}; border-radius:14px; padding:14px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
                <h4 style="margin:0; color:#fff; font-size:0.98rem; font-weight:800;"><span style="background:${done ? "#16a34a" : "#3b82f6"}; color:#fff; padding:3px 8px; border-radius:999px; font-size:0.72rem; margin-right:8px;">Ngày ${day.day}</span>${esc(day.title || "")}</h4>
                <span style="font-size:0.72rem; font-weight:700; color:${done ? "#4ade80" : "#60a5fa"}; background:${done ? "rgba(34,197,94,0.12)" : "rgba(59,130,246,0.12)"}; border:1px solid ${done ? "rgba(34,197,94,0.25)" : "rgba(59,130,246,0.2)"}; border-radius:999px; padding:6px 10px;">${done ? "Đã hoàn thành" : esc(day.focus || "Đang học lý thuyết")}</span>
              </div>
              <div style="color:#9ca3af; font-size:0.86rem; line-height:1.6; margin-bottom:10px;">${(day.tasks || []).map((task) => `- ${esc(task)}`).join("<br>") || esc(day.focus || "")}</div>
              ${day.lightVersion ? `<div style="margin-bottom:10px; background:rgba(30,41,59,0.5); border:1px dashed rgba(148,163,184,0.4); border-radius:12px; padding:10px; color:#cbd5e1; font-size:0.84rem;"><strong style="color:#fcd34d;">Nếu hôm đó bạn bận:</strong> ${esc(day.lightVersion)}</div>` : ""}
              ${day.successCheck ? `<div style="margin-bottom:10px; color:#93c5fd; font-size:0.8rem;">Xong ngày khi: ${esc(day.successCheck)}</div>` : ""}
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button type="button" onclick="openRoadmapStudy(decodeURIComponent('${studyTopic}'))" style="flex:1; min-width:180px; border-radius:10px; border:1px solid rgba(59,130,246,0.35); background:rgba(59,130,246,0.1); color:#93c5fd; padding:10px; font-size:0.78rem; font-weight:700; cursor:pointer;">Mở Chatbot EVA</button>
                <button type="button" onclick="completeRoadmapDay('${plan.id}', ${Number(day.day)})" style="flex:1; min-width:180px; border-radius:10px; border:1px solid rgba(34,197,94,0.28); background:rgba(20,83,45,0.2); color:#4ade80; padding:10px; font-size:0.78rem; font-weight:700; cursor:pointer;">Đánh dấu hoàn thành</button>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>`;
  }

  function openRoadmapStudy(topic) {
    if (typeof window.switchPage === "function") window.switchPage("chatbot");
    setTimeout(() => {
      const input = document.getElementById("message-input");
      if (input) {
        input.value = `EVA ơi, bắt đầu giúp mình phần: ${String(topic || "").trim()}`;
        input.focus();
      }
    }, 80);
  }
  function revealRoadmapNextDay(planId) {
    const item = getSavedRoadmaps().find((x) => x.id === planId);
    if (!item) return;
    const total = Math.max(1, Number(item.days || item.schedule?.length || 1));
    roadmapProgress[planId] = Math.min(total + 1, (roadmapProgress[planId] || 1) + 1);
    renderRoadmapPlansContainer();
  }

  function completeRoadmapDay(planId, dayNumber) {
    const item = getSavedRoadmaps().find((x) => x.id === planId);
    if (!item) return;
    const total = Math.max(1, Number(item.days || item.schedule?.length || 1));
    roadmapProgress[planId] = Math.min(total + 1, Math.max(roadmapProgress[planId] || 1, Number(dayNumber) + 1));
    renderRoadmapPlansContainer();
  }

  function appendRoadmapLog(role, msg) {
    const host = el("roadmap-ai-log");
    if (!host) return;
    const row = document.createElement("div");
    row.style.marginBottom = "8px";
    row.innerHTML = `<div style="color:${role === "bot" ? "#93c5fd" : "#fff"};font-weight:600;margin-bottom:2px;">${role === "bot" ? "EVA" : "Ban"}</div><div>${esc(msg)}</div>`;
    host.appendChild(row);
    host.scrollTop = host.scrollHeight;
  }

  function setRoadmapStatus(text, isError = false) {
    const host = el("roadmap-status");
    if (!host) return;
    host.style.color = isError ? "#fca5a5" : "#9ca3af";
    host.textContent = text || "";
  }

  function saveCurrentRoadmap() {
    if (!roadmapCurrent) {
      setRoadmapStatus("Chua co lo trinh de luu.", true);
      return;
    }
    const items = getSavedRoadmaps();
    const record = { ...roadmapCurrent, id: roadmapSavedId || roadmapCurrent.id || id("roadmap"), createdAt: roadmapCurrent.createdAt || new Date().toISOString() };
    const idx = items.findIndex((item) => item.id === record.id);
    if (idx >= 0) items[idx] = record; else items.unshift(record);
    setSavedRoadmaps(items);
    roadmapSavedId = record.id;
    roadmapCurrent.id = record.id;
    renderRoadmapSavedList();
    setRoadmapStatus("Da luu lo trinh.");
  }

  function resetRoadmapForm() {
    ["roadmap-subject", "roadmap-goal", "roadmap-notes"].forEach((key) => {
      if (el(key)) el(key).value = "";
    });
    if (el("roadmap-days")) el("roadmap-days").value = "14";
    if (el("roadmap-minutes")) el("roadmap-minutes").value = "45";
    if (el("roadmap-level")) el("roadmap-level").value = "chua_ro";
    if (el("roadmap-intensity")) el("roadmap-intensity").value = "vua_suc";
    roadmapCurrent = null;
    roadmapSavedId = null;
    roadmapKnowledgeText = "";
    if (el("plan-goal")) el("plan-goal").value = "";
    if (el("subject-selector")) el("subject-selector").selectedIndex = 0;
    const status = el("knowledge-status");
    if (status) {
      status.textContent = "ChÆ°a náº¡p. Nháº¥n Ä‘á»ƒ náº¡p tÃ i liá»‡u";
      status.style.color = "";
    }
    setRoadmapStatus("");
    renderRoadmapOutput();
    renderRoadmapPlansContainer();
  }

  function renderRoadmapSavedList() {
    const host = el("roadmap-saved-list");
    if (!host) return;
    const items = getSavedRoadmaps();
    if (!items.length) {
      host.innerHTML = '<div style="color:#9ca3af;font-size:0.88rem; line-height:1.45;">Chua co lo trinh nao duoc luu.</div>';
      return;
    }
    host.innerHTML = items.map((item) => `
      <div style="background:#0f141d;border:1px solid #273142;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div>
            <div style="color:#fff;font-weight:700;">${esc(item.title || item.subject || "Lo trinh EVA")}</div>
            <div style="color:#9ca3af;font-size:0.8rem;margin-top:4px;">${esc(item.subject || "")} | ${item.days || 0} ngay</div>
          </div>
          <span class="roadmap-pill">${new Date(item.createdAt || Date.now()).toLocaleDateString()}</span>
        </div>
        <div style="color:#cbd5e1;font-size:0.84rem;line-height:1.45;">${esc(item.goal || item.summary || "")}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="modal-btn" style="background:#2563eb;" onclick="loadSavedRoadmap('${item.id}')">Mo</button>
          <button type="button" class="modal-btn" style="background:#7f1d1d;" onclick="deleteSavedRoadmap('${item.id}')">Xoa</button>
        </div>
      </div>`).join("");
  }

  function loadSavedRoadmap(idValue) {
    const item = getSavedRoadmaps().find((x) => x.id === idValue);
    if (!item) return;
    roadmapCurrent = JSON.parse(JSON.stringify(item));
    roadmapSavedId = item.id;
    if (el("subject-selector")) el("subject-selector").value = item.subject || "";
    if (el("plan-goal")) el("plan-goal").value = item.goal || "";
    if (el("roadmap-subject")) el("roadmap-subject").value = item.subject || "";
    if (el("roadmap-goal")) el("roadmap-goal").value = item.goal || "";
    if (el("roadmap-days")) el("roadmap-days").value = item.days || 14;
    if (el("roadmap-minutes")) el("roadmap-minutes").value = item.minutes || 45;
    if (el("roadmap-level")) el("roadmap-level").value = item.level || "chua_ro";
    if (el("roadmap-intensity")) el("roadmap-intensity").value = item.intensity || "vua_suc";
    if (el("roadmap-notes")) el("roadmap-notes").value = item.notes || "";
    renderRoadmapOutput();
    renderRoadmapPlansContainer();
    appendRoadmapLog("bot", `Da mo lai lo trinh: ${item.title || item.subject}`);
  }

  function deleteSavedRoadmap(idValue) {
    if (!confirm("Xoa lo trinh nay?")) return;
    setSavedRoadmaps(getSavedRoadmaps().filter((x) => x.id !== idValue));
    if (roadmapSavedId === idValue) {
      roadmapCurrent = null;
      roadmapSavedId = null;
      renderRoadmapOutput();
    }
    renderRoadmapSavedList();
    renderRoadmapPlansContainer();
  }

  window.loadSavedRoadmap = loadSavedRoadmap;
  window.deleteSavedRoadmap = deleteSavedRoadmap;
  window.openRoadmapStudy = openRoadmapStudy;
  window.revealRoadmapNextDay = revealRoadmapNextDay;
  window.completeRoadmapDay = completeRoadmapDay;

  function showResultsMessage(type, text) {
    const host = el("eva-results-message");
    if (!host) return;
    if (!text) {
      host.innerHTML = "";
      return;
    }
    const bg = type === "error" ? "#7f1d1d" : "#0c4a6e";
    const fg = type === "error" ? "#fee2e2" : "#e0f2fe";
    host.innerHTML = `<div style="padding:10px 12px;border-radius:10px;background:${bg};color:${fg};font-size:14px;">${esc(text)}</div>`;
  }

  function formatResultsDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("vi-VN");
  }

  async function resultsApiFetch(path, options = {}) {
    if (typeof window.sbRest === "function") {
      return await window.sbRest(path, options);
    }
    throw new Error("Khong tim thay sbRest.");
  }

  async function findRoomByCode(roomCode) {
    const data = await resultsApiFetch(`/rest/v1/exam_rooms?room_code=eq.${encodeURIComponent(roomCode)}&select=id,room_code,room_name,exam_id&limit=1`);
    return data && data.length ? data[0] : null;
  }

  async function findRoomByClassName(className) {
    const term = String(className || "").trim();
    if (!term) return null;
    const data = await resultsApiFetch(`/rest/v1/exam_rooms?room_name=ilike.*${encodeURIComponent(term)}*&select=id,room_code,room_name,exam_id&limit=5`);
    return data && data.length ? data[0] : null;
  }

  async function fetchRoomStudents(roomId) {
    return await resultsApiFetch(`/rest/v1/room_students?room_id=eq.${roomId}&select=student_code,student_name&order=student_code.asc,student_name.asc`);
  }

  async function fetchAttemptsByRoom(roomId) {
    try {
      return await resultsApiFetch(`/rest/v1/attempts?room_id=eq.${roomId}&select=id,student_code,student_name,score,correct_count,total_questions,status,is_submitted,submitted_at,started_at&order=started_at.desc,id.desc`);
    } catch {
      return await resultsApiFetch(`/rest/v1/attempts?room_id=eq.${roomId}&select=id,student_code,student_name,score,status,is_submitted,submitted_at,started_at&order=started_at.desc,id.desc`);
    }
  }

  function resultsKeyOf(studentCode, studentName) {
    return `${String(studentCode || "").trim().toUpperCase()}__${String(studentName || "").trim().toLowerCase()}`;
  }

  function buildLatestAttemptMap(attempts) {
    const map = new Map();
    attempts.forEach((attempt) => {
      const key = resultsKeyOf(attempt.student_code, attempt.student_name);
      if (!map.has(key)) map.set(key, attempt);
    });
    return map;
  }

  function buildResultRows(students, latestMap) {
    return students.map((student, idx) => {
      const key = resultsKeyOf(student.student_code, student.student_name);
      const attempt = latestMap.get(key) || null;
      const submitted = !!(attempt && (attempt.status === "submitted" || attempt.is_submitted === true || attempt.submitted_at));
      return {
        stt: idx + 1,
        student_name: student.student_name || "",
        student_code: student.student_code || "",
        correct_count: submitted
          ? (Number.isFinite(Number(attempt?.correct_count)) ? Number(attempt.correct_count) : (Number.isFinite(Number(attempt?.correct)) ? Number(attempt.correct) : "-"))
          : "-",
        score: submitted ? (attempt?.score ?? 0) : "-",
        status: submitted ? "submitted" : (attempt?.status || "not_started"),
        submitted_at: submitted ? formatResultsDate(attempt?.submitted_at) : "",
      };
    });
  }

  function applyResultsSearch(rows, keyword) {
    const kw = String(keyword || "").trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter((row) => {
      const name = String(row.student_name || "").toLowerCase();
      const code = String(row.student_code || "").toLowerCase();
      return name.includes(kw) || code.includes(kw);
    });
  }

  function renderResultsTable(rows) {
    const tbody = el("eva-results-tbody");
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="padding:18px;color:#9ca3af;text-align:center;">Chua co du lieu de hien thi.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map((row, index) => {
      const scoreHtml = row.score === "-" ? '<span class="results-dash">-</span>' : `<span class="results-ok">${esc(row.score)}</span>`;
      const correctHtml = row.correct_count === "-" ? '<span class="results-dash">-</span>' : `<span class="results-ok">${esc(row.correct_count)}</span>`;
      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #2b2f39;">${index + 1}</td>
          <td style="padding:12px;border-bottom:1px solid #2b2f39;">${esc(row.student_name)}</td>
          <td style="padding:12px;border-bottom:1px solid #2b2f39;">${esc(row.student_code)}</td>
          <td style="padding:12px;border-bottom:1px solid #2b2f39;">${correctHtml}</td>
          <td style="padding:12px;border-bottom:1px solid #2b2f39;">${scoreHtml}</td>
          <td style="padding:12px;border-bottom:1px solid #2b2f39;"><span class="results-chip">${esc(row.status)}</span></td>
          <td style="padding:12px;border-bottom:1px solid #2b2f39;">${esc(row.submitted_at || "")}</td>
        </tr>`;
    }).join("");
  }

  function renderResultsSummary() {
    const host = el("eva-results-summary");
    if (!host) return;
    if (!latestRenderedRows.length) {
      host.textContent = "Nhap ma phong hoac ten lop de xem bang diem.";
      return;
    }
    const submitted = latestRenderedRows.filter((row) => row.status === "submitted");
    const numericScores = submitted.map((row) => Number(row.score)).filter(Number.isFinite);
    const avg = numericScores.length ? (numericScores.reduce((sum, item) => sum + item, 0) / numericScores.length).toFixed(2) : "-";
    host.textContent = `${latestRenderedRows.length} hoc sinh | ${submitted.length} da nop | diem TB: ${avg}`;
  }

  function toResultsCsv(rows) {
    const header = ["STT", "Ho ten", "So bao danh", "So cau dung", "Diem", "Trang thai", "Thoi gian nop"];
    const lines = [header.join(",")];
    rows.forEach((row, idx) => {
      const cols = [
        idx + 1,
        `"${String(row.student_name || "").replace(/"/g, '""')}"`,
        `"${String(row.student_code || "").replace(/"/g, '""')}"`,
        row.correct_count,
        row.score,
        row.status,
        `"${String(row.submitted_at || "").replace(/"/g, '""')}"`,
      ];
      lines.push(cols.join(","));
    });
    return "\uFEFF" + lines.join("\n");
  }

  function exportResultsCsv() {
    if (!latestRenderedRows.length) {
      showResultsMessage("error", "Chua co du lieu de export.");
      return;
    }
    const csv = toResultsCsv(latestRenderedRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const roomCode = (el("eva-results-room-code")?.value || "room").trim();
    a.href = url;
    a.download = `eva_results_${roomCode || "room"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function loadIntegratedResults() {
    const roomCode = (el("eva-results-room-code")?.value || "").trim();
    const className = (el("eva-results-class-name")?.value || "").trim();
    const searchText = (el("eva-results-search-text")?.value || "").trim();

    if (!roomCode && !className) {
      showResultsMessage("error", "Nhap ma phong hoac ten lop.");
      return;
    }

    showResultsMessage("info", "Dang tai bang diem...");
    try {
      let room = null;
      if (roomCode) room = await findRoomByCode(roomCode);
      if (!room && className) room = await findRoomByClassName(className);
      if (!room) throw new Error("Khong tim thay phong thi phu hop.");

      const [students, attempts] = await Promise.all([
        fetchRoomStudents(room.id),
        fetchAttemptsByRoom(room.id),
      ]);

      allLoadedRows = buildResultRows(students || [], buildLatestAttemptMap(attempts || []));
      latestRenderedRows = applyResultsSearch(allLoadedRows, searchText);
      renderResultsTable(latestRenderedRows);
      renderResultsSummary();
      showResultsMessage("info", `Da tai phong ${room.room_code || roomCode}${room.room_name ? ` - ${room.room_name}` : ""}.`);
      if (el("eva-results-room-code") && !el("eva-results-room-code").value) el("eva-results-room-code").value = room.room_code || "";
      if (el("eva-results-class-name") && !el("eva-results-class-name").value) el("eva-results-class-name").value = room.room_name || className;
    } catch (err) {
      allLoadedRows = [];
      latestRenderedRows = [];
      renderResultsTable([]);
      renderResultsSummary();
      showResultsMessage("error", err?.message || "Khong tai duoc bang diem.");
    }
  }

  function hydrateResultsFromLastSession() {
    try {
      const session = JSON.parse(localStorage.getItem("eva_last_online_exam_session") || "null");
      if (!session) return;
      if (el("eva-results-room-code") && !el("eva-results-room-code").value) el("eva-results-room-code").value = session.roomCode || "";
      if (el("eva-results-class-name") && !el("eva-results-class-name").value) el("eva-results-class-name").value = session.className || "";
    } catch {}
  }

  function openIntegratedResultsView(roomCode = "", className = "") {
    if (roomCode && el("eva-results-room-code")) el("eva-results-room-code").value = roomCode;
    if (className && el("eva-results-class-name")) el("eva-results-class-name").value = className;
    if (typeof window.switchPage === "function") {
      window.switchPage("results");
    } else {
      ensureScheduleUIInitialized();
      hydrateResultsFromLastSession();
    }
    setTimeout(() => {
      void loadIntegratedResults();
    }, 80);
  }

  window.openIntegratedResultsView = openIntegratedResultsView;
  window.loadIntegratedResults = loadIntegratedResults;
})();

