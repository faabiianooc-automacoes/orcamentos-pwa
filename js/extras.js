/* Regras de negócio dos recursos extras (sem interface):
   financeiro (pagamentos, margem), ferramentas (desgaste e aluguel), previsão de
   cargas (NBR 5410 9.5.2), lista de materiais a partir do dimensionamento,
   checklist de inspeção e pendências do Início. */
(function () {
  'use strict';
  const S = () => window.Store;
  const uid = () => S().uid();

  /* ---------- Financeiro ---------- */
  const pago = o => (o.pagamentos || []).reduce((s, p) => s + S().num(p.valor), 0);
  function financeiro(o) {
    const st = S(), total = st.totais(o).total;
    const sinalPct = st.num(o.sinalPct == null ? st.db.empresa.sinalPct : o.sinalPct);
    const recebido = pago(o);
    return { total, recebido, saldo: Math.max(0, Math.round((total - recebido) * 100) / 100), sinalPct, sinal: Math.round(total * sinalPct) / 100, sinalPendente: sinalPct > 0 && recebido + 0.005 < total * sinalPct / 100 };
  }
  // Custo: soma de custo unitário × qtd + ferramentas "só no custo"
  function margem(o) {
    const st = S(), t = st.totais(o);
    let custo = 0, semCusto = 0;
    (o.itens || []).forEach(i => {
      const c = st.num(i.custo);
      if (c > 0) custo += c * st.num(i.qtd);
      else if (i.ferr) custo += st.num(i.valor) * st.num(i.qtd); // repasse de ferramentas: custo = valor
      else if (i.tipo === 'Material') semCusto++;
    });
    if (o.ferramentas && o.ferramentas.modo === 'custo') custo += st.num(o.ferramentas.total);
    const lucro = t.total - custo;
    return { custo, lucro, pct: t.total > 0 ? lucro / t.total * 100 : 0, semCusto, minimo: st.num(st.db.empresa.margemMin == null ? 30 : st.db.empresa.margemMin) };
  }

  /* ---------- Ferramentas ---------- */
  const F = (nome, tipo, a) => ({ id: 'f-' + nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 40), nome, tipo, ...a });
  const FERRAMENTAS_PADRAO = [
    F('Martelete rompedor', 'propria', { preco: 900, residualPct: 10, vidaH: 1000 }),
    F('Esmerilhadeira com disco diamantado', 'propria', { preco: 350, residualPct: 10, vidaH: 1000, consumivel: 4 }),
    F('Furadeira / parafusadeira', 'propria', { preco: 600, residualPct: 10, vidaH: 1500 }),
    F('Alicate crimpador de terminais', 'propria', { preco: 250, residualPct: 0, vidaH: 2000 }),
    F('Alicate amperímetro / multímetro', 'propria', { preco: 500, residualPct: 10, vidaH: 5000 }),
    F('Chaves isoladas, desencapador, nível, trena, escada', 'propria', { fixo: 3 }),
    F('EPI (luvas isolantes, óculos)', 'propria', { fixo: 10 }),
    F('Megômetro (teste de isolamento)', 'aluguel', { diaria: 80, frete: 0 }),
    F('Terrômetro (resistência de aterramento)', 'aluguel', { diaria: 90, frete: 0 }),
    F('Andaime (por dia)', 'aluguel', { diaria: 40, frete: 30 })
  ];
  const KITS_PADRAO = [
    { id: 'k-quadro', nome: 'Instalação de quadro geral', itens: [
      { f: FERRAMENTAS_PADRAO[0].id, horas: 3 }, { f: FERRAMENTAS_PADRAO[1].id, horas: 2 }, { f: FERRAMENTAS_PADRAO[2].id, horas: 3 },
      { f: FERRAMENTAS_PADRAO[3].id, horas: 2 }, { f: FERRAMENTAS_PADRAO[4].id, horas: 1 }, { f: FERRAMENTAS_PADRAO[5].id }, { f: FERRAMENTAS_PADRAO[6].id },
      { f: FERRAMENTAS_PADRAO[7].id, dias: 1 }, { f: FERRAMENTAS_PADRAO[8].id, dias: 1 }] },
    { id: 'k-ponto', nome: 'Novo ponto de tomada/iluminação (embutido)', itens: [
      { f: FERRAMENTAS_PADRAO[1].id, horas: 1 }, { f: FERRAMENTAS_PADRAO[0].id, horas: 0.5 }, { f: FERRAMENTAS_PADRAO[2].id, horas: 0.5 }, { f: FERRAMENTAS_PADRAO[5].id }] },
    { id: 'k-manut', nome: 'Manutenção / revisão', itens: [{ f: FERRAMENTAS_PADRAO[4].id, horas: 2 }, { f: FERRAMENTAS_PADRAO[5].id }, { f: FERRAMENTAS_PADRAO[6].id }, { f: FERRAMENTAS_PADRAO[7].id, dias: 1 }] }
  ];
  const ferramentas = () => S().db.empresa.ferramentas || FERRAMENTAS_PADRAO;
  const kits = () => S().db.empresa.kits || KITS_PADRAO;
  // Custo de uma ferramenta num serviço
  function custoFerramenta(f, uso) {
    const st = S();
    if (!f) return 0;
    if (f.tipo === 'aluguel') return st.num(f.diaria) * (st.num(uso.dias) || 1) + st.num(f.frete);
    if (st.num(f.fixo) > 0) return st.num(f.fixo);
    const porHora = st.num(f.vidaH) > 0 ? st.num(f.preco) * (1 - st.num(f.residualPct) / 100) / st.num(f.vidaH) : 0;
    return porHora * st.num(uso.horas) + st.num(f.consumivel);
  }
  const porHora = f => S().num(f.vidaH) > 0 ? S().num(f.preco) * (1 - S().num(f.residualPct) / 100) / S().num(f.vidaH) : 0;
  // Soma dos kits escolhidos (ferramenta repetida conta uma vez: maior uso)
  function custoKits(ids) {
    const fs = ferramentas(), uso = new Map();
    kits().filter(k => ids.includes(k.id)).forEach(k => k.itens.forEach(u => {
      const a = uso.get(u.f) || { horas: 0, dias: 0 };
      uso.set(u.f, { horas: Math.max(a.horas, S().num(u.horas)), dias: Math.max(a.dias, S().num(u.dias)) });
    }));
    const linhas = [...uso.entries()].map(([id, u]) => { const f = fs.find(x => x.id === id); return f ? { f, uso: u, custo: custoFerramenta(f, u) } : null; }).filter(Boolean);
    const propria = linhas.filter(l => l.f.tipo !== 'aluguel').reduce((s, l) => s + l.custo, 0);
    const aluguel = linhas.filter(l => l.f.tipo === 'aluguel').reduce((s, l) => s + l.custo, 0);
    return { linhas, propria, aluguel, total: propria + aluguel };
  }
  // Aplica no orçamento: modo 'item' (cobra como item) ou 'custo' (só entra no custo)
  function aplicarFerramentas(o, ids, modo) {
    const st = S();
    o.itens = o.itens || [];
    const i = o.itens.findIndex(x => x.ferr);
    if (!ids || !ids.length) { if (i >= 0) o.itens.splice(i, 1); delete o.ferramentas; return null; }
    const c = custoKits(ids);
    o.ferramentas = { kits: ids, modo, total: Math.round(c.total * 100) / 100, propria: c.propria, aluguel: c.aluguel };
    if (modo === 'item') {
      const item = { id: i >= 0 ? o.itens[i].id : uid(), ferr: true, tipo: 'Serviço', unidade: 'vb', qtd: 1, descricao: 'Uso e aluguel de equipamentos', valor: Math.round(c.total * 100) / 100 };
      if (i >= 0) o.itens[i] = item; else o.itens.push(item);
    } else if (i >= 0) o.itens.splice(i, 1);
    return c;
  }

  /* ---------- Previsão de cargas (NBR 5410:2004, 9.5.2 — locais de habitação) ---------- */
  const TIPOS_COMODO = ['Sala', 'Dormitório', 'Cozinha', 'Copa', 'Área de serviço', 'Lavanderia', 'Banheiro', 'Varanda', 'Corredor / hall', 'Garagem', 'Escritório', 'Outro'];
  const molhada = t => ['Cozinha', 'Copa', 'Área de serviço', 'Lavanderia'].includes(t);
  function previsaoComodo(c) {
    const st = S(), A = st.num(c.area), P = st.num(c.perimetro);
    const ilum = A <= 6 ? 100 : 100 + 60 * Math.floor((A - 6) / 4 + 1e-9);
    let n = 0, va = [];
    if (c.tipo === 'Banheiro') n = 1;
    else if (molhada(c.tipo)) n = Math.max(1, Math.ceil(P / 3.5 - 1e-9));
    else if (c.tipo === 'Varanda') n = 1;
    else if (['Sala', 'Dormitório', 'Escritório'].includes(c.tipo)) n = Math.max(1, Math.ceil(P / 5 - 1e-9));
    else n = A <= 6 ? 1 : Math.max(1, Math.ceil(P / 5 - 1e-9));
    if (st.num(c.tugQtd) > n) n = Math.round(st.num(c.tugQtd)); // mínimo da norma; pode haver mais
    for (let k = 0; k < n; k++) va.push((c.tipo === 'Banheiro' || molhada(c.tipo)) && k < 3 ? 600 : 100);
    return { ilum, tugQtd: n, tugVA: va.reduce((a, b) => a + b, 0), tugLista: va };
  }
  /* Sugere circuitos: iluminação separada de tomadas; cozinha/área de serviço
     com circuitos próprios; cada TUE (chuveiro, ar etc.) com circuito próprio. */
  function sugerirCircuitos(comodos, tues, vFN) {
    const LIM_IL = vFN >= 220 ? 2000 : 1270, LIM_TUG = vFN >= 220 ? 3500 : 1900;
    const prev = comodos.map(c => ({ c, p: previsaoComodo(c) }));
    const out = [];
    const agrupar = (lista, lim, nomeBase, tipo) => {
      let atual = null;
      lista.forEach(({ nome, va }) => {
        if (!atual || atual.va + va > lim) { atual = { nome: nomeBase, comodos: [], va: 0, tipo }; out.push(atual); }
        atual.comodos.push(nome); atual.va += va;
      });
    };
    agrupar(prev.map(x => ({ nome: x.c.nome, va: x.p.ilum })), LIM_IL, 'Iluminação', 'Iluminação');
    prev.filter(x => molhada(x.c.tipo)).forEach(x => out.push({ nome: 'Tomadas ' + x.c.nome, comodos: [x.c.nome], va: x.p.tugVA, tipo: 'Tomadas' }));
    agrupar(prev.filter(x => !molhada(x.c.tipo)).map(x => ({ nome: x.c.nome, va: x.p.tugVA })), LIM_TUG, 'Tomadas', 'Tomadas');
    (tues || []).filter(t => S().num(t.potencia) > 0).forEach(t => out.push({ nome: t.nome, comodos: [t.comodo || ''], va: S().num(t.potencia), tipo: 'Força', tensao: t.tensao }));
    let ni = 0, nt = 0;
    out.forEach(c => {
      if (c.tipo === 'Iluminação') c.nome = `Iluminação ${++ni}` + (c.comodos.length ? ` (${c.comodos.join(', ')})` : '');
      else if (c.nome === 'Tomadas') c.nome = `Tomadas ${++nt} (${c.comodos.join(', ')})`;
    });
    return { prev, circuitos: out, totalVA: out.reduce((s, c) => s + c.va, 0) };
  }

  /* ---------- Lista de materiais a partir do dimensionamento ---------- */
  const COR = { F1: 'vermelho', F2: 'preto', F3: 'branco', N: 'azul', PE: 'verde' };
  function valorLinha(c, vars, palavra, un) {
    const L = (c.linhas || []).filter(l => !l.erro);
    const sa = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const l = L.find(x => vars.includes(sa(x.var))) || L.find(x => sa(x.rotulo).includes(palavra) && (!un || sa(x.unidade).includes(un)));
    return l ? S().num(String(l.valor).replace(/\./g, '').replace(',', '.')) : NaN;
  }
  function comprimento(c) {
    const l = (c.linhas || []).find(x => x.tipo === 'entrada' && (/compr/i.test(x.var) || String(x.unidade).trim() === 'm'));
    if (!l) return NaN;
    const v = c.entradas && c.entradas[l.var];
    return window.Formulas.valorEntrada({ tipo: 'numero' }, v == null ? '' : v);
  }
  function listaMateriais(o, sobraPct = 10) {
    const st = S(), lig = st.ligacoes(o), al = lig.alimentacao, F = st.fasesDisponiveis(o);
    const cabos = new Map(), disj = new Map(), avisos = [];
    (o.circuitos || []).forEach(c => {
      const L = lig.porCircuito[c.id]; const sec = valorLinha(c, ['secao', 'secao_adotada'], 'secao adotada', 'mm');
      const comp = comprimento(c), inn = valorLinha(c, ['disjuntor'], 'disjuntor', 'a');
      if (!(sec > 0) || !(comp > 0)) { avisos.push(`${c.nome}: sem seção ou comprimento no cálculo`); return; }
      const conds = [...L.fases, ...(L.neutro ? ['N'] : []), 'PE'];
      conds.forEach(cd => { const k = sec + '|' + COR[cd]; cabos.set(k, (cabos.get(k) || 0) + comp); });
      if (inn > 0) { const k = L.fases.length + '|' + inn; disj.set(k, (disj.get(k) || 0) + 1); }
    });
    const cat = st.db.catalogo;
    const precoCabo = sec => { const i = cat.find(x => x.tec && x.tec.classe === 'cabo' && st.num(x.tec.secao) === sec && x.tec.tipo !== 'PP (multipolar)'); return i ? { valor: st.num(i.valor), custo: st.num(i.custo) } : { valor: 0, custo: 0 }; };
    const precoDisj = () => { const i = cat.find(x => x.tec && x.tec.classe === 'disjuntor'); return i ? { valor: st.num(i.valor), custo: st.num(i.custo) } : { valor: 0, custo: 0 }; };
    const itens = [];
    [...cabos.entries()].sort().forEach(([k, m]) => {
      const [sec, cor] = k.split('|'); const s = Number(sec), p = precoCabo(s);
      itens.push({ descricao: `Cabo flexível ${st.dec(s, s % 1 ? 1 : 0)} mm² ${cor}`, tipo: 'Material', unidade: 'm', qtd: Math.ceil(m * (1 + sobraPct / 100)), valor: p.valor, custo: p.custo,
        tec: { classe: 'cabo', secao: st.dec(s, s % 1 ? 1 : 0), tipo: 'Flexível', isolacao: 'PVC 70 °C', tensao_iso: '450/750 V', material: 'Cobre', cor } });
    });
    [...disj.entries()].sort().forEach(([k, n]) => {
      const [polos, inn] = k.split('|'); const p = precoDisj();
      itens.push({ descricao: `Disjuntor ${polos}P ${inn} A curva C`, tipo: 'Material', unidade: 'un', qtd: n, valor: p.valor, custo: p.custo, tec: { classe: 'disjuntor', in: String(inn), polos: String(polos), curva: 'C', norma: 'NBR NM 60898' } });
    });
    const temNoOrc = cl => (o.itens || []).some(i => i.tec && i.tec.classe === cl && !i.matDim);
    if ((o.circuitos || []).length) {
      const polosDR = F.length === 1 ? 2 : 4; // DR comercial: 2P (F+N) ou 4P (2 ou 3 fases + N)
      if (!temNoOrc('dr')) itens.push({ descricao: `Interruptor diferencial (DR) ${polosDR}P 30 mA`, tipo: 'Material', unidade: 'un', qtd: 1, valor: 0, custo: 0, tec: { classe: 'dr', idn: '30', polos: String(polosDR), tipo_dr: 'A' } });
      if (!temNoOrc('dps')) itens.push({ descricao: 'DPS classe II 275 V', tipo: 'Material', unidade: 'un', qtd: F.length + 1, valor: 0, custo: 0, tec: { classe: 'dps', classe_dps: 'II', uc: '275' } });
      if (st.num(al.geral) > 0) itens.push({ descricao: `Disjuntor geral ${F.length}P ${st.num(al.geral)} A`, tipo: 'Material', unidade: 'un', qtd: 1, valor: 0, custo: 0, tec: { classe: 'disjuntor', in: String(st.num(al.geral)), polos: String(F.length), curva: 'C' } });
      itens.push({ descricao: 'Terminais, anilhas de identificação e barramentos (N e PE)', tipo: 'Material', unidade: 'vb', qtd: 1, valor: 0, custo: 0 });
    }
    return { itens, avisos, sobraPct };
  }

  /* ---------- Checklist de inspeção (NBR 5410, seção 7 — verificação final) ---------- */
  const INSPECAO = [
    { grupo: 'Inspeção visual', itens: [
      ['qd-ident', 'Quadro de distribuição identificado, com circuitos identificados'],
      ['qd-fech', 'Quadro com tampa e proteção contra contato com partes vivas'],
      ['cores', 'Cores dos condutores: neutro azul, PE verde (ou verde-amarelo), fases em outras cores'],
      ['secoes', 'Seções dos condutores compatíveis com os disjuntores de cada circuito'],
      ['conexoes', 'Conexões e terminais firmes, sem aquecimento ou escurecimento'],
      ['dr', 'DR instalado (áreas molhadas e circuitos exigidos)'],
      ['dps', 'DPS instalado e ligado ao barramento de terra'],
      ['pe', 'Condutor de proteção (PE) presente em todos os circuitos'],
      ['tomadas', 'Tomadas no padrão NBR 14136 com terra ligado'],
      ['caixas', 'Caixas, eletrodutos e emendas fechados e protegidos'],
      ['chuveiro', 'Chuveiro/aquecedor com circuito próprio e aterrado']] },
    { grupo: 'Ensaios', itens: [
      ['cont-pe', 'Continuidade do condutor de proteção (PE)'],
      ['isol', 'Resistência de isolamento', 'MΩ'],
      ['dr-teste', 'Teste do DR (botão T e/ou instrumento)', 'mA / ms'],
      ['aterr', 'Resistência de aterramento', 'Ω'],
      ['v-fn', 'Tensão fase-neutro', 'V'],
      ['v-ff', 'Tensão fase-fase', 'V'],
      ['v-npe', 'Tensão neutro-terra', 'V'],
      ['polar', 'Polaridade das tomadas (fase e neutro na posição correta)']] }
  ];
  function resultadoInspecao(ins) {
    const r = ins && ins.itens ? Object.values(ins.itens) : [];
    const nok = r.filter(x => x.res === 'nok').length, ok = r.filter(x => x.res === 'ok').length;
    const total = INSPECAO.reduce((s, g) => s + g.itens.length, 0);
    return { ok, nok, na: r.filter(x => x.res === 'na').length, pendentes: total - r.filter(x => x.res).length, conforme: nok === 0 && ok > 0 };
  }

  /* ---------- Pendências do Início (lembretes) ---------- */
  function addMeses(iso, m) { const d = new Date(String(iso).slice(0, 10) + 'T12:00:00'); d.setMonth(d.getMonth() + Number(m || 0)); return d.toISOString().slice(0, 10); }
  function garantiaAte(o) { const st = S(); return o.concluidoEm ? st.somarDias(o.concluidoEm, st.num(st.db.empresa.garantiaDias) || 90) : ''; }
  function manutencaoEm(o) { const st = S(); return o.concluidoEm ? addMeses(o.concluidoEm, st.num(st.db.empresa.manutencaoMeses) || 12) : ''; }
  function pendencias() {
    const st = S(), h = st.hoje(), e = st.db.empresa, L = [];
    const dias = iso => st.diasEntre(String(iso).slice(0, 10), h);
    st.db.orcamentos.forEach(o => {
      const ocultos = o.lembretesOcultos || {};
      const add = (chave, p) => { if (!ocultos[chave]) L.push({ o, chave, ...p }); };
      const f = financeiro(o);
      if (st.statusExibido(o) === 'Enviado' && o.enviadoEm && dias(o.enviadoEm) >= 3) add('resposta', { tipo: 'resposta', ordem: 2, msg: `Sem resposta há ${dias(o.enviadoEm)} dias`, acao: 'cobrar' });
      if (o.status === 'Aprovado' && f.sinalPendente) add('sinal', { tipo: 'sinal', ordem: 1, msg: `Sinal de ${st.brl(f.sinal)} pendente`, acao: 'cobrarSinal' });
      if (o.status === 'Concluído' && f.saldo > 0.009) add('saldo', { tipo: 'saldo', ordem: 1, msg: `Saldo a receber: ${st.brl(f.saldo)}`, acao: 'cobrarSaldo' });
      if (o.status === 'Concluído' && !o.entregueEm) add('entrega', { tipo: 'entrega', ordem: 3, msg: 'Entrega da obra não enviada', acao: 'entrega' });
      if (o.status === 'Concluído' && o.entregueEm && e.linkAvaliacao && !o.avaliacaoPedidaEm) add('avaliacao', { tipo: 'avaliacao', ordem: 5, msg: 'Pedir avaliação no Google', acao: 'avaliacao' });
      const g = garantiaAte(o);
      if (g && st.diasEntre(h, g) >= 0 && st.diasEntre(h, g) <= 15) add('garantia', { tipo: 'garantia', ordem: 4, msg: `Garantia termina em ${st.dataBR(g)}`, acao: 'abrir' });
      const m = manutencaoEm(o);
      if (m && st.diasEntre(h, m) <= 30 && !o.manutencaoOferecidaEm) add('manutencao', { tipo: 'manutencao', ordem: 4, msg: `Revisão preventiva ${st.diasEntre(h, m) < 0 ? 'atrasada desde' : 'em'} ${st.dataBR(m)}`, acao: 'manutencao' });
    });
    return L.sort((a, b) => a.ordem - b.ordem);
  }

  window.Extras = {
    financeiro, margem, pago,
    FERRAMENTAS_PADRAO, KITS_PADRAO, ferramentas, kits, custoFerramenta, porHora, custoKits, aplicarFerramentas,
    TIPOS_COMODO, previsaoComodo, sugerirCircuitos,
    listaMateriais, INSPECAO, resultadoInspecao,
    pendencias, garantiaAte, manutencaoEm, addMeses
  };
})();
