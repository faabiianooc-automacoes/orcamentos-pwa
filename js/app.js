/* Telas e navegação do app. Rotas por hash:
   #/inicio · #/orcamentos · #/orcamento/:id · #/clientes · #/cliente/:id|novo
   #/ajustes · #/catalogo */
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
    fechar: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
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
    const s = st.statusExibido(o);
    return `<span class="badge b-${s.toLowerCase()}">${esc(s)}</span>`;
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
    const telas = { inicio, orcamentos, orcamento: editorOrcamento, clientes, cliente: formCliente, ajustes, catalogo };
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
    const aprovados = db.orcamentos.filter(o => o.status === 'Aprovado');
    const decididos = db.orcamentos.filter(o => o.status === 'Aprovado' || o.status === 'Recusado').length;
    const soma = l => l.reduce((s, o) => s + st.totais(o).total, 0);
    const taxa = decididos ? Math.round(aprovados.length / decididos * 100) + '%' : '-';

    const avisos = [];
    if (!db.empresa.nome) avisos.push('<a href="#/ajustes">Cadastre os dados da sua empresa</a> (nome, telefone, logo). Eles aparecem no PDF.');
    const semPreco = db.catalogo.filter(i => st.num(i.valor) <= 0).length;
    if (semPreco) avisos.push(`<a href="#/catalogo">Defina os preços do catálogo</a>: ${semPreco} itens estão sem valor. Exclua os serviços que você não oferece.`);

    app.innerHTML = `
      ${avisos.length ? `<div class="aviso">${ICON.alerta}<div><p><b>Para começar</b></p><ul>${avisos.map(a => `<li>${a}</li>`).join('')}</ul></div></div>` : ''}
      <div class="stats">
        <div class="stat"><div class="rot">Orçamentos no mês</div><div class="num">${doMes.length}</div></div>
        <div class="stat"><div class="rot">Aguardando resposta</div><div class="num">${st.brl(soma(abertos))}</div></div>
        <div class="stat"><div class="rot">Aprovados (total)</div><div class="num">${st.brl(soma(aprovados))}</div></div>
        <div class="stat"><div class="rot">Taxa de aprovação</div><div class="num">${taxa}</div></div>
      </div>
      <div class="acoes"><a class="btn prim" href="#/orcamento/novo">${ICON.mais} Novo orçamento</a><a class="btn" href="#/cliente/novo">${ICON.mais} Novo cliente</a></div>
      <h2>Recentes</h2>
      ${listaOrcamentos(db.orcamentos.slice(0, 6))}`;
  }

  function listaOrcamentos(lista) {
    if (!lista.length) return `<div class="lista"><div class="vazio">${ICON.doc}<p>Nenhum orçamento ainda.</p></div></div>`;
    return `<div class="lista">${lista.map(o => {
      const c = st.cliente(o.clienteId);
      return `<a href="#/orcamento/${o.id}">
        <div class="principal"><div class="t1">${esc(c ? c.nome : 'Sem cliente')}</div>
        <div class="t2">${esc(o.numero)} · ${esc(st.dataBR(o.data))}${o.titulo ? ' · ' + esc(o.titulo) : ''}</div></div>
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
        <div class="campo c2"><label for="f-st">Status</label><select id="f-st" data-f="status">${opt(st.STATUS, o.status)}</select></div>
      </div></div>

      <h2>Itens</h2>
      <div id="itens"></div>
      <div class="acoes">
        <button class="btn" id="add-cat" type="button">${ICON.lista} Do catálogo</button>
        <button class="btn" id="add-item" type="button">${ICON.mais} Item avulso</button>
      </div>

      <h2>Valores</h2>
      <div class="card">
        <div class="campos">
          <div class="campo c3 m3"><label for="f-dt">Desconto em</label>
            <select id="f-dt" data-f="descontoTipo"><option value="%" ${o.descontoTipo === '%' ? 'selected' : ''}>Percentual (%)</option><option value="R$" ${o.descontoTipo === 'R$' ? 'selected' : ''}>Valor (R$)</option></select></div>
          <div class="campo c3 m3"><label for="f-desc">Desconto</label><input id="f-desc" class="num" inputmode="decimal" data-f="desconto" value="${esc(st.num(o.desconto) ? st.dec(o.desconto) : '')}" placeholder="0,00"></div>
        </div>
        <div class="sep"></div>
        <div class="resumo" id="resumo"></div>
      </div>

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

    function desenharItens() {
      if (!o.itens.length) {
        elItens.innerHTML = `<div class="lista"><div class="vazio">${ICON.doc}<p>Nenhum item. Adicione do catálogo ou um item avulso.</p></div></div>`;
        return;
      }
      elItens.innerHTML = o.itens.map((it, i) => `
        <div class="item ${st.num(it.valor) <= 0 ? 'sem-valor' : ''}" data-idx="${i}">
          <div class="item-topo"><span class="n">ITEM ${i + 1}</span>
            <button class="icon-btn" data-acao="rem" aria-label="Remover item ${i + 1}">${ICON.lixo}</button></div>
          <div class="campos">
            <div class="campo"><input data-k="descricao" value="${esc(it.descricao)}" placeholder="Descrição do item" aria-label="Descrição"></div>
            <div class="campo c2 m3"><label>Tipo</label><select data-k="tipo">${opt(st.TIPOS_ITEM, it.tipo)}</select></div>
            <div class="campo c2 m3"><label>Unidade</label><select data-k="unidade">${opt(st.UNIDADES.includes(it.unidade) ? st.UNIDADES : [...st.UNIDADES, it.unidade], it.unidade)}</select></div>
            <div class="campo c2 m3"><label>Qtd</label><input class="num" inputmode="decimal" data-k="qtd" value="${esc(st.qtdFmt(it.qtd))}"></div>
            <div class="campo c4 m3"><label>Valor unitário (R$)</label><input class="num" inputmode="decimal" data-k="valor" value="${st.num(it.valor) ? esc(st.dec(it.valor)) : ''}" placeholder="Informe o valor"></div>
          </div>
          <div class="item-total" data-tot>${st.brl(st.num(it.qtd) * st.num(it.valor))}</div>
        </div>`).join('');
    }

    function atualizarTotais() {
      const t = st.totais(o);
      app.querySelector('#tot').textContent = st.brl(t.total);
      app.querySelector('#resumo').innerHTML = `
        <span class="muted">Subtotal</span><span class="direita">${st.brl(t.subtotal)}</span>
        <span class="muted">Desconto</span><span class="direita">- ${st.brl(t.desconto)}</span>
        <span class="forte">Total</span><span class="direita forte">${st.brl(t.total)}</span>`;
    }

    function atualizarPendencias() {
      const p = st.pendencias(o, true);
      app.querySelector('#pend').innerHTML = p.length
        ? `<div class="aviso info">${ICON.info}<div><p><b>Falta completar antes de enviar</b></p><ul>${p.map(x => `<li>${x.ir ? `<a href="${x.ir}">${esc(x.msg)}</a>` : esc(x.msg)}</li>`).join('')}</ul></div></div>`
        : '';
    }

    let tSalvar;
    function agendarSalvar() {
      clearTimeout(tSalvar);
      app.querySelector('#salvo').textContent = 'Salvando…';
      tSalvar = setTimeout(() => {
        if (st.salvarOrcamento(o)) app.querySelector('#salvo').textContent = 'Salvo automaticamente neste aparelho.';
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
      if (el.dataset.f === 'status' && el.value === 'Enviado' && !o.enviadoEm) o.enviadoEm = new Date().toISOString();
    });
    app.addEventListener('focusout', ev => {
      const el = ev.target;
      if ((el.dataset.k === 'valor' || el.dataset.f === 'desconto') && el.value) el.value = st.dec(el.value);
    });

    elItens.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-acao="rem"]'); if (!b) return;
      const i = Number(b.closest('[data-idx]').dataset.idx);
      const it = o.itens[i];
      if (it.descricao && !(await confirmar('Remover item', `Remover "${esc(it.descricao)}"?`, 'Remover', 'prim'))) return;
      o.itens.splice(i, 1);
      desenharItens(); atualizarTotais(); agendarSalvar();
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
        if (i) o.itens.push({ id: st.uid(), descricao: i.descricao, tipo: i.tipo, unidade: i.unidade, qtd: 1, valor: st.num(i.valor) });
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

    app.querySelector('#enviar').onclick = async () => {
      if (!(await checarAntes(true))) return;
      st.salvarOrcamento(o);
      const c = st.cliente(o.clienteId);
      const blob = window.PDF.gerar(o);
      const r = await window.WhatsApp.enviarPDF(o, blob);
      if (r === 'cancelado') return;
      if (o.status === 'Rascunho') { o.status = 'Enviado'; o.enviadoEm = new Date().toISOString(); st.salvarOrcamento(o); app.querySelector('#f-st').value = 'Enviado'; }
      if (r === 'compartilhado') { toast('Pronto! Orçamento marcado como enviado.'); return; }
      // Plano B: PDF baixado; abre a conversa com o contato cadastrado
      const abrir = await dialogo({
        titulo: 'Anexe o PDF na conversa',
        corpo: `<p style="margin-top:0">Este navegador não permite anexar arquivos direto no WhatsApp. O PDF <b>${esc(window.PDF.nomeArquivo(o))}</b> foi baixado.</p>
          <p>Abra a conversa com <b>${esc(c.nome)}</b> (${esc(st.telefoneFmt(c.telefone))}). A mensagem já vai escrita; depois anexe o PDF pelo clipe.</p>`,
        acoes: [{ rotulo: 'Fechar', valor: false }, { rotulo: 'Abrir conversa', classe: 'prim', valor: true }]
      });
      if (abrir) window.WhatsApp.abrirConversa(c.telefone, window.WhatsApp.mensagem(o));
    };

    document.getElementById('mais').onclick = async () => {
      const c = st.cliente(o.clienteId);
      const r = await dialogo({
        titulo: 'Opções',
        corpo: `<div class="lista">
          ${c && st.telefoneValido(c.telefone) ? `<button class="linha" data-op="msg">${ICON.conversa}<div class="principal"><div class="t1">Mensagem para ${esc(c.nome)}</div><div class="t2">Abre a conversa no WhatsApp só com o texto</div></div></button>` : ''}
          <button class="linha" data-op="baixar">${ICON.pdf}<div class="principal"><div class="t1">Baixar PDF</div></div></button>
          <button class="linha" data-op="dup">${ICON.copiar}<div class="principal"><div class="t1">Duplicar orçamento</div></div></button>
          <button class="linha" data-op="exc" style="color:var(--danger)">${ICON.lixo}<div class="principal"><div class="t1">Excluir orçamento</div></div></button>
        </div>`,
        acoes: [],
        aoAbrir: (d, fechar) => d.querySelector('.lista').addEventListener('click', e => { const b = e.target.closest('[data-op]'); if (b) fechar(b.dataset.op); })
      });
      if (r === 'msg') window.WhatsApp.abrirConversa(c.telefone, window.WhatsApp.mensagem(o));
      if (r === 'baixar') { if (await checarAntes(false)) window.WhatsApp.baixar(window.PDF.gerar(o), window.PDF.nomeArquivo(o)); }
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
      if (st.orcamentoVazio(o)) st.excluirOrcamento(o.id); else st.salvarOrcamento(o);
    };

    desenharItens(); atualizarTotais(); atualizarPendencias();
  }

  /* ---------- Clientes ---------- */
  function clientes() {
    marcarAba('clientes');
    topo('Clientes');
    app.innerHTML = `
      <div class="busca">${ICON.busca}<input type="search" id="q" placeholder="Buscar por nome, telefone ou cidade" aria-label="Buscar"></div>
      <div id="res"></div>
      <a class="fab" href="#/cliente/novo">${ICON.mais} Novo</a>`;
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

      <h2>Padrões dos novos orçamentos</h2>
      <div class="card" id="pad"><div class="campos">
        <div class="campo c3 m3"><label for="p-pre">Prefixo do número</label><input id="p-pre" data-f="prefixo" value="${esc(e.prefixo)}" maxlength="8"><span class="ajuda">Ex.: ${esc(e.prefixo || 'ORC')}-${new Date().getFullYear()}-0001</span></div>
        <div class="campo c3 m3"><label for="p-val">Validade (dias)</label><input id="p-val" data-f="validadeDias" type="number" min="1" value="${esc(e.validadeDias)}"></div>
        <div class="campo"><label for="p-pz">Prazo de execução</label><textarea id="p-pz" data-f="prazoPadrao">${esc(e.prazoPadrao)}</textarea></div>
        <div class="campo"><label for="p-pg">Condições de pagamento</label><textarea id="p-pg" data-f="pagamentoPadrao">${esc(e.pagamentoPadrao)}</textarea></div>
        <div class="campo"><label for="p-ga">Garantia</label><textarea id="p-ga" data-f="garantiaPadrao">${esc(e.garantiaPadrao)}</textarea></div>
        <div class="campo"><label for="p-ob">Observações</label><textarea id="p-ob" data-f="observacoesPadrao">${esc(e.observacoesPadrao)}</textarea></div>
        <div class="campo"><label for="p-msg">Mensagem do WhatsApp</label><textarea id="p-msg" data-f="mensagemPadrao" rows="4">${esc(e.mensagemPadrao)}</textarea>
          <span class="ajuda">Use {cliente}, {numero}, {titulo}, {total}, {validade} e {empresa}.</span></div>
      </div></div>

      <h2>Catálogo</h2>
      <div class="lista"><a href="#/catalogo">${ICON.lista}<div class="principal"><div class="t1">Itens e preços</div><div class="t2">${st.db.catalogo.length} itens cadastrados</div></div></a></div>

      <h2>Backup</h2>
      <div class="card">
        <p class="ajuda" style="margin-top:0">Os dados ficam só neste aparelho. Exporte um backup com frequência e importe para levar a outro aparelho.</p>
        <div class="acoes" style="margin-top:8px">
          <button class="btn" id="exp">Exportar backup</button>
          <label class="btn" style="color:var(--text)">Importar backup<input type="file" id="imp" accept="application/json,.json" hidden></label>
        </div>
      </div>

      <div id="instalar"></div>
      <p class="ajuda" style="text-align:center;margin-top:24px">Orçamentos PWA · v1.2.1</p>`;

    const salvarEmpresa = () => {
      Object.assign(st.db.empresa, lerCampos(app.querySelector('#emp')), lerCampos(app.querySelector('#cores')), lerCampos(app.querySelector('#pad')));
      st.db.empresa.telefone = st.soDigitos(st.db.empresa.telefone);
      st.db.empresa.validadeDias = parseInt(st.db.empresa.validadeDias, 10) || 15;
      st.salvar();
    };
    let t;
    app.addEventListener('input', () => { clearTimeout(t); t = setTimeout(salvarEmpresa, 300); });
    limparTela = () => { clearTimeout(t); salvarEmpresa(); };

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

    app.querySelector('#logo').addEventListener('change', async ev => {
      const f = ev.target.files[0]; if (!f) return;
      try {
        st.db.empresa.logo = await reduzirImagem(f, 400);
        st.salvar(); toast('Logo atualizado.'); limparTela = null; ajustes();
      } catch (err) { toast('Não foi possível ler a imagem.'); }
    });
    const rl = app.querySelector('#rem-logo');
    if (rl) rl.onclick = () => { st.db.empresa.logo = ''; st.salvar(); limparTela = null; ajustes(); };

    app.querySelector('#exp').onclick = () => {
      const blob = new Blob([st.exportar()], { type: 'application/json' });
      window.WhatsApp.baixar(blob, `backup-orcamentos-${st.hoje()}.json`);
    };
    app.querySelector('#imp').addEventListener('change', async ev => {
      const f = ev.target.files[0]; if (!f) return;
      const texto = await f.text();
      if (!(await confirmar('Importar backup', 'Os dados atuais deste aparelho serão substituídos pelos do arquivo. Continuar?', 'Importar'))) return;
      try { st.importar(texto); toast('Backup importado.'); limparTela = null; ajustes(); }
      catch (err) { toast(err.message || 'Arquivo inválido.'); }
    });

    if (promptInstalar) {
      app.querySelector('#instalar').innerHTML = `<div class="acoes"><button class="btn prim bloco" id="inst">Instalar o app neste aparelho</button></div>`;
      app.querySelector('#inst').onclick = async () => { promptInstalar.prompt(); await promptInstalar.userChoice; promptInstalar = null; ajustes(); };
    }
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
              <div class="principal"><div class="t1">${esc(i.descricao)}</div><div class="t2">${esc(i.tipo)} · ${esc(i.unidade)}</div></div>
              <div class="valor">${preco(i)}</div></label>`
          : `<button class="linha" data-grupo="${esc(g)}" data-id="${i.id}"><div class="principal"><div class="t1">${esc(i.descricao)}</div><div class="t2">${esc(i.tipo)} · ${esc(i.unidade)}</div></div>
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
      </div>`,
      acoes
    });
    const voltar = () => { catalogo(); window.scrollTo(0, rolagem); };
    if (r === 'salvar') { st.salvarItemCatalogo({ ...it, ...dados, descricao: dados.descricao.trim(), valor: st.num(dados.valor) }); toast('Item salvo.'); voltar(); }
    if (r === 'excluir' && await confirmar('Excluir item', `Excluir "${esc(it.descricao)}" do catálogo?`, 'Excluir')) { st.excluirItemCatalogo(it.id); voltar(); }
  }

  /* ---------- Início do app ---------- */
  // Formata telefone ao sair do campo
  document.addEventListener('focusout', e => {
    if (e.target.matches('input[type="tel"]') && e.target.value) e.target.value = st.telefoneFmt(st.soDigitos(e.target.value));
  });

  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  render();
})();
