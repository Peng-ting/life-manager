/* 预置数据：生活用品库、打扫 SOP、场景 SOP、习惯示例 */
(function () {
  'use strict';

  function pad(n) { return String(n).padStart(2, '0'); }
  function addDays(dateStr, amount) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + amount);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  window.createLifeSeed = function createLifeSeed(today) {
    var purchase = function (offset) { return addDays(today, -offset); };

    var supplyDefs = [
      // 消耗品
      { name: '洗面奶', scene: '洗漱', type: 'consumable', quantity: 1, unit: '瓶', threshold: 1, days: 36, note: '晨间洁面' },
      { name: '卸妆膏', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '罐', threshold: 1, days: 51 },
      { name: '洗脸巾', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '包', threshold: 1, days: 19 },
      { name: '牙刷', scene: '洗漱', type: 'consumable', quantity: 1, unit: '支', threshold: 1, days: 77 },
      { name: '牙膏', scene: '洗漱', type: 'consumable', quantity: 1, unit: '支', threshold: 1, days: 63 },
      { name: '香皂', scene: '洗漱', type: 'consumable', quantity: 1, unit: '块', threshold: 1, days: 104 },
      { name: '身体乳', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '瓶', threshold: 1, days: 45 },
      { name: '搓澡巾', scene: '洗漱', type: 'consumable', quantity: 1, unit: '个', threshold: 1, days: 132 },
      { name: '洗衣凝珠', scene: '清洁', type: 'consumable', quantity: 1, unit: '盒', threshold: 1, days: 28 },
      { name: '洗洁精', scene: '清洁', type: 'consumable', quantity: 1, unit: '瓶', threshold: 1, days: 58 },
      { name: '去污剂', scene: '清洁', type: 'consumable', quantity: 1, unit: '瓶', threshold: 1, days: 91 },
      { name: '马桶清香凝胶', scene: '清洁', type: 'consumable', quantity: 1, unit: '支', threshold: 1, days: 72 },
      { name: '纸巾', scene: '洗漱', type: 'consumable', quantity: 1, unit: '份', threshold: 1, days: 12 },
      { name: '卫生巾', scene: '洗漱', type: 'consumable', quantity: 1, unit: '包', threshold: 1, days: 24 },
      { name: '棉签', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '盒', threshold: 1, days: 83 },
      { name: '爽肤水', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '瓶', threshold: 1, days: 40 },
      { name: '水乳', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '瓶', threshold: 1, days: 61 },
      { name: '乳霜', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '罐', threshold: 1, days: 34 },
      { name: '酒精棉片', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '盒', threshold: 1, days: 111 },
      { name: '洗发水（二合一）', scene: '洗漱', type: 'consumable', quantity: 1, unit: '瓶', threshold: 1, days: 47 },
      { name: '漱口水', scene: '洗漱', type: 'consumable', quantity: 1, unit: '瓶', threshold: 1, days: 69 },
      { name: '消毒剂', scene: '清洁', type: 'consumable', quantity: 1, unit: '瓶', threshold: 1, days: 88 },
      { name: '湿巾', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '包', threshold: 1, days: 15 },
      { name: '护发素', scene: '洗漱', type: 'consumable', quantity: 1, unit: '瓶', threshold: 1, days: 55 },
      { name: '隐形眼镜护理液', scene: '洗漱', type: 'consumable', quantity: 1, unit: '瓶', threshold: 1, days: 42 },
      { name: '散粉', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '盒', threshold: 1, days: 120 },
      { name: '防晒', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '支', threshold: 1, days: 31 },
      { name: '修眉刀', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '把', threshold: 1, days: 160 },
      { name: '湿敷棉', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '盒', threshold: 1, days: 49 },
      { name: '高光', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '块', threshold: 1, days: 201 },
      { name: '素颜霜', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '支', threshold: 1, days: 66 },
      { name: '洗甲水', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '瓶', threshold: 1, days: 144 },
      { name: '双眼皮贴', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '包', threshold: 1, days: 96 },
      { name: '假睫毛', scene: '护肤美妆', type: 'consumable', quantity: 1, unit: '盒', threshold: 1, days: 175 },
      { name: '一次性内裤', scene: '洗漱', type: 'consumable', quantity: 1, unit: '包', threshold: 1, days: 38 },

      // 非消耗品
      { name: '烧水壶', scene: '厨房', type: 'nonconsumable', quantity: 1, unit: '个', threshold: 1, days: 322 },
      { name: '饭盒', scene: '厨房', type: 'nonconsumable', quantity: 1, unit: '个', threshold: 1, days: 243 },
      { name: '锅', scene: '厨房', type: 'nonconsumable', quantity: 1, unit: '口', threshold: 1, days: 401 },
      { name: '衣架', scene: '衣物穿戴', type: 'nonconsumable', quantity: 40, unit: '个', threshold: 8, days: 288 },
      { name: '晾衣架', scene: '衣物穿戴', type: 'nonconsumable', quantity: 1, unit: '个', threshold: 1, days: 266 },
      { name: '收纳盒', scene: '其他', type: 'nonconsumable', quantity: 1, unit: '个', threshold: 1, days: 194 },
      { name: '路由器', scene: '电子设备', type: 'nonconsumable', quantity: 1, unit: '个', threshold: 1, days: 365 },
      { name: '支架', scene: '电子设备', type: 'nonconsumable', quantity: 1, unit: '个', threshold: 1, days: 227 },
      { name: '硅胶垫', scene: '厨房', type: 'nonconsumable', quantity: 1, unit: '张', threshold: 1, days: 176 },
      { name: '泡沫轴', scene: '其他', type: 'nonconsumable', quantity: 1, unit: '个', threshold: 1, days: 211 },
      { name: '台灯', scene: '电子设备', type: 'nonconsumable', quantity: 1, unit: '盏', threshold: 1, days: 432 },
      { name: '插板', scene: '电子设备', type: 'nonconsumable', quantity: 1, unit: '个', threshold: 1, days: 305 },
      { name: '书立', scene: '其他', type: 'nonconsumable', quantity: 1, unit: '对', threshold: 1, days: 187 },
      { name: '行李箱', scene: '出行', type: 'nonconsumable', quantity: 1, unit: '个', threshold: 1, days: 388 },
      { name: '毛毯', scene: '衣物穿戴', type: 'nonconsumable', quantity: 1, unit: '条', threshold: 1, days: 455 },
      { name: '地毯', scene: '其他', type: 'nonconsumable', quantity: 1, unit: '张', threshold: 1, days: 256 },
      { name: '床头罩', scene: '其他', type: 'nonconsumable', quantity: 1, unit: '个', threshold: 1, days: 237 },
      { name: '除螨仪', scene: '清洁', type: 'nonconsumable', quantity: 1, unit: '台', threshold: 1, days: 344 },
      { name: '雨伞', scene: '出行', type: 'nonconsumable', quantity: 2, unit: '把', threshold: 1, days: 129 },
      { name: '围裙', scene: '厨房', type: 'nonconsumable', quantity: 1, unit: '条', threshold: 1, days: 218 },
      { name: 'U盘', scene: '电子设备', type: 'nonconsumable', quantity: 2, unit: '个', threshold: 1, days: 367 },
      { name: '计步器', scene: '电子设备', type: 'nonconsumable', quantity: 1, unit: '个', threshold: 1, days: 279 },
      { name: '手串', scene: '其他', type: 'nonconsumable', quantity: 2, unit: '条', threshold: 1, days: 311 },
      { name: '耳机', scene: '电子设备', type: 'nonconsumable', quantity: 2, unit: '副', threshold: 1, days: 156 },
      { name: '帽子', scene: '衣物穿戴', type: 'nonconsumable', quantity: 3, unit: '顶', threshold: 1, days: 203 },
      { name: '袜子', scene: '衣物穿戴', type: 'nonconsumable', quantity: 6, unit: '双', threshold: 2, days: 94 },
      { name: '内衣', scene: '衣物穿戴', type: 'nonconsumable', quantity: 4, unit: '件', threshold: 2, days: 139 },
      { name: '内裤', scene: '衣物穿戴', type: 'nonconsumable', quantity: 4, unit: '条', threshold: 2, days: 112 },
      { name: '护膝', scene: '衣物穿戴', type: 'nonconsumable', quantity: 2, unit: '副', threshold: 1, days: 264 },
      { name: '便利贴', scene: '其他', type: 'nonconsumable', quantity: 3, unit: '本', threshold: 1, days: 53 },
      { name: '指甲剪', scene: '其他', type: 'nonconsumable', quantity: 8, unit: '个', threshold: 2, days: 289 },
      { name: '书籍', scene: '其他', type: 'nonconsumable', quantity: 1, unit: '份', threshold: 0, days: 500, note: '若干，按批粗记' }
    ];

    var supplies = supplyDefs.map(function (item, index) {
      return {
        id: 'seed_supply_' + String(index + 1).padStart(3, '0'),
        name: item.name,
        scene: item.scene,
        type: item.type,
        quantity: item.quantity,
        unit: item.unit,
        threshold: item.threshold,
        purchaseDate: purchase(item.days),
        status: 'active',
        note: item.note || '',
        createdAt: new Date(today + 'T09:00:00').toISOString(),
        archivedAt: null,
        archivedReason: '',
        replaces: null,
        replacedBy: null
      };
    });

    var idByName = {};
    supplies.forEach(function (s) { idByName[s.name] = s.id; });

    function sceneStep(id, text) { return { id: id, text: text }; }
    function sceneItem(id, name, supplyName) {
      return { id: id, name: name, supplyId: supplyName ? (idByName[supplyName] || null) : null };
    }

    var scenes = [
      {
        id: 'morning',
        name: '早 SOP',
        subtitle: '把出门前的每一步，交给顺序',
        icon: 'sunrise',
        tone: 'blue',
        steps: [
          sceneStep('m_step_1', '烧水、洗脸、刷牙'),
          sceneStep('m_step_2', '护肤、倒水、插卷发棒（110℃）'),
          sceneStep('m_step_3', '打底、粉底、粉饼、腮红、夹睫毛'),
          sceneStep('m_step_4', '卷发、护发精油、耳环'),
          sceneStep('m_step_5', '喝水、检查电器'),
          sceneStep('m_step_6', '出门')
        ],
        items: [
          sceneItem('m_item_1', '手机'),
          sceneItem('m_item_2', '钥匙'),
          sceneItem('m_item_3', '耳机', '耳机'),
          sceneItem('m_item_4', '纸巾', '纸巾')
        ],
        template: null
      },
      {
        id: 'evening',
        name: '晚 SOP',
        subtitle: '把一天慢慢收好，再交给睡眠',
        icon: 'moon',
        tone: 'lilac',
        steps: [
          sceneStep('e_step_1', '锁门、洗澡、取出包内物品'),
          sceneStep('e_step_2', '洗脸、刷牙、护肤、眼部护理'),
          sceneStep('e_step_3', '复盘、晚读、看书'),
          sceneStep('e_step_4', '热敷、拉伸、睡觉')
        ],
        items: [],
        template: null
      },
      {
        id: 'exercise',
        name: '运动 SOP',
        subtitle: '还没填写，先借一份轻盈模板',
        icon: 'activity',
        tone: 'sage',
        steps: [],
        items: [],
        template: {
          steps: ['换运动服、穿好运动鞋', '热身 5 分钟', '完成今日训练', '拉伸放松'],
          items: ['水杯', '毛巾', '耳机', '运动鞋']
        }
      },
      {
        id: 'outing',
        name: '外出 SOP',
        subtitle: '出门前少一点翻找和犹豫',
        icon: 'compass',
        tone: 'sand',
        steps: [],
        items: [],
        template: {
          steps: ['查看天气与路线', '整理随身物品', '确认门窗、燃气和电器', '出发'],
          items: ['手机', '钥匙', '纸巾', '雨伞']
        }
      },
      {
        id: 'study',
        name: '学习 SOP',
        subtitle: '给专注一个干净的开始',
        icon: 'book',
        tone: 'gray',
        steps: [],
        items: [],
        template: {
          steps: ['清理桌面，只留下当前任务', '写下今天要完成的一件事', '专注 25 分钟', '休息 5 分钟', '简短复盘'],
          items: ['笔记本', '笔', '耳机', '水杯']
        }
      }
    ];

    var cleaningSteps = ['整理衣物', '整理床铺', '整理书桌、置物架', '拖地', '打扫卫生间', '换垃圾袋']
      .map(function (text, index) {
        return { id: 'clean_step_' + (index + 1), text: text, builtin: true };
      });

    var habitCategories = [
      { id: 'cat_health', name: '健康', order: 0 },
      { id: 'cat_study', name: '学习', order: 1 },
      { id: 'cat_discipline', name: '自律', order: 2 },
      { id: 'cat_sleep', name: '作息', order: 3 },
      { id: 'cat_other', name: '其他', order: 4 }
    ];

    var habits = [
      {
        id: 'seed_habit_water',
        name: '喝水',
        icon: '',
        color: '#9fb9c4',
        categoryId: 'cat_health',
        freqType: 'count',
        target: 8,
        unit: '杯',
        weeklyTarget: 0,
        reminderTime: '10:00',
        startDate: today,
        note: '小口慢喝，分散到一天里',
        status: 'active',
        createdAt: new Date(today + 'T08:00:00').toISOString(),
        archivedAt: null
      },
      {
        id: 'seed_habit_read',
        name: '阅读',
        icon: '',
        color: '#a9bcaa',
        categoryId: 'cat_study',
        freqType: 'duration',
        target: 30,
        unit: '分钟',
        weeklyTarget: 0,
        reminderTime: '21:30',
        startDate: today,
        note: '读几页也算开始',
        status: 'active',
        createdAt: new Date(today + 'T08:01:00').toISOString(),
        archivedAt: null
      },
      {
        id: 'seed_habit_sleep',
        name: '早睡',
        icon: '',
        color: '#b7b1c4',
        categoryId: 'cat_sleep',
        freqType: 'daily',
        target: 1,
        unit: '次',
        weeklyTarget: 0,
        reminderTime: '23:00',
        startDate: today,
        note: '23:30 前放下手机',
        status: 'active',
        createdAt: new Date(today + 'T08:02:00').toISOString(),
        archivedAt: null
      }
    ];

    return {
      version: 1,
      meta: {
        app: '生活管家',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      settings: {
        birthDate: '',
        ageMode: 'days',
        onboardingSeen: false,
        habitReminders: true,
        cleaningReminders: true,
        browserNotifications: false
      },
      supplies: supplies,
      cleaning: {
        weekday: 6,
        reminderEnabled: true,
        steps: cleaningSteps,
        current: null,
        history: []
      },
      scenes: scenes,
      sceneLogs: {},
      shopping: [],
      habits: habits,
      habitCategories: habitCategories,
      habitLogs: {},
      reminderLog: {
        date: '',
        habitIds: [],
        cleaningDate: ''
      }
    };
  };
})();
