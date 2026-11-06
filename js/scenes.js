/* 生活管家 — 模块 3：场景 SOP */
(function () {
  'use strict';
  var LM = window.LM;

  function getScene(id) {
    return LM.state.scenes.find(function (scene) { return scene.id === id; }) || null;
  }
  LM.getScene = getScene;

  function getLog(sceneId, date, create) {
    var dateKey = date || LM.todayStr();
    if (!LM.state.sceneLogs[dateKey] && create) LM.state.sceneLogs[dateKey] = {};
    var dateLogs = LM.state.sceneLogs[dateKey];
    if (!dateLogs) return null;
    if (!dateLogs[sceneId] && create) dateLogs[sceneId] = { steps: {}, items: {}, updatedAt: LM.nowISO() };
    return dateLogs[sceneId] || null;
  }
  LM.getSceneLog = getLog;

  function sceneProgress(scene, date) {
    var log = getLog(scene.id, date, false) || { steps: {}, items: {} };
    var stepDone = scene.steps.filter(function (step) { return log.steps && log.steps[step.id]; }).length;
    var itemDone = scene.items.filter(function (item) { return log.items && log.items[item.id]; }).length;
    return {
      stepDone: stepDone,
      stepTotal: scene.steps.length,
      itemDone: itemDone,
      itemTotal: scene.items.length,
      totalDone: stepDone + itemDone,
      total: scene.steps.length + scene.items.length,
      log: log
    };
  }
  LM.sceneProgress = sceneProgress;

  LM.sceneTodaySummary = function () {
    var morning = getScene('morning');
    var evening = getScene('evening');
    var mp = morning ? sceneProgress(morning, LM.todayStr()) : { stepDone: 0, stepTotal: 0 };
    var ep = evening ? sceneProgress(evening, LM.todayStr()) : { stepDone: 0, stepTotal: 0 };
    var all = LM.state.scenes.map(function (scene) { return sceneProgress(scene, LM.todayStr()); });
    return {
      morningDone: mp.stepDone,
      morningTotal: mp.stepTotal,
      eveningDone: ep.stepDone,
      eveningTotal: ep.stepTotal,
      done: all.reduce(function (sum, p) { return sum + p.totalDone; }, 0),
      total: all.reduce(function (sum, p) { return sum + p.total; }, 0)
    };
  };

  LM.views.scenes = function () {
    var today = LM.todayStr();
    var morning = getScene('morning');
    var evening = getScene('evening');
    var mp = morning ? sceneProgress(morning, today) : null;
    var ep = evening ? sceneProgress(evening, today) : null;
    var dailyDone = (mp ? mp.stepDone : 0) + (ep ? ep.stepDone : 0);
    var dailyTotal = (mp ? mp.stepTotal : 0) + (ep ? ep.stepTotal : 0);
    var dailyPct = dailyTotal ? Math.round(dailyDone / dailyTotal * 100) : 0;
    var cards = LM.state.scenes.map(function (scene) {
      var p = sceneProgress(scene, today);
      var empty = p.total === 0;
      var pct = p.total ? Math.round(p.totalDone / p.total * 100) : 0;
      return '<button type="button" class="scene-card" data-action="open-scene" data-id="' + scene.id + '">' +
        '<span class="scene-icon-box" data-tone="' + LM.esc(scene.tone || 'blue') + '">' + LM.sceneIcon(scene.icon, 22) + '</span>' +
        '<span class="scene-info"><span class="scene-name">' + LM.esc(scene.name) + '</span>' +
        '<span class="scene-sub">' + (empty ? '待填写 · 可以使用模板' : (p.stepTotal ? p.stepDone + '/' + p.stepTotal + ' 步' : '无步骤') + (p.itemTotal ? ' · 必带 ' + p.itemDone + '/' + p.itemTotal : ' · 无必带')) + '</span>' +
        '<span class="scene-progress"><span class="progress-track"><span class="progress-fill" style="display:block;width:' + pct + '%"></span></span><span class="pct">' + (empty ? '—' : pct + '%') + '</span></span>' +
        '</span><span class="scene-chevron">' + LM.icon('chevronRight', 17) + '</span></button>';
    }).join('');

    return LM.pageHeader({
      title: '场景 SOP',
      sub: '少一点决策，多一点从容',
      actions: ''
    }) +
      '<section class="card card-pad" style="background:#edf2f3;border-color:#e1e9ea">' +
      '<div class="between"><div><div class="cleaning-kicker">TODAY’S PATHS</div><h2 style="font-size:17px;color:var(--ink-strong);margin-top:4px">今天的两条路径</h2>' +
      '<p class="form-hint" style="margin-top:3px">' + LM.esc(LM.formatDate(today) + ' ' + LM.weekdayName(today)) + ' · 点按卡片开始</p></div>' +
      '<div class="ring-center" style="position:relative;width:61px;height:61px">' + smallRing(dailyPct) + '</div></div>' +
      '<div class="mt-14" style="display:flex;flex-direction:column;gap:9px">' +
      '<div><div class="between small" style="font-size:10.5px;color:var(--ink-2)"><span>早 SOP</span><span class="mono">' + (mp ? mp.stepDone : 0) + ' / ' + (mp ? mp.stepTotal : 0) + '</span></div><div class="mt-4">' + LM.progress(mp ? mp.stepDone : 0, mp ? mp.stepTotal : 0) + '</div></div>' +
      '<div><div class="between small" style="font-size:10.5px;color:var(--ink-2)"><span>晚 SOP</span><span class="mono">' + (ep ? ep.stepDone : 0) + ' / ' + (ep ? ep.stepTotal : 0) + '</span></div><div class="mt-4">' + LM.progress(ep ? ep.stepDone : 0, ep ? ep.stepTotal : 0, 'sage') + '</div></div>' +
      '</div></section>' +
      '<section class="section"><div class="section-head"><div><h2 class="section-title">所有场景</h2>' +
      '<p class="section-sub">五个场景，五种进入状态的方式</p></div><span class="badge blue">' + LM.state.scenes.length + '</span></div>' +
      '<div class="scene-grid">' + cards + '</div></section>' +
      '<div class="info-note mt-16">' + LM.icon('leaf', 13) + ' 必带物品可以关联用品库，出门前逐项确认就好。</div>';
  };

  function smallRing(pct) {
    var radius = 24;
    var circ = 2 * Math.PI * radius;
    var offset = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return '<svg width="61" height="61" viewBox="0 0 61 61" style="transform:rotate(-90deg)" aria-hidden="true">' +
      '<circle cx="30.5" cy="30.5" r="' + radius + '" fill="none" stroke="rgba(168,188,200,.24)" stroke-width="4.5"></circle>' +
      '<circle cx="30.5" cy="30.5" r="' + radius + '" fill="none" stroke="#7e99a8" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '"></circle>' +
      '</svg><span style="position:absolute;font-size:10.5px;font-weight:600;color:var(--mist-ink)">' + Math.round(pct) + '%</span>';
  }

  LM.actions['open-scene'] = function (data) {
    LM.ui.sceneEditing = false;
    LM.navigate('scene/' + encodeURIComponent(data.id));
  };

  LM.views.scene = function (route) {
    var scene = getScene(route.id);
    if (!scene) {
      return LM.pageHeader({ title: '场景', sub: '没有找到这个场景', back: 'scenes' }) +
        LM.emptyState({ icon: 'scenes', title: '场景不存在', text: '它可能已经被删除了。', action: 'nav-scenes', actionLabel: '返回场景列表' });
    }
    var today = LM.todayStr();
    var p = sceneProgress(scene, today);
    var pct = p.total ? Math.round(p.totalDone / p.total * 100) : 0;
    var log = p.log;
    var stepRows = scene.steps.map(function (step, index) {
      var done = !!(log.steps && log.steps[step.id]);
      return '<div class="check-row ' + (done ? 'done' : '') + '">' +
        '<button type="button" class="step-check" data-action="scene-toggle-step" data-scene="' + scene.id + '" data-id="' + step.id + '" aria-label="' + (done ? '取消' : '勾选') + '步骤" style="' + (done ? 'background:var(--mist-deep);border-color:var(--mist-deep);color:#fff' : '') + '">' + LM.icon('check', 13) + '</button>' +
        '<button type="button" class="check-body step-body" data-action="scene-toggle-step" data-scene="' + scene.id + '" data-id="' + step.id + '"><span class="step-number">' + (index + 1) + '</span><span class="check-title">' + LM.esc(step.text) + '</span></button>' +
        (LM.ui.sceneEditing ? '<span class="row-tools"><button type="button" data-action="scene-edit-step" data-scene="' + scene.id + '" data-id="' + step.id + '" aria-label="编辑步骤">' + LM.icon('edit', 13) + '</button></span>' : '') +
        '</div>';
    }).join('');
    var itemRows = scene.items.map(function (item) {
      var done = !!(log.items && log.items[item.id]);
      var supply = item.supplyId ? LM.getSupply(item.supplyId) : null;
      var stockText = item.supplyId ? (supply ? '关联用品库 · 余 ' + supply.quantity + (supply.unit || '') : '关联用品已移除') : '未关联用品';
      return '<div class="check-row ' + (done ? 'done' : '') + '">' +
        '<button type="button" class="step-check" data-action="scene-toggle-item" data-scene="' + scene.id + '" data-id="' + item.id + '" aria-label="' + (done ? '取消' : '确认') + '必带物品" style="' + (done ? 'background:var(--sage-deep);border-color:var(--sage-deep);color:#fff' : '') + '">' + LM.icon('check', 13) + '</button>' +
        '<button type="button" class="check-body" data-action="scene-toggle-item" data-scene="' + scene.id + '" data-id="' + item.id + '"><span class="check-title">' + LM.esc(item.name) + '</span><span class="check-sub">' + LM.esc(stockText) + '</span></button>' +
        (LM.ui.sceneEditing ? '<span class="row-tools"><button type="button" data-action="scene-edit-item" data-scene="' + scene.id + '" data-id="' + item.id + '" aria-label="编辑物品">' + LM.icon('edit', 13) + '</button></span>' : '') +
        '</div>';
    }).join('');
    var templateHtml = '';
    if (p.total === 0 && scene.template) {
      templateHtml = '<div class="template-banner"><h3>这个场景还是空的</h3><p>先用一份轻量模板开始，之后随时改成自己的顺序。</p>' +
        '<button type="button" class="btn soft small-btn" data-action="preview-scene-template" data-id="' + scene.id + '">' + LM.icon('sparkles', 14) + '使用模板</button></div>';
    }
    return LM.pageHeader({
      title: scene.name,
      sub: '今日 · ' + LM.formatDate(today) + ' ' + LM.weekdayName(today),
      back: 'scenes',
      actions: '<button type="button" class="header-tools" data-action="toggle-scene-edit" aria-label="编辑场景">' + (LM.ui.sceneEditing ? LM.icon('check', 19) : LM.icon('edit', 19)) + '</button>'
    }) +
      '<section class="scene-hero" data-tone="' + LM.esc(scene.tone || 'blue') + '">' +
      '<div class="between"><div><div class="cleaning-kicker">DAILY RHYTHM</div><h2 class="scene-hero-title">' + LM.esc(scene.subtitle || scene.name) + '</h2>' +
      '<p class="scene-hero-sub">' + (scene.steps.length ? '按顺序慢慢来，不赶时间。' : '添加自己的步骤，或者从模板开始。') + '</p></div>' +
      '<div class="ring-center" style="position:relative;width:61px;height:61px;flex:0 0 auto">' + smallRing(pct) + '</div></div>' +
      '<div class="scene-hero-stats"><div class="scene-stat"><div class="value">' + p.stepDone + ' / ' + p.stepTotal + '</div><div class="label">步骤</div></div>' +
      '<div class="scene-stat"><div class="value">' + p.itemDone + ' / ' + p.itemTotal + '</div><div class="label">必带物品</div></div>' +
      '<div class="scene-stat"><div class="value">' + (p.total && p.totalDone === p.total ? '完成' : p.totalDone > 0 ? '进行中' : p.total ? '待开始' : '待设置') + '</div><div class="label">今日状态</div></div></div>' +
      '</section>' +
      templateHtml +
      '<section class="section"><div class="scene-section-head"><div class="scene-section-title">步骤清单 <span class="badge blue">' + scene.steps.length + '</span></div>' +
      '<button type="button" class="text-link" data-action="scene-add-step" data-id="' + scene.id + '">' + LM.icon('plus', 13) + '添加</button></div>' +
      (stepRows ? '<div class="list-card">' + stepRows + '</div>' : '<div class="empty-state" style="padding:22px"><p>还没有步骤。添加第一个关键动作吧。</p><button type="button" class="btn soft small-btn" data-action="scene-add-step" data-id="' + scene.id + '">添加步骤</button></div>') +
      '</section>' +
      '<section class="section"><div class="scene-section-head"><div class="scene-section-title">必带物品 <span class="badge sage">' + scene.items.length + '</span></div>' +
      '<button type="button" class="text-link" data-action="scene-add-item" data-id="' + scene.id + '">' + LM.icon('plus', 13) + '添加</button></div>' +
      (itemRows ? '<div class="list-card">' + itemRows + '</div>' : '<div class="empty-state" style="padding:22px"><p>还没有必带物品。把容易忘记的东西放进来。</p><button type="button" class="btn soft small-btn" data-action="scene-add-item" data-id="' + scene.id + '">添加物品</button></div>') +
      '</section>' +
      '<div class="info-note mt-14">' + LM.icon('leaf', 13) + ' 每天的勾选会在第二天自动清空，昨天的记录会留在本机。</div>';
  };

  LM.actions['nav-scenes'] = function () { LM.navigate('scenes'); };
  LM.actions['toggle-scene-edit'] = function () {
    LM.ui.sceneEditing = !LM.ui.sceneEditing;
    LM.refresh();
  };
  LM.actions['scene-toggle-step'] = function (data) {
    var scene = getScene(data.scene);
    if (!scene) return;
    var log = getLog(scene.id, LM.todayStr(), true);
    var before = sceneProgress(scene, LM.todayStr());
    if (log.steps[data.id]) delete log.steps[data.id];
    else log.steps[data.id] = LM.nowISO();
    log.updatedAt = LM.nowISO();
    var after = sceneProgress(scene, LM.todayStr());
    LM.save(true);
    LM.refresh();
    if (after.stepTotal > 0 && after.stepDone === after.stepTotal && before.stepDone < before.stepTotal) {
      var itemNote = after.itemTotal && after.itemDone < after.itemTotal ? '，记得确认必带物品' : '';
      LM.toast(scene.name + ' 步骤全部完成' + itemNote);
    }
  };
  LM.actions['scene-toggle-item'] = function (data) {
    var scene = getScene(data.scene);
    if (!scene) return;
    var log = getLog(scene.id, LM.todayStr(), true);
    var before = sceneProgress(scene, LM.todayStr());
    if (log.items[data.id]) delete log.items[data.id];
    else log.items[data.id] = LM.nowISO();
    log.updatedAt = LM.nowISO();
    var after = sceneProgress(scene, LM.todayStr());
    LM.save(true);
    LM.refresh();
    if (after.total > 0 && after.totalDone === after.total && before.totalDone < before.total) {
      LM.toast(scene.name + ' 今日完成');
    }
  };

  LM.actions['scene-add-step'] = function (data) {
    var scene = getScene(data.id);
    if (!scene) return;
    LM.openSheet({
      title: '添加步骤',
      sub: '一句清楚、可以照着做的提示就好。',
      body: '<form class="form" id="scene-step-form" data-form="scene-step-save">' +
        '<input type="hidden" name="sceneId" value="' + scene.id + '">' +
        '<input type="hidden" name="stepId" value="">' +
        '<div class="field"><label for="scene-step-text">步骤内容</label><input class="input" id="scene-step-text" name="text" maxlength="80" placeholder="例如：烧水、洗脸、刷牙" required></div>' +
        '</form>',
      footer: '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="scene-step-form">添加</button>'
    });
  };
  LM.actions['scene-edit-step'] = function (data) {
    var scene = getScene(data.scene);
    var step = scene && scene.steps.find(function (s) { return s.id === data.id; });
    if (!step) return;
    LM.openSheet({
      title: '编辑步骤',
      body: '<form class="form" id="scene-step-form" data-form="scene-step-save">' +
        '<input type="hidden" name="sceneId" value="' + scene.id + '">' +
        '<input type="hidden" name="stepId" value="' + step.id + '">' +
        '<div class="field"><label for="scene-step-text">步骤内容</label><input class="input" id="scene-step-text" name="text" maxlength="80" value="' + LM.esc(step.text) + '" required></div>' +
        '<button type="button" class="btn danger block" data-action="scene-delete-step" data-scene="' + scene.id + '" data-id="' + step.id + '">删除这个步骤</button>' +
        '</form>',
      footer: '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="scene-step-form">保存</button>'
    });
  };
  LM.forms['scene-step-save'] = function (form, data) {
    var scene = getScene(String(data.get('sceneId') || ''));
    if (!scene) return;
    var stepId = String(data.get('stepId') || '');
    var text = String(data.get('text') || '').trim();
    if (!text) { LM.toast('请填写步骤内容'); return; }
    if (stepId) {
      var step = scene.steps.find(function (s) { return s.id === stepId; });
      if (step) step.text = text;
    } else {
      scene.steps.push({ id: LM.uid('scene_step'), text: text });
    }
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
    LM.toast('步骤已保存');
  };
  LM.actions['scene-delete-step'] = function (data) {
    var scene = getScene(data.scene);
    if (!scene) return;
    var step = scene.steps.find(function (s) { return s.id === data.id; });
    if (!step) return;
    LM.confirm({
      title: '删除这个步骤？',
      message: '「' + step.text + '」会从步骤清单中移除，已有的打卡历史会保留。',
      confirmLabel: '删除',
      danger: true,
      onConfirm: function () {
        scene.steps = scene.steps.filter(function (s) { return s.id !== data.id; });
        LM.save(true);
        LM.closeSheet();
        LM.refresh();
      }
    });
  };

  LM.actions['scene-add-item'] = function (data) {
    var scene = getScene(data.id);
    if (!scene) return;
    openItemForm(scene, null);
  };
  LM.actions['scene-edit-item'] = function (data) {
    var scene = getScene(data.scene);
    if (!scene) return;
    var item = scene.items.find(function (i) { return i.id === data.id; });
    if (item) openItemForm(scene, item);
  };
  function openItemForm(scene, item) {
    var activeSupplies = LM.state.supplies.filter(function (s) { return LM.supplyState(s) !== 'archived'; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, 'zh-CN'); });
    LM.openSheet({
      title: item ? '编辑必带物品' : '添加必带物品',
      sub: '可以关联用品库，出发前一眼看到余量。',
      large: true,
      body: '<form class="form" id="scene-item-form" data-form="scene-item-save">' +
        '<input type="hidden" name="sceneId" value="' + scene.id + '">' +
        '<input type="hidden" name="itemId" value="' + (item ? item.id : '') + '">' +
        '<div class="field"><label for="scene-item-name">物品名称</label><input class="input" id="scene-item-name" name="name" maxlength="40" placeholder="例如：钥匙" value="' + LM.esc(item ? item.name : '') + '" required></div>' +
        '<div class="field"><label for="scene-item-supply">关联用品库 <span class="optional">可选</span></label>' +
        '<select class="select" id="scene-item-supply" name="supplyId"><option value="">不关联</option>' +
        activeSupplies.map(function (s) {
          return '<option value="' + s.id + '"' + (item && item.supplyId === s.id ? ' selected' : '') + '>' + LM.esc(s.name) + ' · 余 ' + s.quantity + (s.unit || '') + '</option>';
        }).join('') + '</select>' +
        '<p class="form-hint">关联后，在场景里会显示它的当前余量。</p></div>' +
        (item ? '<button type="button" class="btn danger block" data-action="scene-delete-item" data-scene="' + scene.id + '" data-id="' + item.id + '">删除这个物品</button>' : '') +
        '</form>',
      footer: '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="scene-item-form">保存</button>',
      onMount: function (sheet) {
        var select = sheet.querySelector('#scene-item-supply');
        var nameInput = sheet.querySelector('#scene-item-name');
        select.addEventListener('change', function () {
          var s = LM.getSupply(select.value);
          if (s && !nameInput.value.trim()) nameInput.value = s.name;
        });
      }
    });
  }
  LM.forms['scene-item-save'] = function (form, data) {
    var scene = getScene(String(data.get('sceneId') || ''));
    if (!scene) return;
    var itemId = String(data.get('itemId') || '');
    var name = String(data.get('name') || '').trim();
    var supplyId = String(data.get('supplyId') || '');
    if (supplyId && !name) {
      var supply = LM.getSupply(supplyId);
      if (supply) name = supply.name;
    }
    if (!name) { LM.toast('请填写物品名称'); return; }
    if (itemId) {
      var item = scene.items.find(function (i) { return i.id === itemId; });
      if (item) { item.name = name; item.supplyId = supplyId || null; }
    } else {
      scene.items.push({ id: LM.uid('scene_item'), name: name, supplyId: supplyId || null });
    }
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
    LM.toast('必带物品已保存');
  };
  LM.actions['scene-delete-item'] = function (data) {
    var scene = getScene(data.scene);
    if (!scene) return;
    var item = scene.items.find(function (i) { return i.id === data.id; });
    if (!item) return;
    LM.confirm({
      title: '删除这个物品？',
      message: '「' + item.name + '」会从必带清单中移除。',
      confirmLabel: '删除',
      danger: true,
      onConfirm: function () {
        scene.items = scene.items.filter(function (i) { return i.id !== data.id; });
        LM.save(true);
        LM.closeSheet();
        LM.refresh();
      }
    });
  };

  LM.actions['preview-scene-template'] = function (data) {
    var scene = getScene(data.id);
    if (!scene || !scene.template) return;
    var steps = scene.template.steps || [];
    var items = scene.template.items || [];
    LM.openSheet({
      title: '使用「' + scene.name + '」模板',
      sub: '之后可以自由增删和调整顺序。',
      body: '<div class="template-preview"><strong>步骤</strong><br>' + steps.map(function (s, i) { return (i + 1) + '. ' + LM.esc(s); }).join('<br>') + '</div>' +
        '<div class="template-preview"><strong>必带物品</strong><br>' + items.map(function (item) { return '· ' + LM.esc(item); }).join('<br>') + '</div>' +
        '<div class="info-note">应用后会替换这个场景里现有的空清单，不会影响每日打卡记录。</div>',
      footer: '<button type="button" class="btn" data-close>再想想</button><button type="button" class="btn primary" data-action="apply-scene-template" data-id="' + scene.id + '">使用模板</button>'
    });
  };
  LM.actions['apply-scene-template'] = function (data) {
    var scene = getScene(data.id);
    if (!scene || !scene.template) return;
    scene.steps = (scene.template.steps || []).map(function (text) { return { id: LM.uid('scene_step'), text: text }; });
    scene.items = (scene.template.items || []).map(function (name) { return { id: LM.uid('scene_item'), name: name, supplyId: null }; });
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
    LM.toast('模板已填入，可以继续调整');
  };
})();
