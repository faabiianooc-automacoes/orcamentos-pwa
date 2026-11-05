# Enviar as fotos do serviço para o Google Fotos

O app cria **um álbum por orçamento** no seu Google Fotos (ex.: `ORC-2026-0001 - Ana Souza - Troca do quadro`) e envia para ele as fotos anexadas em **Desenhos e anexos → Fotos do serviço**.

- O app pede só a permissão de **criar álbuns e enviar fotos** (`photoslibrary.appendonly`). Ele não vê nem apaga o resto da sua biblioteca.
- Pelas regras atuais do Google, o app só consegue colocar fotos em álbuns que ele mesmo criou. Por isso o álbum é criado pelo app.
- É gratuito. Você só precisa criar, uma vez, um "ID do cliente" no Google Cloud (cerca de 10 minutos, pelo computador).

## Passo a passo (uma vez)

1. Acesse **console.cloud.google.com** com a sua conta Google e crie um projeto (ex.: `orcamentos-pwa`).
2. Em **APIs e serviços → Biblioteca**, procure **Photos Library API** e clique em **Ativar**.
3. Em **APIs e serviços → Tela de consentimento OAuth** (ou **Google Auth Platform → Branding**):
   - Tipo de usuário: **Externo**.
   - Nome do app: `Orçamentos` · e-mail de suporte: o seu.
   - Em **Público-alvo**, deixe em **Teste** e adicione o seu e-mail (e o de quem mais for usar) em **Usuários de teste**. Em modo de teste não é preciso verificação do Google.
4. Em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo: **Aplicativo da Web**.
   - **Origens JavaScript autorizadas**: o endereço do app, sem barra no final. Ex.: `https://faabiianooc-automacoes.github.io`
   - Salve e copie o **ID do cliente** (termina em `.apps.googleusercontent.com`).
5. No app: **Ajustes → Google Fotos**, cole o ID.

## Como usar

1. No orçamento, **Desenhos e anexos → Fotos do serviço**: tire ou escolha as fotos e marque a etapa (antes, durante, depois).
2. Toque em **Enviar fotos ao Google Fotos**. Na primeira vez, o Google pede para você entrar e autorizar.
3. As fotos enviadas ficam marcadas com "no Google Fotos ✓". Novas fotos do mesmo orçamento vão para o mesmo álbum.

## Se não funcionar

- "Acesso bloqueado" ou "app não verificado": confira se o seu e-mail está em **Usuários de teste** (passo 3).
- "origin_mismatch": o endereço em **Origens JavaScript autorizadas** precisa ser exatamente o do app.
- Sem internet ou erro do Google: use o botão **Compartilhar** que o app oferece e escolha o app Google Fotos.
- O acesso dura cerca de 1 hora; depois o app pede para entrar de novo.
