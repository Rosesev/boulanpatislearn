// ============================================================
// BoulanPâtissLearn — dashboard.js
// Remplacez SUPABASE_URL et SUPABASE_KEY par vos vraies valeurs
// ============================================================

const SUPABASE_URL = 'https://bwrcvagarvifdzqtbrla.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3cmN2YWdhcnZpZmR6cXRicmxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTExNzAsImV4cCI6MjA5Njc2NzE3MH0.5E75-_rTHBTaOsr90Ksj0Yhm0BFe0J0rZV-SAbRuW_M';

// Sauvegarde locale (fonctionne sans Supabase)
let currentUser = null;
let currentSemaine = 'S37';
let localData = {};

// ============================================================
// DONNÉES : semaines et compétences
// ============================================================
const semaines = [
  { id: 'S37', label: 'Sem. 37' },
  { id: 'S38', label: 'Sem. 38' },
  { id: 'S39', label: 'Sem. 39' },
  { id: 'S40', label: 'Sem. 40' },
];

const competences = [
  {
    id: 'c1', label: 'C1 — Organiser', emoji: '📋',
    bg: '#E1F5EE', iconColor: '#0F6E56', barColor: '#1D9E75',
    objectives: [
      { id: 'c11', label: 'C1.1 Mesures d\'hygiène, santé, sécurité', atelier: 'decouverte' },
      { id: 'c12', label: 'C1.2 Définir les besoins matériels', atelier: 'decouverte' },
      { id: 'c14', label: 'C1.4 Préparer les espaces de travail', atelier: 'apprentissage' },
    ]
  },
  {
    id: 'c2', label: 'C2 — Réaliser', emoji: '🍞',
    bg: '#EEEDFE', iconColor: '#534AB7', barColor: '#7F77DD',
    objectives: [
      { id: 'c21', label: 'C2.1 Mettre en œuvre les mesures d\'hygiène', atelier: 'apprentissage' },
      { id: 'c23', label: 'C2.3 Peser, mesurer, quantifier', atelier: 'apprentissage' },
      { id: 'c24', label: 'C2.4 Préparer, transformer, fabriquer', atelier: 'renforcement' },
      { id: 'c27', label: 'C2.7 Maintenir le poste de travail', atelier: 'autonomie' },
    ]
  },
  {
    id: 'c3', label: 'C3 — Contrôler', emoji: '🔍',
    bg: '#FAEEDA', iconColor: '#854F0B', barColor: '#EF9F27',
    objectives: [
      { id: 'c31', label: 'C3.1 Contrôler les matières premières', atelier: 'renforcement' },
      { id: 'c32', label: 'C3.2 Contrôler la mise en place et rangement', atelier: 'autonomie' },
    ]
  },
  {
    id: 'c4', label: 'C4 — Communiquer', emoji: '💬',
    bg: '#FAECE7', iconColor: '#993C1D', barColor: '#D85A30',
    objectives: [
      { id: 'c4x', label: 'C4 Commercialiser les produits', atelier: 'autonomie' },
    ]
  }
];

const productions2nde = [
  { nom: 'Croissants au beurre', emoji: '🥐', semaine: 'S37', atelier: 'apprentissage', tags: ['Viennoiseries', 'C2.4'] },
  { nom: 'Pain de tradition', emoji: '🍞', semaine: 'S37', atelier: 'decouverte', tags: ['PTF', 'C2.3'] },
  { nom: 'Pain spécial épeautre', emoji: '🫓', semaine: 'S37', atelier: 'autonomie', tags: ['Spéciaux', 'C2.4'] },
];

const productions1ere = [
  { nom: 'Baguette tradition', emoji: '🥖', semaine: 'S37', atelier: 'renforcement', tags: ['PTF', 'C2.4'] },
  { nom: 'Brioche tressée', emoji: '🍞', semaine: 'S37', atelier: 'apprentissage', tags: ['Viennoiseries', 'C2.3'] },
];

const atelierLabels = { decouverte: 'Découverte', apprentissage: 'Apprentissage', renforcement: 'Renforcement', autonomie: 'Autonomie' };

// ============================================================
// LOGIN
// ============================================================
function login() {
  const prenom = document.getElementById('input-prenom').value.trim();
  const classe = document.getElementById('input-classe').value;
  if (!prenom || !classe) { alert('Merci de renseigner ton prénom et ta classe.'); return; }

  currentUser = { prenom, classe };
  const initiales = prenom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  document.getElementById('avatar-initials').textContent = initiales;
  document.getElementById('display-name').textContent = prenom;
  document.getElementById('display-class').textContent = classe === '2nde' ? 'Classe de 2nde Bac Pro' : 'Classe de 1ère Bac Pro';

  // Charger les données sauvegardées localement
  const saved = localStorage.getItem('bpl_' + prenom + '_' + classe);
  localData = saved ? JSON.parse(saved) : {};

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').classList.add('visible');

  renderSemaines();
  renderDashboard();
  renderPortfolio();
  renderRecap();
}

// ============================================================
// NAVIGATION
// ============================================================
function switchTab(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  const tabs = ['dashboard', 'portfolio', 'recap'];
  document.querySelectorAll('.tab')[tabs.indexOf(name)].classList.add('active');
}

// ============================================================
// SEMAINES
// ============================================================
function renderSemaines() {
  const el = document.getElementById('semaines-list');
  el.innerHTML = semaines.map(s => `
    <button class="sem ${s.id === currentSemaine ? 'active' : ''}" onclick="selectSemaine('${s.id}')">${s.label}</button>
  `).join('');
}

function selectSemaine(id) {
  currentSemaine = id;
  renderSemaines();
  renderDashboard();
  renderRecap();
}

// ============================================================
// DASHBOARD
// ============================================================
function getObjKey(semaine, objId) {
  return semaine + '_' + objId;
}

function isObjDone(objId) {
  return !!localData[getObjKey(currentSemaine, objId)];
}

function countDone() {
  return competences.flatMap(c => c.objectives).filter(o => isObjDone(o.id)).length;
}

function saveData() {
  if (!currentUser) return;
  localStorage.setItem('bpl_' + currentUser.prenom + '_' + currentUser.classe, JSON.stringify(localData));
  // TODO : remplacer par appel Supabase quand configuré
  saveToSupabase();
}

function renderDashboard() {
  const done = countDone();
  const total = competences.flatMap(c => c.objectives).length;
  document.getElementById('s-done').textContent = done;
  document.getElementById('s-total').textContent = total;
  const prods = currentUser?.classe === '2nde' ? productions2nde : productions1ere;
  document.getElementById('s-prod').textContent = prods.filter(p => p.semaine === currentSemaine).length;
  document.getElementById('global-pct').textContent = Math.round(done / total * 100) + '%';

  const list = document.getElementById('comp-list');
  list.innerHTML = competences.map(comp => {
    const done = comp.objectives.filter(o => isObjDone(o.id)).length;
    const total = comp.objectives.length;
    const pct = Math.round(done / total * 100);
    return `
      <div class="comp-card">
        <div class="comp-head">
          <div class="comp-icon" style="background:${comp.bg}"><span style="font-size:16px">${comp.emoji}</span></div>
          <div style="flex:1">
            <div class="comp-title">${comp.label}</div>
            <div class="comp-sub">${done}/${total} objectifs validés</div>
          </div>
          <span style="font-size:13px; font-weight:600; color:${comp.iconColor}">${pct}%</span>
        </div>
        <div class="prog-bar"><div class="prog-fill" style="width:${pct}%; background:${comp.barColor}"></div></div>
        <div class="obj-list">
          ${comp.objectives.map(obj => `
            <div class="obj-row" onclick="toggleObj('${comp.id}','${obj.id}')">
              <div class="obj-check ${isObjDone(obj.id) ? 'done' : ''}"></div>
              <span class="obj-label ${isObjDone(obj.id) ? 'done' : ''}">${obj.label}</span>
              <span class="at-badge at-${obj.atelier}">${atelierLabels[obj.atelier]}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function toggleObj(compId, objId) {
  const key = getObjKey(currentSemaine, objId);
  localData[key] = !localData[key];
  saveData();
  renderDashboard();
  renderRecap();
}

// ============================================================
// PORTFOLIO
// ============================================================
function renderPortfolio() {
  const prods = currentUser?.classe === '2nde' ? productions2nde : productions1ere;
  const grid = document.getElementById('portfolio-grid');
  grid.innerHTML = prods.map(p => `
    <div class="prod-card">
      <div class="prod-emoji">${p.emoji}</div>
      <div class="prod-body">
        <div class="prod-name">${p.nom}</div>
        <div class="prod-meta">${p.semaine} · ${atelierLabels[p.atelier]}</div>
        <div class="prod-tags">${p.tags.map(t => `<span class="prod-tag">${t}</span>`).join('')}</div>
      </div>
    </div>
  `).join('') + `
    <div class="upload-btn" onclick="ajouterProduction()">
      <span style="font-size:28px">📷</span>
      <span>Ajouter une production</span>
    </div>
  `;
}

function ajouterProduction() {
  alert('📸 Fonctionnalité photo disponible après connexion Supabase.\nEn attendant, note ta production dans le récap !');
}

// ============================================================
// RECAP
// ============================================================
function renderRecap() {
  const total = competences.flatMap(c => c.objectives).length;
  const done = countDone();
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const classeLabel = currentUser?.classe === '2nde' ? '2nde Bac Pro' : '1ère Bac Pro';

  let rows = `
    <div class="recap-row"><span class="recap-label">Date</span><span class="recap-val">${today}</span></div>
    <div class="recap-row"><span class="recap-label">Semaine</span><span class="recap-val">${currentSemaine}</span></div>
    <div class="recap-row"><span class="recap-label">Classe</span><span class="recap-val">${classeLabel}</span></div>
    <div class="recap-row"><span class="recap-label">Objectifs validés</span><span class="recap-val ${done === total ? 'ok' : 'pending'}">${done} / ${total}</span></div>
  `;
  competences.forEach(comp => {
    const d = comp.objectives.filter(o => isObjDone(o.id)).length;
    const t = comp.objectives.length;
    rows += `<div class="recap-row"><span class="recap-label">${comp.label}</span><span class="recap-val ${d === t ? 'ok' : 'pending'}">${d}/${t}</span></div>`;
  });

  document.getElementById('recap-content').innerHTML = rows;
}

async function saveToSupabase() {
  if (!currentUser) return;
  const updates = competences.flatMap(c => c.objectives.map(o => ({
    prenom: currentUser.prenom,
    classe: currentUser.classe,
    semaine: currentSemaine,
    objectif_id: o.id,
    done: isObjDone(o.id)
  })));
  await fetch(SUPABASE_URL + '/rest/v1/progressions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(updates)
  });
}
function genererCommentaire() {
  const done = countDone();
  const total = competences.flatMap(c => c.objectives).length;
  const c1done = competences[0].objectives.filter(o => isObjDone(o.id)).length;
  const c2done = competences[1].objectives.filter(o => isObjDone(o.id)).length;
  alert(`✨ Commentaire généré :\n\nSur ${total} objectifs de la séance ${currentSemaine}, ${done} ont été validés. C1 (Organiser) : ${c1done}/3 — C2 (Réaliser) : ${c2done}/4.\n\n(Connectez Supabase + clé API Anthropic pour des commentaires personnalisés par IA.)`);
}
