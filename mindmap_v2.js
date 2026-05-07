(function () {
  const KEY = 'eva_mindmaps';
  const TEXT_EXTS = new Set(['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'html', 'htm', 'rtf', 'log']);
  const S = {
    tab: 'mine',
    id: null,
    map: null,
    selected: null,
    q: '',
    scale: 1,
    panX: 0,
    panY: 0,
    moved: false,
    els: null,
    drag: null,
    lastId: null
  };

  const E = (t) => {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(String(t ?? ''));
    const d = document.createElement('div'); d.textContent = String(t ?? ''); return d.innerHTML;
  };

  function repairMojibakeText(input) {
    let s = String(input || '');
    if (!s) return s;
    s = s
      .replace(/â€¢/g, '•')
      .replace(/â€“/g, '–')
      .replace(/â€”/g, '—')
      .replace(/â€¦/g, '…')
      .replace(/â€˜|â€™/g, "'")
      .replace(/â€œ|â€�/g, '"');
    if (/[ÃÂÄÅÆÐ]/.test(s)) {
      try {
        const fixed = decodeURIComponent(escape(s));
        if (fixed && fixed.length >= s.length * 0.8) s = fixed;
      } catch { }
    }
    return s;
  }

  function normalizeReadableText(input, maxLen = 260) {
    let s = repairMojibakeText(input);
    s = s
      .replace(/\u0000/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (maxLen > 0 && s.length > maxLen) s = s.slice(0, maxLen).trim();
    return s;
  }

  function isFormulaLikeLine(line) {
    const s = String(line || '').trim();
    if (!s || s.length < 8) return false;
    const formulaSymbols = (s.match(/[=+\-*/→⇌()[\]{}°]/g) || []).length;
    const digits = (s.match(/\d/g) || []).length;
    const letters = (s.match(/[A-Za-zÀ-ỹ]/g) || []).length;
    if (formulaSymbols >= 2 && digits >= 2 && letters >= 4) return true;
    if (/^[A-Za-z0-9()[\]+\-*=→⇌°\s]+$/.test(s) && formulaSymbols >= 3) return true;
    return false;
  }

  function css() {
    if (document.getElementById('mm-v2-style')) return;
    const s = document.createElement('style');
    s.id = 'mm-v2-style';
    s.textContent = `
.mm-tree-area.mm-v2{position:relative;display:block;overflow:hidden;padding:72px 12px 14px;background:radial-gradient(900px 500px at 20% 8%,rgba(99,102,241,.08),transparent 60%),linear-gradient(180deg,#efe8df,#ddd4c8)}
.mm-v2-wrap{position:relative;height:100%;min-height:420px;border-radius:14px;background:rgba(255,255,255,.52);border:1px solid rgba(0,0,0,.08);box-shadow:0 10px 24px rgba(0,0,0,.08)}
.mm-v2-bar{position:absolute;top:10px;left:10px;right:10px;z-index:5;display:flex;justify-content:space-between;gap:8px;align-items:center;padding:10px;border-radius:10px;background:rgba(255,255,255,.9);border:1px solid rgba(0,0,0,.08)}
.mm-v2-meta{min-width:0}.mm-v2-title{font:700 .92rem Inter,sans-serif;color:#25213a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px}.mm-v2-sub{font:.72rem Inter,sans-serif;color:#6b7280}
.mm-v2-tools{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;align-items:center}
.mm-v2-input{height:32px;width:150px;border-radius:9px;border:1px solid rgba(0,0,0,.15);padding:0 10px;font:.78rem Inter,sans-serif;outline:none}
.mm-v2-input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.12)}
.mm-v2-btn{height:32px;min-width:32px;border-radius:9px;border:1px solid rgba(99,102,241,.16);background:#fff;color:#35324d;font:600 .74rem Inter,sans-serif;padding:0 9px;cursor:pointer}
.mm-v2-main{position:absolute;inset:58px 0 0 0;display:grid;grid-template-columns:minmax(0,1fr) 300px}
.mm-v2-vp{position:relative;overflow:hidden;cursor:grab;border-right:1px solid rgba(0,0,0,.08);background:radial-gradient(circle at 14px 14px,rgba(0,0,0,.05) 1px,transparent 1px) 0 0/18px 18px}
.mm-v2-vp.drag{cursor:grabbing}
.mm-v2-pan{position:absolute;top:0;left:0}.mm-v2-zoom{transform-origin:0 0}.mm-v2-canvas{padding:24px 28px;min-width:900px;min-height:520px}
.mm-v2-root{display:grid;grid-template-columns:minmax(250px,auto) minmax(240px,auto) minmax(250px,auto);gap:28px;align-items:start;width:max-content}
.mm-v2-col{display:flex;flex-direction:column;gap:10px;min-width:260px}.mm-v2-col.l{align-items:flex-end}.mm-v2-col.c{align-items:center;gap:8px;padding-top:8px}.mm-v2-col.r{align-items:flex-start}
.mm-v2-rsum{max-width:270px;text-align:center;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.74);border:1px solid rgba(255,255,255,.75);font:.74rem Inter,sans-serif;color:#5b556f;line-height:1.35}
.mm-v2-branch{display:flex;flex-direction:column;gap:7px;max-width:460px}.mm-v2-row{display:flex;align-items:center;gap:7px}.mm-v2-row.l{justify-content:flex-end}.mm-v2-row.r{justify-content:flex-start}
.mm-v2-stem{width:22px;height:2px;flex-shrink:0;background:linear-gradient(90deg,rgba(99,102,241,.25),rgba(16,185,129,.25));border-radius:8px}
.mm-v2-children{display:flex;flex-direction:column;gap:7px}.mm-v2-branch.r>.mm-v2-children{margin-left:11px;padding-left:11px;border-left:1px dashed rgba(99,102,241,.22)}.mm-v2-branch.l>.mm-v2-children{margin-right:11px;padding-right:11px;border-right:1px dashed rgba(99,102,241,.22)}
.mm-v2-children.off{display:none}
.mm-v2-toggle{width:23px;height:23px;border-radius:7px;border:1px solid rgba(99,102,241,.18);background:#fff;color:#504a7a;font-weight:700;cursor:pointer;line-height:1}
.mm-v2-node{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:130px;max-width:350px;padding:9px 11px;border-radius:11px;border:1px solid rgba(0,0,0,.08);background:linear-gradient(180deg,rgba(255,255,255,.97),rgba(247,245,255,.95));box-shadow:0 4px 12px rgba(0,0,0,.05);color:#2f2a40;text-align:left;cursor:pointer}
.mm-v2-node:hover{border-color:rgba(99,102,241,.28)}.mm-v2-node.sel{box-shadow:0 0 0 3px rgba(99,102,241,.12),0 6px 14px rgba(0,0,0,.06);border-color:rgba(99,102,241,.55)}.mm-v2-node.hit{border-color:rgba(245,158,11,.7);box-shadow:0 0 0 3px rgba(245,158,11,.14)}
.mm-v2-node.root{min-width:220px;max-width:300px;align-items:center;text-align:center;padding:13px 14px;border-radius:15px;background:linear-gradient(180deg,#1f1d2f,#2d2a42);color:#fff;border-color:rgba(255,255,255,.12);box-shadow:0 12px 22px rgba(31,29,47,.22)}
.mm-v2-nt{font:700 .82rem Inter,sans-serif;line-height:1.25;word-break:break-word}.mm-v2-node.root .mm-v2-nt{font-size:.94rem}.mm-v2-nm{font:.67rem Inter,sans-serif;color:#6b7280}.mm-v2-node.root .mm-v2-nm{color:rgba(255,255,255,.78)}
.mm-v2-side{overflow:auto;padding:11px;background:rgba(248,246,241,.9)}
.mm-v2-card{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:11px;padding:10px;margin-bottom:9px;box-shadow:0 4px 12px rgba(0,0,0,.04)}
.mm-v2-lbl{font:.68rem Inter,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;margin-bottom:6px}
.mm-v2-h{font:700 .9rem Inter,sans-serif;color:#202030;line-height:1.25}.mm-v2-p{font:.76rem Inter,sans-serif;color:#4b5563;line-height:1.42;margin-top:7px}.mm-v2-path{font:.69rem Inter,sans-serif;color:#7a7a8c;line-height:1.35;margin-top:6px;word-break:break-word}
.mm-v2-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.mm-v2-tag{display:inline-flex;align-items:center;height:21px;border-radius:999px;padding:0 8px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.12);color:#4944a5;font:600 .66rem Inter,sans-serif}
.mm-v2-tag-btn{display:inline-flex;align-items:center;height:23px;border-radius:999px;padding:0 9px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.18);color:#3f3a9e;font:600 .67rem Inter,sans-serif;cursor:pointer}
.mm-v2-tag-btn:hover{background:rgba(99,102,241,.15)}
.mm-v2-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.mm-v2-linkbtn{height:27px;border-radius:9px;border:1px solid rgba(59,130,246,.22);background:#fff;color:#1d4ed8;font:600 .68rem Inter,sans-serif;padding:0 9px;cursor:pointer}
.mm-v2-linkbtn:hover{background:rgba(59,130,246,.08)}
.mm-v2-kv{display:flex;justify-content:space-between;gap:8px;border-top:1px dashed rgba(0,0,0,.08);padding-top:6px;margin-top:6px;font:.73rem Inter,sans-serif;color:#4b5563}.mm-v2-kv:first-child{margin-top:0;padding-top:0;border-top:0}.mm-v2-kv b{max-width:58%;text-align:right;color:#1f2937}
.mm-v2-modal-ov{position:fixed;inset:0;background:rgba(12,12,18,.55);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}
.mm-v2-modal{width:min(760px,96vw);max-height:88vh;overflow:auto;background:linear-gradient(180deg,#fff,#f7f5ff);border-radius:16px;border:1px solid rgba(99,102,241,.14);box-shadow:0 24px 60px rgba(0,0,0,.22);padding:14px}
.mm-v2-mhead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
.mm-v2-mtitle{font:700 1rem Inter,sans-serif;color:#232038}.mm-v2-mclose{width:34px;height:34px;border-radius:10px;border:1px solid rgba(0,0,0,.08);background:#fff;cursor:pointer}
.mm-v2-mgrid{display:grid;grid-template-columns:1.1fr .9fr;gap:12px}
.mm-v2-box{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:10px}
.mm-v2-box h4{margin:0 0 8px;font:700 .82rem Inter,sans-serif;color:#282442}
.mm-v2-box p{margin:0 0 8px;font:.73rem Inter,sans-serif;color:#6b7280;line-height:1.35}
.mm-v2-field{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.mm-v2-field label{font:600 .72rem Inter,sans-serif;color:#4b5563}
.mm-v2-field input[type="text"]{height:36px;border-radius:10px;border:1px solid rgba(0,0,0,.14);padding:0 10px;font:.78rem Inter,sans-serif}
.mm-v2-file-btn{height:34px;border-radius:10px;border:1px solid rgba(99,102,241,.18);background:#fff;color:#3b3760;font:600 .75rem Inter,sans-serif;padding:0 10px;cursor:pointer}
.mm-v2-file-name{font:.72rem Inter,sans-serif;color:#4b5563;line-height:1.35;word-break:break-word}
.mm-v2-doclist{display:flex;flex-direction:column;gap:7px;max-height:300px;overflow:auto;padding-right:2px}
.mm-v2-docitem{display:flex;align-items:flex-start;gap:8px;padding:8px;border:1px solid rgba(0,0,0,.06);border-radius:10px;background:#fcfcff}
.mm-v2-docitem input{margin-top:2px}
.mm-v2-docmeta{min-width:0}.mm-v2-docname{font:600 .75rem Inter,sans-serif;color:#242136;word-break:break-word}.mm-v2-doctype{font:.68rem Inter,sans-serif;color:#7b7b8c}
.mm-v2-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
.mm-v2-secondary,.mm-v2-primary{height:36px;border-radius:10px;padding:0 12px;font:600 .78rem Inter,sans-serif;cursor:pointer}
.mm-v2-secondary{background:#fff;border:1px solid rgba(0,0,0,.1);color:#444}
.mm-v2-primary{background:linear-gradient(90deg,#4f46e5,#6366f1);border:0;color:#fff}
.mm-v2-hint{margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.1);font:.72rem Inter,sans-serif;color:#4b5563;line-height:1.35}
@media (max-width:1100px){.mm-v2-main{grid-template-columns:minmax(0,1fr)}.mm-v2-side{display:none}.mm-v2-title{max-width:200px}.mm-v2-input{width:125px}}
@media (max-width:720px){.mm-tree-area.mm-v2{padding:64px 8px 12px}.mm-v2-bar{padding:8px}.mm-v2-btn{height:29px;min-width:29px;padding:0 7px;font-size:.7rem}.mm-v2-input{height:29px;font-size:.74rem}.mm-v2-mgrid{grid-template-columns:1fr}}
`;
    document.head.appendChild(s);
  }

  function getMaps() { try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } }
  function saveMaps(a) { localStorage.setItem(KEY, JSON.stringify(Array.isArray(a) ? a : [])); }
  function walk(n, fn, d = 0, p = null) { if (!n || typeof n !== 'object') return; fn(n, d, p); (n.children || []).forEach(c => walk(c, fn, d + 1, n)); }
  function countNodes(n) { let c = 0; walk(n, () => c++); return c; }

  function parseLoose(text) {
    if (!text) return null;
    let s = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    try { return JSON.parse(s); } catch { }
    try { return JSON.parse(s.replace(/,\s*([}\]])/g, '$1')); } catch { }
    return null;
  }
  function extractJson(text) {
    if (!text) return '';
    const st = text.indexOf('{'); if (st < 0) return '';
    let d = 0, q = false, e = false;
    for (let i = st; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (e) e = false; else if (ch === '\\') e = true; else if (ch === '"') q = false; continue; }
      if (ch === '"') { q = true; continue; }
      if (ch === '{') d++;
      if (ch === '}') { d--; if (d === 0) return text.slice(st, i + 1); }
    }
    return '';
  }
  function parseMind(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    const t = String(raw).trim(); if (!t) return null;
    const c = [t];
    const m1 = t.match(/\[EVA_DATA_START\]([\s\S]*?)\[EVA_DATA_END\]/); if (m1) c.push(m1[1].trim());
    const m2 = t.match(/```(?:json)?\s*([\s\S]*?)```/i); if (m2) c.push(m2[1].trim());
    const m3 = extractJson(t); if (m3) c.push(m3);
    for (const x of c) { const p = parseLoose(x); if (p && typeof p === 'object') return p; }
    return null;
  }

  function setMindMapProgressUI(label, percent) {
    const toast = document.getElementById('mm-progress-toast');
    if (!toast) return;
    const fill = document.getElementById('mm-toast-fill');
    const pct = document.getElementById('mm-toast-percent');
    const lbl = toast.querySelector('.mm-toast-label');
    if (typeof label === 'string' && lbl) lbl.textContent = label;
    if (typeof percent === 'number') {
      const p = Math.max(0, Math.min(100, percent));
      if (fill) fill.style.width = p + '%';
      if (pct) pct.textContent = Math.floor(p) + '%';
    }
  }

  function getMindMapStats(root) {
    const stats = { nodeCount: 0, maxDepth: 0, leafCount: 0, topBranches: 0, genericHits: 0, duplicateTop: 0 };
    const genericRe = /^(nh[oó]m\s*\d+|quy t[aă]c\s*\d+|vi du co ban|vi du nang cao|tong quan|thanh phan chinh|loi thuong gap|cau hoi on tap)$/i;
    const topNames = [];
    walk(root, (n, d) => {
      stats.nodeCount++;
      if (d > stats.maxDepth) stats.maxDepth = d;
      if (!(n.children || []).length) stats.leafCount++;
      if (genericRe.test(String(n.name || '').trim())) stats.genericHits++;
      if (d === 1) topNames.push(String(n.name || '').trim().toLowerCase());
    });
    stats.topBranches = topNames.length;
    const seen = new Set();
    topNames.forEach(name => {
      if (!name) return;
      if (seen.has(name)) stats.duplicateTop++;
      else seen.add(name);
    });
    return stats;
  }

  function isMindMapFallbackLike(map) {
    const summary = String(map?.summary || '').toLowerCase();
    if (summary.includes('fallback map')) return true;
    const names = [];
    walk(map, n => names.push(String(n.name || '').toLowerCase()), 0, null);
    const markers = ['tong quan', 'thanh phan chinh', 'nguyen ly / quan he', 'cong thuc / quy tac', 'vi du / ung dung', 'loi thuong gap / on tap'];
    let hit = 0;
    markers.forEach(m => { if (names.includes(m)) hit++; });
    return hit >= 4;
  }

  function assessMindMapQualityV2(map, context = {}) {
    const reasons = [];
    if (!map || !Array.isArray(map.children)) {
      return { status: 'fatal', reasons: ['AI khong tra ve JSON mindmap hop le.'], stats: null };
    }
    if (!map.children.length) {
      return { status: 'fatal', reasons: ['So do khong co nhanh cap 1.'], stats: getMindMapStats(map) };
    }
    if (isMindMapFallbackLike(map)) {
      return { status: 'fatal', reasons: ['AI tra ve noi dung giong fallback mau (chat luong thap).'], stats: getMindMapStats(map) };
    }
    const st = getMindMapStats(map);
    if (st.nodeCount < 2) return { status: 'fatal', reasons: ['So do qua rong/rong JSON khong hop le.'], stats: st };

    if (st.topBranches < 2) reasons.push('So do qua it nhanh chinh.');
    if (st.nodeCount < 6) reasons.push('So do qua it node.');
    if (st.duplicateTop > 0) reasons.push('Nhieu nhanh chinh bi trung lap.');
    if (context.strictDoc && st.genericHits >= Math.max(6, Math.floor(st.nodeCount * 0.55))) {
      reasons.push('Nhieu node chung chung (co dau hieu AI khong bam tai lieu).');
    }

    if (reasons.length) return { status: 'low', reasons, stats: st };
    if (st.topBranches >= 4 && st.nodeCount >= 12 && st.maxDepth >= 2) {
      return { status: 'good', reasons: [], stats: st };
    }
    return { status: 'acceptable', reasons: [], stats: st };
  }

  function getSourceTypeFromDoc(doc) {
    if (!doc) return 'unknown';
    const ext = inferExt(doc) || 'unknown';
    if (ext === 'markdown') return 'md';
    return ext;
  }

  function ensureMindMapRecordMetadata(rec) {
    if (!rec || typeof rec !== 'object') return rec;
    if (!rec.quality || typeof rec.quality !== 'object') {
      const stats = rec?.data?.meta || (rec.data ? getMindMapStats(rec.data) : null);
      rec.quality = {
        level: 'acceptable',
        reasons: [],
        stats: stats || { nodeCount: 0, topBranches: 0, maxDepth: 0, genericHits: 0, duplicateTop: 0, leafCount: 0 }
      };
    }
    if (!rec.generation || typeof rec.generation !== 'object') {
      rec.generation = {
        mode: 'unknown',
        sourceType: 'unknown',
        retryCount: 0,
        repairedJson: false
      };
    }
    return rec;
  }

  function saveMindMapRecordAndOpen(rec) {
    const maps = getMaps();
    maps.unshift(rec);
    saveMaps(maps);
    renderMindMapGallery();
    openMindMapViewer(rec.id);
  }

  function normalize(raw, opt = {}) {
    const sourceDoc = opt.sourceDoc || null;
    const topic = String(opt.topicFallback || sourceDoc?.name || 'Mind Map').trim() || 'Mind Map';
    let p = raw;
    if (Array.isArray(p)) p = { type: 'mindmap_tree', name: topic, children: p };
    if (p && typeof p === 'object') {
      if (p.root && typeof p.root === 'object') p = p.root;
      else if (p.data && typeof p.data === 'object' && p.data.children) p = p.data;
    }
    if (!p || typeof p !== 'object') p = { type: 'mindmap_tree', name: topic, children: [] };
    const ctx = { i: 0, n: 0, maxN: 220, maxD: 6, maxC: 12 };
    const F = (...v) => { for (const x of v) if (typeof x === 'string' && x.trim()) return normalizeReadableText(x, 500); return ''; };
    const K = (v) => {
      const a = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,;|]/g) : [];
      const s = new Set(), o = []; a.forEach(x => { x = String(x || '').trim(); if (!x) return; const k = x.toLowerCase(); if (s.has(k)) return; s.add(k); o.push(x.slice(0, 40)); });
      return o.slice(0, 8);
    };
    const R = (v) => {
      const a = Array.isArray(v) ? v : (v ? [v] : []), s = new Set(), o = [];
      a.forEach(x => { let id = ''; if (typeof x === 'string') id = x.trim(); else if (x && typeof x === 'object') id = F(x.id, x.title, x.label); if (!id) return; const k = id.toLowerCase(); if (s.has(k)) return; s.add(k); o.push(id.slice(0, 32)); });
      return o;
    };
    const C = (n) => Array.isArray(n?.children) ? n.children : Array.isArray(n?.nodes) ? n.nodes : Array.isArray(n?.items) ? n.items : Array.isArray(n?.branches) ? n.branches : [];
    const N = (n, d, fb) => {
      if (ctx.n >= ctx.maxN || d > ctx.maxD) return null;
      n = (n && typeof n === 'object') ? n : { name: String(n || '') };
      const name = normalizeReadableText((F(n.name, n.title, n.label, n.topic, n.text, fb) || `Node ${ctx.i + 1}`), 80);
      if (!name) return null;
      ctx.i++; ctx.n++;
      const seen = new Set(), children = [];
      C(n).slice(0, ctx.maxC).forEach((c, idx) => {
        const x = N(c, d + 1, `Node ${idx + 1}`); if (!x) return;
        const k = x.name.toLowerCase(); if (seen.has(k)) return; seen.add(k); children.push(x);
      });
      return {
        id: `mmn-${ctx.i}`, name,
        summary: normalizeReadableText(F(n.summary, n.description, n.desc, n.note), 260),
        keywords: K(n.keywords || n.tags),
        source_refs: R(n.source_refs || n.references || n.citations),
        collapsed: children.length ? (d >= 2 || (d === 1 && children.length >= 6)) : false,
        children
      };
    };
    const root = N({ name: F(p.name, p.title, topic), summary: F(p.summary, p.overview, p.description), keywords: p.keywords || p.tags, source_refs: p.source_refs || p.references, children: C(p) }, 0, topic) || { id: 'mmn-1', name: topic, summary: '', keywords: [], source_refs: [], collapsed: false, children: [] };
    root.collapsed = false;
    const srcRefs = Array.isArray(p.source_refs || p.references) ? (p.source_refs || p.references) : [];
    const source_refs = [];
    const seenSrc = new Set();
    srcRefs.forEach((x, idx) => {
      if (!x || typeof x !== 'object') return;
      const id = F(x.id, `S${idx + 1}`);
      if (!id || seenSrc.has(id.toLowerCase())) return;
      seenSrc.add(id.toLowerCase());
      source_refs.push({
        id: normalizeReadableText(id, 32),
        title: normalizeReadableText(F(x.title, x.label, x.name, id), 120),
        note: normalizeReadableText(F(x.note, x.summary, x.desc), 220)
      });
    });
    const sourceMime = String(sourceDoc?.type || '').toLowerCase();
    const sourceExt = inferExt(sourceDoc);
    const sourceIsStrictSupported = !!sourceDoc && (
      sourceMime === 'application/pdf' ||
      sourceMime.includes('wordprocessingml.document') ||
      sourceMime.startsWith('text/') ||
      sourceExt === 'docx' ||
      sourceExt === 'txt' ||
      sourceExt === 'md' ||
      TEXT_EXTS.has(sourceExt)
    );
    const groundedFlag = sourceDoc
      ? !!sourceIsStrictSupported
      : !!p.source_meta?.grounded;
    const out = {
      type: 'mindmap_tree', version: 2, id: root.id, name: root.name, summary: root.summary, keywords: root.keywords,
      source_meta: {
        grounded: groundedFlag,
        label: p.source_meta?.label || sourceDoc?.name || 'Topic-only',
        confidence_note: p.source_meta?.confidence_note || (sourceDoc ? 'Source file selected by user' : 'Generated from topic')
      },
      source_refs,
      children: root.children
    };
    if (sourceDoc && !out.source_refs.length) out.source_refs.push({ id: 'S1', title: sourceDoc.name, note: sourceDoc.type || 'vault-doc' });
    const meta = { nodeCount: 0, maxDepth: 0 }; walk(out, (_, d) => { meta.nodeCount++; if (d > meta.maxDepth) meta.maxDepth = d; }); out.meta = meta;
    return out;
  }

  function fallback(topic, doc) {
    return normalize({
      type: 'mindmap_tree', version: 2, name: topic || doc?.name || 'So do tu duy',
      summary: 'Fallback map duoc tao vi AI tra ve sai dinh dang.',
      source_meta: { grounded: false, label: doc?.name || 'Topic-only', confidence_note: 'Fallback' },
      children: [
        { name: 'Tong quan', children: [{ name: 'Khai niem' }, { name: 'Vai tro' }, { name: 'Pham vi' }] },
        { name: 'Thanh phan chinh', children: [{ name: 'Nhom 1' }, { name: 'Nhom 2' }, { name: 'Nhom 3' }] },
        { name: 'Nguyen ly / quan he', children: [{ name: 'Dieu kien' }, { name: 'He qua' }, { name: 'Lien he' }] },
        { name: 'Cong thuc / quy tac', children: [{ name: 'Quy tac 1' }, { name: 'Quy tac 2' }] },
        { name: 'Vi du / ung dung', children: [{ name: 'Vi du co ban' }, { name: 'Vi du nang cao' }] },
        { name: 'Loi thuong gap / on tap', children: [{ name: 'Sai lam' }, { name: 'Meo nho' }, { name: 'Cau hoi on tap' }] }
      ]
    }, { topicFallback: topic || doc?.name || 'So do tu duy', sourceDoc: doc || null });
  }

  function buildGroundedHeuristicMap(topic, doc, extractedText) {
    const text = String(extractedText || '').replace(/\r/g, '\n');
    const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
    const headingRe = /^((chuong|phan|bai|muc|section|chapter)\s+[\w.:-]+|[ivxlcdm]+\.\s+.+|\d+(\.\d+){0,3}\s+.+)$/i;
    const longLineRe = /^.{8,120}$/;

    const headingCandidates = [];
    for (const ln of lines) {
      if ((headingRe.test(ln) || (/^[A-Z0-9][^.!?]{6,90}$/.test(ln) && !ln.includes(':'))) && !isFormulaLikeLine(ln)) {
        headingCandidates.push(ln);
      }
      if (headingCandidates.length >= 14) break;
    }

    const unique = [];
    const seen = new Set();
    for (const h of headingCandidates) {
      const clean = h.replace(/\s+/g, ' ').slice(0, 70).trim();
      const k = clean.toLowerCase();
      if (!clean || seen.has(k)) continue;
      seen.add(k);
      unique.push(clean);
      if (unique.length >= 7) break;
    }

    const chunks = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    const topicName = String(topic || doc?.name || 'So do tu duy').trim() || 'So do tu duy';

    const makeSummary = (s, max = 150) => {
      const t = normalizeReadableText(String(s || '').replace(/\s+/g, ' ').trim(), max + 8);
      return t.length > max ? t.slice(0, max - 1).trim() + '…' : t;
    };

    const children = [];
    if (unique.length >= 2) {
      unique.forEach((h, idx) => {
        const para = chunks[idx] || '';
        const sub = [];
        const bullets = para
          .split(/(?<=[.!?])\s+/)
          .map(s => s.trim())
          .filter(s => longLineRe.test(s))
          .slice(0, 3);
        bullets.forEach((b, i) => sub.push({ name: makeSummary(b, 52), summary: '', keywords: [], source_refs: ['S1'], children: [] }));
        if (!sub.length) sub.push({ name: 'Y chinh', summary: makeSummary(para, 90), keywords: [], source_refs: ['S1'], children: [] });
        children.push({ name: h, summary: makeSummary(para, 120), keywords: [], source_refs: ['S1'], children: sub });
      });
    } else {
      const take = chunks.slice(0, 5);
      take.forEach((c, idx) => {
        const first = c.split('\n').map(s => s.trim()).find(Boolean) || `Muc ${idx + 1}`;
        const title = makeSummary(first.replace(/^[-*•]\s*/, ''), 64) || `Muc ${idx + 1}`;
        const sent = c.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean).slice(0, 3);
        const sub = sent.map((s, i) => ({ name: makeSummary(s, 56) || `Y ${i + 1}`, summary: '', keywords: [], source_refs: ['S1'], children: [] }));
        if (!sub.length) sub.push({ name: 'Noi dung tom tat', summary: '', keywords: [], source_refs: ['S1'], children: [] });
        children.push({ name: title, summary: makeSummary(c, 130), keywords: [], source_refs: ['S1'], children: sub });
      });
    }

    if (!children.length) {
      children.push({
        name: 'Noi dung chinh',
        summary: makeSummary(text, 130),
        keywords: [],
        source_refs: ['S1'],
        children: [{ name: 'Tom tat ngan', summary: '', keywords: [], source_refs: ['S1'], children: [] }]
      });
    }

    return normalize({
      type: 'mindmap_tree',
      version: 2,
      name: topicName,
      summary: makeSummary(text, 180),
      source_meta: {
        grounded: true,
        label: doc?.name || 'strict-doc',
        confidence_note: 'Heuristic map from extracted source text'
      },
      source_refs: [{ id: 'S1', title: doc?.name || topicName, note: 'Extracted source text (strict)' }],
      children
    }, { topicFallback: topicName, sourceDoc: doc || null });
  }

  let __pdfjsReadyPromise = null;
  let __mammothReadyPromise = null;
  async function ensurePdfJs() {
    if (window.pdfjsLib) return window.pdfjsLib;
    if (__pdfjsReadyPromise) return __pdfjsReadyPromise;
    __pdfjsReadyPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.async = true;
      s.onload = () => {
        if (!window.pdfjsLib) return reject(new Error('Khong tai duoc pdf.js'));
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      s.onerror = () => reject(new Error('Loi tai pdf.js'));
      document.head.appendChild(s);
    });
    return __pdfjsReadyPromise;
  }

  async function ensureMammoth() {
    if (window.mammoth) return window.mammoth;
    if (__mammothReadyPromise) return __mammothReadyPromise;
    __mammothReadyPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';
      s.async = true;
      s.onload = () => window.mammoth ? resolve(window.mammoth) : reject(new Error('Khong tai duoc mammoth.js'));
      s.onerror = () => reject(new Error('Loi tai mammoth.js'));
      document.head.appendChild(s);
    });
    return __mammothReadyPromise;
  }

  function inferExt(doc) {
    const n = String(doc?.name || '').toLowerCase();
    const m = n.match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
  }
  function dataUrlToBytes(dataUrl) {
    if (typeof dataUrl !== 'string' || !dataUrl.includes(',')) throw new Error('Du lieu file khong hop le');
    const b64 = dataUrl.split(',')[1] || '';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function bytesToArrayBuffer(bytes) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  function cleanExtractedText(text) {
    const cleaned = String(text || '')
      .replace(/\u0000/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
    return normalizeReadableText(cleaned, 120000);
  }

  function isLikelyReadableText(text) {
    const t = String(text || '').trim();
    if (!t || t.length < 80) return false;
    const letters = (t.match(/[A-Za-zÀ-ỹ]/g) || []).length;
    const controls = (t.match(/[\u0000-\u001F]/g) || []).length;
    return letters >= 30 && controls < Math.max(5, Math.floor(t.length * 0.01));
  }

  function compactSourceTextForMindMap(text, format = 'text') {
    const raw = cleanExtractedText(text);
    if (!raw) return '';
    if (raw.length <= 24000) return raw;

    const blocks = raw.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    const picked = [];
    let total = 0;
    const cap = format === 'pdf' ? 26000 : 22000;

    // Ưu tiên block giống tiêu đề / mục / chương
    for (const b of blocks) {
      const headLike = /^(trang\s*\d+|ch[uư]ơng|ph[aà]n|b[aà]i|m[uụ]c|i+\.|[0-9]+(\.[0-9]+)*[)\.]?)/i.test(b);
      if (!headLike) continue;
      const chunk = b.slice(0, 420);
      picked.push(chunk);
      total += chunk.length + 2;
      if (total >= cap * 0.45) break;
    }
    for (let i = 0; i < blocks.length && total < cap; i++) {
      const chunk = blocks[i].slice(0, 650);
      picked.push(chunk);
      total += chunk.length + 2;
    }
    const merged = cleanExtractedText(picked.join('\n\n'));
    return merged.slice(0, cap);
  }

  // Xử lý file client-side: trích xuất text từ TXT/MD để gửi cho AI (strict grounded mode)
  async function extractTextFromTextLikeDoc(doc) {
    const bytes = dataUrlToBytes(doc.data);
    const encodings = ['utf-8', 'windows-1258', 'windows-1252'];
    let best = '';
    for (const enc of encodings) {
      try {
        const txt = new TextDecoder(enc, { fatal: false }).decode(bytes);
        if (txt && txt.length > best.length) best = txt;
      } catch { }
    }
    const cleaned = cleanExtractedText(best);
    if (!cleaned) throw new Error('Khong doc duoc noi dung text tu file');
    return cleaned.slice(0, 70000);
  }

  // Xử lý file PDF client-side bằng pdf.js theo yêu cầu "zero external knowledge"
  async function extractTextFromPdfDoc(doc) {
    const bytes = dataUrlToBytes(doc.data);
    try {
      const pdfjsLib = await ensurePdfJs();
      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      const maxPages = Math.min(pdf.numPages || 0, 20);
      const parts = [];
      for (let p = 1; p <= maxPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const pageText = (content.items || []).map(it => (it && it.str) ? it.str : '').join(' ');
        if (pageText.trim()) parts.push(`[Trang ${p}] ${pageText}`);
      }
      const cleaned = cleanExtractedText(parts.join('\n\n'));
      if (!cleaned) throw new Error('Khong trich xuat duoc text tu PDF');
      return cleaned.slice(0, 70000);
    } catch (err) {
      // Fallback cho PDF loi cau truc (invalid PDF structure): thu decode nhu text thuan.
      let fallbackText = '';
      try {
        const decoded = await extractTextFromTextLikeDoc(doc);
        if (isLikelyReadableText(decoded)) fallbackText = decoded;
      } catch { }
      if (fallbackText) return fallbackText.slice(0, 70000);
      const msg = String(err?.message || err || '');
      if (/invalid pdf structure/i.test(msg)) throw new Error('Invalid PDF structure. Thu luu lai PDF (Print to PDF) hoac doi sang DOCX/TXT.');
      throw err;
    }
  }

  async function extractTextFromDocxDoc(doc) {
    const mammoth = await ensureMammoth();
    const bytes = dataUrlToBytes(doc.data);
    const result = await mammoth.extractRawText({ arrayBuffer: bytesToArrayBuffer(bytes) });
    const cleaned = cleanExtractedText(result?.value || '');
    if (!cleaned) throw new Error('Khong trich xuat duoc text tu DOCX');
    return cleaned.slice(0, 70000);
  }

  async function extractStrictSourceText(doc) {
    if (!doc || !doc.data) throw new Error('Khong co tai lieu de phan tich');
    const mime = String(doc.type || '').toLowerCase();
    const ext = inferExt(doc);
    if (mime.startsWith('image/')) throw new Error('Khong ho tro anh. Hay dung file van ban (PDF/DOCX/TXT/MD/...)');
    if (mime === 'application/pdf' || ext === 'pdf') {
      const text = await extractTextFromPdfDoc(doc);
      return { text: compactSourceTextForMindMap(text, 'pdf'), format: 'pdf' };
    }
    if (mime.includes('wordprocessingml.document') || ext === 'docx') {
      const text = await extractTextFromDocxDoc(doc);
      return { text: compactSourceTextForMindMap(text, 'docx'), format: 'docx' };
    }
    if (mime.startsWith('text/') || TEXT_EXTS.has(ext)) {
      const text = await extractTextFromTextLikeDoc(doc);
      return { text: compactSourceTextForMindMap(text, ext || 'text'), format: ext || 'text' };
    }
    throw new Error('Che do mindmap strict chi ho tro file van ban: PDF, DOCX, TXT, MD, CSV, JSON, XML, HTML, RTF... (khong ho tro anh/binary).');
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error || new Error('Khong doc duoc file'));
      r.readAsDataURL(file);
    });
  }

  async function fileToDocObject(file) {
    const data = await readFileAsDataUrl(file);
    return {
      id: 'temp-' + Date.now(),
      name: file.name,
      type: file.type || '',
      size: file.size || 0,
      data,
      createdAt: new Date().toISOString()
    };
  }

  function promptText(topic, doc, sourceText) {
    if (sourceText) {
      return `Đóng vai: Bạn là một Chuyên gia Kỹ sư Phần mềm (Senior Full-Stack Developer), chuyên gia UI/UX và Kiến trúc sư AI.

Nhiệm vụ hiện tại: Tạo SƠ ĐỒ TƯ DUY từ tài liệu người dùng. Không viết code. Chỉ trả về JSON sơ đồ tư duy.

🚨 RÀNG BUỘC CỐT LÕI (BẮT BUỘC TUÂN THỦ) 🚨
1) Zero External Knowledge: CHỈ sử dụng DUY NHẤT nội dung trong khối [SOURCE_TEXT].
2) Không bịa đặt (No Hallucination): Nếu tài liệu không có thông tin, tuyệt đối không tự thêm nhánh/nội dung từ kiến thức bên ngoài.
3) Nếu tài liệu ngắn hoặc ít cấu trúc, chỉ tạo nhánh đúng theo những gì tài liệu có.
4) Ngôn ngữ node/summary: tiếng Việt.
5) Trả về STRICT JSON, không markdown, không giải thích thêm.

TOPIC (do người dùng nhập hoặc tên tài liệu): ${JSON.stringify(topic || doc?.name || 'Mind Map')}
TÀI LIỆU NGUỒN: ${JSON.stringify(doc?.name || 'uploaded document')}

ĐỊNH DẠNG JSON BẮT BUỘC:
{"type":"mindmap_tree","version":2,"name":"","summary":"","source_meta":{"grounded":true,"label":"","confidence_note":""},"source_refs":[{"id":"S1","title":"","note":""}],"children":[{"name":"","summary":"","keywords":[""],"source_refs":["S1"],"children":[{"name":"","summary":"","keywords":[""],"source_refs":["S1"],"children":[]}]}]}

QUY TẮC TẠO SƠ ĐỒ:
- Chỉ dùng thông tin xuất hiện trong [SOURCE_TEXT].
- Không thêm ví dụ/công thức/khái niệm nếu tài liệu không nêu.
- Nhãn node ngắn gọn, rõ nghĩa.
- Gộp các ý trùng lặp.
- Khi thiếu dữ liệu, giảm số nhánh thay vì bịa thêm.
- Quy trình bắt buộc (structure-first):
  a) Quét toàn bộ [SOURCE_TEXT] để xác định các phần/chương/bài/mục chính thực sự xuất hiện.
  b) Số nhánh cấp 1 phải bám theo số phần chính thực tế trong tài liệu (không tự thêm cho đủ số).
  c) Từ mỗi nhánh cấp 1, tiếp tục tách các ý con theo cấu trúc mục nhỏ/ý chính trong chính phần đó.
  d) Node lá là phần tóm gọn dễ hiểu, ngắn, đúng nguyên văn ý nghĩa tài liệu.
- Nếu tài liệu là sách/giáo trình có nhiều bài: ưu tiên cấp 1 = các chương/phần lớn; cấp 2 = bài/mục; cấp sâu hơn = ý chính/tóm tắt.
- source_meta.grounded = true.
- source_refs dùng tối thiểu S1 cho toàn bộ node nếu không tách được mục nhỏ.

[SOURCE_TEXT_START]
${sourceText}
[SOURCE_TEXT_END]`;
    }

    return `Bạn là AI tạo sơ đồ tư duy. Hãy tạo mind map tiếng Việt từ CHỦ ĐỀ người dùng cung cấp.
Lưu ý: Không có tài liệu nguồn nên đặt source_meta.grounded=false.
Trả về STRICT JSON duy nhất theo schema:
{"type":"mindmap_tree","version":2,"name":"","summary":"","source_meta":{"grounded":false,"label":"Topic-only","confidence_note":""},"source_refs":[],"children":[{"name":"","summary":"","keywords":[""],"source_refs":[],"children":[{"name":"","summary":"","keywords":[""],"source_refs":[],"children":[]}]}]}
TOPIC: ${JSON.stringify(topic || 'Mind Map')}`;
  }

  function buildJsonRepairPrompt(rawOutput) {
    return `Ban la bo sua JSON. Nhiem vu: chuyen output sau thanh STRICT JSON mindmap_tree hop le theo schema.
Khong duoc them kien thuc moi. Chi duoc:
- loai markdown/text thua
- sua dau phay/dau ngoac
- dua ve dung schema
- giu nguyen noi dung goc toi da co the

Schema:
{"type":"mindmap_tree","version":2,"name":"","summary":"","source_meta":{"grounded":true,"label":"","confidence_note":""},"source_refs":[{"id":"S1","title":"","note":""}],"children":[{"name":"","summary":"","keywords":[""],"source_refs":["S1"],"children":[{"name":"","summary":"","keywords":[""],"source_refs":["S1"],"children":[]}]}]}

Tra ve JSON duy nhat, khong markdown.

[RAW_OUTPUT_START]
${String(rawOutput || '').slice(0, 40000)}
[RAW_OUTPUT_END]`;
  }

  function buildLowQualityRegeneratePrompt(topic, doc, sourceText) {
    return promptText(topic, doc, sourceText) + `

YEU CAU BO SUNG CHO LAN TAO LAI (retry do chat luong thap):
- Neu so do truoc qua it nhanh chinh, hay uu tien tach nhanh theo cac de muc/tieu de/doan y thuc su co trong [SOURCE_TEXT].
- Neu tai lieu ngan, van cho phep so do it nhanh; nhung co gang tach y theo cac cum noi dung/docan.
- Khong duoc them kien thuc ngoai tai lieu.
- Tra ve STRICT JSON duy nhat.`;
  }

  async function callMindMapModel(prompt, localMode) {
    if (localMode) {
      return await window.generateResponse(prompt + ' If strict JSON is hard, wrap JSON in [EVA_DATA_START]...[EVA_DATA_END].');
    }
    try {
      return await window.callGeminiJsonPrompt(prompt);
    } catch (err) {
      // Fallback: some requests fail in strict JSON mode when input is large/complex.
      if (typeof window.generateResponse === 'function') {
        return await window.generateResponse(prompt + '\nTra ve JSON hop le. Neu can, boc trong [EVA_DATA_START]...[EVA_DATA_END].');
      }
      throw err;
    }
  }

  // Xử lý AI parsing: tạo mindmap + retry + self-repair JSON nếu model trả lệch format
  async function requestAIWithRepair(topic, doc) {
    const local = localStorage.getItem('eva_model_mode') === 'local';
    let prompt;
    let extracted = null;
    if (doc) {
      extracted = await extractStrictSourceText(doc);
      prompt = promptText(topic, doc, extracted.text);
    } else {
      prompt = promptText(topic, null, '');
    }

    let raw1 = await callMindMapModel(prompt, local);
    let parsed1 = parseMind(raw1);
    if (parsed1) return { parsed: parsed1, raw: raw1, extracted, attempts: { initial: true, retrySchema: false, repair: false } };

    // Retry 1: explicit corrective prompt without changing source
    const retryPrompt = prompt + '\nCANH BAO: Lan truoc ban tra sai dinh dang. Lan nay CHI duoc tra ve JSON hop le theo schema.';
    let raw2 = await callMindMapModel(retryPrompt, local);
    let parsed2 = parseMind(raw2);
    if (parsed2) return { parsed: parsed2, raw: raw2, extracted, attempts: { initial: true, retrySchema: true, repair: false } };

    // Retry 2: JSON repair from model output
    const rawToRepair = raw2 || raw1;
    const repairPrompt = buildJsonRepairPrompt(rawToRepair);
    let raw3 = await callMindMapModel(repairPrompt, local);
    let parsed3 = parseMind(raw3);
    if (!parsed3 && extracted?.text) {
      const groundedMap = buildGroundedHeuristicMap(topic, doc || null, extracted.text);
      return {
        parsed: groundedMap,
        raw: rawToRepair,
        repairRaw: raw3,
        extracted,
        attempts: { initial: true, retrySchema: true, repair: true, heuristic: true }
      };
    }
    return { parsed: parsed3, raw: rawToRepair, repairRaw: raw3, extracted, attempts: { initial: true, retrySchema: true, repair: true } };
  }

  async function requestAIForLowQualityRetry(topic, doc, extracted) {
    const local = localStorage.getItem('eva_model_mode') === 'local';
    const sourceText = extracted?.text || '';
    const prompt = buildLowQualityRegeneratePrompt(topic, doc || null, sourceText);

    const raw1 = await callMindMapModel(prompt, local);
    const p1 = parseMind(raw1);
    if (p1) return { parsed: p1, raw: raw1, extracted, attempts: { initial: true, retrySchema: false, repair: false } };

    const raw2 = await callMindMapModel(prompt + '\nLAN NAY HAY TAP TRUNG TANG SO NHANH CHINH NEU TAI LIEU CO THE TACH DUOC.', local);
    const p2 = parseMind(raw2);
    if (p2) return { parsed: p2, raw: raw2, extracted, attempts: { initial: true, retrySchema: true, repair: false } };

    const raw3 = await callMindMapModel(buildJsonRepairPrompt(raw2 || raw1), local);
    return { parsed: parseMind(raw3), raw: raw2 || raw1, repairRaw: raw3, extracted, attempts: { initial: true, retrySchema: true, repair: true } };
  }

  // Gọi AI lấy JSON mindmap: ưu tiên chế độ strict chỉ từ text đã trích xuất (không gửi tên file để AI tự suy diễn)
  async function requestAI(topic, doc) {
    const res = await requestAIWithRepair(topic, doc);
    return res.parsed;
  }

  function buildMindMapRecord(topic, doc, data, qualityVerdict, aiRes, generationModeOverride = null) {
    const levelMap = { low: 'low', acceptable: 'acceptable', good: 'good', fatal: 'low' };
    const rec = {
      id: String(Date.now()),
      title: data.name || topic || 'Mind Map',
      createdAt: new Date().toISOString(),
      data,
      quality: {
        level: levelMap[qualityVerdict?.status] || 'acceptable',
        reasons: Array.isArray(qualityVerdict?.reasons) ? qualityVerdict.reasons : [],
        stats: qualityVerdict?.stats || getMindMapStats(data)
      },
      generation: {
        mode: generationModeOverride || (doc ? 'strict-doc' : 'topic-only'),
        sourceType: getSourceTypeFromDoc(doc),
        retryCount: aiRes?.attempts ? ((aiRes.attempts.retrySchema ? 1 : 0) + (aiRes.attempts.repair ? 1 : 0)) : 0,
        repairedJson: !!aiRes?.attempts?.repair
      }
    };
    return rec;
  }

  async function showLowQualityMindMapDialog(payload) {
    const { topic, doc, data, quality, aiRes } = payload;
    return new Promise((resolve) => {
      const old = document.getElementById('mm-v2-low-quality-modal');
      if (old) old.remove();
      const ov = document.createElement('div');
      ov.className = 'mm-v2-modal-ov';
      ov.id = 'mm-v2-low-quality-modal';
      const stats = quality?.stats || {};
      ov.innerHTML = `
        <div class="mm-v2-modal" role="dialog" aria-modal="true" aria-label="So do chat luong thap">
          <div class="mm-v2-mhead">
            <div class="mm-v2-mtitle">So do tao ra it cau truc</div>
            <button type="button" class="mm-v2-mclose" aria-label="Dong">✕</button>
          </div>
          <div class="mm-v2-box">
            <h4>Ly do</h4>
            <p>${(quality?.reasons || []).map(E).join('<br>') || 'Chat luong thap'}</p>
            <div class="mm-v2-kv"><span>Nhanh chinh</span><b>${stats.topBranches ?? 0}</b></div>
            <div class="mm-v2-kv"><span>So node</span><b>${stats.nodeCount ?? 0}</b></div>
            <div class="mm-v2-kv"><span>Do sau</span><b>${stats.maxDepth ?? 0}</b></div>
            <div class="mm-v2-kv"><span>Nguon</span><b>${E(doc?.name || topic || 'Topic-only')}</b></div>
            <div class="mm-v2-kv"><span>Strict mode</span><b>${aiRes?.extracted?.text ? 'OK (da doc duoc noi dung)' : (doc ? 'Khong ro' : 'Topic-only')}</b></div>
          </div>
          <div class="mm-v2-actions">
            <button type="button" class="mm-v2-secondary" id="mm-v2-low-cancel">Huy</button>
            <button type="button" class="mm-v2-secondary" id="mm-v2-low-retry">Tao lai</button>
            <button type="button" class="mm-v2-primary" id="mm-v2-low-use">Dung tam</button>
          </div>
        </div>`;
      const close = (result) => { ov.remove(); resolve(result); };
      ov.addEventListener('click', (e) => { if (e.target === ov) close({ action: 'cancel' }); });
      ov.querySelector('.mm-v2-mclose').onclick = () => close({ action: 'cancel' });
      ov.querySelector('#mm-v2-low-cancel').onclick = () => close({ action: 'cancel' });
      ov.querySelector('#mm-v2-low-use').onclick = () => close({ action: 'use' });
      ov.querySelector('#mm-v2-low-retry').onclick = () => close({ action: 'retry' });
      document.body.appendChild(ov);
    });
  }

  async function startMindMapCreation(topic, doc) {
    const toast = document.getElementById('mm-progress-toast');
    const fill = document.getElementById('mm-toast-fill');
    const pct = document.getElementById('mm-toast-percent');
    if (toast && fill && pct) { toast.classList.add('active'); fill.style.width = '0%'; pct.textContent = '0%'; }
    setMindMapProgressUI('Dang chuan bi tao so do...', 2);
    let v = 0;
    const timer = setInterval(() => {
      if (!fill || !pct) return;
      if (v < 92) { v += Math.random() * 4.2; if (v > 92) v = 92; if (v > 10) setMindMapProgressUI(null, v); }
    }, 160);
    try {
      if (doc) setMindMapProgressUI('Dang doc va trich xuat noi dung tai lieu...', 12);
      else setMindMapProgressUI('Dang phan tich chu de...', 12);

      setMindMapProgressUI('Dang tao cau truc so do tu AI...', 34);
      const aiRes = await requestAIWithRepair(topic, doc || null);

      setMindMapProgressUI('Dang chuan hoa va kiem tra chat luong...', 72);
      const data = aiRes?.parsed ? normalize(aiRes.parsed, { topicFallback: topic, sourceDoc: doc || null }) : null;
      const quality = assessMindMapQualityV2(data, { strictDoc: !!doc });

      if (quality.status === 'fatal') {
        const parseFail = !aiRes?.parsed;
        const baseMsg = parseFail
          ? 'AI tra ve sai dinh dang JSON sau nhieu lan thu.'
          : `Khong the tao so do: ${(quality.reasons || []).join('; ')}`;
        const details = [];
        if (doc) details.push('Nguon: ' + (doc.name || 'tai lieu'));
        if (aiRes?.extracted?.text) details.push('Da doc duoc noi dung tai lieu (strict mode).');
        details.push('Thu lai voi tai lieu ngan hon hoac tach theo chuong/bai.');
        throw new Error(baseMsg + '\n' + details.join('\n'));
      }

      if (quality.status === 'low') {
        clearInterval(timer);
        setMindMapProgressUI('So do it cau truc. Dang cho ban quyet dinh...', 100);
        if (toast) toast.classList.remove('active');
        const choice = await showLowQualityMindMapDialog({ topic, doc, data, quality, aiRes });

        if (choice?.action === 'use') {
          const rec = buildMindMapRecord(topic, doc, data, quality, aiRes);
          saveMindMapRecordAndOpen(rec);
          return;
        }

        if (choice?.action === 'retry') {
          if (toast && fill && pct) toast.classList.add('active');
          setMindMapProgressUI('Dang tao lai so do (retry)...', 30);
          const retryRes = await requestAIForLowQualityRetry(topic, doc || null, aiRes?.extracted || null);
          const retryData = retryRes?.parsed ? normalize(retryRes.parsed, { topicFallback: topic, sourceDoc: doc || null }) : null;
          const retryQuality = assessMindMapQualityV2(retryData, { strictDoc: !!doc });

          if (retryQuality.status === 'fatal') {
            throw new Error('Lan tao lai that bai: ' + ((retryQuality.reasons || []).join('; ') || 'AI JSON invalid'));
          }

          if (retryQuality.status === 'low') {
            if (toast) toast.classList.remove('active');
            const choice2 = await showLowQualityMindMapDialog({ topic, doc, data: retryData, quality: retryQuality, aiRes: retryRes });
            if (choice2?.action === 'use') {
              const rec2 = buildMindMapRecord(topic, doc, retryData, retryQuality, retryRes);
              rec2.generation.retryCount = (rec2.generation.retryCount || 0) + 1;
              saveMindMapRecordAndOpen(rec2);
            }
            return;
          }

          clearInterval(timer);
          setMindMapProgressUI('Dang luu va mo so do...', 100);
          const recRetry = buildMindMapRecord(topic, doc, retryData, retryQuality, retryRes);
          recRetry.generation.retryCount = (recRetry.generation.retryCount || 0) + 1;
          setTimeout(() => { if (toast) toast.classList.remove('active'); saveMindMapRecordAndOpen(recRetry); }, 300);
          return;
        }
        return;
      }

      clearInterval(timer);
      setMindMapProgressUI('Dang luu va mo so do...', 100);
      const rec = buildMindMapRecord(topic, doc, data, quality, aiRes);
      setTimeout(() => { if (toast) toast.classList.remove('active'); saveMindMapRecordAndOpen(rec); }, 420);
    } catch (e) {
      clearInterval(timer); if (toast) toast.classList.remove('active');
      console.error('Mindmap create error:', e);
      alert('Khong tao duoc so do tu duy.\n\n' + (e?.message || e) + '\n\nHe thong da KHONG luu fallback mau de tranh so do rac.');
    }
  }

  async function promptCreateMindMap() {
    let docs = [];
    try { if (typeof window.getAllFromVault === 'function') docs = await window.getAllFromVault(); } catch { }

    const old = document.getElementById('mm-v2-create-modal');
    if (old) old.remove();

    let uploadedFile = null;
    let uploadedDoc = null;
    let mode = docs.length ? 'vault' : 'topic';

    const ov = document.createElement('div');
    ov.className = 'mm-v2-modal-ov';
    ov.id = 'mm-v2-create-modal';
    ov.innerHTML = `
      <div class="mm-v2-modal" role="dialog" aria-modal="true" aria-label="Tao so do tu duy">
        <div class="mm-v2-mhead">
          <div class="mm-v2-mtitle">Tao so do tu duy (interactive)</div>
          <button type="button" class="mm-v2-mclose" aria-label="Dong">✕</button>
        </div>
        <div class="mm-v2-mgrid">
          <div class="mm-v2-box">
            <h4>Nguon du lieu</h4>
            <p>Chon <b>1</b> cach: dung tai lieu trong kho, upload truc tiep, hoac chi nhap chu de.</p>
            <div class="mm-v2-field">
              <label><input type="radio" name="mm-source-mode" value="vault" ${docs.length ? 'checked' : ''} ${docs.length ? '' : 'disabled'}> Chon tu Kho tai lieu</label>
              <label><input type="radio" name="mm-source-mode" value="upload"> Upload truc tiep (file van ban)</label>
              <label><input type="radio" name="mm-source-mode" value="topic" ${docs.length ? '' : 'checked'}> Chi nhap chu de</label>
            </div>
            <div class="mm-v2-field">
              <label>Chu de (co the de trong neu da chon tai lieu)</label>
              <input type="text" id="mm-v2-topic-input" placeholder="VD: Chuong Este - Lipit" />
            </div>
            <div class="mm-v2-field" id="mm-v2-upload-zone">
              <label>Upload file cho mindmap (strict grounded, khong ho tro anh)</label>
              <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <button type="button" class="mm-v2-file-btn" id="mm-v2-pick-file">Chon file</button>
                <input type="file" id="mm-v2-file-input" accept=".pdf,.docx,.txt,.md,.csv,.json,.xml,.html,.htm,.rtf,.log" style="display:none;">
                <span class="mm-v2-file-name" id="mm-v2-file-name">Chua chon file</span>
              </div>
            </div>
            <div class="mm-v2-hint">
              Logic tao so do: quet toan bo noi dung -> xac dinh phan/chuong/bai/muc chinh -> chia nhanh cap 1 theo cau truc that -> tiep tuc tach nhanh con -> tom gon de hieu.
            </div>
          </div>
          <div class="mm-v2-box">
            <h4>Kho tai lieu</h4>
            <p>Chon tai lieu co san. Ho tro file van ban (PDF/DOCX/TXT/MD/CSV/JSON/XML/HTML/RTF...), khong ho tro anh.</p>
            <div class="mm-v2-doclist" id="mm-v2-doclist">
              ${docs.length ? docs.map((d, i) => `
                <label class="mm-v2-docitem">
                  <input type="radio" name="mm-vault-doc" value="${i}" ${i === 0 ? 'checked' : ''}>
                  <div class="mm-v2-docmeta">
                    <div class="mm-v2-docname">${E(d.name || 'Untitled')}</div>
                    <div class="mm-v2-doctype">${E((d.type || 'unknown').replace('application/', ''))}</div>
                  </div>
                </label>
              `).join('') : '<div class="mm-v2-doctype">Kho hien tai chua co tai lieu.</div>'}
            </div>
          </div>
        </div>
        <div class="mm-v2-actions">
          <button type="button" class="mm-v2-secondary" id="mm-v2-cancel">Huy</button>
          <button type="button" class="mm-v2-primary" id="mm-v2-confirm">Xac nhan tao</button>
        </div>
      </div>
    `;

    const close = () => ov.remove();
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    ov.querySelector('.mm-v2-mclose').onclick = close;
    ov.querySelector('#mm-v2-cancel').onclick = close;

    const topicInput = ov.querySelector('#mm-v2-topic-input');
    const fileInput = ov.querySelector('#mm-v2-file-input');
    const fileNameEl = ov.querySelector('#mm-v2-file-name');
    const pickBtn = ov.querySelector('#mm-v2-pick-file');

    pickBtn.onclick = () => fileInput.click();
    fileInput.onchange = async (e) => {
      uploadedFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
      uploadedDoc = null;
      if (!uploadedFile) {
        fileNameEl.textContent = 'Chua chon file';
        return;
      }
      const ext = (uploadedFile.name.split('.').pop() || '').toLowerCase();
      if ((uploadedFile.type || '').startsWith('image/')) {
        uploadedFile = null;
        fileInput.value = '';
        fileNameEl.textContent = 'Khong ho tro anh';
        alert('Mindmap chi nhan file van ban. Khong ho tro anh.');
        return;
      }
      if (!(['pdf', 'docx'].includes(ext) || TEXT_EXTS.has(ext))) {
        uploadedFile = null;
        fileInput.value = '';
        fileNameEl.textContent = 'Chi ho tro file van ban';
        alert('Mindmap strict upload truc tiep chi ho tro file van ban: PDF, DOCX, TXT, MD, CSV, JSON, XML, HTML, RTF, LOG...');
        return;
      }
      fileNameEl.textContent = uploadedFile.name;
      try {
        uploadedDoc = await fileToDocObject(uploadedFile);
      } catch (err) {
        uploadedDoc = null;
        alert('Khong doc duoc file: ' + (err?.message || err));
      }
    };

    ov.querySelectorAll('input[name="mm-source-mode"]').forEach(r => {
      r.addEventListener('change', () => { mode = r.value; });
    });

    ov.querySelector('#mm-v2-confirm').onclick = async () => {
      const topic = (topicInput.value || '').trim();
      let doc = null;

      if (mode === 'vault') {
        if (!docs.length) {
          alert('Kho tai lieu dang trong. Hay upload truc tiep hoac nhap chu de.');
          return;
        }
        const selected = ov.querySelector('input[name="mm-vault-doc"]:checked');
        if (!selected) {
          alert('Vui long chon tai lieu trong kho.');
          return;
        }
        doc = docs[parseInt(selected.value, 10)];
      } else if (mode === 'upload') {
        if (!uploadedDoc) {
          alert('Vui long chon file van ban de upload (PDF/DOCX/TXT/MD/...).');
          return;
        }
        doc = uploadedDoc;
      }

      const finalTopic = topic || doc?.name || '';
      if (!doc && !finalTopic) {
        alert('Vui long nhap chu de hoac chon tai lieu.');
        return;
      }

      close();
      await startMindMapCreation(finalTopic, doc || null);
    };

    document.body.appendChild(ov);
    setTimeout(() => topicInput.focus(), 0);
  }

  function deleteMindMap(id) {
    if (!confirm('Ban co chac muon xoa so do nay?')) return;
    saveMaps(getMaps().filter(m => String(m.id) !== String(id)));
    renderMindMapGallery();
    if (String(S.id) === String(id)) closeMindMapViewer();
  }

  function switchMmTab(tab) {
    S.tab = tab;
    document.getElementById('mm-tab-mine')?.classList.toggle('active', tab === 'mine');
    document.getElementById('mm-tab-store')?.classList.toggle('active', tab === 'store');
    renderMindMapGallery();
  }

  function findById(n, id, trail = []) {
    if (!n) return null;
    const tr = trail.concat(n);
    if (String(n.id) === String(id)) return { n, trail: tr };
    for (const c of (n.children || [])) { const r = findById(c, id, tr); if (r) return r; }
    return null;
  }
  function markSearch(root, q) {
    q = String(q || '').trim().toLowerCase();
    if (!q) { walk(root, n => { delete n.__hit; delete n.__desc; delete n.__open; }); return; }
    const rec = (n) => {
      const t = [n.name || '', n.summary || '', ...(n.keywords || [])].join(' ').toLowerCase();
      let hit = t.includes(q), desc = false;
      (n.children || []).forEach(c => { if (rec(c)) desc = true; });
      n.__hit = hit; n.__desc = desc; n.__open = desc;
      return hit || desc;
    };
    rec(root);
  }

  function applyTf() { if (!S.els) return; S.els.pan.style.transform = `translate(${Math.round(S.panX)}px,${Math.round(S.panY)}px)`; S.els.zoom.style.transform = `scale(${S.scale})`; }
  function zoom(delta, anchor) {
    if (!S.els) return;
    const o = S.scale || 1, n = Math.max(0.35, Math.min(2.4, +(o + delta).toFixed(2))); if (n === o) return;
    if (anchor) {
      const r = S.els.vp.getBoundingClientRect(), ax = anchor.x - r.left, ay = anchor.y - r.top;
      const wx = (ax - S.panX) / o, wy = (ay - S.panY) / o;
      S.scale = n; S.panX = ax - wx * n; S.panY = ay - wy * n;
    } else S.scale = n;
    S.moved = true; applyTf();
  }
  function fit(reset = false) {
    if (!S.els) return;
    const vp = S.els.vp, c = S.els.canvas;
    const cw = c.offsetWidth || 1, ch = c.offsetHeight || 1, vw = Math.max(1, vp.clientWidth), vh = Math.max(1, vp.clientHeight);
    const k = Math.max(0.35, Math.min(1.15, Math.min((vw - 64) / cw, (vh - 64) / ch)));
    S.scale = Number.isFinite(k) ? k : 1; S.panX = Math.round((vw - cw * S.scale) / 2); S.panY = Math.round((vh - ch * S.scale) / 2);
    if (reset) S.moved = false; applyTf();
  }
  function collapseAll(v) { walk(S.map, (n, d) => { if ((n.children || []).length) n.collapsed = d === 0 ? false : !!v; }); renderCanvas(); }

  function nodeBtn(n, root = false) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mm-v2-node' + (root ? ' root' : '') + (String(n.id) === String(S.selected) ? ' sel' : '') + (n.__hit ? ' hit' : '');
    b.title = n.summary || n.name || 'Node';
    b.onclick = (e) => { e.stopPropagation(); S.selected = n.id; renderCanvas(); };
    const t = document.createElement('span'); t.className = 'mm-v2-nt'; t.textContent = n.name || 'Node'; b.appendChild(t);
    const bits = []; if ((n.keywords || []).length) bits.push(`${n.keywords.length} kw`); if ((n.children || []).length) bits.push(`${n.children.length} child`); if ((n.source_refs || []).length) bits.push(`${n.source_refs.length} src`);
    if (bits.length) { const m = document.createElement('span'); m.className = 'mm-v2-nm'; m.textContent = bits.join(' • '); b.appendChild(m); }
    return b;
  }

  function branch(n, d, dir) {
    const has = (n.children || []).length > 0;
    const col = !!n.collapsed && !(S.q && n.__open);
    const box = document.createElement('div'); box.className = `mm-v2-branch ${dir}`;
    const row = document.createElement('div'); row.className = `mm-v2-row ${dir}`;
    const stem = document.createElement('span'); stem.className = 'mm-v2-stem';
    const btn = nodeBtn(n, false);
    let tg = null;
    if (has) {
      tg = document.createElement('button'); tg.type = 'button'; tg.className = 'mm-v2-toggle'; tg.textContent = col ? '+' : '−';
      tg.title = col ? 'Mo nhanh' : 'Thu nhanh';
      tg.onclick = (e) => { e.stopPropagation(); n.collapsed = !n.collapsed; renderCanvas(); };
    }
    if (dir === 'l') { row.append(btn); if (tg) row.append(tg); row.append(stem); } else { row.append(stem); if (tg) row.append(tg); row.append(btn); }
    box.append(row);
    if (has) {
      const ch = document.createElement('div'); ch.className = 'mm-v2-children' + (col ? ' off' : '');
      if (dir === 'l') ch.parentDir = 'l';
      n.children.forEach(c => ch.append(branch(c, d + 1, dir)));
      box.append(ch);
    }
    return box;
  }

  function inspector() {
    if (!S.els || !S.map) return;
    const f = findById(S.map, S.selected) || { n: S.map, trail: [S.map] };
    const n = f.n, tr = f.trail;
    const inferNodeSummary = (node) => {
      const given = String(node?.summary || '').trim();
      if (given) return given;
      const kids = (node?.children || []).map(x => String(x?.name || '').trim()).filter(Boolean);
      if (kids.length) {
        const head = kids.slice(0, 4).join(', ');
        const more = kids.length > 4 ? ` va ${kids.length - 4} muc khac` : '';
        return `Noi dung nay gom: ${head}${more}.`;
      }
      const kw = (node?.keywords || []).map(x => String(x || '').trim()).filter(Boolean);
      if (kw.length) return `Tu khoa lien quan: ${kw.slice(0, 5).join(', ')}.`;
      return `Node "${String(node?.name || 'N/A')}" chua co mo ta chi tiet, ban co the bam tu khoa de tra cuu nhanh.`;
    };
    const inferMapSummary = (map) => {
      const given = String(map?.summary || '').trim();
      if (given) return given;
      const first = (map?.children || []).map(x => String(x?.name || '').trim()).filter(Boolean).slice(0, 6);
      if (first.length) return `So do tong hop cac phan chinh: ${first.join(', ')}.`;
      return 'Khong co tom tat tong quan.';
    };
    const buildKeywords = (node) => {
      const base = (node?.keywords || []).map(x => String(x || '').trim()).filter(Boolean);
      const name = String(node?.name || '').trim();
      const kids = (node?.children || []).map(x => String(x?.name || '').trim()).filter(Boolean).slice(0, 4);
      return Array.from(new Set([...base, name, ...kids].filter(Boolean))).slice(0, 8);
    };
    const tagsArr = buildKeywords(n);
    const tags = tagsArr.length
      ? tagsArr.map(k => `<button type="button" class="mm-v2-tag-btn" data-mm-google="${E(k)}">${E(k)}</button>`).join('')
      : `<span class="mm-v2-nm">Khong co keyword</span>`;
    const nodeSummary = inferNodeSummary(n);
    const mapSummary = inferMapSummary(S.map);
    const src = S.map.source_meta || {};
    S.els.side.innerHTML = `
      <div class="mm-v2-card">
        <div class="mm-v2-lbl">Node dang chon</div>
        <div class="mm-v2-h">${E(n.name || 'Node')}</div>
        <div class="mm-v2-path">${E(tr.map(x => x.name).join(' > '))}</div>
        <div class="mm-v2-p">${E(nodeSummary)}</div>
        <div class="mm-v2-actions">
          <button type="button" class="mm-v2-linkbtn" data-mm-google="${E(n.name || '')}">Tra Google node</button>
        </div>
        <div class="mm-v2-tags">${tags}</div>
      </div>
      <div class="mm-v2-card">
        <div class="mm-v2-lbl">Thong tin node</div>
        <div class="mm-v2-kv"><span>Children</span><b>${(n.children || []).length}</b></div>
        <div class="mm-v2-kv"><span>Collapsed</span><b>${n.collapsed ? 'Yes' : 'No'}</b></div>
        <div class="mm-v2-kv"><span>Depth</span><b>${Math.max(0, tr.length - 1)}</b></div>
      </div>
      <div class="mm-v2-card">
        <div class="mm-v2-lbl">Map summary</div>
        <div class="mm-v2-p">${E(mapSummary)}</div>
        <div class="mm-v2-kv"><span>Nguon</span><b>${E(src.label || 'Topic-only')}</b></div>
        <div class="mm-v2-kv"><span>Grounded</span><b>${src.grounded ? 'Yes' : 'No'}</b></div>
        <div class="mm-v2-kv"><span>Ghi chu</span><b>${E(src.confidence_note || '')}</b></div>
      </div>`;
    S.els.side.querySelectorAll('[data-mm-google]').forEach(btn => {
      btn.onclick = () => {
        const q = String(btn.getAttribute('data-mm-google') || '').trim();
        if (!q) return;
        const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
        try { window.open(url, '_blank', 'noopener,noreferrer'); } catch { }
      };
    });
  }

  function renderCanvas() {
    if (!S.els || !S.map) return;
    markSearch(S.map, S.q);
    const c = S.els.canvas; c.innerHTML = '';
    const root = document.createElement('div'); root.className = 'mm-v2-root';
    const L = document.createElement('div'); L.className = 'mm-v2-col l';
    const C = document.createElement('div'); C.className = 'mm-v2-col c';
    const R = document.createElement('div'); R.className = 'mm-v2-col r';
    C.append(nodeBtn(S.map, true));
    if (S.map.summary) { const rs = document.createElement('div'); rs.className = 'mm-v2-rsum'; rs.textContent = S.map.summary; C.append(rs); }
    const a = [], b = []; (S.map.children || []).forEach((x, i) => (i % 2 === 0 ? b : a).push(x)); if (!a.length && b.length > 1) a.push(b.pop());
    a.forEach(x => L.append(branch(x, 1, 'l'))); b.forEach(x => R.append(branch(x, 1, 'r')));
    root.append(L, C, R); c.append(root);
    inspector();
    requestAnimationFrame(() => { if (!S.moved) fit(false); else applyTf(); });
  }

  function wire() {
    const { bar, input, vp } = S.els;
    bar.querySelectorAll('.mm-v2-btn').forEach(btn => {
      btn.onclick = () => {
        const a = btn.dataset.a;
        if (a === 'collapse') collapseAll(true);
        else if (a === 'expand') collapseAll(false);
        else if (a === 'zin') zoom(.12);
        else if (a === 'zout') zoom(-.12);
        else if (a === 'fit') fit(true);
      };
    });
    input.value = S.q || '';
    input.oninput = (e) => { S.q = e.target.value || ''; renderCanvas(); };
    vp.onwheel = (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? .08 : -.08, { x: e.clientX, y: e.clientY }); };
    vp.onpointerdown = (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.mm-v2-node,.mm-v2-toggle,.mm-v2-btn,input,button')) return;
      S.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, px: S.panX, py: S.panY }; S.moved = true; vp.classList.add('drag');
      try { vp.setPointerCapture(e.pointerId); } catch { }
    };
    vp.onpointermove = (e) => { if (!S.drag || S.drag.id !== e.pointerId) return; S.panX = S.drag.px + (e.clientX - S.drag.x); S.panY = S.drag.py + (e.clientY - S.drag.y); applyTf(); };
    const stop = (e) => { if (!S.drag) return; if (e && S.drag.id !== e.pointerId) return; try { vp.releasePointerCapture(S.drag.id); } catch { } S.drag = null; vp.classList.remove('drag'); };
    vp.onpointerup = stop; vp.onpointercancel = stop;
  }

  function workspace(rec, mount) {
    css();
    ensureMindMapRecordMetadata(rec);
    const area = mount || document.getElementById('mm-tree-area'); if (!area) return;
    area.classList.add('mm-v2'); area.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'mm-v2-wrap';
    const qualityBadge = rec?.quality?.level === 'low'
      ? `<span style="display:inline-flex;align-items:center;height:20px;border-radius:999px;padding:0 8px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.28);color:#92400e;font:600 .66rem Inter,sans-serif;margin-left:8px;">Ban nhap</span>`
      : '';
    wrap.innerHTML = `
      <div class="mm-v2-bar">
        <div class="mm-v2-meta">
          <div class="mm-v2-title" title="${E(rec?.title || S.map?.name || 'Mind Map')}">${E(rec?.title || S.map?.name || 'Mind Map')}${qualityBadge}</div>
          <div class="mm-v2-sub">${S.map?.meta?.nodeCount || countNodes(S.map)} nodes ? depth ${S.map?.meta?.maxDepth ?? 0}</div>
        </div>
        <div class="mm-v2-tools">
          <input class="mm-v2-input" placeholder="Tim node..." />
          <button class="mm-v2-btn" data-a="collapse">Thu gon</button>
          <button class="mm-v2-btn" data-a="expand">Mo het</button>
          <button class="mm-v2-btn" data-a="zout">-</button>
          <button class="mm-v2-btn" data-a="fit">Fit</button>
          <button class="mm-v2-btn" data-a="zin">+</button>
        </div>
      </div>
      <div class="mm-v2-main">
        <div class="mm-v2-vp"><div class="mm-v2-pan"><div class="mm-v2-zoom"><div class="mm-v2-canvas"></div></div></div></div>
        <aside class="mm-v2-side"></aside>
      </div>`;
    area.append(wrap);
    S.els = {
      area, wrap,
      bar: wrap.querySelector('.mm-v2-bar'),
      input: wrap.querySelector('.mm-v2-input'),
      vp: wrap.querySelector('.mm-v2-vp'),
      pan: wrap.querySelector('.mm-v2-pan'),
      zoom: wrap.querySelector('.mm-v2-zoom'),
      canvas: wrap.querySelector('.mm-v2-canvas'),
      side: wrap.querySelector('.mm-v2-side')
    };
    wire(); renderCanvas(); S.lastId = S.id;
  }

  function openMindMapViewer(id) {
    const maps = getMaps(), i = maps.findIndex(m => String(m.id) === String(id)); if (i < 0) return;
    const rec = maps[i];
    rec.data = normalize(rec.data, { topicFallback: rec.title, sourceDoc: null });
    if (!rec.title) rec.title = rec.data.name || 'Mind Map';
    ensureMindMapRecordMetadata(rec);
    saveMaps(maps);
    S.id = String(rec.id); S.map = rec.data; S.selected = rec.data.id; S.q = '';
    if (S.lastId !== S.id) { S.scale = 1; S.panX = 0; S.panY = 0; S.moved = false; }
    document.getElementById('mm-viewer')?.classList.add('active');
    workspace(rec, null);
  }

  function closeMindMapViewer() { document.getElementById('mm-viewer')?.classList.remove('active'); S.els = null; S.drag = null; }
  function buildMindMapTree(data, container) { S.id = 'preview'; S.map = normalize(data || {}, { topicFallback: data?.name || 'Mind Map' }); S.selected = S.map.id; workspace({ id: 'preview', title: S.map.name, data: S.map }, container || null); }

  function renderMindMapGallery() {
    const grid = document.getElementById('mm-card-grid'); if (!grid) return;
    const maps = getMaps(), list = S.tab === 'store' ? maps : maps;
    let h = `<div class="mm-card-add" onclick="promptCreateMindMap()" title="Tao so do moi"><div class="mm-card-add-icon">+</div></div>`;
    if (!list.length) h += `<div class="mm-card" style="display:flex;align-items:center;justify-content:center;min-height:140px;cursor:default;"><div class="mm-card-title" style="margin:0;text-align:center;">${S.tab === 'store' ? 'Kho tong chua co du lieu' : 'Chua co so do tu duy'}</div></div>`;
    list.forEach(m => {
      ensureMindMapRecordMetadata(m);
      const c = m?.data?.meta?.nodeCount || countNodes(m.data);
      const dt = m?.createdAt ? new Date(m.createdAt).toLocaleDateString('vi-VN') : '';
      const badge = m?.quality?.level === 'low'
        ? `<span style="display:inline-flex;align-items:center;height:18px;border-radius:999px;padding:0 7px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.2);color:#b45309;font:600 .64rem Inter,sans-serif;margin-left:8px;">Ban nhap</span>`
        : '';
      h += `<div class="mm-card" onclick="openMindMapViewer('${String(m.id)}')">
        <div class="mm-card-actions-bar">
          <button class="mm-card-action-btn mm-action-open" onclick="event.stopPropagation(); openMindMapViewer('${String(m.id)}')" title="Mo"><i class="fas fa-plus"></i></button>
          <button class="mm-card-action-btn mm-action-delete" onclick="event.stopPropagation(); deleteMindMap('${String(m.id)}')" title="Xoa"><i class="fas fa-trash"></i></button>
          <button class="mm-card-action-btn" style="background:transparent;color:#aaa;" title="Nodes"><i class="fas fa-project-diagram"></i></button>
        </div>
        <div class="mm-card-title">${E(m.title || 'Mind Map')}${badge}</div>
        <div style="padding:0 12px 12px;font-family:'Inter',sans-serif;color:#9fa0b8;font-size:.74rem;">${c} nodes${dt ? ' - ' + E(dt) : ''}</div>
      </div>`;
    });
    grid.innerHTML = h;
  }

  function exportApi() {
    Object.assign(window, { switchMmTab, getMindMaps: getMaps, saveMindMaps: saveMaps, renderMindMapGallery, promptCreateMindMap, startMindMapCreation, deleteMindMap, openMindMapViewer, closeMindMapViewer, buildMindMapTree });
    window.__evaMindMapV2 = { state: S, normalize, parseMind, assessMindMapQualityV2 };
  }

  css(); exportApi();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { try { renderMindMapGallery(); } catch { } });
  else { try { renderMindMapGallery(); } catch { } }
})();
