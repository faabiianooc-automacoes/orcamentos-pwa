# Changelog

## [1.14.0] - 2026-11-05
- Pix: chave em Ajustes; QR Code e "copia e cola" no PDF do orçamento (valor do sinal ou total), gerado no aparelho no padrão do Banco Central.
- Pagamentos no orçamento: sinal (%), registro de pagamentos (valor, data, forma), saldo a receber, recibo em PDF com valor por extenso, botão para cobrar sinal/saldo pelo WhatsApp com o Pix.
- Margem e lucro: custo unitário nos itens e no catálogo (só você vê), custo total, lucro, margem e alerta abaixo da margem mínima.
- Pendências no Início: sinal pendente, orçamento sem resposta há 3 dias, saldo a receber, entrega não enviada, garantia acabando, revisão preventiva (após X meses) e pedido de avaliação no Google, com mensagem pronta no WhatsApp e opção de dispensar. Novos indicadores: a receber e recebido no mês.
- Garantia: data de validade no termo de entrega (Ajustes → dias de garantia).
- Assinatura do cliente no celular (termo de entrega e laudo); pedido de avaliação no Google após a entrega.
- Ferramentas e kits: desgaste das ferramentas próprias por hora de uso e aluguel por diária, kits por tipo de serviço (ex.: instalação de quadro geral); no orçamento entra só no custo ou como item.
- Previsão de cargas (NBR 5410:2004, 9.5.2): cômodos com medidas, mínimos de iluminação e tomadas, equipamentos de uso específico e sugestão de circuitos criados no dimensionamento.
- Lista de materiais automática a partir do dimensionamento: cabos por seção e cor (com sobra), disjuntores, DR, DPS e disjuntor geral, com preços do catálogo.
- Inspeção e laudo: checklist de verificação final (NBR 5410, seção 7) com medições e observações, laudo em PDF com fotos, conclusão e assinaturas.
- Calculadoras de campo: corrente, queda de tensão, conversões (CV, HP, kVA, BTU/h) e lei de Ohm.
- Fotos do serviço (antes, durante, depois), reduzidas para economizar espaço, e envio para um álbum por orçamento no Google Fotos (ver GOOGLE-FOTOS.md); alternativa por compartilhamento.
- Relatórios: recebido e lucro estimado.

## [1.13.0] - 2026-11-04
- Deslocamento no orçamento: calcula a distância de carro do endereço da empresa até o do cliente (OpenStreetMap: Nominatim para localizar os endereços e OSRM para a rota; gratuitos, sem chave; precisa de internet) e lança o item "Deslocamento (X km ida e volta)" no orçamento, que aparece no PDF e soma no total.
- Ajustes → Deslocamento: valor por km (padrão R$ 2,50), cobrar ida e volta, conferir o ponto de partida no mapa ou usar a localização atual do aparelho.
- Link para ver o trajeto no Google Maps; se o endereço não for encontrado, dá para informar o km à mão.
- As coordenadas da empresa e de cada cliente ficam guardadas (só consulta o mapa de novo se o endereço mudar).
- Unidade "km" nos itens.

## [1.12.0] - 2026-11-04
- Alimentação do quadro no orçamento (mono, bi ou trifásica; 127/220 ou 220/380 V; disjuntor geral).
- Ligação de cada circuito (F1+N, F1+F2, F1+F2+F3...): automática, equilibrando a carga entre as fases, ou escolhida à mão. Mostra a carga por fase e avisa ligações incompatíveis com a alimentação.
- Multifilar colorido automático (draw.io): entrada, disjuntor geral (um polo por fase), DPS ligado ao PE, IDR geral (fases + neutro), barramento de neutro após o IDR, barramento de terra e, em cada circuito, disjuntor com um polo por fase, neutro (quando houver) e PE em todos. Cores: terra verde, neutro azul, F1 vermelho, F2 preto, F3 branco (com contorno); fundo cinza. Bolinha marca ligação; sem bolinha é cruzamento.
- Biblioteca de símbolos de planta carregada no draw.io (33 símbolos): pontos de luz, interruptores (simples, 2 seções, paralelo, intermediário), tomadas baixa/média/alta/20 A/dupla/piso, força, chuveiro, motor, sensores, automação, quadro, medidor, caixa de passagem, eletrodutos, condutores coloridos e legenda. Arquivo: drawio/simbolos-planta.xml (gerado por ferramentas/gerar-biblioteca.py).
- "Planta com pontos": abre a foto/imagem da planta do cômodo como fundo travado para marcar os pontos com a biblioteca.
- Unifilar mostra a ligação de cada circuito.
- Fórmulas: anexar a planilha Excel de dimensionamento como referência (fica no aparelho).

## [1.11.0] - 2026-11-04
- Orçamento: seção "Desenhos e anexos".
  - Novo desenho no editor draw.io (diagrams.net) integrado ao app, com biblioteca de símbolos elétricos; gratuito, sem chave de API; precisa de internet. O desenho volta para o app e pode ser reaberto para editar.
  - Unifilar automático: gera, a partir do dimensionamento, o diagrama do quadro (entrada, disjuntor geral, DR e DPS do orçamento, barramento, disjuntor e seção de cada circuito) e o quadro de cargas, já aberto no draw.io para revisar.
  - Arquivos de outros programas (PDF, DWG, DXF, fotos; até 25 MB cada) e links (ex.: projeto no Tinkercad).
  - Cada anexo tem a opção "Entregar".
- Entrega da obra (menu do orçamento, e oferecida ao mudar o status para Concluído): termo de entrega em PDF com serviços e materiais (sem valores), garantia, lista de documentos, campo "Recebido pelo cliente", dimensionamento, desenhos e fotos; os demais arquivos vão junto e os links vão na mensagem do WhatsApp.
- Os arquivos dos anexos ficam guardados no aparelho (não vão para a nuvem nem para o backup).

## [1.10.0] - 2026-11-03
- Especificação técnica dos materiais (opcional): ao cadastrar ou editar um item do catálogo, escolha o tipo de material e preencha só os campos que se aplicam. Tipos: cabo/condutor, disjuntor, DR, DPS, tomada/interruptor, eletroduto/canaleta, lâmpada/luminária, contator/relé, automação/eletrônico e outro equipamento; todos com marca, modelo, INMETRO e observação.
- O tipo é sugerido pela descrição (ex.: "Cabo ..." → cabo). A especificação aparece na lista do catálogo e entra na busca (ex.: "curva C", "2,5 mm²").
- No orçamento, o item copia a especificação do catálogo; o botão Especificação permite ajustar só naquele orçamento.
- PDF: especificação abaixo da descrição, em letra menor (Ajustes → Padrões permite desligar).
- Catálogo padrão (v3): especificações nos cabos, disjuntor e tomadas; novos itens Tomada 20 A, DR 30 mA, DPS, cabo 10 mm², cabo PP 3 x 2,5 mm², lâmpada LED, luminária/plafon LED e contator. Itens e preços já cadastrados não mudam.
- PDF: coluna de unidade mais larga ("ponto" não quebra mais).

## [1.9.0] - 2026-11-03
- Dimensionamento (Início → Ferramentas → Dimensionamento): calculadora de circuitos com resultados ao vivo; salvar o circuito em um orçamento.
- Fórmulas editáveis (Dimensionamento → Fórmulas, ou Ajustes): entradas, cálculos e tabelas no estilo do Excel em português (SE, PROCV, PROXIMO, RAIZ, MAXIMO...), prévia do resultado em cada fórmula, validação antes de salvar, versão do modelo, exportar/importar em .json e voltar ao exemplo. O modelo sincroniza na nuvem e vai no backup.
- Vem com um modelo de EXEMPLO (valores fictícios), marcado na tela e no PDF, até ser trocado pelas fórmulas da planilha.
- Orçamento: seção Dimensionamento com os circuitos; opção de incluir no PDF do orçamento; PDF separado do dimensionamento com declaração e campo "De acordo do cliente", para enviar pelo WhatsApp ou baixar.
- Circuitos guardam os resultados e a versão das fórmulas usadas: o PDF não muda se as fórmulas forem alteradas depois; ao editar o circuito, ele é recalculado com as fórmulas atuais.

## [1.8.0] - 2026-11-03
- Novo menu Dimensionamento (Início → Ferramentas), reservado para os cálculos de cabos e proteção conforme a NBR 5410, que virão da planilha de dimensionamento.

## [1.7.0] - 2026-11-03
- Data prevista de início no orçamento (obrigatória para gerar o PDF e enviar); aparece no PDF e pode ir na mensagem do WhatsApp com {inicio}.
- Novo status "Concluído" para orçamentos já executados.
- Início: painel "Agenda" com orçamentos a vencer em 7 dias (e já vencidos) e a executar (atrasados, próximos 7 dias, depois, sem data), mais a lista dos próximos compromissos. Cada cartão abre o relatório já filtrado.
- Nova aba Relatórios: filtros de período, data considerada (emissão, início previsto ou validade), status, cliente e busca; atalhos A vencer, Vencidos, A executar e Início atrasado; totais, taxa de aprovação, ticket médio, valores por status, por tipo de item e principais clientes; exportação em CSV.

## [1.6.0] - 2026-11-01
- Importar contatos para a base de clientes: pela agenda do celular (Chrome no Android, só os contatos escolhidos) ou por arquivo .vcf (Android, iPhone, Google Contatos).
- Prévia antes de importar: busca, marcar/desmarcar, aviso de já cadastrado, repetido e sem telefone; prefere o celular ao fixo e remove o +55.

## [1.5.0] - 2026-11-01
- WhatsApp: como o WhatsApp descarta o texto enviado junto com documentos, a mensagem agora é copiada antes do envio e, depois do PDF, o app oferece abrir a conversa do cliente já com o texto.
- Assinatura gov.br (Opções → Assinar com gov.br e enviar): baixar o PDF, assinar no assinador.iti.br e enviar o PDF assinado ao cliente pelo app.

## [1.4.0] - 2026-10-31
- Rubrica automática no PDF: criada a partir de um texto (3 estilos de letra cursiva, em azul de caneta) ou desenhada com o dedo/mouse.
- Opção "Assinar automaticamente todos os orçamentos" e nome exibido abaixo da assinatura.
- Fim do PDF com dois campos lado a lado: responsável (com a rubrica) e aceite do cliente (com nome e data).
- A rubrica sincroniza com a nuvem junto com os demais ajustes.
- Fontes Great Vibes, Allura e Dancing Script (SIL Open Font License) incluídas no app, funcionam offline.

## [1.3.2] - 2026-10-31
- Nuvem: se um aparelho vazio (ex.: computador) conectar primeiro, os dados do aparelho que já tem clientes prevalecem ao conectar depois, sem perguntas.
- Registros criados em versões antigas (sem data de alteração) passam a sincronizar corretamente.

## [1.3.1] - 2026-10-31
- Aviso "Nova versão do app disponível" com botão Atualizar; o app procura atualização ao abrir e ao voltar para ele.

## [1.3.0] - 2026-10-31
- Backup em um toque: abre o menu de compartilhar do celular (Drive, e-mail); sem suporte, baixa o arquivo.
- Lembrete no Início quando há dados e o último backup tem 7 dias ou mais.
- Restaurar backup aceita .json e .txt.
- Nuvem opcional (Firebase, plano gratuito): login por e-mail/senha ou Google, sincronização em tempo real entre aparelhos, funciona offline e envia ao reconectar, exclusões propagadas, numeração dos orçamentos contínua entre aparelhos.
- Primeira conexão de um aparelho com dados: escolher entre usar os dados da nuvem ou juntar (sem duplicar o catálogo).
- Sair da nuvem com opção de apagar os dados do aparelho.
- Itens do catálogo padrão com identificador fixo (iguais em todos os aparelhos).

## [1.2.1] - 2026-10-31
- Telas estreitas (320 a 400 px): botões da barra de total só com ícone e valor total sem cortar.
- Telas muito pequenas e celular deitado: campos e navegação mais compactos.
- Aviso claro quando o app é aberto direto do arquivo, sem servidor https.

## [1.2.0] - 2026-10-31
- Catálogo com serviços de eletricista residencial: visita e diagnóstico, tomadas e interruptores, iluminação, instalação de equipamentos, quadro e proteção, fiação e infraestrutura, manutenção e laudos, materiais elétricos.
- Itens organizados por categoria, com busca (sem diferenciar acentos) e filtro por categoria no catálogo e ao montar o orçamento.
- Unidades novas: ponto e circuito.
- Catálogo inicial movido para `js/catalogo-padrao.js`; aparelhos que já usam o app recebem só os itens que faltam, sem perder preços.

## [1.1.0] - 2026-10-31
- PDF com duas cores configuráveis: letras (título e seções) e bordas/fundos (linha, tabela, total, caixa do cliente).
- Letra sobre fundos coloridos escolhe automaticamente branco ou escuro para manter a leitura.
- Prévia das cores e aviso quando a cor das letras fica clara demais.
- Backups da versão 1.0.0 são convertidos automaticamente.

## [1.0.0] - 2026-10-31
- Primeira versão: clientes, orçamentos, catálogo, PDF, envio pelo WhatsApp, backup e funcionamento offline.
