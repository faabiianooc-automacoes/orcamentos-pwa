# Changelog

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
