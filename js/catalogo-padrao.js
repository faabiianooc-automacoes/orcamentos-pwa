/* Catálogo inicial de itens, SEM preço: você define os valores em
   Ajustes → Catálogo, e o app avisa antes de gerar um PDF com item sem valor.
   Para incluir itens novos para todos, adicione aqui e aumente VERSAO_CATALOGO:
   na próxima abertura, o app acrescenta ao catálogo só os itens que faltarem
   (pela descrição), sem apagar nem alterar o que o usuário já cadastrou. */
(function () {
  'use strict';

  const VERSAO_CATALOGO = 2;

  // Ordem em que as categorias aparecem nas listas
  const GRUPOS = [
    'Visita e diagnóstico',
    'Tomadas e interruptores',
    'Iluminação',
    'Instalação de equipamentos',
    'Quadro e proteção',
    'Fiação e infraestrutura',
    'Manutenção e laudos',
    'Materiais elétricos',
    'Automação',
    'Outros'
  ];

  // [descrição, tipo, unidade]
  const ITENS = {
    'Visita e diagnóstico': [
      ['Visita técnica e levantamento', 'Serviço', 'un'],
      ['Taxa de deslocamento', 'Serviço', 'un'],
      ['Diagnóstico de falha elétrica (curto, disjuntor desarmando, falta de energia)', 'Serviço', 'un'],
      ['Localização e reparo de curto-circuito', 'Serviço', 'un'],
      ['Atendimento emergencial (fora do horário comercial)', 'Serviço', 'un'],
      ['Hora técnica adicional', 'Mão de obra', 'h']
    ],
    'Tomadas e interruptores': [
      ['Troca de tomada', 'Serviço', 'ponto'],
      ['Troca de interruptor', 'Serviço', 'ponto'],
      ['Instalação de novo ponto de tomada (embutido)', 'Serviço', 'ponto'],
      ['Instalação de ponto de tomada aparente (canaleta)', 'Serviço', 'ponto'],
      ['Instalação de tomada 20 A para eletrodoméstico', 'Serviço', 'ponto'],
      ['Instalação de tomada com USB', 'Serviço', 'ponto'],
      ['Instalação de interruptor paralelo (three-way)', 'Serviço', 'ponto'],
      ['Adequação de tomadas ao padrão brasileiro (NBR 14136)', 'Serviço', 'ponto'],
      ['Instalação de tomada externa à prova d\'água', 'Serviço', 'ponto']
    ],
    'Iluminação': [
      ['Troca de lâmpada ou soquete', 'Serviço', 'ponto'],
      ['Instalação de luminária / plafon', 'Serviço', 'un'],
      ['Instalação de lustre', 'Serviço', 'un'],
      ['Instalação de spot / embutido de LED', 'Serviço', 'un'],
      ['Instalação de perfil ou fita de LED com fonte', 'Serviço', 'm'],
      ['Instalação de refletor externo', 'Serviço', 'un'],
      ['Instalação de sensor de presença', 'Serviço', 'un'],
      ['Instalação de relé fotoelétrico', 'Serviço', 'un'],
      ['Instalação de novo ponto de iluminação', 'Serviço', 'ponto']
    ],
    'Instalação de equipamentos': [
      ['Instalação de chuveiro elétrico', 'Serviço', 'un'],
      ['Troca de resistência de chuveiro', 'Serviço', 'un'],
      ['Instalação de torneira elétrica', 'Serviço', 'un'],
      ['Instalação de ventilador de teto', 'Serviço', 'un'],
      ['Instalação de exaustor', 'Serviço', 'un'],
      ['Instalação de cooktop / forno elétrico', 'Serviço', 'un'],
      ['Instalação de aquecedor / boiler elétrico', 'Serviço', 'un'],
      ['Ponto elétrico para ar-condicionado (circuito dedicado)', 'Serviço', 'ponto'],
      ['Ponto para carregador de veículo elétrico (circuito dedicado)', 'Serviço', 'ponto'],
      ['Instalação de campainha / interfone', 'Serviço', 'un'],
      ['Ligação elétrica de motor de portão', 'Serviço', 'un'],
      ['Instalação de bomba d\'água (parte elétrica)', 'Serviço', 'un']
    ],
    'Quadro e proteção': [
      ['Troca de disjuntor', 'Serviço', 'un'],
      ['Instalação de DR (proteção contra choque)', 'Serviço', 'un'],
      ['Instalação de DPS (proteção contra surtos)', 'Serviço', 'un'],
      ['Troca / montagem de quadro de distribuição', 'Serviço', 'un'],
      ['Organização e identificação de circuitos no quadro', 'Serviço', 'un'],
      ['Balanceamento de fases', 'Serviço', 'vb'],
      ['Instalação de sistema de aterramento', 'Serviço', 'un']
    ],
    'Fiação e infraestrutura': [
      ['Troca de fiação', 'Serviço', 'm'],
      ['Passagem de fiação nova', 'Serviço', 'm'],
      ['Novo circuito dedicado', 'Serviço', 'circuito'],
      ['Instalação de eletroduto aparente / canaleta', 'Serviço', 'm'],
      ['Rasgo e fechamento de parede para tubulação', 'Serviço', 'm'],
      ['Desobstrução / troca de tubulação (eletroduto)', 'Serviço', 'm'],
      ['Adequação de padrão de entrada (conforme concessionária)', 'Serviço', 'un'],
      ['Aumento de carga / troca de padrão monofásico para bifásico ou trifásico', 'Serviço', 'un']
    ],
    'Manutenção e laudos': [
      ['Revisão geral da instalação elétrica', 'Serviço', 'vb'],
      ['Manutenção preventiva (quadro, conexões, aquecimento)', 'Serviço', 'vb'],
      ['Medição de aterramento e isolamento', 'Serviço', 'un'],
      ['Laudo técnico das instalações elétricas', 'Serviço', 'un']
    ],
    'Materiais elétricos': [
      ['Material elétrico diverso (conectores, fita, buchas, parafusos)', 'Material', 'vb'],
      ['Tomada / interruptor (peça)', 'Material', 'un'],
      ['Disjuntor (peça)', 'Material', 'un'],
      ['Cabo flexível 1,5 mm²', 'Material', 'm'],
      ['Cabo flexível 2,5 mm²', 'Material', 'm'],
      ['Cabo flexível 4 mm²', 'Material', 'm'],
      ['Cabo flexível 6 mm²', 'Material', 'm'],
      ['Eletroduto / canaleta', 'Material', 'm'],
      ['Caixa de passagem / caixa 4x2', 'Material', 'un']
    ],
    'Automação': [
      ['Servidor de automação (Home Assistant)', 'Material', 'un'],
      ['Módulo de monitoramento de caixa-d\'água', 'Material', 'un'],
      ['Sensor de vazamento', 'Material', 'un'],
      ['Módulo de iluminação / tomada inteligente', 'Material', 'un'],
      ['Módulo de monitoramento de portão', 'Material', 'un'],
      ['Instalação', 'Mão de obra', 'h'],
      ['Configuração de painéis e automações', 'Serviço', 'vb'],
      ['Monitoramento e suporte mensal', 'Serviço', 'mês']
    ]
  };

  const lista = [];
  Object.entries(ITENS).forEach(([grupo, itens]) =>
    itens.forEach(([descricao, tipo, unidade]) => lista.push({ descricao, tipo, unidade, grupo })));

  window.CatalogoPadrao = { VERSAO_CATALOGO, GRUPOS, itens: lista };
})();
