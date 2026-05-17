(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(
      require("./utils"),
      require("./structureValidator"),
      require("./optionValidator"),
      require("./mathValidator"),
      require("./physicsValidator"),
      require("./chemistryValidator"),
      require("./duplicateValidator"),
      require("./qualityValidator"),
      require("./reportFormatter")
    );
  } else {
    root.EVAExamValidator = factory(
      root.EVAValidatorUtils,
      root.EVAStructureValidator,
      root.EVAOptionValidator,
      root.EVAMathValidator,
      root.EVAPhysicsValidator,
      root.EVAChemistryValidator,
      root.EVADuplicateValidator,
      root.EVAQualityValidator,
      root.EVAReportFormatter
    );
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (
  U,
  S,
  O,
  M,
  P,
  C,
  D,
  Q,
  R
) {
  function pickSubject(subjectText) {
    const s = U.normalizeText(subjectText);
    if (/vat ly|physics/.test(s)) return "physics";
    if (/hoa|chem/.test(s)) return "chemistry";
    if (/toan|math/.test(s)) return "math";
    return "general";
  }

  function buildQuestionView(question) {
    const q = U.safeJsonClone(question) || {};
    if (Array.isArray(q.options)) {
      q.options = q.options.map((opt) => U.parseChoiceText(opt));
    }
    q.text = U.toStr(q.text || q.question || q.prompt);
    return q;
  }

  function validateEachQuestion(question, questionIndex, cfg) {
    const q = buildQuestionView(question);
    const issues = [];
    issues.push.apply(issues, S.validateQuestionStructure(q, questionIndex));
    issues.push.apply(issues, O.validateOptions(q, questionIndex));
    issues.push.apply(issues, O.validateCorrectAnswer(q, questionIndex));
    issues.push.apply(issues, M.validateCalculation(q, questionIndex, cfg));

    const subj = pickSubject(q.subject || cfg.subject || "");
    if (subj === "math") {
      issues.push.apply(issues, M.validateMathConstraints(q, questionIndex));
    } else if (subj === "physics") {
      issues.push.apply(issues, M.validateMathConstraints(q, questionIndex));
      issues.push.apply(issues, P.validatePhysicsConstraints(q, questionIndex));
    } else if (subj === "chemistry") {
      issues.push.apply(issues, C.validateChemistryConstraints(q, questionIndex));
    }
    return issues;
  }

  function validateExam(examInput, cfg) {
    const config = U.isObject(cfg) ? cfg : {};
    const exam = U.safeJsonClone(examInput) || {};
    const issues = [];
    issues.push.apply(issues, S.validateExamStructure(exam));

    const questions = U.toArray(exam.questions);
    for (let i = 0; i < questions.length; i++) {
      issues.push.apply(issues, validateEachQuestion(questions[i], i, config));
    }

    issues.push.apply(issues, D.detectDuplicates(exam));
    issues.push.apply(issues, Q.validateExamQuality(exam));

    return R.aggregateValidationReport(exam, issues);
  }

  function assertPublishable(exam, cfg) {
    const report = validateExam(exam, cfg);
    if (!report.valid || report.summary.blockPublish) {
      const messages = report.errors.slice(0, 5).map((e) => `Q${e.questionIndex + 1} ${e.code}: ${e.message}`);
      const err = new Error("Exam has critical validation errors.");
      err.report = report;
      err.messages = messages;
      throw err;
    }
    return report;
  }

  return {
    validateExamStructure: S.validateExamStructure,
    validateEachQuestion,
    validateOptions: O.validateOptions,
    validateCorrectAnswer: O.validateCorrectAnswer,
    validateCalculation: M.validateCalculation,
    validatePhysicsOrMathConstraints: function (question, questionIndex, cfg) {
      const subj = pickSubject((question && question.subject) || (cfg && cfg.subject) || "");
      if (subj === "physics") {
        return []
          .concat(M.validateMathConstraints(question, questionIndex))
          .concat(P.validatePhysicsConstraints(question, questionIndex));
      }
      if (subj === "math") return M.validateMathConstraints(question, questionIndex);
      if (subj === "chemistry") return C.validateChemistryConstraints(question, questionIndex);
      return [];
    },
    detectDuplicates: D.detectDuplicates,
    aggregateValidationReport: R.aggregateValidationReport,
    validateExam,
    assertPublishable
  };
});

