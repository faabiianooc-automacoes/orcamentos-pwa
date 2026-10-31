/* Sincronização com a nuvem (Firebase: Authentication + Cloud Firestore).

   - O app continua funcionando só com os dados do aparelho (local-first).
   - Com a nuvem configurada e o usuário conectado, cada alteração entra numa
     fila e é enviada; alterações feitas em outro aparelho chegam em tempo real.
   - Vale a versão mais recente de cada registro (campo atualizadoEm).
   - Exclusões viram registros "deletado" na nuvem, para chegar aos outros aparelhos.
   - Estrutura: usuarios/{uid}/{clientes|orcamentos|catalogo|meta}/{id}
   - O SDK só é carregado quando a nuvem está configurada. */
(function () {
  'use strict';
  const st = window.Store;
  const CHAVE_CONFIG = 'orcamentos-pwa:nuvem-config';
  const CHAVE_UID = 'orcamentos-pwa:nuvem-uid';
  const COLECOES = ['clientes', 'orcamentos', 'catalogo', 'meta'];
  const SDK = ['vendor/firebase-app-compat.js', 'vendor/firebase-auth-compat.js', 'vendor/firebase-firestore-compat.js'];

  let auth = null, fs = null, usuario = null;
  let cancelar = [];
  let tEnvio = null, enviando = false;
  const estado = { fase: 'desligada', erro: '', ultima: '', email: '' };
  // fase: desligada | carregando | desconectada | sincronizando | ok | offline | erro
  const ouvintesEstado = new Set(), ouvintesDados = new Set();
  let perguntar = async () => 'nuvem';

  const notificar = () => ouvintesEstado.forEach(f => { try { f(estado); } catch (e) {} });
  const notificarDados = () => ouvintesDados.forEach(f => { try { f(); } catch (e) {} });
  const definir = (fase, extra) => { Object.assign(estado, { fase, erro: '' }, extra || {}); notificar(); };

  /* ---------- Configuração ---------- */
  function lerConfig() {
    try { const c = JSON.parse(localStorage.getItem(CHAVE_CONFIG)); if (c && c.apiKey) return c; } catch (e) {}
    return window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey ? window.FIREBASE_CONFIG : null;
  }
  // Aceita o trecho copiado do console do Firebase (const firebaseConfig = {...}) ou JSON
  function interpretarConfig(texto) {
    const cfg = {};
    const re = /["']?(apiKey|authDomain|projectId|storageBucket|messagingSenderId|appId|measurementId)["']?\s*:\s*["']([^"']+)["']/g;
    let m; while ((m = re.exec(String(texto || '')))) cfg[m[1]] = m[2].trim();
    const faltam = ['apiKey', 'authDomain', 'projectId', 'appId'].filter(k => !cfg[k]);
    if (faltam.length) throw new Error('Configuração incompleta. Faltam: ' + faltam.join(', ') + '.');
    return cfg;
  }
  function salvarConfig(cfg) { localStorage.setItem(CHAVE_CONFIG, JSON.stringify(cfg)); }
  async function removerConfig() {
    try { if (auth && usuario) await auth.signOut(); } catch (e) {}
    pararSync();
    localStorage.removeItem(CHAVE_CONFIG);
    localStorage.removeItem(CHAVE_UID);
    location.reload();
  }

  /* ---------- SDK ---------- */
  function carregarScript(src) {
    return new Promise((ok, erro) => {
      if (document.querySelector(`script[src="${src}"]`)) return ok();
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => erro(new Error('Não foi possível carregar ' + src));
      document.head.appendChild(s);
    });
  }
  async function iniciar() {
    const cfg = lerConfig();
    if (!cfg) { definir('desligada'); return; }
    definir('carregando');
    try {
      for (const src of SDK) await carregarScript(src);
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
      auth = app.auth();
      fs = app.firestore();
      auth.onAuthStateChanged(u => {
        usuario = u;
        if (u) { estado.email = u.email || ''; comecarSync(); }
        else { pararSync(); definir('desconectada', { email: '' }); }
      });
    } catch (e) {
      definir('erro', { erro: mensagemErro(e) });
    }
  }

  /* ---------- Login ---------- */
  async function entrarGoogle() {
    const p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    return auth.signInWithPopup(p);
  }
  const entrarEmail = (email, senha) => auth.signInWithEmailAndPassword(email.trim(), senha);
  const criarConta = (email, senha) => auth.createUserWithEmailAndPassword(email.trim(), senha);
  const redefinirSenha = email => auth.sendPasswordResetEmail(email.trim());
  async function sair(apagarAparelho) {
    // tenta enviar o que falta antes de sair
    try { await enviarPendentes(); } catch (e) {}
    pararSync();
    await auth.signOut();
    if (apagarAparelho) { st.resetar(); localStorage.removeItem(CHAVE_UID); }
    notificarDados();
  }

  function mensagemErro(e) {
    const c = (e && e.code) || '';
    const msgs = {
      'auth/invalid-email': 'E-mail inválido.',
      'auth/missing-password': 'Informe a senha.',
      'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
      'auth/email-already-in-use': 'Já existe uma conta com este e-mail. Use "Entrar".',
      'auth/invalid-credential': 'E-mail ou senha incorretos.',
      'auth/wrong-password': 'E-mail ou senha incorretos.',
      'auth/user-not-found': 'E-mail ou senha incorretos.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
      'auth/network-request-failed': 'Sem conexão com a internet.',
      'auth/popup-blocked': 'O navegador bloqueou a janela de login. Tente de novo ou use e-mail e senha.',
      'auth/popup-closed-by-user': 'Login cancelado.',
      'auth/cancelled-popup-request': 'Login cancelado.',
      'auth/unauthorized-domain': 'Este endereço não está autorizado no Firebase (Authentication → Settings → Authorized domains).',
      'auth/operation-not-allowed': 'Este tipo de login não está ativado no Firebase (Authentication → Sign-in method).',
      'permission-denied': 'Sem permissão na nuvem. Confira as regras do Firestore.',
      'unavailable': 'Nuvem indisponível ou sem internet. Tentando de novo…'
    };
    return msgs[c] || (e && e.message) || 'Erro desconhecido.';
  }

  /* ---------- Sincronização ---------- */
  const colRef = col => fs.collection('usuarios').doc(usuario.uid).collection(col);
  const limparParaNuvem = r => JSON.parse(JSON.stringify(r)); // remove undefined

  async function lerTudoRemoto() {
    const remoto = {};
    for (const col of COLECOES) {
      const snap = await colRef(col).get();
      remoto[col] = snap.docs.map(d => d.data());
    }
    return remoto;
  }

  async function comecarSync() {
    pararSync();
    definir('sincronizando', { email: usuario.email || '' });
    try {
      const remoto = await lerTudoRemoto();
      const vivos = col => remoto[col].filter(r => !r.deletado).length;
      const nuvemVazia = !['clientes', 'orcamentos'].some(c => vivos(c)) && !remoto.meta.some(r => r.id === 'empresa');
      const primeiraVez = localStorage.getItem(CHAVE_UID) !== usuario.uid;
      const db = st.db;
      const aparelhoComDados = db.clientes.length || db.orcamentos.length || db.empresa.nome || db.catalogo.some(i => st.num(i.valor) > 0);

      if (primeiraVez && nuvemVazia) {
        // primeiro aparelho desta conta: envia tudo
        COLECOES.forEach(col => remoto[col].forEach(r => st.aplicarRemoto(col, r)));
        st.marcarTudo();
      } else if (primeiraVez && !aparelhoComDados) {
        st.substituirPorRemoto(remoto);
      } else if (primeiraVez) {
        const escolha = await perguntar();
        if (escolha === 'nuvem') st.substituirPorRemoto(remoto);
        else {
          COLECOES.forEach(col => remoto[col].forEach(r => st.aplicarRemoto(col, r)));
          st.juntarCatalogoDuplicado();
          enviarDiferencas(remoto);
        }
      } else {
        COLECOES.forEach(col => remoto[col].forEach(r => st.aplicarRemoto(col, r)));
        enviarDiferencas(remoto);
      }
      st.salvar();
      localStorage.setItem(CHAVE_UID, usuario.uid);
      notificarDados();
      await enviarPendentes();
      ouvir();
      definir('ok', { ultima: new Date().toISOString() });
    } catch (e) {
      definir(e && e.code === 'unavailable' ? 'offline' : 'erro', { erro: mensagemErro(e) });
      agendarEnvio(30000, true);
    }
  }

  // Envia o que existe aqui e falta (ou está mais novo) na nuvem
  function enviarDiferencas(remoto) {
    const db = st.db;
    ['clientes', 'orcamentos', 'catalogo'].forEach(col => {
      const mapa = new Map(remoto[col].map(r => [r.id, r]));
      db[col].forEach(x => {
        const r = mapa.get(x.id);
        if (!r || (!r.deletado && (x.atualizadoEm || '') > (r.atualizadoEm || ''))) {
          marcarSemNotificar(col, x.id);
        }
      });
    });
    const emp = remoto.meta.find(r => r.id === 'empresa');
    if (!emp || (db.empresa.atualizadoEm || '') > (emp.atualizadoEm || '')) marcarSemNotificar('meta', 'empresa');
    const cont = remoto.meta.find(r => r.id === 'contador');
    if (!cont || db.seq > (Number(cont.seq) || 0)) marcarSemNotificar('meta', 'contador');
  }
  function marcarSemNotificar(col, id) {
    if (!st.filaAtual().pend[col + '/' + id]) st.marcar(col, id);
  }

  function ouvir() {
    COLECOES.forEach(col => {
      const parar = colRef(col).onSnapshot({ includeMetadataChanges: false }, snap => {
        let mudou = false;
        snap.docChanges().forEach(ch => {
          if (ch.doc.metadata && ch.doc.metadata.hasPendingWrites) return;
          if (ch.type === 'removed') return;
          if (st.aplicarRemoto(col, ch.doc.data())) mudou = true;
        });
        if (mudou) { st.salvar(); notificarDados(); }
        if (estado.fase !== 'ok' && !enviando) definir('ok', { ultima: new Date().toISOString() });
      }, e => {
        definir('erro', { erro: mensagemErro(e) });
      });
      cancelar.push(parar);
    });
  }

  function pararSync() {
    cancelar.forEach(f => { try { f(); } catch (e) {} });
    cancelar = [];
    clearTimeout(tEnvio);
  }

  function agendarEnvio(ms, forcar) {
    if (!usuario || (!forcar && estado.fase === 'sincronizando')) return;
    clearTimeout(tEnvio);
    tEnvio = setTimeout(() => {
      if (estado.fase === 'erro' || estado.fase === 'offline') comecarSync();
      else enviarPendentes().catch(() => {});
    }, ms);
  }

  async function enviarPendentes() {
    if (!usuario || !fs || enviando) return;
    const fila = st.filaAtual();
    const chaves = [...Object.keys(fila.pend), ...Object.keys(fila.exc)];
    if (!chaves.length) { if (estado.fase !== 'ok') definir('ok', { ultima: new Date().toISOString() }); return; }
    if (!navigator.onLine) { definir('offline'); return; }
    enviando = true;
    definir('sincronizando');
    try {
      // lotes de até 400 operações
      const ops = [];
      Object.keys(fila.pend).forEach(k => {
        const [col, id] = k.split('/');
        const r = st.registro(col, id);
        if (r) ops.push([colRef(col).doc(id), limparParaNuvem(r)]);
      });
      Object.entries(fila.exc).forEach(([k, em]) => {
        const [col, id] = k.split('/');
        ops.push([colRef(col).doc(id), { id, deletado: true, atualizadoEm: em }]);
      });
      for (let i = 0; i < ops.length; i += 400) {
        const lote = fs.batch();
        ops.slice(i, i + 400).forEach(([ref, dados]) => lote.set(ref, dados));
        await lote.commit();
      }
      st.confirmarEnvio(fila);
      enviando = false;
      definir('ok', { ultima: new Date().toISOString() });
      if (st.tamanhoFila()) agendarEnvio(1500);
    } catch (e) {
      enviando = false;
      definir(e && e.code === 'unavailable' ? 'offline' : 'erro', { erro: mensagemErro(e) });
      agendarEnvio(30000, true);
    }
  }

  // Cada alteração local agenda um envio (agrupa digitação em ~2,5 s)
  st.aoAlterar = () => { notificar(); agendarEnvio(2500); };
  window.addEventListener('online', () => { if (usuario) agendarEnvio(500, true); });
  window.addEventListener('offline', () => { if (usuario) definir('offline'); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && usuario && st.tamanhoFila()) enviarPendentes().catch(() => {});
  });

  window.Nuvem = {
    estado, iniciar, lerConfig, interpretarConfig, salvarConfig, removerConfig,
    entrarGoogle, entrarEmail, criarConta, redefinirSenha, sair, mensagemErro,
    sincronizarAgora: () => (usuario ? comecarSync() : Promise.resolve()),
    get conectado() { return !!usuario; },
    get configurada() { return !!lerConfig(); },
    pendentes: () => st.tamanhoFila(),
    aoMudarEstado: f => { ouvintesEstado.add(f); return () => ouvintesEstado.delete(f); },
    aoMudarDados: f => { ouvintesDados.add(f); return () => ouvintesDados.delete(f); },
    set perguntar(f) { perguntar = f; }
  };
})();
