# Ativar a nuvem (Firebase), passo a passo

Leva cerca de 10 minutos e é feito **uma única vez**. O plano gratuito do Firebase (Spark) atende com folga e não pede cartão de crédito.

Dá para fazer pelo celular, no Chrome. Se algum menu não aparecer, use **⋮ → Versão para computador**.

## 1. Criar o projeto

1. Acesse **console.firebase.google.com** e entre com a sua conta Google.
2. Toque em **Criar um projeto** (ou *Adicionar projeto*).
3. Dê um nome, por exemplo `orcamentos`, e avance.
4. **Desative** o Google Analytics (não é necessário) e toque em **Criar projeto**.

## 2. Ativar o login

1. No menu do projeto, vá em **Criação → Authentication** e toque em **Vamos começar**.
2. Na aba **Método de login** (*Sign-in method*), ative:
   - **E-mail/senha**: ative a primeira opção e salve.
   - **Google** (opcional): ative, escolha o seu e-mail de suporte e salve.
3. Na aba **Configurações → Domínios autorizados**, toque em **Adicionar domínio** e informe:
   ```
   faabiianooc-automacoes.github.io
   ```

## 3. Criar o banco de dados

1. Vá em **Criação → Firestore Database** e toque em **Criar banco de dados**.
2. Local: escolha **southamerica-east1 (São Paulo)**. Esse local não pode ser trocado depois.
3. Escolha **Iniciar no modo de produção** e crie.
4. Abra a aba **Regras**, apague tudo e cole o conteúdo abaixo. Depois toque em **Publicar**.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cada conta só lê e grava os próprios dados
    match /usuarios/{uid}/{documento=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Essas regras são o que protege os dados dos seus clientes. Com elas, ninguém consegue ler os seus dados sem entrar com a **sua** conta. O mesmo texto está no arquivo `firestore.rules` deste repositório.

**Opcional, mais restrito:** para que só o seu e-mail consiga usar o banco, troque a linha `allow` por esta, colocando o seu e-mail:
```
      allow read, write: if request.auth != null && request.auth.uid == uid
                         && request.auth.token.email == "seu-email@gmail.com";
```

## 4. Pegar a configuração do app

1. Toque na **engrenagem ⚙ → Configurações do projeto**.
2. Em **Seus apps**, toque no ícone **`</>`** (Web).
3. Apelido: `orcamentos-pwa`. **Não** marque Firebase Hosting. Toque em **Registrar app**.
4. Aparece um bloco parecido com este:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "orcamentos-xxxxx.firebaseapp.com",
     projectId: "orcamentos-xxxxx",
     storageBucket: "orcamentos-xxxxx.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123"
   };
   ```
   Copie o bloco inteiro. Dá para ver de novo depois, na mesma tela.

Essa configuração **não é senha**: ela só diz ao app qual é o seu projeto. Quem protege os dados são as regras do passo 3 e o seu login. Mesmo assim, ela não está publicada neste repositório: fica só nos aparelhos onde você colar.

## 5. Ligar no app

1. Abra o app e vá em **Ajustes → Nuvem → Configurar nuvem**.
2. Cole o bloco copiado e toque em **Salvar e conectar**.
3. Entre:
   - **Primeira vez:** digite e-mail e senha (mínimo 6 caracteres) e toque em **Criar conta**. Ou use **Entrar com Google**.
   - **Outros aparelhos:** cole a mesma configuração e toque em **Entrar** com o **mesmo** e-mail e senha.
4. Pronto: em Ajustes aparece **Conectado · sincronizado às HH:MM**, e no Início aparece o status da nuvem.

## Como funciona

- O app continua funcionando **sem internet**. As alterações ficam guardadas no aparelho e são enviadas quando a conexão voltar.
- O que você cria ou altera em um aparelho aparece nos outros em poucos segundos.
- Se o mesmo registro for alterado em dois aparelhos, vale a alteração mais recente.
- **Perdeu o celular?** Instale o app no novo aparelho, configure a nuvem (passo 5) e entre: tudo volta.
- **Celular de outra pessoa?** Em Ajustes → Nuvem → **Sair**, escolha **Sair e apagar deste aparelho**. Os dados continuam na nuvem.

## Problemas comuns

| Mensagem | O que fazer |
|---|---|
| Este endereço não está autorizado no Firebase | Faça o passo 2.3 (domínio autorizado) |
| Este tipo de login não está ativado | Ative E-mail/senha ou Google no passo 2.2 |
| Sem permissão na nuvem | Confira se as regras do passo 3.4 foram **publicadas** |
| A janela de login do Google não abre (app instalado) | Use e-mail e senha |
