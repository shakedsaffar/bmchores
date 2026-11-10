/* BMChores — utilitaires : dates, récurrences, échappement HTML */
(function () {
  const U = {};

  U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  U.esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const pad = (n) => (n < 10 ? '0' : '') + n;

  /* Dates manipulées en chaînes locales « AAAA-MM-JJ » pour éviter les pièges de fuseau */
  U.toStr = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  U.parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  U.today = () => U.toStr(new Date());
  U.addDays = (s, n) => { const d = U.parse(s); d.setDate(d.getDate() + n); return U.toStr(d); };
  U.addMonths = (s, n, anchorDay) => {
    const d = U.parse(s);
    const day = anchorDay || d.getDate();
    const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
    const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    t.setDate(Math.min(day, last));
    return U.toStr(t);
  };
  U.diffDays = (a, b) => Math.round((U.parse(b) - U.parse(a)) / 86400000);
  U.weekday = (s) => (U.parse(s).getDay() + 6) % 7; // lundi = 0
  U.startOfWeek = (s) => U.addDays(s, -U.weekday(s));
  U.dateTime = (dateStr, timeStr) => {
    const d = U.parse(dateStr);
    if (timeStr) { const [h, m] = timeStr.split(':').map(Number); d.setHours(h, m, 0, 0); }
    else d.setHours(9, 0, 0, 0); // sans heure : rappel à 9 h
    return d;
  };

  const fmt = (opts) => new Intl.DateTimeFormat('fr-FR', opts);
  const fLong = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
  const fShort = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
  const fMonth = fmt({ month: 'long', year: 'numeric' });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  U.cap = cap;
  U.fmtLong = (s) => cap(fLong.format(U.parse(s)));
  U.fmtShort = (s) => fShort.format(U.parse(s));
  U.fmtMonth = (d) => cap(fMonth.format(d));

  U.relDay = (s) => {
    if (!s) return 'Sans date';
    const n = U.diffDays(U.today(), s);
    if (n === 0) return 'Aujourd\'hui';
    if (n === 1) return 'Demain';
    if (n === -1) return 'Hier';
    if (n < -1) return 'En retard (' + (-n) + ' j)';
    if (n < 7) return cap(fmt({ weekday: 'long' }).format(U.parse(s)));
    return U.fmtShort(s);
  };

  /* ---------- Récurrences ---------- */
  U.parseRepeat = (code) => {
    if (!code || code === 'none') return { type: 'none', interval: 1, days: [] };
    const [type, n] = code.split(':');
    return { type, interval: Number(n) || 1, days: [] };
  };

  U.repeatLabel = (r) => {
    if (!r || r.type === 'none') return '';
    const n = r.interval || 1;
    if (r.type === 'daily') return n === 1 ? 'Tous les jours' : 'Tous les ' + n + ' jours';
    if (r.type === 'weekly') {
      const base = n === 1 ? 'Chaque semaine' : 'Toutes les ' + n + ' semaines';
      if (r.days && r.days.length && r.days.length < 7) return base + ' (' + r.days.slice().sort().map(d => BM.DAYS_SHORT[d].toLowerCase()).join(', ') + ')';
      return base;
    }
    if (r.type === 'monthly') return n === 1 ? 'Chaque mois' : 'Tous les ' + n + ' mois';
    if (r.type === 'yearly') return n === 1 ? 'Chaque année' : 'Tous les ' + n + ' ans';
    return '';
  };

  /* Prochaine occurrence strictement après « from » */
  U.nextOccurrence = (task, from) => {
    const r = task.repeat;
    if (!r || r.type === 'none' || !task.due) return null;
    const n = Math.max(1, r.interval || 1);
    if (r.type === 'daily') return U.addDays(from, n);
    if (r.type === 'weekly') {
      const days = (r.days && r.days.length) ? r.days.slice().sort() : [U.weekday(task.due)];
      const wd = U.weekday(from);
      const later = days.find(d => d > wd);
      if (later !== undefined) return U.addDays(from, later - wd);
      return U.addDays(from, 7 - wd + days[0] + (n - 1) * 7);
    }
    if (r.type === 'monthly') return U.addMonths(from, n, task.anchorDay || U.parse(task.due).getDate());
    if (r.type === 'yearly') return U.addMonths(from, 12 * n, task.anchorDay || U.parse(task.due).getDate());
    return null;
  };

  /* Toutes les occurrences entre start et end inclus (à partir de l'échéance courante) */
  U.occurrences = (task, start, end) => {
    if (!task.due) return [];
    if (!task.repeat || task.repeat.type === 'none') return (task.due >= start && task.due <= end) ? [task.due] : [];
    const out = [];
    let cur = task.due;
    let guard = 0;
    while (cur <= end && guard++ < 400) {
      if (cur >= start) out.push(cur);
      cur = U.nextOccurrence(task, cur);
      if (!cur) break;
    }
    return out;
  };

  U.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  U.normalize = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  U.guessAisle = (name) => {
    const n = U.normalize(name);
    let best = null, bestLen = 0;
    for (const a of BM.AISLES) {
      for (const w of a.words) {
        const nw = U.normalize(w);
        if (nw.length > bestLen && (n === nw || n.includes(nw))) { best = a.id; bestLen = nw.length; }
      }
    }
    return best || 'autre';
  };

  /* Export .ics (agenda du téléphone : rappels natifs, même sans serveur) */
  U.toICS = (tasks) => {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BMChores//FR', 'CALSCALE:GREGORIAN'];
    const icsEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    tasks.filter(t => t.due && !t.done).forEach(t => {
      const d = t.due.replace(/-/g, '');
      lines.push('BEGIN:VEVENT', 'UID:' + t.id + '@bmchores', 'DTSTAMP:' + stamp);
      if (t.time) {
        const tm = t.time.replace(':', '') + '00';
        lines.push('DTSTART:' + d + 'T' + tm);
        lines.push('DURATION:PT30M');
      } else {
        lines.push('DTSTART;VALUE=DATE:' + d);
        lines.push('DTEND;VALUE=DATE:' + U.addDays(t.due, 1).replace(/-/g, ''));
      }
      lines.push('SUMMARY:' + icsEsc(t.title));
      if (t.notes) lines.push('DESCRIPTION:' + icsEsc(t.notes));
      const r = t.repeat;
      if (r && r.type !== 'none') {
        const map = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' };
        let rule = 'RRULE:FREQ=' + map[r.type] + ';INTERVAL=' + (r.interval || 1);
        if (r.type === 'weekly' && r.days && r.days.length) rule += ';BYDAY=' + r.days.map(x => ['MO','TU','WE','TH','FR','SA','SU'][x]).join(',');
        lines.push(rule);
      }
      if (t.reminder != null && t.reminder >= 0) {
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(t.title), 'TRIGGER:-PT' + t.reminder + 'M', 'END:VALARM');
      }
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  };

  U.download = (filename, content, type) => {
    const blob = new Blob([content], { type: type || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  window.U = U;
})();
