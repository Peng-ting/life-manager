/* 生活管家 — 模块 5：习惯养成 */
(function () {
  'use strict';
  var LM = window.LM;

  var FREQ = {
    daily: { label: '每日打卡', short: '每日', unit: '次' },
    count: { label: '计数型', short: '计数', unit: '次' },
    duration: { label: '时长型', short: '时长', unit: '分钟' }
  };
  var HABIT_COLORS = ['#9fb9c4', '#a9bcaa', '#b7b1c4', '#c9b9a2', '#b58f80', '#8fa9a2', '#a6aebf'];
  LM.habitColors = HABIT_COLORS;
  LM.habitFreq = FREQ;

  LM.ensureHabitDefaults = function () {
    if (!LM.state.habits) LM.state.habits = [];
    if (!LM.state.habitCategories || !LM.state.habitCategories.length) {
      LM.state.habitCategories = [
        { id: 'cat_health', name: '健康', order: 0 },
        { id: 'cat_study', name: '学习', order: 1 },
        { id: 'cat_discipline', name: '自律', order: 2 },
        { id: 'cat_sleep', name: '作息', order: 3 },
        { id: 'cat_other', name: '其他', order: 4 }
      ];
    }
    if (!LM.state.habitLogs || typeof LM.state.habitLogs !== 'object') LM.state.habitLogs = {};
    if (!LM.state.reminderLog) LM.state.reminderLog = { date: '', habitIds: [], cleaningDate: '' };
    if (!Array.isArray(LM.state.reminderLog.habitIds)) LM.state.reminderLog.habitIds = [];
    LM.state.habits.forEach(function (habit) {
      if (!habit.status) habit.status = 'active';
      if (!habit.color) habit.color = '#a8bcc8';
      if (!habit.startDate) habit.startDate = LM.todayStr();
      if (!habit.categoryId) habit.categoryId = 'cat_other';
    });
    if (LM.ui.habitMetric !== 'all' && !LM.state.habits.some(function (h) { return h.id === LM.ui.habitMetric; })) {
      LM.ui.habitMetric = 'all';
    }
  };

  function getHabit(id) {
    return LM.state.habits.find(function (habit) { return habit.id === id; }) || null;
  }
  LM.getHabit = getHabit;

  function getCategory(id) {
    return LM.state.habitCategories.find(function (category) { return category.id === id; }) || null;
  }
  LM.getHabitCategory = getCategory;

  function categoryName(habit) {
    var category = getCategory(habit.categoryId);
    return category ? category.name : '其他';
  }

  function habitUnit(habit) {
    if (habit.freqType === 'duration') return '分钟';
    return habit.unit || (habit.freqType === 'daily' ? '次' : '次');
  }

  function targetValue(habit) {
    return habit.freqType === 'daily' ? 1 : Math.max(1, Number(habit.target) || 1);
  }

  function habitDueOnDate(habit, date) {
    if (!habit || !habit.startDate) return false;
    if (date < habit.startDate) return false;
    if (habit.status === 'archived' && habit.archivedAt) {
      if (date >= String(habit.archivedAt).slice(0, 10)) return false;
    }
    if (habit.status === 'paused' && date === LM.todayStr()) return false;
    if (habit.status !== 'active' && habit.status !== 'paused') return false;
    return true;
  }

  function activeDueToday(habit) {
    return habit.status === 'active' && habit.startDate <= LM.todayStr();
  }

  function getHabitLog(habitId, date) {
    var day = LM.state.habitLogs[date];
    return day && day[habitId] ? day[habitId] : null;
  }

  function habitValue(habit, date) {
    var log = getHabitLog(habit.id, date);
    return log ? Number(log.value) || 0 : 0;
  }

  function isHabitDone(habit, date) {
    return habitValue(habit, date) >= targetValue(habit);
  }

  function setHabitValue(habit, date, value, backfilled, silent) {
    if (!LM.state.habitLogs[date]) LM.state.habitLogs[date] = {};
    var v = Math.max(0, Number(value) || 0);
    if (v <= 0) {
      delete LM.state.habitLogs[date][habit.id];
      if (!Object.keys(LM.state.habitLogs[date]).length) delete LM.state.habitLogs[date];
    } else {
      LM.state.habitLogs[date][habit.id] = {
        value: v,
        backfilled: !!backfilled,
        updatedAt: LM.nowISO()
      };
    }
    LM.save(true);
    if (!silent) LM.render({ scrollTop: false });
  }

  function habitProgress(habit, date) {
    var value = habitValue(habit, date);
    var target = targetValue(habit);
    var done = value >= target;
    var pct = target > 0 ? Math.min(100, Math.round(value / target * 100)) : 0;
    return { value: value, target: target, done: done, pct: pct, unit: habitUnit(habit) };
  }

  function streakFor(habit) {
    var today = LM.todayStr();
    var current = 0;
    var cursor = today;
    if (!isHabitDone(habit, today)) cursor = LM.addDays(today, -1);
    var guard = 0;
    while (cursor >= habit.startDate && guard < 10000 && isHabitDone(habit, cursor)) {
      current += 1;
      cursor = LM.addDays(cursor, -1);
      guard += 1;
    }
    var completeDates = Object.keys(LM.state.habitLogs).filter(function (date) {
      return date >= habit.startDate && date <= today && isHabitDone(habit, date);
    }).sort();
    var longest = 0;
    var running = 0;
    var previous = null;
    completeDates.forEach(function (date) {
      if (previous && LM.diffDays(previous, date) === 1) running += 1;
      else running = 1;
      if (running > longest) longest = running;
      previous = date;
    });
    if (current > longest) longest = current;
    return { current: current, longest: longest };
  }

  function weeklyCompleted(habit, weekStart) {
    var end = LM.addDays(weekStart, 6);
    var today = LM.todayStr();
    if (end > today) end = today;
    var count = 0;
    LM.dateRange(weekStart, end).forEach(function (date) {
      if (date >= habit.startDate && isHabitDone(habit, date)) count += 1;
    });
    return count;
  }

  function currentWeekStats(habits) {
    var start = LM.startOfWeek(LM.todayStr());
    var end = LM.endOfWeek(LM.todayStr());
    return periodStats(start, end, habits);
  }

  function currentMonthStats(habits) {
    var today = LM.todayStr();
    return periodStats(LM.monthStart(today), LM.monthEnd(today), habits);
  }

  function periodStats(start, end, habits) {
    var today = LM.todayStr();
    var effectiveEnd = end > today ? today : end;
    if (start > effectiveEnd) return { done: 0, total: 0, rate: 0, days: 0, fullDays: 0 };
    var done = 0, total = 0, fullDays = 0, days = 0;
    LM.dateRange(start, effectiveEnd).forEach(function (date) {
      var due = habits.filter(function (habit) { return habitDueOnDate(habit, date); });
      if (!due.length) return;
      days += 1;
      var dayDone = 0;
      due.forEach(function (habit) {
        total += 1;
        if (isHabitDone(habit, date)) { done += 1; dayDone += 1; }
      });
      if (dayDone === due.length) fullDays += 1;
    });
    return {
      done: done,
      total: total,
      rate: total ? Math.round(done / total * 100) : 0,
      days: days,
      fullDays: fullDays
    };
  }

  function metricHabits() {
    LM.ensureHabitDefaults();
    if (LM.ui.habitMetric !== 'all') {
      var habit = getHabit(LM.ui.habitMetric);
      return habit ? [habit] : LM.state.habits.filter(function (h) { return h.status !== 'archived'; });
    }
    return LM.state.habits.filter(function (h) { return h.status !== 'archived'; });
  }

  function selectedMetricName() {
    if (LM.ui.habitMetric === 'all') return '全部习惯';
    var habit = getHabit(LM.ui.habitMetric);
    return habit ? habit.name : '全部习惯';
  }

  LM.habitTodaySummary = function () {
    LM.ensureHabitDefaults();
    var today = LM.todayStr();
    var dueHabits = LM.state.habits.filter(activeDueToday);
    var done = dueHabits.filter(function (h) { return isHabitDone(h, today); }).length;
    return { due: dueHabits.length, done: done, pending: Math.max(0, dueHabits.length - done) };
  };

  LM.views.habits = function () {
    LM.ensureHabitDefaults();
    var today = LM.todayStr();
    var dueHabits = LM.state.habits.filter(activeDueToday);
    var doneToday = dueHabits.filter(function (h) { return isHabitDone(h, today); }).length;
    var pct = dueHabits.length ? Math.round(doneToday / dueHabits.length * 100) : 0;
    var allHabits = LM.state.habits.filter(function (h) { return h.status !== 'archived'; });
    var week = currentWeekStats(allHabits);
    var month = currentMonthStats(allHabits);
    var filters = [
      { key: 'active', label: '进行中', count: LM.state.habits.filter(function (h) { return h.status === 'active'; }).length },
      { key: 'all', label: '全部', count: LM.state.habits.length },
      { key: 'paused', label: '暂停', count: LM.state.habits.filter(function (h) { return h.status === 'paused'; }).length },
      { key: 'archived', label: '归档', count: LM.state.habits.filter(function (h) { return h.status === 'archived'; }).length }
    ];
    var filter = LM.ui.habitFilter || 'active';
    var filtered = LM.state.habits.filter(function (habit) {
      if (filter !== 'all' && habit.status !== filter) return false;
      if (LM.ui.habitCategory !== 'all' && habit.categoryId !== LM.ui.habitCategory) return false;
      return true;
    });
    filtered.sort(function (a, b) {
      if (filter === 'active') {
        var ad = isHabitDone(a, today) ? 1 : 0;
        var bd = isHabitDone(b, today) ? 1 : 0;
        if (ad !== bd) return ad - bd;
      }
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
    var cards = filtered.map(habitCard).join('');

    return LM.pageHeader({
      title: '习惯养成',
      sub: '把想坚持的事，变成看得见的轨迹',
      actions: '<button type="button" class="header-tools" data-action="open-habit-menu-main" aria-label="习惯工具">' + LM.icon('more', 20) + '</button>' +
        '<button type="button" class="header-add" data-action="open-habit-add" aria-label="添加习惯">' + LM.icon('plus', 20) + '</button>'
    }) +
      '<section class="habit-overview">' +
      '<div class="habit-overview-main">' + LM.ring(pct, '今日完成') +
      '<div class="habit-overview-copy"><div class="kicker">TODAY’S RHYTHM</div>' +
      '<h2>' + (dueHabits.length ? (doneToday === dueHabits.length ? '今天都做到了' : '还差 ' + (dueHabits.length - doneToday) + ' 项') : '今天没有待打卡') + '</h2>' +
      '<p class="sub">' + (dueHabits.length ? '已打卡 ' + doneToday + ' / ' + dueHabits.length + ' 项 · ' + LM.formatDate(today) : '去添加一个想坚持的小习惯吧。') + '</p>' +
      '<div class="rate-grid">' +
      '<div class="rate-box"><div class="label">本周达成率</div><div class="rate-row"><span class="rate-num">' + week.rate + '%</span><span class="rate-sub">' + week.done + '/' + week.total + ' 项</span></div>' + LM.progress(week.rate, 100) + '</div>' +
      '<div class="rate-box"><div class="label">本月达成率</div><div class="rate-row"><span class="rate-num">' + month.rate + '%</span><span class="rate-sub">' + month.done + '/' + month.total + ' 项</span></div>' + LM.progress(month.rate, 100) + '</div>' +
      '</div></div></div></section>' +

      '<section class="section"><div class="section-head"><div><h2 class="section-title">今日待打卡</h2>' +
      '<p class="section-sub">待打卡 ' + (dueHabits.length - doneToday) + ' · 已打卡 ' + doneToday + '</p></div>' +
      '<button type="button" class="text-link" data-action="open-backfill">' + LM.icon('calendarPlus', 13) + '补卡</button></div>' +
      '<div class="filter-bar"><div class="chip-row">' + filters.map(function (item) {
        return '<button type="button" class="chip ' + (filter === item.key ? 'active' : '') + '" data-action="habit-filter" data-filter="' + item.key + '">' + item.label + '<span class="count">' + item.count + '</span></button>';
      }).join('') + '</div>' +
      '<button type="button" class="category-filter-btn ' + (LM.ui.habitCategory !== 'all' ? 'active' : '') + '" data-action="open-habit-category-filter" aria-label="按分类筛选" title="按分类筛选">' + LM.icon('tag', 15) + '</button></div>' +
      (cards ? '<div class="habit-list">' + cards + '</div>' : LM.emptyState({
        icon: 'habit',
        title: LM.ui.habitCategory !== 'all' ? '这个分类还没有习惯' : filter === 'archived' ? '没有归档的习惯' : '还没有习惯',
        text: '从一个足够小的动作开始。比如喝水、读两页书。',
        action: 'open-habit-add',
        actionLabel: '添加第一个习惯'
      })) +
      '</section>' +

      '<section class="section"><div class="section-head"><div><h2 class="section-title">坚持的痕迹</h2>' +
      '<p class="section-sub">换一个视角，看见自己的节奏</p></div></div>' +
      '<div class="habit-metric-bar">' +
      '<select class="select-mini" data-habit-metric aria-label="选择数据视图">' +
      '<option value="all"' + (LM.ui.habitMetric === 'all' ? ' selected' : '') + '>全部习惯</option>' +
      LM.state.habits.map(function (h) {
        return '<option value="' + h.id + '"' + (LM.ui.habitMetric === h.id ? ' selected' : '') + '>' + LM.esc(h.name) + (h.status === 'archived' ? ' · 已归档' : '') + '</option>';
      }).join('') + '</select></div>' +
      renderAnalytics() + '</section>' +
      '<div class="home-footnote">不追求完美，只把今天的自己接住</div>';
  };

  function habitCard(habit) {
    LM.ensureHabitDefaults();
    var today = LM.todayStr();
    var progress = habitProgress(habit, today);
    var streak = streakFor(habit);
    var cat = categoryName(habit);
    var status = habit.status;
    var due = activeDueToday(habit);
    var actionIcon = 'check';
    var actionClass = progress.done ? 'done' : '';
    if (status === 'paused') { actionIcon = 'pause'; actionClass = 'pause'; }
    if (status === 'archived') { actionIcon = 'archive'; actionClass = 'pause'; }
    if (due && !progress.done) {
      if (habit.freqType === 'count' || habit.freqType === 'duration') actionIcon = 'plus';
    }
    var targetLine = habit.freqType === 'daily' ? '每日 1 次'
      : '每日 ' + targetValue(habit) + ' ' + habitUnit(habit);
    if (habit.weeklyTarget > 0) targetLine += ' · 每周至少 ' + habit.weeklyTarget + ' 天';
    var weekly = habit.weeklyTarget > 0 ? weeklyCompleted(habit, LM.startOfWeek(today)) : null;
    var icon = habit.icon
      ? '<span class="habit-avatar" style="background:' + colorWithAlpha(habit.color, 0.14) + '">' + LM.esc(habit.icon) + '</span>'
      : '<span class="habit-avatar" style="background:' + colorWithAlpha(habit.color, 0.15) + '"><span class="color-dot" style="background:' + LM.esc(habit.color) + '"></span></span>';
    var metaRight = '';
    if (habit.weeklyTarget > 0) {
      metaRight = '<span class="habit-weekly">本周 ' + weekly + ' / 至少 ' + habit.weeklyTarget + ' 天<span class="mini-track"><span style="width:' + Math.min(100, weekly / habit.weeklyTarget * 100) + '%"></span></span></span>';
    } else if (habit.reminderTime) {
      metaRight = '<span class="habit-weekly">' + LM.icon('clock', 10) + ' ' + habit.reminderTime + ' 提醒</span>';
    } else {
      metaRight = '<span class="habit-weekly">' + (status === 'paused' ? '已暂停' : status === 'archived' ? '已归档' : '按天记录') + '</span>';
    }
    var badge = '';
    if (progress.done) badge = '<span class="badge sage">已达标</span>';
    else if (status === 'paused') badge = '<span class="badge outline">暂停中</span>';
    else if (status === 'archived') badge = '<span class="badge outline">已归档</span>';
    else if (progress.value > 0) badge = '<span class="badge blue">进行中</span>';
    return '<article class="habit-card ' + (progress.done ? 'completed ' : '') + (status !== 'active' ? 'paused' : '') + '">' +
      '<div class="habit-top">' + icon +
      '<div class="habit-info"><div class="habit-name-row"><span class="habit-name">' + LM.esc(habit.name) + '</span>' + badge + '</div>' +
      '<div class="habit-target">' + LM.esc(cat) + ' · ' + LM.esc(targetLine) + '</div>' +
      '<div class="habit-streak">' + LM.icon('flame', 11) + '<span>连续 ' + streak.current + ' 天</span><span class="longest">· 最长 ' + streak.longest + ' 天</span></div>' +
      '</div>' +
      '<button type="button" class="habit-action ' + actionClass + '" data-action="habit-quick" data-id="' + habit.id + '" data-done="' + (progress.done ? '1' : '') + '" aria-label="' + (progress.done ? '撤销今日打卡' : '打卡 ' + habit.name) + '">' + LM.icon(actionIcon, 19) + '</button>' +
      '</div>' +
      '<div class="habit-progress">' + LM.progress(progress.pct, 100) +
      '<span class="progress-text">' + (habit.freqType === 'daily' ? (progress.done ? '今日完成' : '待完成') : progress.value + ' / ' + progress.target + ' ' + habitUnit(habit)) + '</span></div>' +
      '<div class="habit-meta-row">' + metaRight +
      '<button type="button" class="habit-more" data-action="open-habit-item-menu" data-id="' + habit.id + '" aria-label="更多操作">' + LM.icon('more', 16) + '</button></div>' +
      '</article>';
  }

  function colorWithAlpha(hex, alpha) {
    if (!/^#([0-9a-f]{6})$/i.test(hex || '')) return 'var(--mist-soft)';
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  /* ---------- analytics ---------- */
  function renderAnalytics() {
    var habits = metricHabits();
    var selectedHabit = LM.ui.habitMetric !== 'all' ? getHabit(LM.ui.habitMetric) : null;
    var today = LM.todayStr();
    var week = selectedHabit
      ? singleHabitStats(selectedHabit, LM.startOfWeek(today), LM.endOfWeek(today))
      : currentWeekStats(habits);
    var month = selectedHabit
      ? singleHabitStats(selectedHabit, LM.monthStart(today), LM.monthEnd(today))
      : currentMonthStats(habits);
    var rateLabel = selectedHabit ? '天' : '项';
    return '<div class="stats-detail-grid mb-12">' +
      '<div class="detail-stat"><div class="label">本周达成率</div><div class="value">' + week.rate + '%</div><div class="sub">' + week.done + ' / ' + week.total + ' ' + rateLabel + '</div></div>' +
      '<div class="detail-stat"><div class="label">本月达成率</div><div class="value">' + month.rate + '%</div><div class="sub">' + month.done + ' / ' + month.total + ' ' + rateLabel + '</div></div>' +
      '</div>' +
      renderHeatmap(selectedHabit) +
      renderTrend(selectedHabit);
  }

  function singleHabitStats(habit, start, end) {
    var today = LM.todayStr();
    var effectiveEnd = end > today ? today : end;
    if (start > effectiveEnd) return { done: 0, total: 0, rate: 0, days: 0, fullDays: 0 };
    var done = 0, total = 0, days = 0;
    LM.dateRange(start, effectiveEnd).forEach(function (date) {
      if (date < habit.startDate) return;
      if (!habitDueOnDate(habit, date) && !isHabitDone(habit, date)) return;
      days += 1;
      total += 1;
      if (isHabitDone(habit, date)) done += 1;
    });
    return { done: done, total: total, rate: total ? Math.round(done / total * 100) : 0, days: days, fullDays: done };
  }

  function heatmapStart() {
    var currentMonday = LM.startOfWeek(LM.todayStr());
    return LM.addDays(currentMonday, -11 * 7);
  }

  function dayCompletion(date, selectedHabit) {
    if (selectedHabit) {
      if (!habitDueOnDate(selectedHabit, date) && !isHabitDone(selectedHabit, date)) return null;
      var value = habitValue(selectedHabit, date);
      if (isHabitDone(selectedHabit, date)) return { due: 1, done: 1, ratio: 1, level: 4 };
      if (value > 0) return { due: 1, done: 0, ratio: 0.35, level: 2 };
      return { due: 1, done: 0, ratio: 0, level: 0 };
    }
    var due = LM.state.habits.filter(function (habit) { return habit.status !== 'archived' && habitDueOnDate(habit, date); });
    if (!due.length) return null;
    var done = due.filter(function (habit) { return isHabitDone(habit, date); }).length;
    var ratio = done / due.length;
    var level = done === 0 ? 0 : ratio < 0.34 ? 1 : ratio < 0.67 ? 2 : ratio < 1 ? 3 : 4;
    return { due: due.length, done: done, ratio: ratio, level: level };
  }

  function renderHeatmap(selectedHabit) {
    var start = heatmapStart();
    var today = LM.todayStr();
    var weeks = [];
    var labels = [];
    var prevMonth = '';
    for (var w = 0; w < 12; w += 1) {
      var weekStart = LM.addDays(start, w * 7);
      var monthKey = weekStart.slice(0, 7);
      labels.push(monthKey !== prevMonth ? LM.monthShort(monthKey) : '');
      prevMonth = monthKey;
      weeks.push(weekStart);
    }
    var cells = [];
    var activeDays = 0;
    var dueDays = 0;
    for (var weekIndex = 0; weekIndex < 12; weekIndex += 1) {
      for (var dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        var date = LM.addDays(start, weekIndex * 7 + dayIndex);
        if (date > today) {
          cells.push('<span class="heat-cell future" aria-hidden="true"></span>');
          continue;
        }
        var completion = dayCompletion(date, selectedHabit);
        if (!completion) {
          cells.push('<span class="heat-cell level-0" title="' + date + ' · 无记录"></span>');
          continue;
        }
        dueDays += 1;
        if (completion.done > 0) activeDays += 1;
        var level = completion.level;
        var hasBackfill = Object.keys(LM.state.habitLogs[date] || {}).some(function (id) {
          return LM.state.habitLogs[date][id] && LM.state.habitLogs[date][id].backfilled;
        });
        cells.push('<button type="button" class="heat-cell level-' + level + (date === today ? ' today' : '') + (hasBackfill ? ' backfilled' : '') + '" data-action="habit-day-detail" data-date="' + date + '" title="' + LM.formatDate(date) + ' · ' + completion.done + '/' + completion.due + ' 项达标' + (hasBackfill ? ' · 含补卡' : '') + '" aria-label="' + LM.formatDate(date) + '，' + completion.done + '项达标' + (hasBackfill ? '，含补卡' : '') + '"></button>');
      }
    }
    return '<div class="card heatmap-card">' +
      '<div class="between"><div><div class="section-title" style="font-size:12.5px">打卡热力图</div><div class="section-sub">最近 12 周 · 点按查看某一天</div></div>' +
      '<span class="badge sage">' + activeDays + ' / ' + dueDays + ' 天达标</span></div>' +
      '<div class="heatmap-wrap"><div class="heatmap-weekdays"><span>一</span><span></span><span>三</span><span></span><span>五</span><span></span><span>日</span></div>' +
      '<div class="heatmap-main"><div class="heatmap-months">' + labels.map(function (label) { return '<span>' + label + '</span>'; }).join('') + '</div>' +
      '<div class="heatmap-grid">' + cells.join('') + '</div></div></div>' +
      '<div class="heatmap-legend"><span>少</span><span class="heat-cell level-0"></span><span class="heat-cell level-1"></span><span class="heat-cell level-2"></span><span class="heat-cell level-3"></span><span class="heat-cell level-4"></span><span>多</span></div>' +
      '</div>';
  }

  function renderTrend(selectedHabit) {
    var range = LM.ui.trendRange === 30 ? 30 : 7;
    var today = LM.todayStr();
    var start = LM.addDays(today, -(range - 1));
    if (selectedHabit && selectedHabit.startDate > start) start = selectedHabit.startDate;
    if (!selectedHabit) {
      var starts = LM.state.habits.filter(function (h) { return h.status !== 'archived'; }).map(function (h) { return h.startDate; }).sort();
      if (starts.length && starts[0] > start) start = starts[0];
    }
    if (start > today) start = today;
    var values = [];
    LM.dateRange(start, today).forEach(function (date) {
      var completion;
      if (selectedHabit) {
        if (!habitDueOnDate(selectedHabit, date) && !isHabitDone(selectedHabit, date)) {
          values.push(0);
          return;
        }
        var p = habitProgress(selectedHabit, date);
        completion = { ratio: p.pct / 100 };
      } else {
        var due = LM.state.habits.filter(function (habit) { return habit.status !== 'archived' && habitDueOnDate(habit, date); });
        if (!due.length) { values.push(0); return; }
        var done = due.filter(function (habit) { return isHabitDone(habit, date); }).length;
        completion = { ratio: done / due.length };
      }
      values.push(completion.ratio);
    });
    var width = 320, height = 92;
    var left = 22, right = 302, top = 12, bottom = 70;
    var xStep = values.length > 1 ? (right - left) / (values.length - 1) : 0;
    var points = values.map(function (ratio, index) {
      return { x: left + index * xStep, y: bottom - Math.max(0, Math.min(1, ratio)) * (bottom - top), ratio: ratio };
    });
    var line = points.map(function (p, i) { return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' ');
    var area = line + ' L' + right.toFixed(1) + ' ' + bottom + ' L' + left.toFixed(1) + ' ' + bottom + ' Z';
    var dots = points.filter(function (p, i) { return i === points.length - 1; }).map(function (p) {
      return '<circle class="trend-dot last" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="2.4"></circle>';
    }).join('');
    var dateLabels = '<text class="axis-label" x="' + left + '" y="84">' + LM.formatDateShort(start) + '</text>' +
      '<text class="axis-label" x="' + right + '" y="84" text-anchor="end">' + LM.formatDateShort(today) + '</text>';
    return '<div class="card trend-card mt-10">' +
      '<div class="between"><div><div class="section-title" style="font-size:12.5px">完成率趋势</div><div class="section-sub">' + (selectedHabit ? selectedHabit.name : '全部习惯') + ' · 最近 ' + range + ' 天</div></div>' +
      '<div class="segmented"><button type="button" class="' + (range === 7 ? 'active' : '') + '" data-action="set-trend-range" data-range="7">7天</button>' +
      '<button type="button" class="' + (range === 30 ? 'active' : '') + '" data-action="set-trend-range" data-range="30">30天</button></div></div>' +
      '<svg class="trend-chart" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="最近' + range + '天完成率折线图">' +
      '<line class="gridline" x1="' + left + '" y1="' + top + '" x2="' + right + '" y2="' + top + '"></line>' +
      '<line class="gridline" x1="' + left + '" y1="41" x2="' + right + '" y2="41"></line>' +
      '<line class="gridline" x1="' + left + '" y1="' + bottom + '" x2="' + right + '" y2="' + bottom + '"></line>' +
      '<text class="axis-label" x="2" y="15">100%</text><text class="axis-label" x="2" y="44">50%</text><text class="axis-label" x="2" y="73">0</text>' +
      '<path class="trend-area" d="' + area + '"></path>' +
      '<path class="trend-line" d="' + line + '"></path>' + dots + dateLabels + '</svg>' +
      '<div class="heatmap-summary"><span class="text">波动是正常的，能回来就好。</span><span class="badge blue">' + Math.round((values.reduce(function (a, b) { return a + b; }, 0) / values.length) * 100) + '% 平均</span></div>' +
      '</div>';
  }

  LM.actions['set-trend-range'] = function (data) {
    LM.ui.trendRange = data.range === '30' ? 30 : 7;
    LM.refresh();
  };
  LM.actions['habit-filter'] = function (data) {
    LM.ui.habitFilter = data.filter;
    LM.refresh();
  };
  LM.actions['open-habit-category-filter'] = function () {
    LM.openSheet({
      title: '按分类筛选',
      sub: '只查看某一个分类下的习惯。',
      body: '<div class="sheet-list">' +
        '<button type="button" class="sheet-option ' + (LM.ui.habitCategory === 'all' ? 'selected' : '') + '" data-action="habit-category-pick" data-id="all">' +
        '<span class="option-icon">' + LM.icon('sparkles', 16) + '</span><span><span class="option-title">全部分类</span><span class="option-sub">' + LM.state.habits.length + ' 个习惯</span></span>' +
        (LM.ui.habitCategory === 'all' ? '<span class="option-chevron">' + LM.icon('check', 16) + '</span>' : '') + '</button>' +
        LM.state.habitCategories.map(function (category) {
          var count = LM.state.habits.filter(function (h) { return h.categoryId === category.id; }).length;
          return '<button type="button" class="sheet-option" data-action="habit-category-pick" data-id="' + category.id + '">' +
            '<span class="option-icon">' + LM.icon('tag', 16) + '</span><span><span class="option-title">' + LM.esc(category.name) + '</span><span class="option-sub">' + count + ' 个习惯</span></span>' +
            (LM.ui.habitCategory === category.id ? '<span class="option-chevron">' + LM.icon('check', 16) + '</span>' : '') + '</button>';
        }).join('') + '</div>'
    });
  };
  LM.actions['habit-category-pick'] = function (data) {
    LM.ui.habitCategory = data.id || 'all';
    LM.closeSheet();
    LM.refresh();
  };
  document.addEventListener('change', function (e) {
    if (e.target.matches('[data-habit-category]')) {
      LM.ui.habitCategory = e.target.value;
      LM.refresh();
    }
    if (e.target.matches('[data-habit-metric]')) {
      LM.ui.habitMetric = e.target.value || 'all';
      LM.refresh();
    }
  });

  LM.actions['habit-day-detail'] = function (data) {
    var date = data.date;
    var all = LM.state.habits.filter(function (habit) {
      return habitDueOnDate(habit, date) || getHabitLog(habit.id, date);
    });
    var body = '<div class="info-note">' + LM.formatDate(date, true) + ' ' + LM.weekdayName(date) + ' · 共 ' + all.length + ' 项习惯</div>';
    if (all.length) {
      body += '<div class="day-detail-list">' + all.map(function (habit) {
        var p = habitProgress(habit, date);
        var log = getHabitLog(habit.id, date);
        var state = p.done ? '达标' : p.value > 0 ? '部分' : '未打卡';
        return '<div class="day-detail-row"><span class="habit-avatar" style="width:28px;height:28px;flex-basis:28px;font-size:13px;background:' + colorWithAlpha(habit.color, .14) + '">' +
          (habit.icon ? LM.esc(habit.icon) : '<span class="color-dot" style="width:9px;height:9px;background:' + LM.esc(habit.color) + '"></span>') + '</span>' +
          '<span class="day-detail-name">' + LM.esc(habit.name) + (log && log.backfilled ? ' <span class="badge backfill">补卡</span>' : '') + '</span>' +
          '<span class="day-detail-value">' + (habit.freqType === 'daily' ? '' : p.value + '/' + p.target + ' ') + state + '</span></div>';
      }).join('') + '</div>';
    } else {
      body += '<div class="empty-state" style="padding:24px"><p>这一天没有打卡记录。</p></div>';
    }
    LM.openSheet({
      title: LM.formatDate(date) + ' 的打卡',
      sub: '每一天的记录，都算数。',
      body: body,
      footer: '<button type="button" class="btn" data-close>关闭</button>'
    });
  };

  /* ---------- quick check-in ---------- */
  LM.actions['habit-quick'] = function (data) {
    var habit = getHabit(data.id);
    if (!habit) return;
    if (habit.status !== 'active') {
      LM.toast(habit.status === 'paused' ? '这个习惯已暂停' : '这个习惯已归档');
      return;
    }
    var today = LM.todayStr();
    var progress = habitProgress(habit, today);
    if (progress.done) {
      setHabitValue(habit, today, 0, false);
      LM.toast('已撤销今日打卡');
      return;
    }
    if (habit.freqType === 'daily') {
      setHabitValue(habit, today, 1, false);
      LM.toast('「' + habit.name + '」今日完成');
      return;
    }
    if (habit.freqType === 'count') {
      var next = progress.value + 1;
      setHabitValue(habit, today, next, false);
      if (next >= progress.target) LM.toast('「' + habit.name + '」达标 ' + next + ' / ' + progress.target + ' ' + progress.unit);
      return;
    }
    openDurationSheet(habit);
  };

  function openDurationSheet(habit) {
    var today = LM.todayStr();
    var p = habitProgress(habit, today);
    var remaining = Math.max(0, p.target - p.value);
    LM.openSheet({
      title: '记录「' + habit.name + '」',
      sub: '今日已完成 ' + p.value + ' 分钟，还差 ' + remaining + ' 分钟',
      body: '<form class="form" id="duration-form" data-form="habit-duration-save">' +
        '<input type="hidden" name="habitId" value="' + habit.id + '">' +
        '<div class="field"><span class="field-label">快速记录</span><div class="quick-grid">' +
        [5, 10, 15, 30].map(function (m) {
          return '<button type="button" class="quick-btn" data-action="habit-add-minutes" data-id="' + habit.id + '" data-minutes="' + m + '">+' + m + ' 分钟</button>';
        }).join('') + '</div></div>' +
        '<div class="field"><label for="duration-custom">或填写分钟数</label>' +
        '<div class="input-suffix"><input class="input" id="duration-custom" name="minutes" type="number" min="1" max="600" step="1" inputmode="numeric" placeholder="例如 25"><span class="suffix">分钟</span></div></div>' +
        '</form>',
      footer: '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="duration-form">记录</button>'
    });
  }
  LM.actions['habit-add-minutes'] = function (data) {
    var habit = getHabit(data.id);
    if (!habit) return;
    var minutes = LM.safeInt(data.minutes, 0);
    addHabitMinutes(habit, minutes);
  };
  LM.forms['habit-duration-save'] = function (form, data) {
    var habit = getHabit(String(data.get('habitId') || ''));
    var minutes = LM.safeInt(data.get('minutes'), 0);
    if (!habit || minutes <= 0) { LM.toast('请填写有效的分钟数'); return; }
    addHabitMinutes(habit, minutes);
  };
  function addHabitMinutes(habit, minutes) {
    var today = LM.todayStr();
    var p = habitProgress(habit, today);
    var next = Math.min(1440, p.value + minutes);
    setHabitValue(habit, today, next, false);
    LM.closeSheet(true);
    LM.refresh();
    if (next >= p.target) LM.toast('「' + habit.name + '」达标 ' + next + ' / ' + p.target + ' 分钟');
    else LM.toast('已记录 ' + minutes + ' 分钟');
  }

  /* ---------- add / edit ---------- */
  LM.actions['open-habit-add'] = function () { openHabitForm(null); };
  function openHabitForm(habit) {
    var editing = !!habit;
    var type = habit ? habit.freqType : 'daily';
    var categoryId = habit ? habit.categoryId : (LM.state.habitCategories[0] ? LM.state.habitCategories[0].id : 'cat_other');
    var color = habit ? habit.color : HABIT_COLORS[0];
    var target = habit ? targetValue(habit) : 1;
    var weekly = habit ? (habit.weeklyTarget || '') : '';
    var reminder = habit ? (habit.reminderTime || '') : '';
    LM.openSheet({
      title: editing ? '编辑习惯' : '添加一个习惯',
      sub: editing ? '改变一点参数，让坚持更适合你。' : '从一个足够小、今天就能做到的动作开始。',
      large: true,
      body: '<form class="form" id="habit-form" data-form="habit-save">' +
        '<input type="hidden" name="id" value="' + (editing ? habit.id : '') + '">' +
        '<div class="field"><label for="habit-name">习惯名称</label><input class="input" id="habit-name" name="name" maxlength="20" placeholder="例如：喝水 / 阅读 / 早睡" required value="' + LM.esc(editing ? habit.name : '') + '"></div>' +
        '<div class="field"><span class="field-label">频率类型</span><div class="radio-cards">' +
        ['daily', 'count', 'duration'].map(function (key) {
          return '<label class="radio-card ' + (type === key ? 'checked' : '') + '"><input type="radio" name="freqType" value="' + key + '" data-target="habit-target-wrap" ' + (type === key ? 'checked' : '') + '>' +
            '<span class="radio-title">' + FREQ[key].label + '</span><span class="radio-sub">' + (key === 'daily' ? '每天 1 次' : key === 'count' ? '每天 N 次' : '每天 N 分钟') + '</span></label>';
        }).join('') + '</div></div>' +
        '<div class="field-grid" data-target-wrap="habit-target-wrap" style="' + (type === 'daily' ? 'display:none' : '') + '">' +
        '<div class="field"><label for="habit-target" data-target-label>' + (type === 'duration' ? '每日目标时长' : '每日目标次数') + '</label>' +
        '<input class="input" id="habit-target" name="target" type="number" min="1" step="1" inputmode="numeric" value="' + LM.esc(target) + '"></div>' +
        '<div class="field"><label for="habit-unit">单位</label><input class="input" id="habit-unit" name="unit" maxlength="4" placeholder="' + (type === 'duration' ? '分钟' : '次 / 杯') + '" value="' + LM.esc(editing ? (habit.unit || '') : '') + '"></div>' +
        '</div>' +
        '<div class="field"><label for="habit-category">分类</label><select class="select" id="habit-category" name="categoryId">' +
        LM.state.habitCategories.map(function (category) {
          return '<option value="' + category.id + '"' + (category.id === categoryId ? ' selected' : '') + '>' + LM.esc(category.name) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="form-section"><div class="form-section-title">让它更容易坚持（可选）</div>' +
        '<div class="field-grid">' +
        '<div class="field"><label for="habit-weekly">每周至少</label><div class="input-suffix"><input class="input" id="habit-weekly" name="weeklyTarget" type="number" min="0" max="7" step="1" inputmode="numeric" placeholder="不设" value="' + LM.esc(weekly) + '"><span class="suffix">天</span></div></div>' +
        '<div class="field"><label for="habit-reminder">提醒时间</label><input class="input" id="habit-reminder" name="reminderTime" type="time" value="' + LM.esc(reminder) + '"></div>' +
        '</div>' +
        '<div class="field"><span class="field-label">图标 <span class="optional">emoji 或颜色圆点</span></span><div class="icon-picker">' +
        '<input class="input" id="habit-icon" name="icon" maxlength="4" placeholder="可不填，例如 🌿" value="' + LM.esc(editing ? habit.icon : '') + '" data-icon-preview-input="habit-icon-preview">' +
        '<div class="icon-preview" id="habit-icon-preview">' + (editing && habit.icon ? LM.esc(habit.icon) : '·') + '</div></div>' +
        '<div class="color-swatches mt-8">' + HABIT_COLORS.map(function (c) {
          return '<label class="color-swatch ' + (color === c ? 'checked' : '') + '" style="background:' + c + '"><input type="radio" name="color" value="' + c + '" ' + (color === c ? 'checked' : '') + '></label>';
        }).join('') + '</div></div>' +
        '<div class="field-grid">' +
        '<div class="field"><label for="habit-start">开始日期</label><input class="input" id="habit-start" name="startDate" type="date" max="' + LM.todayStr() + '" value="' + LM.esc(editing ? habit.startDate : LM.todayStr()) + '"></div>' +
        '<div class="field"><label for="habit-note">备注 <span class="optional">可选</span></label><input class="input" id="habit-note" name="note" maxlength="80" placeholder="提醒自己的一句话" value="' + LM.esc(editing ? (habit.note || '') : '') + '"></div>' +
        '</div></div>' +
        '</form>',
      footer: '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="habit-form">' + (editing ? '保存习惯' : '添加习惯') + '</button>',
      onMount: function (sheet) {
        var preview = sheet.querySelector('#habit-icon-preview');
        var iconInput = sheet.querySelector('#habit-icon');
        iconInput.addEventListener('input', function () {
          preview.textContent = iconInput.value.trim() || '·';
        });
        sheet.querySelectorAll('input[name="freqType"]').forEach(function (radio) {
          radio.addEventListener('change', function () {
            var unitInput = sheet.querySelector('#habit-unit');
            var label = sheet.querySelector('[data-target-label]');
            var targetInput = sheet.querySelector('#habit-target');
            if (radio.value === 'duration') {
              unitInput.placeholder = '分钟';
              label.textContent = '每日目标时长';
              if (!targetInput.value || Number(targetInput.value) === 1) targetInput.value = 30;
            } else if (radio.value === 'count') {
              unitInput.placeholder = '次 / 杯';
              label.textContent = '每日目标次数';
              if (!targetInput.value || Number(targetInput.value) === 1) targetInput.value = 8;
            }
          });
        });
      }
    });
  }

  LM.forms['habit-save'] = function (form, data) {
    var id = String(data.get('id') || '');
    var name = String(data.get('name') || '').trim();
    var freqType = String(data.get('freqType') || 'daily');
    var rawTarget = Number(data.get('target'));
    var target = freqType === 'daily' ? 1 : Math.max(1, Math.round(rawTarget || 1));
    var unit = String(data.get('unit') || '').trim() || (freqType === 'duration' ? '分钟' : '次');
    var categoryId = String(data.get('categoryId') || '');
    var weeklyTarget = Math.min(7, Math.max(0, LM.safeInt(data.get('weeklyTarget'), 0)));
    var reminderTime = String(data.get('reminderTime') || '');
    var icon = String(data.get('icon') || '').trim();
    var color = String(data.get('color') || HABIT_COLORS[0]);
    var startDate = String(data.get('startDate') || LM.todayStr());
    var note = String(data.get('note') || '').trim();
    if (!name) { LM.toast('请填写习惯名称'); return; }
    if (freqType !== 'daily' && (!Number.isFinite(rawTarget) || rawTarget < 1)) { LM.toast('目标值需要大于 0'); return; }
    if (!getCategory(categoryId)) categoryId = LM.state.habitCategories[0].id;
    if (!LM.validDate(startDate) || startDate > LM.todayStr()) { LM.toast('请选择不晚于今天的开始日期'); return; }
    if (reminderTime && !/^\d{2}:\d{2}$/.test(reminderTime)) { LM.toast('提醒时间格式不正确'); return; }
    if (id) {
      var habit = getHabit(id);
      if (!habit) return;
      habit.name = name;
      habit.freqType = freqType;
      habit.target = target;
      habit.unit = unit;
      habit.categoryId = categoryId;
      habit.weeklyTarget = weeklyTarget;
      habit.reminderTime = reminderTime;
      habit.icon = icon;
      habit.color = color;
      habit.startDate = startDate;
      habit.note = note;
      LM.toast('习惯已更新');
    } else {
      LM.state.habits.push({
        id: LM.uid('habit'),
        name: name,
        icon: icon,
        color: color,
        categoryId: categoryId,
        freqType: freqType,
        target: target,
        unit: unit,
        weeklyTarget: weeklyTarget,
        reminderTime: reminderTime,
        startDate: startDate,
        note: note,
        status: 'active',
        createdAt: LM.nowISO(),
        archivedAt: null
      });
      LM.ui.habitFilter = 'active';
      LM.toast('已添加「' + name + '」');
    }
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
  };

  /* ---------- item menu ---------- */
  LM.actions['open-habit-item-menu'] = function (data) {
    var habit = getHabit(data.id);
    if (!habit) return;
    var paused = habit.status === 'paused';
    var archived = habit.status === 'archived';
    LM.openSheet({
      title: habit.name,
      sub: categoryName(habit) + ' · ' + FREQ[habit.freqType].label + (habit.weeklyTarget ? ' · 每周至少 ' + habit.weeklyTarget + ' 天' : ''),
      body: '<div class="sheet-list">' +
        '<button type="button" class="sheet-option" data-action="habit-stats" data-id="' + habit.id + '"><span class="option-icon">' + LM.icon('chart', 17) + '</span><span><span class="option-title">统计详情</span><span class="option-sub">连续天数、周月和完成率</span></span><span class="option-chevron">' + LM.icon('chevronRight', 15) + '</span></button>' +
        '<button type="button" class="sheet-option" data-action="open-backfill" data-id="' + habit.id + '"><span class="option-icon">' + LM.icon('calendarPlus', 17) + '</span><span><span class="option-title">补打卡</span><span class="option-sub">补记过去某一天</span></span><span class="option-chevron">' + LM.icon('chevronRight', 15) + '</span></button>' +
        (habit.freqType !== 'daily' && habitValue(habit, LM.todayStr()) > 0 ? '<button type="button" class="sheet-option" data-action="habit-adjust-minus" data-id="' + habit.id + '"><span class="option-icon">' + LM.icon('minus', 17) + '</span><span><span class="option-title">撤销一次记录</span><span class="option-sub">用于修正今天的数值</span></span></button>' : '') +
        '<button type="button" class="sheet-option" data-action="open-habit-edit" data-id="' + habit.id + '"><span class="option-icon">' + LM.icon('edit', 17) + '</span><span><span class="option-title">编辑习惯</span><span class="option-sub">名称、目标、分类与提醒</span></span></button>' +
        (archived
          ? '<button type="button" class="sheet-option" data-action="habit-restore" data-id="' + habit.id + '"><span class="option-icon">' + LM.icon('undo', 17) + '</span><span><span class="option-title">恢复为进行中</span><span class="option-sub">历史记录仍会保留</span></span></button>'
          : '<button type="button" class="sheet-option" data-action="habit-toggle-pause" data-id="' + habit.id + '"><span class="option-icon">' + LM.icon(paused ? 'play' : 'pause', 17) + '</span><span><span class="option-title">' + (paused ? '继续这个习惯' : '暂停一段时间') + '</span><span class="option-sub">' + (paused ? '重新参与每日打卡' : '暂停后不参与今日统计，历史保留') + '</span></span></button>' +
            '<button type="button" class="sheet-option" data-action="habit-archive" data-id="' + habit.id + '"><span class="option-icon">' + LM.icon('archive', 17) + '</span><span><span class="option-title">归档习惯</span><span class="option-sub">不再出现，历史不丢失</span></span></button>') +
        '<button type="button" class="sheet-option danger" data-action="habit-delete" data-id="' + habit.id + '"><span class="option-icon">' + LM.icon('trash', 17) + '</span><span><span class="option-title">彻底删除</span><span class="option-sub">连同打卡历史一起删除</span></span></button>' +
        '</div>'
    });
  };

  LM.actions['open-habit-edit'] = function (data) {
    LM.closeSheet(true);
    setTimeout(function () { openHabitForm(getHabit(data.id)); }, 30);
  };

  LM.actions['habit-toggle-pause'] = function (data) {
    var habit = getHabit(data.id);
    if (!habit) return;
    habit.status = habit.status === 'paused' ? 'active' : 'paused';
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
    LM.toast(habit.status === 'paused' ? '已暂停，历史会保留' : '已继续');
  };
  LM.actions['habit-archive'] = function (data) {
    var habit = getHabit(data.id);
    if (!habit) return;
    LM.confirm({
      title: '归档这个习惯？',
      message: '「' + habit.name + '」会从每日清单和统计中移出，打卡历史仍会保留。',
      confirmLabel: '归档',
      danger: false,
      onConfirm: function () {
        habit.status = 'archived';
        habit.archivedAt = LM.nowISO();
        LM.save(true);
        LM.closeSheet();
        LM.refresh();
        LM.toast('习惯已归档');
      }
    });
  };
  LM.actions['habit-restore'] = function (data) {
    var habit = getHabit(data.id);
    if (!habit) return;
    habit.status = 'active';
    habit.archivedAt = null;
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
    LM.toast('已恢复');
  };
  LM.actions['habit-delete'] = function (data) {
    var habit = getHabit(data.id);
    if (!habit) return;
    LM.confirm({
      title: '彻底删除「' + habit.name + '」？',
      message: '这个习惯和它的全部打卡历史都会被删除，无法恢复。',
      confirmLabel: '删除',
      danger: true,
      note: '如果只是暂时不想做，可以用「暂停」或「归档」保留历史。',
      onConfirm: function () {
        LM.state.habits = LM.state.habits.filter(function (h) { return h.id !== data.id; });
        Object.keys(LM.state.habitLogs).forEach(function (date) {
          delete LM.state.habitLogs[date][data.id];
          if (!Object.keys(LM.state.habitLogs[date]).length) delete LM.state.habitLogs[date];
        });
        if (LM.ui.habitMetric === data.id) LM.ui.habitMetric = 'all';
        LM.save(true);
        LM.closeSheet();
        LM.refresh();
        LM.toast('习惯及记录已删除');
      }
    });
  };
  LM.actions['habit-adjust-minus'] = function (data) {
    var habit = getHabit(data.id);
    if (!habit) return;
    var today = LM.todayStr();
    var p = habitProgress(habit, today);
    if (p.value <= 0) return;
    setHabitValue(habit, today, p.value - 1, false);
    LM.closeSheet();
    LM.toast('已减少一次记录');
  };

  LM.actions['habit-stats'] = function (data) {
    var habit = getHabit(data.id);
    if (!habit) return;
    var streak = streakFor(habit);
    var weekStart = LM.startOfWeek(LM.todayStr());
    var week = singleHabitStats(habit, weekStart, LM.endOfWeek(LM.todayStr()));
    var month = singleHabitStats(habit, LM.monthStart(LM.todayStr()), LM.monthEnd(LM.todayStr()));
    var weekly = habit.weeklyTarget > 0 ? weeklyCompleted(habit, weekStart) : null;
    LM.openSheet({
      title: habit.name + ' · 统计',
      sub: categoryName(habit) + ' · ' + FREQ[habit.freqType].label,
      body: '<div class="stats-detail-grid">' +
        '<div class="detail-stat"><div class="label">当前连续</div><div class="value">' + streak.current + ' 天</div><div class="sub">从今天 / 昨天往回数</div></div>' +
        '<div class="detail-stat"><div class="label">最长连续</div><div class="value">' + streak.longest + ' 天</div><div class="sub">历史最好记录</div></div>' +
        '<div class="detail-stat"><div class="label">本周达成率</div><div class="value">' + week.rate + '%</div><div class="sub">' + week.done + ' / ' + week.total + ' 天</div></div>' +
        '<div class="detail-stat"><div class="label">本月达成率</div><div class="value">' + month.rate + '%</div><div class="sub">' + month.done + ' / ' + month.total + ' 天</div></div>' +
        '</div>' +
        (weekly !== null ? '<div class="info-note mt-12">本周已达标 ' + weekly + ' 天，周目标为至少 ' + habit.weeklyTarget + ' 天。</div>' : ''),
      footer: '<button type="button" class="btn" data-close>关闭</button><button type="button" class="btn primary" data-action="open-habit-edit" data-id="' + habit.id + '">编辑习惯</button>'
    });
  };

  /* ---------- backfill ---------- */
  LM.actions['open-backfill'] = function (data) {
    var fixedId = data.id || '';
    var activeHabits = LM.state.habits.filter(function (h) { return h.status !== 'archived'; });
    if (!activeHabits.length) {
      LM.toast('先添加一个习惯吧');
      return;
    }
    var defaultHabit = fixedId ? getHabit(fixedId) : activeHabits[0];
    var yesterday = LM.addDays(LM.todayStr(), -1);
    LM.openSheet({
      title: '补打卡',
      sub: '补记过去的日期，记录会带「补卡」标识。',
      large: true,
      body: '<form class="form" id="backfill-form" data-form="habit-backfill-save">' +
        '<div class="field"><label for="backfill-habit">习惯</label><select class="select" id="backfill-habit" name="habitId" ' + (fixedId ? 'disabled' : '') + '>' +
        activeHabits.map(function (h) {
          return '<option value="' + h.id + '"' + (defaultHabit && h.id === defaultHabit.id ? ' selected' : '') + '>' + LM.esc(h.name) + ' · ' + FREQ[h.freqType].label + '</option>';
        }).join('') + '</select>' + (fixedId ? '<input type="hidden" name="habitId" value="' + fixedId + '">' : '') + '</div>' +
        '<div class="field"><label for="backfill-date">补卡日期</label><input class="input" id="backfill-date" name="date" type="date" max="' + yesterday + '" value="' + yesterday + '" required>' +
        '<p class="form-hint">只能补记今天之前的日期。</p></div>' +
        '<div class="field"><label for="backfill-value"><span data-backfill-label>记录值</span></label>' +
        '<div class="input-suffix"><input class="input" id="backfill-value" name="value" type="number" min="0" max="1440" step="1" value="' + (defaultHabit ? targetValue(defaultHabit) : 1) + '"><span class="suffix" data-backfill-unit>' + (defaultHabit ? habitUnit(defaultHabit) : '次') + '</span></div>' +
        '<p class="form-hint" data-backfill-hint>填满目标值即视为当天达标。</p></div>' +
        '<div class="info-note">补卡会明确标记为「补卡」，不会伪装成当天实时完成。</div>' +
        '</form>',
      footer: '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="backfill-form">保存补卡</button>',
      onMount: function (sheet) {
        var select = sheet.querySelector('#backfill-habit');
        var valueInput = sheet.querySelector('#backfill-value');
        var unitLabel = sheet.querySelector('[data-backfill-unit]');
        var hint = sheet.querySelector('[data-backfill-hint]');
        function sync() {
          var habit = getHabit(select.value);
          if (!habit) return;
          valueInput.value = targetValue(habit);
          unitLabel.textContent = habitUnit(habit);
          hint.textContent = habit.freqType === 'daily' ? '填 1 即标记当天完成。' : '填满目标值即视为当天达标（目标 ' + targetValue(habit) + ' ' + habitUnit(habit) + '）。';
        }
        select.addEventListener('change', sync);
        sync();
      }
    });
  };
  LM.forms['habit-backfill-save'] = function (form, data) {
    var habit = getHabit(String(data.get('habitId') || ''));
    var date = String(data.get('date') || '');
    var value = Number(data.get('value'));
    if (!habit) { LM.toast('没有找到这个习惯'); return; }
    if (!LM.validDate(date) || date >= LM.todayStr()) { LM.toast('补卡日期需要早于今天'); return; }
    if (!Number.isFinite(value) || value <= 0) { LM.toast('请填写有效的记录值'); return; }
    setHabitValue(habit, date, value, true, true);
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
    LM.toast('已补卡 · ' + LM.formatDate(date) + '，带有补卡标识');
  };

  /* ---------- categories ---------- */
  LM.actions['open-habit-menu-main'] = function () {
    LM.openSheet({
      title: '习惯工具',
      sub: '整理分类、补记过去的日期。',
      body: '<div class="sheet-list">' +
        '<button type="button" class="sheet-option" data-action="open-backfill"><span class="option-icon">' + LM.icon('calendarPlus', 17) + '</span><span><span class="option-title">补打卡</span><span class="option-sub">补记今天之前的某一天</span></span><span class="option-chevron">' + LM.icon('chevronRight', 15) + '</span></button>' +
        '<button type="button" class="sheet-option" data-action="open-habit-categories"><span class="option-icon">' + LM.icon('tag', 17) + '</span><span><span class="option-title">分类管理</span><span class="option-sub">新增、重命名或删除分类</span></span><span class="option-chevron">' + LM.icon('chevronRight', 15) + '</span></button>' +
        '<button type="button" class="sheet-option" data-action="open-settings"><span class="option-icon">' + LM.icon('bell', 17) + '</span><span><span class="option-title">提醒设置</span><span class="option-sub">习惯提醒与系统通知</span></span><span class="option-chevron">' + LM.icon('chevronRight', 15) + '</span></button>' +
        '</div>'
    });
  };

  LM.actions['open-habit-categories'] = function () {
    LM.ensureHabitDefaults();
    var rows = LM.state.habitCategories.map(function (category) {
      var count = LM.state.habits.filter(function (h) { return h.categoryId === category.id; }).length;
      return '<div class="list-row"><span class="grow"><span class="row-title">' + LM.esc(category.name) + '</span><span class="row-sub">' + count + ' 个习惯</span></span>' +
        '<button type="button" class="mini-action" data-action="habit-category-edit" data-id="' + category.id + '">' + LM.icon('edit', 12) + '改名</button>' +
        '<button type="button" class="mini-action warn" data-action="habit-category-delete" data-id="' + category.id + '">' + LM.icon('trash', 12) + '</button></div>';
    }).join('');
    LM.openSheet({
      title: '分类管理',
      sub: '分类会显示在习惯卡片和筛选里。',
      body: '<div class="list-card">' + rows + '</div>' +
        '<form class="form mt-14" id="category-add-form" data-form="habit-category-add">' +
        '<div class="field"><label for="new-category-name">新增分类</label><div class="input-row"><input class="input" id="new-category-name" name="name" maxlength="12" placeholder="例如：创作"><button type="submit" class="btn soft">添加</button></div></div></form>' +
        '<p class="form-hint mt-8">删除分类时，原来的习惯会移动到「其他」分类，不会被删除。</p>'
    });
  };
  LM.forms['habit-category-add'] = function (form, data) {
    var name = String(data.get('name') || '').trim();
    if (!name) { LM.toast('请填写分类名称'); return; }
    if (LM.state.habitCategories.some(function (c) { return c.name === name; })) { LM.toast('这个分类已经存在'); return; }
    LM.state.habitCategories.push({ id: LM.uid('cat'), name: name, order: LM.state.habitCategories.length });
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
    LM.toast('分类已添加');
  };
  LM.actions['habit-category-edit'] = function (data) {
    var category = getCategory(data.id);
    if (!category) return;
    LM.openSheet({
      title: '重命名分类',
      body: '<form class="form" id="category-edit-form" data-form="habit-category-rename"><input type="hidden" name="id" value="' + category.id + '">' +
        '<div class="field"><label for="category-rename">分类名称</label><input class="input" id="category-rename" name="name" maxlength="12" value="' + LM.esc(category.name) + '" required></div></form>',
      footer: '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="category-edit-form">保存</button>'
    });
  };
  LM.forms['habit-category-rename'] = function (form, data) {
    var category = getCategory(String(data.get('id') || ''));
    var name = String(data.get('name') || '').trim();
    if (!category || !name) return;
    category.name = name;
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
    LM.toast('分类已更新');
  };
  LM.actions['habit-category-delete'] = function (data) {
    var category = getCategory(data.id);
    if (!category) return;
    var used = LM.state.habits.filter(function (h) { return h.categoryId === category.id; }).length;
    if (LM.state.habitCategories.length <= 1) { LM.toast('至少保留一个分类'); return; }
    LM.confirm({
      title: '删除「' + category.name + '」分类？',
      message: used ? '这个分类下的 ' + used + ' 个习惯会移动到「其他」分类。' : '这个分类还没有被使用。',
      confirmLabel: '删除',
      danger: true,
      onConfirm: function () {
        var fallback = LM.state.habitCategories.find(function (c) { return c.name === '其他' && c.id !== category.id; }) ||
          LM.state.habitCategories.find(function (c) { return c.id !== category.id; });
        LM.state.habits.forEach(function (habit) {
          if (habit.categoryId === category.id) habit.categoryId = fallback ? fallback.id : 'cat_other';
        });
        LM.state.habitCategories = LM.state.habitCategories.filter(function (c) { return c.id !== category.id; });
        if (LM.ui.habitCategory === category.id) LM.ui.habitCategory = 'all';
        LM.save(true);
        LM.closeSheet();
        LM.refresh();
        LM.toast('分类已删除');
      }
    });
  };

  /* ---------- reminders ---------- */
  LM.checkHabitReminders = function () {
    LM.ensureHabitDefaults();
    if (LM.isSheetOpen && LM.isSheetOpen()) return;
    if (!LM.state.settings.habitReminders) return;
    var today = LM.todayStr();
    if (LM.state.reminderLog.date !== today) {
      LM.state.reminderLog.date = today;
      LM.state.reminderLog.habitIds = [];
    }
    var now = LM.minutesNow();
    var due = LM.state.habits.filter(function (habit) {
      if (habit.status !== 'active' || habit.startDate > today) return false;
      if (!habit.reminderTime) return false;
      if (isHabitDone(habit, today)) return false;
      if (LM.state.reminderLog.habitIds.indexOf(habit.id) >= 0) return false;
      var reminder = LM.toMinutes(habit.reminderTime);
      if (reminder === null) return false;
      var delta = now - reminder;
      return delta >= 0 && delta <= 20;
    });
    if (!due.length) return;
    due.forEach(function (habit) { LM.state.reminderLog.habitIds.push(habit.id); });
    LM.save(true);
    var names = due.map(function (habit) { return habit.name; }).join('、');
    LM.toast('该打卡啦 · ' + names, {
      actionLabel: '去打卡',
      duration: 5200,
      onAction: function () { LM.navigate('habits'); }
    });
    if (LM.state.settings.browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification('生活管家 · 习惯提醒', { body: '还有未完成的习惯：' + names }); } catch (err) { /* ignore */ }
    }
  };
})();
