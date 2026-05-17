const QuestionGenerator = {
    generateExam: function (config) {
        const { total, levels, topics } = config;
        // levels: { NB: 0.4, TH: 0.3, VD: 0.2, VDC: 0.1 }
        // topics: ["dao-dong-dieu-hoa", "nem-xien"]

        const exam = [];
        const counts = this.calculateCounts(total, levels);

        for (const level in counts) {
            for (let i = 0; i < counts[level]; i++) {
                const topic = topics[Math.floor(Math.random() * topics.length)];
                const question = this.generateQuestion(topic, level);
                exam.push(question);
            }
        }

        const out = this.shuffle(exam);

        // Optional strict validation mode (deterministic, rule-based)
        if (config && config.runValidation) {
            const report = this.validateGeneratedExam(out, config);
            if (!report.valid) {
                const first = (report.errors && report.errors[0]) || null;
                const msg = first ? `${first.code}: ${first.message}` : 'Validation failed';
                throw new Error(`Exam generation blocked by validator. ${msg}`);
            }
        }

        return out;
    },

    calculateCounts: function (total, levels) {
        const counts = {};
        let sum = 0;
        for (const level in levels) {
            counts[level] = Math.floor(total * levels[level]);
            sum += counts[level];
        }
        // Fill remainder to match total
        const remaining = total - sum;
        if (remaining > 0) counts["NB"] += remaining;
        return counts;
    },

    generateQuestion: function (topicId, difficulty) {
        const topic = window.PhysicsKnowledge.topics[topicId];
        const concepts = Object.values(topic.concepts);
        const concept = concepts[Math.floor(Math.random() * concepts.length)];

        // Find templates for this difficulty
        let possibleTemplates = (concept.templates || []).filter(t => t.difficulty === difficulty);

        // Fallback if no specific template exists for that difficulty
        if (possibleTemplates.length === 0) {
            possibleTemplates = concept.templates || [{
                text: `Câu hỏi mẫu về ${concept.title} mức độ ${difficulty}. Tính tham số vật lý cơ bản.`,
                difficulty: difficulty,
                answer: "10",
                unit: "đơn vị",
                distractors: ["5", "15", "20"]
            }];
        }

        const template = possibleTemplates[Math.floor(Math.random() * possibleTemplates.length)];
        const params = this.randomizeParams(concept.variables);

        let questionText = template.text;
        for (const key in params) {
            questionText = questionText.replace(new RegExp(`{${key}}`, 'g'), params[key]);
        }

        let answer, distractors;
        if (template.calc) {
            const rawAns = template.calc(params);
            answer = this.formatNumber(rawAns);
            distractors = this.generateSmartDistractors(rawAns, template, params);
        } else {
            answer = template.answer;
            distractors = template.distractors;
        }

        return {
            topic: topic.title,
            concept: concept.title,
            difficulty: difficulty,
            question: questionText,
            options: this.createOptions(answer, distractors),
            answer: "A", // After shuffle, it will change
            explanation: template.explanation || `Sử dụng công thức ${concept.formulas[0]} để tính toán kết quả.`,
            simConfig: { topicId, conceptId: concept.id, params } // For UI simulation logic
        };
    },

    randomizeParams: function (variables) {
        const params = {};
        variables.forEach(v => {
            if (v.range) {
                const val = v.range[0] + Math.random() * (v.range[1] - v.range[2]); // Simplistic
                params[v.symbol] = this.formatNumber(v.range[0] + Math.random() * (v.range[1] - v.range[0]));
            } else {
                params[v.symbol] = v.value;
            }
        });
        return params;
    },

    generateSmartDistractors: function (answer, template, params) {
        // Simple smart distractor logic
        return [
            this.formatNumber(answer * 2),      // Factor of 2 error
            this.formatNumber(answer / 2),      // Factor of 1/2 error
            this.formatNumber(Math.abs(answer - 5)) // Absolute offset
        ];
    },

    createOptions: function (answer, distractors) {
        const labels = ["A", "B", "C", "D"];
        const combined = [answer, ...distractors].slice(0, 4);
        const shuffled = this.shuffle(combined);
        const correctLabel = labels[shuffled.indexOf(answer)];

        return {
            list: shuffled.map((val, i) => `${labels[i]}. ${val}`),
            correct: correctLabel
        };
    },

    formatNumber: function (n) {
        return parseFloat(n.toFixed(2));
    },

    shuffle: function (array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    toValidationExam: function (generatedQuestions, config = {}) {
        const letters = { A: 1, B: 2, C: 3, D: 4 };
        const subject = config.subject || 'physics';
        return {
            id: `eva_gen_${Date.now()}`,
            title: config.title || 'EVA Generated Exam',
            subject,
            grade: config.grade || '',
            questions: (generatedQuestions || []).map((q, idx) => {
                const opts = Array.isArray(q?.options?.list) ? q.options.list : [];
                const clean = opts.map((x) => String(x || '').replace(/^[A-D]\s*[\.\):\-]\s*/i, '').trim());
                return {
                    id: q.id || `q_${idx + 1}`,
                    subject,
                    topic: q.topic || '',
                    difficulty: q.difficulty || '',
                    questionType: 'mc',
                    text: q.question || '',
                    options: clean,
                    correctAnswer: letters[String(q?.options?.correct || '').toUpperCase()] || null,
                    explanation: q.explanation || '',
                    formula: q.formula || '',
                    variables: (q.simConfig && q.simConfig.params) ? q.simConfig.params : {},
                    unit: q.unit || ''
                };
            })
        };
    },

    validateGeneratedExam: function (generatedQuestions, config = {}) {
        const exam = this.toValidationExam(generatedQuestions, config);
        const validator = (typeof window !== 'undefined') ? window.EVAExamValidator : null;
        if (!validator || typeof validator.validateExam !== 'function') {
            return {
                valid: true,
                totalQuestions: exam.questions.length,
                passedQuestions: exam.questions.length,
                failedQuestions: 0,
                errors: [],
                warnings: [{ questionIndex: -1, questionId: '', code: 'VALIDATOR_NOT_LOADED', severity: 'warning', message: 'Validator module not loaded.', details: {}, suggestedFix: 'Load validator scripts before generation.' }],
                summary: { criticalCount: 0, warningCount: 1, infoCount: 0, blockPublish: false }
            };
        }
        return validator.validateExam(exam, { subject: exam.subject, epsilon: Number(config.epsilon || 1e-3) });
    },

    generateValidatedExam: function (config) {
        const out = this.generateExam({ ...(config || {}), runValidation: false });
        const report = this.validateGeneratedExam(out, config || {});
        if (!report.valid) {
            const first = (report.errors && report.errors[0]) || null;
            const msg = first ? `${first.code}: ${first.message}` : 'Validation failed';
            throw new Error(`Exam generation blocked by validator. ${msg}`);
        }
        return { questions: out, validation: report };
    }
};

if (typeof module !== 'undefined') module.exports = QuestionGenerator;
else window.QuestionGenerator = QuestionGenerator;
