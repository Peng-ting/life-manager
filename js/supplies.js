/* 生活管家 — 模块 1：生活用品库 */
(function () {
  'use strict';
  var LM = window.LM;

  var SCENES = ['洗漱', '护肤美妆', '清洁', '厨房', '衣物穿戴', '电子设备', '出行', '其他'];
  var SOURCE_LABELS = {
    consumable_empty: '消耗品用完',
    nonconsumable_replace: '非消耗品需替换',
    restock: '用品补货',
    cleaning_restock: '打扫补货'
  };
  LM.supplyScenes = SCENES;
  LM.supplySourceLabels = SOURCE_LABELS;

  function displayState(supply) {
    if (!supply) return 'active';
    if (supply.status === 'archived') return 'archived';
    if (supply.status === 'toReplace') return 'toReplace';
    if (supply.status === 'toRestock' || Number(supply.quantity) <= 0) return 'low';
    if (Number(supply.threshold) > 0 && Number(supply.quantity) < Number(supply.threshold)) return 'low';
    return 'active';
  }
  LM.supplyState = displayState;

  LM.supplySummary = function () {
    var list = LM.state.supplies;
    var active = 0, low = 0, replace = 0;
    list.forEach(function (s) {
      var st = displayState(s);
      if (st !== 'archived') active += 1;
      if (st === 'low') low += 1;
      if (st === 'toReplace') replace += 1;
    });
    return { active: active, low: low, replace: replace, total: list.length };
  };

  LM.getSupply = function (id) {
    return LM.state.supplies.find(function (s) { return s.id === id; }) || null;
  };

  LM.addShoppingFromSupply = function (supply, source) {
    if (!supply) return null;
    var existing = LM.state.shopping.find(function (item) {
      return item.sourceSupplyId === supply.id && (item.status === 'wish' || item.status === 'pending');
    });
    if (existing) return null;
    var label = SOURCE_LABELS[source] || '用品库';
    var purposeMap = {
      consumable_empty: '用品库 · ' + supply.name + ' 已用完',
      nonconsumable_replace: '用品库 · ' + supply.name + ' 需要换新',
      restock: '用品库 · ' + supply.name + ' 余量偏低',
      cleaning_restock: '打扫时顺手补货 · ' + supply.name
    };
    var item = {
      id: LM.uid('shop'),
      name: supply.name,
      purpose: purposeMap[source] || ('用品库 · ' + supply.name),
      scene: supply.scene,
      price: '',
      type: supply.type,
      quantity: 1,
      status: 'wish',
      source: source || 'manual',
      sourceLabel: label,
      sourceSupplyId: supply.id,
      createdAt: LM.nowISO(),
      decidedAt: null,
      purchaseDate: null,
      supplyId: null
    };
    LM.state.shopping.unshift(item);
    return item.id;
  };

  function removeShoppingItem(id) {
    LM.state.shopping = LM.state.shopping.filter(function (item) { return item.id !== id; });
  }
  LM.removeShoppingItem = removeShoppingItem;

  LM.resolveSupplyShopping = function (supplyId, newSupplyId, date, sourceOnly) {
    LM.state.shopping.forEach(function (item) {
      if (item.sourceSupplyId !== supplyId) return;
      if (item.status !== 'wish' && item.status !== 'pending') return;
      if (sourceOnly && item.source !== sourceOnly) return;
      item.status = 'purchased';
      item.purchaseDate = date;
      item.decidedAt = LM.nowISO();
      item.supplyId = newSupplyId;
      item.syncNote = '已在用品库换新';
    });
  };

  LM.views.supplies = function () {
    var summary = LM.supplySummary();
    var filter = LM.ui.supplyFilter;
    var filtered = LM.state.supplies.filter(function (s) {
      var st = displayState(s);
      if (filter.scene !== 'all' && s.scene !== filter.scene) return false;
      if (filter.status !== 'all' && st !== filter.status) return false;
      return true;
    });
    var priority = { low: 0, toReplace: 1, active: 2, archived: 3 };
    var sceneOrder = {};
    SCENES.forEach(function (scene, index) { sceneOrder[scene] = index; });
    filtered.sort(function (a, b) {
      var pa = priority[displayState(a)];
      var pb = priority[displayState(b)];
      if (pa !== pb) return pa - pb;
      var sa = sceneOrder[a.scene] == null ? 99 : sceneOrder[a.scene];
      var sb = sceneOrder[b.scene] == null ? 99 : sceneOrder[b.scene];
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name, 'zh-CN');
    });
    var statuses = [
      { key: 'all', label: '全部' },
      { key: 'active', label: '在用' },
      { key: 'low', label: '待补货' },
      { key: 'toReplace', label: '待替换' },
      { key: 'archived', label: '已归档' }
    ];
    var cards = filtered.map(supplyCard).join('');
    return LM.pageHeader({
      title: '生活用品库',
      sub: '按场景整理，知道手里有什么',
      actions: '<button type="button" class="header-add" data-action="open-supply-add" aria-label="添加用品">' + LM.icon('plus', 20) + '</button>'
    }) +
      '<div class="supply-summary">' +
      '<div class="supply-stat"><div class="num">' + summary.active + '</div><div class="lbl">件在用</div></div>' +
      '<div class="supply-stat"><div class="num" style="color:var(--danger)">' + summary.low + '</div><div class="lbl">待补货</div></div>' +
      '<div class="supply-stat"><div class="num" style="color:#8e7a5e">' + summary.replace + '</div><div class="lbl">待替换</div></div>' +
      '</div>' +
      '<div class="filters">' +
      '<div class="chip-row">' + statuses.map(function (st) {
        var count = st.key === 'all' ? LM.state.supplies.length : LM.state.supplies.filter(function (s) { return displayState(s) === st.key; }).length;
        return '<button type="button" class="chip ' + (filter.status === st.key ? 'active' : '') + '" data-action="supply-filter-status" data-status="' + st.key + '">' + st.label + ' <span class="count">' + count + '</span></button>';
      }).join('') + '</div>' +
      '<div class="filter-line"><select class="scene-select" data-supply-scene-filter aria-label="按场景筛选">' +
      '<option value="all"' + (filter.scene === 'all' ? ' selected' : '') + '>全部场景</option>' +
      SCENES.map(function (scene) {
        return '<option value="' + LM.esc(scene) + '"' + (filter.scene === scene ? ' selected' : '') + '>' + LM.esc(scene) + '</option>';
      }).join('') +
      '</select></div></div>' +
      (filtered.length ? '<div class="supply-list">' + cards + '</div>' : LM.emptyState({
        icon: 'supplies',
        title: filter.scene === 'all' && filter.status === 'all' ? '用品库还是空的' : '这个筛选下没有用品',
        text: filter.scene === 'all' && filter.status === 'all' ? '从一瓶洗面奶、一副耳机开始，慢慢建起自己的生活清单。' : '换一个场景或状态看看。',
        action: 'open-supply-add',
        actionLabel: '添加一件用品'
      }));
  };

  function supplyCard(supply) {
    var st = displayState(supply);
    var low = st === 'low';
    var replace = st === 'toReplace';
    var archived = st === 'archived';
    var statusLabel = archived ? '已归档' : replace ? '待替换' : low ? (Number(supply.quantity) <= 0 ? '已用完' : '待补货') : '在用';
    var badgeClass = archived ? 'outline' : replace ? 'sand' : low ? 'danger' : 'sage';
    var thresholdText = supply.threshold > 0 ? '低于 ' + supply.threshold + ' 时提醒' : '不设余量提醒';
    var footNote = '';
    if (archived) {
      footNote = '归档于 ' + LM.formatDate((supply.archivedAt || '').slice(0, 10), true) + (supply.archivedReason === 'replaced' ? ' · 已换新' : '');
    } else if (replace) {
      footNote = '已加入购物清单 · 购新后记得登记日期';
    } else if (low) {
      footNote = supply.quantity <= 0 ? '已用完 · 已加入购物清单' : '低于提醒阈值';
    } else {
      footNote = '购于 ' + (supply.purchaseDate ? LM.formatDate(supply.purchaseDate, true) : '未记录');
    }
    var actions = '';
    if (archived) {
      actions = '<button type="button" class="mini-action" data-action="supply-restore" data-id="' + supply.id + '">' + LM.icon('undo', 12) + '恢复</button>';
    } else if (replace) {
      actions = '<button type="button" class="mini-action accent" data-action="open-supply-replace" data-id="' + supply.id + '">换新登记</button>' +
        '<button type="button" class="mini-action icon-only" data-action="open-supply-edit" data-id="' + supply.id + '" aria-label="编辑">' + LM.icon('edit', 13) + '</button>';
    } else {
      if (supply.type === 'consumable') {
        if (Number(supply.quantity) > 0) {
          actions = '<button type="button" class="mini-action warn" data-action="supply-done" data-id="' + supply.id + '">用完</button>';
        }
      } else {
        actions = '<button type="button" class="mini-action warn" data-action="supply-replace-needed" data-id="' + supply.id + '">需替换</button>';
      }
      if (low) {
        actions += '<button type="button" class="mini-action accent" data-action="supply-restock" data-id="' + supply.id + '">补货</button>';
      }
      actions += '<button type="button" class="mini-action icon-only" data-action="open-supply-edit" data-id="' + supply.id + '" aria-label="编辑">' + LM.icon('edit', 13) + '</button>';
    }
    return '<article class="supply-card ' + (low ? 'is-low' : '') + ' ' + (replace ? 'is-replace' : '') + ' ' + (archived ? 'is-archived' : '') + '">' +
      '<div class="supply-top"><span class="supply-status-dot"></span><div class="grow"><div class="supply-name">' + LM.esc(supply.name) + '</div>' +
      '<div class="supply-meta"><span>' + LM.esc(supply.scene) + '</span><span>' + (supply.type === 'consumable' ? '消耗品' : '非消耗品') + '</span>' +
      '<span class="badge ' + badgeClass + '">' + statusLabel + '</span></div></div>' +
      '<div class="supply-qty"><span class="qty-num">' + LM.esc(supply.quantity) + '</span><span class="qty-unit">' + LM.esc(supply.unit || '件') + '</span>' +
      '<div class="qty-note">' + LM.esc(thresholdText) + '</div></div></div>' +
      (supply.note ? '<div class="form-hint mt-6">' + LM.esc(supply.note) + '</div>' : '') +
      '<div class="supply-foot"><span class="foot-note">' + LM.esc(footNote) + '</span><div class="supply-actions">' + actions + '</div></div>' +
      '</article>';
  }

  LM.actions['supply-filter-status'] = function (data) {
    LM.ui.supplyFilter.status = data.status;
    LM.refresh();
  };
  document.addEventListener('change', function (e) {
    if (e.target.matches('[data-supply-scene-filter]')) {
      LM.ui.supplyFilter.scene = e.target.value;
      LM.refresh();
    }
  });

  LM.actions['open-supply-add'] = function () { openSupplyForm(null); };
  LM.actions['open-supply-edit'] = function (data) { openSupplyForm(LM.getSupply(data.id)); };

  function openSupplyForm(supply) {
    var isEdit = !!supply;
    var type = supply ? supply.type : 'consumable';
    var scene = supply ? supply.scene : '洗漱';
    LM.openSheet({
      title: isEdit ? '编辑用品' : '添加一件用品',
      sub: isEdit ? '改动会立即保存到本机。' : '先记下名字、场景和数量，其余可以慢慢补。',
      large: true,
      body: '<form class="form" id="supply-form" data-form="supply-save">' +
        '<input type="hidden" name="id" value="' + LM.esc(isEdit ? supply.id : '') + '">' +
        '<div class="field"><label for="supply-name">名称</label>' +
        '<input class="input" id="supply-name" name="name" maxlength="40" placeholder="例如：洗面奶" required value="' + LM.esc(isEdit ? supply.name : '') + '"></div>' +
        '<div class="field"><label>场景</label><select class="select" name="scene" required>' +
        SCENES.map(function (s) { return '<option value="' + LM.esc(s) + '"' + (s === scene ? ' selected' : '') + '>' + LM.esc(s) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><span class="field-label">类型</span><div class="radio-cards two">' +
        '<label class="radio-card ' + (type === 'consumable' ? 'checked' : '') + '"><input type="radio" name="type" value="consumable" ' + (type === 'consumable' ? 'checked' : '') + '><span class="radio-title">消耗品</span><span class="radio-sub">用完 → 补货</span></label>' +
        '<label class="radio-card ' + (type === 'nonconsumable' ? 'checked' : '') + '"><input type="radio" name="type" value="nonconsumable" ' + (type === 'nonconsumable' ? 'checked' : '') + '><span class="radio-title">非消耗品</span><span class="radio-sub">坏了 → 换新</span></label>' +
        '</div></div>' +
        '<div class="field-grid">' +
        '<div class="field"><label for="supply-qty">数量（必填）</label>' +
        '<div class="input-suffix"><input class="input" id="supply-qty" name="quantity" type="number" inputmode="decimal" min="0" step="1" required value="' + LM.esc(isEdit ? supply.quantity : 1) + '"><span class="suffix" data-unit-preview>' + LM.esc(isEdit ? (supply.unit || '件') : '件') + '</span></div></div>' +
        '<div class="field"><label for="supply-unit">单位</label><input class="input" id="supply-unit" name="unit" maxlength="4" placeholder="件 / 包 / 双" value="' + LM.esc(isEdit ? (supply.unit || '') : '') + '"></div>' +
        '</div>' +
        '<div class="field"><label for="supply-date">购买日期</label><input class="input" id="supply-date" type="date" name="purchaseDate" max="' + LM.todayStr() + '" value="' + LM.esc(isEdit ? supply.purchaseDate : LM.todayStr()) + '"></div>' +
        '<div class="form-section"><div class="form-section-title">余量提醒</div>' +
        '<div class="field"><label for="supply-threshold">低于阈值时提醒 <span class="optional">0 表示不提醒</span></label>' +
        '<div class="input-suffix"><input class="input" id="supply-threshold" name="threshold" type="number" inputmode="numeric" min="0" step="1" value="' + LM.esc(isEdit ? supply.threshold : 1) + '"><span class="suffix" data-threshold-unit>' + LM.esc(isEdit ? (supply.unit || '件') : '件') + '</span></div>' +
        '<p class="form-hint">数量低于这个值时，会标记为「待补货」。</p></div>' +
        '<div class="field"><label for="supply-note">备注 <span class="optional">可选</span></label><textarea class="textarea" id="supply-note" name="note" maxlength="120" placeholder="放在哪里 / 用在哪里 / 偏好">' + LM.esc(isEdit ? supply.note : '') + '</textarea></div>' +
        (isEdit ? '<button type="button" class="btn ghost block mt-10" data-action="supply-archive" data-id="' + supply.id + '" style="color:var(--danger)">归档此用品</button>' : '') +
        '</div></form>',
      footer: '<button type="button" class="btn" data-close>取消</button><button type="submit" form="supply-form" class="btn primary">' + (isEdit ? '保存' : '添加用品') + '</button>',
      onMount: function (sheet) {
        var unitInput = sheet.querySelector('#supply-unit');
        var preview = sheet.querySelector('[data-unit-preview]');
        var thresholdUnit = sheet.querySelector('[data-threshold-unit]');
        if (unitInput && preview) {
          unitInput.addEventListener('input', function () {
            var unit = unitInput.value.trim() || '件';
            preview.textContent = unit;
            if (thresholdUnit) thresholdUnit.textContent = unit;
          });
        }
      }
    });
  }

  LM.forms['supply-save'] = function (form, data) {
    var id = String(data.get('id') || '');
    var name = String(data.get('name') || '').trim();
    var scene = String(data.get('scene') || '其他');
    var type = String(data.get('type') || 'consumable');
    var quantity = Number(data.get('quantity'));
    var unit = String(data.get('unit') || '').trim() || '件';
    var threshold = Math.max(0, LM.safeInt(data.get('threshold'), 0));
    var purchaseDate = String(data.get('purchaseDate') || '') || LM.todayStr();
    var note = String(data.get('note') || '').trim();
    if (!name) { LM.toast('请填写用品名称'); return; }
    if (!Number.isFinite(quantity) || quantity < 0) { LM.toast('数量需要是非负数字'); return; }
    if (!LM.validDate(purchaseDate)) { LM.toast('请选择有效的购买日期'); return; }
    if (id) {
      var supply = LM.getSupply(id);
      if (!supply) return;
      supply.name = name;
      supply.scene = scene;
      supply.type = type;
      supply.quantity = quantity;
      supply.unit = unit;
      supply.threshold = threshold;
      supply.purchaseDate = purchaseDate;
      supply.note = note;
      if (supply.status === 'toRestock' && quantity > 0) supply.status = 'active';
    } else {
      LM.state.supplies.push({
        id: LM.uid('supply'),
        name: name,
        scene: scene,
        type: type,
        quantity: quantity,
        unit: unit,
        threshold: threshold,
        purchaseDate: purchaseDate,
        status: 'active',
        note: note,
        createdAt: LM.nowISO(),
        archivedAt: null,
        archivedReason: '',
        replaces: null,
        replacedBy: null
      });
    }
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
    LM.toast(id ? '用品已更新' : '已添加「' + name + '」');
  };

  LM.actions['supply-done'] = function (data) {
    var supply = LM.getSupply(data.id);
    if (!supply || supply.status === 'archived') return;
    var prev = { quantity: supply.quantity, status: supply.status };
    supply.quantity = 0;
    supply.status = 'toRestock';
    var shopId = LM.addShoppingFromSupply(supply, 'consumable_empty');
    LM.save(true);
    LM.refresh();
    LM.toast('「' + supply.name + '」已用完，加入购物清单', {
      actionLabel: '撤销',
      onAction: function () {
        var current = LM.getSupply(supply.id);
        if (current) { current.quantity = prev.quantity; current.status = prev.status; }
        if (shopId) removeShoppingItem(shopId);
        LM.save(true);
        LM.refresh();
      }
    });
  };

  LM.actions['supply-replace-needed'] = function (data) {
    var supply = LM.getSupply(data.id);
    if (!supply || supply.status === 'archived') return;
    var prevStatus = supply.status;
    supply.status = 'toReplace';
    var shopId = LM.addShoppingFromSupply(supply, 'nonconsumable_replace');
    LM.save(true);
    LM.refresh();
    LM.toast('「' + supply.name + '」已标记需替换', {
      actionLabel: '撤销',
      onAction: function () {
        var current = LM.getSupply(supply.id);
        if (current) current.status = prevStatus;
        if (shopId) removeShoppingItem(shopId);
        LM.save(true);
        LM.refresh();
      }
    });
  };

  LM.actions['supply-restock'] = function (data) {
    var supply = LM.getSupply(data.id);
    if (!supply) return;
    var shopId = LM.addShoppingFromSupply(supply, 'restock');
    LM.save(true);
    LM.refresh();
    if (shopId) LM.toast('已把「' + supply.name + '」放入购物清单');
    else LM.toast('购物清单里已经有这件用品了');
  };

  LM.actions['open-supply-replace'] = function (data) {
    var supply = LM.getSupply(data.id);
    if (!supply) return;
    LM.openSheet({
      title: '换新登记',
      sub: '旧记录会归档保留，不会丢失历史。',
      body: '<div class="info-note">将为「' + LM.esc(supply.name) + '」新建一条购买记录，并把旧记录归档。</div>' +
        '<form class="form mt-14" id="replace-form" data-form="supply-replace-save">' +
        '<input type="hidden" name="id" value="' + supply.id + '">' +
        '<div class="field"><label for="replace-date">新购买日期</label><input class="input" id="replace-date" type="date" name="purchaseDate" max="' + LM.todayStr() + '" value="' + LM.todayStr() + '" required></div>' +
        '<div class="field"><label for="replace-note">备注 <span class="optional">可选</span></label><input class="input" id="replace-note" name="note" maxlength="80" placeholder="例如：换成更轻的款式"></div>' +
        '</form>',
      footer: '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="replace-form">完成换新</button>'
    });
  };

  LM.forms['supply-replace-save'] = function (form, data) {
    var supply = LM.getSupply(String(data.get('id') || ''));
    if (!supply) return;
    var date = String(data.get('purchaseDate') || '');
    if (!LM.validDate(date)) { LM.toast('请选择有效的购买日期'); return; }
    var note = String(data.get('note') || '').trim();
    var oldQty = Number(supply.quantity) || 1;
    var now = LM.nowISO();
    var newId = LM.uid('supply');
    var newSupply = {
      id: newId,
      name: supply.name,
      scene: supply.scene,
      type: supply.type,
      quantity: Math.max(1, oldQty),
      unit: supply.unit,
      threshold: supply.threshold,
      purchaseDate: date,
      status: 'active',
      note: note || supply.note,
      createdAt: now,
      archivedAt: null,
      archivedReason: '',
      replaces: supply.id,
      replacedBy: null
    };
    supply.status = 'archived';
    supply.archivedAt = now;
    supply.archivedReason = 'replaced';
    supply.replacedBy = newId;
    LM.state.supplies.push(newSupply);
    LM.resolveSupplyShopping(supply.id, newId, date);
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
    LM.toast('换新完成，旧记录已归档');
  };

  LM.actions['supply-restore'] = function (data) {
    var supply = LM.getSupply(data.id);
    if (!supply) return;
    supply.status = 'active';
    supply.archivedAt = null;
    supply.archivedReason = '';
    LM.save(true);
    LM.refresh();
    LM.toast('已恢复到在用');
  };

  LM.actions['supply-archive'] = function (data) {
    var supply = LM.getSupply(data.id);
    if (!supply) return;
    LM.confirm({
      title: '归档这件用品？',
      message: '「' + supply.name + '」会移到「已归档」，历史记录仍会保留。',
      confirmLabel: '归档',
      danger: false,
      onConfirm: function () {
        supply.status = 'archived';
        supply.archivedAt = LM.nowISO();
        supply.archivedReason = 'manual';
        LM.save(true);
        LM.closeSheet();
        LM.refresh();
        LM.toast('已归档');
      }
    });
  };
})();
