/* 生活管家 — 启动与轻提醒 */
(function () {
  'use strict';
  var LM = window.LM;
  var lastDate = LM.todayStr();

  function validRoute() {
    var hash = String(location.hash || '');
    if (!hash) return false;
    var name = hash.replace(/^#\/?/, '').split('/')[0];
    return ['home', 'supplies', 'cleaning', 'scenes', 'shopping', 'habits', 'scene'].indexOf(name) >= 0;
  }

  function boot() {
    if (!validRoute()) history.replaceState(null, '', '#/home');
    LM.ensureCleaningPlan();
    if (LM.ensureHabitDefaults) LM.ensureHabitDefaults();
    LM.save(true);
    LM.render({ scrollTop: true });

    if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
      navigator.serviceWorker.register('./sw.js').catch(function (err) {
        console.warn('离线缓存注册失败，不影响应用使用。', err);
      });
    }

    setTimeout(function () {
      if (LM.checkCleaningReminder) LM.checkCleaningReminder();
    }, 2600);
    setTimeout(function () {
      if (LM.checkHabitReminders) LM.checkHabitReminders();
    }, 1400);

    setInterval(function () {
      if (LM.checkHabitReminders) LM.checkHabitReminders();
    }, 45000);
    setInterval(function () {
      if (LM.checkCleaningReminder) LM.checkCleaningReminder();
    }, 120000);
    setInterval(function () {
      var now = LM.todayStr();
      if (now !== lastDate) {
        lastDate = now;
        if (LM.ensureCleaningPlan) LM.ensureCleaningPlan();
        LM.ui.cleaningMonth = now.slice(0, 7);
        LM.render({ scrollTop: false });
        setTimeout(function () { if (LM.checkCleaningReminder) LM.checkCleaningReminder(); }, 600);
      }
    }, 60000);

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        var now = LM.todayStr();
        if (now !== lastDate) {
          lastDate = now;
          LM.render({ scrollTop: false });
        }
        if (LM.checkHabitReminders) LM.checkHabitReminders();
      }
    });
    window.addEventListener('focus', function () {
      if (LM.checkHabitReminders) LM.checkHabitReminders();
    });
    window.addEventListener('storage', function (event) {
      if (event.key !== LM.storageKey || !event.newValue) return;
      try {
        var next = JSON.parse(event.newValue);
        LM.state = LM.normalizeState(next);
        if (LM.ensureCleaningPlan) LM.ensureCleaningPlan();
        LM.render({ scrollTop: false });
        LM.toast('数据已在另一个标签页更新');
      } catch (err) { /* ignore malformed storage events */ }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
