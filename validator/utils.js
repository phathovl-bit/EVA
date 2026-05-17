(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.EVAValidatorUtils = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function isObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function toArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function toStr(v) {
    return String(v == null ? "" : v).trim();
  }

  function normalizeText(text) {
    return toStr(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeTemplate(text) {
    return normalizeText(text).replace(/\d+(\.\d+)?/g, "#");
  }

  function tokenize(text) {
    const n = normalizeText(text);
    if (!n) return [];
    return n.split(" ").filter(Boolean);
  }

  function jaccard(aTokens, bTokens) {
    const a = new Set(aTokens || []);
    const b = new Set(bTokens || []);
    if (!a.size && !b.size) return 1;
    let inter = 0;
    a.forEach((t) => {
      if (b.has(t)) inter += 1;
    });
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
  }

  function almostEqual(a, b, epsilon) {
    const e = Number.isFinite(epsilon) ? epsilon : 1e-6;
    return Math.abs(Number(a) - Number(b)) <= e;
  }

  function parseNumeric(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const s = toStr(value).replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function parseChoiceText(choice) {
    const s = toStr(choice);
    return s.replace(/^[A-D]\s*[\.\):\-]\s*/i, "").trim();
  }

  function isBlank(v) {
    return toStr(v).length === 0;
  }

  function safeJsonClone(v) {
    try {
      return JSON.parse(JSON.stringify(v));
    } catch (e) {
      return null;
    }
  }

  return {
    isObject,
    toArray,
    toStr,
    normalizeText,
    normalizeTemplate,
    tokenize,
    jaccard,
    almostEqual,
    parseNumeric,
    parseChoiceText,
    isBlank,
    safeJsonClone
  };
});

