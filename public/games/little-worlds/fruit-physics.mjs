export const RADII = [15, 20, 25, 30, 36, 42, 49, 57, 67];
export const POINTS = [0, 10, 25, 45, 75, 115, 170, 250, 400];
export class FruitWorld {
  constructor(onMerge = () => {}) { this.onMerge = onMerge; this.bodies = []; this.nextId = 0; this.time = 0; }
  add(level, x, y = 83) {
    const r = RADII[level];
    const body = { id: ++this.nextId, level, r, x: Math.max(29+r, Math.min(371-r, x)), y, vx: 0, vy: 0, age: 0, angle: 0, scale: 1 };
    this.bodies.push(body); return body;
  }
  step(dt) {
    // Small fixed substeps prevent tunnelling and make the pile stable on touch devices.
    const step = Math.min(dt, 1 / 30) / 2;
    for (let sub = 0; sub < 2; sub++) {
      this.time += step;
      for (const b of this.bodies) {
        b.age += step; b.vy += 1150 * step; b.vx *= Math.exp(-1.4 * step);
        b.x += b.vx * step; b.y += b.vy * step; b.angle += b.vx * step / b.r * .25;
        b.scale += (1 - b.scale) * Math.min(1, step * 10);
      }
      for (let iteration = 0; iteration < 6; iteration++) {
        for (const b of this.bodies) {
          if (b.x - b.r < 29) { b.x = 29 + b.r; b.vx = Math.abs(b.vx) * .18; }
          if (b.x + b.r > 371) { b.x = 371 - b.r; b.vx = -Math.abs(b.vx) * .18; }
          if (b.y + b.r > 553) { b.y = 553 - b.r; b.vy = -Math.abs(b.vy) * .08; b.vx *= .94; if (Math.abs(b.vy) < 12) b.vy = 0; }
        }
        const merged = new Set(), additions = [];
        for (let i = 0; i < this.bodies.length; i++) {
          const a = this.bodies[i]; if (merged.has(a.id)) continue;
          for (let j = i + 1; j < this.bodies.length; j++) {
            const b = this.bodies[j]; if (merged.has(b.id)) continue;
            let dx = b.x-a.x, dy = b.y-a.y, dist = Math.hypot(dx,dy);
            if (dist >= a.r + b.r) continue;
            if (a.level === b.level && a.level < RADII.length-1) {
              merged.add(a.id); merged.add(b.id);
              additions.push({ level: a.level+1, x:(a.x+b.x)/2, y:(a.y+b.y)/2, vx:(a.vx+b.vx)/2 });
              break;
            }
            if (dist < .001) { dx = .001; dy = 0; dist = .001; }
            const nx = dx/dist, ny = dy/dist, overlap = a.r+b.r-dist;
            const ma = a.r*a.r, mb=b.r*b.r, total=ma+mb;
            a.x -= nx*overlap*mb/total; a.y -= ny*overlap*mb/total;
            b.x += nx*overlap*ma/total; b.y += ny*overlap*ma/total;
            const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
            if(relative<0){ const impulse=-(1.08)*relative/(1/ma+1/mb); a.vx-=impulse*nx/ma; a.vy-=impulse*ny/ma; b.vx+=impulse*nx/mb; b.vy+=impulse*ny/mb; }
          }
        }
        if(merged.size){ this.bodies=this.bodies.filter(b=>!merged.has(b.id)); for(const data of additions){ const body=this.add(data.level,data.x,data.y); body.vx=data.vx;body.vy=-55;body.age=1;body.scale=1.22;this.onMerge(body,POINTS[body.level]); } }
      }
    }
  }
  isOverflowing() { return this.bodies.some(b => b.age > 2 && b.y-b.r < 155 && Math.abs(b.vy) < 75); }
}
