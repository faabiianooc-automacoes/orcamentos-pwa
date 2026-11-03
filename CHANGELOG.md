# Changelog

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
