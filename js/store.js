/* BMChores — état de l'application et persistance (local, prêt pour une synchro future) */
(function () {
  const KEY = 'bmchores:v1';
  const listeners = [];
  let undoStack = null;

  const blank = () => ({
    version: 1,
    onboarded: false,
    currentId: null,
    members: [],
    tasks: [],
    lists: [],
    itemHistory: {},
    meals: {},
    rewards: [],
    redemptions: [],
    infos: [],
    notifs: [],
    settings: { notif: false, summary: true, summaryTime: '08:00', lastSummary: '', notified: {}, theme: 'auto' }
  });

  let state = blank();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = Object.assign(blank(), JSON.parse(raw));
      state.settings = Object.assign(blank().settings, state.settings);
    } catch (e) { console.warn('Lecture impossible, démarrage à vide', e); }
  }

  /* opts.remote : changement reçu de la famille (on ne le renvoie pas) */
  function save(opts) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.error(e); window.App && App.toast('⚠️ Impossible d\'enregistrer (stockage plein ?)'); }
    listeners.forEach(fn => fn());
    if (!(opts && opts.remote) && window.Sync) Sync.push();
  }

  const S = {
    get state() { return state; },
    on(fn) { listeners.push(fn); },
    load, save,

    /* ---------- Membres ---------- */
    me() { return state.members.find(m => m.id === state.currentId) || state.members[0] || null; },
    member(id) { return state.members.find(m => m.id === id); },
    isKid(m) { m = m || S.me(); return !!m && m.role === 'enfant'; },
    addMember(data) {
      const m = Object.assign({ id: U.uid(), name: '', avatar: '🙂', color: BM.COLORS[state.members.length % BM.COLORS.length], role: 'parent', birthday: '', points: 0, pin: '' }, data);
      state.members.push(m);
      if (!state.currentId) state.currentId = m.id;
      save(); return m;
    },
    updateMember(id, data) { Object.assign(S.member(id), data); save(); },
    removeMember(id) {
      state.members = state.members.filter(m => m.id !== id);
      state.tasks.forEach(t => { t.assignees = (t.assignees || []).filter(a => a !== id); });
      if (state.currentId === id) state.currentId = state.members[0] ? state.members[0].id : null;
      save();
    },
    setCurrent(id) { state.currentId = id; save(); },

    /* ---------- Tâches ---------- */
    task(id) { return state.tasks.find(t => t.id === id); },
    addTask(data) {
      const me = S.me();
      const t = Object.assign({
        id: U.uid(), title: '', cat: 'autre', assignees: [], due: '', time: '', repeat: { type: 'none', interval: 1, days: [] },
        reminder: -1, priority: 'normal', points: 0, checklist: [], notes: '', room: '', freq: '',
        done: false, doneAt: null, doneBy: null, history: [], createdBy: me ? me.id : null, createdAt: Date.now()
      }, data);
      if (t.due) t.anchorDay = U.parse(t.due).getDate();
      state.tasks.push(t);
      S.notifyAssignees(t, []);
      save(); return t;
    },
    updateTask(id, data) {
      const t = S.task(id); if (!t) return;
      const before = (t.assignees || []).slice();
      Object.assign(t, data);
      if (data.due) t.anchorDay = U.parse(t.due).getDate();
      S.notifyAssignees(t, before);
      save();
    },
    deleteTask(id) {
      const t = S.task(id);
      undoStack = { type: 'delete', task: JSON.parse(JSON.stringify(t)) };
      state.tasks = state.tasks.filter(x => x.id !== id);
      save();
    },
    completeTask(id, byId) {
      const t = S.task(id); if (!t) return;
      const by = byId || (S.me() && S.me().id);
      undoStack = { type: 'complete', task: JSON.parse(JSON.stringify(t)), by, points: t.points || 0 };
      const isRepeat = t.repeat && t.repeat.type !== 'none' && t.due;
      if (isRepeat) {
        t.history = (t.history || []).concat({ date: t.due, by, at: Date.now() }).slice(-60);
        const today = U.today();
        let next = U.nextOccurrence(t, t.due), guard = 0;
        while (next && next < today && guard++ < 500) next = U.nextOccurrence(t, next);
        t.due = next;
        (t.checklist || []).forEach(c => { c.done = false; });
      } else {
        t.done = true; t.doneAt = Date.now(); t.doneBy = by;
      }
      t.lastDoneAt = Date.now(); t.lastDoneBy = by;
      const m = S.member(by);
      if (m && t.points) m.points = (m.points || 0) + t.points;
      if (t.createdBy && t.createdBy !== by && m) {
        S.pushNotif(t.createdBy, m.avatar + ' ' + m.name + ' a terminé « ' + t.title + ' »', t.id);
      }
      save();
      return isRepeat;
    },
    reopenTask(id) {
      const t = S.task(id); if (!t) return;
      const m = S.member(t.doneBy);
      if (m && t.points) m.points = Math.max(0, (m.points || 0) - t.points);
      t.done = false; t.doneAt = null; t.doneBy = null;
      save();
    },
    canUndo() { return !!undoStack; },
    undo() {
      if (!undoStack) return;
      const u = undoStack; undoStack = null;
      const i = state.tasks.findIndex(x => x.id === u.task.id);
      if (i >= 0) state.tasks[i] = u.task; else state.tasks.push(u.task);
      if (u.type === 'complete') { const m = S.member(u.by); if (m) m.points = Math.max(0, (m.points || 0) - u.points); }
      save();
    },

    /* Tâches ouvertes visibles par le profil courant (les enfants ne voient que les sections adaptées) */
    openTasks() {
      const kid = S.isKid();
      return state.tasks.filter(t => !t.done && (!kid || BM.catById(t.cat).kid || (t.assignees || []).includes(S.me().id)));
    },

    /* ---------- Notifications internes ---------- */
    pushNotif(to, text, taskId) {
      state.notifs.unshift({ id: U.uid(), to, text, taskId: taskId || null, at: Date.now(), read: false });
      state.notifs = state.notifs.slice(0, 150);
    },
    notifyAssignees(t, before) {
      const me = S.me(); if (!me) return;
      (t.assignees || []).forEach(a => {
        if (a !== me.id && !before.includes(a)) S.pushNotif(a, me.avatar + ' ' + me.name + ' t\'a confié : « ' + t.title + ' »', t.id);
      });
    },
    myNotifs() { const me = S.me(); return me ? state.notifs.filter(n => n.to === me.id || n.to === 'all') : []; },
    unreadCount() { return S.myNotifs().filter(n => !n.read).length; },
    markNotifsRead() { S.myNotifs().forEach(n => { n.read = true; }); save(); },

    /* ---------- Listes de courses ---------- */
    list(id) { return state.lists.find(l => l.id === id); },
    addList(name, emoji) { const l = { id: U.uid(), name, emoji: emoji || '🛒', items: [] }; state.lists.push(l); save(); return l; },
    removeList(id) { state.lists = state.lists.filter(l => l.id !== id); save(); },
    addItem(listId, name, qty) {
      const l = S.list(listId); if (!l || !name.trim()) return;
      const key = U.normalize(name);
      const hist = state.itemHistory[key];
      const aisle = hist ? hist.aisle : U.guessAisle(name);
      const existing = l.items.find(i => U.normalize(i.name) === key && !i.checked);
      if (existing) { if (qty) existing.qty = qty; }
      else l.items.push({ id: U.uid(), name: name.trim(), qty: qty || '', aisle, checked: false, by: S.me() ? S.me().id : null, at: Date.now() });
      state.itemHistory[key] = { name: name.trim(), aisle, count: ((hist && hist.count) || 0) + 1 };
      save();
    },
    setItemAisle(listId, itemId, aisle) {
      const it = S.list(listId).items.find(i => i.id === itemId); if (!it) return;
      it.aisle = aisle;
      const h = state.itemHistory[U.normalize(it.name)]; if (h) h.aisle = aisle;
      save();
    },

    /* ---------- Récompenses ---------- */
    redeem(rewardId, memberId) {
      const r = state.rewards.find(x => x.id === rewardId), m = S.member(memberId);
      if (!r || !m || (m.points || 0) < r.cost) return false;
      m.points -= r.cost;
      state.redemptions.unshift({ id: U.uid(), rewardId, title: r.title, emoji: r.emoji, memberId, at: Date.now() });
      state.members.filter(x => x.role === 'parent').forEach(p => S.pushNotif(p.id, m.avatar + ' ' + m.name + ' a choisi sa récompense : ' + r.emoji + ' ' + r.title));
      save(); return true;
    },

    /* ---------- Sauvegarde ---------- */
    exportJSON() { return JSON.stringify(state, null, 2); },
    importJSON(text) {
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.members) || !Array.isArray(data.tasks)) throw new Error('Fichier non reconnu');
      state = Object.assign(blank(), data);
      state.settings = Object.assign(blank().settings, data.settings);
      save();
    },
    reset() { state = blank(); save(); }
  };

  BM.catById = (id) => BM.CATEGORIES.find(c => c.id === id) || BM.CATEGORIES[BM.CATEGORIES.length - 1];
  BM.aisleById = (id) => BM.AISLES.find(a => a.id === id) || BM.AISLES[BM.AISLES.length - 1];
  BM.roomById = (id) => BM.ROOMS.find(r => r.id === id) || BM.ROOMS[BM.ROOMS.length - 1];

  window.S = S;
})();
