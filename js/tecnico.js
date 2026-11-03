/* Especificações técnicas dos materiais (opcionais).
   Cada item do catálogo (e do orçamento) pode ter item.tec = { classe, ...campos }.
   A "classe" define quais campos aparecem: cabo, disjuntor, DR, DPS etc.
   Para criar uma classe nova ou um campo novo, basta acrescentar aqui. */
(function () {
  'use strict';

  // tipo: num (número), lista (opções), texto. pre/un: como aparece no resumo.
  const N = (k, rot, un, pre) => ({ k, rot, tipo: 'num', un, pre });
  const L = (k, rot, opcoes, un, pre) => ({ k, rot, tipo: 'lista', opcoes, un, pre });
  const T = (k, rot, ph, pre) => ({ k, rot, tipo: 'texto', ph, pre });

  const CLASSES = [
    { id: 'cabo', nome: 'Cabo / condutor', campos: [
      L('secao', 'Seção', ['0,5', '0,75', '1', '1,5', '2,5', '4', '6', '10', '16', '25', '35', '50', '70', '95', '120'], 'mm²'),
      L('tipo', 'Tipo', ['Flexível', 'Rígido', 'PP (multipolar)']),
      N('condutores', 'Nº de condutores (vias)', '', ''),
      L('isolacao', 'Isolação', ['PVC 70 °C', 'HEPR 90 °C', 'EPR 90 °C', 'XLPE 90 °C', 'Não halogenado (LSHF)']),
      L('tensao_iso', 'Tensão de isolamento', ['450/750 V', '0,6/1 kV']),
      L('material', 'Condutor', ['Cobre', 'Alumínio']),
      T('cor', 'Cor', 'Ex.: azul (neutro)')
    ] },
    { id: 'disjuntor', nome: 'Disjuntor', campos: [
      N('in', 'Corrente nominal', 'A', 'In'),
      L('polos', 'Polos', ['1', '2', '3'], 'P'),
      L('curva', 'Curva', ['B', 'C', 'D'], '', 'Curva'),
      N('icn', 'Capacidade de interrupção', 'kA', 'Icn'),
      L('norma', 'Norma', ['NBR NM 60898', 'NBR IEC 60947-2'])
    ] },
    { id: 'dr', nome: 'DR (interruptor ou disjuntor diferencial)', campos: [
      N('in', 'Corrente nominal', 'A', 'In'),
      L('idn', 'Sensibilidade', ['10', '30', '100', '300', '500'], 'mA', 'Sensib.'),
      L('polos', 'Polos', ['2', '4'], 'P'),
      L('tipo_dr', 'Tipo', ['AC', 'A', 'F', 'B'], '', 'Tipo')
    ] },
    { id: 'dps', nome: 'DPS (proteção contra surtos)', campos: [
      L('classe_dps', 'Classe', ['I', 'II', 'III'], '', 'Classe'),
      N('uc', 'Tensão máx. de operação (Uc)', 'V', 'Uc'),
      N('inom', 'Corrente nominal de descarga (In)', 'kA', 'In'),
      N('imax', 'Corrente máx. de descarga (Imax)', 'kA', 'Imax'),
      N('up', 'Nível de proteção (Up)', 'kV', 'Up')
    ] },
    { id: 'tomada', nome: 'Tomada / interruptor', campos: [
      L('corrente', 'Corrente', ['10', '20'], 'A'),
      L('padrao', 'Padrão', ['NBR 14136 (2P+T)', 'Interruptor simples', 'Interruptor paralelo (three-way)', 'Intermediário (four-way)', 'Outro']),
      N('modulos', 'Nº de módulos', 'módulo(s)'),
      T('linha', 'Linha / cor', 'Ex.: branca, linha X')
    ] },
    { id: 'eletroduto', nome: 'Eletroduto / canaleta', campos: [
      T('diametro', 'Diâmetro / medida', 'Ex.: 3/4" (25 mm)'),
      L('material_el', 'Material', ['PVC rígido', 'PVC corrugado (flexível)', 'Aço galvanizado', 'PEAD', 'Canaleta PVC']),
      L('classe_el', 'Classe', ['Leve', 'Médio', 'Reforçado'])
    ] },
    { id: 'iluminacao', nome: 'Lâmpada / luminária', campos: [
      N('potencia', 'Potência', 'W'),
      N('fluxo', 'Fluxo luminoso', 'lm'),
      L('temp_cor', 'Temperatura de cor', ['2700', '3000', '4000', '5000', '6500'], 'K'),
      L('tensao', 'Tensão', ['Bivolt', '127 V', '220 V', '12 V', '24 V']),
      N('irc', 'Índice de reprodução de cor', '', 'IRC'),
      T('ip', 'Grau de proteção', 'Ex.: IP65')
    ] },
    { id: 'contator', nome: 'Contator / relé', campos: [
      N('in', 'Corrente (AC-3)', 'A', 'Ie'),
      L('bobina', 'Tensão da bobina', ['12 Vcc', '24 Vcc', '127 Vca', '220 Vca'], '', 'Bobina'),
      T('contatos', 'Contatos auxiliares', 'Ex.: 1NA + 1NF')
    ] },
    { id: 'automacao', nome: 'Automação / eletrônico', campos: [
      T('alimentacao', 'Alimentação', 'Ex.: bivolt, 5 Vcc', 'Alim.'),
      L('protocolo', 'Comunicação', ['Wi-Fi', 'Zigbee', 'Z-Wave', 'Bluetooth', 'Ethernet', 'RS-485', 'Matter']),
      N('carga', 'Corrente máx. da carga', 'A', 'Carga'),
      T('ip', 'Grau de proteção', 'Ex.: IP65')
    ] },
    { id: 'outro', nome: 'Outro equipamento', campos: [
      T('tensao', 'Tensão', 'Ex.: 220 V'),
      N('corrente', 'Corrente', 'A'),
      N('potencia', 'Potência', 'W')
    ] }
  ];
  // Campos comuns a todas as classes (no fim)
  const COMUNS = [
    T('marca', 'Marca', ''),
    T('modelo', 'Modelo / referência', ''),
    L('inmetro', 'Certificação INMETRO', ['Sim', 'Não', 'Não se aplica']),
    T('obs', 'Observação técnica', '')
  ];

  const classe = id => CLASSES.find(c => c.id === id) || null;
  const campos = id => { const c = classe(id); return c ? [...c.campos, ...COMUNS] : []; };
  const vazio = v => v == null || String(v).trim() === '';

  // Texto curto: "2,5 mm² · Flexível · PVC 70 °C · 450/750 V · Cobre · Marca X"
  function resumo(tec) {
    if (!tec || !tec.classe) return '';
    const c = classe(tec.classe); if (!c) return '';
    const partes = c.campos.filter(f => !vazio(tec[f.k])).map(f => {
      let v = String(tec[f.k]).trim();
      if (f.k === 'condutores') return `${v} vias`;
      if (f.un === 'P') return `${v}P`;
      return [f.pre, v + (f.un ? (/^[°%]/.test(f.un) ? '' : ' ') + f.un : '')].filter(Boolean).join(' ');
    });
    if (!vazio(tec.marca) || !vazio(tec.modelo)) partes.push([tec.marca, tec.modelo].filter(x => !vazio(x)).join(' '));
    if (tec.inmetro === 'Sim') partes.push('INMETRO');
    if (!vazio(tec.obs)) partes.push(String(tec.obs).trim());
    return partes.join(' · ');
  }

  // Remove campos vazios; sem classe → null
  function limpar(tec) {
    if (!tec || !tec.classe || !classe(tec.classe)) return null;
    const out = { classe: tec.classe };
    campos(tec.classe).forEach(f => { if (!vazio(tec[f.k])) out[f.k] = String(tec[f.k]).trim(); });
    return out;
  }

  // Sugestão de classe pela descrição (ao criar item novo)
  function sugerir(descricao) {
    const d = String(descricao || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/\b(cabo|fio|condutor)\b/.test(d)) return 'cabo';
    if (/\bdps\b|surto/.test(d)) return 'dps';
    if (/\bdr\b|diferencial|idr/.test(d)) return 'dr';
    if (/disjuntor/.test(d)) return 'disjuntor';
    if (/tomada|interruptor/.test(d)) return 'tomada';
    if (/eletroduto|canaleta|conduite/.test(d)) return 'eletroduto';
    if (/lampada|luminaria|plafon|refletor|fita led|spot/.test(d)) return 'iluminacao';
    if (/contator|rele\b/.test(d)) return 'contator';
    if (/sensor|modulo|esp32|automacao|smart|inteligente/.test(d)) return 'automacao';
    return '';
  }

  window.Tecnico = { CLASSES, COMUNS, classe, campos, resumo, limpar, sugerir };
})();
