/* Pix "copia e cola" (BR Code estático, padrão EMV do Banco Central) e QR Code.
   Gerado no aparelho, sem internet. Usa vendor/qrcode.js (qrcode-generator, MIT). */
(function () {
  'use strict';

  const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const campo = (id, valor) => id + String(valor.length).padStart(2, '0') + valor;

  function crc16(txt) {
    let crc = 0xFFFF;
    for (let i = 0; i < txt.length; i++) {
      crc ^= txt.charCodeAt(i) << 8;
      for (let b = 0; b < 8; b++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  // Chave: CPF/CNPJ (só números), celular (+55...), e-mail ou aleatória
  function normalizarChave(chave) {
    let c = String(chave || '').trim();
    if (!c) return '';
    if (/@/.test(c)) return c.toLowerCase();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return c.toLowerCase();
    const d = c.replace(/\D/g, '');
    if (c.startsWith('+')) return '+' + d;
    if (d.length === 11 && /^\d{2}9/.test(d) && !validoCPF(d)) return '+55' + d; // celular com DDD
    if (d.length === 13 && d.startsWith('55')) return '+' + d;
    return d; // CPF ou CNPJ
  }
  function validoCPF(d) {
    if (!/^\d{11}$/.test(d) || /^(\d)\1+$/.test(d)) return false;
    const dv = n => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
  }

  /* Monta o código. valor em reais (número); txid opcional (até 25, letras e números) */
  function codigo({ chave, nome, cidade, valor, txid, descricao }) {
    const k = normalizarChave(chave);
    if (!k) throw new Error('Cadastre a chave Pix em Ajustes.');
    const limpa = (s, n) => semAcento(s).replace(/[^A-Za-z0-9 .\-]/g, '').trim().slice(0, n) || 'NA';
    let conta = campo('00', 'br.gov.bcb.pix') + campo('01', k);
    const desc = descricao ? semAcento(descricao).replace(/[^A-Za-z0-9 .\-]/g, '').slice(0, 40) : '';
    if (desc && conta.length + desc.length + 4 <= 99) conta += campo('02', desc);
    const id = String(txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
    let p = campo('00', '01') + campo('26', conta) + campo('52', '0000') + campo('53', '986');
    if (valor > 0) p += campo('54', Number(valor).toFixed(2));
    p += campo('58', 'BR') + campo('59', limpa(nome, 25).toUpperCase()) + campo('60', limpa(String(cidade || '').split('/')[0], 15).toUpperCase()); // sem "/UF"
    p += campo('62', campo('05', id === '***' ? '***' : id));
    p += '6304';
    return p + crc16(p);
  }

  function qr(texto) { const q = window.qrcode(0, 'M'); q.addData(texto); q.make(); return q; }
  // SVG para mostrar no app
  const svg = (texto, tam = 4) => qr(texto).createSvgTag({ cellSize: tam, margin: 2, scalable: true });
  // Desenha o QR no jsPDF (em mm), módulo a módulo: nítido em qualquer impressão
  function desenharPDF(doc, texto, x, y, lado) {
    const q = qr(texto), n = q.getModuleCount(), m = lado / (n + 4);
    doc.setFillColor(255, 255, 255); doc.rect(x, y, lado, lado, 'F');
    doc.setFillColor(0, 0, 0);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) doc.rect(x + (c + 2) * m, y + (r + 2) * m, m, m, 'F');
  }

  window.Pix = { codigo, svg, desenharPDF, normalizarChave, crc16 };
})();
