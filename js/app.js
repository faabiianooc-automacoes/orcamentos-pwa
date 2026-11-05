/* Telas e navegação do app. Rotas por hash:
   #/inicio · #/orcamentos · #/orcamento/:id · #/clientes · #/cliente/:id|novo
   #/ajustes · #/catalogo · #/dimensionamento · #/formulas · #/relatorios?visao=avencer|executar|atrasados */
(function () {
  'use strict';
  const st = window.Store;
  let app = document.getElementById('app');
  const titulo = document.getElementById('titulo');
  const acoesTopo = document.getElementById('topbar-acoes');
  const btnVoltar = document.getElementById('btn-voltar');

  /* ---------- Utilitários de interface ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON = {
    mais: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    busca: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    lixo: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    pdf: '<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 14h4M12 12v4"/></svg>',
    enviar: '<svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>',
    conversa: '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/></svg>',
    copiar: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    lista: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    alerta: '<svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.01"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
    pessoas: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/></svg>',
    fechar: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    nuvem: '<svg viewBox="0 0 24 24"><path d="M7 18a5 5 0 0 1-.6-9.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/></svg>',
    backup: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
    relogio: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    agenda: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    filtro: '<svg viewBox="0 0 24 24"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>',
    seta: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    cabo: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
    desenho: '<svg viewBox="0 0 24 24"><path d="M3 21l3.5-1 11-11-2.5-2.5-11 11zM14.5 5.5l2.5 2.5M17 3l4 4"/></svg>',
    clipe: '<svg viewBox="0 0 24 24"><path d="M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/></svg>',
    entrega: '<svg viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4v10l8 4 8-4zM4 7l8 4 8-4M12 11v10"/></svg>'
  };

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('vis');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('vis'), 3200);
  }
  st.aoFalhar = () => toast('Não foi possível salvar: armazenamento cheio ou bloqueado.');

  function badge(o) {
    return badgeStatus(st.statusExibido(o));
  }
  function badgeStatus(s) {
    const cls = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return `<span class="badge b-${cls}">${esc(s)}</span>`;
  }

  /* Diálogo genérico. acoes: [{rotulo, classe, valor}] → resolve com o valor */
  function dialogo({ titulo: tit, corpo, acoes = [{ rotulo: 'OK', classe: 'prim', valor: true }], aoAbrir }) {
    return new Promise(resolve => {
      const d = document.createElement('dialog');
      d.innerHTML = `
        <div class="dlg-cab"><h3>${esc(tit)}</h3>
          <button class="icon-btn" data-v="__fechar" aria-label="Fechar">${ICON.fechar}</button></div>
        <div class="dlg-corpo">${corpo}</div>
        ${acoes.length ? `<div class="dlg-rod">${acoes.map((a, i) => `<button class="btn ${a.classe || ''}" data-i="${i}">${esc(a.rotulo)}</button>`).join('')}</div>` : ''}`;
      document.body.appendChild(d);
      let valor = null;
      d.addEventListener('click', ev => {
        const b = ev.target.closest('button[data-i],button[data-v]');
        if (!b) { if (ev.target === d) d.close(); return; }
        if (b.dataset.v === '__fechar') { d.close(); return; }
        const a = acoes[Number(b.dataset.i)];
        if (a.antes && a.antes(d) === false) return;
        valor = a.valor; d.close();
      });
      d.addEventListener('close', () => { resolve(valor); d.remove(); });
      d.showModal();
      if (aoAbrir) aoAbrir(d, v => { valor = v; d.close(); });
    });
  }
  const confirmar = (tit, msg, rotulo = 'Confirmar', classe = 'prim') =>
    dialogo({ titulo: tit, corpo: `<p style="margin:0">${msg}</p>`, acoes: [{ rotulo: 'Cancelar', valor: false }, { rotulo, classe, valor: true }] });

  async function pedirTexto(tit, rotulo, valor) {
    let v = null;
    await dialogo({
      titulo: tit,
      corpo: `<div class="campo"><label for="pt-v">${esc(rotulo)}</label><input id="pt-v" value="${esc(valor || '')}"></div>`,
      acoes: [{ rotulo: 'Cancelar', valor: null }, { rotulo: 'OK', classe: 'prim', valor: 'ok', antes: d => { v = d.querySelector('#pt-v').value.trim(); if (!v) return false; } }],
      aoAbrir: d => { const i = d.querySelector('#pt-v'); i.focus(); i.select(); }
    });
    return v;
  }

  function topo(texto, { voltar = null, acoes = '' } = {}) {
    titulo.textContent = texto;
    document.title = texto + ' · Orçamentos';
    btnVoltar.hidden = !voltar;
    btnVoltar.onclick = () => { location.hash = voltar; };
    acoesTopo.innerHTML = acoes;
  }
  function marcarAba(nome) {
    document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('ativo', a.dataset.tab === nome));
  }

  function lerCampos(raiz) {
    const o = {};
    raiz.querySelectorAll('[data-f]').forEach(el => { o[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; });
    return o;
  }

  /* ---------- Roteador ---------- */
  let limparTela = null;
  function render() {
    if (limparTela) { limparTela(); limparTela = null; }
    const [, rota = 'inicio', id] = (location.hash || '#/inicio').split('?')[0].split('/');
    document.body.classList.remove('com-barra');
    // Troca o contêiner a cada tela para não acumular eventos da tela anterior
    const novo = app.cloneNode(false);
    app.replaceWith(novo);
    app = novo;
    const telas = { inicio, orcamentos, orcamento: editorOrcamento, clientes, cliente: formCliente, ajustes, catalogo, relatorios, dimensionamento, formulas, ...((window.TelasExtras && window.TelasExtras.telas) || {}) };
    (telas[rota] || inicio)(id);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);

  /* ---------- Início ---------- */
  function inicio() {
    marcarAba('inicio');
    topo('Início');
    const db = st.db;
    const mes = st.hoje().slice(0, 7);
    const doMes = db.orcamentos.filter(o => (o.data || '').startsWith(mes));
    const abertos = db.orcamentos.filter(o => st.statusExibido(o) === 'Enviado');
    const aprovados = db.orcamentos.filter(o => o.status === 'Aprovado' || o.status === 'Concluído');
    const decididos = aprovados.length + db.orcamentos.filter(o => o.status === 'Recusado').length;
    const soma = l => l.reduce((s, o) => s + st.totais(o).total, 0);
    const taxa = decididos ? Math.round(aprovados.length / decididos * 100) + '%' : '-';

    const avisos = [];
    if (!db.empresa.nome) avisos.push('<a href="#/ajustes">Cadastre os dados da sua empresa</a> (nome, telefone, logo). Eles aparecem no PDF.');
    const semPreco = db.catalogo.filter(i => st.num(i.valor) <= 0).length;
    if (semPreco) avisos.push(`<a href="#/catalogo">Defina os preços do catálogo</a>: ${semPreco} itens estão sem valor. Exclua os serviços que você não oferece.`);

    let protecao = '';
    if (window.Nuvem && window.Nuvem.conectado) {
      protecao = `<a class="status-nuvem" href="#/ajustes">${ICON.nuvem}<span>${esc(textoStatusNuvem())}</span></a>`;
    } else if (st.temDados()) {
      const ult = st.ultimoBackup();
      const dias = ult ? Math.floor((Date.now() - Date.parse(ult)) / 864e5) : null;
      if (dias === null || dias >= 7) {
        protecao = `<div class="aviso">${ICON.backup}<div style="flex:1"><p><b>${dias === null ? 'Você ainda não fez backup' : `Último backup há ${dias} dias`}</b></p>
          <p class="ajuda" style="margin:2px 0 8px">Se o celular for perdido ou trocado, seus clientes e orçamentos só voltam com um backup ou com a <a href="#/ajustes">nuvem ativada</a>.</p>
          <button class="btn prim" id="bk-inicio">${ICON.backup} Fazer backup agora</button></div></div>`;
      }
    }

    const PX = window.TelasExtras ? window.TelasExtras.inicioHtml() : { html: '', aReceber: 0, P: [] };
    app.innerHTML = `
      ${protecao}
      ${avisos.length ? `<div class="aviso">${ICON.alerta}<div><p><b>Para começar</b></p><ul>${avisos.map(a => `<li>${a}</li>`).join('')}</ul></div></div>` : ''}
      ${PX.html}
      ${painelAgenda()}
      <h2>Resumo</h2>
      <div class="stats">
        <div class="stat"><div class="rot">Orçamentos no mês</div><div class="num">${doMes.length}</div></div>
        <div class="stat"><div class="rot">Aguardando resposta</div><div class="num">${st.brl(soma(abertos))}</div></div>
        <div class="stat"><div class="rot">Aprovados (total)</div><div class="num">${st.brl(soma(aprovados))}</div></div>
        <div class="stat"><div class="rot">Taxa de aprovação</div><div class="num">${taxa}</div></div>
        <div class="stat"><div class="rot">A receber</div><div class="num">${st.brl(PX.aReceber)}</div></div>
        <div class="stat"><div class="rot">Recebido no mês</div><div class="num">${st.brl(db.orcamentos.reduce((t, o) => t + (o.pagamentos || []).filter(p => String(p.data).startsWith(mes)).reduce((a, p) => a + st.num(p.valor), 0), 0))}</div></div>
      </div>
      <div class="acoes"><a class="btn prim" href="#/orcamento/novo">${ICON.mais} Novo orçamento</a><a class="btn" href="#/cliente/novo">${ICON.mais} Novo cliente</a></div>
      <h2>Ferramentas</h2>
      <div class="lista"><a href="#/dimensionamento"><span class="ag-ic ok">${ICON.cabo}</span>
        <div class="principal"><div class="t1">Dimensionamento</div><div class="t2">Cabos e proteção conforme a NBR 5410</div></div>${ICON.seta}</a>
        <a href="#/calculadoras"><span class="ag-ic ok">${ICON.relogio}</span><div class="principal"><div class="t1">Calculadoras de campo</div><div class="t2">Corrente, queda de tensão, conversões, lei de Ohm</div></div>${ICON.seta}</a>
        <a href="#/ferramentas"><span class="ag-ic ok">${ICON.lista}</span><div class="principal"><div class="t1">Ferramentas e kits</div><div class="t2">Desgaste e aluguel por tipo de serviço</div></div>${ICON.seta}</a></div>
      <h2>Recentes</h2>
      ${listaOrcamentos(db.orcamentos.slice(0, 6))}`;
    const bk = app.querySelector('#bk-inicio');
    if (bk) bk.onclick = async () => { if (await fazerBackup()) inicio(); };
    if (window.TelasExtras) window.TelasExtras.inicioLigar(app, PX.P, inicio);
  }

  /* Texto relativo: "hoje", "amanhã", "em 3 dias", "há 2 dias" */
  function relativo(iso) {
    const d = st.diasEntre(st.hoje(), iso);
    if (d === 0) return 'hoje';
    if (d === 1) return 'amanhã';
    if (d === -1) return 'ontem';
    return d > 0 ? `em ${d} dias` : `há ${-d} dias`;
  }

  /* Painel do Início: orçamentos a vencer e a executar */
  function painelAgenda() {
    const a = st.agenda(7);
    const soma = l => l.reduce((s, o) => s + st.totais(o).total, 0);
    const detExec = [
      a.atrasados.length && `<span class="tx-perigo">${a.atrasados.length} atrasado(s)</span>`,
      a.proximos.length && `${a.proximos.length} nos próximos 7 dias`,
      a.depois.length && `${a.depois.length} depois`,
      a.semData.length && `<span class="tx-alerta">${a.semData.length} sem data de início</span>`
    ].filter(Boolean).join(' · ') || 'Nenhum orçamento aprovado aguardando execução';
    const detVenc = a.aVencer.length
      ? `${st.brl(soma(a.aVencer))} aguardando resposta`
      : 'Nenhum vence nos próximos 7 dias';

    // Próximos compromissos: atrasados + inícios em 7 dias + validades em 7 dias
    const itens = [
      ...a.atrasados.map(o => ({ o, data: o.dataInicio, tipo: 'exec' })),
      ...a.proximos.map(o => ({ o, data: o.dataInicio, tipo: 'exec' })),
      ...a.aVencer.map(o => ({ o, data: st.validadeAte(o), tipo: 'venc' }))
    ].sort((x, y) => x.data.localeCompare(y.data)).slice(0, 6);
    const hoje = st.hoje();
    const lista = itens.length ? `<div class="lista">${itens.map(({ o, data, tipo }) => {
      const c = st.cliente(o.clienteId);
      const atras = tipo === 'exec' && data < hoje;
      const rot = tipo === 'exec' ? (atras ? `Início atrasado (${st.dataBR(data)})` : `Início ${relativo(data)} · ${st.dataBR(data)}`) : `Vence ${relativo(data)} · ${st.dataBR(data)}`;
      return `<a href="#/orcamento/${o.id}">
        <span class="ag-ic ${tipo === 'exec' ? (atras ? 'perigo' : 'ok') : 'alerta'}">${tipo === 'exec' ? ICON.agenda : ICON.relogio}</span>
        <div class="principal"><div class="t1">${esc(c ? c.nome : 'Sem cliente')}</div>
        <div class="t2">${esc(rot)} · ${esc(o.numero)}</div></div>
        <div class="valor">${st.brl(st.totais(o).total)}</div></a>`;
    }).join('')}</div>` : '';

    return `
      <h2>Agenda</h2>
      <div class="painel">
        <a class="pcard alerta" href="#/relatorios?visao=avencer">
          <div class="pc-topo">${ICON.relogio}<span>A vencer em 7 dias</span></div>
          <div class="pc-num">${a.aVencer.length}</div>
          <div class="pc-det">${detVenc}${a.vencidos.length ? ` · <span class="tx-perigo">${a.vencidos.length} já vencido(s)</span>` : ''}</div>
        </a>
        <a class="pcard ok" href="#/relatorios?visao=executar">
          <div class="pc-topo">${ICON.agenda}<span>A executar</span></div>
          <div class="pc-num">${a.aExecutar.length}</div>
          <div class="pc-det">${detExec}</div>
        </a>
      </div>
      ${lista ? `<h2 class="sub">Próximos 7 dias</h2>${lista}` : ''}`;
  }

  /* data: função opcional que devolve o texto de data da linha */
  function listaOrcamentos(lista, data) {
    if (!lista.length) return `<div class="lista"><div class="vazio">${ICON.doc}<p>Nenhum orçamento ainda.</p></div></div>`;
    return `<div class="lista">${lista.map(o => {
      const c = st.cliente(o.clienteId);
      return `<a href="#/orcamento/${o.id}">
        <div class="principal"><div class="t1">${esc(c ? c.nome : 'Sem cliente')}</div>
        <div class="t2">${esc(o.numero)} · ${esc(data ? data(o) : st.dataBR(o.data))}${o.titulo ? ' · ' + esc(o.titulo) : ''}</div></div>
        <div><div class="valor">${st.brl(st.totais(o).total)}</div><div class="direita">${badge(o)}</div></div></a>`;
    }).join('')}</div>`;
  }

  /* ---------- Lista de orçamentos ---------- */
  let filtroStatus = 'Todos';
  function orcamentos() {
    marcarAba('orcamentos');
    topo('Orçamentos');
    const filtros = ['Todos', ...st.STATUS, 'Vencido'];
    app.innerHTML = `
      <div class="busca">${ICON.busca}<input type="search" id="q" placeholder="Buscar por cliente, número ou título" aria-label="Buscar"></div>
      <div class="chips">${filtros.map(f => `<button class="chip ${f === filtroStatus ? 'ativo' : ''}" data-s="${f}">${f}</button>`).join('')}</div>
      <div id="res"></div>
      <a class="fab" href="#/orcamento/novo">${ICON.mais} Novo</a>`;
    const q = app.querySelector('#q');
    const atualizar = () => {
      const termo = q.value.trim().toLowerCase();
      const l = st.db.orcamentos.filter(o => {
        if (filtroStatus !== 'Todos' && st.statusExibido(o) !== filtroStatus) return false;
        if (!termo) return true;
        const c = st.cliente(o.clienteId);
        return [o.numero, o.titulo, c && c.nome].join(' ').toLowerCase().includes(termo);
      });
      app.querySelector('#res').innerHTML = listaOrcamentos(l);
    };
    q.addEventListener('input', atualizar);
    app.querySelector('.chips').addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      filtroStatus = b.dataset.s;
      app.querySelectorAll('.chip').forEach(c => c.classList.toggle('ativo', c === b));
      atualizar();
    });
    atualizar();
  }

  /* ---------- Editor de orçamento ---------- */
  function editorOrcamento(id) {
    marcarAba('orcamentos');
    if (id === 'novo') {
      const params = new URLSearchParams(location.hash.split('?')[1] || '');
      const o = st.novoOrcamento(params.get('cliente') || '');
      history.replaceState(null, '', '#/orcamento/' + o.id);
      id = o.id;
    }
    id = String(id).split('?')[0];
    const o = st.orcamento(id);
    if (!o) { app.innerHTML = '<div class="vazio">Orçamento não encontrado.</div>'; topo('Orçamento', { voltar: '#/orcamentos' }); return; }

    topo(o.numero, {
      voltar: '#/orcamentos',
      acoes: `<button class="icon-btn" id="mais" aria-label="Mais opções">${ICON.lista}</button>`
    });
    document.body.classList.add('com-barra');

    const opt = (lista, sel) => lista.map(v => `<option ${v === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');
    const clientesOrd = [...st.db.clientes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    app.innerHTML = `
      <div id="pend"></div>
      <h2>Cliente e dados</h2>
      <div class="card"><div class="campos">
        <div class="campo"><label for="f-cli">Cliente <span class="obrig">*</span></label>
          <div class="row"><select id="f-cli" data-f="clienteId" style="flex:1">
            <option value="">Selecione…</option>
            ${clientesOrd.map(c => `<option value="${c.id}" ${c.id === o.clienteId ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}
          </select><button class="btn" id="novo-cli" type="button">${ICON.mais} Novo</button></div></div>
        <div class="campo"><label for="f-tit">Título do orçamento</label>
          <input id="f-tit" data-f="titulo" value="${esc(o.titulo)}" placeholder="Ex.: Monitoramento da caixa-d'água e vazamentos"></div>
        <div class="campo c2 m3"><label for="f-data">Data</label><input id="f-data" type="date" data-f="data" value="${esc(o.data)}"></div>
        <div class="campo c2 m3"><label for="f-val">Validade (dias)</label><input id="f-val" type="number" min="1" inputmode="numeric" data-f="validadeDias" value="${esc(o.validadeDias)}"></div>
        <div class="campo c2 m3"><label for="f-ini">Início previsto <span class="obrig">*</span></label><input id="f-ini" type="date" data-f="dataInicio" value="${esc(o.dataInicio || '')}"></div>
        <div class="campo c2 m3"><label for="f-st">Status</label><select id="f-st" data-f="status">${opt(st.STATUS, o.status)}</select></div>
      </div></div>

      <h2>Itens</h2>
      <div id="itens"></div>
      <div class="acoes">
        <button class="btn" id="add-cat" type="button">${ICON.lista} Do catálogo</button>
        <button class="btn" id="add-item" type="button">${ICON.mais} Item avulso</button>
      </div>

      <h2>Dimensionamento</h2>
      <div class="card" id="alim" style="margin-bottom:10px"><div class="campos">
        <div class="campo c2 m3"><label for="al-tipo">Alimentação</label><select id="al-tipo" data-al="tipo">${[['mono', 'Monofásica (F+N)'], ['bi', 'Bifásica (2F+N)'], ['tri', 'Trifásica (3F+N)']].map(([v, r]) => `<option value="${v}" ${st.alimentacao(o).tipo === v ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
        <div class="campo c2 m3"><label for="al-sis">Sistema</label><select id="al-sis" data-al="sistema">${['127/220', '220/380'].map(v => `<option ${st.alimentacao(o).sistema === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="campo c2 m3"><label for="al-geral">Disjuntor geral (A)</label><input id="al-geral" data-al="geral" class="num" inputmode="numeric" value="${esc(st.alimentacao(o).geral)}" placeholder="Ex.: 50"></div>
      </div><p class="ajuda" id="al-carga" style="margin:8px 0 0"></p></div>
      <div id="circ"></div>
      <div class="acoes">
        <button class="btn" id="add-circ" type="button">${ICON.cabo} Adicionar circuito</button>
        <button class="btn" id="cargas" type="button">${ICON.lista} Previsão de cargas</button>
        <button class="btn" id="lista-mat" type="button">${ICON.lista} Lista de materiais</button>
      </div>
      <label class="check" id="dim-pdf-l" style="margin-top:8px"><input type="checkbox" id="dim-pdf" ${o.dimNoPdf !== false ? 'checked' : ''}> Incluir o dimensionamento no PDF do orçamento</label>

      <h2>Desenhos e anexos</h2>
      <div id="anx"></div>
      <div class="acoes">
        <button class="btn" id="anx-des" type="button">${ICON.desenho} Novo desenho</button>
        <label class="btn" style="color:var(--text)">${ICON.desenho} Planta com pontos<input type="file" id="anx-planta" accept="image/*" hidden></label>
        <button class="btn" id="anx-multi" type="button">${ICON.cabo} Multifilar colorido</button>
        <button class="btn" id="anx-uni" type="button">${ICON.cabo} Unifilar automático</button>
        <label class="btn" style="color:var(--text)">${ICON.clipe} Arquivo<input type="file" id="anx-arq" multiple accept=".pdf,.dwg,.dxf,.drawio,.zip,image/*,application/pdf" hidden></label>
        <button class="btn" id="anx-link" type="button">${ICON.link} Link</button>
        <label class="btn" style="color:var(--text)">${ICON.doc} Fotos do serviço<input type="file" id="anx-foto" accept="image/*" capture="environment" multiple hidden></label>
        <button class="btn" id="anx-gfotos" type="button">${ICON.nuvem} Enviar fotos ao Google Fotos</button>
      </div>
      <p class="ajuda"><b>Planta com pontos:</b> escolha a foto ou imagem da planta do cômodo; ela abre como fundo travado e você marca tomadas, interruptores e pontos de luz com a biblioteca <b>simbolos-planta</b> (<a href="drawio/simbolos-planta.xml" download>baixar biblioteca</a>).</p>
      <p class="ajuda">Desenhos no editor draw.io (precisa de internet), arquivos de outros programas (PDF, DWG, DXF, fotos) e links (ex.: Tinkercad). Os marcados com "Entregar" vão para o cliente na entrega da obra. Os arquivos ficam guardados neste aparelho.</p>

      <h2>Deslocamento</h2>
      <div class="card" id="desl"></div>

      <h2>Ferramentas e equipamentos</h2>
      <div class="card" id="ferr"></div>

      <h2>Valores</h2>
      <div class="card">
        <div class="campos">
          <div class="campo c3 m3"><label for="f-dt">Desconto em</label>
            <select id="f-dt" data-f="descontoTipo"><option value="%" ${o.descontoTipo === '%' ? 'selected' : ''}>Percentual (%)</option><option value="R$" ${o.descontoTipo === 'R$' ? 'selected' : ''}>Valor (R$)</option></select></div>
          <div class="campo c3 m3"><label for="f-desc">Desconto</label><input id="f-desc" class="num" inputmode="decimal" data-f="desconto" value="${esc(st.num(o.desconto) ? st.dec(o.desconto) : '')}" placeholder="0,00"></div>
        </div>
        <div class="sep"></div>
        <div class="resumo" id="resumo"></div>
        <div id="margem"></div>
      </div>

      <h2>Pagamentos</h2>
      <div class="card" id="pag"></div>

      <h2>Condições</h2>
      <div class="card"><div class="campos">
        <div class="campo"><label for="f-pz">Prazo de execução</label><textarea id="f-pz" data-f="prazo" placeholder="Ex.: até 10 dias úteis após aprovação">${esc(o.prazo)}</textarea></div>
        <div class="campo"><label for="f-pg">Condições de pagamento</label><textarea id="f-pg" data-f="pagamento" placeholder="Ex.: 50% na aprovação e 50% na entrega, via Pix">${esc(o.pagamento)}</textarea></div>
        <div class="campo"><label for="f-ga">Garantia</label><textarea id="f-ga" data-f="garantia" placeholder="Ex.: 90 dias para serviço; equipamentos conforme fabricante">${esc(o.garantia)}</textarea></div>
        <div class="campo"><label for="f-ob">Observações</label><textarea id="f-ob" data-f="observacoes">${esc(o.observacoes)}</textarea></div>
      </div></div>
      <p class="salvo" id="salvo">Salvo automaticamente neste aparelho.</p>

      <div class="barra-total"><div class="in">
        <div class="tot"><div class="r">Total</div><div class="v" id="tot">${st.brl(st.totais(o).total)}</div></div>
        <button class="btn" id="ver-pdf" aria-label="Ver PDF">${ICON.pdf}<span class="rot">PDF</span></button>
        <button class="btn prim" id="enviar" aria-label="Enviar pelo WhatsApp">${ICON.enviar}<span class="rot">Enviar</span></button>
      </div></div>`;

    const elItens = app.querySelector('#itens');
    const ctxX = {};

    function desenharItens() {
      if (!o.itens.length) {
        elItens.innerHTML = `<div class="lista"><div class="vazio">${ICON.doc}<p>Nenhum item. Adicione do catálogo ou um item avulso.</p></div></div>`;
        return;
      }
      elItens.innerHTML = o.itens.map((it, i) => `
        <div class="item ${st.num(it.valor) <= 0 ? 'sem-valor' : ''}" data-idx="${i}">
          <div class="item-topo"><span class="n">ITEM ${i + 1}${it.desloc ? ' · DESLOCAMENTO' : ''}</span>
            <span class="row" style="gap:4px">${it.tipo === 'Material' || it.tec ? `<button class="btn btn-peq" type="button" data-acao="tec">${ICON.cabo} ${it.tec ? 'Especificação' : 'Especificar'}</button>` : ''}
            <button class="icon-btn" data-acao="rem" aria-label="Remover item ${i + 1}">${ICON.lixo}</button></span></div>
          ${it.tec ? `<div class="item-tec" data-acao="tec">${esc(TEC.resumo(it.tec) || TEC.classe(it.tec.classe).nome)}</div>` : ''}
          <div class="campos">
            <div class="campo"><input data-k="descricao" value="${esc(it.descricao)}" placeholder="Descrição do item" aria-label="Descrição"></div>
            <div class="campo c2 m3"><label>Tipo</label><select data-k="tipo">${opt(st.TIPOS_ITEM, it.tipo)}</select></div>
            <div class="campo c2 m3"><label>Unidade</label><select data-k="unidade">${opt(st.UNIDADES.includes(it.unidade) ? st.UNIDADES : [...st.UNIDADES, it.unidade], it.unidade)}</select></div>
            <div class="campo c2 m3"><label>Qtd</label><input class="num" inputmode="decimal" data-k="qtd" value="${esc(st.qtdFmt(it.qtd))}"></div>
            <div class="campo c2 m3"><label>Valor unitário (R$)</label><input class="num" inputmode="decimal" data-k="valor" value="${st.num(it.valor) ? esc(st.dec(it.valor)) : ''}" placeholder="Informe o valor"></div>
            <div class="campo c2 m3"><label>Custo unit. (R$) <span class="muted">só você vê</span></label><input class="num" inputmode="decimal" data-k="custo" value="${st.num(it.custo) ? esc(st.dec(it.custo)) : ''}" placeholder="opcional"></div>
          </div>
          <div class="item-total" data-tot>${st.brl(st.num(it.qtd) * st.num(it.valor))}</div>
        </div>`).join('');
    }

    function desenharCircuitos() {
      const L = o.circuitos || [];
      app.querySelector('#dim-pdf-l').hidden = !L.length;
      app.querySelector('#anx-uni').hidden = !L.length;
      app.querySelector('#anx-multi').hidden = !L.length;
      app.querySelector('#alim').hidden = !L.length;
      const LG = st.ligacoes(o);
      const tot = Object.values(LG.carga).reduce((a, b) => a + b, 0);
      app.querySelector('#al-carga').innerHTML = L.length ? `<b>Carga por fase:</b> ${Object.entries(LG.carga).map(([f, w]) => `${f} ${Math.round(w).toLocaleString('pt-BR')} W${tot ? ` (${Math.round(w / tot * 100)}%)` : ''}`).join(' · ')}${LG.avisos.length ? `<br><span style="color:var(--danger)">${LG.avisos.map(esc).join('<br>')}</span>` : ''}` : '';
      app.querySelector('#circ').innerHTML = L.length ? `<div class="lista">${L.map((c, i) => {
        const calc = (c.linhas || []).filter(l => l.tipo === 'calculo' && !l.erro);
        const res = [...calc.filter(l => l.destaque), ...calc.filter(l => l.resumo && !l.destaque)].slice(0, 3).map(l => `${l.rotulo}: ${l.valor}${l.unidade ? ' ' + l.unidade : ''}`).join(' · ');
        return `<button class="linha" type="button" data-circ="${i}"><span class="ag-ic ${c.erros ? 'perigo' : c.modelo && c.modelo.exemplo ? 'alerta' : 'ok'}">${ICON.cabo}</span>
          <div class="principal"><div class="t1">${esc(c.nome)}</div><div class="t2"><span class="lig">${esc((LG.porCircuito[c.id] || {}).rotulo || '')}${c.ligacao && c.ligacao !== 'auto' ? '' : ' · auto'}</span> ${esc(res || (c.erros ? 'Cálculo com erro' : ''))}</div></div>
          ${c.erros ? '<span class="badge b-recusado">erro</span>' : c.modelo && c.modelo.exemplo ? '<span class="badge b-vencido">exemplo</span>' : ''}</button>`;
      }).join('')}</div>` : `<p class="ajuda" style="margin:0">Opcional: calcule os cabos e disjuntores dos circuitos (NBR 5410) e envie junto com o orçamento ou em arquivo separado para o "de acordo" do cliente.</p>`;
    }
    app.querySelector('#alim').addEventListener('change', ev => {
      const k = ev.target.dataset.al; if (!k) return;
      o.alimentacao = { ...st.alimentacao(o), [k]: ev.target.value.trim() };
      desenharCircuitos(); agendarSalvar();
    });
    app.querySelector('#circ').addEventListener('click', async ev => {
      const b = ev.target.closest('[data-circ]'); if (!b) return;
      const i = Number(b.dataset.circ);
      const r = await dialogoCircuito(o.circuitos[i], i + 1, o);
      if (!r) return;
      if (r === 'excluir') { if (!(await confirmar('Excluir circuito', `Excluir "${esc(o.circuitos[i].nome)}"?`, 'Excluir'))) return; o.circuitos.splice(i, 1); }
      else o.circuitos[i] = r;
      desenharCircuitos(); agendarSalvar();
    });
    app.querySelector('#add-circ').onclick = async () => {
      o.circuitos = o.circuitos || [];
      const r = await dialogoCircuito(null, o.circuitos.length + 1, o);
      if (!r || r === 'excluir') return;
      o.circuitos.push(r); desenharCircuitos(); agendarSalvar();
    };
    app.querySelector('#dim-pdf').addEventListener('change', ev => { o.dimNoPdf = ev.target.checked; agendarSalvar(); });

    /* Desenhos e anexos (js/arquivos.js) */
    const A = window.Arquivos;
    function desenharAnexos() {
      const L = o.anexos || [];
      const ic = a => a.tipo === 'link' ? ICON.link : a.tipo === 'desenho' ? ICON.desenho : A.ehImagem(a.mime) ? ICON.doc : ICON.clipe;
      const det = a => a.tipo === 'link' ? (a.url || '').replace(/^https?:\/\//, '') : `${a.tipo === 'desenho' ? 'Desenho' : (a.nome.split('.').pop() || '').toUpperCase()} · ${A.tamanhoFmt(a.tamanho)}${a.gfotos ? ' · no Google Fotos ✓' : ''}`;
      app.querySelector('#anx').innerHTML = L.length ? `<div class="lista">${L.map((a, i) => `
        <div class="linha anx-l"><button class="anx-abrir" type="button" data-anx="${i}"><span class="ag-ic ok">${ic(a)}</span>
          <div class="principal"><div class="t1">${esc(a.nome)}</div><div class="t2">${esc(det(a))}</div></div></button>
          <label class="anx-ent" title="Entregar ao cliente"><input type="checkbox" data-ent="${i}" ${a.entregar !== false ? 'checked' : ''}><span>Entregar</span></label></div>`).join('')}</div>` : '';
    }
    async function guardarArquivo(blob, nome, tipo, idExistente) {
      const id = idExistente || st.uid();
      try { await A.salvar(id, blob); } catch (e) { toast('Não foi possível guardar o arquivo: armazenamento cheio.'); return null; }
      const ficha = { id, tipo, nome, mime: blob.type || '', tamanho: blob.size, entregar: true, criadoEm: new Date().toISOString() };
      o.anexos = o.anexos || [];
      const i = o.anexos.findIndex(x => x.id === id);
      if (i >= 0) o.anexos[i] = { ...o.anexos[i], mime: ficha.mime, tamanho: ficha.tamanho, atualizadoEm: ficha.criadoEm };
      else o.anexos.push(ficha);
      desenharAnexos(); agendarSalvar();
      return ficha;
    }
    async function editarDesenho(fonte, nome, idExistente) {
      if (!navigator.onLine) { toast('O editor de desenho precisa de internet.'); return; }
      const png = await A.abrirDrawio(fonte, nome);
      if (!png) return;
      const f = await guardarArquivo(await A.deDataUrl(png), nome, 'desenho', idExistente);
      if (f) toast('Desenho salvo.');
    }
    app.querySelector('#anx-des').onclick = async () => {
      const nome = await pedirTexto('Novo desenho', 'Nome do desenho', `Desenho ${(o.anexos || []).filter(a => a.tipo === 'desenho').length + 1}`);
      if (nome) editarDesenho({ xml: '' }, nome);
    };
    app.querySelector('#anx-planta').addEventListener('change', async ev => {
      const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
      if (!/^image\//.test(f.type)) { toast('Escolha uma imagem (foto ou print da planta). Para PDF, exporte a página como imagem.'); return; }
      const nome = await pedirTexto('Planta com pontos', 'Nome do desenho', 'Planta - ' + (o.titulo || 'pontos elétricos'));
      if (nome) editarDesenho({ xml: await A.plantaXml(f, nome) }, nome);
    });
    app.querySelector('#anx-multi').onclick = () => {
      if (!(o.circuitos || []).length) { toast('Adicione circuitos no dimensionamento primeiro.'); return; }
      editarDesenho({ xml: A.gerarMultifilarXml(o) }, 'Diagrama multifilar');
    };
    app.querySelector('#anx-uni').onclick = () => {
      if (!(o.circuitos || []).length) { toast('Adicione circuitos no dimensionamento primeiro.'); return; }
      editarDesenho({ xml: A.gerarUnifilarXml(o) }, 'Diagrama unifilar');
    };
    app.querySelector('#anx-arq').addEventListener('change', async ev => {
      const fs = [...ev.target.files]; ev.target.value = '';
      for (const f of fs) {
        if (f.size > 25 * 1048576) { toast(`${f.name}: arquivo maior que 25 MB.`); continue; }
        await guardarArquivo(f, f.name, 'arquivo');
      }
      if (fs.length) toast(`${fs.length} arquivo(s) anexado(s).`);
    });
    app.querySelector('#anx-link').onclick = async () => {
      let dados = null;
      await dialogo({
        titulo: 'Adicionar link',
        corpo: `<div class="campos">
          <div class="campo"><label for="lk-u">Endereço (URL)</label><input id="lk-u" type="url" inputmode="url" placeholder="https://www.tinkercad.com/things/..." autocapitalize="off"></div>
          <div class="campo"><label for="lk-n">Nome</label><input id="lk-n" placeholder="Ex.: Ligação do sensor da caixa-d'água (Tinkercad)"></div></div>
          <p class="ajuda">No Tinkercad: abra o projeto → <b>Compartilhar</b> → deixe o projeto público ou com link e copie o endereço.</p>`,
        acoes: [{ rotulo: 'Cancelar', valor: null }, { rotulo: 'Adicionar', classe: 'prim', valor: 'ok', antes: d => {
          let u = d.querySelector('#lk-u').value.trim();
          if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
          try { new URL(u); } catch (e) { d.querySelector('#lk-u').classList.add('invalido'); return false; }
          const host = new URL(u).hostname.replace(/^www\./, '');
          dados = { url: u, nome: d.querySelector('#lk-n').value.trim() || (/tinkercad/.test(host) ? 'Projeto no Tinkercad' : host) };
        } }]
      });
      if (!dados) return;
      o.anexos = o.anexos || [];
      o.anexos.push({ id: st.uid(), tipo: 'link', nome: dados.nome, url: dados.url, entregar: true, criadoEm: new Date().toISOString() });
      desenharAnexos(); agendarSalvar();
    };
    app.querySelector('#anx').addEventListener('change', ev => {
      const c = ev.target.closest('[data-ent]'); if (!c) return;
      o.anexos[Number(c.dataset.ent)].entregar = c.checked; agendarSalvar();
    });
    app.querySelector('#anx').addEventListener('click', async ev => {
      const b = ev.target.closest('[data-anx]'); if (!b) return;
      const a = o.anexos[Number(b.dataset.anx)];
      const r = await dialogo({
        titulo: a.nome,
        corpo: `<div class="lista">
          <button class="linha" data-op="abrir">${a.tipo === 'link' ? ICON.link : ICON.doc}<div class="principal"><div class="t1">${a.tipo === 'link' ? 'Abrir link' : 'Abrir'}</div>${a.tipo === 'link' ? `<div class="t2">${esc(a.url)}</div>` : ''}</div></button>
          ${a.tipo === 'desenho' ? `<button class="linha" data-op="editar">${ICON.desenho}<div class="principal"><div class="t1">Editar desenho</div><div class="t2">Abre no draw.io</div></div></button>` : ''}
          <button class="linha" data-op="nome">${ICON.lista}<div class="principal"><div class="t1">Renomear</div></div></button>
          <button class="linha" data-op="exc" style="color:var(--danger)">${ICON.lixo}<div class="principal"><div class="t1">Excluir</div></div></button></div>`,
        acoes: [],
        aoAbrir: (d, fechar) => d.querySelector('.lista').addEventListener('click', e => { const x = e.target.closest('[data-op]'); if (x) fechar(x.dataset.op); })
      });
      if (r === 'abrir') {
        if (a.tipo === 'link') { window.open(a.url, '_blank', 'noopener'); return; }
        const blob = await A.obter(a.id);
        if (!blob) { toast('Este arquivo não está neste aparelho (foi anexado em outro).'); return; }
        const url = URL.createObjectURL(blob);
        if (!window.open(url, '_blank')) window.WhatsApp.baixar(blob, a.tipo === 'desenho' ? a.nome + '.png' : a.nome);
        setTimeout(() => URL.revokeObjectURL(url), 120000);
      }
      if (r === 'editar') {
        const blob = await A.obter(a.id);
        if (!blob) { toast('Este desenho não está neste aparelho (foi feito em outro).'); return; }
        editarDesenho({ xmlpng: await A.paraDataUrl(blob) }, a.nome, a.id);
      }
      if (r === 'nome') { const n = await pedirTexto('Renomear', 'Nome', a.nome); if (n) { a.nome = n; desenharAnexos(); agendarSalvar(); } }
      if (r === 'exc' && await confirmar('Excluir anexo', `Excluir "${esc(a.nome)}"?`, 'Excluir')) {
        o.anexos = o.anexos.filter(x => x !== a); if (a.tipo !== 'link') A.excluir(a.id);
        desenharAnexos(); agendarSalvar();
      }
    });

    /* Entrega da obra: termo em PDF (com desenhos, fotos e dimensionamento) + arquivos */
    async function entregarObra() {
      const c = st.cliente(o.clienteId);
      if (!c) { toast('Escolha o cliente do orçamento.'); return; }
      if (!o.assinaturaCliente && await confirmar('Assinatura do cliente', 'O cliente está com você? Ele pode assinar o recebimento no celular agora (vai no termo de entrega).', 'Coletar assinatura')) await window.TelasExtras.coletarAssinatura(o);
      clearTimeout(tSalvar); st.salvarOrcamento(o);
      const sel = (o.anexos || []).filter(a => a.entregar !== false);
      const faltando = [], imagens = [], arquivos = [];
      for (const a of sel) {
        if (a.tipo === 'link') continue;
        const blob = await A.obter(a.id);
        if (!blob) { faltando.push(a.nome); continue; }
        if (a.tipo === 'desenho' || A.ehImagem(blob.type || a.mime)) imagens.push({ nome: a.nome, dataUrl: await A.paraDataUrl(blob) });
        else arquivos.push({ blob, nome: a.nome });
      }
      const pdf = window.PDF.gerarEntrega(o, imagens);
      const todos = [{ blob: pdf, nome: window.PDF.nomeEntrega(o) }, ...arquivos];
      const links = sel.filter(a => a.tipo === 'link');
      const r = await dialogo({
        titulo: 'Entrega da obra',
        corpo: `<p style="margin-top:0">Vai para <b>${esc(c.nome)}</b>:</p>
          <ul style="padding-left:18px;margin:0">
            <li><b>Termo de entrega (PDF)</b>: serviços, garantia, documentos e campo "Recebido pelo cliente"${(o.circuitos || []).length ? ', com o dimensionamento' : ''}${imagens.length ? `, com ${imagens.length} desenho(s)/foto(s)` : ''}.</li>
            ${arquivos.map(x => `<li>${esc(x.nome)}</li>`).join('')}
            ${links.length ? `<li>${links.length} link(s) na mensagem: ${links.map(x => esc(x.nome)).join(', ')}</li>` : ''}
          </ul>
          ${faltando.length ? `<p class="ajuda" style="color:var(--warn)">Não estão neste aparelho e ficarão de fora: ${faltando.map(esc).join(', ')}.</p>` : ''}
          ${!st.telefoneValido(c.telefone) ? '<p class="ajuda" style="color:var(--warn)">Cliente sem WhatsApp válido: só dá para baixar.</p>' : ''}`,
        acoes: [{ rotulo: 'Baixar', valor: 'baixar' }, ...(st.telefoneValido(c.telefone) ? [{ rotulo: 'Enviar', classe: 'prim', valor: 'enviar' }] : [])]
      });
      if (!r) return;
      if (r === 'baixar') { todos.forEach((x, i) => setTimeout(() => window.WhatsApp.baixar(x.blob, x.nome), i * 400)); return; }
      const msg = window.WhatsApp.mensagemEntrega(o);
      const copiada = await window.WhatsApp.copiar(msg);
      const res = await window.WhatsApp.enviarArquivos(todos, `Entrega da obra ${o.numero}`, msg);
      if (res === 'cancelado') return;
      o.entregueEm = new Date().toISOString(); st.salvarOrcamento(o);
      const abrir = await dialogo({
        titulo: res === 'compartilhado' ? 'Agora envie a mensagem' : 'Anexe os arquivos na conversa',
        corpo: res === 'compartilhado'
          ? `<p style="margin-top:0">O WhatsApp entrega os arquivos sem o texto.${copiada ? ' A mensagem (com os links) já está <b>copiada</b>.' : ''}</p><p>Toque abaixo para abrir a conversa com <b>${esc(c.nome)}</b> com a mensagem escrita.</p>`
          : `<p style="margin-top:0">Os arquivos foram baixados. Abra a conversa com <b>${esc(c.nome)}</b> e anexe-os pelo clipe; a mensagem já vai escrita.</p>`,
        acoes: [{ rotulo: 'Fechar', valor: false }, { rotulo: 'Abrir conversa', classe: 'prim', valor: true }]
      });
      if (abrir) window.WhatsApp.abrirConversa(c.telefone, msg);
      if (st.db.empresa.linkAvaliacao && !o.avaliacaoPedidaEm) setTimeout(async () => {
        if (await confirmar('Avaliação no Google', `Pedir para ${esc(c.nome)} avaliar o seu serviço no Google?`, 'Pedir avaliação') && window.TelasExtras.enviarMsg('avaliacao', o)) { o.avaliacaoPedidaEm = new Date().toISOString(); st.salvarOrcamento(o); }
      }, 1200);
    }

    /* Deslocamento: rota de carro da empresa até o cliente (js/rotas.js) */
    const R = window.Rotas;
    function desenharDeslocamento() {
      const d = o.deslocamento, e = st.db.empresa;
      const vkm = st.num(e.deslocValorKm) || 2.5;
      const it = (o.itens || []).find(x => x.desloc);
      app.querySelector('#desl').innerHTML = d && it ? `
        <div class="desl-res"><div><div class="desl-km">${st.dec(d.kmIda, 1)} km <span class="muted">${d.idaVolta ? '× 2 (ida e volta)' : 'só ida'}</span></div>
          <div class="ajuda" style="margin:2px 0 0">${d.manual ? 'Distância informada à mão' : `Trajeto de carro${d.minutos ? ` · cerca de ${d.minutos} min` : ''}`} · ${st.dec(st.num(it.qtd), 1)} km × ${st.brl(it.valor)}</div></div>
          <div class="desl-val">${st.brl(st.num(it.qtd) * st.num(it.valor))}</div></div>
        ${d.link ? `<a class="ajuda" href="${esc(d.link)}" target="_blank" rel="noopener">Ver o trajeto no mapa</a>` : ''}
        <div class="acoes" style="margin-top:10px">
          <button class="btn" type="button" data-dl="calc">${ICON.relogio} Recalcular</button>
          <button class="btn" type="button" data-dl="km">Editar km</button>
          <button class="btn perigo" type="button" data-dl="rem">${ICON.lixo} Remover</button></div>`
        : `<p class="ajuda" style="margin-top:0">Calcula a distância de carro do seu endereço até o do cliente e cobra ${st.brl(vkm)} por km${e.deslocIdaVolta !== false ? ', ida e volta' : ''} (ajuste em Ajustes → Deslocamento).</p>
        <div class="acoes" style="margin-top:0">
          <button class="btn prim" type="button" data-dl="calc">${ICON.relogio} Calcular trajeto</button>
          <button class="btn" type="button" data-dl="km">Informar km</button></div>`;
    }
    async function origemEmpresa() {
      const e = st.db.empresa;
      const end = R.textoEndereco(e.endereco, e.cidade);
      if (e.origem && (e.origem.manual || e.origem.end === end)) return e.origem;
      if (!end) throw new Error('Cadastre o endereço da sua empresa em Ajustes (ou use "Usar minha localização atual" em Ajustes → Deslocamento).');
      const g = await R.geocodificar(e.endereco, e.cidade);
      const origem = { ...g, end };
      st.salvarEmpresa({ origem });
      return origem;
    }
    async function destinoCliente(c) {
      const end = R.textoEndereco(c.endereco, c.cidade);
      if (!end) throw new Error(`Cadastre o endereço de ${c.nome} (rua, número, bairro e cidade/UF).`);
      if (c.geo && c.geo.end === end) return c.geo;
      const g = await R.geocodificar(c.endereco, c.cidade);
      c.geo = { ...g, end }; st.salvarCliente(c);
      return c.geo;
    }
    async function informarKm(atual) {
      let km = null;
      await dialogo({
        titulo: 'Distância até o cliente',
        corpo: `<div class="campo"><label for="dl-km">Distância só de ida (km)</label><input id="dl-km" class="num" inputmode="decimal" value="${atual ? esc(st.dec(atual, 1)) : ''}" placeholder="Ex.: 12,5"></div>`,
        acoes: [{ rotulo: 'Cancelar', valor: null }, { rotulo: 'OK', classe: 'prim', valor: 'ok', antes: d => { km = st.num(d.querySelector('#dl-km').value); if (!(km > 0)) { d.querySelector('#dl-km').classList.add('invalido'); return false; } } }],
        aoAbrir: d => d.querySelector('#dl-km').focus()
      });
      return km;
    }
    function lancarDeslocamento(d) {
      const e = st.db.empresa;
      st.aplicarDeslocamento(o, { idaVolta: e.deslocIdaVolta !== false, valorKm: st.num(e.deslocValorKm) || 2.5, calculadoEm: new Date().toISOString(), ...d });
      desenharItens(); desenharDeslocamento(); atualizarTotais(); agendarSalvar();
    }
    app.querySelector('#desl').addEventListener('click', async ev => {
      const b = ev.target.closest('[data-dl]'); if (!b) return;
      if (b.dataset.dl === 'rem') { st.aplicarDeslocamento(o, null); desenharItens(); desenharDeslocamento(); atualizarTotais(); agendarSalvar(); return; }
      if (b.dataset.dl === 'km') { const km = await informarKm(o.deslocamento && o.deslocamento.kmIda); if (km) lancarDeslocamento({ kmIda: km, manual: true, minutos: 0, link: '' }); return; }
      const c = st.cliente(o.clienteId);
      if (!c) { toast('Escolha o cliente do orçamento.'); return; }
      if (!navigator.onLine) { toast('Sem internet: use "Informar km".'); return; }
      b.disabled = true; const txt = b.innerHTML; b.textContent = 'Calculando…';
      try {
        const [orig, dest] = [await origemEmpresa(), await destinoCliente(c)];
        const r = await R.rota(orig, dest);
        lancarDeslocamento({ kmIda: r.km, minutos: r.minutos, manual: false, link: R.linkMapa(orig, dest), destino: dest.nome });
        toast(`Trajeto: ${st.dec(r.km, 1)} km até ${c.nome.split(' ')[0]}.`);
      } catch (err) {
        b.disabled = false; b.innerHTML = txt;
        const ir = await dialogo({ titulo: 'Não foi possível calcular', corpo: `<p style="margin-top:0">${esc(err.message || err)}</p>`, acoes: [{ rotulo: 'Fechar', valor: null }, { rotulo: 'Informar km', classe: 'prim', valor: 'km' }] });
        if (ir === 'km') { const km = await informarKm(); if (km) lancarDeslocamento({ kmIda: km, manual: true, minutos: 0, link: '' }); }
      }
    });

    function atualizarTotais() {
      const t = st.totais(o);
      app.querySelector('#tot').textContent = st.brl(t.total);
      app.querySelector('#resumo').innerHTML = `
        <span class="muted">Subtotal</span><span class="direita">${st.brl(t.subtotal)}</span>
        <span class="muted">Desconto</span><span class="direita">- ${st.brl(t.desconto)}</span>
        <span class="forte">Total</span><span class="direita forte">${st.brl(t.total)}</span>`;
      if (ctxX.aoTotais) ctxX.aoTotais();
    }

    function atualizarPendencias() {
      const p = st.pendencias(o, true);
      app.querySelector('#pend').innerHTML = p.length
        ? `<div class="aviso info">${ICON.info}<div><p><b>Falta completar antes de enviar</b></p><ul>${p.map(x => `<li>${x.ir ? `<a href="${x.ir}">${esc(x.msg)}</a>` : esc(x.msg)}</li>`).join('')}</ul></div></div>`
        : '';
    }

    let tSalvar, sujo = false;
    function agendarSalvar() {
      sujo = true;
      clearTimeout(tSalvar);
      app.querySelector('#salvo').textContent = 'Salvando…';
      tSalvar = setTimeout(() => {
        sujo = false;
        if (st.salvarOrcamento(o)) app.querySelector('#salvo').textContent = 'Salvo automaticamente.';
        atualizarPendencias();
      }, 350);
    }

    // Campos gerais
    app.addEventListener('input', ev => {
      const el = ev.target;
      if (el.dataset.f) {
        o[el.dataset.f] = el.dataset.f === 'validadeDias' ? (parseInt(el.value, 10) || 0) : el.value;
        if (el.dataset.f === 'desconto' || el.dataset.f === 'descontoTipo') atualizarTotais();
        agendarSalvar();
      } else if (el.dataset.k) {
        const card = el.closest('[data-idx]');
        const it = o.itens[Number(card.dataset.idx)];
        it[el.dataset.k] = el.value;
        if (el.dataset.k === 'custo') atualizarTotais();
        if (el.dataset.k === 'qtd' || el.dataset.k === 'valor') {
          card.querySelector('[data-tot]').textContent = st.brl(st.num(it.qtd) * st.num(it.valor));
          card.classList.toggle('sem-valor', st.num(it.valor) <= 0);
          atualizarTotais();
        }
        agendarSalvar();
      }
    });
    app.addEventListener('change', ev => {
      const el = ev.target;
      if (el.dataset.k === 'tipo') desenharItens();
      if (el.dataset.f === 'status' && el.value === 'Enviado' && !o.enviadoEm) o.enviadoEm = new Date().toISOString();
      if (el.dataset.f === 'status' && el.value === 'Concluído') {
        if (!o.concluidoEm) o.concluidoEm = new Date().toISOString();
        if (!o.entregueEm) setTimeout(async () => {
          if (await confirmar('Serviço concluído', 'Enviar agora a entrega da obra ao cliente (termo de entrega, desenhos e documentos)?', 'Preparar entrega')) entregarObra();
        }, 400);
      }
      if (el.dataset.f === 'dataInicio') el.classList.toggle('invalido', !el.value);
    });
    app.addEventListener('focusout', ev => {
      const el = ev.target;
      if ((el.dataset.k === 'valor' || el.dataset.k === 'custo' || el.dataset.f === 'desconto') && el.value) el.value = st.dec(el.value);
    });

    elItens.addEventListener('click', async ev => {
      const bt = ev.target.closest('[data-acao="tec"]');
      if (bt) {
        const it = o.itens[Number(bt.closest('[data-idx]').dataset.idx)];
        let novo;
        const r = await dialogo({
          titulo: 'Especificação técnica',
          corpo: `<p class="ajuda" style="margin-top:0"><b>${esc(it.descricao || 'Item')}</b>. Vale só para este orçamento; o catálogo não muda.</p>${htmlTec(it.tec, true)}`,
          acoes: [{ rotulo: 'Cancelar', valor: null }, { rotulo: 'Salvar', classe: 'prim', valor: 'ok', antes: d => { novo = lerTec(d); } }],
          aoAbrir: d => { ligarTec(d, null); if (!it.tec) { const sel = d.querySelector('[data-tc]'); const sug = TEC.sugerir(it.descricao); if (sug) { sel.value = sug; sel.dispatchEvent(new Event('change')); } } }
        });
        if (r !== 'ok') return;
        if (novo) it.tec = novo; else delete it.tec;
        desenharItens(); agendarSalvar();
        return;
      }
      const b = ev.target.closest('[data-acao="rem"]'); if (!b) return;
      const i = Number(b.closest('[data-idx]').dataset.idx);
      const it = o.itens[i];
      if (it.descricao && !(await confirmar('Remover item', `Remover "${esc(it.descricao)}"?`, 'Remover', 'prim'))) return;
      o.itens.splice(i, 1);
      if (it.desloc) delete o.deslocamento;
      desenharItens(); desenharDeslocamento(); atualizarTotais(); agendarSalvar();
    });

    app.querySelector('#add-item').onclick = () => {
      o.itens.push({ id: st.uid(), descricao: '', tipo: 'Material', unidade: 'un', qtd: 1, valor: 0 });
      desenharItens(); atualizarTotais(); agendarSalvar();
      const ult = elItens.querySelector('.item:last-child [data-k="descricao"]');
      if (ult) { ult.focus(); ult.scrollIntoView({ block: 'center' }); }
    };

    app.querySelector('#add-cat').onclick = async () => {
      const cat = st.db.catalogo;
      if (!cat.length) { toast('Catálogo vazio. Cadastre itens em Ajustes → Catálogo.'); return; }
      let ids = [];
      const sel = await dialogo({
        titulo: 'Adicionar do catálogo',
        corpo: `${filtrosCatalogo(cat, 'Buscar (ex.: tomada, chuveiro)')}
          <p class="ajuda" id="qc-marcados">Toque para marcar; adicione vários de uma vez.</p>
          ${listaCatalogo(cat, 'escolher')}`,
        acoes: [{ rotulo: 'Cancelar', valor: null }, {
          rotulo: 'Adicionar', classe: 'prim', valor: 'ok',
          antes: d => { ids = [...d.querySelectorAll('#lc input:checked')].map(x => x.value); }
        }],
        aoAbrir: d => {
          ligarFiltrosCatalogo(d, { grupo: 'Todas', busca: '' });
          d.querySelector('#lc').addEventListener('change', () => {
            const n = d.querySelectorAll('#lc input:checked').length;
            d.querySelector('#qc-marcados').textContent = n ? `${n} item(ns) marcado(s).` : 'Toque para marcar; adicione vários de uma vez.';
          });
        }
      });
      if (sel !== 'ok') return;
      ids.forEach(idc => {
        const i = cat.find(x => x.id === idc);
        if (i) o.itens.push({ id: st.uid(), descricao: i.descricao, tipo: i.tipo, unidade: i.unidade, qtd: 1, valor: st.num(i.valor), ...(st.num(i.custo) ? { custo: st.num(i.custo) } : {}), ...(i.tec ? { tec: { ...i.tec } } : {}) });
      });
      desenharItens(); atualizarTotais(); agendarSalvar();
      if (ids.length) toast(`${ids.length} item(ns) adicionado(s).`);
    };

    app.querySelector('#novo-cli').onclick = async () => {
      const c = await dialogoCliente();
      if (!c) return;
      const sel = app.querySelector('#f-cli');
      sel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${esc(c.nome)}</option>`);
      sel.value = c.id; o.clienteId = c.id; agendarSalvar();
    };

    /* PDF e envio */
    async function checarAntes(paraWhatsApp) {
      const p = st.pendencias(o, paraWhatsApp);
      if (!p.length) return true;
      const bloqueia = p.some(x => x.bloqueia);
      const r = await dialogo({
        titulo: bloqueia ? 'Faltam informações' : 'Confira antes de gerar',
        corpo: `<ul style="margin:0;padding-left:18px">${p.map(x => `<li>${esc(x.msg)}${x.bloqueia ? ' <b>(obrigatório)</b>' : ''}</li>`).join('')}</ul>`,
        aoAbrir: () => { const ini = app.querySelector('#f-ini'); if (ini && !ini.value) ini.classList.add('invalido'); },
        acoes: bloqueia ? [{ rotulo: 'Corrigir', classe: 'prim', valor: false }]
          : [{ rotulo: 'Corrigir', valor: false }, { rotulo: 'Gerar mesmo assim', classe: 'prim', valor: true }]
      });
      return !!r;
    }

    app.querySelector('#ver-pdf').onclick = async () => {
      if (!(await checarAntes(false))) return;
      st.salvarOrcamento(o);
      const blob = window.PDF.gerar(o);
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) window.WhatsApp.baixar(blob, window.PDF.nomeArquivo(o));
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    };

    // Envia um PDF (gerado ou assinado no gov.br) e, depois, a mensagem
    async function enviarParaCliente(blob, nomeArq, memorial) {
      const c = st.cliente(o.clienteId);
      const msg = memorial ? window.WhatsApp.mensagemMemorial(o) : window.WhatsApp.mensagem(o);
      const copiada = await window.WhatsApp.copiar(msg); // antes do compartilhar, ainda no toque do usuário
      const r = await window.WhatsApp.enviarPDF(o, blob, nomeArq, msg, memorial ? `Dimensionamento ${o.numero}` : '');
      if (r === 'cancelado') return;
      if (memorial) { o.memorialEnviadoEm = new Date().toISOString(); st.salvarOrcamento(o); }
      else if (o.status === 'Rascunho') { o.status = 'Enviado'; o.enviadoEm = new Date().toISOString(); st.salvarOrcamento(o); const sel = app.querySelector('#f-st'); if (sel) sel.value = 'Enviado'; }
      if (r === 'compartilhado') {
        const enviar = await dialogo({
          titulo: 'Agora envie a mensagem',
          corpo: `<p style="margin-top:0">O WhatsApp entrega o PDF <b>sem o texto</b>: ele ignora mensagens enviadas junto com documentos.</p>
            ${copiada ? '<p>A mensagem já está <b>copiada</b>. Na conversa, toque e segure no campo de texto e escolha <b>Colar</b>.</p>' : ''}
            <p>${copiada ? 'Ou toque' : 'Toque'} abaixo para abrir a conversa com <b>${esc(c.nome)}</b> já com a mensagem escrita.</p>`,
          acoes: [{ rotulo: 'Pronto', valor: false }, { rotulo: 'Enviar mensagem', classe: 'prim', valor: true }]
        });
        if (enviar) window.WhatsApp.abrirConversa(c.telefone, msg);
        else toast('Orçamento marcado como enviado.');
        return;
      }
      // Plano B: PDF baixado; abre a conversa com o contato cadastrado
      const abrir = await dialogo({
        titulo: 'Anexe o PDF na conversa',
        corpo: `<p style="margin-top:0">Este navegador não permite anexar arquivos direto no WhatsApp. O PDF <b>${esc(nomeArq || window.PDF.nomeArquivo(o))}</b> foi baixado.</p>
          <p>Abra a conversa com <b>${esc(c.nome)}</b> (${esc(st.telefoneFmt(c.telefone))}). A mensagem já vai escrita; depois anexe o PDF pelo clipe.</p>`,
        acoes: [{ rotulo: 'Fechar', valor: false }, { rotulo: 'Abrir conversa', classe: 'prim', valor: true }]
      });
      if (abrir) window.WhatsApp.abrirConversa(c.telefone, msg);
    }

    app.querySelector('#enviar').onclick = async () => {
      if (!(await checarAntes(true))) return;
      st.salvarOrcamento(o);
      await enviarParaCliente(window.PDF.gerar(o));
    };

    // Assinatura gov.br: o app não pode assinar sozinho (a API é só para órgãos públicos).
    // Fluxo: baixar PDF → assinar no assinador.iti.br → escolher o PDF assinado → enviar.
    async function assinarGovbr() {
      if (!(await checarAntes(true))) return;
      st.salvarOrcamento(o);
      const arq = await dialogo({
        titulo: 'Assinar com gov.br',
        corpo: `<p style="margin-top:0">Assinatura digital gratuita e com validade jurídica. Precisa de conta gov.br <b>prata ou ouro</b>.</p>
          <ol class="passos">
            <li><b>Baixe o PDF</b> do orçamento.<div class="acoes" style="margin-top:6px"><button class="btn" type="button" id="gb-baixar">${ICON.pdf} Baixar PDF</button></div></li>
            <li><b>Assine no gov.br:</b> entre, envie o PDF, posicione a assinatura e baixe o arquivo assinado.<div class="acoes" style="margin-top:6px"><a class="btn" href="https://assinador.iti.br/" target="_blank" rel="noopener">Abrir assinador gov.br</a></div></li>
            <li><b>Escolha o PDF assinado</b> para enviar ao cliente.<div class="acoes" style="margin-top:6px"><label class="btn prim">Escolher PDF assinado<input type="file" id="gb-arq" accept="application/pdf,.pdf" hidden></label></div></li>
          </ol>
          <p class="ajuda">Não edite o PDF depois de assinado: qualquer mudança invalida a assinatura.</p>`,
        acoes: [],
        aoAbrir: (d, fechar) => {
          d.querySelector('#gb-baixar').onclick = () => window.WhatsApp.baixar(window.PDF.gerar(o), window.PDF.nomeArquivo(o));
          d.querySelector('#gb-arq').addEventListener('change', ev => { const f = ev.target.files[0]; if (f) fechar(f); });
        }
      });
      if (!arq) return;
      if (!/pdf$/i.test(arq.type) && !/\.pdf$/i.test(arq.name)) { toast('Escolha um arquivo PDF.'); return; }
      const nomeAss = window.PDF.nomeArquivo(o).replace(/\.pdf$/, '-assinado.pdf');
      // um toque novo é necessário para abrir o menu de compartilhar
      const ok = await dialogo({
        titulo: 'PDF assinado pronto',
        corpo: `<p style="margin-top:0"><b>${esc(arq.name)}</b> será enviado como <b>${esc(nomeAss)}</b>.</p>`,
        acoes: [{ rotulo: 'Cancelar', valor: false }, { rotulo: 'Enviar no WhatsApp', classe: 'prim', valor: true }]
      });
      if (!ok) return;
      o.assinadoGovbr = true; st.salvarOrcamento(o);
      await enviarParaCliente(arq, nomeAss);
    }

    document.getElementById('mais').onclick = async () => {
      const c = st.cliente(o.clienteId);
      const r = await dialogo({
        titulo: 'Opções',
        corpo: `<div class="lista">
          ${c && st.telefoneValido(c.telefone) ? `<button class="linha" data-op="msg">${ICON.conversa}<div class="principal"><div class="t1">Mensagem para ${esc(c.nome)}</div><div class="t2">Abre a conversa no WhatsApp só com o texto</div></div></button>` : ''}
          <button class="linha" data-op="govbr">${ICON.enviar}<div class="principal"><div class="t1">Assinar com gov.br e enviar</div><div class="t2">Assinatura digital gratuita, com validade jurídica</div></div></button>
          <button class="linha" data-op="baixar">${ICON.pdf}<div class="principal"><div class="t1">Baixar PDF</div></div></button>
          ${(o.circuitos || []).length ? `<button class="linha" data-op="mem-env">${ICON.cabo}<div class="principal"><div class="t1">Enviar dimensionamento para "de acordo"</div><div class="t2">PDF separado só com os circuitos e o campo de aceite</div></div></button>
          <button class="linha" data-op="mem-baixar">${ICON.pdf}<div class="principal"><div class="t1">Baixar PDF do dimensionamento</div></div></button>` : ''}
          <button class="linha" data-op="entrega">${ICON.entrega}<div class="principal"><div class="t1">Entrega da obra</div><div class="t2">${o.entregueEm ? 'Enviada em ' + esc(st.dataBR(o.entregueEm)) : 'Termo de entrega com desenhos e documentos'}</div></div></button>
          <button class="linha" data-op="inspecao">${ICON.lista}<div class="principal"><div class="t1">Inspeção e laudo</div><div class="t2">Checklist NBR 5410 com medições e laudo em PDF</div></div></button>
          <button class="linha" data-op="assin-cli">${ICON.desenho}<div class="principal"><div class="t1">Assinatura do cliente</div><div class="t2">${o.assinaturaCliente ? 'Coletada em ' + esc(st.dataBR(o.assinaturaCliente.data)) : 'Cliente assina no celular (entrega e laudo)'}</div></div></button>
          ${st.db.empresa.linkAvaliacao && c && st.telefoneValido(c.telefone) ? `<button class="linha" data-op="avaliacao">${ICON.conversa}<div class="principal"><div class="t1">Pedir avaliação no Google</div></div></button>` : ''}
          <button class="linha" data-op="dup">${ICON.copiar}<div class="principal"><div class="t1">Duplicar orçamento</div></div></button>
          <button class="linha" data-op="exc" style="color:var(--danger)">${ICON.lixo}<div class="principal"><div class="t1">Excluir orçamento</div></div></button>
        </div>`,
        acoes: [],
        aoAbrir: (d, fechar) => d.querySelector('.lista').addEventListener('click', e => { const b = e.target.closest('[data-op]'); if (b) fechar(b.dataset.op); })
      });
      if (r === 'msg') window.WhatsApp.abrirConversa(c.telefone, window.WhatsApp.mensagem(o));
      if (r === 'govbr') assinarGovbr();
      if (r === 'baixar') { if (await checarAntes(false)) window.WhatsApp.baixar(window.PDF.gerar(o), window.PDF.nomeArquivo(o)); }
      if (r === 'mem-env' || r === 'mem-baixar') {
        const cli = st.cliente(o.clienteId);
        if (!cli) { toast('Escolha o cliente do orçamento.'); return; }
        if (r === 'mem-env' && !st.telefoneValido(cli.telefone)) { toast('Informe o WhatsApp do cliente com DDD.'); return; }
        const ex = o.circuitos.some(x => x.modelo && x.modelo.exemplo), er = o.circuitos.some(x => x.erros);
        if ((ex || er) && !(await dialogo({
          titulo: 'Confira antes de enviar',
          corpo: `<ul style="margin:0;padding-left:18px">${ex ? '<li>Calculado com <b>fórmulas de exemplo</b> (fictícias). O PDF sai marcado como exemplo.</li>' : ''}${er ? '<li>Há circuito com <b>erro</b> de cálculo.</li>' : ''}</ul>`,
          acoes: [{ rotulo: 'Corrigir', valor: false }, { rotulo: 'Gerar mesmo assim', classe: 'prim', valor: true }]
        }))) return;
        st.salvarOrcamento(o);
        const blob = window.PDF.gerarMemorial(o), nome = window.PDF.nomeMemorial(o);
        if (r === 'mem-baixar') window.WhatsApp.baixar(blob, nome);
        else await enviarParaCliente(blob, nome, true);
      }
      if (r === 'entrega') entregarObra();
      if (r === 'inspecao') { clearTimeout(tSalvar); st.salvarOrcamento(o); location.hash = '#/inspecao/' + o.id; }
      if (r === 'assin-cli') window.TelasExtras.coletarAssinatura(o);
      if (r === 'avaliacao' && window.TelasExtras.enviarMsg('avaliacao', o)) { o.avaliacaoPedidaEm = new Date().toISOString(); agendarSalvar(); }
      if (r === 'dup') { const n = st.duplicarOrcamento(o); toast('Cópia criada: ' + n.numero); location.hash = '#/orcamento/' + n.id; }
      if (r === 'exc' && await confirmar('Excluir orçamento', `Excluir ${esc(o.numero)}? Não dá para desfazer.`, 'Excluir')) {
        st.excluirOrcamento(o.id); toast('Orçamento excluído.'); location.hash = '#/orcamentos';
      }
    };

    // Ao sair: grava pendente e remove rascunho totalmente vazio
    limparTela = () => {
      clearTimeout(tSalvar);
      const atual = st.orcamento(o.id);
      if (!atual) return;
      if (st.orcamentoVazio(o)) st.excluirOrcamento(o.id); else if (sujo) st.salvarOrcamento(o);
    };

    // Recursos extras (js/telas-extras.js): margem, pagamentos, ferramentas, cargas, materiais, fotos
    Object.assign(ctxX, { o, app, salvar: agendarSalvar, redesenhar: () => { desenharItens(); desenharDeslocamento(); atualizarTotais(); }, guardarArquivo, desenharAnexos, desenharCircuitos });
    desenharItens(); desenharCircuitos(); desenharAnexos(); desenharDeslocamento();
    if (window.TelasExtras) window.TelasExtras.editor(ctxX);
    atualizarTotais(); atualizarPendencias();
  }

  /* ---------- Dimensionamento (NBR 5410) ----------
     Fórmulas editáveis em #/formulas (js/formulas.js). Os circuitos calculados
     ficam no orçamento e vão no PDF dele ou num memorial separado (de acordo). */
  const F = window.Formulas;

  function campoEntrada(en, val) {
    const v = val == null ? en.padrao : val;
    const rot = `${esc(en.rotulo || en.var)}${en.unidade ? ` <span class="muted">(${esc(en.unidade)})</span>` : ''}`;
    if (en.tipo === 'lista') {
      return `<div class="campo c3 m3"><label>${rot}</label><select data-e="${esc(en.var)}">${F.opcoes(en).map(op => `<option ${String(op) === String(v) ? 'selected' : ''}>${esc(op)}</option>`).join('')}</select></div>`;
    }
    const txt = typeof v === 'number' ? String(v).replace('.', ',') : String(v == null ? '' : v);
    return `<div class="campo c3 m3"><label>${rot}</label><input class="num" inputmode="decimal" data-e="${esc(en.var)}" value="${esc(txt)}"></div>`;
  }

  function htmlResultados(linhas) {
    const L = linhas.filter(l => l.tipo === 'calculo');
    if (!L.length) return `<div class="lista"><div class="vazio"><p>Nenhum cálculo no modelo.</p></div></div>`;
    return `<div class="lista">${L.map(l => `
      <div class="linha dim-l ${l.destaque ? 'dest' : ''} ${l.erro ? 'err' : ''}"><div class="principal">
        <div class="t1">${esc(l.rotulo)}</div>${l.erro ? `<div class="t2 dim-msg">${esc(l.valor.replace(/^Erro: /, ''))}</div>` : ''}</div>
        <div class="valor">${l.erro ? 'Erro' : `${esc(l.valor)}${l.unidade ? ' ' + esc(l.unidade) : ''}`}</div></div>`).join('')}</div>`;
  }

  // Formulário de cálculo (entradas + resultados ao vivo). entradas é alterado no lugar.
  function formCalculo(raiz, modelo, entradas) {
    (modelo.entradas || []).forEach(en => { if (entradas[en.var] == null) entradas[en.var] = en.padrao; });
    raiz.innerHTML = `
      <div class="card"><div class="campos">${(modelo.entradas || []).map(en => campoEntrada(en, entradas[en.var])).join('')}</div></div>
      <h2>Resultados</h2><div class="dim-res"></div>`;
    const desenhar = () => { raiz.querySelector('.dim-res').innerHTML = htmlResultados(F.linhas(modelo, entradas).linhas); };
    raiz.addEventListener('input', ev => { const k = ev.target.dataset.e; if (!k) return; entradas[k] = ev.target.value; desenhar(); });
    desenhar();
  }

  const avisoExemplo = m => m.exemplo ? `<div class="aviso">${ICON.alerta}<div><p><b>Fórmulas de exemplo, com valores fictícios</b></p>
    <p class="ajuda" style="margin:2px 0 0">Servem para conhecer a ferramenta. Antes de usar com clientes, troque pelas fórmulas e tabelas da sua planilha em <a href="#/formulas">Editar fórmulas</a>. O PDF sai marcado como exemplo.</p></div></div>` : '';

  let calcAtual = { nome: '', entradas: {} };
  function dimensionamento() {
    marcarAba('inicio');
    topo('Dimensionamento', { voltar: '#/inicio', acoes: `<a class="btn topo-btn" href="#/formulas">Fórmulas</a>` });
    const m = st.modeloDim();
    app.innerHTML = `
      ${avisoExemplo(m)}
      <div class="card"><div class="campos"><div class="campo"><label for="d-nome">Nome do circuito</label>
        <input id="d-nome" value="${esc(calcAtual.nome)}" placeholder="Ex.: Chuveiro do banheiro social"></div></div></div>
      <h2>Dados de entrada</h2>
      <div id="d-calc"></div>
      <div class="acoes">
        <button class="btn prim" id="d-salvar">${ICON.mais} Salvar em um orçamento</button>
        <button class="btn" id="d-limpar">Limpar</button>
      </div>
      <p class="ajuda">${esc(m.nome)} · versão ${esc(m.versao || 1)}</p>`;
    formCalculo(app.querySelector('#d-calc'), m, calcAtual.entradas);
    app.querySelector('#d-nome').addEventListener('input', ev => { calcAtual.nome = ev.target.value; });
    app.querySelector('#d-limpar').onclick = () => { calcAtual = { nome: '', entradas: {} }; dimensionamento(); };
    app.querySelector('#d-salvar').onclick = async () => {
      const lista = st.db.orcamentos.filter(o => o.status !== 'Recusado' && o.status !== 'Concluído');
      const destino = await dialogo({
        titulo: 'Salvar em qual orçamento?',
        corpo: `<div class="busca">${ICON.busca}<input type="search" id="do-q" placeholder="Buscar orçamento ou cliente"></div>
          <div class="lista" id="do-l">
            <button class="linha" data-o="novo">${ICON.mais}<div class="principal"><div class="t1">Novo orçamento</div></div></button>
            ${lista.map(o => { const c = st.cliente(o.clienteId); return `<button class="linha" data-o="${o.id}"><div class="principal"><div class="t1">${esc(c ? c.nome : 'Sem cliente')}</div><div class="t2">${esc(o.numero)}${o.titulo ? ' · ' + esc(o.titulo) : ''} · ${(o.circuitos || []).length} circuito(s)</div></div>${badge(o)}</button>`; }).join('')}
          </div>`,
        acoes: [],
        aoAbrir: (d, fechar) => {
          d.querySelector('#do-l').addEventListener('click', e => { const b = e.target.closest('[data-o]'); if (b) fechar(b.dataset.o); });
          d.querySelector('#do-q').addEventListener('input', e => { const t = e.target.value.toLowerCase(); d.querySelectorAll('#do-l [data-o]').forEach(b => { b.hidden = b.dataset.o !== 'novo' && !!t && !b.textContent.toLowerCase().includes(t); }); });
        }
      });
      if (!destino) return;
      const o = destino === 'novo' ? st.novoOrcamento('') : st.orcamento(destino);
      if (!o) return;
      o.circuitos = o.circuitos || [];
      o.circuitos.push(st.calcularCircuito(calcAtual.nome || `Circuito ${o.circuitos.length + 1}`, calcAtual.entradas));
      st.salvarOrcamento(o);
      calcAtual = { nome: '', entradas: {} };
      toast(`Circuito salvo em ${o.numero}.`);
      location.hash = '#/orcamento/' + o.id;
    };
  }

  /* Diálogo de circuito dentro do orçamento (novo ou edição). Retorna o circuito, 'excluir' ou null. */
  async function dialogoCircuito(circ, n, orc) {
    const m = st.modeloDim();
    let ligacao = circ && circ.ligacao ? circ.ligacao : 'auto';
    const opLig = orc ? st.opcoesLigacao(orc) : [];
    const entradas = { ...(circ ? circ.entradas : {}) };
    let nome = circ ? circ.nome : `Circuito ${n}`;
    const mudouModelo = circ && circ.modelo && (circ.modelo.versao !== m.versao || circ.modelo.nome !== m.nome);
    const r = await dialogo({
      titulo: circ ? 'Editar circuito' : 'Novo circuito',
      corpo: `${m.exemplo ? '<p class="ajuda" style="margin-top:0;color:var(--warn)"><b>Fórmulas de exemplo (fictícias).</b></p>' : ''}
        ${mudouModelo ? `<p class="ajuda" style="margin-top:0">Calculado com a versão ${esc(circ.modelo.versao)}. Ao salvar, será recalculado com as fórmulas atuais (versão ${esc(m.versao)}).</p>` : ''}
        <div class="campos" style="margin-bottom:12px">
          <div class="campo ${orc ? 'c4' : ''}"><label for="dc-nome">Nome do circuito</label><input id="dc-nome" value="${esc(nome)}"></div>
          ${orc ? `<div class="campo c2"><label for="dc-lig">Ligação (fases)</label><select id="dc-lig"><option value="auto">Automática</option>${[...new Set([...opLig, ...(ligacao !== 'auto' && !opLig.includes(ligacao) ? [ligacao] : [])])].map(v => `<option ${v === ligacao ? 'selected' : ''}>${v}</option>`).join('')}</select><span class="ajuda">Automática equilibra as fases; PE sempre incluso.</span></div>` : ''}
        </div>
        <div id="dc-calc"></div>`,
      acoes: [...(circ ? [{ rotulo: 'Excluir', classe: 'perigo', valor: 'excluir' }] : []), { rotulo: 'Cancelar', valor: null }, { rotulo: 'Salvar', classe: 'prim', valor: 'ok' }],
      aoAbrir: d => {
        d.classList.add('largo');
        formCalculo(d.querySelector('#dc-calc'), m, entradas);
        d.querySelector('#dc-nome').addEventListener('input', e => { nome = e.target.value; });
        const sl = d.querySelector('#dc-lig'); if (sl) sl.addEventListener('change', e => { ligacao = e.target.value; });
      }
    });
    if (r === 'excluir') return 'excluir';
    if (r !== 'ok') return null;
    const novo = st.calcularCircuito(nome, entradas, circ && circ.id);
    novo.ligacao = ligacao;
    return novo;
  }

  /* ---------- Editor de fórmulas ---------- */
  let rascModelo = null; // alterações não salvas (sobrevivem ao sair da tela)
  function formulas() {
    marcarAba('inicio');
    topo('Fórmulas', { voltar: '#/dimensionamento', acoes: `<button class="icon-btn" id="fm-mais" aria-label="Mais opções">${ICON.lista}</button>` });
    document.body.classList.add('com-barra');
    if (!rascModelo) rascModelo = { m: JSON.parse(JSON.stringify(st.modeloDim())), sujo: false };
    const R = rascModelo;
    const m = R.m;
    m.entradas = m.entradas || []; m.calculos = m.calculos || []; m.tabelas = m.tabelas || [];
    const sid = () => st.uid();
    const botoesOrdem = (sec, i, n) => `<span class="row" style="gap:2px">
      <button class="icon-btn" data-op="sobe" data-sec="${sec}" data-i="${i}" aria-label="Mover para cima" ${i === 0 ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg></button>
      <button class="icon-btn" data-op="desce" data-sec="${sec}" data-i="${i}" aria-label="Mover para baixo" ${i === n - 1 ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
      <button class="icon-btn" data-op="rem" data-sec="${sec}" data-i="${i}" aria-label="Remover">${ICON.lixo}</button></span>`;
    const ck = (sec, i, k, v, rot) => `<label class="check"><input type="checkbox" data-sec="${sec}" data-i="${i}" data-k="${k}" ${v ? 'checked' : ''}> ${rot}</label>`;

    const htmlEntradas = () => m.entradas.map((en, i) => `
      <div class="item">
        <div class="item-topo"><span class="n">ENTRADA ${i + 1} · <code>${esc(en.var)}</code></span>${botoesOrdem('entradas', i, m.entradas.length)}</div>
        <div class="campos">
          <div class="campo c4"><label>Nome exibido</label><input data-sec="entradas" data-i="${i}" data-k="rotulo" value="${esc(en.rotulo)}"></div>
          <div class="campo c2 m3"><label>Variável</label><input class="mono" data-sec="entradas" data-i="${i}" data-k="var" value="${esc(en.var)}" autocapitalize="off" spellcheck="false"></div>
          <div class="campo c2 m3"><label>Unidade</label><input data-sec="entradas" data-i="${i}" data-k="unidade" value="${esc(en.unidade)}"></div>
          <div class="campo c2 m3"><label>Tipo</label><select data-sec="entradas" data-i="${i}" data-k="tipo"><option value="numero" ${en.tipo !== 'lista' ? 'selected' : ''}>Número</option><option value="lista" ${en.tipo === 'lista' ? 'selected' : ''}>Lista</option></select></div>
          <div class="campo c2 m3"><label>Valor padrão</label><input data-sec="entradas" data-i="${i}" data-k="padrao" value="${esc(String(en.padrao == null ? '' : en.padrao).replace('.', ','))}"></div>
          <div class="campo ${en.tipo === 'lista' ? '' : 'oculto'}"><label>Opções (separe com ;)</label><input data-sec="entradas" data-i="${i}" data-k="opcoes" value="${esc(en.opcoes)}" placeholder="127;220;380"></div>
          <div class="campo">${ck('entradas', i, 'resumo', en.resumo, 'Mostrar no resumo do PDF')}</div>
        </div></div>`).join('') || '<p class="ajuda">Nenhuma entrada.</p>';

    const htmlCalculos = () => m.calculos.map((c, i) => `
      <div class="item">
        <div class="item-topo"><span class="n">CÁLCULO ${i + 1} · <code>${esc(c.var)}</code></span>${botoesOrdem('calculos', i, m.calculos.length)}</div>
        <div class="campos">
          <div class="campo c4"><label>Nome exibido</label><input data-sec="calculos" data-i="${i}" data-k="rotulo" value="${esc(c.rotulo)}"></div>
          <div class="campo c2 m3"><label>Variável</label><input class="mono" data-sec="calculos" data-i="${i}" data-k="var" value="${esc(c.var)}" autocapitalize="off" spellcheck="false"></div>
          <div class="campo c2 m3"><label>Unidade</label><input data-sec="calculos" data-i="${i}" data-k="unidade" value="${esc(c.unidade)}"></div>
          <div class="campo c2 m3"><label>Casas decimais</label><input type="number" min="0" max="6" inputmode="numeric" data-sec="calculos" data-i="${i}" data-k="casas" value="${esc(c.casas == null ? 2 : c.casas)}"></div>
          <div class="campo"><label>Fórmula</label><textarea class="mono" rows="2" data-sec="calculos" data-i="${i}" data-k="formula" autocapitalize="off" spellcheck="false">${esc(c.formula)}</textarea>
            <span class="ajuda fm-prev" data-prev="${i}"></span></div>
          <div class="campo">${ck('calculos', i, 'resumo', c.resumo, 'Resumo do PDF')} ${ck('calculos', i, 'destaque', c.destaque, 'Destacar')} ${ck('calculos', i, 'oculto', c.oculto, 'Não mostrar (cálculo auxiliar)')}</div>
        </div></div>`).join('') || '<p class="ajuda">Nenhum cálculo.</p>';

    const htmlTabelas = () => m.tabelas.map((t, i) => `
      <div class="item">
        <div class="item-topo"><span class="n">TABELA ${i + 1}</span>${botoesOrdem('tabelas', i, m.tabelas.length)}</div>
        <div class="campos">
          <div class="campo"><label>Nome da tabela</label><input class="mono" data-sec="tabelas" data-i="${i}" data-k="nome" value="${esc(t.nome)}" autocapitalize="off" spellcheck="false"></div>
          <div class="campo"><label>Dados (1ª linha = nomes das colunas; separe com ;)</label>
            <textarea class="mono" rows="${Math.min(12, (t.linhas || []).length + 2)}" data-sec="tabelas" data-i="${i}" data-k="dados" autocapitalize="off" spellcheck="false">${esc(F.tabelaParaTexto(t))}</textarea>
            <span class="ajuda" data-tinfo="${i}">${(t.linhas || []).length} linha(s) · colunas: ${esc((t.colunas || []).join(', '))}</span></div>
        </div></div>`).join('') || '<p class="ajuda">Nenhuma tabela.</p>';

    app.innerHTML = `
      <div id="fm-sujo"></div>
      <div class="card"><div class="campos">
        <div class="campo"><label for="fm-nome">Nome do modelo</label><input id="fm-nome" data-g="nome" value="${esc(m.nome)}"></div>
        <div class="campo"><label for="fm-crit">Critérios (aparece no PDF)</label><textarea id="fm-crit" data-g="criterios" rows="3">${esc(m.criterios)}</textarea></div>
        <div class="campo"><label class="check"><input type="checkbox" data-g="exemplo" ${m.exemplo ? 'checked' : ''}> Modelo de exemplo (marca o PDF como fictício)</label>
          <span class="ajuda">Versão atual: ${esc(m.versao || 1)}. Cada vez que salvar, a versão aumenta; circuitos já calculados guardam a versão usada.</span></div>
      </div></div>
      <details class="card" style="margin-top:12px"><summary><b>Como escrever as fórmulas</b></summary>
        <p class="ajuda">Igual ao Excel em português: argumentos separados por <b>;</b> e decimais com vírgula. Use os nomes das variáveis (entradas e cálculos anteriores). Os cálculos são feitos na ordem da lista.</p>
        <div class="lista">${F.AJUDA.map(([f, ex]) => `<div class="linha"><div class="principal"><div class="t1 mono" style="white-space:normal">${esc(f)}</div><div class="t2" style="white-space:normal">${esc(ex)}</div></div></div>`).join('')}</div>
      </details>
      <h2>Planilha de referência</h2>
      <div class="card" id="fm-plan"></div>
      <h2>Entradas</h2><div id="fm-entradas"></div>
      <div class="acoes"><button class="btn" data-add="entradas">${ICON.mais} Entrada</button></div>
      <h2>Cálculos</h2><p class="ajuda" style="margin-top:-4px">Abaixo de cada fórmula aparece o resultado com os valores padrão das entradas.</p><div id="fm-calculos"></div>
      <div class="acoes"><button class="btn" data-add="calculos">${ICON.mais} Cálculo</button></div>
      <h2>Tabelas</h2><div id="fm-tabelas"></div>
      <div class="acoes"><button class="btn" data-add="tabelas">${ICON.mais} Tabela</button></div>
      <div class="barra-total"><div class="in">
        <div class="tot"><div class="r">Modelo</div><div class="v" id="fm-st" style="font-size:14px"></div></div>
        <button class="btn" id="fm-desc">Descartar</button>
        <button class="btn prim" id="fm-salvar">Salvar</button>
      </div></div>`;

    /* Planilha Excel de dimensionamento: guardada neste aparelho (IndexedDB) como referência */
    const ID_PLAN = 'planilha-dimensionamento';
    function desenharPlanilha() {
      const pl = st.db.empresa.planilhaDim;
      app.querySelector('#fm-plan').innerHTML = `
        ${pl ? `<div class="row" style="gap:12px;margin-bottom:10px"><span class="ag-ic ok">${ICON.doc}</span><div style="flex:1;min-width:0"><div class="t1" style="font-weight:600;overflow-wrap:anywhere">${esc(pl.nome)}</div>
          <div class="ajuda" style="margin:0">${esc(window.Arquivos.tamanhoFmt(pl.tamanho))} · anexada em ${esc(st.dataBR(pl.em))}</div></div></div>` : '<p class="ajuda" style="margin-top:0">Nenhuma planilha anexada.</p>'}
        <div class="acoes" style="margin-top:0">
          <label class="btn ${pl ? '' : 'prim'}" style="${pl ? 'color:var(--text)' : ''}">${ICON.clipe} ${pl ? 'Trocar planilha' : 'Anexar planilha (.xlsx)'}<input type="file" id="fm-plan-arq" accept=".xlsx,.xlsm,.xls,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" hidden></label>
          ${pl ? `<button class="btn" type="button" id="fm-plan-abrir">${ICON.backup} Baixar</button><button class="btn perigo" type="button" id="fm-plan-rem">${ICON.lixo} Remover</button>` : ''}
        </div>
        <p class="ajuda">A planilha fica guardada neste aparelho como referência das fórmulas (não vai para a nuvem nem para o backup). As fórmulas usadas nos cálculos são as desta tela.</p>`;
    }
    app.querySelector('#fm-plan').addEventListener('change', async ev => {
      if (ev.target.id !== 'fm-plan-arq') return;
      const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
      if (f.size > 25 * 1048576) { toast('Planilha maior que 25 MB.'); return; }
      try { await window.Arquivos.salvar(ID_PLAN, f); } catch (e) { toast('Não foi possível guardar: armazenamento cheio.'); return; }
      st.salvarEmpresa({ planilhaDim: { nome: f.name, tamanho: f.size, em: st.hoje() } });
      toast('Planilha anexada.'); desenharPlanilha();
    });
    app.querySelector('#fm-plan').addEventListener('click', async ev => {
      if (ev.target.closest('#fm-plan-abrir')) {
        const b = await window.Arquivos.obter(ID_PLAN);
        if (!b) { toast('A planilha não está neste aparelho (foi anexada em outro).'); return; }
        window.WhatsApp.baixar(b, st.db.empresa.planilhaDim.nome);
      }
      if (ev.target.closest('#fm-plan-rem') && await confirmar('Remover planilha', 'Remover a planilha anexada? As fórmulas desta tela não mudam.', 'Remover')) {
        await window.Arquivos.excluir(ID_PLAN); st.salvarEmpresa({ planilhaDim: null }); desenharPlanilha();
      }
    });
    desenharPlanilha();

    const secs = { entradas: htmlEntradas, calculos: htmlCalculos, tabelas: htmlTabelas };
    const desenharSec = sec => { app.querySelector('#fm-' + sec).innerHTML = secs[sec](); };
    function estado() {
      app.querySelector('#fm-st').textContent = R.sujo ? 'Alterações não salvas' : 'Salvo';
      app.querySelector('#fm-desc').disabled = !R.sujo;
      app.querySelector('#fm-sujo').innerHTML = R.sujo ? `<div class="aviso info">${ICON.info}<div><p>As alterações só valem para novos cálculos depois de <b>Salvar</b>.</p></div></div>` : '';
    }
    function previas() {
      const r = F.calcular(m, {});
      m.calculos.forEach((c, i) => {
        const el = app.querySelector(`[data-prev="${i}"]`); if (!el) return;
        const v = r.valores[F.chave(c.var)];
        el.classList.toggle('erro-txt', v instanceof Error);
        el.textContent = v instanceof Error ? 'Erro: ' + v.message : `= ${F.fmt(v, c.casas)}${c.unidade ? ' ' + c.unidade : ''}`;
      });
    }
    const sujar = () => { R.sujo = true; estado(); };
    Object.keys(secs).forEach(desenharSec); previas(); estado();

    app.addEventListener('input', ev => {
      const el = ev.target;
      if (el.dataset.g) { m[el.dataset.g] = el.type === 'checkbox' ? el.checked : el.value; sujar(); return; }
      const sec = el.dataset.sec; if (!sec || el.dataset.op) return;
      const i = Number(el.dataset.i), k = el.dataset.k, x = m[sec][i];
      if (el.type === 'checkbox') x[k] = el.checked;
      else if (sec === 'tabelas' && k === 'dados') { const t = F.textoParaTabela(x.nome, el.value); x.colunas = t.colunas; x.linhas = t.linhas;
        const inf = app.querySelector(`[data-tinfo="${i}"]`); if (inf) inf.textContent = `${t.linhas.length} linha(s) · colunas: ${t.colunas.join(', ')}`; }
      else if (k === 'padrao' && x.tipo !== 'lista') { const n = F.valorEntrada({ tipo: 'numero' }, el.value); x.padrao = isFinite(n) ? n : el.value; }
      else if (k === 'casas') x.casas = parseInt(el.value, 10) || 0;
      else x[k] = el.value;
      if (k === 'tipo') desenharSec('entradas');
      if (k === 'var') { const t = el.closest('.item').querySelector('code'); if (t) t.textContent = el.value; }
      sujar(); previas();
    });
    app.addEventListener('click', async ev => {
      const add = ev.target.closest('[data-add]');
      if (add) {
        const sec = add.dataset.add;
        if (sec === 'entradas') m.entradas.push({ id: sid(), var: `entrada${m.entradas.length + 1}`, rotulo: 'Nova entrada', unidade: '', tipo: 'numero', padrao: 0, opcoes: '' });
        if (sec === 'calculos') m.calculos.push({ id: sid(), var: `calculo${m.calculos.length + 1}`, rotulo: 'Novo cálculo', unidade: '', formula: '0', casas: 2 });
        if (sec === 'tabelas') m.tabelas.push({ id: sid(), nome: `tabela${m.tabelas.length + 1}`, colunas: ['chave', 'valor'], linhas: [[1, 1]] });
        desenharSec(sec); previas(); sujar();
        const ult = app.querySelector(`#fm-${sec} .item:last-child input`); if (ult) { ult.focus(); ult.scrollIntoView({ block: 'center' }); }
        return;
      }
      const b = ev.target.closest('[data-op]'); if (!b) return;
      const sec = b.dataset.sec, i = Number(b.dataset.i), L = m[sec];
      if (b.dataset.op === 'rem') { if (!(await confirmar('Remover', `Remover "${esc(L[i].rotulo || L[i].nome || L[i].var)}"?`, 'Remover'))) return; L.splice(i, 1); }
      if (b.dataset.op === 'sobe' && i > 0) [L[i - 1], L[i]] = [L[i], L[i - 1]];
      if (b.dataset.op === 'desce' && i < L.length - 1) [L[i + 1], L[i]] = [L[i], L[i + 1]];
      desenharSec(sec); previas(); sujar();
    });

    app.querySelector('#fm-desc').onclick = async () => {
      if (!(await confirmar('Descartar alterações', 'Voltar para as fórmulas salvas?', 'Descartar'))) return;
      rascModelo = null; formulas();
    };
    app.querySelector('#fm-salvar').onclick = async () => {
      const prob = F.validar(m);
      if (prob.length) {
        await dialogo({ titulo: 'Corrija antes de salvar', corpo: `<ul style="margin:0;padding-left:18px">${prob.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` });
        return;
      }
      const erros = F.calcular(m, {}).erros;
      if (erros.length && !(await dialogo({
        titulo: 'Há cálculos com erro',
        corpo: `<p style="margin-top:0">Com os valores padrão das entradas:</p><ul style="padding-left:18px">${erros.map(x => `<li><b>${esc(x.var)}</b>: ${esc(x.msg)}</li>`).join('')}</ul>`,
        acoes: [{ rotulo: 'Corrigir', valor: false }, { rotulo: 'Salvar mesmo assim', classe: 'prim', valor: true }]
      }))) return;
      m.versao = (Number(st.modeloDim().versao) || 0) + 1;
      st.salvarModeloDim(JSON.parse(JSON.stringify(m)));
      rascModelo = null;
      toast(`Fórmulas salvas (versão ${m.versao}).`);
      formulas();
    };
    document.getElementById('fm-mais').onclick = async () => {
      const r = await dialogo({
        titulo: 'Modelo de fórmulas',
        corpo: `<div class="lista">
          <button class="linha" data-op2="exp">${ICON.backup}<div class="principal"><div class="t1">Exportar modelo</div><div class="t2">Arquivo .json para guardar ou usar em outro aparelho</div></div></button>
          <label class="linha" style="cursor:pointer">${ICON.doc}<div class="principal"><div class="t1">Importar modelo</div><div class="t2">Substitui as fórmulas da tela (depois toque em Salvar)</div></div><input type="file" id="fm-imp" accept=".json,application/json,text/plain" hidden></label>
          <button class="linha" data-op2="pad" style="color:var(--danger)">${ICON.lixo}<div class="principal"><div class="t1">Voltar ao modelo de exemplo</div></div></button>
        </div>`,
        acoes: [],
        aoAbrir: (d, fechar) => {
          d.querySelector('.lista').addEventListener('click', e => { const b = e.target.closest('[data-op2]'); if (b) fechar(b.dataset.op2); });
          d.querySelector('#fm-imp').addEventListener('change', async e => { const f = e.target.files[0]; if (f) fechar({ arquivo: f }); });
        }
      });
      if (r === 'exp') {
        const nomeArq = `modelo-dimensionamento-v${m.versao || 1}.json`;
        window.WhatsApp.baixar(new Blob([JSON.stringify({ app: 'orcamentos-pwa', tipo: 'modelo-dimensionamento', modelo: m }, null, 2)], { type: 'application/json' }), nomeArq);
      } else if (r === 'pad') {
        if (!(await confirmar('Modelo de exemplo', 'Trocar as fórmulas da tela pelo modelo de exemplo? Só vale depois de Salvar.', 'Trocar'))) return;
        rascModelo = { m: F.modeloPadrao(), sujo: true }; rascModelo.m.versao = st.modeloDim().versao; formulas();
      } else if (r && r.arquivo) {
        try {
          const j = JSON.parse(await r.arquivo.text());
          const nm = j.modelo || j;
          if (!Array.isArray(nm.calculos) || !Array.isArray(nm.entradas)) throw new Error();
          nm.tabelas = nm.tabelas || []; nm.versao = st.modeloDim().versao;
          rascModelo = { m: nm, sujo: true }; formulas(); toast('Modelo importado. Confira e toque em Salvar.');
        } catch (e) { toast('Arquivo não é um modelo de dimensionamento.'); }
      }
    };
  }

  /* ---------- Relatórios ---------- */

  const STATUS_REL = ['Rascunho', 'Enviado', 'Vencido', 'Aprovado', 'Concluído', 'Recusado'];
  const PERIODOS = [
    ['mes', 'Este mês'], ['mesPassado', 'Mês passado'], ['30', 'Últimos 30 dias'], ['90', 'Últimos 90 dias'],
    ['ano', 'Este ano'], ['prox7', 'Próximos 7 dias'], ['prox30', 'Próximos 30 dias'], ['tudo', 'Todo o período'], ['pers', 'Personalizado']
  ];
  const BASES = [['data', 'Emissão'], ['inicio', 'Início previsto'], ['validade', 'Validade']];
  const filtroRelPadrao = () => ({ periodo: 'mes', de: '', ate: '', base: 'data', status: [], cliente: '', busca: '' });
  let filtroRel = filtroRelPadrao();

  function intervalo(f) {
    const h = st.hoje(), [a, m] = h.split('-').map(Number);
    const ultimoDia = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const mm = n => String(n).padStart(2, '0');
    switch (f.periodo) {
      case 'mes': return [`${a}-${mm(m)}-01`, `${a}-${mm(m)}-${ultimoDia(a, m)}`];
      case 'mesPassado': { const am = m === 1 ? a - 1 : a, mp = m === 1 ? 12 : m - 1; return [`${am}-${mm(mp)}-01`, `${am}-${mm(mp)}-${ultimoDia(am, mp)}`]; }
      case '30': return [st.somarDias(h, -29), h];
      case '90': return [st.somarDias(h, -89), h];
      case 'ano': return [`${a}-01-01`, `${a}-12-31`];
      case 'prox7': return [h, st.somarDias(h, 7)];
      case 'prox30': return [h, st.somarDias(h, 30)];
      case 'pers': return [f.de || '', f.ate || ''];
      default: return ['', ''];
    }
  }
  const dataBase = (o, base) => base === 'inicio' ? (o.dataInicio || '') : base === 'validade' ? st.validadeAte(o) : (o.data || '');

  function filtrarRel(f) {
    const [de, ate] = intervalo(f);
    const termo = f.busca.trim().toLowerCase();
    return st.db.orcamentos.filter(o => {
      if (f.status.length && !f.status.includes(st.statusExibido(o))) return false;
      if (f.cliente && o.clienteId !== f.cliente) return false;
      if (de || ate) {
        const d = dataBase(o, f.base);
        if (!d || (de && d < de) || (ate && d > ate)) return false;
      }
      if (termo) {
        const c = st.cliente(o.clienteId);
        if (![o.numero, o.titulo, c && c.nome].join(' ').toLowerCase().includes(termo)) return false;
      }
      return true;
    }).sort((x, y) => String(dataBase(x, f.base) || '9999').localeCompare(String(dataBase(y, f.base) || '9999')) * (f.base === 'data' ? -1 : 1));
  }

  function aplicarVisao(v) {
    const f = filtroRelPadrao();
    if (v === 'avencer') Object.assign(f, { periodo: 'prox7', base: 'validade', status: ['Enviado'] });
    else if (v === 'executar') Object.assign(f, { periodo: 'tudo', base: 'inicio', status: ['Aprovado'] });
    else if (v === 'atrasados') Object.assign(f, { periodo: 'pers', base: 'inicio', status: ['Aprovado'], de: '', ate: st.somarDias(st.hoje(), -1) });
    else if (v === 'vencidos') Object.assign(f, { periodo: 'tudo', base: 'validade', status: ['Vencido'] });
    else return;
    filtroRel = f;
  }

  function relatorios() {
    marcarAba('relatorios');
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    if (params.get('visao')) { aplicarVisao(params.get('visao')); history.replaceState(null, '', '#/relatorios'); }
    topo('Relatórios', { acoes: `<button class="icon-btn" id="csv" aria-label="Exportar planilha (CSV)" title="Exportar planilha (CSV)">${ICON.backup}</button>` });
    const f = filtroRel;
    const clientesOrd = [...st.db.clientes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    app.innerHTML = `
      <details class="card filtros" id="flt" open>
        <summary>${ICON.filtro}<span>Filtros</span><span class="muted" id="flt-res"></span></summary>
        <div class="campos" style="margin-top:12px">
          <div class="campo c3 m3"><label for="r-per">Período</label><select id="r-per" data-r="periodo">${PERIODOS.map(([v, r]) => `<option value="${v}" ${v === f.periodo ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
          <div class="campo c3 m3"><label for="r-base">Considerar a data de</label><select id="r-base" data-r="base">${BASES.map(([v, r]) => `<option value="${v}" ${v === f.base ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
          <div class="campo c3 m3 r-pers"><label for="r-de">De</label><input id="r-de" type="date" data-r="de" value="${esc(f.de)}"></div>
          <div class="campo c3 m3 r-pers"><label for="r-ate">Até</label><input id="r-ate" type="date" data-r="ate" value="${esc(f.ate)}"></div>
          <div class="campo c3"><label for="r-cli">Cliente</label><select id="r-cli" data-r="cliente"><option value="">Todos os clientes</option>${clientesOrd.map(c => `<option value="${c.id}" ${c.id === f.cliente ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div>
          <div class="campo c3"><label for="r-q">Buscar</label><input id="r-q" type="search" data-r="busca" value="${esc(f.busca)}" placeholder="Número, título ou cliente"></div>
          <div class="campo"><span class="label">Status</span>
            <div class="chips multi" id="r-st"><button type="button" class="chip" data-s="">Todos</button>${STATUS_REL.map(s => `<button type="button" class="chip" data-s="${s}">${s}</button>`).join('')}</div></div>
          <div class="campo"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
            <span class="ajuda" id="r-int"></span>
            <button class="btn" type="button" id="r-limpar">Limpar filtros</button></div></div>
        </div>
      </details>
      <div class="chips" id="r-atalhos">
        <button class="chip" data-v="avencer">A vencer (7 dias)</button>
        <button class="chip" data-v="vencidos">Vencidos</button>
        <button class="chip" data-v="executar">A executar</button>
        <button class="chip" data-v="atrasados">Início atrasado</button>
      </div>
      <div id="r-out"></div>`;

    const out = app.querySelector('#r-out');
    function desenhar() {
      const [de, ate] = intervalo(f);
      app.querySelectorAll('.r-pers').forEach(el => { el.hidden = f.periodo !== 'pers'; });
      app.querySelectorAll('#r-st .chip').forEach(c => c.classList.toggle('ativo', c.dataset.s ? f.status.includes(c.dataset.s) : !f.status.length));
      const nomeBase = BASES.find(b => b[0] === f.base)[1].toLowerCase();
      app.querySelector('#r-int').textContent = (de || ate)
        ? `Data de ${nomeBase}: ${de ? st.dataBR(de) : 'início'} a ${ate ? st.dataBR(ate) : 'hoje em diante'}`
        : 'Sem limite de datas';
      const l = filtrarRel(f);
      app.querySelector('#flt-res').textContent = `${l.length} orçamento(s)`;

      if (!l.length) { out.innerHTML = `<div class="lista"><div class="vazio">${ICON.filtro}<p>Nenhum orçamento com estes filtros.</p></div></div>`; return; }
      const tot = o => st.totais(o).total;
      const soma = x => x.reduce((s, o) => s + tot(o), 0);
      const aprov = l.filter(o => o.status === 'Aprovado' || o.status === 'Concluído');
      const recus = l.filter(o => o.status === 'Recusado');
      const taxa = aprov.length + recus.length ? Math.round(aprov.length / (aprov.length + recus.length) * 100) + '%' : '-';
      const total = soma(l);

      // Por status
      const porStatus = STATUS_REL.map(s => { const x = l.filter(o => st.statusExibido(o) === s); return { s, n: x.length, v: soma(x) }; }).filter(x => x.n);
      const maxSt = Math.max(...porStatus.map(x => x.v), 1);
      // Por tipo de item (valor bruto, antes do desconto)
      const porTipo = st.TIPOS_ITEM.map(t => ({ t, v: l.reduce((s, o) => s + o.itens.filter(i => i.tipo === t).reduce((a, i) => a + st.num(i.qtd) * st.num(i.valor), 0), 0) })).filter(x => x.v > 0);
      const maxTipo = Math.max(...porTipo.map(x => x.v), 1);
      // Clientes
      const mapaCli = new Map();
      l.forEach(o => { const k = o.clienteId || ''; const r = mapaCli.get(k) || { n: 0, v: 0 }; r.n++; r.v += tot(o); mapaCli.set(k, r); });
      const topCli = [...mapaCli.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 5);

      const dataLinha = o => {
        if (f.base === 'inicio') return o.dataInicio ? `Início ${st.dataBR(o.dataInicio)}` : 'Sem data de início';
        if (f.base === 'validade') return `Validade ${st.dataBR(st.validadeAte(o))}`;
        return st.dataBR(o.data);
      };
      const barra = (v, max) => `<div class="barra"><span style="width:${Math.max(2, Math.round(v / max * 100))}%"></span></div>`;

      out.innerHTML = `
        <div class="stats">
          <div class="stat"><div class="rot">Orçamentos</div><div class="num">${l.length}</div></div>
          <div class="stat"><div class="rot">Valor total</div><div class="num">${st.brl(total)}</div></div>
          <div class="stat"><div class="rot">Aprovados e concluídos</div><div class="num">${st.brl(soma(aprov))}</div></div>
          <div class="stat"><div class="rot">Taxa de aprovação</div><div class="num">${taxa}</div></div>
          <div class="stat"><div class="rot">Ticket médio</div><div class="num">${st.brl(total / l.length)}</div></div>
          <div class="stat"><div class="rot">Recebido</div><div class="num">${st.brl(l.reduce((s2, o) => s2 + window.Extras.pago(o), 0))}</div></div>
          <div class="stat"><div class="rot">Lucro estimado (aprovados)</div><div class="num">${st.brl(aprov.reduce((s2, o) => s2 + window.Extras.margem(o).lucro, 0))}</div></div>
          <div class="stat"><div class="rot">Aguardando resposta</div><div class="num">${st.brl(soma(l.filter(o => st.statusExibido(o) === 'Enviado')))}</div></div>
        </div>

        <h2>Por status</h2>
        <div class="card tabela-rel">${porStatus.map(x => `
          <div class="tr-linha"><div class="tr-rot">${badgeStatus(x.s)} <span class="muted">${x.n}</span></div>
            <div class="tr-val">${st.brl(x.v)}</div>${barra(x.v, maxSt)}</div>`).join('')}</div>

        ${porTipo.length ? `<h2>Por tipo de item</h2>
        <div class="card tabela-rel">${porTipo.map(x => `
          <div class="tr-linha"><div class="tr-rot">${esc(x.t)}</div><div class="tr-val">${st.brl(x.v)}</div>${barra(x.v, maxTipo)}</div>`).join('')}
          <p class="ajuda" style="margin:8px 0 0">Soma dos itens antes do desconto.</p></div>` : ''}

        ${!f.cliente ? `<h2>Principais clientes</h2>
        <div class="lista">${topCli.map(([id, r]) => { const c = st.cliente(id); return `
          <${c ? `a href="#/cliente/${c.id}"` : 'div class="linha"'}><div class="principal"><div class="t1">${esc(c ? c.nome : 'Sem cliente')}</div><div class="t2">${r.n} orçamento(s)</div></div>
          <div class="valor">${st.brl(r.v)}</div></${c ? 'a' : 'div'}>`; }).join('')}</div>` : ''}

        <h2>Orçamentos (${l.length})</h2>
        ${listaOrcamentos(l, dataLinha)}`;
    }

    const flt = app.querySelector('#flt');
    if (window.innerWidth < 600 && (f.periodo !== 'mes' || f.status.length || f.cliente || f.busca || f.base !== 'data')) flt.open = true;
    else if (window.innerWidth < 600) flt.open = false;
    flt.addEventListener('input', ev => {
      const k = ev.target.dataset.r; if (!k) return;
      f[k] = ev.target.value;
      if (k === 'periodo' && f.periodo === 'pers' && !f.de && !f.ate) { const [d, a] = intervalo({ periodo: 'mes' }); f.de = d; f.ate = a; app.querySelector('#r-de').value = d; app.querySelector('#r-ate').value = a; }
      desenhar();
    });
    app.querySelector('#r-st').addEventListener('click', ev => {
      const b = ev.target.closest('.chip'); if (!b) return;
      const s = b.dataset.s;
      if (!s) f.status = [];
      else f.status = f.status.includes(s) ? f.status.filter(x => x !== s) : [...f.status, s];
      desenhar();
    });
    app.querySelector('#r-atalhos').addEventListener('click', ev => {
      const b = ev.target.closest('.chip'); if (!b) return;
      aplicarVisao(b.dataset.v); relatorios();
    });
    app.querySelector('#r-limpar').onclick = () => { filtroRel = filtroRelPadrao(); relatorios(); };
    document.getElementById('csv').onclick = () => exportarCSV(filtrarRel(f));
    desenhar();
  }

  function exportarCSV(lista) {
    if (!lista.length) { toast('Nenhum orçamento para exportar.'); return; }
    const cel = v => { const t = String(v == null ? '' : v); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    const cab = ['Número', 'Cliente', 'Título', 'Emissão', 'Validade', 'Início previsto', 'Status', 'Subtotal', 'Desconto', 'Total'];
    const linhas = lista.map(o => {
      const c = st.cliente(o.clienteId), t = st.totais(o);
      return [o.numero, c ? c.nome : '', o.titulo, st.dataBR(o.data), st.dataBR(st.validadeAte(o)), st.dataBR(o.dataInicio), st.statusExibido(o), st.dec(t.subtotal), st.dec(t.desconto), st.dec(t.total)];
    });
    const csv = '﻿' + [cab, ...linhas].map(l => l.map(cel).join(';')).join('\r\n');
    window.WhatsApp.baixar(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `relatorio-orcamentos-${st.hoje()}.csv`);
    toast(`Planilha com ${lista.length} orçamento(s) baixada.`);
  }

  /* ---------- Clientes ---------- */
  function clientes() {
    marcarAba('clientes');
    topo('Clientes');
    app.innerHTML = `
      <div class="busca">${ICON.busca}<input type="search" id="q" placeholder="Buscar por nome, telefone ou cidade" aria-label="Buscar"></div>
      <div class="acoes" style="margin:0 0 12px"><button class="btn" id="importar" type="button">${ICON.pessoas} Importar contatos</button></div>
      <div id="res"></div>
      <a class="fab" href="#/cliente/novo">${ICON.mais} Novo</a>`;
    app.querySelector('#importar').onclick = importarContatos;
    const q = app.querySelector('#q');
    const atualizar = () => {
      const t = q.value.trim().toLowerCase();
      const l = [...st.db.clientes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .filter(c => !t || [c.nome, c.telefone, st.soDigitos(c.telefone), c.cidade, c.email].join(' ').toLowerCase().includes(t));
      app.querySelector('#res').innerHTML = l.length ? `<div class="lista">${l.map(c => {
        const n = st.db.orcamentos.filter(o => o.clienteId === c.id).length;
        return `<a href="#/cliente/${c.id}"><div class="principal"><div class="t1">${esc(c.nome)}</div>
          <div class="t2">${esc(st.telefoneFmt(c.telefone) || 'sem telefone')}${c.cidade ? ' · ' + esc(c.cidade) : ''}</div></div>
          <div class="muted" style="font-size:13px">${n} orç.</div></a>`;
      }).join('')}</div>` : `<div class="lista"><div class="vazio">${ICON.pessoas}<p>${t ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}</p></div></div>`;
    };
    q.addEventListener('input', atualizar);
    atualizar();
  }

  /* ---------- Importar contatos ---------- */
  async function importarContatos() {
    const C = window.Contatos;
    const agenda = C.suportaAgenda();
    const origem = await dialogo({
      titulo: 'Importar contatos',
      corpo: `${agenda ? `<button class="btn prim bloco" type="button" id="ic-agenda">${ICON.pessoas} Escolher na agenda do celular</button>
          <p class="ajuda">Abre a sua agenda: marque os clientes e confirme. O app só recebe os contatos que você escolher.</p><div class="sep"></div>` : ''}
        <label class="btn bloco" style="color:var(--text)">Importar arquivo de contatos (.vcf)<input type="file" id="ic-arq" accept=".vcf,text/vcard,text/x-vcard" hidden></label>
        <details class="ajuda" style="margin-top:10px"><summary>Como gerar o arquivo .vcf</summary>
          <ul style="padding-left:18px;margin:6px 0 0">
            <li><b>Android:</b> app Contatos → ☰ ou ⋮ → <i>Corrigir e gerenciar</i> → <i>Exportar para arquivo</i>.</li>
            <li><b>iPhone:</b> app Contatos → <i>Listas</i> → toque e segure em <i>Todos os contatos</i> → <i>Exportar</i>.</li>
            <li><b>Computador:</b> contacts.google.com → <i>Exportar</i> → <i>vCard</i>.</li>
          </ul></details>
        ${agenda ? '' : '<p class="ajuda">Neste navegador não dá para abrir a agenda direto (só o Chrome no Android permite). Use o arquivo .vcf.</p>'}
        <p class="ajuda" id="ic-erro" style="color:var(--danger)"></p>`,
      acoes: [],
      aoAbrir: (d, fechar) => {
        const b = d.querySelector('#ic-agenda');
        if (b) b.onclick = async () => {
          try { const l = await C.escolherDaAgenda(); if (l.length) fechar({ lista: l, daAgenda: true }); }
          catch (e) { d.querySelector('#ic-erro').textContent = 'Não foi possível abrir a agenda: ' + (e.message || e); }
        };
        d.querySelector('#ic-arq').addEventListener('change', async ev => {
          const f = ev.target.files[0]; if (!f) return;
          try {
            const l = C.lerVcf(await f.text());
            if (!l.length) { d.querySelector('#ic-erro').textContent = 'Nenhum contato encontrado neste arquivo.'; return; }
            fechar({ lista: l, daAgenda: false });
          } catch (e) { d.querySelector('#ic-erro').textContent = 'Arquivo inválido.'; }
        });
      }
    });
    if (!origem) return;

    const itens = C.marcarDuplicados(origem.lista);
    const novos = itens.filter(i => !i.existe && !i.repetido).length;
    const jaTem = itens.length - novos;
    // Da agenda: o usuário já escolheu, vem marcado. Do arquivo (agenda inteira): vem desmarcado.
    const marcadoPadrao = i => origem.daAgenda && !i.existe && !i.repetido;
    let escolhidos = [];
    const r = await dialogo({
      titulo: `${itens.length} contato(s) encontrado(s)`,
      corpo: `<p class="ajuda" style="margin-top:0">${jaTem ? `${jaTem} já cadastrado(s) ou repetido(s), desmarcado(s). ` : ''}Marque só quem é cliente.</p>
        <div class="busca">${ICON.busca}<input type="search" id="ic-q" placeholder="Buscar contato"></div>
        <div class="row" style="justify-content:space-between;margin-bottom:8px">
          <span class="ajuda" id="ic-n"></span>
          <span><button class="chip" type="button" id="ic-todos">Marcar visíveis</button> <button class="chip" type="button" id="ic-nenhum">Desmarcar</button></span>
        </div>
        <div class="lista" id="ic-lista">${itens.map((i, n) => `
          <label class="linha" data-i="${n}" style="cursor:pointer"><input type="checkbox" value="${n}" ${marcadoPadrao(i) ? 'checked' : ''} style="width:20px;min-height:20px">
            <div class="principal"><div class="t1">${esc(i.nome || st.telefoneFmt(i.telefone))}</div>
            <div class="t2">${i.telefone ? esc(st.telefoneFmt(i.telefone)) : 'sem telefone'}${i.cidade ? ' · ' + esc(i.cidade) : ''}</div></div>
            ${i.existe ? '<span class="badge b-rascunho">já cadastrado</span>' : i.repetido ? '<span class="badge b-rascunho">repetido</span>' : !i.telefone ? '<span class="badge b-vencido">sem telefone</span>' : ''}
          </label>`).join('')}</div>`,
      acoes: [{ rotulo: 'Cancelar', valor: null }, {
        rotulo: 'Importar', classe: 'prim', valor: 'ok',
        antes: d => {
          escolhidos = [...d.querySelectorAll('#ic-lista input:checked')].map(x => itens[Number(x.value)]);
          if (!escolhidos.length) { toast('Marque pelo menos um contato.'); return false; }
          return true;
        }
      }],
      aoAbrir: d => {
        const contar = () => {
          const n = d.querySelectorAll('#ic-lista input:checked').length;
          d.querySelector('#ic-n').textContent = `${n} marcado(s)`;
          const b = [...d.querySelectorAll('.dlg-rod .btn')].pop(); if (b) b.textContent = n ? `Importar ${n}` : 'Importar';
        };
        d.querySelector('#ic-lista').addEventListener('change', contar);
        d.querySelector('#ic-q').addEventListener('input', e => {
          const t = e.target.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
          d.querySelectorAll('#ic-lista .linha').forEach(l => { l.hidden = !!t && !l.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(t); });
        });
        d.querySelector('#ic-todos').onclick = () => { d.querySelectorAll('#ic-lista .linha:not([hidden]) input').forEach(x => { x.checked = true; }); contar(); };
        d.querySelector('#ic-nenhum').onclick = () => { d.querySelectorAll('#ic-lista input').forEach(x => { x.checked = false; }); contar(); };
        contar();
      }
    });
    if (r !== 'ok') return;
    const n = st.adicionarClientes(escolhidos.map(i => ({
      nome: i.nome || st.telefoneFmt(i.telefone), telefone: i.telefone, email: i.email || '',
      documento: '', tipoImovel: '', endereco: i.endereco || '', cidade: i.cidade || '', observacoes: i.observacoes || ''
    })));
    const semTel = escolhidos.filter(i => !i.telefone).length;
    toast(`${n} cliente(s) importado(s).${semTel ? ` ${semTel} sem telefone: complete antes de enviar orçamentos.` : ''}`);
    clientes();
  }

  function camposCliente(c) {
    const opt = (l, s) => l.map(v => `<option ${v === s ? 'selected' : ''}>${esc(v)}</option>`).join('');
    return `<div class="campos">
      <div class="campo"><label for="c-nome">Nome completo <span class="obrig">*</span></label><input id="c-nome" data-f="nome" value="${esc(c.nome)}" autocomplete="name" required></div>
      <div class="campo c3"><label for="c-tel">WhatsApp com DDD <span class="obrig">*</span></label><input id="c-tel" data-f="telefone" type="tel" inputmode="tel" value="${esc(st.telefoneFmt(c.telefone))}" placeholder="(11) 98765-4321" autocomplete="tel"><span class="ajuda">O PDF e as mensagens vão para este número.</span></div>
      <div class="campo c3"><label for="c-email">E-mail</label><input id="c-email" data-f="email" type="email" value="${esc(c.email)}" autocomplete="email"></div>
      <div class="campo c3"><label for="c-doc">CPF / CNPJ</label><input id="c-doc" data-f="documento" value="${esc(c.documento)}" inputmode="numeric"></div>
      <div class="campo c3"><label for="c-tipo">Tipo de imóvel</label><select id="c-tipo" data-f="tipoImovel"><option value="">-</option>${opt(st.TIPOS_IMOVEL, c.tipoImovel)}</select></div>
      <div class="campo c4"><label for="c-end">Endereço da instalação</label><input id="c-end" data-f="endereco" value="${esc(c.endereco)}" placeholder="Rua, número, complemento, bairro" autocomplete="street-address"></div>
      <div class="campo c2"><label for="c-cid">Cidade / UF</label><input id="c-cid" data-f="cidade" value="${esc(c.cidade)}"></div>
      <div class="campo"><label for="c-obs">Observações</label><textarea id="c-obs" data-f="observacoes" placeholder="Ex.: melhor horário para visita, acesso à caixa-d'água…">${esc(c.observacoes)}</textarea></div>
    </div>`;
  }

  function validarCliente(raiz) {
    const v = lerCampos(raiz);
    let ok = true;
    const nome = raiz.querySelector('[data-f="nome"]'), tel = raiz.querySelector('[data-f="telefone"]');
    nome.classList.toggle('invalido', !v.nome.trim());
    tel.classList.toggle('invalido', !st.telefoneValido(v.telefone));
    if (!v.nome.trim()) { ok = false; toast('Informe o nome do cliente.'); }
    else if (!st.telefoneValido(v.telefone)) { ok = false; toast('Informe o WhatsApp com DDD, ex.: (11) 98765-4321.'); }
    return ok ? v : null;
  }

  async function dialogoCliente() {
    let dados = null;
    await dialogo({
      titulo: 'Novo cliente',
      corpo: camposCliente({}),
      acoes: [{ rotulo: 'Cancelar', valor: null }, {
        rotulo: 'Salvar cliente', classe: 'prim', valor: 'ok',
        antes: d => { dados = validarCliente(d); return !!dados; }
      }]
    });
    if (!dados) return null;
    dados.telefone = st.soDigitos(dados.telefone);
    dados.nome = dados.nome.trim();
    const c = st.salvarCliente(dados);
    toast('Cliente salvo.');
    return c;
  }

  function formCliente(id) {
    marcarAba('clientes');
    const novo = id === 'novo';
    const c = novo ? {} : st.cliente(id);
    if (!c) { topo('Cliente', { voltar: '#/clientes' }); app.innerHTML = '<div class="vazio">Cliente não encontrado.</div>'; return; }
    topo(novo ? 'Novo cliente' : c.nome, { voltar: '#/clientes' });
    const orcs = novo ? [] : st.db.orcamentos.filter(o => o.clienteId === c.id);
    app.innerHTML = `
      <div class="card" id="fc">${camposCliente(c)}</div>
      <div class="acoes">
        <button class="btn prim" id="salvar">Salvar</button>
        ${!novo ? `<button class="btn" id="zap">${ICON.conversa} Abrir WhatsApp</button>` : ''}
      </div>
      ${!novo ? `<h2>Orçamentos deste cliente</h2>${listaOrcamentos(orcs)}
        <div class="acoes"><a class="btn" href="#/orcamento/novo?cliente=${c.id}">${ICON.mais} Novo orçamento para ${esc(c.nome.split(' ')[0])}</a></div>
        <div class="acoes"><button class="btn perigo" id="excluir">${ICON.lixo} Excluir cliente</button></div>` : ''}`;

    app.querySelector('#salvar').onclick = () => {
      const v = validarCliente(app.querySelector('#fc'));
      if (!v) return;
      const salvo = st.salvarCliente({ ...c, ...v, nome: v.nome.trim(), telefone: st.soDigitos(v.telefone) });
      toast('Cliente salvo.');
      location.hash = '#/cliente/' + salvo.id;
      if (!novo) render();
    };
    if (!novo) {
      app.querySelector('#zap').onclick = () => {
        if (!st.telefoneValido(c.telefone)) { toast('Telefone inválido.'); return; }
        window.WhatsApp.abrirConversa(c.telefone, '');
      };
      app.querySelector('#excluir').onclick = async () => {
        const msg = orcs.length ? `${esc(c.nome)} tem ${orcs.length} orçamento(s). Eles continuam salvos, mas ficam "sem cliente".` : `Excluir ${esc(c.nome)}?`;
        if (!(await confirmar('Excluir cliente', msg, 'Excluir'))) return;
        st.excluirCliente(c.id); toast('Cliente excluído.'); location.hash = '#/clientes';
      };
    }
  }

  /* ---------- Ajustes ---------- */
  let promptInstalar = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptInstalar = e; });

  function ajustes() {
    marcarAba('ajustes');
    topo('Ajustes');
    const e = st.db.empresa;
    app.innerHTML = `
      <h2>Sua empresa (aparece no PDF)</h2>
      <div class="card" id="emp"><div class="campos">
        <div class="campo"><label>Logo</label>
          <div class="logo-prev">${e.logo ? `<img src="${e.logo}" alt="Logo atual">` : '<div class="ph">sem logo</div>'}
            <label class="btn" style="color:var(--text)">Escolher imagem<input type="file" id="logo" accept="image/*" hidden></label>
            ${e.logo ? '<button class="btn perigo" id="rem-logo" type="button">Remover</button>' : ''}</div></div>
        <div class="campo"><label for="e-nome">Nome da empresa / profissional</label><input id="e-nome" data-f="nome" value="${esc(e.nome)}"></div>
        <div class="campo c3"><label for="e-doc">CPF / CNPJ</label><input id="e-doc" data-f="documento" value="${esc(e.documento)}"></div>
        <div class="campo c3"><label for="e-tel">Telefone / WhatsApp</label><input id="e-tel" data-f="telefone" type="tel" value="${esc(st.telefoneFmt(e.telefone))}"></div>
        <div class="campo c3"><label for="e-email">E-mail</label><input id="e-email" data-f="email" type="email" value="${esc(e.email)}"></div>
        <div class="campo c3"><label for="e-cid">Cidade / UF</label><input id="e-cid" data-f="cidade" value="${esc(e.cidade)}"></div>
        <div class="campo"><label for="e-end">Endereço</label><input id="e-end" data-f="endereco" value="${esc(e.endereco)}"></div>
      </div></div>

      <h2>Cores do PDF</h2>
      <div class="card" id="cores"><div class="campos">
        <div class="campo c3"><div class="cor-campo">
          <input id="e-cor-t" data-f="corTexto" type="color" value="${esc(e.corTexto)}" aria-describedby="e-cor-t-aj">
          <div><label for="e-cor-t">Cor das letras</label><span class="ajuda" id="e-cor-t-aj">Título "ORÇAMENTO" e nomes das seções</span></div>
        </div></div>
        <div class="campo c3"><div class="cor-campo">
          <input id="e-cor-f" data-f="corFundo" type="color" value="${esc(e.corFundo)}" aria-describedby="e-cor-f-aj">
          <div><label for="e-cor-f">Cor de bordas e fundos</label><span class="ajuda" id="e-cor-f-aj">Linha do topo, cabeçalho da tabela, caixa do total e borda do cliente</span></div>
        </div></div>
        <div class="campo">
          <span class="label">Prévia</span>
          <div class="pdf-prev" id="prev-cores" aria-hidden="true">
            <div class="pp-topo"><span class="pp-emp">${esc(e.nome || 'Sua empresa')}</span><span class="pp-tit">ORÇAMENTO</span></div>
            <div class="pp-linha"></div>
            <div class="pp-cli"><small>CLIENTE</small><b>Nome do cliente</b></div>
            <div class="pp-tab"><span>Descrição</span><span>Total</span></div>
            <div class="pp-row"><span>Item de exemplo</span><span>R$ 100,00</span></div>
            <div class="pp-tot"><span>TOTAL</span><span>R$ 100,00</span></div>
            <div class="pp-sec">CONDIÇÕES DE PAGAMENTO</div>
          </div>
          <span class="ajuda" id="aviso-cor"></span>
        </div>
        <div class="campo"><button class="btn" id="cores-padrao" type="button">Restaurar cores padrão</button></div>
      </div></div>

      <h2>Assinatura (rubrica)</h2>
      <div class="card" id="assin"><div class="campos">
        <div class="campo">
          <div class="assin-prev">${e.assinatura ? `<img src="${e.assinatura}" alt="Sua rubrica">` : '<span class="muted">Nenhuma rubrica cadastrada</span>'}</div>
          <span class="ajuda">Vai acima da linha "Responsável" no fim do PDF.</span>
        </div>
        <div class="campo"><div class="acoes" style="margin-top:0">
          <button class="btn" id="rub-texto" type="button">Criar pelo texto</button>
          <button class="btn" id="rub-desenho" type="button">Desenhar</button>
          ${e.assinatura ? '<button class="btn perigo" id="rub-remover" type="button">Remover</button>' : ''}
        </div></div>
        <div class="campo"><label class="check"><input type="checkbox" data-f="assinarAuto" ${e.assinarAuto !== false ? 'checked' : ''}> Assinar automaticamente todos os orçamentos</label></div>
        <div class="campo"><label for="a-nome">Nome abaixo da assinatura</label><input id="a-nome" data-f="assinaturaNome" value="${esc(e.assinaturaNome)}" placeholder="${esc(e.nome || 'Ex.: seu nome completo')}"><span class="ajuda">Em branco, usa o nome da empresa.</span></div>
      </div></div>

      <h2>Deslocamento</h2>
      <div class="card" id="desl-cfg"><div class="campos">
        <div class="campo c3 m3"><label for="d-vkm">Valor por km (R$)</label><input id="d-vkm" class="num" inputmode="decimal" data-f="deslocValorKm" value="${esc(st.dec(st.num(e.deslocValorKm) || 2.5))}"></div>
        <div class="campo c3 m3" style="justify-content:flex-end"><label class="check"><input type="checkbox" data-f="deslocIdaVolta" ${e.deslocIdaVolta !== false ? 'checked' : ''}> Cobrar ida e volta</label></div>
        <div class="campo"><span class="label">Ponto de partida</span>
          <p class="ajuda" id="d-orig" style="margin:2px 0 6px">${e.origem ? esc(e.origem.manual ? 'Localização do aparelho (fixada)' : e.origem.nome) : 'Endereço da empresa (acima). Será localizado no mapa no primeiro cálculo.'}</p>
          <div class="acoes" style="margin-top:0"><button class="btn" type="button" id="d-conf">Conferir no mapa</button><button class="btn" type="button" id="d-gps">Usar minha localização atual</button></div></div>
      </div></div>

      <h2>Pix e pagamentos</h2>
      <div class="card" id="extra-cfg"><div class="campos">
        <div class="campo"><label for="x-pix">Chave Pix</label><input id="x-pix" data-f="pixChave" value="${esc(e.pixChave || '')}" placeholder="CPF/CNPJ, celular, e-mail ou chave aleatória" autocapitalize="off"></div>
        <div class="campo c3"><label for="x-pn">Nome do recebedor</label><input id="x-pn" data-f="pixNome" value="${esc(e.pixNome || '')}" placeholder="${esc(e.nome || 'Como aparece no banco')}" maxlength="25"></div>
        <div class="campo c3"><label for="x-pc">Cidade do recebedor</label><input id="x-pc" data-f="pixCidade" value="${esc(e.pixCidade || '')}" placeholder="${esc(e.cidade || 'Ex.: São Paulo')}" maxlength="15"></div>
        <div class="campo c2 m3"><label for="x-sinal">Sinal padrão (%)</label><input id="x-sinal" class="num" inputmode="numeric" data-f="sinalPct" value="${esc(st.num(e.sinalPct) || '')}" placeholder="0"></div>
        <div class="campo c2 m3"><label for="x-mg">Margem mínima (%)</label><input id="x-mg" class="num" inputmode="numeric" data-f="margemMin" value="${esc(e.margemMin == null ? 30 : e.margemMin)}"></div>
        <div class="campo c2 m3"><label for="x-gar">Garantia (dias)</label><input id="x-gar" class="num" inputmode="numeric" data-f="garantiaDias" value="${esc(e.garantiaDias || 90)}"></div>
        <div class="campo c3 m3"><label for="x-man">Lembrar revisão após (meses)</label><input id="x-man" class="num" inputmode="numeric" data-f="manutencaoMeses" value="${esc(e.manutencaoMeses || 12)}"></div>
        <div class="campo c3"><label for="x-av">Link de avaliação no Google</label><input id="x-av" data-f="linkAvaliacao" type="url" value="${esc(e.linkAvaliacao || '')}" placeholder="https://g.page/r/..." autocapitalize="off"><span class="ajuda">No Perfil da Empresa no Google: "Pedir avaliações" → copiar link.</span></div>
      </div></div>

      <h2>Google Fotos</h2>
      <div class="card" id="gf-cfg"><div class="campos">
        <div class="campo"><label for="x-gid">ID do cliente OAuth (Google Cloud)</label><input id="x-gid" data-f="googleClientId" value="${esc(e.googleClientId || '')}" placeholder="123456789-xxxx.apps.googleusercontent.com" autocapitalize="off" spellcheck="false">
          <span class="ajuda">As fotos de cada orçamento vão para um álbum próprio ("ORC-2026-0001 - Cliente"). O app só cria álbuns e envia fotos: não vê o resto da sua biblioteca. <a href="GOOGLE-FOTOS.md" target="_blank" rel="noopener">Como obter o ID (10 min, gratuito)</a>.</span></div>
      </div></div>

      <h2>Ferramentas</h2>
      <div class="lista"><a href="#/ferramentas">${ICON.lista}<div class="principal"><div class="t1">Ferramentas e kits</div><div class="t2">Desgaste das próprias e aluguel por tipo de serviço</div></div></a></div>

      <h2>Padrões dos novos orçamentos</h2>
      <div class="card" id="pad"><div class="campos">
        <div class="campo c3 m3"><label for="p-pre">Prefixo do número</label><input id="p-pre" data-f="prefixo" value="${esc(e.prefixo)}" maxlength="8"><span class="ajuda">Ex.: ${esc(e.prefixo || 'ORC')}-${new Date().getFullYear()}-0001</span></div>
        <div class="campo c3 m3"><label for="p-val">Validade (dias)</label><input id="p-val" data-f="validadeDias" type="number" min="1" value="${esc(e.validadeDias)}"></div>
        <div class="campo"><label class="check"><input type="checkbox" data-f="tecNoPdf" ${e.tecNoPdf !== false ? 'checked' : ''}> Mostrar a especificação técnica dos materiais no PDF</label></div>
        <div class="campo"><label for="p-pz">Prazo de execução</label><textarea id="p-pz" data-f="prazoPadrao">${esc(e.prazoPadrao)}</textarea></div>
        <div class="campo"><label for="p-pg">Condições de pagamento</label><textarea id="p-pg" data-f="pagamentoPadrao">${esc(e.pagamentoPadrao)}</textarea></div>
        <div class="campo"><label for="p-ga">Garantia</label><textarea id="p-ga" data-f="garantiaPadrao">${esc(e.garantiaPadrao)}</textarea></div>
        <div class="campo"><label for="p-ob">Observações</label><textarea id="p-ob" data-f="observacoesPadrao">${esc(e.observacoesPadrao)}</textarea></div>
        <div class="campo"><label for="p-msg">Mensagem do WhatsApp</label><textarea id="p-msg" data-f="mensagemPadrao" rows="4">${esc(e.mensagemPadrao)}</textarea>
          <span class="ajuda">Use {cliente}, {numero}, {titulo}, {total}, {validade}, {inicio} e {empresa}.</span></div>
      </div></div>

      <h2>Catálogo</h2>
      <div class="lista"><a href="#/catalogo">${ICON.lista}<div class="principal"><div class="t1">Itens e preços</div><div class="t2">${st.db.catalogo.length} itens cadastrados</div></div></a></div>

      <h2>Dimensionamento</h2>
      <div class="lista"><a href="#/formulas">${ICON.cabo}<div class="principal"><div class="t1">Fórmulas e tabelas</div><div class="t2">${esc(st.modeloDim().nome)} · versão ${esc(st.modeloDim().versao || 1)}</div></div></a></div>

      <h2>Nuvem</h2>
      <div class="card" id="nuvem"></div>

      <h2>Backup</h2>
      <div class="card">
        <p class="ajuda" style="margin-top:0">Gera um arquivo com todos os dados. No celular, abre o menu de compartilhar: escolha <b>Drive</b> (ou e-mail) para guardar fora do aparelho.</p>
        <p class="ajuda" id="ult-bk">${st.ultimoBackup() ? 'Último backup neste aparelho: ' + esc(st.dataBR(st.ultimoBackup())) : 'Nenhum backup feito neste aparelho.'}</p>
        <div class="acoes" style="margin-top:8px">
          <button class="btn prim" id="exp">${ICON.backup} Fazer backup</button>
          <label class="btn" style="color:var(--text)">Restaurar backup<input type="file" id="imp" accept=".json,.txt,application/json,text/plain" hidden></label>
        </div>
      </div>

      <div id="instalar"></div>
      <p class="ajuda" style="text-align:center;margin-top:24px">Orçamentos PWA · v1.15.1</p>`;

    // Só grava (e envia à nuvem) se algo mudou de fato
    const salvarEmpresa = () => {
      const dados = { ...lerCampos(app.querySelector('#emp')), ...lerCampos(app.querySelector('#cores')), ...lerCampos(app.querySelector('#assin')), ...lerCampos(app.querySelector('#pad')), ...lerCampos(app.querySelector('#desl-cfg')), ...lerCampos(app.querySelector('#extra-cfg')), ...lerCampos(app.querySelector('#gf-cfg')) };
      ['sinalPct', 'margemMin', 'garantiaDias', 'manutencaoMeses'].forEach(k => { dados[k] = st.num(dados[k]); });
      dados.googleClientId = String(dados.googleClientId || '').trim(); dados.pixChave = String(dados.pixChave || '').trim();
      dados.deslocValorKm = st.num(dados.deslocValorKm) || 2.5;
      dados.telefone = st.soDigitos(dados.telefone);
      dados.validadeDias = parseInt(dados.validadeDias, 10) || 15;
      const mudou = Object.keys(dados).some(k => String(dados[k]) !== String(st.db.empresa[k] == null ? '' : st.db.empresa[k]));
      if (mudou) st.salvarEmpresa(dados);
    };
    let t;
    app.addEventListener('input', ev => { if (ev.target.closest('#nuvem')) return; clearTimeout(t); t = setTimeout(salvarEmpresa, 300); });
    const pararNuvem = window.Nuvem ? window.Nuvem.aoMudarEstado(() => desenharNuvem(app.querySelector('#nuvem'))) : () => {};
    limparTela = () => { clearTimeout(t); salvarEmpresa(); pararNuvem(); };
    desenharNuvem(app.querySelector('#nuvem'));
    // Ponto de partida do deslocamento
    const dOrig = app.querySelector('#d-orig');
    app.querySelector('#d-conf').onclick = async () => {
      salvarEmpresa();
      const e2 = st.db.empresa;
      if (!window.Rotas.textoEndereco(e2.endereco, e2.cidade)) { toast('Preencha o endereço e a cidade da empresa acima.'); return; }
      dOrig.textContent = 'Procurando no mapa…';
      try {
        const g = await window.Rotas.geocodificar(e2.endereco, e2.cidade);
        st.salvarEmpresa({ origem: { ...g, end: window.Rotas.textoEndereco(e2.endereco, e2.cidade) } });
        dOrig.innerHTML = `${esc(g.nome)} · <a href="https://www.google.com/maps?q=${g.lat},${g.lon}" target="_blank" rel="noopener">ver no mapa</a>`;
      } catch (err) { dOrig.textContent = err.message || String(err); }
    };
    app.querySelector('#d-gps').onclick = async () => {
      dOrig.textContent = 'Obtendo localização…';
      try {
        const g = await window.Rotas.minhaPosicao();
        st.salvarEmpresa({ origem: { ...g, manual: true } });
        dOrig.innerHTML = `Localização do aparelho (fixada) · <a href="https://www.google.com/maps?q=${g.lat},${g.lon}" target="_blank" rel="noopener">ver no mapa</a>. Para voltar ao endereço da empresa, toque em "Conferir no mapa".`;
      } catch (err) { dOrig.textContent = err.message || String(err); }
    };

    // Prévia das duas cores e aviso de contraste
    const corT = app.querySelector('#e-cor-t'), corF = app.querySelector('#e-cor-f');
    const prev = app.querySelector('#prev-cores');
    function atualizarCores() {
      prev.style.setProperty('--pp-t', corT.value);
      prev.style.setProperty('--pp-f', corF.value);
      prev.style.setProperty('--pp-sobre', st.textoSobre(corF.value));
      prev.style.setProperty('--pp-tint', `rgb(${st.clarear(corF.value, 0.96).join(',')})`);
      const aviso = st.contraste(corT.value, '#ffffff') < 3
        ? 'A cor das letras está clara demais e pode ficar difícil de ler no papel branco.'
        : '';
      const el = app.querySelector('#aviso-cor');
      el.textContent = aviso;
      el.style.color = aviso ? 'var(--warn)' : '';
    }
    corT.addEventListener('input', atualizarCores);
    corF.addEventListener('input', atualizarCores);
    app.querySelector('#cores-padrao').onclick = () => {
      corT.value = st.CORES_PADRAO.corTexto;
      corF.value = st.CORES_PADRAO.corFundo;
      atualizarCores(); salvarEmpresa(); toast('Cores padrão restauradas.');
    };
    atualizarCores();

    // Rubrica
    const novaRubrica = async dados => { salvarEmpresa(); st.salvarEmpresa(dados); toast(dados.assinatura ? 'Rubrica salva.' : 'Rubrica removida.'); limparTela(); limparTela = null; ajustes(); };
    app.querySelector('#rub-texto').onclick = async () => { const r = await dialogoRubricaTexto(); if (r) novaRubrica(r); };
    app.querySelector('#rub-desenho').onclick = async () => { const r = await dialogoRubricaDesenho(); if (r) novaRubrica({ assinatura: r, rubricaTexto: '', rubricaEstilo: 'desenho' }); };
    const rr = app.querySelector('#rub-remover');
    if (rr) rr.onclick = async () => { if (await confirmar('Remover rubrica', 'Os próximos PDFs saem sem assinatura.', 'Remover')) novaRubrica({ assinatura: '', rubricaTexto: '', rubricaEstilo: '' }); };

    app.querySelector('#logo').addEventListener('change', async ev => {
      const f = ev.target.files[0]; if (!f) return;
      try {
        const logo = await reduzirImagem(f, 400);
        salvarEmpresa(); st.salvarEmpresa({ logo }); toast('Logo atualizado.'); limparTela(); limparTela = null; ajustes();
      } catch (err) { toast('Não foi possível ler a imagem.'); }
    });
    const rl = app.querySelector('#rem-logo');
    if (rl) rl.onclick = () => { salvarEmpresa(); st.salvarEmpresa({ logo: '' }); limparTela(); limparTela = null; ajustes(); };

    app.querySelector('#exp').onclick = async () => {
      if (await fazerBackup()) app.querySelector('#ult-bk').textContent = 'Último backup neste aparelho: ' + st.dataBR(st.ultimoBackup());
    };
    app.querySelector('#imp').addEventListener('change', async ev => {
      const f = ev.target.files[0]; if (!f) return;
      const texto = await f.text();
      const aviso = window.Nuvem && window.Nuvem.conectado
        ? 'Os dados deste aparelho serão substituídos pelos do arquivo e enviados para a nuvem. Continuar?'
        : 'Os dados atuais deste aparelho serão substituídos pelos do arquivo. Continuar?';
      if (!(await confirmar('Restaurar backup', aviso, 'Restaurar'))) return;
      try { st.importar(texto); toast('Backup restaurado.'); limparTela(); limparTela = null; ajustes(); }
      catch (err) { toast(err.message || 'Arquivo inválido.'); }
    });

    if (promptInstalar) {
      app.querySelector('#instalar').innerHTML = `<div class="acoes"><button class="btn prim bloco" id="inst">Instalar o app neste aparelho</button></div>`;
      app.querySelector('#inst').onclick = async () => { promptInstalar.prompt(); await promptInstalar.userChoice; promptInstalar = null; ajustes(); };
    }
  }

  /* ---------- Backup ---------- */
  // No celular: menu de compartilhar (Drive, e-mail…). Sem suporte: baixa o arquivo.
  // O arquivo vai como .txt porque o Android não compartilha .json; o conteúdo é JSON.
  async function fazerBackup() {
    const texto = st.exportar();
    const nome = `backup-orcamentos-${st.hoje()}`;
    const arq = new File([texto], nome + '.txt', { type: 'text/plain' });
    if (navigator.canShare && navigator.canShare({ files: [arq] })) {
      try {
        await navigator.share({ files: [arq], title: 'Backup dos orçamentos', text: 'Backup do app de orçamentos. Para restaurar: Ajustes → Restaurar backup.' });
        st.marcarBackup(); toast('Backup salvo.'); return true;
      } catch (e) {
        if (e && e.name === 'AbortError') return false;
      }
    }
    window.WhatsApp.baixar(new Blob([texto], { type: 'application/json' }), nome + '.json');
    st.marcarBackup(); toast('Backup baixado. Guarde o arquivo no Drive ou no e-mail.');
    return true;
  }

  /* ---------- Nuvem ---------- */
  const horaBR = iso => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  function textoStatusNuvem() {
    const N = window.Nuvem; if (!N) return '';
    const e = N.estado, n = N.pendentes();
    if (e.fase === 'ok') return n ? `Nuvem: enviando ${n} alteração(ões)…` : `Nuvem: sincronizado às ${horaBR(e.ultima)}`;
    if (e.fase === 'sincronizando') return 'Nuvem: sincronizando…';
    if (e.fase === 'offline') return `Nuvem: sem internet${n ? ` · ${n} alteração(ões) aguardando` : ''}`;
    if (e.fase === 'erro') return 'Nuvem: ' + (e.erro || 'erro');
    if (e.fase === 'carregando') return 'Nuvem: conectando…';
    return '';
  }

  function desenharNuvem(el) {
    if (!el) return;
    const N = window.Nuvem;
    const emailDigitado = (el.querySelector('#nv-email') || {}).value || '';
    const e = N.estado;
    let html;
    if (!N.configurada) {
      html = `<p style="margin-top:0">Guarde clientes, orçamentos e preços na nuvem: se perder ou trocar o celular, basta entrar com sua conta. Também dá para usar no computador. <b>Gratuito</b> (Firebase, do Google).</p>
        <p class="ajuda">Precisa de uma configuração feita uma única vez no site do Firebase. <a href="https://github.com/faabiianooc-automacoes/orcamentos-pwa/blob/main/FIREBASE.md" target="_blank" rel="noopener">Ver passo a passo</a>.</p>
        <div class="acoes"><button class="btn prim" id="nv-config">${ICON.nuvem} Configurar nuvem</button></div>`;
    } else if (e.fase === 'carregando') {
      html = '<p style="margin:0">Conectando à nuvem…</p>';
    } else if (!N.conectado) {
      html = `${e.fase === 'erro' && e.erro ? `<div class="aviso" style="margin-bottom:12px">${ICON.alerta}<p>${esc(e.erro)}</p></div>` : ''}
        <p style="margin-top:0">Entre para ativar a sincronização. Use sempre a <b>mesma conta</b> em todos os aparelhos.</p>
        <div class="acoes" style="margin-top:0"><button class="btn prim bloco" id="nv-google">Entrar com Google</button></div>
        <div class="sep"></div>
        <div class="campos">
          <div class="campo"><label for="nv-email">E-mail</label><input id="nv-email" type="email" autocomplete="username" value="${esc(emailDigitado)}"></div>
          <div class="campo"><label for="nv-senha">Senha</label><input id="nv-senha" type="password" autocomplete="current-password" placeholder="mínimo 6 caracteres"></div>
        </div>
        <div class="acoes">
          <button class="btn" id="nv-entrar">Entrar</button>
          <button class="btn" id="nv-criar">Criar conta</button>
        </div>
        <p class="ajuda"><a href="#" id="nv-esqueci">Esqueci a senha</a> · <a href="#" id="nv-remover">Remover configuração da nuvem</a></p>`;
    } else {
      html = `<div class="row" style="align-items:flex-start">${ICON.nuvem}<div style="flex:1"><div><b>Conectado</b> · ${esc(e.email)}</div>
          <div class="ajuda" id="nv-status">${esc(textoStatusNuvem())}</div></div></div>
        ${e.fase === 'erro' ? `<p class="ajuda" style="color:var(--warn)">As alterações continuam salvas neste aparelho e serão enviadas quando a nuvem responder.</p>` : ''}
        <div class="acoes">
          <button class="btn" id="nv-sync">Sincronizar agora</button>
          <button class="btn" id="nv-sair">Sair</button>
        </div>
`;
    }
    el.innerHTML = html;
    const $ = sel => el.querySelector(sel);
    const tentar = async (fn, ok) => {
      try { await fn(); if (ok) toast(ok); }
      catch (err) { toast(N.mensagemErro(err)); }
    };
    if ($('#nv-config')) $('#nv-config').onclick = configurarNuvem;
    if ($('#nv-google')) $('#nv-google').onclick = () => tentar(() => N.entrarGoogle());
    const credenciais = () => [$('#nv-email').value, $('#nv-senha').value];
    if ($('#nv-entrar')) $('#nv-entrar').onclick = () => tentar(() => N.entrarEmail(...credenciais()));
    if ($('#nv-criar')) $('#nv-criar').onclick = () => tentar(() => N.criarConta(...credenciais()), 'Conta criada.');
    if ($('#nv-esqueci')) $('#nv-esqueci').onclick = ev => {
      ev.preventDefault();
      if (!$('#nv-email').value.trim()) { toast('Digite seu e-mail no campo acima.'); return; }
      tentar(() => N.redefinirSenha($('#nv-email').value), 'Enviamos um e-mail para redefinir a senha.');
    };
    if ($('#nv-remover')) $('#nv-remover').onclick = async ev => {
      ev.preventDefault();
      if (await confirmar('Remover configuração', 'O app volta a guardar os dados só neste aparelho. Os dados que já estão na nuvem não são apagados.', 'Remover')) N.removerConfig();
    };
    if ($('#nv-sync')) $('#nv-sync').onclick = () => tentar(() => N.sincronizarAgora());
    if ($('#nv-sair')) $('#nv-sair').onclick = async () => {
      const r = await dialogo({
        titulo: 'Sair da nuvem',
        corpo: `<p style="margin-top:0">Os dados continuam guardados na nuvem.</p><p>Se este aparelho não for seu ou for ficar com outra pessoa, apague os dados dele.</p>`,
        acoes: [{ rotulo: 'Cancelar', valor: null }, { rotulo: 'Sair e apagar deste aparelho', classe: 'perigo', valor: 'apagar' }, { rotulo: 'Sair', classe: 'prim', valor: 'sair' }]
      });
      if (r) tentar(() => N.sair(r === 'apagar'), r === 'apagar' ? 'Você saiu e os dados deste aparelho foram apagados.' : 'Você saiu da nuvem.');
    };
  }

  async function configurarNuvem() {
    let cfg = null;
    const r = await dialogo({
      titulo: 'Configurar nuvem',
      corpo: `<p style="margin-top:0">No console do Firebase, em <b>Configurações do projeto → Seus apps</b>, copie o bloco <code>firebaseConfig</code> e cole abaixo.</p>
        <textarea id="nv-cfg" rows="9" style="font-family:ui-monospace,monospace;font-size:12.5px" placeholder="const firebaseConfig = {&#10;  apiKey: &quot;...&quot;,&#10;  authDomain: &quot;...&quot;,&#10;  projectId: &quot;...&quot;,&#10;  ...&#10;};"></textarea>
        <p class="ajuda" id="nv-cfg-erro" style="color:var(--danger)"></p>
        <p class="ajuda">Essa configuração não é senha: ela só identifica o seu projeto. Quem protege os dados são as regras do Firestore e o seu login.</p>`,
      acoes: [{ rotulo: 'Cancelar', valor: null }, {
        rotulo: 'Salvar e conectar', classe: 'prim', valor: 'ok',
        antes: d => {
          try { cfg = window.Nuvem.interpretarConfig(d.querySelector('#nv-cfg').value); return true; }
          catch (err) { d.querySelector('#nv-cfg-erro').textContent = err.message; return false; }
        }
      }]
    });
    if (r !== 'ok') return;
    window.Nuvem.salvarConfig(cfg);
    toast('Configuração salva. Agora entre com sua conta.');
    window.Nuvem.iniciar();
  }

  /* ---------- Rubrica ---------- */
  const ESTILOS_RUBRICA = [
    { id: 'great-vibes', nome: 'Clássica', arquivo: 'fonts/great-vibes.woff2', tamanho: 1 },
    { id: 'allura', nome: 'Elegante', arquivo: 'fonts/allura.woff2', tamanho: 1.05 },
    { id: 'dancing-script', nome: 'Moderna', arquivo: 'fonts/dancing-script.woff2', tamanho: 0.85 }
  ];
  const TINTA = '#1d3a8a'; // azul de caneta
  const fontesCarregadas = {};
  async function carregarFonte(est) {
    if (!fontesCarregadas[est.id]) {
      const f = new FontFace('rub-' + est.id, `url(${est.arquivo})`);
      fontesCarregadas[est.id] = f.load().then(ff => { document.fonts.add(ff); return true; });
    }
    return fontesCarregadas[est.id];
  }
  // Recorta o espaço vazio em volta e devolve PNG transparente
  function recortar(cv, margem = 8) {
    const ctx = cv.getContext('2d');
    const { data, width, height } = ctx.getImageData(0, 0, cv.width, cv.height);
    let x0 = width, y0 = height, x1 = -1, y1 = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return '';
    x0 = Math.max(0, x0 - margem); y0 = Math.max(0, y0 - margem);
    x1 = Math.min(width - 1, x1 + margem); y1 = Math.min(height - 1, y1 + margem);
    const out = document.createElement('canvas');
    const esc2 = Math.min(1, 600 / (x1 - x0 + 1));
    out.width = Math.round((x1 - x0 + 1) * esc2); out.height = Math.round((y1 - y0 + 1) * esc2);
    out.getContext('2d').drawImage(cv, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  }
  async function rubricaDeTexto(texto, est) {
    await carregarFonte(est);
    const cv = document.createElement('canvas');
    const px = Math.round(150 * est.tamanho);
    const ctx = cv.getContext('2d');
    ctx.font = `${px}px "rub-${est.id}"`;
    cv.width = Math.ceil(ctx.measureText(texto).width + px); cv.height = Math.round(px * 1.8);
    ctx.font = `${px}px "rub-${est.id}"`;
    ctx.fillStyle = TINTA; ctx.textBaseline = 'middle';
    ctx.fillText(texto, px / 2, cv.height / 2);
    return recortar(cv);
  }

  async function dialogoRubricaTexto() {
    const e = st.db.empresa;
    let escolhido = null;
    const r = await dialogo({
      titulo: 'Criar rubrica pelo texto',
      corpo: `<div class="campo"><label for="rub-txt">Texto da rubrica</label>
          <input id="rub-txt" value="${esc(e.rubricaTexto || '')}" placeholder="Ex.: fcarvalho" maxlength="30" autocomplete="off"></div>
        <p class="ajuda">Toque no estilo que preferir:</p>
        <div class="rub-estilos">${ESTILOS_RUBRICA.map(es => `<button type="button" class="rub-op" data-est="${es.id}"><img alt=""><span>${es.nome}</span></button>`).join('')}</div>`,
      acoes: [{ rotulo: 'Cancelar', valor: null }, {
        rotulo: 'Usar esta rubrica', classe: 'prim', valor: 'ok',
        antes: d => { if (!escolhido) { toast('Digite o texto e escolha um estilo.'); return false; } return true; }
      }],
      aoAbrir: d => {
        const inp = d.querySelector('#rub-txt');
        let t;
        const desenhar = async () => {
          const txt = inp.value.trim();
          for (const es of ESTILOS_RUBRICA) {
            const b = d.querySelector(`[data-est="${es.id}"]`);
            const img = b.querySelector('img');
            if (!txt) { img.removeAttribute('src'); continue; }
            try { img.src = await rubricaDeTexto(txt, es); } catch (err) { img.removeAttribute('src'); }
          }
          const sel = d.querySelector('.rub-op.ativo');
          escolhido = sel && txt ? { estilo: sel.dataset.est, texto: txt, img: sel.querySelector('img').src } : null;
        };
        inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(desenhar, 200); });
        d.querySelector('.rub-estilos').addEventListener('click', ev => {
          const b = ev.target.closest('.rub-op'); if (!b) return;
          d.querySelectorAll('.rub-op').forEach(x => x.classList.toggle('ativo', x === b));
          const txt = inp.value.trim();
          escolhido = txt && b.querySelector('img').src ? { estilo: b.dataset.est, texto: txt, img: b.querySelector('img').src } : null;
        });
        if (e.rubricaEstilo) { const b = d.querySelector(`[data-est="${e.rubricaEstilo}"]`); if (b) b.classList.add('ativo'); }
        desenhar();
        setTimeout(() => inp.focus(), 50);
      }
    });
    if (r !== 'ok' || !escolhido) return null;
    return { assinatura: escolhido.img, rubricaTexto: escolhido.texto, rubricaEstilo: escolhido.estilo };
  }

  async function dialogoRubricaDesenho() {
    let cvRef = null, vazio = true;
    const r = await dialogo({
      titulo: 'Desenhar rubrica',
      corpo: `<p class="ajuda" style="margin-top:0">Desenhe com o dedo (ou o mouse) dentro do quadro.</p>
        <canvas id="rub-cv" class="rub-cv"></canvas>
        <div class="acoes"><button class="btn" type="button" id="rub-limpar">Limpar</button></div>`,
      acoes: [{ rotulo: 'Cancelar', valor: null }, {
        rotulo: 'Usar este desenho', classe: 'prim', valor: 'ok',
        antes: () => { if (vazio) { toast('Desenhe a rubrica primeiro.'); return false; } return true; }
      }],
      aoAbrir: d => {
        const cv = d.querySelector('#rub-cv'); cvRef = cv;
        const escala = 2;
        const ajustar = () => { const b = cv.getBoundingClientRect(); cv.width = Math.round(b.width * escala); cv.height = Math.round(b.height * escala); };
        ajustar();
        const ctx = cv.getContext('2d');
        const estilo = () => { ctx.strokeStyle = TINTA; ctx.lineWidth = 3.2 * escala; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; };
        estilo();
        let desenhando = false, ult = null;
        const pos = ev => { const b = cv.getBoundingClientRect(); return { x: (ev.clientX - b.left) * escala, y: (ev.clientY - b.top) * escala }; };
        cv.addEventListener('pointerdown', ev => { desenhando = true; ult = pos(ev); cv.setPointerCapture(ev.pointerId); ctx.beginPath(); ctx.arc(ult.x, ult.y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fillStyle = TINTA; ctx.fill(); vazio = false; ev.preventDefault(); });
        cv.addEventListener('pointermove', ev => {
          if (!desenhando) return;
          const p = pos(ev);
          ctx.beginPath(); ctx.moveTo(ult.x, ult.y);
          ctx.quadraticCurveTo(ult.x, ult.y, (ult.x + p.x) / 2, (ult.y + p.y) / 2);
          ctx.lineTo(p.x, p.y); ctx.stroke();
          ult = p; ev.preventDefault();
        });
        const fim = () => { desenhando = false; };
        cv.addEventListener('pointerup', fim); cv.addEventListener('pointercancel', fim);
        d.querySelector('#rub-limpar').onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); vazio = true; };
      }
    });
    if (r !== 'ok' || !cvRef) return null;
    return recortar(cvRef, 12) || null;
  }

  function reduzirImagem(arquivo, max) {
    return new Promise((ok, erro) => {
      const img = new Image();
      const url = URL.createObjectURL(arquivo);
      img.onload = () => {
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * r); cv.height = Math.round(img.height * r);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        ok(cv.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); erro(new Error('imagem inválida')); };
      img.src = url;
    });
  }

  /* ---------- Catálogo ---------- */
  // Busca + chips de categoria. Usado na tela do catálogo e no seletor do orçamento.
  /* ---------- Especificação técnica (js/tecnico.js) ---------- */
  const TEC = window.Tecnico;
  function camposTec(classeId, tec) {
    return TEC.campos(classeId).map(f => {
      const v = tec[f.k] == null ? '' : String(tec[f.k]);
      const rot = `${esc(f.rot)}${f.un && f.un !== 'P' ? ` <span class="muted">(${esc(f.un)})</span>` : ''}`;
      const larg = f.k === 'obs' ? '' : 'c3 m3';
      if (f.tipo === 'lista') {
        const ops = f.opcoes.includes(v) || !v ? f.opcoes : [...f.opcoes, v];
        return `<div class="campo ${larg}"><label>${rot}</label><select data-t="${f.k}"><option value="">-</option>${ops.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
      }
      return `<div class="campo ${larg}"><label>${rot}</label><input data-t="${f.k}" value="${esc(v)}" ${f.tipo === 'num' ? 'inputmode="decimal"' : ''} placeholder="${esc(f.ph || '')}"></div>`;
    }).join('');
  }
  // Bloco "Informações técnicas" para diálogos. aberto: começa expandido
  function htmlTec(tec, aberto) {
    tec = tec || {};
    return `<details class="tec" ${aberto ? 'open' : ''}><summary>${ICON.cabo}<span>Informações técnicas</span><span class="muted">opcional</span></summary>
      <div class="campos" style="margin-top:10px">
        <div class="campo"><label>Tipo de material</label><select data-tc>
          <option value="">Sem especificação</option>${TEC.CLASSES.map(c => `<option value="${c.id}" ${c.id === tec.classe ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div>
      </div>
      <div class="campos tec-campos" style="margin-top:12px">${tec.classe ? camposTec(tec.classe, tec) : ''}</div>
      <p class="ajuda tec-res"></p></details>`;
  }
  function lerTec(raiz) {
    const sel = raiz.querySelector('[data-tc]'); if (!sel || !sel.value) return null;
    const t = { classe: sel.value };
    raiz.querySelectorAll('[data-t]').forEach(el => { t[el.dataset.t] = el.value; });
    return TEC.limpar(t);
  }
  // Liga a troca de tipo (mantém marca/modelo) e a prévia do resumo. descEl: sugere o tipo pela descrição
  function ligarTec(raiz, descEl) {
    const sel = raiz.querySelector('[data-tc]'); if (!sel) return;
    let escolhido = !!sel.value;
    const prev = () => { const r = TEC.resumo(lerTec(raiz)); raiz.querySelector('.tec-res').textContent = r ? 'No PDF: ' + r : ''; };
    const trocar = () => {
      const atual = lerTec(raiz) || {};
      raiz.querySelector('.tec-campos').innerHTML = sel.value ? camposTec(sel.value, atual) : '';
      prev();
    };
    sel.addEventListener('change', () => { escolhido = true; trocar(); });
    raiz.querySelector('.tec-campos').addEventListener('input', prev);
    raiz.querySelector('.tec-campos').addEventListener('change', prev);
    if (descEl) descEl.addEventListener('input', () => {
      if (escolhido) return;
      const sug = TEC.sugerir(descEl.value);
      if (sug !== sel.value) { sel.value = sug; trocar(); }
    });
    prev();
  }

  function filtrosCatalogo(itens, placeholder) {
    const usados = st.GRUPOS.filter(g => itens.some(i => (i.grupo || 'Outros') === g));
    return `<div class="busca">${ICON.busca}<input type="search" id="qc" placeholder="${esc(placeholder)}" aria-label="Buscar no catálogo"></div>
      <div class="chips" id="gc">${['Todas', ...usados].map(g => `<button type="button" class="chip" data-g="${esc(g)}">${esc(g)}</button>`).join('')}</div>`;
  }

  function listaCatalogo(itens, modo) {
    if (!itens.length) return `<div class="lista" id="lc"><div class="vazio">${ICON.lista}<p>Nenhum item no catálogo.</p></div></div>`;
    const grupos = [...st.GRUPOS, ...new Set(itens.map(i => i.grupo).filter(g => !st.GRUPOS.includes(g)))];
    const preco = i => st.num(i.valor) > 0 ? st.brl(i.valor)
      : (modo === 'escolher' ? '<span class="muted">sem preço</span>' : '<span class="badge b-vencido">definir preço</span>');
    return `<div class="lista" id="lc">${grupos.map(g => {
      const doGrupo = itens.filter(i => (i.grupo || 'Outros') === g);
      if (!doGrupo.length) return '';
      const semPreco = doGrupo.filter(i => st.num(i.valor) <= 0).length;
      return `<div class="grupo-cab" data-grupo="${esc(g)}"><span>${esc(g)}</span>
          <span class="muted">${doGrupo.length} itens${modo === 'editar' && semPreco ? ` · ${semPreco} sem preço` : ''}</span></div>` +
        doGrupo.map(i => modo === 'escolher'
          ? `<label class="linha" data-grupo="${esc(g)}" style="cursor:pointer"><input type="checkbox" value="${i.id}" style="width:20px;min-height:20px">
              <div class="principal"><div class="t1">${esc(i.descricao)}</div><div class="t2">${esc(i.tipo)} · ${esc(i.unidade)}${i.tec ? ' · ' + esc(TEC.resumo(i.tec)) : ''}</div></div>
              <div class="valor">${preco(i)}</div></label>`
          : `<button class="linha" data-grupo="${esc(g)}" data-id="${i.id}"><div class="principal"><div class="t1">${esc(i.descricao)}</div><div class="t2">${esc(i.tipo)} · ${esc(i.unidade)}${i.tec ? ' · ' + esc(TEC.resumo(i.tec)) : ''}</div></div>
              <div class="valor">${preco(i)}</div></button>`).join('');
    }).join('')}<div class="vazio" id="lc-vazio" hidden>Nenhum item encontrado.</div></div>`;
  }

  // estado = { grupo, busca } (mantido entre aberturas na tela do catálogo)
  function ligarFiltrosCatalogo(raiz, estado) {
    const q = raiz.querySelector('#qc');
    const chips = raiz.querySelector('#gc');
    q.value = estado.busca || '';
    const norm = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    function aplicar() {
      const t = norm(q.value.trim());
      estado.busca = q.value;
      chips.querySelectorAll('.chip').forEach(c => c.classList.toggle('ativo', c.dataset.g === estado.grupo));
      let total = 0;
      const visiveisPorGrupo = {};
      raiz.querySelectorAll('#lc .linha').forEach(l => {
        const ok = (estado.grupo === 'Todas' || l.dataset.grupo === estado.grupo) && (!t || norm(l.textContent).includes(t));
        l.hidden = !ok;
        if (ok) { total++; visiveisPorGrupo[l.dataset.grupo] = true; }
      });
      raiz.querySelectorAll('#lc .grupo-cab').forEach(h => { h.hidden = !visiveisPorGrupo[h.dataset.grupo]; });
      const vazio = raiz.querySelector('#lc-vazio');
      if (vazio) vazio.hidden = total > 0;
    }
    q.addEventListener('input', aplicar);
    chips.addEventListener('click', e => {
      const c = e.target.closest('.chip'); if (!c) return;
      estado.grupo = c.dataset.g; aplicar();
    });
    if (!chips.querySelector(`[data-g="${CSS.escape(estado.grupo)}"]`)) estado.grupo = 'Todas';
    aplicar();
  }

  const estadoCatalogo = { grupo: 'Todas', busca: '' };
  function catalogo() {
    marcarAba('ajustes');
    topo('Catálogo', { voltar: '#/ajustes' });
    const l = st.db.catalogo;
    app.innerHTML = `
      <p class="ajuda" style="margin-top:0">Itens usados com frequência, por categoria. O preço aqui é o padrão: dá para mudar em cada orçamento. Exclua o que você não oferece.</p>
      ${filtrosCatalogo(l, 'Buscar item')}
      ${listaCatalogo(l, 'editar')}
      <button class="fab" id="novo">${ICON.mais} Novo item</button>`;
    ligarFiltrosCatalogo(app, estadoCatalogo);
    app.querySelector('#lc').addEventListener('click', e => {
      const b = e.target.closest('[data-id]'); if (!b) return;
      editarItemCatalogo(l.find(i => i.id === b.dataset.id));
    });
    app.querySelector('#novo').onclick = () => editarItemCatalogo(null);
  }

  async function editarItemCatalogo(item) {
    const grupoInicial = estadoCatalogo.grupo !== 'Todas' ? estadoCatalogo.grupo : 'Outros';
    const it = item ? { ...item } : { descricao: '', tipo: 'Serviço', unidade: 'un', valor: 0, grupo: grupoInicial };
    const opt = (l, s) => l.map(v => `<option ${v === s ? 'selected' : ''}>${esc(v)}</option>`).join('');
    const grupos = st.GRUPOS.includes(it.grupo) ? st.GRUPOS : [...st.GRUPOS, it.grupo];
    let dados = null;
    const acoes = [{ rotulo: 'Cancelar', valor: null }];
    if (item) acoes.push({ rotulo: 'Excluir', classe: 'perigo', valor: 'excluir' });
    acoes.push({ rotulo: 'Salvar', classe: 'prim', valor: 'salvar', antes: d => {
      dados = lerCampos(d);
      if (!dados.descricao.trim()) { d.querySelector('[data-f="descricao"]').classList.add('invalido'); return false; }
      dados.tec = lerTec(d);
      return true;
    } });
    const rolagem = window.scrollY;
    const r = await dialogo({
      titulo: item ? 'Editar item' : 'Novo item',
      corpo: `<div class="campos">
        <div class="campo"><label>Descrição <span class="obrig">*</span></label><input data-f="descricao" value="${esc(it.descricao)}"></div>
        <div class="campo"><label>Categoria</label><select data-f="grupo">${opt(grupos, it.grupo || 'Outros')}</select></div>
        <div class="campo c2 m3"><label>Tipo</label><select data-f="tipo">${opt(st.TIPOS_ITEM, it.tipo)}</select></div>
        <div class="campo c2 m3"><label>Unidade</label><select data-f="unidade">${opt(st.UNIDADES.includes(it.unidade) ? st.UNIDADES : [...st.UNIDADES, it.unidade], it.unidade)}</select></div>
        <div class="campo c2"><label>Preço (R$)</label><input class="num" inputmode="decimal" data-f="valor" value="${st.num(it.valor) ? esc(st.dec(it.valor)) : ''}" placeholder="0,00"></div>
        <div class="campo c2"><label>Custo (R$) <span class="muted">só você vê</span></label><input class="num" inputmode="decimal" data-f="custo" value="${st.num(it.custo) ? esc(st.dec(it.custo)) : ''}" placeholder="opcional"></div>
      </div>
      ${htmlTec(it.tec, !!it.tec || it.tipo === 'Material')}`,
      acoes,
      aoAbrir: d => ligarTec(d, item ? null : d.querySelector('[data-f="descricao"]'))
    });
    const voltar = () => { catalogo(); window.scrollTo(0, rolagem); };
    if (r === 'salvar') {
      const novo = { ...it, ...dados, descricao: dados.descricao.trim(), valor: st.num(dados.valor), custo: st.num(dados.custo) };
      if (!novo.tec) delete novo.tec;
      st.salvarItemCatalogo(novo); toast('Item salvo.'); voltar();
    }
    if (r === 'excluir' && await confirmar('Excluir item', `Excluir "${esc(it.descricao)}" do catálogo?`, 'Excluir')) { st.excluirItemCatalogo(it.id); voltar(); }
  }

  /* ---------- Início do app ---------- */
  // Formata telefone ao sair do campo
  document.addEventListener('focusout', e => {
    if (e.target.matches('input[type="tel"]') && e.target.value) e.target.value = st.telefoneFmt(st.soDigitos(e.target.value));
  });

  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    // Verifica versão nova ao abrir e ao voltar para o app; quando chegar, oferece recarregar
    const tinhaControle = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then(reg => {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!tinhaControle || document.getElementById('aviso-versao')) return;
      const b = document.createElement('div');
      b.id = 'aviso-versao';
      b.innerHTML = '<span>Nova versão do app disponível.</span><button class="btn prim" type="button">Atualizar</button>';
      b.querySelector('button').onclick = () => location.reload();
      document.body.appendChild(b);
    });
  }

  if (window.Nuvem) {
    // Primeira conexão de um aparelho que já tem dados e a nuvem também
    window.Nuvem.perguntar = async () => {
      const r = await dialogo({
        titulo: 'Já existem dados na nuvem',
        corpo: `<p style="margin-top:0">Esta conta já tem clientes e orçamentos na nuvem, e este aparelho também tem dados.</p>
          <p><b>Usar os da nuvem:</b> os dados deste aparelho são trocados pelos da nuvem.</p>
          <p><b>Juntar:</b> mantém os dois. Se o mesmo registro existir nos dois lados, fica a versão mais recente.</p>`,
        acoes: [{ rotulo: 'Juntar os dois', valor: 'juntar' }, { rotulo: 'Usar os da nuvem', classe: 'prim', valor: 'nuvem' }]
      });
      return r || 'juntar';
    };
    // Dados que chegaram de outro aparelho: atualiza listas (não mexe em telas de edição)
    window.Nuvem.aoMudarDados(() => {
      const rota = (location.hash || '#/inicio').split('?')[0].split('/')[1] || 'inicio';
      if (['inicio', 'orcamentos', 'clientes', 'catalogo', 'relatorios'].includes(rota)) {
        const y = window.scrollY; render(); window.scrollTo(0, y);
      }
    });
    // Status no Início
    window.Nuvem.aoMudarEstado(() => {
      const el = document.querySelector('.status-nuvem span');
      if (el) el.textContent = textoStatusNuvem();
    });
    window.Nuvem.iniciar();
  }
  // Funções de interface usadas por js/telas-extras.js
  window.UI = { esc, ICON, toast, dialogo, confirmar, pedirTexto, topo, marcarAba, lerCampos, render, get app() { return app; } };
  render();
})();
