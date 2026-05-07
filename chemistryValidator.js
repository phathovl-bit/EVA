(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("./utils"));
  } else {
    root.EVAChemistryValidator = factory(root.EVAValidatorUtils);
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (U) {
  function mk(base, code, severity, message, details, suggestedFix) {
    return {
      questionIndex: base.questionIndex,
      questionId: base.questionId,
      code,
      severity,
      message,
      details: details || {},
      suggestedFix: suggestedFix || ""
    };
  }

  function validateChemistryConstraints(question, questionIndex) {
    const qid = U.toStr(question && question.id) || `q_${questionIndex + 1}`;
    const base = { questionIndex, questionId: qid };
    const issues = [];
    const vars = U.isObject(question.variables) ? question.variables : {};
    const text = U.normalizeText(question.text || question.question || question.prompt);

    if (Object.prototype.hasOwnProperty.call(vars, "ph")) {
      const ph = Number(vars.ph);
      if (Number.isFinite(ph) && (ph < 0 || ph > 14)) {
        issues.push(mk(base, "CHEM_PH_OUT_OF_RANGE", "critical", "Gia tri pH nam ngoai khoang [0,14].", { ph }, "Kiem tra lai du lieu hoa hoc."));
      }
    }

    if (Object.prototype.hasOwnProperty.call(vars, "concentration")) {
      const c = Number(vars.concentration);
      if (Number.isFinite(c) && c < 0) {
        issues.push(mk(base, "CHEM_NEGATIVE_CONCENTRATION", "critical", "Nong do am.", { concentration: c }, "Nong do phai >= 0."));
      }
    }

    if (text.includes("bao toan khoi luong") && !Object.keys(vars).length) {
      issues.push(mk(base, "CHEM_MISSING_DATA_FOR_MASS_BALANCE", "warning", "Cau hoa hoc goi y bao toan khoi luong nhung khong co du lieu bien so.", {}, "Bo sung data de co the doi chieu ket qua."));
    }

    return issues;
  }

  return { validateChemistryConstraints };
});

