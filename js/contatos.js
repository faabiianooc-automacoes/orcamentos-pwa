/* Importação de contatos para a base de clientes.
   - Agenda do celular: Contact Picker API (Chrome no Android). O usuário escolhe
     quais contatos compartilhar; o app não tem acesso ao resto da agenda.
   - Arquivo .vcf (vCard): exportado pelo app Contatos do Android, iPhone ou Google Contatos.
   Nada é enviado para fora do aparelho além da sincronização normal da nuvem (se ativa). */
(function () {
  'use strict';
  const st = () => window.Store;

  const suportaAgenda = () => 'contacts' in navigator && 'ContactsManager' in window && typeof navigator.contacts.select === 'function';

  /* Telefone: guarda só dígitos, sem o +55 (igual ao cadastro manual) */
  function normalizarTelefone(t) {
    let d = String(t || '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.startsWith('0') && (d.length === 11 || d.length === 12)) d = d.slice(1); // 0 + DDD
    if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
    return d;
  }
  // Prefere celular brasileiro (DDD + 9 + 8 dígitos), depois qualquer número com DDD
  function melhorTelefone(lista) {
    const nums = (lista || []).map(normalizarTelefone).filter(Boolean);
    return nums.find(n => n.length === 11 && n[2] === '9') || nums.find(n => n.length >= 10) || nums[0] || '';
  }

  /* ---------- vCard ---------- */
  function decodificarQP(valor, charset) {
    const bytes = [];
    const s = valor.replace(/=\r?\n/g, '');
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '=' && /^[0-9A-F]{2}$/i.test(s.substr(i + 1, 2))) { bytes.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
      else bytes.push(s.charCodeAt(i) & 0xff);
    }
    try { return new TextDecoder(charset || 'utf-8').decode(new Uint8Array(bytes)); } catch (e) { return s; }
  }
  const desescapar = v => v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

  function lerVcf(texto) {
    // junta linhas dobradas (continuação começa com espaço/tab; em QP, linha termina com "=")
    const linhas = [];
    String(texto).replace(/\r\n/g, '\n').split('\n').forEach(l => {
      if (/^[ \t]/.test(l) && linhas.length) linhas[linhas.length - 1] += l.slice(1);
      else if (linhas.length && /ENCODING=QUOTED-PRINTABLE/i.test(linhas[linhas.length - 1]) && /=$/.test(linhas[linhas.length - 1])) linhas[linhas.length - 1] = linhas[linhas.length - 1].slice(0, -1) + l;
      else linhas.push(l);
    });
    const contatos = [];
    let atual = null;
    linhas.forEach(l => {
      if (/^BEGIN:VCARD/i.test(l)) { atual = { nome: '', partes: '', tels: [], emails: [], endereco: '', cidade: '', obs: '' }; return; }
      if (/^END:VCARD/i.test(l)) { if (atual) contatos.push(atual); atual = null; return; }
      if (!atual) return;
      const i = l.indexOf(':'); if (i < 0) return;
      const chave = l.slice(0, i), bruto = l.slice(i + 1);
      const params = chave.split(';');
      const prop = params[0].replace(/^item\d+\./i, '').toUpperCase();
      const qp = /ENCODING=QUOTED-PRINTABLE/i.test(chave);
      const cs = (chave.match(/CHARSET=([\w-]+)/i) || [])[1];
      const valor = qp ? decodificarQP(bruto, cs) : bruto;
      if (prop === 'FN') atual.nome = desescapar(valor);
      else if (prop === 'N') atual.partes = valor.split(';').map(desescapar);
      else if (prop === 'TEL') atual.tels.push(valor);
      else if (prop === 'EMAIL') atual.emails.push(desescapar(valor));
      else if (prop === 'ADR' && !atual.endereco) {
        const p = valor.split(';').map(desescapar); // pobox;ext;rua;cidade;estado;cep;país
        atual.endereco = [p[2], p[1]].filter(Boolean).join(', ');
        atual.cidade = [p[3], p[4]].filter(Boolean).join('/');
      } else if (prop === 'NOTE') atual.obs = desescapar(valor);
      else if (prop === 'ORG' && !atual.org) atual.org = desescapar(valor.split(';')[0]);
    });
    return contatos.map(c => {
      let nome = c.nome;
      if (!nome && Array.isArray(c.partes)) nome = [c.partes[3], c.partes[1], c.partes[2], c.partes[0], c.partes[4]].filter(Boolean).join(' ');
      if (!nome) nome = c.org || '';
      return {
        nome: nome.replace(/\s+/g, ' ').trim(),
        telefone: melhorTelefone(c.tels),
        email: c.emails[0] || '',
        endereco: c.endereco, cidade: c.cidade, observacoes: c.obs
      };
    }).filter(c => c.nome || c.telefone);
  }

  /* ---------- Agenda do celular ---------- */
  async function escolherDaAgenda() {
    const disponiveis = await navigator.contacts.getProperties();
    const props = ['name', 'tel', 'email', 'address'].filter(p => disponiveis.includes(p));
    const sel = await navigator.contacts.select(props, { multiple: true });
    return sel.map(c => {
      const a = (c.address || [])[0];
      return {
        nome: ((c.name || [])[0] || '').replace(/\s+/g, ' ').trim(),
        telefone: melhorTelefone(c.tel),
        email: (c.email || [])[0] || '',
        endereco: a ? [a.addressLine && a.addressLine.join(', '), a.dependentLocality].filter(Boolean).join(' - ') : '',
        cidade: a ? [a.city, a.region].filter(Boolean).join('/') : '',
        observacoes: ''
      };
    }).filter(c => c.nome || c.telefone);
  }

  /* Marca quem já está cadastrado (mesmo telefone, ou mesmo nome quando não há telefone) */
  function marcarDuplicados(lista) {
    const tels = new Set(st().db.clientes.map(c => normalizarTelefone(c.telefone)).filter(Boolean));
    const nomes = new Set(st().db.clientes.map(c => c.nome.trim().toLowerCase()));
    const vistos = new Set();
    return lista.map(c => {
      const chave = c.telefone || ('nome:' + c.nome.toLowerCase());
      const existe = c.telefone ? tels.has(c.telefone) : nomes.has(c.nome.toLowerCase());
      const repetido = vistos.has(chave); vistos.add(chave);
      return { ...c, existe, repetido };
    });
  }

  window.Contatos = { suportaAgenda, escolherDaAgenda, lerVcf, marcarDuplicados, normalizarTelefone };
})();
