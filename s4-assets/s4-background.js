// ═══════════════════════════════════════════════════════════════════════
// S4 LEDGER — BLOCKCHAIN ANCHOR BACKGROUND ANIMATION v2
// Zero external dependencies. Shared across all pages.
// Theme: Futuristic blockchain meets nautical anchor
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

// ─── Performance: reduce counts on mobile ───
const isMobile = window.innerWidth < 768;
const scale = isMobile ? 0.5 : 1;

// ─── FLOATING ANCHORS (nautical + blockchain nodes) ───
const anchors = [];
const NUM_ANCHORS = Math.floor(8 * scale);
for (let i = 0; i < NUM_ANCHORS; i++) {
    anchors.push({
        x: Math.random() * 3000,
        y: Math.random() * 3000,
        size: 16 + Math.random() * 22,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.0015,
        drift: 0.08 + Math.random() * 0.18,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.002 + Math.random() * 0.003,
        alpha: 0.03 + Math.random() * 0.05,
        pulse: Math.random() * Math.PI * 2,
        color: Math.random() > 0.3 ? BLUE : CYAN
    });
}

// ─── BLOCKCHAIN NODES (pulsing network dots) ───
const nodes = [];
const NUM_NODES = Math.floor(16 * scale);
for (let i = 0; i < NUM_NODES; i++) {
    nodes.push({
        x: Math.random() * 3000,
        y: Math.random() * 3000,
        radius: 1.5 + Math.random() * 2.5,
        drift: 0.06 + Math.random() * 0.12,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.001 + Math.random() * 0.003,
        alpha: 0.04 + Math.random() * 0.06,
        pulse: Math.random() * Math.PI * 2,
        color: [BLUE, GREEN, CYAN, PURPLE][Math.floor(Math.random() * 4)]
    });
}

// ─── HASH FRAGMENTS (floating hex strings) ───
const hexChars = '0123456789abcdef';
const fragments = [];
const NUM_FRAGS = Math.floor(20 * scale);
for (let i = 0; i < NUM_FRAGS; i++) {
    let len = 4 + Math.floor(Math.random() * 5);
    let txt = '';
    for (let j = 0; j < len; j++) txt += hexChars[Math.floor(Math.random() * 16)];
    fragments.push({
        x: Math.random() * 3000,
        y: Math.random() * 3000,
        txt: txt,
        alpha: 0.02 + Math.random() * 0.035,
        speed: 0.05 + Math.random() * 0.12,
        drift: Math.random() * Math.PI * 2,
        fontSize: 9 + Math.floor(Math.random() * 3)
    });
}

// ─── BLOCKCHAIN BLOCKS (small rotating squares) ───
const blocks = [];
const NUM_BLOCKS = Math.floor(6 * scale);
for (let i = 0; i < NUM_BLOCKS; i++) {
    blocks.push({
        x: Math.random() * 3000,
        y: Math.random() * 3000,
        size: 6 + Math.random() * 10,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.004,
        drift: 0.04 + Math.random() * 0.1,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.001 + Math.random() * 0.002,
        alpha: 0.03 + Math.random() * 0.04,
        color: Math.random() > 0.5 ? GOLD : BLUE
    });
}

// ─── DATA STREAMS (vertical flowing hex columns) ───
const streams = [];
const NUM_STREAMS = Math.floor(5 * scale);
for (let i = 0; i < NUM_STREAMS; i++) {
    const chars = [];
    const count = 8 + Math.floor(Math.random() * 12);
    for (let j = 0; j < count; j++) chars.push(hexChars[Math.floor(Math.random() * 16)]);
    streams.push({
        x: Math.random() * 3000,
        speed: 0.3 + Math.random() * 0.5,
        chars: chars,
        charCount: count,
        spacing: 14 + Math.floor(Math.random() * 4),
        alpha: 0.015 + Math.random() * 0.02,
        offset: Math.random() * 2000,
        color: Math.random() > 0.5 ? GREEN : CYAN
    });
}

// ─── CIRCUIT TRACES (horizontal & vertical tech lines) ───
const circuits = [];
const NUM_CIRCUITS = Math.floor(4 * scale);
for (let i = 0; i < NUM_CIRCUITS; i++) {
    const isHoriz = Math.random() > 0.5;
    circuits.push({
        x: Math.random() * 3000,
        y: Math.random() * 3000,
        length: 80 + Math.random() * 200,
        isHoriz: isHoriz,
        alpha: 0.015 + Math.random() * 0.02,
        pulsePos: 0,
        pulseSpeed: 0.005 + Math.random() * 0.008,
        color: Math.random() > 0.6 ? BLUE : GOLD,
        dotRadius: 2 + Math.random() * 2
    });
}

// ─── DRAW: Anchor icon (enhanced with glow ring) ───
function drawAnchor(x, y, size, rot, alpha, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const s = size / 24;
    // Outer glow ring (blockchain node feel)
    ctx.beginPath(); ctx.arc(0, -8*s, 6*s, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.08; ctx.fill();
    ctx.globalAlpha = alpha;
    // Ring at top
    ctx.beginPath(); ctx.arc(0, -8*s, 3*s, 0, Math.PI*2); ctx.stroke();
    // Vertical shaft
    ctx.beginPath(); ctx.moveTo(0, -5*s); ctx.lineTo(0, 10*s); ctx.stroke();
    // Cross bar
    ctx.beginPath(); ctx.moveTo(-7*s, 2*s); ctx.lineTo(7*s, 2*s); ctx.stroke();
    // Left fluke
    ctx.beginPath(); ctx.moveTo(-7*s, 2*s); ctx.quadraticCurveTo(-7*s, 9*s, -2*s, 10*s); ctx.stroke();
    // Right fluke
    ctx.beginPath(); ctx.moveTo(7*s, 2*s); ctx.quadraticCurveTo(7*s, 9*s, 2*s, 10*s); ctx.stroke();
    // Inner dot (blockchain node)
    ctx.beginPath(); ctx.arc(0, -8*s, 1.2*s, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.6; ctx.fill();
    ctx.restore();
}

// ─── DRAW: Blockchain block (rounded square with #) ───
function drawBlock(x, y, size, rot, alpha, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    const h = size / 2;
    ctx.beginPath();
    ctx.moveTo(-h + 2, -h); ctx.lineTo(h - 2, -h);
    ctx.quadraticCurveTo(h, -h, h, -h + 2);
    ctx.lineTo(h, h - 2);
    ctx.quadraticCurveTo(h, h, h - 2, h);
    ctx.lineTo(-h + 2, h);
    ctx.quadraticCurveTo(-h, h, -h, h - 2);
    ctx.lineTo(-h, -h + 2);
    ctx.quadraticCurveTo(-h, -h, -h + 2, -h);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.5;
    ctx.font = Math.floor(size * 0.55) + 'px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('#', 0, 1);
    ctx.restore();
}

// ─── DRAW: Chain link between two points ───
function drawChainLink(x1, y1, x2, y2, alpha) {
    const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
    if (dist > 280) return;
    const fade = 1 - dist / 280;
    ctx.save();
    ctx.globalAlpha = alpha * fade * 0.35;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 8]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
    const dots = Math.floor(dist / 28);
    for (let i = 1; i < dots; i++) {
        const t = i / dots;
        const px = x1 + (x2-x1)*t, py = y1 + (y2-y1)*t;
        ctx.beginPath(); ctx.arc(px, py, 0.8, 0, Math.PI*2);
        ctx.fillStyle = GOLD; ctx.globalAlpha = alpha * fade * 0.2;
        ctx.fill();
    }
    ctx.restore();
}

// ─── DRAW: Network mesh between nodes ───
function drawNetworkLine(x1, y1, x2, y2, alpha, color) {
    const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
    if (dist > 220) return;
    const fade = 1 - dist / 220;
    ctx.save();
    ctx.globalAlpha = alpha * fade * 0.12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
}

// ─── ANIMATION LOOP ───
let time = 0;
function animate() {
    time++;
    ctx.clearRect(0, 0, W, H);

    // ── Hex grid overlay (very subtle) ──
    ctx.save();
    ctx.globalAlpha = 0.01;
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 0.5;
    const gridSize = 65;
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
    circuits.forEach(c => {
        c.pulsePos += c.pulseSpeed;
        if (c.pulsePos > 1) c.pulsePos = 0;
        ctx.save();
        ctx.globalAlpha = c.alpha;
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 0.6;
        const ex = c.isHoriz ? c.x + c.length : c.x;
        const ey = c.isHoriz ? c.y : c.y + c.length;
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(ex, ey); ctx.stroke();
        // Endpoints
        ctx.beginPath(); ctx.arc(c.x, c.y, c.dotRadius, 0, Math.PI*2);
        ctx.fillStyle = c.color; ctx.globalAlpha = c.alpha * 0.5; ctx.fill();
        ctx.beginPath(); ctx.arc(ex, ey, c.dotRadius, 0, Math.PI*2);
        ctx.fillStyle = c.color; ctx.globalAlpha = c.alpha * 0.5; ctx.fill();
        // Traveling pulse dot
        const px = c.x + (ex - c.x) * c.pulsePos;
        const py = c.y + (ey - c.y) * c.pulsePos;
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2);
        ctx.fillStyle = c.color; ctx.globalAlpha = c.alpha * 2; ctx.fill();
        ctx.restore();
    });

    // ── Data streams (matrix-style hex columns) ──
    streams.forEach(s => {
        s.offset += s.speed;
        ctx.save();
        ctx.font = '10px monospace';
        ctx.fillStyle = s.color;
        for (let i = 0; i < s.charCount; i++) {
            const y = ((s.offset + i * s.spacing) % (H + 100)) - 50;
            const fade = 1 - (i / s.charCount);
            ctx.globalAlpha = s.alpha * fade;
            ctx.fillText(s.chars[i], s.x, y);
            if (Math.random() < 0.002) {
                s.chars[i] = hexChars[Math.floor(Math.random() * 16)];
            }
        }
        ctx.restore();
    });

    // ── Blockchain nodes + network mesh ──
    nodes.forEach((n, i) => {
        n.sway += n.swaySpeed;
        n.pulse += 0.02;
        n.y -= n.drift;
        n.x += Math.sin(n.sway) * 0.2;
        if (n.y < -30) { n.y = H + 30; n.x = Math.random() * W; }
        if (n.x < -30) n.x = W + 30;
        if (n.x > W + 30) n.x = -30;

        const pulseAlpha = n.alpha * (0.7 + 0.3 * Math.sin(n.pulse));

        ctx.save();
        // Outer glow
        ctx.beginPath(); ctx.arc(n.x, n.y, n.radius * 3.5, 0, Math.PI*2);
        ctx.fillStyle = n.color; ctx.globalAlpha = pulseAlpha * 0.1; ctx.fill();
        // Core dot
        ctx.beginPath(); ctx.arc(n.x, n.y, n.radius, 0, Math.PI*2);
        ctx.fillStyle = n.color; ctx.globalAlpha = pulseAlpha; ctx.fill();
        ctx.restore();

        // Network mesh
        for (let j = i + 1; j < nodes.length; j++) {
            drawNetworkLine(n.x, n.y, nodes[j].x, nodes[j].y, Math.min(pulseAlpha, nodes[j].alpha), n.color);
        }
    });

    // ── Floating anchors ──
    anchors.forEach((a, i) => {
        a.sway += a.swaySpeed;
        a.rot += a.rotSpeed;
        a.pulse += 0.015;
        a.y -= a.drift;
        a.x += Math.sin(a.sway) * 0.25;
        if (a.y < -60) { a.y = H + 60; a.x = Math.random() * W; }
        if (a.x < -60) a.x = W + 60;
        if (a.x > W + 60) a.x = -60;

        const pulseAlpha = a.alpha * (0.8 + 0.2 * Math.sin(a.pulse));
        drawAnchor(a.x, a.y, a.size, a.rot, pulseAlpha, a.color);

        // Chain links between anchors
        for (let j = i + 1; j < anchors.length; j++) {
            drawChainLink(a.x, a.y, anchors[j].x, anchors[j].y, Math.min(pulseAlpha, anchors[j].alpha));
        }
    });

    // ── Blockchain blocks ──
    blocks.forEach(b => {
        b.sway += b.swaySpeed;
        b.rot += b.rotSpeed;
        b.y -= b.drift;
        b.x += Math.sin(b.sway) * 0.15;
        if (b.y < -30) { b.y = H + 30; b.x = Math.random() * W; }
        if (b.x < -30) b.x = W + 30;
        if (b.x > W + 30) b.x = -30;
        drawBlock(b.x, b.y, b.size, b.rot, b.alpha, b.color);
    });

    // ── Floating hash fragments ──
    fragments.forEach(f => {
        f.drift += 0.0015;
        f.y -= f.speed;
        f.x += Math.sin(f.drift) * 0.12;
        if (f.y < -20) {
            f.y = H + 20; f.x = Math.random() * W;
            let t = '';
            const len = 4 + Math.floor(Math.random() * 5);
            for (let j = 0; j < len; j++) t += hexChars[Math.floor(Math.random() * 16)];
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
    const scanY = (time * 0.4) % (H + 100) - 50;
    ctx.save();
    const scanGrad = ctx.createLinearGradient(0, scanY - 25, 0, scanY + 25);
    scanGrad.addColorStop(0, 'rgba(0,170,255,0)');
    scanGrad.addColorStop(0.5, 'rgba(0,170,255,0.025)');
    scanGrad.addColorStop(1, 'rgba(0,170,255,0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, scanY - 25, W, 50);
    ctx.restore();

    // ── Subtle wave lines at bottom (nautical) ──
    ctx.save();
    ctx.globalAlpha = 0.02;
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1;
    for (let w = 0; w < 3; w++) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 5) {
            const y = H - 25 - w * 12 + Math.sin(x * 0.007 + time * 0.01 + w * 1.2) * 10;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();

    requestAnimationFrame(animate);
}
animate();
})();
