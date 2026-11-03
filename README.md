# Orçamentos PWA

App instalável (PWA) para cadastrar clientes, montar orçamentos, gerar o PDF e enviar pelo WhatsApp. Funciona sem internet depois de aberto uma vez.

## Funcionalidades

- **Clientes:** nome, WhatsApp com DDD, e-mail, CPF/CNPJ, endereço da instalação, tipo de imóvel e observações. **Importar contatos** pela agenda do celular (Chrome no Android) ou por arquivo .vcf, com prévia e aviso de duplicados.
- **Orçamentos:** numeração automática (`ORC-2026-0001`), itens do catálogo ou avulsos, desconto em % ou R$, validade, **data prevista de início (obrigatória)**, prazo, pagamento, garantia, observações e status (Rascunho, Enviado, Aprovado, Concluído, Recusado; "Vencido" é calculado).
- **Agenda no Início:** quantos orçamentos vencem nos próximos 7 dias (e quantos já venceram) e quantos aprovados estão a executar (atrasados, nos próximos 7 dias, depois e sem data), com a lista dos próximos compromissos.
- **Dimensionamento (NBR 5410):** calculadora de circuitos com fórmulas e tabelas editáveis no próprio app (estilo Excel em português). Os circuitos ficam no orçamento e vão no PDF dele ou num PDF separado com "de acordo" do cliente. O modelo que vem no app é um **exemplo com valores fictícios**: troque pelas fórmulas da sua planilha antes de usar com clientes.
- **Relatórios:** filtros por período (este mês, mês passado, 30/90 dias, ano, próximos 7/30 dias ou datas livres), pela data de emissão, início previsto ou validade, por status, cliente e busca. Mostra totais, taxa de aprovação, ticket médio, valores por status, por tipo de item e principais clientes; exporta a lista em planilha (CSV).
- **Verificação antes de enviar:** o app lista o que falta (cliente, telefone, itens sem valor, condições de pagamento etc.).
- **PDF:** A4 com logo, dados da empresa e do cliente, tabela de itens, totais, condições, rubrica automática do responsável e campo de aceite do cliente.
- **WhatsApp:**
  - No celular, o botão **Enviar** abre o menu de compartilhar com o PDF: escolha WhatsApp e o contato. Como o WhatsApp descarta o texto que acompanha documentos, a mensagem fica copiada e, em seguida, o app oferece abrir a conversa do cliente já com ela escrita.
  - **Assinar com gov.br e enviar** (em Opções do orçamento): baixa o PDF, abre o assinador.iti.br e envia o PDF assinado. A API de assinatura do gov.br é restrita a órgãos públicos, por isso a assinatura é feita no site do gov.br.
  - No computador (ou em navegadores sem suporte), o PDF é baixado e o app abre a conversa do contato cadastrado com a mensagem pronta, para você anexar o arquivo.
  - Em **Opções → Mensagem para o cliente**, o app abre direto a conversa do contato cadastrado, só com o texto.
- **Catálogo:** mais de 70 itens de eletricista residencial e automação, por categoria, todos sem preço para você definir. Busca e filtro por categoria.
- **Ajustes:** dados da empresa, logo, duas cores do PDF (letras e bordas/fundos, com prévia), textos padrão, modelo da mensagem do WhatsApp, catálogo de itens e backup (exportar/importar JSON).

> **Limitação do WhatsApp:** nenhum site ou PWA consegue anexar um arquivo direto na conversa de um contato específico. O WhatsApp só permite isso pela API oficial (WhatsApp Business Cloud API), que exige servidor, número comercial verificado e tem custo por conversa. Por isso o envio usa o menu de compartilhar.

## Onde ficam os dados

Os dados ficam **no aparelho** (localStorage do navegador). Há duas formas de não perdê-los:

- **Backup:** em **Ajustes → Backup → Fazer backup**, o celular abre o menu de compartilhar; escolha **Drive** ou e-mail. O Início lembra de fazer backup a cada 7 dias. Para recuperar: **Restaurar backup**.
- **Nuvem (gratuita, opcional):** com o Firebase configurado, cada alteração é enviada para a nuvem e aparece nos outros aparelhos com a mesma conta. Veja **[FIREBASE.md](FIREBASE.md)**. As regras de segurança estão em `firestore.rules`.

Limpar os dados do navegador apaga o que está no aparelho; com a nuvem ativa, basta entrar de novo.

## Como publicar

O PWA precisa ser aberto por um endereço **https**. Abrir o `index.html` direto do gerenciador de arquivos do celular **não funciona**: o navegador bloqueia os estilos e os scripts, e a tela aparece "quebrada".

### Opção rápida: Netlify Drop (gratuito, sem configuração)

1. No computador, extraia o zip.
2. Acesse **app.netlify.com/drop** e arraste a pasta `orcamento-pwa` para a página.
3. Em segundos aparece um endereço `https://nome-aleatorio.netlify.app`. Crie uma conta gratuita para ele não expirar e, se quiser, troque o nome.
4. Abra o endereço no celular e instale (passo 4 abaixo).

### Opção GitHub Pages

1. Crie um repositório (ex.: `orcamentos-pwa`) e envie esta pasta para a raiz dele.
2. No GitHub, vá em **Settings → Pages**. Em *Source*, escolha `Deploy from a branch`, depois a branch `main` e a pasta `/ (root)`.
3. Em 1 a 2 minutos o app fica em `https://SEU-USUARIO.github.io/orcamentos-pwa/`.
4. Abra esse endereço no celular e escolha **Adicionar à tela inicial** (Android: menu ⋮ → *Instalar app*; iPhone: Compartilhar → *Adicionar à Tela de Início*).

> O GitHub Pages em repositório **privado** exige plano pago. Em repositório público, o código fica visível, mas os dados dos clientes não, porque ficam só no aparelho.

## Como testar no computador

```bash
cd orcamentos-pwa
python3 -m http.server 8080
# abra http://localhost:8080
```

## Como publicar uma nova versão

1. Altere os arquivos.
2. Em `sw.js`, aumente a `VERSAO` (ex.: `orcamentos-v1.0.1`). Sem isso, os aparelhos continuam com a versão antiga em cache.
3. Atualize o número da versão no rodapé de Ajustes (`js/app.js`) e no `CHANGELOG.md`.
4. Faça o commit e o push. O app atualiza na próxima vez que for aberto com internet.

## Estrutura

```
index.html              Página única do app
manifest.webmanifest    Nome, ícones e cores para instalação
sw.js                   Cache offline
css/app.css             Estilos (claro e escuro)
js/catalogo-padrao.js   Itens iniciais do catálogo (edite aqui para incluir serviços para todos)
js/store.js             Dados, cálculos, validações e backup
js/pdf.js               Geração do PDF
js/whatsapp.js          Compartilhar e links do WhatsApp
js/contatos.js          Importação de contatos (agenda do celular e .vcf)
js/nuvem.js             Login e sincronização com o Firebase (carregado só se configurado)
js/app.js               Telas e navegação
vendor/                 jsPDF 2.5.1, jsPDF-AutoTable 3.8.2 (MIT) e Firebase JS SDK 10.14.1 compat (Apache-2.0)
FIREBASE.md             Passo a passo para ativar a nuvem
firestore.rules         Regras de segurança do banco
fonts/                  Fontes cursivas da rubrica (SIL Open Font License)
icons/                  Ícones do app
```

## Próximos passos possíveis

- Pacotes prontos por módulo (ex.: "Kit Água v1" com todos os itens e preços).
- Fotos da visita técnica anexadas ao orçamento.
- Envio automático pela API oficial do WhatsApp Business.
