(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("./examValidator"), require("./demoData"));
  } else {
    root.runValidationDemo = factory(root.EVAExamValidator, root.EVAValidatorDemoData);
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (V, D) {
  return function runValidationDemo() {
    if (!V || !D) {
      return { ok: false, message: "Missing validator modules." };
    }
    const goodExam = D.buildValidExamSample();
    const badExam = D.buildInvalidExamSample();
    const good = V.validateExam(goodExam, { epsilon: 1e-3, subject: goodExam.subject });
    const bad = V.validateExam(badExam, { epsilon: 1e-3, subject: badExam.subject });
    return {
      ok: true,
      good,
      bad
    };
  };
});

