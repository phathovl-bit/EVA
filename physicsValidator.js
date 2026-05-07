(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("./utils"));
  } else {
    root.EVAPhysicsValidator = factory(root.EVAValidatorUtils);
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

  function validatePhysicsConstraints(question, questionIndex) {
    const qid = U.toStr(question && question.id) || `q_${questionIndex + 1}`;
    const base = { questionIndex, questionId: qid };
    const issues = [];

    const text = U.normalizeText(question.text || question.question || question.prompt);
    const formula = U.toStr(question.formula);
    const vars = U.isObject(question.variables) ? question.variables : {};
    const unit = U.toStr(question.unit);

    if (formula && !unit) {
      issues.push(mk(base, "PHYSICS_MISSING_UNIT", "warning", "Cau vat ly co formula nhung thieu don vi ket qua.", {}, "Them truong unit de de kiem soat tinh hop le."));
    }

    if (formula && Object.keys(vars).length === 0) {
      issues.push(mk(base, "PHYSICS_MISSING_VARIABLES", "critical", "Cau vat ly co formula nhung thieu bien so.", {}, "Bo sung variables day du."));
    }

    const speed = Number(vars.v);
    if (Number.isFinite(speed) && speed > 3e8) {
      issues.push(mk(base, "PHYSICS_UNREALISTIC_SPEED", "critical", "Toc do vuot qua gioi han vat ly thong thuong.", { v: speed }, "Kiem tra lai du lieu v."));
    }

    const mass = Number(vars.m);
    if (Number.isFinite(mass) && mass < 0) {
      issues.push(mk(base, "PHYSICS_NEGATIVE_MASS", "critical", "Khoi luong am.", { m: mass }, "Khoi luong phai >= 0."));
    }

    const time = Number(vars.t);
    if (Number.isFinite(time) && time < 0) {
      issues.push(mk(base, "PHYSICS_NEGATIVE_TIME", "critical", "Thoi gian am.", { t: time }, "Thoi gian phai >= 0."));
    }

    if (text.includes("tu do roi") && Object.prototype.hasOwnProperty.call(vars, "g")) {
      const g = Number(vars.g);
      if (Number.isFinite(g) && (g < 8 || g > 12)) {
        issues.push(mk(base, "PHYSICS_GRAVITY_OUTLIER", "warning", "Gia tri gia toc trong truong bat thuong.", { g }, "Neu bai toan tren Trai Dat, nen dat g xap xi 9.8 m/s2."));
      }
    }

    return issues;
  }

  return { validatePhysicsConstraints };
});

