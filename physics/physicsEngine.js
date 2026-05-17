const PhysicsEngine = {
    // Dao động điều hòa
    simulateOscillation: function (params) {
        const { A, omega, phi, duration = 2, fps = 60 } = params;
        const data = [];
        const dt = 1 / fps;
        for (let t = 0; t <= duration; t += dt) {
            data.push({
                t: t,
                x: A * Math.cos(omega * t + phi),
                v: -A * omega * Math.sin(omega * t + phi),
                a: -A * omega * omega * Math.cos(omega * t + phi)
            });
        }
        return data;
    },

    // Chuyển động ném xiên
    simulateProjectile: function (params) {
        const { v0, alpha, g = 9.8, fps = 60 } = params;
        const rad = (alpha * Math.PI) / 180;
        const vx = v0 * Math.cos(rad);
        const vy0 = v0 * Math.sin(rad);
        const tFlight = (2 * vy0) / g;

        const data = [];
        const dt = 1 / fps;
        for (let t = 0; t <= tFlight; t += dt) {
            data.push({
                t: t,
                x: vx * t,
                y: vy0 * t - 0.5 * g * t * t
            });
        }
        return data;
    },

    // Mạch RLC nối tiếp
    simulateRLC: function (params) {
        const { R, L, C, U0, omega, duration = 0.1, fps = 1000 } = params;
        const ZL = omega * L;
        const ZC = 1 / (omega * C);
        const Z = Math.sqrt(R * R + Math.pow(ZL - ZC, 2));
        const I0 = U0 / Z;
        const phi = Math.atan((ZL - ZC) / R);

        const data = [];
        const dt = 1 / fps;
        for (let t = 0; t <= duration; t += dt) {
            data.push({
                t: t,
                u: U0 * Math.cos(omega * t),
                i: I0 * Math.cos(omega * t - phi)
            });
        }
        return data;
    },

    // Sóng cơ
    simulateWave: function (params) {
        const { A, omega, v, duration = 2, length = 10, fps = 60, points = 100 } = params;
        const k = omega / v; // Số sóng
        const data = []; // Mảng 2 chiều [thời gian][vị trí]
        const dt = 1 / fps;
        const dx = length / points;

        for (let t = 0; t <= duration; t += dt) {
            const timeStep = [];
            for (let x = 0; x <= length; x += dx) {
                timeStep.push({
                    x: x,
                    y: A * Math.cos(omega * t - k * x)
                });
            }
            data.push({ t, points: timeStep });
        }
        return data;
    }
};

if (typeof module !== 'undefined') module.exports = PhysicsEngine;
else window.PhysicsEngine = PhysicsEngine;
