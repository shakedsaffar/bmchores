/* BMChores — coquille de l'application : navigation, fenêtres, éditeur de tâche, actions */
(function () {
  const App = {};
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  App.$ = $; App.$$ = $$;

  App.NAV = [
    { id: 'accueil', label: 'Accueil', emoji: '🏡', kid: true, tab: true },
    { id: 'taches', label: 'Tâches', kidLabel: 'Mes missions', emoji: '✅', kid: true, tab: true },
    { id: 'agenda', label: 'Agenda', emoji: '📅', kid: true, tab: true },
    { id: 'courses', label: 'Courses', emoji: '🛒', kid: true, tab: true },
    { id: 'menage', label: 'Ménage', emoji: '🧽', kid: true },
    { id: 'repas', label: 'Repas', emoji: '🍽️', kid: true },
    { id: 'sections', label: 'Sections', emoji: '🗂️', kid: false },
    { id: 'recompenses', label: 'Récompenses', emoji: '🏆', kid: true, kidTab: true },
    { id: 'famille', label: 'Famille', emoji: '👨‍👩‍👦', kid: false },
    { id: 'infos', label: 'Infos utiles', emoji: '📒', kid: false },
    { id: 'reglages', label: 'Réglages', emoji: '⚙️', kid: false }
  ];

  /* ---------- Routage ---------- */
  App.route = () => {
    const h = (location.hash || '#/accueil').replace(/^#\/?/, '');
    const [name, ...rest] = h.split('/');
    return { name: name || 'accueil', params: rest.map(decodeURIComponent) };
  };
  App.go = (path) => { location.hash = '#/' + path; };

  App.render = () => {
    const st = S.state;
    document.documentElement.dataset.theme = st.settings.theme === 'auto' ? '' : st.settings.theme;
    if (!st.onboarded || !st.members.length) { $('#app').innerHTML = Views.onboarding(); return; }
    const r = App.route();
    const kid = S.isKid();
    let name = r.name;
    const navItem = App.NAV.find(n => n.id === name);
    if (kid && navItem && !navItem.kid) name = 'accueil';
    const view = Views[name] || Views.accueil;
    if (!$('#shell')) $('#app').innerHTML = App.shell();
    App.renderChrome(name);
    const main = $('#view');
    const scroll = main.dataset.route === name + r.params.join('/') ? window.scrollY : 0;
    main.innerHTML = view(...r.params);
    main.dataset.route = name + r.params.join('/');
    window.scrollTo(0, scroll);
    if (Views.after[name]) Views.after[name](...r.params);
  };

  App.shell = () => `
    <div id="shell" class="shell">
      <aside class="sidebar" id="sidebar"></aside>
      <div class="main-col">
        <header class="topbar">
          <a class="brand" href="#/accueil" aria-label="Accueil BMChores"><span class="brand-logo">🏡</span><span class="brand-name">BM<b>Chores</b></span></a>
          <div class="topbar-actions">
            <a class="icon-btn sync-ind" id="sync-ind" href="#/reglages" hidden aria-label="État de la synchronisation">☁️<i></i></a>
            <button class="icon-btn" data-action="open-notifs" aria-label="Notifications" id="bell">🔔<span class="badge" id="bell-badge" hidden></span></button>
            <button class="me-btn" data-action="switch-profile" id="me-btn" aria-label="Changer de profil"></button>
          </div>
        </header>
        <main id="view" class="view" tabindex="-1"></main>
      </div>
      <nav class="tabbar" id="tabbar" aria-label="Navigation principale"></nav>
      <button class="fab" data-action="new-task" aria-label="Ajouter une tâche">＋</button>
    </div>`;

  App.renderChrome = (active) => {
    const kid = S.isKid();
    const me = S.me();
    const items = App.NAV.filter(n => !kid || n.kid);
    const label = (n) => (kid && n.kidLabel) || n.label;
    $('#sidebar').innerHTML = `
      <a class="brand side-brand" href="#/accueil"><span class="brand-logo">🏡</span><span class="brand-name">BM<b>Chores</b></span></a>
      <nav class="side-nav">${items.map(n => `<a href="#/${n.id}" class="side-link ${n.id === active ? 'active' : ''}"><span>${n.emoji}</span>${label(n)}</a>`).join('')}</nav>
      <div class="side-foot">Fait avec ❤️ pour la famille</div>`;
    const tabs = items.filter(n => kid ? (n.tab || n.kidTab) : n.tab);
    const moreActive = !tabs.some(n => n.id === active);
    $('#tabbar').innerHTML = tabs.map(n => `<a href="#/${n.id}" class="tab ${n.id === active ? 'active' : ''}"><span class="tab-ico">${n.emoji}</span><span class="tab-lbl">${label(n)}</span></a>`).join('')
      + (kid ? '' : `<a href="#/plus" class="tab ${moreActive ? 'active' : ''}"><span class="tab-ico">☰</span><span class="tab-lbl">Plus</span></a>`);
    $('#me-btn').innerHTML = me ? App.avatar(me, 'sm') + `<span class="me-name">${U.esc(me.name)}</span>` : '';
    const si = $('#sync-ind');
    if (si && window.Sync) { si.hidden = !Sync.configured() || Sync.status === 'off'; si.dataset.s = Sync.status; }
    const n = S.unreadCount();
    const b = $('#bell-badge'); b.hidden = !n; b.textContent = n > 9 ? '9+' : n;
    document.body.classList.toggle('kid-mode', kid);
    document.title = 'BMChores';
  };

  /* ---------- Composants partagés ---------- */
  App.avatar = (m, size) => m ? `<span class="avatar ${size || ''}" style="--c:${m.color}" title="${U.esc(m.name)}">${m.avatar}</span>` : '';

  App.taskItem = (t, opts) => {
    opts = opts || {};
    const cat = BM.catById(t.cat);
    const today = U.today();
    const late = t.due && t.due < today && !t.done;
    const people = (t.assignees || []).map(S.member).filter(Boolean);
    const sub = t.checklist && t.checklist.length ? `<span class="chip-mini">☑️ ${t.checklist.filter(c => c.done).length}/${t.checklist.length}</span>` : '';
    const dateLbl = opts.date ? U.relDay(opts.date) : (t.due ? U.relDay(t.due) : '');
    return `
      <li class="task ${t.done ? 'is-done' : ''} ${late ? 'is-late' : ''} ${t.priority === 'high' ? 'is-high' : ''}" style="--cat:${cat.color}">
        ${opts.preview ? '<span class="check preview" title="Occurrence à venir">🔁</span>' : `<button class="check" data-action="toggle-task" data-id="${t.id}" aria-label="${t.done ? 'Rouvrir' : 'Terminer'} ${U.esc(t.title)}">${t.done ? '✓' : ''}</button>`}
        <div class="task-body" data-action="edit-task" data-id="${t.id}">
          <div class="task-title">${t.priority === 'high' ? '<span class="prio" title="Important">❗</span>' : ''}${U.esc(t.title)}</div>
          <div class="task-meta">
            <span class="cat-tag">${cat.emoji} ${cat.label}</span>
            ${dateLbl && !opts.hideDate ? `<span class="${late ? 'late' : ''}">📆 ${dateLbl}${t.time ? ' · ' + t.time : ''}</span>` : (t.time ? `<span>🕑 ${t.time}</span>` : '')}
            ${t.repeat && t.repeat.type !== 'none' ? `<span title="${U.esc(U.repeatLabel(t.repeat))}">🔁</span>` : ''}
            ${t.reminder >= 0 ? '<span title="Rappel">🔔</span>' : ''}
            ${t.points ? `<span class="pts">⭐ ${t.points}</span>` : ''}
            ${sub}
          </div>
        </div>
        <div class="task-people">${people.map(p => App.avatar(p, 'xs')).join('')}</div>
      </li>`;
  };

  App.empty = (emoji, text, btn) => `<div class="empty"><div class="empty-emoji">${emoji}</div><p>${text}</p>${btn || ''}</div>`;

  /* ---------- Fenêtre modale ---------- */
  App.modal = (html, opts) => {
    opts = opts || {};
    App.closeModal();
    const root = document.createElement('div');
    root.className = 'modal-backdrop';
    root.id = 'modal';
    root.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(root);
    document.body.classList.add('no-scroll');
    root.addEventListener('mousedown', (e) => { if (e.target === root) App.closeModal(); });
    const first = root.querySelector('[autofocus]') || root.querySelector('input,select,textarea,button');
    if (first && window.innerWidth > 700) setTimeout(() => first.focus(), 30);
    if (opts.onMount) opts.onMount(root);
    return root;
  };
  App.closeModal = () => { const m = $('#modal'); if (m) m.remove(); document.body.classList.remove('no-scroll'); };

  App.confirm = (text, okLabel) => new Promise((resolve) => {
    App.modal(`<h2 class="modal-title">${text}</h2><div class="modal-actions"><button class="btn ghost" data-r="0">Annuler</button><button class="btn danger" data-r="1">${okLabel || 'Confirmer'}</button></div>`, {
      onMount: (root) => root.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { App.closeModal(); resolve(b.dataset.r === '1'); }))
    });
  });

  App.toast = (text, ms, action) => {
    let wrap = $('#toasts');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toasts'; wrap.className = 'toasts'; wrap.setAttribute('role', 'status'); document.body.appendChild(wrap); }
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>${U.esc(text)}</span>` + (action ? `<button class="toast-btn">${U.esc(action.label)}</button>` : '');
    if (action) el.querySelector('button').addEventListener('click', () => { action.fn(); el.remove(); });
    wrap.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms || 3200);
  };

  App.confetti = () => {
    const colors = ['#FF7A8A', '#FFB547', '#2EC4B6', '#6C8CFF', '#9B8AFB', '#4CAF50'];
    const box = document.createElement('div');
    box.className = 'confetti';
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('i');
      s.style.left = Math.random() * 100 + 'vw';
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = Math.random() * 0.3 + 's';
      s.style.animationDuration = 1.2 + Math.random() * 1 + 's';
      s.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2600);
  };

  /* ---------- Saisie rapide : « Sortir les poubelles @Papa demain 19h » ---------- */
  const CAT_WORDS = {
    sante: ['dentiste','médecin','medecin','pédiatre','vaccin','ordonnance','pharmacie','mutuelle','ophtalmo','orthophoniste','kiné'],
    ecole: ['école','ecole','devoirs','cartable','cantine','maîtresse','maitresse','prof','réunion parents','fournitures','crèche','creche','nounou'],
    menage: ['ménage','menage','aspirateur','aspirer','serpillière','poussière','lessive','linge','vaisselle','nettoyer','ranger'],
    repas: ['repas','dîner','diner','déjeuner','cuisiner','menu','goûter','gouter','recette'],
    animaux: ['chat','chien','véto','veto','vétérinaire','croquettes','litière','poisson rouge','lapin'],
    finances: ['payer','facture','banque','impôt','impot','budget','virement','remboursement'],
    maison: ['plombier','électricien','réparer','chaudière','poubelle','ampoule','bricolage','travaux'],
    admin: ['passeport','carte d\'identité','papiers','dossier','caf','formulaire','attestation','mairie'],
    vacances: ['vacances','valise','réserver','billet','hôtel','hotel'],
    fetes: ['anniversaire','cadeau','fête','fete','noël','noel'],
    voiture: ['voiture','garage','pneu','contrôle technique','essence','vidange'],
    weekend: ['week-end','weekend','samedi','dimanche'],
    loisirs: ['piscine','foot','judo','danse','musique','cinéma','cinema','musée','sortie']
  };
  App.guessCat = (title) => {
    const n = U.normalize(title);
    for (const [cat, words] of Object.entries(CAT_WORDS)) if (words.some(w => n.includes(U.normalize(w)))) return cat;
    return 'autre';
  };

  App.parseQuick = (text) => {
    let title = ' ' + text + ' ';
    const out = { assignees: [], due: '', time: '' };
    title = title.split(' ').filter(tok => {
      if (tok.length < 2 || tok[0] !== '@') return true;
      const n = U.normalize(tok.slice(1));
      const m = S.state.members.find(x => U.normalize(x.name) === n) || S.state.members.find(x => U.normalize(x.name).startsWith(n));
      if (m) { if (!out.assignees.includes(m.id)) out.assignees.push(m.id); return false; }
      return true;
    }).join(' ');
    title = ' ' + title.trim() + ' ';
    const tm = title.match(/\s(\d{1,2})\s?(?:h|:)\s?(\d{2})?\b/i);
    if (tm && Number(tm[1]) < 24) { out.time = String(tm[1]).padStart(2, '0') + ':' + (tm[2] || '00'); title = title.replace(tm[0], ' '); }
    const today = U.today();
    const rules = [
      [/\s(aujourd'hui|aujourd’hui|auj)\b/i, () => today],
      [/\sapr[eè]s[- ]demain\b/i, () => U.addDays(today, 2)],
      [/\sdemain\b/i, () => U.addDays(today, 1)],
      [/\s(ce soir)\b/i, () => today]
    ];
    for (const [re, fn] of rules) { if (re.test(title)) { out.due = fn(); title = title.replace(re, ' '); break; } }
    if (!out.due) {
      const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
      days.forEach((d, i) => {
        const re = new RegExp('\\s' + d + '\\b', 'i');
        if (!out.due && re.test(title)) {
          let diff = (i - U.weekday(today) + 7) % 7; if (diff === 0) diff = 7;
          out.due = U.addDays(today, diff); title = title.replace(re, ' ');
        }
      });
    }
    out.title = title.replace(/\s+/g, ' ').trim();
    out.title = out.title.charAt(0).toUpperCase() + out.title.slice(1);
    out.cat = App.guessCat(out.title);
    return out;
  };

  /* ---------- Éditeur de tâche ---------- */
  App.editTask = (id, preset) => {
    const st = S.state;
    const existing = id ? S.task(id) : null;
    const me = S.me();
    const kid = S.isKid();
    const t = existing ? JSON.parse(JSON.stringify(existing)) : Object.assign({
      title: '', cat: 'autre', assignees: kid ? [me.id] : [], due: U.today(), time: '', repeat: { type: 'none', interval: 1, days: [] },
      reminder: -1, priority: 'normal', points: 0, checklist: [], notes: '', room: '', freq: ''
    }, preset || {});
    if (!t.repeat) t.repeat = { type: 'none', interval: 1, days: [] };
    const cats = BM.CATEGORIES.filter(c => !kid || c.kid);
    const kidsExist = st.members.some(m => m.role === 'enfant');

    const html = `
      <form id="task-form" class="form" autocomplete="off">
        <div class="modal-head">
          <h2 class="modal-title">${existing ? 'Modifier' : 'Nouvelle'} ${kid ? 'mission' : 'tâche'}</h2>
          <button type="button" class="icon-btn" data-close aria-label="Fermer">✕</button>
        </div>
        <label class="field"><span>Quoi ?</span>
          <input name="title" required maxlength="140" value="${U.esc(t.title)}" placeholder="Ex. : Prendre rendez-vous chez le dentiste" autofocus></label>

        <div class="field"><span>Pour qui ?</span>
          <div class="people-pick">${st.members.map(m => `
            <label class="person-opt"><input type="checkbox" name="assignees" value="${m.id}" ${t.assignees.includes(m.id) ? 'checked' : ''}>
            ${App.avatar(m, 'sm')}<span>${U.esc(m.name)}</span></label>`).join('')}
          </div>
        </div>

        <div class="grid-2">
          <label class="field"><span>Section</span>
            <select name="cat">${cats.map(c => `<option value="${c.id}" ${c.id === t.cat ? 'selected' : ''}>${c.emoji} ${c.label}</option>`).join('')}</select></label>
          <label class="field"><span>Importance</span>
            <select name="priority"><option value="normal">Normale</option><option value="high" ${t.priority === 'high' ? 'selected' : ''}>❗ Importante</option></select></label>
        </div>

        <div class="grid-2">
          <label class="field"><span>Quand ?</span><input type="date" name="due" value="${t.due || ''}"></label>
          <label class="field"><span>Heure (facultatif)</span><input type="time" name="time" value="${t.time || ''}"></label>
        </div>

        <div class="grid-2">
          <label class="field"><span>Répétition</span>
            <select name="repeatType">${BM.REPEATS.map(r => `<option value="${r.v}" ${r.v === t.repeat.type ? 'selected' : ''}>${r.label}</option>`).join('')}</select></label>
          <label class="field repeat-n" ${t.repeat.type === 'none' ? 'hidden' : ''}><span>Tous les…</span>
            <input type="number" name="interval" min="1" max="99" value="${t.repeat.interval || 1}"></label>
        </div>
        <div class="field week-days" ${t.repeat.type === 'weekly' ? '' : 'hidden'}><span>Quels jours ?</span>
          <div class="day-pick">${BM.DAYS_SHORT.map((d, i) => `<label><input type="checkbox" name="days" value="${i}" ${(t.repeat.days || []).includes(i) ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div>
        </div>

        <div class="grid-2">
          <label class="field"><span>Rappel 🔔</span>
            <select name="reminder">${BM.REMINDERS.map(r => `<option value="${r.v}" ${Number(t.reminder) === r.v ? 'selected' : ''}>${r.label}</option>`).join('')}</select></label>
          ${kidsExist && !kid ? `<label class="field"><span>Étoiles à gagner ⭐</span>
            <input type="number" name="points" min="0" max="100" step="1" value="${t.points || 0}"></label>` : `<input type="hidden" name="points" value="${t.points || 0}">`}
        </div>

        <div class="field"><span>Étapes (sous-tâches)</span>
          <ul class="checklist" id="cl">${t.checklist.map(c => App.clRow(c)).join('')}</ul>
          <div class="inline-add"><input id="cl-new" placeholder="Ajouter une étape…" maxlength="120"><button type="button" class="btn small" id="cl-add">Ajouter</button></div>
        </div>

        <label class="field"><span>Notes</span><textarea name="notes" rows="2" placeholder="Infos utiles, adresse, numéro…">${U.esc(t.notes)}</textarea></label>

        ${existing && existing.history && existing.history.length ? `<details class="history"><summary>Historique (${existing.history.length})</summary><ul>${existing.history.slice().reverse().slice(0, 10).map(h => { const m = S.member(h.by); return `<li>${U.fmtShort(h.date)} — ${m ? m.avatar + ' ' + U.esc(m.name) : '?'}</li>`; }).join('')}</ul></details>` : ''}

        <div class="modal-actions">
          ${existing ? `<button type="button" class="btn ghost danger-text" id="del-task">Supprimer</button>
                        <button type="button" class="btn ghost" id="ics-task" title="Ajouter à l'agenda du téléphone">📲 Agenda</button>` : ''}
          <span class="spacer"></span>
          <button type="submit" class="btn primary">${existing ? 'Enregistrer' : 'Ajouter'}</button>
        </div>
      </form>`;

    App.modal(html, {
      onMount: (root) => {
        const form = root.querySelector('#task-form');
        let checklist = t.checklist.slice();
        const cl = root.querySelector('#cl');
        const drawCl = () => { cl.innerHTML = checklist.map(c => App.clRow(c)).join(''); };
        const addCl = () => {
          const inp = root.querySelector('#cl-new');
          if (!inp.value.trim()) return;
          checklist.push({ id: U.uid(), text: inp.value.trim(), done: false });
          inp.value = ''; drawCl(); inp.focus();
        };
        root.querySelector('#cl-add').addEventListener('click', addCl);
        root.querySelector('#cl-new').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addCl(); } });
        cl.addEventListener('click', (e) => {
          const row = e.target.closest('[data-cl]'); if (!row) return;
          const c = checklist.find(x => x.id === row.dataset.cl);
          if (e.target.closest('.cl-del')) checklist = checklist.filter(x => x !== c);
          else if (e.target.matches('input')) c.done = e.target.checked;
          drawCl();
        });
        root.querySelector('[data-close]').addEventListener('click', App.closeModal);
        form.repeatType.addEventListener('change', () => {
          root.querySelector('.repeat-n').hidden = form.repeatType.value === 'none';
          root.querySelector('.week-days').hidden = form.repeatType.value !== 'weekly';
        });
        /* Attribuer à un enfant propose des étoiles par défaut */
        form.querySelectorAll('[name=assignees]').forEach(cb => cb.addEventListener('change', () => {
          const pts = form.querySelector('input[name=points][type=number]');
          if (pts && Number(pts.value) === 0 && cb.checked && S.isKid(S.member(cb.value))) pts.value = 5;
        }));
        if (!existing && !preset) {
          form.title.addEventListener('blur', () => { if (form.cat.value === 'autre' && form.title.value) form.cat.value = App.guessCat(form.title.value); });
        }
        const del = root.querySelector('#del-task');
        if (del) del.addEventListener('click', async () => {
          const ok = await App.confirm('Supprimer « ' + U.esc(existing.title) + ' » ?', 'Supprimer');
          if (ok) { S.deleteTask(existing.id); App.toast('Tâche supprimée', 5000, { label: 'Annuler', fn: S.undo }); }
        });
        const ics = root.querySelector('#ics-task');
        if (ics) ics.addEventListener('click', () => U.download('bmchores-' + existing.id + '.ics', U.toICS([existing]), 'text/calendar'));

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const type = fd.get('repeatType');
          const data = {
            title: fd.get('title').trim(),
            cat: fd.get('cat'),
            priority: fd.get('priority'),
            assignees: fd.getAll('assignees'),
            due: fd.get('due') || '',
            time: fd.get('time') || '',
            repeat: { type, interval: Math.max(1, Number(fd.get('interval')) || 1), days: type === 'weekly' ? fd.getAll('days').map(Number) : [] },
            reminder: Number(fd.get('reminder')),
            points: Math.max(0, Number(fd.get('points')) || 0),
            checklist,
            notes: fd.get('notes').trim()
          };
          if (!data.title) return;
          if (type !== 'none' && !data.due) data.due = U.today();
          if (data.reminder >= 0 && !data.due) data.due = U.today();
          if (data.reminder >= 0 && N.permission() === 'default') App.askNotif();
          if (existing) { S.updateTask(existing.id, data); App.toast('✅ Enregistré'); }
          else { S.addTask(data); App.toast('✨ Ajouté !'); }
          App.closeModal();
        });
      }
    });
  };
  App.clRow = (c) => `<li data-cl="${c.id}"><label><input type="checkbox" ${c.done ? 'checked' : ''}><span>${U.esc(c.text)}</span></label><button type="button" class="cl-del" aria-label="Retirer">✕</button></li>`;

  App.askNotif = () => {
    if (N.permission() !== 'default') return;
    App.toast('Active les notifications pour recevoir les rappels', 7000, { label: 'Activer', fn: N.request });
  };

  /* ---------- Changer de profil ---------- */
  App.switchProfile = () => {
    const st = S.state;
    App.modal(`
      <div class="modal-head"><h2 class="modal-title">Qui utilise l'appli ? 👋</h2><button class="icon-btn" data-close aria-label="Fermer">✕</button></div>
      <div class="profile-grid">${st.members.map(m => `
        <button class="profile-card ${m.id === st.currentId ? 'current' : ''}" data-pick="${m.id}" style="--c:${m.color}">
          <span class="avatar xl" style="--c:${m.color}">${m.avatar}</span><b>${U.esc(m.name)}</b>${m.pin ? '<small>🔒</small>' : ''}
        </button>`).join('')}
      </div>`, {
      onMount: (root) => {
        root.querySelector('[data-close]').addEventListener('click', App.closeModal);
        root.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => {
          const m = S.member(b.dataset.pick);
          const choose = () => { S.setCurrent(m.id); App.closeModal(); App.go('accueil'); App.toast('Coucou ' + m.name + ' ' + m.avatar); };
          if (m.pin && m.id !== st.currentId) App.askPin(m, choose); else choose();
        }));
      }
    });
  };
  App.askPin = (m, onOk) => {
    App.modal(`<form id="pin-form" class="form center">
      <h2 class="modal-title">Code de ${U.esc(m.name)} 🔒</h2>
      <input name="pin" type="password" inputmode="numeric" maxlength="6" class="pin-input" autofocus aria-label="Code">
      <p class="muted small" id="pin-err" hidden>Code incorrect, réessaie.</p>
      <div class="modal-actions"><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn primary">Valider</button></div></form>`, {
      onMount: (root) => {
        root.querySelector('[data-close]').addEventListener('click', App.closeModal);
        root.querySelector('form').addEventListener('submit', (e) => {
          e.preventDefault();
          if (e.target.pin.value === m.pin) onOk();
          else { root.querySelector('#pin-err').hidden = false; e.target.pin.value = ''; }
        });
      }
    });
  };

  App.openNotifs = () => {
    const list = S.myNotifs().slice(0, 40);
    App.modal(`
      <div class="modal-head"><h2 class="modal-title">Notifications 🔔</h2><button class="icon-btn" data-close aria-label="Fermer">✕</button></div>
      ${list.length ? `<ul class="notif-list">${list.map(n => `<li class="${n.read ? '' : 'unread'}" ${n.taskId ? `data-task="${n.taskId}"` : ''}><span>${U.esc(n.text)}</span><time>${new Date(n.at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></li>`).join('')}</ul>`
        : App.empty('🌙', 'Rien de nouveau pour l\'instant.')}
      ${N.permission() === 'default' ? '<button class="btn primary block" id="notif-on">Activer les notifications sur cet appareil</button>' : ''}`, {
      onMount: (root) => {
        root.querySelector('[data-close]').addEventListener('click', App.closeModal);
        root.querySelectorAll('[data-task]').forEach(li => li.addEventListener('click', () => { if (S.task(li.dataset.task)) App.editTask(li.dataset.task); }));
        const on = root.querySelector('#notif-on'); if (on) on.addEventListener('click', () => { N.request(); App.closeModal(); });
      }
    });
    S.markNotifsRead();
  };

  /* ---------- Actions globales (délégation d'événements) ---------- */
  App.actions = {
    'new-task': (el) => App.editTask(null, el.dataset.preset ? JSON.parse(el.dataset.preset) : null),
    'edit-task': (el) => App.editTask(el.dataset.id),
    'toggle-task': (el) => {
      const t = S.task(el.dataset.id); if (!t) return;
      if (t.done) { S.reopenTask(t.id); return; }
      const li = el.closest('.task'); if (li) li.classList.add('completing');
      setTimeout(() => {
        const repeat = S.completeTask(t.id);
        const cheer = BM.CHEERS[Math.floor(Math.random() * BM.CHEERS.length)];
        const msg = (t.points ? cheer + ' +' + t.points + ' ⭐' : cheer) + (repeat ? ' · prochaine fois : ' + U.relDay(S.task(t.id).due).toLowerCase() : '');
        App.toast(msg, 4500, { label: 'Annuler', fn: S.undo });
        if (S.isKid() || t.points) App.confetti();
      }, 260);
    },
    'switch-profile': () => App.switchProfile(),
    'open-notifs': () => App.openNotifs(),
    'go': (el) => App.go(el.dataset.to)
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const fn = App.actions[el.dataset.action] || (Views.actions && Views.actions[el.dataset.action]);
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form]');
    if (!f) return;
    const fn = Views.forms && Views.forms[f.dataset.form];
    if (fn) { e.preventDefault(); fn(f, e); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (!el) return;
    const fn = Views.changes && Views.changes[el.dataset.change];
    if (fn) fn(el, e);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') App.closeModal(); });

  /* ---------- Démarrage ---------- */
  App.start = () => {
    S.load();
    S.on(() => { if (!$('#modal') || !$('#task-form')) App.render(); else App.pending = true; });
    window.addEventListener('hashchange', () => { App.closeModal(); App.render(); });
    const obs = new MutationObserver(() => { if (App.pending && !$('#modal')) { App.pending = false; App.render(); } });
    obs.observe(document.body, { childList: true });
    App.render();
    N.init();
    if (window.Sync) Sync.init();
  };

  window.App = App;
})();
