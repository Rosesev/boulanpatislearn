// ===== BoulanPâtiss'Learn – Application =====

let currentUser = null;
let currentPage = 'accueil';
let examState = null;
let quizState = null;
let noteTargetId = null;
let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;

// ===== HARD RESET =====
function hardReset() {
  if (confirm('Réinitialiser complètement l\'application ? Cela effacera le cache et rechargera les données correctes.')) {
    localStorage.clear();
    DB._data = null;
    DB.load();
    alert('✅ Réinitialisation effectuée ! La page va se recharger.');
    location.reload(true);
  }
}

// ===== AUTH =====
let loginRole = 'eleve';

function togglePw(inputId, eyeId) {
  const input = document.getElementById(inputId);
  const eye = document.getElementById(eyeId);
  if (!input) return;
  const isHidden = input.type === 'password' || input.type === 'text' && inputId === 'login-id';
  // For identifiant field: toggle between text (readable) and password-like via blur trick
  if (inputId === 'login-id') {
    // identifiant is always type=text, we use a custom class to mask it
    input.classList.toggle('masked');
    eye.textContent = input.classList.contains('masked') ? '🙈' : '👁';
    return;
  }
  input.type = input.type === 'password' ? 'text' : 'password';
  eye.textContent = input.type === 'password' ? '👁' : '🙈';
}

function togglePw(inputId, eyeId) {
  const input = document.getElementById(inputId);
  const eye = document.getElementById(eyeId);
  if (input.type === 'password') {
    input.type = 'text';
    eye.textContent = '🙈';
  } else {
    input.type = 'password';
    eye.textContent = '👁';
  }
}

function setLoginRole(role) {
  loginRole = role;
  document.getElementById('tab-eleve').classList.toggle('active', role === 'eleve');
  document.getElementById('tab-prof').classList.toggle('active', role === 'prof');
  document.getElementById('login-hint').textContent =
    role === 'prof' ? 'Identifiant enseignant requis' : 'Identifiant élève fourni par votre professeur';
}

function fillDemo(id, pw, role) {
  setLoginRole(role);
  document.getElementById('login-id').value = id;
  document.getElementById('login-pw').value = pw;
}

function doLogin() {
  const id = document.getElementById('login-id').value.trim();
  const pw = document.getElementById('login-pw').value.trim();
  const err = document.getElementById('login-error');

  const user = DB.getUser(id);
  if (!user) { showLoginError('Identifiant introuvable.'); return; }
  if (user.pw !== pw) { showLoginError('Mot de passe incorrect.'); return; }
  if (user.role !== loginRole) {
    showLoginError(`Ce compte est un compte ${user.role === 'prof' ? 'professeur' : 'élève'}. Veuillez sélectionner le bon rôle.`);
    return;
  }

  currentUser = user;
  err.classList.remove('show');
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  initApp();
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.classList.add('show');
}

function doLogout() {
  currentUser = null;
  stopExamTimer();
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-id').value = '';
  document.getElementById('login-pw').value = '';
  document.getElementById('login-error').classList.remove('show');
}

// ===== INIT =====
function initApp() {
  const u = currentUser;
  document.getElementById('nav-avatar').textContent = u.initiales;
  document.getElementById('nav-name').textContent = u.nom;
  document.getElementById('nav-role').textContent = u.role === 'prof' ? 'Professeur' : 'Élève';
  document.getElementById('welcome-h1').textContent = `Bonjour ${u.prenom} 👋`;
  document.getElementById('welcome-p').textContent = u.role === 'prof'
    ? 'Espace enseignant · Bac Pro Boulangerie-Pâtisserie'
    : `${u.classe} · Bienvenue sur votre espace`;

  // Show/hide prof sections
  document.querySelectorAll('.prof-only').forEach(el => {
    el.classList.toggle('hidden', u.role !== 'prof');
  });

  goTo('accueil');
}

// ===== NAVIGATION =====
function goTo(page) {
  // Stop exam if navigating away
  if (examState && page !== 'examens') {
    if (!confirm('Quitter l\'examen en cours ? Votre progression sera perdue.')) return;
    stopExam();
  }

  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  document.querySelectorAll('.nav-link[data-page="' + page + '"]').forEach(l => l.classList.add('active'));

  // Render
  const renders = {
    'accueil': renderAccueil,
    'cours': renderCours,
    'exercices': renderExercices,
    'travaux': renderTravaux,
    'examens': renderExamens,
    'resultats': renderResultats,
    'gestion-cours': renderGestionCours,
    'gestion-exercices': renderGestionExercices,
    'gestion-travaux': renderGestionTravaux,
    'gestion-eleves': renderGestionEleves
  };
  if (renders[page]) renders[page]();
}

// ===== ACCUEIL =====
function renderAccueil() {
  const u = currentUser;
  const isProf = u.role === 'prof';

  if (isProf) {
    const eleves = DB.getEleves();
    const devoirs = DB.get('devoirs');
    const rendus = DB.get('rendus');
    const aCorreger = rendus.filter(r => r.note === null).length;
    const exercices = DB.get('exercices');
    document.getElementById('stats-row').innerHTML = `
      <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-val" style="color:var(--brown)">${eleves.length}</div><div class="stat-lab">Élèves inscrits</div></div>
      <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-val" style="color:var(--blue)">${DB.get('cours').length}</div><div class="stat-lab">Cours publiés</div></div>
      <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-val" style="color:var(--orange)">${aCorreger}</div><div class="stat-lab">Travaux à corriger</div></div>
      <div class="stat-card"><div class="stat-icon">🎯</div><div class="stat-val" style="color:var(--green)">${exercices.length}</div><div class="stat-lab">Exercices & examens</div></div>
    `;

    document.getElementById('recent-activity').innerHTML = rendus.slice(-3).reverse().map(r => {
      const d = DB.getById('devoirs', r.devoirId);
      const e = DB.getUser(r.eleveId);
      return `<div class="list-row">
        <div class="list-row-icon" style="background:var(--orange-light)">📤</div>
        <div class="list-row-info">
          <div class="list-row-title">${e?.nom || r.eleveId} – ${d?.titre || ''}</div>
          <div class="list-row-sub">Rendu le ${formatDate(r.date)}</div>
        </div>
        ${r.note !== null ? `<span class="note-badge" style="color:var(--green)">${r.note}/20</span>` : '<span class="tag tag-urgent">À corriger</span>'}
      </div>`;
    }).join('') || '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">Aucun rendu récent</div></div>';

    document.getElementById('todo-list').innerHTML = `
      <div class="todo-item"><div class="todo-urgency" style="background:var(--red)"></div><div><div class="todo-title">Travaux à corriger</div><div class="todo-sub">${aCorreger} rendu(s) en attente</div></div></div>
      <div class="todo-item"><div class="todo-urgency" style="background:var(--gold)"></div><div><div class="todo-title">Cours à publier</div><div class="todo-sub">Vérifiez les ressources disponibles</div></div></div>
    `;

  } else {
    // ÉLÈVE
    const devoirs = DB.get('devoirs');
    const rendus = DB.get('rendus');
    const resultats = DB.getResultatsEleve(u.id);
    const cours = DB.get('cours');
    const aRendre = devoirs.filter(d => !DB.getRenduEleve(d.id, u.id) && new Date(d.deadline) >= new Date()).length;
    const moyArr = resultats.filter(r => r.score !== undefined);
    const moy = moyArr.length ? (moyArr.reduce((s, r) => s + (r.score / r.total) * 20, 0) / moyArr.length).toFixed(1) : '–';

    document.getElementById('stats-row').innerHTML = `
      <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-val" style="color:var(--blue)">${cours.length}</div><div class="stat-lab">Cours disponibles</div></div>
      <div class="stat-card"><div class="stat-icon">✏️</div><div class="stat-val" style="color:var(--green)">${DB.where('exercices', e => e.type === 'exercice').length}</div><div class="stat-lab">Exercices à faire</div></div>
      <div class="stat-card"><div class="stat-icon">📤</div><div class="stat-val" style="color:var(--orange)">${aRendre}</div><div class="stat-lab">Devoirs à rendre</div></div>
      <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-val" style="color:var(--brown)">${moy}</div><div class="stat-lab">Moyenne générale</div></div>
    `;

    const newCours = cours.filter(c => c.nouveau).slice(0, 2);
    const recents = resultats.slice(-2).reverse();
    const activity = [
      ...newCours.map(c => `<div class="list-row">
        <div class="list-row-icon" style="background:var(--blue-light)">${typeEmoji(c.type)}</div>
        <div class="list-row-info"><div class="list-row-title">${c.titre}</div><div class="list-row-sub">Nouveau cours disponible</div></div>
        <span class="tag tag-new">Nouveau</span>
      </div>`),
      ...recents.map(r => {
        const ex = DB.getById('exercices', r.exerciceId);
        return `<div class="list-row">
          <div class="list-row-icon" style="background:var(--green-light)">🎯</div>
          <div class="list-row-info"><div class="list-row-title">${ex?.titre || 'Exercice'}</div><div class="list-row-sub">Score : ${r.score}/${r.total} – ${formatDate(r.date)}</div></div>
          <span class="note-badge">${((r.score/r.total)*20).toFixed(0)}/20</span>
        </div>`;
      })
    ].join('');
    document.getElementById('recent-activity').innerHTML = activity || '<div class="empty-state"><div class="empty-state-icon">📭</div><div>Aucune activité récente</div></div>';

    const todos = devoirs.filter(d => !DB.getRenduEleve(d.id, u.id));
    document.getElementById('todo-list').innerHTML = todos.length
      ? todos.map(d => {
        const late = new Date(d.deadline) < new Date();
        return `<div class="todo-item">
          <div class="todo-urgency" style="background:${late ? 'var(--red)' : 'var(--gold)'}"></div>
          <div><div class="todo-title">${d.titre}</div><div class="todo-sub">À rendre avant le ${formatDate(d.deadline)}${late ? ' – <span style=color:var(--red)>En retard</span>' : ''}</div></div>
        </div>`;
      }).join('')
      : '<div class="empty-state"><div class="empty-state-icon">✅</div><div>Tous vos devoirs sont rendus !</div></div>';
  }
}

// ===== COURS =====
let coursFilter = '';
function filterCours(v) { coursFilter = v.toLowerCase(); renderCours(); }

function renderCours() {
  const cours = DB.get('cours').filter(c =>
    !coursFilter || c.titre.toLowerCase().includes(coursFilter) || c.matiere.toLowerCase().includes(coursFilter)
  );
  const byMatiere = {};
  cours.forEach(c => {
    if (!byMatiere[c.matiere]) byMatiere[c.matiere] = [];
    byMatiere[c.matiere].push(c);
  });

  const matiereColors = {
    'Technologie professionnelle': 'var(--blue-light)',
    'Sciences appliquées': 'var(--green-light)',
    'Gestion & économie': 'var(--orange-light)',
    'Arts appliqués': '#FDF0F7',
    'PSE': '#F5F0FD'
  };

  let html = '';
  if (Object.keys(byMatiere).length === 0) {
    html = '<div class="empty-state"><div class="empty-state-icon">🔍</div><div>Aucun cours trouvé</div></div>';
  }
  for (const [mat, items] of Object.entries(byMatiere)) {
    html += `<div class="matiere-group"><div class="matiere-label">${mat}</div>`;
    items.forEach(c => {
      const prog = currentUser.role === 'eleve'
        ? (DB.getProgressionCours(currentUser.id, c.id)?.pct || 0)
        : null;
      html += `<div class="list-row" onclick="openCours('${c.id}')" style="cursor:pointer">
        <div class="list-row-icon" style="background:${matiereColors[c.matiere] || 'var(--cream-dark)'}">${typeEmoji(c.type)}</div>
        <div class="list-row-info">
          <div class="list-row-title">${c.titre} ${c.nouveau ? '<span class="tag tag-new">Nouveau</span>' : ''}</div>
          <div class="list-row-sub">${typeLabel(c.type)}${c.desc ? ' · ' + c.desc.slice(0, 60) + '…' : ''}</div>
          ${prog !== null ? `<div class="progress-bar" style="margin-top:6px"><div class="progress-fill" style="width:${prog}%"></div></div>` : ''}
        </div>
        <span style="font-size:11px;color:var(--text-light)">${formatDate(c.date)}</span>
      </div>`;
    });
    html += '</div>';
  }
  document.getElementById('cours-list').innerHTML = html;
}

function openCours(id) {
  const c = DB.getById('cours', id);
  if (!c) return;
  if (currentUser.role === 'eleve') {
    const prog = DB.getProgressionCours(currentUser.id, id);
    if (!prog || prog.pct < 50) DB.setProgressionCours(currentUser.id, id, prog ? Math.max(prog.pct, 50) : 50);
  }
  if (c.fileData) {
    previewFileRaw(c.fileData, c.fileName, c.fileMime);
  } else if (c.url && c.url !== '#') {
    window.open(c.url, '_blank');
  } else {
    showToast(`📄 "${c.titre}" – Aucun fichier joint (ajoutez-en un depuis l'espace professeur)`);
  }
}

// ===== EXERCICES =====
function renderExercices() {
  const exercices = DB.where('exercices', e => e.type === 'exercice');
  document.getElementById('exercices-home').classList.remove('hidden');
  document.getElementById('exercice-player').classList.add('hidden');

  document.getElementById('exercices-grid').innerHTML = exercices.map(e => {
    const res = currentUser.role === 'eleve' ? DB.where('resultats', r => r.eleveId === currentUser.id && r.exerciceId === e.id)[0] : null;
    const scoreText = res ? `${res.score}/${res.total} (${((res.score/res.total)*20).toFixed(0)}/20)` : 'Pas encore fait';
    return `<div class="resource-card" onclick="startExercice('${e.id}')">
      <div class="card-emoji">✏️</div>
      <span class="card-badge badge-exercice">Exercice</span>
      <div class="card-title">${e.titre}</div>
      <div class="card-sub">${e.matiere}</div>
      <div class="card-sub">${e.questions.length} questions</div>
      <div class="card-sub" style="color:${res ? 'var(--green)' : 'var(--text-light)'}">🏆 ${scoreText}</div>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="empty-state-icon">✏️</div><div>Aucun exercice disponible</div></div>';
}

function startExercice(id) {
  const ex = DB.getById('exercices', id);
  if (!ex) return;
  quizQuestions = ex.questions;
  quizIndex = 0;
  quizScore = 0;
  quizAnswered = false;

  document.getElementById('exercices-home').classList.add('hidden');
  document.getElementById('exercice-player').classList.remove('hidden');
  renderQuizQuestion(ex, id);
}

function renderQuizQuestion(ex, exId) {
  if (quizIndex >= quizQuestions.length) {
    // Results
    const pct = Math.round((quizScore / quizQuestions.length) * 100);
    const note = ((quizScore / quizQuestions.length) * 20).toFixed(1);
    let emoji = quizScore === quizQuestions.length ? '🏆' : quizScore >= quizQuestions.length * 0.6 ? '👍' : '💪';
    DB.addResultat(currentUser.id, exId, quizScore, quizQuestions.length, 'exercice');

    document.getElementById('exercice-player').innerHTML = `
      <div class="quiz-player">
        <div class="quiz-results">
          <div class="result-emoji">${emoji}</div>
          <div class="result-score">${quizScore}/${quizQuestions.length}</div>
          <div class="result-sub">Note : <strong>${note}/20</strong> · ${pct}% de réussite</div>
          <div style="margin-top:24px;display:flex;gap:10px;justify-content:center">
            <button class="btn-primary" onclick="startExercice('${exId}')">Recommencer</button>
            <button class="btn-secondary" onclick="renderExercices()">Retour aux exercices</button>
          </div>
        </div>
      </div>`;
    return;
  }

  const q = quizQuestions[quizIndex];
  const letters = ['A', 'B', 'C', 'D'];

  document.getElementById('exercice-player').innerHTML = `
    <div class="quiz-player">
      <div class="quiz-header">
        <div>
          <div class="quiz-progress-text">Question ${quizIndex + 1} sur ${quizQuestions.length}</div>
          <div class="progress-bar" style="width:240px;margin-top:6px"><div class="progress-fill" style="width:${((quizIndex)/quizQuestions.length)*100}%"></div></div>
        </div>
        <div class="quiz-score-live">Score : ${quizScore}/${quizIndex}</div>
      </div>
      <div class="quiz-question-card">
        <div class="quiz-q-text">${q.q}</div>
        <div class="quiz-opts" id="opts-container">
          ${q.opts.map((o, i) => `
            <div class="quiz-opt" id="opt-${i}" onclick="selectOpt(${i}, ${q.correct}, '${exId}')">
              <div class="opt-letter">${letters[i]}</div>
              <span>${o}</span>
            </div>`).join('')}
        </div>
        <div id="quiz-feedback" class="quiz-feedback" style="display:none;margin-top:16px"></div>
        <div class="quiz-actions" style="margin-top:16px">
          <button class="btn-secondary" onclick="renderExercices()">Quitter</button>
        </div>
      </div>
    </div>`;
}

function selectOpt(chosen, correct, exId) {
  if (quizAnswered) return;
  quizAnswered = true;
  const letters = ['A', 'B', 'C', 'D'];
  const isCorrect = chosen === correct;
  if (isCorrect) quizScore++;

  document.querySelectorAll('.quiz-opt').forEach((el, i) => {
    el.classList.add('disabled');
    if (i === correct) el.classList.add('correct');
    else if (i === chosen && !isCorrect) el.classList.add('wrong');
  });

  const fb = document.getElementById('quiz-feedback');
  const q = quizQuestions[quizIndex];
  fb.style.display = 'block';
  fb.className = `quiz-feedback ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`;
  fb.innerHTML = `${isCorrect ? '✅ Bonne réponse !' : `❌ Mauvaise réponse. La bonne réponse était : <strong>${letters[correct]}. ${q.opts[correct]}</strong>`}<br><span style="font-size:12px;opacity:.9;margin-top:4px;display:block">${q.explication || ''}</span>`;

  document.querySelector('.quiz-actions').innerHTML = `
    <button class="btn-primary" onclick="nextQuestion('${exId}')">Question suivante →</button>
    <button class="btn-secondary" onclick="renderExercices()">Quitter</button>
  `;
}

function nextQuestion(exId) {
  quizIndex++;
  quizAnswered = false;
  const ex = DB.getById('exercices', exId);
  renderQuizQuestion(ex, exId);
}

// ===== TRAVAUX =====
function renderTravaux() {
  const u = currentUser;
  const devoirs = DB.get('devoirs');
  let html = '';

  if (u.role === 'eleve') {
    const aFaire = devoirs.filter(d => !DB.getRenduEleve(d.id, u.id));
    const rendus = devoirs.filter(d => DB.getRenduEleve(d.id, u.id));

    if (aFaire.length) {
      html += `<h2 class="section-title" style="margin-bottom:12px">Devoirs à rendre</h2>`;
      aFaire.forEach(d => {
        const late = new Date(d.deadline) < new Date();
        html += `<div class="devoir-card">
          <div class="devoir-card-header">
            <div>
              <div class="devoir-card-title">${d.titre}</div>
              <div class="devoir-card-meta">À rendre avant le ${formatDate(d.deadline)} ${late ? '· <span style="color:var(--red);font-weight:600">En retard</span>' : ''}</div>
            </div>
            <span class="tag ${late ? 'tag-urgent' : ''}" style="${!late ? 'background:var(--green-light);color:var(--green)' : ''}">
              ${late ? 'En retard' : 'À rendre'}
            </span>
          </div>
          <div class="devoir-card-consignes">${d.consignes}</div>
          <div class="upload-zone" onclick="simulateUpload('${d.id}')">
            <div class="upload-zone-icon">📤</div>
            <div>Cliquez pour déposer votre travail</div>
            <div style="font-size:11px;margin-top:4px;color:var(--text-light)">PDF, Word, image – max 20 Mo</div>
          </div>
        </div>`;
      });
    }

    if (rendus.length) {
      html += `<h2 class="section-title" style="margin:24px 0 12px">Travaux rendus</h2>`;
      rendus.forEach(d => {
        const rendu = DB.getRenduEleve(d.id, u.id);
        html += `<div class="devoir-card">
          <div class="devoir-card-header">
            <div>
              <div class="devoir-card-title">${d.titre}</div>
              <div class="devoir-card-meta">Rendu le ${formatDate(rendu.date)} · ${rendu.fileName}</div>
            </div>
            ${rendu.note !== null
              ? `<span class="note-badge" style="color:${rendu.note >= 10 ? 'var(--green)' : 'var(--red)'}">${rendu.note}/20</span>`
              : '<span class="tag" style="background:var(--orange-light);color:var(--orange)">En cours de correction</span>'}
          </div>
          ${rendu.commentaire ? `<div class="commentaire-box"><div class="commentaire-label">Commentaire du professeur</div>${rendu.commentaire}</div>` : ''}
        </div>`;
      });
    }

    if (!devoirs.length) {
      html = '<div class="empty-state"><div class="empty-state-icon">📭</div><div>Aucun devoir assigné pour l\'instant</div></div>';
    }

  } else {
    // PROF
    html += `<div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button class="btn-primary" onclick="showModal('modal-add-devoir')">+ Créer un devoir</button>
    </div>`;
    devoirs.forEach(d => {
      const rendus = DB.where('rendus', r => r.devoirId === d.id);
      const eleves = DB.getEleves();
      html += `<div class="devoir-card">
        <div class="devoir-card-header">
          <div>
            <div class="devoir-card-title">${d.titre}</div>
            <div class="devoir-card-meta">Date limite : ${formatDate(d.deadline)} · ${rendus.length}/${eleves.length} rendu(s)</div>
          </div>
          <button class="btn-danger btn-sm" onclick="deleteDevoir('${d.id}')">Supprimer</button>
        </div>
        <div class="devoir-card-consignes">${d.consignes}</div>
      </div>`;
    });
    if (!devoirs.length) html += '<div class="empty-state"><div class="empty-state-icon">📋</div><div>Aucun devoir créé. Cliquez sur + pour commencer.</div></div>';
  }

  document.getElementById('travaux-content').innerHTML = html;
}

function simulateUpload(devoirId) {
  const d = DB.getById('devoirs', devoirId);
  if (!d) return;
  // Simulate file upload
  const rendu = {
    devoirId,
    eleveId: currentUser.id,
    date: new Date().toISOString().slice(0, 10),
    note: null,
    commentaire: null,
    fileName: `travail_${currentUser.id.replace('.', '_')}_${devoirId}.pdf`
  };
  DB.insert('rendus', rendu);
  showToast('✅ Travail déposé avec succès !', 'success');
  renderTravaux();
}

function deleteDevoir(id) {
  if (!confirm('Supprimer ce devoir ?')) return;
  DB.delete('devoirs', id);
  renderTravaux();
  showToast('Devoir supprimé', 'error');
}

// ===== EXAMENS =====
let pendingExamId = null;
let examTimerInterval = null;

function renderExamens() {
  document.getElementById('examens-home').classList.remove('hidden');
  document.getElementById('exam-player').classList.add('hidden');

  const examens = DB.where('exercices', e => e.type === 'examen');
  document.getElementById('examens-grid').innerHTML = examens.map(e => {
    const done = currentUser.role === 'eleve'
      ? DB.where('resultats', r => r.eleveId === currentUser.id && r.exerciceId === e.id)[0]
      : null;
    return `<div class="resource-card" onclick="${currentUser.role === 'eleve' ? `confirmStartExam('${e.id}')` : `showToast('Prévisualisez l\'examen depuis Gérer les exercices')`}">
      <div class="card-emoji">📋</div>
      <span class="card-badge badge-examen">Examen</span>
      <div class="card-title">${e.titre}</div>
      <div class="card-sub">${e.matiere}</div>
      <div class="card-sub">⏱ ${e.duree} minutes · ${e.questions.length} questions</div>
      ${done ? `<div class="card-sub" style="color:var(--green)">✅ Réalisé – ${done.score}/${done.total} (${((done.score/done.total)*20).toFixed(0)}/20)</div>` : '<div class="card-sub" style="color:var(--text-light)">Non réalisé</div>'}
    </div>`;
  }).join('') || '<div class="empty-state"><div class="empty-state-icon">📋</div><div>Aucun examen disponible pour l\'instant</div></div>';
}

function confirmStartExam(id) {
  pendingExamId = id;
  const ex = DB.getById('exercices', id);
  document.getElementById('exam-confirm-info').innerHTML = `
    <div style="background:var(--red-light);border-radius:var(--radius);padding:16px;margin-bottom:16px;font-size:13px;color:#8B2020;line-height:1.7">
      <strong>${ex.titre}</strong><br>
      Durée : ${ex.duree} minutes · ${ex.questions.length} questions<br>
      ⚠️ Une fois démarré, vous ne pouvez plus naviguer. L'examen sera soumis automatiquement à la fin du temps imparti.
    </div>`;
  showModal('modal-confirm-exam');
}

function startExamConfirmed() {
  closeAllModals();
  const ex = DB.getById('exercices', pendingExamId);
  if (!ex) return;

  examState = {
    id: pendingExamId,
    questions: ex.questions,
    index: 0,
    answers: [],
    totalSeconds: ex.duree * 60,
    remaining: ex.duree * 60
  };

  document.getElementById('examens-home').classList.add('hidden');
  document.getElementById('exam-player').classList.remove('hidden');

  renderExamQuestion();
  startExamTimer();
}

function renderExamQuestion() {
  if (!examState) return;
  if (examState.index >= examState.questions.length) {
    finishExam();
    return;
  }
  const q = examState.questions[examState.index];
  const letters = ['A', 'B', 'C', 'D'];
  const ex = DB.getById('exercices', examState.id);

  document.getElementById('exam-player').innerHTML = `
    <div class="exam-topbar">
      <div>
        <div class="exam-topbar-title">${ex.titre}</div>
        <div class="exam-topbar-sub">Question ${examState.index + 1}/${examState.questions.length}</div>
      </div>
      <div class="exam-timer" id="exam-timer-display">--:--</div>
    </div>
    <div class="quiz-player">
      <div class="progress-bar" style="margin-bottom:20px"><div class="progress-fill" style="width:${(examState.index/examState.questions.length)*100}%"></div></div>
      <div class="quiz-question-card">
        <div class="quiz-q-text">${q.q}</div>
        <div class="quiz-opts" id="exam-opts">
          ${q.opts.map((o, i) => `
            <div class="quiz-opt" id="exam-opt-${i}" onclick="selectExamOpt(${i})">
              <div class="opt-letter">${letters[i]}</div>
              <span>${o}</span>
            </div>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn-primary" onclick="nextExamQuestion()">
          ${examState.index < examState.questions.length - 1 ? 'Question suivante →' : 'Terminer l\'examen'}
        </button>
        <button class="btn-danger btn-sm" onclick="if(confirm('Abandonner l\'examen ?'))stopExam()">Abandonner</button>
      </div>
    </div>`;

  updateTimerDisplay();
}

let examSelectedOpt = null;

function selectExamOpt(i) {
  examSelectedOpt = i;
  document.querySelectorAll('.quiz-opt').forEach((el, j) => {
    el.classList.toggle('selected', j === i);
  });
  // Store answer
  examState.answers[examState.index] = i;
}

function nextExamQuestion() {
  examState.index++;
  examSelectedOpt = null;
  renderExamQuestion();
}

function startExamTimer() {
  updateTimerDisplay();
  examTimerInterval = setInterval(() => {
    examState.remaining--;
    updateTimerDisplay();
    if (examState.remaining <= 0) {
      clearInterval(examTimerInterval);
      finishExam(true);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('exam-timer-display');
  if (!el || !examState) return;
  const m = Math.floor(examState.remaining / 60);
  const s = examState.remaining % 60;
  el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  el.classList.toggle('warning', examState.remaining < 120);
}

function stopExam() {
  clearInterval(examTimerInterval);
  examTimerInterval = null;
  examState = null;
  document.getElementById('examens-home').classList.remove('hidden');
  document.getElementById('exam-player').classList.add('hidden');
  renderExamens();
}

function stopExamTimer() {
  clearInterval(examTimerInterval);
  examTimerInterval = null;
  examState = null;
}

function finishExam(timeout = false) {
  clearInterval(examTimerInterval);
  examTimerInterval = null;

  // Calculate score
  let score = 0;
  examState.questions.forEach((q, i) => {
    if (examState.answers[i] === q.correct) score++;
  });

  DB.addResultat(currentUser.id, examState.id, score, examState.questions.length, 'examen');
  const note = ((score / examState.questions.length) * 20).toFixed(1);

  document.getElementById('exam-player').innerHTML = `
    <div style="max-width:500px">
      <div class="quiz-results">
        <div class="result-emoji">${timeout ? '⏰' : (score >= examState.questions.length * 0.6 ? '🎓' : '📚')}</div>
        <div class="result-score">${score}/${examState.questions.length}</div>
        <div class="result-sub">Note : <strong>${note}/20</strong>${timeout ? ' · Temps écoulé' : ''}</div>
        <div style="margin-top:8px;font-size:13px;color:var(--text-mid)">Les résultats ont été transmis à votre professeur.</div>
        <div style="margin-top:24px">
          <button class="btn-primary" onclick="stopExam()">Retour aux examens</button>
        </div>
      </div>
    </div>`;

  examState = null;
  showToast(`📋 Examen terminé – Note : ${note}/20`, 'success');
}

// ===== RÉSULTATS =====
function renderResultats() {
  const u = currentUser;
  const resultats = DB.getResultatsEleve(u.id);

  if (!resultats.length) {
    document.getElementById('resultats-content').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div>Aucun résultat pour l\'instant. Faites vos premiers exercices !</div></div>';
    return;
  }

  const notes = resultats.map(r => (r.score / r.total) * 20);
  const moy = (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1);
  const best = Math.max(...notes).toFixed(1);
  const last = notes[notes.length - 1]?.toFixed(1) || '–';

  // Travaux notés
  const devoirs = DB.get('devoirs');
  const rendusNotes = DB.where('rendus', r => r.eleveId === u.id && r.note !== null);

  let html = `
    <div class="stats-row" style="margin-bottom:28px">
      <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-val" style="color:var(--brown)">${moy}</div><div class="stat-lab">Moyenne générale</div></div>
      <div class="stat-card"><div class="stat-icon">🏆</div><div class="stat-val" style="color:var(--green)">${best}</div><div class="stat-lab">Meilleure note</div></div>
      <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-val" style="color:var(--blue)">${resultats.length}</div><div class="stat-lab">Exercices réalisés</div></div>
      <div class="stat-card"><div class="stat-icon">📤</div><div class="stat-val" style="color:var(--orange)">${rendusNotes.length}</div><div class="stat-lab">Travaux notés</div></div>
    </div>
    <h2 class="section-title" style="margin-bottom:12px">Historique des exercices & examens</h2>
    <table class="result-detail-table" style="margin-bottom:28px">
      <thead><tr><th>Exercice / Examen</th><th>Matière</th><th>Type</th><th>Score</th><th>Note /20</th><th>Date</th></tr></thead>
      <tbody>
        ${resultats.slice().reverse().map(r => {
          const ex = DB.getById('exercices', r.exerciceId);
          const n = ((r.score / r.total) * 20).toFixed(1);
          const color = parseFloat(n) >= 10 ? 'var(--green)' : 'var(--red)';
          return `<tr>
            <td style="font-weight:500">${ex?.titre || 'Exercice'}</td>
            <td style="color:var(--text-mid);font-size:12px">${ex?.matiere || '–'}</td>
            <td><span class="card-badge ${r.type === 'examen' ? 'badge-examen' : 'badge-exercice'}" style="font-size:10px">${r.type === 'examen' ? 'Examen' : 'Exercice'}</span></td>
            <td style="font-family:var(--font-mono)">${r.score}/${r.total}</td>
            <td style="font-weight:600;color:${color};font-family:var(--font-mono)">${n}</td>
            <td style="color:var(--text-light);font-size:12px">${formatDate(r.date)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;

  if (rendusNotes.length) {
    html += `<h2 class="section-title" style="margin-bottom:12px">Travaux notés par le professeur</h2>
    <table class="result-detail-table">
      <thead><tr><th>Devoir</th><th>Date de rendu</th><th>Note</th><th>Commentaire</th></tr></thead>
      <tbody>
        ${rendusNotes.map(r => {
          const d = DB.getById('devoirs', r.devoirId);
          return `<tr>
            <td style="font-weight:500">${d?.titre || 'Devoir'}</td>
            <td style="color:var(--text-light);font-size:12px">${formatDate(r.date)}</td>
            <td style="font-weight:600;color:${r.note >= 10 ? 'var(--green)' : 'var(--red)'};font-family:var(--font-mono)">${r.note}/20</td>
            <td style="font-size:12px;color:var(--text-mid)">${r.commentaire || '–'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  }

  document.getElementById('resultats-content').innerHTML = html;
}

// ===== PROF : GESTION COURS =====
function renderGestionCours() {
  const cours = DB.get('cours');
  document.getElementById('prof-cours-list').innerHTML = cours.length
    ? cours.map(c => `<div class="list-row">
        <div class="list-row-icon" style="background:var(--blue-light)">${typeEmoji(c.type)}</div>
        <div class="list-row-info">
          <div class="list-row-title">${c.titre} ${c.nouveau ? '<span class="tag tag-new">Nouveau</span>' : ''}</div>
          <div class="list-row-sub">${c.matiere} · ${typeLabel(c.type)} · ${formatDate(c.date)} ${c.fileData ? '· <span style="color:var(--green)">📎 Fichier joint</span>' : ''}</div>
        </div>
        <div class="list-row-actions">
          ${c.fileData ? `<button class="btn-gold btn-sm" onclick="previewFile('${c.id}','cours')">👁 Voir</button>` : ''}
          <button class="btn-secondary btn-sm" onclick="toggleNouveauCours('${c.id}')">${c.nouveau ? 'Retirer "Nouveau"' : 'Nouveau'}</button>
          <button class="btn-danger btn-sm" onclick="deleteCours('${c.id}')">Supprimer</button>
        </div>
      </div>`).join('')
    : '<div class="empty-state"><div class="empty-state-icon">📚</div><div>Aucun cours. Ajoutez-en un !</div></div>';
}

function toggleNouveauCours(id) {
  const c = DB.getById('cours', id);
  DB.update('cours', id, { nouveau: !c.nouveau });
  renderGestionCours();
}

function deleteCours(id) {
  if (!confirm('Supprimer ce cours ?')) return;
  DB.delete('cours', id);
  renderGestionCours();
  showToast('Cours supprimé');
}

// Lecture fichier → base64
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result); // dataURL complet (base64)
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Formate la taille
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

function previewFile(id, table) {
  const item = DB.getById(table === 'cours' ? 'cours' : table === 'exercices' ? 'exercices' : 'rendus', id);
  if (!item || !item.fileData) { showToast('Aucun fichier joint', 'error'); return; }
  previewFileRaw(item.fileData, item.fileName, item.fileMime || 'application/octet-stream');
}

// Upload zone drag & drop
function setupDropZone(zoneId, inputId, labelId, onFile) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone || !input) return;

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleDropFile(file, labelId, onFile);
  });
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files[0]) handleDropFile(input.files[0], labelId, onFile);
  });
}

function handleDropFile(file, labelId, onFile) {
  const MAX = 4 * 1024 * 1024; // 4 Mo
  if (file.size > MAX) { showToast(`Fichier trop lourd (max 4 Mo) – ${formatSize(file.size)}`, 'error'); return; }
  const label = document.getElementById(labelId);
  if (label) label.textContent = `📎 ${file.name} (${formatSize(file.size)})`;
  readFileAsBase64(file).then(data => onFile({ fileData: data, fileName: file.name, fileMime: file.type }));
}

let pendingCoursFile = null;

function addCours() {
  const titre = document.getElementById('nc-titre').value.trim();
  if (!titre) { showToast('Veuillez saisir un titre', 'error'); return; }
  const type = document.getElementById('nc-type').value;
  const url = document.getElementById('nc-url').value || '#';
  DB.insert('cours', {
    titre,
    matiere: document.getElementById('nc-matiere').value,
    type,
    url,
    desc: document.getElementById('nc-desc').value,
    date: new Date().toISOString().slice(0, 10),
    nouveau: true,
    ...(pendingCoursFile || {})
  });
  pendingCoursFile = null;
  closeAllModals();
  renderGestionCours();
  showToast('✅ Cours ajouté !', 'success');
}

// ===== PROF : GESTION EXERCICES =====
let questionBlocks = [];
let pendingExerciceFile = null;

function renderGestionExercices() {
  const exercices = DB.get('exercices');
  document.getElementById('prof-exercices-list').innerHTML = exercices.map(e => `
    <div class="list-row">
      <div class="list-row-icon" style="background:${e.type === 'examen' ? 'var(--red-light)' : 'var(--blue-light)'}">${e.type === 'examen' ? '📋' : '✏️'}</div>
      <div class="list-row-info">
        <div class="list-row-title">${e.titre}</div>
        <div class="list-row-sub">${e.matiere} · ${e.questions.length} questions${e.duree ? ' · ' + e.duree + ' min' : ''} ${e.fileData ? '· <span style="color:var(--green)">📎 Document joint</span>' : ''}</div>
      </div>
      <div class="list-row-actions">
        ${e.fileData ? `<button class="btn-gold btn-sm" onclick="previewFile('${e.id}','exercices')">👁 Voir</button>` : ''}
        <span class="card-badge ${e.type === 'examen' ? 'badge-examen' : 'badge-exercice'}">${e.type}</span>
        <button class="btn-danger btn-sm" onclick="deleteExercice('${e.id}')">Supprimer</button>
      </div>
    </div>`).join('') || '<div class="empty-state"><div class="empty-state-icon">🎯</div><div>Aucun exercice. Créez-en un !</div></div>';
}

function deleteExercice(id) {
  if (!confirm('Supprimer cet exercice/examen ?')) return;
  DB.delete('exercices', id);
  renderGestionExercices();
  showToast('Exercice supprimé');
}

function toggleExamMode() {
  const type = document.getElementById('ne-type').value;
  document.getElementById('ne-duree-group').style.display = type === 'examen' ? 'block' : 'none';
}

function addQuestion() {
  const idx = questionBlocks.length;
  questionBlocks.push({ q: '', opts: ['', '', '', ''], correct: 0, explication: '' });
  const letters = ['A', 'B', 'C', 'D'];
  const div = document.createElement('div');
  div.className = 'question-block';
  div.id = `qblock-${idx}`;
  div.innerHTML = `
    <div class="question-block-header">
      <span class="question-num">Question ${idx + 1}</span>
      <button class="btn-secondary btn-sm" onclick="removeQuestion(${idx})">Supprimer</button>
    </div>
    <div class="form-group">
      <label>Énoncé</label>
      <textarea class="form-input" rows="2" placeholder="Quelle est…" oninput="questionBlocks[${idx}].q=this.value"></textarea>
    </div>
    <div class="form-group">
      <label>Options (cochez la bonne réponse)</label>
      ${letters.map((l, i) => `
        <div class="option-row">
          <div class="option-correct ${i === 0 ? 'selected' : ''}" id="oc-${idx}-${i}" onclick="setCorrect(${idx},${i})"></div>
          <input class="form-input" placeholder="Option ${l}" oninput="questionBlocks[${idx}].opts[${i}]=this.value" style="flex:1">
        </div>`).join('')}
    </div>
    <div class="form-group">
      <label>Explication (optionnel)</label>
      <input class="form-input" placeholder="Explication après correction…" oninput="questionBlocks[${idx}].explication=this.value">
    </div>`;
  document.getElementById('questions-list').appendChild(div);
}

function setCorrect(qIdx, optIdx) {
  questionBlocks[qIdx].correct = optIdx;
  [0,1,2,3].forEach(i => {
    const el = document.getElementById(`oc-${qIdx}-${i}`);
    if (el) el.classList.toggle('selected', i === optIdx);
  });
}

function removeQuestion(idx) {
  document.getElementById(`qblock-${idx}`)?.remove();
  questionBlocks[idx] = null;
}

function saveExercice() {
  const titre = document.getElementById('ne-titre').value.trim();
  if (!titre) { showToast('Veuillez saisir un titre', 'error'); return; }
  const qs = questionBlocks.filter(Boolean).filter(q => q.q && q.opts.some(o => o));
  if (!qs.length) { showToast('Ajoutez au moins une question', 'error'); return; }
  const type = document.getElementById('ne-type').value;
  DB.insert('exercices', {
    titre,
    type,
    matiere: document.getElementById('ne-matiere').value,
    duree: type === 'examen' ? parseInt(document.getElementById('ne-duree').value) : null,
    questions: qs,
    ...(pendingExerciceFile || {})
  });
  closeAllModals();
  questionBlocks = [];
  pendingExerciceFile = null;
  document.getElementById('questions-list').innerHTML = '';
  renderGestionExercices();
  showToast('✅ Exercice créé !', 'success');
}

// ===== PREVIEW FICHIER (global) =====
function previewFileRaw(fileData, fileName, fileMime) {
  const content = document.getElementById('modal-preview-content');
  document.getElementById('modal-preview-title').textContent = fileName || 'Fichier';
  if (fileMime && fileMime.startsWith('image/')) {
    content.innerHTML = `<img src="${fileData}" style="max-width:100%;border-radius:var(--radius)" alt="${fileName}">`;
  } else if (fileMime === 'application/pdf') {
    content.innerHTML = `<iframe src="${fileData}" style="width:100%;height:500px;border:none;border-radius:var(--radius)"></iframe>`;
  } else {
    content.innerHTML = `<div style="text-align:center;padding:32px">
      <div style="font-size:48px;margin-bottom:12px">📄</div>
      <div style="font-size:14px;margin-bottom:16px;color:var(--text-mid)">${fileName}</div>
      <a href="${fileData}" download="${fileName}" class="btn-primary" style="text-decoration:none">⬇ Télécharger</a>
    </div>`;
  }
  document.getElementById('modal-preview-dl').href = fileData;
  document.getElementById('modal-preview-dl').download = fileName || 'document';
  showModal('modal-preview');
}

// ===== PROF : TRAVAUX RENDUS =====
let pendingRenduProfFile = null;

function renderGestionTravaux() {
  const rendus = DB.get('rendus');
  document.getElementById('prof-travaux-list').innerHTML = `
    <div style="margin-bottom:20px">
      <div class="upload-zone" id="prof-upload-zone" style="cursor:pointer;max-width:500px">
        <div class="upload-zone-icon">📤</div>
        <div style="font-size:13px;font-weight:500">Déposer un document corrigé / sujet d'examen</div>
        <div style="font-size:12px;margin-top:4px;color:var(--text-light)">PDF, Word, image – max 4 Mo</div>
        <div id="prof-upload-label" style="margin-top:8px;font-size:12px;color:var(--gold-dark);font-weight:500"></div>
        <input type="file" id="prof-upload-input" style="display:none" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif">
      </div>
    </div>
    ${rendus.length ? rendus.map(r => {
      const d = DB.getById('devoirs', r.devoirId);
      const e = DB.getUser(r.eleveId);
      return `<div class="list-row">
        <div class="status-dot ${r.note !== null ? 'dot-green' : 'dot-orange'}" style="margin:0 4px"></div>
        <div class="list-row-info">
          <div class="list-row-title">${e?.nom || r.eleveId} – ${d?.titre || 'Devoir'}</div>
          <div class="list-row-sub">Rendu le ${formatDate(r.date)} · ${r.fileName} ${r.fileData ? '· <span style="color:var(--green)">📎 Fichier disponible</span>' : ''}</div>
        </div>
        <div class="list-row-actions">
          ${r.fileData ? `<button class="btn-gold btn-sm" onclick="previewRendu('${r.id}')">👁 Voir</button>` : ''}
          ${r.note !== null ? `<span class="note-badge" style="color:${r.note >= 10 ? 'var(--green)' : 'var(--red)'}">${r.note}/20</span>` : ''}
          <button class="btn-primary btn-sm" onclick="openNoter('${r.id}')">${r.note !== null ? 'Modifier' : 'Corriger'}</button>
        </div>
      </div>`;
    }).join('') : '<div class="empty-state"><div class="empty-state-icon">📥</div><div>Aucun travail rendu pour l\'instant</div></div>'}
  `;

  setupDropZone('prof-upload-zone', 'prof-upload-input', 'prof-upload-label', f => {
    pendingRenduProfFile = f;
    showToast(`📎 Fichier prêt : ${f.fileName}`, 'success');
  });
}

function previewRendu(rendId) {
  const r = DB.getById('rendus', rendId);
  if (!r || !r.fileData) { showToast('Aucun fichier joint', 'error'); return; }
  previewFileRaw(r.fileData, r.fileName, r.fileMime || 'application/octet-stream');
}

function openNoter(rendId) {
  noteTargetId = rendId;
  const r = DB.getById('rendus', rendId);
  const d = DB.getById('devoirs', r.devoirId);
  const e = DB.getUser(r.eleveId);
  document.getElementById('modal-noter-info').innerHTML = `
    <div style="background:var(--cream-dark);border-radius:var(--radius);padding:12px 16px;margin-bottom:16px;font-size:13px">
      <strong>${e?.nom || r.eleveId}</strong> – ${d?.titre || 'Devoir'}<br>
      <span style="color:var(--text-light)">Rendu le ${formatDate(r.date)}</span>
    </div>`;
  document.getElementById('noter-note').value = r.note || '';
  document.getElementById('noter-comment').value = r.commentaire || '';
  showModal('modal-noter');
}

function saveNote() {
  const note = parseFloat(document.getElementById('noter-note').value);
  if (isNaN(note) || note < 0 || note > 20) { showToast('Note invalide (0-20)', 'error'); return; }
  DB.update('rendus', noteTargetId, {
    note,
    commentaire: document.getElementById('noter-comment').value
  });
  closeAllModals();
  renderGestionTravaux();
  showToast('✅ Note enregistrée !', 'success');
}

// ===== PROF : ÉLÈVES =====
function renderGestionEleves() {
  const eleves = DB.getEleves();
  const devoirs = DB.get('devoirs');
  const classes = ['Toutes', 'Terminale Bac Pro', '1ère Bac Pro', '2nde Bac Pro'];

  // Filtre actif
  const filtreActif = window._filtreClasse || 'Toutes';
  const elevesFiltres = filtreActif === 'Toutes' ? eleves : eleves.filter(e => e.classe === filtreActif);

  document.getElementById('prof-eleves-list').innerHTML = `
    <div class="chip-group" style="margin-bottom:16px">
      ${classes.map(c => `<div class="chip ${filtreActif === c ? 'active' : ''}" onclick="filtreClasse('${c}')">${c} ${c === 'Toutes' ? '(' + eleves.length + ')' : '(' + eleves.filter(e => e.classe === c).length + ')'}</div>`).join('')}
    </div>
    ${elevesFiltres.length ? `
    <table class="result-detail-table">
      <thead><tr><th>Élève</th><th>Identifiant</th><th>Classe</th><th>Mot de passe</th><th>Travaux rendus</th><th>Actions</th></tr></thead>
      <tbody>
        ${elevesFiltres.map(e => {
          const rendus = DB.where('rendus', r => r.eleveId === e.id);
          const resultats = DB.getResultatsEleve(e.id);
          const moyEx = resultats.length ? (resultats.reduce((s, r) => s + (r.score/r.total)*20, 0) / resultats.length).toFixed(1) : '–';
          const classeColor = e.classe === 'Terminale Bac Pro' ? 'var(--red)' : e.classe === '1ère Bac Pro' ? 'var(--blue)' : 'var(--green)';
          return `<tr>
            <td><div style="display:flex;align-items:center;gap:10px"><div class="user-avatar" style="width:30px;height:30px;font-size:11px">${e.initiales}</div>${e.nom}</div></td>
            <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-light)">${e.id}</td>
            <td><span style="font-size:12px;font-weight:600;color:${classeColor}">${e.classe || 'Non définie'}</span></td>
            <td style="font-family:var(--font-mono);font-size:12px">${e.pw}</td>
            <td style="text-align:center">${rendus.length}/${devoirs.length}</td>
            <td><button class="btn-danger btn-sm" onclick="deleteEleve('${e.id}')">Supprimer</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>` : '<div class="empty-state"><div class="empty-state-icon">👥</div><div>Aucun élève dans cette classe</div></div>'}
  `;
}

function filtreClasse(classe) {
  window._filtreClasse = classe;
  renderGestionEleves();
}

// Auto-generate login id
document.getElementById('ae-prenom')?.addEventListener('input', updateAeId);
document.getElementById('ae-nom')?.addEventListener('input', updateAeId);
function updateAeId() {
  const p = document.getElementById('ae-prenom').value.trim().toLowerCase().replace(/\s/g, '').replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a').replace(/[ùû]/g, 'u').replace(/[ç]/g, 'c');
  const n = document.getElementById('ae-nom').value.trim().toLowerCase().replace(/\s/g, '').replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a').replace(/[ùû]/g, 'u').replace(/[ç]/g, 'c');
  document.getElementById('ae-id').value = p && n ? `${p}.${n}` : '';
}

function addEleve() {
  const id = document.getElementById('ae-id').value.trim();
  const nom = `${document.getElementById('ae-prenom').value.trim()} ${document.getElementById('ae-nom').value.trim()}`.trim();
  if (!id || !nom.trim()) { showToast('Remplissez prénom et nom', 'error'); return; }
  if (DB.getUser(id)) { showToast('Cet identifiant existe déjà', 'error'); return; }
  const prenom = document.getElementById('ae-prenom').value.trim();
  const initiales = (prenom[0] + document.getElementById('ae-nom').value.trim()[0]).toUpperCase();
  const classe = document.getElementById('ae-classe').value;
  DB.insert('users', {
    id, nom, prenom, initiales, role: 'eleve',
    pw: document.getElementById('ae-pw').value || 'eleve123',
    classe
  });
  closeAllModals();
  renderGestionEleves();
  showToast(`✅ Compte créé : ${id} (${classe})`, 'success');
}

function deleteEleve(id) {
  if (!confirm(`Supprimer le compte ${id} ? Cette action est irréversible.`)) return;
  DB.delete('users', id);
  renderGestionEleves();
  showToast('Élève supprimé');
}

function addDevoir() {
  const titre = document.getElementById('nd-titre').value.trim();
  if (!titre) { showToast('Veuillez saisir un titre', 'error'); return; }
  DB.insert('devoirs', {
    titre,
    consignes: document.getElementById('nd-consignes').value,
    deadline: document.getElementById('nd-deadline').value || new Date(Date.now() + 7*24*3600000).toISOString().slice(0,10),
    creePar: currentUser.id
  });
  closeAllModals();
  renderTravaux();
  showToast('✅ Devoir créé !', 'success');
}

// ===== MODALS =====
function showModal(id) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
  // Init drop zones after modal is visible
  if (id === 'modal-add-cours') {
    pendingCoursFile = null;
    document.getElementById('nc-file-label').textContent = '';
    setupDropZone('nc-drop-zone', 'nc-file-input', 'nc-file-label', f => { pendingCoursFile = f; });
  }
  if (id === 'modal-add-exercice') {
    pendingExerciceFile = null;
    document.getElementById('ne-file-label').textContent = '';
    setupDropZone('ne-drop-zone', 'ne-file-input', 'ne-file-label', f => { pendingExerciceFile = f; });
  }
}

function closeAllModals() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

document.getElementById('modal-add-exercice')?.addEventListener('click', e => e.stopPropagation());

// ===== TOAST =====
let toastTimeout;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.add('hidden'), 3000);
}

// ===== HELPERS =====
function formatDate(d) {
  if (!d) return '–';
  const dt = new Date(d);
  return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function typeEmoji(t) {
  return { pdf: '📄', video: '🎬', fiche: '📋', lien: '🔗' }[t] || '📄';
}

function typeLabel(t) {
  return { pdf: 'PDF', video: 'Vidéo', fiche: 'Fiche technique', lien: 'Lien externe' }[t] || 'Document';
}
