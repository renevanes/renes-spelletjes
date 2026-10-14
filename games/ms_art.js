(() => {   // menu tile art for Mijnenveger
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { const open = (r === 2 && k < 3) || (r === 3); g.fillStyle = open ? ((r + k) % 2 ? '#e3c9a0' : '#ecd5ae') : ((r + k) % 2 ? '#8bcb4b' : '#a3d862'); g.fillRect(k * 32, r * 32, 32, 32); }
  g.font = '900 24px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; [[0, 2, '1', '#2a6fd1'], [1, 2, '2', '#2e8b3c'], [2, 2, '1', '#2a6fd1'], [0, 3, '1', '#2a6fd1']].forEach(([k, r, t, col]) => { g.fillStyle = col; g.fillText(t, k * 32 + 16, r * 32 + 17); });
  g.fillStyle = '#5a3b20'; g.fillRect(70, 28, 5, 34); g.fillStyle = '#e5344a'; g.beginPath(); g.moveTo(75, 28); g.lineTo(98, 36); g.lineTo(75, 46); g.fill();
  g.fillStyle = '#1b1d22'; g.beginPath(); g.arc(30, 30, 13, 0, 7); g.fill(); g.strokeStyle = '#1b1d22'; g.lineWidth = 4; for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(30 + Math.cos(a * .785) * 10, 30 + Math.sin(a * .785) * 10); g.lineTo(30 + Math.cos(a * .785) * 19, 30 + Math.sin(a * .785) * 19); g.stroke(); } g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(25, 25, 4, 0, 7); g.fill();
  $('#artMs').src = c.toDataURL();
})();
