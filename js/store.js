/* Armazenamento local (no próprio aparelho) e funções utilitárias.
   Os dados ficam no localStorage do navegador. Use Ajustes → Backup para
   exportar/importar e não perder nada ao trocar de aparelho. */
(function () {
  'use strict';

  const CHAVE = 'orcamentos-pwa:v1';
  const VERSAO_DADOS = 1;

  const STATUS = ['Rascunho', 'Enviado', 'Aprovado', 'Recusado'];
  const TIPOS_ITEM = ['Material', 'Serviço', 'Mão de obra'];
  const UNIDADES = ['un', 'ponto', 'circuito', 'h', 'm', 'm²', 'kit', 'mês', 'vb'];
  const CP = window.CatalogoPadrao;
  const GRUPOS = CP.GRUPOS;
  const TIPOS_IMOVEL = ['Casa', 'Apartamento', 'Comercial', 'Condomínio', 'Outro'];

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const hoje = () => new Date().toISOString().slice(0, 10);

  const chaveDesc = s => String(s || '').trim().toLowerCase();
  // Id fixo para itens do catálogo padrão: igual em todos os aparelhos (evita duplicar na nuvem)
  const idPadrao = desc => 'p-' + chaveDesc(desc).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  // Itens genéricos, SEM preço (ver js/catalogo-padrao.js)
  const catalogoInicial = () => ordenarCatalogo(CP.itens.map(i => ({ id: idPadrao(i.descricao), valor: 0, ...i })));
  const ordemGrupo = g => { const i = GRUPOS.indexOf(g); return i < 0 ? GRUPOS.length : i; };
  function ordenarCatalogo(l) {
    return l.sort((a, b) => ordemGrupo(a.grupo) - ordemGrupo(b.grupo) || a.descricao.localeCompare(b.descricao, 'pt-BR'));
  }

  /* Acrescenta itens padrão que faltam e dá categoria aos itens antigos,
     sem mexer em preço ou descrição do que o usuário já tem. */
  function atualizarCatalogo(d) {
    const padrao = new Map(CP.itens.map(i => [chaveDesc(i.descricao), i]));
    d.catalogo.forEach(i => {
      if (!i.grupo) i.grupo = (padrao.get(chaveDesc(i.descricao)) || {}).grupo || 'Outros';
    });
    const existentes = new Set(d.catalogo.map(i => chaveDesc(i.descricao)));
    CP.itens.forEach(i => { if (!existentes.has(chaveDesc(i.descricao))) d.catalogo.push({ id: idPadrao(i.descricao), valor: 0, ...i }); });
    ordenarCatalogo(d.catalogo);
    d.versaoCatalogo = CP.VERSAO_CATALOGO;
  }

  function inicial() {
    return {
      versao: VERSAO_DADOS,
      seq: 0,
      empresa: {
        nome: '', documento: '', telefone: '', email: '', endereco: '', cidade: '',
        logo: '', corTexto: '#0f766e', corFundo: '#0f766e',
        assinatura: '', assinaturaNome: '', assinarAuto: true, rubricaTexto: '', rubricaEstilo: '',
        prefixo: 'ORC', validadeDias: 15,
        prazoPadrao: '', pagamentoPadrao: '', garantiaPadrao: '', observacoesPadrao: '',
        mensagemPadrao: 'Olá, {cliente}! Segue o orçamento {numero} no valor de {total}, válido até {validade}. Qualquer dúvida, estou à disposição.\n{empresa}'
      },
      clientes: [],
      orcamentos: [],
      catalogo: catalogoInicial(),
      versaoCatalogo: CP.VERSAO_CATALOGO
    };
  }

  function migrar(d) {
    const base = inicial();
    const antiga = d.empresa || {};
    d.empresa = { ...base.empresa, ...antiga };
    // Versão 1.0.0 tinha uma cor só (cor): vira as duas cores novas
    if (antiga.cor) {
      if (!antiga.corTexto) d.empresa.corTexto = antiga.cor;
      if (!antiga.corFundo) d.empresa.corFundo = antiga.cor;
      delete d.empresa.cor;
    }
    d.clientes = Array.isArray(d.clientes) ? d.clientes : [];
    d.orcamentos = Array.isArray(d.orcamentos) ? d.orcamentos : [];
    d.catalogo = Array.isArray(d.catalogo) ? d.catalogo : base.catalogo;
    if ((Number(d.versaoCatalogo) || 1) < CP.VERSAO_CATALOGO) atualizarCatalogo(d);
    d.seq = Number(d.seq) || d.orcamentos.length;
    d.versao = VERSAO_DADOS;
    return d;
  }

  function carregar() {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (bruto) return migrar(JSON.parse(bruto));
    } catch (e) { /* armazenamento indisponível: começa vazio */ }
    return inicial();
  }

  let db = carregar();
  let aoFalhar = () => {};

  /* ---------- Fila de sincronização com a nuvem ----------
     Guardada separada dos dados (não vai no backup). pend: registros alterados
     a enviar; exc: registros excluídos a enviar como "excluído". */
  const CHAVE_FILA = 'orcamentos-pwa:fila-nuvem';
  let fila = (() => { try { return JSON.parse(localStorage.getItem(CHAVE_FILA)) || { pend: {}, exc: {} }; } catch (e) { return { pend: {}, exc: {} }; } })();
  let aoAlterar = () => {};
  let contadorMarca = 0;
  function gravarFila() { try { localStorage.setItem(CHAVE_FILA, JSON.stringify(fila)); } catch (e) {} }
  function marcar(col, id) {
    const k = col + '/' + id;
    delete fila.exc[k];
    fila.pend[k] = Date.now() + '.' + (++contadorMarca);
    gravarFila(); aoAlterar();
  }
  function marcarExclusao(col, id) {
    const k = col + '/' + id;
    delete fila.pend[k];
    fila.exc[k] = new Date().toISOString();
    gravarFila(); aoAlterar();
  }
  function marcarTudo() {
    ['clientes', 'orcamentos', 'catalogo'].forEach(col => db[col].forEach(x => { fila.pend[col + '/' + x.id] = Date.now() + '.' + (++contadorMarca); }));
    fila.pend['meta/empresa'] = fila.pend['meta/contador'] = Date.now() + '.' + (++contadorMarca);
    gravarFila(); aoAlterar();
  }
  const filaAtual = () => JSON.parse(JSON.stringify(fila));
  // Remove da fila só o que não mudou desde que foi lido (enviado)
  function confirmarEnvio(enviada) {
    Object.entries(enviada.pend).forEach(([k, v]) => { if (fila.pend[k] === v) delete fila.pend[k]; });
    Object.entries(enviada.exc).forEach(([k, v]) => { if (fila.exc[k] === v) delete fila.exc[k]; });
    gravarFila();
  }
  function limparFila() { fila = { pend: {}, exc: {} }; gravarFila(); }
  const tamanhoFila = () => Object.keys(fila.pend).length + Object.keys(fila.exc).length;

  // Registro como vai para a nuvem
  // Registros criados em versões antigas não têm atualizadoEm: ganham um agora,
  // senão os outros aparelhos não saberiam que esta versão é a mais nova.
  function registro(col, id) {
    const agora = new Date().toISOString();
    if (col === 'meta' && id === 'empresa') {
      if (!db.empresa.atualizadoEm) { db.empresa.atualizadoEm = agora; salvar(); }
      return { ...db.empresa, id: 'empresa' };
    }
    if (col === 'meta' && id === 'contador') return { id: 'contador', seq: db.seq, atualizadoEm: agora };
    const r = (db[col] || []).find(x => x.id === id) || null;
    if (r && !r.atualizadoEm) { r.atualizadoEm = agora; salvar(); }
    return r;
  }

  /* Aplica um registro vindo da nuvem. Vale o mais recente (atualizadoEm).
     Retorna true se mudou algo neste aparelho. */
  function aplicarRemoto(col, r) {
    if (!r || !r.id) return false;
    if (col === 'meta') {
      if (r.id === 'contador') { const n = Number(r.seq) || 0; if (n > db.seq) { db.seq = n; return true; } return false; }
      if (r.id === 'empresa') {
        if ((r.atualizadoEm || '') > (db.empresa.atualizadoEm || '')) { const { id, ...resto } = r; db.empresa = { ...db.empresa, ...resto }; return true; }
        return false;
      }
      return false;
    }
    const lista = db[col]; if (!lista) return false;
    const i = lista.findIndex(x => x.id === r.id);
    const local = i >= 0 ? lista[i] : null;
    if (r.deletado) {
      if (local && (local.atualizadoEm || '') <= (r.atualizadoEm || '')) { lista.splice(i, 1); delete fila.pend[col + '/' + r.id]; gravarFila(); return true; }
      return false;
    }
    if (fila.exc[col + '/' + r.id]) return false; // excluído aqui, ainda não enviado
    const { deletado, ...limpo } = r;
    if (!local) { lista.push(limpo); ordenarColecao(col); return true; }
    if ((r.atualizadoEm || '') > (local.atualizadoEm || '')) { lista[i] = limpo; ordenarColecao(col); return true; }
    return false;
  }
  function ordenarColecao(col) {
    if (col === 'catalogo') ordenarCatalogo(db.catalogo);
    if (col === 'orcamentos') db.orcamentos.sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')));
  }

  // Primeira conexão de um aparelho que já tinha dados: junta sem duplicar o catálogo
  function juntarCatalogoDuplicado() {
    const porDesc = new Map();
    const remover = [];
    db.catalogo.forEach(it => {
      const k = chaveDesc(it.descricao);
      const outro = porDesc.get(k);
      if (!outro) { porDesc.set(k, it); return; }
      // fica o que tem preço (ou o mais recente); o outro sai
      const fica = num(it.valor) > num(outro.valor) || (num(it.valor) === num(outro.valor) && (it.atualizadoEm || '') > (outro.atualizadoEm || '')) ? it : outro;
      const sai = fica === it ? outro : it;
      porDesc.set(k, fica); remover.push(sai.id);
    });
    remover.forEach(id => { db.catalogo = db.catalogo.filter(x => x.id !== id); marcarExclusao('catalogo', id); });
  }

  // Troca os dados deste aparelho pelos da nuvem
  function substituirPorRemoto(remoto) {
    const base = inicial();
    db.clientes = []; db.orcamentos = []; db.catalogo = []; db.seq = 0;
    db.empresa = { ...base.empresa };
    limparFila();
    Object.entries(remoto).forEach(([col, regs]) => regs.forEach(r => aplicarRemoto(col, r)));
    if (!db.catalogo.length) db.catalogo = base.catalogo;
    salvar();
  }

  function resetar() {
    db = inicial(); limparFila(); salvar();
  }
  // Grava logo na abertura, para que migrações (ex.: itens novos no catálogo) fiquem salvas
  setTimeout(() => salvar(), 0);

  function salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(db));
      return true;
    } catch (e) {
      aoFalhar(e);
      return false;
    }
  }

  // Pede ao navegador para não apagar os dados automaticamente.
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

  /* ---------- Números ---------- */
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    let s = String(v == null ? '' : v).trim().replace(/[R$\s]/g, '');
    if (!s) return 0;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }
  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const brl = n => fmtBRL.format(num(n)).replace(/[  ]/g, ' ');
  const dec = (n, casas = 2) => num(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  const qtdFmt = n => num(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  const dataBR = iso => {
    if (!iso) return '';
    const [a, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
  };
  function somarDias(iso, dias) {
    const d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
    d.setDate(d.getDate() + (Number(dias) || 0));
    return d.toISOString().slice(0, 10);
  }

  /* ---------- Cores ---------- */
  const CORES_PADRAO = { corTexto: '#0f766e', corFundo: '#0f766e' };
  function hexParaRgb(hex) {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (!/^[0-9a-f]{6}$/i.test(h)) h = '0f766e';
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  }
  function luminancia(hex) {
    const [r, g, b] = hexParaRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contraste(a, b) {
    const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  }
  // Cor de letra legível sobre um fundo: branco ou quase preto
  const textoSobre = fundo => contraste(fundo, '#ffffff') >= contraste(fundo, '#142029') ? '#ffffff' : '#142029';
  // Mistura a cor com branco (0 = cor pura, 1 = branco)
  const clarear = (hex, f) => hexParaRgb(hex).map(v => Math.round(v + (255 - v) * f));

  /* ---------- Telefone ---------- */
  const soDigitos = s => String(s || '').replace(/\D/g, '');
  function telefoneInternacional(tel) {
    let d = soDigitos(tel);
    if (d.startsWith('0')) d = d.replace(/^0+/, '');
    if (d.length === 10 || d.length === 11) d = '55' + d; // número brasileiro sem DDI
    return d;
  }
  function telefoneFmt(tel) {
    const d = soDigitos(tel);
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    if (d.length === 13 && d.startsWith('55')) return `+55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
    return tel || '';
  }
  const telefoneValido = tel => { const d = telefoneInternacional(tel); return d.length >= 12 && d.length <= 15; };

  /* ---------- Clientes ---------- */
  const cliente = id => db.clientes.find(c => c.id === id) || null;
  function salvarCliente(c) {
    if (!c.id) { c.id = uid(); c.criadoEm = new Date().toISOString(); db.clientes.push(c); }
    else {
      const i = db.clientes.findIndex(x => x.id === c.id);
      if (i >= 0) db.clientes[i] = c; else db.clientes.push(c);
    }
    c.atualizadoEm = new Date().toISOString();
    salvar(); marcar('clientes', c.id);
    return c;
  }
  function excluirCliente(id) {
    db.clientes = db.clientes.filter(c => c.id !== id);
    salvar(); marcarExclusao('clientes', id);
  }

  /* ---------- Orçamentos ---------- */
  const orcamento = id => db.orcamentos.find(o => o.id === id) || null;

  function novoOrcamento(clienteId) {
    const e = db.empresa;
    db.seq += 1;
    const ano = new Date().getFullYear();
    const o = {
      id: uid(),
      numero: `${(e.prefixo || 'ORC').trim()}-${ano}-${String(db.seq).padStart(4, '0')}`,
      clienteId: clienteId || '',
      titulo: '',
      data: hoje(),
      validadeDias: Number(e.validadeDias) || 15,
      status: 'Rascunho',
      itens: [],
      descontoTipo: '%',
      desconto: 0,
      prazo: e.prazoPadrao || '',
      pagamento: e.pagamentoPadrao || '',
      garantia: e.garantiaPadrao || '',
      observacoes: e.observacoesPadrao || '',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      enviadoEm: ''
    };
    db.orcamentos.unshift(o);
    salvar(); marcar('orcamentos', o.id); marcar('meta', 'contador');
    return o;
  }

  function salvarOrcamento(o) {
    o.atualizadoEm = new Date().toISOString();
    const i = db.orcamentos.findIndex(x => x.id === o.id);
    if (i >= 0) db.orcamentos[i] = o; else db.orcamentos.unshift(o);
    const ok = salvar(); marcar('orcamentos', o.id);
    return ok;
  }

  function duplicarOrcamento(o) {
    const n = novoOrcamento(o.clienteId);
    const copia = JSON.parse(JSON.stringify(o));
    Object.assign(n, copia, {
      id: n.id, numero: n.numero, data: hoje(), status: 'Rascunho',
      criadoEm: n.criadoEm, enviadoEm: '',
      titulo: o.titulo ? o.titulo + ' (cópia)' : ''
    });
    n.itens = n.itens.map(i => ({ ...i, id: uid() }));
    salvarOrcamento(n);
    return n;
  }

  function excluirOrcamento(id) {
    db.orcamentos = db.orcamentos.filter(o => o.id !== id);
    salvar(); marcarExclusao('orcamentos', id);
  }

  const orcamentoVazio = o => !o.clienteId && !o.titulo && o.itens.length === 0;

  function totais(o) {
    const subtotal = o.itens.reduce((s, i) => s + num(i.qtd) * num(i.valor), 0);
    let desconto = o.descontoTipo === '%' ? subtotal * num(o.desconto) / 100 : num(o.desconto);
    desconto = Math.min(Math.max(desconto, 0), subtotal);
    return { subtotal, desconto, total: subtotal - desconto };
  }

  const validadeAte = o => somarDias(o.data, o.validadeDias);
  function statusExibido(o) {
    if (o.status === 'Enviado' && validadeAte(o) < hoje()) return 'Vencido';
    return o.status;
  }

  /* Informações que faltam antes de gerar/enviar o PDF.
     bloqueia = impede gerar; o resto é aviso. */
  function pendencias(o, paraWhatsApp) {
    const lista = [];
    const c = cliente(o.clienteId);
    if (!db.empresa.nome) lista.push({ msg: 'Nome da sua empresa (Ajustes)', bloqueia: false, ir: '#/ajustes' });
    if (!c) lista.push({ msg: 'Escolha o cliente do orçamento', bloqueia: true });
    else if (paraWhatsApp && !telefoneValido(c.telefone)) lista.push({ msg: `Telefone de WhatsApp de ${c.nome} com DDD`, bloqueia: true, ir: '#/cliente/' + c.id });
    if (!o.itens.length) lista.push({ msg: 'Adicione pelo menos um item', bloqueia: true });
    const semDesc = o.itens.filter(i => !String(i.descricao || '').trim()).length;
    if (semDesc) lista.push({ msg: `${semDesc} item(ns) sem descrição`, bloqueia: true });
    const semValor = o.itens.filter(i => num(i.valor) <= 0).length;
    if (semValor) lista.push({ msg: `${semValor} item(ns) sem valor`, bloqueia: false });
    const semQtd = o.itens.filter(i => num(i.qtd) <= 0).length;
    if (semQtd) lista.push({ msg: `${semQtd} item(ns) com quantidade zero`, bloqueia: false });
    if (!String(o.pagamento || '').trim()) lista.push({ msg: 'Condições de pagamento', bloqueia: false });
    return lista;
  }

  /* ---------- Catálogo ---------- */
  function salvarItemCatalogo(it) {
    if (!it.id) { it.id = uid(); db.catalogo.push(it); }
    else {
      const i = db.catalogo.findIndex(x => x.id === it.id);
      if (i >= 0) db.catalogo[i] = it; else db.catalogo.push(it);
    }
    it.atualizadoEm = new Date().toISOString();
    ordenarCatalogo(db.catalogo);
    salvar(); marcar('catalogo', it.id);
  }
  function excluirItemCatalogo(id) {
    db.catalogo = db.catalogo.filter(i => i.id !== id);
    salvar(); marcarExclusao('catalogo', id);
  }

  /* ---------- Empresa ---------- */
  function salvarEmpresa(dados) {
    Object.assign(db.empresa, dados || {});
    db.empresa.atualizadoEm = new Date().toISOString();
    salvar(); marcar('meta', 'empresa');
  }

  /* ---------- Backup ---------- */
  const exportar = () => JSON.stringify({ app: 'orcamentos-pwa', exportadoEm: new Date().toISOString(), dados: db }, null, 2);
  function importar(texto) {
    const j = JSON.parse(texto);
    const d = j && j.dados ? j.dados : j;
    if (!d || !Array.isArray(d.orcamentos) || !Array.isArray(d.clientes)) throw new Error('Arquivo não é um backup deste app.');
    db = migrar(d);
    salvar(); marcarTudo();
  }

  /* ---------- Lembrete de backup (só neste aparelho) ---------- */
  const CHAVE_BACKUP = 'orcamentos-pwa:ultimo-backup';
  function marcarBackup() { try { localStorage.setItem(CHAVE_BACKUP, new Date().toISOString()); } catch (e) {} }
  function ultimoBackup() { try { return localStorage.getItem(CHAVE_BACKUP) || ''; } catch (e) { return ''; } }
  const temDados = () => db.clientes.length + db.orcamentos.length > 0;

  window.Store = {
    STATUS, TIPOS_ITEM, UNIDADES, GRUPOS, TIPOS_IMOVEL,
    get db() { return db; },
    set aoFalhar(fn) { aoFalhar = fn; },
    CORES_PADRAO, hexParaRgb, contraste, textoSobre, clarear,
    uid, hoje, num, brl, dec, qtdFmt, dataBR, somarDias,
    soDigitos, telefoneInternacional, telefoneFmt, telefoneValido,
    salvar, cliente, salvarCliente, excluirCliente,
    orcamento, novoOrcamento, salvarOrcamento, duplicarOrcamento, excluirOrcamento, orcamentoVazio,
    totais, validadeAte, statusExibido, pendencias,
    salvarItemCatalogo, excluirItemCatalogo, salvarEmpresa,
    exportar, importar, marcarBackup, ultimoBackup, temDados, resetar,
    // nuvem
    set aoAlterar(fn) { aoAlterar = fn || (() => {}); },
    marcar, filaAtual, confirmarEnvio, tamanhoFila, registro, aplicarRemoto, marcarTudo,
    juntarCatalogoDuplicado, substituirPorRemoto
  };
})();
