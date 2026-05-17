const PhysicsKnowledge = {
    topics: {
        "dao-dong-dieu-hoa": {
            title: "Dao động điều hòa",
            concepts: {
                "phuong-trinh": {
                    title: "Phương trình dao động",
                    formulas: ["x = A*cos(omega*t + phi)", "v = -A*omega*sin(omega*t + phi)", "a = -A*omega^2*cos(omega*t + phi)"],
                    variables: [
                        { symbol: "A", name: "Biên độ", unit: "cm", range: [2, 12] },
                        { symbol: "omega", name: "Tần số góc", unit: "rad/s", range: [Math.PI, 4 * Math.PI] },
                        { symbol: "phi", name: "Pha ban đầu", unit: "rad", range: [-Math.PI, Math.PI] }
                    ],
                    templates: [
                        {
                            difficulty: "NB",
                            text: "Một vật dao động điều hòa với phương trình $x = {A}\\cos({omega}t + {phi})$ (cm). Biên độ dao động của vật là:",
                            answer: "{A}",
                            unit: "cm",
                            distractors: ["{omega}", "{phi}", "2*{A}"]
                        },
                        {
                            difficulty: "TH",
                            text: "Một chất điểm dao động điều hòa với phương trình $x = {A}\\cos({omega}t + {phi})$ (cm). Tại thời điểm $t = 0,5$ s, li độ của vật là:",
                            calc: (p) => p.A * Math.cos(p.omega * 0.5 + p.phi),
                            unit: "cm"
                        }
                    ]
                },
                "con-lac-lo-xo": {
                    title: "Con lắc lò xo",
                    formulas: ["omega = sqrt(k/m)", "T = 2*pi*sqrt(m/k)"],
                    variables: [
                        { symbol: "k", name: "Độ cứng", unit: "N/m", range: [10, 100] },
                        { symbol: "m", name: "Khối lượng", unit: "kg", range: [0.1, 1.0] }
                    ]
                }
            }
        },
        "nem-xien": {
            title: "Chuyển động ném xiên",
            concepts: {
                "quy-dao": {
                    title: "Quỹ đạo ném xiên",
                    formulas: ["x = v0*cos(alpha)*t", "y = v0*sin(alpha)*t - 0.5*g*t^2"],
                    variables: [
                        { symbol: "v0", name: "Vận tốc đầu", unit: "m/s", range: [10, 50] },
                        { symbol: "alpha", name: "Góc ném", unit: "độ", range: [15, 75] },
                        { symbol: "g", name: "Gia tốc trọng trường", unit: "m/s^2", value: 9.8 }
                    ]
                }
            }
        }
    }
};

if (typeof module !== 'undefined') module.exports = PhysicsKnowledge;
else window.PhysicsKnowledge = PhysicsKnowledge;
