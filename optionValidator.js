(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("./utils"));
  } else {
    root.EVAOptionValidator = factory(root.EVAValidatorUtils);
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

  function normalizeCorrectAnswer(question) {
    const raw = question.correctAnswer != null ? question.correctAnswer : question.answer;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    const s = U.toStr(raw).toUpperCase();
    if (!s) return null;
    if (/^\d+$/.test(s)) return Number(s);
    const letterMap = { A: 1, B: 2, C: 3, D: 4 };
    return letterMap[s] || null;
  }

  function validateOptions(question, questionIndex) {
    const qid = U.toStr(question && question.id) || `q_${questionIndex + 1}`;
    const base = { questionIndex, questionId: qid };
    const issues = [];
    const qType = U.toStr(question.questionType || question.type || "mc");
    const isShortAnswer = /sa|short/i.test(qType);
    if (isShortAnswer) return issues;

    const options = U.toArray(question.options).map((x) => U.parseChoiceText(x));
    if (!options.length) return issues;

    options.forEach((opt, idx) => {
      if (U.isBlank(opt)) {
        issues.push(mk(base, "OPTION_EMPTY", "critical", "Option rong.", { optionIndex: idx }, "Loai bo option rong va bo sung lua chon hop le."));
      }
    });

    const seen = new Map();
    options.forEach((opt, idx) => {
      const k = U.normalizeText(opt);
      if (!k) return;
      if (seen.has(k)) {
        issues.push(mk(base, "OPTION_DUPLICATE", "critical", "Co option bi trung.", { optionIndex: idx, duplicateOf: seen.get(k) }, "Dam bao moi option co noi dung khac nhau."));
      } else {
        seen.set(k, idx);
      }
    });

    return issues;
  }

  function validateCorrectAnswer(question, questionIndex) {
    const qid = U.toStr(question && question.id) || `q_${questionIndex + 1}`;
    const base = { questionIndex, questionId: qid };
    const issues = [];
    const qType = U.toStr(question.questionType || question.type || "mc");
    const isShortAnswer = /sa|short/i.test(qType);

    if (isShortAnswer) {
      const answer = U.toStr(question.correctAnswer != null ? question.correctAnswer : question.answer);
      if (!answer) {
        issues.push(mk(base, "SHORT_ANSWER_EMPTY", "critical", "Cau tra loi ngan khong co dap an.", {}, "Them dap an text cho cau tra loi ngan."));
      }
      return issues;
    }

    const options = U.toArray(question.options);
    const answerIndex = normalizeCorrectAnswer(question);
    if (!answerIndex) {
      issues.push(mk(base, "CORRECT_ANSWER_INVALID_FORMAT", "critical", "Dap an dung sai format.", { value: question.correctAnswer || question.answer }, "Dung so 1..4 hoac A..D."));
      return issues;
    }
    if (!options.length) {
      issues.push(mk(base, "CORRECT_ANSWER_WITHOUT_OPTIONS", "critical", "Co dap an dung nhung thieu options.", {}, "Them options truoc khi dat dap an."));
      return issues;
    }
    if (answerIndex < 1 || answerIndex > options.length) {
      issues.push(mk(base, "CORRECT_ANSWER_OUT_OF_RANGE", "critical", "Dap an dung khong nam trong options.", { answerIndex, optionCount: options.length }, "Sua correctAnswer ve trong khoang options."));
    }
    return issues;
  }

  return {
    validateOptions,
    validateCorrectAnswer,
    normalizeCorrectAnswer
  };
});

