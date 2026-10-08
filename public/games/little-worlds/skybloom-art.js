import { W, BUMPERS, WALLS, SLINGS, TARGETS, LANES, flipper, rampPosition, UPPER_WALLS, UPPER_BUMPERS, upperFlipper } from './skybloom-rules.mjs';

const H = 800;
const TAU = Math.PI * 2;

export function createRenderer(canvas, reduced = false) {
  const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = W * dpr; canvas.height = 900 * dpr;
  const c = canvas.getContext('2d'); c.scale(dpr, dpr);
  const lower = document.createElement('canvas'), painter = createLowerRenderer(lower, reduced);
  function draw(s, controls, charge = 0) {
    painter.draw({ ...s, balls: s.balls.filter(b => b.deck === 0), events: s.events.filter(e => !e.label.startsWith('STAR ')) }, controls, charge);
    const open = s.stage >= 3 ? reduced ? 1 : Math.min(1, Math.max(0, (s.time - s.upgradeAt) / .9)) : 0;
    const eased = open * open * (3 - 2 * open), scale = 1 - .27 * eased;
    const bg = c.createLinearGradient(0, 0, 480, 900); bg.addColorStop(0, '#1b1c32'); bg.addColorStop(1, '#080f1e');
    c.fillStyle = bg; c.fillRect(0, 0, 480, 900);
    for (let i = 0; i < 40; i++) { const x = (i * 137) % 480, y = (i * 173) % 900; disk(c, x, y, i % 4 ? .6 : 1.3, '#c6bbdc66'); }
    if (open > 0) {
      c.save(); c.globalAlpha = eased; c.translate(24, 5); c.scale(.9, .9); paintUpper(c, s, controls, reduced); c.restore();
      rail(c, p => { p.moveTo(420, 255); p.bezierCurveTo(462, 270, 438, 368, 402, 468); }, 3);
      label(c, s.balls.some(b => b.deck === 1) ? '↑ UPPER GARDEN · 같은 ← → 로 조작' : '↑ LIFT를 맞혀 위층으로', 240, 297, 10, '#dac7ea');
    } else {
      label(c, 'A GARDEN THAT GROWS WITH YOU', 240, 24, 9, '#cbb8d5', 2);
      label(c, s.stage === 1 ? '1,500 PT → NEW BUMPERS + SPINNER' : '5,000 PT → UPPER GARDEN', 240, 43, 10, '#e2c098', 1);
    }
    c.drawImage(lower, 0, 0, lower.width, lower.height, (480 - 480 * scale) / 2, 60 + 242 * eased, 480 * scale, 800 * scale);
    if (s.time - s.upgradeAt < 2.8 && s.stage > 1) {
      const alpha = Math.min(1, (2.8 - (s.time - s.upgradeAt)) * 2); c.globalAlpha = alpha;
      box(c, 56, 402, 368, 67, 16, '#181629e8'); stroke(c, p => p.roundRect(56, 402, 368, 67, 16), '#dcc18a', 1);
      label(c, s.stage === 2 ? 'WORKSHOP UNLOCKED' : 'UPPER GARDEN UNLOCKED', 240, 429, 16, '#f3dcab', 1);
      label(c, s.stage === 2 ? '두 개의 범퍼와 스피너가 깨어납니다' : '새 플레이필드와 두 개의 플리퍼가 펼쳐집니다', 240, 452, 11, '#d9cae5'); c.globalAlpha = 1;
    }
    if (s.festivalUntil > s.time) {
      const time = Math.ceil(s.festivalUntil - s.time);
      box(c, 58, 7, 364, 29, 12, '#522f62e8'); label(c, `STARFALL FESTIVAL · ${time}s · JACKPOT ${s.jackpots}`, 240, 27, 12, '#ffdf9e');
    }
  }
  return { draw };
}

function star(c, x, y, r, color) {
  c.fillStyle = color; c.beginPath();
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, radius = i % 2 ? r * .45 : r; const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius; i ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.closePath(); c.fill();
}
function paintUpper(c, s, controls, reduced) {
  const g = c.createLinearGradient(0, 0, 0, 320); g.addColorStop(0, '#625074'); g.addColorStop(.4, '#343955'); g.addColorStop(1, '#1b2c40');
  box(c, 8, 3, 464, 313, 25, '#8e7b68'); box(c, 13, 8, 454, 303, 21, g);
  glow(c, 240, 100, 145, '#ce9ad444'); label(c, 'THE CELESTIAL CONSERVATORY', 240, 22, 8, '#e5d4ad', 1);
  for (let i = 0; i < 26; i++) { const x = 64 + i * 197 % 352, y = 48 + i * 97 % 160; star(c, x, y, i % 5 ? 1.8 : 3, '#e7d8bb77'); }
  for (const wall of UPPER_WALLS) rail(c, p => { p.moveTo(wall[0], wall[1]); p.lineTo(wall[2], wall[3]); }, 5);
  stroke(c, p => { p.moveTo(142, 110); p.lineTo(240, 75); p.lineTo(338, 110); }, '#ccb9e144', 1);
  for (let i = 0; i < UPPER_BUMPERS.length; i++) {
    const p = UPPER_BUMPERS[i], lit = s.stars[i], hot = s.time - (s.flashes['upper' + i] ?? -9) < .3;
    glow(c, p.x, p.y, 47, lit || hot ? '#ffd37b66' : '#ab99d033');
    disk(c, p.x + 2, p.y + 6, p.r + 5, '#0005'); disk(c, p.x, p.y, p.r + 3, metal(c, p.y, 24));
    disk(c, p.x, p.y, p.r, lit ? '#ddba79' : '#514962'); star(c, p.x, p.y, 13, lit ? '#fff6c9' : '#c7b8dd');
  }
  label(c, 'COLLECT THREE STARS', 240, 175, 10, '#decab4', 2);
  for (let i = 0; i < 3; i++) star(c, 213 + i * 27, 194, 7, s.stars[i] ? '#ffdf9a' : '#746c80');
  for (let i = 0; i < 2; i++) {
    const f = upperFlipper(s, i), path = p => { p.moveTo(f.x, f.y); p.lineTo(f.ex, f.ey); };
    stroke(c, path, '#0007', 23); stroke(c, path, '#cbae79', 19); stroke(c, path, '#e7b8c5', 12);
    stroke(c, path, controls[i ? 'right' : 'left'] && s.time >= s.tiltUntil ? '#fff2b9' : '#dbc8d9', 2); screw(c, f.x, f.y);
  }
  label(c, '↓ SAFE RETURN TO THE GARDEN', 240, 305, 8, '#c9bdc5', 1);
  for (const b of s.balls) if (b.deck === 1) chromeBall(c, b.x, b.y, 1.12);
  if (!reduced && s.time - s.upgradeAt < 2) for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + s.time; star(c, 240 + Math.cos(a) * 160, 145 + Math.sin(a) * 75, 3, '#ffe7aa'); }
}

function drawMachinery(c, s, reduced) {
  if (s.stage < 2) return;
  const a = s.spinnerUntil > s.time && !reduced ? s.time * 19 : .25;
  rail(c, p => { p.moveTo(190, 397); p.lineTo(190, 389); p.moveTo(260, 397); p.lineTo(260, 389); }, 3);
  c.save(); c.translate(225, 393); c.scale(Math.max(.12, Math.abs(Math.cos(a))), 1);
  box(c, -27, -9, 54, 18, 6, '#cdb38e'); star(c, 0, 0, 7, '#655276'); c.restore();
  if (!s.machinery) for (const p of BUMPERS.slice(3)) { c.globalAlpha = .35; stroke(c, a => a.arc(p.x, p.y, p.r + 6, 0, TAU), '#ecd3ac', 2); c.globalAlpha = 1; }
}
function disk(c, x, y, r, color) { c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function ellipse(c, x, y, rx, ry, color, angle = 0) { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, angle, 0, TAU); c.fill(); }
function box(c, x, y, w, h, r, color) { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }
function label(c, value, x, y, size = 10, color = '#a8c5ba', spacing = 0) {
  c.fillStyle = color; c.textAlign = 'center'; c.font = `600 ${size}px "Segoe UI",sans-serif`;
  if ('letterSpacing' in c) c.letterSpacing = spacing + 'px'; c.fillText(value, x, y); if ('letterSpacing' in c) c.letterSpacing = '0px';
}
function glow(c, x, y, radius, color) {
  const g = c.createRadialGradient(x, y, 0, x, y, radius); g.addColorStop(0, color); g.addColorStop(1, '#0000'); disk(c, x, y, radius, g);
}
function stroke(c, path, color, width) { c.beginPath(); path(c); c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }
function metal(c, y, span = 16) {
  const g = c.createLinearGradient(0, y - span, 0, y + span);
  g.addColorStop(0, '#322d22'); g.addColorStop(.23, '#9d8555'); g.addColorStop(.39, '#f9e6aa'); g.addColorStop(.49, '#bf9a5e'); g.addColorStop(.68, '#4a4030'); g.addColorStop(1, '#c8a26c'); return g;
}
function screw(c, x, y) { disk(c, x + 1, y + 2, 4, '#0009'); disk(c, x, y, 3.6, metal(c, y, 4)); stroke(c, p => { p.moveTo(x - 2, y + 1); p.lineTo(x + 2, y - 1); }, '#171e1a', 1); }
function rail(c, path, width = 8) {
  c.save(); c.translate(2, 5); stroke(c, path, '#0008', width + 3); c.restore();
  stroke(c, path, '#273a35', width + 3); stroke(c, path, '#b29b70', width); stroke(c, path, '#eddeb2', 1.4);
}
function leaf(c, x, y, angle, scale, color = '#729585') {
  c.save(); c.translate(x, y); c.rotate(angle); c.scale(scale, scale);
  c.fillStyle = color; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-14, -11, -10, -23, 0, -34); c.bezierCurveTo(10, -23, 14, -11, 0, 0); c.fill();
  stroke(c, p => { p.moveTo(0, 0); p.lineTo(0, -30); }, '#cbddb44a', .65); c.restore();
}
function vine(c, x, y, sign = 1) {
  stroke(c, p => { p.moveTo(x, y); p.bezierCurveTo(x - sign * 28, y - 34, x + sign * 40, y - 72, x + sign * 2, y - 122); }, '#8e9c6570', 1);
  for (let i = 0; i < 5; i++) leaf(c, x + Math.sin(i * 1.4) * sign * 12, y - i * 22, sign * (i % 2 ? .9 : -.65), .52, '#74958162');
}
function polygon(c, points) { c.moveTo(...points[0]); points.slice(1).forEach(p => c.lineTo(...p)); c.closePath(); }

function createLowerRenderer(canvas, reduced = false) {
  const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = W * dpr; canvas.height = H * dpr;
  const c = canvas.getContext('2d'); c.scale(dpr, dpr);
  const backdrop = document.createElement('canvas'); backdrop.width = W * dpr; backdrop.height = H * dpr;
  const b = backdrop.getContext('2d'); b.scale(dpr, dpr); paintCabinet(b);
  const trails = new Map();
  function draw(s, controls, charge = 0) {
    c.drawImage(backdrop, 0, 0, W, H);
    const bloom = s.frenzy > s.time, pulse = reduced ? .65 : .65 + Math.sin(s.time * 2) * .15;
    // Lamps are rendered over the etched playfield; mechanics share the physics geometry.
    for (let i = 0; i < LANES.length; i++) {
      const x = LANES[i], active = s.lanes[i];
      glow(c, x, 105, 24, active ? '#f6c87266' : '#65baa011');
      box(c, x - 18, 89, 36, 25, 12, active ? '#d6b579' : '#153b38');
      label(c, 'GROW'[i], x, 106, 12, active ? '#24312a' : '#83b7a5');
      if (s.skill && i === s.skillLane) { star(c, x, 78, 5, '#ffdc92'); label(c, 'SKILL', x, 66, 6, '#ffdc92'); }
    }
    for (let i = 0; i < (s.machinery ? BUMPERS.length : 3); i++) {
      const p = BUMPERS[i], hot = s.time - (s.flashes['bumper' + i] ?? -9), hit = Math.max(0, 1 - hot / .4);
      const color = i === 1 ? '#eba5c4' : i === 2 ? '#e7cc8b' : '#b3cbea';
      glow(c, p.x, p.y, p.r + 39 + hit * 25, i === 1 ? '#df73bc35' : '#80ffe331');
      flower(c, p.x, p.y, p.r, color, hit, s.time, reduced);
      if (s.festivalUntil > s.time && i === s.jackpotTarget) { stroke(c, a => a.arc(p.x, p.y, p.r + 11, 0, TAU), '#fff2ad', 3); label(c, 'JACKPOT', p.x, p.y - p.r - 15, 9, '#fff2ad'); }
      if (hit > 0 && !reduced) { c.globalAlpha = hit; stroke(c, a => a.arc(p.x, p.y, p.r + 8 + (1 - hit) * 28, 0, TAU), color, 2); c.globalAlpha = 1; }
    }
    for (let i = 0; i < TARGETS.length; i++) {
      const t = TARGETS[i], active = s.targets[i], color = active ? '#efd195' : '#38776c';
      if (active) glow(c, t.x, t.y, 24, '#e5cd6544');
      box(c, t.x - 5, t.y - 13, 10, 26, 3, '#081f20'); box(c, t.x - 3, t.y - 11, 6, 21, 2, color);
      box(c, t.x - 2, t.y - 10, 2, 18, 1, active ? '#fff3d0' : '#7eae96');
    }
    for (let i = 0; i < SLINGS.length; i++) {
      const active = s.time - (s.flashes['sling' + i] ?? -9) < .18;
      stroke(c, p => polygon(p, SLINGS[i]), active ? '#ffe5cb' : '#bd8d9f', active ? 4 : 2);
      if (active) glow(c, i ? 327 : 115, 585, 52, '#d694ba44');
    }
    for (let i = 0; i < 2; i++) {
      const f = flipper(s, i); const path = p => { p.moveTo(f.x, f.y); p.lineTo(f.ex, f.ey); };
      c.save(); c.translate(2, 5); stroke(c, path, '#000b', 25); c.restore();
      stroke(c, path, '#27332a', 23); stroke(c, path, '#b79356', 20); stroke(c, path, metal(c, (f.y + f.ey) / 2, 25), 16);
      stroke(c, path, controls[i ? 'right' : 'left'] && s.time >= s.tiltUntil ? '#fff6bd' : '#adceae', 3);
      disk(c, f.x, f.y, 10, '#c5aa73'); disk(c, f.x, f.y, 6.5, '#243e36'); screw(c, f.x, f.y);
    }
    drawMachinery(c, s, reduced);
    const rampLit = s.balls.some(ball => ball.ramp >= 0);
    wireform(c, rampLit, s.time, reduced);
    glow(c, 352, 448, 32, '#b598e544'); ellipse(c, 352, 448, 25, 16, '#101520');
    stroke(c, p => p.ellipse(352, 448, 25, 16, 0, 0, TAU), rampLit ? '#f6d3ff' : '#b998ca', 2.5);
    label(c, s.stage >= 3 ? 'LIFT ↑' : 'ORBIT', 352, 451, 8, '#d6b8db', 1.2);
    for (let i = 0; i < 3; i++) disk(c, 334 + i * 18, 479, 3.5, i < s.orbit ? '#f8d99c' : '#51625a');
    const saver = s.time < s.saver && !s.saved && ['live', 'launch'].includes(s.phase);
    glow(c, 225, 737, 32, saver ? '#8ef6ba44' : '#eebb7710');
    label(c, saver ? 'BALL SAVE' : 'SKYBLOOM', 225, 751, 8, saver ? '#b9efc4' : '#8f967a', 1.7);
    // Spring and polished shooter ball stay readable at the right edge of the table.
    const springY = 749 + charge * 14;
    stroke(c, p => { p.moveTo(434, springY); for (let i = 0; i < 9; i++) p.lineTo(i % 2 ? 451 : 435, springY + i * (23 - charge * 13) / 8); }, '#9baca5', 2);
    box(c, 434, springY - 5, 18, 7, 3, metal(c, springY, 5));
    if (s.phase === 'ready') chromeBall(c, 444, 726 + charge * 14);
    for (const ball of s.balls) {
      let trail = trails.get(ball.id); if (!trail) { trail = []; trails.set(ball.id, trail); }
      trail.push({ x: ball.x, y: ball.y }); if (trail.length > 10) trail.shift();
      if (!reduced) for (let i = 0; i < trail.length - 1; i++) { c.globalAlpha = i / trail.length * .2; disk(c, trail[i].x, trail[i].y, 3 + i / trail.length * 4, '#b9f4e1'); }
      c.globalAlpha = 1; chromeBall(c, ball.x, ball.y, ball.ramp >= 0 ? 1.1 : 1);
    }
    for (const id of trails.keys()) if (!s.balls.some(ball => ball.id === id)) trails.delete(id);
    for (const e of s.events) {
      const age = s.time - e.time;
      if (e.kind === 'score' && age < 1) {
        c.globalAlpha = 1 - age; label(c, e.label, e.x, e.y - 12 - (reduced ? 0 : age * 26), e.label.startsWith('+') ? 14 : 11, '#fff0b4'); c.globalAlpha = 1;
      }
      if (e.kind === 'flip' && age < .16 && !reduced) glow(c, e.x, e.y, 23, '#fcf7b522');
    }
    if (bloom) { c.globalAlpha = pulse; label(c, 'BLOOM · DOUBLE SCORE', 225, 503, 11, '#f1c5dc', 1); c.globalAlpha = 1; }
    if (s.time < s.tiltUntil) { box(c, 131, 410, 188, 43, 10, '#160f19d9'); label(c, 'TILT  ·  ' + Math.ceil(s.tiltUntil - s.time), 225, 437, 20, '#f0a1a6'); }
    // Restrained diagonal glass highlights, leaving the ball's contrast intact.
    const glass = c.createLinearGradient(35, 20, 398, 600); glass.addColorStop(0, '#fff0'); glass.addColorStop(.28, '#eefbe803'); glass.addColorStop(.3, '#e0fff209'); glass.addColorStop(.42, '#fff0');
    c.fillStyle = glass; c.fillRect(35, 42, 372, 613);
  }
  return { draw };
}

function flower(c, x, y, r, color, hit, time, reduced) {
  ellipse(c, x + 3, y + 9, r + 7, r + 3, '#0008'); disk(c, x, y, r + 6, '#a58659'); disk(c, x, y, r + 3, '#253e36');
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU; c.save(); c.translate(x, y); c.rotate(a);
    ellipse(c, 0, -r * .58, r * .27, r * .6, color); ellipse(c, -1.5, -r * .62, r * .09, r * .42, '#ffffff55'); c.restore();
  }
  const core = c.createRadialGradient(x - 5, y - 7, 1, x, y, r * .6); core.addColorStop(0, '#fff4c7'); core.addColorStop(.35, color); core.addColorStop(1, '#446b58');
  disk(c, x, y, r * .6, '#b89b62'); disk(c, x, y, r * .52, core);
  stroke(c, p => p.arc(x, y, r * .38, 0, TAU), '#fae9b889', .8);
  for (let i = 0; i < 5; i++) { const a = i * TAU / 5 - Math.PI / 2; disk(c, x + Math.cos(a) * 5, y + Math.sin(a) * 5, 1, '#fff7d1'); }
  if (hit > 0) { c.globalAlpha = hit * .7; disk(c, x, y, r - 2, '#fff2bc'); c.globalAlpha = 1; }
  if (!reduced) glow(c, x - 8, y - 7, 8, '#fff9db55');
}
function chromeBall(c, x, y, scale = 1) {
  ellipse(c, x + 4, y + 7, 9 * scale, 6 * scale, '#0008'); glow(c, x, y, 16, '#e1ffee18');
  const g = c.createRadialGradient(x - 3, y - 4, .5, x + 1, y + 1, 9 * scale);
  g.addColorStop(0, '#fffef2'); g.addColorStop(.18, '#dfeee3'); g.addColorStop(.35, '#8ca69e'); g.addColorStop(.51, '#e7eecc'); g.addColorStop(.58, '#334c4a'); g.addColorStop(.81, '#6b8b89'); g.addColorStop(1, '#101d23');
  disk(c, x, y, 8 * scale, g); ellipse(c, x - 2.5, y - 4, 3.4, 1.5, '#fffcef', -.6); disk(c, x + 4, y + 3, 1.2, '#b4e4cf');
}
function wireform(c, lit, time, reduced) {
  const points = []; for (let i = 0; i <= 50; i++) points.push(rampPosition(i / 50));
  const line = (ctx, offset = 0) => points.forEach((p, i) => i ? ctx.lineTo(p.x + offset, p.y) : ctx.moveTo(p.x + offset, p.y));
  stroke(c, p => line(p), '#040e1470', 22); stroke(c, p => line(p), '#4d718028', 17);
  for (const offset of [-8, 8]) { stroke(c, p => line(p, offset), '#253a44', 4); stroke(c, p => line(p, offset - .6), lit ? '#e8caf5' : '#a1b5b0', 1.8); }
  for (let i = 2; i < 49; i += 3) { const p = points[i]; stroke(c, a => { a.moveTo(p.x - 8, p.y); a.lineTo(p.x + 8, p.y); }, '#a8b8b04a', 1); }
  if (lit && !reduced) { const p = rampPosition((time * .6) % 1); glow(c, p.x, p.y, 27, '#d8bcf044'); }
}
function paintCabinet(c) {
  c.fillStyle = '#050d14'; c.fillRect(0, 0, W, H);
  const edge = c.createLinearGradient(0, 0, W, 0); edge.addColorStop(0, '#101c25'); edge.addColorStop(.035, '#63807b'); edge.addColorStop(.065, '#142a30'); edge.addColorStop(.93, '#11292c'); edge.addColorStop(.965, '#718279'); edge.addColorStop(1, '#111b26');
  box(c, 7, 5, 466, 786, 29, edge); box(c, 17, 13, 446, 770, 25, '#826e47'); box(c, 21, 17, 438, 762, 23, '#111827');
  const floor = c.createLinearGradient(0, 45, 0, 753); floor.addColorStop(0, '#33314b'); floor.addColorStop(.45, '#25283f'); floor.addColorStop(1, '#141d32');
  box(c, 28, 35, 389, 717, [91, 91, 50, 50], floor);
  glow(c, 225, 242, 210, '#72bb8220'); glow(c, 237, 474, 175, '#eab47b16');
  // Fine engraving, stellar chart and fern filigree are cached with the table.
  for (let i = 0; i < 115; i++) {
    const x = 48 + ((i * 197) % 352), y = 63 + ((i * 113) % 655);
    disk(c, x, y, i % 7 === 0 ? 1.1 : .45, i % 3 ? '#a8c4a83d' : '#e7d69c66');
  }
  for (let radius = 56; radius < 200; radius += 40) { stroke(c, p => p.arc(225, 376, radius, 0, TAU), '#a6c7a416', .6); }
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; stroke(c, p => { p.moveTo(225 + Math.cos(a) * 159, 376 + Math.sin(a) * 159); p.lineTo(225 + Math.cos(a) * 167, 376 + Math.sin(a) * 167); }, '#c1bf8533', 1); }
  vine(c, 74, 492, 1); vine(c, 370, 275, -1); vine(c, 162, 570, 1); vine(c, 296, 570, -1);
  for (const [x, y, a] of [[104, 262, -.8], [316, 279, .7], [146, 333, -.6], [291, 352, .8]]) leaf(c, x, y, a, .8, '#76a59044');
  // Crescent medallion, set under glass rather than obscuring the playable objects.
  glow(c, 225, 391, 65, '#b3d8a524'); disk(c, 225, 385, 42, '#d6b18e'); disk(c, 239, 371, 38, '#25283f');
  stroke(c, p => p.arc(225, 385, 49, .2, 5.4), '#b7a77166', .8);
  disk(c, 247, 380, 2.5, '#e2ce92'); disk(c, 236, 400, 1.5, '#d6d49e');
  label(c, 'SKY', 224, 450, 30, '#dfd4a9', 7); label(c, 'B L O O M', 225, 473, 12, '#c1b6db', 1);
  label(c, 'BUILD YOUR WAY TO THE STARS', 225, 490, 5.8, '#96a790', .7);
  for (const w of WALLS) rail(c, p => { p.moveTo(w[0], w[1]); p.lineTo(w[2], w[3]); }, 8);
  for (let i = 0; i < 5; i++) rail(c, p => { p.moveTo(94 + i * 64, 116); p.lineTo(94 + i * 64, 151); }, 7);
  for (const v of SLINGS) {
    c.save(); c.translate(3, 7); c.fillStyle = '#0008'; c.beginPath(); polygon(c, v); c.fill(); c.restore();
    const g = c.createLinearGradient(0, 526, 0, 634); g.addColorStop(0, '#534249'); g.addColorStop(.4, '#294747'); g.addColorStop(1, '#b48e76');
    c.fillStyle = g; c.beginPath(); polygon(c, v); c.fill(); stroke(c, p => polygon(p, v), '#bda178', 7);
    const centerX = v[0][0] < 200 ? 110 : 332; leaf(c, centerX, 599, v[0][0] < 200 ? -.35 : .35, .9, '#c6b287'); screw(c, v[0][0], v[0][1]); screw(c, v[1][0], v[1][1]);
  }
  box(c, 428, 107, 29, 636, 14, '#020c12');
  const lane = c.createLinearGradient(428, 0, 457, 0); lane.addColorStop(0, '#1e3943'); lane.addColorStop(.4, '#284047'); lane.addColorStop(1, '#0b1c22'); box(c, 431, 109, 24, 626, 10, lane);
  rail(c, p => { p.moveTo(424, 741); p.lineTo(424, 121); p.quadraticCurveTo(422, 85, 395, 64); }, 4);
  rail(c, p => { p.moveTo(460, 741); p.lineTo(460, 110); p.quadraticCurveTo(454, 48, 407, 31); }, 4);
  c.save(); c.translate(446, 570); c.rotate(-Math.PI / 2); label(c, 'P U L L   &   R E L E A S E', 0, 0, 7, '#91a49c'); c.restore();
  ellipse(c, 225, 723, 51, 15, '#01090e'); stroke(c, p => p.ellipse(225, 723, 51, 15, 0, 0, TAU), '#50645a', 2);
  for (let i = 0; i < 5; i++) stroke(c, p => { p.moveTo(187 + i * 19, 718); p.lineTo(187 + i * 19, 728); }, '#14272b', 3);
  for (const [x, y] of [[15, 29], [464, 29], [16, 770], [464, 770], [43, 563], [400, 563]]) screw(c, x, y);
  box(c, 160, 764, 128, 14, 3, '#1e302e'); label(c, 'PLAYLAB  /  PRECISION PINBALL', 224, 774, 5.5, '#b7b99a', .5);
}
