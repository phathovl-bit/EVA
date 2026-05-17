(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.EVAReportFormatter = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function aggregateValidationReport(exam, issues) {
    const all = Array.isArray(issues) ? issues : [];
    const errors = all.filter((x) => x.severity === "critical");
    const warnings = all.filter((x) => x.severity === "warning");
    const infos = all.filter((x) => x.severity === "info");
    const totalQuestions = Array.isArray(exam && exam.questions) ? exam.questions.length : 0;

    const failedSet = new Set(errors.map((x) => String(x.questionIndex)));
    const failedQuestions = failedSet.has("-1")
      ? totalQuestions
      : failedSet.size;
    const passedQuestions = Math.max(0, totalQuestions - failedQuestions);

    return {
      valid: errors.length === 0,
      totalQuestions,
      passedQuestions,
      failedQuestions,
      errors,
      warnings,
      infos,
      summary: {
        criticalCount: errors.length,
        warningCount: warnings.length,
        infoCount: infos.length,
        blockPublish: errors.length > 0
      }
    };
  }

  return { aggregateValidationReport };
});

