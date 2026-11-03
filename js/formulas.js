/* Motor de fórmulas do Dimensionamento (estilo Excel em português).
   - Sem eval: as fórmulas são lidas por um analisador próprio, então uma fórmula
     editada não consegue executar código.
   - Argumentos separados por ";" (como no Excel em português). Decimais com
     vírgula ou ponto: 0,0172 ou 0.0172.
   - Operadores: + - * / ^ & (junta textos) = <> < > <= >=
   - Funções: SE, E, OU, NAO, RAIZ, ABS, MAXIMO, MINIMO, SOMA, ARRED,
     ARREDONDAR.PARA.CIMA, ARREDONDAR.PARA.BAIXO, POTENCIA, PI, LN, LOG10,
     PROCV, PROXIMO (veja AJUDA abaixo).
   Um "modelo" reúne entradas, cálculos (em ordem) e tabelas. */
(function () {
  'use strict';

  const semAcento = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const chave = s => semAcento(s).trim().toLowerCase();

  /* ---------- Analisador ---------- */
  function tokens(txt) {
    const t = [];
    let i = 0;
    const s = String(txt == null ? '' : txt).replace(/^\s*=/, ''); // aceita "=" inicial do Excel
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1]))) {
        let j = i; while (j < s.length && /[0-9]/.test(s[j])) j++;
        if ((s[j] === ',' || s[j] === '.') && /[0-9]/.test(s[j + 1] || '')) { j++; while (j < s.length && /[0-9]/.test(s[j])) j++; }
        if (/[eE]/.test(s[j] || '') && /[-+0-9]/.test(s[j + 1] || '')) { j += 2; while (j < s.length && /[0-9]/.test(s[j])) j++; }
        t.push({ t: 'num', v: parseFloat(s.slice(i, j).replace(',', '.')), p: i }); i = j; continue;
      }
      if (c === '"') {
        let j = i + 1, v = '';
        while (j < s.length) { if (s[j] === '"') { if (s[j + 1] === '"') { v += '"'; j += 2; continue; } break; } v += s[j++]; }
        if (j >= s.length) throw erro('Texto sem aspas de fechamento', i);
        t.push({ t: 'str', v, p: i }); i = j + 1; continue;
      }
      if (/[A-Za-z_À-ɏ]/.test(c)) {
        let j = i; while (j < s.length && /[A-Za-z0-9_.À-ɏ]/.test(s[j])) j++;
        t.push({ t: 'id', v: s.slice(i, j), p: i }); i = j; continue;
      }
      const dois = s.slice(i, i + 2);
      if (['<>', '<=', '>='].includes(dois)) { t.push({ t: 'op', v: dois, p: i }); i += 2; continue; }
      if ('+-*/^&=<>();,'.includes(c)) { t.push({ t: 'op', v: c === ',' ? ';' : c, p: i }); i++; continue; }
      throw erro(`Caractere inválido "${c}"`, i);
    }
    t.push({ t: 'fim', p: s.length });
    return t;
  }
  function erro(msg, pos) { const e = new Error(msg + (pos != null ? ` (posição ${pos + 1})` : '')); e.formula = true; return e; }

  function analisar(txt) {
    const tk = tokens(txt);
    let k = 0;
    const ver = () => tk[k];
    const op = v => ver().t === 'op' && ver().v === v;
    const esperar = v => { if (!op(v)) throw erro(`Esperado "${v}"`, ver().p); k++; };

    function comparacao() {
      let n = concat();
      while (ver().t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(ver().v)) { const o = tk[k++].v; n = { b: o, a: n, c: concat() }; }
      return n;
    }
    function concat() { let n = soma(); while (op('&')) { k++; n = { b: '&', a: n, c: soma() }; } return n; }
    function soma() { let n = mult(); while (op('+') || op('-')) { const o = tk[k++].v; n = { b: o, a: n, c: mult() }; } return n; }
    function mult() { let n = unario(); while (op('*') || op('/')) { const o = tk[k++].v; n = { b: o, a: n, c: unario() }; } return n; }
    function unario() { if (op('-')) { k++; return { u: '-', a: unario() }; } if (op('+')) { k++; return unario(); } return pot(); }
    function pot() { const n = prim(); if (op('^')) { k++; return { b: '^', a: n, c: unario() }; } return n; }
    function prim() {
      const x = ver();
      if (x.t === 'num') { k++; return { n: x.v }; }
      if (x.t === 'str') { k++; return { s: x.v }; }
      if (x.t === 'id') {
        k++;
        if (op('(')) {
          k++; const args = [];
          if (!op(')')) { args.push(comparacao()); while (op(';')) { k++; args.push(comparacao()); } }
          esperar(')');
          return { f: x.v, args, p: x.p };
        }
        const nome = chave(x.v);
        if (nome === 'verdadeiro') return { n: 1, bool: true };
        if (nome === 'falso') return { n: 0, bool: true };
        return { v: x.v, p: x.p };
      }
      if (op('(')) { k++; const n = comparacao(); esperar(')'); return n; }
      if (x.t === 'fim') throw erro('Fórmula incompleta', x.p);
      throw erro(`"${x.v}" fora do lugar`, x.p);
    }
    const arv = comparacao();
    if (ver().t !== 'fim') throw erro(`"${ver().v}" fora do lugar`, ver().p);
    return arv;
  }

  /* ---------- Avaliação ---------- */
  const numero = v => {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    const n = parseFloat(String(v).replace(',', '.'));
    if (!isFinite(n)) throw erro(`"${v}" não é um número`);
    return n;
  };
  const igual = (a, b) => (typeof a === 'number' && typeof b === 'number') ? Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)) : chave(a) === chave(b);

  function tabela(ctx, nome) {
    const t = (ctx.tabelas || []).find(x => chave(x.nome) === chave(nome));
    if (!t) throw erro(`Tabela "${nome}" não existe`);
    return t;
  }
  function coluna(t, nome) {
    const i = t.colunas.findIndex(c => chave(c) === chave(nome));
    if (i < 0) throw erro(`Coluna "${nome}" não existe na tabela "${t.nome}"`);
    return i;
  }

  const FUNCOES = {
    se: (a, ctx) => { if (a.length < 2) throw erro('SE precisa de condição e valor'); return numero(av(a[0], ctx)) ? av(a[1], ctx) : (a[2] ? av(a[2], ctx) : 0); },
    e: (a, ctx) => a.every(x => numero(av(x, ctx))) ? 1 : 0,
    ou: (a, ctx) => a.some(x => numero(av(x, ctx))) ? 1 : 0,
    nao: (a, ctx) => numero(av(a[0], ctx)) ? 0 : 1,
    raiz: (a, ctx) => { const n = numero(av(a[0], ctx)); if (n < 0) throw erro('RAIZ de número negativo'); return Math.sqrt(n); },
    abs: (a, ctx) => Math.abs(numero(av(a[0], ctx))),
    maximo: (a, ctx) => Math.max(...a.map(x => numero(av(x, ctx)))),
    minimo: (a, ctx) => Math.min(...a.map(x => numero(av(x, ctx)))),
    soma: (a, ctx) => a.reduce((s, x) => s + numero(av(x, ctx)), 0),
    arred: (a, ctx) => { const f = Math.pow(10, a[1] ? numero(av(a[1], ctx)) : 0); return Math.round(numero(av(a[0], ctx)) * f) / f; },
    'arredondar.para.cima': (a, ctx) => { const f = Math.pow(10, a[1] ? numero(av(a[1], ctx)) : 0); return Math.ceil(numero(av(a[0], ctx)) * f - 1e-9) / f; },
    'arredondar.para.baixo': (a, ctx) => { const f = Math.pow(10, a[1] ? numero(av(a[1], ctx)) : 0); return Math.floor(numero(av(a[0], ctx)) * f + 1e-9) / f; },
    potencia: (a, ctx) => Math.pow(numero(av(a[0], ctx)), numero(av(a[1], ctx))),
    pi: () => Math.PI,
    ln: (a, ctx) => Math.log(numero(av(a[0], ctx))),
    log10: (a, ctx) => Math.log10(numero(av(a[0], ctx))),
    /* PROCV(valor; "tabela"; "coluna_retorno"; [VERDADEIRO])
       Procura o valor na 1ª coluna. Sem o 4º argumento: valor exato.
       Com VERDADEIRO: a maior linha menor ou igual ao valor (como no Excel). */
    procv: (a, ctx) => {
      if (a.length < 3) throw erro('PROCV(valor; "tabela"; "coluna")');
      const val = av(a[0], ctx), t = tabela(ctx, av(a[1], ctx)), ci = coluna(t, av(a[2], ctx));
      const aprox = a[3] ? numero(av(a[3], ctx)) : 0;
      if (!aprox) {
        const l = t.linhas.find(r => igual(r[0], val));
        if (!l) throw erro(`Valor ${val} não encontrado na tabela "${t.nome}"`);
        return l[ci];
      }
      const n = numero(val);
      const l = t.linhas.filter(r => numero(r[0]) <= n + 1e-9).sort((x, y) => numero(y[0]) - numero(x[0]))[0];
      if (!l) throw erro(`Valor ${val} abaixo da tabela "${t.nome}"`);
      return l[ci];
    },
    /* PROXIMO("tabela"; "coluna_busca"; valor; "coluna_retorno")
       Menor linha cuja coluna de busca é maior ou igual ao valor.
       Ex.: menor seção cuja capacidade >= corrente. */
    proximo: (a, ctx) => {
      if (a.length < 3) throw erro('PROXIMO("tabela"; "coluna_busca"; valor; "coluna_retorno")');
      const t = tabela(ctx, av(a[0], ctx)), cb = coluna(t, av(a[1], ctx)), n = numero(av(a[2], ctx));
      const cr = a[3] ? coluna(t, av(a[3], ctx)) : cb;
      const l = t.linhas.filter(r => numero(r[cb]) >= n - 1e-9).sort((x, y) => numero(x[cb]) - numero(y[cb]))[0];
      if (!l) throw erro(`Nenhuma linha da tabela "${t.nome}" atende ${t.colunas[cb]} ≥ ${fmt(n, 2)}`);
      return l[cr];
    }
  };
  const ALIAS = { if: 'se', and: 'e', or: 'ou', not: 'nao', sqrt: 'raiz', max: 'maximo', min: 'minimo', sum: 'soma', round: 'arred', arredondar: 'arred', 'roundup': 'arredondar.para.cima', 'rounddown': 'arredondar.para.baixo', power: 'potencia', vlookup: 'procv' };

  function av(n, ctx) {
    if ('n' in n) return n.n;
    if ('s' in n) return n.s;
    if ('v' in n) {
      const k = chave(n.v);
      if (Object.prototype.hasOwnProperty.call(ctx.vars, k)) {
        const val = ctx.vars[k];
        if (val instanceof Error) throw erro(`"${n.v}" está com erro`);
        return val;
      }
      if ((ctx.tabelas || []).some(t => chave(t.nome) === k)) return n.v; // nome de tabela sem aspas
      throw erro(`Variável desconhecida: ${n.v}`, n.p);
    }
    if ('f' in n) {
      let k = chave(n.f); k = ALIAS[k] || k;
      const f = FUNCOES[k];
      if (!f) throw erro(`Função desconhecida: ${n.f}`, n.p);
      return f(n.args, ctx);
    }
    if (n.u) return -numero(av(n.a, ctx));
    const a = av(n.a, ctx), c = av(n.c, ctx);
    switch (n.b) {
      case '+': return numero(a) + numero(c);
      case '-': return numero(a) - numero(c);
      case '*': return numero(a) * numero(c);
      case '/': { const d = numero(c); if (d === 0) throw erro('Divisão por zero'); return numero(a) / d; }
      case '^': return Math.pow(numero(a), numero(c));
      case '&': return String(a) + String(c);
      case '=': return igual(a, c) ? 1 : 0;
      case '<>': return igual(a, c) ? 0 : 1;
      case '<': return cmp(a, c) < 0 ? 1 : 0;
      case '>': return cmp(a, c) > 0 ? 1 : 0;
      case '<=': return cmp(a, c) <= 0 ? 1 : 0;
      case '>=': return cmp(a, c) >= 0 ? 1 : 0;
    }
    throw erro('Operação inválida');
  }
  const cmp = (a, b) => (typeof a === 'string' || typeof b === 'string') ? chave(a).localeCompare(chave(b)) : numero(a) - numero(b);

  // Nomes de variáveis usados numa fórmula (para avisos)
  function variaveis(arv, out = new Set()) {
    if (!arv) return out;
    if ('v' in arv) out.add(chave(arv.v));
    ['a', 'c'].forEach(k => arv[k] && variaveis(arv[k], out));
    (arv.args || []).forEach(x => variaveis(x, out));
    return out;
  }

  /* ---------- Modelo ---------- */
  const VAR_OK = /^[A-Za-z_À-ɏ][A-Za-z0-9_À-ɏ]*$/;
  const valorEntrada = (en, bruto) => {
    const v = bruto == null ? en.padrao : bruto; // '' = apagado pelo usuário → pede o valor
    if (en.tipo === 'lista') { const n = parseFloat(String(v).replace(',', '.')); return /^-?\d+([.,]\d+)?$/.test(String(v).trim()) ? n : String(v); }
    if (typeof v === 'number') return v;
    const t = String(v == null ? '' : v).trim();
    const n = t === '' ? NaN : Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
    return isFinite(n) ? n : NaN;
  };
  const opcoes = en => String(en.opcoes || '').split(';').map(s => s.trim()).filter(Boolean);

  /* Calcula tudo. Retorna { valores: {var: valor|Error}, erros: [{var, msg}] } */
  function calcular(modelo, entradas) {
    const ctx = { vars: {}, tabelas: modelo.tabelas || [] };
    const erros = [];
    (modelo.entradas || []).forEach(en => {
      const v = valorEntrada(en, entradas ? entradas[en.var] : undefined);
      if (typeof v === 'number' && !isFinite(v)) { const e = erro(`Informe ${en.rotulo || en.var}`); ctx.vars[chave(en.var)] = e; erros.push({ var: en.var, msg: e.message }); }
      else ctx.vars[chave(en.var)] = v;
    });
    (modelo.calculos || []).forEach(c => {
      let v;
      try {
        v = av(analisar(c.formula), ctx);
        if (typeof v === 'number' && !isFinite(v)) throw erro('Resultado inválido');
      } catch (e) { v = e; erros.push({ var: c.var, msg: e.message }); }
      ctx.vars[chave(c.var)] = v;
    });
    return { valores: ctx.vars, erros };
  }

  /* Confere o modelo antes de salvar. Retorna lista de problemas (texto). */
  function validar(modelo) {
    const p = [];
    const vistos = new Set();
    const nomes = [...(modelo.entradas || []).map(x => ['Entrada', x]), ...(modelo.calculos || []).map(x => ['Cálculo', x])];
    nomes.forEach(([tipo, x]) => {
      if (!VAR_OK.test(x.var || '')) p.push(`${tipo} "${x.rotulo || '?'}": variável "${x.var || ''}" inválida (use letras, números e _; comece com letra)`);
      const k = chave(x.var || '');
      if (vistos.has(k)) p.push(`Variável "${x.var}" repetida`);
      if (k === 'verdadeiro' || k === 'falso') p.push(`"${x.var}" é palavra reservada; escolha outro nome`);
      vistos.add(k);
    });
    (modelo.entradas || []).forEach(en => { if (en.tipo === 'lista' && !opcoes(en).length) p.push(`Entrada "${en.rotulo || en.var}": informe as opções da lista`); });
    const nomesTab = new Set();
    (modelo.tabelas || []).forEach(t => {
      if (!t.nome) p.push('Tabela sem nome');
      if (nomesTab.has(chave(t.nome))) p.push(`Tabela "${t.nome}" repetida`);
      nomesTab.add(chave(t.nome));
      if (!t.colunas || !t.colunas.length || !t.linhas || !t.linhas.length) p.push(`Tabela "${t.nome}" vazia`);
    });
    const ate = new Set((modelo.entradas || []).map(e => chave(e.var)));
    (modelo.calculos || []).forEach(c => {
      try {
        const arv = analisar(c.formula);
        variaveis(arv).forEach(v => {
          if (!ate.has(v) && !nomesTab.has(v)) {
            const depois = (modelo.calculos || []).some(x => chave(x.var) === v);
            p.push(`Cálculo "${c.rotulo || c.var}": ${depois ? `usa "${v}", que é calculado depois (mude a ordem)` : `variável "${v}" não existe`}`);
          }
        });
      } catch (e) { p.push(`Cálculo "${c.rotulo || c.var}": ${e.message}`); }
      ate.add(chave(c.var));
    });
    return p;
  }

  function fmt(v, casas) {
    if (v instanceof Error) return 'Erro';
    if (typeof v === 'number') return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas == null ? 2 : Number(casas) });
    return String(v);
  }

  /* Linhas para exibir/PDF: entradas e cálculos com rótulo, valor formatado e unidade */
  function linhas(modelo, entradas) {
    const r = calcular(modelo, entradas);
    const L = [];
    (modelo.entradas || []).forEach(en => L.push({ var: en.var, tipo: 'entrada', rotulo: en.rotulo || en.var, unidade: en.unidade || '', valor: fmt(r.valores[chave(en.var)], 4), resumo: !!en.resumo }));
    (modelo.calculos || []).forEach(c => {
      const v = r.valores[chave(c.var)];
      if (c.oculto) return;
      L.push({ var: c.var, tipo: 'calculo', rotulo: c.rotulo || c.var, unidade: c.unidade || '', valor: v instanceof Error ? 'Erro: ' + v.message : fmt(v, c.casas), erro: v instanceof Error, resumo: !!c.resumo, destaque: !!c.destaque });
    });
    return { linhas: L, erros: r.erros };
  }

  /* Tabela <-> texto ("coluna1;coluna2" na 1ª linha, valores com vírgula decimal) */
  function tabelaParaTexto(t) {
    const cel = v => typeof v === 'number' ? String(v).replace('.', ',') : String(v);
    return [t.colunas.join(';'), ...t.linhas.map(l => l.map(cel).join(';'))].join('\n');
  }
  function textoParaTabela(nome, txt) {
    const ls = String(txt || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const colunas = (ls.shift() || '').split(/[;\t]/).map(s => s.trim());
    const linhas = ls.map(l => l.split(/[;\t]/).map(s => { const x = s.trim(); return /^-?\d+([.,]\d+)?$/.test(x) ? parseFloat(x.replace(',', '.')) : x; }));
    return { nome, colunas, linhas };
  }

  /* ---------- Modelo de exemplo (valores fictícios) ---------- */
  function modeloPadrao() {
    const id = () => Math.random().toString(36).slice(2, 9);
    const E = (v, rotulo, unidade, tipo, padrao, opc, resumo) => ({ id: id(), var: v, rotulo, unidade, tipo, padrao, opcoes: opc || '', resumo: !!resumo });
    const C = (v, rotulo, unidade, formula, casas, resumo, destaque) => ({ id: id(), var: v, rotulo, unidade, formula, casas, resumo: !!resumo, destaque: !!destaque });
    const T = (nome, txt) => ({ id: id(), ...textoParaTabela(nome, txt) });
    return {
      nome: 'Modelo de exemplo (fictício)',
      versao: 1,
      exemplo: true,
      criterios: 'Exemplo para demonstração. Substitua pelas fórmulas e tabelas da sua planilha de dimensionamento (NBR 5410) antes de usar com clientes.',
      entradas: [
        E('tipo', 'Tipo de circuito', '', 'lista', 'Tomadas', 'Iluminação;Tomadas;Força', true),
        E('potencia', 'Potência', 'W', 'numero', 2000, '', true),
        E('tensao', 'Tensão', 'V', 'lista', 220, '127;220;380', true),
        E('fases', 'Sistema (1 = mono/bifásico, 3 = trifásico)', '', 'lista', 1, '1;3'),
        E('fp', 'Fator de potência', '', 'numero', 0.92, ''),
        E('comprimento', 'Comprimento do circuito', 'm', 'numero', 25, '', true),
        E('queda_max', 'Queda de tensão admissível', '%', 'numero', 4, ''),
        E('temperatura', 'Temperatura ambiente', '°C', 'lista', 30, '25;30;35;40'),
        E('agrupados', 'Circuitos no mesmo eletroduto', '', 'numero', 1, '')
      ],
      calculos: [
        C('ib', 'Corrente de projeto (Ib)', 'A', 'SE(fases=3; potencia/(RAIZ(3)*tensao*fp); potencia/(tensao*fp))', 2, true),
        C('fct', 'Fator de correção de temperatura', '', 'PROCV(temperatura; "temperatura"; "fator")', 2),
        C('fca', 'Fator de agrupamento', '', 'PROCV(MINIMO(agrupados; 6); "agrupamento"; "fator"; VERDADEIRO)', 2),
        C('iz_min', 'Corrente corrigida mínima', 'A', 'ib/(fct*fca)', 2),
        C('s_cap', 'Seção pela capacidade de condução', 'mm²', 'PROXIMO("capacidade"; "corrente"; iz_min; "secao")', 1),
        C('k', 'Fator do circuito (2 ou √3)', '', 'SE(fases=3; RAIZ(3); 2)', 3),
        C('s_qcalc', 'Seção mínima calculada pela queda', 'mm²', 'k*0,0172*comprimento*ib*100/(queda_max*tensao)', 2),
        C('s_queda', 'Seção pela queda de tensão', 'mm²', 'PROXIMO("capacidade"; "secao"; s_qcalc; "secao")', 1),
        C('s_min', 'Seção mínima do tipo de circuito', 'mm²', 'PROCV(tipo; "secao_minima"; "secao")', 1),
        C('secao', 'Seção adotada', 'mm²', 'MAXIMO(s_cap; s_queda; s_min)', 1, true, true),
        C('iz', 'Capacidade corrigida do cabo (Iz)', 'A', 'PROCV(secao; "capacidade"; "corrente")*fct*fca', 2),
        C('disjuntor', 'Disjuntor', 'A', 'PROXIMO("disjuntores"; "in"; ib; "in")', 0, true, true),
        C('queda', 'Queda de tensão', '%', 'k*0,0172*comprimento*ib*100/(secao*tensao)', 2, true),
        C('verificacao', 'Verificação', '', 'SE(E(disjuntor<=iz; queda<=queda_max); "OK"; "Revisar")', 0, true)
      ],
      tabelas: [
        T('capacidade', 'secao;corrente\n1,5;17,5\n2,5;24\n4;32\n6;41\n10;57\n16;76\n25;101\n35;125\n50;151\n70;192\n95;232'),
        T('temperatura', 'temperatura;fator\n25;1,06\n30;1\n35;0,94\n40;0,87'),
        T('agrupamento', 'circuitos;fator\n1;1\n2;0,8\n3;0,7\n4;0,65\n5;0,6\n6;0,57'),
        T('disjuntores', 'in\n10\n16\n20\n25\n32\n40\n50\n63\n70\n80\n100\n125'),
        T('secao_minima', 'tipo;secao\nIluminação;1,5\nTomadas;2,5\nForça;2,5')
      ]
    };
  }

  const AJUDA = [
    ['SE(condição; se_verdadeiro; se_falso)', 'SE(fases=3; RAIZ(3); 2)'],
    ['E(...) · OU(...) · NAO(x)', 'E(disjuntor<=iz; queda<=4)'],
    ['MAXIMO(...) · MINIMO(...) · SOMA(...)', 'MAXIMO(s_cap; s_queda; 2,5)'],
    ['RAIZ(x) · ABS(x) · POTENCIA(x; y) · x^y · PI()', 'potencia/(RAIZ(3)*tensao)'],
    ['ARRED(x; casas) · ARREDONDAR.PARA.CIMA(x; casas) · ARREDONDAR.PARA.BAIXO(x; casas)', 'ARRED(ib; 1)'],
    ['PROCV(valor; "tabela"; "coluna")', 'Valor exato na 1ª coluna. Ex.: PROCV(secao; "capacidade"; "corrente")'],
    ['PROCV(valor; "tabela"; "coluna"; VERDADEIRO)', 'Maior linha ≤ valor (aproximado, como no Excel)'],
    ['PROXIMO("tabela"; "coluna_busca"; valor; "coluna_retorno")', 'Menor linha com coluna_busca ≥ valor. Ex.: PROXIMO("capacidade"; "corrente"; iz_min; "secao")'],
    ['Texto entre aspas e & para juntar', 'SE(queda<=4; "OK"; "Revisar")']
  ];

  window.Formulas = { analisar, calcular, validar, linhas, fmt, opcoes, valorEntrada, tabelaParaTexto, textoParaTabela, modeloPadrao, AJUDA, chave };
})();
