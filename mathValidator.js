(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("./utils"), require("./optionValidator"));
  } else {
    root.EVAMathValidator = factory(root.EVAValidatorUtils, root.EVAOptionValidator);
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (U, O) {
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

  function hasUnsafeChars(expr) {
    return /[^0-9a-zA-Z_+\-*/().,\s^]/.test(expr);
  }

  function safeEvalExpression(formula, variables) {
    const exprRaw = U.toStr(formula);
    if (!exprRaw) return { ok: false, error: "Empty formula" };
    if (hasUnsafeChars(exprRaw)) return { ok: false, error: "Unsafe formula characters" };

    const expr = exprRaw.replace(/\^/g, "**");
    const vars = U.isObject(variables) ? variables : {};
    const keys = Object.keys(vars);
    const badKey = keys.find((k) => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k));
    if (badKey) return { ok: false, error: `Invalid variable key ${badKey}` };

    const args = keys;
    const values = keys.map((k) => Number(vars[k]));
    if (values.some((v) => !Number.isFinite(v))) return { ok: false, error: "Non-finite variable value" };

    try {
      const fn = new Function(...args, "return (" + expr + ");");
      const val = fn(...values);
      if (Number.isNaN(val)) return { ok: false, error: "NaN result" };
      if (!Number.isFinite(val)) return { ok: false, error: "Infinite result" };
      return { ok: true, value: Number(val) };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  }

  function getExpectedAnswer(question) {
    const formula = U.toStr(question.formula);
    if (!formula) return { ok: false, reason: "no_formula" };
    const vars = question.variables;
    if (!U.isObject(vars) || Object.keys(vars).length === 0) {
      // Allow deterministic constant expressions, e.g. "(10-4)/2"
      return safeEvalExpression(formula, {});
    }
    return safeEvalExpression(formula, vars);
  }

  function getNumericCorrectAnswer(question) {
    const qType = U.toStr(question.questionType || question.type || "mc");
    if (/sa|short/i.test(qType)) return U.parseNumeric(question.correctAnswer != null ? question.correctAnswer : question.answer);
    const idx = O.normalizeCorrectAnswer(question);
    const opts = U.toArray(question.options);
    if (!idx || idx < 1 || idx > opts.length) return null;
    return U.parseNumeric(U.parseChoiceText(opts[idx - 1]));
  }

  function validateCalculation(question, questionIndex, cfg) {
    const qid = U.toStr(question && question.id) || `q_${questionIndex + 1}`;
    const base = { questionIndex, questionId: qid };
    const issues = [];
    const expected = getExpectedAnswer(question);
    if (!expected.ok) {
      if (expected.reason === "no_formula" && U.isObject(question.variables) && Object.keys(question.variables).length > 0) {
        issues.push(issue(base, "CALC_MISSING_FORMULA", "warning", "Co variables nhung thieu formula de kiem tra.", {}, "Them formula neu cau hoi co the kiem bang cong thuc."));
      }
      if (expected.reason === "no_variables" && U.toStr(question.formula)) {
        issues.push(issue(base, "CALC_MISSING_VARIABLES", "critical", "Co formula nhung thieu variables.", {}, "Bo sung variables de validator tinh lai dap an."));
      }
      if (expected.error) {
        const sev = /NaN|Infinite|divide|zero|Invalid|Unsafe/i.test(expected.error) ? "critical" : "warning";
        issues.push(issue(base, "CALC_EVAL_ERROR", sev, "Khong tinh duoc formula.", { error: expected.error }, "Kiem tra formula va gia tri variables."));
      }
      return issues;
    }

    const numericAnswer = getNumericCorrectAnswer(question);
    if (numericAnswer == null) {
      issues.push(issue(base, "CALC_NON_NUMERIC_ANSWER", "warning", "Khong doi chieu duoc cong thuc vi dap an khong phai so.", {}, "Dung dap an so neu muon validator tinh lai ket qua."));
      return issues;
    }

    const epsilon = Number.isFinite(cfg && cfg.epsilon) ? Number(cfg.epsilon) : 1e-3;
    if (!U.almostEqual(expected.value, numericAnswer, epsilon)) {
      issues.push(issue(base, "CALC_MISMATCH", "critical", "Ket qua tinh lai khong khop dap an dung.", { expected: expected.value, actual: numericAnswer, epsilon }, "Sua dap an dung hoac kiem tra lai formula/variables."));
    }

    return issues;
  }

  function validateMathConstraints(question, questionIndex) {
    const qid = U.toStr(question && question.id) || `q_${questionIndex + 1}`;
    const base = { questionIndex, questionId: qid };
    const issues = [];
    const formula = U.toStr(question.formula).replace(/\s+/g, "");
    const vars = U.isObject(question.variables) ? question.variables : {};

    if (formula.includes("/0")) {
      issues.push(issue(base, "MATH_DIVIDE_BY_ZERO_LITERAL", "critical", "Cong thuc co phep chia cho 0.", {}, "Sua formula de tranh mau so bang 0."));
    }

    const divTokens = formula.match(/\/([a-zA-Z_][a-zA-Z0-9_]*)/g) || [];
    divTokens.forEach((tok) => {
      const key = tok.slice(1);
      if (Object.prototype.hasOwnProperty.call(vars, key) && Number(vars[key]) === 0) {
        issues.push(issue(base, "MATH_DIVIDE_BY_ZERO_VAR", "critical", "Mau so bang 0 theo variables.", { variable: key, value: vars[key] }, "Doi du lieu dau vao de mau so khac 0."));
      }
    });

    const expected = getExpectedAnswer(question);
    if (expected.ok && Number.isFinite(expected.value) && Math.abs(expected.value) > 1e12) {
      issues.push(issue(base, "MATH_UNREALISTIC_MAGNITUDE", "warning", "Gia tri ket qua qua lon, co the phi thuc te.", { value: expected.value }, "Kiem tra don vi va du lieu dau vao."));
    }

    return issues;
  }

  return {
    validateCalculation,
    validateMathConstraints,
    safeEvalExpression
  };
});
