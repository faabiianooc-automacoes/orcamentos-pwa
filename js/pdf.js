/* Geração do PDF do orçamento (A4, jsPDF + AutoTable, funciona offline). */
(function () {
  'use strict';
  const S = () => window.Store;

  // As fontes padrão do PDF usam Latin-1: troca caracteres fora dele.
  const limpar = s => String(s == null ? '' : s)
    .replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/…/g, '...').replace(/[  ]/g, ' ')
    .replace(/MΩ/g, 'Mohm').replace(/Ω/g, 'ohm').replace(/²/g, '2').replace(/³/g, '3').replace(/√/g, 'raiz de ').replace(/≥/g, '>=').replace(/≤/g, '<=')
    .replace(/[^\x00-\xff\n]/g, '');

  /* Seção "Dimensionamento dos circuitos": resumo + detalhe de cada circuito.
     Usada no PDF do orçamento e no memorial separado. Retorna o novo y. */
  function secaoDimensionamento(doc, o, y, k) {
    const st = S();
    const { W, H, M, corT, corF, sobreF, tintF2 } = k;
    const circ = o.circuitos || [];
    const novaPaginaSe = alt => { if (y + alt > H - 22) { doc.addPage(); y = M; } };
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...corT);
    doc.text('DIMENSIONAMENTO DOS CIRCUITOS', M, y);
    y += 2;
    const exemplo = circ.some(c => c.modelo && c.modelo.exemplo);
    if (exemplo) {
      y += 4.5; doc.setFontSize(8.5); doc.setTextColor(180, 35, 24);
      doc.text('ATENÇÃO: calculado com fórmulas de EXEMPLO (valores fictícios). Não utilizar para execução.', M, y);
    }
    // Resumo: colunas marcadas como "resumo" (união entre os circuitos)
    const cols = [];
    circ.forEach(c => (c.linhas || []).forEach(l => { if (l.resumo && !cols.some(x => x.var === l.var)) cols.push({ var: l.var, rot: l.rotulo + (l.unidade ? ` (${l.unidade})` : '') }); }));
    doc.autoTable({
      startY: y + 3,
      margin: { left: M, right: M, bottom: 20 },
      head: [['Circuito', ...cols.map(c => limpar(c.rot))]],
      body: circ.map(c => [limpar(c.nome), ...cols.map(col => { const l = (c.linhas || []).find(x => x.var === col.var); return limpar(l ? l.valor : '-'); })]),
      styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.8, textColor: [20, 32, 41], lineColor: [222, 228, 233], lineWidth: 0.1 },
      headStyles: { fillColor: corF, textColor: sobreF, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: tintF2 },
      columnStyles: { 0: { fontStyle: 'bold' } }
    });
    y = doc.lastAutoTable.finalY + 7;
    // Detalhe de cada circuito
    circ.forEach((c, n) => {
      novaPaginaSe(30);
      const corpo = [];
      const ent = (c.linhas || []).filter(l => l.tipo === 'entrada');
      const cal = (c.linhas || []).filter(l => l.tipo === 'calculo');
      if (ent.length) corpo.push([{ content: 'Dados de entrada', colSpan: 3, styles: { fontStyle: 'bold', fillColor: tintF2, textColor: corT } }]);
      ent.forEach(l => corpo.push([limpar(l.rotulo), limpar(l.valor), limpar(l.unidade)]));
      if (cal.length) corpo.push([{ content: 'Resultados', colSpan: 3, styles: { fontStyle: 'bold', fillColor: tintF2, textColor: corT } }]);
      cal.forEach(l => corpo.push([l.destaque ? { content: limpar(l.rotulo), styles: { fontStyle: 'bold' } } : limpar(l.rotulo),
        { content: limpar(l.valor), styles: l.erro ? { textColor: [180, 35, 24] } : l.destaque ? { fontStyle: 'bold' } : {} }, limpar(l.unidade)]));
      doc.autoTable({
        startY: y,
        margin: { left: M, right: M, bottom: 20 },
        head: [[{ content: `${n + 1}. ${limpar(c.nome)}`, colSpan: 3 }]],
        body: corpo,
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.6, textColor: [20, 32, 41], lineColor: [222, 228, 233], lineWidth: 0.1 },
        headStyles: { fillColor: corF, textColor: sobreF, fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right', cellWidth: 40 }, 2: { cellWidth: 18 } }
      });
      y = doc.lastAutoTable.finalY + 6;
    });
    // Critérios do modelo usado
    const modelos = [];
    circ.forEach(c => { const m = c.modelo || {}; const kk = m.nome + '|' + m.versao; if (!modelos.some(x => x.k === kk)) modelos.push({ k: kk, ...m }); });
    modelos.forEach(m => {
      const txt = `Critérios: ${m.nome || 'modelo'} (versão ${m.versao || 1}). ${m.criterios || ''}`.trim();
      const linhas = doc.splitTextToSize(limpar(txt), W - 2 * M);
      novaPaginaSe(linhas.length * 3.8 + 4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90, 100, 110);
      doc.text(linhas, M, y); y += linhas.length * 3.8 + 2;
    });
    return y + 2;
  }

  /* opc.memorial: PDF só do dimensionamento (de acordo)
     opc.entrega: termo de entrega da obra; opc.imagens = [{nome, dataUrl}] (desenhos e fotos) */
  function gerar(o, opc = {}) {
    const memorial = !!opc.memorial;
    const entrega = !!opc.entrega;
    const recibo = opc.recibo || null;   // { valor, data, forma, obs }
    const laudo = !!opc.laudo;
    const outro = memorial || entrega || recibo || laudo;
    const { jsPDF } = window.jspdf;
    const st = S();
    const e = st.db.empresa;
    const c = st.cliente(o.clienteId) || {};
    const t = st.totais(o);
    // Duas cores: corT = letras de destaque; corF = bordas e fundos
    const corT = st.hexParaRgb(e.corTexto);
    const corF = st.hexParaRgb(e.corFundo);
    const sobreF = st.hexParaRgb(st.textoSobre(e.corFundo)); // letra legível sobre corF
    const tintF2 = st.clarear(e.corFundo, 0.96);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 15;
    let y = M;

    doc.setProperties({ title: recibo ? `Recibo ${o.numero}` : laudo ? `Laudo de inspeção ${o.numero}` : entrega ? `Entrega da obra ${o.numero}` : memorial ? `Dimensionamento ${o.numero}` : `Orçamento ${o.numero}`, subject: limpar(o.titulo), author: limpar(e.nome), creator: 'Orçamentos PWA' });

    /* Cabeçalho */
    let xTexto = M;
    if (e.logo) {
      try {
        const props = doc.getImageProperties(e.logo);
        const max = 24;
        const r = Math.min(max / props.width, max / props.height);
        doc.addImage(e.logo, props.fileType || 'PNG', M, y, props.width * r, props.height * r);
        xTexto = M + 28;
      } catch (err) { /* logo inválido: segue sem ele */ }
    }
    doc.setTextColor(20, 32, 41);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text(limpar(e.nome || 'Sua empresa'), xTexto, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(90, 100, 110);
    const linhasEmp = [
      e.documento && `CPF/CNPJ: ${e.documento}`,
      [e.telefone && st.telefoneFmt(e.telefone), e.email].filter(Boolean).join('  ·  '),
      [e.endereco, e.cidade].filter(Boolean).join(' - ')
    ].filter(Boolean).map(limpar);
    linhasEmp.forEach((l, i) => doc.text(l, xTexto, y + 10 + i * 4));

    doc.setTextColor(...corT); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text(recibo ? 'RECIBO' : laudo ? 'LAUDO DE INSPEÇÃO' : entrega ? 'ENTREGA DA OBRA' : memorial ? 'DIMENSIONAMENTO' : 'ORÇAMENTO', W - M, y + 5, { align: 'right' });
    doc.setTextColor(20, 32, 41); doc.setFontSize(10);
    doc.text(limpar(outro ? `Ref. orçamento ${o.numero}` : o.numero), W - M, y + 11, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(90, 100, 110);
    if (recibo) {
      doc.text(`Data: ${st.dataBR(recibo.data)}`, W - M, y + 16, { align: 'right' });
    } else if (laudo) {
      doc.text(`Data da inspeção: ${st.dataBR((o.inspecao || {}).data || st.hoje())}`, W - M, y + 16, { align: 'right' });
    } else if (entrega) {
      doc.text(`Concluído em: ${st.dataBR(o.concluidoEm || st.hoje())}`, W - M, y + 16, { align: 'right' });
      if (o.dataInicio) doc.text(`Início: ${st.dataBR(o.dataInicio)}`, W - M, y + 20, { align: 'right' });
    } else if (memorial) {
      doc.text(`Data: ${st.dataBR(st.hoje())}`, W - M, y + 16, { align: 'right' });
      if (o.dataInicio) doc.text(`Início previsto: ${st.dataBR(o.dataInicio)}`, W - M, y + 20, { align: 'right' });
    } else {
    doc.text(`Emissão: ${st.dataBR(o.data)}`, W - M, y + 16, { align: 'right' });
    doc.text(`Válido até: ${st.dataBR(st.validadeAte(o))}`, W - M, y + 20, { align: 'right' });
    if (o.dataInicio) doc.text(`Início previsto: ${st.dataBR(o.dataInicio)}`, W - M, y + 24, { align: 'right' });
    }

    y += o.dataInicio && !outro ? 31 : 28;
    doc.setDrawColor(...corF); doc.setLineWidth(0.8); doc.line(M, y, W - M, y);
    y += 7;

    /* Cliente */
    doc.setFillColor(...tintF2); doc.setDrawColor(...corF); doc.setLineWidth(0.3);
    const linhasCli = [
      c.documento && `CPF/CNPJ: ${c.documento}`,
      [c.telefone && st.telefoneFmt(c.telefone), c.email].filter(Boolean).join('  ·  '),
      [c.endereco, c.cidade].filter(Boolean).join(' - ')
    ].filter(Boolean).map(limpar);
    const altCli = 13 + linhasCli.length * 4.5;
    doc.roundedRect(M, y, W - 2 * M, altCli, 2, 2, 'FD');
    doc.setFontSize(7.5); doc.setTextColor(110, 120, 130); doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', M + 4, y + 5);
    doc.setFontSize(11); doc.setTextColor(20, 32, 41);
    doc.text(limpar(c.nome || '-'), M + 4, y + 10.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(70, 80, 90);
    linhasCli.forEach((l, i) => doc.text(l, M + 4, y + 15.5 + i * 4.5));
    y += altCli + 7;

    if (o.titulo) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(20, 32, 41);
      const tl = doc.splitTextToSize(limpar(o.titulo), W - 2 * M);
      doc.text(tl, M, y);
      y += tl.length * 5 + 2;
    }

    const k = { W, H, M, corT, corF, sobreF, tintF2 };
    const novaPaginaSe = alt => { if (y + alt > H - 22) { doc.addPage(); y = M; } };
    const temDim = (o.circuitos || []).length > 0;

    if (recibo) {
      /* Recibo de pagamento */
      const f = window.Extras ? window.Extras.financeiro(o) : { total: t.total, recebido: recibo.valor, saldo: 0 };
      doc.setFillColor(...tintF2); doc.setDrawColor(...corF); doc.roundedRect(W - M - 70, y - 2, 70, 14, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(20, 32, 41);
      doc.text(st.brl(recibo.valor), W - M - 35, y + 7.5, { align: 'center' });
      y += 22;
      const txt = `Recebi de ${c.nome || 'cliente'}${c.documento ? ', CPF/CNPJ ' + c.documento : ''}, a importância de ${st.brl(recibo.valor)} (${extenso(recibo.valor)}), referente ${o.titulo ? 'a "' + o.titulo + '"' : 'aos serviços'} conforme o orçamento ${o.numero}, paga via ${String(recibo.forma || '').toLowerCase()} em ${st.dataBR(recibo.data)}${recibo.obs ? ' (' + recibo.obs + ')' : ''}.`;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(30, 40, 50);
      const l = doc.splitTextToSize(limpar(txt), W - 2 * M);
      doc.text(l, M, y, { lineHeightFactor: 1.5 }); y += l.length * 6.2 + 6;
      doc.setFontSize(9); doc.setTextColor(70, 80, 90);
      doc.text(`Valor total do serviço: ${st.brl(f.total)}   ·   Recebido até esta data: ${st.brl(f.recebido)}   ·   Saldo: ${st.brl(f.saldo)}`, M, y); y += 10;
      const cid = e.cidade || '';
      doc.setFontSize(10); doc.setTextColor(30, 40, 50);
      doc.text(limpar(`${cid ? cid + ', ' : ''}${dataExtenso(recibo.data)}.`), M, y); y += 4;
    } else if (laudo) {
      /* Laudo de inspeção (NBR 5410, seção 7) */
      const ins = o.inspecao || { itens: {} };
      const RES = { ok: 'Conforme', nok: 'Não conforme', na: 'N/A' };
      const corpo = [];
      (window.Extras ? window.Extras.INSPECAO : []).forEach(g => {
        corpo.push([{ content: limpar(g.grupo), colSpan: 4, styles: { fontStyle: 'bold', fillColor: tintF2, textColor: corT } }]);
        g.itens.forEach(([k2, rot, un]) => { const v = ins.itens[k2] || {}; corpo.push([limpar(rot), { content: RES[v.res] || '-', styles: v.res === 'nok' ? { textColor: [180, 35, 24], fontStyle: 'bold' } : v.res === 'ok' ? { textColor: [6, 118, 71] } : {} }, limpar(v.med ? v.med + ' ' + (un || '') : ''), limpar(v.obs || '')]); });
      });
      doc.autoTable({
        startY: y, margin: { left: M, right: M, bottom: 20 },
        head: [['Item verificado', 'Resultado', 'Medição', 'Observação']], body: corpo,
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, textColor: [20, 32, 41], lineColor: [222, 228, 233], lineWidth: 0.1 },
        headStyles: { fillColor: corF, textColor: sobreF, fontStyle: 'bold' },
        columnStyles: { 1: { cellWidth: 24 }, 2: { cellWidth: 22 }, 3: { cellWidth: 48 } }
      });
      y = doc.lastAutoTable.finalY + 7;
      const r = window.Extras.resultadoInspecao(ins);
      novaPaginaSe(30);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...(r.nok ? [180, 35, 24] : [6, 118, 71]));
      doc.text(r.nok ? `CONCLUSÃO: ${r.nok} NÃO CONFORMIDADE(S) ENCONTRADA(S)` : 'CONCLUSÃO: INSTALAÇÃO CONFORME NOS ITENS VERIFICADOS', M, y); y += 6;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40, 50, 60);
      const resp = [ins.resp && `Responsável: ${ins.resp}`, ins.registro && `Registro: ${ins.registro}`, ins.art && `ART/TRT: ${ins.art}`].filter(Boolean).join('   ·   ');
      if (resp) { doc.text(limpar(resp), M, y); y += 5; }
      if (ins.obs) { const l = doc.splitTextToSize(limpar('Observações: ' + ins.obs), W - 2 * M); novaPaginaSe(l.length * 4.2 + 4); doc.text(l, M, y); y += l.length * 4.2 + 2; }
      doc.setFontSize(7.5); doc.setTextColor(110, 120, 130);
      const nota = doc.splitTextToSize(limpar('Inspeção visual e ensaios realizados nos pontos acessíveis na data indicada, com base na ABNT NBR 5410 (verificação final). Não substitui projeto elétrico nem ART quando exigidos.'), W - 2 * M);
      doc.text(nota, M, y + 2); y += nota.length * 3.6 + 2;
    } else if (entrega) {
      /* Serviços executados (sem valores) */
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...corT);
      doc.text('SERVIÇOS E MATERIAIS', M, y); y += 2;
      doc.autoTable({
        startY: y,
        margin: { left: M, right: M, bottom: 20 },
        head: [['#', 'Descrição', 'Qtd', 'Un.']],
        body: o.itens.map((i, n) => [n + 1, limpar(i.descricao) + (i.tec && window.Tecnico && window.Tecnico.resumo(i.tec) ? '\n' + limpar(window.Tecnico.resumo(i.tec)) : ''), st.qtdFmt(i.qtd), limpar(i.unidade)]),
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.2, textColor: [20, 32, 41], lineColor: [222, 228, 233], lineWidth: 0.1 },
        headStyles: { fillColor: corF, textColor: sobreF, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: tintF2 },
        columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 2: { cellWidth: 14, halign: 'right' }, 3: { cellWidth: 14, halign: 'center' } }
      });
      y = doc.lastAutoTable.finalY + 8;
      const sec = (tit, txt) => {
        if (!String(txt || '').trim()) return;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        const l = doc.splitTextToSize(limpar(txt), W - 2 * M);
        novaPaginaSe(8 + l.length * 4.2);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...corT); doc.text(tit, M, y);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 50, 60); doc.text(l, M, y + 5);
        y += 8 + l.length * 4.2;
      };
      sec('GARANTIA', [o.garantia, window.Extras && o.concluidoEm ? `Válida até ${st.dataBR(window.Extras.garantiaAte(o))}.` : ''].filter(x => String(x || '').trim()).join(' '));
      /* Documentos entregues */
      const docs = (o.anexos || []).filter(a => a.entregar !== false);
      const extras = [];
      if ((o.circuitos || []).length) extras.push('Dimensionamento dos circuitos (neste documento)');
      if (docs.length || extras.length) {
        novaPaginaSe(14);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...corT);
        doc.text('DOCUMENTOS ENTREGUES', M, y); y += 5.5;
        doc.setFontSize(9);
        [...extras.map(t => ({ t })), ...docs.map(a => ({ a }))].forEach(({ t, a }) => {
          novaPaginaSe(6);
          doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 50, 60);
          if (t) { doc.text('- ' + limpar(t), M, y); y += 5; return; }
          const tipo = a.tipo === 'link' ? 'link' : a.tipo === 'desenho' ? 'desenho, neste documento' : (window.Arquivos && window.Arquivos.ehImagem(a.mime) ? 'imagem, neste documento' : 'arquivo enviado junto');
          doc.text(`- ${limpar(a.nome)} (${tipo})`, M, y); y += 4.6;
          if (a.tipo === 'link' && a.url) {
            doc.setFontSize(8); doc.setTextColor(...corT);
            const u = limpar(a.url).slice(0, 110);
            doc.textWithLink(u, M + 3, y, { url: a.url }); y += 5;
            doc.setFontSize(9);
          }
        });
        y += 2;
      }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const decl = doc.splitTextToSize(limpar('Declaro ter recebido os serviços descritos acima, concluídos e em funcionamento, e os documentos listados.'), W - 2 * M);
      novaPaginaSe(decl.length * 4.2 + 52);
      doc.setTextColor(40, 50, 60); doc.text(decl, M, y + 2); y += decl.length * 4.2 + 2;
    } else if (memorial) {
      y = secaoDimensionamento(doc, o, y, k);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const decl = doc.splitTextToSize(limpar('Declaro estar de acordo com os dados, critérios e resultados do dimensionamento acima, que servirão de base para a execução dos serviços.'), W - 2 * M);
      novaPaginaSe(decl.length * 4.2 + 52); // declaração e assinaturas na mesma página
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40, 50, 60);
      doc.text(decl, M, y + 2); y += decl.length * 4.2 + 2;
    } else {
    /* Itens */
    // Largura da coluna Descrição = página menos as colunas de largura fixa
    const LARG_DESC = W - 2 * M - (8 + 22 + 13 + 13 + 26 + 28) - 4.4;
    const LH_SPEC = 7.3 * 1.15 * 0.3528;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.3);
    const specs = o.itens.map(i => {
      const r = i.tec && e.tecNoPdf !== false && window.Tecnico ? window.Tecnico.resumo(i.tec) : '';
      return r ? doc.splitTextToSize(limpar(r), LARG_DESC) : null;
    });
    doc.autoTable({
      startY: y,
      margin: { left: M, right: M, bottom: 20 },
      head: [['#', 'Descrição', 'Tipo', 'Qtd', 'Un.', 'Valor unit.', 'Total']],
      body: o.itens.map((i, n) => [
        n + 1, limpar(i.descricao), limpar(i.tipo), st.qtdFmt(i.qtd), limpar(i.unidade),
        st.brl(i.valor), st.brl(st.num(i.qtd) * st.num(i.valor))
      ]),
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.2, textColor: [20, 32, 41], lineColor: [222, 228, 233], lineWidth: 0.1 },
      headStyles: { fillColor: corF, textColor: sobreF, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: tintF2 },
      // Especificação técnica abaixo da descrição, menor e em cinza:
      // reserva espaço no fim da célula (didParseCell) e escreve ali (didDrawCell)
      didParseCell: d => {
        if (d.section !== 'body' || d.column.index !== 1) return;
        const sp = specs[d.row.index]; if (!sp) return;
        const pad = 2.2;
        d.cell.styles.cellPadding = { top: pad, left: pad, right: pad, bottom: pad + sp.length * LH_SPEC + 0.6 };
      },
      didDrawCell: d => {
        if (d.section !== 'body' || d.column.index !== 1) return;
        const sp = specs[d.row.index]; if (!sp) return;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.3); doc.setTextColor(100, 110, 120);
        doc.text(sp, d.cell.x + 2.2, d.cell.y + d.cell.height - 2.2 - sp.length * LH_SPEC + LH_SPEC * 0.78);
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        2: { cellWidth: 22 },
        3: { cellWidth: 13, halign: 'right' },
        4: { cellWidth: 13, halign: 'center' },
        5: { cellWidth: 26, halign: 'right' },
        6: { cellWidth: 28, halign: 'right' }
      }
    });
    y = doc.lastAutoTable.finalY + 6;

    /* Totais */
    novaPaginaSe(26);
    const xr = W - M, xl = W - M - 70;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(70, 80, 90);
    doc.text('Subtotal', xl, y); doc.text(st.brl(t.subtotal), xr, y, { align: 'right' });
    if (t.desconto > 0) {
      y += 5;
      const rot = o.descontoTipo === '%' ? `Desconto (${st.dec(o.desconto, 1).replace(',0', '')}%)` : 'Desconto';
      doc.text(rot, xl, y); doc.text('- ' + st.brl(t.desconto), xr, y, { align: 'right' });
    }
    y += 3;
    doc.setFillColor(...corF);
    doc.roundedRect(xl - 3, y, 73, 9, 1.5, 1.5, 'F');
    doc.setTextColor(...sobreF); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('TOTAL', xl, y + 6.2); doc.text(st.brl(t.total), xr - 1, y + 6.2, { align: 'right' });
    y += 17;

    /* Pix (QR Code e copia e cola) */
    if (e.pixChave && o.pixNoPdf !== false && window.Pix && window.Extras) {
      const f = window.Extras.financeiro(o);
      const valor = f.sinalPct > 0 ? f.sinal : t.total;
      let cod = '';
      try { cod = window.Pix.codigo({ chave: e.pixChave, nome: e.pixNome || e.nome, cidade: e.pixCidade || e.cidade, valor, txid: String(o.numero).replace(/[^A-Za-z0-9]/g, '') }); } catch (er) { cod = ''; }
      if (cod) {
        novaPaginaSe(46);
        doc.setFillColor(...tintF2); doc.setDrawColor(...corF); doc.setLineWidth(0.3);
        doc.roundedRect(M, y, W - 2 * M, 40, 2, 2, 'FD');
        window.Pix.desenharPDF(doc, cod, M + 3, y + 3, 34);
        const xt = M + 41, wt = W - 2 * M - 45;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...corT);
        doc.text('PAGAMENTO VIA PIX', xt, y + 7);
        doc.setFontSize(10.5); doc.setTextColor(20, 32, 41);
        doc.text(limpar(f.sinalPct > 0 ? `Sinal de ${st.dec(f.sinalPct, 0)}% na aprovação: ${st.brl(valor)}` : `Valor: ${st.brl(valor)}`), xt, y + 13);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(70, 80, 90);
        doc.text(limpar(`Chave: ${e.pixChave} · ${e.pixNome || e.nome || ''}`), xt, y + 18);
        doc.setFontSize(6.6); doc.setTextColor(90, 100, 110);
        doc.text('Pix copia e cola:', xt, y + 23);
        doc.text(doc.splitTextToSize(cod, wt), xt, y + 26.5);
        y += 47;
      }
    }

    /* Condições */
    const secoes = [
      ['Prazo de execução', o.prazo],
      ['Condições de pagamento', o.pagamento],
      ['Garantia', o.garantia],
      ['Observações', o.observacoes]
    ].filter(s => String(s[1] || '').trim());
    secoes.forEach(([tit, txt]) => {
      const linhas = doc.splitTextToSize(limpar(txt), W - 2 * M);
      novaPaginaSe(8 + linhas.length * 4.2);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...corT);
      doc.text(limpar(tit).toUpperCase(), M, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40, 50, 60);
      doc.text(linhas, M, y + 5);
      y += 8 + linhas.length * 4.2;
    });

    if (temDim && o.dimNoPdf !== false) { doc.addPage(); y = M; y = secaoDimensionamento(doc, o, y, k); }
    }

    /* Assinaturas: responsável (rubrica automática) à esquerda, aceite do cliente à direita */
    novaPaginaSe(42);
    y += 8;
    const colW = (W - 2 * M - 16) / 2;
    const xCli = M + colW + 16;
    const yLinha = y + 22;
    if (e.assinatura && e.assinarAuto !== false) {
      try {
        const pr = doc.getImageProperties(e.assinatura);
        const r = Math.min(60 / pr.width, 19 / pr.height);
        const w = pr.width * r, h = pr.height * r;
        doc.addImage(e.assinatura, 'PNG', M + (colW - w) / 2, yLinha - h - 0.5, w, h);
      } catch (err) { /* assinatura inválida: segue sem ela */ }
    }
    const ac = o.assinaturaCliente && (entrega || laudo) ? o.assinaturaCliente : null;
    if (ac && ac.img) {
      try {
        const pr = doc.getImageProperties(ac.img);
        const r = Math.min(60 / pr.width, 19 / pr.height);
        doc.addImage(ac.img, 'PNG', xCli + (colW - pr.width * r) / 2, yLinha - pr.height * r - 0.5, pr.width * r, pr.height * r);
      } catch (err) { /* sem imagem */ }
    }
    doc.setDrawColor(150, 160, 170); doc.setLineWidth(0.3);
    doc.line(M, yLinha, M + colW, yLinha);
    if (!recibo) doc.line(xCli, yLinha, xCli + colW, yLinha);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(40, 50, 60);
    doc.text(limpar(e.assinaturaNome || e.nome || 'Responsável'), M + colW / 2, yLinha + 4.5, { align: 'center' });
    if (!recibo) doc.text(limpar((ac && ac.nome) || c.nome || 'Cliente'), xCli + colW / 2, yLinha + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(110, 120, 130);
    doc.text(limpar(e.assinaturaNome && e.nome && e.assinaturaNome !== e.nome ? e.nome : 'Responsável'), M + colW / 2, yLinha + 8.5, { align: 'center' });
    if (!recibo) doc.text(`${laudo ? 'Ciente do cliente' : entrega ? 'Recebido pelo cliente' : memorial ? 'De acordo do cliente' : 'Aceite do cliente'}   Data: ${ac ? st.dataBR(ac.data) : '____/____/______'}`, xCli + colW / 2, yLinha + 8.5, { align: 'center' });

    /* Entrega: anexos em páginas próprias (dimensionamento, desenhos e fotos) */
    if (entrega || laudo) {
      if (entrega && (o.circuitos || []).length) { doc.addPage(); y = M; secaoDimensionamento(doc, o, y, k); }
      (opc.imagens || []).forEach(im => {
        try {
          const pr = doc.getImageProperties(im.dataUrl);
          const paisagem = pr.width > pr.height * 1.15;
          doc.addPage('a4', paisagem ? 'l' : 'p');
          const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight();
          doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...corT);
          doc.text(limpar(im.nome), M, M + 2);
          const mw = PW - 2 * M, mh = PH - 2 * M - 16;
          const r = Math.min(mw / pr.width, mh / pr.height);
          const w = pr.width * r, h = pr.height * r;
          doc.addImage(im.dataUrl, pr.fileType || 'PNG', M + (mw - w) / 2, M + 8, w, h, undefined, 'FAST');
        } catch (err) { /* imagem inválida: pula */ }
      });
    }

    /* Rodapé */
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5); doc.setTextColor(140, 150, 160); doc.setFont('helvetica', 'normal');
      const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight();
      doc.text(limpar(`${recibo ? 'Recibo · ' : laudo ? 'Laudo · ' : entrega ? 'Entrega da obra · ' : memorial ? 'Dimensionamento · ' : ''}${o.numero} · ${e.nome || ''}`), M, PH - 8);
      doc.text(`Página ${p} de ${total}`, PW - M, PH - 8, { align: 'right' });
    }
    return doc.output('blob');
  }

  const nomeArquivo = o => `Orcamento-${String(o.numero).replace(/[^\w-]/g, '')}.pdf`;
  const nomeMemorial = o => `Dimensionamento-${String(o.numero).replace(/[^\w-]/g, '')}.pdf`;
  const gerarMemorial = o => gerar(o, { memorial: true });
  const gerarEntrega = (o, imagens) => gerar(o, { entrega: true, imagens });
  const gerarRecibo = (o, pagamento) => gerar(o, { recibo: pagamento });
  const gerarLaudo = (o, fotos) => gerar(o, { laudo: true, imagens: fotos });

  /* Valor por extenso (reais e centavos) e data por extenso, para o recibo */
  function extenso(v) {
    const U = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const D = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const C = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    const ate999 = n => {
      if (n === 100) return 'cem';
      const c = Math.floor(n / 100), r = n % 100, p = [];
      if (c) p.push(C[c]);
      if (r) p.push(r < 20 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ' e ' + U[r % 10] : ''));
      return p.join(' e ');
    };
    const inteiro = n => {
      if (n === 0) return 'zero';
      const mi = Math.floor(n / 1e6), mil = Math.floor((n % 1e6) / 1000), r = n % 1000, p = [];
      if (mi) p.push(mi === 1 ? 'um milhão' : ate999(mi) + ' milhões');
      if (mil) p.push(mil === 1 ? 'mil' : ate999(mil) + ' mil');
      if (r) p.push(ate999(r));
      // "mil e cem", "mil e cinquenta", mas "mil duzentos e cinquenta"
      return p.length > 1 && r && (r < 100 || r % 100 === 0) ? p.slice(0, -1).join(' ') + ' e ' + p[p.length - 1] : p.join(' ');
    };
    const reais = Math.floor(Math.round(v * 100) / 100), cent = Math.round((v - reais) * 100);
    const partes = [];
    if (reais) partes.push(inteiro(reais) + (reais === 1 ? ' real' : (reais % 1e6 === 0 ? ' de reais' : ' reais')));
    if (cent) partes.push(inteiro(cent) + (cent === 1 ? ' centavo' : ' centavos'));
    return partes.join(' e ') || 'zero real';
  }
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dataExtenso = iso => { const [a, m, d] = String(iso).slice(0, 10).split('-'); return `${Number(d)} de ${MESES[Number(m) - 1]} de ${a}`; };
  const nomeEntrega = o => `Entrega-${String(o.numero).replace(/[^\w-]/g, '')}.pdf`;

  window.PDF = { gerar, nomeArquivo, gerarMemorial, nomeMemorial, gerarEntrega, nomeEntrega, gerarRecibo, gerarLaudo, extenso };
})();
