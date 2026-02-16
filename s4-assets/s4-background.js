// ═══════════════════════════════════════════════════════════════════════
// S4 LEDGER — BLOCKCHAIN ANCHOR BACKGROUND ANIMATION v4
// Zero external dependencies. Shared across all pages.
// Theme: Futuristic holographic anchors with energy-pulsing chains
// ═══════════════════════════════════════════════════════════════════════

(function(){
'use strict';

// Auto-create canvas if it doesn't exist
var canvas = document.getElementById('anchor-canvas');
if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'anchor-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-2;pointer-events:none;';
    document.body.insertBefore(canvas, document.body.firstChild);
}

const ctx = canvas.getContext('2d');
let W, H;

function resize(){
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ─── Color palette ───
const BLUE   = '#00aaff';
const GOLD   = '#c9a84c';
const GREEN  = '#14f195';
const CYAN   = '#00e5ff';
const PURPLE = '#9b59b6';
const WHITE  = '#ffffff';

// ─── Performance: reduce counts on mobile ───
const isMobile = window.innerWidth < 768;
const scale = isMobile ? 0.5 : 1;

// ─── ANCHOR + CHAIN ENTITIES (main visual feature) ───
const anchors = [];
const NUM_ANCHORS = Math.floor(7 * scale);
for (let i = 0; i < NUM_ANCHORS; i++) {
    const chainLen = 14 + Math.floor(Math.random() * 18);
    const chain = [];
    const startX = Math.random() * 3000;
    const startY = Math.random() * 3000;
    for (let c = 0; c < chainLen; c++) {
        chain.push({ x: startX, y: startY + c * 14, phase: c * 0.25 });
    }
    // Each anchor gets 1-2 energy pulses that travel down the chain
    const pulseCount = 1 + Math.floor(Math.random() * 2);
    const energyPulses = [];
    for (let p = 0; p < pulseCount; p++) {
        energyPulses.push({ pos: Math.random(), speed: 0.008 + Math.random() * 0.012 });
    }
    anchors.push({
        x: startX,
        y: startY,
        size: 22 + Math.random() * 20,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.0008,
        driftX: (Math.random() - 0.5) * 0.22,
        driftY: -(0.10 + Math.random() * 0.20),
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.003 + Math.random() * 0.004,
        alpha: 0.12 + Math.random() * 0.10,
        pulse: Math.random() * Math.PI * 2,
        color: [BLUE, CYAN, GOLD][Math.floor(Math.random() * 3)],
        chain: chain,
        chainSpacing: 12 + Math.random() * 6,
        chainLinkSize: 3.5 + Math.random() * 2,
        chainAlpha: 0.06 + Math.random() * 0.06,
        energyPulses: energyPulses,
        orbitalPhase: Math.random() * Math.PI * 2,
        orbitalSpeed: 0.008 + Math.random() * 0.006
    });
}

// ─── BLOCKCHAIN NODES (pulsing network dots) ───
const nodes = [];
const NUM_NODES = Math.floor(18 * scale);
for (let i = 0; i < NUM_NODES; i++) {
    nodes.push({
        x: Math.random() * 3000,
        y: Math.random() * 3000,
        radius: 1.2 + Math.random() * 2,
        drift: 0.04 + Math.random() * 0.1,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.001 + Math.random() * 0.003,
        alpha: 0.07 + Math.random() * 0.10,
        pulse: Math.random() * Math.PI * 2,
        color: [BLUE, GREEN, CYAN, PURPLE][Math.floor(Math.random() * 4)]
    });
}

// ─── CIRCUIT TRACES (L-shaped tech lines with traveling pulses) ───
const circuits = [];
const NUM_CIRCUITS = Math.floor(6 * scale);
for (let i = 0; i < NUM_CIRCUITS; i++) {
    const hasBend = Math.random() > 0.4;
    circuits.push({
        x: Math.random() * 3000,
        y: Math.random() * 3000,
        seg1Len: 60 + Math.random() * 180,
        seg1Dir: Math.random() > 0.5 ? 'h' : 'v',
        hasBend: hasBend,
        seg2Len: hasBend ? 40 + Math.random() * 120 : 0,
        alpha: 0.03 + Math.random() * 0.04,
        pulsePos: 0,
        pulseSpeed: 0.004 + Math.random() * 0.006,
        color: [BLUE, GOLD, CYAN][Math.floor(Math.random() * 3)],
        dotRadius: 1.5 + Math.random() * 1.5
    });
}

// ─── ENERGY PARTICLES (tiny bright dots that drift and fade) ───
const particles = [];
const NUM_PARTICLES = Math.floor(28 * scale);
for (let i = 0; i < NUM_PARTICLES; i++) {
    particles.push({
        x: Math.random() * 3000,
        y: Math.random() * 3000,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        radius: 0.5 + Math.random() * 1.3,
        alpha: 0.05 + Math.random() * 0.08,
        pulse: Math.random() * Math.PI * 2,
        color: [BLUE, CYAN, WHITE, GREEN][Math.floor(Math.random() * 4)]
    });
}

// ═══════════════════════════════════════════════════════════════
// DRAW FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// ─── Draw a futuristic anchor with holographic glow + orbital ring ───
function drawAnchor(x, y, size, rot, alpha, color, orbitalAngle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const s = size / 24;

    // === HOLOGRAPHIC AURA (layered glow rings) ===
    ctx.beginPath(); ctx.arc(0, -2*s, 16*s, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.015; ctx.fill();

    ctx.beginPath(); ctx.arc(0, -4*s, 12*s, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.03; ctx.fill();

    ctx.beginPath(); ctx.arc(0, -6*s, 8*s, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.05; ctx.fill();

    ctx.beginPath(); ctx.arc(0, -8*s, 5*s, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.07; ctx.fill();

    // === ORBITAL RING (rotating ellipse around the anchor) ===
    ctx.save();
    ctx.globalAlpha = alpha * 0.12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(0, -2*s, 14*s, 5*s, orbitalAngle, 0, Math.PI * 2);
    ctx.stroke();
    // Bright node traveling the orbital ring
    var orbDotAngle = orbitalAngle * 3;
    var odx = 14*s * Math.cos(orbDotAngle);
    var ody = 5*s * Math.sin(orbDotAngle);
    var cosO = Math.cos(orbitalAngle), sinO = Math.sin(orbitalAngle);
    var orbX = odx * cosO - ody * sinO;
    var orbY = -2*s + odx * sinO + ody * cosO;
    ctx.beginPath(); ctx.arc(orbX, orbY, 1.5, 0, Math.PI*2);
    ctx.fillStyle = WHITE; ctx.globalAlpha = alpha * 0.5; ctx.fill();
    ctx.restore();

    // === ANCHOR BODY ===
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;

    // Ring at top (shackle) — double-stroke futuristic
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, -9*s, 3.5*s, 0, Math.PI*2); ctx.stroke();
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = alpha * 0.3;
    ctx.beginPath(); ctx.arc(0, -9*s, 4.5*s, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = alpha;

    // Vertical shaft with parallel highlight
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(0, -5.5*s); ctx.lineTo(0, 11*s); ctx.stroke();
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = alpha * 0.25;
    ctx.beginPath(); ctx.moveTo(1.5, -5.5*s); ctx.lineTo(1.5, 11*s); ctx.stroke();
    ctx.globalAlpha = alpha;

    // Cross bar (stock)
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-8*s, 2*s); ctx.lineTo(8*s, 2*s); ctx.stroke();

    // Diamond + glow at stock endpoints 
    ctx.fillStyle = color;
    [-8, 8].forEach(function(dx) {
        ctx.beginPath(); ctx.arc(dx*s, 2*s, 3.5, 0, Math.PI*2);
        ctx.globalAlpha = alpha * 0.08; ctx.fill();
        ctx.globalAlpha = alpha * 0.8;
        ctx.beginPath();
        ctx.moveTo(dx*s, 2*s - 2.5); ctx.lineTo(dx*s + 2.5, 2*s);
        ctx.lineTo(dx*s, 2*s + 2.5); ctx.lineTo(dx*s - 2.5, 2*s);
        ctx.closePath(); ctx.fill();
    });

    ctx.globalAlpha = alpha;

    // Flukes (curved arms)
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-8*s, 2*s);
    ctx.quadraticCurveTo(-8*s, 10*s, -2*s, 11*s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8*s, 2*s);
    ctx.quadraticCurveTo(8*s, 10*s, 2*s, 11*s); ctx.stroke();

    // Fluke tips with micro-glow
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-2*s, 11*s); ctx.lineTo(-3.5*s, 13*s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2*s, 11*s); ctx.lineTo(3.5*s, 13*s); ctx.stroke();
    ctx.fillStyle = color;
    [-3.5, 3.5].forEach(function(tx) {
        ctx.beginPath(); ctx.arc(tx*s, 13*s, 2, 0, Math.PI*2);
        ctx.globalAlpha = alpha * 0.15; ctx.fill();
    });

    // === CORE NODE (pulsing bright center in shackle) ===
    ctx.beginPath(); ctx.arc(0, -9*s, 2*s, 0, Math.PI*2);
    ctx.fillStyle = WHITE; ctx.globalAlpha = alpha * 0.15; ctx.fill();
    ctx.beginPath(); ctx.arc(0, -9*s, 1.2*s, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.9; ctx.fill();

    ctx.restore();
}

// ─── Draw a futuristic chain link (glowing oval) ───
function drawChainLink(x, y, linkSize, rot, alpha, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    const rx = linkSize * 0.5;
    const ry = linkSize;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.25;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.4, ry * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

// ─── Draw an energy pulse dot traveling along the chain ───
function drawEnergyPulse(x, y, radius, alpha, color) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, radius * 5, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.06; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, radius * 2.5, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.15; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI*2);
    ctx.fillStyle = WHITE; ctx.globalAlpha = alpha * 0.7; ctx.fill();
    ctx.restore();
}

// ─── Draw network line between two points ───
function drawNetworkLine(x1, y1, x2, y2, alpha, color) {
    const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
    if (dist > 220) return;
    const fade = 1 - dist / 220;
    ctx.save();
    ctx.globalAlpha = alpha * fade * 0.12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
// ANIMATION LOOP
// ═══════════════════════════════════════════════════════════════

let time = 0;
function animate() {
    time++;
    ctx.clearRect(0, 0, W, H);

    // ── Subtle hex grid overlay ──
    ctx.save();
    ctx.globalAlpha = 0.018;
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 0.5;
    const gridSize = 70;
    for (let gx = 0; gx < W + gridSize; gx += gridSize) {
        const offset = (Math.floor(gx / gridSize) % 2) * (gridSize / 2);
        for (let gy = offset; gy < H + gridSize; gy += gridSize) {
            ctx.beginPath();
            for (let s = 0; s < 6; s++) {
                const angle = (Math.PI / 3) * s - Math.PI / 6;
                const hx = gx + 4 * Math.cos(angle);
                const hy = gy + 4 * Math.sin(angle);
                s === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
    ctx.restore();

    // ── Circuit traces with traveling pulse ──
    circuits.forEach(function(c) {
        c.pulsePos += c.pulseSpeed;
        if (c.pulsePos > 1) c.pulsePos = 0;
        ctx.save();
        ctx.globalAlpha = c.alpha;
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 0.5;

        var ex1 = c.seg1Dir === 'h' ? c.x + c.seg1Len : c.x;
        var ey1 = c.seg1Dir === 'h' ? c.y : c.y + c.seg1Len;
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(ex1, ey1); ctx.stroke();

        var ex2 = ex1, ey2 = ey1;
        if (c.hasBend) {
            ex2 = c.seg1Dir === 'h' ? ex1 : ex1 + c.seg2Len;
            ey2 = c.seg1Dir === 'h' ? ey1 + c.seg2Len : ey1;
            ctx.beginPath(); ctx.moveTo(ex1, ey1); ctx.lineTo(ex2, ey2); ctx.stroke();
            ctx.beginPath(); ctx.arc(ex1, ey1, c.dotRadius * 0.8, 0, Math.PI*2);
            ctx.fillStyle = c.color; ctx.globalAlpha = c.alpha * 0.5; ctx.fill();
        }

        ctx.beginPath(); ctx.arc(c.x, c.y, c.dotRadius, 0, Math.PI*2);
        ctx.fillStyle = c.color; ctx.globalAlpha = c.alpha * 0.5; ctx.fill();
        ctx.beginPath(); ctx.arc(ex2, ey2, c.dotRadius, 0, Math.PI*2);
        ctx.fillStyle = c.color; ctx.globalAlpha = c.alpha * 0.5; ctx.fill();

        var totalLen = c.seg1Len + c.seg2Len;
        var traveled = c.pulsePos * totalLen;
        var px, py;
        if (traveled <= c.seg1Len) {
            var t1 = traveled / c.seg1Len;
            px = c.x + (ex1 - c.x) * t1;
            py = c.y + (ey1 - c.y) * t1;
        } else {
            var t2 = (traveled - c.seg1Len) / (c.seg2Len || 1);
            px = ex1 + (ex2 - ex1) * Math.min(t2, 1);
            py = ey1 + (ey2 - ey1) * Math.min(t2, 1);
        }
        ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI*2);
        ctx.fillStyle = c.color; ctx.globalAlpha = c.alpha * 3; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2);
        ctx.fillStyle = c.color; ctx.globalAlpha = c.alpha * 0.25; ctx.fill();

        ctx.restore();
    });

    // ── Energy particles ──
    particles.forEach(function(p) {
        p.pulse += 0.025;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = W + 20;
        if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20;
        if (p.y > H + 20) p.y = -20;
        var a = p.alpha * (0.5 + 0.5 * Math.sin(p.pulse));
        ctx.save();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI*2);
        ctx.fillStyle = p.color; ctx.globalAlpha = a * 0.12; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
        ctx.fillStyle = p.color; ctx.globalAlpha = a; ctx.fill();
        ctx.restore();
    });

    // ── Blockchain nodes + network mesh ──
    nodes.forEach(function(n, i) {
        n.sway += n.swaySpeed;
        n.pulse += 0.02;
        n.y -= n.drift;
        n.x += Math.sin(n.sway) * 0.15;
        if (n.y < -30) { n.y = H + 30; n.x = Math.random() * W; }
        if (n.x < -30) n.x = W + 30;
        if (n.x > W + 30) n.x = -30;

        var pulseAlpha = n.alpha * (0.6 + 0.4 * Math.sin(n.pulse));

        ctx.save();
        ctx.beginPath(); ctx.arc(n.x, n.y, n.radius * 4, 0, Math.PI*2);
        ctx.fillStyle = n.color; ctx.globalAlpha = pulseAlpha * 0.06; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, n.radius, 0, Math.PI*2);
        ctx.fillStyle = n.color; ctx.globalAlpha = pulseAlpha; ctx.fill();
        ctx.restore();

        for (var j = i + 1; j < nodes.length; j++) {
            drawNetworkLine(n.x, n.y, nodes[j].x, nodes[j].y, Math.min(pulseAlpha, nodes[j].alpha), n.color);
        }
    });

    // ── Floating anchors with trailing chains + energy pulses ──
    anchors.forEach(function(a) {
        a.sway += a.swaySpeed;
        a.rot += a.rotSpeed;
        a.pulse += 0.012;
        a.orbitalPhase += a.orbitalSpeed;

        a.x += a.driftX + Math.sin(a.sway) * 0.3;
        a.y += a.driftY;

        if (a.y < -150) { a.y = H + 150; a.x = Math.random() * W; }
        if (a.x < -150) a.x = W + 150;
        if (a.x > W + 150) a.x = -150;

        var pulseAlpha = a.alpha * (0.7 + 0.3 * Math.sin(a.pulse));

        // Update chain — each link follows previous with wave motion
        if (a.chain.length > 0) {
            a.chain[0].x = a.x;
            a.chain[0].y = a.y + a.size * 0.55;
            for (var c = 1; c < a.chain.length; c++) {
                var prev = a.chain[c - 1];
                var cur = a.chain[c];
                var wave = Math.sin(time * 0.015 + cur.phase) * (2 + c * 0.3);
                var targetX = prev.x + wave;
                var targetY = prev.y + a.chainSpacing;
                cur.x += (targetX - cur.x) * 0.08;
                cur.y += (targetY - cur.y) * 0.08;
            }

            // Draw chain glow trail (diffuse glow behind the chain)
            ctx.save();
            ctx.globalAlpha = a.chainAlpha * 0.12;
            ctx.strokeStyle = a.color;
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(a.chain[0].x, a.chain[0].y);
            for (var cg = 1; cg < a.chain.length; cg++) {
                ctx.lineTo(a.chain[cg].x, a.chain[cg].y);
            }
            ctx.stroke();
            ctx.restore();

            // Draw chain links
            for (var c2 = 0; c2 < a.chain.length; c2++) {
                var link = a.chain[c2];
                var fadeOut = 1 - (c2 / a.chain.length) * 0.7;
                var linkRot = Math.atan2(
                    c2 > 0 ? link.y - a.chain[c2-1].y : 1,
                    c2 > 0 ? link.x - a.chain[c2-1].x : 0
                ) + Math.PI / 2;
                var orient = linkRot + (c2 % 2 === 0 ? 0 : Math.PI / 2);
                drawChainLink(link.x, link.y, a.chainLinkSize, orient, a.chainAlpha * fadeOut, a.color);
            }

            // Continuity line through chain
            ctx.save();
            ctx.globalAlpha = a.chainAlpha * 0.35;
            ctx.strokeStyle = a.color;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.chain[0].x, a.chain[0].y);
            for (var c3 = 1; c3 < a.chain.length; c3++) {
                ctx.lineTo(a.chain[c3].x, a.chain[c3].y);
            }
            ctx.stroke();
            ctx.restore();

            // === ENERGY PULSES traveling along chain ===
            a.energyPulses.forEach(function(ep) {
                ep.pos += ep.speed;
                if (ep.pos > 1) ep.pos = 0;

                var chainIdx = ep.pos * (a.chain.length - 1);
                var idx = Math.floor(chainIdx);
                var frac = chainIdx - idx;
                if (idx >= a.chain.length - 1) { idx = a.chain.length - 2; frac = 1; }
                var px = a.chain[idx].x + (a.chain[idx+1].x - a.chain[idx].x) * frac;
                var py = a.chain[idx].y + (a.chain[idx+1].y - a.chain[idx].y) * frac;
                drawEnergyPulse(px, py, 2, pulseAlpha * 0.8, a.color);
            });
        }

        drawAnchor(a.x, a.y, a.size, a.rot, pulseAlpha, a.color, a.orbitalPhase);
    });

    // ── Scanning line (blockchain sync pulse) ──
    var scanY = (time * 0.35) % (H + 100) - 50;
    ctx.save();
    var scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
    scanGrad.addColorStop(0, 'rgba(0,170,255,0)');
    scanGrad.addColorStop(0.5, 'rgba(0,170,255,0.035)');
    scanGrad.addColorStop(1, 'rgba(0,170,255,0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, scanY - 30, W, 60);
    ctx.restore();

    // ── Wave lines at bottom (nautical) ──
    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1;
    for (var w = 0; w < 3; w++) {
        ctx.beginPath();
        for (var x = 0; x <= W; x += 5) {
            var y = H - 20 - w * 14 + Math.sin(x * 0.006 + time * 0.008 + w * 1.3) * 12;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();

    requestAnimationFrame(animate);
}
animate();
})();
