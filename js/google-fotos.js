/* Envio de fotos do serviço para o Google Fotos, num álbum por orçamento.
   - Login Google no navegador (Google Identity Services) com a permissão
     photoslibrary.appendonly: o app só consegue CRIAR álbuns e ENVIAR fotos;
     não vê nem altera o resto da sua biblioteca.
   - Desde 31/03/2025 o app só pode acrescentar fotos em álbuns que ele mesmo
     criou; por isso o álbum é criado pelo app e o id fica guardado no orçamento.
   - Requer um "ID do cliente OAuth" (Google Cloud, gratuito), configurado em
     Ajustes → Google Fotos. Passo a passo em GOOGLE-FOTOS.md. */
(function () {
  'use strict';
  const API = 'https://photoslibrary.googleapis.com/v1';
  const ESCOPO = 'https://www.googleapis.com/auth/photoslibrary.appendonly';
  let token = null, validade = 0, gis = null;

  function carregarGIS() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
    if (gis) return gis;
    gis = new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = () => ok(); s.onerror = () => { gis = null; falha(new Error('Não foi possível carregar o login do Google. Verifique a internet.')); };
      document.head.appendChild(s);
    });
    return gis;
  }

  /* Pede (ou reaproveita) o acesso. Precisa ser chamado a partir de um toque do usuário. */
  async function entrar(clientId) {
    if (!clientId) throw new Error('Configure o ID do cliente do Google em Ajustes → Google Fotos.');
    if (token && Date.now() < validade - 60000) return token;
    await carregarGIS();
    return new Promise((ok, falha) => {
      const cli = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId, scope: ESCOPO, prompt: '',
        callback: r => {
          if (r.error) { falha(new Error(r.error === 'access_denied' ? 'Acesso ao Google Fotos negado.' : 'Login do Google: ' + r.error)); return; }
          token = r.access_token; validade = Date.now() + (Number(r.expires_in) || 3600) * 1000; ok(token);
        },
        error_callback: e => falha(new Error(e && e.type === 'popup_closed' ? 'Janela do Google fechada antes de concluir.' : 'Login do Google não concluído.'))
      });
      cli.requestAccessToken();
    });
  }
  function sair() { if (token && window.google) try { window.google.accounts.oauth2.revoke(token, () => {}); } catch (e) {} token = null; validade = 0; }

  async function chamar(caminho, corpo) {
    const r = await fetch(API + caminho, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || 'Google Fotos respondeu ' + r.status);
    return j;
  }
  const criarAlbum = titulo => chamar('/albums', { album: { title: String(titulo).slice(0, 500) } }).then(a => a.id);

  async function enviarBytes(blob, nome) {
    const r = await fetch(API + '/uploads', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/octet-stream', 'X-Goog-Upload-Content-Type': blob.type || 'image/jpeg', 'X-Goog-Upload-Protocol': 'raw', 'X-Goog-Upload-File-Name': encodeURIComponent(nome) },
      body: blob
    });
    if (!r.ok) throw new Error('Falha ao enviar ' + nome + ' (' + r.status + ')');
    return r.text();
  }

  /* fotos: [{ blob, nome, descricao }]. Retorna { albumId, enviados, erros } */
  async function enviarParaAlbum({ clientId, albumId, tituloAlbum, fotos, progresso }) {
    await entrar(clientId);
    let id = albumId;
    if (!id) id = await criarAlbum(tituloAlbum);
    const erros = [], prontos = [];
    for (let i = 0; i < fotos.length; i++) {
      progresso && progresso(i, fotos.length);
      try { prontos.push({ f: fotos[i], up: await enviarBytes(fotos[i].blob, fotos[i].nome) }); } catch (e) { erros.push(fotos[i].nome + ': ' + e.message); }
    }
    let enviados = [];
    for (let i = 0; i < prontos.length; i += 50) { // limite da API por chamada
      const lote = prontos.slice(i, i + 50);
      try {
        const r = await chamar('/mediaItems:batchCreate', { albumId: id, newMediaItems: lote.map(x => ({ description: (x.f.descricao || '').slice(0, 1000), simpleMediaItem: { uploadToken: x.up, fileName: x.f.nome } })) });
        (r.newMediaItemResults || []).forEach((res, k) => { if (res.status && (res.status.code || 0) !== 0 && res.status.message !== 'Success' && res.status.message !== 'OK') erros.push(lote[k].f.nome + ': ' + res.status.message); else enviados.push(lote[k].f); });
      } catch (e) {
        if (/album/i.test(e.message) && albumId) { const err = new Error('O álbum guardado não existe mais ou não foi criado por este app.'); err.albumInvalido = true; throw err; }
        lote.forEach(x => erros.push(x.f.nome + ': ' + e.message));
      }
    }
    progresso && progresso(fotos.length, fotos.length);
    return { albumId: id, enviados, erros };
  }

  window.GoogleFotos = { entrar, sair, enviarParaAlbum, conectado: () => !!token && Date.now() < validade };
})();
