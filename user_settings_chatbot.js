(() => {
  const SETTINGS_KEY = "eva_chatbot_user_settings_v1";
  const MEMORY_KEY = "eva_chatbot_memory_items_v1";
  const AUTH_SESSION_KEY = "eva_auth_session_v1";
  const SETTINGS_THEME_KEY = "eva_settings_theme_v1";
  const AUTH_API_URL = "https://script.google.com/macros/s/AKfycbz8Wn4WF9acglw7Xh4x1_2vDtHuI6IwlH0E0YiKl1Nc_T1oEGlrBbnaxUoOoRbXYK5g/exec";
  const DEFAULTS = {
    toneBase: "thang_than",
    warmth: "normal",
    enthusiasm: "normal",
    headings: "default",
    emoji: "normal",
    customGuidance: "",
    alias: "",
    profession: "",
    about: "",
    memoryEnabled: true,
    historyEnabled: true,
  };

  let uiInitialized = false;
  let draft = null;
  let authLampOn = false;

  function esc(s) {
    return String(s ?? "").replace(/[&<>\"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }
  function el(id) { return document.getElementById(id); }
  function uid() { return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
  function loadSettings() {
    try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")) }; }
    catch { return { ...DEFAULTS }; }
  }
  function saveSettings(v) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(v)); }
  function loadMemory() {
    try { return JSON.parse(localStorage.getItem(MEMORY_KEY) || "[]"); } catch { return []; }
  }
  function saveMemory(items) { localStorage.setItem(MEMORY_KEY, JSON.stringify(items)); }

  function injectStyles() {
    if (el("eva-us-style")) return;
    const style = document.createElement("style");
    style.id = "eva-us-style";
    style.textContent = `
      #page-settings, #page-settings * {
        font-family: 'Be Vietnam Pro','Inter','Segoe UI',system-ui,sans-serif;
        letter-spacing: 0;
      }
      #page-settings .page-header-title,
      #page-settings label,
      #page-settings .eva-us-title,
      #page-settings .eva-us-section-title {
        font-weight: 600;
      }
      #page-settings i.fas,
      #page-settings i.fa,
      #page-settings i.far,
      #page-settings i.fab {
        font-family: "Font Awesome 6 Free", "Font Awesome 6 Brands" !important;
        font-weight: 900 !important;
      }
      .eva-us-input {
        width: 100%;
        background: #23252d;
        color: #fff;
        border: 1px solid #3b3f4a;
        border-radius: 10px;
        padding: 11px 12px;
        font-size: 14px;
        line-height: 1.5;
        outline: none;
      }
      .eva-us-input:focus {
        border-color: #6d6df5;
        box-shadow: 0 0 0 2px rgba(109,109,245,.15);
      }
      #page-settings {
        --us-bg: #121318;
        --us-card-bg: #17181d;
        --us-card-border: #2a2f39;
        --us-title: #ffffff;
        --us-text: #e5e7eb;
        --us-text-muted: #a1a1aa;
        --us-btn-bg: #5d6bff;
        --us-btn-border: #6774ff;
        --us-card-grad: radial-gradient(circle at 70% 0%, rgba(109,109,245,.18), transparent 52%);
      }
      #page-settings[data-theme="light"] {
        --us-bg: #fafaf8;
        --us-card-bg: #ffffff;
        --us-card-border: #e8e8e0;
        --us-title: #1a1a1a;
        --us-text: #1a1a1a;
        --us-text-muted: #888880;
        --us-btn-bg: linear-gradient(135deg, #f59e0b, #fbbf24);
        --us-btn-border: #f59e0b;
        --us-card-grad: radial-gradient(circle at 70% 30%, #fffbeb 0%, transparent 60%);
      }
      #page-settings[data-theme="golden"] {
        --us-bg: #2d1a0a;
        --us-card-bg: #3d2410;
        --us-card-border: #6b3d1a;
        --us-title: #fde8c8;
        --us-text: #fde8c8;
        --us-text-muted: #c49a6c;
        --us-btn-bg: linear-gradient(135deg, #c8691a, #f5a623);
        --us-btn-border: #c8691a;
        --us-card-grad: radial-gradient(circle at 30% 70%, #4a1a00 0%, transparent 50%), radial-gradient(circle at 70% 20%, #3d2000 0%, transparent 50%);
      }
      #page-settings[data-theme="ocean"] {
        --us-bg: #020d1a;
        --us-card-bg: #041728;
        --us-card-border: #0a3555;
        --us-title: #c8eeff;
        --us-text: #c8eeff;
        --us-text-muted: #5a9bc4;
        --us-btn-bg: linear-gradient(135deg, #0369a1, #38bdf8);
        --us-btn-border: #38bdf8;
        --us-card-grad: radial-gradient(circle at 50% 100%, #0a2040 0%, transparent 60%), radial-gradient(circle at 80% 10%, #001030 0%, transparent 50%);
      }
      #page-settings[data-theme="sakura"] {
        --us-bg: #1a0a10;
        --us-card-bg: #2a1020;
        --us-card-border: #5a2040;
        --us-title: #ffd6e8;
        --us-text: #ffd6e8;
        --us-text-muted: #c4808c;
        --us-btn-bg: linear-gradient(135deg, #be185d, #ff7eb3);
        --us-btn-border: #be185d;
        --us-card-grad: radial-gradient(circle at 20% 80%, #2d0020 0%, transparent 50%), radial-gradient(circle at 75% 25%, #1a0015 0%, transparent 50%);
      }
      #page-settings[data-theme="forest"] {
        --us-bg: #071510;
        --us-card-bg: #0d2018;
        --us-card-border: #1a4030;
        --us-title: #c8f0d8;
        --us-text: #c8f0d8;
        --us-text-muted: #60a878;
        --us-btn-bg: linear-gradient(135deg, #065f46, #34d399);
        --us-btn-border: #34d399;
        --us-card-grad: radial-gradient(circle at 40% 60%, #0a2810 0%, transparent 50%), radial-gradient(circle at 70% 30%, #051a08 0%, transparent 60%);
      }
      #page-settings[data-theme="candy"] {
        --us-bg: #1a0a2e;
        --us-card-bg: #25103e;
        --us-card-border: #4a2570;
        --us-title: #ffe8ff;
        --us-text: #ffe8ff;
        --us-text-muted: #c08cdc;
        --us-btn-bg: linear-gradient(135deg, #7c3aed, #e879f9, #f472b6);
        --us-btn-border: #e879f9;
        --us-card-grad: radial-gradient(circle at 25% 25%, #2d0050 0%, transparent 50%), radial-gradient(circle at 75% 75%, #20003d 0%, transparent 50%);
      }
      #page-settings[data-theme="sunset"] {
        --us-bg: #150a00;
        --us-card-bg: #231200;
        --us-card-border: #502a00;
        --us-title: #ffe8cc;
        --us-text: #ffe8cc;
        --us-text-muted: #b07840;
        --us-btn-bg: linear-gradient(135deg, #c2410c, #fb923c, #fbbf24);
        --us-btn-border: #fb923c;
        --us-card-grad: radial-gradient(circle at 50% 100%, #3d1500 0%, transparent 50%), radial-gradient(circle at 80% 20%, #200800 0%, transparent 60%);
      }
      .page-body.eva-us-body {
        background: var(--us-bg) !important;
      }
      .eva-settings-top-toolbar {
        max-width: 900px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 0 12px;
      }
      .eva-settings-top-toolbar .eva-auth-open-btn {
        background: var(--us-btn-bg);
        border-color: var(--us-btn-border);
      }
      .eva-settings-top-toolbar .eva-auth-inline {
        color: var(--us-text-muted);
        font-size: .82rem;
      }
      .eva-settings-theme {
        margin-left: auto;
        width: 220px;
        background: var(--us-card-bg);
        color: var(--us-text);
        border: 1px solid var(--us-card-border);
      }
      .eva-us-card-shell {
        background: var(--us-card-bg) !important;
        border-color: var(--us-card-border) !important;
        color: var(--us-text) !important;
        box-shadow: 0 20px 50px rgba(0,0,0,.25);
      }
      #page-settings .eva-us-title,
      #page-settings .eva-us-section-title,
      #page-settings .page-header-title {
        color: var(--us-title) !important;
      }
      #page-settings .eva-auth-open-btn,
      #page-settings .modal-btn.modal-btn-confirm {
        background: var(--us-btn-bg) !important;
        border-color: var(--us-btn-border) !important;
      }
      #page-settings .page-header {
        background-image: var(--us-card-grad);
      }
      #page-settings .page-body {
        background: transparent !important;
      }
      .eva-auth-inline { color: var(--us-text-muted); }
      .eva-us-grid {
        display: grid;
        grid-template-columns: 1fr 240px;
        gap: 10px;
        align-items: center;
      }
      .eva-us-grid > label {
        color: var(--us-text);
        font-size: 0.95rem;
      }
      .eva-us-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 0;
        border-top: 1px solid rgba(255,255,255,.04);
      }
      .eva-us-toggle-row:first-child { border-top: none; }
      .eva-us-toggle-title { color: var(--us-title); font-weight: 600; }
      .eva-us-toggle-desc {
        color: var(--us-text-muted);
        font-size: .84rem;
        line-height: 1.45;
        max-width: 560px;
      }
      .eva-us-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid var(--us-card-border);
        background: var(--us-bg);
        color: var(--us-text);
        font-size: .75rem;
      }
      .eva-auth-wrap {
        margin-top: 4px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
        align-items: center;
      }
      .eva-auth-entry {
        margin-top: 18px;
        border-top: 1px solid #2a2f39;
        padding-top: 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .eva-auth-open-btn {
        border: 1px solid #6774ff;
        background: linear-gradient(180deg, #5d6bff 0%, #4453ea 100%);
        color: #fff;
        border-radius: 10px;
        padding: 10px 14px;
        font-weight: 700;
        cursor: pointer;
      }
      .eva-auth-inline {
        color: #aab6d3;
        font-size: .82rem;
      }
      .eva-auth-overlay {
        position: fixed;
        inset: 0;
        background: rgba(5, 8, 14, .78);
        backdrop-filter: blur(2px);
        z-index: 10020;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 14px;
      }
      .eva-auth-dialog {
        width: min(920px, 96vw);
        max-height: 90vh;
        overflow: auto;
        background: linear-gradient(180deg, #131a27 0%, #0e141f 100%);
        border: 1px solid #2e3a53;
        border-radius: 20px;
        box-shadow: 0 30px 90px rgba(0,0,0,.55);
        padding: 14px 16px 16px;
      }
      .eva-auth-dialog-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 10px;
      }
      .eva-auth-back-btn {
        border: 1px solid #3b4a68;
        background: #1b2435;
        color: #e5edff;
        border-radius: 10px;
        padding: 8px 11px;
        cursor: pointer;
        font-weight: 600;
      }
      .eva-auth-head {
        color: #fff;
        font-size: 1.05rem;
        font-weight: 700;
        margin-bottom: 8px;
      }
      .eva-auth-lamp-board {
        border: 1px solid rgba(66, 83, 116, .45);
        border-radius: 16px;
        background: linear-gradient(180deg, #111925 0%, #0c121d 100%);
        padding: 14px;
        min-height: 360px;
        display: flex;
        flex-direction: column;
      }
      .eva-auth-tech {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #f4d27a;
        font-size: .8rem;
        letter-spacing: .35px;
      }
      .eva-auth-tech b { color: #f8dc8e; }
      .eva-auth-tech .tag {
        margin-left: auto;
        border: 1px solid #66500c;
        background: #2d240f;
        color: #f4d27a;
        border-radius: 999px;
        padding: 3px 8px;
        font-size: .72rem;
      }
      .eva-auth-lamp-stage {
        margin-top: 16px;
        position: relative;
        min-height: 280px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding-left: 44px;
      }
      .eva-auth-lamp-stage::before {
        content: "";
        position: absolute;
        left: 44px;
        top: 62px;
        width: 300px;
        height: 210px;
        background: radial-gradient(circle at 18% 18%, rgba(244, 210, 122, .45) 0%, rgba(241, 207, 36, .18) 34%, rgba(241, 207, 36, 0) 70%);
        opacity: 0;
        transition: opacity .35s ease;
        pointer-events: none;
      }
      .eva-auth-lamp {
        position: relative;
        width: 124px;
        height: 58px;
        border-radius: 70px 70px 24px 24px;
        background: linear-gradient(180deg, #f2f2f2 0%, #dfdfdf 100%);
        border: 1px solid #efefef;
        box-shadow: inset 0 -6px 12px rgba(0,0,0,.1);
      }
      .eva-auth-lamp::before {
        content: "";
        position: absolute;
        left: 50%;
        top: 56px;
        transform: translateX(-50%);
        width: 16px;
        height: 84px;
        border-radius: 8px;
        background: #e7e7e7;
        border: 1px solid #f2f2f2;
      }
      .eva-auth-lamp-bulb {
        position: absolute;
        left: 50%;
        top: 16px;
        transform: translateX(-50%);
        width: 20px;
        height: 20px;
        border-radius: 999px;
        background: #d9d9d9;
        border: 1px solid #f0f0f0;
      }
      .eva-auth-lamp-glow {
        position: absolute;
        left: 42px;
        top: 72px;
        width: 220px;
        height: 170px;
        border-radius: 50%;
        background: radial-gradient(circle at 28% 24%, rgba(248, 221, 138, .85) 0%, rgba(241, 207, 36, .35) 36%, rgba(241, 207, 36, 0) 70%);
        box-shadow: 0 0 48px rgba(241, 207, 36, .22);
        opacity: 0;
        pointer-events: none;
      }
      .eva-auth-cord-wrap {
        position: absolute;
        left: 138px;
        top: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .eva-auth-cord {
        width: 2px;
        height: 44px;
        background: linear-gradient(180deg, #64748b 0%, #8fa3c7 100%);
      }
      .eva-auth-cord-knob {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        border: 1px solid #f4d27a;
        background: radial-gradient(circle at 30% 30%, #f9df98 0%, #c8a640 70%);
        cursor: grab;
      }
      .eva-auth-cord-knob:active { cursor: grabbing; }
      .eva-auth-help {
        margin-top: auto;
        color: #a4b0c8;
        font-size: .8rem;
      }
      .eva-auth-tabs {
        display: inline-flex;
        gap: 6px;
        background: #0f1522;
        border: 1px solid #2a3550;
        border-radius: 12px;
        padding: 4px;
      }
      .eva-auth-tab {
        border: 1px solid transparent;
        background: transparent;
        color: #b7c3dd;
        padding: 7px 11px;
        border-radius: 9px;
        font-size: .85rem;
        cursor: pointer;
        font-weight: 600;
      }
      .eva-auth-tab.active {
        color: #fff;
        background: linear-gradient(180deg, #5d6bff 0%, #4453ea 100%);
        border-color: #6774ff;
      }
      .eva-auth-panel {
        margin-top: 10px;
        background: linear-gradient(180deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,.06) 100%);
        border: 1px solid rgba(246, 212, 122, .28);
        border-radius: 18px;
        padding: 16px;
        box-shadow: 0 22px 52px rgba(0,0,0,.38);
        backdrop-filter: blur(6px);
        opacity: 0;
        transform: translateY(12px);
        pointer-events: none;
      }
      .eva-auth-wrap.lamp-on .eva-auth-panel {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      .eva-auth-wrap.lamp-on .eva-auth-lamp-bulb {
        background: #f4d27a;
        border-color: #f8dc8e;
        box-shadow: 0 0 14px rgba(241, 207, 36, .65);
      }
      .eva-auth-wrap.lamp-on .eva-auth-lamp-stage::before {
        opacity: 1;
      }
      .eva-auth-card-title {
        color: #fff6d5;
        font-size: 1.65rem;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .eva-auth-card-sub {
        color: #d5d9e4;
        font-size: .85rem;
        margin-bottom: 10px;
      }
      .eva-auth-form {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .eva-auth-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .eva-auth-row label {
        color: #f3e7bd;
        font-size: .86rem;
      }
      .eva-auth-panel .eva-us-input {
        background: rgba(15, 23, 42, .62);
        border: 1px solid rgba(246, 212, 122, .24);
        color: #fff;
      }
      .eva-auth-panel .eva-us-input::placeholder {
        color: rgba(236, 236, 236, .55);
      }
      .eva-auth-pwd-wrap {
        position: relative;
      }
      .eva-auth-pwd-wrap .eva-us-input {
        padding-right: 44px;
      }
      .eva-auth-eye {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 30px;
        height: 30px;
        border-radius: 8px;
        border: 1px solid #334155;
        background: #182234;
        color: #cbd5e1;
        cursor: pointer;
      }
      .eva-auth-eye:hover { color: #fff; border-color: #64748b; }
      .eva-auth-submit {
        border: 1px solid #e8c85b;
        background: linear-gradient(120deg, #fff1b0 0%, #e8c85b 45%, #ffe7a1 100%);
        color: #2b2000;
        border-radius: 10px;
        padding: 10px 12px;
        font-weight: 700;
        cursor: pointer;
      }
      .eva-auth-status {
        margin-top: 8px;
        font-size: .83rem;
        color: #a1a1aa;
        min-height: 20px;
      }
      .eva-auth-status.ok { color: #22c55e; }
      .eva-auth-status.err { color: #ef4444; }
      .eva-auth-session {
        margin-top: 10px;
        border: 1px solid #334155;
        background: #0f172a;
        border-radius: 10px;
        padding: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .eva-auth-session b { color: #fff; }
      .eva-auth-logout {
        border: 1px solid #475569;
        background: #1e293b;
        color: #e2e8f0;
        border-radius: 10px;
        padding: 8px 10px;
        cursor: pointer;
        font-weight: 600;
      }
      .eva-auth-logout:hover { border-color: #64748b; }

      .header-logo .eva-auth-header-user {
        margin-left: 8px;
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid #3a4a66;
        background: rgba(23, 31, 47, 0.9);
        color: #dbe6ff;
        font-size: 0.73rem;
        font-weight: 600;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Lamp-login skin (match provided sample) */
      #eva-auth-wrap {
        width: 100%;
        height: min(560px, 72vh);
        min-height: 460px;
        position: relative;
        overflow: hidden;
        background: #0d0d0d;
        border-radius: 16px;
      }
      #eva-auth-wrap.lit { background: #181205; }
      #eva-auth-wrap .scene {
        position: relative;
        width: 100%;
        min-height: 520px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #eva-auth-wrap .glow-overlay {
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse 60% 60% at 26% 48%, rgba(240,192,64,0.22) 0%, transparent 70%);
        opacity: 0;
        transition: opacity 1.1s ease;
        pointer-events: none;
      }
      #eva-auth-wrap.lit .glow-overlay { opacity: 1; }
      #eva-auth-wrap .lamp-wrap {
        position: absolute;
        left: 28%;
        top: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      #eva-auth-wrap .shade {
        width: 160px;
        height: 90px;
        background: #ccc8be;
        border-radius: 50% 50% 0 0 / 100% 100% 0 0;
        position: relative;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0,0,0,0.55);
        transition: background 0.9s, filter 0.9s;
      }
      #eva-auth-wrap.lit .shade {
        background: #fffde8;
        filter: drop-shadow(0 0 36px rgba(240,192,64,0.95)) drop-shadow(0 0 80px rgba(240,180,40,0.55));
      }
      #eva-auth-wrap .neck {
        width: 14px;
        height: 120px;
        background: linear-gradient(90deg, #aaa8a0, #d4d0c8, #aaa8a0);
        border-radius: 2px;
      }
      #eva-auth-wrap .base {
        width: 100px;
        height: 16px;
        background: linear-gradient(180deg, #c4beb6, #9e978d);
        border-radius: 8px;
      }
      #eva-auth-wrap .cord-container {
        position: absolute;
        top: 90px;
        left: calc(50% + 18px);
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        z-index: 30;
        cursor: grab;
      }
      #eva-auth-wrap .cord-container:active { cursor: grabbing; }
      #eva-auth-wrap .cord-ball {
        width: 16px;
        height: 16px;
        background: radial-gradient(circle at 35% 35%, #edbe55, #9a6c18);
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        margin-top: -1px;
      }
      #eva-auth-wrap .hint {
        position: absolute;
        top: calc(90px + 90px);
        left: calc(50% + 28px);
        font-size: 11px;
        letter-spacing: 0.13em;
        color: rgba(255,255,255,0.30);
        white-space: nowrap;
        pointer-events: none;
        animation: eva-auth-blink 2.4s ease-in-out infinite;
        transition: opacity 0.5s;
      }
      #eva-auth-wrap.lit .hint { opacity: 0 !important; animation: none; }
      @keyframes eva-auth-blink { 0%,100%{opacity:.28} 50%{opacity:.75} }
      #eva-auth-wrap .panel {
        position: absolute;
        right: 6%;
        top: 50%;
        transform: translateY(-50%) scale(0.84);
        width: 360px;
        max-height: calc(100% - 80px);
        overflow: auto;
        background: rgba(28, 24, 14, 0.88);
        border: 1px solid rgba(201,150,12,0.3);
        border-radius: 22px;
        padding: 26px 24px 24px;
        backdrop-filter: blur(28px);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.65s ease, transform 0.65s cubic-bezier(0.34,1.56,0.64,1);
        box-shadow: 0 32px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05);
      }
      #eva-auth-wrap.lit .panel {
        opacity: 1;
        pointer-events: all;
        transform: translateY(-50%) scale(1);
      }
      #eva-auth-wrap .panel-title {
        font-family: 'Cormorant Garamond', serif;
        font-size: 31px;
        font-weight: 500;
        color: #f5f0e8;
        text-align: center;
        margin-bottom: 18px;
        letter-spacing: 0.04em;
      }
      #eva-auth-wrap .eva-auth-tabs {
        display: flex;
        width: 100%;
        border-bottom: 1px solid rgba(201,150,12,0.3);
        margin-bottom: 16px;
        border-radius: 0;
        background: transparent;
        padding: 0;
      }
      #eva-auth-wrap .eva-auth-tab {
        flex: 1;
        border: none;
        border-radius: 0;
        background: none;
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.32);
        padding: 8px;
      }
      #eva-auth-wrap .eva-auth-tab.active {
        color: #f0c040;
        background: transparent;
        border: none;
        box-shadow: none;
      }
      #eva-auth-wrap .eva-auth-tab.active::after {
        content: '';
        display: block;
        height: 2px;
        width: 64%;
        margin: 6px auto 0;
        border-radius: 2px;
        background: #c9960c;
      }
      #eva-auth-wrap .eva-auth-row label {
        font-size: 10.5px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.42);
      }
      #eva-auth-wrap .eva-auth-panel .eva-us-input {
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(201,150,12,0.3);
      }
      #eva-auth-wrap .eva-auth-submit {
        margin-top: 6px;
        width: 100%;
        padding: 13px;
        letter-spacing: 0.18em;
      }
      #eva-auth-wrap .eva-auth-card-sub { display: none; }
      @media (max-width: 900px) {
        .eva-us-grid { grid-template-columns: 1fr; }
        #eva-auth-wrap .lamp-wrap { left: 50%; top: 34%; }
        #eva-auth-wrap .panel { position: relative; right: auto; top: auto; transform: scale(.95); margin: 260px auto 0; width: min(360px, 90%); }
        #eva-auth-wrap.lit .panel { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  function injectSettingsPageIfMissing() {
    if (el("page-settings")) return;
    const gradingPage = el("page-grading");
    if (!gradingPage || !gradingPage.parentNode) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="page-container" id="page-settings" data-theme="dark">
        <div class="page-header">
          <div class="menu-icon" onclick="document.getElementById('sidebar').classList.add('active'); document.getElementById('sidebar-overlay').classList.add('active');">
            <i class="fas fa-bars"></i>
          </div>
          <div class="page-header-title">Tùy chỉnh người dùng (chatbot)</div>
          <div class="header-logo">
            <img src="logo.png" alt="EVA Logo" class="small-logo">
            <span class="header-logo-text">EVA</span>
          </div>
        </div>

        <div class="eva-settings-top-toolbar">
          <button type="button" id="eva-auth-open" class="eva-auth-open-btn">Đăng nhập</button>
          <div id="eva-auth-inline" class="eva-auth-inline">Chưa đăng nhập.</div>
          <select id="eva-settings-theme" class="eva-us-input eva-settings-theme">
            <option value="dark">🌙 Dark Mode</option>
            <option value="light">☀️ Light Mode</option>
            <option value="golden">🐶 Golden Pup</option>
            <option value="ocean">🌊 Ocean Deep</option>
            <option value="sakura">🌸 Sakura</option>
            <option value="forest">🌿 Forest</option>
            <option value="candy">🍬 Candy Pop</option>
            <option value="sunset">🌅 Sunset</option>
          </select>
        </div>

        <div class="page-body eva-us-body" style="padding:16px; overflow:auto;">
          <div class="eva-us-card-shell" style="max-width:900px; margin:0 auto; border-radius:16px; padding:16px;">
            <div class="eva-us-title" style="color:#fff; font-size:1.08rem; margin-bottom:6px;">Phong cách và giọng điệu cơ bản</div>
            <div style="color:#a1a1aa; font-size:0.88rem; margin-bottom:12px; line-height:1.45;">Chỉ áp dụng cho Chatbot EVA. Không ảnh hưởng tạo đề, mindmap, TKB, chấm bài.</div>

            <div style="display:grid; grid-template-columns:1fr 260px; gap:10px; align-items:center; margin-bottom:12px;">
              <label style="color:#e5e7eb;">Phong cách / giọng điệu cơ bản</label>
              <select id="eva-us-tone-base" class="eva-us-input">
                <option value="thang_than">Thẳng thắn</option>
                <option value="chuyen_nghiep">Chuyên nghiệp</option>
                <option value="than_thien">Thân thiện</option>
                <option value="hoc_thuat">Học thuật</option>
              </select>
            </div>

            <div class="eva-us-section-title" style="color:#fff; margin-top:12px; margin-bottom:6px;">Đặc điểm</div>
            <div style="color:#a1a1aa; font-size:0.82rem; margin-bottom:10px; line-height:1.45;">Chọn các tùy chỉnh bổ sung dựa trên phong cách cơ bản của bạn.</div>

            <div class="eva-us-grid">
              <label>Ấm áp</label>
              <select id="eva-us-warmth" class="eva-us-input">
                <option value="low">Giảm</option>
                <option value="normal">Mặc định</option>
                <option value="high">Tăng lên</option>
              </select>

              <label>Nhiệt tình</label>
              <select id="eva-us-enthusiasm" class="eva-us-input">
                <option value="low">Giảm</option>
                <option value="normal">Mặc định</option>
                <option value="high">Tăng lên</option>
              </select>

              <label>Tiêu đề và danh sách</label>
              <select id="eva-us-headings" class="eva-us-input">
                <option value="minimal">Tối giản</option>
                <option value="default">Mặc định</option>
                <option value="rich">Nhiều hơn</option>
              </select>

              <label>Biểu tượng cảm xúc</label>
              <select id="eva-us-emoji" class="eva-us-input">
                <option value="off">Tắt</option>
                <option value="normal">Mặc định</option>
                <option value="high">Tăng lên</option>
              </select>
            </div>

            <div style="margin-top:14px;">
              <label style="display:block; color:#e5e7eb; margin-bottom:6px;">Hướng dẫn tùy chỉnh</label>
              <textarea id="eva-us-custom-guidance" class="eva-us-input" style="min-height:76px; resize:vertical;" placeholder="Tùy chỉnh thêm về hành vi, phong cách và giọng điệu"></textarea>
            </div>

            <div style="margin-top:18px; border-top:1px solid #2a2f39; padding-top:14px;">
              <div class="eva-us-title" style="color:#fff; font-size:1.05rem; margin-bottom:10px;">Thông tin về bạn</div>
              <div style="display:flex; flex-direction:column; gap:10px;">
                <div>
                  <label style="display:block; color:#e5e7eb; margin-bottom:6px;">Biệt danh</label>
                  <input id="eva-us-alias" class="eva-us-input" type="text" placeholder="EVA nên gọi bạn là gì?">
                </div>
                <div>
                  <label style="display:block; color:#e5e7eb; margin-bottom:6px;">Nghề nghiệp</label>
                  <input id="eva-us-profession" class="eva-us-input" type="text" placeholder="VD: Giáo viên Toán, Trợ giảng, Nhân viên văn phòng...">
                </div>
                <div>
                  <label style="display:block; color:#e5e7eb; margin-bottom:6px;">Thêm thông tin về bạn</label>
                  <textarea id="eva-us-about" class="eva-us-input" style="min-height:76px; resize:vertical;" placeholder="Sở thích, mục tiêu học tập, cách bạn muốn EVA hỗ trợ..."></textarea>
                </div>
              </div>
            </div>

            <div style="margin-top:18px; border-top:1px solid #2a2f39; padding-top:14px;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px;">
                <div class="eva-us-title" style="color:#fff; font-size:1.05rem;">Bộ nhớ</div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="eva-us-chip">Chỉ cho chatbot</span>
                  <button id="eva-us-memory-manage" type="button" class="modal-btn" style="background:#374151;">Quản lý</button>
                </div>
              </div>

              <div style="display:flex; flex-direction:column; gap:10px;">
                <div class="eva-us-toggle-row">
                  <div>
                    <div class="eva-us-toggle-title">Tham khảo bộ nhớ đã lưu</div>
                    <div class="eva-us-toggle-desc">Cho phép Chatbot EVA dùng các mục bộ nhớ đã lưu khi phản hồi.</div>
                  </div>
                  <label class="switch">
                    <input type="checkbox" id="eva-us-memory-enabled">
                    <span class="slider"></span>
                  </label>
                </div>

                <div class="eva-us-toggle-row">
                  <div>
                    <div class="eva-us-toggle-title">Tham khảo lịch sử đoạn chat</div>
                    <div class="eva-us-toggle-desc">Nếu tắt, chatbot chỉ dựa vào tin nhắn hiện tại + cài đặt người dùng + bộ nhớ đã lưu.</div>
                  </div>
                  <label class="switch">
                    <input type="checkbox" id="eva-us-history-enabled">
                    <span class="slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div style="margin-top:18px; border-top:1px solid #2a2f39; padding-top:14px;">
              <div class="eva-us-title" style="color:#fff; font-size:1.05rem; margin-bottom:8px;">Tiện ích EVA</div>
              <button id="eva-us-open-results" type="button" class="modal-btn" style="width:100%; margin-bottom:10px; background:#2563eb; color:#fff;">
                Mở xem điểm
              </button>
            </div>

            <div id="eva-us-admin-tools" style="display:none; margin-top:18px; border-top:1px solid #2a2f39; padding-top:14px;">
              <div class="eva-us-title" style="color:#fff; font-size:1.05rem; margin-bottom:8px;">Cong cu Admin EVA</div>
              <div style="color:#a1a1aa; font-size:0.84rem; line-height:1.45; margin-bottom:12px;">
                Chi tai khoan admin moi thay va mo duoc cac module local cua EVA.
              </div>
              <button id="eva-us-open-iot" type="button" class="modal-btn modal-btn-confirm" style="width:100%; margin-bottom:10px;">
                Mở EVA_IoT
              </button>
              <button id="eva-us-open-n8n" type="button" class="modal-btn" style="width:100%; margin-bottom:10px; background:#7c3aed; color:#fff;">
                Mở n8n local
              </button>
            </div>

            <div style="margin-top:18px; border-top:1px solid #2a2f39; padding-top:14px; display:flex; gap:10px; justify-content:flex-end;">
              <button id="eva-us-cancel" type="button" class="modal-btn" style="background:#374151;">Hủy bỏ</button>
              <button id="eva-us-save" type="button" class="modal-btn modal-btn-confirm">Lưu</button>
            </div>

          </div>
        </div>
      </div>

      <div id="eva-auth-overlay" class="eva-auth-overlay">
        <div class="eva-auth-dialog">
          <div class="eva-auth-dialog-head">
            <button type="button" id="eva-auth-back" class="eva-auth-back-btn">Quay lại</button>
            <div style="color:#f4d27a; font-weight:700;">Lamp-login</div>
          </div>
          <div class="eva-auth-wrap" id="eva-auth-wrap">
            <div class="scene">
              <div class="glow-overlay" id="eva-auth-lamp-glow"></div>
              <div class="lamp-wrap">
                <div class="shade"></div>
                <div class="neck"></div>
                <div class="base"></div>
                <div class="cord-container" id="eva-auth-cord-container">
                  <svg id="eva-auth-cord-svg" width="6" height="65">
                    <defs>
                      <linearGradient id="eva-auth-cord-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#777"></stop>
                        <stop offset="50%" stop-color="#ddd"></stop>
                        <stop offset="100%" stop-color="#777"></stop>
                      </linearGradient>
                    </defs>
                    <line id="eva-auth-cord-line" x1="3" y1="0" x2="3" y2="65" stroke="url(#eva-auth-cord-gradient)" stroke-width="2.5" stroke-linecap="round"></line>
                  </svg>
                  <div class="cord-ball" id="eva-auth-cord-ball"></div>
                </div>
                <div class="hint">↓ kéo dây xuống</div>
              </div>
            </div>

            <div class="panel eva-auth-panel" id="eva-auth-panel">
              <div class="panel-title">Chào mừng</div>
              <div class="eva-auth-tabs">
                <button type="button" class="eva-auth-tab active" id="eva-auth-tab-login">Đăng nhập</button>
                <button type="button" class="eva-auth-tab" id="eva-auth-tab-register">Đăng ký</button>
              </div>
              <form id="eva-auth-login-form" class="eva-auth-form">
                <div class="eva-auth-row">
                  <label for="eva-auth-login-user">Tên đăng nhập</label>
                  <input id="eva-auth-login-user" class="eva-us-input" type="text" placeholder="Nhập username">
                </div>
                <div class="eva-auth-row">
                  <label for="eva-auth-login-pass">Mật khẩu</label>
                  <div class="eva-auth-pwd-wrap">
                    <input id="eva-auth-login-pass" class="eva-us-input" type="password" placeholder="Nhập mật khẩu">
                    <button type="button" class="eva-auth-eye" data-target="eva-auth-login-pass" title="Hiện/ẩn mật khẩu"><i class="fas fa-eye"></i></button>
                  </div>
                </div>
                <button type="submit" class="eva-auth-submit">Đăng nhập</button>
              </form>

              <form id="eva-auth-register-form" class="eva-auth-form" style="display:none;">
                <div class="eva-auth-row">
                  <label for="eva-auth-register-user">Tên đăng nhập</label>
                  <input id="eva-auth-register-user" class="eva-us-input" type="text" placeholder="Tạo username">
                </div>
                <div class="eva-auth-row">
                  <label for="eva-auth-register-pass">Mật khẩu</label>
                  <div class="eva-auth-pwd-wrap">
                    <input id="eva-auth-register-pass" class="eva-us-input" type="password" placeholder="Tạo mật khẩu (>= 8 ký tự)">
                    <button type="button" class="eva-auth-eye" data-target="eva-auth-register-pass" title="Hiện/ẩn mật khẩu"><i class="fas fa-eye"></i></button>
                  </div>
                </div>
                <div class="eva-auth-row">
                  <label for="eva-auth-register-pass2">Xác nhận mật khẩu</label>
                  <div class="eva-auth-pwd-wrap">
                    <input id="eva-auth-register-pass2" class="eva-us-input" type="password" placeholder="Nhập lại mật khẩu">
                    <button type="button" class="eva-auth-eye" data-target="eva-auth-register-pass2" title="Hiện/ẩn mật khẩu"><i class="fas fa-eye"></i></button>
                  </div>
                </div>
                <button type="submit" class="eva-auth-submit">Tạo tài khoản</button>
              </form>

              <div id="eva-auth-status" class="eva-auth-status"></div>
              <div id="eva-auth-session" class="eva-auth-session" style="display:none;">
                <div id="eva-auth-session-text"></div>
                <button type="button" id="eva-auth-logout" class="eva-auth-logout">Đăng xuất</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="eva-us-memory-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:9999; align-items:center; justify-content:center; padding:18px;">
        <div style="width:min(720px,96vw); max-height:85vh; overflow:hidden; background:#17181d; border:1px solid #2a2f39; border-radius:16px; display:flex; flex-direction:column;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid #2a2f39;">
            <div>
              <div style="color:#fff; font-weight:700;">Quản lý bộ nhớ chatbot</div>
              <div style="color:#a1a1aa; font-size:0.8rem;">Chỉ áp dụng cho chatbot EVA</div>
            </div>
            <button type="button" id="eva-us-memory-close" class="modal-btn" style="background:#374151; padding:6px 10px;">Đóng</button>
          </div>
          <div style="padding:12px 14px; display:grid; grid-template-columns:1fr auto; gap:8px; border-bottom:1px solid #2a2f39;">
            <input id="eva-us-memory-input" class="eva-us-input" type="text" placeholder="VD: Tôi là giáo viên Toán THPT, ưu tiên ví dụ ngắn gọn và dễ áp dụng">
            <button type="button" id="eva-us-memory-add" class="modal-btn modal-btn-confirm">Thêm</button>
          </div>
          <div id="eva-us-memory-list" style="padding:12px 14px; overflow:auto; min-height:120px;"></div>
        </div>
      </div>
    `;

    while (wrapper.firstElementChild) {
      gradingPage.parentNode.insertBefore(wrapper.firstElementChild, gradingPage);
    }
  }

  function ensureUserSettingsUIInitialized() {
    injectStyles();
    injectSettingsPageIfMissing();
    if (uiInitialized) return;
    uiInitialized = true;
    if (!localStorage.getItem(SETTINGS_THEME_KEY)) {
      localStorage.setItem(SETTINGS_THEME_KEY, "dark");
    }
    draft = loadSettings();
    applySettingsTheme(getSavedSettingsTheme());
    wireUI();
    renderUserSettingsPage();
  }
  window.ensureUserSettingsUIInitialized = ensureUserSettingsUIInitialized;

  function renderUserSettingsPage() {
    injectStyles();
    injectSettingsPageIfMissing();
    draft = draft || loadSettings();
    const session = getAuthSession();
    const values = {
      "eva-us-tone-base": draft.toneBase,
      "eva-us-warmth": draft.warmth,
      "eva-us-enthusiasm": draft.enthusiasm,
      "eva-us-headings": draft.headings,
      "eva-us-emoji": draft.emoji,
      "eva-us-custom-guidance": draft.customGuidance,
      "eva-us-alias": draft.alias,
      "eva-us-profession": draft.profession,
      "eva-us-about": draft.about,
    };
    Object.entries(values).forEach(([id, v]) => { if (el(id)) el(id).value = v ?? ""; });
    if (el("eva-us-memory-enabled")) el("eva-us-memory-enabled").checked = !!draft.memoryEnabled;
    if (el("eva-us-history-enabled")) el("eva-us-history-enabled").checked = !!draft.historyEnabled;
    if (el("eva-settings-theme")) el("eva-settings-theme").value = getSavedSettingsTheme();
    const adminTools = el("eva-us-admin-tools");
    const openIotBtn = el("eva-us-open-iot");
    const openN8nBtn = el("eva-us-open-n8n");
    const openResultsBtn = el("eva-us-open-results");
    const isAdmin = String(session?.role || "").toLowerCase() === "admin";
    if (adminTools) adminTools.style.display = isAdmin ? "block" : "none";
    if (openIotBtn) {
      openIotBtn.onclick = () => {
        if (!isAdmin) return;
        window.open("eva_iot_rebuilt.html", "_blank", "noopener,noreferrer");
      };
    }
    if (openN8nBtn) {
      openN8nBtn.onclick = () => {
        if (!isAdmin) return;
        window.open("http://localhost:5678/", "_blank", "noopener,noreferrer");
      };
    }
    if (openResultsBtn) {
      openResultsBtn.onclick = () => {
        window.open("xem điểm.html", "_blank", "noopener,noreferrer");
      };
    }
    renderAuthSession();
    renderMemoryList();
  }
  window.renderUserSettingsPage = renderUserSettingsPage;

  function wireUI() {
    [
      "eva-us-tone-base", "eva-us-warmth", "eva-us-enthusiasm", "eva-us-headings", "eva-us-emoji",
      "eva-us-custom-guidance", "eva-us-alias", "eva-us-profession", "eva-us-about",
    ].forEach((id) => {
      const n = el(id);
      if (!n) return;
      n.addEventListener("input", syncDraft);
      n.addEventListener("change", syncDraft);
    });

    el("eva-us-memory-enabled")?.addEventListener("change", syncDraft);
    el("eva-us-history-enabled")?.addEventListener("change", syncDraft);

    el("eva-us-save")?.addEventListener("click", () => {
      syncDraft();
      saveSettings(draft);
      toast("Đã lưu tùy chỉnh chatbot.");
    });
    el("eva-us-cancel")?.addEventListener("click", () => {
      draft = loadSettings();
      renderUserSettingsPage();
      toast("Đã hoàn tác về bản đã lưu.");
    });
    el("eva-us-memory-manage")?.addEventListener("click", () => {
      renderMemoryList();
      if (el("eva-us-memory-modal")) el("eva-us-memory-modal").style.display = "flex";
    });
    el("eva-settings-theme")?.addEventListener("change", () => {
      applySettingsTheme(el("eva-settings-theme")?.value || "dark");
    });
    window.addEventListener("eva-auth-changed", () => {
      renderAuthSession();
      renderUserSettingsPage();
    });
    el("eva-us-memory-close")?.addEventListener("click", () => {
      if (el("eva-us-memory-modal")) el("eva-us-memory-modal").style.display = "none";
    });
    el("eva-us-memory-modal")?.addEventListener("click", (e) => {
      if (e.target && e.target.id === "eva-us-memory-modal") el("eva-us-memory-modal").style.display = "none";
    });
    el("eva-us-memory-add")?.addEventListener("click", addMemoryItem);
    el("eva-us-memory-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") addMemoryItem(); });

    wireAuthUI();
  }

  function normalizeUsername(name) {
    return String(name || "").trim().toLowerCase().replace(/\s+/g, "");
  }

  function getAuthSession() {
    try { return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null"); }
    catch { return null; }
  }

  function getSavedSettingsTheme() {
    const value = (localStorage.getItem(SETTINGS_THEME_KEY) || "dark").toLowerCase().trim();
    const allowed = ["dark", "light", "golden", "ocean", "sakura", "forest", "candy", "sunset"];
    return allowed.includes(value) ? value : "dark";
  }

  function applySettingsTheme(theme) {
    const page = el("page-settings");
    if (!page) return;
    const value = theme === "light" ? "light" : (theme === "golden" ? "golden" : (theme === "ocean" ? "ocean" : (theme === "sakura" ? "sakura" : (theme === "forest" ? "forest" : (theme === "candy" ? "candy" : (theme === "sunset" ? "sunset" : "dark"))))));
    page.setAttribute("data-theme", value);
    localStorage.setItem(SETTINGS_THEME_KEY, value);
    document.body.setAttribute("data-eva-theme", value);
    if (typeof window.applyGlobalTheme === "function") window.applyGlobalTheme(value);
    const select = el("eva-settings-theme");
    if (select) select.value = value;
  }

  function saveAuthSession(session) {
    if (!session) localStorage.removeItem(AUTH_SESSION_KEY);
    else localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    updateHeaderAuthBadges();
    window.dispatchEvent(new CustomEvent("eva-auth-changed", {
      detail: { session: session ? { ...session } : null }
    }));
  }

  function setAuthStatus(text, type = "") {
    const node = el("eva-auth-status");
    if (!node) return;
    node.className = `eva-auth-status ${type}`.trim();
    node.textContent = text || "";
  }

  function openAuthOverlay() {
    const ov = el("eva-auth-overlay");
    if (!ov) return;
    ov.style.display = "flex";
    // Open login panel in visible state to avoid "black screen with lamp only".
    if (!authLampOn) setAuthLampState(true, false);
  }

  function closeAuthOverlay() {
    const ov = el("eva-auth-overlay");
    if (!ov) return;
    ov.style.display = "none";
  }

  function ensureGsap() {
    return new Promise((resolve) => {
      if (window.gsap) return resolve(window.gsap);
      const old = document.getElementById("eva-gsap-lib");
      if (old) {
        old.addEventListener("load", () => resolve(window.gsap));
        old.addEventListener("error", () => resolve(null));
        return;
      }
      const s = document.createElement("script");
      s.id = "eva-gsap-lib";
      s.src = "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js";
      s.async = true;
      s.onload = () => resolve(window.gsap || null);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }

  async function setAuthLampState(isOn, animate = true) {
    authLampOn = !!isOn;
    const wrap = el("eva-auth-wrap");
    const board = wrap ? wrap.querySelector(".scene") : null;
    const glow = el("eva-auth-lamp-glow");
    const cordSvg = el("eva-auth-cord-svg");
    const cordLine = el("eva-auth-cord-line");
    if (!wrap || !board || !glow || !cordSvg || !cordLine) return;

    wrap.classList.toggle("lit", authLampOn);
    const gsap = await ensureGsap();

    if (gsap && animate) {
      gsap.to(board, {
        boxShadow: authLampOn
          ? "inset 0 0 0 1px rgba(246,212,122,.2), 0 0 40px rgba(241,207,36,.08)"
          : "inset 0 0 0 0 rgba(0,0,0,0), 0 0 0 rgba(0,0,0,0)",
        duration: 0.5,
        ease: "power2.out"
      });
      gsap.fromTo(cordSvg, { attr: { height: 65 } }, { attr: { height: 77 }, duration: 0.16, yoyo: true, repeat: 1, ease: "power1.out" });
      gsap.fromTo(cordLine, { attr: { y2: 65 } }, { attr: { y2: 77 }, duration: 0.16, yoyo: true, repeat: 1, ease: "power1.out" });
      gsap.to(glow, { opacity: authLampOn ? 1 : 0, scale: authLampOn ? 1.45 : 1, duration: 0.42, ease: "power2.out" });
      gsap.to("#eva-auth-panel", { opacity: authLampOn ? 1 : 0, y: authLampOn ? 0 : 12, duration: 0.35, ease: "power2.out" });
    } else {
      glow.style.opacity = authLampOn ? "1" : "0";
      if (el("eva-auth-panel")) el("eva-auth-panel").style.opacity = authLampOn ? "1" : "0";
    }
    localStorage.setItem("eva_auth_lamp_on", authLampOn ? "1" : "0");
  }

  function renderAuthSession() {
    const box = el("eva-auth-session");
    const text = el("eva-auth-session-text");
    const inline = el("eva-auth-inline");
    const openBtn = el("eva-auth-open");
    const session = getAuthSession();
    if (!box || !text) return;
    if (!session?.username) {
      box.style.display = "none";
      text.textContent = "";
      if (inline) inline.textContent = "Chưa đăng nhập.";
      if (openBtn) openBtn.textContent = "Đăng nhập";
      updateHeaderAuthBadges();
      return;
    }
    box.style.display = "flex";
    text.innerHTML = `Đang đăng nhập: <b>${esc(session.username)}</b> · Quyền: <b>${esc(session.role || "user")}</b>`;
    if (inline) inline.innerHTML = `Đang đăng nhập: <b>${esc(session.username)}</b> (${esc(session.role || "user")})`;
    if (openBtn) openBtn.textContent = "Đăng nhập / Tài khoản";
    updateHeaderAuthBadges();
  }

  function updateHeaderAuthBadges() {
    document.querySelectorAll(".eva-auth-header-user").forEach((n) => n.remove());
    const s = getAuthSession();
    const username = String(s?.username || "").trim();
    if (!username) return;
    document.querySelectorAll(".header-logo").forEach((logo) => {
      const badge = document.createElement("span");
      badge.className = "eva-auth-header-user";
      badge.textContent = username;
      logo.appendChild(badge);
    });
  }

  async function postAuth(action, username, password) {
    const body = new URLSearchParams();
    body.set("action", action);
    body.set("username", username);
    body.set("password", password);
    const requestInit = {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: body.toString()
    };

    async function readAuthResponse(url) {
      const res = await fetch(url, requestInit);
      const data = await res.json().catch(() => ({}));
      if (data && typeof data === "object" && !data.ok && /not found/i.test(String(data?.error || data?.message || ""))) {
        throw new Error(data?.error || data?.message || "Not found");
      }
      if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      return data;
    }

    return await readAuthResponse(AUTH_API_URL);
  }

  function togglePasswordInput(inputId, btn) {
    const n = el(inputId);
    if (!n || !btn) return;
    const isHidden = n.type === "password";
    n.type = isHidden ? "text" : "password";
    btn.innerHTML = isHidden ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
  }

  function setAuthMode(mode) {
    const isLogin = mode === "login";
    el("eva-auth-tab-login")?.classList.toggle("active", isLogin);
    el("eva-auth-tab-register")?.classList.toggle("active", !isLogin);
    if (el("eva-auth-login-form")) el("eva-auth-login-form").style.display = isLogin ? "flex" : "none";
    if (el("eva-auth-register-form")) el("eva-auth-register-form").style.display = isLogin ? "none" : "flex";
    setAuthStatus("");
  }

  function wireAuthUI() {
    const savedLamp = localStorage.getItem("eva_auth_lamp_on");
    setAuthLampState(savedLamp === "1", false);

    el("eva-auth-open")?.addEventListener("click", () => openAuthOverlay());
    el("eva-auth-back")?.addEventListener("click", () => closeAuthOverlay());
    el("eva-auth-overlay")?.addEventListener("click", (e) => {
      if (e.target && e.target.id === "eva-auth-overlay") closeAuthOverlay();
    });

    el("eva-auth-tab-login")?.addEventListener("click", () => setAuthMode("login"));
    el("eva-auth-tab-register")?.addEventListener("click", () => setAuthMode("register"));

    document.querySelectorAll(".eva-auth-eye").forEach((btn) => {
      btn.addEventListener("click", () => togglePasswordInput(btn.getAttribute("data-target"), btn));
    });

    const cordContainer = el("eva-auth-cord-container");
    const cordSvg = el("eva-auth-cord-svg");
    const cordLine = el("eva-auth-cord-line");
    if (cordContainer && cordSvg && cordLine) {
      const REST = 65;
      const MAX = 155;
      const TRIGGER = 60;
      let dragging = false;
      let startY = 0;
      let animId = null;

      const setH = (h) => {
        const hh = Math.max(REST, Math.min(MAX, h));
        cordSvg.setAttribute("height", String(hh));
        cordLine.setAttribute("y2", String(hh));
      };
      const ey = (e) => (e.touches ? e.touches[0].clientY : e.clientY);

      const springBack = (fromH) => {
        const kf = [
          { p: 0, h: fromH }, { p: 0.28, h: REST - 12 }, { p: 0.5, h: REST + 16 },
          { p: 0.68, h: REST - 6 }, { p: 0.82, h: REST + 4 }, { p: 0.92, h: REST - 2 }, { p: 1, h: REST }
        ];
        const dur = 600;
        const start = performance.now();
        const lerp = (a, b, t) => a + (b - a) * t;
        const sample = (prog) => {
          for (let i = 1; i < kf.length; i++) {
            if (prog <= kf[i].p) {
              const span = (kf[i].p - kf[i - 1].p);
              const t = (prog - kf[i - 1].p) / span;
              return lerp(kf[i - 1].h, kf[i].h, t);
            }
          }
          return REST;
        };
        const tick = (now) => {
          const prog = Math.min((now - start) / dur, 1);
          setH(sample(prog));
          if (prog < 1) animId = requestAnimationFrame(tick);
          else animId = null;
        };
        animId = requestAnimationFrame(tick);
      };

      const onMove = (e) => {
        if (!dragging) return;
        e.preventDefault();
        const dy = Math.max(0, ey(e) - startY);
        setH(REST + dy);
      };
      const onUp = () => {
        if (!dragging) return;
        dragging = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("touchend", onUp);
        const currentH = parseFloat(cordSvg.getAttribute("height")) || REST;
        const pulled = currentH - REST;
        if (pulled >= TRIGGER) setAuthLampState(!authLampOn, true);
        springBack(currentH);
      };
      const onDown = (e) => {
        e.preventDefault();
        if (animId) { cancelAnimationFrame(animId); animId = null; }
        dragging = true;
        startY = ey(e);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchend", onUp);
      };
      cordContainer.addEventListener("mousedown", onDown);
      cordContainer.addEventListener("touchstart", onDown, { passive: false });
    }

    el("eva-auth-login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!authLampOn) return setAuthStatus("Hãy bật đèn để mở đăng nhập.", "err");
      const username = normalizeUsername(el("eva-auth-login-user")?.value);
      const password = String(el("eva-auth-login-pass")?.value || "");
      if (!username) return setAuthStatus("Vui lòng nhập tên đăng nhập.", "err");
      if (!password) return setAuthStatus("Vui lòng nhập mật khẩu.", "err");

      setAuthStatus("Đang đăng nhập...", "");
      try {
        const data = await postAuth("login", username, password);
        if (!data?.ok) throw new Error(data?.error || data?.code || "Đăng nhập thất bại.");
        saveAuthSession({
          id: String(data.id || ""),
          username: String(data.username || username),
          role: String(data.role || "user"),
          at: new Date().toISOString()
        });
        renderAuthSession();
        setAuthStatus("Đăng nhập thành công.", "ok");
        toast("Đăng nhập EVA thành công.");
      } catch (err) {
        const msg = String(err?.message || err || "");
        if (/USER_NOT_FOUND|WRONG_PASSWORD|wrong password|username|password|Tên đăng nhập|mật khẩu/i.test(msg)) {
          setAuthStatus("Bạn đã nhập sai tên tài khoản hoặc mật khẩu.", "err");
        } else {
          setAuthStatus(`Đăng nhập lỗi: ${msg || "Không xác định."}`, "err");
        }
      }
    });

    el("eva-auth-register-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!authLampOn) return setAuthStatus("Hãy bật đèn để mở đăng ký.", "err");
      const username = normalizeUsername(el("eva-auth-register-user")?.value);
      const pass1 = String(el("eva-auth-register-pass")?.value || "");
      const pass2 = String(el("eva-auth-register-pass2")?.value || "");
      if (!username) return setAuthStatus("Vui lòng nhập tên đăng nhập.", "err");
      if (pass1.length < 8) return setAuthStatus("Mật khẩu cần ít nhất 8 ký tự.", "err");
      if (pass1 !== pass2) return setAuthStatus("Mật khẩu xác nhận không khớp.", "err");

      setAuthStatus("Đang tạo tài khoản...", "");
      try {
        const data = await postAuth("register", username, pass1);
        if (!data?.ok) throw new Error(data?.error || data?.code || "Đăng ký thất bại.");
        saveAuthSession({
          id: String(data.id || ""),
          username: String(data.username || username),
          role: String(data.role || "user"),
          at: new Date().toISOString()
        });
        renderAuthSession();
        setAuthStatus("Đăng ký thành công. Bạn có thể đăng nhập ngay.", "ok");
        setAuthMode("login");
        if (el("eva-auth-login-user")) el("eva-auth-login-user").value = username;
        if (el("eva-auth-register-pass")) el("eva-auth-register-pass").value = "";
        if (el("eva-auth-register-pass2")) el("eva-auth-register-pass2").value = "";
        toast("Tạo tài khoản thành công.");
      } catch (err) {
        const msg = String(err?.message || err || "");
        if (/USERNAME_TAKEN|already exists|username already exists/i.test(msg)) {
          setAuthStatus("Tên này đã có chủ sở hữu :)", "err");
        } else {
          setAuthStatus(`Đăng ký lỗi: ${msg}`, "err");
        }
      }
    });

    el("eva-auth-logout")?.addEventListener("click", () => {
      saveAuthSession(null);
      renderAuthSession();
      setAuthStatus("Đã đăng xuất.", "ok");
      toast("Bạn đã đăng xuất.");
    });

    renderAuthSession();
  }

  function syncDraft() {
    draft = draft || loadSettings();
    draft.toneBase = el("eva-us-tone-base")?.value || DEFAULTS.toneBase;
    draft.warmth = el("eva-us-warmth")?.value || DEFAULTS.warmth;
    draft.enthusiasm = el("eva-us-enthusiasm")?.value || DEFAULTS.enthusiasm;
    draft.headings = el("eva-us-headings")?.value || DEFAULTS.headings;
    draft.emoji = el("eva-us-emoji")?.value || DEFAULTS.emoji;
    draft.customGuidance = (el("eva-us-custom-guidance")?.value || "").trim();
    draft.alias = (el("eva-us-alias")?.value || "").trim();
    draft.profession = (el("eva-us-profession")?.value || "").trim();
    draft.about = (el("eva-us-about")?.value || "").trim();
    draft.memoryEnabled = !!el("eva-us-memory-enabled")?.checked;
    draft.historyEnabled = !!el("eva-us-history-enabled")?.checked;
  }

  function addMemoryItem() {
    const input = el("eva-us-memory-input");
    const text = (input?.value || "").trim();
    if (!text) return;
    const items = loadMemory();
    items.unshift({ id: uid(), text, updatedAt: new Date().toISOString() });
    saveMemory(items);
    if (input) input.value = "";
    renderMemoryList();
  }

  function renderMemoryList() {
    const host = el("eva-us-memory-list");
    if (!host) return;
    const items = loadMemory();
    if (!items.length) {
      host.innerHTML = '<div style="color:#9ca3af; font-size:.85rem; line-height:1.45;">Chưa có bộ nhớ đã lưu. Thêm một mục để chatbot hiểu bạn hơn.</div>';
      return;
    }
    host.innerHTML = items.map((it) => `
      <div style="display:grid; grid-template-columns:1fr auto; gap:8px; align-items:start; border:1px solid #2a2f39; background:#111318; border-radius:10px; padding:10px; margin-bottom:8px;">
        <div>
          <div style="color:#e5e7eb; font-size:.9rem; line-height:1.45;">${esc(it.text)}</div>
          <div style="color:#6b7280; font-size:.75rem; margin-top:4px;">${new Date(it.updatedAt || Date.now()).toLocaleString()}</div>
        </div>
        <div style="display:flex; gap:6px;">
          <button type="button" class="modal-btn" style="background:#374151; padding:4px 8px; font-size:.75rem;" onclick="window.evaUserSettingsEditMemory('${it.id}')">Sửa</button>
          <button type="button" class="modal-btn" style="background:#7f1d1d; padding:4px 8px; font-size:.75rem;" onclick="window.evaUserSettingsDeleteMemory('${it.id}')">Xóa</button>
        </div>
      </div>
    `).join("");
  }

  window.evaUserSettingsEditMemory = (id) => {
    const items = loadMemory();
    const target = items.find((x) => x.id === id);
    if (!target) return;
    const next = prompt("Sửa mục bộ nhớ:", target.text);
    if (next == null) return;
    target.text = String(next).trim();
    target.updatedAt = new Date().toISOString();
    saveMemory(items.filter((x) => x.text));
    renderMemoryList();
  };

  window.evaUserSettingsDeleteMemory = (id) => {
    if (!confirm("Xóa mục bộ nhớ này?")) return;
    saveMemory(loadMemory().filter((x) => x.id !== id));
    renderMemoryList();
  };

  function toast(msg) {
    let t = el("eva-us-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "eva-us-toast";
      t.style.cssText = "position:fixed; right:18px; bottom:18px; z-index:10000; background:#111827; color:#fff; border:1px solid #374151; border-radius:10px; padding:10px 12px; box-shadow:0 10px 30px rgba(0,0,0,.35); font-size:.85rem;";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.display = "none"; }, 1800);
  }

  function getSettingsSnapshot() { return loadSettings(); }
  window.getEvaChatbotSettingsSnapshot = getSettingsSnapshot;
  window.getEvaChatbotUseHistory = () => !!getSettingsSnapshot().historyEnabled;

  function buildProfileInstruction(s) {
    const toneMap = {
      thang_than: "thẳng thắn, rõ ràng, trực tiếp",
      chuyen_nghiep: "chuyên nghiệp, lịch sự, có cấu trúc",
      than_thien: "thân thiện, dễ gần, dễ hiểu",
      hoc_thuat: "học thuật, chính xác, cẩn trọng",
    };
    const bits = [];
    bits.push("Ưu tiên trả lời tự nhiên, trực tiếp và đúng trọng tâm.");
    bits.push("Câu hỏi dễ hoặc có đáp án ngắn thì trả lời ngắn gọn, có thể chỉ cần đáp án hoặc 1-2 câu.");
    bits.push("Chỉ trả lời dài khi câu hỏi khó, nhiều ý, hoặc người dùng yêu cầu giải thích kỹ.");
    bits.push("Không tự chào lại, không tự giới thiệu dài, không tự liệt kê khả năng hay trạng thái nếu người dùng không hỏi.");
    if (s.toneBase && s.toneBase !== DEFAULTS.toneBase) bits.push(`Phong cách trả lời ưu tiên: ${toneMap[s.toneBase] || toneMap.thang_than}.`);
    if (s.warmth && s.warmth !== DEFAULTS.warmth) bits.push(`Mức độ ấm áp: ${s.warmth}.`);
    if (s.enthusiasm && s.enthusiasm !== DEFAULTS.enthusiasm) bits.push(`Mức độ nhiệt tình: ${s.enthusiasm}.`);
    if (s.headings && s.headings !== DEFAULTS.headings) bits.push(`Tiêu đề và danh sách: ${s.headings}.`);
    if (s.emoji && s.emoji !== DEFAULTS.emoji) bits.push(`Biểu tượng cảm xúc: ${s.emoji}.`);
    if (s.alias) bits.push(`Hãy xưng hô/nhắc tới người dùng bằng biệt danh: ${s.alias}.`);
    if (s.profession) bits.push(`Nghề nghiệp/bối cảnh người dùng: ${s.profession}.`);
    if (s.about) bits.push(`Thông tin về người dùng: ${s.about}.`);
    if (s.customGuidance) bits.push(`Hướng dẫn tùy chỉnh bổ sung: ${s.customGuidance}`);
    bits.push("Ưu tiên cuối cùng: câu dễ trả lời ngắn, câu khó mới mở rộng; chỉ dùng tiêu đề hoặc danh sách khi thật sự cần.");
    bits.push("Chỉ áp dụng các điều chỉnh này cho chatbot thông thường. Không thay đổi logic xử lý các tính năng khác.");
    return bits.join("\n");
  }

  function buildMemoryInstruction(s) {
    if (!s.memoryEnabled) return "";
    const memories = loadMemory().map((m) => m.text).filter(Boolean).slice(0, 20);
    const profileDerived = [];
    if (s.alias) profileDerived.push(`Biệt danh người dùng: ${s.alias}`);
    if (s.profession) profileDerived.push(`Nghề nghiệp: ${s.profession}`);
    if (s.about) profileDerived.push(`Thông tin thêm: ${s.about}`);
    const all = [...profileDerived, ...memories].filter(Boolean);
    if (!all.length) return "";
    return "Bộ nhớ người dùng (chỉ tham khảo, không bịa thêm):\n- " + all.map((x) => String(x).replace(/\n+/g, " ")).join("\n- ");
  }

  window.getEvaChatbotSystemPrompt = () => {
    const s = getSettingsSnapshot();
    const base = (typeof window.SYSTEM_PROMPT === "string" ? window.SYSTEM_PROMPT : "Bạn là EVA.");
    const profile = buildProfileInstruction(s);
    const memory = buildMemoryInstruction(s);
    return [base, "\n--- CHATBOT PROFILE SETTINGS ---", profile, memory].filter(Boolean).join("\n");
  };

  window.openEvaAuthOverlay = openAuthOverlay;
  window.getEvaAuthSession = () => getAuthSession();
  window.getEvaAuthRole = () => (getAuthSession()?.role || "guest");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      injectStyles();
      injectSettingsPageIfMissing();
      updateHeaderAuthBadges();
    });
  } else {
    injectStyles();
    injectSettingsPageIfMissing();
    updateHeaderAuthBadges();
  }
})();
