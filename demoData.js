(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.EVAValidatorDemoData = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function buildValidExamSample() {
    return {
      id: "exam_valid_01",
      title: "De demo hop le",
      subject: "physics",
      grade: "10",
      questions: [
        {
          id: "q1",
          subject: "physics",
          topic: "chuyen dong thang deu",
          difficulty: "NB",
          questionType: "mc",
          text: "Mot xe di voi van toc 10 m/s trong 5 s. Quang duong xe di duoc la bao nhieu?",
          options: ["A. 30", "B. 40", "C. 50", "D. 60"],
          correctAnswer: 3,
          formula: "v*t",
          variables: { v: 10, t: 5 },
          unit: "m"
        },
        {
          id: "q2",
          subject: "math",
          topic: "pt bac nhat",
          difficulty: "NB",
          questionType: "mc",
          text: "Giai phuong trinh 2x + 4 = 10.",
          options: ["A. 1", "B. 2", "C. 3", "D. 4"],
          correctAnswer: 3,
          formula: "(10-4)/2",
          variables: {}
        },
        {
          id: "q3",
          subject: "chemistry",
          topic: "pH",
          difficulty: "TH",
          questionType: "sa",
          text: "Dung dich co pH = 7 la moi truong gi?",
          correctAnswer: "Trung tinh",
          variables: { ph: 7 }
        },
        {
          id: "q4",
          subject: "physics",
          topic: "dong hoc",
          difficulty: "TH",
          questionType: "mc",
          text: "Vat chuyen dong nhanh dan deu voi a = 2 m/s2, v0 = 0, t = 4s. Van toc cuoi la?",
          options: ["A. 6", "B. 8", "C. 10", "D. 12"],
          correctAnswer: 2,
          formula: "v0 + a*t",
          variables: { v0: 0, a: 2, t: 4 },
          unit: "m/s"
        },
        {
          id: "q5",
          subject: "math",
          topic: "hinh hoc",
          difficulty: "VD",
          questionType: "mc",
          text: "Dien tich hinh chu nhat co chieu dai 8 va chieu rong 3 la bao nhieu?",
          options: ["A. 11", "B. 18", "C. 21", "D. 24"],
          correctAnswer: 4,
          formula: "a*b",
          variables: { a: 8, b: 3 },
          unit: "m2"
        }
      ]
    };
  }

  function buildInvalidExamSample() {
    return {
      id: "exam_invalid_01",
      title: "",
      subject: "physics",
      grade: "10",
      questions: [
        {
          id: "bad1",
          subject: "physics",
          questionType: "mc",
          text: "",
          options: ["A. 1", "B. 1", "", "D. 4"],
          correctAnswer: 5,
          formula: "x/0",
          variables: { x: 4 },
          unit: ""
        },
        {
          id: "bad2",
          subject: "physics",
          questionType: "mc",
          text: "Tinh van toc theo cong thuc v = s/t voi s = 100, t = 0",
          options: ["A. 0", "B. 10", "C. vo han", "D. 100"],
          correctAnswer: 2,
          formula: "s/t",
          variables: { s: 100, t: 0 }
        },
        {
          id: "bad3",
          subject: "chemistry",
          questionType: "sa",
          text: "Gia tri pH cua dung dich",
          correctAnswer: "",
          variables: { ph: 20 }
        },
        {
          id: "bad4",
          subject: "math",
          questionType: "mc",
          text: "2 + 2 = ?",
          options: ["A. 4", "B. 3", "C. 2", "D. 1"],
          correctAnswer: 2,
          formula: "2+2"
        },
        {
          id: "bad5",
          subject: "math",
          questionType: "mc",
          text: "2 + 2 = ?",
          options: ["A. 4", "B. 3", "C. 2", "D. 1"],
          correctAnswer: 1
        }
      ]
    };
  }

  return {
    buildValidExamSample,
    buildInvalidExamSample
  };
});
