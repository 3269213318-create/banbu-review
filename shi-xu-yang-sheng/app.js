const meridians = [
  { time: '23:00', end: '01:00', name: '胆经', organ: '胆', element: '木', tone: '角', action: '深睡，让胆气休养', note: '木 · 角调', instrument: '笛子', color: '#8ab59a' },
  { time: '01:00', end: '03:00', name: '肝经', organ: '肝', element: '木', tone: '角', action: '熟睡，肝脏修复', note: '木 · 角调', instrument: '箫', color: '#8ab59a' },
  { time: '03:00', end: '05:00', name: '肺经', organ: '肺', element: '金', tone: '商', action: '安稳睡眠，肺气宣发', note: '金 · 商调', instrument: '编钟', color: '#b3bba9' },
  { time: '05:00', end: '07:00', name: '大肠经', organ: '大肠', element: '金', tone: '商', action: '起床，轻度运动', note: '金 · 商调', instrument: '编钟', color: '#b3bba9' },
  { time: '07:00', end: '09:00', name: '胃经', organ: '胃', element: '土', tone: '宫', action: '吃一顿温热早餐', note: '土 · 宫调', instrument: '埙', color: '#d8b36b' },
  { time: '09:00', end: '11:00', name: '脾经', organ: '脾', element: '土', tone: '宫', action: '专注工作，吸收营养', note: '土 · 宫调', instrument: '古琴', color: '#d8b36b' },
  { time: '11:00', end: '13:00', name: '心经', organ: '心', element: '火', tone: '徵', action: '午餐后小憩 5 分钟', note: '火 · 徵调', instrument: '琵琶', color: '#d96c4d' },
  { time: '13:00', end: '15:00', name: '小肠经', organ: '小肠', element: '火', tone: '徵', action: '适量饮水，整理思绪', note: '火 · 徵调', instrument: '琵琶', color: '#d96c4d' },
  { time: '15:00', end: '17:00', name: '膀胱经', organ: '膀胱', element: '水', tone: '羽', action: '补水，散步十分钟', note: '水 · 羽调', instrument: '古筝', color: '#83a9ad' },
  { time: '17:00', end: '19:00', name: '肾经', organ: '肾', element: '水', tone: '羽', action: '清淡晚餐，温补肾阳', note: '水 · 羽调', instrument: '古筝', color: '#83a9ad' },
  { time: '19:00', end: '21:00', name: '心包经', organ: '心包', element: '火', tone: '徵', action: '散步，听一段音乐', note: '火 · 徵调', instrument: '琵琶', color: '#d96c4d' },
  { time: '21:00', end: '23:00', name: '三焦经', organ: '三焦', element: '火', tone: '徵', action: '泡脚，准备入睡', note: '火 · 徵调', instrument: '箫', color: '#d96c4d' }
];

const checks = [
  { label: '晨起一杯温水', tag: '卯时', done: true },
  { label: '早餐以温热为主', tag: '辰时', done: true },
  { label: '午时闭眼休息 5 分钟', tag: '心经', done: true },
  { label: '下午补水 500 ml', tag: '申时', done: false },
  { label: '睡前泡脚 / 远离屏幕', tag: '亥时', done: false }
];

let audioCtx;
function ensureAudio() { audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); }
function playTone(freq, start, duration, type = 'sine', gain = .09) {
  const osc = audioCtx.createOscillator(); const amp = audioCtx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, start); osc.frequency.exponentialRampToValueAtTime(freq * .98, start + duration);
  amp.gain.setValueAtTime(0.001, start); amp.gain.exponentialRampToValueAtTime(gain, start + .03); amp.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(amp).connect(audioCtx.destination); osc.start(start); osc.stop(start + duration + .03);
}
function playElementSound(meridian = meridians[6]) {
  ensureAudio(); const now = audioCtx.currentTime + .02;
  const sets = { 木: [392, 440, 523, 587, 659], 火: [330, 392, 440, 523, 659], 土: [262, 330, 392, 440, 523], 金: [294, 349, 440, 523, 587], 水: [220, 262, 330, 392, 494] };
  const notes = sets[meridian.element] || sets.火;
  [0,1,2,1,3,4,3,2].forEach((n, i) => playTone(notes[n], now + i * .19, .46, meridian.instrument === '琵琶' ? 'triangle' : 'sine', meridian.instrument === '琵琶' ? .11 : .075));
  if (meridian.instrument === '琵琶') [0,2,4].forEach((n, i) => playTone(notes[n] / 2, now + i * .38, .7, 'triangle', .045));
  showToast(`${meridian.instrument} · ${meridian.tone}调，正在试听`);
}
function showToast(message) { const toast = document.getElementById('toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => toast.classList.remove('show'), 2300); }

const now = new Date();
const hour = now.getHours() + now.getMinutes() / 60;
let activeIndex = Math.floor(((hour + 1) % 24) / 2);
if (activeIndex > 11) activeIndex = 0;
const current = meridians[activeIndex];
document.getElementById('todayDate').textContent = `${now.getFullYear()}年${String(now.getMonth()+1).padStart(2,'0')}月${String(now.getDate()).padStart(2,'0')}日 · ${['日','一','二','三','四','五','六'][now.getDay()]}`;
document.getElementById('clockTime').textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
document.getElementById('currentTitle').textContent = `${current.time.slice(0,2)}时 · ${current.name}当令`;

function renderTimeline() {
  const visible = [meridians[4], meridians[5], meridians[6], meridians[7]];
  document.getElementById('timeline').innerHTML = visible.map((m) => `<div class="time-row ${m === current ? 'active' : ''}"><time>${m.time}</time><div class="time-info"><strong>${m.name} · ${m.action.split('，')[0]}</strong><small>${m.element} / ${m.instrument}</small></div><span style="color:${m.color}">•</span></div>`).join('');
}
renderTimeline();

function renderChecks() {
  document.getElementById('checkinList').innerHTML = checks.map((item, i) => `<div class="check-row"><input type="checkbox" id="check-${i}" data-index="${i}" ${item.done ? 'checked' : ''}><label for="check-${i}">${item.label}</label><em>${item.tag}</em></div>`).join('');
  document.querySelectorAll('#checkinList input').forEach(input => input.addEventListener('change', e => { checks[Number(e.target.dataset.index)].done = e.target.checked; updateProgress(); showToast(e.target.checked ? '已完成，身体收到了' : '已取消这一项'); }));
  updateProgress();
}
function updateProgress() { const done = checks.filter(c => c.done).length; document.getElementById('completion').textContent = `${done} / ${checks.length}`; document.getElementById('progressBar').style.width = `${done / checks.length * 100}%`; }
renderChecks();

function renderMeridianList() { document.getElementById('meridianList').innerHTML = meridians.map((m, i) => `<div class="meridian-item ${i === activeIndex ? 'active' : ''}"><div><strong>${m.time} ${m.name}</strong><small>${m.action}</small></div><span>${m.element} · ${m.tone}</span></div>`).join(''); }
renderMeridianList();

function renderAlarms() { document.getElementById('alarmGrid').innerHTML = meridians.map((m, i) => `<div class="alarm-item panel"><div class="alarm-symbol" style="background:${m.color}18;color:${m.color}">${m.tone}</div><div><h3>${m.organ} · ${m.instrument}</h3><p>${m.time} — ${m.end}<br>${m.element}行 / ${m.action}</p></div><button class="play-btn" data-alarm="${i}" aria-label="试听${m.organ}闹铃">▶</button></div>`).join(''); document.querySelectorAll('[data-alarm]').forEach(btn => btn.addEventListener('click', () => playElementSound(meridians[Number(btn.dataset.alarm)]))); }
renderAlarms();

const navTitles = { today: '今日节律', clock: '经络时钟', checkins: '打卡记录', alarms: '五行闹铃', profile: '个人节律' };
document.querySelectorAll('.nav-item[data-view]').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); btn.classList.add('active'); document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view')); document.getElementById(`view-${btn.dataset.view}`).classList.add('active-view'); document.getElementById('pageTitle').textContent = navTitles[btn.dataset.view]; }));
document.getElementById('playHeart').addEventListener('click', () => playElementSound(meridians[6]));
document.getElementById('playCurrent').addEventListener('click', () => playElementSound(current));
document.getElementById('alarmToggle').addEventListener('change', e => showToast(e.target.checked ? '心经闹铃已开启' : '心经闹铃已关闭'));
document.getElementById('rotateClock').addEventListener('click', () => { const face = document.getElementById('clockFace'); face.style.transform = `rotate(${(Number(face.dataset.rot || 0) + 30)}deg)`; face.dataset.rot = Number(face.dataset.rot || 0) + 30; showToast('时辰盘已转动'); });
document.getElementById('viewAll').addEventListener('click', () => document.querySelector('[data-view="clock"]').click());
document.getElementById('openInfo').addEventListener('click', () => document.getElementById('infoModal').classList.add('open'));
document.getElementById('closeInfo').addEventListener('click', () => document.getElementById('infoModal').classList.remove('open'));
document.getElementById('infoModal').addEventListener('click', e => { if (e.target.id === 'infoModal') e.currentTarget.classList.remove('open'); });

function renderCalendar() { const grid = document.getElementById('calendarGrid'); const labels = ['日','一','二','三','四','五','六']; const days = Array.from({length: 31}, (_, i) => i + 1); grid.innerHTML = labels.map(d => `<div class="calendar-day" style="min-height:auto;border:0;color:#6f7e73">${d}</div>`).join('') + days.map(d => `<div class="calendar-day ${d < 5 ? 'done' : d === 5 ? 'partial' : ''} ${d === 4 ? 'today' : ''}"><span class="day-number">${String(d).padStart(2,'0')}</span></div>`).join(''); }
renderCalendar();
