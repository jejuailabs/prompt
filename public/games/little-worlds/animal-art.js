export function oval(c, x, y, rx, ry, color, rotation = 0) {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); c.fill();
}
export function round(c, x, y, w, h, r, color) {
  c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
}
export function text(c, value, x, y, size = 12, color = '#79584b', weight = 600) {
  c.fillStyle = color; c.font = `${weight} ${size}px "Segoe UI",sans-serif`; c.textAlign = 'center'; c.fillText(value, x, y);
}
export function hamster(c, x, y, size = 1, angle = 0, happy = false) {
  c.save(); c.translate(x, y); c.rotate(angle); c.scale(size, size);
  oval(c, 0, 19, 22, 5, '#69402320');
  oval(c, -15, -17, 10, 12, '#dba470', -.4); oval(c, 15, -17, 10, 12, '#dba470', .4);
  oval(c, -15, -18, 6, 7, '#edb4a5'); oval(c, 15, -18, 6, 7, '#edb4a5');
  const fur = c.createRadialGradient(-8, -10, 2, 0, 0, 31); fur.addColorStop(0, '#ffdf9e'); fur.addColorStop(1, '#d89962');
  oval(c, 0, 0, 25, 24, fur); oval(c, 0, 10, 20, 15, '#fff3d8');
  oval(c, -18, 5, 10, 10, '#f4bd86'); oval(c, 18, 5, 10, 10, '#f4bd86');
  oval(c, -15, 7, 6, 3, '#e89a91'); oval(c, 15, 7, 6, 3, '#e89a91');
  if (happy) {
    c.strokeStyle = '#664434'; c.lineWidth = 2; c.lineCap = 'round';
    for (const ex of [-9, 9]) { c.beginPath(); c.arc(ex, -2, 3, Math.PI, 0); c.stroke(); }
  } else {
    oval(c, -9, -2, 2.6, 3.6, '#533c32'); oval(c, 9, -2, 2.6, 3.6, '#533c32');
    oval(c, -10, -3, .9, 1.1, '#fff'); oval(c, 8, -3, .9, 1.1, '#fff');
  }
  oval(c, 0, 5, 3, 2, '#be8073');
  c.strokeStyle = '#8d6251'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 7); c.lineTo(0, 10); c.arc(-2, 10, 2, 0, Math.PI); c.stroke();
  oval(c, -10, 22, 7, 4, '#bd855d'); oval(c, 10, 22, 7, 4, '#bd855d');
  oval(c, -11, 14, 5, 4, '#f4d2a6', .4); oval(c, 11, 14, 5, 4, '#f4d2a6', -.4);
  c.restore();
}
export function cookie(c, x, y, r = 9) {
  oval(c, x, y + 2, r, r, '#b97b49'); oval(c, x, y, r, r, '#ebbc73');
  oval(c, x - r * .25, y - r * .3, r * .6, r * .45, '#f7d591');
  for (const [dx, dy] of [[-.4, -.1], [.2, -.45], [.35, .3], [-.25, .45]]) oval(c, x + dx * r, y + dy * r, 1.5, 1.5, '#966449');
}
export function berry(c, x, y, r = 10) {
  c.save(); c.translate(x, y); c.scale(r / 10, r / 10);
  c.fillStyle = '#df7182'; c.beginPath(); c.moveTo(0, 11); c.bezierCurveTo(-18, -2, -7, -15, 0, -7); c.bezierCurveTo(7, -15, 18, -2, 0, 11); c.fill();
  for (const [dx, dy] of [[-4, -2], [4, -2], [0, 4]]) oval(c, dx, dy, 1, 1.5, '#ffe7b0');
  oval(c, -3, -8, 5, 2, '#6f9d72', .5); oval(c, 3, -8, 5, 2, '#6f9d72', -.5); c.restore();
}
export function fish(c, x, y, size = 1, gold = false) {
  c.save(); c.translate(x, y); c.scale(size, size);
  c.fillStyle = gold ? '#edb650' : '#db95a0'; c.beginPath(); c.moveTo(-6, 0); c.lineTo(-14, -7); c.lineTo(-14, 7); c.closePath(); c.fill();
  oval(c, 0, 0, 10, 6, gold ? '#f5ce72' : '#efb3be'); oval(c, 4, -1, 1.2, 1.2, '#735e65');
  c.strokeStyle = gold ? '#c38d44' : '#c58497'; c.lineWidth = 1; c.beginPath(); c.moveTo(-1, -4); c.quadraticCurveTo(-4, 0, -1, 4); c.stroke(); c.restore();
}
export function penguin(c, x, y, size = 1, direction = 1, step = 0) {
  c.save(); c.translate(x, y); c.scale(size, size);
  oval(c, 0, 14, 14, 4, '#36637528');
  oval(c, -7, 12 + step, 6, 3, '#e9b45e', -.15); oval(c, 7, 12 - step, 6, 3, '#e9b45e', .15);
  oval(c, -13, 2, 4, 9, '#4c7182', -.3); oval(c, 13, 2, 4, 9, '#4c7182', .3);
  oval(c, 0, -1, 13, 16, '#537b8a'); oval(c, 0, 3, 10, 12, '#fff8e6');
  oval(c, -5, -7, 6, 7, '#fff8e6'); oval(c, 5, -7, 6, 7, '#fff8e6');
  const look = direction === 1 ? 1 : direction === 3 ? -1 : 0;
  oval(c, -5 + look, -7, 1.5, 2, '#355063'); oval(c, 5 + look, -7, 1.5, 2, '#355063');
  oval(c, -8, -2, 3, 1.7, '#f0b4ae'); oval(c, 8, -2, 3, 1.7, '#f0b4ae');
  c.fillStyle = '#e5ac57'; c.beginPath(); c.moveTo(-3, -3); c.lineTo(3, -3); c.lineTo(look, 1); c.fill();
  round(c, -12, 2, 24, 4, 2, '#df8592'); round(c, 5, 4, 4, 9, 2, '#df8592');
  oval(c, 0, -18, 10, 5, '#df8592'); oval(c, 1, -24, 4, 4, '#fff4de'); c.restore();
}
export function seal(c, x, y, size = 1, variant = 0) {
  c.save(); c.translate(x, y); c.scale(size, size);
  oval(c, 0, 10, 15, 4, '#41677a25'); oval(c, -12, 8, 8, 3, '#9babc5', -.3); oval(c, 12, 8, 8, 3, '#9babc5', .3);
  oval(c, 0, 0, 15, 12, variant % 2 ? '#b5a9c9' : '#adc1d3'); oval(c, 0, 4, 10, 7, '#edf1ef');
  oval(c, -6, -2, 1.5, 2, '#586278'); oval(c, 6, -2, 1.5, 2, '#586278'); oval(c, 0, 2, 2.5, 2, '#798392');
  c.strokeStyle = '#8393a0'; c.lineWidth = .8;
  for (const sign of [-1, 1]) { c.beginPath(); c.moveTo(sign * 3, 4); c.lineTo(sign * 12, 2); c.moveTo(sign * 4, 6); c.lineTo(sign * 13, 7); c.stroke(); }
  c.restore();
}
