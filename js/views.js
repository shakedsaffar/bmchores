/* BMChores — les écrans de l'application */
(function () {
  const V = { after: {}, actions: {}, forms: {}, changes: {} };
  const esc = U.esc;
  const av = (m, s) => App.avatar(m, s);

  /* ---------- Aides de calcul ---------- */
  const visibleCats = () => BM.CATEGORIES.filter(c => !S.isKid() || c.kid);
  const sortTasks = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (a.time || '99').localeCompare(b.time || '99') || (b.priority === 'high') - (a.priority === 'high');
  const isMine = (t, me) => (t.assignees || []).includes(me.id);
  const doneOn = (dateStr, memberId) => {
    let n = 0;
    S.state.tasks.forEach(t => {
      if (t.done && t.doneAt && U.toStr(new Date(t.doneAt)) === dateStr && (!memberId || t.doneBy === memberId)) n++;
      (t.history || []).forEach(h => { if (U.toStr(new Date(h.at)) === dateStr && (!memberId || h.by === memberId)) n++; });
    });
    return n;
  };
  const doneBetween = (start, end, memberId) => {
    let n = 0;
    S.state.tasks.forEach(t => {
      if (t.done && t.doneAt) { const d = U.toStr(new Date(t.doneAt)); if (d >= start && d <= end && t.doneBy === memberId) n++; }
      (t.history || []).forEach(h => { const d = U.toStr(new Date(h.at)); if (d >= start && d <= end && h.by === memberId) n++; });
    });
    return n;
  };
  const upcomingBirthdays = (days) => {
    const today = U.today(), out = [];
    S.state.members.forEach(m => {
      if (!m.birthday) return;
      const [, mm, dd] = m.birthday.split('-');
      let y = new Date().getFullYear();
      let d = y + '-' + mm + '-' + dd;
      if (d < today) d = (y + 1) + '-' + mm + '-' + dd;
      const n = U.diffDays(today, d);
      if (n <= days) out.push({ m, date: d, days: n, age: Number(d.slice(0, 4)) - Number(m.birthday.slice(0, 4)) });
    });
    return out.sort((a, b) => a.days - b.days);
  };
  const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'; };
  const card = (title, body, extra) => `<section class="card ${extra && extra.cls || ''}"><div class="card-head"><h2>${title}</h2>${extra && extra.link ? `<a class="card-link" href="#/${extra.link}">${extra.linkLabel || 'Tout voir'} →</a>` : ''}</div>${body}</section>`;
  const preset = (o) => esc(JSON.stringify(o));
  const mealOf = (date, slot) => ((S.state.meals[date] || {})[slot]) || null;

  /* ============================================================
     ACCUEIL / ONBOARDING
     ============================================================ */
  const ob = { step: 1, me: { name: '', avatar: '👩', color: BM.COLORS[0] }, others: [], opts: { plan: true, lists: true, rewards: true, essentials: true } };

  V.onboarding = () => {
    const steps = ['Toi', 'Ta famille', 'C\'est parti'];
    const dots = `<div class="ob-dots">${steps.map((s, i) => `<span class="${i + 1 === ob.step ? 'on' : i + 1 < ob.step ? 'ok' : ''}">${i + 1 < ob.step ? '✓' : i + 1}<small>${s}</small></span>`).join('')}</div>`;
    let body = '';
    if (ob.step === 1) {
      body = `
        <div class="ob-hero"><div class="ob-emoji">🏡</div><h1>Bienvenue dans <span class="grad">BMChores</span></h1>
        <p>L'appli de la famille pour tout organiser : tâches, courses, ménage, repas, rendez-vous… et libérer ta charge mentale ✨</p></div>
        <form data-form="ob1" class="form">
          <label class="field"><span>Comment tu t'appelles ?</span><input name="name" required maxlength="30" value="${esc(ob.me.name)}" placeholder="Ton prénom" autofocus></label>
          <div class="field"><span>Choisis ton avatar</span><div class="emoji-pick">${BM.AVATARS.map(a => `<label><input type="radio" name="avatar" value="${a}" ${a === ob.me.avatar ? 'checked' : ''}><span>${a}</span></label>`).join('')}</div></div>
          <div class="field"><span>Ta couleur</span><div class="color-pick">${BM.COLORS.map(c => `<label><input type="radio" name="color" value="${c}" ${c === ob.me.color ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div></div>
          <button class="btn primary block big">Continuer →</button>
        </form>
        ${window.Sync && Sync.configured() ? `<div class="ob-join"><span>Ta famille utilise déjà BMChores ?</span><button class="btn block" data-action="sync-join">👋 J'ai un code d'invitation</button></div>` : ''}`;
    } else if (ob.step === 2) {
      body = `
        <div class="ob-hero small"><div class="ob-emoji">👨‍👩‍👦</div><h1>Qui fait partie de la famille ?</h1><p>Ajoute ton mari, tes enfants… Tu pourras en ajouter d'autres plus tard.</p></div>
        <ul class="ob-members">
          <li>${av(Object.assign({}, ob.me), 'md')}<b>${esc(ob.me.name)}</b><span class="pill">Parent · moi</span></li>
          ${ob.others.map((m, i) => `<li>${av(m, 'md')}<b>${esc(m.name)}</b><span class="pill">${m.role === 'enfant' ? 'Enfant' : 'Parent'}</span><button class="icon-btn" data-action="ob-del" data-i="${i}" aria-label="Retirer">✕</button></li>`).join('')}
        </ul>
        <form data-form="ob2" class="form card soft">
          <div class="grid-2">
            <label class="field"><span>Prénom</span><input name="name" required maxlength="30" placeholder="Ex. : Thomas"></label>
            <label class="field"><span>Rôle</span><select name="role"><option value="parent">Parent</option><option value="enfant">Enfant</option></select></label>
          </div>
          <div class="field"><span>Avatar</span><div class="emoji-pick compact">${BM.AVATARS.map((a, i) => `<label><input type="radio" name="avatar" value="${a}" ${i === 1 ? 'checked' : ''}><span>${a}</span></label>`).join('')}</div></div>
          <label class="field"><span>Date de naissance (facultatif — pour ne jamais oublier un anniversaire 🎂)</span><input type="date" name="birthday"></label>
          <button class="btn block">＋ Ajouter à la famille</button>
        </form>
        <div class="ob-nav"><button class="btn ghost" data-action="ob-back">← Retour</button><button class="btn primary" data-action="ob-next">Continuer →</button></div>`;
    } else {
      const opt = (k, t, d) => `<label class="opt-card"><input type="checkbox" data-change="ob-opt" data-k="${k}" ${ob.opts[k] ? 'checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`;
      body = `
        <div class="ob-hero small"><div class="ob-emoji">🚀</div><h1>On prépare tout pour vous ?</h1><p>Je peux pré-remplir l'appli pour vous faire gagner du temps. Tout reste modifiable.</p></div>
        <div class="opt-list">
          ${opt('plan', '🧽 Plan de ménage type', 'Tâches hebdomadaires, mensuelles et ponctuelles, pièce par pièce.')}
          ${opt('lists', '🛒 Listes de courses', 'Supermarché, Pharmacie et Bricolage, avec tri automatique par rayon.')}
          ${opt('essentials', '🧠 Rappels « charge mentale »', 'Dentiste, détecteurs de fumée, chaudière, papiers d\'identité, impôts…')}
          ${opt('rewards', '🏆 Récompenses pour les enfants', 'Les missions rapportent des étoiles à échanger contre des petits plaisirs.')}
        </div>
        <div class="ob-nav"><button class="btn ghost" data-action="ob-back">← Retour</button><button class="btn primary big" data-action="ob-finish">C'est parti ! 🎉</button></div>`;
    }
    return `<div class="onboarding">${dots}${body}</div>`;
  };
  V.forms.ob1 = (f) => {
    const fd = new FormData(f);
    ob.me = { name: fd.get('name').trim(), avatar: fd.get('avatar') || '👩', color: fd.get('color') || BM.COLORS[0] };
    ob.step = 2; App.render();
  };
  V.forms.ob2 = (f) => {
    const fd = new FormData(f);
    const name = fd.get('name').trim(); if (!name) return;
    ob.others.push({ name, role: fd.get('role'), avatar: fd.get('avatar') || '🙂', birthday: fd.get('birthday') || '', color: BM.COLORS[(ob.others.length + 1) % BM.COLORS.length] });
    App.render();
    setTimeout(() => { const i = document.querySelector('[data-form=ob2] [name=name]'); if (i) i.focus(); }, 10);
  };
  V.actions['ob-del'] = (el) => { ob.others.splice(Number(el.dataset.i), 1); App.render(); };
  V.actions['ob-back'] = () => { ob.step = Math.max(1, ob.step - 1); App.render(); };
  V.actions['ob-next'] = () => {
    const pending = document.querySelector('[data-form=ob2] [name=name]');
    if (pending && pending.value.trim()) V.forms.ob2(pending.form);
    ob.step = 3; App.render();
  };
  V.changes['ob-opt'] = (el) => { ob.opts[el.dataset.k] = el.checked; };
  V.actions['ob-finish'] = () => {
    const st = S.state;
    const me = S.addMember(Object.assign({ role: 'parent' }, ob.me));
    ob.others.forEach(o => S.addMember(o));
    st.currentId = me.id;
    if (ob.opts.lists) { S.addList('Supermarché', '🛒'); S.addList('Pharmacie', '💊'); S.addList('Bricolage', '🔨'); }
    else S.addList('Courses', '🛒');
    if (ob.opts.plan) V.loadCleaningPlan(true);
    if (ob.opts.rewards) st.rewards = BM.DEFAULT_REWARDS.map(r => Object.assign({ id: U.uid() }, r));
    if (ob.opts.essentials) V.loadEssentials();
    st.notifs = [];
    st.onboarded = true;
    S.save();
    App.go('accueil');
    App.confetti();
    setTimeout(App.askNotif, 1500);
  };

  V.loadEssentials = () => {
    const today = U.today();
    const picks = [
      ['sante', 'Rendez-vous dentiste (contrôle)', 'monthly:6', 21],
      ['maison', 'Changer les piles des détecteurs de fumée', 'yearly', 30],
      ['maison', 'Entretien de la chaudière', 'yearly', 45],
      ['admin', 'Vérifier la date d\'expiration des passeports / cartes d\'identité', 'yearly', 14],
      ['finances', 'Faire le point sur le budget du mois', 'monthly', 7],
      ['repas', 'Planifier les menus de la semaine', 'weekly', (6 - U.weekday(today) + 7) % 7 || 7],
      ['social', 'Appeler les grands-parents', 'weekly', 3],
      ['couple', 'Soirée en amoureux', 'monthly', 12],
      ['moi', 'Un moment rien que pour moi', 'weekly', 5]
    ];
    picks.forEach(([cat, title, rep, inDays]) => {
      S.state.tasks.push({
        id: U.uid(), title, cat, assignees: [], due: U.addDays(today, inDays), time: '', repeat: U.parseRepeat(rep), reminder: 1440,
        priority: 'normal', points: 0, checklist: [], notes: '', room: '', freq: '', done: false, history: [], createdBy: S.state.currentId, createdAt: Date.now(),
        anchorDay: U.parse(U.addDays(today, inDays)).getDate()
      });
    });
  };

  V.loadCleaningPlan = (silent) => {
    const today = U.today();
    const monday = U.startOfWeek(today);
    let wi = 0, mi = 0;
    BM.ROOMS.forEach(room => {
      (BM.CLEANING_PLAN[room.id] || []).forEach(([title, freq]) => {
        let due = '', repeat = { type: 'none', interval: 1, days: [] };
        if (freq === 'w') {
          const day = wi++ % 7; due = U.addDays(monday, day); if (due < today) due = U.addDays(due, 7);
          repeat = { type: 'weekly', interval: 1, days: [day] };
        } else if (freq === 'm') {
          due = U.addDays(today, 3 + (mi++ % 4) * 7); repeat = { type: 'monthly', interval: 1, days: [] };
        }
        S.state.tasks.push({
          id: U.uid(), title, cat: 'menage', assignees: [], due, time: '', repeat, reminder: -1, priority: 'normal', points: 0,
          checklist: [], notes: '', room: room.id, freq, done: false, history: [], createdBy: S.state.currentId, createdAt: Date.now(),
          anchorDay: due ? U.parse(due).getDate() : undefined
        });
      });
    });
    if (!silent) { S.save(); App.toast('🧽 Plan de ménage chargé !'); }
  };

  V.accueil = () => (S.isKid() ? V.kidHome() : V.parentHome());

  V.parentHome = () => {
    const st = S.state, me = S.me(), today = U.today(), in7 = U.addDays(today, 7);
    const open = S.openTasks();
    const late = open.filter(t => t.due && t.due < today);
    const todays = open.filter(t => t.due === today);
    const week = open.filter(t => t.due > today && t.due <= in7);
    const focus = late.concat(todays).sort(sortTasks);
    const myCount = focus.filter(t => isMine(t, me)).length;

    const weekStart = U.startOfWeek(today), weekEnd = U.addDays(weekStart, 6);
    const load = st.members.map(m => ({ m, todo: open.filter(t => isMine(t, m) && t.due && t.due <= in7).length, done: doneBetween(weekStart, weekEnd, m.id) }));
    const maxLoad = Math.max(1, ...load.map(l => l.todo + l.done));
    const unassigned = open.filter(t => !(t.assignees || []).length && t.due && t.due <= in7).length;

    const shopping = st.lists.map(l => ({ l, n: l.items.filter(i => !i.checked).length }));
    const bdays = upcomingBirthdays(30);
    const ideas = [];
    Object.entries(BM.IDEAS).forEach(([cat, arr]) => arr.forEach(([title, rep]) => { if (!st.tasks.some(t => U.normalize(t.title) === U.normalize(title))) ideas.push({ cat, title, rep }); }));
    const dayIdx = Number(today.replace(/-/g, '')) % Math.max(1, ideas.length);
    const pickIdeas = ideas.length ? [0, 1, 2].map(k => ideas[(dayIdx + k * 7) % ideas.length]).filter((v, i, a) => a.indexOf(v) === i) : [];
    const lunch = mealOf(today, 'midi'), dinner = mealOf(today, 'soir');

    const byDay = {};
    week.sort(sortTasks).forEach(t => { (byDay[t.due] = byDay[t.due] || []).push(t); });

    return `
      <section class="hero">
        <div class="hero-text">
          <p class="hero-date">${U.fmtLong(today)}</p>
          <h1>${greet()} ${esc(me.name)} ${me.avatar}</h1>
          <p class="hero-sub">${focus.length ? `Aujourd'hui : <b>${focus.length}</b> chose${focus.length > 1 ? 's' : ''} à faire${myCount ? `, dont <b>${myCount}</b> pour toi` : ''}.` : 'Rien d\'urgent aujourd\'hui. Profite ! ☀️'}</p>
        </div>
        <div class="stats">
          <a class="stat" href="#/taches/today"><b>${todays.length}</b><span>aujourd'hui</span></a>
          <a class="stat ${late.length ? 'warn' : ''}" href="#/taches/late"><b>${late.length}</b><span>en retard</span></a>
          <a class="stat" href="#/taches/week"><b>${week.length}</b><span>7 prochains jours</span></a>
          <a class="stat" href="#/courses"><b>${shopping.reduce((s, x) => s + x.n, 0)}</b><span>à acheter</span></a>
        </div>
      </section>

      <form data-form="quick" class="quick-add" autocomplete="off">
        <span class="qa-ico">✨</span>
        <input name="q" placeholder="Ajout rapide : « Dentiste @${esc((st.members[1] || me).name)} jeudi 17h »" aria-label="Ajout rapide">
        <button class="btn primary">Ajouter</button>
      </form>

      <div class="dash-grid">
        ${card('📌 Aujourd\'hui', focus.length ? `<ul class="task-list">${focus.slice(0, 8).map(t => App.taskItem(t)).join('')}</ul>${focus.length > 8 ? `<a class="more" href="#/taches/today">+ ${focus.length - 8} autres</a>` : ''}` : App.empty('🌈', 'Tout est fait pour aujourd\'hui. Bravo la famille !'), { cls: 'span-2', link: 'taches/today' })}

        ${card('🍽️ Au menu', `<div class="menu-today">
            <a href="#/repas" class="meal-slot"><small>Midi</small><b>${lunch ? esc(lunch.name) : '<span class="muted">À choisir…</span>'}</b></a>
            <a href="#/repas" class="meal-slot"><small>Soir</small><b>${dinner ? esc(dinner.name) : '<span class="muted">À choisir…</span>'}</b></a>
          </div>`, { link: 'repas', linkLabel: 'Semaine' })}

        ${card('🗓️ Les 7 prochains jours', Object.keys(byDay).length ? Object.keys(byDay).map(d => `<div class="day-group"><h3>${U.relDay(d)} <small>${U.fmtShort(d)}</small></h3><ul class="task-list compact">${byDay[d].slice(0, 4).map(t => App.taskItem(t, { hideDate: true })).join('')}</ul>${byDay[d].length > 4 ? `<a class="more" href="#/agenda">+ ${byDay[d].length - 4}</a>` : ''}</div>`).join('') : App.empty('🛋️', 'Semaine calme pour l\'instant.'), { cls: 'span-2', link: 'agenda', linkLabel: 'Agenda' })}

        ${card('⚖️ Répartition de la semaine', `<ul class="load">${load.map(l => `
            <li>${av(l.m, 'sm')}<div class="load-bar"><div class="load-name">${esc(l.m.name)} <small>${l.done} fait${l.done > 1 ? 's' : ''} · ${l.todo} à faire</small></div>
              <div class="bar"><i class="done" style="width:${(l.done / maxLoad) * 100}%;background:${l.m.color}"></i><i class="todo" style="width:${(l.todo / maxLoad) * 100}%;--c:${l.m.color}"></i></div></div></li>`).join('')}
          </ul>${unassigned ? `<p class="hint">👀 ${unassigned} tâche${unassigned > 1 ? 's' : ''} sans responsable cette semaine. <a href="#/taches/unassigned">Les attribuer</a></p>` : '<p class="hint">Partager, c\'est alléger 💛</p>'}`)}

        ${card('🛒 Courses', shopping.length ? `<ul class="mini-lists">${shopping.map(x => `<li><a href="#/courses/${x.l.id}"><span>${x.l.emoji} ${esc(x.l.name)}</span><b>${x.n}</b></a></li>`).join('')}</ul>` : App.empty('🛒', 'Aucune liste'), { link: 'courses' })}

        ${card('🎂 À ne pas oublier', (bdays.length || open.some(t => t.priority === 'high')) ? `<ul class="soon">
            ${bdays.map(b => `<li><span class="soon-ico">🎂</span><span>Anniversaire de <b>${esc(b.m.name)}</b>${b.age > 0 && b.age < 120 ? ' (' + b.age + ' ans)' : ''}</span><small>${b.days === 0 ? 'Aujourd\'hui ! 🎉' : 'dans ' + b.days + ' j'}</small></li>`).join('')}
            ${open.filter(t => t.priority === 'high').sort(sortTasks).slice(0, 4).map(t => `<li data-action="edit-task" data-id="${t.id}"><span class="soon-ico">❗</span><span>${esc(t.title)}</span><small>${U.relDay(t.due)}</small></li>`).join('')}
          </ul>` : App.empty('🎈', 'Ajoute les dates de naissance dans « Famille » pour ne rater aucun anniversaire.'))}

        ${card('🧠 Pour alléger ta tête', pickIdeas.length ? `<p class="hint">Des choses qu'on oublie souvent. Un clic pour les ajouter :</p><ul class="ideas">${pickIdeas.map(i => `<li><span>${BM.catById(i.cat).emoji} ${esc(i.title)}</span><button class="btn small" data-action="new-task" data-preset="${preset({ title: i.title, cat: i.cat, repeat: U.parseRepeat(i.rep), reminder: 1440 })}">＋</button></li>`).join('')}</ul>` : App.empty('🧘', 'Tu as déjà tout pensé !'), { link: 'sections', linkLabel: 'Toutes les idées' })}

        ${card('🗂️ Sections', `<div class="cat-grid small">${visibleCats().map(c => { const n = open.filter(t => t.cat === c.id).length; return `<a href="#/section/${c.id}" class="cat-tile" style="--cat:${c.color}"><span class="cat-emoji">${c.emoji}</span><span class="cat-name">${c.label}</span>${n ? `<span class="cat-count">${n}</span>` : ''}</a>`; }).join('')}</div>`, { cls: 'span-3' })}
      </div>`;
  };

  V.forms.quick = (f) => {
    const q = f.q.value.trim(); if (!q) return;
    const p = App.parseQuick(q);
    if (!p.title) return;
    S.addTask({ title: p.title, cat: p.cat, assignees: p.assignees, due: p.due || U.today(), time: p.time });
    const who = p.assignees.map(S.member).map(m => m.name).join(', ');
    App.toast('✨ « ' + p.title + ' » ' + U.relDay(p.due || U.today()).toLowerCase() + (p.time ? ' à ' + p.time : '') + (who ? ' · ' + who : ''));
  };

  V.kidHome = () => {
    const st = S.state, me = S.me(), today = U.today();
    const mine = S.openTasks().filter(t => isMine(t, me) && (!t.due || t.due <= today)).sort(sortTasks);
    const later = S.openTasks().filter(t => isMine(t, me) && t.due > today).sort(sortTasks).slice(0, 5);
    const doneToday = doneOn(today, me.id);
    const total = doneToday + mine.length;
    const pct = total ? Math.round(doneToday / total * 100) : 100;
    const next = st.rewards.slice().sort((a, b) => a.cost - b.cost).find(r => r.cost > (me.points || 0));
    const dinner = mealOf(today, 'soir');
    return `
      <section class="hero kid">
        <div class="hero-text"><p class="hero-date">${U.fmtLong(today)}</p><h1>Salut ${esc(me.name)} ! ${me.avatar}</h1>
          <p class="hero-sub">${mine.length ? 'Tu as <b>' + mine.length + '</b> mission' + (mine.length > 1 ? 's' : '') + ' aujourd\'hui. Tu peux le faire ! 💪' : 'Toutes tes missions sont faites. Tu es un champion ! 🏆'}</p></div>
        <a class="star-box" href="#/recompenses"><span class="star-big">⭐</span><b>${me.points || 0}</b><span>étoiles</span></a>
      </section>
      <div class="progress-wrap"><div class="progress"><i style="width:${pct}%"></i></div><span>${doneToday} / ${total} missions du jour</span></div>
      <h2 class="section-title">🎯 Mes missions du jour</h2>
      ${mine.length ? `<ul class="kid-missions">${mine.map(t => `
        <li style="--cat:${BM.catById(t.cat).color}">
          <span class="km-emoji">${BM.catById(t.cat).emoji}</span>
          <div class="km-body" data-action="edit-task" data-id="${t.id}"><b>${esc(t.title)}</b><small>${t.due && t.due < today ? '⏰ À rattraper' : t.time ? '🕑 ' + t.time : 'Aujourd\'hui'}${t.points ? ' · ⭐ ' + t.points : ''}</small></div>
          <button class="km-check" data-action="toggle-task" data-id="${t.id}" aria-label="J'ai fini : ${esc(t.title)}">✓</button>
        </li>`).join('')}</ul>` : App.empty('🎉', 'Bravo ! Plus rien à faire aujourd\'hui.')}
      ${next ? `<div class="card soft reward-next"><span class="rn-emoji">${next.emoji}</span><div><b>Prochaine récompense : ${esc(next.title)}</b><div class="progress small"><i style="width:${Math.min(100, (me.points || 0) / next.cost * 100)}%"></i></div><small>Encore ${next.cost - (me.points || 0)} ⭐</small></div></div>` : ''}
      <div class="dash-grid">
        ${card('🍽️ Ce soir on mange', `<p class="big-text">${dinner ? esc(dinner.name) : 'Surprise ! 🤫'}</p>`)}
        ${card('🔜 Bientôt', later.length ? `<ul class="task-list compact">${later.map(t => App.taskItem(t)).join('')}</ul>` : App.empty('😎', 'Rien de prévu pour l\'instant.'))}
      </div>`;
  };

  /* ============================================================
     TÂCHES
     ============================================================ */
  const tf = { who: '', cat: '', q: '' };
  const VIEWS = [
    ['all', 'À faire'], ['mine', 'Pour moi'], ['today', 'Aujourd\'hui'], ['week', '7 jours'], ['late', 'En retard'], ['unassigned', 'Sans responsable'], ['done', 'Terminées']
  ];
  V.taches = (view) => {
    const kid = S.isKid();
    view = view || (kid ? 'mine' : 'all');
    const me = S.me(), today = U.today(), in7 = U.addDays(today, 7);
    let list = view === 'done' ? S.state.tasks.filter(t => t.done) : S.openTasks();
    if (view === 'mine') list = list.filter(t => isMine(t, me));
    if (view === 'today') list = list.filter(t => t.due && t.due <= today);
    if (view === 'week') list = list.filter(t => t.due && t.due <= in7);
    if (view === 'late') list = list.filter(t => t.due && t.due < today);
    if (view === 'unassigned') list = list.filter(t => !(t.assignees || []).length);
    if (tf.who) list = list.filter(t => (t.assignees || []).includes(tf.who));
    if (tf.cat) list = list.filter(t => t.cat === tf.cat);
    if (tf.q) { const q = U.normalize(tf.q); list = list.filter(t => U.normalize(t.title + ' ' + t.notes).includes(q)); }

    let body;
    if (view === 'done') {
      list.sort((a, b) => b.doneAt - a.doneAt);
      body = list.length ? `<ul class="task-list">${list.slice(0, 100).map(t => App.taskItem(t)).join('')}</ul>` : App.empty('📭', 'Aucune tâche terminée pour l\'instant.');
    } else {
      const groups = [
        ['⏰ En retard', t => t.due && t.due < today],
        ['📌 Aujourd\'hui', t => t.due === today],
        ['🌅 Demain', t => t.due === U.addDays(today, 1)],
        ['🗓️ Cette semaine', t => t.due > U.addDays(today, 1) && t.due <= in7],
        ['🔭 Plus tard', t => t.due > in7],
        ['🗒️ Sans date', t => !t.due]
      ];
      list.sort(sortTasks);
      body = groups.map(([label, fn]) => { const g = list.filter(fn); return g.length ? `<h3 class="group-title">${label} <small>${g.length}</small></h3><ul class="task-list">${g.map(t => App.taskItem(t)).join('')}</ul>` : ''; }).join('')
        || App.empty('🎈', 'Rien ici ! Ajoute une tâche avec le bouton ＋', `<button class="btn primary" data-action="new-task">＋ Nouvelle tâche</button>`);
    }
    return `
      <div class="page-head"><h1>${kid ? '🎯 Mes missions' : '✅ Tâches'}</h1><button class="btn primary" data-action="new-task">＋ Nouvelle</button></div>
      <div class="chips scroll">${VIEWS.filter(v => !kid || ['mine', 'today', 'done'].includes(v[0])).map(([id, l]) => `<a class="chip ${id === view ? 'on' : ''}" href="#/taches/${id}">${l}</a>`).join('')}</div>
      ${kid ? '' : `<div class="filters">
        <input type="search" class="search" placeholder="🔍 Rechercher…" value="${esc(tf.q)}" data-change="tf-q" id="tf-q" aria-label="Rechercher">
        <select data-change="tf-who" aria-label="Filtrer par personne"><option value="">👥 Tout le monde</option>${S.state.members.map(m => `<option value="${m.id}" ${tf.who === m.id ? 'selected' : ''}>${m.avatar} ${esc(m.name)}</option>`).join('')}</select>
        <select data-change="tf-cat" aria-label="Filtrer par section"><option value="">🗂️ Toutes les sections</option>${visibleCats().map(c => `<option value="${c.id}" ${tf.cat === c.id ? 'selected' : ''}>${c.emoji} ${c.label}</option>`).join('')}</select>
      </div>`}
      ${body}`;
  };
  V.changes['tf-who'] = (el) => { tf.who = el.value; App.render(); };
  V.changes['tf-cat'] = (el) => { tf.cat = el.value; App.render(); };
  V.after.taches = () => {
    const q = document.getElementById('tf-q');
    if (q) q.addEventListener('input', U.debounce(() => { tf.q = q.value; App.render(); const n = document.getElementById('tf-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250));
  };

  /* ============================================================
     AGENDA
     ============================================================ */
  const cal = { month: null, sel: null, mode: 'mois' };
  V.agenda = () => {
    const today = U.today();
    if (!cal.month) { const d = new Date(); cal.month = new Date(d.getFullYear(), d.getMonth(), 1); }
    if (!cal.sel) cal.sel = today;
    const y = cal.month.getFullYear(), m = cal.month.getMonth();
    const first = U.toStr(new Date(y, m, 1));
    const gridStart = U.startOfWeek(first);
    const lastDay = U.toStr(new Date(y, m + 1, 0));
    const gridEnd = U.addDays(U.startOfWeek(lastDay), 6);
    const open = S.openTasks();
    const map = {};
    open.forEach(t => U.occurrences(t, gridStart, gridEnd).forEach(d => { (map[d] = map[d] || []).push(t); }));
    const bmap = {};
    S.state.members.forEach(mb => {
      if (!mb.birthday) return;
      [y - 1, y, y + 1].forEach(yy => { const d = yy + mb.birthday.slice(4); if (d >= gridStart && d <= gridEnd) (bmap[d] = bmap[d] || []).push(mb); });
    });

    const cells = [];
    for (let d = gridStart; d <= gridEnd; d = U.addDays(d, 1)) {
      const items = map[d] || [], bd = bmap[d] || [];
      const inMonth = d.slice(5, 7) === first.slice(5, 7);
      const dots = items.slice(0, 4).map(t => `<i style="background:${BM.catById(t.cat).color}"></i>`).join('');
      cells.push(`<button class="cal-cell ${inMonth ? '' : 'out'} ${d === today ? 'today' : ''} ${d === cal.sel ? 'sel' : ''} ${d < today && items.some(t => t.due === d) ? 'late' : ''}" data-action="cal-pick" data-d="${d}" aria-label="${U.fmtLong(d)} : ${items.length} tâche(s)">
        <span class="cal-num">${Number(d.slice(8))}</span>
        <span class="cal-dots">${bd.length ? '🎂' : ''}${dots}${items.length > 4 ? '<b>+</b>' : ''}</span>
        <span class="cal-labels">${items.slice(0, 2).map(t => `<em style="--cat:${BM.catById(t.cat).color}">${esc(t.title)}</em>`).join('')}${items.length > 2 ? `<em class="more-em">+${items.length - 2}</em>` : ''}</span>
      </button>`);
    }
    const dayItems = (map[cal.sel] || []).slice().sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    const dayB = bmap[cal.sel] || [];
    let listMode = '';
    if (cal.mode === 'liste') {
      const end = U.addDays(today, 30); const lm = {};
      open.forEach(t => U.occurrences(t, today, end).forEach(d => { (lm[d] = lm[d] || []).push(t); }));
      const overdue = open.filter(t => t.due && t.due < today);
      listMode = (overdue.length ? `<h3 class="group-title">⏰ En retard</h3><ul class="task-list">${overdue.sort(sortTasks).map(t => App.taskItem(t)).join('')}</ul>` : '')
        + Object.keys(lm).sort().map(d => `<h3 class="group-title">${U.relDay(d)} <small>${U.fmtShort(d)}</small></h3><ul class="task-list">${lm[d].sort((a, b) => (a.time || '99').localeCompare(b.time || '99')).map(t => App.taskItem(t, { date: d, hideDate: true, preview: t.due !== d })).join('')}</ul>`).join('')
        || App.empty('📭', 'Rien de prévu dans les 30 prochains jours.');
    }
    return `
      <div class="page-head"><h1>📅 Agenda</h1>
        <div class="seg"><button class="${cal.mode === 'mois' ? 'on' : ''}" data-action="cal-mode" data-m="mois">Mois</button><button class="${cal.mode === 'liste' ? 'on' : ''}" data-action="cal-mode" data-m="liste">Liste</button></div>
      </div>
      ${cal.mode === 'liste' ? listMode : `
      <div class="cal-layout">
        <section class="card cal-card">
          <div class="cal-head"><button class="icon-btn" data-action="cal-nav" data-n="-1" aria-label="Mois précédent">‹</button><h2>${U.fmtMonth(cal.month)}</h2><button class="icon-btn" data-action="cal-nav" data-n="1" aria-label="Mois suivant">›</button><button class="btn small ghost" data-action="cal-today">Aujourd'hui</button></div>
          <div class="cal-grid head">${BM.DAYS_SHORT.map(d => `<span>${d}</span>`).join('')}</div>
          <div class="cal-grid">${cells.join('')}</div>
        </section>
        <section class="card day-card">
          <div class="card-head"><h2>${U.fmtLong(cal.sel)}</h2><button class="btn small primary" data-action="new-task" data-preset="${preset({ due: cal.sel })}">＋</button></div>
          ${dayB.map(b => `<div class="bday">🎂 Anniversaire de <b>${esc(b.name)}</b> ${b.avatar}</div>`).join('')}
          ${dayItems.length ? `<ul class="task-list">${dayItems.map(t => App.taskItem(t, { date: cal.sel, hideDate: true, preview: t.due !== cal.sel })).join('')}</ul>` : (dayB.length ? '' : App.empty('🌤️', 'Journée libre !'))}
          ${(() => { const l = mealOf(cal.sel, 'midi'), d = mealOf(cal.sel, 'soir'); return (l || d) ? `<div class="day-meals">🍽️ ${l ? 'Midi : ' + esc(l.name) : ''}${l && d ? ' · ' : ''}${d ? 'Soir : ' + esc(d.name) : ''}</div>` : ''; })()}
        </section>
      </div>`}
      <p class="hint center">📲 Astuce : dans Réglages, exporte l'agenda vers ton téléphone (Google Agenda, iPhone…).</p>`;
  };
  V.actions['cal-pick'] = (el) => { cal.sel = el.dataset.d; const d = U.parse(cal.sel); if (d.getMonth() !== cal.month.getMonth()) cal.month = new Date(d.getFullYear(), d.getMonth(), 1); App.render(); };
  V.actions['cal-nav'] = (el) => { cal.month = new Date(cal.month.getFullYear(), cal.month.getMonth() + Number(el.dataset.n), 1); App.render(); };
  V.actions['cal-today'] = () => { cal.month = null; cal.sel = null; App.render(); };
  V.actions['cal-mode'] = (el) => { cal.mode = el.dataset.m; App.render(); };

  /* ============================================================
     COURSES
     ============================================================ */
  V.courses = (listId) => {
    const st = S.state;
    if (!st.lists.length) S.state.lists.push({ id: U.uid(), name: 'Courses', emoji: '🛒', items: [] });
    const list = S.list(listId) || st.lists[0];
    const todo = list.items.filter(i => !i.checked), done = list.items.filter(i => i.checked);
    const current = new Set(todo.map(i => U.normalize(i.name)));
    const freq = Object.entries(st.itemHistory).filter(([k]) => !current.has(k)).sort((a, b) => b[1].count - a[1].count).slice(0, 12);
    const groups = BM.AISLES.map(a => ({ a, items: todo.filter(i => i.aisle === a.id) })).filter(g => g.items.length);
    const row = (i) => { const by = S.member(i.by); return `<li class="item ${i.checked ? 'checked' : ''}">
        <button class="check sm" data-action="item-toggle" data-l="${list.id}" data-i="${i.id}" aria-label="${i.checked ? 'Remettre' : 'Cocher'} ${esc(i.name)}">${i.checked ? '✓' : ''}</button>
        <span class="item-name" data-action="item-edit" data-l="${list.id}" data-i="${i.id}">${esc(i.name)}${i.qty ? ` <em class="qty">${esc(i.qty)}</em>` : ''}</span>
        ${by && st.members.length > 1 ? `<span class="item-by" title="Ajouté par ${esc(by.name)}">${by.avatar}</span>` : ''}
      </li>`; };
    return `
      <div class="page-head"><h1>🛒 Courses</h1><div class="head-actions"><button class="btn ghost small" data-action="list-share" data-l="${list.id}">📤 Partager</button>${S.isKid() ? '' : `<button class="btn ghost small" data-action="list-manage" data-l="${list.id}">⚙️</button>`}</div></div>
      <div class="chips scroll">${st.lists.map(l => `<a class="chip ${l.id === list.id ? 'on' : ''}" href="#/courses/${l.id}">${l.emoji} ${esc(l.name)} <small>${l.items.filter(i => !i.checked).length}</small></a>`).join('')}${S.isKid() ? '' : '<button class="chip add" data-action="list-new">＋ Liste</button>'}</div>
      <form data-form="item-add" data-l="${list.id}" class="quick-add" autocomplete="off">
        <span class="qa-ico">➕</span><input name="name" placeholder="Ajouter un article (ex. : lait, pommes…)" aria-label="Article" required list="item-sugg">
        <input name="qty" class="qty-input" placeholder="Qté" aria-label="Quantité" maxlength="12">
        <button class="btn primary">Ajouter</button>
        <datalist id="item-sugg">${Object.values(st.itemHistory).map(h => `<option value="${esc(h.name)}">`).join('')}</datalist>
      </form>
      ${freq.length ? `<div class="freq"><small>Souvent achetés :</small>${freq.map(([, h]) => `<button class="chip small" data-action="item-quick" data-l="${list.id}" data-n="${esc(h.name)}">＋ ${esc(h.name)}</button>`).join('')}</div>` : ''}
      ${groups.length ? groups.map(g => `<section class="aisle"><h3>${g.a.emoji} ${g.a.label} <small>${g.items.length}</small></h3><ul class="items">${g.items.map(row).join('')}</ul></section>`).join('') : App.empty('🧺', 'La liste est vide. Ajoute ce qu\'il manque à la maison !')}
      ${done.length ? `<section class="aisle done"><div class="aisle-head"><h3>✅ Dans le panier <small>${done.length}</small></h3><button class="btn small ghost" data-action="list-clear" data-l="${list.id}">Vider</button></div><ul class="items">${done.map(row).join('')}</ul></section>` : ''}`;
  };
  V.forms['item-add'] = (f) => {
    S.addItem(f.dataset.l, f.name.value, f.qty.value.trim());
    setTimeout(() => { const i = document.querySelector('[data-form=item-add] [name=name]'); if (i) i.focus(); }, 20);
  };
  V.actions['item-quick'] = (el) => S.addItem(el.dataset.l, el.dataset.n, '');
  V.actions['item-toggle'] = (el) => { const it = S.list(el.dataset.l).items.find(i => i.id === el.dataset.i); it.checked = !it.checked; S.save(); };
  V.actions['list-clear'] = (el) => { const l = S.list(el.dataset.l); const old = l.items.slice(); l.items = l.items.filter(i => !i.checked); S.save(); App.toast('Panier vidé', 4000, { label: 'Annuler', fn: () => { l.items = old; S.save(); } }); };
  V.actions['item-edit'] = (el) => {
    const l = S.list(el.dataset.l), it = l.items.find(i => i.id === el.dataset.i);
    App.modal(`<form id="it-form" class="form"><div class="modal-head"><h2 class="modal-title">Article</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">✕</button></div>
      <div class="grid-2"><label class="field"><span>Nom</span><input name="name" value="${esc(it.name)}" required></label><label class="field"><span>Quantité</span><input name="qty" value="${esc(it.qty)}"></label></div>
      <label class="field"><span>Rayon</span><select name="aisle">${BM.AISLES.map(a => `<option value="${a.id}" ${a.id === it.aisle ? 'selected' : ''}>${a.emoji} ${a.label}</option>`).join('')}</select></label>
      <label class="field"><span>Déplacer vers</span><select name="list">${S.state.lists.map(x => `<option value="${x.id}" ${x.id === l.id ? 'selected' : ''}>${x.emoji} ${esc(x.name)}</option>`).join('')}</select></label>
      <div class="modal-actions"><button type="button" class="btn ghost danger-text" id="it-del">Supprimer</button><span class="spacer"></span><button class="btn primary">Enregistrer</button></div></form>`, {
      onMount: (root) => {
        root.querySelector('[data-close]').addEventListener('click', App.closeModal);
        root.querySelector('#it-del').addEventListener('click', () => { l.items = l.items.filter(i => i !== it); App.closeModal(); S.save(); });
        root.querySelector('form').addEventListener('submit', (e) => {
          e.preventDefault(); const f = e.target;
          it.name = f.name.value.trim() || it.name; it.qty = f.qty.value.trim();
          S.setItemAisle(l.id, it.id, f.aisle.value);
          if (f.list.value !== l.id) { l.items = l.items.filter(i => i !== it); S.list(f.list.value).items.push(it); }
          App.closeModal(); S.save();
        });
      }
    });
  };
  V.actions['list-share'] = async (el) => {
    const l = S.list(el.dataset.l);
    const todo = l.items.filter(i => !i.checked);
    const text = l.emoji + ' ' + l.name + '\n' + BM.AISLES.map(a => { const it = todo.filter(i => i.aisle === a.id); return it.length ? '\n' + a.emoji + ' ' + a.label + '\n' + it.map(i => '☐ ' + i.name + (i.qty ? ' (' + i.qty + ')' : '')).join('\n') : ''; }).join('');
    try {
      if (navigator.share) await navigator.share({ title: l.name, text });
      else { await navigator.clipboard.writeText(text); App.toast('📋 Liste copiée — colle-la dans un message !'); }
    } catch (e) { /* partage annulé */ }
  };
  const listForm = (l) => `<form id="list-form" class="form"><div class="modal-head"><h2 class="modal-title">${l ? 'Modifier la liste' : 'Nouvelle liste'}</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">✕</button></div>
      <label class="field"><span>Nom</span><input name="name" required maxlength="40" value="${l ? esc(l.name) : ''}" placeholder="Ex. : Marché, Ikea, Anniversaire…" autofocus></label>
      <div class="field"><span>Icône</span><div class="emoji-pick compact">${['🛒', '💊', '🔨', '🥖', '🎁', '🧸', '🌿', '👕', '📚', '🎉', '🐾', '🏖️'].map((e, i) => `<label><input type="radio" name="emoji" value="${e}" ${(l ? l.emoji === e : i === 0) ? 'checked' : ''}><span>${e}</span></label>`).join('')}</div></div>
      <div class="modal-actions">${l ? '<button type="button" class="btn ghost danger-text" id="list-del">Supprimer la liste</button>' : ''}<span class="spacer"></span><button class="btn primary">${l ? 'Enregistrer' : 'Créer'}</button></div></form>`;
  V.actions['list-new'] = () => App.modal(listForm(null), {
    onMount: (root) => {
      root.querySelector('[data-close]').addEventListener('click', App.closeModal);
      root.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const l = S.addList(e.target.name.value.trim(), e.target.emoji.value); App.closeModal(); App.go('courses/' + l.id); });
    }
  });
  V.actions['list-manage'] = (el) => {
    const l = S.list(el.dataset.l);
    App.modal(listForm(l), {
      onMount: (root) => {
        root.querySelector('[data-close]').addEventListener('click', App.closeModal);
        root.querySelector('#list-del').addEventListener('click', async () => {
          if (await App.confirm('Supprimer la liste « ' + esc(l.name) + ' » et ses ' + l.items.length + ' articles ?', 'Supprimer')) { S.removeList(l.id); App.go('courses'); }
        });
        root.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); l.name = e.target.name.value.trim(); l.emoji = e.target.emoji.value; App.closeModal(); S.save(); });
      }
    });
  };

  /* ============================================================
     MÉNAGE
     ============================================================ */
  let mtab = 'w';
  const freqOf = (t) => t.freq || (!t.repeat || t.repeat.type === 'none' ? 'o' : (t.repeat.type === 'daily' || t.repeat.type === 'weekly') ? 'w' : 'm');
  V.menage = () => {
    const today = U.today();
    const all = S.state.tasks.filter(t => t.cat === 'menage' && !t.done);
    const tabs = [['w', '📆 Hebdomadaire'], ['m', '🗓️ Mensuel'], ['o', '⭐ Ponctuel']];
    const list = all.filter(t => freqOf(t) === mtab);
    const ws = U.startOfWeek(today), we = U.addDays(ws, 6);
    const periodStart = mtab === 'w' ? ws : mtab === 'm' ? today.slice(0, 8) + '01' : '0000';
    const doneInPeriod = (t) => t.lastDoneAt && U.toStr(new Date(t.lastDoneAt)) >= periodStart;
    const nDone = list.filter(doneInPeriod).length;
    const doneOnce = S.state.tasks.filter(t => t.cat === 'menage' && t.done && freqOf(t) === 'o');
    const rooms = BM.ROOMS.concat([{ id: '', label: 'Autres', emoji: '🧹' }]).map(r => ({ r, items: list.filter(t => (t.room || '') === r.id && (r.id !== '' || !BM.ROOMS.some(x => x.id === t.room))) })).filter(g => g.items.length);
    const row = (t) => {
      const people = (t.assignees || []).map(S.member).filter(Boolean);
      const last = t.lastDoneAt ? S.member(t.lastDoneBy) : null;
      const ok = doneInPeriod(t) && mtab !== 'o';
      return `<li class="clean-row ${ok ? 'ok' : ''} ${t.due && t.due < today ? 'is-late' : ''}">
        <button class="check" data-action="toggle-task" data-id="${t.id}" aria-label="Fait : ${esc(t.title)}">${ok ? '✓' : ''}</button>
        <div class="task-body" data-action="edit-task" data-id="${t.id}"><div class="task-title">${esc(t.title)}</div>
          <div class="task-meta">${t.due ? `<span class="${t.due < today ? 'late' : ''}">📆 ${U.relDay(t.due)}</span>` : '<span>Quand tu veux</span>'}${last ? `<span>Dernière fois : ${last.avatar} ${U.fmtShort(U.toStr(new Date(t.lastDoneAt)))}</span>` : ''}</div></div>
        <div class="task-people">${people.length ? people.map(p => av(p, 'xs')).join('') : '<span class="nobody" title="Personne">?</span>'}</div>
      </li>`;
    };
    return `
      <div class="page-head"><h1>🧽 Plan de ménage</h1><div class="head-actions">
        ${S.isKid() ? '' : `<button class="btn ghost small" data-action="clean-share">⚖️ Répartir</button>`}
        <button class="btn primary small" data-action="new-task" data-preset="${preset({ cat: 'menage', freq: mtab, due: mtab === 'o' ? '' : U.today(), repeat: mtab === 'w' ? { type: 'weekly', interval: 1, days: [U.weekday(U.today())] } : mtab === 'm' ? { type: 'monthly', interval: 1, days: [] } : { type: 'none', interval: 1, days: [] } })}">＋ Ajouter</button></div></div>
      <div class="seg wide">${tabs.map(([id, l]) => `<button class="${id === mtab ? 'on' : ''}" data-action="mtab" data-t="${id}">${l}</button>`).join('')}</div>
      ${list.length && mtab !== 'o' ? `<div class="progress-wrap"><div class="progress"><i style="width:${Math.round(nDone / list.length * 100)}%"></i></div><span>${nDone} / ${list.length} ${mtab === 'w' ? 'cette semaine' : 'ce mois-ci'}</span></div>` : ''}
      ${rooms.length ? `<div class="rooms">${rooms.map(g => `<section class="card room"><h2>${g.r.emoji} ${g.r.label}</h2><ul class="clean-list">${g.items.sort(sortTasks).map(row).join('')}</ul></section>`).join('')}</div>`
        : App.empty('🧼', 'Aucune tâche de ménage ici.', S.isKid() ? '' : '<button class="btn primary" data-action="clean-load">Charger le plan de ménage type</button>')}
      ${mtab === 'o' && doneOnce.length ? `<details class="card soft"><summary>✅ Déjà fait (${doneOnce.length})</summary><ul class="task-list compact">${doneOnce.map(t => App.taskItem(t)).join('')}</ul></details>` : ''}
      ${!S.isKid() && all.length ? `<p class="hint center">Astuce : attribue une tâche à un enfant et donne-lui des ⭐ pour la motiver !</p>` : ''}`;
  };
  V.actions.mtab = (el) => { mtab = el.dataset.t; App.render(); };
  V.actions['clean-load'] = () => V.loadCleaningPlan(false);
  V.actions['clean-share'] = () => {
    const st = S.state;
    App.modal(`<form id="share-form" class="form"><div class="modal-head"><h2 class="modal-title">⚖️ Répartir le ménage</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">✕</button></div>
      <p class="muted">Les tâches de ménage récurrentes seront réparties équitablement entre les personnes choisies (à tour de rôle, pièce par pièce).</p>
      <div class="people-pick">${st.members.map(m => `<label class="person-opt"><input type="checkbox" name="who" value="${m.id}" ${m.role === 'parent' ? 'checked' : ''}>${av(m, 'sm')}<span>${esc(m.name)}</span></label>`).join('')}</div>
      <label class="opt-inline"><input type="checkbox" name="onlyEmpty" checked> Seulement les tâches sans responsable</label>
      <div class="modal-actions"><span class="spacer"></span><button class="btn primary">Répartir</button></div></form>`, {
      onMount: (root) => {
        root.querySelector('[data-close]').addEventListener('click', App.closeModal);
        root.querySelector('form').addEventListener('submit', (e) => {
          e.preventDefault();
          const who = new FormData(e.target).getAll('who'); if (!who.length) return;
          const onlyEmpty = e.target.onlyEmpty.checked;
          let i = 0, n = 0;
          st.tasks.filter(t => t.cat === 'menage' && !t.done && t.repeat && t.repeat.type !== 'none' && (!onlyEmpty || !(t.assignees || []).length))
            .sort((a, b) => (a.room || '').localeCompare(b.room || '') || (a.due || '').localeCompare(b.due || ''))
            .forEach(t => { t.assignees = [who[i++ % who.length]]; n++; });
          App.closeModal(); S.save(); App.toast('⚖️ ' + n + ' tâches réparties !');
        });
      }
    });
  };

  /* ============================================================
     REPAS
     ============================================================ */
  let mealWeek = null;
  V.repas = () => {
    const today = U.today();
    if (!mealWeek) mealWeek = U.startOfWeek(today);
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => U.addDays(mealWeek, i));
    const kid = S.isKid();
    const slot = (d, s) => { const m = mealOf(d, s); return `<button class="meal-cell ${m ? 'filled' : ''}" ${kid ? 'disabled' : ''} data-action="meal-edit" data-d="${d}" data-s="${s}"><small>${s === 'midi' ? '☀️ Midi' : '🌙 Soir'}</small><span>${m ? esc(m.name) : (kid ? '—' : '＋')}</span></button>`; };
    return `
      <div class="page-head"><h1>🍽️ Menus de la semaine</h1>${kid ? '' : '<button class="btn ghost small" data-action="meal-shop">🛒 Ingrédients → courses</button>'}</div>
      <div class="week-nav"><button class="icon-btn" data-action="meal-week" data-n="-7" aria-label="Semaine précédente">‹</button><b>Semaine du ${U.fmtShort(mealWeek)}</b><button class="icon-btn" data-action="meal-week" data-n="7" aria-label="Semaine suivante">›</button></div>
      <div class="meal-week">${days.map((d, i) => `<div class="meal-day ${d === today ? 'today' : ''}"><h3>${BM.DAYS_LONG[i]} <small>${Number(d.slice(8))}</small></h3>${slot(d, 'midi')}${slot(d, 'soir')}</div>`).join('')}</div>
      ${kid ? '' : `<p class="hint center">💡 Planifier les repas une fois par semaine, c'est une énorme charge mentale en moins !</p>`}`;
  };
  V.actions['meal-week'] = (el) => { mealWeek = U.addDays(mealWeek, Number(el.dataset.n)); App.render(); };
  V.actions['meal-edit'] = (el) => {
    const d = el.dataset.d, s = el.dataset.s;
    const m = mealOf(d, s) || { name: '', ingredients: '' };
    App.modal(`<form id="meal-form" class="form"><div class="modal-head"><h2 class="modal-title">${U.fmtLong(d)} · ${s === 'midi' ? 'Midi' : 'Soir'}</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">✕</button></div>
      <label class="field"><span>Au menu</span><div class="inline-add"><input name="name" value="${esc(m.name)}" list="meal-ideas" placeholder="Ex. : Lasagnes" autofocus><button type="button" class="btn small" id="meal-rand" title="Idée au hasard">🎲</button></div></label>
      <datalist id="meal-ideas">${BM.MEAL_IDEAS.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
      <label class="field"><span>Ingrédients (un par ligne)</span><textarea name="ingredients" rows="4" placeholder="pâtes&#10;viande hachée&#10;tomates">${esc(m.ingredients || '')}</textarea></label>
      <label class="opt-inline"><input type="checkbox" name="toList"> Ajouter les ingrédients à la liste <select name="list">${S.state.lists.map(l => `<option value="${l.id}">${l.emoji} ${esc(l.name)}</option>`).join('')}</select></label>
      <div class="modal-actions">${m.name ? '<button type="button" class="btn ghost danger-text" id="meal-del">Effacer</button>' : ''}<span class="spacer"></span><button class="btn primary">Enregistrer</button></div></form>`, {
      onMount: (root) => {
        const f = root.querySelector('form');
        root.querySelector('[data-close]').addEventListener('click', App.closeModal);
        root.querySelector('#meal-rand').addEventListener('click', () => { f.name.value = BM.MEAL_IDEAS[Math.floor(Math.random() * BM.MEAL_IDEAS.length)]; });
        const del = root.querySelector('#meal-del');
        if (del) del.addEventListener('click', () => { if (S.state.meals[d]) delete S.state.meals[d][s]; App.closeModal(); S.save(); });
        f.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = f.name.value.trim(), ingredients = f.ingredients.value.trim();
          S.state.meals[d] = S.state.meals[d] || {};
          if (name) S.state.meals[d][s] = { name, ingredients }; else delete S.state.meals[d][s];
          if (f.toList.checked && ingredients && f.list.value) ingredients.split('\n').map(x => x.trim()).filter(Boolean).forEach(x => S.addItem(f.list.value, x, ''));
          App.closeModal(); S.save();
          if (f.toList.checked && ingredients) App.toast('🛒 Ingrédients ajoutés à la liste');
        });
      }
    });
  };
  V.actions['meal-shop'] = () => {
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => U.addDays(mealWeek, i));
    const ings = [];
    days.forEach(d => ['midi', 'soir'].forEach(s => { const m = mealOf(d, s); if (m && m.ingredients) m.ingredients.split('\n').map(x => x.trim()).filter(Boolean).forEach(x => ings.push(x)); }));
    if (!ings.length) { App.toast('Ajoute d\'abord des ingrédients à tes repas 🙂'); return; }
    const list = S.state.lists[0];
    ings.forEach(x => S.addItem(list.id, x, ''));
    App.toast('🛒 ' + ings.length + ' ingrédients ajoutés à « ' + list.name + ' »');
  };

  /* ============================================================
     SECTIONS
     ============================================================ */
  V.sections = () => {
    const open = S.openTasks();
    return `<div class="page-head"><h1>🗂️ Sections</h1></div>
      <p class="muted">Chaque section regroupe ses tâches et des idées de choses à ne pas oublier.</p>
      <div class="cat-grid">${visibleCats().map(c => { const n = open.filter(t => t.cat === c.id).length; return `<a href="#/section/${c.id}" class="cat-tile big" style="--cat:${c.color}"><span class="cat-emoji">${c.emoji}</span><span class="cat-name">${c.label}</span><span class="cat-sub">${n ? n + ' à faire' : 'Tout est à jour'}</span></a>`; }).join('')}</div>`;
  };
  V.section = (id) => {
    const c = BM.catById(id);
    if (S.isKid() && !c.kid) return V.sections();
    const open = S.openTasks().filter(t => t.cat === c.id).sort(sortTasks);
    const done = S.state.tasks.filter(t => t.cat === c.id && t.done).length;
    const existing = new Set(S.state.tasks.filter(t => !t.done).map(t => U.normalize(t.title)));
    const ideas = (BM.IDEAS[c.id] || []).filter(([title]) => !existing.has(U.normalize(title)));
    return `
      <a class="back" href="#/sections">← Sections</a>
      <section class="hero cat-hero" style="--cat:${c.color}"><div class="hero-text"><h1>${c.emoji} ${c.label}</h1><p class="hero-sub">${open.length} à faire · ${done} terminée${done > 1 ? 's' : ''}</p></div>
        <button class="btn primary" data-action="new-task" data-preset="${preset({ cat: c.id })}">＋ Ajouter</button></section>
      ${open.length ? `<ul class="task-list">${open.map(t => App.taskItem(t)).join('')}</ul>` : App.empty(c.emoji, 'Rien à faire dans cette section pour l\'instant.')}
      ${ideas.length && !S.isKid() ? `<section class="card soft"><div class="card-head"><h2>🧠 Pour ne rien oublier</h2></div><ul class="ideas">${ideas.map(([title, rep]) => `<li><span>${esc(title)}${rep !== 'none' ? ` <small class="muted">· ${U.repeatLabel(U.parseRepeat(rep)).toLowerCase()}</small>` : ''}</span><button class="btn small" data-action="new-task" data-preset="${preset({ title, cat: c.id, repeat: U.parseRepeat(rep), reminder: rep === 'none' ? -1 : 1440 })}" aria-label="Ajouter ${esc(title)}">＋</button></li>`).join('')}</ul></section>` : ''}
      ${c.id === 'menage' ? '<a class="btn block ghost" href="#/menage">Voir le plan de ménage pièce par pièce →</a>' : ''}
      ${c.id === 'repas' ? '<a class="btn block ghost" href="#/repas">Voir les menus de la semaine →</a>' : ''}`;
  };

  /* ============================================================
     FAMILLE
     ============================================================ */
  V.famille = () => {
    const st = S.state, today = U.today(), ws = U.startOfWeek(today), we = U.addDays(ws, 6);
    const open = S.openTasks();
    return `<div class="page-head"><h1>👨‍👩‍👦 Notre famille</h1><button class="btn primary" data-action="member-edit">＋ Ajouter</button></div>
      <div class="members">${st.members.map(m => {
        const todo = open.filter(t => isMine(t, m)).length, wk = doneBetween(ws, we, m.id);
        return `<article class="member-card" style="--c:${m.color}">
          ${av(m, 'xl')}<h2>${esc(m.name)}</h2><span class="pill">${m.role === 'enfant' ? 'Enfant' : 'Parent'}${m.id === st.currentId ? ' · moi' : ''}</span>
          <dl><div><dt>À faire</dt><dd>${todo}</dd></div><div><dt>Faits cette semaine</dt><dd>${wk}</dd></div><div><dt>Étoiles</dt><dd>⭐ ${m.points || 0}</dd></div></dl>
          ${m.birthday ? `<p class="muted small">🎂 ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(U.parse(m.birthday))}</p>` : ''}
          <div class="member-actions"><a class="btn small ghost" href="#/taches/all" data-action="member-tasks" data-id="${m.id}">Ses tâches</a><button class="btn small" data-action="member-edit" data-id="${m.id}">Modifier</button></div>
        </article>`; }).join('')}
      </div>
      <p class="hint center">🔒 Astuce : mets un code sur les profils parents pour que les enfants ne puissent pas y accéder.</p>`;
  };
  V.actions['member-tasks'] = (el) => { tf.who = el.dataset.id; App.go('taches/all'); };
  V.actions['member-edit'] = (el) => {
    const m = el.dataset.id ? S.member(el.dataset.id) : null;
    const d = m || { name: '', avatar: '🧒', color: BM.COLORS[S.state.members.length % BM.COLORS.length], role: 'enfant', birthday: '', pin: '' };
    App.modal(`<form id="member-form" class="form"><div class="modal-head"><h2 class="modal-title">${m ? 'Modifier ' + esc(m.name) : 'Nouveau membre'}</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">✕</button></div>
      <div class="grid-2"><label class="field"><span>Prénom</span><input name="name" required maxlength="30" value="${esc(d.name)}" autofocus></label>
      <label class="field"><span>Rôle</span><select name="role"><option value="parent">Parent</option><option value="enfant" ${d.role === 'enfant' ? 'selected' : ''}>Enfant (interface simplifiée)</option></select></label></div>
      <div class="field"><span>Avatar</span><div class="emoji-pick compact">${BM.AVATARS.map(a => `<label><input type="radio" name="avatar" value="${a}" ${a === d.avatar ? 'checked' : ''}><span>${a}</span></label>`).join('')}</div></div>
      <div class="field"><span>Couleur</span><div class="color-pick">${BM.COLORS.map(c => `<label><input type="radio" name="color" value="${c}" ${c === d.color ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div></div>
      <div class="grid-2"><label class="field"><span>Date de naissance</span><input type="date" name="birthday" value="${d.birthday || ''}"></label>
      <label class="field"><span>Code du profil (facultatif)</span><input name="pin" inputmode="numeric" maxlength="6" pattern="[0-9]{0,6}" value="${esc(d.pin || '')}" placeholder="4 chiffres"></label></div>
      <div class="modal-actions">${m && S.state.members.length > 1 ? '<button type="button" class="btn ghost danger-text" id="m-del">Retirer</button>' : ''}<span class="spacer"></span><button class="btn primary">${m ? 'Enregistrer' : 'Ajouter'}</button></div></form>`, {
      onMount: (root) => {
        root.querySelector('[data-close]').addEventListener('click', App.closeModal);
        const del = root.querySelector('#m-del');
        if (del) del.addEventListener('click', async () => { if (await App.confirm('Retirer ' + esc(m.name) + ' de la famille ? Ses tâches resteront, sans responsable.', 'Retirer')) S.removeMember(m.id); });
        root.querySelector('form').addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const data = { name: fd.get('name').trim(), role: fd.get('role'), avatar: fd.get('avatar'), color: fd.get('color'), birthday: fd.get('birthday') || '', pin: (fd.get('pin') || '').trim() };
          App.closeModal();
          if (m) S.updateMember(m.id, data); else S.addMember(data);
        });
      }
    });
  };

  /* ============================================================
     RÉCOMPENSES
     ============================================================ */
  V.recompenses = () => {
    const st = S.state, me = S.me(), kid = S.isKid();
    const kids = st.members.filter(m => m.role === 'enfant');
    const rewards = st.rewards.slice().sort((a, b) => a.cost - b.cost);
    if (kid) {
      return `<div class="page-head"><h1>🏆 Mes récompenses</h1></div>
        <div class="star-hero"><span>⭐</span><b>${me.points || 0}</b><small>étoiles gagnées</small></div>
        <div class="rewards">${rewards.map(r => { const ok = (me.points || 0) >= r.cost; return `<article class="reward ${ok ? 'ok' : ''}"><span class="rw-emoji">${r.emoji}</span><b>${esc(r.title)}</b><small>⭐ ${r.cost}</small>
          ${ok ? `<button class="btn primary small" data-action="reward-redeem" data-id="${r.id}">Je choisis !</button>` : `<div class="progress small"><i style="width:${Math.min(100, (me.points || 0) / r.cost * 100)}%"></i></div><small class="muted">Encore ${r.cost - (me.points || 0)} ⭐</small>`}</article>`; }).join('') || App.empty('🎁', 'Demande à papa ou maman d\'ajouter des récompenses !')}</div>`;
    }
    return `<div class="page-head"><h1>🏆 Récompenses</h1><button class="btn primary" data-action="reward-edit">＋ Récompense</button></div>
      <p class="muted">Les enfants gagnent des étoiles ⭐ en terminant leurs missions, puis les échangent contre des récompenses.</p>
      ${kids.length ? `<div class="kid-scores">${kids.map(k => `<div class="kid-score" style="--c:${k.color}">${av(k, 'lg')}<b>${esc(k.name)}</b><span>⭐ ${k.points || 0}</span>
          <div class="row"><button class="btn small ghost" data-action="pts" data-id="${k.id}" data-n="-5" aria-label="Retirer 5 étoiles">−5</button><button class="btn small" data-action="pts" data-id="${k.id}" data-n="5" aria-label="Donner 5 étoiles">+5 ⭐</button></div></div>`).join('')}</div>`
        : `<div class="card soft">Ajoute un enfant dans <a href="#/famille">Famille</a> pour utiliser les récompenses.</div>`}
      <h2 class="section-title">🎁 Catalogue</h2>
      <div class="rewards">${rewards.map(r => `<article class="reward" data-action="reward-edit" data-id="${r.id}"><span class="rw-emoji">${r.emoji}</span><b>${esc(r.title)}</b><small>⭐ ${r.cost}</small></article>`).join('') || App.empty('🎁', 'Aucune récompense pour l\'instant.')}</div>
      ${st.redemptions.length ? `<h2 class="section-title">📜 Historique</h2><ul class="soon">${st.redemptions.slice(0, 15).map(x => { const k = S.member(x.memberId); return `<li><span class="soon-ico">${x.emoji}</span><span>${k ? esc(k.name) : '?'} — ${esc(x.title)}</span><small>${new Date(x.at).toLocaleDateString('fr-FR')}</small></li>`; }).join('')}</ul>` : ''}`;
  };
  V.actions.pts = (el) => { const m = S.member(el.dataset.id); m.points = Math.max(0, (m.points || 0) + Number(el.dataset.n)); if (Number(el.dataset.n) > 0) S.pushNotif(m.id, '🎁 Tu as reçu ' + el.dataset.n + ' étoiles bonus !'); S.save(); };
  V.actions['reward-redeem'] = async (el) => {
    const r = S.state.rewards.find(x => x.id === el.dataset.id);
    if (await App.confirm('Échanger ' + r.cost + ' ⭐ contre « ' + esc(r.title) + ' » ?', 'Oui ! 🎉')) {
      if (S.redeem(r.id, S.me().id)) { App.confetti(); App.toast('🎉 Super ! Papa et maman sont prévenus.'); }
    }
  };
  V.actions['reward-edit'] = (el) => {
    const r = el.dataset.id ? S.state.rewards.find(x => x.id === el.dataset.id) : null;
    const d = r || { title: '', emoji: '🎁', cost: 20 };
    const emojis = ['🎁', '🍰', '📺', '🎮', '🛝', '🍿', '🍦', '📚', '🧸', '🎨', '⚽', '🏊', '🍕', '🌙', '🎟️', '💶'];
    App.modal(`<form class="form"><div class="modal-head"><h2 class="modal-title">${r ? 'Modifier' : 'Nouvelle'} récompense</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">✕</button></div>
      <label class="field"><span>Récompense</span><input name="title" required maxlength="60" value="${esc(d.title)}" placeholder="Ex. : Choisir le film du samedi" autofocus></label>
      <div class="field"><span>Icône</span><div class="emoji-pick compact">${emojis.map(e => `<label><input type="radio" name="emoji" value="${e}" ${e === d.emoji ? 'checked' : ''}><span>${e}</span></label>`).join('')}</div></div>
      <label class="field"><span>Prix en étoiles ⭐</span><input type="number" name="cost" min="1" max="1000" value="${d.cost}"></label>
      <div class="modal-actions">${r ? '<button type="button" class="btn ghost danger-text" id="rw-del">Supprimer</button>' : ''}<span class="spacer"></span><button class="btn primary">Enregistrer</button></div></form>`, {
      onMount: (root) => {
        root.querySelector('[data-close]').addEventListener('click', App.closeModal);
        const del = root.querySelector('#rw-del');
        if (del) del.addEventListener('click', () => { S.state.rewards = S.state.rewards.filter(x => x !== r); App.closeModal(); S.save(); });
        root.querySelector('form').addEventListener('submit', (e) => {
          e.preventDefault(); const f = e.target;
          const data = { title: f.title.value.trim(), emoji: f.emoji.value, cost: Math.max(1, Number(f.cost.value) || 1) };
          if (r) Object.assign(r, data); else S.state.rewards.push(Object.assign({ id: U.uid() }, data));
          App.closeModal(); S.save();
        });
      }
    });
  };

  /* ============================================================
     INFOS UTILES
     ============================================================ */
  const INFO_GROUPS = [['sante', '🩺 Santé'], ['ecole', '🎒 École & garde'], ['maison', '🏠 Maison & dépannage'], ['contacts', '👥 Contacts'], ['autre', '📌 Autres']];
  V.infos = () => {
    const st = S.state;
    return `<div class="page-head"><h1>📒 Infos utiles</h1><button class="btn primary" data-action="info-edit">＋ Ajouter</button></div>
      <p class="muted">Tout ce qu'on cherche toujours au mauvais moment : médecin, école, nounou, plombier, n° de contrat…</p>
      <section class="card urgent"><h2>🚨 Numéros d'urgence</h2><div class="sos">
        <a href="tel:15"><b>15</b><span>SAMU</span></a><a href="tel:18"><b>18</b><span>Pompiers</span></a><a href="tel:17"><b>17</b><span>Police</span></a><a href="tel:112"><b>112</b><span>Urgences (Europe)</span></a><a href="tel:119"><b>119</b><span>Enfance en danger</span></a>
      </div></section>
      ${INFO_GROUPS.map(([g, label]) => { const items = st.infos.filter(i => (i.group || 'autre') === g); return items.length ? `<section class="card"><h2>${label}</h2><ul class="infos">${items.map(i => `<li data-action="info-edit" data-id="${i.id}"><b>${esc(i.title)}</b><span>${esc(i.value).replace(/\n/g, '<br>')}</span>${/^[+0-9 ().-]{6,}$/.test(i.value.trim()) ? `<a class="btn small ghost" href="tel:${esc(i.value.replace(/[^+0-9]/g, ''))}" onclick="event.stopPropagation()">📞</a>` : ''}</li>`).join('')}</ul></section>` : ''; }).join('')}
      ${st.infos.length ? '' : App.empty('📒', 'Ajoute le numéro du médecin, de l\'école, de la nounou…')}
      <p class="hint center">🔐 Ne note pas ici de mots de passe ni de codes bancaires.</p>`;
  };
  V.actions['info-edit'] = (el) => {
    const i = el.dataset.id ? S.state.infos.find(x => x.id === el.dataset.id) : null;
    const d = i || { title: '', value: '', group: 'sante' };
    App.modal(`<form class="form"><div class="modal-head"><h2 class="modal-title">${i ? 'Modifier' : 'Nouvelle'} info</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">✕</button></div>
      <label class="field"><span>Titre</span><input name="title" required maxlength="60" value="${esc(d.title)}" placeholder="Ex. : Pédiatre — Dr Martin" autofocus></label>
      <label class="field"><span>Info (numéro, adresse, horaires…)</span><textarea name="value" rows="3">${esc(d.value)}</textarea></label>
      <label class="field"><span>Catégorie</span><select name="group">${INFO_GROUPS.map(([g, l]) => `<option value="${g}" ${g === d.group ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="modal-actions">${i ? '<button type="button" class="btn ghost danger-text" id="in-del">Supprimer</button>' : ''}<span class="spacer"></span><button class="btn primary">Enregistrer</button></div></form>`, {
      onMount: (root) => {
        root.querySelector('[data-close]').addEventListener('click', App.closeModal);
        const del = root.querySelector('#in-del');
        if (del) del.addEventListener('click', () => { S.state.infos = S.state.infos.filter(x => x !== i); App.closeModal(); S.save(); });
        root.querySelector('form').addEventListener('submit', (e) => {
          e.preventDefault(); const f = e.target;
          const data = { title: f.title.value.trim(), value: f.value.value.trim(), group: f.group.value };
          if (i) Object.assign(i, data); else S.state.infos.push(Object.assign({ id: U.uid() }, data));
          App.closeModal(); S.save();
        });
      }
    });
  };

  /* ============================================================
     RÉGLAGES & PLUS
     ============================================================ */
  V.reglages = () => {
    const st = S.state, p = N.permission();
    const pLabel = { granted: '✅ Activées sur cet appareil', denied: '⛔ Bloquées — autorise-les dans les réglages du navigateur', default: 'Pas encore activées', unsupported: 'Non disponibles sur ce navigateur' }[p];
    return `<div class="page-head"><h1>⚙️ Réglages</h1></div>
      ${window.Sync ? Sync.card() : ''}
      <section class="card"><h2>🔔 Notifications & rappels</h2>
        <div class="setting"><div><b>Notifications</b><small>${pLabel}</small></div>${p === 'default' ? '<button class="btn primary small" data-action="notif-on">Activer</button>' : p === 'granted' ? '<button class="btn small ghost" data-action="notif-test">Tester</button>' : ''}</div>
        <div class="setting"><div><b>Résumé du matin</b><small>Ce qu'il y a à faire dans la journée</small></div><label class="switch"><input type="checkbox" data-change="set-summary" ${st.settings.summary ? 'checked' : ''}><span></span></label></div>
        <div class="setting"><div><b>Heure du résumé</b></div><input type="time" value="${st.settings.summaryTime}" data-change="set-summary-time" aria-label="Heure du résumé"></div>
        <p class="hint">ℹ️ Les rappels s'affichent quand l'appli est ouverte ou en arrière-plan. Pour des rappels garantis même téléphone verrouillé, exporte l'agenda ci-dessous vers ton agenda habituel.</p>
      </section>
      <section class="card"><h2>📲 Agenda du téléphone</h2>
        <div class="setting"><div><b>Exporter toutes les tâches datées</b><small>Fichier .ics avec rappels, à ouvrir dans Google Agenda, Calendrier iPhone ou Outlook</small></div><button class="btn small" data-action="ics-all">Exporter</button></div>
      </section>
      <section class="card"><h2>🎨 Apparence</h2>
        <div class="seg">${[['auto', 'Automatique'], ['light', '☀️ Clair'], ['dark', '🌙 Sombre']].map(([v, l]) => `<button class="${st.settings.theme === v ? 'on' : ''}" data-action="theme" data-v="${v}">${l}</button>`).join('')}</div>
      </section>
      <section class="card"><h2>💾 Sauvegarde</h2>
        <p class="muted small">Les données sont enregistrées sur cet appareil. Fais une sauvegarde de temps en temps, ou pour transférer l'appli sur un autre appareil.</p>
        <div class="row wrap"><button class="btn" data-action="export">⬇️ Télécharger une sauvegarde</button><label class="btn ghost">⬆️ Restaurer<input type="file" accept="application/json,.json" data-change="import" hidden></label></div>
      </section>
      <section class="card"><h2>ℹ️ À propos</h2><p class="muted small">BMChores · version 1.0 · ${st.tasks.length} tâches, ${st.members.length} membres.</p>
        <button class="btn ghost danger-text small" data-action="reset">Tout effacer et recommencer</button></section>`;
  };
  V.actions['notif-on'] = async () => { await N.request(); App.render(); };
  V.actions['notif-test'] = () => N.show('BMChores 🏡', 'Ceci est un rappel de test. Tout fonctionne !', 'test');
  V.changes['set-summary'] = (el) => { S.state.settings.summary = el.checked; S.save(); };
  V.changes['set-summary-time'] = (el) => { S.state.settings.summaryTime = el.value || '08:00'; S.state.settings.lastSummary = ''; S.save(); };
  V.actions.theme = (el) => { S.state.settings.theme = el.dataset.v; S.save(); };
  V.actions['ics-all'] = () => { const n = S.state.tasks.filter(t => t.due && !t.done).length; U.download('bmchores-agenda.ics', U.toICS(S.state.tasks), 'text/calendar'); App.toast('📲 ' + n + ' tâches exportées'); };
  V.actions.export = () => U.download('bmchores-sauvegarde-' + U.today() + '.json', S.exportJSON(), 'application/json');
  V.changes.import = (el) => {
    const file = el.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = async () => {
      const shared = window.Sync && Sync.familyId;
      if (!(await App.confirm(shared ? 'Remplacer les données de TOUTE la famille (tous les appareils) par cette sauvegarde ?' : 'Remplacer toutes les données actuelles par cette sauvegarde ?', 'Restaurer'))) return;
      try { S.importJSON(r.result); App.toast('✅ Sauvegarde restaurée'); } catch (e) { App.toast('⚠️ ' + e.message); }
    };
    r.readAsText(file);
  };
  V.actions.reset = async () => {
    const shared = window.Sync && Sync.familyId;
    if (await App.confirm(shared ? 'Déconnecter cet appareil de la famille et effacer ses données locales ? (Les données en ligne de la famille ne sont pas touchées.)' : 'Effacer toutes les données de BMChores sur cet appareil ? C\'est définitif.', 'Tout effacer')) {
      if (shared) await Sync.signOut();
      S.reset(); ob.step = 1; ob.others = []; location.hash = ''; App.render(); }
  };

  V.plus = () => `<div class="page-head"><h1>☰ Plus</h1></div>
    <div class="cat-grid">${App.NAV.filter(n => !n.tab && (!S.isKid() || n.kid)).map(n => `<a href="#/${n.id}" class="cat-tile big"><span class="cat-emoji">${n.emoji}</span><span class="cat-name">${n.label}</span></a>`).join('')}</div>`;

  window.Views = V;
})();
