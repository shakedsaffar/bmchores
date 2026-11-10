/* BMChores — rappels et notifications du navigateur */
(function () {
  const N = {};
  let swReg = null;

  N.supported = () => 'Notification' in window;
  N.permission = () => (N.supported() ? Notification.permission : 'unsupported');

  N.init = async () => {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      try { swReg = await navigator.serviceWorker.register('sw.js'); } catch (e) { console.warn('Service worker indisponible', e); }
    }
    N.check();
    setInterval(N.check, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) N.check(); });
  };

  N.request = async () => {
    if (!N.supported()) return 'unsupported';
    const p = await Notification.requestPermission();
    S.state.settings.notif = p === 'granted';
    S.save();
    if (p === 'granted') N.show('BMChores 🏡', 'Les rappels sont activés. On s\'occupe de ta charge mentale !');
    return p;
  };

  N.show = (title, body, tag) => {
    const opts = { body, tag: tag || undefined, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', lang: 'fr' };
    if (N.permission() === 'granted' && S.state.settings.notif) {
      try {
        if (swReg && swReg.showNotification) swReg.showNotification(title, opts);
        else new Notification(title, opts);
        return;
      } catch (e) { /* repli sur la bulle interne */ }
    }
    window.App && App.toast('🔔 ' + body, 6000);
  };

  /* Vérifie les rappels arrivés à échéance (fenêtre de 12 h pour ne pas réveiller de vieux rappels) */
  N.check = () => {
    const st = S.state;
    if (!st.onboarded) return;
    const now = Date.now();
    const notified = st.settings.notified || (st.settings.notified = {});
    let changed = false;

    const me = S.me();
    st.tasks.forEach(t => {
      if (t.done || !t.due || t.reminder == null || t.reminder < 0) return;
      /* Sur chaque appareil, on ne sonne que pour ses propres tâches (ou celles de tout le monde) */
      if (me && t.assignees && t.assignees.length && !t.assignees.includes(me.id)) return;
      const key = t.id + '|' + t.due;
      if (notified[key]) return;
      const at = U.dateTime(t.due, t.time).getTime() - t.reminder * 60000;
      if (now >= at && now - at < 12 * 3600000) {
        const who = (t.assignees || []).map(a => S.member(a)).filter(Boolean).map(m => m.name).join(', ');
        const when = t.time ? U.relDay(t.due) + ' à ' + t.time : U.relDay(t.due);
        N.show(BM.catById(t.cat).emoji + ' ' + t.title, when + (who ? ' · pour ' + who : ''), key);
        notified[key] = now; changed = true;
      }
    });

    /* Résumé du matin */
    const today = U.today();
    if (st.settings.summary && st.settings.lastSummary !== today) {
      const [h, m] = (st.settings.summaryTime || '08:00').split(':').map(Number);
      const d = new Date(); d.setHours(h, m, 0, 0);
      if (now >= d.getTime()) {
        const todo = st.tasks.filter(t => !t.done && t.due && t.due <= today);
        const late = todo.filter(t => t.due < today).length;
        if (todo.length) {
          N.show('☀️ Bonjour la famille !', todo.length + ' chose' + (todo.length > 1 ? 's' : '') + ' au programme aujourd\'hui' + (late ? ' dont ' + late + ' en retard' : '') + '.', 'summary-' + today);
        }
        st.settings.lastSummary = today; changed = true;
      }
    }

    /* Nettoyage des clés anciennes */
    Object.keys(notified).forEach(k => { if (now - notified[k] > 40 * 86400000) delete notified[k]; });
    if (changed) S.save({ remote: true }); // réglages propres à l'appareil : rien à partager
  };

  window.N = N;
})();
