/* Anexos do orçamento: arquivos, desenhos (draw.io) e links.
   - Os arquivos ficam no IndexedDB DESTE aparelho (o localStorage não comporta
     arquivos). No orçamento fica só a ficha do anexo (nome, tipo, tamanho), que
     sincroniza na nuvem; o arquivo em si não.
   - Desenhos: editor draw.io (diagrams.net) em modo embutido. É gratuito, sem
     chave de API, e o desenho é passado direto entre as janelas no aparelho;
     o servidor do draw.io só entrega o programa. Precisa de internet para abrir.
     O desenho é guardado como PNG com o diagrama embutido (xmlpng): serve de
     imagem para o PDF e pode ser reaberto para edição. */
(function () {
  'use strict';

  /* ---------- IndexedDB ---------- */
  const NOME_DB = 'orcamentos-pwa-arquivos', LOJA = 'arquivos';
  let dbp = null;
  function abrir() {
    if (!dbp) dbp = new Promise((ok, falha) => {
      const r = indexedDB.open(NOME_DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(LOJA);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => falha(r.error);
    });
    return dbp;
  }
  async function op(modo, fn) {
    const db = await abrir();
    return new Promise((ok, falha) => {
      const tx = db.transaction(LOJA, modo);
      const req = fn(tx.objectStore(LOJA));
      tx.oncomplete = () => ok(req && req.result);
      tx.onerror = () => falha(tx.error);
      tx.onabort = () => falha(tx.error || new Error('Armazenamento cheio'));
    });
  }
  const salvar = (id, blob) => op('readwrite', s => s.put(blob, id));
  const obter = id => op('readonly', s => s.get(id)).then(b => b || null).catch(() => null);
  const excluir = id => op('readwrite', s => s.delete(id)).catch(() => {});

  const tamanhoFmt = n => !n ? '' : n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1).replace('.', ',') + ' MB';
  const paraDataUrl = blob => new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = falha; r.readAsDataURL(blob); });
  const deDataUrl = url => fetch(url).then(r => r.blob());
  const ehImagem = mime => /^image\/(png|jpe?g)$/i.test(mime || '');

  /* ---------- Editor draw.io ---------- */
  const ORIGEM = 'https://embed.diagrams.net';
  /* Abre o editor em tela cheia. fonte: { xml } ou { xmlpng: dataUrl }.
     Resolve com o PNG (data URL, diagrama embutido) ao salvar, ou null ao sair. */
  function abrirDrawio(fonte, titulo) {
    return new Promise(resolve => {
      const camada = document.createElement('div');
      camada.className = 'drawio-camada';
      const ifr = document.createElement('iframe');
      ifr.title = 'Editor de desenho';
      // Biblioteca própria de símbolos de planta (drawio/simbolos-planta.xml), servida pelo próprio app
      const lib = new URL('drawio/simbolos-planta.xml', location.href).href;
      ifr.src = `${ORIGEM}/?embed=1&proto=json&spin=1&libraries=1&saveAndExit=1&noSaveBtn=1&lang=pt&clibs=U${encodeURIComponent(lib)}`;
      camada.appendChild(ifr);
      document.body.appendChild(camada);
      document.body.classList.add('sem-rolagem');
      const enviar = m => ifr.contentWindow.postMessage(JSON.stringify(m), ORIGEM);
      let fim = false;
      const fechar = v => {
        if (fim) return; fim = true;
        window.removeEventListener('message', receber);
        camada.remove(); document.body.classList.remove('sem-rolagem');
        resolve(v);
      };
      function receber(ev) {
        if (ev.origin !== ORIGEM || ev.source !== ifr.contentWindow || typeof ev.data !== 'string') return;
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.event === 'init') enviar({ action: 'load', ...(fonte && fonte.xmlpng ? { xmlpng: fonte.xmlpng } : { xml: (fonte && fonte.xml) || '' }), title: titulo || 'Desenho', libs: 'general;electrical', autosave: 0 });
        else if (m.event === 'save') enviar({ action: 'export', format: 'xmlpng', spinKey: 'saving', scale: 2, border: 10 });
        else if (m.event === 'export') fechar(m.data || null);
        else if (m.event === 'exit') fechar(null);
      }
      window.addEventListener('message', receber);
    });
  }

  /* ---------- Unifilar automático (a partir do dimensionamento) ---------- */
  const xe = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '&#xa;');
  const he = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sa = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Busca um valor nos resultados do circuito: pela variável ou pelo nome exibido
  function valorDe(c, vars, palavra, unidade) {
    const L = (c.linhas || []).filter(l => !l.erro);
    const l = L.find(x => vars.includes(sa(x.var))) || L.find(x => sa(x.rotulo).includes(palavra) && (!unidade || sa(x.unidade).includes(unidade)));
    return l ? { v: l.valor, u: l.unidade } : null;
  }
  const txt = r => r ? `${r.v}${r.u ? ' ' + r.u : ''}` : '?';

  function gerarUnifilarXml(o) {
    const circ = o.circuitos || [];
    const tecDe = classe => (o.itens || []).map(i => i.tec).find(t => t && t.classe === classe);
    const dr = tecDe('dr'), dps = tecDe('dps');
    const n = Math.max(circ.length, 1), col = 150, x0 = 60, larg = n * col;
    const busY = dr ? 330 : 250, busX = x0, busW = larg;
    const cel = [];
    let id = 2;
    const V = (valor, x, y, w, h, estilo) => { const i = 'c' + id++; cel.push(`<mxCell id="${i}" value="${xe(valor)}" style="${estilo}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`); return i; };
    const E = (de, para, valor, extra) => { cel.push(`<mxCell id="c${id++}" value="${xe(valor || '')}" style="endArrow=none;html=1;rounded=0;strokeWidth=1.5;fontSize=10;labelBackgroundColor=#ffffff;${extra || ''}" edge="1" parent="1" source="${de}" target="${para}"><mxGeometry relative="1" as="geometry"/></mxCell>`); };
    const caixa = 'rounded=1;whiteSpace=wrap;html=1;fontSize=11;strokeWidth=1.5;fillColor=#ffffff;';
    const disj = 'rounded=0;whiteSpace=wrap;html=1;fontSize=11;fontStyle=1;strokeWidth=1.5;fillColor=#f5f5f5;';
    const meio = busX + busW / 2;

    V('DIAGRAMA UNIFILAR - QUADRO DE DISTRIBUIÇÃO', busX, 10, Math.max(busW, 360), 24, 'text;html=1;fontSize=15;fontStyle=1;align=left;verticalAlign=middle;');
    V('Rascunho gerado pelo app a partir do dimensionamento. Revise antes de entregar.', busX, 32, Math.max(busW, 360), 18, 'text;html=1;fontSize=10;fontColor=#b42318;align=left;');
    const ent = V('Entrada / medidor', meio - 60, 64, 120, 34, caixa);
    const geral = V('Disjuntor geral\n___ A', meio - 50, 140, 100, 44, disj);
    E(ent, geral);
    let acima = geral;
    if (dr) {
      const d = V(`DR ${dr.in ? dr.in + ' A ' : ''}${dr.idn ? dr.idn + ' mA' : ''}`.trim(), meio - 50, 220, 100, 44, disj);
      E(geral, d); acima = d;
    }
    const bus = V('', busX, busY, busW, 6, 'rounded=0;html=1;fillColor=#142029;strokeColor=none;');
    E(acima, bus, '', `exitX=0.5;exitY=1;entryX=0.5;entryY=0;`);
    V('Barramento', busX + busW + 8, busY - 6, 80, 18, 'text;html=1;fontSize=10;align=left;');
    if (dps) {
      const p = V(`DPS${dps.classe_dps ? ' classe ' + dps.classe_dps : ''}${dps.uc ? '\n' + dps.uc + ' V' : ''}`, busX - 10, busY - 110, 90, 40, caixa + 'fillColor=#fff4e5;');
      E(p, bus, '', 'exitX=0.5;exitY=1;entryX=0.05;entryY=0;');
    }
    const linhasTab = [];
    circ.forEach((c, i) => {
      const cx = x0 + i * col + col / 2;
      const dj = valorDe(c, ['disjuntor', 'in', 'protecao'], 'disjuntor', 'a');
      const sc = valorDe(c, ['secao', 'secao_adotada', 's'], 'secao adotada', 'mm') || valorDe(c, [], 'secao', 'mm');
      const pot = valorDe(c, ['potencia', 'p'], 'potencia', 'w');
      const ib = valorDe(c, ['ib', 'corrente'], 'corrente de projeto', 'a');
      const lg = window.Store && window.Store.ligacoes ? (window.Store.ligacoes(o).porCircuito[c.id] || {}).rotulo : '';
      const b = V(`${i + 1}\n${dj ? dj.v + ' A' : '? A'}`, cx - 32, busY + 60, 64, 48, disj);
      if (lg) V(lg, cx - 65, busY + 112, 130, 16, 'text;html=1;fontSize=9;align=center;fontColor=#5a6470;');
      E(bus, b, '', `exitX=${((cx - busX) / busW).toFixed(4)};exitY=1;entryX=0.5;entryY=0;`);
      const carga = V(`${c.nome}${pot ? '\n' + txt(pot) : ''}`, cx - 65, busY + 190, 130, 50, caixa);
      E(b, carga, sc ? txt(sc) : '');
      linhasTab.push(`<tr><td>${i + 1}</td><td style="text-align:left">${he(c.nome)}</td><td>${he(pot ? txt(pot) : '-')}</td><td>${he(ib ? txt(ib) : '-')}</td><td>${he(sc ? txt(sc) : '-')}</td><td>${he(dj ? txt(dj) : '-')}</td></tr>`);
    });
    if (!circ.length) V('Nenhum circuito no dimensionamento.\nAdicione circuitos no orçamento.', busX, busY + 60, 260, 40, 'text;html=1;fontSize=11;align=left;');
    if (linhasTab.length) {
      const tab = `<b>QUADRO DE CARGAS</b><table border="1" cellpadding="4" style="border-collapse:collapse;font-size:10px;margin-top:4px;text-align:center"><tr style="background:#eef2f4"><th>Circ.</th><th>Descrição</th><th>Potência</th><th>Corrente</th><th>Seção</th><th>Disjuntor</th></tr>${linhasTab.join('')}</table>`;
      V(tab, busX, busY + 280, Math.max(busW, 460), 50 + linhasTab.length * 24, 'text;html=1;align=left;verticalAlign=top;whiteSpace=wrap;overflow=visible;');
    }
    return `<mxGraphModel dx="800" dy="600" grid="1" gridSize="10" page="1" pageScale="1" pageWidth="827" pageHeight="1169"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cel.join('')}</root></mxGraphModel>`;
  }


  /* ---------- Multifilar colorido (boas práticas NBR 5410) ----------
     Entrada → disjuntor geral (polos = nº de fases) → DPS (fases e neutro para o PE)
     → IDR geral (fases + neutro) → barramentos de fase, neutro (após o IDR) e terra.
     Cada circuito: disjuntor com um polo por fase; neutro do barramento de neutro;
     PE do barramento de terra em todos os circuitos. Bolinha = ligação; sem bolinha = cruzamento. */
  const CORES = { PE: '#2e9e3e', N: '#1565c0', F1: '#d71920', F2: '#111111', F3: '#ffffff' };
  const NOMES = { PE: 'Terra (PE)', N: 'Neutro', F1: 'Fase 1', F2: 'Fase 2', F3: 'Fase 3' };
  const FUNDO = '#d9dde1', CONTORNO = '#4a4f55';

  function gerarMultifilarXml(o) {
    const st = window.Store;
    const lig = st.ligacoes(o), al = lig.alimentacao, F = st.fasesDisponiveis(o);
    const circ = o.circuitos || [];
    const tecDe = classe => (o.itens || []).map(i => i.tec).find(t => t && t.classe === classe);
    const dr = tecDe('dr') || {}, dps = tecDe('dps') || {};
    const fios = [], pecas = [], topo = [];
    let id = 2;
    const nid = () => 'm' + id++;
    // Fio: lista de pontos [[x,y],...]; branco ganha contorno escuro por baixo
    function fio(cond, pts, seta, extra) {
      const cor = CORES[cond];
      const geo = (w, c) => `<mxCell id="${nid()}" value="" style="endArrow=${seta ? 'block;endFill=1;endSize=7' : 'none'};html=1;rounded=0;strokeWidth=${w};strokeColor=${c};${extra || ''}" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${pts[0][0]}" y="${pts[0][1]}" as="sourcePoint"/><mxPoint x="${pts[pts.length - 1][0]}" y="${pts[pts.length - 1][1]}" as="targetPoint"/>${pts.length > 2 ? `<Array as="points">${pts.slice(1, -1).map(q => `<mxPoint x="${q[0]}" y="${q[1]}"/>`).join('')}</Array>` : ''}</mxGeometry></mxCell>`;
      if (cond === 'F3') fios.push(geo(5, CONTORNO));
      fios.push(geo(3, cor));
    }
    const V = (lista, valor, x, y, w, h, estilo) => { lista.push(`<mxCell id="${nid()}" value="${xe(valor)}" style="${estilo}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`); };
    const ponto = (cond, x, y) => V(topo, '', x - 4.5, y - 4.5, 9, 9, `ellipse;shape=ellipse;perimeter=ellipsePerimeter;html=1;fillColor=${CORES[cond]};strokeColor=${cond === 'F3' ? CONTORNO : CORES[cond]};strokeWidth=1;`);
    const caixa = 'rounded=1;whiteSpace=wrap;html=1;fillColor=#f7f7f7;strokeColor=#333333;strokeWidth=1.5;fontSize=11;fontColor=#142029;';
    const etiqueta = c => `rounded=1;whiteSpace=wrap;html=1;fontStyle=1;fontSize=13;strokeColor=${c === 'F3' ? CONTORNO : 'none'};fillColor=${CORES[c]};fontColor=${c === 'F3' ? '#142029' : '#ffffff'};`;
    const texto = (tam, extra) => `text;html=1;fillColor=none;strokeColor=none;align=left;verticalAlign=middle;fontSize=${tam};fontColor=#142029;${extra || ''}`;

    // Colunas dos condutores de entrada
    const X = { PE: 60, N: 110 };
    F.forEach((f, i) => { X[f] = 170 + i * 30; });
    const xUltF = X[F[F.length - 1]];
    const yIni = 44;

    // Etiquetas de entrada
    ['PE', 'N', ...F].forEach(c => V(pecas, c === 'PE' ? 'T' : c, X[c] - 14, 8, 28, 26, etiqueta(c)));

    // Disjuntor geral (só fases)
    const yDG = 70, hDG = 56;
    // DPS
    const yTap = 150, yDPS = 172, hDPS = 44;
    const dpsConds = [...F, 'N'];
    const xDPS0 = xUltF + 90;
    const xDPS = c => xDPS0 + dpsConds.indexOf(c) * 22;
    // IDR (fases + neutro)
    const yIDR = 250, hIDR = 70;
    // Barramentos
    const yFase = f => 362 + F.indexOf(f) * 16;
    const yN = 610, yPE = 630, yFim = 720;
    const xC0 = Math.max(xDPS(dpsConds[dpsConds.length - 1]) + 70, xUltF + 120);
    const COL = 150;
    const xFimBarras = xC0 + Math.max(circ.length, 1) * COL - 30;

    // Condutores de entrada até os barramentos
    F.forEach(f => {
      fio(f, [[X[f], yIni], [X[f], yFase(f)], [xFimBarras, yFase(f)]]);
      // derivação para o DPS
      fio(f, [[X[f], yTap], [xDPS(f), yTap], [xDPS(f), yDPS]], false, 'jumpStyle=arc;jumpSize=8;');
      ponto(f, X[f], yTap);
    });
    fio('N', [[X.N, yIni], [X.N, yN], [xFimBarras, yN]]);
    fio('N', [[X.N, yTap - 12], [xDPS('N'), yTap - 12], [xDPS('N'), yDPS]], false, 'jumpStyle=arc;jumpSize=8;');
    ponto('N', X.N, yTap - 12);
    fio('PE', [[X.PE, yIni], [X.PE, yPE], [xFimBarras, yPE]]);
    // DPS → PE (barramento de terra)
    const yDpsPE = yDPS + hDPS + 18, xDpsPE = xDPS(dpsConds[dpsConds.length - 1]) + 26;
    dpsConds.forEach(c => fio('PE', [[xDPS(c), yDPS + hDPS], [xDPS(c), yDpsPE], [xDpsPE, yDpsPE]]));
    fio('PE', [[xDpsPE, yDpsPE], [xDpsPE, yPE]]);
    ponto('PE', xDpsPE, yPE);

    // Peças do quadro
    V(pecas, '', X[F[0]] - 15, yDG, xUltF - X[F[0]] + 30, hDG, caixa);
    V(pecas, `<b>Disjuntor geral</b><br>${F.length}P ${al.geral ? xe(al.geral) + ' A' : '___ A'}`, xUltF + 22, yDG + 8, 120, 40, texto(11));
    V(pecas, '', X.N - 15, yIDR, xUltF - X.N + 30, hIDR, caixa);
    V(pecas, `<b>IDR</b><br>${F.length + 1}P ${dr.in ? xe(dr.in) + ' A' : '__ A'} · ${xe(dr.idn || '30')} mA${dr.tipo_dr ? ' · tipo ' + xe(dr.tipo_dr) : ''}`, xUltF + 22, yIDR + 14, 220, 40, texto(11));
    V(pecas, '', xDPS0 - 12, yDPS, (dpsConds.length - 1) * 22 + 24, hDPS, caixa + 'fillColor=#fff4e5;');
    V(pecas, `<b>DPS</b> classe ${xe(dps.classe_dps || 'II')}<br>${dps.uc ? xe(dps.uc) + ' V' : 'Uc ___ V'}${dps.imax ? ' · ' + xe(dps.imax) + ' kA' : ''}`, xDpsPE + 10, yDPS - 2, 140, 40, texto(11));
    V(pecas, '<b>Barramento de neutro</b> (após o IDR)', X.N + 8, yN - 22, 240, 18, texto(10.5));
    V(pecas, '<b>Barramento de terra (PE)</b>', X.PE + 8, yPE + 4, 220, 18, texto(10.5));
    // Polos desenhados dentro das caixas
    F.forEach(f => V(pecas, '', X[f] - 6, yDG + 14, 12, 28, 'rounded=0;html=1;fillColor=#2b2f33;strokeColor=none;'));
    [...F, 'N'].forEach(c => V(pecas, '', X[c] - 6, yIDR + 22, 12, 28, `rounded=0;html=1;fillColor=${c === 'N' ? CORES.N : '#2b2f33'};strokeColor=none;`));
    V(pecas, 'T', xUltF - 2, yIDR + 4, 16, 16, 'ellipse;shape=ellipse;perimeter=ellipsePerimeter;html=1;fontSize=9;fontStyle=1;fillColor=#ffffff;strokeColor=#333333;');

    // Circuitos
    circ.forEach((c, i) => {
      const L = lig.porCircuito[c.id] || { fases: [F[0]], neutro: true, rotulo: F[0] + '+N+PE', tensao: lig.vFN };
      const n = L.fases.length;
      const cx = xC0 + i * COL;
      const pxs = L.fases.map((f, k) => cx + k * 22);
      const yB = 440, hB = 60;
      L.fases.forEach((f, k) => {
        fio(f, [[pxs[k], yFase(f)], [pxs[k], yB]]);
        ponto(f, pxs[k], yFase(f));
        fio(f, [[pxs[k], yB + hB], [pxs[k], yFim]], true);
      });
      let xx = pxs[n - 1] + 22;
      if (L.neutro) { fio('N', [[xx, yN], [xx, yFim]], true); ponto('N', xx, yN); xx += 22; }
      fio('PE', [[xx, yPE], [xx, yFim]], true); ponto('PE', xx, yPE);
      const dj = valorDe(c, ['disjuntor', 'in', 'protecao'], 'disjuntor', 'a');
      const sc = valorDe(c, ['secao', 'secao_adotada', 's'], 'secao adotada', 'mm') || valorDe(c, [], 'secao', 'mm');
      V(pecas, '', cx - 14, yB, (n - 1) * 22 + 28, hB, caixa);
      L.fases.forEach((f, k) => V(pecas, '', pxs[k] - 5, yB + 16, 10, 26, 'rounded=0;html=1;fillColor=#2b2f33;strokeColor=none;'));
      V(pecas, `${dj ? xe(dj.v) + ' A' : '? A'}`, cx - 68, yB + 20, 50, 18, texto(10.5, 'fontStyle=1;align=right;'));
      V(pecas, `<b>C${i + 1} - ${he(c.nome)}</b><br>${L.tensao} V · ${he(L.rotulo)}<br>${sc ? he(sc.v + ' ' + sc.u) : '? mm²'}${dj ? ' · ' + he(dj.v) + ' A' : ''}`,
        cx - 16, yFim + 12, COL - 14, 58, 'rounded=1;whiteSpace=wrap;html=1;fillColor=#f7f7f7;strokeColor=#888888;fontSize=10.5;fontColor=#142029;align=center;verticalAlign=middle;');
    });
    if (!circ.length) V(pecas, 'Nenhum circuito no dimensionamento.', xC0, 460, 240, 30, texto(12));

    // Título, legenda e equilíbrio de fases
    const xT = xC0;
    V(pecas, '<b>DIAGRAMA MULTIFILAR - QUADRO DE DISTRIBUIÇÃO</b>', xT, 6, 460, 22, texto(15));
    V(pecas, `Alimentação ${({ mono: 'monofásica', bi: 'bifásica', tri: 'trifásica' })[al.tipo]} · ${al.sistema} V · Esquema TN-S`, xT, 28, 460, 16, texto(11));
    const conds = ['PE', 'N', ...F];
    conds.forEach((cnd, k) => {
      const lx = xT + k * 92, ly = 60;
      if (cnd === 'F3') V(pecas, '', lx, ly + 5, 26, 6, `rounded=0;html=1;fillColor=${CORES.F3};strokeColor=${CONTORNO};`);
      else V(pecas, '', lx, ly + 5, 26, 6, `rounded=0;html=1;fillColor=${CORES[cnd]};strokeColor=none;`);
      V(pecas, NOMES[cnd], lx + 30, ly, 62, 16, texto(10));
    });
    const totalW = Object.values(lig.carga).reduce((a, b) => a + b, 0) || 1;
    V(pecas, '<b>Carga por fase:</b> ' + F.map(f => `${f} ${Math.round(lig.carga[f]).toLocaleString('pt-BR')} W (${Math.round(lig.carga[f] / totalW * 100)}%)`).join(' · '), xT, 84, 520, 16, texto(10.5));
    V(pecas, 'Gerado pelo app a partir do dimensionamento. Revise antes de entregar. Bolinha = ligação; linhas sem bolinha apenas se cruzam.', xT, 102, 470, 28, texto(9.5, 'fontColor=#5a6470;whiteSpace=wrap;verticalAlign=top;'));
    if (lig.avisos.length) V(pecas, '<b>Atenção:</b> ' + lig.avisos.map(he).join('; '), xT, 132, 470, 30, texto(10, 'fontColor=#b42318;whiteSpace=wrap;verticalAlign=top;'));

    return `<mxGraphModel dx="1000" dy="800" grid="0" gridSize="10" page="1" pageScale="1" pageWidth="${Math.max(1169, xFimBarras + 80)}" pageHeight="827" background="${FUNDO}"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${fios.join('')}${pecas.join('')}${topo.join('')}</root></mxGraphModel>`;
  }

  /* Planta do cômodo como fundo travado, para marcar os pontos por cima */
  async function plantaXml(arquivo, titulo) {
    const url = await paraDataUrl(arquivo);
    const dim = await new Promise(ok => { const im = new Image(); im.onload = () => ok([im.naturalWidth, im.naturalHeight]); im.onerror = () => ok([1000, 700]); im.src = url; });
    const esc = 1000 / Math.max(dim[0], 1);
    const w = Math.round(dim[0] * esc), h = Math.round(dim[1] * esc);
    // No estilo do draw.io a imagem vai como data:image/png,BASE64 (sem ";base64", que conflita com ";")
    const img = url.replace(';base64', '');
    return `<mxGraphModel grid="1" gridSize="10" page="1" pageWidth="${w + 40}" pageHeight="${h + 120}"><root><mxCell id="0"/><mxCell id="1" parent="0"/>`
      + `<mxCell id="pl" value="" style="shape=image;html=1;imageAspect=0;aspect=fixed;locked=1;movable=0;resizable=0;deletable=0;editable=0;image=${xe(img)};" vertex="1" parent="1"><mxGeometry x="20" y="70" width="${w}" height="${h}" as="geometry"/></mxCell>`
      + `<mxCell id="tt" value="${xe(titulo)}" style="text;html=1;fontSize=16;fontStyle=1;align=left;fillColor=none;strokeColor=none;" vertex="1" parent="1"><mxGeometry x="20" y="20" width="${w}" height="28" as="geometry"/></mxCell>`
      + `<mxCell id="ti" value="Use a biblioteca &quot;simbolos-planta&quot; (lado esquerdo) para marcar tomadas, interruptores e pontos de luz." style="text;html=1;fontSize=10;align=left;fontColor=#5a6470;fillColor=none;strokeColor=none;" vertex="1" parent="1"><mxGeometry x="20" y="44" width="${w}" height="18" as="geometry"/></mxCell>`
      + `</root></mxGraphModel>`;
  }

  window.Arquivos = { salvar, obter, excluir, abrirDrawio, gerarUnifilarXml, gerarMultifilarXml, plantaXml, CORES, tamanhoFmt, paraDataUrl, deDataUrl, ehImagem };
})();
