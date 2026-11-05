/* Distância de carro entre o endereço da empresa e o do cliente.
   - Endereço → coordenadas: Nominatim (OpenStreetMap), gratuito, sem chave.
     Regras de uso: no máximo 1 consulta por segundo e sem uso em massa;
     por isso as coordenadas ficam guardadas na empresa e em cada cliente.
   - Rota de carro: OSRM (servidor público do projeto), gratuito, sem chave.
   Precisa de internet. Se não encontrar o endereço, o km pode ser digitado. */
(function () {
  'use strict';

  const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
  const OSRM = 'https://router.project-osrm.org/route/v1/driving/';
  let ultimaConsulta = 0;
  const esperar = ms => new Promise(r => setTimeout(r, ms));

  async function buscar(url) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('Serviço de mapas respondeu ' + r.status);
      return await r.json();
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('O serviço de mapas demorou demais. Tente de novo.');
      if (!navigator.onLine) throw new Error('Sem internet.');
      throw e;
    } finally { clearTimeout(t); }
  }

  const textoEndereco = (endereco, cidade) => [endereco, cidade].map(s => String(s || '').trim()).filter(Boolean).join(', ');

  /* Retorna { lat, lon, nome } ou lança erro */
  async function geocodificar(endereco, cidade) {
    const q = textoEndereco(endereco, cidade);
    if (!q) throw new Error('Endereço vazio.');
    const espera = 1100 - (Date.now() - ultimaConsulta); // respeita 1 consulta/s
    if (espera > 0) await esperar(espera);
    ultimaConsulta = Date.now();
    const p = new URLSearchParams({ format: 'jsonv2', limit: '1', countrycodes: 'br', addressdetails: '0', 'accept-language': 'pt-BR', q });
    const r = await buscar(`${NOMINATIM}?${p}`);
    if (!Array.isArray(r) || !r.length) throw new Error(`Endereço não encontrado no mapa: "${q}". Confira número, bairro e cidade/UF, ou informe o km.`);
    return { lat: Number(r[0].lat), lon: Number(r[0].lon), nome: r[0].display_name || q };
  }

  /* Retorna { km, minutos } (só ida) */
  async function rota(origem, destino) {
    const url = `${OSRM}${origem.lon},${origem.lat};${destino.lon},${destino.lat}?overview=false&alternatives=false`;
    const r = await buscar(url);
    if (!r || r.code !== 'Ok' || !r.routes || !r.routes.length) throw new Error('Não foi possível traçar a rota de carro entre os dois endereços.');
    return { km: r.routes[0].distance / 1000, minutos: Math.round(r.routes[0].duration / 60) };
  }

  // Link para conferir o trajeto no Google Maps
  const linkMapa = (origem, destino) => `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${origem.lat},${origem.lon}&destination=${destino.lat},${destino.lon}`;

  // Posição atual do aparelho (para usar como ponto de partida)
  const minhaPosicao = () => new Promise((ok, falha) => {
    if (!navigator.geolocation) { falha(new Error('Este aparelho não informa a localização.')); return; }
    navigator.geolocation.getCurrentPosition(p => ok({ lat: p.coords.latitude, lon: p.coords.longitude, nome: 'Localização do aparelho' }),
      e => falha(new Error(e.code === 1 ? 'Permissão de localização negada.' : 'Não foi possível obter a localização.')), { enableHighAccuracy: true, timeout: 15000 });
  });

  window.Rotas = { geocodificar, rota, linkMapa, minhaPosicao, textoEndereco };
})();
