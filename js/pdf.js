/* Geração do PDF do orçamento (A4, jsPDF + AutoTable, funciona offline). */
(function () {
  'use strict';
  const S = () => window.Store;

  // As fontes padrão do PDF usam Latin-1: troca caracteres fora dele.
  const limpar = s => String(s == null ? '' : s)
    .replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/…/g, '...').replace(/[  ]/g, ' ')
    .replace(/[^\x00-\xff\n]/g, '');

  function gerar(o) {
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

    doc.setProperties({ title: `Orçamento ${o.numero}`, subject: limpar(o.titulo), author: limpar(e.nome), creator: 'Orçamentos PWA' });

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
    doc.text('ORÇAMENTO', W - M, y + 5, { align: 'right' });
    doc.setTextColor(20, 32, 41); doc.setFontSize(10);
    doc.text(limpar(o.numero), W - M, y + 11, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(90, 100, 110);
    doc.text(`Emissão: ${st.dataBR(o.data)}`, W - M, y + 16, { align: 'right' });
    doc.text(`Válido até: ${st.dataBR(st.validadeAte(o))}`, W - M, y + 20, { align: 'right' });
    if (o.dataInicio) doc.text(`Início previsto: ${st.dataBR(o.dataInicio)}`, W - M, y + 24, { align: 'right' });

    y += o.dataInicio ? 31 : 28;
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
    const novaPaginaSe = alt => { if (y + alt > H - 22) { doc.addPage(); y = M; } };
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
    doc.text('Aceite do cliente   Data: ____/____/______', xCli + colW / 2, yLinha + 8.5, { align: 'center' });

    /* Rodapé */
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5); doc.setTextColor(140, 150, 160); doc.setFont('helvetica', 'normal');
      doc.text(limpar(`${o.numero} · ${e.nome || ''}`), M, H - 8);
      doc.text(`Página ${p} de ${total}`, W - M, H - 8, { align: 'right' });
    }
    return doc.output('blob');
  }

  const nomeArquivo = o => `Orcamento-${String(o.numero).replace(/[^\w-]/g, '')}.pdf`;

  window.PDF = { gerar, nomeArquivo };
})();
