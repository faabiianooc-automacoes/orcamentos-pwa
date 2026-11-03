/* Geração do PDF do orçamento (A4, jsPDF + AutoTable, funciona offline). */
(function () {
  'use strict';
  const S = () => window.Store;

  // As fontes padrão do PDF usam Latin-1: troca caracteres fora dele.
  const limpar = s => String(s == null ? '' : s)
    .replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/…/g, '...').replace(/[  ]/g, ' ')
    .replace(/²/g, '2').replace(/³/g, '3').replace(/√/g, 'raiz de ').replace(/≥/g, '>=').replace(/≤/g, '<=')
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

  function gerar(o, opc = {}) {
    const memorial = !!opc.memorial;
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

    doc.setProperties({ title: memorial ? `Dimensionamento ${o.numero}` : `Orçamento ${o.numero}`, subject: limpar(o.titulo), author: limpar(e.nome), creator: 'Orçamentos PWA' });

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
    doc.text(memorial ? 'DIMENSIONAMENTO' : 'ORÇAMENTO', W - M, y + 5, { align: 'right' });
    doc.setTextColor(20, 32, 41); doc.setFontSize(10);
    doc.text(limpar(memorial ? `Ref. orçamento ${o.numero}` : o.numero), W - M, y + 11, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(90, 100, 110);
    if (memorial) {
      doc.text(`Data: ${st.dataBR(st.hoje())}`, W - M, y + 16, { align: 'right' });
      if (o.dataInicio) doc.text(`Início previsto: ${st.dataBR(o.dataInicio)}`, W - M, y + 20, { align: 'right' });
    } else {
    doc.text(`Emissão: ${st.dataBR(o.data)}`, W - M, y + 16, { align: 'right' });
    doc.text(`Válido até: ${st.dataBR(st.validadeAte(o))}`, W - M, y + 20, { align: 'right' });
    if (o.dataInicio) doc.text(`Início previsto: ${st.dataBR(o.dataInicio)}`, W - M, y + 24, { align: 'right' });
    }

    y += o.dataInicio && !memorial ? 31 : 28;
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

    if (memorial) {
      y = secaoDimensionamento(doc, o, y, k);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const decl = doc.splitTextToSize(limpar('Declaro estar de acordo com os dados, critérios e resultados do dimensionamento acima, que servirão de base para a execução dos serviços.'), W - 2 * M);
      novaPaginaSe(decl.length * 4.2 + 52); // declaração e assinaturas na mesma página
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40, 50, 60);
      doc.text(decl, M, y + 2); y += decl.length * 4.2 + 2;
    } else {
    /* Itens */
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
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        2: { cellWidth: 22 },
        3: { cellWidth: 13, halign: 'right' },
        4: { cellWidth: 11, halign: 'center' },
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
    doc.setDrawColor(150, 160, 170); doc.setLineWidth(0.3);
    doc.line(M, yLinha, M + colW, yLinha);
    doc.line(xCli, yLinha, xCli + colW, yLinha);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(40, 50, 60);
    doc.text(limpar(e.assinaturaNome || e.nome || 'Responsável'), M + colW / 2, yLinha + 4.5, { align: 'center' });
    doc.text(limpar(c.nome || 'Cliente'), xCli + colW / 2, yLinha + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(110, 120, 130);
    doc.text(limpar(e.assinaturaNome && e.nome && e.assinaturaNome !== e.nome ? e.nome : 'Responsável'), M + colW / 2, yLinha + 8.5, { align: 'center' });
    doc.text(`${memorial ? 'De acordo do cliente' : 'Aceite do cliente'}   Data: ____/____/______`, xCli + colW / 2, yLinha + 8.5, { align: 'center' });

    /* Rodapé */
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5); doc.setTextColor(140, 150, 160); doc.setFont('helvetica', 'normal');
      doc.text(limpar(`${memorial ? 'Dimensionamento · ' : ''}${o.numero} · ${e.nome || ''}`), M, H - 8);
      doc.text(`Página ${p} de ${total}`, W - M, H - 8, { align: 'right' });
    }
    return doc.output('blob');
  }

  const nomeArquivo = o => `Orcamento-${String(o.numero).replace(/[^\w-]/g, '')}.pdf`;
  const nomeMemorial = o => `Dimensionamento-${String(o.numero).replace(/[^\w-]/g, '')}.pdf`;
  const gerarMemorial = o => gerar(o, { memorial: true });

  window.PDF = { gerar, nomeArquivo, gerarMemorial, nomeMemorial };
})();
