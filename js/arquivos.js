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
      ifr.src = `${ORIGEM}/?embed=1&proto=json&spin=1&libraries=1&saveAndExit=1&noSaveBtn=1&lang=pt`;
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
      const b = V(`${i + 1}\n${dj ? dj.v + ' A' : '? A'}`, cx - 32, busY + 60, 64, 48, disj);
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

  window.Arquivos = { salvar, obter, excluir, abrirDrawio, gerarUnifilarXml, tamanhoFmt, paraDataUrl, deDataUrl, ehImagem };
})();
