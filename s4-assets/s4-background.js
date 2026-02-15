// ═══════════════════════════════════════════════════════════════════════
// S4 LEDGER — BLOCKCHAIN ANCHOR BACKGROUND ANIMATION v3
// Zero external dependencies. Shared across all pages.
// Theme: Futuristic blockchain + nautical anchors with trailing chains
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
const NUM_ANCHORS = Math.floor(6 * scale);
for (let i = 0; i < NUM_ANCHORS; i++) {
    // Each anchor has a trailing chain of links
    const chainLen = 12 + Math.floor(Math.random() * 16);
    const chain = [];
    const startX = Math.random() * 3000;
    const startY = Math.random() * 3000;
    for (let c = 0; c < chainLen; c++) {
        chain.push({ x: startX, y: startY + c * 14, phase: c * 0.25 });
    }
    anchors.push({
        x: startX,
        y: startY,
        size: 20 + Math.random() * 18,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.001,
        driftX: (Math.random() - 0.5) * 0.25,
        driftY: -(0.12 + Math.random() * 0.22),
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.003 + Math.random() * 0.004,
        alpha: 0.04 + Math.random() * 0.06,
        pulse: Math.random() * Math.PI * 2,
        color: [BLUE, CYAN, GOLD][Math.floor(Math.random() * 3)],
        chain: chain,
        chainSpacing: 12 + Math.random() * 6,
        chainLinkSize: 3 + Math.random() * 2,
        chainAlpha: 0.02 + Math.random() * 0.03
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
        alpha: 0.03 + Math.random() * 0.05,
        pulse: Math.random() * Math.PI * 2,
        color: [BLUE, GREEN, CYAN, PURPLE][Math.floor(Math.random() * 4)]
    });
}

// ─── HASH FRAGMENTS (floating hex strings) ───
const hexChars = '0123456789abcdef';
const fragments = [];
const NUM_FRAGS = Math.floor(16 * scale);
for (let i = 0; i < NUM_FRAGS; i++) {
    let len = 4 + Math.floor(Math.random() * 6);
    let txt = '';
    for (let j = 0; j < len; j++) txt += hexChars[Math.floor(Math.random() * 16)];
    fragments.push({
        x: Math.random() * 3000,
        y: Math.random() * 3000,
        txt: txt,
        alpha: 0.015 + Math.random() * 0.025,
        speed: 0.04 + Math.random() * 0.1,
        drift: Math.random() * Math.PI * 2,
        fontSize: 9 + Math.floor(Math.random() * 3)
    });
}

// ─── DATA STREAMS (vertical flowing hex columns — matrix style) ───
const streams = [];
const NUM_STREAMS = Math.floor(4 * scale);
for (let i = 0; i < NUM_STREAMS; i++) {
    const chars = [];
    const count = 10 + Math.floor(Math.random() * 14);
    for (let j = 0; j < count; j++) chars.push(hexChars[Math.floor(Math.random() * 16)]);
    streams.push({
        x: Math.random() * 3000,
        speed: 0.25 + Math.random() * 0.4,
        chars: chars,
        charCount: count,
        spacing: 14 + Math.floor(Math.random() * 4),
        alpha: 0.012 + Math.random() * 0.018,
        offset: Math.random() * 2000,
        color: Math.random() > 0.5 ? GREEN : CYAN
    });
}

// ─── CIRCUIT TRACES (L-shaped tech lines with traveling pulses) ───
const circuits = [];
const NUM_CIRCUITS = Math.floor(5 * scale);
for (let i = 0; i < NUM_CIRCUITS; i++) {
    const hasBend = Math.random() > 0.5;
    circuits.push({
        x: Math.random() * 3000,
        y: Math.random() * 3000,
        seg1Len: 60 + Math.random() * 160,
        seg1Dir: Math.random() > 0.5 ? 'h' : 'v',
        hasBend: hasBend,
        seg2Len: hasBend ? 40 + Math.random() * 100 : 0,
        alpha: 0.012 + Math.random() * 0.018,
        pulsePos: 0,
        pulseSpeed: 0.004 + Math.random() * 0.006,
        color: [BLUE, GOLD, CYAN][Math.floor(Math.random() * 3)],
        dotRadius: 1.5 + Math.random() * 1.5
    });
}

// ─── ENERGY PARTICLES (tiny bright dots that drift and fade) ───
const particles = [];
const NUM_PARTICLES = Math.floor(24 * scale);
for (let i = 0; i < NUM_PARTICLES; i++) {
    particles.push({
        x: Math.random() * 3000,
        y: Math.random() * 3000,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: 0.5 + Math.random() * 1.2,
        alpha: 0.02 + Math.random() * 0.04,
        pulse: Math.random() * Math.PI * 2,
        color: [BLUE, CYAN, WHITE, GREEN][Math.floor(Math.random() * 4)]
    });
}

// ═══════════════════════════════════════════════════════════════
// DRAW FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// ─── Draw a detailed anchor icon with glow ───
function drawAnchor(x, y, size, rot, alpha, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const s = size / 24;

    // Outer holographic glow ring
    ctx.beginPath(); ctx.arc(0, -8*s, 8*s, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.04; ctx.fill();

    // Second glow ring
    ctx.beginPath(); ctx.arc(0, -8*s, 5*s, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.06; ctx.fill();

    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;

    // Ring at top (shackle)
    ctx.beginPath(); ctx.arc(0, -9*s, 3.5*s, 0, Math.PI*2); ctx.stroke();

    // Vertical shaft (thicker)
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -5.5*s); ctx.lineTo(0, 11*s); ctx.stroke();

    // Cross bar (stock)
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-8*s, 2*s); ctx.lineTo(8*s, 2*s); ctx.stroke();

    // Diamond endpoints on stock
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = color;
    [-8, 8].forEach(function(dx) {
        ctx.beginPath();
        ctx.moveTo(dx*s, 2*s - 2); ctx.lineTo(dx*s + 2, 2*s);
        ctx.lineTo(dx*s, 2*s + 2); ctx.lineTo(dx*s - 2, 2*s);
        ctx.closePath(); ctx.fill();
    });

    ctx.globalAlpha = alpha;

    // Left fluke (arm) — curved
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-8*s, 2*s);
    ctx.quadraticCurveTo(-8*s, 10*s, -2*s, 11*s); ctx.stroke();

    // Right fluke (arm) — curved
    ctx.beginPath(); ctx.moveTo(8*s, 2*s);
    ctx.quadraticCurveTo(8*s, 10*s, 2*s, 11*s); ctx.stroke();

    // Bill/fluke tips (pointed ends)
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-2*s, 11*s); ctx.lineTo(-3.5*s, 13*s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2*s, 11*s); ctx.lineTo(3.5*s, 13*s); ctx.stroke();

    // Inner pulsing core (blockchain node dot)
    ctx.beginPath(); ctx.arc(0, -9*s, 1.5*s, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.8; ctx.fill();

    ctx.restore();
}

// ─── Draw a chain link (oval) ───
function drawChainLink(x, y, linkSize, rot, alpha, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    const rx = linkSize * 0.5;
    const ry = linkSize;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Inner highlight
    ctx.globalAlpha = alpha * 0.3;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.5, ry * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

// ─── Draw network line between two points ───
function drawNetworkLine(x1, y1, x2, y2, alpha, color) {
    const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
    if (dist > 200) return;
    const fade = 1 - dist / 200;
    ctx.save();
    ctx.globalAlpha = alpha * fade * 0.1;
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
    ctx.globalAlpha = 0.008;
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

        // First segment
        var ex1 = c.seg1Dir === 'h' ? c.x + c.seg1Len : c.x;
        var ey1 = c.seg1Dir === 'h' ? c.y : c.y + c.seg1Len;
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(ex1, ey1); ctx.stroke();

        // Second segment (bend)
        var ex2 = ex1, ey2 = ey1;
        if (c.hasBend) {
            ex2 = c.seg1Dir === 'h' ? ex1 : ex1 + c.seg2Len;
            ey2 = c.seg1Dir === 'h' ? ey1 + c.seg2Len : ey1;
            ctx.beginPath(); ctx.moveTo(ex1, ey1); ctx.lineTo(ex2, ey2); ctx.stroke();
            ctx.beginPath(); ctx.arc(ex1, ey1, c.dotRadius * 0.8, 0, Math.PI*2);
            ctx.fillStyle = c.color; ctx.globalAlpha = c.alpha * 0.4; ctx.fill();
        }

        // Endpoint dots
        ctx.beginPath(); ctx.arc(c.x, c.y, c.dotRadius, 0, Math.PI*2);
        ctx.fillStyle = c.color; ctx.globalAlpha = c.alpha * 0.4; ctx.fill();
        ctx.beginPath(); ctx.arc(ex2, ey2, c.dotRadius, 0, Math.PI*2);
        ctx.fillStyle = c.color; ctx.globalAlpha = c.alpha * 0.4; ctx.fill();

        // Traveling pulse dot
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
        ctx.fillStyle = c.color; ctx.globalAlpha = c.alpha * 2.5; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2);
        ctx.fillStyle = c.color; ctx.globalAlpha = c.alpha * 0.3; ctx.fill();

        ctx.restore();
    });

    // ── Data streams (vertical hex columns) ──
    streams.forEach(function(s) {
        s.offset += s.speed;
        ctx.save();
        ctx.font = '10px monospace';
        ctx.fillStyle = s.color;
        for (var i = 0; i < s.charCount; i++) {
            var y = ((s.offset + i * s.spacing) % (H + 100)) - 50;
            var fade = 1 - (i / s.charCount);
            ctx.globalAlpha = s.alpha * fade;
            ctx.fillText(s.chars[i], s.x, y);
            if (Math.random() < 0.003) {
                s.chars[i] = hexChars[Math.floor(Math.random() * 16)];
            }
        }
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
        ctx.fillStyle = p.color; ctx.globalAlpha = a * 0.15; ctx.fill();
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

    // ── Floating anchors with trailing chains ──
    anchors.forEach(function(a) {
        a.sway += a.swaySpeed;
        a.rot += a.rotSpeed;
        a.pulse += 0.012;

        a.x += a.driftX + Math.sin(a.sway) * 0.3;
        a.y += a.driftY;

        if (a.y < -120) { a.y = H + 120; a.x = Math.random() * W; }
        if (a.x < -120) a.x = W + 120;
        if (a.x > W + 120) a.x = -120;

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

            // Draw chain links
            for (var c2 = 0; c2 < a.chain.length; c2++) {
                var link = a.chain[c2];
                var fadeOut = 1 - (c2 / a.chain.length);
                var linkRot = Math.atan2(
                    c2 > 0 ? link.y - a.chain[c2-1].y : 1,
                    c2 > 0 ? link.x - a.chain[c2-1].x : 0
                ) + Math.PI / 2;
                var orient = linkRot + (c2 % 2 === 0 ? 0 : Math.PI / 2);
                drawChainLink(link.x, link.y, a.chainLinkSize, orient, a.chainAlpha * fadeOut, a.color);
            }

            // Continuity line through chain
            ctx.save();
            ctx.globalAlpha = a.chainAlpha * 0.3;
            ctx.strokeStyle = a.color;
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.moveTo(a.chain[0].x, a.chain[0].y);
            for (var c3 = 1; c3 < a.chain.length; c3++) {
                ctx.lineTo(a.chain[c3].x, a.chain[c3].y);
            }
            ctx.stroke();
            ctx.restore();
        }

        drawAnchor(a.x, a.y, a.size, a.rot, pulseAlpha, a.color);
    });

    // ── Floating hash fragments ──
    fragments.forEach(function(f) {
        f.drift += 0.001;
        f.y -= f.speed;
        f.x += Math.sin(f.drift) * 0.1;
        if (f.y < -20) {
            f.y = H + 20; f.x = Math.random() * W;
            var t = '';
            var len = 4 + Math.floor(Math.random() * 6);
            for (var j = 0; j < len; j++) t += hexChars[Math.floor(Math.random() * 16)];
            f.txt = t;
        }
        ctx.save();
        ctx.globalAlpha = f.alpha;
        ctx.font = f.fontSize + 'px monospace';
        ctx.fillStyle = GOLD;
        ctx.fillText(f.txt, f.x, f.y);
        ctx.restore();
    });

    // ── Scanning line (blockchain sync pulse) ──
    var scanY = (time * 0.35) % (H + 100) - 50;
    ctx.save();
    var scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
    scanGrad.addColorStop(0, 'rgba(0,170,255,0)');
    scanGrad.addColorStop(0.5, 'rgba(0,170,255,0.018)');
    scanGrad.addColorStop(1, 'rgba(0,170,255,0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, scanY - 30, W, 60);
    ctx.restore();

    // ── Wave lines at bottom (nautical) ──
    ctx.save();
    ctx.globalAlpha = 0.018;
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
