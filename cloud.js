// Вход через Google и синхронизация прогресса с Firestore.
// Ключ веб-приложения Firebase публичный по задумке: доступ к данным ограничивают правила Firestore.
// Если Firebase недоступен, тренажёр работает как раньше, только локально.
const V = 'https://www.gstatic.com/firebasejs/12.4.0/';
const $ = s => document.querySelector(s);

const cfg = {
  apiKey: 'AIzaSyDaGryfQncXxlGScqJAoWzbeqqIDRRauB0',
  authDomain: 'quiettype.web.app',
  projectId: 'quiettype-ef6ec',
  storageBucket: 'quiettype-ef6ec.firebasestorage.app',
  messagingSenderId: '56157416394',
  appId: '1:56157416394:web:f5114c03325051a15abd33'
};

{
  const { initializeApp } = await import(V + 'firebase-app.js');
  const { getAuth, GoogleAuthProvider, signInWithPopup, reauthenticateWithPopup, signOut, deleteUser, onAuthStateChanged } = await import(V + 'firebase-auth.js');
  const { getFirestore, doc, runTransaction, serverTimestamp, deleteDoc } = await import(V + 'firebase-firestore.js');

  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Объединяет две копии прогресса без потерь и без двойного счёта:
  // история — объединение по времени и режиму, рекорды — максимум,
  // статистика клавиш — более полная из двух копий.
  const merge = (a, b) => {
    if (!b) return a;
    const seen = new Map();
    for (const x of [...(a.hist || []), ...(b.hist || [])]) seen.set(x.t + '|' + x.m, x);
    const hist = [...seen.values()].sort((x, y) => x.t - y.t).slice(-2000);
    const best = { ...a.best };
    for (const m in b.best || {}) best[m] = Math.max(best[m] || 0, b.best[m]);
    const kstat = { ...a.kstat };
    for (const k in b.kstat || {}) if (!kstat[k] || b.kstat[k].n > kstat[k].n) kstat[k] = b.kstat[k];
    return { best, hist, kstat };
  };

  let user = null, deleting = false, busy = Promise.resolve();
  const ref = () => doc(db, 'users', user.uid);

  // Сливает локальные данные с облачными в транзакции, чтобы два устройства не затирали друг друга.
  const sync = () => busy = busy.then(async () => {
    if (!user || deleting) return;
    const merged = await runTransaction(db, async tx => {
      const snap = await tx.get(ref());
      const m = merge(window.qt.get(), snap.exists() ? window.qt.clean(snap.data()) : null);
      tx.set(ref(), { ...m, updatedAt: serverTimestamp() });
      return m;
    });
    window.qt.set(merged);
  }).catch(err => {
    console.error('QuietType: не удалось синхронизировать прогресс', err);
    $('#who').textContent = (user?.displayName || '') + ' · нет связи с облаком, прогресс сохранён в браузере';
  });

  window.qtCloud = {
    push: sync,
    finished: sync
  };

  $('#acct').hidden = false;
  $('#signin').onclick = async e => {
    e.target.blur();
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request')
        alert('Не удалось войти: ' + (err.message || err.code));
    }
  };
  $('#signout').onclick = e => { e.target.blur(); signOut(auth) };

  // Стирает прогресс в облаке и учётную запись. Google требует недавний вход
  // для удаления аккаунта, поэтому при необходимости просим войти ещё раз.
  $('#delacct').onclick = async e => {
    e.target.blur();
    if (!user || !confirm('Удалить аккаунт и весь прогресс в облаке? Это нельзя отменить. Прогресс в этом браузере останется, его можно удалить, очистив данные сайта.')) return;
    deleting = true;
    const u = user;
    let cloudGone = false;
    try {
      await busy;
      await deleteDoc(doc(db, 'users', u.uid));
      cloudGone = true;
      try {
        await deleteUser(u);
      } catch (err) {
        if (err.code !== 'auth/requires-recent-login') throw err;
        await reauthenticateWithPopup(u, new GoogleAuthProvider());
        await deleteUser(u);
      }
      alert('Аккаунт и прогресс в облаке удалены.');
    } catch (err) {
      console.error('QuietType: не удалось удалить аккаунт', err);
      await signOut(auth).catch(() => {});
      alert((cloudGone ? 'Прогресс в облаке стёрт, но учётную запись удалить не удалось' : 'Не удалось удалить данные') + ': ' + (err.message || err.code) + '\nВойдите снова и повторите удаление или напишите на aidomore225@gmail.com.');
    } finally {
      deleting = false;
    }
  };

  onAuthStateChanged(auth, u => {
    user = u;
    $('#signin').hidden = !!u;
    $('#signout').hidden = !u;
    $('#delacct').hidden = !u;
    $('#who').textContent = u ? (u.displayName || u.email) + ' · прогресс сохраняется в облаке' : '';
    $('#where').textContent = u
      ? 'Прогресс сохраняется в вашем аккаунте Google и доступен на любом компьютере после входа.'
      : 'Данные хранятся в этом браузере. Войдите через Google, чтобы прогресс сохранялся в облаке и был доступен на любом компьютере, или скачайте файл истории.';
    if (u) sync();
  });
}
