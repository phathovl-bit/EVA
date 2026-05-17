(function () {
  if (window.__evaHubModuleLoaded) return;
  window.__evaHubModuleLoaded = true;

  const EVA_HUB_STORAGE_KEY = "eva_hub_state_v1";
  const EVA_HUB_VERSIONS_KEY = "eva_hub_versions_v1";
  const MAX_VERSIONS = 15;
  const ACE_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.6/ace.min.js";
  const DEFAULT_WORKER_URL = "https://eva1.phatho-vl.workers.dev/chat";

  const EVA_HUB_STATE = {
    open: false,
    mode: "doc",
    docContent: "",
    codeContent: "",
    codeLanguage: "javascript",
    mathContent: "",
    versions: [],
    aceInstance: null,
    aceLoaded: false,
    pendingDiff: "",
    selectedText: "",
    selectedRange: null,
    abortCtrl: null,
    runnerTimeoutId: null,
    voiceRecognition: null,
    voiceListening: false,
  };

  const refs = {};
  let aceLoaderPromise = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeJsonParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function loadPersistedState() {
    const saved = safeJsonParse(localStorage.getItem(EVA_HUB_STORAGE_KEY) || "null", null);
    const versions = safeJsonParse(localStorage.getItem(EVA_HUB_VERSIONS_KEY) || "[]", []);
    if (saved && typeof saved === "object") {
      EVA_HUB_STATE.mode = saved.mode || "doc";
      EVA_HUB_STATE.docContent = saved.docContent || "";
      EVA_HUB_STATE.codeContent = saved.codeContent || "";
      EVA_HUB_STATE.codeLanguage = saved.codeLanguage || "javascript";
      EVA_HUB_STATE.mathContent = saved.mathContent || "";
    }
    EVA_HUB_STATE.versions = Array.isArray(versions) ? versions : [];
  }

  function persistState() {
    const editor = refs.docEditor;
    if (editor) EVA_HUB_STATE.docContent = editor.innerHTML;
    if (refs.mathInput) EVA_HUB_STATE.mathContent = refs.mathInput.value || "";
    try {
      localStorage.setItem(
        EVA_HUB_STORAGE_KEY,
        JSON.stringify({
          mode: EVA_HUB_STATE.mode,
          docContent: EVA_HUB_STATE.docContent,
          codeContent: getCodeValue(),
          codeLanguage: EVA_HUB_STATE.codeLanguage,
          mathContent: EVA_HUB_STATE.mathContent,
        })
      );
    } catch (error) {
      console.warn("[EVA HUB] persist state failed:", error);
    }
  }

  function saveVersion() {
    const content = refs.docEditor ? refs.docEditor.innerHTML.trim() : "";
    if (!content) return;
    try {
      const versions = safeJsonParse(localStorage.getItem(EVA_HUB_VERSIONS_KEY) || "[]", []);
      versions.unshift({
        ts: Date.now(),
        label: new Date().toLocaleTimeString("vi-VN"),
        content,
        mode: EVA_HUB_STATE.mode,
      });
      const trimmed = versions.slice(0, MAX_VERSIONS);
      EVA_HUB_STATE.versions = trimmed;
      localStorage.setItem(EVA_HUB_VERSIONS_KEY, JSON.stringify(trimmed));
      renderVersionHints();
    } catch (error) {
      console.warn("[EVA HUB] save version failed:", error);
    }
  }

  function renderVersionHints() {
    if (!refs.versionList) return;
    const items = EVA_HUB_STATE.versions.slice(0, 5);
    refs.versionList.innerHTML = items.length
      ? items
          .map(
            (item) =>
              `<div class="eva-hub-mini-chip" title="${new Date(item.ts).toLocaleString("vi-VN")}">${escapeHtml(item.label)} · ${escapeHtml(
                item.mode.toUpperCase()
              )}</div>`
          )
          .join("")
      : '<div class="eva-hub-mini-chip">Chưa có phiên bản lưu.</div>';
  }

  function renderShortcutHints() {
    if (!refs.shortcutList) return;
    refs.shortcutList.innerHTML = [
      "EVA_HUB",
      "EVA_HUB CODE",
      "EVA_HUB MATH",
      "Esc để đóng HUB",
    ]
      .map((item) => `<div class="eva-hub-mini-chip">${escapeHtml(item)}</div>`)
      .join("");
  }

  function getHubCurrentMode() {
    if (typeof window.getAdminPipelineConfig === "function") {
      return window.getAdminPipelineConfig();
    }
    return {
      mode: "flash",
      label: "Flash",
      model: "gemma-3-27b-it",
      promptLayer: "Flash mode. Answer fast, directly, and briefly.",
    };
  }

  function getWorkerChatUrl() {
    if (typeof window.buildWorkerChatUrl === "function") {
      const url = window.buildWorkerChatUrl();
      if (url) return url;
    }
    return DEFAULT_WORKER_URL;
  }

  async function hubCallWorkerChat(promptText, payload) {
    if (EVA_HUB_STATE.abortCtrl) {
      EVA_HUB_STATE.abortCtrl.abort();
    }
    const ctrl = new AbortController();
    EVA_HUB_STATE.abortCtrl = ctrl;

    const bodyObj = {
      prompt: String(promptText || ""),
      role: typeof window.isAdminRole === "function" && window.isAdminRole() ? "admin" : "user",
      task: payload?.task || "chat",
    };
    if (payload && typeof payload === "object") {
      Object.assign(bodyObj, payload);
    }

    try {
      const res = await fetch(getWorkerChatUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyObj),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.upstream?.message ||
          data?.upstream?.raw ||
          data?.error?.error?.message ||
          data?.error?.message ||
          (typeof data?.error === "string" ? data.error : "") ||
          data?.message ||
          `Worker HTTP ${res.status}`;
        throw new Error(msg);
      }
      const text = data?.text ?? data?.response ?? data?.output ?? data?.message ?? "";
      return String(text || "").trim();
    } finally {
      if (EVA_HUB_STATE.abortCtrl === ctrl) {
        EVA_HUB_STATE.abortCtrl = null;
      }
    }
  }

  // CODE SYSTEM PROMPTS cho từng mode
  const CODE_SYSTEM_PROMPTS = {
    flash: "You are a senior software engineer. Write clean, working code. Output ONLY the raw code inside a single fenced code block (e.g. ```javascript ... ```). No explanations unless asked.",
    thinking: "You are an expert software engineer. Analyze the request carefully, write well-structured, commented code. Output the code in a fenced code block first, then a brief explanation below.",
    deep: {
      draft: "[STAGE 1 - DRAFT] You are an expert coder. Write a complete, working implementation for the request. Include all necessary functions, edge cases, and error handling. Output as a single fenced code block.",
      verify: "[STAGE 2 - REVIEW & OPTIMIZE] You are a senior code reviewer. Review the DRAFT CODE below. Fix bugs, improve efficiency, add missing edge cases, ensure best practices. Output the final, improved code in a fenced code block, followed by a short changelog."
    }
  };

  function getCodeAwarePrompt(userPrompt) {
    const isCodeRequest = /viết|tạo|code|lập trình|function|script|html|css|javascript|python|write|create|implement|fix|debug/i.test(userPrompt);
    if (!isCodeRequest) return null;
    const config = getHubCurrentMode();
    const mode = config.mode || "flash";
    return CODE_SYSTEM_PROMPTS[mode] || null;
  }

  async function evaHubAskAi(promptText, opts = {}) {
    const config = getHubCurrentMode();
    const mode = config.mode || "flash";
    const systemLayer = opts.codeMode
      ? (typeof CODE_SYSTEM_PROMPTS[mode] === "string" ? CODE_SYSTEM_PROMPTS[mode] : CODE_SYSTEM_PROMPTS[mode]?.draft || "")
      : (config.promptLayer || "");
    const basePrompt = [systemLayer, String(promptText || "").trim()].filter(Boolean).join("\n\n");
    if (mode === "deep") {
      const draftLayer = opts.codeMode ? CODE_SYSTEM_PROMPTS.deep.draft : (config.promptLayer || "");
      const draftPrompt = [draftLayer, String(promptText || "").trim()].filter(Boolean).join("\n\n");
      const draft = await hubCallWorkerChat(draftPrompt, {
        task: "deep",
        model: config.model || "gemini-2.5-flash-preview-04-17",
      });
      if (EVA_HUB_STATE.abortCtrl?.signal?.aborted) return draft;
      const verifyLayer = opts.codeMode ? CODE_SYSTEM_PROMPTS.deep.verify : (config.verifyPromptLayer || "");
      const verifyPrompt = [
        verifyLayer,
        "--- DRAFT CODE ---",
        draft,
        "--- ORIGINAL REQUEST ---",
        String(promptText || "").trim(),
      ].filter(Boolean).join("\n\n");
      return await hubCallWorkerChat(verifyPrompt, {
        task: "deep",
        model: config.verifyModel || "gemini-2.5-flash",
      });
    }
    return await hubCallWorkerChat(basePrompt, {
      task: mode === "thinking" ? "analysis" : "chat",
      model: config.model || "gemma-3-27b-it",
    });
  }

  function showToast(message, tone) {
    if (!refs.toastStack) return;
    const node = document.createElement("div");
    node.className = "eva-hub-toast";
    if (tone) node.dataset.tone = tone;
    node.textContent = message;
    refs.toastStack.appendChild(node);
    window.setTimeout(() => {
      node.classList.add("closing");
      window.setTimeout(() => node.remove(), 220);
    }, 2400);
  }

  function showLoading(label) {
    if (!refs.loading) return;
    if (refs.loadingText) refs.loadingText.textContent = label || "EVA đang xử lý...";
    refs.loading.classList.remove("hidden");
  }

  function hideLoading() {
    if (refs.loading) refs.loading.classList.add("hidden");
  }

  function hideAiPopup() {
    if (refs.aiPopup) refs.aiPopup.classList.add("hidden");
  }

  function showAiPopupFromSelection() {
    if (!refs.docEditor || !refs.aiPopup) return;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) {
      hideAiPopup();
      return;
    }
    const range = selection.getRangeAt(0);
    if (!refs.docEditor.contains(range.commonAncestorContainer)) {
      hideAiPopup();
      return;
    }
    const selectedText = selection.toString().trim();
    if (selectedText.length < 4) {
      hideAiPopup();
      return;
    }
    EVA_HUB_STATE.selectedText = selectedText;
    EVA_HUB_STATE.selectedRange = range.cloneRange();
    const rect = range.getBoundingClientRect();
    refs.aiPopup.style.left = `${Math.max(16, rect.left + rect.width / 2 - refs.aiPopup.offsetWidth / 2)}px`;
    refs.aiPopup.style.top = `${Math.max(16, rect.top - 56)}px`;
    refs.aiPopup.classList.remove("hidden");
  }

  function showDiff(oldText, newText) {
    EVA_HUB_STATE.pendingDiff = String(newText || "").trim();
    if (!refs.diffPanel || !refs.diffOld || !refs.diffNew) return;
    refs.diffOld.textContent = String(oldText || "").trim();
    refs.diffNew.textContent = EVA_HUB_STATE.pendingDiff;
    refs.diffPanel.classList.remove("hidden");
  }

  function hideDiff() {
    EVA_HUB_STATE.pendingDiff = "";
    if (refs.diffPanel) refs.diffPanel.classList.add("hidden");
  }

  function getSendButtonBusy() {
    const sendBtn = byId("send-btn");
    return !!(sendBtn && sendBtn.classList.contains("stop-mode"));
  }

  function sendTextToChat(text, options = {}) {
    const input = byId("message-input");
    if (!input || typeof window.sendMessage !== "function") {
      showToast("Không tìm thấy ô chat để gửi nội dung.", "danger");
      return false;
    }
    input.value = String(text || "").trim();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    if (getSendButtonBusy()) {
      showToast("EVA đang bận. Mình đã điền sẵn nội dung vào ô chat.", "info");
      if (options.closeAfter) evaHubClose();
      return false;
    }
    window.sendMessage();
    if (options.closeAfter) evaHubClose();
    return true;
  }

  function detectLanguage(code) {
    const text = String(code || "");
    if (/<!doctype html>|<html|<body|<\/\w+>/i.test(text)) return "html";
    if (/<style[\s>]|[.#][\w-]+\s*\{[\s\S]*\}/i.test(text) && !/function|const|let|=>/.test(text)) return "css";
    if (/def\s+\w+\(|print\(|import\s+\w+|if __name__ == ['"]__main__['"]/.test(text)) return "python";
    return "javascript";
  }

  function setLanguageSelection(lang, markManual) {
    const normalizedInput = String(lang || "").toLowerCase().trim();
    // Map common aliases
    const aliasMap = { js: "javascript", ts: "javascript", typescript: "javascript", htm: "html", py: "python" };
    const mapped = aliasMap[normalizedInput] || normalizedInput;
    const normalized = ["javascript", "python", "html", "css"].includes(mapped) ? mapped : "javascript";
    EVA_HUB_STATE.codeLanguage = normalized;
    if (refs.langSelect) refs.langSelect.value = normalized;
    if (markManual && refs.langSelect) refs.langSelect.dataset.manual = "1";
    if (EVA_HUB_STATE.aceInstance) {
      try {
        const modeName = normalized === "html" ? "html" : normalized === "css" ? "css" : normalized === "python" ? "python" : "javascript";
        EVA_HUB_STATE.aceInstance.session.setMode(`ace/mode/${modeName}`);
      } catch {}
    }
  }

  function getCodeValue() {
    if (EVA_HUB_STATE.aceInstance) return EVA_HUB_STATE.aceInstance.getValue();
    return refs.codeFallback ? refs.codeFallback.value : EVA_HUB_STATE.codeContent;
  }

  function setCodeValue(code) {
    const text = String(code || "");
    EVA_HUB_STATE.codeContent = text;
    if (EVA_HUB_STATE.aceInstance) {
      EVA_HUB_STATE.aceInstance.setValue(text, -1);
    }
    if (refs.codeFallback) refs.codeFallback.value = text;
    if (!(refs.langSelect && refs.langSelect.dataset.manual === "1")) {
      setLanguageSelection(detectLanguage(text), false);
    }
    persistState();
  }

  function appendRunnerLog(level, lines) {
    if (!refs.codeConsole) return;
    const stamp = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const chunk = document.createElement("div");
    chunk.className = `eva-hub-console-line level-${level || "log"}`;
    chunk.textContent = `[${stamp}] ${String(level || "log").toUpperCase()}: ${Array.isArray(lines) ? lines.join(" ") : String(lines || "")}`;
    refs.codeConsole.appendChild(chunk);
    refs.codeConsole.scrollTop = refs.codeConsole.scrollHeight;
  }

  function clearRunnerTimeout() {
    if (EVA_HUB_STATE.runnerTimeoutId) {
      clearTimeout(EVA_HUB_STATE.runnerTimeoutId);
      EVA_HUB_STATE.runnerTimeoutId = null;
    }
  }

  function buildRunnerHtml(code, lang) {
    const bridge =
      "<script>(function(){" +
      "var send=function(level,args,type){parent.postMessage({source:'EVA_HUB_RUNNER',level:level,args:args,type:type||'console'},'*');};" +
      "['log','info','warn','error'].forEach(function(level){var orig=console[level];console[level]=function(){var args=[].slice.call(arguments).map(function(item){if(typeof item==='object'){try{return JSON.stringify(item,null,2);}catch(_){return String(item);}}return String(item);});send(level,args);if(orig){return orig.apply(console,arguments);}};});" +
      "window.addEventListener('error',function(event){send('error',[event.message+' @ '+event.filename+':'+event.lineno]);});" +
      "window.addEventListener('load',function(){send('info',['Runner loaded'],'loaded');});" +
      "send('info',['Runner ready']);" +
      "})();<\/script>";
    if (lang === "html") {
      if (/<\/body>/i.test(code)) return code.replace(/<\/body>/i, `${bridge}</body>`);
      return `${code}${bridge}`;
    }
    if (lang === "css") {
      return `<!doctype html><html><head><style>${code}</style>${bridge}</head><body><div class="demo-card">EVA HUB CSS preview</div></body></html>`;
    }
    return `<!doctype html><html><body><div id="app"></div>${bridge}<script>try { ${code.replace(/<\/script>/gi, "<\\/script>")} } catch (error) { console.error('Error: ' + error.message); }<\/script></body></html>`;
  }

  function runCodePreview() {
    const code = getCodeValue();
    // Lấy lang từ select, fallback sang state, fallback sang auto-detect
    let lang = (refs.langSelect ? refs.langSelect.value : null) || EVA_HUB_STATE.codeLanguage || detectLanguage(code);
    // Safety: nếu code trông như HTML nhưng lang vẫn là js → sửa lại
    if (lang === "javascript" && /^\s*<!doctype\s+html|^\s*<html[\s>]/i.test(code.trim())) {
      lang = "html";
      setLanguageSelection("html", false);
    }
    if (!refs.codeOutput || !refs.runnerFrame || !refs.codeConsole) return;
    refs.codeOutput.classList.remove("hidden");
    refs.codeConsole.innerHTML = "";

    if (lang === "python") {
      refs.runnerFrame.srcdoc =
        '<!doctype html><html><body style="font-family:Inter,sans-serif;padding:24px;background:#fff;color:#111;">Python chưa chạy trực tiếp trong sandbox trình duyệt. Hãy dùng "🐛 Debug" để nhờ EVA phân tích.</body></html>';
      appendRunnerLog("warn", ["Python chưa có runtime trực tiếp trong trình duyệt."]);
      return;
    }

    clearRunnerTimeout();
    refs.runnerFrame.srcdoc = buildRunnerHtml(code, lang);
    EVA_HUB_STATE.runnerTimeoutId = window.setTimeout(() => {
      refs.runnerFrame.srcdoc =
        '<!doctype html><html><body style="font-family:Inter,sans-serif;padding:24px;background:#fff;color:#991b1b;">Runner đã dừng vì quá 5 giây.</body></html>';
      appendRunnerLog("error", ["Runner timeout sau 5 giây."]);
    }, 5000);
  }

  function renderMath() {
    if (!refs.mathInput || !refs.mathOutput) return;
    const input = refs.mathInput.value || "";
    EVA_HUB_STATE.mathContent = input;
    refs.mathOutput.innerHTML = input.trim()
      ? `\\[${escapeHtml(input)}\\]`
      : '<div class="eva-hub-empty-note">Preview công thức sẽ hiện ở đây.</div>';
    persistState();
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      window.MathJax.typesetPromise([refs.mathOutput]).catch(() => {});
    }
  }

  function insertLatex(snippet) {
    if (!refs.mathInput) return;
    const start = refs.mathInput.selectionStart || 0;
    const end = refs.mathInput.selectionEnd || 0;
    const before = refs.mathInput.value.slice(0, start);
    const after = refs.mathInput.value.slice(end);
    refs.mathInput.value = `${before}${snippet}${after}`;
    refs.mathInput.focus();
    refs.mathInput.setSelectionRange(start + snippet.length, start + snippet.length);
    renderMath();
  }

  function execDocCommand(command, value) {
    if (!refs.docEditor) return;
    refs.docEditor.focus();
    if (command === "formatBlock" && value) {
      const blockValue = /^</.test(value) ? value : `<${value}>`;
      document.execCommand(command, false, blockValue);
    } else {
      document.execCommand(command, false, value || null);
    }
    persistState();
  }

  function updateToolEntryUi() {
    const hubBtn = byId("tool-eva-hub-btn");
    if (!hubBtn) return;
    hubBtn.classList.toggle("selected", EVA_HUB_STATE.open);
    const icon = hubBtn.querySelector(".chat-menu-check i");
    if (icon) {
      icon.className = EVA_HUB_STATE.open ? "fas fa-check-circle" : "fas fa-th-large";
    }
  }

  function updateModeBadge() {
    const config = getHubCurrentMode();
    if (refs.modeBadge) {
      const icon = { flash: "⚡", thinking: "🧠", deep: "🔬" }[config.mode] || "⚡";
      refs.modeBadge.textContent = `${icon} ${config.label || "Flash"}`;
      refs.modeBadge.className = `eva-hub-model-badge mode-${config.mode || "flash"}`;
    }
  }

  function switchMode(mode) {
    EVA_HUB_STATE.mode = ["doc", "code", "math"].includes(mode) ? mode : "doc";
    if (refs.tabButtons) {
      refs.tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.mode === EVA_HUB_STATE.mode));
    }
    if (refs.areas) {
      Object.keys(refs.areas).forEach((key) => refs.areas[key].classList.toggle("active", key === EVA_HUB_STATE.mode));
    }
    persistState();
    updateModeBadge();
    if (EVA_HUB_STATE.mode === "code") {
      initAceIfNeeded().then(() => {
        try {
          EVA_HUB_STATE.aceInstance && EVA_HUB_STATE.aceInstance.focus();
        } catch {}
      });
    } else if (EVA_HUB_STATE.mode === "doc" && refs.docEditor) {
      refs.docEditor.focus();
    } else if (EVA_HUB_STATE.mode === "math" && refs.mathInput) {
      refs.mathInput.focus();
    }
  }

  function abortPendingHubRequest() {
    if (EVA_HUB_STATE.abortCtrl) {
      EVA_HUB_STATE.abortCtrl.abort();
      EVA_HUB_STATE.abortCtrl = null;
    }
    hideLoading();
  }

  function evaHubOpen(mode) {
    buildPanel();
    EVA_HUB_STATE.open = true;
    document.body.classList.add("eva-hub-active");
    refs.panel.classList.add("hub-open");
    switchMode(mode || EVA_HUB_STATE.mode || "doc");
    updateToolEntryUi();
    renderVersionHints();
    renderShortcutHints();
    if (EVA_HUB_STATE.mode === "doc" && refs.docEditor) {
      refs.docEditor.focus();
    }
  }

  function evaHubClose() {
    if (!refs.panel) return;
    EVA_HUB_STATE.open = false;
    abortPendingHubRequest();
    hideAiPopup();
    hideDiff();
    refs.panel.classList.remove("hub-open");
    document.body.classList.remove("eva-hub-active");
    updateToolEntryUi();
    persistState();
  }

  function evaHubToggle(mode) {
    if (EVA_HUB_STATE.open) {
      evaHubClose();
      return;
    }
    evaHubOpen(mode || "doc");
  }

  async function runInlineAiAction(action) {
    const selectedText = EVA_HUB_STATE.selectedText;
    if (!selectedText) {
      showToast("Mình chưa thấy đoạn văn nào được bôi đen.", "danger");
      return;
    }
    const actionLabels = {
      rewrite: "Viết lại đoạn này theo cách rõ ràng hơn.",
      summarize: "Tóm tắt đoạn này ngắn gọn hơn.",
      improve: "Cải thiện văn phong, cấu trúc và độ mạch lạc của đoạn này.",
      explain: "Giải thích đoạn này theo cách dễ hiểu hơn.",
    };
    const context = ((refs.docEditor && refs.docEditor.innerText) || "").trim().slice(0, 600);
    const prompt = [
      actionLabels[action] || "Xử lý đoạn văn này.",
      "--- DOAN DUOC CHON ---",
      selectedText,
      "--- NGU CANH TAI LIEU ---",
      context || "Khong co ngu canh bo sung.",
      "Chi tra ve doan text da xu ly, khong them mo dau hay giai thich.",
    ].join("\n\n");

    hideAiPopup();
    showLoading(`EVA (${getHubCurrentMode().label}) đang xử lý...`);
    try {
      const result = await evaHubAskAi(prompt);
      showDiff(selectedText, result);
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.warn("[EVA HUB] inline AI failed:", error);
        showToast(`EVA chưa xử lý được đoạn này: ${error.message || error}`, "danger");
      }
    } finally {
      hideLoading();
    }
  }

  function applyDiff() {
    const newText = String(EVA_HUB_STATE.pendingDiff || "").trim();
    const range = EVA_HUB_STATE.selectedRange;
    if (!newText || !range) return;
    range.deleteContents();
    range.insertNode(document.createTextNode(newText));
    refs.docEditor.normalize();
    hideDiff();
    EVA_HUB_STATE.selectedText = "";
    EVA_HUB_STATE.selectedRange = null;
    persistState();
    saveVersion();
  }

  function toMarkdownFromHtml(html) {
    return String(html || "")
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
      .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
      .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
      .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, "> $1\n\n")
      .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
      .replace(/<ul[^>]*>/gi, "")
      .replace(/<\/ul>/gi, "\n")
      .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function exportPdf() {
    document.body.classList.add("eva-hub-print-mode");
    window.print();
    window.setTimeout(() => document.body.classList.remove("eva-hub-print-mode"), 900);
  }

  function copyMarkdown() {
    if (!refs.docEditor) return;
    const markdown = toMarkdownFromHtml(refs.docEditor.innerHTML);
    navigator.clipboard.writeText(markdown).then(
      () => showToast("Đã copy Markdown.", "success"),
      () => showToast("Không copy được Markdown.", "danger")
    );
  }

  function copyCode() {
    const code = getCodeValue();
    navigator.clipboard.writeText(code || "").then(
      () => showToast("Đã copy code.", "success"),
      () => showToast("Không copy được code.", "danger")
    );
  }

  function copyLatex() {
    navigator.clipboard.writeText(refs.mathInput ? refs.mathInput.value || "" : "").then(
      () => showToast("Đã copy LaTeX.", "success"),
      () => showToast("Không copy được LaTeX.", "danger")
    );
  }

  function sendDocumentToChat() {
    const text = refs.docEditor ? refs.docEditor.innerText.trim() : "";
    if (!text) {
      showToast("Tài liệu đang trống.", "danger");
      return;
    }
    sendTextToChat(`Hãy review bài này:\n\n${text}`);
  }

  function sendMathToChat() {
    const text = refs.mathInput ? refs.mathInput.value.trim() : "";
    if (!text) {
      showToast("Bạn chưa nhập công thức.", "danger");
      return;
    }
    sendTextToChat(`Giải thích hoặc hỗ trợ với công thức LaTeX sau:\n\n${text}`);
  }

  function debugCodeInChat() {
    const code = getCodeValue().trim();
    if (!code) {
      showToast("Editor code đang trống.", "danger");
      return;
    }
    const lang = refs.langSelect ? refs.langSelect.value : EVA_HUB_STATE.codeLanguage;
    const consoleText = refs.codeConsole ? refs.codeConsole.innerText.trim() : "";
    const prompt = [
      `Debug đoạn ${lang} sau. Chỉ ra lỗi và gợi ý sửa ngắn gọn:`,
      `\`\`\`${lang}`,
      code,
      "```",
      consoleText ? `Output / Error:\n${consoleText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    sendTextToChat(prompt, { closeAfter: true });
  }

  function startDocVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Trình duyệt này chưa hỗ trợ nhập giọng nói.", "danger");
      return;
    }
    if (!EVA_HUB_STATE.voiceRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = "vi-VN";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results || [])
          .map((result) => result[0]?.transcript || "")
          .join(" ")
          .trim();
        if (refs.docEditor && transcript) {
          refs.docEditor.focus();
          document.execCommand("insertText", false, transcript);
          persistState();
          saveVersion();
        }
      };
      recognition.onend = () => {
        EVA_HUB_STATE.voiceListening = false;
        if (refs.docVoiceBtn) refs.docVoiceBtn.classList.remove("is-listening");
      };
      recognition.onerror = () => {
        EVA_HUB_STATE.voiceListening = false;
        if (refs.docVoiceBtn) refs.docVoiceBtn.classList.remove("is-listening");
      };
      EVA_HUB_STATE.voiceRecognition = recognition;
    }

    if (EVA_HUB_STATE.voiceListening) {
      try {
        EVA_HUB_STATE.voiceRecognition.stop();
      } catch {}
      EVA_HUB_STATE.voiceListening = false;
      if (refs.docVoiceBtn) refs.docVoiceBtn.classList.remove("is-listening");
      return;
    }

    try {
      EVA_HUB_STATE.voiceListening = true;
      if (refs.docVoiceBtn) refs.docVoiceBtn.classList.add("is-listening");
      EVA_HUB_STATE.voiceRecognition.start();
    } catch (error) {
      EVA_HUB_STATE.voiceListening = false;
      if (refs.docVoiceBtn) refs.docVoiceBtn.classList.remove("is-listening");
      console.warn("[EVA HUB] voice start failed:", error);
    }
  }

  function updateSelectionPopupSoon() {
    window.requestAnimationFrame(showAiPopupFromSelection);
  }

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-eva-hub-src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === "1") return resolve();
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.evaHubSrc = src;
      script.addEventListener("load", () => {
        script.dataset.loaded = "1";
        resolve();
      });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  async function initAceIfNeeded() {
    if (EVA_HUB_STATE.aceInstance || EVA_HUB_STATE.aceLoaded) return;
    if (!aceLoaderPromise) {
      aceLoaderPromise = loadScriptOnce(ACE_CDN_URL).catch((error) => {
        console.warn("[EVA HUB] Ace load failed, fallback to textarea:", error);
        return null;
      });
    }
    await aceLoaderPromise;
    EVA_HUB_STATE.aceLoaded = true;
    if (window.ace && refs.codeEditorEl) {
      EVA_HUB_STATE.aceInstance = window.ace.edit("hub-code-editor");
      EVA_HUB_STATE.aceInstance.setTheme("ace/theme/tomorrow_night_eighties");
      EVA_HUB_STATE.aceInstance.session.setMode(`ace/mode/${EVA_HUB_STATE.codeLanguage || "javascript"}`);
      EVA_HUB_STATE.aceInstance.setOptions({
        fontSize: 14,
        showPrintMargin: false,
        wrap: true,
        useSoftTabs: true,
        enableBasicAutocompletion: true,
      });
      EVA_HUB_STATE.aceInstance.session.on("change", () => {
        const value = EVA_HUB_STATE.aceInstance.getValue();
        EVA_HUB_STATE.codeContent = value;
        if (!(refs.langSelect && refs.langSelect.dataset.manual === "1")) {
          setLanguageSelection(detectLanguage(value), false);
        }
        persistState();
      });
      refs.codeEditorEl.classList.remove("hidden");
      if (refs.codeFallback) refs.codeFallback.classList.add("hidden");
      setCodeValue(EVA_HUB_STATE.codeContent || "");
    } else if (refs.codeFallback) {
      refs.codeFallback.classList.remove("hidden");
    }
  }

  function cacheRefs() {
    refs.panel = byId("eva-hub-panel");
    refs.tabButtons = Array.from(document.querySelectorAll(".eva-hub-tab"));
    refs.modeBadge = byId("hub-model-badge");
    refs.docEditor = byId("hub-doc-editor");
    refs.docVoiceBtn = byId("hub-doc-voice-btn");
    refs.aiPopup = byId("hub-ai-popup");
    refs.diffPanel = byId("hub-ai-diff");
    refs.diffOld = byId("hub-ai-diff-old");
    refs.diffNew = byId("hub-ai-diff-new");
    refs.loading = byId("hub-ai-loading");
    refs.loadingText = byId("hub-ai-loading-text");
    refs.toastStack = byId("eva-hub-toast-stack");
    refs.versionList = byId("eva-hub-versions");
    refs.shortcutList = byId("eva-hub-shortcuts");
    refs.codeEditorEl = byId("hub-code-editor");
    refs.codeFallback = byId("hub-code-fallback");
    refs.langSelect = byId("hub-lang-select");
    refs.codeOutput = byId("hub-code-output");
    refs.codeConsole = byId("hub-code-console");
    refs.runnerFrame = byId("hub-code-iframe");
    refs.mathInput = byId("hub-math-input");
    refs.mathOutput = byId("hub-math-output");
    refs.areas = {
      doc: byId("hub-doc-area"),
      code: byId("hub-code-area"),
      math: byId("hub-math-area"),
    };
  }

  function bindPanelEvents() {
    if (!refs.panel || refs.panel.dataset.bound === "1") return;
    refs.panel.dataset.bound = "1";

    refs.tabButtons.forEach((btn) => btn.addEventListener("click", () => switchMode(btn.dataset.mode)));
    byId("hub-close-btn").addEventListener("click", evaHubClose);

    document.querySelectorAll("[data-doc-cmd]").forEach((btn) => {
      btn.addEventListener("click", () => execDocCommand(btn.dataset.docCmd, btn.dataset.docValue || ""));
    });
    document.querySelectorAll("[data-doc-block]").forEach((btn) => {
      btn.addEventListener("click", () => execDocCommand("formatBlock", btn.dataset.docBlock || "H2"));
    });
    refs.docEditor.addEventListener("input", persistState);
    refs.docEditor.addEventListener("mouseup", updateSelectionPopupSoon);
    refs.docEditor.addEventListener("keyup", updateSelectionPopupSoon);
    refs.docEditor.addEventListener("blur", () => window.setTimeout(hideAiPopup, 120));
    refs.docVoiceBtn.addEventListener("click", startDocVoiceInput);
    byId("hub-doc-send-btn").addEventListener("click", sendDocumentToChat);
    byId("hub-doc-export-btn").addEventListener("click", exportPdf);
    byId("hub-doc-markdown-btn").addEventListener("click", copyMarkdown);
    refs.aiPopup.addEventListener("click", (event) => {
      const button = event.target.closest("[data-inline-action]");
      if (!button) return;
      runInlineAiAction(button.dataset.inlineAction);
    });
    byId("hub-ai-apply-btn").addEventListener("click", applyDiff);
    byId("hub-ai-dismiss-btn").addEventListener("click", hideDiff);

    refs.langSelect.addEventListener("change", () => setLanguageSelection(refs.langSelect.value || "javascript", true));
    byId("hub-code-run-btn").addEventListener("click", () => {
      const statusEl = byId("hub-code-run-status");
      if (statusEl) statusEl.textContent = "⏳ Đang chạy...";
      runCodePreview();
      window.setTimeout(() => { if (statusEl) statusEl.textContent = "✅ Đã chạy"; }, 600);
    });
    byId("hub-code-debug-btn").addEventListener("click", debugCodeInChat);
    byId("hub-code-copy-btn").addEventListener("click", copyCode);
    const previewCloseBtn = byId("hub-preview-close-btn");
    if (previewCloseBtn) {
      previewCloseBtn.addEventListener("click", () => {
        if (refs.codeOutput) {
          refs.codeOutput.classList.add("hidden");
          refs.codeOutput.classList.remove("expanded");
        }
        const codeWrap = document.querySelector(".eva-hub-code-wrap");
        if (codeWrap) codeWrap.classList.remove("collapsed");
        const expandBtn = byId("hub-preview-expand-btn");
        if (expandBtn) expandBtn.textContent = "⛶";
        const statusEl = byId("hub-code-run-status");
        if (statusEl) statusEl.textContent = "Sẵn sàng";
      });
    }
    const previewExpandBtn = byId("hub-preview-expand-btn");
    if (previewExpandBtn) {
      previewExpandBtn.addEventListener("click", () => {
        if (!refs.codeOutput) return;
        const codeWrap = document.querySelector(".eva-hub-code-wrap");
        const isExpanded = refs.codeOutput.classList.contains("expanded");
        if (isExpanded) {
          refs.codeOutput.classList.remove("expanded");
          if (codeWrap) codeWrap.classList.remove("collapsed");
          previewExpandBtn.textContent = "⛶";
          previewExpandBtn.title = "Phóng to";
        } else {
          refs.codeOutput.classList.add("expanded");
          if (codeWrap) codeWrap.classList.add("collapsed");
          previewExpandBtn.textContent = "🗗";
          previewExpandBtn.title = "Thu nhỏ";
        }
      });
    }
    if (refs.codeFallback) {
      refs.codeFallback.addEventListener("input", () => {
        EVA_HUB_STATE.codeContent = refs.codeFallback.value;
        if (!(refs.langSelect && refs.langSelect.dataset.manual === "1")) {
          setLanguageSelection(detectLanguage(refs.codeFallback.value), false);
        }
        persistState();
      });
    }

    refs.mathInput.addEventListener("input", renderMath);
    document.querySelectorAll("[data-latex-snippet]").forEach((btn) =>
      btn.addEventListener("click", () => insertLatex(btn.dataset.latexSnippet || ""))
    );
    byId("hub-math-copy-btn").addEventListener("click", copyLatex);
    byId("hub-math-send-btn").addEventListener("click", sendMathToChat);

    window.addEventListener("message", (event) => {
      if (!event.data || event.data.source !== "EVA_HUB_RUNNER") return;
      appendRunnerLog(event.data.level || "log", Array.isArray(event.data.args) ? event.data.args : [String(event.data.args || "")]);
      if (event.data.type === "loaded") {
        clearRunnerTimeout();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && EVA_HUB_STATE.open) {
        if (!refs.diffPanel.classList.contains("hidden")) {
          hideDiff();
          return;
        }
        evaHubClose();
      }
    });
  }

  function buildPanel() {
    if (byId("eva-hub-panel")) {
      cacheRefs();
      bindPanelEvents();
      return;
    }
    const panel = document.createElement("div");
    panel.id = "eva-hub-panel";
    panel.innerHTML = `
      <div class="eva-hub-shell">
        <div class="eva-hub-header">
          <div class="eva-hub-tabs">
            <button class="eva-hub-tab active" data-mode="doc">📝 Soạn</button>
            <button class="eva-hub-tab" data-mode="code">💻 Code</button>
            <button class="eva-hub-tab" data-mode="math">∑ Toán</button>
          </div>
          <div class="eva-hub-header-actions">
            <span class="eva-hub-model-badge mode-flash" id="hub-model-badge">⚡ Flash</span>
            <button class="eva-hub-close-btn" id="hub-close-btn" type="button" aria-label="Đóng EVA HUB">✕</button>
          </div>
        </div>
        <div class="eva-hub-body">
          <section class="eva-hub-area active" id="hub-doc-area">
            <div class="eva-hub-toolbar">
              <button type="button" data-doc-cmd="bold" title="Bold"><b>B</b></button>
              <button type="button" data-doc-cmd="italic" title="Italic"><i>I</i></button>
              <button type="button" data-doc-block="H2" title="Tiêu đề">H2</button>
              <button type="button" data-doc-cmd="insertUnorderedList" title="Danh sách">•</button>
              <span class="eva-hub-sep">|</span>
              <button type="button" id="hub-doc-voice-btn" title="Nhập giọng nói">🎤 Voice</button>
              <button type="button" id="hub-doc-send-btn" title="Gửi vào chat">→ Chat</button>
              <button type="button" id="hub-doc-export-btn" title="Xuất PDF">PDF</button>
              <button type="button" id="hub-doc-markdown-btn" title="Copy Markdown">MD</button>
            </div>
            <div class="eva-hub-doc-wrap">
              <div id="hub-doc-editor" class="eva-hub-doc-editor" contenteditable="true" data-placeholder="Soạn thảo tại đây... Bôi đen text rồi nhấn ✨ AI để nhờ EVA chỉnh sửa.">${EVA_HUB_STATE.docContent || ""}</div>
            </div>
          </section>
          <section class="eva-hub-area" id="hub-code-area">
            <div class="eva-hub-toolbar">
              <select id="hub-lang-select">
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
              </select>
              <button type="button" id="hub-code-run-btn">▶ Chạy</button>
              <button type="button" id="hub-code-debug-btn">🐛 Debug</button>
              <button type="button" id="hub-code-copy-btn">📋 Copy</button>
              <span class="eva-hub-sep">|</span>
              <span id="hub-code-run-status" style="font-size:12px;color:#9ca3af;">Sẵn sàng</span>
            </div>
            <div class="eva-hub-code-split">
              <div class="eva-hub-code-wrap">
                <div id="hub-code-editor"></div>
                <textarea id="hub-code-fallback" class="hidden" spellcheck="false"></textarea>
              </div>
              <div id="hub-code-output" class="eva-hub-code-output hidden">
                <div class="eva-hub-output-label">Preview / Output
                  <button type="button" id="hub-preview-close-btn" title="Đóng" style="float:right;background:none;border:none;color:#9ca3af;cursor:pointer;font-size:14px;padding:0;margin-left:14px;">✕</button>
                  <button type="button" id="hub-preview-expand-btn" title="Phóng to" style="float:right;background:none;border:none;color:#9ca3af;cursor:pointer;font-size:14px;padding:0;">⛶</button>
                </div>
                <iframe id="hub-code-iframe" sandbox="allow-scripts"></iframe>
                <div id="hub-code-console" class="eva-hub-code-console"></div>
              </div>
            </div>
          </section>
          <section class="eva-hub-area" id="hub-math-area">
            <div class="eva-hub-toolbar">
              <button type="button" data-latex-snippet="\\frac{a}{b}">x/y</button>
              <button type="button" data-latex-snippet="\\sqrt{x}">√x</button>
              <button type="button" data-latex-snippet="\\sum_{i=0}^{n}">∑</button>
              <button type="button" data-latex-snippet="\\int_{a}^{b}">∫</button>
              <button type="button" data-latex-snippet="\\vec{v}">→v</button>
              <button type="button" data-latex-snippet="\\alpha\\beta\\gamma">αβγ</button>
              <span class="eva-hub-sep">|</span>
              <button type="button" id="hub-math-copy-btn">Copy LaTeX</button>
              <button type="button" id="hub-math-send-btn">→ Chat</button>
            </div>
            <textarea id="hub-math-input" class="eva-hub-math-input" placeholder="Nhập LaTeX tại đây... VD: \\frac{d}{dx}[x^2] = 2x">${escapeHtml(
              EVA_HUB_STATE.mathContent || ""
            )}</textarea>
            <div class="eva-hub-math-preview">
              <div class="eva-hub-output-label">Preview</div>
              <div id="hub-math-output"></div>
            </div>
          </section>
        </div>
        <aside class="eva-hub-side-info">
          <div class="eva-hub-side-card">
            <h4>Phiên bản gần đây</h4>
            <div class="eva-hub-mini-list" id="eva-hub-versions"></div>
          </div>
          <div class="eva-hub-side-card">
            <h4>Phím tắt</h4>
            <div class="eva-hub-mini-list" id="eva-hub-shortcuts"></div>
          </div>
        </aside>
        <div id="hub-ai-popup" class="eva-hub-ai-popup hidden">
          <button type="button" data-inline-action="rewrite">✍ Viết lại</button>
          <button type="button" data-inline-action="summarize">📝 Tóm tắt</button>
          <button type="button" data-inline-action="improve">💡 Cải thiện</button>
          <button type="button" data-inline-action="explain">🔍 Giải thích</button>
        </div>
        <div id="hub-ai-diff" class="eva-hub-diff hidden">
          <div class="eva-hub-diff-header">
            <span>Gợi ý từ EVA</span>
            <div class="eva-hub-diff-actions">
              <button type="button" id="hub-ai-apply-btn" class="apply">Áp dụng</button>
              <button type="button" id="hub-ai-dismiss-btn">Bỏ qua</button>
            </div>
          </div>
          <div class="eva-hub-diff-col old" id="hub-ai-diff-old"></div>
          <div class="eva-hub-diff-col new" id="hub-ai-diff-new"></div>
        </div>
        <div id="hub-ai-loading" class="eva-hub-loading hidden">
          <span class="spinner"></span>
          <span id="hub-ai-loading-text">EVA đang xử lý...</span>
        </div>
        <div id="eva-hub-toast-stack" class="eva-hub-toast-stack"></div>
      </div>
    `;
    document.body.appendChild(panel);
    cacheRefs();
    bindPanelEvents();
    if (refs.mathInput) refs.mathInput.value = EVA_HUB_STATE.mathContent || "";
    renderMath();
    renderVersionHints();
    renderShortcutHints();
    updateModeBadge();
    setLanguageSelection(EVA_HUB_STATE.codeLanguage || detectLanguage(EVA_HUB_STATE.codeContent || ""), false);
  }

  // ─── AUTO-INTERCEPT: Chat code → Hub ──────────────────────────────────────
  function extractFirstCodeBlock(text) {
    const fenceRegex = /```(\w*)\s*\n([\s\S]*?)```/;
    const match = String(text || "").match(fenceRegex);
    if (!match) return null;
    const rawLang = (match[1] || "").toLowerCase().trim();
    const code = match[2].trim();
    // Auto-detect HTML nếu không có tag hoặc tag lạ
    let lang = rawLang || "javascript";
    if (!rawLang && /^\s*<!doctype\s+html|^\s*<html[\s>]/i.test(code)) lang = "html";
    return { lang, code };
  }

  function pushCodeToHub(code, lang, autoRun) {
    // Mở Hub ở tab Code nếu chưa mở
    if (!EVA_HUB_STATE.open) {
      evaHubOpen("code");
    } else {
      switchMode("code");
    }
    setLanguageSelection(lang || "javascript", true);
    // Đợi Ace load xong rồi set value
    initAceIfNeeded().then(() => {
      setCodeValue(code);
      if (autoRun && lang !== "python") {
        window.setTimeout(() => runCodePreview(), 200);
      }
      showToast(`✅ EVA đã đẩy ${lang.toUpperCase()} vào Hub${autoRun && lang !== "python" ? " và chạy luôn" : ""}.`, "success");
    });
  }

  function interceptAddBotMessage() {
    if (window.__evaHubBotMessageWrapped) return;
    const original = window.addBotMessage;
    if (typeof original !== "function") {
      // Thử lại sau 1s nếu chưa load
      window.setTimeout(interceptAddBotMessage, 1000);
      return;
    }
    window.addBotMessage = function evaHubBotMessageWrapper(text) {
      const raw = String(text || "");
      const extracted = extractFirstCodeBlock(raw);
      // Chỉ intercept khi có code block rõ ràng và đủ dài
      if (extracted && extracted.code.length > 30) {
        // Gọi original nhưng thay thế code block bằng card thông báo
        const cardHtml = `<div style="display:inline-flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.3);border-radius:12px;font-size:13px;cursor:pointer;" onclick="window.evaHubOpen&&window.evaHubOpen('code')" title="Mở EVA Hub để xem code">
  <span>💻</span>
  <span>EVA đã viết <strong>${extracted.lang.toUpperCase()}</strong> · ${extracted.code.split("\n").length} dòng — <u>Mở Hub để xem & chạy</u></span>
</div>`;
        const textWithoutCode = raw.replace(/```[\s\S]*?```/g, "").trim();
        const displayText = textWithoutCode ? textWithoutCode + "\n\n" + cardHtml : cardHtml;
        original.call(this, displayText);
        // Đẩy code sang Hub
        pushCodeToHub(extracted.code, extracted.lang, true);
      } else {
        original.apply(this, arguments);
      }
    };
    window.__evaHubBotMessageWrapped = true;
    console.log("[EVA HUB] addBotMessage intercepted — code auto-push active.");
  }

  function injectCss() {
    if (byId("eva-hub-style")) return;
    const style = document.createElement("style");
    style.id = "eva-hub-style";
    style.textContent = `
      #main-screen {
        transition: opacity 2s ease-in, width 0.35s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      #eva-hub-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 60%;
        min-width: 440px;
        transform: translateX(100%);
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 920;
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        background: #0f1115; /* Sạch sẽ như Gemini Canvas */
        color: #f9fafb;
        overflow: hidden;
      }
      #eva-hub-panel.hub-open {
        transform: translateX(0);
        box-shadow: -16px 0 40px rgba(0, 0, 0, 0.45);
      }
      body.eva-hub-active #main-screen {
        width: 40%;
      }
      body.eva-hub-active #eva-hub-panel {
        transform: translateX(0);
      }
      .eva-hub-shell {
        height: 100%;
        display: flex;
        flex-direction: column;
        position: relative;
      }
      .eva-hub-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: #181a1f;
      }
      .eva-hub-tabs {
        display: flex;
        gap: 4px;
        background: rgba(255, 255, 255, 0.04);
        padding: 4px;
        border-radius: 10px;
      }
      .eva-hub-tab,
      .eva-hub-toolbar button,
      .eva-hub-toolbar select,
      .eva-hub-close-btn,
      .eva-hub-ai-popup button,
      .eva-hub-diff-actions button {
        border: none;
        background: transparent;
        color: #a0a6b1;
        border-radius: 8px;
        transition: all 0.2s;
      }
      .eva-hub-tab {
        padding: 8px 16px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
      }
      .eva-hub-tab:hover {
        color: #e5e7eb;
        background: rgba(255, 255, 255, 0.04);
      }
      .eva-hub-tab.active {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }
      .eva-hub-header-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .eva-hub-model-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.06);
        font-weight: 600;
        font-size: 13px;
      }
      .eva-hub-model-badge.mode-flash { color: #60a5fa; }
      .eva-hub-model-badge.mode-thinking { color: #a78bfa; }
      .eva-hub-model-badge.mode-deep { color: #fb923c; }
      .eva-hub-close-btn {
        width: 34px;
        height: 34px;
        cursor: pointer;
        font-size: 16px;
        display: grid;
        place-items: center;
      }
      .eva-hub-close-btn:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
      .eva-hub-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .eva-hub-area {
        display: none;
        flex: 1;
        flex-direction: column;
        min-height: 0;
      }
      .eva-hub-area.active {
        display: flex;
      }
      .eva-hub-side-info {
        display: none; /* Ẩn đi để màn hình clean như Canvas */
      }
      .eva-hub-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        background: #121419;
      }
      .eva-hub-toolbar button,
      .eva-hub-toolbar select {
        padding: 6px 10px;
        font-size: 13px;
        font-weight: 500;
        background: rgba(255, 255, 255, 0.05);
        color: #e5e7eb;
      }
      .eva-hub-toolbar button:hover { background: rgba(255, 255, 255, 0.1); }
      .eva-hub-toolbar select {
        appearance: none;
        padding-right: 24px;
        cursor: pointer;
      }
      .eva-hub-sep {
        color: #4b5563;
        padding: 0 4px;
      }
      .eva-hub-doc-wrap {
        flex: 1;
        min-height: 0;
        position: relative;
        overflow: hidden;
      }
      .eva-hub-code-split {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
      }
      .eva-hub-code-wrap {
        flex: 1;
        min-height: 0;
        position: relative;
        overflow: hidden;
      }
      .eva-hub-code-wrap.collapsed {
        display: none !important;
      }
      .eva-hub-doc-editor {
        height: 100%;
        padding: 32px 40px;
        line-height: 1.8;
        font-size: 16px;
        outline: none;
        overflow-y: auto;
        color: #e5e7eb;
      }
      .eva-hub-doc-editor:empty::before {
        content: attr(data-placeholder);
        color: #6b7280;
      }
      #hub-code-editor,
      #hub-code-fallback {
        width: 100%;
        height: 100%;
        background: #0f1115;
      }
      #hub-code-fallback {
        color: #e5e7eb;
        border: none;
        padding: 24px;
        resize: none;
        font-family: Consolas, "SFMono-Regular", monospace;
        outline: none;
      }
      .eva-hub-code-output {
        flex: 0 0 42%;
        display: flex;
        flex-direction: column;
        border-top: 2px solid rgba(255, 255, 255, 0.1);
        background: #0a0b0e;
        animation: slideUp 0.22s ease;
      }
      .eva-hub-code-output.expanded {
        flex: 1;
        border-top: none;
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .eva-hub-code-output.hidden,
      .eva-hub-ai-popup.hidden,
      .eva-hub-diff.hidden,
      .eva-hub-loading.hidden {
        display: none !important;
      }
      #eva-hub-panel .hidden {
        display: none !important;
      }
      .eva-hub-output-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #9ca3af;
        padding: 8px 16px;
        background: #181a1f;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      #hub-code-iframe {
        flex: 1;
        width: 100%;
        border: none;
        background: #fff;
      }
      .eva-hub-code-console {
        height: 120px;
        overflow: auto;
        padding: 12px 16px;
        background: #181a1f;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        font-family: Consolas, "SFMono-Regular", monospace;
        font-size: 13px;
        line-height: 1.6;
      }
      .eva-hub-console-line.level-error { color: #fecaca; }
      .eva-hub-console-line.level-warn { color: #fde68a; }
      .eva-hub-console-line.level-info { color: #bfdbfe; }
      .eva-hub-math-input {
        flex: 1;
        width: 100%;
        border: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding: 24px;
        background: transparent;
        color: #e5e7eb;
        font-size: 16px;
        line-height: 1.7;
        resize: none;
        outline: none;
        font-family: Consolas, "SFMono-Regular", monospace;
      }
      .eva-hub-math-preview {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      #hub-math-output {
        flex: 1;
        padding: 24px;
        overflow: auto;
        line-height: 1.8;
      }
      .eva-hub-empty-note {
        color: #6b7280;
        font-size: 15px;
      }
      .eva-hub-ai-popup {
        position: fixed;
        z-index: 940;
        display: flex;
        gap: 6px;
        padding: 8px;
        border-radius: 12px;
        background: #1f2937;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
      }
      .eva-hub-ai-popup button {
        padding: 8px 12px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.05);
      }
      .eva-hub-ai-popup button:hover { background: rgba(255, 255, 255, 0.1); }
      .eva-hub-diff {
        position: absolute;
        left: 20px;
        right: 20px;
        bottom: 20px;
        z-index: 935;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        background: #111827;
        box-shadow: 0 24px 50px rgba(0, 0, 0, 0.6);
        padding: 16px;
        display: grid;
        gap: 12px;
      }
      .eva-hub-diff-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 600;
        color: #e5e7eb;
      }
      .eva-hub-diff-actions {
        display: flex;
        gap: 8px;
      }
      .eva-hub-diff-actions button {
        padding: 6px 12px;
        font-weight: 600;
      }
      .eva-hub-diff-actions .apply {
        background: #10b981;
        color: #fff;
        border: none;
      }
      .eva-hub-diff-col {
        padding: 16px;
        border-radius: 12px;
        line-height: 1.6;
        white-space: pre-wrap;
      }
      .eva-hub-diff-col.old {
        background: rgba(239, 68, 68, 0.1);
        color: #fca5a5;
        text-decoration: line-through;
      }
      .eva-hub-diff-col.new {
        background: rgba(16, 185, 129, 0.1);
        color: #6ee7b7;
      }
      .eva-hub-loading {
        position: absolute;
        right: 20px;
        bottom: 20px;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.8);
        z-index: 940;
        font-weight: 500;
        font-size: 13px;
      }
      .eva-hub-loading .spinner {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-top-color: #60a5fa;
        animation: evaHubSpin 0.8s linear infinite;
      }
      @keyframes evaHubSpin {
        to { transform: rotate(360deg); }
      }
      .eva-hub-toast-stack {
        position: absolute;
        top: 20px;
        right: 20px;
        display: grid;
        gap: 10px;
        z-index: 945;
      }
      .eva-hub-toast {
        min-width: 240px;
        padding: 12px 16px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: #1f2937;
        color: #f9fafb;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
        font-size: 14px;
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      .eva-hub-toast[data-tone="success"] { border-left: 4px solid #10b981; }
      .eva-hub-toast[data-tone="danger"] { border-left: 4px solid #ef4444; }
      .eva-hub-toast.closing {
        opacity: 0;
        transform: translateY(-8px);
      }
      #tool-eva-hub-btn.selected {
        color: #60a5fa;
      }
      .eva-hub-toolbar #hub-doc-voice-btn.is-listening {
        background: rgba(249, 115, 22, 0.2);
        color: #fdba74;
      }
      @media print {
        body * { visibility: hidden !important; }
        #eva-hub-panel, #eva-hub-panel * { visibility: visible !important; }
        #eva-hub-panel {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          transform: none !important;
          box-shadow: none !important;
        }
      }
      @media (max-width: 820px) {
        #eva-hub-panel {
          width: 100%;
        }
        body.eva-hub-active #main-screen {
          width: 0;
          overflow: hidden;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function bindToolEntryTrigger() {
    const hubBtn = byId("tool-eva-hub-btn");
    if (!hubBtn || hubBtn.dataset.evaHubCaptureBound === "1") return;
    hubBtn.dataset.evaHubCaptureBound = "1";
    hubBtn.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (typeof window.isAuthenticatedUser === "function" && !window.isAuthenticatedUser()) {
          if (typeof window.addBotMessage === "function") {
            window.addBotMessage("⚠️ Bạn cần đăng nhập để dùng EVA HUB.");
          }
          if (typeof window.toggleChatToolbarMenu === "function") {
            window.toggleChatToolbarMenu(byId("chat-tools-menu"), false);
          }
          return;
        }
        if (typeof window.toggleChatToolbarMenu === "function") {
          window.toggleChatToolbarMenu(byId("chat-tools-menu"), false);
        }
        evaHubOpen("doc");
      },
      true
    );
  }

  function wrapModeSetter() {
    if (window.__evaHubModeWrapped) return;
    const original = window.setAdminChatModelMode;
    if (typeof original !== "function") return;
    window.setAdminChatModelMode = function evaHubModeWrapper() {
      const result = original.apply(this, arguments);
      window.setTimeout(updateModeBadge, 0);
      return result;
    };
    window.__evaHubModeWrapped = true;
  }

  function wrapToolRefresh() {
    if (window.__evaHubToolRefreshWrapped) return;
    const original = window.refreshChatToolUi;
    if (typeof original !== "function") return;
    window.refreshChatToolUi = function evaHubToolRefreshWrapper() {
      const result = original.apply(this, arguments);
      updateToolEntryUi();
      return result;
    };
    window.__evaHubToolRefreshWrapped = true;
  }

  function wrapPageSwitch() {
    if (window.__evaHubSwitchWrapped) return;
    const original = window.switchPage;
    if (typeof original !== "function") return;
    window.switchPage = function evaHubSwitchPageWrapper() {
      evaHubClose();
      return original.apply(this, arguments);
    };
    window.__evaHubSwitchWrapped = true;
  }

  function exposePublicApi() {
    window.evaHubOpen = evaHubOpen;
    window.evaHubClose = evaHubClose;
    window.evaHubToggle = evaHubToggle;
    window.evaHubExecCmd = execDocCommand;
    window.evaHubInsertLatex = insertLatex;
    window.evaHubRenderMath = renderMath;
    window.evaHubRunCode = runCodePreview;
    window.evaHubAiAction = runInlineAiAction;
    window.evaHubApplyDiff = applyDiff;
    window.evaHubDismissDiff = hideDiff;
    window.evaHubCopyMarkdown = copyMarkdown;
    window.evaHubExportPdf = exportPdf;
    window.evaHubSendToChat = sendDocumentToChat;
    window.evaHubAiDebug = debugCodeInChat;
    window.evaHubCopyCode = copyCode;
    window.evaHubCopyLatex = copyLatex;
    window.evaHubSendMathToChat = sendMathToChat;
  }

  function init() {
    loadPersistedState();
    injectCss();
    buildPanel();
    bindToolEntryTrigger();
    wrapModeSetter();
    wrapToolRefresh();
    wrapPageSwitch();
    exposePublicApi();
    updateToolEntryUi();
    updateModeBadge();
    renderVersionHints();
    renderShortcutHints();
    // Intercept addBotMessage để auto-push code sang Hub
    interceptAddBotMessage();
    window.setInterval(() => {
      if (EVA_HUB_STATE.open) saveVersion();
    }, 60000);
  }

  init();
})();
