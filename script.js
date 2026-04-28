// =====================================================
// Schedule Master - Core Logic (script.js)
// =====================================================
let ipcRenderer = null;
try { ipcRenderer = require('electron').ipcRenderer; } catch (e) { }

// ==================== 配置与数据 ====================
let config = JSON.parse(localStorage.getItem('config') || 'null') || {
  morningStart: 480,    // 08:00
  morningCount: 4,
  afternoonStart: 810,  // 13:30
  afternoonCount: 4,
  periodDuration: 45,
  breakDuration: 10,
  showSat: true,
  showSun: true
};

let courses = JSON.parse(localStorage.getItem('courses') || '[]');
let holidays = JSON.parse(localStorage.getItem('holidays') || '{}');

let calViewYear, calViewMonth;
{ const d = new Date(); calViewYear = d.getFullYear(); calViewMonth = d.getMonth(); }

// ==================== 主题设置 (Dark Mode) ====================
const themeToggleBtn = document.getElementById('theme-toggle');
let isDarkMode = localStorage.getItem('isDarkMode') === 'true';

if (isDarkMode) {
  document.documentElement.setAttribute('data-theme', 'dark');
  if (themeToggleBtn) themeToggleBtn.textContent = '☀️';
} else {
  if (themeToggleBtn) themeToggleBtn.textContent = '🌙';
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('isDarkMode', isDarkMode);
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggleBtn.textContent = '☀️';
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeToggleBtn.textContent = '🌙';
    }
  });
}

// ==================== 全屏功能 (Fullscreen) ====================
function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log(`无法进入全屏: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

const globalFullscreenBtn = document.getElementById('global-fullscreen-toggle');
if (globalFullscreenBtn) {
  globalFullscreenBtn.addEventListener('click', toggleFullScreen);
}

const ftFullscreenBtn = document.getElementById('ft-fullscreen-toggle');
if (ftFullscreenBtn) {
  ftFullscreenBtn.addEventListener('click', toggleFullScreen);
}

document.addEventListener('fullscreenchange', () => {
  const isMulti = !!document.fullscreenElement;
  const svgNormal = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
  const svgExit = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>';
  
  if (globalFullscreenBtn) globalFullscreenBtn.innerHTML = isMulti ? svgExit : svgNormal;
  
  const ftSvg = document.getElementById('ft-fullscreen-svg');
  if (ftSvg) {
    const ftSvgNormal = '<path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>';
    const ftSvgExit = '<path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>';
    ftSvg.innerHTML = isMulti ? ftSvgExit : ftSvgNormal;
  }
});

// ==================== 国家法定节假日（含名称）====================
const NATIONAL_HOLIDAYS = {
  '2025-01-01': '元旦', '2025-01-28': '春节', '2025-01-29': '春节', '2025-01-30': '春节', '2025-01-31': '春节',
  '2025-02-01': '春节', '2025-02-02': '春节', '2025-02-03': '春节', '2025-02-04': '春节',
  '2025-04-04': '清明节', '2025-04-05': '清明节', '2025-04-06': '清明节',
  '2025-05-01': '劳动节', '2025-05-02': '劳动节', '2025-05-03': '劳动节', '2025-05-04': '劳动节', '2025-05-05': '劳动节',
  '2025-05-31': '端午节', '2025-06-01': '端午节', '2025-06-02': '端午节',
  '2025-10-01': '国庆节', '2025-10-02': '国庆节', '2025-10-03': '国庆节', '2025-10-04': '国庆节',
  '2025-10-05': '国庆节', '2025-10-06': '国庆节', '2025-10-07': '国庆节', '2025-10-08': '国庆节',
  '2026-01-01': '元旦', '2026-01-02': '元旦', '2026-01-03': '元旦',
  '2026-02-14': '春节', '2026-02-15': '春节', '2026-02-16': '春节', '2026-02-17': '春节',
  '2026-02-18': '春节', '2026-02-19': '春节', '2026-02-20': '春节',
  '2026-04-04': '清明节', '2026-04-05': '清明节', '2026-04-06': '清明节',
  '2026-05-01': '劳动节', '2026-05-02': '劳动节', '2026-05-03': '劳动节', '2026-05-04': '劳动节', '2026-05-05': '劳动节',
  '2026-06-19': '端午节', '2026-06-20': '端午节', '2026-06-21': '端午节',
  '2026-09-23': '中秋节', '2026-09-24': '中秋节', '2026-09-25': '中秋节',
  '2026-10-01': '国庆节', '2026-10-02': '国庆节', '2026-10-03': '国庆节', '2026-10-04': '国庆节',
  '2026-10-05': '国庆节', '2026-10-06': '国庆节', '2026-10-07': '国庆节'
};
function isRestDay(ds) {
  if (holidays[ds] === false) return false; // 用户显式设置为工作日
  if (holidays[ds] === true) return true;  // 用户显式设置为休息日
  
  const date = new Date(ds);
  const dow = date.getDay(); // 0: Sun, 6: Sat
  if (dow === 6 && config.showSat === false) return true;
  if (dow === 0 && config.showSun === false) return true;
  return !!NATIONAL_HOLIDAYS[ds];
}

// ==================== 农历计算 ====================
const LUNAR_DATA = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,//1900-1909
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,//1910
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,//1920
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,//1930
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,//1940
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,//1950
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,//1960
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,//1970
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,//1980
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,//1990
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,//2000
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,//2010
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,//2020
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,//2030
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,//2040
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,//2050
];
const TGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const LMONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const LDAYS = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

function lunarYearDays(y) { let s = 348; for (let i = 0x8000; i > 0x8; i >>= 1)s += (LUNAR_DATA[y - 1900] & i) ? 1 : 0; return s + lunarLeapDays(y); }
function lunarLeapMonth(y) { return LUNAR_DATA[y - 1900] & 0xf; }
function lunarLeapDays(y) { return lunarLeapMonth(y) ? (LUNAR_DATA[y - 1900] & 0x10000 ? 30 : 29) : 0; }
function lunarMonthDays(y, m) { return (LUNAR_DATA[y - 1900] & (0x10000 >> m)) ? 30 : 29; }

function solarToLunar(sy, sm, sd) {
  sm += 1; // 0-indexed to 1-indexed
  let offset = Math.floor((Date.UTC(sy, sm - 1, sd) - Date.UTC(1900, 0, 31)) / 86400000);
  let ly = 1900, lm, ld, leap = false;
  for (; ly < 2051 && offset > 0; ly++) { let d = lunarYearDays(ly); if (offset < d) break; offset -= d; }
  if (ly >= 2051) return null;
  let leapM = lunarLeapMonth(ly);
  let isLeapUsed = false;
  for (lm = 1; lm < 14 && offset > 0; lm++) {
    let d;
    if (!isLeapUsed && leapM > 0 && lm == leapM + 1) { d = lunarLeapDays(ly); isLeapUsed = true; lm--; leap = true; }
    else { d = lunarMonthDays(ly, lm); leap = false; }
    if (offset < d) break;
    offset -= d;
  }
  if (lm > 12) { lm = 12; }
  ld = offset + 1;
  const gzY = (ly - 4) % 60;
  return {
    year: ly, month: lm, day: ld, isLeap: leap,
    monthStr: (leap ? '闰' : '') + LMONTHS[lm - 1],
    dayStr: LDAYS[ld - 1] || `${ld}`,
    ganZhi: TGAN[gzY % 10] + DZHI[gzY % 12] + '年',
    animal: ANIMALS[(ly - 4) % 12]
  };
}

// 简化：获取阳历日期的农历显示文本
function getLunarText(y, m, d) {
  const l = solarToLunar(y, m, d);
  if (!l) return '';
  // 初一显示月名，其余显示日名
  return l.day === 1 ? l.monthStr : l.dayStr;
}

// ==================== 日期提醒事项 ====================
let dateReminders = JSON.parse(localStorage.getItem('dateReminders') || '{}');
// 结构: { 'YYYY-MM-DD': [{ id, text, time, done }] }
function saveReminders() { localStorage.setItem('dateReminders', JSON.stringify(dateReminders)); }


// ==================== 工具函数 ====================
function minsToStr(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
}
function strToMins(s) { const [h, m] = s.split(':').map(Number); return h * 60 + m; }
function todayDS() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayDow() { const w = new Date().getDay(); return w === 0 ? 6 : w - 1; } // 0=Mon..6=Sun
function saveAll() {
  localStorage.setItem('config', JSON.stringify(config));
  localStorage.setItem('courses', JSON.stringify(courses));
  localStorage.setItem('holidays', JSON.stringify(holidays));
}

// ==================== 节次计算 ====================
function computePeriods() {
  const periods = [];
  let t = config.morningStart;
  for (let i = 0; i < config.morningCount; i++) {
    periods.push({ gi: i, num: i + 1, start: t, end: t + config.periodDuration, session: 'am' });
    t += config.periodDuration + config.breakDuration;
  }
  t = config.afternoonStart;
  for (let i = 0; i < config.afternoonCount; i++) {
    const gi = config.morningCount + i;
    periods.push({ gi, num: gi + 1, start: t, end: t + config.periodDuration, session: 'pm' });
    t += config.periodDuration + config.breakDuration;
  }
  return periods;
}

function hasValidLunch() {
  const lastAm = computePeriods()[config.morningCount - 1];
  const lunchStart = lastAm ? lastAm.end : config.afternoonStart;
  return config.afternoonStart > lunchStart; // 下午开始时间晚于上午最后一节结束才有效午休
}
function totalRows() { return config.morningCount + (hasValidLunch() ? 1 : 0) + config.afternoonCount; }
function periodToRow(gi) {
  if (gi < config.morningCount) return gi;
  const lunchOffset = hasValidLunch() ? 1 : 0;
  return config.morningCount + lunchOffset + (gi - config.morningCount);
}
function rowToPeriod(row) {
  if (row < config.morningCount) return row;
  if (hasValidLunch()) {
    if (row === config.morningCount) return -1; // lunch
    return config.morningCount + (row - config.morningCount - 1);
  }
  // 无有效午休：直接映射到下午节次
  return config.morningCount + (row - config.morningCount);
}

// ==================== 日历 ====================
function renderCalendar() {
  const g = document.getElementById('cal-grid'); g.innerHTML = '';
  const mns = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  document.getElementById('cal-month-label').innerText = `${calViewYear}年 ${mns[calViewMonth]}`;

  ['日', '一', '二', '三', '四', '五', '六'].forEach(d => {
    const e = document.createElement('div'); e.className = 'cal-dow'; e.innerText = d; g.appendChild(e);
  });

  const fd = new Date(calViewYear, calViewMonth, 1).getDay();
  const dim = new Date(calViewYear, calViewMonth + 1, 0).getDate();
  const today = new Date();
  const prevDim = new Date(calViewYear, calViewMonth, 0).getDate();

  for (let i = fd - 1; i >= 0; i--) {
    const e = document.createElement('div'); e.className = 'cal-day other-month'; e.innerText = prevDim - i; g.appendChild(e);
  }
  for (let d = 1; d <= dim; d++) {
    const e = document.createElement('div'); e.className = 'cal-day';
    const ds = `${calViewYear}-${String(calViewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isNat = !!NATIONAL_HOLIDAYS[ds];
    const isUsr = holidays[ds] === true;
    const isForcedWork = holidays[ds] === false;
    
    let html = '';
    // 如果是法定假日或用户定义的休息日，且没有被强制设置为工作日
    if ((isNat || isUsr) && !isForcedWork) {
      html += '<span class="cal-htag">\u4F11</span>';
    } else if (isForcedWork) {
      html += '<span class="cal-htag" style="color:var(--accent)">\u73ED</span>';
    }
    
    html += '<span class="cal-dnum">' + d + '</span>';
    e.innerHTML = html;
    if (calViewYear === today.getFullYear() && calViewMonth === today.getMonth() && d === today.getDate()) e.classList.add('today');
    if (isNat) e.classList.add('national-holiday');
    if (isUsr) e.classList.add('holiday');
    if (isForcedWork) e.classList.add('forced-work');
    
    e.addEventListener('click', () => {
      const baseIsRest = !!NATIONAL_HOLIDAYS[ds] || 
                        (new Date(ds).getDay() === 6 && config.showSat === false) || 
                        (new Date(ds).getDay() === 0 && config.showSun === false);
      
      if (baseIsRest) {
        // 如果原本是休息日：默认(休) -> 强制工作(班/蓝) -> 默认(休)
        if (holidays[ds] === false) { delete holidays[ds]; } 
        else { holidays[ds] = false; }
      } else {
        // 如果原本是工作日：默认(班) -> 强制休息(休/红) -> 默认(班)
        if (holidays[ds] === true) { delete holidays[ds]; } 
        else { holidays[ds] = true; }
      }
      saveAll(); renderCalendar();
    });
    g.appendChild(e);
  }
  const trail = (7 - (fd + dim) % 7) % 7;
  for (let i = 1; i <= trail; i++) {
    const e = document.createElement('div'); e.className = 'cal-day other-month'; e.innerText = i; g.appendChild(e);
  }
}

document.getElementById('cal-prev').addEventListener('click', () => {
  calViewMonth--; if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; } renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', () => {
  calViewMonth++; if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; } renderCalendar();
});

// ==================== 日期头部 ====================
function updateDateHeader() {
  const d = new Date();
  const ws = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  document.getElementById('today-date').innerText = `${ws[d.getDay()]}，${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// ==================== 课表渲染 ====================
function renderTimetable() {
  const body = document.getElementById('tt-body');
  const header = document.getElementById('tt-header');
  body.innerHTML = '';
  
  // Update header based on visibility
  header.innerHTML = '<div class="tt-corner">节次</div>' +
    '<div class="tt-day-head">周一</div><div class="tt-day-head">周二</div>' +
    '<div class="tt-day-head">周三</div><div class="tt-day-head">周四</div>' +
    '<div class="tt-day-head">周五</div>' +
    (config.showSat !== false ? '<div class="tt-day-head weekend">周六</div>' : '') +
    (config.showSun !== false ? '<div class="tt-day-head weekend">周日</div>' : '');

  const periods = computePeriods();
  const tr = totalRows();
  
  // Calculate columns
  let colCount = 5;
  if (config.showSat !== false) colCount++;
  if (config.showSun !== false) colCount++;
  
  const gridTemplate = `90px repeat(${colCount}, 1fr)`;
  body.style.gridTemplateColumns = gridTemplate;
  header.style.gridTemplateColumns = gridTemplate;
  body.style.gridTemplateRows = `repeat(${tr}, 1fr)`;

  const td = todayDow();
  
  // Map index for today highlight (only if visible)
  const visibleDays = [0, 1, 2, 3, 4];
  if (config.showSat !== false) visibleDays.push(5);
  if (config.showSun !== false) visibleDays.push(6);
  
  const hdrs = header.querySelectorAll('.tt-day-head');
  hdrs.forEach((h, i) => { h.classList.toggle('today-col', visibleDays[i] === td); });


  // Render period labels + cells for each row
  for (let r = 0; r < tr; r++) {
    const pi = rowToPeriod(r);

    if (pi === -1) {
      // Lunch row
      const lbl = document.createElement('div');
      lbl.className = 'tt-lunch-label';
      lbl.style.gridColumn = '1';
      lbl.style.gridRow = `${r + 1}`;
      const lastMorning = periods[config.morningCount - 1];
      const lunchEnd = config.afternoonStart;
      const lunchStart = lastMorning ? lastMorning.end : config.afternoonStart;
      lbl.innerHTML = `<span>🍴 午休</span><span class="p-time">${minsToStr(lunchStart)}-${minsToStr(lunchEnd)}</span>`;
      body.appendChild(lbl);

      for (let day of visibleDays) {
        const cell = document.createElement('div');
        cell.className = 'tt-lunch-cell';
        cell.style.gridColumn = `${visibleDays.indexOf(day) + 2}`;
        cell.style.gridRow = `${r + 1}`;
        body.appendChild(cell);
      }
    } else {
      // Period row
      const p = periods[pi];
      if (!p) continue;

      const lbl = document.createElement('div');
      lbl.className = 'tt-period-label';
      lbl.id = `period-label-${pi}`;
      lbl.style.gridColumn = '1';
      lbl.style.gridRow = `${r + 1}`;
      lbl.innerHTML = `<span class="p-num">第${p.num}节</span><span class="p-time">${minsToStr(p.start)}-${minsToStr(p.end)}</span>`;
      body.appendChild(lbl);

      for (let day of visibleDays) {
        const cell = document.createElement('div');
        cell.className = 'tt-cell';
        cell.style.gridColumn = `${visibleDays.indexOf(day) + 2}`;
        cell.style.gridRow = `${r + 1}`;
        cell.dataset.day = day;
        cell.dataset.period = pi;
        if (day === td) cell.classList.add('today-col-cell');

        cell.addEventListener('dblclick', () => openAddModal(day, pi));
        body.appendChild(cell);
      }
    }
  }

  // Render course blocks
  renderCourses();
}

function renderCourses() {
  // Remove any existing blocks
  document.querySelectorAll('.evt-block').forEach(e => e.remove());

  const periods = computePeriods();
  const totalPeriods = config.morningCount + config.afternoonCount;

  courses.forEach(c => {
    if (c.periodIndex >= totalPeriods) return; // invalid period

    const p = periods[c.periodIndex];
    if (!p) return;

    const row = periodToRow(c.periodIndex);

    // Calculate actual span, capping at session boundary
    let actualSpan = c.span || 1;
    // Prevent spanning across lunch
    if (p.session === 'am') {
      const maxSpan = config.morningCount - c.periodIndex;
      actualSpan = Math.min(actualSpan, maxSpan);
    } else {
      const pmIndex = c.periodIndex - config.morningCount;
      const maxSpan = config.afternoonCount - pmIndex;
      actualSpan = Math.min(actualSpan, maxSpan);
    }

    // Calculate the end period for time label
    const endPeriod = periods[c.periodIndex + actualSpan - 1];
    const timeText = `${minsToStr(p.start)} - ${minsToStr(endPeriod ? endPeriod.end : p.end)}`;

    // Find the cell at this position to append the block into
    const cell = document.querySelector(`.tt-cell[data-day="${c.day}"][data-period="${c.periodIndex}"]`);
    if (!cell) return;

    // For spanning blocks, we need to use grid positioning instead of cell-relative
    const block = document.createElement('div');
    block.className = 'evt-block';
    block.style.backgroundColor = c.color || '#4A90D9';
    block.dataset.id = c.id;

    if (actualSpan > 1) {
      // For multi-span, position in the grid directly
      block.style.position = 'absolute';
      block.style.inset = '2px';
      // We need to calculate the height based on the grid rows
      // Since all rows are 1fr, we compute how many rows this spans
      // account for lunch gap if needed
      const endRow = periodToRow(c.periodIndex + actualSpan - 1);
      const startRow = row;
      const spanRows = endRow - startRow + 1;

      // We'll set the height via JS after layout
      block.dataset.spanRows = spanRows;
    }

    const nameEl = document.createElement('div');
    nameEl.className = 'evt-name';
    nameEl.innerText = c.name;

    const timeEl = document.createElement('div');
    timeEl.className = 'evt-time-text';
    timeEl.innerText = timeText;

    const delBtn = document.createElement('button');
    delBtn.className = 'evt-del';
    delBtn.innerText = '×';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      courses = courses.filter(x => x.id !== c.id);
      saveAll();
      renderCourses();
    });

    const resizeH = document.createElement('div');
    resizeH.className = 'evt-resize';

    block.appendChild(nameEl);
    block.appendChild(timeEl);
    block.appendChild(delBtn);
    block.appendChild(resizeH);

    // 双击编辑
    block.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      openEditModal(c);
    });

    cell.appendChild(block);

    // 拖动移动功能
    setupDrag(block, c, cell);
    // 拉伸跨节功能
    setupResize(resizeH, block, c, cell);

    // Handle multi-span: extend the block height to cover multiple rows
    if (actualSpan > 1) {
      requestAnimationFrame(() => {
        const cellRect = cell.getBoundingClientRect();
        const lastPi = c.periodIndex + actualSpan - 1;
        const lastCell = document.querySelector(`.tt-cell[data-day="${c.day}"][data-period="${lastPi}"]`);
        if (lastCell) {
          const lastRect = lastCell.getBoundingClientRect();
          const totalHeight = lastRect.bottom - cellRect.top - 4;
          block.style.height = totalHeight + 'px';
        }
      });
    }
  });
}

// ==================== 拖动移动 ====================
function setupDrag(block, course, originalCell) {
  let isDragging = false;
  let startX = 0, startY = 0;
  let offsetX = 0, offsetY = 0;
  let dragThreshold = 5;
  let highlightedCell = null;
  let ghost = null; // 跟随鼠标的克隆体

  block.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('evt-del') || e.target.classList.contains('evt-resize')) return;
    e.preventDefault();
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;

    // 计算鼠标在block内的偏移，让ghost从正确位置跟随
    const blockRect = block.getBoundingClientRect();
    offsetX = e.clientX - blockRect.left;
    offsetY = e.clientY - blockRect.top;

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (!isDragging && Math.abs(dx) + Math.abs(dy) > dragThreshold) {
        isDragging = true;

        // 创建跟随鼠标的半透明克隆体
        ghost = block.cloneNode(true);
        ghost.style.position = 'fixed';
        ghost.style.width = blockRect.width + 'px';
        ghost.style.height = blockRect.height + 'px';
        ghost.style.opacity = '0.85';
        ghost.style.zIndex = '1000';
        ghost.style.pointerEvents = 'none';
        ghost.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
        ghost.style.transform = 'scale(1.03)';
        ghost.style.transition = 'none';
        document.body.appendChild(ghost);

        // 原来的block变成虚线占位
        block.style.opacity = '0.25';
        block.style.border = '2px dashed rgba(255,255,255,0.5)';
      }

      if (!isDragging) return;

      // ghost 实时跟随鼠标
      ghost.style.left = (ev.clientX - offsetX) + 'px';
      ghost.style.top = (ev.clientY - offsetY) + 'px';

      // 查找鼠标下方的目标格子
      if (ghost) ghost.style.display = 'none';
      const elBelow = document.elementFromPoint(ev.clientX, ev.clientY);
      if (ghost) ghost.style.display = '';

      // 清除上一次高亮
      if (highlightedCell) {
        highlightedCell.style.background = '';
        highlightedCell = null;
      }

      if (elBelow && elBelow.classList.contains('tt-cell')) {
        highlightedCell = elBelow;
        highlightedCell.style.background = 'rgba(74,144,217,0.15)';
      }
    }

    function onUp(ev) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);

      // 移除ghost
      if (ghost) { ghost.remove(); ghost = null; }

      // 恢复原block样式
      block.style.opacity = '';
      block.style.border = '';
      block.style.zIndex = '';

      if (highlightedCell && isDragging) {
        highlightedCell.style.background = '';
        const newDay = parseInt(highlightedCell.dataset.day);
        const newPeriod = parseInt(highlightedCell.dataset.period);
        if (!isNaN(newDay) && !isNaN(newPeriod)) {
          course.day = newDay;
          course.periodIndex = newPeriod;
          saveAll();
          renderCourses();
        }
        highlightedCell = null;
      }

      isDragging = false;
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ==================== 拉伸跨节 ====================
function setupResize(handle, block, course, parentCell) {
  handle.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const origSpan = course.span || 1;

    const periods = computePeriods();
    const p = periods[course.periodIndex];
    const maxSpan = p.session === 'am'
      ? config.morningCount - course.periodIndex
      : config.afternoonCount - (course.periodIndex - config.morningCount);

    const cellH = parentCell.getBoundingClientRect().height;

    function onMove(ev) {
      const dy = ev.clientY - startY;
      const deltaSpan = Math.round(dy / cellH);
      let newSpan = Math.max(1, Math.min(maxSpan, origSpan + deltaSpan));
      course.span = newSpan;

      if (newSpan > 1) {
        const lastPi = course.periodIndex + newSpan - 1;
        const lastCell = document.querySelector(`.tt-cell[data-day="${course.day}"][data-period="${lastPi}"]`);
        if (lastCell) {
          const cRect = parentCell.getBoundingClientRect();
          const lRect = lastCell.getBoundingClientRect();
          block.style.height = (lRect.bottom - cRect.top - 4) + 'px';
        }
      } else {
        block.style.height = '';
      }

      const allP = computePeriods();
      const endP = allP[course.periodIndex + newSpan - 1];
      const startP = allP[course.periodIndex];
      if (startP && endP) {
        block.querySelector('.evt-time-text').innerText = `${minsToStr(startP.start)} - ${minsToStr(endP.end)}`;
      }
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      saveAll();
      renderCourses();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ==================== 弹窗 ====================
let editingId = null;
let selectedColor = '#4A90D9';

function populatePeriodSelect() {
  const sel = document.getElementById('input-period');
  sel.innerHTML = '';
  const periods = computePeriods();
  periods.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.gi;
    opt.innerText = `第${p.num}节 (${p.session === 'am' ? '上午' : '下午'} ${minsToStr(p.start)})`;
    sel.appendChild(opt);
  });
}

function openAddModal(day, periodIndex) {
  editingId = null;
  document.getElementById('modal-title').innerText = '添加课程';
  document.getElementById('input-name').value = '';
  document.getElementById('input-day').value = String(day !== undefined ? day : 0);
  populatePeriodSelect();
  document.getElementById('input-period').value = String(periodIndex !== undefined ? periodIndex : 0);
  document.getElementById('input-span').value = '1';
  selectColor('#4A90D9');
  document.getElementById('modal-overlay').style.display = 'flex';
}

function openEditModal(c) {
  editingId = c.id;
  document.getElementById('modal-title').innerText = '编辑课程';
  document.getElementById('input-name').value = c.name;
  document.getElementById('input-day').value = String(c.day);
  populatePeriodSelect();
  document.getElementById('input-period').value = String(c.periodIndex);
  document.getElementById('input-span').value = String(c.span || 1);
  selectColor(c.color || '#4A90D9');
  document.getElementById('modal-overlay').style.display = 'flex';
}

function selectColor(c) {
  selectedColor = c;
  document.querySelectorAll('.color-opt').forEach(el => {
    el.classList.toggle('selected', el.dataset.color === c);
  });
}
document.querySelectorAll('.color-opt').forEach(el => {
  el.addEventListener('click', () => selectColor(el.dataset.color));
});

document.getElementById('modal-cancel').addEventListener('click', () => {
  document.getElementById('modal-overlay').style.display = 'none';
});
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
});

document.getElementById('modal-confirm').addEventListener('click', () => {
  const name = document.getElementById('input-name').value.trim() || '未命名';
  const day = parseInt(document.getElementById('input-day').value);
  const pi = parseInt(document.getElementById('input-period').value);
  const span = parseInt(document.getElementById('input-span').value);

  if (editingId) {
    const c = courses.find(x => x.id === editingId);
    if (c) { c.name = name; c.day = day; c.periodIndex = pi; c.span = span; c.color = selectedColor; }
  } else {
    courses.push({ id: 'c-' + Date.now(), name, day, periodIndex: pi, span, color: selectedColor });
  }
  saveAll();
  renderCourses();
  document.getElementById('modal-overlay').style.display = 'none';
});

// ==================== 设置弹窗 ====================
function openSettings() {
  document.getElementById('set-morning-start').value = minsToStr(config.morningStart);
  document.getElementById('set-morning-count').value = config.morningCount;
  document.getElementById('set-afternoon-start').value = minsToStr(config.afternoonStart);
  document.getElementById('set-afternoon-count').value = config.afternoonCount;
  document.getElementById('set-period-duration').value = config.periodDuration;
  document.getElementById('set-break-duration').value = config.breakDuration;
  updateSettingsPreview();
  document.getElementById('settings-overlay').style.display = 'flex';
}

function updateSettingsPreview() {
  const ms = strToMins(document.getElementById('set-morning-start').value);
  const mc = parseInt(document.getElementById('set-morning-count').value) || 4;
  const as = strToMins(document.getElementById('set-afternoon-start').value);
  const ac = parseInt(document.getElementById('set-afternoon-count').value) || 4;
  const pd = parseInt(document.getElementById('set-period-duration').value) || 45;
  const bd = parseInt(document.getElementById('set-break-duration').value) || 10;

  let html = '<strong>预览时间表：</strong><br>';
  let t = ms;
  for (let i = 0; i < mc; i++) {
    html += `第${i + 1}节：${minsToStr(t)} - ${minsToStr(t + pd)}<br>`;
    t += pd + bd;
  }
  const lastMorningEnd = ms + mc * pd + (mc - 1) * bd;
  html += `<span style="color:#38A169">🍴 午休：${minsToStr(lastMorningEnd)} - ${minsToStr(as)}</span><br>`;
  t = as;
  for (let i = 0; i < ac; i++) {
    const n = mc + i + 1;
    html += `第${n}节：${minsToStr(t)} - ${minsToStr(t + pd)}<br>`;
    t += pd + bd;
  }
  document.getElementById('computed-preview').innerHTML = html;
}

// Live preview on input change
['set-morning-start', 'set-morning-count', 'set-afternoon-start', 'set-afternoon-count', 'set-period-duration', 'set-break-duration'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateSettingsPreview);
});

document.getElementById('settings-cancel').addEventListener('click', () => {
  document.getElementById('settings-overlay').style.display = 'none';
});
document.getElementById('settings-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
});

document.getElementById('settings-confirm').addEventListener('click', () => {
  config.morningStart = strToMins(document.getElementById('set-morning-start').value);
  config.morningCount = parseInt(document.getElementById('set-morning-count').value) || 4;
  config.afternoonStart = strToMins(document.getElementById('set-afternoon-start').value);
  config.afternoonCount = parseInt(document.getElementById('set-afternoon-count').value) || 4;
  config.periodDuration = parseInt(document.getElementById('set-period-duration').value) || 45;
  config.breakDuration = parseInt(document.getElementById('set-break-duration').value) || 10;
  saveAll();
  renderTimetable();
  document.getElementById('settings-overlay').style.display = 'none';
  showToast('设置已应用', '课表时间已重新计算！');
});

// ==================== Toolbar ====================
document.getElementById('btn-add-class').addEventListener('click', () => openAddModal());
document.getElementById('btn-settings').addEventListener('click', openSettings);

function updateToggleButtons() {
  const btnSat = document.getElementById('btn-toggle-sat');
  const btnSun = document.getElementById('btn-toggle-sun');
  if (btnSat) btnSat.innerText = `周六: ${config.showSat !== false ? '显示' : '隐藏'}`;
  if (btnSun) btnSun.innerText = `周日: ${config.showSun !== false ? '显示' : '隐藏'}`;
}

document.getElementById('btn-toggle-sat').addEventListener('click', () => {
  config.showSat = config.showSat !== false ? false : true;
  saveAll();
  updateToggleButtons();
  renderTimetable();
  if (currentView === 'dashboard') engineTick();
});

document.getElementById('btn-toggle-sun').addEventListener('click', () => {
  config.showSun = config.showSun !== false ? false : true;
  saveAll();
  updateToggleButtons();
  renderTimetable();
  if (currentView === 'dashboard') engineTick();
});
updateToggleButtons();

document.getElementById('btn-save').addEventListener('click', () => { saveAll(); showToast('保存成功', '所有数据已保存！'); });

// 一键清除（二次确认）
document.getElementById('btn-clear-all-courses').addEventListener('click', () => {
  if (!confirm('⚠️ 确认清空所有课程？\n此操作不可撤销！')) return;
  if (!confirm('🗑️ 再次确认：真的要删除全部课程吗？')) return;
  courses = [];
  saveAll();
  renderCourses();
  showToast('已清除', '所有课程已清空。');
});

// 一键铺满
document.getElementById('btn-fill-all').addEventListener('click', () => {
  document.getElementById('fill-overlay').style.display = 'flex';
});
document.getElementById('fill-cancel').addEventListener('click', () => {
  document.getElementById('fill-overlay').style.display = 'none';
});
document.getElementById('fill-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'fill-overlay') e.target.style.display = 'none';
});


// =====================================================
// Pomodoro Module - Implementation
// =====================================================

const PomodoroManager = {
  timer: null,
  timeLeft: 1500, // 25:00 in seconds
  totalTime: 1500,
  isRunning: false,
  mode: 'work', // work, short, long
  isSynced: false,
  
  settings: JSON.parse(localStorage.getItem('pomo_settings') || 'null') || {
    workTime: 25,
    shortTime: 5,
    longTime: 15,
    longInterval: 4,
    autoBreak: false,
    autoWork: false,
    displayMode: 'normal'
  },

  sessionsCompleted: 0,
  savedState: null, // 存储同步前的状态: { mode, timeLeft, totalTime, isRunning }


  stats: JSON.parse(localStorage.getItem('pomo_stats') || 'null') || {
    todayCount: 0,
    todayMins: 0,
    streakDays: 0,
    lastActiveDate: ''
  },

  init() {
    this.checkDate(); // 仅调用一次
    this.bindEvents();
    this.updateDisplay();
    this.updateSettingsUI();
    this.updateStatsUI();
    
    // 初始化时同步一次
    this.setMode(this.mode); 
  },

  loadState() {
    // Basic init from settings
    this.setMode(this.mode);
  },

  checkDate() {
    const today = todayDS();
    let isNewDay = false;
    
    if (this.stats.lastActiveDate !== today) {
      isNewDay = true;
      if (this.stats.lastActiveDate) {
        const last = new Date(this.stats.lastActiveDate);
        const curr = new Date(today);
        const lastUTC = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
        const currUTC = Date.UTC(curr.getFullYear(), curr.getMonth(), curr.getDate());
        const diffDays = Math.floor((currUTC - lastUTC) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 1) {
          this.stats.streakDays = 0;
        }
      } else {
        this.stats.streakDays = 0;
      }
      this.stats.todayCount = 0;
      this.stats.todayMins = 0;
      this.stats.lastActiveDate = today;
      this.saveStats();
    }
    return isNewDay;
  },

  saveStats() {
    localStorage.setItem('pomo_stats', JSON.stringify(this.stats));
  },

  updateStatsUI() {
    const elToday = document.getElementById('pomo-stat-today');
    const elMins = document.getElementById('pomo-stat-mins');
    const elStreak = document.getElementById('pomo-stat-streak');
    if (elToday) elToday.innerText = this.stats.todayCount || 0;
    if (elMins) elMins.innerText = this.stats.todayMins || 0;
    if (elStreak) elStreak.innerText = this.stats.streakDays || 0;
  },

  resetStats() {
    if (confirm('⚠️ 确认要重置所有番茄钟统计数据吗？此操作不可撤销！')) {
      this.stats.todayCount = 0;
      this.stats.todayMins = 0;
      this.stats.streakDays = 0;
      this.stats.lastActiveDate = todayDS();
      this.saveStats();
      this.updateStatsUI();
      showToast('统计已重置', '今日专注、专注分钟及连续天数已归零。');
    }
  },

  bindEvents() {
    document.getElementById('pomo-start-pause').addEventListener('click', () => this.toggleTimer());
    document.getElementById('pomo-reset').addEventListener('click', () => this.resetTimer());
    document.getElementById('pomo-skip').addEventListener('click', () => this.skipMode());
    
    // Timer display mode buttons
    document.querySelectorAll('.pomo-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.settings.displayMode = btn.dataset.vmode;
        this.saveSettings();
        this.updateDisplay();
      });
    });
    
    // Mode buttons
    document.querySelectorAll('.pomo-mode-btn[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.isSynced = false;
        this.updateSyncUI();
        this.setMode(btn.dataset.mode);
        // 手动切换至休息或手动切回专注，通常意味着重置本轮循环（除非是手动切到长休）
        if (btn.dataset.mode !== 'long') {
          this.sessionsCompleted = 0;
        }
      });
    });

    // Sync button
    const toggleSyncFn = () => {
      this.isSynced = !this.isSynced;
      
      if (this.isSynced) {
        // 保存当前状态，方便取消同步时还原
        this.savedState = {
          mode: this.mode,
          timeLeft: this.timeLeft,
          totalTime: this.totalTime,
          isRunning: this.isRunning
        };
        // 先停止当前计时器（避免叠加）
        this.stopTimer();
        // 先同步一次，计算好 timeLeft/totalTime/mode
        this.syncWithSchedule();
        // 再启动唯一的计时器（startTimer 内每秒调 syncWithSchedule）
        this.startTimer();
        showToast('同步成功', '番茄钟已与当前课表同步');
      } else {
        // 还原状态
        if (this.savedState) {
          this.mode = this.savedState.mode;
          this.timeLeft = this.savedState.timeLeft;
          this.totalTime = this.savedState.totalTime;
          const wasRunning = this.savedState.isRunning;
          
          this.stopTimer();
          this.updateDisplay();
          this.updateStatusText();
          
          // 切换模式按钮状态
          document.querySelectorAll('.pomo-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.mode);
          });
          
          if (wasRunning) this.startTimer();
          this.savedState = null;
        }
        showToast('手动模式', '已恢复至之前的专注状态');
      }
      this.updateSyncUI();
    };

    document.getElementById('pomo-sync-toggle').addEventListener('click', toggleSyncFn);
    
    // Reset stats button
    const btnResetStats = document.getElementById('pomo-reset-stats');
    if (btnResetStats) {
      btnResetStats.addEventListener('click', () => this.resetStats());
    }
    const ftSyncBtn = document.getElementById('ft-sync-toggle');
    if (ftSyncBtn) ftSyncBtn.addEventListener('click', toggleSyncFn);

    // Settings inputs
    ['pomo-work-time', 'pomo-short-time', 'pomo-long-time', 'pomo-long-interval'].forEach(id => {
      document.getElementById(id).addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        if (id.includes('work')) this.settings.workTime = val;
        if (id.includes('short')) this.settings.shortTime = val;
        if (id.includes('long-time')) this.settings.longTime = val;
        if (id.includes('long-interval')) this.settings.longInterval = val;
        this.saveSettings();
        if (!this.isRunning) this.setMode(this.mode); // Update display if not running
      });
    });

    ['pomo-auto-break', 'pomo-auto-work'].forEach(id => {
      document.getElementById(id).addEventListener('change', (e) => {
        if (id.includes('break')) this.settings.autoBreak = e.target.checked;
        if (id.includes('work')) this.settings.autoWork = e.target.checked;
        this.saveSettings();
      });
    });

    // Module 2 (FocusTide Style) Events
    const ftStartBtn = document.getElementById('ft-start-pause');
    if (ftStartBtn) ftStartBtn.addEventListener('click', () => this.toggleTimer());
    
    const ftResetBtn = document.getElementById('ft-reset');
    if (ftResetBtn) ftResetBtn.addEventListener('click', () => this.resetTimer());
    
    const ftSkipBtn = document.getElementById('ft-skip');
    if (ftSkipBtn) ftSkipBtn.addEventListener('click', () => this.skipMode());

    const ftSetBtn = document.getElementById('ft-open-settings');
    if (ftSetBtn) ftSetBtn.addEventListener('click', () => {
      if (typeof switchView === 'function') switchView('settings');
    });

    // Fullscreen Toggle for Module 2
    const ftFsBtn = document.getElementById('ft-fullscreen-toggle');
    if (ftFsBtn) {
      ftFsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
          });
        } else {
          document.exitFullscreen();
        }
      });
    }

    // Update fullscreen icon on state change
    document.addEventListener('fullscreenchange', () => {
      const fsIcon = document.getElementById('ft-fullscreen-svg');
      if (fsIcon) {
        if (document.fullscreenElement) {
          // Exit Fullscreen path
          fsIcon.innerHTML = '<path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>';
        } else {
          // Enter Fullscreen path
          fsIcon.innerHTML = '<path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>';
        }
      }
    });
  },

  setMode(mode) {
    this.mode = mode;
    this.stopTimer();
    
    let mins = 25;
    if (mode === 'work') mins = this.settings.workTime;
    else if (mode === 'short') mins = this.settings.shortTime;
    else if (mode === 'long') mins = this.settings.longTime;
    
    this.timeLeft = mins * 60;
    this.totalTime = this.timeLeft;
    
    // Update UI
    document.querySelectorAll('.pomo-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    // Update Module 2 mode buttons
    document.querySelectorAll('.ft-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    document.getElementById('view-pomodoro').dataset.pomoType = mode;
    this.updateDisplay();
    this.updateStatusText();
    this.updateFocusTideControls();
  },

  updateFocusTideControls() {
    const btnReset = document.getElementById('ft-reset');
    const btnSkip = document.getElementById('ft-skip');
    if (!btnReset || !btnSkip) return;
    
    if (this.isRunning) {
      // 运行中：重置、暂停（无跳过）
      btnReset.classList.remove('hidden');
      btnSkip.classList.add('hidden');
    } else {
      if (this.timeLeft >= this.totalTime) {
        // 未开始：开始、跳过（无重置）
        btnReset.classList.add('hidden');
        btnSkip.classList.remove('hidden');
      } else {
        // 暂停：重置、开始、跳过全有
        btnReset.classList.remove('hidden');
        btnSkip.classList.remove('hidden');
      }
    }
  },

  updateDisplay() {
    const hrs = Math.floor(this.timeLeft / 3600);
    const min = Math.floor((this.timeLeft % 3600) / 60);
    const sec = this.timeLeft % 60;
    
    const el = document.getElementById('pomo-time');
    const mode = this.settings.displayMode || 'normal';
    
    if (mode === 'normal') {
      if (hrs > 0) {
        el.innerText = `${hrs}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        el.style.fontSize = '44px';
      } else {
        el.innerText = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        el.style.fontSize = '54px';
      }
    } else if (mode === 'rough') {
      const waitMin = Math.ceil(this.timeLeft / 60);
      if (hrs > 0) {
        el.innerText = `${hrs} 时 ${min} 分`;
        el.style.fontSize = '28px';
      } else {
        el.innerText = `${waitMin} 分`;
        el.style.fontSize = '48px';
      }
    } else if (mode === 'percent') {
      const pct = this.totalTime > 0 ? Math.round((this.timeLeft / this.totalTime) * 100) : 0;
      el.innerText = `${pct}%`;
      el.style.fontSize = '54px';
    }

    // 更新分段按钮状态
    document.querySelectorAll('.pomo-view-btn').forEach(btn => {
      btn.classList.toggle('active', (btn.dataset.vmode || 'normal') === mode);
    });
    
    // Update circle progress
    const circle = document.getElementById('pomo-progress-circle');
    const perimeter = 2 * Math.PI * 45;
    const offset = perimeter * (1 - this.timeLeft / this.totalTime);
    if (circle) circle.style.strokeDashoffset = offset;

    // Update Module 2 (FocusTide) Display
    const ftMins = document.getElementById('ft-mins');
    const ftUnit = document.getElementById('ft-unit');
    if (ftMins) {
      // 统一清除内联字号，保证高度一致
      ftMins.style.fontSize = '';
      if (ftUnit) ftUnit.style.display = '';

      if (mode === 'normal') {
        if (hrs > 0) {
          ftMins.innerText = `${hrs}:${String(min).padStart(2, '0')}`;
          if (ftUnit) ftUnit.innerText = `:${String(sec).padStart(2, '0')}`;
        } else {
          ftMins.innerText = String(min).padStart(2, '0');
          if (ftUnit) ftUnit.innerText = `:${String(sec).padStart(2, '0')}`;
        }
      } else if (mode === 'rough') {
        if (hrs > 0) {
          ftMins.innerHTML = `${hrs}<span class="ft-time-unit" style="margin: 0 8px 0 4px;">时</span>${min}`;
          if (ftUnit) ftUnit.innerText = '分';
        } else {
          const waitMin = Math.ceil(this.timeLeft / 60);
          ftMins.innerText = String(waitMin);
          if (ftUnit) ftUnit.innerText = '分';
        }
      } else if (mode === 'percent') {
        const pct = this.totalTime > 0 ? Math.round((this.timeLeft / this.totalTime) * 100) : 0;
        ftMins.innerText = String(pct);
        if (ftUnit) ftUnit.innerText = '%';
      }
    }

    // Update FocusTide progress background
    const ftBgLayer = document.getElementById('ft-progress-bg');
    if (ftBgLayer && this.totalTime > 0) {
      const elapsed = this.totalTime - this.timeLeft;
      const pct = (elapsed / this.totalTime) * 100;
      
      // Determine what the next mode's color should be
      let nextColor = 'var(--ft-work)';
      if (this.mode === 'work') {
        // sessionsCompleted is updated upon work finish, but during work we can check if it's the last one
        const intv = this.settings.longInterval || 4;
        const willBeLong = (this.sessionsCompleted + 1) >= intv;
        nextColor = willBeLong ? 'var(--ft-long)' : 'var(--ft-short)';
      }
      
      ftBgLayer.style.backgroundColor = nextColor;
      // Slide the next mode's color in from the left over time
      ftBgLayer.style.transform = `translateX(${-100 + pct}%)`;
    }
  },

  toggleTimer() {
    if (this.isRunning) this.stopTimer();
    else this.startTimer();
  },

  startTimer() {
    if (this.isRunning) return;
    this.isRunning = true;
    const startIcon = document.getElementById('pomo-start-icon');
    if (startIcon) startIcon.innerText = '⏸';
    
    // Module 2: swap play SVG to pause icon (two lines)
    const ftPlaySvg = document.getElementById('ft-play-svg');
    if (ftPlaySvg) {
      ftPlaySvg.innerHTML = '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M10 6v12M14 6v12"/>';
    }
    
    this.updateStatusText();
    this.updateFocusTideControls();
    
    this.timer = setInterval(() => {
      if (this.isSynced) {
        // 同步模式：实时计算剩余时间，不自行倒计时
        this.syncWithSchedule();
      } else {
        this.timeLeft--;
        this.updateDisplay();
        
        if (this.timeLeft <= 0) {
          this.onTimerFinish();
        }
      }
    }, 1000);
  },

  stopTimer() {
    clearInterval(this.timer);
    this.isRunning = false;
    const startIcon = document.getElementById('pomo-start-icon');
    if (startIcon) startIcon.innerText = '▶';
    
    // Module 2: swap pause SVG back to play icon outline
    const ftPlaySvg = document.getElementById('ft-play-svg');
    if (ftPlaySvg) {
      ftPlaySvg.innerHTML = '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M8 5v14l11-7z"/>';
    }
    
    this.updateStatusText();
    this.updateFocusTideControls();
  },

  resetTimer() {
    this.setMode(this.mode);
  },

  skipMode() {
    this.onTimerFinish(true);
  },

  updateStatusText() {
    const el = document.getElementById('pomo-status-text');
    const ftModeName = document.getElementById('ft-mode-name');
    
    const statusMsg = this.mode === 'work' ? (this.isRunning ? '专注学习中...' : '准备开始专注') : (this.isRunning ? '休息片刻...' : '准备开始休息');
    // FocusTide uses minimalist labels: "工作", "休息"
    const modeNameCn = this.mode === 'work' ? '工作' : '休息';

    if (el) el.innerText = statusMsg + (this.isSynced ? ' (已同步课表)' : '');
    if (ftModeName) ftModeName.innerText = modeNameCn;
  },

  onTimerFinish(skipped = false) {
    this.stopTimer();

    if (!skipped && this.mode === 'work') {
      this.checkDate();
      if (this.stats.todayCount === 0 && this.stats.streakDays >= 0) {
        this.stats.streakDays += 1;
      }
      this.stats.todayCount += 1;
      this.stats.todayMins += this.settings.workTime;
      this.saveStats();
      this.updateStatsUI();
    }

    if (!skipped) {
      this.playAlarm();
      showToast('时间到', this.mode === 'work' ? '专注结束，休息一下吧！' : '休息结束，开始专注吧！');
    }
    
    // Auto switch modes
    if (this.mode === 'work') {
      this.sessionsCompleted++;
      if (this.sessionsCompleted >= (this.settings.longInterval || 4)) {
        this.setMode('long');
        this.sessionsCompleted = 0;
      } else {
        this.setMode('short');
      }
      if (this.settings.autoBreak) this.startTimer();
    } else {
      this.setMode('work');
      if (this.settings.autoWork) this.startTimer();
    }
  },

  playAlarm() {
    // Simple notification sound or visual feedback
    if (ipcRenderer) ipcRenderer.send('msg-box', { title: '番茄钟提醒', message: '当前阶段已完成！' });
  },

  syncWithSchedule() {
    if (!this.isSynced) return;
    
    const now = new Date();
    const currMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const dow = todayDow();
    const ds = todayDS();
    const periods = computePeriods();
    const todayIsRest = isRestDay(ds);
    
    // 1. 确定当前处于哪个时段（上课、课间、午休、还是已结束）
    let targetMode = null;
    let periodStart = 0;
    let periodEnd = 0;
    let statusMsg = "";

    if (todayIsRest) {
      // 今天是休息日，直接显示休息
      targetMode = 'long';
      periodStart = 0;
      periodEnd = 24 * 60;
      statusMsg = '同步中：今日休息';
      this.timeLeft = Math.max(0, Math.floor((periodEnd - currMins) * 60));
      this.totalTime = 24 * 60 * 60;
    } else {
      // 检查是否在上课时段内
      const currPeriod = periods.find(p => currMins >= p.start && currMins < p.end);
      
      if (currPeriod) {
        // 检查当天此节次是否有排课
        const hasClass = courses.some(c =>
          c.day === dow &&
          c.periodIndex <= currPeriod.gi &&
          (c.periodIndex + (c.span || 1)) > currPeriod.gi
        );
        if (hasClass) {
          targetMode = 'work';
          statusMsg = '同步中：正在上课';
        } else {
          targetMode = 'short';
          statusMsg = '同步中：空课/课间';
        }
        periodStart = currPeriod.start;
        periodEnd = currPeriod.end;
      } else {
        // 检查是否在午休 (上午最后一节结束到下午第一节开始之间)
        const amPeriods = periods.filter(p => p.session === 'am');
        const pmPeriods = periods.filter(p => p.session === 'pm');
        const lastAm = amPeriods.length > 0 ? amPeriods[amPeriods.length - 1] : null;
        const firstPm = pmPeriods.length > 0 ? pmPeriods[0] : null;
        const lunchStart = lastAm ? lastAm.end : config.afternoonStart;
        const lunchEnd = firstPm ? firstPm.start : config.afternoonStart;

        if (currMins >= lunchStart && currMins < lunchEnd) {
          targetMode = 'long';
          periodStart = lunchStart;
          periodEnd = lunchEnd;
          statusMsg = '同步中：午休时间';
        } else {
          // 检查是否在普通课间 (两个节次之间，排除午休区间)
          for (let i = 0; i < periods.length - 1; i++) {
            const gapStart = periods[i].end;
            const gapEnd = periods[i + 1].start;
            // 跳过午休区间（上午最后一节和下午第一节之间）
            if (periods[i].session === 'am' && periods[i + 1].session === 'pm') continue;
            if (currMins >= gapStart && currMins < gapEnd) {
              targetMode = 'short';
              periodStart = gapStart;
              periodEnd = gapEnd;
              statusMsg = '同步中：课间休息';
              break;
            }
          }
        }
      }
    }

    // 2. 更新状态
    if (targetMode) {
      // 更新模式（仅在模式变化时才切换 UI）
      if (this.mode !== targetMode) {
        this.mode = targetMode;
        document.querySelectorAll('.pomo-mode-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.mode === targetMode);
        });
        const viewPomodoro = document.getElementById('view-pomodoro');
        if (viewPomodoro) viewPomodoro.dataset.pomoType = targetMode;
      }
      
      // 实时更新剩余时间和总时长（根据当前时间精确计算）
      if (!todayIsRest) {
        this.timeLeft = Math.max(0, Math.floor((periodEnd - currMins) * 60));
        this.totalTime = Math.max(1, Math.floor((periodEnd - periodStart) * 60));
      }
      
      // 注意：同步模式下计时器由 startTimer() 统一启动，此处不重复创建
      // (toggleSyncFn 激活同步时会调用 startTimer()，随后每秒触发 syncWithSchedule)
      
      document.getElementById('pomo-status-text').innerText = statusMsg;
      document.getElementById('pomo-time').style.display = 'flex';
      
      const ftModeName = document.getElementById('ft-mode-name');
      const ftTimerDisplay = document.getElementById('ft-timer-display');
      if (ftTimerDisplay) ftTimerDisplay.style.display = 'flex';
      if (ftModeName) ftModeName.innerText = targetMode === 'work' ? '上课' : targetMode === 'long' ? '午休' : '课间';
    } else {
      // 课程已结束或尚未开始
      const lastPeriod = periods[periods.length - 1];
      const ftTimerDisplay = document.getElementById('ft-timer-display');
      const ftModeName = document.getElementById('ft-mode-name');
      
      if (lastPeriod && currMins >= lastPeriod.end) {
        if (this.isRunning) this.stopTimer();
        document.getElementById('pomo-status-text').innerText = '今日课程已结束';
        document.getElementById('pomo-time').style.display = 'none';
        if (ftTimerDisplay) ftTimerDisplay.style.display = 'none';
        if (ftModeName) ftModeName.innerText = '已结束';
        this.timeLeft = 0;
        this.totalTime = 1;
      } else {
        // 尚未到第一节课：显示距离第一节课的等待时间
        const firstPeriod = periods[0];
        if (firstPeriod && currMins < firstPeriod.start) {
          const waitSecs = Math.floor((firstPeriod.start - currMins) * 60);
          this.timeLeft = waitSecs;
          this.totalTime = Math.max(1, waitSecs);
          document.getElementById('pomo-status-text').innerText = '等待今日课程开始';
          document.getElementById('pomo-time').style.display = 'flex';
          if (ftTimerDisplay) ftTimerDisplay.style.display = 'flex';
          if (ftModeName) ftModeName.innerText = '等待';
        } else {
          if (this.isRunning) this.stopTimer();
          document.getElementById('pomo-status-text').innerText = '等待今日课程开始';
          document.getElementById('pomo-time').style.display = 'none';
          if (ftTimerDisplay) ftTimerDisplay.style.display = 'none';
          if (ftModeName) ftModeName.innerText = '等待';
        }
      }
    }
    
    this.updateDisplay();
  },

  updateSyncUI() {
    const btn = document.getElementById('pomo-sync-toggle');
    const ftBtn = document.getElementById('ft-sync-toggle');
    const container = document.querySelector('.pomo-main-card');
    const ftContainer = document.getElementById('pomo-module-2');
    
    if (this.isSynced) {
      if (btn) {
        btn.classList.add('active');
        btn.innerHTML = '<span class="sync-icon">🍅</span> 项目番茄';
      }
      if (ftBtn) {
        ftBtn.classList.add('active');
        ftBtn.title = '取消同步';
      }
      if (container) container.classList.add('sync-mode-active');
      if (ftContainer) ftContainer.classList.add('sync-mode-active');
    } else {
      if (btn) {
        btn.classList.remove('active');
        btn.innerHTML = '<span class="sync-icon">🔄</span> 同步课表';
      }
      if (ftBtn) {
        ftBtn.classList.remove('active');
        ftBtn.title = '与课表同步';
      }
      if (container) container.classList.remove('sync-mode-active');
      if (ftContainer) ftContainer.classList.remove('sync-mode-active');
      // 确保时间显示恢复
      document.getElementById('pomo-time').style.display = 'flex';
      const ftTimerDisplay = document.getElementById('ft-timer-display');
      if (ftTimerDisplay) ftTimerDisplay.style.display = 'flex';
    }
  },

  updateSettingsUI() {
    const elWork = document.getElementById('pomo-work-time');
    const elShort = document.getElementById('pomo-short-time');
    const elLong = document.getElementById('pomo-long-time');
    const elInterval = document.getElementById('pomo-long-interval');
    const elAutoBreak = document.getElementById('pomo-auto-break');
    const elAutoWork = document.getElementById('pomo-auto-work');

    if (elWork) elWork.value = this.settings.workTime;
    if (elShort) elShort.value = this.settings.shortTime;
    if (elLong) elLong.value = this.settings.longTime;
    if (elInterval) elInterval.value = this.settings.longInterval || 4;
    if (elAutoBreak) elAutoBreak.checked = this.settings.autoBreak;
    if (elAutoWork) elAutoWork.checked = this.settings.autoWork;
  },

  saveSettings() {
    localStorage.setItem('pomo_settings', JSON.stringify(this.settings));
  }
};

// ==================== 全局初始化 ====================
// 冗余初始化逻辑已清理，由脚本末尾的唯一 init 函数控制。



// ==================== 课表模板数据 ====================
const COURSE_TEMPLATES = {
  primary: {
    subjects: [
      { name: '语文', color: '#E05D5D' }, { name: '数学', color: '#4A90D9' }, { name: '英语', color: '#45B7C5' },
      { name: '科学', color: '#5BBD72' }, { name: '道德与法治', color: '#F0C75E' }, { name: '体育', color: '#E8913A' },
      { name: '艺术', color: '#9B72CF' }, { name: '信息技术', color: '#4A90D9' }
    ],
    mainWeight: ['语文', '数学', '英语']
  },
  middle: {
    subjects: [
      { name: '语文', color: '#E05D5D' }, { name: '数学', color: '#4A90D9' }, { name: '英语', color: '#45B7C5' },
      { name: '物理', color: '#9B72CF' }, { name: '化学', color: '#5BBD72' }, { name: '生物', color: '#38A169' },
      { name: '地理', color: '#E8913A' }, { name: '历史', color: '#E88DA4' }, { name: '体育', color: '#4A90D9' }
    ],
    mainWeight: ['语文', '数学', '英语']
  },
  high: {
    subjects: [
      { name: '语文', color: '#E05D5D' }, { name: '数学', color: '#4A90D9' }, { name: '英语', color: '#45B7C5' },
      { name: '物理', color: '#9B72CF' }, { name: '化学', color: '#5BBD72' }, { name: '生物', color: '#38A169' },
      { name: '地理', color: '#E8913A' }, { name: '历史', color: '#E88DA4' }, { name: '政治', color: '#F0C75E' }
    ],
    mainWeight: ['语文', '数学', '英语', '物理', '历史']
  },
  cs: {
    sparse: true,
    subjects: [
      { name: '数据结构', color: '#4A90D9' }, { name: '计算机网络', color: '#5BBD72' }, { name: '操作系统', color: '#E8913A' },
      { name: '算法分析', color: '#9B72CF' }, { name: '编译原理', color: '#E05D5D' }, { name: '数据库', color: '#45B7C5' },
      { name: '软件工程', color: '#F0C75E' }, { name: '形势与政策', color: '#CBD5E1' }
    ]
  },
  business: {
    sparse: true,
    subjects: [
      { name: '管理学', color: '#4A90D9' }, { name: '微观经济学', color: '#E8913A' }, { name: '市场营销', color: '#5BBD72' },
      { name: '财务会计', color: '#9B72CF' }, { name: '统计学', color: '#E05D5D' }, { name: '组织行为学', color: '#45B7C5' }
    ]
  },
  art: {
    sparse: true,
    subjects: [
      { name: '素描基础', color: '#4A90D9' }, { name: '色彩表现', color: '#E88DA4' }, { name: '中外美术史', color: '#9B72CF' },
      { name: '平面构成', color: '#45B7C5' }, { name: '立体构成', color: '#F0C75E' }, { name: '大学美育', color: '#5BBD72' }
    ]
  },
  medicine: {
    sparse: true,
    subjects: [
      { name: '系统解剖学', color: '#E05D5D' }, { name: '组织胚胎学', color: '#E8913A' }, { name: '生理学', color: '#4A90D9' },
      { name: '生物化学', color: '#5BBD72' }, { name: '病理学', color: '#9B72CF' }, { name: '药理学', color: '#45B7C5' }
    ]
  },
  law: {
    sparse: true,
    subjects: [
      { name: '法理学', color: '#4A90D9' }, { name: '宪法学', color: '#E05D5D' }, { name: '民法学', color: '#E8913A' },
      { name: '刑法学', color: '#9B72CF' }, { name: '行政法', color: '#F0C75E' }, { name: '经济法', color: '#5BBD72' }
    ]
  },
  engineer: {
    sparse: true,
    subjects: [
      { name: '高等数学', color: '#4A90D9' }, { name: '大学物理', color: '#9B72CF' }, { name: '工程图学', color: '#E8913A' },
      { name: '理论力学', color: '#E05D5D' }, { name: '材料力学', color: '#45B7C5' }, { name: '机械制造', color: '#5BBD72' }
    ]
  }
};

function fillTimetable(tplKey) {

  const tpl = COURSE_TEMPLATES[tplKey];
  if (!tpl) return;

  const totalPeriods = config.morningCount + config.afternoonCount;
  const days = 7; // 周一到周日
  const isSparse = !!tpl.sparse; // 大学风格：有空课

  courses = [];
  const allSubjects = [...tpl.subjects];
  const colors = {};
  allSubjects.forEach(s => colors[s.name] = s.color);

  for (let day = 0; day < days; day++) {
    let filled = new Set();
    for (let pi = 0; pi < totalPeriods; pi++) {
      if (filled.has(pi)) continue;

      // 大学风格：随机空课
      if (isSparse && Math.random() < 0.35) continue;

      // 选择课程：主科权重更高
      let pool = [...allSubjects.map(s => s.name)];
      if (tpl.mainWeight) {
        pool = [...pool, ...tpl.mainWeight, ...tpl.mainWeight];
      }
      const subjectName = pool[Math.floor(Math.random() * pool.length)];

      // 随机跨节（大学常见2节连堂）
      let span = 1;
      if (isSparse && Math.random() < 0.5 && pi + 1 < totalPeriods && !filled.has(pi + 1)) {
        span = 2;
      } else if (!isSparse && Math.random() < 0.15 && pi + 1 < totalPeriods && !filled.has(pi + 1)) {
        span = 2;
      }

      courses.push({
        id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        name: subjectName,
        day: day,
        periodIndex: pi,
        span: span,
        color: colors[subjectName] || '#4A90D9'
      });

      for (let s = 0; s < span; s++) filled.add(pi + s);
    }
  }

  saveAll();
  renderTimetable();
  document.getElementById('fill-overlay').style.display = 'none';
  showToast('课表已生成', `已使用"${document.querySelector(`.fill-template-card[data-tpl="${tplKey}"] .fill-tpl-name`)?.innerText || tplKey}"模板铺满课表！`);
}

document.querySelectorAll('.fill-template-card').forEach(card => {
  card.addEventListener('click', () => {
    const tplKey = card.dataset.tpl;
    if (courses.length > 0) {
      if (!confirm('当前已有课程，一键铺满会替换所有课程。继续？')) return;
    }
    fillTimetable(tplKey);
  });
});

// ==================== Toast ====================
let toastTimer = null;
function showToast(title, body) {
  document.getElementById('toast-title').innerText = title;
  document.getElementById('toast-body').innerText = body;
  document.getElementById('toast-notification').style.display = 'flex';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { document.getElementById('toast-notification').style.display = 'none'; }, 5000);
}
document.getElementById('toast-close').addEventListener('click', () => {
  document.getElementById('toast-notification').style.display = 'none';
});

// ==================== 铃声 ====================
let audioCtx = null;
function playBell() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  [880, 1100, 880, 660].forEach((f, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.25, audioCtx.currentTime + i * 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.2 + 0.3);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(audioCtx.currentTime + i * 0.2);
    o.stop(audioCtx.currentTime + i * 0.2 + 0.3);
  });
}

function sendNotification(title, body) {
  playBell();
  showToast(title, body);
  if (ipcRenderer) ipcRenderer.send('show-notification', { title, body });
}

// ==================== 引擎 ====================
let lastNotifyKey = '';

function engineTick() {
  const now = new Date();
  const ds = todayDS();
  const isHoliday = isRestDay(ds);
  const dayIdx = todayDow();
  const nowMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const periods = computePeriods();

  // Highlight active period label
  document.querySelectorAll('.tt-period-label').forEach(el => el.classList.remove('active-period'));

  if (isHoliday) {
    document.getElementById('current-event-name').innerText = '🎉 休假中';
    document.getElementById('current-event-time').innerText = '全天自由安排';
    document.getElementById('progress-bar').style.width = '0%';
    document.getElementById('progress-text').innerText = '--';
    document.getElementById('next-event-name').innerText = '--';
    document.getElementById('next-event-time').innerText = '';
    document.getElementById('next-wait-time').innerText = '享受假期！';
    return;
  }

  // Determine current and next period on the clock
  let curPeriod = null, nextPeriod = null;
  for (let i = 0; i < periods.length; i++) {
    if (nowMins >= periods[i].start && nowMins < periods[i].end) {
      curPeriod = periods[i]; nextPeriod = periods[i + 1] || null; break;
    }
    if (nowMins < periods[i].start) { nextPeriod = periods[i]; break; }
  }

  // Check if in lunch（只有当午休时长 > 0 时才有效）
  const lastAm = periods[config.morningCount - 1];
  const lunchStart = lastAm ? lastAm.end : config.afternoonStart;
  const hasLunch = config.afternoonStart > lunchStart;
  const isLunch = hasLunch && nowMins >= lunchStart && nowMins < config.afternoonStart;

  // Find today's courses
  const todayCourses = courses.filter(c => c.day === dayIdx);

  // Current course (by period)
  let curCourse = null;
  if (curPeriod) {
    curCourse = todayCourses.find(c => c.periodIndex <= curPeriod.gi && c.periodIndex + (c.span || 1) > curPeriod.gi);
    // Highlight label
    const lbl = document.getElementById('period-label-' + curPeriod.gi);
    if (lbl) lbl.classList.add('active-period');
  }

  // Next course
  let nextCourse = null;
  if (nextPeriod) {
    nextCourse = todayCourses.find(c => {
      const cEnd = c.periodIndex + (c.span || 1);
      return c.periodIndex <= nextPeriod.gi && cEnd > nextPeriod.gi;
    });
    if (!nextCourse) {
      // Search for the nearest course after nextPeriod
      for (let i = nextPeriod.gi; i < periods.length; i++) {
        nextCourse = todayCourses.find(c => c.periodIndex === i);
        if (nextCourse) { nextPeriod = periods[i]; break; }
      }
    }
  }

  // Update Dashboard
  if (curPeriod && curCourse) {
    const pEnd = periods[curCourse.periodIndex + (curCourse.span || 1) - 1];
    document.getElementById('current-event-name').innerText = curCourse.name;
    document.getElementById('current-event-time').innerText = `(${minsToStr(periods[curCourse.periodIndex].start)} - ${minsToStr(pEnd.end)})`;

    const dur = pEnd.end - periods[curCourse.periodIndex].start;
    const elapsed = nowMins - periods[curCourse.periodIndex].start;
    const pct = Math.min(100, Math.max(0, (elapsed / dur) * 100));
    document.getElementById('progress-bar').style.width = pct + '%';

    const remain = Math.max(0, pEnd.end - nowMins);
    const rm = Math.floor(remain);
    const rs = Math.round((remain - rm) * 60);
    document.getElementById('progress-text').innerText = `剩余 ${rm}分${String(rs).padStart(2, '0')}秒`;

    // Notify at start
    const nk = curCourse.id + '_s';
    if (lastNotifyKey !== nk && elapsed < 0.15) {
      sendNotification('上课铃响！', `【${curCourse.name}】开始了！(${minsToStr(periods[curCourse.periodIndex].start)})`);
      lastNotifyKey = nk;
    }
  } else if (isLunch) {
    document.getElementById('current-event-name').innerText = '🍴 午休时间';
    document.getElementById('current-event-time').innerText = `(${minsToStr(lunchStart)} - ${minsToStr(config.afternoonStart)})`;
    const dur = config.afternoonStart - lunchStart;
    const elapsed = nowMins - lunchStart;
    const pct = Math.min(100, Math.max(0, (elapsed / dur) * 100));
    document.getElementById('progress-bar').style.width = pct + '%';
    
    const remain = Math.max(0, config.afternoonStart - nowMins);
    const rm = Math.floor(remain);
    const rs = Math.round((remain - rm) * 60);
    document.getElementById('progress-text').innerText = `剩余 ${rm}分${String(rs).padStart(2, '0')}秒`;
  } else if (curPeriod) {
    // Period exists but no course
    document.getElementById('current-event-name').innerText = `第${curPeriod.num}节（无课）`;
    document.getElementById('current-event-time').innerText = `(${minsToStr(curPeriod.start)} - ${minsToStr(curPeriod.end)})`;
    const dur = curPeriod.end - curPeriod.start;
    const elapsed = nowMins - curPeriod.start;
    const pct = Math.min(100, Math.max(0, (elapsed / dur) * 100));
    document.getElementById('progress-bar').style.width = pct + '%';
    
    const remain = Math.max(0, curPeriod.end - nowMins);
    const rm = Math.floor(remain);
    const rs = Math.round((remain - rm) * 60);
    document.getElementById('progress-text').innerText = `剩余 ${rm}分${String(rs).padStart(2, '0')}秒`;
  } else {
    // Detect break or before/after school
    let isBreak = false;
    if (nextPeriod && nextPeriod.gi > 0) {
      const prevP = periods[nextPeriod.gi - 1];
      if (nowMins >= prevP.end && nowMins < nextPeriod.start) {
        isBreak = true;
        const breakStart = prevP.end;
        const breakEnd = nextPeriod.start;
        const dur = breakEnd - breakStart;
        const elapsed = nowMins - breakStart;
        const pct = Math.min(100, Math.max(0, (elapsed / dur) * 100));
        
        document.getElementById('current-event-name').innerText = '☕ 课间休息';
        document.getElementById('current-event-time').innerText = `(${minsToStr(breakStart)} - ${minsToStr(breakEnd)})`;
        document.getElementById('progress-bar').style.width = pct + '%';
        
        const remain = Math.max(0, breakEnd - nowMins);
        const rm = Math.floor(remain);
        const rs = Math.round((remain - rm) * 60);
        document.getElementById('progress-text').innerText = `剩余 ${rm}分${String(rs).padStart(2, '0')}秒`;
      }
    }
    
    if (!isBreak) {
      const isEarly = nextPeriod && nextPeriod.gi === 0;
      document.getElementById('current-event-name').innerText = isEarly ? '🌅 准备上课' : '已放学';
      document.getElementById('current-event-time').innerText = isEarly ? `(首节 ${minsToStr(nextPeriod.start)} 开始)` : '辛苦啦，好好休息！';
      document.getElementById('progress-bar').style.width = '0%';
      document.getElementById('progress-text').innerText = '--';
    }
  }

  if (nextPeriod) {
    const diff = nextPeriod.start - nowMins;
    const dm = Math.floor(diff), ds2 = Math.round((diff - dm) * 60);

    if (nextCourse) {
      document.getElementById('next-event-name').innerText = nextCourse.name;
      const np = periods[nextCourse.periodIndex];
      const npEnd = periods[nextCourse.periodIndex + (nextCourse.span || 1) - 1];
      document.getElementById('next-event-time').innerText = `(${minsToStr(np.start)} - ${minsToStr(npEnd.end)})`;
    } else {
      document.getElementById('next-event-name').innerText = `第${nextPeriod.num}节（无课）`;
      document.getElementById('next-event-time').innerText = `(${minsToStr(nextPeriod.start)} - ${minsToStr(nextPeriod.end)})`;
    }
    document.getElementById('next-wait-time').innerText = `距离开始 ${dm}分${String(ds2).padStart(2, '0')}秒`;

    // 5-min warning
    if (nextCourse) {
      const adv = (typeof reminderConfig !== 'undefined') ? reminderConfig.advanceMinutes : 5;
      const nk5 = nextCourse.id + '_adv';
      if (lastNotifyKey !== nk5 && diff <= adv && diff > adv - 0.15) {
        sendNotification('即将上课！', `【${nextCourse.name}】将在${adv}分钟后开始！`);
        lastNotifyKey = nk5;
      }
    }
  } else {
    document.getElementById('next-event-name').innerText = todayCourses.length ? '今日课程已结束' : '今天无课安排';
    document.getElementById('next-event-time').innerText = '';
    document.getElementById('next-wait-time').innerText = '';
  }
}

// ==================== Resize handler ====================
window.addEventListener('resize', () => { clearTimeout(window._rsz); window._rsz = setTimeout(() => renderTimetable(), 200); });

// ==================== 视图切换 ====================
const viewTitles = {
  dashboard: ['仪表盘', '今日课表：'],
  calendar: ['日历', '节假日管理与课程查看'],
  classes: ['课程管理', '管理所有课程安排'],
  todos: ['提醒事项', '管理任务与待办事项'],
  reminders: ['通知设置', '通知与铃声配置'],
  recurring: ['定期循环', '管理长期重复周期提醒'],
  settings: ['系统设置', '课表时间与数据管理'],
  pomodoro: ['番茄时钟', '您的个人专注空间']
};

let currentView = 'dashboard';

function switchView(viewName) {
  currentView = viewName;
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const panel = document.getElementById('view-' + viewName);
  const navItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  
  if (panel) panel.classList.add('active');
  if (navItem) navItem.classList.add('active');

  const titlesMap = {
    dashboard: '仪表盘',
    calendar: '详细日历',
    classes: '课程概览',
    todos: '提醒事项',
    reminders: '通知中心',
    recurring: '定期循环',
    settings: '系统设置',
    pomodoro: '番茄时钟'
  };
  document.getElementById('page-title').innerText = titlesMap[viewName] || 'Schedule Master';

  const sub = document.getElementById('page-subtitle');
  if (viewName === 'dashboard') {
    sub.innerHTML = '今日课表：<span id="today-date"></span>';
    updateDateHeader();
    renderTimetable();
    engineTick();
  } else {
    sub.innerText = (viewTitles[viewName] && viewTitles[viewName][1]) || '';
  }

  // Hide/Show headers and module toggle if needed
  const headerLeft = document.querySelector('.header-left');
  const pomoToggle = document.getElementById('pomo-module-toggle');

  if (headerLeft) {
    if (viewName === 'pomodoro' && (typeof currentPomoModule !== 'undefined' && currentPomoModule === 2)) {
      headerLeft.style.opacity = '0';
      headerLeft.style.pointerEvents = 'none';
    } else {
      headerLeft.style.display = '';
      headerLeft.style.opacity = '1';
      headerLeft.style.pointerEvents = 'auto';
    }
  }

  if (pomoToggle) {
    pomoToggle.style.display = viewName === 'pomodoro' ? 'flex' : 'none';
  }

  // Handle full screen mode for FocusTide
  if (viewName === 'pomodoro' && (typeof currentPomoModule !== 'undefined' && currentPomoModule === 2)) {
    document.body.classList.add('ft-full-screen-active');
  } else {
    document.body.classList.remove('ft-full-screen-active');
  }

  // 视图特定刷新逻辑
  if (viewName === 'calendar') renderFullCalendar();
  if (viewName === 'classes') renderClassesList();
  if (viewName === 'todos') {
    if (typeof updateSmartLists === 'function') updateSmartLists();
    if (typeof renderTodosView === 'function') renderTodosView();
  }
  if (viewName === 'settings') loadSettingsView();
  if (viewName === 'reminders') renderNotificationLog();
  if (viewName === 'recurring') renderRecurringList();
}

// 导航项初始化已合并到全局渲染中

// ==================== 日历大视图 ====================
let fcalYear, fcalMonth, fcalSelectedDate = null;
{ const d = new Date(); fcalYear = d.getFullYear(); fcalMonth = d.getMonth(); }

function renderFullCalendar() {
  const grid = document.getElementById('fcal-grid');
  grid.innerHTML = '';
  const mns = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  // 计算当月第一天的农历来显示标题
  const lunar1 = solarToLunar(fcalYear, fcalMonth, 1);
  const lunarTitle = lunar1 ? ` · ${lunar1.ganZhi} ${lunar1.animal}年` : '';
  document.getElementById('fcal-title').innerText = `${fcalYear}年 ${mns[fcalMonth]}${lunarTitle}`;

  ['日', '一', '二', '三', '四', '五', '六'].forEach(d => {
    const el = document.createElement('div'); el.className = 'fcal-dow'; el.innerText = d; grid.appendChild(el);
  });

  const fd = new Date(fcalYear, fcalMonth, 1).getDay();
  const dim = new Date(fcalYear, fcalMonth + 1, 0).getDate();
  const today = new Date();
  const prevDim = new Date(fcalYear, fcalMonth, 0).getDate();

  // Previous month padding
  for (let i = fd - 1; i >= 0; i--) {
    const pDay = prevDim - i;
    const pMonth = fcalMonth === 0 ? 11 : fcalMonth - 1;
    const pYear = fcalMonth === 0 ? fcalYear - 1 : fcalYear;
    const lt = getLunarText(pYear, pMonth, pDay);
    const el = document.createElement('div'); el.className = 'fcal-day other-month';
    el.innerHTML = `<span class="fcal-dnum">${pDay}</span><span class="fcal-lunar">${lt}</span>`;
    grid.appendChild(el);
  }

  // Current month days
  for (let d = 1; d <= dim; d++) {
    const el = document.createElement('div'); el.className = 'fcal-day';
    const ds = `${fcalYear}-${String(fcalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const natName = NATIONAL_HOLIDAYS[ds];
    const isNat = !!natName;
    const isUsr = holidays[ds] === true;
    const isForcedWork = holidays[ds] === false;

    // 农历文本：优先显示节假日名，否则显示农历
    const lunarText = isNat ? natName : getLunarText(fcalYear, fcalMonth, d);

    let html = '';
    if ((isNat || isUsr) && !isForcedWork) {
      html += '<span class="fcal-htag">\u4F11</span>';
    } else if (isForcedWork) {
      html += '<span class="fcal-htag" style="color:var(--accent)">\u73ED</span>';
    }
    
    html += `<span class="fcal-dnum">${d}</span>`;
    html += `<span class="fcal-lunar${isNat ? ' fcal-lunar-holiday' : ''}">${lunarText}</span>`;

    // 提醒事项指示点（使用todoItems统一数据）
    const dayTodos = todoItems.filter(t => t.dueDate === ds && !t.completed);
    const dateObj = new Date(fcalYear, fcalMonth, d);
    const dow = dateObj.getDay();
    const dayIdx = dow === 0 ? 6 : dow - 1;
    const dayCourses = courses.filter(c => c.day === dayIdx);

    if (dayTodos.length > 0 || dayCourses.length > 0) {
      html += '<div class="fcal-dot-row">';
      if (dayTodos.length > 0) html += `<span class="fcal-dot" style="background:#E05D5D"></span>`;
      dayCourses.slice(0, 3).forEach(c => html += `<span class="fcal-dot" style="background:${c.color || '#4A90D9'}"></span>`);
      html += '</div>';
    }

    el.innerHTML = html;
    if (fcalYear === today.getFullYear() && fcalMonth === today.getMonth() && d === today.getDate()) el.classList.add('today');
    if (isNat) el.classList.add('national-holiday');
    if (isUsr) el.classList.add('holiday');
    if (isForcedWork) el.classList.add('forced-work');
    if (fcalSelectedDate === ds) el.classList.add('selected');

    el.addEventListener('click', () => {
      fcalSelectedDate = ds;
      renderFullCalendar();
      showDayDetail(fcalYear, fcalMonth, d, ds);
    });

    grid.appendChild(el);
  }

  // Trailing padding
  const trail = (7 - (fd + dim) % 7) % 7;
  for (let i = 1; i <= trail; i++) {
    const nMonth = fcalMonth === 11 ? 0 : fcalMonth + 1;
    const nYear = fcalMonth === 11 ? fcalYear + 1 : fcalYear;
    const lt = getLunarText(nYear, nMonth, i);
    const el = document.createElement('div'); el.className = 'fcal-day other-month';
    el.innerHTML = `<span class="fcal-dnum">${i}</span><span class="fcal-lunar">${lt}</span>`;
    grid.appendChild(el);
  }
}

function showDayDetail(year, month, day, ds) {
  const dateObj = new Date(year, month, day);
  const ws = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const lunar = solarToLunar(year, month, day);

  let titleText = `${month + 1}月${day}日 ${ws[dateObj.getDay()]}`;
  document.getElementById('day-detail-title').innerText = titleText;

  const content = document.getElementById('day-detail-content');
  const natName = NATIONAL_HOLIDAYS[ds];
  const isHol = isRestDay(ds);
  const dow = dateObj.getDay();
  const dayIdx = dow === 0 ? 6 : dow - 1;

  let html = '';

  // 农历信息卡片
  if (lunar) {
    html += `<div class="day-lunar-card">
      <span class="lunar-main">${lunar.monthStr}${lunar.dayStr}</span>
      <span class="lunar-sub">${lunar.ganZhi} · ${lunar.animal}年</span>
    </div>`;
  }

  // 节假日标签
  if (natName && !holidays[ds]) {
    html += `<div class="day-holiday-badge">🎉 ${natName} · 法定假日</div>`;
  } else if (holidays[ds] === true) {
    html += `<div class="day-holiday-badge title="自定义休息日">📌 休息日</div>`;
  } else if (holidays[ds] === false) {
    html += `<div class="day-holiday-badge working">💼 已取消休息 (工作日)</div>`;
  }

  // 计算底色和按钮文字所需的状态
  const baseIsRest = !!NATIONAL_HOLIDAYS[ds] || 
                    (new Date(ds).getDay() === 6 && config.showSat === false) || 
                    (new Date(ds).getDay() === 0 && config.showSun === false);
  
  let btnText = "📅 标记为休息日";
  if (baseIsRest) {
    btnText = holidays[ds] === false ? "✅ 恢复默认休息" : "🕒 取消休息日";
  } else {
    btnText = holidays[ds] === true ? "✅ 恢复默认工作" : "📅 标记为休息日";
  }

  // 切换休息日按钮
  html += `<button class="toggle-rest-btn" onclick="toggleRestDay('${ds}')">${btnText}</button>`;

  // 课程列表
  html += '<div class="day-section-title">📚 课程</div>';
  {
    const dayCourses = courses.filter(c => c.day === dayIdx).sort((a, b) => a.periodIndex - b.periodIndex);
    const periods = computePeriods();
    if (dayCourses.length === 0) {
      html += '<div class="day-no-class">当天无课程安排</div>';
    } else {
      dayCourses.forEach(c => {
        const p = periods[c.periodIndex];
        const pEnd = periods[c.periodIndex + (c.span || 1) - 1];
        if (!p) return;
        const timeStr = `${minsToStr(p.start)} - ${minsToStr(pEnd ? pEnd.end : p.end)}`;
        html += `<div class="day-course-item">
          <div class="day-course-dot" style="background:${c.color || '#4A90D9'}"></div>
          <div class="day-course-info">
            <div class="day-course-name">${c.name}</div>
            <div class="day-course-time">第${p.num}节 ${timeStr}${c.span > 1 ? ' (' + c.span + '节连堂)' : ''}</div>
          </div>
        </div>`;
      });
    }
  }

  // 提醒事项（使用todoItems统一数据，与提醒事项模块联动）
  html += '<div class="day-section-title">📝 提醒事项</div>';
  const dayTodos = todoItems.filter(t => t.dueDate === ds);
  const incompleteTodos = dayTodos.filter(t => !t.completed);
  const completedTodos = dayTodos.filter(t => t.completed);

  if (incompleteTodos.length > 0) {
    incompleteTodos.forEach(t => {
      const list = (typeof todoLists !== 'undefined') ? todoLists.find(l => l.id === t.listId) : null;
      const priorityIcons = { high: '🔴', medium: '🟡', low: '🔵' };
      html += `<div class="reminder-item">
        <input type="checkbox" onchange="calToggleTodo('${t.id}','${ds}')">
        <span class="reminder-text">${t.priority ? priorityIcons[t.priority] + ' ' : ''}${t.title}</span>
        ${t.dueTime ? '<span class="reminder-time">' + t.dueTime + '</span>' : ''}
        ${list ? '<span style="font-size:9px;color:var(--text-muted);margin-left:4px;">' + list.name + '</span>' : ''}
        <button class="reminder-del" onclick="calDeleteTodo('${t.id}','${ds}')">&times;</button>
      </div>`;
    });
  }

  if (completedTodos.length > 0) {
    html += `<div style="font-size:11px;color:var(--text-muted);margin-top:6px;margin-bottom:4px;">已完成 (${completedTodos.length})</div>`;
    completedTodos.forEach(t => {
      html += `<div class="reminder-item done">
        <input type="checkbox" checked onchange="calToggleTodo('${t.id}','${ds}')">
        <span class="reminder-text">${t.title}</span>
        <button class="reminder-del" onclick="calDeleteTodo('${t.id}','${ds}')">&times;</button>
      </div>`;
    });
  }

  if (dayTodos.length === 0) {
    html += '<div class="day-no-class" style="padding:12px;">暂无提醒事项</div>';
  }

  // 快速添加提醒（直接创建todoItem）
  const listOptions = todoLists.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
  html += `<div class="add-reminder-row" style="flex-wrap:wrap;">
    <input type="text" id="new-reminder-text" placeholder="快速添加提醒..." class="reminder-input"
           onkeydown="if(event.key==='Enter')calAddTodo('${ds}')">
    <select id="new-reminder-list" class="reminder-time-input" style="width:auto;">${listOptions}</select>
    <input type="time" id="new-reminder-time" class="reminder-time-input">
    <button class="toolbar-btn primary" onclick="calAddTodo('${ds}')" style="padding:5px 10px;font-size:12px;">添加</button>
  </div>`;

  content.innerHTML = html;
}

// 日历中的提醒事项操作（操作todoItems，与提醒事项模块联动）
window.calAddTodo = function (ds) {
  const text = document.getElementById('new-reminder-text').value.trim();
  if (!text) return;
  const time = document.getElementById('new-reminder-time').value || '';
  const listSel = document.getElementById('new-reminder-list');
  const listId = listSel ? listSel.value : (todoLists.length > 0 ? todoLists[0].id : 'list-default');

  todoItems.push({
    id: 'todo-' + Date.now(),
    listId: listId,
    title: text,
    notes: '',
    dueDate: ds,
    dueTime: time,
    priority: '',
    flagged: false,
    completed: false,
    createdAt: new Date().toISOString()
  });

  if (typeof saveTodos === 'function') saveTodos();
  const parts = ds.split('-');
  showDayDetail(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), ds);
  renderFullCalendar();
};

window.calToggleTodo = function (id, ds) {
  const t = todoItems.find(x => x.id === id);
  if (t) { t.completed = !t.completed; t.completedAt = t.completed ? new Date().toISOString() : null; }
  if (typeof saveTodos === 'function') saveTodos();
  const parts = ds.split('-');
  setTimeout(() => {
    showDayDetail(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), ds);
    renderFullCalendar();
  }, 150);
};

window.calDeleteTodo = function (id, ds) {
  todoItems = todoItems.filter(x => x.id !== id);
  if (typeof saveTodos === 'function') saveTodos();
  const parts = ds.split('-');
  showDayDetail(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), ds);
  renderFullCalendar();
};

window.toggleRestDay = function (ds) {
  const baseIsRest = !!NATIONAL_HOLIDAYS[ds] || 
                    (new Date(ds).getDay() === 6 && config.showSat === false) || 
                    (new Date(ds).getDay() === 0 && config.showSun === false);
  
  if (baseIsRest) {
    if (holidays[ds] === false) { delete holidays[ds]; } 
    else { holidays[ds] = false; }
  } else {
    if (holidays[ds] === true) { delete holidays[ds]; } 
    else { holidays[ds] = true; }
  }
  
  saveAll();
  renderFullCalendar();
  const parts = ds.split('-');
  showDayDetail(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), ds);
  // 同时更新仪表盘小日历（如果已加载）
  if (document.getElementById('cal-grid')) renderCalendar();
};

document.getElementById('fcal-prev').addEventListener('click', () => {
  fcalMonth--; if (fcalMonth < 0) { fcalMonth = 11; fcalYear--; } renderFullCalendar();
});
document.getElementById('fcal-next').addEventListener('click', () => {
  fcalMonth++; if (fcalMonth > 11) { fcalMonth = 0; fcalYear++; } renderFullCalendar();
});

// ==================== 课程管理视图 ====================
const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function renderClassesList() {
  const filter = document.getElementById('class-filter-day').value;
  const periods = computePeriods();

  let filtered = [...courses];
  if (filter !== 'all') filtered = filtered.filter(c => c.day === parseInt(filter));
  filtered.sort((a, b) => a.day !== b.day ? a.day - b.day : a.periodIndex - b.periodIndex);

  const container = document.getElementById('classes-list');
  if (filtered.length === 0) {
    container.innerHTML = '<div class="day-no-class">暂无课程，请点击"添加课程"按钮创建。</div>';
  } else {
    let html = '<table class="class-table"><thead><tr><th>颜色</th><th>课程名称</th><th>星期</th><th>节次</th><th>时间</th><th>操作</th></tr></thead><tbody>';
    filtered.forEach(c => {
      const p = periods[c.periodIndex];
      const pEnd = periods[c.periodIndex + (c.span || 1) - 1];
      const timeStr = p ? `${minsToStr(p.start)} - ${minsToStr(pEnd ? pEnd.end : p.end)}` : '--';
      const spanLabel = (c.span || 1) > 1 ? ` (${c.span}节)` : '';
      html += `<tr>
        <td><span class="class-color-dot" style="background:${c.color || '#4A90D9'}"></span></td>
        <td><strong>${c.name}</strong></td>
        <td>${DAY_NAMES[c.day] || '--'}</td>
        <td>第${p ? p.num : '?'}节${spanLabel}</td>
        <td>${timeStr}</td>
        <td class="class-actions">
          <button class="class-action-btn" onclick="editCourseById('${c.id}')">编辑</button>
          <button class="class-action-btn del" onclick="deleteCourseById('${c.id}')">删除</button>
        </td>
      </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  // 统计
  const totalCount = courses.length;
  const dayBreakdown = DAY_NAMES.map((name, i) => {
    const cnt = courses.filter(c => c.day === i).length;
    return cnt > 0 ? `${name}:${cnt}` : null;
  }).filter(Boolean).join('　');
  document.getElementById('classes-stats').innerText = `共 ${totalCount} 节课程　${dayBreakdown}`;
}

window.editCourseById = function (id) {
  const c = courses.find(x => x.id === id);
  if (c) openEditModal(c);
};
window.deleteCourseById = function (id) {
  if (confirm('确认删除该课程？')) {
    courses = courses.filter(x => x.id !== id);
    saveAll();
    renderClassesList();
    renderCourses();
  }
};

document.getElementById('class-filter-day').addEventListener('change', renderClassesList);
document.getElementById('btn-add-class-2').addEventListener('click', () => openAddModal());

// ==================== 提醒设置 ====================
let reminderConfig = JSON.parse(localStorage.getItem('reminderConfig') || 'null') || {
  soundEnabled: true,
  notifyEnabled: true,
  advanceMinutes: 5,
  classEndEnabled: false
};
let notificationLog = JSON.parse(localStorage.getItem('notifLog') || '[]');

function loadReminderSettings() {
  document.getElementById('toggle-sound').checked = reminderConfig.soundEnabled;
  document.getElementById('toggle-notify').checked = reminderConfig.notifyEnabled;
  document.getElementById('advance-minutes').value = reminderConfig.advanceMinutes;
  document.getElementById('toggle-classend').checked = reminderConfig.classEndEnabled;
}

function saveReminderSettings() {
  reminderConfig.soundEnabled = document.getElementById('toggle-sound').checked;
  reminderConfig.notifyEnabled = document.getElementById('toggle-notify').checked;
  reminderConfig.advanceMinutes = parseInt(document.getElementById('advance-minutes').value) || 5;
  reminderConfig.classEndEnabled = document.getElementById('toggle-classend').checked;
  localStorage.setItem('reminderConfig', JSON.stringify(reminderConfig));
}

['toggle-sound', 'toggle-notify', 'toggle-classend'].forEach(id => {
  document.getElementById(id).addEventListener('change', saveReminderSettings);
});
document.getElementById('advance-minutes').addEventListener('change', saveReminderSettings);

function addNotifLog(title, body) {
  const now = new Date();
  const timeStr = [now.getHours(), now.getMinutes(), now.getSeconds()].map(v => String(v).padStart(2, '0')).join(':');
  notificationLog.unshift({ time: timeStr, title, body, date: todayDS() });
  if (notificationLog.length > 50) notificationLog = notificationLog.slice(0, 50);
  localStorage.setItem('notifLog', JSON.stringify(notificationLog));
}

function renderNotificationLog() {
  const container = document.getElementById('notification-log');
  if (notificationLog.length === 0) {
    container.innerHTML = '<p class="text-muted">暂无通知记录，上课时会在此处记录。</p>';
    return;
  }
  let html = '';
  notificationLog.forEach(item => {
    html += `<div class="notif-log-item">
      <span class="notif-log-time">${item.time}</span>
      <div class="notif-log-text">
        <span class="notif-log-title">${item.title}</span>
        <span>${item.body}</span>
      </div>
    </div>`;
  });
  container.innerHTML = html;
}

// 覆写 sendNotification 以整合提醒设置
const _origSendNotification = sendNotification;
sendNotification = function (title, body) {
  addNotifLog(title, body);
  if (reminderConfig.soundEnabled) playBell();
  if (reminderConfig.notifyEnabled) {
    showToast(title, body);
    if (ipcRenderer) ipcRenderer.send('show-notification', { title, body });
  }
};

// ==================== 设置视图 ====================
function loadSettingsView() {
  document.getElementById('sv-morning-start').value = minsToStr(config.morningStart);
  document.getElementById('sv-morning-count').value = config.morningCount;
  document.getElementById('sv-afternoon-start').value = minsToStr(config.afternoonStart);
  document.getElementById('sv-afternoon-count').value = config.afternoonCount;
  document.getElementById('sv-period-duration').value = config.periodDuration;
  document.getElementById('sv-break-duration').value = config.breakDuration;
  updateSvPreview();
}

function updateSvPreview() {
  const ms = strToMins(document.getElementById('sv-morning-start').value);
  const mc = parseInt(document.getElementById('sv-morning-count').value) || 4;
  const as = strToMins(document.getElementById('sv-afternoon-start').value);
  const ac = parseInt(document.getElementById('sv-afternoon-count').value) || 4;
  const pd = parseInt(document.getElementById('sv-period-duration').value) || 45;
  const bd = parseInt(document.getElementById('sv-break-duration').value) || 10;

  let html = '<strong>预览时间表：</strong><br>';
  let t = ms;
  for (let i = 0; i < mc; i++) {
    html += `第${i + 1}节：${minsToStr(t)} - ${minsToStr(t + pd)}<br>`;
    t += pd + bd;
  }
  const lastEnd = ms + mc * pd + (mc - 1) * bd;
  html += `<span style="color:#38A169">🍴 午休：${minsToStr(lastEnd)} - ${minsToStr(as)}</span><br>`;
  t = as;
  for (let i = 0; i < ac; i++) {
    html += `第${mc + i + 1}节：${minsToStr(t)} - ${minsToStr(t + pd)}<br>`;
    t += pd + bd;
  }
  document.getElementById('sv-preview').innerHTML = html;
}

['sv-morning-start', 'sv-morning-count', 'sv-afternoon-start', 'sv-afternoon-count', 'sv-period-duration', 'sv-break-duration'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateSvPreview);
});

document.getElementById('sv-apply').addEventListener('click', () => {
  config.morningStart = strToMins(document.getElementById('sv-morning-start').value);
  config.morningCount = parseInt(document.getElementById('sv-morning-count').value) || 4;
  config.afternoonStart = strToMins(document.getElementById('sv-afternoon-start').value);
  config.afternoonCount = parseInt(document.getElementById('sv-afternoon-count').value) || 4;
  config.periodDuration = parseInt(document.getElementById('sv-period-duration').value) || 45;
  config.breakDuration = parseInt(document.getElementById('sv-break-duration').value) || 10;
  saveAll();
  renderTimetable();
  showToast('设置已应用', '课表时间已重新计算！');
});

// 数据导出
document.getElementById('btn-export').addEventListener('click', () => {
  const data = { config, courses, holidays, reminderConfig };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `schedule_master_backup_${todayDS()}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast('导出成功', '数据已保存为 JSON 文件。');
});

// 数据导入
document.getElementById('btn-import').addEventListener('click', () => {
  document.getElementById('import-file-input').click();
});
document.getElementById('import-file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.config) { config = data.config; localStorage.setItem('config', JSON.stringify(config)); }
      if (data.courses) { courses = data.courses; localStorage.setItem('courses', JSON.stringify(courses)); }
      if (data.holidays) { holidays = data.holidays; localStorage.setItem('holidays', JSON.stringify(holidays)); }
      if (data.reminderConfig) { reminderConfig = data.reminderConfig; localStorage.setItem('reminderConfig', JSON.stringify(reminderConfig)); }
      renderTimetable();
      renderCalendar();
      loadReminderSettings();
      showToast('导入成功', '数据已恢复！');
    } catch (err) {
      alert('导入失败：文件格式不正确。');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// 清空所有数据
document.getElementById('btn-clear-all').addEventListener('click', () => {
  if (confirm('⚠️ 确认清空所有数据？此操作不可恢复！\n\n将清除：所有课程、节假日标记、课表设置。')) {
    localStorage.clear();
    location.reload();
  }
});

// ==================== 提醒事项系统 (Apple Reminders风格) ====================
let todoLists = JSON.parse(localStorage.getItem('todoLists') || 'null') || [
  { id: 'list-default', name: '提醒事项', color: '#4A90D9' },
  { id: 'list-study', name: '学习', color: '#5BBD72' },
  { id: 'list-life', name: '生活', color: '#E8913A' }
];
let todoItems = JSON.parse(localStorage.getItem('todoItems') || '[]');
let currentTodoFilter = 'all'; // 'all','today','scheduled','flagged','done','list-xxx'

function saveTodos() {
  localStorage.setItem('todoLists', JSON.stringify(todoLists));
  localStorage.setItem('todoItems', JSON.stringify(todoItems));
}

function renderTodosView() {
  updateSmartCounts();
  renderMyLists();
  renderTodoItems();
}

function updateSmartCounts() {
  const now = todayDS();
  const incomplete = todoItems.filter(t => !t.completed);
  document.getElementById('sl-today-count').innerText = incomplete.filter(t => t.dueDate === now).length;
  document.getElementById('sl-scheduled-count').innerText = incomplete.filter(t => t.dueDate).length;
  document.getElementById('sl-all-count').innerText = incomplete.length;
  document.getElementById('sl-flagged-count').innerText = incomplete.filter(t => t.flagged).length;
  document.getElementById('sl-done-count').innerText = todoItems.filter(t => t.completed).length;

  // 高亮当前筛选卡片
  document.querySelectorAll('.smart-card').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.my-list-item').forEach(c => c.classList.remove('active'));

  if (['today', 'scheduled', 'all', 'flagged', 'done'].includes(currentTodoFilter)) {
    const card = document.querySelector(`.smart-card[data-filter="${currentTodoFilter}"]`);
    if (card) card.classList.add('active');
  } else {
    const item = document.querySelector(`.my-list-item[data-list="${currentTodoFilter}"]`);
    if (item) item.classList.add('active');
  }
}

function renderMyLists() {
  const container = document.getElementById('my-lists-items');
  let html = '';
  todoLists.forEach(list => {
    const count = todoItems.filter(t => t.listId === list.id && !t.completed).length;
    html += `<div class="my-list-item ${currentTodoFilter === list.id ? 'active' : ''}" data-list="${list.id}" onclick="selectTodoFilter('${list.id}')">
      <div class="my-list-dot" style="background:${list.color}"></div>
      <span class="my-list-name">${list.name}</span>
      <span class="my-list-count">${count}</span>
      ${list.id !== 'list-default' ? `<button class="my-list-del" onclick="event.stopPropagation();deleteList('${list.id}')">&times;</button>` : ''}
    </div>`;
  });
  container.innerHTML = html;
}

function getFilteredTodos() {
  const now = todayDS();
  switch (currentTodoFilter) {
    case 'today': return todoItems.filter(t => !t.completed && t.dueDate === now);
    case 'scheduled': return todoItems.filter(t => !t.completed && t.dueDate);
    case 'all': return todoItems.filter(t => !t.completed);
    case 'flagged': return todoItems.filter(t => !t.completed && t.flagged);
    case 'done': return todoItems.filter(t => t.completed);
    default: return todoItems.filter(t => t.listId === currentTodoFilter && (currentTodoFilter.startsWith('list-') ? true : !t.completed));
  }
}

function getFilterTitle() {
  switch (currentTodoFilter) {
    case 'today': return '今天';
    case 'scheduled': return '计划';
    case 'all': return '全部';
    case 'flagged': return '旗标';
    case 'done': return '已完成';
    default: { const l = todoLists.find(x => x.id === currentTodoFilter); return l ? l.name : '全部'; }
  }
}

function renderTodoItems() {
  const items = getFilteredTodos();
  const container = document.getElementById('todos-items-list');
  const now = todayDS();

  document.getElementById('todos-panel-title').innerText = getFilterTitle();
  document.getElementById('todos-panel-count').innerText = items.length > 0 ? `${items.length} 项` : '';

  if (items.length === 0) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);">
      <div style="font-size:36px;margin-bottom:8px;">📝</div>
      <div style="font-size:13px;">暂无提醒事项</div>
    </div>`;
    return;
  }

  // 排序：未完成在前，有日期的按日期排，优先级高的在前
  const pMap = { high: 0, medium: 1, low: 2, '': 3 };
  items.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if ((pMap[a.priority || ''] || 3) !== (pMap[b.priority || ''] || 3)) return (pMap[a.priority || ''] || 3) - (pMap[b.priority || ''] || 3);
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  let html = '';
  items.forEach(t => {
    const isOverdue = t.dueDate && !t.completed && t.dueDate < now;
    const list = todoLists.find(l => l.id === t.listId);
    const priorityColors = { high: '#E05D5D', medium: '#E8913A', low: '#4A90D9' };

    html += `<div class="todo-item ${t.completed ? 'completed' : ''}">
      <button class="todo-check ${t.completed ? 'checked' : ''}" onclick="toggleTodo('${t.id}')" style="border-color:${list ? list.color : '#CBD5E1'}">${t.completed ? '✓' : ''}</button>
      ${t.priority ? `<div class="todo-priority-dot" style="background:${priorityColors[t.priority] || 'transparent'}"></div>` : ''}
      <div class="todo-item-body">
        <div class="todo-item-title">${t.title}</div>
        ${t.notes ? `<div class="todo-item-notes">${t.notes}</div>` : ''}
        <div class="todo-item-meta">
          ${t.dueDate ? `<span class="todo-meta-tag ${isOverdue ? 'todo-meta-overdue' : 'todo-meta-date'}">${isOverdue ? '已逾期 ' : ''}${formatDateShort(t.dueDate)}</span>` : ''}
          ${t.dueTime ? `<span class="todo-meta-tag todo-meta-time">${t.dueTime}</span>` : ''}
          ${!['all', 'done'].includes(currentTodoFilter) || currentTodoFilter.startsWith('list-') ? '' : `<span class="todo-meta-tag todo-meta-list">${list ? list.name : ''}</span>`}
        </div>
      </div>
      <div class="todo-actions">
        <button class="todo-flag-btn ${t.flagged ? 'flagged' : ''}" onclick="toggleFlag('${t.id}')">${t.flagged ? '🚩' : '⚑'}</button>
        <button class="todo-del-btn" onclick="deleteTodo('${t.id}')">🗑</button>
      </div>
    </div>`;
  });
  container.innerHTML = html;
}

function formatDateShort(ds) {
  const now = todayDS();
  if (ds === now) return '今天';
  const d = new Date(ds);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tmDS = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  if (ds === tmDS) return '明天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// 智能筛选切换
window.selectTodoFilter = function (filter) {
  currentTodoFilter = filter;
  renderTodosView();
};

document.querySelectorAll('.smart-card').forEach(card => {
  card.addEventListener('click', () => {
    currentTodoFilter = card.dataset.filter;
    renderTodosView();
  });
});

// 新建提醒事项（行内）
document.getElementById('btn-add-todo').addEventListener('click', () => {
  const list = document.getElementById('todos-items-list');
  // 如果已有行内编辑框，先移除
  const existing = document.querySelector('.inline-new-todo');
  if (existing) { existing.remove(); return; }

  const defaultListId = currentTodoFilter.startsWith('list-') ? currentTodoFilter : (todoLists[0]?.id || 'list-default');

  const form = document.createElement('div');
  form.className = 'inline-new-todo';
  form.innerHTML = `
    <input type="text" id="new-todo-title" placeholder="输入提醒事项..." autofocus>
    <input type="text" id="new-todo-notes" placeholder="备注（可选）" style="font-size:11px;">
    <div class="inline-todo-options">
      <input type="date" id="new-todo-date">
      <input type="time" id="new-todo-time">
      <select id="new-todo-priority">
        <option value="">无优先级</option>
        <option value="high">🔴 高</option>
        <option value="medium">🟡 中</option>
        <option value="low">🔵 低</option>
      </select>
      <select id="new-todo-list">
        ${todoLists.map(l => `<option value="${l.id}" ${l.id === defaultListId ? 'selected' : ''}>${l.name}</option>`).join('')}
      </select>
      <div class="inline-todo-actions">
        <button class="toolbar-btn primary" onclick="confirmNewTodo()" style="padding:4px 12px;font-size:11px;">添加</button>
        <button class="toolbar-btn" onclick="this.closest('.inline-new-todo').remove()" style="padding:4px 8px;font-size:11px;">取消</button>
      </div>
    </div>
  `;
  list.parentNode.insertBefore(form, list);
  form.querySelector('#new-todo-title').focus();

  // 回车快捷键
  form.querySelector('#new-todo-title').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmNewTodo();
    if (e.key === 'Escape') form.remove();
  });
});

window.confirmNewTodo = function () {
  const title = document.getElementById('new-todo-title').value.trim();
  if (!title) return;

  const newItem = {
    id: 'todo-' + Date.now(),
    listId: document.getElementById('new-todo-list').value,
    title: title,
    notes: document.getElementById('new-todo-notes').value.trim(),
    dueDate: document.getElementById('new-todo-date').value || '',
    dueTime: document.getElementById('new-todo-time').value || '',
    priority: document.getElementById('new-todo-priority').value || '',
    flagged: false,
    completed: false,
    createdAt: new Date().toISOString()
  };

  todoItems.push(newItem);
  saveTodos();
  const form = document.querySelector('.inline-new-todo');
  if (form) form.remove();
  renderTodosView();
};

// 任务操作
window.toggleTodo = function (id) {
  const t = todoItems.find(x => x.id === id);
  if (t) { t.completed = !t.completed; t.completedAt = t.completed ? new Date().toISOString() : null; }
  saveTodos();
  setTimeout(() => renderTodosView(), 200);
};
window.toggleFlag = function (id) {
  const t = todoItems.find(x => x.id === id);
  if (t) t.flagged = !t.flagged;
  saveTodos();
  renderTodosView();
};
window.deleteTodo = function (id) {
  todoItems = todoItems.filter(x => x.id !== id);
  saveTodos();
  renderTodosView();
};

// 列表管理
document.getElementById('btn-add-list').addEventListener('click', () => {
  document.getElementById('input-list-name').value = '';
  document.getElementById('list-modal-overlay').style.display = 'flex';
  setTimeout(() => document.getElementById('input-list-name').focus(), 50);
});

document.getElementById('list-modal-cancel').addEventListener('click', () => {
  document.getElementById('list-modal-overlay').style.display = 'none';
});

document.getElementById('list-modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
});

document.getElementById('list-modal-confirm').addEventListener('click', () => confirmAddList());
document.getElementById('input-list-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmAddList();
  if (e.key === 'Escape') document.getElementById('list-modal-overlay').style.display = 'none';
});

window.confirmAddList = function () {
  const name = document.getElementById('input-list-name').value.trim();
  if (!name) return;
  const colors = ['#4A90D9', '#5BBD72', '#E8913A', '#9B72CF', '#E05D5D', '#45B7C5', '#F0C75E', '#E88DA4'];
  const color = colors[todoLists.length % colors.length];
  todoLists.push({ id: 'list-' + Date.now(), name: name, color });
  saveTodos();
  renderTodosView();
  document.getElementById('list-modal-overlay').style.display = 'none';
};

window.deleteList = function (id) {
  if (!confirm('删除该列表？列表中的所有提醒事项也会被删除。')) return;
  todoLists = todoLists.filter(l => l.id !== id);
  todoItems = todoItems.filter(t => t.listId !== id);
  if (currentTodoFilter === id) currentTodoFilter = 'all';
  saveTodos();
  renderTodosView();
};

















// ==================== 定期循环提醒逻辑 ====================
let recurringReminders = JSON.parse(localStorage.getItem('recurringReminders') || '[]');
let editingRecurringId = null;

function saveRecurring() {
  localStorage.setItem('recurringReminders', JSON.stringify(recurringReminders));
}

function calculateNextDate(startDate, years, months, days) {
  const startParts = startDate.split('-');
  const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
  const y = parseInt(years) || 0;
  const mo = parseInt(months) || 0;
  const d = parseInt(days) || 0;

  const next = new Date(start);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 如果起始日期在将来，直接返回起始日期
  if (next > now) return startDate;

  // 推算到 [今天或以后] 的第一个日期
  while (next < now) {
    next.setFullYear(next.getFullYear() + y);
    next.setMonth(next.getMonth() + mo);
    next.setDate(next.getDate() + d);
  }

  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

function calculateCycleNumber(startDate, nextDate, years, months, days) {
  const startParts = startDate.split('-');
  const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
  const y = parseInt(years) || 0;
  const mo = parseInt(months) || 0;
  const d = parseInt(days) || 0;

  let temp = new Date(start);
  const targetParts = nextDate.split('-');
  const target = new Date(targetParts[0], targetParts[1] - 1, targetParts[2]);

  let count = 1;
  while (temp < target) {
    temp.setFullYear(temp.getFullYear() + y);
    temp.setMonth(temp.getMonth() + mo);
    temp.setDate(temp.getDate() + d);
    count++;
  }
  return count;
}

function formatPeriodText(years, months, days) {
  const y = parseInt(years) || 0;
  const mo = parseInt(months) || 0;
  const d = parseInt(days) || 0;
  const parts = [];
  if (y > 0) parts.push(`${y}年`);
  if (mo > 0) parts.push(`${mo}个月`);
  if (d > 0) parts.push(`${d}天`);
  return parts.length > 0 ? parts.join('') : '未设置';
}

function renderRecurringList() {
  const container = document.getElementById('recurring-list-grid');
  const countEl = document.getElementById('recurring-active-count');
  if (!container) return;

  countEl.innerText = recurringReminders.length;
  
  if (recurringReminders.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; padding: 60px; text-align: center; color: var(--text-muted);">
      <div style="font-size: 48px; margin-bottom: 12px;">🔄</div>
      <p>暂无循环提醒。点击上方按钮添加每隔一段时间提醒的任务。</p>
    </div>`;
    return;
  }

  const unitMap = { day: '天', month: '个月', year: '年' };

  container.innerHTML = recurringReminders.map(r => {
    // 兼容旧数据格式（interval+unit）和新格式（years+months+days）
    let periodText;
    if (r.years !== undefined || r.months !== undefined || r.days !== undefined) {
      periodText = formatPeriodText(r.years, r.months, r.days);
    } else {
      periodText = `${r.interval} ${unitMap[r.unit] || ''}`;
    }

    const years = r.years !== undefined ? r.years : (r.unit === 'year' ? r.interval : 0);
    const months = r.months !== undefined ? r.months : (r.unit === 'month' ? r.interval : 0);
    const days = r.days !== undefined ? r.days : (r.unit === 'day' ? r.interval : 0);

    return `
      <div class="recurring-card ${r.status === 'paused' ? 'paused' : ''}" draggable="true" data-id="${r.id}">
        <div class="recurring-card-header">
          <h3 class="recurring-card-title">${r.name}</h3>
          <span class="recurring-card-badge ${r.status === 'paused' ? 'paused' : ''}">${r.status === 'paused' ? '已暂停' : '活跃'}</span>
        </div>
        <div class="recurring-card-info">
          <div class="recurring-info-row">
            <span class="recurring-info-icon">📅</span>
            <span>起始于: ${r.startDate}</span>
          </div>
          <div class="recurring-info-row">
            <span class="recurring-info-icon">⏲️</span>
            <span>周期: 每隔 ${periodText}</span>
          </div>
          <div class="recurring-info-row" style="color:var(--accent); font-weight:600;">
            <span class="recurring-info-icon">🔄</span>
            <span>当前阶段: 第 ${calculateCycleNumber(r.startDate, r.nextDate, years, months, days)} 轮</span>
          </div>
        </div>
        <div class="recurring-next-date">
          <span class="recurring-next-label">下次提醒日期</span>
          <span class="recurring-next-value">${r.nextDate}</span>
        </div>
        <div class="recurring-card-actions">
          <button class="recurring-action-btn" onclick="toggleRecurringStatus('${r.id}')">${r.status === 'paused' ? '恢复' : '暂停'}</button>
          <button class="recurring-action-btn" onclick="openEditRecurringModal('${r.id}')">编辑</button>
          <button class="recurring-action-btn danger" onclick="deleteRecurring('${r.id}')">删除</button>
        </div>
      </div>
    `;
  }).join('');

  setupRecurringDrag();
}

function setupRecurringDrag() {
  const container = document.getElementById('recurring-list-grid');
  if (!container) return;

  const cards = container.querySelectorAll('.recurring-card');
  let draggedId = null;

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedId = card.dataset.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      cards.forEach(c => c.classList.remove('drag-over'));
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const hoveringCard = e.currentTarget;
      if (hoveringCard !== card) return;
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetId = card.dataset.id;
      if (draggedId === targetId) return;

      const fromIndex = recurringReminders.findIndex(r => r.id === draggedId);
      const toIndex = recurringReminders.findIndex(r => r.id === targetId);

      if (fromIndex !== -1 && toIndex !== -1) {
        const [movedItem] = recurringReminders.splice(fromIndex, 1);
        recurringReminders.splice(toIndex, 0, movedItem);
        saveRecurring();
        renderRecurringList();
      }
    });
  });
}

window.toggleRecurringStatus = function(id) {
  const r = recurringReminders.find(x => x.id === id);
  if (r) {
    r.status = r.status === 'paused' ? 'active' : 'paused';
    saveRecurring();
    renderRecurringList();
    showToast(r.status === 'active' ? '任务已恢复' : '任务已暂停', `【${r.name}】的状态已更新。`);
  }
};

window.openEditRecurringModal = function(id) {
  const r = recurringReminders.find(x => x.id === id);
  if (!r) return;

  editingRecurringId = id;
  document.getElementById('recurring-modal-title').innerText = '编辑循环提醒';
  document.getElementById('recurring-name').value = r.name;
  document.getElementById('recurring-start-date').value = r.startDate;

  // 兼容旧格式（interval+unit）
  if (r.years !== undefined || r.months !== undefined || r.days !== undefined) {
    document.getElementById('recurring-years').value = r.years || '';
    document.getElementById('recurring-months').value = r.months || '';
    document.getElementById('recurring-days').value = r.days || '';
  } else {
    document.getElementById('recurring-years').value = r.unit === 'year' ? (r.interval || '') : '';
    document.getElementById('recurring-months').value = r.unit === 'month' ? (r.interval || '') : '';
    document.getElementById('recurring-days').value = r.unit === 'day' ? (r.interval || '') : '';
  }

  // 更新预览
  updatePeriodPreview();
  document.getElementById('recurring-modal-overlay').style.display = 'flex';
};

function checkRecurringAlarms() {
  const nowStr = todayDS();
  let changed = false;

  recurringReminders.forEach(r => {
    if (r.status === 'paused') return;

    if (r.nextDate === nowStr) {
      sendNotification('定期循环提醒', `【${r.name}】的时间到了！`);

      // 兼容旧数据格式
      const y = parseInt(r.years !== undefined ? r.years : (r.unit === 'year' ? r.interval : 0)) || 0;
      const mo = parseInt(r.months !== undefined ? r.months : (r.unit === 'month' ? r.interval : 0)) || 0;
      const d = parseInt(r.days !== undefined ? r.days : (r.unit === 'day' ? r.interval : 0)) || 0;

      const parts = r.nextDate.split('-');
      const nextDate = new Date(parts[0], parts[1] - 1, parts[2]);
      nextDate.setFullYear(nextDate.getFullYear() + y);
      nextDate.setMonth(nextDate.getMonth() + mo);
      nextDate.setDate(nextDate.getDate() + d);

      r.nextDate = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
      changed = true;
    }
  });

  if (changed) {
    saveRecurring();
    if (currentView === 'recurring') renderRecurringList();
  }
}

// 实时预览周期文字
function updatePeriodPreview() {
  const y = parseInt(document.getElementById('recurring-years').value) || 0;
  const mo = parseInt(document.getElementById('recurring-months').value) || 0;
  const d = parseInt(document.getElementById('recurring-days').value) || 0;
  const preview = document.getElementById('recurring-period-preview');
  if (!preview) return;
  if (y === 0 && mo === 0 && d === 0) {
    preview.innerText = '⚠️ 请至少填写一项';
    preview.style.color = 'var(--danger, #e05d5d)';
  } else {
    preview.innerText = `周期：每隔 ${formatPeriodText(y, mo, d)}`;
    preview.style.color = 'var(--accent)';
  }
}

// 绑定输入框实时预览
['recurring-years', 'recurring-months', 'recurring-days'].forEach(id => {
  document.getElementById(id).addEventListener('input', updatePeriodPreview);
});

document.getElementById('btn-add-recurring').addEventListener('click', () => {
  editingRecurringId = null;
  document.getElementById('recurring-modal-title').innerText = '新增循环提醒';
  document.getElementById('recurring-name').value = '';
  document.getElementById('recurring-start-date').value = todayDS();
  document.getElementById('recurring-years').value = '';
  document.getElementById('recurring-months').value = '1';
  document.getElementById('recurring-days').value = '';
  document.getElementById('recurring-period-preview').innerText = '周期：每隔1个月';
  document.getElementById('recurring-modal-overlay').style.display = 'flex';
});

document.getElementById('recurring-modal-cancel').addEventListener('click', () => {
  document.getElementById('recurring-modal-overlay').style.display = 'none';
});

document.getElementById('recurring-modal-confirm').addEventListener('click', () => {
  const name = document.getElementById('recurring-name').value.trim();
  const startDate = document.getElementById('recurring-start-date').value;
  const years = parseInt(document.getElementById('recurring-years').value) || 0;
  const months = parseInt(document.getElementById('recurring-months').value) || 0;
  const days = parseInt(document.getElementById('recurring-days').value) || 0;

  if (!name || !startDate) {
    showToast('信息不完整', '事项名称和起始日期不能为空');
    document.getElementById('recurring-name').focus();
    return;
  }
  if (years === 0 && months === 0 && days === 0) {
    showToast('周期未设置', '请至少设置年、月、天其中一项周期');
    return;
  }

  const nextDate = calculateNextDate(startDate, years, months, days);

  if (editingRecurringId) {
    const r = recurringReminders.find(x => x.id === editingRecurringId);
    if (r) {
      r.name = name;
      r.startDate = startDate;
      r.years = years;
      r.months = months;
      r.days = days;
      // 清除旧格式字段
      delete r.interval;
      delete r.unit;
      r.nextDate = nextDate;
    }
    showToast('更新成功', '循环提醒已更新！');
  } else {
    const newR = {
      id: 'rec-' + Date.now(),
      name,
      startDate,
      years,
      months,
      days,
      nextDate,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    recurringReminders.push(newR);
    showToast('添加成功', '新循环提醒已添加！');
  }

  saveRecurring();
  renderRecurringList();
  document.getElementById('recurring-modal-overlay').style.display = 'none';
});

window.deleteRecurring = function(id) {
  if (!confirm('确定删除此循环提醒吗？')) return;
  recurringReminders = recurringReminders.filter(r => r.id !== id);
  saveRecurring();
  renderRecurringList();
};

// ==================== 初始化 ====================
function init() {
  updateDateHeader();
  renderCalendar();
  renderTimetable();
  loadReminderSettings();
  
  // 初始化侧边栏导航
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
  });

  // 初始化番茄钟模块
  if (typeof PomodoroManager !== 'undefined') {
    PomodoroManager.init();
    initPomoModuleSwitcher();
  }

  // 启动引擎循环
  engineTick();
  setInterval(engineTick, 1000);

  // 每分钟任务
  setInterval(() => {
    updateDateHeader();
    engineTick();
    if (typeof checkClassAlarms === 'function') checkClassAlarms();
    checkRecurringAlarms();
  }, 60000);

  // 绑定通知铃铛
  ['notification-bell', 'classic-notification-bell'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => switchView('reminders'));
    }
  });

  // 默认进入仪表盘
  switchView('dashboard');
}

// ==================== 番茄钟模块切换 ====================
let currentPomoModule = parseInt(localStorage.getItem('currentPomoModule') || '1');

function initPomoModuleSwitcher() {
  const toggleBtn = document.getElementById('pomo-module-toggle');
  if (!toggleBtn) return;

  const module1 = document.getElementById('pomo-module-1');
  const module2 = document.getElementById('pomo-module-2');
  const headerLeft = document.querySelector('.header-left');

  // 初始化显示状态
  const applyModuleState = (mId) => {
    // 强制同步模块可见性
    if (module1) module1.style.display = mId === 1 ? 'flex' : 'none';
    if (module2) module2.style.display = mId === 2 ? 'flex' : 'none';
    
    // 只有在真正处于番茄钟视图下，才控制全局布局类和 Header 透明度
    const isPomoView = (typeof currentView !== 'undefined' && currentView === 'pomodoro');
    
    if (mId === 1) {
      if (isPomoView) {
        if (headerLeft) { headerLeft.style.opacity = '1'; headerLeft.style.pointerEvents = 'auto'; }
        document.body.classList.remove('ft-full-screen-active');
      }
      toggleBtn.querySelector('svg').style.transform = 'rotate(0deg)';
      toggleBtn.title = '切换至模块二';
    } else {
      if (isPomoView) {
        if (headerLeft) { headerLeft.style.opacity = '0'; headerLeft.style.pointerEvents = 'none'; }
        document.body.classList.add('ft-full-screen-active');
      }
      toggleBtn.querySelector('svg').style.transform = 'rotate(180deg)';
      toggleBtn.title = '返回番茄钟';
    }
  };

  // 应用当前保存的状态
  applyModuleState(currentPomoModule);

  toggleBtn.addEventListener('click', () => {
    currentPomoModule = currentPomoModule === 1 ? 2 : 1;
    localStorage.setItem('currentPomoModule', currentPomoModule);
    applyModuleState(currentPomoModule);
    console.log(`Switched to Pomo Module: ${currentPomoModule}`);
  });

  const ftExitBtn = document.getElementById('ft-exit-module');
  if (ftExitBtn) {
    ftExitBtn.addEventListener('click', () => {
      currentPomoModule = 1;
      localStorage.setItem('currentPomoModule', currentPomoModule);
      applyModuleState(currentPomoModule);
    });
  }
}

if (document.readyState === 'complete') setTimeout(init, 50);
else window.addEventListener('load', () => setTimeout(init, 50));
