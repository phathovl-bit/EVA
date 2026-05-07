(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("./utils"), require("./optionValidator"));
  } else {
    root.EVAQualityValidator = factory(root.EVAValidatorUtils, root.EVAOptionValidator);
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (U, O) {
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

  function checkAnswerDistribution(exam) {
    const issues = [];
    const questions = U.toArray(exam && exam.questions);
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let tracked = 0;
    questions.forEach((q) => {
      const qType = U.toStr(q.questionType || q.type || "mc");
      if (/sa|short|tf/i.test(qType)) return;
      const idx = O.normalizeCorrectAnswer(q);
      if (idx >= 1 && idx <= 4) {
        counts[idx] += 1;
        tracked += 1;
      }
    });
    if (tracked < 6) return issues;
    const max = Math.max(counts[1], counts[2], counts[3], counts[4]);
    if (max / tracked > 0.7) {
      issues.push(mk(-1, "", "QUALITY_ANSWER_DISTRIBUTION_IMBALANCE", "warning", "Phan bo dap an dung mat can bang.", { counts, tracked }, "Can bang dap an dung A/B/C/D deu hon."));
    }
    return issues;
  }

  function checkDifficultyBalance(exam) {
    const issues = [];
    const questions = U.toArray(exam && exam.questions);
    if (!questions.length) return issues;
    const map = {};
    questions.forEach((q) => {
      const d = U.toStr(q.difficulty || "unknown").toUpperCase();
      map[d] = (map[d] || 0) + 1;
    });
    const maxKey = Object.keys(map).sort((a, b) => map[b] - map[a])[0];
    const maxRatio = map[maxKey] / questions.length;
    if (maxRatio > 0.8) {
      issues.push(mk(-1, "", "QUALITY_DIFFICULTY_IMBALANCE", "warning", "De thi mat can bang do kho.", { distribution: map }, "Dieu chinh so cau theo muc do kho can doi hon."));
    }
    return issues;
  }

  function checkRepeatedNumbers(exam) {
    const issues = [];
    const questions = U.toArray(exam && exam.questions);
    const freq = {};
    questions.forEach((q) => {
      const text = U.toStr(q.text || q.question || q.prompt);
      const nums = text.match(/\d+(\.\d+)?/g) || [];
      nums.forEach((n) => {
        freq[n] = (freq[n] || 0) + 1;
      });
    });
    const repeated = Object.keys(freq).filter((k) => freq[k] >= 6);
    if (repeated.length) {
      issues.push(mk(-1, "", "QUALITY_REPEATED_NUMBER", "info", "Mot so thong so xuat hien tan suat cao.", { repeated: repeated.slice(0, 10) }, "Can nhac da dang hoa tham so dau vao."));
    }
    return issues;
  }

  function validateExamQuality(exam) {
    return []
      .concat(checkAnswerDistribution(exam))
      .concat(checkDifficultyBalance(exam))
      .concat(checkRepeatedNumbers(exam));
  }

  return { validateExamQuality };
});

