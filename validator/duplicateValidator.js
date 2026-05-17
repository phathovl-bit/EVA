(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("./utils"));
  } else {
    root.EVADuplicateValidator = factory(root.EVAValidatorUtils);
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (U) {
  function mk(qi, qid, code, severity, message, details, suggestedFix) {
    return {
      questionIndex: qi,
      questionId: qid,
      code,
      severity,
      message,
      details: details || {},
      suggestedFix: suggestedFix || ""
    };
  }

  function detectDuplicates(exam) {
    const questions = U.toArray(exam && exam.questions);
    const out = [];
    const normalizedMap = new Map();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i] || {};
      const qid = U.toStr(q.id) || `q_${i + 1}`;
      const text = U.toStr(q.text || q.question || q.prompt);
      const norm = U.normalizeText(text);
      const templ = U.normalizeTemplate(text);

      if (norm && normalizedMap.has(norm)) {
        const prev = normalizedMap.get(norm);
        out.push(mk(i, qid, "DUPLICATE_EXACT", "critical", "Trung cau hoi y het.", { duplicateOf: prev.questionId, duplicateIndex: prev.index }, "Loai bo mot trong hai cau trung lap."));
      } else {
        normalizedMap.set(norm, { index: i, questionId: qid, template: templ, tokens: U.tokenize(text) });
      }
    }

    for (let i = 0; i < questions.length; i++) {
      for (let j = i + 1; j < questions.length; j++) {
        const qa = questions[i] || {};
        const qb = questions[j] || {};
        const idA = U.toStr(qa.id) || `q_${i + 1}`;
        const idB = U.toStr(qb.id) || `q_${j + 1}`;
        const ta = U.toStr(qa.text || qa.question || qa.prompt);
        const tb = U.toStr(qb.text || qb.question || qb.prompt);
        if (!ta || !tb) continue;

        const tempA = U.normalizeTemplate(ta);
        const tempB = U.normalizeTemplate(tb);
        const tokensA = U.tokenize(ta);
        const tokensB = U.tokenize(tb);
        const overlap = U.jaccard(tokensA, tokensB);

        if (tempA && tempA === tempB) {
          out.push(mk(j, idB, "DUPLICATE_TEMPLATE", "warning", "Hai cau co cung template (chi doi so).", { similarTo: idA, overlap }, "Can nhac doi mau cau hoi de tang do da dang."));
          continue;
        }
        if (overlap >= 0.85) {
          out.push(mk(j, idB, "DUPLICATE_NEAR", "warning", "Hai cau qua giong nhau theo token overlap.", { similarTo: idA, overlap }, "Viet lai mot cau de tranh lap y."));
        }
      }
    }

    return out;
  }

  return { detectDuplicates };
});

