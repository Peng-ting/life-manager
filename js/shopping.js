/* 生活管家 — 模块 4：购物清单 */
(function () {
  'use strict';
  var LM = window.LM;

  var STATUS_META = {
    wish: { label: '想买', tone: 'blue', order: 0 },
    pending: { label: '待决定', tone: 'sand', order: 1 },
    purchased: { label: '已购买', tone: 'sage', order: 2 },
    dropped: { label: '已放弃', tone: 'outline', order: 3 }
  };

  function openItems() {
    return LM.state.shopping.filter(function (item) {
      return item.status === 'wish' || item.status === 'pending';
    });
  }
  LM.shoppingOpenItems = openItems;

  LM.shoppingSummary = function () {
    var counts = { wish: 0, pending: 0, purchased: 0, dropped: 0 };
    LM.state.shopping.forEach(function (item) { if (counts[item.status] != null) counts[item.status] += 1; });
    counts.open = counts.wish + counts.pending;
    return counts;
  };

  function sourceLabel(item) {
    if (item.sourceLabel) return item.sourceLabel;
    var map = {
      consumable_empty: '消耗品用完',
      nonconsumable_replace: '非消耗品需替换',
      restock: '用品补货',
      cleaning_restock: '打扫补货'
    };
    return map[item.source] || '手动添加';
  }

  LM.views.shopping = function () {
    var summary = LM.shoppingSummary();
    var tab = LM.ui.shoppingTab || 'all';
    var tabs = [
      { key: 'all', label: '全部', count: LM.state.shopping.length },
      { key: 'wish', label: '想买', count: summary.wish },
      { key: 'pending', label: '待决定', count: summary.pending },
      { key: 'purchased', label: '已购买', count: summary.purchased },
      { key: 'dropped', label: '已放弃', count: summary.dropped }
    ];
    var groups = ['wish', 'pending', 'purchased', 'dropped'];
    if (tab !== 'all') groups = [tab];
    var groupHtml = groups.map(function (status) {
      var items = LM.state.shopping.filter(function (item) { return item.status === status; });
      if (!items.length) return '';
      return '<section class="shop-group"><div class="shop-group-head"><span class="dot ' + (status === 'purchased' ? 'sage' : status === 'dropped' ? 'muted' : '') + '"></span>' +
        '<span class="shop-group-title">' + STATUS_META[status].label + '</span><span class="shop-group-count">' + items.length + ' 条</span></div>' +
        items.map(shopCard).join('') + '</section>';
    }).join('');
    if (!groupHtml) {
      groupHtml = tab === 'all' ? LM.emptyState({
        icon: 'shopping',
        title: '购物清单是空的',
        text: '想到要买什么就先记下来。平时只攒不买，到购物日再统一决定。',
        action: 'open-shop-add',
        actionLabel: '记一条想买的'
      }) : LM.emptyState({
        icon: 'shopping',
        title: '这一组还没有条目',
        text: '新的想法会被好好收在这里。',
        action: 'open-shop-add',
        actionLabel: '添加一条'
      });
    }
    return LM.pageHeader({
      title: '购物清单',
      sub: '平时只攒，购物日再决定',
      actions: '<button type="button" class="header-add" data-action="open-shop-add" aria-label="添加购物条目">' + LM.icon('plus', 20) + '</button>'
    }) +
      '<div class="shopping-summary">' +
      '<div class="shop-stat"><div class="value">' + summary.wish + '</div><div class="label">想买</div></div>' +
      '<div class="shop-stat"><div class="value">' + summary.pending + '</div><div class="label">待决定</div></div>' +
      '<div class="shop-stat"><div class="value">' + summary.purchased + '</div><div class="label">已购买</div></div>' +
      '</div>' +
      (openItems().length
        ? '<button type="button" class="review-cta" data-action="start-shopping-review">' +
          '<span class="review-icon">' + LM.icon('sparkles', 17) + '</span><span class="grow"><span class="review-title">购物日 · 逐条过清单</span><span class="review-sub">还有 ' + openItems().length + ' 条，做一个小决定就好</span></span><span class="chevron">' + LM.icon('chevronRight', 17) + '</span></button>'
        : '<div class="info-note mb-12">' + LM.icon('leaf', 13) + ' 没有待决定的条目，清单很清爽。</div>') +
      '<div class="chip-row mb-12">' + tabs.map(function (item) {
        return '<button type="button" class="chip ' + (tab === item.key ? 'active' : '') + '" data-action="shop-tab" data-tab="' + item.key + '">' + item.label + ' <span class="count">' + item.count + '</span></button>';
      }).join('') + '</div>' +
      groupHtml +
      '<div class="home-footnote">记录想法，不急着拥有</div>';
  };

  function shopCard(item) {
    var meta = STATUS_META[item.status] || STATUS_META.wish;
    var source = sourceLabel(item);
    var auto = item.source && item.source !== 'manual';
    var statusClass = item.status === 'purchased' ? 'purchased' : item.status === 'dropped' ? 'dropped' : '';
    var actions = '';
    if (item.status === 'wish' || item.status === 'pending') {
      actions = '<div class="shop-decision">' +
        '<button type="button" class="buy" data-action="shop-buy" data-id="' + item.id + '">购买</button>' +
        '<button type="button" data-action="shop-think" data-id="' + item.id + '">再想想</button>' +
        '<button type="button" class="drop" data-action="shop-drop" data-id="' + item.id + '">不买</button>' +
        '</div>';
    } else if (item.status === 'purchased') {
      actions = '<div class="shop-actions">' +
        '<span class="grow tiny muted">' + (item.purchaseDate ? '购于 ' + LM.formatDate(item.purchaseDate, true) : '已购买') + ' · 已同步用品库</span>' +
        '<button type="button" class="mini-action accent" data-action="nav" data-route="supplies">查看用品库</button></div>';
    } else {
      actions = '<div class="shop-actions"><span class="grow tiny muted">已放弃，也可以重新想起</span>' +
        '<button type="button" class="mini-action" data-action="shop-restore" data-id="' + item.id + '">恢复</button></div>';
    }
    return '<article class="shop-card ' + statusClass + '">' +
      '<div class="shop-top"><div class="grow"><div class="shop-name">' + LM.esc(item.name) + '</div>' +
      (item.purpose ? '<div class="shop-purpose">' + LM.esc(item.purpose) + '</div>' : '') + '</div>' +
      '<div class="shop-price">' + LM.esc(LM.priceLabel(item.price)) + '</div>' +
      '<button type="button" class="habit-more" data-action="open-shop-edit" data-id="' + item.id + '" aria-label="编辑条目">' + LM.icon('more', 16) + '</button></div>' +
      '<div class="shop-meta"><span class="badge ' + meta.tone + '">' + meta.label + '</span>' +
      (item.scene ? '<span class="badge outline">' + LM.esc(item.scene) + '</span>' : '') +
      (auto ? '<span class="badge ' + (item.source === 'nonconsumable_replace' ? 'sand' : 'blue') + '">' + LM.esc(source) + '</span>' : '<span class="meta-text">手动添加</span>') +
      '</div>' + actions + '</article>';
  }

  LM.actions['shop-tab'] = function (data) {
    LM.ui.shoppingTab = data.tab;
    LM.refresh();
  };

  LM.actions['open-shop-add'] = function () { openShopForm(null); };
  LM.actions['open-shop-edit'] = function (data) {
    var item = LM.state.shopping.find(function (i) { return i.id === data.id; });
    if (item) openShopForm(item);
  };

  function openShopForm(item) {
    var editing = !!item;
    var scene = item ? item.scene : '护肤美妆';
    LM.openSheet({
      title: editing ? '编辑购物条目' : '记一条想买的',
      sub: editing ? '想清楚用途，再决定要不要拥有。' : '先记下来，不急着买。',
      large: true,
      body: '<form class="form" id="shop-form" data-form="shop-save">' +
        '<input type="hidden" name="id" value="' + (editing ? item.id : '') + '">' +
        '<div class="field"><label for="shop-name">名称</label><input class="input" id="shop-name" name="name" maxlength="50" placeholder="例如：新的洗发水" required value="' + LM.esc(editing ? item.name : '') + '"></div>' +
        '<div class="field"><label for="shop-purpose">用途 <span class="optional">可选</span></label><input class="input" id="shop-purpose" name="purpose" maxlength="80" placeholder="为什么想买它？" value="' + LM.esc(editing ? item.purpose : '') + '"></div>' +
        '<div class="field"><label for="shop-scene">场景</label><select class="select" id="shop-scene" name="scene">' +
        LM.supplyScenes.map(function (s) { return '<option value="' + LM.esc(s) + '"' + (s === scene ? ' selected' : '') + '>' + LM.esc(s) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label for="shop-price">预估价格 <span class="optional">可选</span></label>' +
        '<div class="input-suffix"><input class="input" id="shop-price" name="price" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" value="' + LM.esc(editing ? item.price : '') + '"><span class="suffix">元</span></div></div>' +
        (editing ? '<div class="info-note">当前状态：' + STATUS_META[item.status].label + (item.status === 'purchased' ? ' · 入库记录已保留' : '') + '</div>' : '<p class="form-hint">标记已购买时，会自动同步到生活用品库。</p>') +
        '</form>' +
        (editing ? '<button type="button" class="btn ghost block mt-12" data-action="shop-delete" data-id="' + item.id + '" style="color:var(--danger)">删除这条记录</button>' : ''),
      footer: '<button type="button" class="btn" data-close>取消</button><button type="submit" form="shop-form" class="btn primary">' + (editing ? '保存' : '加入清单') + '</button>'
    });
  }

  LM.forms['shop-save'] = function (form, data) {
    var id = String(data.get('id') || '');
    var name = String(data.get('name') || '').trim();
    var purpose = String(data.get('purpose') || '').trim();
    var scene = String(data.get('scene') || '其他');
    var price = data.get('price') === '' ? '' : Number(data.get('price'));
    if (!name) { LM.toast('请填写名称'); return; }
    if (price !== '' && (!Number.isFinite(price) || price < 0)) { LM.toast('价格需要是非负数字'); return; }
    if (id) {
      var item = LM.state.shopping.find(function (i) { return i.id === id; });
      if (!item) return;
      item.name = name;
      item.purpose = purpose;
      item.scene = scene;
      item.price = price;
    } else {
      LM.state.shopping.unshift({
        id: LM.uid('shop'),
        name: name,
        purpose: purpose,
        scene: scene,
        price: price,
        type: null,
        quantity: 1,
        status: 'wish',
        source: 'manual',
        sourceLabel: '',
        sourceSupplyId: null,
        createdAt: LM.nowISO(),
        decidedAt: null,
        purchaseDate: null,
        supplyId: null
      });
      LM.ui.shoppingTab = 'all';
    }
    LM.save(true);
    LM.closeSheet();
    LM.refresh();
    LM.toast(id ? '条目已更新' : '已加入购物清单');
  };

  LM.actions['shop-delete'] = function (data) {
    var item = LM.state.shopping.find(function (i) { return i.id === data.id; });
    if (!item) return;
    LM.confirm({
      title: '删除这条记录？',
      message: '「' + item.name + '」会从购物清单中移除。已经入库的用品不会受影响。',
      confirmLabel: '删除',
      danger: true,
      onConfirm: function () {
        LM.state.shopping = LM.state.shopping.filter(function (i) { return i.id !== data.id; });
        LM.save(true);
        LM.closeSheet();
        LM.refresh();
        LM.toast('记录已删除');
      }
    });
  };

  LM.actions['shop-think'] = function (data) {
    var item = LM.state.shopping.find(function (i) { return i.id === data.id; });
    if (!item || (item.status !== 'wish' && item.status !== 'pending')) return;
    item.status = 'pending';
    LM.save(true);
    LM.refresh();
    LM.toast('先留在「待决定」里');
  };

  LM.actions['shop-drop'] = function (data) {
    var item = LM.state.shopping.find(function (i) { return i.id === data.id; });
    if (!item) return;
    var prev = item.status;
    item.status = 'dropped';
    item.decidedAt = LM.nowISO();
    LM.save(true);
    LM.refresh();
    LM.toast('已标记「不买」', {
      actionLabel: '撤销',
      onAction: function () {
        item.status = prev;
        item.decidedAt = null;
        LM.save(true);
        LM.refresh();
      }
    });
  };

  LM.actions['shop-restore'] = function (data) {
    var item = LM.state.shopping.find(function (i) { return i.id === data.id; });
    if (!item) return;
    item.status = 'wish';
    item.decidedAt = null;
    LM.save(true);
    LM.refresh();
    LM.toast('已恢复到「想买」');
  };

  /* ---------- purchase ---------- */
  LM.actions['shop-buy'] = function (data) {
    var item = LM.state.shopping.find(function (i) { return i.id === data.id; });
    if (item) openPurchaseSheet(item, false);
  };

  function linkedSupply(item) {
    return item.sourceSupplyId ? LM.getSupply(item.sourceSupplyId) : null;
  }

  function openPurchaseSheet(item, fromReview) {
    var supply = linkedSupply(item);
    var isReplace = item.source === 'nonconsumable_replace';
    var type = item.type || (supply ? supply.type : 'consumable');
    var info = '';
    if (supply) {
      if (isReplace) {
        info = '已关联「' + LM.esc(supply.name) + '」的换新记录。确认后旧记录会归档，新购买记录会进入用品库。';
      } else {
        info = '已关联「' + LM.esc(supply.name) + '」。确认购买后，会把数量补回用品库并更新购买日期。';
      }
    } else {
      info = '确认购买后，会自动创建一条用品库记录，场景为「' + LM.esc(item.scene || '其他') + '」。';
    }
    LM.openSheet({
      title: '标记已购买',
      sub: '补上购买日期，清单就会完成闭环。',
      body: '<div class="info-note">' + info + '</div>' +
        '<form class="form mt-14" id="purchase-form" data-form="shop-purchase-save">' +
        '<input type="hidden" name="id" value="' + item.id + '">' +
        '<input type="hidden" name="fromReview" value="' + (fromReview ? '1' : '') + '">' +
        '<div class="field"><label for="purchase-date">实际购买日期</label><input class="input" id="purchase-date" name="purchaseDate" type="date" max="' + LM.todayStr() + '" value="' + LM.todayStr() + '" required></div>' +
        (!supply ? '<div class="form-section"><div class="form-section-title">入库类型</div><div class="radio-inline">' +
          '<label class="radio-pill"><input type="radio" name="type" value="consumable" ' + (type === 'consumable' ? 'checked' : '') + '><span>消耗品 · 用完补货</span></label>' +
          '<label class="radio-pill"><input type="radio" name="type" value="nonconsumable" ' + (type === 'nonconsumable' ? 'checked' : '') + '><span>非消耗品 · 换新</span></label>' +
          '</div></div>' : '') +
        '<div class="field"><label for="purchase-price">实际价格 <span class="optional">可选</span></label><div class="input-suffix"><input class="input" id="purchase-price" name="price" type="number" min="0" step="0.01" inputmode="decimal" placeholder="不填也可以"><span class="suffix">元</span></div></div>' +
        '</form>',
      footer: '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="purchase-form">确认购买</button>'
    });
  }

  LM.forms['shop-purchase-save'] = function (form, data) {
    var item = LM.state.shopping.find(function (i) { return i.id === String(data.get('id') || ''); });
    if (!item) return;
    var date = String(data.get('purchaseDate') || '');
    if (!LM.validDate(date)) { LM.toast('请选择有效的购买日期'); return; }
    var actualPrice = data.get('price') === '' ? '' : Number(data.get('price'));
    if (actualPrice !== '' && (!Number.isFinite(actualPrice) || actualPrice < 0)) { LM.toast('价格需要是非负数字'); return; }
    var fromReview = data.get('fromReview') === '1';
    var supply = linkedSupply(item);
    var supplyId = null;
    var message = '已购买并同步用品库';
    if (supply && item.source === 'nonconsumable_replace') {
      var newId = LM.uid('supply');
      var now = LM.nowISO();
      var newSupply = {
        id: newId,
        name: supply.name,
        scene: supply.scene,
        type: supply.type,
        quantity: Math.max(1, Number(supply.quantity) || 1),
        unit: supply.unit,
        threshold: supply.threshold,
        purchaseDate: date,
        status: 'active',
        note: supply.note,
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
      supplyId = newId;
      message = '换新完成，旧用品记录已归档';
    } else if (supply) {
      supply.quantity = Math.max(1, (Number(supply.quantity) || 0) + 1);
      if (supply.status !== 'archived') supply.status = 'active';
      supply.purchaseDate = date;
      supplyId = supply.id;
      LM.resolveSupplyShopping(supply.id, supply.id, date);
      message = '已补回「' + supply.name + '」并更新购买日期';
    } else {
      var type = String(data.get('type') || item.type || 'consumable');
      supplyId = LM.uid('supply');
      LM.state.supplies.push({
        id: supplyId,
        name: item.name,
        scene: item.scene || '其他',
        type: type,
        quantity: 1,
        unit: '件',
        threshold: 1,
        purchaseDate: date,
        status: 'active',
        note: '由购物清单购入',
        createdAt: LM.nowISO(),
        archivedAt: null,
        archivedReason: '',
        replaces: null,
        replacedBy: null
      });
      message = '已购买并自动入库';
    }
    item.status = 'purchased';
    item.purchaseDate = date;
    item.decidedAt = LM.nowISO();
    item.supplyId = supplyId;
    if (actualPrice !== '') item.price = actualPrice;
    LM.save(true);

    if (fromReview && LM.ui.review) {
      LM.ui.review.index += 1;
      LM.closeSheet(true);
      setTimeout(function () {
        LM.render({ scrollTop: false });
        renderReviewSheet();
      }, 35);
      return;
    }
    LM.closeSheet();
    LM.refresh();
    LM.toast(message);
  };

  /* ---------- review mode ---------- */
  LM.actions['start-shopping-review'] = function () {
    var ids = openItems().map(function (item) { return item.id; });
    if (!ids.length) {
      LM.toast('没有待决定的条目');
      return;
    }
    LM.ui.review = { ids: ids, index: 0, fromStart: true };
    renderReviewSheet();
  };

  function renderReviewSheet() {
    var review = LM.ui.review;
    if (!review) return;
    if (review.index >= review.ids.length) {
      LM.openSheet({
        title: '购物日复盘完成',
        sub: '做过决定的感觉，会比「再逛一下」更轻。',
        body: '<div class="review-item" style="text-align:center;padding:28px 18px"><div class="empty-icon" style="margin:0 auto 12px;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:var(--sage-soft);color:var(--sage-deep)">' + LM.icon('check', 22) + '</div>' +
          '<div class="review-name" style="font-size:17px">清单过完了</div>' +
          '<p class="review-purpose">一共过了 ' + review.ids.length + ' 条，购买和放下的都清清楚楚。</p></div>' +
          '<div class="info-note">已购买条目已同步进用品库，已放弃的留在清单里作为记录。</div>',
        footer: '<button type="button" class="btn primary" data-action="finish-review">完成</button>',
        hideClose: true,
        backdropClose: false
      });
      return;
    }
    var item = LM.state.shopping.find(function (i) { return i.id === review.ids[review.index]; });
    if (!item) {
      review.index += 1;
      renderReviewSheet();
      return;
    }
    var step = review.index + 1;
    var total = review.ids.length;
    var pct = Math.round((review.index) / total * 100);
    LM.openSheet({
      title: '购物日 · 逐条过清单',
      sub: '第 ' + step + ' / ' + total + ' 条 · 想清楚再决定',
      body: LM.progress(review.index, total) +
        '<div class="review-item"><div class="between"><span class="badge ' + (STATUS_META[item.status] || STATUS_META.wish).tone + '">' + (STATUS_META[item.status] || STATUS_META.wish).label + '</span><span class="tiny muted">' + LM.esc(sourceLabel(item)) + '</span></div>' +
        '<div class="review-name">' + LM.esc(item.name) + '</div>' +
        (item.purpose ? '<div class="review-purpose">' + LM.esc(item.purpose) + '</div>' : '<div class="review-purpose">没有写用途，也可以就在此刻想一下。</div>') +
        '<div class="review-facts"><span class="badge outline">' + LM.esc(item.scene || '未分类') + '</span><span class="badge outline">' + LM.esc(LM.priceLabel(item.price)) + '</span>' +
        (item.source && item.source !== 'manual' ? '<span class="badge blue">来自用品联动</span>' : '') + '</div></div>' +
        '<div class="review-actions">' +
        '<button type="button" class="btn buy" data-action="review-buy" data-id="' + item.id + '">购买</button>' +
        '<button type="button" class="btn" data-action="review-think" data-id="' + item.id + '">再想想</button>' +
        '<button type="button" class="btn ghost" data-action="review-drop" data-id="' + item.id + '">不买</button>' +
        '</div>',
      hideClose: true,
      backdropClose: false,
      footer: '<button type="button" class="btn ghost" data-action="exit-review">先退出</button>'
    });
  }

  LM.actions['review-buy'] = function (data) {
    var item = LM.state.shopping.find(function (i) { return i.id === data.id; });
    if (!item) return;
    openPurchaseSheet(item, true);
  };
  LM.actions['review-think'] = function (data) {
    var item = LM.state.shopping.find(function (i) { return i.id === data.id; });
    if (!item || !LM.ui.review) return;
    item.status = 'pending';
    LM.ui.review.index += 1;
    LM.save(true);
    LM.render({ scrollTop: false });
    renderReviewSheet();
  };
  LM.actions['review-drop'] = function (data) {
    var item = LM.state.shopping.find(function (i) { return i.id === data.id; });
    if (!item || !LM.ui.review) return;
    item.status = 'dropped';
    item.decidedAt = LM.nowISO();
    LM.ui.review.index += 1;
    LM.save(true);
    LM.render({ scrollTop: false });
    renderReviewSheet();
  };
  LM.actions['exit-review'] = function () {
    LM.ui.review = null;
    LM.closeSheet(true);
    LM.refresh();
  };
  LM.actions['finish-review'] = function () {
    LM.ui.review = null;
    LM.closeSheet(true);
    LM.refresh();
    LM.toast('购物日清单已过完');
  };
})();
