/* Telas e seções dos recursos extras. Usa window.UI (exposto por app.js)
   e as regras de js/extras.js. Telas: #/calculadoras · #/ferramentas · #/inspecao/:id */
(function () {
  'use strict';
  const st = () => window.Store, X = () => window.Extras, U = () => window.UI;

  /* ---------- Mensagens de WhatsApp ---------- */
  const primeiro = c => String((c && c.nome) || '').trim().split(/\s+/)[0] || '';
  function pixTexto(valor, o) {
    const e = st().db.empresa;
    if (!e.pixChave) return '';
    try { return window.Pix.codigo({ chave: e.pixChave, nome: e.pixNome || e.nome, cidade: e.pixCidade || e.cidade, valor, txid: String(o.numero).replace(/[^A-Za-z0-9]/g, '') }); } catch (er) { return ''; }
  }
  function mensagem(tipo, o) {
    const s = st(), e = s.db.empresa, c = s.cliente(o.clienteId) || {}, f = X().financeiro(o), n = primeiro(c);
    const assinatura = e.nome ? '\n' + e.nome : '';
    const pix = v => { const p = pixTexto(v, o); return p ? `\n\nPix copia e cola:\n${p}` : (e.pixChave ? `\n\nChave Pix: ${e.pixChave}` : ''); };
    switch (tipo) {
      case 'cobrar': return `Olá, ${n}! Tudo bem? Passando para saber se conseguiu ver o orçamento ${o.numero}${o.titulo ? ' (' + o.titulo + ')' : ''}. Fico à disposição para tirar dúvidas ou ajustar o que precisar.${assinatura}`;
      case 'cobrarSinal': return `Olá, ${n}! Para confirmar a data do serviço (orçamento ${o.numero}), o sinal é de ${s.brl(f.sinal)}.${pix(Math.max(0, f.sinal - f.recebido))}${assinatura}`;
      case 'cobrarSaldo': return `Olá, ${n}! Segue o valor restante do serviço (orçamento ${o.numero}): ${s.brl(f.saldo)}.${pix(f.saldo)}${assinatura}`;
      case 'avaliacao': return `Olá, ${n}! Obrigado pela confiança no serviço. Se puder, deixe sua avaliação, ajuda muito o meu trabalho: ${e.linkAvaliacao}${assinatura}`;
      case 'manutencao': return `Olá, ${n}! Já faz um tempo desde o serviço elétrico (${o.titulo || o.numero}). Recomendo uma revisão preventiva: aperto das conexões do quadro, teste do DR e verificação de aquecimento. Quer agendar?${assinatura}`;
    }
    return '';
  }
  function enviarMsg(tipo, o) {
    const c = st().cliente(o.clienteId);
    if (!c || !st().telefoneValido(c.telefone)) { U().toast('Cliente sem WhatsApp válido.'); return false; }
    window.WhatsApp.abrirConversa(c.telefone, mensagem(tipo, o));
    return true;
  }

  /* ---------- Pendências no Início ---------- */
  const ICONES = { resposta: 'conversa', sinal: 'relogio', saldo: 'relogio', entrega: 'entrega', avaliacao: 'conversa', garantia: 'info', manutencao: 'agenda' };
  const ROT_ACAO = { cobrar: 'Cobrar resposta', cobrarSinal: 'Cobrar sinal', cobrarSaldo: 'Cobrar saldo', entrega: 'Abrir', avaliacao: 'Pedir', abrir: 'Abrir', manutencao: 'Oferecer revisão' };
  function inicioHtml() {
    const s = st(), I = U().ICON, esc = U().esc;
    const P = X().pendencias();
    const aReceber = s.db.orcamentos.filter(o => o.status === 'Aprovado' || o.status === 'Concluído').reduce((t, o) => t + X().financeiro(o).saldo, 0);
    const lista = P.slice(0, 8).map((p, i) => { const c = s.cliente(p.o.clienteId); return `
      <div class="linha pend-l"><span class="ag-ic ${['sinal', 'saldo'].includes(p.tipo) ? 'alerta' : p.tipo === 'manutencao' ? 'ok' : 'ok'}">${I[ICONES[p.tipo]] || I.info}</span>
        <a class="principal" href="#/orcamento/${p.o.id}"><div class="t1">${esc(c ? c.nome : 'Sem cliente')}</div><div class="t2">${esc(p.msg)} · ${esc(p.o.numero)}</div></a>
        <button class="btn btn-peq" type="button" data-pi="${i}">${ROT_ACAO[p.acao]}</button>
        <button class="icon-btn" type="button" data-px="${i}" aria-label="Dispensar">${I.fechar}</button></div>`; }).join('');
    return { html: `${P.length ? `<h2>Pendências <span class="muted" style="text-transform:none;letter-spacing:0">(${P.length})</span></h2><div class="lista" id="pend-ini">${lista}</div>` : ''}`, aReceber, P };
  }
  function inicioLigar(raiz, P, refazer) {
    const el = raiz.querySelector('#pend-ini'); if (!el) return;
    el.addEventListener('click', ev => {
      const b = ev.target.closest('[data-pi],[data-px]'); if (!b) return;
      const p = P[Number(b.dataset.pi != null ? b.dataset.pi : b.dataset.px)];
      const o = st().orcamento(p.o.id);
      if (b.dataset.px != null) { o.lembretesOcultos = { ...(o.lembretesOcultos || {}), [p.chave]: new Date().toISOString() }; st().salvarOrcamento(o); refazer(); return; }
      if (['entrega', 'abrir'].includes(p.acao)) { location.hash = '#/orcamento/' + o.id; return; }
      if (enviarMsg(p.acao, o)) {
        if (p.acao === 'avaliacao') o.avaliacaoPedidaEm = new Date().toISOString();
        if (p.acao === 'manutencao') o.manutencaoOferecidaEm = new Date().toISOString();
        if (p.acao === 'cobrar') o.lembretesOcultos = { ...(o.lembretesOcultos || {}), resposta: new Date().toISOString() };
        st().salvarOrcamento(o); setTimeout(refazer, 500);
      }
    });
  }

  /* ---------- Seções do editor de orçamento ---------- */
  function editor(ctx) {
    const s = st(), { esc, ICON, toast, dialogo, confirmar } = U();
    const o = ctx.o, raiz = ctx.app;
    const e = s.db.empresa;

    // Margem e lucro (no card Valores)
    function desenharMargem() {
      const m = X().margem(o), el = raiz.querySelector('#margem'); if (!el) return;
      const baixo = m.custo > 0 && m.pct < m.minimo;
      el.innerHTML = `<div class="sep"></div><div class="resumo">
        <span class="muted">Custo estimado</span><span class="direita">${s.brl(m.custo)}</span>
        <span class="muted">Lucro</span><span class="direita ${baixo ? 'tx-perigo' : 'tx-ok'}">${s.brl(m.lucro)} (${s.dec(m.pct, 0)}%)</span></div>
        ${baixo ? `<p class="ajuda tx-perigo" style="margin:6px 0 0">Margem abaixo do mínimo de ${s.dec(m.minimo, 0)}% (Ajustes).</p>` : ''}
        ${m.semCusto ? `<p class="ajuda" style="margin:6px 0 0">${m.semCusto} material(is) sem custo informado: o lucro pode estar maior que o real.</p>` : ''}
        <p class="ajuda" style="margin:4px 0 0">Só você vê: custo e lucro não vão para o PDF.</p>`;
    }

    // Pagamentos
    function desenharPagamentos() {
      const f = X().financeiro(o), el = raiz.querySelector('#pag'); if (!el) return;
      const L = o.pagamentos || [];
      el.innerHTML = `
        <div class="campos">
          <div class="campo c3 m3"><label for="pg-sinal">Sinal na aprovação (%)</label><input id="pg-sinal" class="num" inputmode="decimal" value="${esc(s.dec(f.sinalPct, 0))}"></div>
          <div class="campo c3 m3" style="justify-content:flex-end"><label class="check"><input type="checkbox" id="pg-pix" ${o.pixNoPdf !== false ? 'checked' : ''} ${e.pixChave ? '' : 'disabled'}> Pix (QR Code) no PDF</label></div>
        </div>
        ${!e.pixChave ? '<p class="ajuda" style="margin:6px 0 0">Cadastre a chave Pix em Ajustes → Pix e pagamentos para o QR Code sair no PDF.</p>' : ''}
        <div class="sep"></div>
        <div class="resumo">
          ${f.sinalPct > 0 ? `<span class="muted">Sinal (${s.dec(f.sinalPct, 0)}%)</span><span class="direita">${s.brl(f.sinal)}</span>` : ''}
          <span class="muted">Recebido</span><span class="direita tx-ok">${s.brl(f.recebido)}</span>
          <span class="forte">A receber</span><span class="direita forte">${s.brl(f.saldo)}</span></div>
        ${L.length ? `<div class="lista" style="margin-top:10px">${L.map((p, i) => `<div class="linha"><div class="principal"><div class="t1">${s.brl(p.valor)} · ${esc(p.forma)}</div><div class="t2">${esc(s.dataBR(p.data))}${p.obs ? ' · ' + esc(p.obs) : ''}</div></div>
          <button class="btn btn-peq" type="button" data-rec="${i}">${ICON.pdf} Recibo</button><button class="icon-btn" type="button" data-prem="${i}" aria-label="Excluir pagamento">${ICON.lixo}</button></div>`).join('')}</div>` : ''}
        <div class="acoes"><button class="btn prim" type="button" id="pg-add">${ICON.mais} Registrar pagamento</button>
          ${f.saldo > 0.009 && (s.cliente(o.clienteId) || {}).telefone ? `<button class="btn" type="button" id="pg-cobrar">${ICON.conversa} Cobrar ${f.sinalPendente ? 'sinal' : 'saldo'}</button>` : ''}</div>`;
    }
    raiz.querySelector('#pag').addEventListener('change', ev => {
      if (ev.target.id === 'pg-sinal') { o.sinalPct = Math.min(100, Math.max(0, s.num(ev.target.value))); ctx.salvar(); desenharPagamentos(); }
      if (ev.target.id === 'pg-pix') { o.pixNoPdf = ev.target.checked; ctx.salvar(); }
    });
    raiz.querySelector('#pag').addEventListener('click', async ev => {
      const t = ev.target;
      if (t.closest('#pg-add')) {
        const f = X().financeiro(o); let dados = null;
        const sugest = f.sinalPendente ? Math.max(0, f.sinal - f.recebido) : f.saldo;
        await dialogo({
          titulo: 'Registrar pagamento',
          corpo: `<div class="campos">
            <div class="campo c3 m3"><label for="rp-v">Valor (R$)</label><input id="rp-v" class="num" inputmode="decimal" value="${esc(s.dec(sugest))}"></div>
            <div class="campo c3 m3"><label for="rp-d">Data</label><input id="rp-d" type="date" value="${s.hoje()}"></div>
            <div class="campo"><label for="rp-f">Forma</label><select id="rp-f">${['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência', 'Boleto'].map(x => `<option>${x}</option>`).join('')}</select></div>
            <div class="campo"><label for="rp-o">Observação</label><input id="rp-o" placeholder="Ex.: sinal, 2ª parcela"></div></div>`,
          acoes: [{ rotulo: 'Cancelar', valor: null }, { rotulo: 'Registrar', classe: 'prim', valor: 'ok', antes: d => {
            const v = s.num(d.querySelector('#rp-v').value); if (!(v > 0)) { d.querySelector('#rp-v').classList.add('invalido'); return false; }
            dados = { id: s.uid(), valor: v, data: d.querySelector('#rp-d').value || s.hoje(), forma: d.querySelector('#rp-f').value, obs: d.querySelector('#rp-o').value.trim() };
          } }]
        });
        if (!dados) return;
        o.pagamentos = [...(o.pagamentos || []), dados]; ctx.salvar(); desenharPagamentos(); toast('Pagamento registrado.');
        if (await confirmar('Recibo', 'Gerar o recibo deste pagamento?', 'Gerar recibo')) recibo(dados);
      }
      const r = t.closest('[data-rec]'); if (r) recibo(o.pagamentos[Number(r.dataset.rec)]);
      const x = t.closest('[data-prem]');
      if (x && await confirmar('Excluir pagamento', 'Excluir este pagamento registrado?', 'Excluir')) { o.pagamentos.splice(Number(x.dataset.prem), 1); ctx.salvar(); desenharPagamentos(); }
      if (t.closest('#pg-cobrar')) enviarMsg(X().financeiro(o).sinalPendente ? 'cobrarSinal' : 'cobrarSaldo', o);
    });
    async function recibo(p) {
      const blob = window.PDF.gerarRecibo(o, p), nome = `Recibo-${String(o.numero).replace(/[^\w-]/g, '')}-${p.data}.pdf`;
      const c = s.cliente(o.clienteId);
      const r = await dialogo({ titulo: 'Recibo pronto', corpo: `<p style="margin-top:0">Recibo de ${s.brl(p.valor)} para ${esc(c ? c.nome : 'o cliente')}.</p>`, acoes: [{ rotulo: 'Baixar', valor: 'b' }, ...(c && s.telefoneValido(c.telefone) ? [{ rotulo: 'Enviar', classe: 'prim', valor: 'e' }] : [])] });
      if (r === 'b') window.WhatsApp.baixar(blob, nome);
      if (r === 'e') { const res = await window.WhatsApp.enviarArquivos([{ blob, nome }], 'Recibo ' + o.numero, ''); if (res === 'fallback') window.WhatsApp.abrirConversa(c.telefone, `Olá, ${primeiro(c)}! Segue o recibo do pagamento de ${s.brl(p.valor)}.`); }
    }

    // Ferramentas e equipamentos
    function desenharFerramentas() {
      const el = raiz.querySelector('#ferr'); if (!el) return;
      const sel = (o.ferramentas && o.ferramentas.kits) || [];
      const modo = (o.ferramentas && o.ferramentas.modo) || e.ferrModo || 'custo';
      const c = X().custoKits(sel);
      el.innerHTML = `<div class="chips multi" id="fk">${X().kits().map(k => `<button type="button" class="chip ${sel.includes(k.id) ? 'ativo' : ''}" data-k="${k.id}">${esc(k.nome)}</button>`).join('')}</div>
        ${sel.length ? `<div class="resumo" style="margin-top:6px">
          <span class="muted">Desgaste (ferramentas próprias)</span><span class="direita">${s.brl(c.propria)}</span>
          <span class="muted">Aluguel</span><span class="direita">${s.brl(c.aluguel)}</span>
          <span class="forte">Total</span><span class="direita forte">${s.brl(c.total)}</span></div>
          <details class="ajuda" style="margin-top:6px"><summary>Detalhe por ferramenta</summary><ul style="padding-left:18px;margin:6px 0 0">${c.linhas.map(l => `<li>${esc(l.f.nome)}: ${l.f.tipo === 'aluguel' ? `${s.dec(l.uso.dias || 1, 0)} diária(s)` : s.num(l.f.fixo) > 0 ? 'valor fixo' : `${s.dec(l.uso.horas, 1)} h`} → ${s.brl(l.custo)}</li>`).join('')}</ul></details>
          <div class="campo" style="margin-top:10px"><label for="fk-modo">Como entra no orçamento</label><select id="fk-modo">
            <option value="custo" ${modo === 'custo' ? 'selected' : ''}>Só no custo (cliente não vê; reduz o lucro)</option>
            <option value="item" ${modo === 'item' ? 'selected' : ''}>Cobrar como item "Uso e aluguel de equipamentos"</option></select></div>` : '<p class="ajuda" style="margin:6px 0 0">Escolha os tipos de serviço para estimar o desgaste das suas ferramentas e o aluguel de equipamentos. Edite ferramentas e kits em Ajustes.</p>'}`;
    }
    const aplicarFerr = (ids, modo) => { X().aplicarFerramentas(o, ids, modo); ctx.redesenhar(); desenharFerramentas(); };
    raiz.querySelector('#ferr').addEventListener('click', ev => {
      const b = ev.target.closest('[data-k]'); if (!b) return;
      const sel = new Set((o.ferramentas && o.ferramentas.kits) || []);
      sel.has(b.dataset.k) ? sel.delete(b.dataset.k) : sel.add(b.dataset.k);
      aplicarFerr([...sel], (o.ferramentas && o.ferramentas.modo) || e.ferrModo || 'custo');
    });
    raiz.querySelector('#ferr').addEventListener('change', ev => { if (ev.target.id === 'fk-modo') aplicarFerr(o.ferramentas.kits, ev.target.value); });

    // Previsão de cargas
    raiz.querySelector('#cargas').onclick = () => previsaoCargas(ctx);
    // Lista de materiais
    raiz.querySelector('#lista-mat').onclick = () => listaMateriais(ctx);
    // Fotos do serviço
    raiz.querySelector('#anx-foto').addEventListener('change', async ev => {
      const fs = [...ev.target.files]; ev.target.value = ''; if (!fs.length) return;
      const etapa = await dialogo({ titulo: `${fs.length} foto(s)`, corpo: '<p style="margin-top:0">Qual etapa do serviço?</p>', acoes: ['Antes', 'Durante', 'Depois'].map(x => ({ rotulo: x, classe: x === 'Depois' ? 'prim' : '', valor: x })) });
      if (!etapa) return;
      const ja = (o.anexos || []).filter(a => a.etapa === etapa).length;
      for (let i = 0; i < fs.length; i++) {
        const blob = await reduzirFoto(fs[i]);
        const f = await ctx.guardarArquivo(blob, `${etapa} ${ja + i + 1} - ${s.dataBR(s.hoje())}.jpg`, 'arquivo');
        if (f) { f.etapa = etapa; }
      }
      ctx.salvar(); ctx.desenharAnexos(); toast(`${fs.length} foto(s) guardada(s).`);
    });
    raiz.querySelector('#anx-gfotos').onclick = () => enviarGoogleFotos(ctx);

    ctx.aoTotais = () => { desenharMargem(); desenharPagamentos(); };
    desenharFerramentas(); desenharMargem(); desenharPagamentos();
  }

  // Reduz fotos grandes (economiza espaço e envio): lado maior 2000 px, JPEG 85%
  function reduzirFoto(file) {
    return new Promise(ok => {
      if (!/^image\/(jpeg|png|webp)/.test(file.type)) { ok(file); return; }
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        const esc = Math.min(1, 2000 / Math.max(im.naturalWidth, im.naturalHeight));
        if (esc >= 1 && file.size < 1.5e6) { URL.revokeObjectURL(url); ok(file); return; }
        const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * esc); c.height = Math.round(im.naturalHeight * esc);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        c.toBlob(b => { URL.revokeObjectURL(url); ok(b || file); }, 'image/jpeg', 0.85);
      };
      im.onerror = () => { URL.revokeObjectURL(url); ok(file); };
      im.src = url;
    });
  }

  /* ---------- Google Fotos ---------- */
  async function enviarGoogleFotos(ctx) {
    const s = st(), { esc, toast, dialogo } = U(), o = ctx.o, e = s.db.empresa;
    const fotos = (o.anexos || []).filter(a => a.tipo === 'arquivo' && /^image\//.test(a.mime || '') && !a.gfotos);
    if (!fotos.length) { toast((o.anexos || []).some(a => a.gfotos) ? 'Todas as fotos já foram enviadas.' : 'Nenhuma foto anexada. Use "Fotos do serviço".'); return; }
    if (!e.googleClientId) {
      await dialogo({ titulo: 'Configurar o Google Fotos', corpo: `<p style="margin-top:0">Para enviar as fotos direto para um álbum, cadastre o <b>ID do cliente do Google</b> em <a href="#/ajustes">Ajustes → Google Fotos</a> (passo a passo de 10 minutos, gratuito).</p><p class="ajuda">Enquanto isso, você pode usar "Compartilhar" e escolher o app Google Fotos.</p>`, acoes: [{ rotulo: 'Fechar', valor: null }, { rotulo: 'Compartilhar', classe: 'prim', valor: 'c', antes: () => { compartilharFotos(fotos); } }] });
      return;
    }
    const c = s.cliente(o.clienteId);
    const titulo = `${o.numero} - ${c ? c.nome : 'cliente'}${o.titulo ? ' - ' + o.titulo : ''}`;
    if (!navigator.onLine) { toast('Sem internet.'); return; }
    toast(`Enviando ${fotos.length} foto(s) para o álbum "${titulo}"…`);
    try {
      const itens = [];
      for (const a of fotos) { const b = await window.Arquivos.obter(a.id); if (b) itens.push({ blob: b, nome: a.nome, descricao: `${titulo} · ${a.etapa || ''}`, a }); }
      let r;
      try { r = await window.GoogleFotos.enviarParaAlbum({ clientId: e.googleClientId, albumId: o.googleAlbumId, tituloAlbum: titulo, fotos: itens, progresso: (i, n) => { if (i < n) toast(`Enviando foto ${i + 1} de ${n}…`); } }); }
      catch (er) { if (er.albumInvalido) { o.googleAlbumId = ''; r = await window.GoogleFotos.enviarParaAlbum({ clientId: e.googleClientId, tituloAlbum: titulo, fotos: itens }); } else throw er; }
      o.googleAlbumId = r.albumId;
      r.enviados.forEach(x => { x.a.gfotos = true; });
      ctx.salvar(); ctx.desenharAnexos();
      if (r.erros.length) await dialogo({ titulo: 'Algumas fotos não foram', corpo: `<ul style="padding-left:18px;margin:0">${r.erros.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` });
      else toast(`${r.enviados.length} foto(s) no álbum "${titulo}" do Google Fotos.`);
    } catch (er) {
      await dialogo({ titulo: 'Não foi possível enviar', corpo: `<p style="margin-top:0">${esc(er.message || er)}</p><p class="ajuda">Você pode usar "Compartilhar" e escolher o app Google Fotos.</p>`, acoes: [{ rotulo: 'Fechar', valor: null }, { rotulo: 'Compartilhar', classe: 'prim', valor: 'c', antes: () => { compartilharFotos(fotos); } }] });
    }
  }
  async function compartilharFotos(fotos) {
    const arqs = [];
    for (const a of fotos) { const b = await window.Arquivos.obter(a.id); if (b) arqs.push({ blob: b, nome: a.nome }); }
    if (arqs.length) window.WhatsApp.enviarArquivos(arqs, 'Fotos do serviço', '');
  }

  /* ---------- Previsão de cargas ---------- */
  async function previsaoCargas(ctx) {
    const s = st(), { esc, ICON, toast, dialogo } = U(), o = ctx.o;
    const dados = JSON.parse(JSON.stringify(o.cargas || { comodos: [{ nome: 'Sala', tipo: 'Sala', larg: '', comp: '' }], tues: [] }));
    const vFN = s.ligacoes(o).vFN;
    const linhaC = (c, i) => `<div class="item cg-c" data-i="${i}"><div class="campos">
      <div class="campo c2 m3"><label>Cômodo</label><input data-c="nome" value="${esc(c.nome)}"></div>
      <div class="campo c2 m3"><label>Tipo</label><select data-c="tipo">${X().TIPOS_COMODO.map(t => `<option ${t === c.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="campo c1 m3"><label>Largura (m)</label><input class="num" inputmode="decimal" data-c="larg" value="${esc(c.larg)}"></div>
      <div class="campo c1 m3"><label>Compr. (m)</label><input class="num" inputmode="decimal" data-c="comp" value="${esc(c.comp)}"></div>
      </div><div class="row" style="justify-content:space-between;margin-top:6px"><span class="ajuda cg-res" style="margin:0"></span><button class="icon-btn" type="button" data-rc="${i}" aria-label="Remover cômodo">${ICON.lixo}</button></div></div>`;
    const vFF = s.ligacoes(o).vFF;
    // Tensão do equipamento: escolhida, ou automática (acima de 2.000 W vai entre fases)
    const tensaoTUE = t => s.num(t.tensao) || (s.num(t.potencia) > 2000 && vFF !== vFN ? vFF : vFN);
    const linhaT = (t, i) => `<div class="row cg-t" data-t="${i}" style="gap:8px;margin-top:6px"><input data-tt="nome" value="${esc(t.nome)}" placeholder="Ex.: Chuveiro" style="flex:2;min-width:0">
      <input class="num" inputmode="decimal" data-tt="potencia" value="${esc(t.potencia)}" placeholder="W" style="flex:1;min-width:0">
      <select data-tt="tensao" style="flex:1;min-width:0"><option value="">Auto</option>${[...new Set([vFN, vFF])].map(v => `<option value="${v}" ${String(t.tensao) === String(v) ? 'selected' : ''}>${v} V</option>`).join('')}</select>
      <button class="icon-btn" type="button" data-rt="${i}" aria-label="Remover">${ICON.lixo}</button></div>`;
    const r = await dialogo({
      titulo: 'Previsão de cargas (NBR 5410)',
      corpo: `<p class="ajuda" style="margin-top:0">Mínimos da NBR 5410:2004 (9.5.2) para locais de habitação: iluminação pela área e tomadas pelo perímetro. Informe as medidas de cada cômodo e os equipamentos de uso específico.</p>
        <div id="cg-com"></div><div class="acoes"><button class="btn" type="button" id="cg-addc">${ICON.mais} Cômodo</button></div>
        <h2>Equipamentos (chuveiro, ar, forno...)</h2><div id="cg-tue"></div><div class="acoes"><button class="btn" type="button" id="cg-addt">${ICON.mais} Equipamento</button></div>
        <h2>Circuitos sugeridos</h2><div id="cg-circ"></div>`,
      acoes: [{ rotulo: 'Cancelar', valor: null }, { rotulo: 'Criar circuitos', classe: 'prim', valor: 'ok' }],
      aoAbrir: d => {
        d.classList.add('largo');
        const desenhar = () => {
          d.querySelector('#cg-com').innerHTML = dados.comodos.map(linhaC).join('');
          d.querySelector('#cg-tue').innerHTML = dados.tues.map(linhaT).join('') || '<p class="ajuda" style="margin:0">Nenhum.</p>';
          calcular();
        };
        const comodos = () => dados.comodos.map(c => { const L = s.num(c.larg), C = s.num(c.comp); return { ...c, area: L * C, perimetro: 2 * (L + C) }; });
        function calcular() {
          const cs = comodos();
          d.querySelectorAll('.cg-c').forEach((el, i) => {
            const c = cs[i]; if (!(c.area > 0)) { el.querySelector('.cg-res').textContent = 'Informe largura e comprimento.'; return; }
            const p = X().previsaoComodo(c);
            el.querySelector('.cg-res').textContent = `${s.dec(c.area, 2)} m² · ${s.dec(c.perimetro, 1)} m · Iluminação ${p.ilum} VA · ${p.tugQtd} tomada(s) ${p.tugVA} VA`;
          });
          const sug = X().sugerirCircuitos(cs.filter(c => c.area > 0), dados.tues.map(t => ({ ...t, tensao: tensaoTUE(t) })), vFN);
          d.querySelector('#cg-circ').innerHTML = sug.circuitos.length ? `<div class="lista">${sug.circuitos.map(c => `<div class="linha"><div class="principal"><div class="t1" style="white-space:normal">${esc(c.nome)}</div><div class="t2">${esc(c.tipo)}${c.tensao ? ' · ' + c.tensao + ' V' : ''}</div></div><div class="valor">${s.dec(c.va, 0)} VA</div></div>`).join('')}</div>
            <p class="ajuda"><b>Total previsto: ${s.dec(sug.totalVA, 0)} VA.</b> Os circuitos entram no dimensionamento com a potência em VA; revise o comprimento de cada um.</p>` : '<p class="ajuda">Preencha os cômodos para ver a sugestão.</p>';
          dados._sug = sug;
        }
        d.addEventListener('input', ev => {
          const ci = ev.target.closest('.cg-c'), ti = ev.target.closest('.cg-t');
          if (ci && ev.target.dataset.c) dados.comodos[Number(ci.dataset.i)][ev.target.dataset.c] = ev.target.value;
          if (ti && ev.target.dataset.tt) dados.tues[Number(ti.dataset.t)][ev.target.dataset.tt] = ev.target.value;
          calcular();
        });
        d.addEventListener('change', ev => {
          const ci = ev.target.closest('.cg-c'), ti = ev.target.closest('.cg-t');
          if (ci && ev.target.dataset.c === 'tipo') {
            const c = dados.comodos[Number(ci.dataset.i)];
            if (/^Cômodo \d+$/.test(c.nome) || X().TIPOS_COMODO.includes(c.nome)) { c.nome = ev.target.value; ci.querySelector('[data-c="nome"]').value = c.nome; } // nome automático pelo tipo
            c.tipo = ev.target.value; calcular();
          }
          if (ti && ev.target.dataset.tt === 'tensao') { dados.tues[Number(ti.dataset.t)].tensao = ev.target.value; calcular(); }
        });
        d.addEventListener('click', ev => {
          if (ev.target.closest('#cg-addc')) { dados.comodos.push({ nome: `Cômodo ${dados.comodos.length + 1}`, tipo: 'Dormitório', larg: '', comp: '' }); desenhar(); }
          if (ev.target.closest('#cg-addt')) { dados.tues.push({ nome: '', potencia: '' }); desenhar(); }
          const rc = ev.target.closest('[data-rc]'); if (rc) { dados.comodos.splice(Number(rc.dataset.rc), 1); desenhar(); }
          const rt = ev.target.closest('[data-rt]'); if (rt) { dados.tues.splice(Number(rt.dataset.rt), 1); desenhar(); }
        });
        desenhar();
      }
    });
    const sug = dados._sug; delete dados._sug;
    o.cargas = dados; ctx.salvar();
    if (r !== 'ok' || !sug || !sug.circuitos.length) return;
    const m = s.modeloDim();
    const ent = m.entradas || [];
    const eTipo = ent.find(x => x.tipo === 'lista' && /ilumina/i.test(x.opcoes || ''));
    const ePot = ent.find(x => /^(W|VA)$/i.test(String(x.unidade).trim()) || /potenc/i.test(x.var));
    const eTen = ent.find(x => String(x.unidade).trim() === 'V' || /tens/i.test(x.var));
    o.circuitos = o.circuitos || [];
    sug.circuitos.forEach(c => {
      const en = {};
      if (eTipo) { const op = window.Formulas.opcoes(eTipo).find(v => window.Formulas.chave(v).startsWith(window.Formulas.chave(c.tipo).slice(0, 5))); if (op) en[eTipo.var] = op; }
      if (ePot) en[ePot.var] = String(c.va);
      if (eTen) en[eTen.var] = String(c.tensao || vFN);
      o.circuitos.push(s.calcularCircuito(c.nome, en));
    });
    ctx.salvar(); ctx.desenharCircuitos();
    toast(`${sug.circuitos.length} circuito(s) criado(s). Revise o comprimento de cada um.`);
  }

  /* ---------- Lista de materiais ---------- */
  async function listaMateriais(ctx) {
    const s = st(), { esc, toast, dialogo } = U(), o = ctx.o;
    if (!(o.circuitos || []).length) { toast('Adicione circuitos no dimensionamento primeiro.'); return; }
    let sobra = 10, L = X().listaMateriais(o, sobra), marcados = null;
    const r = await dialogo({
      titulo: 'Lista de materiais',
      corpo: `<p class="ajuda" style="margin-top:0">Gerada a partir do dimensionamento: cabos por seção e cor (fases, neutro e terra de cada circuito), disjuntores e proteção do quadro. Preços puxados do catálogo quando houver.</p>
        <div class="campo" style="max-width:180px"><label for="lm-s">Sobra nos cabos (%)</label><input id="lm-s" class="num" inputmode="numeric" value="10"></div>
        <div id="lm-l"></div>`,
      acoes: [{ rotulo: 'Cancelar', valor: null }, { rotulo: 'Adicionar ao orçamento', classe: 'prim', valor: 'ok', antes: d => { marcados = [...d.querySelectorAll('#lm-l input:checked')].map(x => L.itens[Number(x.value)]); } }],
      aoAbrir: d => {
        d.classList.add('largo');
        const desenhar = () => {
          d.querySelector('#lm-l').innerHTML = `${L.avisos.length ? `<p class="ajuda tx-perigo">${L.avisos.map(esc).join('<br>')}</p>` : ''}<div class="lista">${L.itens.map((it, i) => `<label class="linha" style="cursor:pointer"><input type="checkbox" value="${i}" checked style="width:20px;min-height:20px">
            <div class="principal"><div class="t1" style="white-space:normal">${esc(it.descricao)}</div><div class="t2">${s.qtdFmt(it.qtd)} ${esc(it.unidade)}${it.valor ? ' · ' + s.brl(it.valor) : ' · sem preço no catálogo'}</div></div></label>`).join('')}</div>`;
        };
        d.querySelector('#lm-s').addEventListener('input', ev => { sobra = s.num(ev.target.value); L = X().listaMateriais(o, sobra); desenhar(); });
        desenhar();
      }
    });
    if (r !== 'ok' || !marcados || !marcados.length) return;
    const antes = (o.itens || []).filter(i => i.matDim).length;
    if (antes && !(await U().confirmar('Substituir lista', `O orçamento já tem ${antes} item(ns) da lista anterior. Substituir pela nova?`, 'Substituir'))) return;
    o.itens = (o.itens || []).filter(i => !i.matDim);
    marcados.forEach(it => o.itens.push({ ...it, id: s.uid(), matDim: true }));
    ctx.redesenhar(); ctx.salvar();
    toast(`${marcados.length} material(is) adicionado(s).`);
  }

  /* ---------- Assinatura do cliente (no celular) ---------- */
  async function coletarAssinatura(o) {
    const s = st(), { esc, dialogo, toast } = U(), c = s.cliente(o.clienteId) || {};
    let img = null, nome = (o.assinaturaCliente && o.assinaturaCliente.nome) || c.nome || '';
    const r = await dialogo({
      titulo: 'Assinatura do cliente',
      corpo: `<p class="ajuda" style="margin-top:0">Peça ao cliente para assinar com o dedo. Vai no termo de entrega e no laudo.</p>
        <canvas id="as-c" class="assin-pad" width="600" height="220"></canvas>
        <div class="campo" style="margin-top:10px"><label for="as-n">Nome de quem assina</label><input id="as-n" value="${esc(nome)}"></div>`,
      acoes: [{ rotulo: 'Limpar', valor: 'limpar', antes: d => { const cv = d.querySelector('#as-c'); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); cv.dataset.vazio = '1'; return false; } },
        { rotulo: 'Cancelar', valor: null }, { rotulo: 'Salvar', classe: 'prim', valor: 'ok', antes: d => {
          const cv = d.querySelector('#as-c'); if (cv.dataset.vazio === '1') { toast('Assine no quadro.'); return false; }
          img = cv.toDataURL('image/png'); nome = d.querySelector('#as-n').value.trim();
        } }],
      aoAbrir: d => {
        const cv = d.querySelector('#as-c'), g = cv.getContext('2d'); cv.dataset.vazio = '1';
        g.lineWidth = 3.2; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#1a2a6c';
        let des = false;
        const pos = ev => { const b = cv.getBoundingClientRect(); return [(ev.clientX - b.left) * cv.width / b.width, (ev.clientY - b.top) * cv.height / b.height]; };
        cv.addEventListener('pointerdown', ev => { des = true; cv.setPointerCapture(ev.pointerId); const [x, y] = pos(ev); g.beginPath(); g.moveTo(x, y); });
        cv.addEventListener('pointermove', ev => { if (!des) return; const [x, y] = pos(ev); g.lineTo(x, y); g.stroke(); cv.dataset.vazio = '0'; });
        ['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, () => { des = false; }));
      }
    });
    if (r !== 'ok' || !img) return false;
    o.assinaturaCliente = { img, nome, data: new Date().toISOString() };
    s.salvarOrcamento(o); toast('Assinatura do cliente salva.');
    return true;
  }

  /* ---------- Tela: calculadoras ---------- */
  let calcAba = 'corrente';
  function calculadoras() {
    const s = st(), { esc, topo, marcarAba } = U(), app = U().app;
    marcarAba('inicio'); topo('Calculadoras', { voltar: '#/inicio' });
    const ABAS = [['corrente', 'Corrente'], ['queda', 'Queda de tensão'], ['potencia', 'Potência e conversões'], ['ohm', 'Lei de Ohm']];
    const N = (id, rot, v, un) => `<div class="campo c3 m3"><label for="${id}">${rot}${un ? ` <span class="muted">(${un})</span>` : ''}</label><input id="${id}" class="num" inputmode="decimal" value="${v}"></div>`;
    const Sel = (id, rot, ops, v) => `<div class="campo c3 m3"><label for="${id}">${rot}</label><select id="${id}">${ops.map(([a, b]) => `<option value="${a}" ${String(a) === String(v) ? 'selected' : ''}>${b}</option>`).join('')}</select></div>`;
    const forms = {
      corrente: `${N('c-p', 'Potência', '5500', 'W')}${Sel('c-v', 'Tensão', [[127, '127 V'], [220, '220 V'], [380, '380 V']], 220)}${N('c-fp', 'Fator de potência', '1', '')}${Sel('c-f', 'Sistema', [[1, 'Mono/bifásico'], [3, 'Trifásico']], 1)}`,
      queda: `${N('q-i', 'Corrente', '25', 'A')}${N('q-l', 'Comprimento (só ida)', '30', 'm')}${N('q-s', 'Seção do cabo', '4', 'mm²')}${Sel('q-v', 'Tensão', [[127, '127 V'], [220, '220 V'], [380, '380 V']], 220)}${Sel('q-f', 'Sistema', [[1, 'Mono/bifásico'], [3, 'Trifásico']], 1)}${Sel('q-m', 'Condutor', [['0.0172', 'Cobre'], ['0.0282', 'Alumínio']], '0.0172')}`,
      potencia: `${N('p-v', 'Valor', '1', '')}${Sel('p-u', 'Unidade', [['cv', 'CV'], ['hp', 'HP'], ['kw', 'kW'], ['kva', 'kVA'], ['btu', 'BTU/h (ar-condicionado)'], ['w', 'W']], 'cv')}${N('p-fp', 'Fator de potência (para kVA)', '0,92', '')}${N('p-ef', 'Rendimento (motores)', '0,85', '')}`,
      ohm: `${N('o-v', 'Tensão', '', 'V')}${N('o-i', 'Corrente', '', 'A')}${N('o-r', 'Resistência', '', 'Ω')}<p class="ajuda" style="grid-column:span 6">Preencha dois valores; o terceiro e a potência são calculados.</p>`
    };
    app.innerHTML = `<div class="chips" id="cc">${ABAS.map(([a, r]) => `<button class="chip ${a === calcAba ? 'ativo' : ''}" data-a="${a}">${r}</button>`).join('')}</div>
      <div class="card"><div class="campos" id="cf">${forms[calcAba]}</div></div>
      <h2>Resultado</h2><div class="lista" id="cr"></div>
      <p class="ajuda">Cálculos de referência para conferência em campo. O dimensionamento oficial do circuito é o da tela Dimensionamento.</p>`;
    const v = id => { const el = app.querySelector('#' + id); return el ? s.num(el.value) : NaN; };
    const lin = (r, val) => `<div class="linha"><div class="principal"><div class="t1">${r}</div></div><div class="valor">${val}</div></div>`;
    const fmt = (n, c = 2) => isFinite(n) && n !== 0 ? s.dec(n, c) : '-';
    function calcular() {
      let L = [];
      if (calcAba === 'corrente') {
        const P = v('c-p'), V = v('c-v'), fp = v('c-fp') || 1, f = v('c-f');
        const I = f === 3 ? P / (Math.sqrt(3) * V * fp) : P / (V * fp);
        L = [lin('Corrente', fmt(I) + ' A'), lin('Potência aparente', fmt(P / fp / 1000) + ' kVA'), lin('Disjuntor comercial acima', (([6, 10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125].find(x => x >= I)) || '> 125') + ' A <span class="muted">(confira a capacidade do cabo)</span>')];
      } else if (calcAba === 'queda') {
        const I = v('q-i'), Lm = v('q-l'), S = v('q-s'), V = v('q-v'), f = v('q-f'), rho = v('q-m');
        const k = f === 3 ? Math.sqrt(3) : 2, dv = k * rho * Lm * I / S, pct = dv / V * 100;
        const s4 = k * rho * Lm * I / (V * 0.04);
        L = [lin('Queda de tensão', fmt(dv) + ' V'), lin('Queda percentual', `<span class="${pct > 4 ? 'tx-perigo' : 'tx-ok'}">${fmt(pct)} %</span>`), lin('Seção mínima para 4%', fmt(s4) + ' mm²')];
      } else if (calcAba === 'potencia') {
        const x = v('p-v'), u = app.querySelector('#p-u').value, fp = v('p-fp') || 1, ef = v('p-ef') || 1;
        const W = { cv: x * 735.5, hp: x * 745.7, kw: x * 1000, kva: x * 1000 * fp, btu: x / 3.412, w: x }[u];
        const motor = ['cv', 'hp'].includes(u);
        L = [lin('Potência', fmt(W, 0) + ' W'), motor ? lin('Potência elétrica absorvida (÷ rendimento)', fmt(W / ef, 0) + ' W') : '', lin('kVA (÷ fator de potência)', fmt(W / fp / 1000, 3) + ' kVA'), u === 'btu' ? lin('Obs.', '<span class="muted">BTU/h é capacidade térmica; o consumo elétrico do ar é bem menor (veja a etiqueta)</span>') : ''].filter(Boolean);
      } else {
        let V = v('o-v'), I = v('o-i'), R = v('o-r');
        if (V > 0 && I > 0) R = V / I; else if (V > 0 && R > 0) I = V / R; else if (I > 0 && R > 0) V = I * R;
        L = [lin('Tensão', fmt(V) + ' V'), lin('Corrente', fmt(I, 3) + ' A'), lin('Resistência', fmt(R) + ' Ω'), lin('Potência', fmt(V * I) + ' W')];
      }
      app.querySelector('#cr').innerHTML = L.join('');
    }
    app.querySelector('#cf').addEventListener('input', calcular);
    app.querySelector('#cf').addEventListener('change', calcular);
    app.querySelector('#cc').addEventListener('click', ev => { const b = ev.target.closest('[data-a]'); if (b) { calcAba = b.dataset.a; calculadoras(); } });
    calcular();
  }

  /* ---------- Tela: ferramentas e kits ---------- */
  function ferramentasTela() {
    const s = st(), { esc, ICON, topo, marcarAba, dialogo, confirmar, toast } = U(), app = U().app;
    marcarAba('ajustes'); topo('Ferramentas e kits', { voltar: '#/ajustes' });
    const fs = JSON.parse(JSON.stringify(X().ferramentas())), ks = JSON.parse(JSON.stringify(X().kits()));
    const salvar = () => { s.salvarEmpresa({ ferramentas: fs, kits: ks }); };
    const det = f => f.tipo === 'aluguel' ? `Aluguel · ${s.brl(f.diaria)}/dia${s.num(f.frete) ? ' + frete ' + s.brl(f.frete) : ''}` : s.num(f.fixo) > 0 ? `Própria · ${s.brl(f.fixo)} por serviço` : `Própria · ${s.brl(f.preco)} · ${s.dec(f.vidaH, 0)} h de vida · ${s.brl(X().porHora(f))}/h${s.num(f.consumivel) ? ' + ' + s.brl(f.consumivel) + ' consumível' : ''}`;
    app.innerHTML = `<p class="ajuda" style="margin-top:0">O desgaste das ferramentas próprias é calculado por hora de uso: (preço − revenda) ÷ vida útil. As alugadas, por diária. Os valores iniciais são exemplos: ajuste para a sua realidade.</p>
      <div class="card"><div class="campos"><div class="campo"><label for="fm-modo">Padrão nos orçamentos</label><select id="fm-modo">
        <option value="custo" ${(s.db.empresa.ferrModo || 'custo') === 'custo' ? 'selected' : ''}>Só no custo (cliente não vê)</option>
        <option value="item" ${s.db.empresa.ferrModo === 'item' ? 'selected' : ''}>Cobrar como item</option></select></div></div></div>
      <h2>Ferramentas</h2><div class="lista">${fs.map((f, i) => `<button class="linha" data-f="${i}"><div class="principal"><div class="t1">${esc(f.nome)}</div><div class="t2">${esc(det(f))}</div></div></button>`).join('')}</div>
      <div class="acoes"><button class="btn" id="nf">${ICON.mais} Ferramenta</button></div>
      <h2>Kits por tipo de serviço</h2><div class="lista">${ks.map((k, i) => `<button class="linha" data-k="${i}"><div class="principal"><div class="t1">${esc(k.nome)}</div><div class="t2">${k.itens.length} ferramenta(s) · ${s.brl(kitCusto(k, fs))}</div></div></button>`).join('')}</div>
      <div class="acoes"><button class="btn" id="nk">${ICON.mais} Kit</button><button class="btn" id="pad">Restaurar exemplos</button></div>`;
    app.querySelector('#fm-modo').onchange = ev => s.salvarEmpresa({ ferrModo: ev.target.value });
    async function editarF(f, i) {
      let d0 = null;
      const r = await dialogo({
        titulo: i == null ? 'Nova ferramenta' : 'Editar ferramenta',
        corpo: `<div class="campos">
          <div class="campo"><label>Nome</label><input data-x="nome" value="${esc(f.nome || '')}"></div>
          <div class="campo"><label>Tipo</label><select data-x="tipo"><option value="propria" ${f.tipo !== 'aluguel' ? 'selected' : ''}>Própria (desgaste)</option><option value="aluguel" ${f.tipo === 'aluguel' ? 'selected' : ''}>Alugada</option></select></div>
          <div class="campo c3 m3 fp"><label>Preço de compra (R$)</label><input class="num" data-x="preco" value="${esc(f.preco || '')}"></div>
          <div class="campo c3 m3 fp"><label>Vida útil (horas)</label><input class="num" data-x="vidaH" value="${esc(f.vidaH || '')}"></div>
          <div class="campo c3 m3 fp"><label>Valor de revenda (%)</label><input class="num" data-x="residualPct" value="${esc(f.residualPct || '')}"></div>
          <div class="campo c3 m3 fp"><label>Consumível por uso (R$)</label><input class="num" data-x="consumivel" value="${esc(f.consumivel || '')}" placeholder="disco, broca"></div>
          <div class="campo fp"><label>Ou valor fixo por serviço (R$)</label><input class="num" data-x="fixo" value="${esc(f.fixo || '')}" placeholder="para ferramentas pequenas"></div>
          <div class="campo c3 m3 fa"><label>Diária (R$)</label><input class="num" data-x="diaria" value="${esc(f.diaria || '')}"></div>
          <div class="campo c3 m3 fa"><label>Frete (R$)</label><input class="num" data-x="frete" value="${esc(f.frete || '')}"></div></div>`,
        acoes: [...(i != null ? [{ rotulo: 'Excluir', classe: 'perigo', valor: 'exc' }] : []), { rotulo: 'Cancelar', valor: null }, { rotulo: 'Salvar', classe: 'prim', valor: 'ok', antes: d => {
          d0 = {}; d.querySelectorAll('[data-x]').forEach(el => { d0[el.dataset.x] = el.classList.contains('num') ? s.num(el.value) : el.value.trim(); });
          if (!d0.nome) return false;
        } }],
        aoAbrir: d => { const t = () => { const al = d.querySelector('[data-x="tipo"]').value === 'aluguel'; d.querySelectorAll('.fp').forEach(x => { x.hidden = al; }); d.querySelectorAll('.fa').forEach(x => { x.hidden = !al; }); }; d.querySelector('[data-x="tipo"]').onchange = t; t(); }
      });
      if (r === 'exc') { const id = fs[i].id; fs.splice(i, 1); ks.forEach(k => { k.itens = k.itens.filter(u => u.f !== id); }); salvar(); ferramentasTela(); }
      if (r === 'ok') { if (i == null) fs.push({ id: 'f-' + s.uid(), ...d0 }); else fs[i] = { ...fs[i], ...d0 }; salvar(); ferramentasTela(); }
    }
    async function editarK(k, i) {
      let nome = k.nome || '', itens = null;
      const r = await dialogo({
        titulo: i == null ? 'Novo kit' : 'Editar kit',
        corpo: `<div class="campo"><label>Nome do serviço</label><input id="kn" value="${esc(nome)}" placeholder="Ex.: Instalação de chuveiro"></div>
          <p class="ajuda">Marque as ferramentas usadas e informe as horas (próprias) ou dias (alugadas).</p>
          <div class="lista">${fs.map(f => { const u = (k.itens || []).find(x => x.f === f.id); return `<label class="linha"><input type="checkbox" data-kf="${f.id}" ${u ? 'checked' : ''} style="width:20px;min-height:20px">
            <div class="principal"><div class="t1" style="white-space:normal">${esc(f.nome)}</div></div>${s.num(f.fixo) > 0 ? '<span class="muted" style="font-size:12px">fixo</span>' : `<input class="num" style="width:70px" data-kq="${f.id}" value="${esc(u ? (f.tipo === 'aluguel' ? u.dias || 1 : u.horas || 1) : (f.tipo === 'aluguel' ? 1 : 1))}"><span class="muted" style="font-size:12px">${f.tipo === 'aluguel' ? 'dia' : 'h'}</span>`}</label>`; }).join('')}</div>`,
        acoes: [...(i != null ? [{ rotulo: 'Excluir', classe: 'perigo', valor: 'exc' }] : []), { rotulo: 'Cancelar', valor: null }, { rotulo: 'Salvar', classe: 'prim', valor: 'ok', antes: d => {
          nome = d.querySelector('#kn').value.trim(); if (!nome) return false;
          itens = [...d.querySelectorAll('[data-kf]:checked')].map(c => { const f = fs.find(x => x.id === c.dataset.kf), q = d.querySelector(`[data-kq="${c.dataset.kf}"]`); const n = q ? s.num(q.value) : 0; return f.tipo === 'aluguel' ? { f: f.id, dias: n || 1 } : { f: f.id, horas: n }; });
        } }]
      });
      if (r === 'exc') { ks.splice(i, 1); salvar(); ferramentasTela(); }
      if (r === 'ok') { const nk = { id: k.id || 'k-' + s.uid(), nome, itens }; if (i == null) ks.push(nk); else ks[i] = nk; salvar(); ferramentasTela(); }
    }
    app.querySelector('.lista').addEventListener('click', ev => { const b = ev.target.closest('[data-f]'); if (b) editarF(fs[Number(b.dataset.f)], Number(b.dataset.f)); });
    app.querySelectorAll('.lista')[1].addEventListener('click', ev => { const b = ev.target.closest('[data-k]'); if (b) editarK(ks[Number(b.dataset.k)], Number(b.dataset.k)); });
    app.querySelector('#nf').onclick = () => editarF({ tipo: 'propria' }, null);
    app.querySelector('#nk').onclick = () => editarK({ itens: [] }, null);
    app.querySelector('#pad').onclick = async () => { if (await confirmar('Restaurar exemplos', 'Voltar às ferramentas e kits de exemplo? Os seus serão substituídos.', 'Restaurar')) { s.salvarEmpresa({ ferramentas: null, kits: null }); toast('Exemplos restaurados.'); ferramentasTela(); } };
  }
  function kitCusto(k, fs) {
    return k.itens.reduce((t, u) => t + X().custoFerramenta(fs.find(f => f.id === u.f), u), 0);
  }

  /* ---------- Tela: inspeção e laudo ---------- */
  function inspecao(id) {
    const s = st(), { esc, ICON, topo, marcarAba, toast, dialogo } = U(), app = U().app;
    marcarAba('orcamentos');
    const o = s.orcamento(id);
    if (!o) { app.innerHTML = '<div class="vazio">Orçamento não encontrado.</div>'; topo('Inspeção', { voltar: '#/orcamentos' }); return; }
    topo('Inspeção ' + o.numero, { voltar: '#/orcamento/' + o.id });
    document.body.classList.add('com-barra');
    const ins = o.inspecao = o.inspecao || { data: s.hoje(), itens: {}, resp: s.db.empresa.assinaturaNome || s.db.empresa.nome || '', registro: s.db.empresa.registroProf || '', art: '', obs: '' };
    const RES = [['ok', 'Conforme'], ['nok', 'Não conforme'], ['na', 'N/A']];
    app.innerHTML = `
      <div class="card"><div class="campos">
        <div class="campo c2 m3"><label>Data</label><input type="date" data-g="data" value="${esc(ins.data)}"></div>
        <div class="campo c4 m3"><label>Responsável</label><input data-g="resp" value="${esc(ins.resp)}"></div>
        <div class="campo c3 m3"><label>Registro (CFT/CREA)</label><input data-g="registro" value="${esc(ins.registro)}" placeholder="opcional"></div>
        <div class="campo c3 m3"><label>ART/TRT nº</label><input data-g="art" value="${esc(ins.art)}" placeholder="opcional"></div>
      </div></div>
      ${X().INSPECAO.map(g => `<h2>${esc(g.grupo)}</h2><div class="lista">${g.itens.map(([k, rot, un]) => { const v = ins.itens[k] || {}; return `
        <div class="linha ins-l" data-k="${k}"><div class="principal" style="white-space:normal">
          <div class="t1" style="white-space:normal">${esc(rot)}</div>
          <div class="chips" style="margin:6px 0 0">${RES.map(([r, n]) => `<button type="button" class="chip ${v.res === r ? 'ativo ins-' + r : ''}" data-r="${r}">${n}</button>`).join('')}</div>
          <div class="row" style="gap:8px;margin-top:6px">${un ? `<input class="num" data-m placeholder="${esc(un)}" value="${esc(v.med || '')}" style="max-width:120px">` : ''}<input data-o placeholder="Observação" value="${esc(v.obs || '')}" style="flex:1;min-width:0"></div>
        </div></div>`; }).join('')}</div>`).join('')}
      <h2>Conclusão e observações</h2>
      <div class="card"><textarea data-g="obs" rows="3" placeholder="Ex.: recomenda-se substituir o disjuntor do circuito 3.">${esc(ins.obs)}</textarea><p class="ajuda" id="ins-res"></p></div>
      <div class="barra-total"><div class="in">
        <div class="tot"><div class="r">Laudo</div><div class="v" id="ins-st" style="font-size:14px"></div></div>
        <button class="btn" id="ins-ass">${ICON.desenho}<span class="rot">Assinatura</span></button>
        <button class="btn prim" id="ins-pdf">${ICON.pdf}<span class="rot">Gerar laudo</span></button></div></div>`;
    const atualizar = () => {
      const r = X().resultadoInspecao(ins);
      app.querySelector('#ins-st').textContent = r.pendentes ? `${r.pendentes} item(ns) sem resposta` : r.conforme ? 'Instalação conforme' : `${r.nok} não conformidade(s)`;
      app.querySelector('#ins-res').textContent = `${r.ok} conforme · ${r.nok} não conforme · ${r.na} N/A${o.assinaturaCliente ? ' · assinatura do cliente coletada' : ''}`;
    };
    let t; const salvar = () => { clearTimeout(t); t = setTimeout(() => s.salvarOrcamento(o), 300); };
    app.addEventListener('input', ev => {
      const g = ev.target.dataset.g; if (g) { ins[g] = ev.target.value; salvar(); return; }
      const l = ev.target.closest('.ins-l'); if (!l) return;
      const v = ins.itens[l.dataset.k] = ins.itens[l.dataset.k] || {};
      if (ev.target.hasAttribute('data-m')) v.med = ev.target.value; if (ev.target.hasAttribute('data-o')) v.obs = ev.target.value; salvar();
    });
    app.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-r]');
      if (b) {
        const l = b.closest('.ins-l'), v = ins.itens[l.dataset.k] = ins.itens[l.dataset.k] || {};
        v.res = v.res === b.dataset.r ? '' : b.dataset.r;
        l.querySelectorAll('[data-r]').forEach(x => { x.className = 'chip' + (v.res === x.dataset.r ? ' ativo ins-' + x.dataset.r : ''); });
        salvar(); atualizar(); return;
      }
      if (ev.target.closest('#ins-ass')) { await coletarAssinatura(o); atualizar(); }
      if (ev.target.closest('#ins-pdf')) {
        clearTimeout(t); s.salvarOrcamento(o);
        if (ins.registro) s.salvarEmpresa({ registroProf: ins.registro });
        const fotos = [];
        for (const a of (o.anexos || []).filter(a => a.tipo === 'arquivo' && /^image\//.test(a.mime || ''))) { const bl = await window.Arquivos.obter(a.id); if (bl) fotos.push({ nome: a.nome, dataUrl: await window.Arquivos.paraDataUrl(bl) }); }
        const blob = window.PDF.gerarLaudo(o, fotos), nome = `Laudo-${String(o.numero).replace(/[^\w-]/g, '')}.pdf`;
        const c = s.cliente(o.clienteId);
        const r = await dialogo({ titulo: 'Laudo pronto', corpo: `<p style="margin-top:0">${fotos.length ? `Inclui ${fotos.length} foto(s) do serviço. ` : ''}Guarde uma cópia: o laudo também pode ser anexado à entrega da obra.</p>`, acoes: [{ rotulo: 'Baixar', valor: 'b' }, { rotulo: 'Anexar ao orçamento', valor: 'a' }, ...(c && s.telefoneValido(c.telefone) ? [{ rotulo: 'Enviar', classe: 'prim', valor: 'e' }] : [])] });
        if (r === 'b') window.WhatsApp.baixar(blob, nome);
        if (r === 'a') { const id2 = s.uid(); await window.Arquivos.salvar(id2, blob); o.anexos = [...(o.anexos || []).filter(a => a.laudo !== true), { id: id2, tipo: 'arquivo', nome, mime: 'application/pdf', tamanho: blob.size, entregar: true, laudo: true, criadoEm: new Date().toISOString() }]; s.salvarOrcamento(o); toast('Laudo anexado: vai junto na entrega da obra.'); }
        if (r === 'e') { const res = await window.WhatsApp.enviarArquivos([{ blob, nome }], 'Laudo ' + o.numero, ''); if (res === 'fallback') window.WhatsApp.abrirConversa(c.telefone, `Olá, ${primeiro(c)}! Segue o laudo de inspeção da instalação elétrica.`); }
      }
    });
    atualizar();
  }

  window.TelasExtras = { telas: { calculadoras, ferramentas: ferramentasTela, inspecao }, editor, inicioHtml, inicioLigar, coletarAssinatura, enviarMsg, mensagem, pixTexto };
})();
