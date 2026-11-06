/* 生活管家 — 模块 2：打扫卫生 SOP */
(function () {
  'use strict';
  var LM = window.LM;

  function nextWeekdayOnOrAfter(dateStr, weekday, strictlyAfter) {
    var current = LM.weekdayIndex(dateStr);
    var delta = (Number(weekday) - current + 7) % 7;
    if (strictlyAfter && delta === 0) delta = 7;
    return LM.addDays(dateStr, delta);
  }
  LM.nextWeekdayOnOrAfter = nextWeekdayOnOrAfter;

  function newPlan(dateStr) {
    return {
      id: LM.uid('clean_plan'),
      originalPlannedDate: dateStr,
      plannedDate: dateStr,
      checks: {},
      usedSupplies: [],
      startedAt: null,
      postponeLog: [],
      createdAt: LM.nowISO()
    };
  }

  LM.ensureCleaningPlan = function () {
    if (!LM.state.cleaning) return;
    var c = LM.state.cleaning;
    if (!Array.isArray(c.steps)) c.steps = [];
    if (!Array.isArray(c.history)) c.history = [];
    if (!c.current) {
      var start = nextWeekdayOnOrAfter(LM.todayStr(), c.weekday, false);
      c.current = newPlan(start);
      LM.save(true);
    }
    if (!c.current.checks || typeof c.current.checks !== 'object') c.current.checks = {};
    if (!Array.isArray(c.current.usedSupplies)) c.current.usedSupplies = [];
    if (!Array.isArray(c.current.postponeLog)) c.current.postponeLog = [];
    if (!c.current.originalPlannedDate) c.current.originalPlannedDate = c.current.plannedDate;
  };

  LM.cleaningProgress = function () {
    var c = LM.state.cleaning;
    var total = c.steps.length;
    var done = c.steps.filter(function (step) { return c.current && c.current.checks[step.id]; }).length;
    return { done: done, total: total, pct: total ? Math.round(done / total * 100) : 0 };
  };

  function lastHistory() {
    var h = LM.state.cleaning.history;
    return h.length ? h[0] : null;
  }

  LM.cleaningSummary = function () {
    LM.ensureCleaningPlan();
    var c = LM.state.cleaning;
    var today = LM.todayStr();
    var planned = c.current.plannedDate;
    var delta = LM.diffDays(today, planned);
    var label, cardLabel;
    if (delta < 0) {
      label = '已逾期 ' + Math.abs(delta) + ' 天';
      cardLabel = '逾期 ' + Math.abs(delta) + ' 天 · 可顺延';
    } else if (delta === 0) {
      label = '今天';
      cardLabel = '今天该打扫 · ' + (c.current ? '计划 ' + LM.weekdayName(planned) : '');
    } else if (delta === 1) {
      label = '明天';
      cardLabel = '明天 · ' + LM.weekdayName(planned);
    } else {
      label = delta + ' 天后';
      cardLabel = LM.weekdayName(planned) + ' · ' + delta + ' 天后';
    }
    var last = lastHistory();
    var since = last ? LM.diffDays(last.actualDate, today) : null;
    return {
      days: delta,
      plannedDate: planned,
      label: label,
      cardLabel: cardLabel,
      sinceDays: since,
      sinceLabel: since === null ? '还没有记录' : since === 0 ? '今天' : since + ' 天前',
      last: last,
      progress: LM.cleaningProgress()
    };
  };

  LM.views.cleaning = function () {
    LM.ensureCleaningPlan();
    LM.ui.cleaningMonth = LM.ui.cleaningMonth || LM.todayStr().slice(0, 7);
    var c = LM.state.cleaning;
    var current = c.current;
    var progress = LM.cleaningProgress();
    var summary = LM.cleaningSummary();
    var last = lastHistory();
    var delta = summary.days;
    var completedToday = last && last.actualDate === LM.todayStr();
    var isOverdue = delta < 0;
    var plannedLabel = LM.formatDate(current.plannedDate) + ' ' + LM.weekdayName(current.plannedDate);
    var headline;
    if (isOverdue) headline = '这次打扫，还在等你';
    else if (delta === 0) headline = '今天，给空间一次呼吸';
    else if (progress.done > 0) headline = '已经开始了，慢慢做完';
    else headline = '离下次打扫，还有 ' + delta + ' 天';
    var subline = isOverdue ? ('原计划 ' + plannedLabel + '，已错过 ' + Math.abs(delta) + ' 天') : ('计划 ' + plannedLabel);
    var postponeText = current.postponeLog.length
      ? '已顺延 ' + current.postponeLog.length + ' 次 · 原计划 ' + LM.formatDate(current.originalPlannedDate) + '，现计划 ' + LM.formatDate(current.plannedDate)
      : '';

    var planBanner = '';
    if (delta === 0 && progress.done < progress.total) {
      planBanner = '<div class="plan-banner">' + LM.icon('bell', 14) + '<span><strong>今天是打扫日。</strong> 可以慢慢做，也可以把本次顺延到更空闲的一天。</span></div>';
    } else if (isOverdue) {
      planBanner = '<div class="plan-banner">' + LM.icon('alert', 14) + '<span><strong>计划日已过。</strong> 已保留原计划，可顺延到新的日期，完成后仍会留下「计划 / 实际」痕迹。</span></div>';
    } else if (postponeText) {
      planBanner = '<div class="plan-banner">' + LM.icon('calendar', 14) + '<span><strong>' + LM.esc(postponeText) + '</strong></span></div>';
    }

    var stepsRows = c.steps.map(function (step) {
      var done = !!current.checks[step.id];
      return '<div class="step-row ' + (done ? 'done' : '') + '" data-step-id="' + step.id + '" role="checkbox" tabindex="0" aria-checked="' + done + '">' +
        '<span class="step-check">' + LM.icon('check', 13) + '</span>' +
        '<span class="step-text">' + LM.esc(step.text) + '</span>' +
        '<span class="step-index">' + (c.steps.indexOf(step) + 1) + '</span>' +
        '<button type="button" class="step-edit" data-action="cleaning-edit-step" data-id="' + step.id + '" aria-label="编辑步骤">' + LM.icon('edit', 13) + '</button>' +
        '</div>';
    }).join('');

    var cleanSupplies = LM.state.supplies.filter(function (s) {
      return s.type === 'consumable' && s.scene === '清洁' && LM.supplyState(s) !== 'archived';
    });
    var usedMap = {};
    current.usedSupplies.forEach(function (u) { usedMap[u.supplyId] = (usedMap[u.supplyId] || 0) + u.quantity; });
    var supplyRows = cleanSupplies.map(function (s) {
      var low = LM.supplyState(s) === 'low';
      return '<div class="consumable-row"><span class="consumable-name">' + LM.esc(s.name) + '</span>' +
        '<span class="qty-pill ' + (low ? 'low' : '') + '">' + s.quantity + LM.esc(s.unit || '') + '</span>' +
        '<button type="button" class="consumable-use" data-action="cleaning-use-supply" data-id="' + s.id + '">用掉 1</button>' +
        (low ? '<button type="button" class="consumable-use" data-action="cleaning-restock" data-id="' + s.id + '">补货</button>' : '') + '</div>';
    }).join('');
    var usedTotal = LM.sum(current.usedSupplies, function (u) { return u.quantity; });
    var usedNames = Object.keys(usedMap).map(function (id) {
      var s = LM.getSupply(id);
      return s ? s.name + ' ×' + usedMap[id] : '';
    }).filter(Boolean).join('、');

    return LM.pageHeader({
      title: '打扫卫生',
      sub: '每周' + LM.weekdayOfNumber(c.weekday) + ' · 按自己的节奏完成',
      actions: '<button type="button" class="header-tools" data-action="open-cleaning-settings" aria-label="打扫设置">' + LM.icon('settings', 19) + '</button>'
    }) +
      '<section class="cleaning-hero ' + (isOverdue ? 'overdue' : '') + '">' +
      '<div class="cleaning-hero-top"><div class="grow"><div class="cleaning-kicker">A WEEKLY RESET</div>' +
      '<h2>' + headline + '</h2><p>' + subline + '</p></div>' +
      '<div class="hero-ring">' + ringSmall(progress.pct) + '</div></div>' +
      '<div class="cleaning-metrics">' +
      '<div class="cleaning-metric"><div class="value">' + (summary.sinceDays === null ? '—' : summary.sinceDays) + '</div><div class="label">距上次打扫（天）</div></div>' +
      '<div class="cleaning-metric"><div class="value">' + progress.done + ' / ' + progress.total + '</div><div class="label">本次已勾选</div></div>' +
      '<div class="cleaning-metric"><div class="value">' + (current.postponeLog.length || 0) + '</div><div class="label">顺延次数</div></div>' +
      '</div>' +
      LM.progressLine(progress.done, progress.total) +
      '<div class="cleaning-actions">' +
      '<button type="button" class="btn primary" data-action="scroll-cleaning-steps">' + (progress.done ? '继续打扫' : '开始打扫') + LM.icon('arrowRight', 15) + '</button>' +
      '<button type="button" class="btn" data-action="open-cleaning-postpone">' + LM.icon('calendar', 15) + '顺延</button>' +
      '</div></section>' +
      planBanner +
      '<section class="section"><div class="section-head"><div><h2 class="section-title">本次步骤</h2>' +
      '<p class="section-sub">' + (completedToday ? '今天已经完成过一次打扫。' : '不必一次做完，勾选会自动保存进度。') + '</p></div>' +
      '<button type="button" class="text-link" data-action="toggle-cleaning-edit">' + (LM.ui.cleaningEditing ? '完成编辑' : '编辑') + '</button></div>' +
      '<div class="card steps-card ' + (LM.ui.cleaningEditing ? 'editing' : '') + '" id="cleaning-steps">' +
      (stepsRows || '<div class="empty-mini">还没有步骤，添加第一个吧</div>') +
      '<button type="button" class="add-line" data-action="cleaning-add-step"><span class="plus-ring">' + LM.icon('plus', 11) + '</span>添加一个打扫步骤</button></div></section>' +
      '<section class="section"><div class="section-head"><div><h2 class="section-title">清洁用品余量</h2>' +
      '<p class="section-sub">顺手用掉，也顺手补上</p></div><span class="badge sage">本次已用 ' + usedTotal + ' 件</span></div>' +
      '<div class="card consumable-panel">' +
      (supplyRows || '<div class="empty-mini">清洁类消耗品暂时没有记录</div>') +
      (usedNames ? '<div class="panel-hint">本次已记录：' + LM.esc(usedNames) + '</div>' : '<div class="panel-hint">用掉清洁用品会同步扣减用品库余量。</div>') +
      '</div></section>' +
      '<section class="section"><div class="section-head"><div><h2 class="section-title">打扫日历</h2>' +
      '<p class="section-sub">完成与计划，都在这里留下痕迹</p></div></div>' +
      renderCalendar() + '</section>' +
      '<div class="info-note mt-14">' + LM.icon('leaf', 13) + ' 距上次打扫：' + LM.esc(summary.sinceLabel) + '</div>';
  };

  function ringSmall(pct) {
    var radius = 20;
    var circ = 2 * Math.PI * radius;
    var offset = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return '<svg width="53" height="53" viewBox="0 0 53 53" style="transform:rotate(-90deg)" aria-hidden="true">' +
      '<circle cx="26.5" cy="26.5" r="' + radius + '" fill="none" stroke="rgba(126,153,140,.18)" stroke-width="4"></circle>' +
      '<circle cx="26.5" cy="26.5" r="' + radius + '" fill="none" stroke="#7e998c" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '"></circle>' +
      '</svg><div class="ring-center"><span style="font-size:12px;font-weight:600;color:var(--sage-deep)">' + Math.round(pct) + '%</span></div>';
  }

  LM.actions['scroll-cleaning-steps'] = function () {
    var el = document.getElementById('cleaning-steps');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  LM.actions['toggle-cleaning-edit'] = function () {
    LM.ui.cleaningEditing = !LM.ui.cleaningEditing;
    LM.refresh();
  };

  LM.actions['cleaning-toggle-step'] = function (data, el) {
    if (el && el.classList.contains('step-edit')) return;
    var c = LM.state.cleaning;
    var current = c.current;
    if (!current) return;
    if (current.checks[data.id]) {
      delete current.checks[data.id];
    } else {
      current.checks[data.id] = LM.nowISO();
      current.startedAt = current.startedAt || LM.nowISO();
    }
    var total = c.steps.length;
    var done = c.steps.filter(function (step) { return current.checks[step.id]; }).length;
    if (total > 0 && done === total) {
      completeCleaning();
      return;
    }
    LM.save(true);
    LM.refresh();
  };
  document.addEventListener('click', function (e) {
    var row = e.target.closest('.step-row[role="checkbox"]');
    if (!row) return;
    if (e.target.closest('button')) return;
    LM.actions['cleaning-toggle-step']({ id: row.getAttribute('data-step-id') }, row, e);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var row = e.target.closest('.step-row[role="checkbox"]');
    if (!row) return;
    e.preventDefault();
    LM.actions['cleaning-toggle-step']({ id: row.getAttribute('data-step-id') }, row, e);
  });

  function completeCleaning() {
    var c = LM.state.cleaning;
    var current = c.current;
    var actual = LM.todayStr();
    var steps = c.steps.map(function (step) {
      return {
        id: step.id,
        text: step.text,
        doneAt: current.checks[step.id] || null
      };
    });
    var record = {
      id: current.id || LM.uid('clean_history'),
      originalPlannedDate: current.originalPlannedDate,
      plannedDate: current.plannedDate,
      actualDate: actual,
      steps: steps,
      usedSupplies: LM.deepClone(current.usedSupplies || []),
      postponeLog: LM.deepClone(current.postponeLog || []),
      startedAt: current.startedAt,
      completedAt: LM.nowISO()
    };
    c.history.unshift(record);
    var scheduleBase = actual > current.plannedDate ? actual : current.plannedDate;
    var next = nextWeekdayOnOrAfter(scheduleBase, c.weekday, true);
    c.current = newPlan(next);
    LM.save(true);
    LM.refresh();
    var postponed = record.postponeLog.length > 0;
    var used = record.usedSupplies.reduce(function (sum, item) { return sum + Number(item.quantity || 0); }, 0);
    var timingText;
    if (postponed) timingText = '原计划 ' + LM.formatDate(record.originalPlannedDate) + ' · 实际于 ' + LM.formatDate(actual) + ' 完成';
    else if (actual < record.plannedDate) timingText = '比计划 ' + LM.formatDate(record.plannedDate) + ' 提前完成，给自己留出了余裕';
    else if (actual === record.plannedDate) timingText = '按计划完成，节奏刚刚好';
    else timingText = '计划 ' + LM.formatDate(record.plannedDate) + '，实际于 ' + LM.formatDate(actual) + ' 完成';
    LM.openSheet({
      title: '这次打扫，完成了',
      sub: '空间轻一点，心里也会松一点。',
      body: '<div class="cleaning-hero" style="margin-top:6px"><div class="cleaning-kicker">COMPLETED</div>' +
        '<h2 style="font-size:18px">' + LM.formatDate(actual) + ' ' + LM.weekdayName(actual) + '</h2>' +
        '<p>' + timingText + '</p>' +
        '<div class="cleaning-metrics"><div class="cleaning-metric"><div class="value">' + record.steps.length + '</div><div class="label">完成步骤</div></div>' +
        '<div class="cleaning-metric"><div class="value">' + used + '</div><div class="label">消耗用品</div></div>' +
        '<div class="cleaning-metric"><div class="value">' + c.current.plannedDate.slice(5).replace('-', '/') + '</div><div class="label">下次计划</div></div></div></div>' +
        '<div class="info-note mt-14">记录已写入打扫日历。可以随时点按日历里的日期查看明细。</div>',
      footer: '<button type="button" class="btn" data-close>好的</button><button type="button" class="btn primary" data-action="view-cleaning-record" data-date="' + actual + '">查看记录</button>'
    });
  }

  LM.actions['view-cleaning-record'] = function (data) {
    LM.closeSheet();
    setTimeout(function () { openCleaningDay(data.date); }, 30);
  };

  LM.actions['open-cleaning-settings'] = function () {
    var c = LM.state.cleaning;
    var days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    LM.openSheet({
      title: '打扫设置',
      sub: '把打扫安排在一个真正合适的日子。',
      body: '<form class="form" id="cleaning-settings-form" data-form="cleaning-settings-save">' +
        '<div class="field"><span class="field-label">每周打扫日</span><div class="day-picker">' +
        days.map(function (day, index) {
          return '<label class="day-pill"><input type="radio" name="weekday" value="' + index + '" ' + (c.weekday === index ? 'checked' : '') + '><span>' + day.replace('周', '') + '</span></label>';
        }).join('') + '</div></div>' +
        '<div class="form-section"><div class="switch-row"><div class="switch-copy"><div class="switch-title">打扫日轻提醒</div><div class="switch-sub">到当天在应用内提醒一次</div></div>' +
        '<label class="switch"><input type="checkbox" name="reminderEnabled" ' + (c.reminderEnabled ? 'checked' : '') + '><span class="switch-track"></span></label></div></div>' +
        '</form>',
      footer: '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="cleaning-settings-form">保存设置</button>'
    });
  };
  LM.forms['cleaning-settings-save'] = function (form, data) {
    var c = LM.state.cleaning;
    var weekday = LM.safeInt(data.get('weekday'), c.weekday);
    c.weekday = weekday;
    c.reminderEnabled = data.get('reminderEnabled') === 'on';
    if (c.current && Object.keys(c.current.checks || {}).length === 0 && !c.current.postponeLog.length) {
      var start = nextWeekdayOnOrAfter(LM.todayStr(), weekday, false);
      c.current.plannedDate = start;
      c.current.originalPlannedDate = start;
    }
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
    LM.toast('打扫日已调整为每周' + LM.weekdayOfNumber(weekday));
  };

  LM.actions['open-cleaning-postpone'] = function () {
    var c = LM.state.cleaning;
    var current = c.current;
    if (!current) return;
    var today = LM.todayStr();
    var minDate = current.plannedDate > today ? LM.addDays(current.plannedDate, 1) : LM.addDays(today, 1);
    var defaultDate = minDate;
    LM.openSheet({
      title: '顺延本次打扫',
      sub: '计划可以改，痕迹会保留。',
      body: '<div class="info-note">原计划：' + LM.formatDate(current.originalPlannedDate) + ' ' + LM.weekdayName(current.originalPlannedDate) +
        (current.postponeLog.length ? ' · 已顺延 ' + current.postponeLog.length + ' 次' : '') + '</div>' +
        '<form class="form mt-14" id="postpone-form" data-form="cleaning-postpone-save">' +
        '<div class="field"><label for="postpone-date">顺延到</label><input class="input" id="postpone-date" name="date" type="date" min="' + minDate + '" value="' + defaultDate + '" required>' +
        '<p class="form-hint">新的计划日必须晚于当前计划日；完成时仍会显示原计划与实际完成日。</p></div>' +
        '</form>',
      footer: '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="postpone-form">确认顺延</button>'
    });
  };
  LM.forms['cleaning-postpone-save'] = function (form, data) {
    var c = LM.state.cleaning;
    var current = c.current;
    var date = String(data.get('date') || '');
    if (!LM.validDate(date)) { LM.toast('请选择有效日期'); return; }
    if (date <= current.plannedDate) { LM.toast('顺延日期需要晚于当前计划日'); return; }
    if (!current.originalPlannedDate) current.originalPlannedDate = current.plannedDate;
    var previous = current.plannedDate;
    current.postponeLog.push({ at: LM.nowISO(), from: previous, to: date });
    current.plannedDate = date;
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
    LM.toast('已顺延至 ' + LM.formatDate(date));
  };

  LM.actions['cleaning-add-step'] = function () {
    LM.openSheet({
      title: '添加打扫步骤',
      sub: '新的步骤与内置步骤一样参与打勾和记录。',
      body: '<form class="form" id="clean-step-form" data-form="cleaning-step-save">' +
        '<input type="hidden" name="id" value="">' +
        '<div class="field"><label for="clean-step-text">步骤内容</label><input class="input" id="clean-step-text" name="text" maxlength="60" placeholder="例如：擦窗户" required></div>' +
        '</form>',
      footer: '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="clean-step-form">添加</button>'
    });
  };
  LM.actions['cleaning-edit-step'] = function (data) {
    var step = LM.state.cleaning.steps.find(function (s) { return s.id === data.id; });
    if (!step) return;
    LM.openSheet({
      title: '编辑步骤',
      body: '<form class="form" id="clean-step-form" data-form="cleaning-step-save">' +
        '<input type="hidden" name="id" value="' + step.id + '">' +
        '<div class="field"><label for="clean-step-text">步骤内容</label><input class="input" id="clean-step-text" name="text" maxlength="60" value="' + LM.esc(step.text) + '" required></div>' +
        '<button type="button" class="btn danger block" data-action="cleaning-delete-step" data-id="' + step.id + '">删除这个步骤</button>' +
        '</form>',
      footer: '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="clean-step-form">保存</button>'
    });
  };
  LM.forms['cleaning-step-save'] = function (form, data) {
    var id = String(data.get('id') || '');
    var text = String(data.get('text') || '').trim();
    if (!text) { LM.toast('请填写步骤内容'); return; }
    if (id) {
      var step = LM.state.cleaning.steps.find(function (s) { return s.id === id; });
      if (step) step.text = text;
      LM.toast('步骤已更新');
    } else {
      LM.state.cleaning.steps.push({ id: LM.uid('clean_step'), text: text, builtin: false });
      LM.toast('已添加步骤');
    }
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
  };
  LM.actions['cleaning-delete-step'] = function (data) {
    var step = LM.state.cleaning.steps.find(function (s) { return s.id === data.id; });
    if (!step) return;
    LM.confirm({
      title: '删除这个步骤？',
      message: '「' + step.text + '」会从本次和之后的打扫清单里移除。',
      confirmLabel: '删除',
      danger: true,
      onConfirm: function () {
        var c = LM.state.cleaning;
        c.steps = c.steps.filter(function (s) { return s.id !== data.id; });
        if (c.current) delete c.current.checks[data.id];
        LM.save(true);
        LM.closeSheet();
        LM.refresh();
        LM.toast('步骤已删除');
      }
    });
  };

  LM.actions['cleaning-use-supply'] = function (data) {
    var supply = LM.getSupply(data.id);
    var c = LM.state.cleaning;
    if (!supply || !c.current) return;
    if (supply.quantity <= 0) { LM.toast('这件用品已经没有余量了'); return; }
    supply.quantity = Math.max(0, Number(supply.quantity) - 1);
    var used = c.current.usedSupplies.find(function (u) { return u.supplyId === supply.id; });
    if (used) used.quantity += 1;
    else c.current.usedSupplies.push({ supplyId: supply.id, name: supply.name, quantity: 1, unit: supply.unit });
    if (supply.quantity === 0) {
      supply.status = 'toRestock';
      var shopId = LM.addShoppingFromSupply(supply, 'consumable_empty');
      LM.save(true);
      LM.refresh();
      LM.toast('「' + supply.name + '」已用完，已顺手加入购物清单', {
        actionLabel: '撤销',
        onAction: function () {
          var s = LM.getSupply(supply.id);
          if (s) { s.quantity += 1; s.status = 'active'; }
          var plan = LM.state.cleaning.current;
          if (plan) {
            var u = plan.usedSupplies.find(function (x) { return x.supplyId === supply.id; });
            if (u) { u.quantity -= 1; if (u.quantity <= 0) plan.usedSupplies = plan.usedSupplies.filter(function (x) { return x !== u; }); }
          }
          if (shopId) LM.removeShoppingItem(shopId);
          LM.save(true);
          LM.refresh();
        }
      });
      return;
    }
    LM.save(true);
    LM.refresh();
  };
  LM.actions['cleaning-restock'] = function (data) {
    var supply = LM.getSupply(data.id);
    if (!supply) return;
    var shopId = LM.addShoppingFromSupply(supply, 'cleaning_restock');
    LM.save(true);
    LM.refresh();
    LM.toast(shopId ? '已把「' + supply.name + '」放入购物清单' : '购物清单里已经有它了');
  };

  function renderCalendar() {
    var c = LM.state.cleaning;
    var month = LM.ui.cleaningMonth || LM.todayStr().slice(0, 7);
    var start = LM.monthStart(month + '-01');
    var end = LM.monthEnd(month + '-01');
    var gridStart = LM.addDays(start, -LM.mondayIndex(start));
    var historyByDate = {};
    c.history.forEach(function (record) {
      if (!historyByDate[record.actualDate]) historyByDate[record.actualDate] = record;
    });
    var planDates = {};
    if (c.current) {
      planDates[c.current.plannedDate] = 'current';
      var future = c.current.plannedDate;
      for (var i = 0; i < 10; i += 1) {
        future = nextWeekdayOnOrAfter(future, c.weekday, true);
        if (!planDates[future]) planDates[future] = 'future';
      }
    }
    var cells = [];
    for (var d = 0; d < 42; d += 1) {
      var date = LM.addDays(gridStart, d);
      var outside = date.slice(0, 7) !== month;
      var classes = ['cal-day'];
      if (outside) classes.push('out');
      if (date === LM.todayStr()) classes.push('today');
      var hasHistory = !!historyByDate[date];
      var planType = planDates[date];
      if (hasHistory) classes.push('completed');
      else if (planType === 'current' && date < LM.todayStr()) classes.push('missed');
      else if (planType) classes.push('planned');
      cells.push('<button type="button" class="' + classes.join(' ') + '" data-action="open-cleaning-day" data-date="' + date + '" aria-label="' + LM.formatDate(date, true) + '">' +
        '<span>' + LM.parseDate(date).getDate() + '</span></button>');
    }
    var monthDone = c.history.filter(function (r) { return r.actualDate.slice(0, 7) === month; }).length;
    return '<div class="card calendar-card">' +
      '<div class="calendar-head"><div class="calendar-title">' + LM.monthLabel(month) + '</div>' +
      '<div class="row gap-8"><span class="tiny muted">本月 ' + monthDone + ' 次</span><div class="calendar-nav">' +
      '<button type="button" data-action="cleaning-month-prev" aria-label="上个月">' + LM.icon('chevronLeft', 16) + '</button>' +
      '<button type="button" data-action="cleaning-month-next" aria-label="下个月">' + LM.icon('chevronRight', 16) + '</button></div></div></div>' +
      '<div class="week-labels">' + LM.mondayLabels.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>' +
      '<div class="calendar-grid">' + cells.join('') + '</div>' +
      '<div class="cal-legend"><span><i class="legend-dot done"></i>已完成</span><span><i class="legend-dot plan"></i>计划</span><span><i class="legend-dot miss"></i>已错过</span></div>' +
      '</div>';
  }

  LM.actions['cleaning-month-prev'] = function () {
    var month = LM.ui.cleaningMonth || LM.todayStr().slice(0, 7);
    var d = LM.parseDate(month + '-01');
    d.setMonth(d.getMonth() - 1);
    LM.ui.cleaningMonth = LM.todayStr(d).slice(0, 7);
    LM.refresh();
  };
  LM.actions['cleaning-month-next'] = function () {
    var month = LM.ui.cleaningMonth || LM.todayStr().slice(0, 7);
    var d = LM.parseDate(month + '-01');
    d.setMonth(d.getMonth() + 1);
    LM.ui.cleaningMonth = LM.todayStr(d).slice(0, 7);
    LM.refresh();
  };

  LM.actions['open-cleaning-day'] = function (data) { openCleaningDay(data.date); };

  function openCleaningDay(date) {
    var c = LM.state.cleaning;
    var records = c.history.filter(function (r) { return r.actualDate === date; });
    var current = c.current;
    var isPlanned = current && current.plannedDate === date;
    var body = '';
    if (records.length) {
      var r = records[0];
      var postponed = (r.postponeLog || []).length > 0;
      var relationText;
      if (postponed) {
        var latestPlan = r.postponeLog[r.postponeLog.length - 1].to;
        relationText = '原计划 ' + LM.formatDate(r.originalPlannedDate) + '，顺延至 ' + LM.formatDate(latestPlan) + '，实际于 ' + LM.formatDate(r.actualDate) + ' 完成。';
      } else if (r.actualDate < r.plannedDate) {
        relationText = '计划 ' + LM.formatDate(r.plannedDate) + '，于 ' + LM.formatDate(r.actualDate) + ' 提前完成。';
      } else if (r.actualDate === r.plannedDate) {
        relationText = '计划 ' + LM.formatDate(r.plannedDate) + '，按计划完成。';
      } else {
        relationText = '计划 ' + LM.formatDate(r.plannedDate) + '，实际于 ' + LM.formatDate(r.actualDate) + ' 完成。';
      }
      body += '<div class="info-note">' + relationText + '</div>' +
        '<div class="scene-section-head"><div class="scene-section-title">完成的步骤 <span class="badge sage">' + r.steps.length + '</span></div></div>' +
        '<div class="list-card">' + r.steps.map(function (step) {
          return '<div class="list-row"><span class="step-check" style="background:var(--sage-deep);border-color:var(--sage-deep);color:#fff">' + LM.icon('check', 12) + '</span><span class="grow row-title">' + LM.esc(step.text) + '</span></div>';
        }).join('') + '</div>';
      if (r.usedSupplies && r.usedSupplies.length) {
        body += '<div class="scene-section-head"><div class="scene-section-title">使用的消耗品</div></div><div class="list-card">' +
          r.usedSupplies.map(function (u) {
            return '<div class="list-row"><span class="consumable-name">' + LM.esc(u.name) + '</span><span class="qty-pill">' + u.quantity + LM.esc(u.unit || '') + '</span></div>';
          }).join('') + '</div>';
      } else {
        body += '<p class="form-hint mt-12">这次没有记录消耗品。</p>';
      }
      if (postponed) {
        body += '<div class="scene-section-head"><div class="scene-section-title">顺延痕迹</div></div><div class="list-card">' +
          r.postponeLog.map(function (log) {
            return '<div class="list-row"><span class="grow"><div class="row-title">' + LM.formatDate(log.from) + ' → ' + LM.formatDate(log.to) + '</div><div class="row-sub">' + LM.esc((log.at || '').slice(0, 16).replace('T', ' ')) + '</div></span></div>';
          }).join('') + '</div>';
      }
    } else if (isPlanned) {
      var progress = LM.cleaningProgress();
      body += '<div class="info-note">这是本次打扫的计划日' + (date < LM.todayStr() ? '，已经错过，可以在打扫页顺延。' : '。') + '</div>' +
        '<div class="cleaning-metrics"><div class="cleaning-metric"><div class="value">' + progress.done + ' / ' + progress.total + '</div><div class="label">步骤进度</div></div>' +
        '<div class="cleaning-metric"><div class="value">' + LM.weekdayName(date) + '</div><div class="label">计划日</div></div></div>';
    } else {
      body += '<div class="empty-state"><div class="empty-icon">' + LM.icon('calendar', 21) + '</div><h3>这一天没有打扫记录</h3><p>完成打扫后，明细会自动出现在这里。</p></div>';
    }
    LM.openSheet({
      title: LM.formatDate(date) + ' ' + LM.weekdayName(date),
      sub: records.length ? '已完成的打扫记录' : isPlanned ? '计划中的打扫' : '打扫日历',
      body: body,
      footer: '<button type="button" class="btn" data-close>关闭</button>'
    });
  }

  LM.checkCleaningReminder = function () {
    var c = LM.state.cleaning;
    if (!c || !c.current) return;
    if (LM.isSheetOpen && LM.isSheetOpen()) return;
    if (!LM.state.settings.cleaningReminders || !c.reminderEnabled) return;
    var today = LM.todayStr();
    if (c.current.plannedDate !== today) return;
    if (LM.state.reminderLog.cleaningDate === today) return;
    var progress = LM.cleaningProgress();
    if (progress.done >= progress.total) return;
    LM.state.reminderLog.cleaningDate = today;
    LM.save(true);
    LM.toast('今天是打扫日，慢慢来就好', {
      actionLabel: '去打扫',
      onAction: function () { LM.navigate('cleaning'); }
    });
    if (LM.state.settings.browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification('生活管家 · 打扫日', { body: '今天是计划打扫日，按自己的节奏完成就好。' }); } catch (err) { /* ignore */ }
    }
  };
})();
