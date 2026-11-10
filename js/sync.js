/* BMChores — synchronisation familiale avec Firebase (Firestore + Authentication)

   Modèle : families/{familyId}                 { name, ownerUid, uids[], createdAt }
            families/{familyId}/{collection}/{id} une entité par document
            invites/{code}                         { familyId, createdBy, createdAt } (valable 7 jours)

   Fusion à trois voies : pour chaque document on mémorise l'empreinte de la dernière
   version synchronisée (« base »). Local ≠ base → on envoie ; distant ≠ base → on applique
   (en cas de conflit, la version distante l'emporte). Fonctionne hors ligne. */
(function () {
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const KEY = 'bmchores:sync';
  const COLS = ['members', 'tasks', 'lists', 'items', 'rewards', 'infos', 'notifs', 'redemptions', 'meals', 'meta'];
  const ARRAYS = ['members', 'tasks', 'rewards', 'infos', 'notifs', 'redemptions'];

  const Y = { status: 'off', user: null, familyId: null, familyName: '', error: '', ready: false, found: [], loaded: false };
  let fb = null, db = null, auth = null, unsubs = [], base = {}, pendingFirst = new Set();
  COLS.forEach(c => { base[c] = new Map(); });

  Y.configured = () => !!(window.BM_FIREBASE && window.BM_FIREBASE.apiKey) || !!Y._fake;

  /* ---------- Empreintes ---------- */
  const clean = (o) => JSON.parse(JSON.stringify(o));
  const canon = (v) => {
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
    return JSON.stringify(v);
  };
  const hash = (str) => {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };
  const H = (data) => hash(canon(data));

  /* ---------- Mémoire de synchro (par appareil) ---------- */
  function loadMeta() {
    try {
      const m = JSON.parse(localStorage.getItem(KEY) || '{}');
      Y.familyId = m.familyId || null; Y.familyName = m.familyName || '';
      COLS.forEach(c => { base[c] = new Map(Object.entries((m.base || {})[c] || {})); });
    } catch (e) { COLS.forEach(c => { base[c] = new Map(); }); }
  }
  function saveMetaNow() {
    const b = {}; COLS.forEach(c => { b[c] = Object.fromEntries(base[c]); });
    try { localStorage.setItem(KEY, JSON.stringify({ familyId: Y.familyId, familyName: Y.familyName, base: b })); } catch (e) { /* stockage plein */ }
  }
  const saveMeta = U.debounce(saveMetaNow, 300);
  window.addEventListener('pagehide', saveMetaNow);

  /* ---------- État local → documents ---------- */
  function toDocs(st) {
    const out = {}; COLS.forEach(c => { out[c] = new Map(); });
    ARRAYS.forEach(c => (st[c] || []).forEach(x => out[c].set(x.id, x)));
    st.lists.forEach((l, i) => {
      out.lists.set(l.id, { id: l.id, name: l.name, emoji: l.emoji, order: i });
      l.items.forEach((it, j) => out.items.set(it.id, Object.assign({}, it, { listId: l.id, order: j })));
    });
    Object.keys(st.meals || {}).forEach(d => { const v = st.meals[d]; if (v && Object.keys(v).length) out.meals.set(d, Object.assign({ id: d }, v)); });
    if (st.itemHistory && Object.keys(st.itemHistory).length) out.meta.set('itemHistory', { id: 'itemHistory', map: st.itemHistory });
    return out;
  }

  /* ---------- Document distant → état local ---------- */
  function applyChange(c, id, data) {
    const st = S.state;
    if (ARRAYS.includes(c)) {
      const arr = st[c], i = arr.findIndex(x => x.id === id);
      if (data) { if (i >= 0) arr[i] = data; else arr.push(data); } else if (i >= 0) arr.splice(i, 1);
    } else if (c === 'meals') {
      if (data) { const v = Object.assign({}, data); delete v.id; st.meals[id] = v; } else delete st.meals[id];
    } else if (c === 'meta') {
      if (id === 'itemHistory') st.itemHistory = data ? (data.map || {}) : {};
    } else if (c === 'lists') {
      let l = st.lists.find(x => x.id === id);
      if (data) { if (!l) { l = { id, items: [] }; st.lists.push(l); } l.name = data.name; l.emoji = data.emoji; l.order = data.order; }
      else st.lists = st.lists.filter(x => x.id !== id);
    } else if (c === 'items') {
      st.lists.forEach(l => { l.items = l.items.filter(x => x.id !== id); });
      if (data) {
        let l = st.lists.find(x => x.id === data.listId);
        if (!l) { l = { id: data.listId, name: 'Liste', emoji: '🛒', items: [], order: 999 }; st.lists.push(l); }
        l.items.push(data);
      }
    }
  }
  /* Tri stable : un élément sans « order » (ajouté ici, pas encore envoyé) garde sa position */
  const sortByOrder = (arr) => {
    const idx = new Map(arr.map((x, i) => [x, i]));
    const ord = (x) => (typeof x.order === 'number' ? x.order : idx.get(x));
    arr.sort((a, b) => ord(a) - ord(b) || idx.get(a) - idx.get(b));
  };
  function sortAll() {
    const st = S.state;
    sortByOrder(st.lists);
    st.lists.forEach(l => sortByOrder(l.items));
    st.notifs.sort((a, b) => b.at - a.at);
    st.redemptions.sort((a, b) => b.at - a.at);
  }

  function wipeFamilyData() {
    const st = S.state;
    ARRAYS.forEach(c => { st[c] = []; });
    st.lists = []; st.meals = {}; st.itemHistory = {}; st.currentId = null;
  }

  /* ---------- Envoi des modifications locales ---------- */
  function doPush() {
    if (!Y.ready || !db || !Y.familyId) return;
    const docs = toDocs(S.state), ops = [];
    COLS.forEach(c => {
      docs[c].forEach((obj, id) => {
        const data = clean(obj), h = H(data);
        if (base[c].get(id) !== h) { ops.push({ set: true, c, id, data }); base[c].set(id, h); }
      });
      Array.from(base[c].keys()).forEach(id => { if (!docs[c].has(id)) { ops.push({ set: false, c, id }); base[c].delete(id); } });
    });
    if (!ops.length) return;
    saveMeta();
    setStatus('syncing');
    for (let i = 0; i < ops.length; i += 400) {
      const batch = fb.writeBatch(db);
      ops.slice(i, i + 400).forEach(op => {
        const ref = fb.doc(db, 'families', Y.familyId, op.c, op.id);
        if (op.set) batch.set(ref, op.data); else batch.delete(ref);
      });
      /* pas d'attente : hors ligne, Firestore garde les écritures en file et les envoie au retour du réseau */
      batch.commit().then(() => setStatus(navigator.onLine ? 'synced' : 'offline')).catch(onError);
    }
    if (!navigator.onLine) setStatus('offline');
  }
  Y.push = U.debounce(doPush, 350);

  /* ---------- Réception en temps réel ---------- */
  function subscribe() {
    pendingFirst = new Set(COLS);
    COLS.forEach(c => {
      const ref = fb.collection(db, 'families', Y.familyId, c);
      const un = fb.onSnapshot(ref, { includeMetadataChanges: true }, (snap) => {
        let changed = false;
        snap.docChanges().forEach(ch => {
          const id = ch.doc.id;
          if (ch.type === 'removed') {
            if (snap.metadata.fromCache && pendingFirst.has(c)) return;
            base[c].delete(id); applyChange(c, id, null); changed = true; return;
          }
          const data = ch.doc.data(), h = H(data);
          if (base[c].get(id) === h) return;            // écho de notre propre écriture, ou rien de neuf
          base[c].set(id, h); applyChange(c, id, data); changed = true;
          if (c === 'notifs' && Y.ready) alertIfForMe(data);
        });
        /* Première réponse du serveur : ce qui est dans la base mais plus sur le serveur a été supprimé ailleurs */
        if (!snap.metadata.fromCache && pendingFirst.has(c)) {
          const present = new Set(snap.docs.map(d => d.id));
          Array.from(base[c].keys()).forEach(id => { if (!present.has(id)) { base[c].delete(id); applyChange(c, id, null); changed = true; } });
          pendingFirst.delete(c);
          if (!pendingFirst.size) onReady();
        }
        if (changed) { sortAll(); saveMeta(); S.save({ remote: true }); }
      }, onError);
      unsubs.push(un);
    });
  }

  function onReady() {
    Y.ready = true;
    const st = S.state;
    if (!st.onboarded && st.members.length) { st.onboarded = true; S.save({ remote: true }); }
    setStatus(navigator.onLine ? 'synced' : 'offline');
    doPush();
    if (Y.mode === 'join') {
      Y.mode = 'resume';
      App.go('accueil');
      setTimeout(() => {
        App.toast('☁️ Famille « ' + Y.familyName + ' » synchronisée !');
        if (!S.member(st.currentId)) App.switchProfile();
      }, 200);
    }
  }

  function alertIfForMe(n) {
    const me = S.me();
    if (me && n.to === me.id && !n.read && Date.now() - n.at < 15 * 60000) N.show('BMChores 🏡', n.text, 'n-' + n.id);
  }

  function stop() { unsubs.forEach(u => { try { u(); } catch (e) { /* déjà arrêté */ } }); unsubs = []; Y.ready = false; }

  function connect(mode) {
    stop();
    Y.mode = mode;
    if (mode === 'join') { wipeFamilyData(); COLS.forEach(c => { base[c] = new Map(); }); S.save({ remote: true }); }
    if (mode === 'create') COLS.forEach(c => { base[c] = new Map(); });
    saveMetaNow();
    setStatus('syncing');
    subscribe();
    fb.getDoc(fb.doc(db, 'families', Y.familyId)).then(d => {
      if (d.exists()) { Y.familyName = d.data().name || 'Notre famille'; Y.uids = d.data().uids || []; saveMetaNow(); refreshCard(); }
    }).catch(onError);
  }

  /* ---------- Statut & erreurs ---------- */
  function setStatus(s) {
    Y.status = s;
    const el = document.getElementById('sync-ind');
    if (el) {
      el.hidden = !Y.configured() || s === 'off';
      el.dataset.s = s;
      el.title = { synced: 'Synchronisé ✓', syncing: 'Synchronisation…', offline: 'Hors ligne — les modifications seront envoyées plus tard', signedout: 'Synchronisation : connecte-toi', nofamily: 'Synchronisation : crée ou rejoins ta famille', error: 'Problème de synchronisation' }[s] || '';
    }
    refreshCard();
  }
  window.addEventListener('online', () => { if (Y.ready) setStatus('synced'); });
  window.addEventListener('offline', () => { if (Y.ready) setStatus('offline'); });

  const MSG = {
    'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
    'auth/wrong-password': 'Mot de passe incorrect.',
    'auth/user-not-found': 'Aucun compte avec cet e-mail.',
    'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail : connecte-toi plutôt.',
    'auth/weak-password': 'Le mot de passe doit faire au moins 6 caractères.',
    'auth/invalid-email': 'Adresse e-mail invalide.',
    'auth/network-request-failed': 'Pas de connexion internet.',
    'auth/too-many-requests': 'Trop d\'essais. Réessaie dans quelques minutes.',
    'auth/unauthorized-domain': 'Ce site n\'est pas autorisé dans Firebase (Authentication > Paramètres > Domaines autorisés).',
    'permission-denied': 'Accès refusé : tu ne fais pas (ou plus) partie de cette famille, ou le code a expiré.',
    'unavailable': 'Serveur injoignable. Les modifications seront envoyées au retour du réseau.'
  };
  const msg = (e) => MSG[e && e.code] || (e && e.message) || 'Erreur inconnue';
  function onError(e) {
    console.warn('Synchro :', e);
    Y.error = msg(e);
    if (e && e.code === 'unavailable') { setStatus('offline'); return; }
    setStatus('error');
    App.toast('☁️ ' + Y.error, 6000);
  }

  /* ---------- Démarrage ---------- */
  async function loadSDK() {
    const [A, AU, FS] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
    fb = Object.assign({}, A, AU, FS);
    const app = fb.initializeApp(window.BM_FIREBASE);
    auth = fb.getAuth(app);
    try { db = fb.initializeFirestore(app, { localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() }) }); }
    catch (e) { db = fb.getFirestore(app); }
  }

  Y.init = async () => {
    loadMeta();
    registerActions();
    if (!Y.configured()) { setStatus('off'); return; }
    if (!Y._fake) {
      try { await loadSDK(); }
      catch (e) { Y.error = 'Impossible de charger Firebase (pas de connexion ?). L\'appli continue sur cet appareil.'; setStatus('offline'); return; }
    }
    Y.loaded = true;
    fb.getRedirectResult && fb.getRedirectResult(auth).catch(e => { Y.error = msg(e); refreshCard(); });
    fb.onAuthStateChanged(auth, (user) => {
      Y.user = user;
      if (!user) { stop(); setStatus('signedout'); return; }
      if (Y.familyId) connect('resume');
      else { setStatus('nofamily'); findFamilies(); }
    });
  };

  async function findFamilies() {
    try {
      const q = fb.query(fb.collection(db, 'families'), fb.where('uids', 'array-contains', Y.user.uid));
      const res = await fb.getDocs(q);
      Y.found = res.docs.map(d => ({ id: d.id, name: d.data().name }));
    } catch (e) { Y.found = []; }
    refreshCard();
  }

  /* ---------- Connexion ---------- */
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  Y.signInGoogle = async () => {
    const provider = new fb.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      if (standalone()) await fb.signInWithRedirect(auth, provider);
      else await fb.signInWithPopup(auth, provider);
    } catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return fb.signInWithRedirect(auth, provider);
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') throw e;
    }
  };
  Y.signInEmail = (email, pw, create) => create ? fb.createUserWithEmailAndPassword(auth, email, pw) : fb.signInWithEmailAndPassword(auth, email, pw);
  Y.resetPassword = (email) => fb.sendPasswordResetEmail(auth, email);
  Y.signOut = async () => {
    stop();
    Y.familyId = null; Y.familyName = ''; COLS.forEach(c => { base[c] = new Map(); }); saveMetaNow();
    if (auth) await fb.signOut(auth);
    setStatus(Y.configured() ? 'signedout' : 'off');
  };

  /* ---------- Famille ---------- */
  Y.createFamily = async (name) => {
    const ref = fb.doc(fb.collection(db, 'families'));
    await fb.setDoc(ref, { name, ownerUid: Y.user.uid, uids: [Y.user.uid], createdAt: fb.serverTimestamp() });
    Y.familyId = ref.id; Y.familyName = name;
    connect('create');
  };
  Y.createInvite = async () => {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const rnd = crypto.getRandomValues(new Uint8Array(8));
    const code = Array.from(rnd, b => abc[b % 32]).join('');
    await fb.setDoc(fb.doc(db, 'invites', code), { familyId: Y.familyId, createdBy: Y.user.uid, createdAt: fb.serverTimestamp() });
    return code;
  };
  Y.joinFamily = async (raw) => {
    const code = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 8) throw new Error('Le code fait 8 caractères.');
    const inv = await fb.getDoc(fb.doc(db, 'invites', code));
    if (!inv.exists()) throw new Error('Code introuvable. Vérifie-le ou demande un nouveau code.');
    const fid = inv.data().familyId;
    await fb.updateDoc(fb.doc(db, 'families', fid), { uids: fb.arrayUnion(Y.user.uid), lastJoinCode: code });
    Y.familyId = fid;
    connect('join');
  };
  Y.reconnect = (fid, name) => { Y.familyId = fid; Y.familyName = name; connect('join'); };

  /* ============================================================
     INTERFACE
     ============================================================ */
  Y.card = () => {
    const esc = U.esc;
    let body;
    if (!Y.configured()) {
      body = `<p class="muted small">Pour partager l'appli entre ton téléphone, celui de ton mari et ceux des enfants, il faut relier BMChores à un projet Firebase gratuit (une seule fois). Le guide pas à pas est dans le fichier <b>SYNC.md</b>.</p>`;
    } else if (!Y.loaded) {
      body = `<p class="muted small">${Y.error ? '⚠️ ' + esc(Y.error) : 'Chargement…'}</p>`;
    } else if (!Y.user) {
      body = `<p class="muted small">Connecte-toi pour retrouver les mêmes tâches, courses et agenda sur tous les appareils de la famille.</p>
        <div class="row wrap"><button class="btn primary" data-action="sync-google">Se connecter avec Google</button><button class="btn" data-action="sync-email">Avec un e-mail</button></div>`;
    } else if (!Y.familyId) {
      body = `<p class="small">Connecté(e) : <b>${esc(Y.user.email || Y.user.displayName || '')}</b></p>
        ${Y.found.length ? Y.found.map(f => `<div class="setting"><div><b>« ${esc(f.name)} »</b><small>Famille déjà en ligne</small></div><button class="btn small primary" data-action="sync-reconnect" data-id="${f.id}" data-n="${esc(f.name)}">Reconnecter</button></div>`).join('') : ''}
        <div class="row wrap"><button class="btn primary" data-action="sync-create">☁️ Mettre notre famille en ligne</button><button class="btn" data-action="sync-join">J'ai un code d'invitation</button></div>
        <p class="hint">« Mettre en ligne » envoie les données de cet appareil. « Code d'invitation » récupère celles de la famille (et remplace ce qu'il y a ici).</p>
        <button class="btn ghost small" data-action="sync-signout">Se déconnecter</button>`;
    } else {
      const lbl = { synced: '✅ Tout est synchronisé', syncing: '🔄 Synchronisation…', offline: '📴 Hors ligne : envoi au retour du réseau', error: '⚠️ ' + esc(Y.error) }[Y.status] || '';
      body = `<div class="setting"><div><b>Famille « ${esc(Y.familyName)} »</b><small>${lbl}</small></div></div>
        <p class="small muted">Compte : ${esc(Y.user.email || Y.user.displayName || '')}${Y.uids ? ' · ' + Y.uids.length + ' compte' + (Y.uids.length > 1 ? 's' : '') + ' connecté' + (Y.uids.length > 1 ? 's' : '') : ''}</p>
        <div class="row wrap"><button class="btn primary" data-action="sync-invite">👋 Inviter un membre</button><button class="btn ghost small" data-action="sync-signout">Déconnecter cet appareil</button></div>
        <p class="hint">Les enfants sans téléphone peuvent utiliser l'appareil d'un parent : il suffit de changer de profil en haut à droite.</p>`;
    }
    return `<section class="card" id="sync-card"><h2>☁️ Synchronisation familiale</h2>${body}</section>`;
  };
  function refreshCard() {
    const el = document.getElementById('sync-card');
    if (el) el.outerHTML = Y.card();
  }

  Y.emailModal = (then) => {
    let create = false;
    const draw = (root) => {
      root.querySelector('.modal').innerHTML = `<form class="form" id="auth-form"><div class="modal-head"><h2 class="modal-title">${create ? 'Créer un compte' : 'Connexion'}</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">✕</button></div>
        <label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="email" required autofocus></label>
        <label class="field"><span>Mot de passe ${create ? '(6 caractères minimum)' : ''}</span><input name="pw" type="password" autocomplete="${create ? 'new-password' : 'current-password'}" minlength="6" required></label>
        <p class="small danger-text" id="auth-err" hidden></p>
        <button class="btn primary block">${create ? 'Créer mon compte' : 'Me connecter'}</button>
        <div class="row wrap center-row"><button type="button" class="btn ghost small" id="auth-toggle">${create ? 'J\'ai déjà un compte' : 'Créer un compte'}</button>${create ? '' : '<button type="button" class="btn ghost small" id="auth-reset">Mot de passe oublié</button>'}</div></form>`;
      const f = root.querySelector('form'), err = root.querySelector('#auth-err');
      const show = (t) => { err.textContent = t; err.hidden = false; };
      root.querySelector('[data-close]').addEventListener('click', App.closeModal);
      root.querySelector('#auth-toggle').addEventListener('click', () => { create = !create; draw(root); });
      const rs = root.querySelector('#auth-reset');
      if (rs) rs.addEventListener('click', async () => {
        if (!f.email.value) { show('Indique d\'abord ton e-mail.'); return; }
        try { await Y.resetPassword(f.email.value.trim()); show('📧 E-mail de réinitialisation envoyé.'); } catch (e) { show(msg(e)); }
      });
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        try { await Y.signInEmail(f.email.value.trim(), f.pw.value, create); App.closeModal(); if (then) then(); }
        catch (e2) { show(msg(e2)); }
      });
    };
    const root = App.modal('');
    draw(root);
  };

  Y.signInModal = (then) => {
    App.modal(`<div class="modal-head"><h2 class="modal-title">Se connecter ☁️</h2><button class="icon-btn" data-close aria-label="Fermer">✕</button></div>
      <p class="muted">Chaque parent se connecte avec son propre compte. Les données de la famille sont partagées.</p>
      <button class="btn primary block" id="si-google">Continuer avec Google</button>
      <button class="btn block" id="si-email">Continuer avec un e-mail</button>`, {
      onMount: (root) => {
        root.querySelector('[data-close]').addEventListener('click', App.closeModal);
        root.querySelector('#si-google').addEventListener('click', async () => {
          try { await Y.signInGoogle(); App.closeModal(); if (then) waitUser(then); } catch (e) { App.toast('☁️ ' + msg(e), 6000); }
        });
        root.querySelector('#si-email').addEventListener('click', () => Y.emailModal(then ? () => waitUser(then) : null));
      }
    });
  };
  function waitUser(fn) { const t0 = Date.now(); const tick = () => { if (Y.user) fn(); else if (Date.now() - t0 < 8000) setTimeout(tick, 150); }; tick(); }

  Y.joinModal = () => {
    App.modal(`<form class="form"><div class="modal-head"><h2 class="modal-title">Rejoindre la famille 👋</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">✕</button></div>
      <p class="muted">Demande le code à la personne qui a mis la famille en ligne (Réglages > Inviter un membre).</p>
      <input name="code" class="pin-input code-input" maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD2345" aria-label="Code d'invitation" required autofocus>
      ${S.state.tasks.length ? '<p class="small warn-text">⚠️ Les données actuellement sur cet appareil seront remplacées par celles de la famille.</p>' : ''}
      <p class="small danger-text" id="join-err" hidden></p>
      <button class="btn primary block">Rejoindre</button></form>`, {
      onMount: (root) => {
        root.querySelector('[data-close]').addEventListener('click', App.closeModal);
        root.querySelector('form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = e.target.querySelector('button.primary'); btn.disabled = true; btn.textContent = 'Connexion…';
          try { await Y.joinFamily(e.target.code.value); App.closeModal(); }
          catch (e2) { const er = root.querySelector('#join-err'); er.textContent = msg(e2); er.hidden = false; btn.disabled = false; btn.textContent = 'Rejoindre'; }
        });
      }
    });
  };

  Y.startJoin = () => { if (Y.user) Y.joinModal(); else Y.signInModal(Y.joinModal); };

  function registerActions() {
    Object.assign(App.actions, {
      'sync-google': async () => { try { await Y.signInGoogle(); } catch (e) { App.toast('☁️ ' + msg(e), 6000); } },
      'sync-email': () => Y.emailModal(),
      'sync-join': () => Y.startJoin(),
      'sync-reconnect': async (el) => {
        if (S.state.tasks.length && !(await App.confirm('Remplacer les données de cet appareil par celles de « ' + U.esc(el.dataset.n) + ' » ?', 'Reconnecter'))) return;
        Y.reconnect(el.dataset.id, el.dataset.n);
      },
      'sync-create': () => {
        App.modal(`<form class="form"><div class="modal-head"><h2 class="modal-title">Mettre la famille en ligne ☁️</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">✕</button></div>
          <label class="field"><span>Nom de la famille</span><input name="name" required maxlength="40" value="Famille ${U.esc((S.me() || {}).name || '')}" autofocus></label>
          <p class="muted small">Les tâches, listes, menus et profils de cet appareil seront envoyés en ligne. Tu pourras ensuite inviter ton mari avec un code.</p>
          <button class="btn primary block">C'est parti</button></form>`, {
          onMount: (root) => {
            root.querySelector('[data-close]').addEventListener('click', App.closeModal);
            root.querySelector('form').addEventListener('submit', async (e) => {
              e.preventDefault();
              const b = e.target.querySelector('button.primary'); b.disabled = true; b.textContent = 'Création…';
              try { await Y.createFamily(e.target.name.value.trim()); App.closeModal(); App.toast('☁️ Famille en ligne !'); }
              catch (e2) { App.toast('☁️ ' + msg(e2), 6000); b.disabled = false; b.textContent = 'C\'est parti'; }
            });
          }
        });
      },
      'sync-invite': async (el) => {
        el.disabled = true;
        try {
          const code = await Y.createInvite();
          const pretty = code.slice(0, 4) + '-' + code.slice(4);
          const url = location.origin + location.pathname;
          const text = 'Rejoins notre famille sur BMChores 🏡\n1. Ouvre ' + url + '\n2. Choisis « J\'ai un code d\'invitation »\n3. Code : ' + pretty + ' (valable 7 jours)';
          App.modal(`<div class="modal-head"><h2 class="modal-title">Code d'invitation 👋</h2><button class="icon-btn" data-close aria-label="Fermer">✕</button></div>
            <p class="muted">À saisir sur l'autre téléphone, dans « J'ai un code d'invitation ». Valable 7 jours.</p>
            <div class="invite-code">${pretty}</div>
            <button class="btn primary block" id="inv-share">📤 Envoyer l'invitation</button>`, {
            onMount: (root) => {
              root.querySelector('[data-close]').addEventListener('click', App.closeModal);
              root.querySelector('#inv-share').addEventListener('click', async () => {
                try { if (navigator.share) await navigator.share({ title: 'BMChores', text }); else { await navigator.clipboard.writeText(text); App.toast('📋 Invitation copiée'); } } catch (e) { /* annulé */ }
              });
            }
          });
        } catch (e) { App.toast('☁️ ' + msg(e), 6000); }
        el.disabled = false;
      },
      'sync-signout': async () => {
        if (await App.confirm('Déconnecter cet appareil ? Les données restent ici mais ne seront plus partagées.', 'Déconnecter')) await Y.signOut();
      }
    });
  }

  /* Accès pour les tests automatisés (serveur simulé) */
  Y._test = { toDocs, applyChange, canon, H, base: () => base, inject: (f, d, a) => { fb = f; db = d; auth = a; Y._fake = true; } };

  window.Sync = Y;
})();
