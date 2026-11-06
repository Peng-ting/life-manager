/* 生活管家 — 核心：状态、路由、视觉组件与首页 */
(function () {
  'use strict';

  var LM = window.LM = window.LM || {};
  var STORAGE_KEY = 'lifeManager.v1';
  var DAY_MS = 24 * 60 * 60 * 1000;
  var WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  var WEEKDAYS_SHORT = ['日', '一', '二', '三', '四', '五', '六'];
  var MONDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

  LM.views = {};
  LM.actions = {};
  LM.forms = {};
  LM.icons = LM.icons || {};

  /* ---------- general utilities ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  LM.pad = pad;
  LM.uid = function (prefix) {
    if (window.crypto && crypto.randomUUID) return (prefix || 'id') + '_' + crypto.randomUUID().slice(0, 8);
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  };
  LM.esc = function (value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  LM.todayStr = function (d) {
    var date = d || new Date();
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  };
  LM.parseDate = function (str) {
    if (!str) return null;
    var parts = String(str).split('-').map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
    var d = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    if (d.getFullYear() !== parts[0] || d.getMonth() !== parts[1] - 1 || d.getDate() !== parts[2]) return null;
    return d;
  };
  LM.validDate = function (str) { return !!LM.parseDate(str); };
  LM.addDays = function (dateStr, amount) {
    var d = LM.parseDate(dateStr);
    if (!d) return dateStr;
    d.setDate(d.getDate() + amount);
    return LM.todayStr(d);
  };
  LM.diffDays = function (fromStr, toStr) {
    var a = LM.parseDate(fromStr), b = LM.parseDate(toStr);
    if (!a || !b) return 0;
    return Math.round((b.getTime() - a.getTime()) / DAY_MS);
  };
  LM.startOfWeek = function (dateStr) {
    var d = LM.parseDate(dateStr);
    var offset = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - offset);
    return LM.todayStr(d);
  };
  LM.endOfWeek = function (dateStr) { return LM.addDays(LM.startOfWeek(dateStr), 6); };
  LM.monthStart = function (dateStr) { return dateStr.slice(0, 7) + '-01'; };
  LM.monthEnd = function (dateStr) {
    var d = LM.parseDate(dateStr);
    return LM.todayStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  };
  LM.weekdayName = function (dateStr) { return WEEKDAYS[LM.parseDate(dateStr).getDay()]; };
  LM.weekdayIndex = function (dateStr) { return LM.parseDate(dateStr).getDay(); };
  LM.monthLabel = function (monthKey) {
    var p = String(monthKey).split('-');
    return Number(p[0]) + '年' + Number(p[1]) + '月';
  };
  LM.monthShort = function (monthKey) {
    return Number(String(monthKey).split('-')[1]) + '月';
  };
  LM.formatDate = function (dateStr, withYear) {
    var d = LM.parseDate(dateStr);
    if (!d) return '';
    return (withYear ? d.getFullYear() + '年' : '') + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  };
  LM.formatDateShort = function (dateStr) {
    var d = LM.parseDate(dateStr);
    return d ? (d.getMonth() + 1) + '/' + d.getDate() : '';
  };
  LM.timeNow = function () {
    var d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  };
  LM.nowISO = function () { return new Date().toISOString(); };
  LM.minutesNow = function () {
    var d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };
  LM.toMinutes = function (hhmm) {
    if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
    var p = hhmm.split(':').map(Number);
    return p[0] * 60 + p[1];
  };
  LM.priceLabel = function (value) {
    var n = Number(value);
    if (!n) return '未估价';
    return '¥' + (Number.isInteger(n) ? n : n.toFixed(2));
  };
  LM.arrayMove = function (arr, from, to) {
    if (to < 0 || to >= arr.length) return arr;
    var item = arr.splice(from, 1)[0];
    arr.splice(to, 0, item);
    return arr;
  };
  LM.deepClone = function (obj) { return JSON.parse(JSON.stringify(obj)); };
  LM.sum = function (arr, fn) { return arr.reduce(function (total, item) { return total + (fn ? fn(item) : item); }, 0); };
  LM.safeInt = function (value, fallback) {
    var n = parseInt(value, 10);
    return Number.isFinite(n) ? n : (fallback || 0);
  };
  LM.dateRange = function (startStr, endStr) {
    var out = [];
    var current = startStr;
    var guard = 0;
    while (current <= endStr && guard < 800) {
      out.push(current);
      current = LM.addDays(current, 1);
      guard += 1;
    }
    return out;
  };

  LM.ageInfo = function () {
    var birth = LM.state && LM.state.settings.birthDate;
    if (!birth) return null;
    var today = LM.todayStr();
    var b = LM.parseDate(birth);
    var t = LM.parseDate(today);
    if (!b) return null;
    var days = Math.floor((t - b) / DAY_MS) + 1;
    var age = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age -= 1;
    var nextBirthday = new Date(t.getFullYear(), b.getMonth(), b.getDate());
    if (nextBirthday < t) nextBirthday = new Date(t.getFullYear() + 1, b.getMonth(), b.getDate());
    var untilBirthday = Math.ceil((nextBirthday - t) / DAY_MS);
    return { days: Math.max(days, 0), age: Math.max(age, 0), untilBirthday: untilBirthday, birthDate: birth };
  };

  LM.weekdayOfNumber = function (n) {
    var map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return map[Number(n)] || '';
  };
  LM.mondayIndex = function (dateStr) { return (LM.weekdayIndex(dateStr) + 6) % 7; };
  LM.mondayLabels = MONDAY_LABELS;

  /* ---------- storage ---------- */
  function normalizeState(raw) {
    var base = window.createLifeSeed(LM.todayStr());
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
    var next = Object.assign({}, base, raw);
    next.version = 1;
    next.meta = Object.assign({}, base.meta, raw.meta || {});
    next.settings = Object.assign({}, base.settings, raw.settings || {});
    next.supplies = Array.isArray(raw.supplies) ? raw.supplies : base.supplies;
    next.scenes = Array.isArray(raw.scenes) ? raw.scenes : base.scenes;
    next.sceneLogs = raw.sceneLogs && typeof raw.sceneLogs === 'object' ? raw.sceneLogs : {};
    next.shopping = Array.isArray(raw.shopping) ? raw.shopping : [];
    next.habits = Array.isArray(raw.habits) ? raw.habits : base.habits;
    next.habitCategories = Array.isArray(raw.habitCategories) && raw.habitCategories.length ? raw.habitCategories : base.habitCategories;
    next.habitLogs = raw.habitLogs && typeof raw.habitLogs === 'object' ? raw.habitLogs : {};
    next.cleaning = Object.assign({}, base.cleaning, raw.cleaning || {});
    next.cleaning.steps = Array.isArray(next.cleaning.steps) ? next.cleaning.steps : base.cleaning.steps;
    next.cleaning.history = Array.isArray(next.cleaning.history) ? next.cleaning.history : [];
    next.reminderLog = Object.assign({}, base.reminderLog, raw.reminderLog || {});
    next.habits.forEach(function (habit) {
      habit.target = Number(habit.target) || 1;
      habit.weeklyTarget = Number(habit.weeklyTarget) || 0;
      habit.status = habit.status || 'active';
      if (!habit.categoryId) habit.categoryId = 'cat_other';
      if (habit.color == null) habit.color = '#A8BCC8';
    });
    next.cleaning.steps.forEach(function (step, i) {
      if (!step.id) step.id = 'clean_step_' + i;
      if (!step.text) step.text = '未命名步骤';
    });
    next.scenes.forEach(function (scene) {
      scene.steps = Array.isArray(scene.steps) ? scene.steps : [];
      scene.items = Array.isArray(scene.items) ? scene.items : [];
    });
    return next;
  }
  LM.normalizeState = normalizeState;

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return window.createLifeSeed(LM.todayStr());
      var parsed = JSON.parse(raw);
      return normalizeState(parsed);
    } catch (err) {
      console.warn('读取本地数据失败，已使用初始数据。', err);
      return window.createLifeSeed(LM.todayStr());
    }
  }

  LM.state = loadState();
  LM.save = function (quiet) {
    try {
      LM.state.meta.updatedAt = LM.nowISO();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(LM.state));
      return true;
    } catch (err) {
      console.error('保存本地数据失败。', err);
      if (!quiet) LM.toast('本地存储空间不足，暂时无法保存');
      return false;
    }
  };
  LM.storageKey = STORAGE_KEY;
  LM.discardStateAndReset = function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
    LM.state = window.createLifeSeed(LM.todayStr());
    LM.save(true);
  };

  LM.ui = {
    route: 'home',
    supplyFilter: { scene: 'all', status: 'all' },
    shoppingTab: 'all',
    cleaningMonth: LM.todayStr().slice(0, 7),
    cleaningEditing: false,
    sceneEditing: false,
    habitFilter: 'active',
    habitCategory: 'all',
    habitMetric: 'all',
    trendRange: 7,
    onboardingPrompted: false,
    review: null,
    suppressOnboarding: false
  };

  /* ---------- icons ---------- */
  var ICONS = {
    brand: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10.2V19h11v-8.8"/><path d="M10 19v-4.3h4V19"/><circle cx="18.4" cy="6.6" r="2.5"/><path d="m17.2 6.6.9.9 1.5-1.7"/>',
    home: '<path d="m3.5 10.8 8.5-7 8.5 7"/><path d="M5.5 9.4V20h13V9.4"/><path d="M9.8 20v-6h4.4v6"/>',
    scenes: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 12.5h8M8 16h5"/>',
    cleaning: '<path d="m14.5 4.5 5 5"/><path d="M16.5 6.5 7 16l-2.8.8L5 14l9.5-9.5"/><path d="m10 12 2 2"/><path d="M5 20h14"/>',
    supplies: '<path d="M4.5 7.5 12 4l7.5 3.5L12 11 4.5 7.5Z"/><path d="M5 8v8l7 3.5 7-3.5V8"/><path d="M12 11v8.5M8 6l7 3.5"/>',
    shopping: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8"/>',
    habit: '<path d="M20 11.2A8 8 0 0 0 5.4 7.8M4 4.5v4.2h4.2"/><path d="M4 12.8a8 8 0 0 0 14.6 3.4M20 19.5v-4.2h-4.2"/><path d="m9.2 12 1.8 1.8 3.8-4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .35 1.9l.05.05-2.85 2.85-.05-.05a1.7 1.7 0 0 0-1.9-.35 1.7 1.7 0 0 0-1.05 1.56V21h-4v-.04A1.7 1.7 0 0 0 8.9 19.4a1.7 1.7 0 0 0-1.9.35l-.05.05L4.1 16.95l.05-.05a1.7 1.7 0 0 0 .35-1.9A1.7 1.7 0 0 0 3 13.95H3v-4h.04A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.35-1.9L4.2 6.95 7.05 4.1l.05.05a1.7 1.7 0 0 0 1.9.35A1.7 1.7 0 0 0 10.05 3H14v.04a1.7 1.7 0 0 0 1.05 1.56 1.7 1.7 0 0 0 1.9-.35l.05-.05 2.85 2.85-.05.05a1.7 1.7 0 0 0-.35 1.9 1.7 1.7 0 0 0 1.56 1.05H21v4h-.04A1.7 1.7 0 0 0 19.4 15Z"/>',
    arrowLeft: '<path d="m14.5 5-7 7 7 7"/><path d="M8 12h11"/>',
    arrowRight: '<path d="M4 12h16"/><path d="m14 6 6 6-6 6"/>',
    chevronRight: '<path d="m9 5 7 7-7 7"/>',
    chevronLeft: '<path d="m15 5-7 7 7 7"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
    minus: '<path d="M5 12h14"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="15" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01M16 17.5h.01"/>',
    calendarPlus: '<rect x="4" y="5.5" width="16" height="15" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M4 10h16M12 13v5M9.5 15.5h5"/>',
    bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-2 7-2 9h16c0-2-2-2-2-9Z"/><path d="M10 21h4"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 19h16"/>',
    upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>',
    edit: '<path d="m4 20 4.2-1 10-10a2.3 2.3 0 0 0-3.2-3.2l-10 10L4 20Z"/><path d="m13.5 7 3.5 3.5"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    play: '<path d="m8 5 11 7-11 7V5Z"/>',
    archive: '<rect x="3.5" y="4.5" width="17" height="4.5" rx="1"/><path d="M5 9v11h14V9M9.5 13h5"/>',
    undo: '<path d="M9 7 4 12l5 5"/><path d="M4 12h9a7 7 0 0 1 7 7"/>',
    flame: '<path d="M12 21c4 0 7-2.7 7-6.7 0-3.2-2-5.6-3.7-7.3-.7-.7-1.9-.2-1.9.8 0 1.3-.7 2.4-1.7 2.9.2-2.8-1.6-5.3-3.2-6.7-.4-.4-1.1-.1-1.1.5.1 2.5-1.9 4.2-3.1 6.1A8 8 0 0 0 5 14.3C5 18.3 8 21 12 21Z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.3l3.4 2"/>',
    tag: '<path d="M20 13 11 4H4v7l9 9 7-7Z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    more: '<circle cx="5" cy="12" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="19" cy="12" r="1.1"/>',
    alert: '<path d="M12 4 3 20h18L12 4Z"/><path d="M12 9v5M12 17.2v.1"/>',
    sparkles: '<path d="m12 3 1.1 4.2L17 9l-3.9 1.6L12 15l-1.1-4.4L7 9l3.9-1.8L12 3Z"/><path d="m19 15 .6 2.1 2.1.9-2.1.8L19 21l-.6-2.2-2.1-.8 2.1-.9L19 15Z"/><path d="m5 14 .5 1.6 1.5.7-1.5.6L5 18.5l-.5-1.6-1.5-.6 1.5-.7L5 14Z"/>',
    box: '<path d="m4 7.5 8-3.5 8 3.5-8 3.5-8-3.5Z"/><path d="M4 7.5V16l8 3.5 8-3.5V7.5"/><path d="M12 11v8.5"/>',
    bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8"/>',
    sunflower: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    sunrise: '<path d="M4 18h16M6.5 18a5.5 5.5 0 0 1 11 0M12 4v3M5.3 7.3l2.1 2.1M18.7 7.3l-2.1 2.1M3 14H1.5M22.5 14H21"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
    activity: '<path d="M3 12h4l2.3-6 4.1 12 2.2-6H21"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
    book: '<path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h12.5v16H7a2.5 2.5 0 0 0-2.5 2V5.5Z"/><path d="M4.5 19.5V21H19M8 7h8M8 10.5h7"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="m7 15 3.5-4 3 2.4L19 7"/>',
    refresh: '<path d="M20 7v4h-4M4 17v-4h4"/><path d="M18.5 10A7.5 7.5 0 0 0 5.8 7.3L4 11M5.5 14A7.5 7.5 0 0 0 18.2 16.7L20 13"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    leaf: '<path d="M20 4C12 4 5 8 5 15c0 2.5 1.5 4 4 4 7 0 11-7 11-15Z"/><path d="M4 21c2-6 6-9 11-11"/>'
  };
  LM.icon = function (name, size, cls) {
    var paths = ICONS[name] || ICONS.sparkles;
    return '<svg class="' + (cls || '') + '" width="' + (size || 22) + '" height="' + (size || 22) +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  };
  LM.sceneIcon = function (name, size) {
    var map = { sunrise: 'sunrise', moon: 'moon', activity: 'activity', compass: 'compass', book: 'book' };
    return LM.icon(map[name] || 'scenes', size);
  };

  /* ---------- routing ---------- */
  function parseRoute() {
    var hash = String(location.hash || '').replace(/^#\/?/, '');
    var parts = hash.split('/').filter(Boolean);
    if (!parts.length) return { name: 'home' };
    if (parts[0] === 'scene') return { name: 'scene', id: decodeURIComponent(parts[1] || '') };
    return { name: parts[0] };
  }
  LM.parseRoute = parseRoute;
  LM.navigate = function (path, replace) {
    var clean = String(path || 'home').replace(/^#?\/?/, '');
    var hash = '#/' + clean;
    if (location.hash === hash) {
      LM.render({ scrollTop: true });
      return;
    }
    if (replace) history.replaceState(null, '', hash);
    else location.hash = hash;
    LM.closeSheet(true);
  };
  LM.goHome = function () { LM.navigate('home'); };
  LM.render = function (opts) {
    opts = opts || {};
    if (LM.ensureCleaningPlan) LM.ensureCleaningPlan();
    if (LM.ensureHabitDefaults) LM.ensureHabitDefaults();
    var route = parseRoute();
    var previous = LM.ui.route;
    LM.ui.route = route.name;
    var renderer = LM.views[route.name] || LM.views.home;
    var scrollY = window.scrollY || document.documentElement.scrollTop;
    var app = document.getElementById('app');
    var active = route.name === 'scene' ? 'scenes' : route.name;
    var html = '<div class="page">' + renderer(route) + '</div>' + bottomNav(active);
    app.innerHTML = html;
    if (opts.scrollTop === true || (previous !== route.name && opts.scrollTop !== false)) {
      window.scrollTo(0, 0);
    } else if (opts.keepScroll) {
      requestAnimationFrame(function () { window.scrollTo(0, scrollY); });
    }
    var header = app.querySelector('.page-header');
    if (header) syncHeader(header);
    LM.maybeOpenOnboarding();
  };
  LM.refresh = function (opts) {
    var y = window.scrollY || 0;
    LM.save(true);
    LM.render({ scrollTop: false });
    requestAnimationFrame(function () { window.scrollTo(0, y); });
  };
  LM.renderAndScroll = function () {
    LM.save(true);
    LM.render({ scrollTop: true });
  };

  function bottomNav(active) {
    var items = [
      { key: 'home', label: '首页', icon: 'home', route: 'home' },
      { key: 'scenes', label: '场景', icon: 'scenes', route: 'scenes' },
      { key: 'cleaning', label: '打扫', icon: 'cleaning', route: 'cleaning' },
      { key: 'supplies', label: '用品', icon: 'supplies', route: 'supplies' },
      { key: 'shopping', label: '购物', icon: 'shopping', route: 'shopping' },
      { key: 'habits', label: '习惯', icon: 'habit', route: 'habits' }
    ];
    return '<nav class="bottom-nav" aria-label="主导航">' + items.map(function (item) {
      return '<button type="button" class="nav-item ' + (active === item.key ? 'active' : '') +
        '" data-action="nav" data-route="' + item.route + '" aria-label="' + item.label + '"' +
        (active === item.key ? ' aria-current="page"' : '') + '>' +
        LM.icon(item.icon, 21) + '<span class="nav-label">' + item.label + '</span></button>';
    }).join('') + '</nav>';
  }

  function syncHeader(header) {
    if (!header) return;
    if ((window.scrollY || 0) > 8) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }
  window.addEventListener('scroll', function () {
    syncHeader(document.querySelector('.page-header'));
  }, { passive: true });

  /* ---------- visual helpers ---------- */
  LM.pageHeader = function (opts) {
    var back = opts.back || 'home';
    var title = LM.esc(opts.title || '');
    var sub = opts.sub ? '<div class="header-sub">' + LM.esc(opts.sub) + '</div>' : '';
    var actions = opts.actions || '';
    return '<header class="page-header"><div class="header-row">' +
      '<button type="button" class="header-back" data-action="nav" data-route="' + back + '" aria-label="返回">' + LM.icon('arrowLeft', 21) + '</button>' +
      '<div class="header-titles"><h1 class="header-title">' + title + '</h1>' + sub + '</div>' +
      '<div class="header-actions">' + actions + '</div></div></header>';
  };
  LM.topbar = function () {
    return '<header class="topbar"><div class="brand"><span class="brand-mark">' + LM.icon('brand', 18) + '</span>' +
      '<span class="brand-name">生活管家</span></div>' +
      '<div class="top-actions"><button type="button" class="icon-btn" data-action="open-settings" aria-label="偏好与数据">' +
      LM.icon('settings', 20) + '</button></div></header>';
  };
  LM.emptyState = function (opts) {
    return '<div class="empty-state ' + (opts.className || '') + '">' +
      '<div class="empty-icon">' + LM.icon(opts.icon || 'sparkles', 21) + '</div>' +
      '<h3>' + LM.esc(opts.title || '这里还是空的') + '</h3>' +
      '<p>' + LM.esc(opts.text || '') + '</p>' +
      (opts.action ? '<button type="button" class="btn soft small-btn" data-action="' + opts.action + '"' +
        (opts.actionId ? ' data-id="' + LM.esc(opts.actionId) + '"' : '') + '>' + LM.esc(opts.actionLabel || '去添加') + '</button>' : '') +
      '</div>';
  };
  LM.progress = function (value, total, cls) {
    var pct = total > 0 ? Math.max(0, Math.min(100, Math.round(value / total * 100))) : 0;
    return '<div class="progress-track"><div class="progress-fill ' + (cls || '') + '" style="width:' + pct + '%"></div></div>';
  };
  LM.progressLine = function (value, total) {
    var pct = total > 0 ? Math.max(0, Math.min(100, Math.round(value / total * 100))) : 0;
    return '<div class="progress-line"><span style="width:' + pct + '%"></span></div>';
  };
  LM.ring = function (pct, label) {
    var radius = 45;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return '<div class="ring-wrap"><svg viewBox="0 0 112 112" aria-hidden="true">' +
      '<circle class="ring-track" cx="56" cy="56" r="' + radius + '"></circle>' +
      '<circle class="ring-fill" cx="56" cy="56" r="' + radius + '" stroke-dasharray="' + circumference.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '"></circle>' +
      '</svg><div class="ring-center"><span class="ring-pct">' + Math.round(pct) + '%</span><span class="ring-caption">' + LM.esc(label || '今日完成') + '</span></div></div>';
  };
  LM.sceneTone = function (tone) { return tone || 'blue'; };

  /* ---------- sheet + toast primitives ---------- */
  var sheetOpen = false;
  LM.openSheet = function (opts) {
    var toastRoot = document.getElementById('toast-root');
    if (toastRoot) toastRoot.innerHTML = '';
    if (toastTimer) clearTimeout(toastTimer);
    var root = document.getElementById('overlay-root');
    var bodyClass = opts.bodyClass ? ' ' + opts.bodyClass : '';
    var footer = opts.footer ? '<footer class="sheet-footer">' + opts.footer + '</footer>' : '';
    root.innerHTML = '<div class="sheet-backdrop" data-sheet-backdrop>' +
      '<section class="sheet ' + (opts.large ? 'large' : '') + '" role="dialog" aria-modal="true" aria-labelledby="sheet-title">' +
      '<div class="sheet-handle" aria-hidden="true"></div>' +
      '<header class="sheet-head"><div class="sheet-head-copy"><h2 class="sheet-title" id="sheet-title">' + LM.esc(opts.title || '') + '</h2>' +
      (opts.sub ? '<p class="sheet-sub">' + LM.esc(opts.sub) + '</p>' : '') + '</div>' +
      (opts.hideClose ? '' : '<button type="button" class="sheet-close" data-close aria-label="关闭">' + LM.icon('close', 19) + '</button>') +
      '</header>' +
      '<div class="sheet-body' + bodyClass + '">' + (opts.body || '') + '</div>' + footer + '</section></div>';
    document.body.classList.add('sheet-open');
    sheetOpen = true;
    var backdrop = root.querySelector('[data-sheet-backdrop]');
    if (!opts.hideClose && opts.backdropClose !== false) {
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) LM.closeSheet();
      });
    }
    if (typeof opts.onMount === 'function') opts.onMount(root.querySelector('.sheet'));
    return root.querySelector('.sheet');
  };
  LM.closeSheet = function (silent) {
    var root = document.getElementById('overlay-root');
    if (!root) return;
    root.innerHTML = '';
    document.body.classList.remove('sheet-open');
    sheetOpen = false;
    if (!silent && LM.ui.review) LM.ui.review = null;
  };
  LM.isSheetOpen = function () { return sheetOpen; };
  LM.confirm = function (opts) {
    var danger = opts.danger !== false;
    LM.openSheet({
      title: opts.title || '确认操作',
      sub: opts.sub || '',
      body: '<p class="confirm-copy">' + LM.esc(opts.message || '') + '</p>' +
        (opts.note ? '<div class="' + (danger ? 'warning-note' : 'info-note') + ' mt-12">' + LM.esc(opts.note) + '</div>' : ''),
      footer: '<button type="button" class="btn" data-close>取消</button>' +
        '<button type="button" class="btn ' + (danger ? 'danger' : 'primary') + '" id="confirm-yes">' + LM.esc(opts.confirmLabel || '确认') + '</button>',
      onMount: function (sheet) {
        sheet.querySelector('#confirm-yes').addEventListener('click', function () {
          LM.closeSheet();
          if (typeof opts.onConfirm === 'function') opts.onConfirm();
        });
      }
    });
  };
  var toastTimer = null;
  LM.toast = function (message, opts) {
    opts = opts || {};
    var root = document.getElementById('toast-root');
    if (!root) return;
    if (toastTimer) clearTimeout(toastTimer);
    var action = opts.actionLabel ? '<button type="button" class="toast-action" id="toast-action">' + LM.esc(opts.actionLabel) + '</button>' : '';
    root.innerHTML = '<div class="toast" role="status"><span class="grow">' + LM.esc(message) + '</span>' + action +
      '<button type="button" class="toast-close" aria-label="关闭提示" id="toast-close">' + LM.icon('close', 14) + '</button></div>';
    var toast = root.querySelector('.toast');
    var remove = function () {
      if (!toast) return;
      toast.classList.add('out');
      setTimeout(function () { if (root.contains(toast)) root.innerHTML = ''; }, 210);
    };
    root.querySelector('#toast-close').addEventListener('click', remove);
    var actionBtn = root.querySelector('#toast-action');
    if (actionBtn) {
      actionBtn.addEventListener('click', function () {
        try { if (opts.onAction) opts.onAction(); } finally { remove(); }
      });
    }
    toastTimer = setTimeout(remove, opts.duration || 3300);
  };

  /* ---------- birthday / onboarding ---------- */
  LM.openBirthdaySheet = function (onboarding) {
    var current = LM.state.settings.birthDate || '';
    LM.openSheet({
      title: onboarding ? '先记下你的起点' : '我的出生日期',
      sub: onboarding ? '生活管家会用这一天，替你记住来到世界的第几天。' : '只保存在你自己的设备里。',
      hideClose: !!onboarding,
      backdropClose: !onboarding,
      body: '<div class="info-note">生日只用于计算「来到这个世界的第 N 天」与周岁，不会上传或分享。</div>' +
        '<form class="form mt-16" data-form="save-birthdate" id="birthday-form">' +
        '<div class="field"><label for="birthdate-input">出生日期</label>' +
        '<input class="input" type="date" id="birthdate-input" name="birthDate" max="' + LM.todayStr() + '" value="' + LM.esc(current) + '" required>' +
        '<p class="form-hint">从出生日到今天，按自然日计算；每日自动更新。</p></div>' +
        '<button type="submit" class="btn primary block">' + (onboarding ? '保存并开始' : '保存生日') + '</button>' +
        (onboarding ? '<button type="button" class="btn ghost block" data-action="dismiss-onboarding">稍后设置</button>' : '') +
        '</form>',
      onMount: function () {}
    });
  };
  LM.maybeOpenOnboarding = function () {
    if (LM.ui.onboardingPrompted || LM.ui.suppressOnboarding) return;
    if (LM.state.settings.birthDate) return;
    if (LM.state.settings.onboardingSeen) return;
    LM.ui.onboardingPrompted = true;
    setTimeout(function () {
      if (LM.state.settings.birthDate || LM.state.settings.onboardingSeen) return;
      LM.openBirthdaySheet(true);
    }, 650);
  };
  LM.forms['save-birthdate'] = function (form, data) {
    var value = String(data.get('birthDate') || '');
    if (!LM.validDate(value) || value > LM.todayStr()) {
      LM.toast('请选择一个有效的出生日期');
      return;
    }
    LM.state.settings.birthDate = value;
    LM.state.settings.onboardingSeen = true;
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
    LM.toast('从今天起，生活管家替你记住每一天');
  };
  LM.actions['dismiss-onboarding'] = function () {
    LM.state.settings.onboardingSeen = true;
    LM.save(true);
    LM.closeSheet();
    LM.toast('随时可以在右上角设置生日');
  };

  /* ---------- settings ---------- */
  LM.openSettings = function () {
    var s = LM.state.settings;
    var browserSupported = 'Notification' in window;
    var permissionText = !browserSupported ? '当前浏览器不支持' :
      (Notification.permission === 'granted' ? '已允许' : Notification.permission === 'denied' ? '已被浏览器拒绝' : '未开启');
    LM.openSheet({
      title: '偏好与数据',
      sub: '让工作台更像你的节奏。',
      large: true,
      body: '<div class="form-section" style="border-top:0;padding-top:0;margin-top:0">' +
        '<div class="form-section-title">关于你</div>' +
        '<form class="form" data-form="settings-birthdate">' +
        '<div class="field"><label for="settings-birth">出生日期</label>' +
        '<div class="input-row"><input class="input" id="settings-birth" type="date" name="birthDate" max="' + LM.todayStr() + '" value="' + LM.esc(s.birthDate) + '">' +
        '<button type="submit" class="btn soft">保存</button></div></div>' +
        '<div class="switch-row"><div class="switch-copy"><div class="switch-title">首页显示「周岁」</div><div class="switch-sub">关闭时显示来到世界的天数</div></div>' +
        '<label class="switch"><input type="checkbox" data-setting="ageModeBool" ' + (s.ageMode === 'age' ? 'checked' : '') + '><span class="switch-track"></span></label></div>' +
        '</form></div>' +
        '<div class="form-section"><div class="form-section-title">轻提醒</div>' +
        '<div class="switch-row"><div class="switch-copy"><div class="switch-title">习惯打卡提醒</div><div class="switch-sub">到点在应用内轻提示，可在习惯里单独设置时间</div></div>' +
        '<label class="switch"><input type="checkbox" data-setting="habitReminders" ' + (s.habitReminders ? 'checked' : '') + '><span class="switch-track"></span></label></div>' +
        '<div class="switch-row"><div class="switch-copy"><div class="switch-title">打扫日提醒</div><div class="switch-sub">每周打扫日当天轻提示一次</div></div>' +
        '<label class="switch"><input type="checkbox" data-setting="cleaningReminders" ' + (s.cleaningReminders ? 'checked' : '') + '><span class="switch-track"></span></label></div>' +
        '<div class="switch-row"><div class="switch-copy"><div class="switch-title">系统通知</div><div class="switch-sub">' + LM.esc(permissionText) + '</div></div>' +
        '<label class="switch"><input type="checkbox" data-browser-notifications ' + (s.browserNotifications && permissionText === '已允许' ? 'checked' : '') + '><span class="switch-track"></span></label></div>' +
        '</div>' +
        '<div class="form-section"><div class="form-section-title">备份</div>' +
        '<div class="info-note">所有记录只保存在这台设备的浏览器里。建议偶尔导出一份 JSON 备份。</div>' +
        '<div class="inline-actions mt-12">' +
        '<button type="button" class="btn" data-action="export-data">' + LM.icon('download', 17) + '导出 JSON</button>' +
        '<label class="btn" style="cursor:pointer">' + LM.icon('upload', 17) + '导入 JSON<input type="file" accept="application/json,.json" data-import-input hidden></label>' +
        '</div>' +
        '<button type="button" class="btn ghost block mt-10" data-action="reset-data" style="color:var(--danger)">清空并恢复初始数据</button>' +
        '</div>' +
        '<div class="form-section"><div class="form-section-title">关于</div>' +
        '<p class="form-hint">生活管家 · 本地优先的极简生活工作台<br>版本 1.0 · 不联网、不上传、不追踪</p></div>',
      onMount: function (sheet) {
        var importInput = sheet.querySelector('[data-import-input]');
        if (importInput) {
          importInput.addEventListener('change', function () {
            var file = importInput.files && importInput.files[0];
            if (file) LM.importBackupFile(file);
          });
        }
      }
    });
  };
  LM.forms['settings-birthdate'] = function (form, data) {
    var value = String(data.get('birthDate') || '');
    if (value && (!LM.validDate(value) || value > LM.todayStr())) {
      LM.toast('请选择一个有效的出生日期');
      return;
    }
    LM.state.settings.birthDate = value;
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
    LM.toast('已保存');
  };
  LM.actions['open-settings'] = function () { LM.openSettings(); };
  LM.actions['toggle-age'] = function () {
    LM.state.settings.ageMode = LM.state.settings.ageMode === 'days' ? 'age' : 'days';
    LM.save(true);
    LM.refresh();
  };
  LM.actions['export-data'] = function () {
    var stamp = LM.todayStr();
    var payload = JSON.stringify(LM.state, null, 2);
    var blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '生活管家-备份-' + stamp + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
    LM.toast('备份已导出');
  };
  LM.importBackupFile = function (file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try {
        parsed = JSON.parse(String(reader.result || ''));
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.supplies) || !Array.isArray(parsed.scenes)) {
          throw new Error('结构不完整');
        }
      } catch (err) {
        LM.toast('这个文件不是有效的「生活管家」备份');
        return;
      }
      LM.confirm({
        title: '导入这份备份？',
        message: '导入会覆盖当前设备上的全部记录。建议先导出一份当前数据。',
        confirmLabel: '覆盖并导入',
        danger: true,
        onConfirm: function () {
          LM.state = LM.normalizeState(parsed);
          LM.save(true);
          if (LM.ensureCleaningPlan) LM.ensureCleaningPlan();
          LM.closeSheet();
          LM.navigate('home', true);
          LM.render({ scrollTop: true });
          LM.toast('备份已导入');
        }
      });
    };
    reader.onerror = function () { LM.toast('读取文件失败'); };
    reader.readAsText(file, 'utf-8');
  };
  LM.actions['reset-data'] = function () {
    LM.confirm({
      title: '清空全部数据？',
      message: '用品库、打扫历史、场景打卡、购物清单和习惯记录都会被移除，并恢复最初预置的数据。',
      confirmLabel: '清空并恢复',
      danger: true,
      note: '这个操作无法撤销。若想保留，请先导出备份。',
      onConfirm: function () {
        LM.discardStateAndReset();
        LM.ui.suppressOnboarding = false;
        LM.ui.onboardingPrompted = false;
        LM.closeSheet();
        LM.navigate('home', true);
        LM.render({ scrollTop: true });
        LM.toast('已恢复初始数据');
      }
    });
  };

  /* shared change handling */
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!el) return;
    if (el.matches('[data-browser-notifications]')) {
      handleBrowserNotificationToggle(el);
      return;
    }
    var setting = el.getAttribute('data-setting');
    if (!setting) {
      if (el.matches('.radio-card input[type="radio"]')) {
        var group = el.closest('.radio-cards');
        if (group) {
          group.querySelectorAll('.radio-card').forEach(function (card) {
            card.classList.toggle('checked', card.querySelector('input').checked);
          });
        }
        var target = el.getAttribute('data-target');
        if (target) updateTargetField(el.value, target);
      }
      if (el.matches('.color-swatch input[type="radio"]')) {
        var swatchWrap = el.closest('.color-swatches');
        if (swatchWrap) swatchWrap.querySelectorAll('.color-swatch').forEach(function (sw) {
          sw.classList.toggle('checked', sw.querySelector('input').checked);
        });
      }
      if (el.matches('[data-icon-preview-input]')) {
        var previewId = el.getAttribute('data-icon-preview-input');
        var preview = document.getElementById(previewId);
        if (preview) preview.textContent = el.value.trim() || '·';
      }
      return;
    }
    if (setting === 'ageModeBool') {
      LM.state.settings.ageMode = el.checked ? 'age' : 'days';
    } else {
      LM.state.settings[setting] = el.checked;
    }
    LM.save(true);
    if (setting === 'ageModeBool') LM.refresh();
  });

  function updateTargetField(type, target) {
    var wrap = document.querySelector('[data-target-wrap="' + target + '"]');
    if (!wrap) return;
    var label = wrap.querySelector('[data-target-label]');
    var suffix = wrap.querySelector('[data-target-unit]');
    if (type === 'daily') {
      wrap.style.display = 'none';
    } else {
      wrap.style.display = '';
      if (label) label.textContent = type === 'count' ? '每日目标次数' : '每日目标时长';
      if (suffix) suffix.textContent = type === 'count' ? '次' : '分钟';
    }
  }

  function handleBrowserNotificationToggle(el) {
    if (!('Notification' in window)) {
      el.checked = false;
      LM.toast('当前浏览器不支持系统通知');
      return;
    }
    if (!el.checked) {
      LM.state.settings.browserNotifications = false;
      LM.save(true);
      return;
    }
    Notification.requestPermission().then(function (permission) {
      if (permission === 'granted') {
        LM.state.settings.browserNotifications = true;
        LM.save(true);
        LM.toast('系统通知已开启');
      } else {
        el.checked = false;
        LM.state.settings.browserNotifications = false;
        LM.save(true);
        LM.toast(permission === 'denied' ? '浏览器已拒绝通知权限' : '未获得通知权限');
      }
    }).catch(function () {
      el.checked = false;
      LM.toast('无法开启系统通知');
    });
  }

  /* ---------- home ---------- */
  LM.views.home = function () {
    var info = LM.ageInfo();
    var mode = LM.state.settings.ageMode === 'age' ? 'age' : 'days';
    var today = LM.todayStr();
    var dateLabel = LM.formatDate(today) + ' ' + LM.weekdayName(today);
    var summaries = getHomeSummaries();
    var hero = '';
    if (info) {
      if (mode === 'age') {
        hero = '<div class="hero-body"><div class="hero-age"><span class="hero-age-number">' + info.age + '</span>' +
          '<span class="hero-word">岁</span></div><span class="hero-day">距离下一次生日 ' + info.untilBirthday + ' 天</span></div>' +
          '<div class="hero-meta"><span class="hero-birth">出生于 ' + LM.formatDate(info.birthDate, true) + '</span>' +
          '<button type="button" class="hero-edit" data-action="open-settings">编辑生日' + LM.icon('chevronRight', 11) + '</button></div>';
      } else {
        hero = '<div class="hero-body"><span class="hero-prefix">第</span><span class="hero-number">' + info.days.toLocaleString('zh-CN') + '</span>' +
          '<span class="hero-word">天</span><span class="hero-day">来到这个世界</span></div>' +
          '<div class="hero-meta"><span class="hero-birth">出生于 ' + LM.formatDate(info.birthDate, true) + ' · 周岁 ' + info.age + ' 岁</span>' +
          '<button type="button" class="hero-edit" data-action="open-settings">编辑生日' + LM.icon('chevronRight', 11) + '</button></div>';
      }
    } else {
      hero = '<div class="hero-body"><span class="hero-prefix">第</span><span class="hero-number">1</span><span class="hero-word">天</span><span class="hero-day">从今天开始记录</span></div>' +
        '<div class="hero-empty"><p>设置出生日期，让每一天都有一个温柔的刻度。</p>' +
        '<button type="button" class="btn small-btn soft" data-action="open-birthday">设置我的出生日期</button></div>';
    }
    var heroMarkup = '<section class="hero" aria-label="来到世界的第几天">' +
      '<div class="hero-top"><div><div class="hero-kicker">A quiet record</div><div class="hero-title">' +
      LM.esc(dateLabel) + '</div></div>' +
      (info ? '<div class="hero-mode"><div class="segmented" role="group" aria-label="显示方式">' +
        '<button type="button" class="' + (mode === 'days' ? 'active' : '') + '" data-action="set-age-mode" data-mode="days">天数</button>' +
        '<button type="button" class="' + (mode === 'age' ? 'active' : '') + '" data-action="set-age-mode" data-mode="age">周岁</button>' +
        '</div></div>' : '') +
      '</div>' + hero + '</section>';

    var rows = [
      { icon: 'scenes', tone: 'blue', label: '今日 SOP', value: summaries.sceneText, route: 'scenes' },
      { icon: 'supplies', tone: 'sand', label: '待补货 / 需替换', value: summaries.supplyText, route: 'supplies' },
      { icon: 'shopping', tone: 'gray', label: '购物清单待决', value: summaries.shoppingText, route: 'shopping' },
      { icon: 'cleaning', tone: 'sage', label: '距下次打扫', value: summaries.cleaningText, route: 'cleaning' },
      { icon: 'habit', tone: 'blue', label: '今日习惯', value: summaries.habitText, route: 'habits' }
    ];
    var summaryMarkup = '<section class="summary-card" aria-label="今日摘要">' + rows.map(function (row) {
      return '<button type="button" class="summary-row" data-action="nav" data-route="' + row.route + '">' +
        '<span class="summary-icon ' + row.tone + '">' + LM.icon(row.icon, 15) + '</span>' +
        '<span class="summary-label">' + row.label + '</span>' +
        '<span class="summary-value">' + row.value + '</span>' +
        '<span class="summary-chevron">' + LM.icon('chevronRight', 13) + '</span></button>';
    }).join('') + '</section>';

    var cards = [
      { route: 'scenes', tone: 'blue', icon: 'scenes', name: '场景 SOP', desc: summaries.sceneCardDesc },
      { route: 'cleaning', tone: 'sage', icon: 'cleaning', name: '打扫卫生', desc: summaries.cleaningCardDesc },
      { route: 'supplies', tone: 'sand', icon: 'supplies', name: '生活用品库', desc: summaries.supplyCardDesc },
      { route: 'shopping', tone: 'gray', icon: 'shopping', name: '购物清单', desc: summaries.shoppingCardDesc },
      { route: 'habits', tone: 'lilac', icon: 'habit', name: '习惯养成', desc: summaries.habitCardDesc, wide: true }
    ];
    var moduleMarkup = '<section class="section home-modules"><div class="section-head"><div><h2 class="section-title">今天，从这里开始</h2>' +
      '<p class="section-sub">一次只做一件事，也很好</p></div></div><div class="module-grid">' +
      cards.map(function (card) {
        return '<button type="button" class="module-card' + (card.wide ? ' wide' : '') + '" data-tone="' + card.tone + '" data-action="nav" data-route="' + card.route + '">' +
          '<span class="module-icon">' + LM.icon(card.icon, 18) + '</span><span class="module-text"><span class="module-name">' + card.name + '</span><span class="module-desc">' + card.desc + '</span></span><span class="module-arrow">' + LM.icon('chevronRight', 15) + '</span>' +
          '</button>';
      }).join('') + '</div></section>';

    return LM.topbar() + '<div class="home-head"><div class="home-greeting"><span class="today-label">' +
      greetingForNow() + '</span><span class="quiet-note">' +
      LM.icon('leaf', 11) + '慢一点，也算向前</span></div></div>' + heroMarkup + summaryMarkup + moduleMarkup +
      '<p class="home-footnote">生活管家 · 把日常放回简单的地方</p>';
  };

  function greetingForNow() {
    var hour = new Date().getHours();
    if (hour < 5) return '夜深了，早点休息';
    if (hour < 11) return '早上好，今天也慢慢来';
    if (hour < 14) return '中午好，记得歇一会儿';
    if (hour < 18) return '下午好，把节奏放轻一点';
    return '晚上好，辛苦一天了';
  }

  function getHomeSummaries() {
    var scene = LM.sceneTodaySummary ? LM.sceneTodaySummary() : { done: 0, total: 0, morningDone: 0, morningTotal: 0, eveningDone: 0, eveningTotal: 0 };
    var supply = LM.supplySummary ? LM.supplySummary() : { active: 0, low: 0, replace: 0 };
    var shopping = LM.shoppingSummary ? LM.shoppingSummary() : { wish: 0, pending: 0, open: 0 };
    var cleaning = LM.cleaningSummary ? LM.cleaningSummary() : { days: null, label: '未设置' };
    var habit = LM.habitTodaySummary ? LM.habitTodaySummary() : { due: 0, done: 0, pending: 0 };
    var sceneText = scene.total ? ('早 ' + scene.morningDone + '/' + scene.morningTotal + ' · 晚 ' + scene.eveningDone + '/' + scene.eveningTotal) : '待设置';
    var supplyText = '<span class="' + (supply.low ? 'warn' : '') + '">补货 ' + supply.low + '</span> · <span class="' + (supply.replace ? 'warn' : '') + '">替换 ' + supply.replace + '</span>';
    var shoppingText = (shopping.open ? '<span class="warn">' + shopping.open + ' 条待决</span>' : '暂无待决') + (shopping.wish ? ' · 想买 ' + shopping.wish : '');
    var cleaningText = LM.esc(cleaning.label || '未设置');
    var habitText = '待打卡 ' + habit.pending + ' / 已打卡 <span class="' + (habit.done ? 'done' : '') + '">' + habit.done + '</span>';
    return {
      sceneText: sceneText,
      supplyText: supplyText,
      shoppingText: shoppingText,
      cleaningText: cleaningText,
      habitText: habitText,
      sceneCardDesc: scene.total ? ('早 ' + scene.morningDone + '/' + scene.morningTotal + ' · 晚 ' + scene.eveningDone + '/' + scene.eveningTotal) : '两条日常路径，等你填写',
      cleaningCardDesc: cleaning.cardLabel || '设置每周打扫日',
      supplyCardDesc: supply.active + ' 件 · ' + (supply.low + supply.replace) + ' 项提醒',
      shoppingCardDesc: '想买 ' + shopping.wish + ' · 待决定 ' + shopping.pending,
      habitCardDesc: habit.due ? ('今日已打卡 ' + habit.done + '/' + habit.due + ' · ' + (habit.pending ? '还差 ' + habit.pending + ' 项' : '全部完成')) : '为想要的生活，加一点坚持'
    };
  }

  LM.actions['set-age-mode'] = function (data) {
    LM.state.settings.ageMode = data.mode === 'age' ? 'age' : 'days';
    LM.save(true);
    LM.refresh();
  };
  LM.actions['open-birthday'] = function () { LM.openBirthdaySheet(false); };
  LM.actions.nav = function (data) {
    LM.navigate(data.route || 'home');
  };

  /* ---------- global event delegation ---------- */
  document.addEventListener('click', function (e) {
    var closeTrigger = e.target.closest('[data-close]');
    if (closeTrigger) {
      e.preventDefault();
      LM.closeSheet();
      return;
    }
    var actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-action');
    var handler = LM.actions[action];
    if (!handler) return;
    e.preventDefault();
    handler(actionEl.dataset, actionEl, e);
  });
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    var handler = LM.forms[form.getAttribute('data-form')];
    if (handler) handler(form, new FormData(form));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sheetOpen) LM.closeSheet();
  });
  window.addEventListener('hashchange', function () {
    LM.render({ scrollTop: true });
  });

  LM.dayStart = function (dateStr) { return LM.parseDate(dateStr).getTime(); };
  LM.storageAvailable = function () {
    try {
      localStorage.setItem('__lm_test__', '1');
      localStorage.removeItem('__lm_test__');
      return true;
    } catch (err) { return false; }
  };
})();
