/* Envio pelo WhatsApp.
   - Com PDF: usa o menu de compartilhar do celular (Web Share API com arquivo).
     O WhatsApp não permite que um site anexe arquivo direto a um contato, então
     o usuário escolhe WhatsApp → contato. A mensagem vai junto como legenda.
   - Sem suporte a compartilhar arquivo (ex.: computador): baixa o PDF e abre a
     conversa do contato cadastrado via wa.me, para anexar manualmente.
   - Mensagem direta: abre a conversa do contato cadastrado já com o texto. */
(function () {
  'use strict';
  const S = () => window.Store;

  function mensagem(o) {
    const st = S();
    const e = st.db.empresa;
    const c = st.cliente(o.clienteId) || {};
    const primeiroNome = String(c.nome || '').trim().split(/\s+/)[0] || '';
    const modelo = e.mensagemPadrao || 'Olá, {cliente}! Segue o orçamento {numero}.';
    return modelo
      .replace(/\{cliente\}/g, primeiroNome)
      .replace(/\{numero\}/g, o.numero)
      .replace(/\{titulo\}/g, o.titulo || '')
      .replace(/\{total\}/g, st.brl(st.totais(o).total))
      .replace(/\{validade\}/g, st.dataBR(st.validadeAte(o)))
      .replace(/\{inicio\}/g, o.dataInicio ? st.dataBR(o.dataInicio) : 'a combinar')
      .replace(/\{empresa\}/g, e.nome || '')
      .trim();
  }

  function linkConversa(telefone, texto) {
    const n = S().telefoneInternacional(telefone);
    return `https://wa.me/${n}` + (texto ? `?text=${encodeURIComponent(texto)}` : '');
  }

  function abrirConversa(telefone, texto) {
    window.open(linkConversa(telefone, texto), '_blank', 'noopener');
  }

  function podeCompartilharArquivo() {
    try {
      const f = new File(['x'], 'teste.pdf', { type: 'application/pdf' });
      return !!(navigator.canShare && navigator.canShare({ files: [f] }));
    } catch (e) { return false; }
  }

  function baixar(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* Retorna: 'compartilhado' | 'cancelado' | 'fallback'
     Obs.: ao receber um documento, o WhatsApp costuma descartar o texto que vai junto
     (só imagens viram legenda). Por isso o app copia a mensagem e oferece enviá-la depois. */
  async function enviarPDF(o, blob, nome, texto, titulo) {
    nome = nome || window.PDF.nomeArquivo(o);
    const arquivo = new File([blob], nome, { type: 'application/pdf' });
    texto = texto || mensagem(o);
    if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo], title: titulo || `Orçamento ${o.numero}`, text: texto });
        return 'compartilhado';
      } catch (err) {
        if (err && err.name === 'AbortError') return 'cancelado';
        // NotAllowedError etc.: cai no plano B
      }
    }
    baixar(blob, nome);
    return 'fallback';
  }

  // Mensagem do memorial de dimensionamento (arquivo separado para o "de acordo")
  function mensagemMemorial(o) {
    const st = S(); const e = st.db.empresa; const c = st.cliente(o.clienteId) || {};
    const nome = String(c.nome || '').trim().split(/\s+/)[0] || '';
    return `Olá${nome ? ', ' + nome : ''}! Segue o dimensionamento dos circuitos referente ao orçamento ${o.numero}. Por favor, confira e me devolva com o seu "de acordo".\n${e.nome || ''}`.trim();
  }

  // Mensagem da entrega da obra (links vão no texto, para abrir direto)
  function mensagemEntrega(o) {
    const st = S(); const e = st.db.empresa; const c = st.cliente(o.clienteId) || {};
    const nome = String(c.nome || '').trim().split(/\s+/)[0] || '';
    const links = (o.anexos || []).filter(a => a.tipo === 'link' && a.entregar !== false && a.url);
    return [`Olá${nome ? ', ' + nome : ''}! Concluímos o serviço${o.titulo ? ' "' + o.titulo + '"' : ''} (orçamento ${o.numero}). Seguem o termo de entrega e os documentos da instalação. Guarde para manutenções futuras.`,
      ...links.map(a => `${a.nome}: ${a.url}`), e.nome || ''].filter(Boolean).join('\n');
  }

  /* Vários arquivos de uma vez (entrega). Retorna 'compartilhado' | 'cancelado' | 'fallback' */
  async function enviarArquivos(arquivos, titulo, texto) {
    const fs = arquivos.map(a => new File([a.blob], a.nome, { type: a.blob.type || 'application/octet-stream' }));
    if (navigator.canShare && navigator.canShare({ files: fs })) {
      try { await navigator.share({ files: fs, title: titulo, text: texto }); return 'compartilhado'; }
      catch (err) { if (err && err.name === 'AbortError') return 'cancelado'; }
    }
    arquivos.forEach((a, i) => setTimeout(() => baixar(a.blob, a.nome), i * 400));
    return 'fallback';
  }

  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); return true; } catch (e) { return false; }
  }

  window.WhatsApp = { mensagem, mensagemMemorial, mensagemEntrega, enviarArquivos, linkConversa, abrirConversa, enviarPDF, baixar, copiar, podeCompartilharArquivo };
})();
