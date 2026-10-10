/* ============================================================
   AMERTA LIMA — Server Game Kuis Bhinneka Tunggal Ika
   PPKn SMA Kelas X · Bab 3 (Unit 1–5)
   ============================================================ */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'public')));

/* ---------------- DATA TIM ---------------- */
const TEAMS = {
  ares:    { id: 'ares',    name: 'TIM ARES',    icon: '⚔️', color: '#dc2626' },
  phobos:  { id: 'phobos',  name: 'TIM PHOBOS',  icon: '👁️', color: '#9333ea' },
  hades:   { id: 'hades',   name: 'TIM HADES',   icon: '🔱', color: '#0d9488' },
  artemis: { id: 'artemis', name: 'TIM ARTEMIS', icon: '🏹', color: '#d97706' }
};
const TEAM_IDS = Object.keys(TEAMS);

/* ---------------- META RONDE ---------------- */
const META = [
  { name: 'GET THE POINT',    tag: 'Poin normal ×1', mult: 1 },
  { name: 'SKY SURGE',        tag: 'Poin round ini ×1,5', mult: 1.5 },
  { name: 'DOUBLE CANNON',    tag: 'Poin round ini ×2', mult: 2 },
  { name: 'BOM GILA',         tag: 'Benar ×4 · Salah = BOM! Separuh poin round 4 tim kalian hangus', mult: 4 },
  { name: 'CURI POIN',        tag: 'Poin ×2 · Ada 1 JAWABAN TERSEMBUNYI. Penemunya merampas semua poin round 5 tim lain!', mult: 2 },
  { name: 'ALL IN OR THIEF',  tag: 'Benar ×3 · Setelah benar, jawab soal curian untuk MERAMPOK poin tim lain. Salah = poin jawaban hangus!', mult: 3 },
  { name: 'DEFEAT THE KING',  tag: 'FINAL · Taruhan 0/25/50/100% poin · 1 soal esai · 15 detik', mult: 1, final: true }
];

/* ---------------- BANK SOAL (dari buku PPKn Kelas X, Bagian 3) ----------------
   Poin genap semua (8–34), urut dari jawaban paling jarang terpikir (atas, poin
   tertinggi) ke paling umum (bawah). Round 2 memakai kelipatan 4 agar hasil ×1,5
   tetap genap. */
const QUESTIONS = [
  { // Round 1 — Unit 1: identitas alamiah
    q: 'Hasil survei 100 pelajar: Apa contoh identitas yang sudah terbawa sejak lahir (bersifat alamiah)?',
    list: [
      { t: 'Sidik jari', p: 34 }, { t: 'Golongan darah', p: 30 }, { t: 'Bentuk hidung', p: 24 },
      { t: 'Warna mata', p: 18 }, { t: 'Jenis rambut', p: 14 }, { t: 'Tinggi badan', p: 12 }, { t: 'Warna kulit', p: 8 }
    ]
  },
  { // Round 2 — Unit 2: keragaman agama/kepercayaan
    q: 'Sebutkan agama atau kepercayaan yang dianut oleh penduduk Indonesia!',
    list: [
      { t: 'Kepercayaan lokal (Parmalim, Sunda Wiwitan, Kaharingan, Marapu)', p: 32 },
      { t: 'Konghucu', p: 28 }, { t: 'Katolik', p: 24 }, { t: 'Hindu', p: 20 },
      { t: 'Buddha', p: 16 }, { t: 'Kristen', p: 12 }, { t: 'Islam', p: 8 }
    ]
  },
  { // Round 3 — Unit 2/5: persatuan & toleransi
    q: 'Apa saja wujud sikap menjaga persatuan di tengah keberagaman?',
    list: [
      { t: 'Mengikuti festival lintas budaya', p: 34 }, { t: 'Menjenguk teman berbeda agama', p: 28 },
      { t: 'Gotong royong', p: 24 }, { t: 'Tidak membeda-bedakan teman', p: 20 },
      { t: 'Musyawarah', p: 16 }, { t: 'Saling menghormati', p: 12 }, { t: 'Toleransi', p: 8 }
    ]
  },
  { // Round 4 — Unit 3: konflik keberagaman di Indonesia
    q: 'Sebutkan peristiwa konflik keberagaman yang pernah terjadi di Indonesia!',
    list: [
      { t: 'Konflik Ahmadiyah', p: 34 }, { t: 'Konflik Lampung', p: 30 }, { t: 'Konflik Poso', p: 26 },
      { t: 'Kerusuhan Mei 1998', p: 22 }, { t: 'Konflik Sampit', p: 18 }, { t: 'Konflik Ambon', p: 14 }
    ]
  },
  { // Round 5 — Unit 2: identitas primordial (+ jawaban tersembunyi)
    q: 'Sebutkan unsur identitas primordial masyarakat Indonesia!',
    list: [
      { t: 'Adat istiadat', p: 30 }, { t: 'Ras', p: 26 }, { t: 'Bahasa daerah', p: 22 },
      { t: 'Suku bangsa', p: 18 }, { t: 'Agama', p: 14 }
    ],
    hidden: { t: 'Kepercayaan lokal nusantara', p: 34 }
  },
  { // Round 6 — Unit 5: manfaat kebinekaan
    q: 'Apa manfaat hidup dalam kebinekaan bagi bangsa Indonesia?',
    list: [
      { t: 'Menambah wawasan budaya', p: 34 }, { t: 'Memperkuat persatuan', p: 30 },
      { t: 'Belajar sikap toleransi', p: 26 }, { t: 'Saling melengkapi kekurangan', p: 22 },
      { t: 'Memperkaya budaya bangsa', p: 18 }, { t: 'Menjadi daya tarik wisata', p: 14 }
    ]
  },
  { // Round 7 — FINAL (esai, dinilai guru dari kesesuaian makna)
    q: 'Tuliskan satu sikap nyata yang dapat kalian lakukan di sekolah untuk menerapkan nilai Bhinneka Tunggal Ika dan mencegah intoleransi!',
    final: true,
    key: 'Menghormati dan menghargai perbedaan (agama, suku, budaya) antarteman; berteman tanpa membeda-bedakan; gotong royong.',
    keywords: ['toleransi', 'hormat', 'hargai', 'beda', 'gotong royong', 'berteman', 'tidak membeda']
  }
];

/* Soal curian acak Round 6 */
const R6POOL = [
  { q: 'Berapa jumlah bahasa daerah di Indonesia yang terverifikasi menurut Badan Bahasa Kemendikbud?', o: ['1.300 bahasa', '718 bahasa', '350 bahasa'], a: 1 },
  { q: 'Siapa tokoh yang stated "menggali" Pancasila dari tradisi bumi nusantara?', o: ['Mohammad Hatta', 'Ir. Soekarno', 'Sutan Sjahrir'], a: 1 },
  { q: 'Semboyan bangsa Indonesia dalam mengelola keberagaman adalah…', o: ['Bhinneka Tunggal Ika', 'Tut Wuri Handayani', 'Jalesveva Jayamahe'], a: 0 },
  { q: 'Konflik Ambon yang dipicu masalah keberagaman berlangsung pada…', o: ['1999–2003', '2001', '2012'], a: 0 },
  { q: 'Suporter Jepang yang memungut sampah di stadion (materi Unit 4) adalah contoh…', o: ['Kearifan yang patut diteladani', 'Kolaborasi militer', 'Diskriminasi budaya'], a: 0 },
  { q: 'Menurut BPS (2010), perkiraan jumlah suku bangsa di Indonesia adalah…', o: ['1.300-an lebih', '718', '±100'], a: 0 }
];

const R7_PCT = [0, 25, 50, 100];
const PASS_TEACHER = 'SATRIANDIKA';
const PASS_OPERATOR = 'OPERATOR';

/* ---------------- STATE ---------------- */
let students = {};   // sid -> {id,name,absen,kelas,team,isCaptain,ind,contrib}
let votes = {};      // sid -> targetSid
let state;

function freshState() {
  return {
    phase: 'lobby', round: 0, roundPhase: 'idle',
    scores: { ares: 0, phobos: 0, hades: 0, artemis: 0 },
    roundScores: { ares: 0, phobos: 0, hades: 0, artemis: 0 },
    locked: { ares: false, phobos: false, hades: false, artemis: false },
    revealed: {}, submissions: {},
    r5: null, r6: {}, r6Timers: {},
    r7: { phase: null, bets: {}, answers: {}, judged: {}, results: {} },
    history: [], winnerOrder: null
  };
}
state = freshState();

/* muat rekap individu tersimpan (backend guru) */
try {
  const saved = JSON.parse(fs.readFileSync(path.join(__dirname, 'nilai.json'), 'utf8'));
  if (saved.students) students = saved.students;
} catch (e) { /* belum ada file */ }

function saveNilai() {
  try { fs.writeFileSync(path.join(__dirname, 'nilai.json'), JSON.stringify({ students, savedAt: new Date().toISOString() }, null, 2)); } catch (e) {}
}

/* ---------------- HELPER ---------------- */
const teamMembers = t => Object.values(students).filter(s => s.team === t);
const activeTeams = () => TEAM_IDS.filter(t => teamMembers(t).length > 0);
const captainOf = t => {
  const mem = teamMembers(t);
  if (!mem.length) return null;
  const tally = {};
  mem.forEach(m => { const v = votes[m.id]; if (v && mem.some(x => x.id === v)) tally[v] = (tally[v] || 0) + 1; });
  let best = null, bv = -1;
  Object.entries(tally).forEach(([id, c]) => { if (c > bv) { bv = c; best = id; } });
  if (!best) best = mem[0].id; // default: anggota pertama
  mem.forEach(m => m.isCaptain = m.id === best);
  return best;
};
const refreshCaptains = () => TEAM_IDS.forEach(captainOf);

function snapshot() {
  state.history.push(JSON.stringify({
    scores: state.scores, roundScores: state.roundScores, revealed: state.revealed,
    locked: state.locked, r5: state.r5, submissions: state.submissions, r7: state.r7
  }));
  if (state.history.length > 20) state.history.shift();
}
function answerAt(idx) {
  const Q = QUESTIONS[state.round - 1];
  if (state.round === 5) {
    const arr = [...Q.list];
    arr.splice(state.r5.slot, 0, { ...Q.hidden, hidden: true });
    return arr[idx];
  }
  return Q.list[idx];
}
const shapeCount = () => state.round === 5 ? QUESTIONS[4].list.length + 1 : (QUESTIONS[state.round - 1].list ? QUESTIONS[state.round - 1].list.length : 0);

function lockTeam(team) {
  state.locked[team] = true;
  if (activeTeams().every(t => state.locked[t])) state.roundPhase = 'done';
}
function fx(payload) { io.emit('fx', payload); }

/* ---------------- RONDE ---------------- */
function startRound(n) {
  state.round = n; state.roundPhase = 'answering';
  state.revealed = {}; state.submissions = {};
  state.roundScores = { ares: 0, phobos: 0, hades: 0, artemis: 0 };
  state.locked = { ares: false, phobos: false, hades: false, artemis: false };
  state.r6 = {}; Object.values(state.r6Timers).forEach(clearTimeout); state.r6Timers = {};
  if (n === 5) state.r5 = { slot: Math.floor(Math.random() * (QUESTIONS[4].list.length + 1)), found: false };
  else state.r5 = null;
  if (n === 7) state.r7 = { phase: 'bet', bets: {}, answers: {}, judged: {}, results: {} };
  broadcast();
}

function award(team, idx, sub) {
  const base = answerAt(idx);
  let pts = Math.round(base.p * META[state.round - 1].mult);
  state.scores[team] += pts;
  state.roundScores[team] += pts;
  state.revealed[idx] = { t: base.t, p: pts, team };
  sub.status = 'correct';
  // skor individu kru pengusul / kapten
  const st = students[sub.proposerId];
  if (st) { st.ind = (st.ind || 0) + pts; st.contrib = (st.contrib || 0) + 1; saveNilai(); }

  if (state.round === 5 && base.hidden && !state.r5.found) {
    state.r5.found = true;
    let stolen = 0;
    TEAM_IDS.forEach(t => {
      if (t !== team && state.roundScores[t] > 0) {
        stolen += state.roundScores[t];
        state.scores[t] -= state.roundScores[t];
        state.roundScores[t] = 0;
      }
    });
    state.scores[team] += stolen;
    state.roundScores[team] += stolen;
    lockTeam(team);
    fx({ type: 'steal', team, pts: stolen });
  }
  if (state.round === 6) {
    const q = R6POOL[Math.floor(Math.random() * R6POOL.length)];
    state.r6[team] = { phase: 'q', earned: pts, qIdx: R6POOL.indexOf(q), deadline: Date.now() + 25000 };
    state.r6Timers[team] = setTimeout(() => { // lewati otomatis bila waktu habis
      const r = state.r6[team];
      if (r && r.phase === 'q') { r.phase = 'idle'; lockTeam(team); broadcast(); }
    }, 26000);
  }
  if (Object.keys(state.revealed).length >= shapeCount()) state.roundPhase = 'done';
  fx({ type: 'correct', team, pts });
  broadcast();
}

function judgeWrong(team) {
  const sub = state.submissions[team];
  if (sub) sub.status = 'wrong';
  if (state.round === 4 && state.roundScores[team] > 0) {
    const half = Math.floor(state.roundScores[team] / 2);
    state.scores[team] -= half;
    state.roundScores[team] -= half;
    fx({ type: 'bomb', team, pts: half });
  } else fx({ type: 'wrong', team });
  lockTeam(team);
  broadcast();
}

/* ---------------- VIEW (anti-bocor) ---------------- */
function pubState() {
  const Q = QUESTIONS[state.round - 1];
  const showQ = state.phase === 'playing' && !(state.round === 7 && state.r7.phase === 'bet');
  return {
    phase: state.phase, round: state.round, roundPhase: state.roundPhase,
    meta: state.round ? META[state.round - 1] : null,
    question: showQ ? (Q ? Q.q : '') : (state.round === 7 ? '🎲 FASE TARUHAN — pilih besaran taruhan kalian!' : ''),
    shapes: state.round && !Q.final ? shapeCount() : 0,
    revealed: state.revealed,
    scores: state.scores, roundScores: state.roundScores, locked: state.locked,
    submissions: state.submissions, r5found: state.r5 ? state.r5.found : false,
    r6pub: Object.fromEntries(Object.entries(state.r6).map(([t, r]) => [t, r.phase])),
    r7: {
      phase: state.r7.phase, results: state.r7.results,
      betted: Object.keys(state.r7.bets), answered: Object.keys(state.r7.answers),
      judged: state.r7.judged, deadline: state.r7.deadline || null
    },
    teams: Object.fromEntries(TEAM_IDS.map(t => {
      const cap = captainOf(t);
      return [t, { ...TEAMS[t], memberCount: teamMembers(t).length, captainName: cap ? students[cap].name : '-' }];
    })),
    winnerOrder: state.winnerOrder, histLen: state.history.length
  };
}
function studentExtra(sid) {
  const me = students[sid];
  if (!me) return null;
  const t = me.team;
  const mem = teamMembers(t).map(m => ({ id: m.id, name: m.name, absen: m.absen, captain: m.isCaptain, votes: Object.values(votes).filter(v => v === m.id).length }));
  const myProps = Object.values(state.propsosals || {}).filter(p => p.team === t && p.authorId === sid && p.status === 'pending');
  const teamProps = Object.values(state.propsosals || {}).filter(p => p.team === t && p.status === 'pending');
  const r6 = state.r6[t];
  return {
    me: { ...me, captain: me.isCaptain, members: mem, myProps, teamProps: me.isCaptain ? teamProps : [],
      pendingSub: state.submissions[t] && state.submissions[t].status === 'pending' ? state.submissions[t] : null,
      r6: r6 && (r6.phase === 'q' || r6.phase === 'pick') ? { phase: r6.phase, earned: r6.earned, q: r6.phase === 'q' ? R6POOL[r6.qIdx] : null, deadline: r6.deadline } : null,
      myBet: state.r7.bets[t] ?? null, myAnswer: state.r7.answers[t] ?? null }
  };
}
function teacherExtra() {
  const Q = QUESTIONS[state.round - 1];
  return {
    teacher: {
      answers: state.round && Q && !Q.final ? Array.from({ length: shapeCount() }, (_, i) => {
        const a = answerAt(i);
        return { idx: i, t: a.t, p: a.p, hidden: !!a.hidden, revealed: !!state.revealed[i] };
      }) : [],
      finalKey: Q && Q.final ? { key: Q.key, keywords: Q.keywords } : null,
      r7answers: state.r7.answers, r7bets: state.r7.bets,
      students: Object.values(students).map(s => ({
        id: s.id, name: s.name, absen: s.absen, kelas: s.kelas, team: s.team,
        captain: s.isCaptain, ind: s.ind || 0, contrib: s.contrib || 0
      })),
      r6detail: state.r6
    }
  };
}
function broadcast() {
  refreshCaptains();
  const pub = pubState();
  for (const s of io.sockets.sockets.values()) {
    const role = s.data.role;
    if (role === 'teacher') s.emit('state', { ...pub, ...teacherExtra() });
    else if (role === 'student' && s.data.sid && students[s.data.sid]) s.emit('state', { ...pub, ...studentExtra(s.data.sid) });
    else s.emit('state', pub);
  }
}

/* ---------------- SOCKET ---------------- */
state.propsosals = {}; let propSeq = 1;

io.on('connection', socket => {
  socket.on('hello', d => {
    const role = d.role;
    if (role === 'teacher' && d.pass !== PASS_TEACHER) return socket.emit('err', 'Password guru salah!');
    if (role === 'operator' && d.pass !== PASS_OPERATOR) return socket.emit('err', 'Password operator salah!');
    if (role === 'student') {
      if (!d.name || !d.absen || !d.kelas) return socket.emit('err', 'Lengkapi nama, nomor absen, dan kelas!');
      const sid = String(d.sid || Math.random().toString(36).slice(2, 10));
      if (!students[sid]) students[sid] = { id: sid, name: d.name, absen: d.absen, kelas: d.kelas, team: d.team || null, ind: 0, contrib: 0 };
      else { students[sid].name = d.name; students[sid].absen = d.absen; students[sid].kelas = d.kelas; if (d.team) students[sid].team = d.team; }
      socket.data.sid = sid;
      saveNilai();
      socket.emit('ok', { sid });
    } else socket.emit('ok', {});
    socket.data.role = role;
    broadcast();
  });

  const me = () => students[socket.data.sid];
  const guardStudent = () => socket.data.role === 'student' && me() && me().team;
  const guardPlaying = () => state.phase === 'playing' && state.roundPhase === 'answering';
  const guardCaptain = () => guardStudent() && me().isCaptain;

  socket.on('student:team', d => {
    if (!guardStudent() && !(socket.data.role === 'student' && me())) return;
    if (state.phase !== 'lobby') return socket.emit('err', 'Game sudah dimulai, tim dikunci!');
    if (!TEAM_IDS.includes(d.team)) return;
    me().team = d.team; broadcast();
  });

  socket.on('vote', d => {
    if (!guardStudent()) return socket.emit('err', 'Masuk dulu sebagai siswa!');
    if (state.phase !== 'lobby') return;
    const target = students[d.target];
    if (!target || target.team !== me().team) return;
    votes[me().id] = d.target; broadcast();
  });

  /* ---- kru mengusulkan ---- */
  socket.on('crew:propose', d => {
    if (!guardStudent() || !guardPlaying()) return;
    if (state.locked[me().team]) return socket.emit('err', 'Kapalmu sudah terkunci di round ini.');
    if (state.submissions[me().team]?.status === 'pending') return socket.emit('err', 'Masih ada jawaban menunggu konfirmasi guru.');
    const txt = String(d.text || '').trim().slice(0, 80);
    if (!txt) return;
    state.propsosals['p' + propSeq] = { id: 'p' + propSeq, team: me().team, authorId: me().id, authorName: me().name, text: txt, status: 'pending' };
    propSeq++; broadcast();
  });
  socket.on('crew:cancel', d => {
    const p = state.propsosals[d.id];
    if (p && p.authorId === socket.data.sid && p.status === 'pending') { delete state.propsosals[d.id]; broadcast(); }
  });

  /* ---- kapten memutuskan ---- */
  socket.on('cap:choose', d => {
    if (!guardCaptain() || !guardPlaying()) return;
    const p = state.propsosals[d.id];
    if (!p || p.team !== me().team || p.status !== 'pending') return;
    if (state.submissions[me().team]?.status === 'pending') return socket.emit('err', 'Tunggu konfirmasi guru dulu.');
    if (state.locked[me().team]) return;
    p.status = 'accepted';
    state.submissions[me().team] = { text: p.text, proposerId: p.authorId, proposerName: p.authorName, status: 'pending', at: Date.now() };
    broadcast();
  });
  socket.on('cap:reject', d => {
    const p = state.propsosals[d.id];
    if (p && p.team === me().team) { p.status = 'rejected'; delete state.propsosals[d.id]; broadcast(); }
  });
  socket.on('cap:submit', d => {
    if (!guardCaptain() || !guardPlaying()) return;
    if (state.submissions[me().team]?.status === 'pending') return socket.emit('err', 'Tunggu konfirmasi guru dulu.');
    if (state.locked[me().team]) return socket.emit('err', 'Kapalmu sudah terkunci.');
    const txt = String(d.text || '').trim().slice(0, 80);
    if (!txt) return;
    state.submissions[me().team] = { text: txt, proposerId: me().id, proposerName: me().name + ' (Kapten)', status: 'pending', at: Date.now() };
    broadcast();
  });

  /* ---- Round 6: curi poin ---- */
  socket.on('r6:answer', d => {
    if (!guardStudent()) return;
    const r = state.r6[me().team];
    if (!r || r.phase !== 'q') return;
    clearTimeout(state.r6Timers[me().team]);
    if (Number(d.choice) === R6POOL[r.qIdx].a) { r.phase = 'pick'; fx({ type: 'stealReady', team: me().team }); }
    else { // salah → poin jawaban hangus
      snapshot();
      state.scores[me().team] -= r.earned;
      state.roundScores[me().team] -= r.earned;
      r.phase = 'idle'; r.earned = 0;
      lockTeam(me().team);
      fx({ type: 'burn', team: me().team });
    }
    broadcast();
  });
  socket.on('r6:skip', () => {
    if (!guardStudent()) return;
    const r = state.r6[me().team];
    if (!r || r.phase !== 'q') return;
    clearTimeout(state.r6Timers[me().team]);
    r.phase = 'idle'; lockTeam(me().team); broadcast();
  });
  socket.on('r6:pick', d => {
    if (!guardStudent()) return;
    const team = me().team, r = state.r6[team];
    if (!r || r.phase !== 'pick' || !TEAM_IDS.includes(d.target) || d.target === team) return;
    snapshot();
    const amt = Math.min(r.earned, state.scores[d.target]);
    state.scores[d.target] -= amt;
    state.scores[team] += amt;
    state.roundScores[team] += amt;
    r.phase = 'idle';
    lockTeam(team);
    fx({ type: 'steal', team, pts: amt, from: d.target });
    broadcast();
  });

  /* ---- Round 7 ---- */
  socket.on('r7:bet', d => {
    if (!guardCaptain() || state.round !== 7 || state.r7.phase !== 'bet') return;
    const pct = R7_PCT.includes(Number(d.pct)) ? Number(d.pct) : null;
    if (pct === null) return;
    state.r7.bets[me().team] = pct;
    if (activeTeams().every(t => state.r7.bets[t] !== undefined)) beginR7Answer();
    broadcast();
  });
  function beginR7Answer() {
    if (state.r7.phase !== 'bet') return;
    state.r7.phase = 'answer';
    state.r7.deadline = Date.now() + 15000;
    state.r7.timer = setTimeout(() => { if (state.r7.phase === 'answer') { state.r7.phase = 'judge'; broadcast(); } }, 15500);
  }
  socket.on('r7:answer', d => {
    if (!guardCaptain() || state.round !== 7 || state.r7.phase !== 'answer') return;
    if (Date.now() > state.r7.deadline) return;
    const txt = String(d.text || '').trim().slice(0, 160);
    if (!txt) return;
    state.r7.answers[me().team] = txt;
    broadcast();
  });

  /* ---- GURU ---- */
  const guardTeacher = () => socket.data.role === 'teacher';
  socket.on('t:start', () => { if (guardTeacher() && state.phase === 'lobby') { state.phase = 'playing'; startRound(1); } });
  socket.on('t:endRound', () => { if (guardTeacher() && state.round <= 6) { state.roundPhase = 'done'; broadcast(); } });
  socket.on('t:next', () => {
    if (!guardTeacher() || state.roundPhase !== 'done') return;
    if (state.round < 6) startRound(state.round + 1);
    else if (state.round === 6) startRound(7);
  });
  socket.on('t:judgeRight', d => {
    if (!guardTeacher() || !guardPlaying()) return;
    const sub = state.submissions[d.team];
    if (!sub || sub.status !== 'pending' || state.revealed[d.idx]) return;
    snapshot();
    award(d.team, d.idx, sub);
  });
  socket.on('t:judgeWrong', d => {
    if (!guardTeacher() || !guardPlaying()) return;
    const sub = state.submissions[d.team];
    if (!sub || sub.status !== 'pending') return;
    snapshot();
    judgeWrong(d.team);
  });
  socket.on('t:undo', () => {
    if (!guardTeacher() || !state.history.length) return;
    const snap = JSON.parse(state.history.pop());
    Object.assign(state, snap);
    fx({ type: 'undo' });
    broadcast();
  });
  socket.on('t:reset', () => {
    if (!guardTeacher()) return;
    Object.values(state.r6Timers).forEach(clearTimeout);
    clearTimeout(state.r7.timer);
    state = freshState(); state.propsosals = {}; votes = {};
    Object.values(students).forEach(s => { s.ind = 0; s.contrib = 0; });
    saveNilai(); broadcast();
  });
  socket.on('t:r7start', () => { if (guardTeacher() && state.round === 7 && state.r7.phase === 'bet') { beginR7Answer(); broadcast(); } });
  socket.on('t:r7judge', d => {
    if (!guardTeacher() || state.round !== 7 || state.r7.phase !== 'judge') return;
    if (typeof d.ok !== 'boolean') return;
    state.r7.judged[d.team] = d.ok;
    broadcast();
  });
  socket.on('t:r7reveal', () => {
    if (!guardTeacher() || state.round !== 7 || state.r7.phase !== 'judge') return;
    snapshot();
    const res = {};
    TEAM_IDS.forEach(t => {
      const pct = state.r7.bets[t] ?? 0;
      const bet = Math.floor(state.scores[t] * pct / 100);
      const ok = state.r7.judged[t] === true;
      const delta = ok ? bet : -Math.min(bet, state.scores[t]); // poin tidak boleh negatif
      state.scores[t] += delta;
      res[t] = { pct, bet, ok, delta, text: state.r7.answers[t] || '(tidak menjawab)' };
    });
    state.r7.results = res;
    state.r7.phase = 'reveal';
    state.winnerOrder = [...TEAM_IDS].sort((a, b) => state.scores[b] - state.scores[a]);
    state.roundPhase = 'done';
    fx({ type: 'reveal7' });
    broadcast();
  });
  socket.on('t:podium', () => { if (guardTeacher() && state.r7.phase === 'reveal') { state.phase = 'finished'; broadcast(); } });
  socket.on('t:makeCaptain', d => {
    if (!guardTeacher() || !students[d.id]) return;
    TEAM_IDS.forEach(t => teamMembers(t).forEach(m => { if (m.team === students[d.id].team) votes[m.id] = d.id; }));
    broadcast();
  });
  socket.on('t:reVote', d => {
    if (!guardTeacher()) return;
    teamMembers(d.team).forEach(m => delete votes[m.id]);
    broadcast();
  });

  socket.on('disconnect', () => { /* state tersimpan di server */ });
});

server.listen(3000, () => {
  console.log('⛵ AMERTA LIMA berjalan di http://localhost:3000');
  console.log('Siswa: buka http://<IP-komputer-ini>:3000 dari HP (WiFi sama).');
});