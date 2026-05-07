(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("./utils"));
  } else {
    root.EVAStructureValidator = factory(root.EVAValidatorUtils);
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (U) {
  function issue(base, code, severity, message, details, suggestedFix) {
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

  function validateExamStructure(exam) {
    const issues = [];
    if (!U.isObject(exam)) {
      issues.push({
        questionIndex: -1,
        questionId: "",
        code: "EXAM_INVALID_OBJECT",
        severity: "critical",
        message: "Exam khong hop le (khong phai object).",
        details: { type: typeof exam },
        suggestedFix: "Dam bao exam la object co field questions."
      });
      return issues;
    }
    if (U.isBlank(exam.title)) {
      issues.push({
        questionIndex: -1,
        questionId: exam.id || "",
        code: "EXAM_MISSING_TITLE",
        severity: "warning",
        message: "De thi thieu title.",
        details: {},
        suggestedFix: "Them title de de quan ly."
      });
    }
    if (!Array.isArray(exam.questions) || exam.questions.length === 0) {
      issues.push({
        questionIndex: -1,
        questionId: exam.id || "",
        code: "EXAM_EMPTY_QUESTIONS",
        severity: "critical",
        message: "De thi khong co cau hoi nao.",
        details: { questionsType: typeof exam.questions },
        suggestedFix: "Dam bao exam.questions la mang va co it nhat 1 cau."
      });
    }
    return issues;
  }

  function validateQuestionStructure(question, questionIndex) {
    const qid = U.toStr(question && question.id) || `q_${questionIndex + 1}`;
    const base = { questionIndex, questionId: qid };
    const out = [];

    if (!U.isObject(question)) {
      out.push(issue(base, "QUESTION_INVALID_OBJECT", "critical", "Question khong hop le.", {}, "Dam bao moi question la object."));
      return out;
    }

    const text = U.toStr(question.text || question.question || question.prompt);
    if (!text) {
      out.push(issue(base, "QUESTION_MISSING_TEXT", "critical", "Thieu noi dung cau hoi.", {}, "Them text/prompt cho cau hoi."));
    } else if (text.length < 8) {
      out.push(issue(base, "QUESTION_TEXT_TOO_SHORT", "warning", "Noi dung cau hoi qua ngan.", { length: text.length }, "Mo rong cau hoi de ro nghia hon."));
    }

    const qType = U.toStr(question.questionType || question.type || "mc");
    const isShortAnswer = /sa|short/i.test(qType);
    const isTrueFalse = /tf|true_false|truefalse/i.test(qType);

    if (!isShortAnswer) {
      if (!Array.isArray(question.options)) {
        out.push(issue(base, "QUESTION_MISSING_OPTIONS", "critical", "Thieu options.", { type: typeof question.options }, "Them options la mang gom cac lua chon."));
      } else if (question.options.length < 2) {
        out.push(issue(base, "QUESTION_OPTIONS_TOO_FEW", "critical", "So luong options khong hop le.", { count: question.options.length }, "MC can 4 options; TF can 2 options."));
      } else if (!isTrueFalse && question.options.length !== 4) {
        out.push(issue(base, "QUESTION_OPTIONS_NOT_FOUR", "warning", "MC nen co dung 4 options.", { count: question.options.length }, "Can bang options ve 4 lua chon."));
      }
    }

    const answer = question.correctAnswer != null ? question.correctAnswer : question.answer;
    if (answer == null || U.isBlank(answer)) {
      out.push(issue(base, "QUESTION_MISSING_CORRECT_ANSWER", "critical", "Thieu dap an dung.", {}, "Them correctAnswer."));
    }

    return out;
  }

  return {
    validateExamStructure,
    validateQuestionStructure
  };
});

