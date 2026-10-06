# Ligar o WhatsApp e o Instagram na Meta (passo a passo)

O servidor tem **um endereço só** para os dois canais: `https://SEU-ENDERECO/webhook`.
A Meta chama esse endereço a cada mensagem. O servidor confere a assinatura (`APP_SECRET`),
responde "ok" na hora e processa a mensagem em segundo plano.

Os nomes dos menus da Meta mudam de vez em quando. Se algum não bater, procure pelo nome
parecido ou mande um print no chat.

---

## Parte A: testar no seu computador (ngrok)

1. Instale o Node 22 e rode `npm install` na pasta do projeto.
2. Copie `.env.example` para `.env`.
3. No `.env`, invente uma senha para `VERIFY_TOKEN` (ex.: `zind-verifica-2026`).
4. Rode o banco: crie o projeto no Supabase, rode `db/schema.sql` no SQL Editor e cole a
   Connection string (URI) em `DATABASE_URL`. (Para um teste rápido sem banco, deixe vazio.)
5. Rode `npm run dev`. Deve aparecer `Server listening at http://0.0.0.0:3000`.
6. Crie uma conta grátis em https://ngrok.com, instale e faça o login que o site mostra
   (`ngrok config add-authtoken ...`).
7. Em outro terminal: `ngrok http 3000`.
8. Copie o endereço `https://....ngrok-free.app` que aparece em "Forwarding".
9. Teste no navegador: `https://....ngrok-free.app/health` tem que mostrar `{"ok":true,...}`.

Esse endereço muda toda vez que o ngrok reinicia (no plano grátis). Quando mudar, troque a URL na Meta (passo 18).

---

## Parte B: criar o app na Meta

10. Entre em https://developers.facebook.com com o Facebook que administra a página do Zind.
11. **Meus apps > Criar app**.
12. Caso de uso: **Outro**. Tipo do app: **Empresa**. Nome: `Zind Atendimento`.
    Portfólio empresarial: o do Zind.
13. **Configurações do app > Básico > Chave secreta do app > Mostrar**. Copie para `APP_SECRET` no `.env`.

---

## Parte C: WhatsApp

14. No painel do app: **Adicionar produto > WhatsApp > Configurar**.
15. **WhatsApp > Configuração da API**:
    - copie o **Identificador do número de telefone** para `PHONE_NUMBER_ID`;
    - clique em **Gerar token de acesso** e copie para `WHATSAPP_TOKEN` (esse dura 24h, serve para o teste);
    - em **Para**, adicione o seu celular e confirme o código que chega no WhatsApp.
      No começo a Meta dá um número de teste; ele só conversa com os números dessa lista.
16. Reinicie o servidor (`Ctrl+C` e `npm run dev` de novo) para ele ler o `.env`.
17. **WhatsApp > Configuração > Webhook > Editar**.
18. **URL de callback**: `https://....ngrok-free.app/webhook` (o endereço do passo 8 + `/webhook`).
19. **Verificar token**: a mesma senha do `VERIFY_TOKEN`.
20. Clique em **Verificar e salvar**. Se der erro, confira se o servidor e o ngrok estão rodando e se a senha é igual.
21. Em **Campos do webhook > Gerenciar**, assine **messages**.
    Se o número do Zind continuar no app WhatsApp Business (coexistência), assine também **smb_message_echoes**:
    assim, quando alguém da equipe responder pelo celular, o bot fica quieto naquela conversa.
22. Do seu celular, mande "oi" para o número de teste. A resposta chega em poucos segundos.
    No terminal aparece a mensagem recebida; se a IA foi usada, aparece uma linha `[ia-uso]` com os tokens.

### Número de verdade do Zind

23. **WhatsApp > Configuração da API > Adicionar número de telefone**. Para continuar usando o app
    WhatsApp Business no celular, escolha a opção de conectar um número que já usa o app (coexistência).
24. Troque `PHONE_NUMBER_ID` pelo id do número novo.
25. Token que não expira: **business.facebook.com > Configurações > Usuários do sistema > Adicionar**
    (função Administrador). Em **Atribuir ativos**, dê acesso ao app e à conta do WhatsApp.
    **Gerar token** com as permissões `whatsapp_business_messaging` e `whatsapp_business_management`.
    Cole em `WHATSAPP_TOKEN`.
26. **Configurações do app > Básico**: preencha a URL da política de privacidade e coloque o app em **Ativo** (publicado).
    Em modo de desenvolvimento, só os números de teste recebem resposta.

---

## Parte D: Instagram (depois que o WhatsApp estiver funcionando)

27. Confira que o Instagram do Zind é **conta profissional** e está ligado à **Página do Facebook** do Zind.
28. No Instagram (celular): **Configurações > Mensagens e respostas a stories > Ferramentas conectadas >
    Permitir acesso às mensagens**: ligado.
29. No painel do app: **Adicionar produto > Messenger**. Em **Messenger > Configurações do Instagram**,
    adicione a conta do Instagram e gere o token da página. Copie para `INSTAGRAM_TOKEN`.
30. Copie o id da Página para `INSTAGRAM_PAGE_ID` e o id da conta do Instagram para `INSTAGRAM_ACCOUNT_ID`
    (aparecem na mesma tela).
31. **Webhooks** (menu do app) > escolha **Instagram** na lista > **Assinar este objeto**:
    - URL de callback: a mesma `https://.../webhook`;
    - Verificar token: o mesmo `VERIFY_TOKEN`;
    - assine os campos **messages** e **comments**.
32. Reinicie o servidor e mande uma mensagem no Direct do Zind de uma conta que tenha função no app
    (administrador ou testador). O servidor sabe que veio do Instagram pelo campo `"object"` da mensagem.
33. Para responder clientes de verdade no Instagram, a Meta exige a **Análise do app** (App Review) da
    permissão `instagram_manage_messages`, com um vídeo mostrando o atendimento. Leva alguns dias.

---

## Parte E: colocar no ar (deploy)

34. Suba o projeto no servidor escolhido e copie todas as variáveis do `.env` para lá.
35. Troque a URL de callback (passos 18 e 31) para `https://SEU-ENDERECO/webhook`.
36. Mande "oi" de novo para conferir.

---

## Regras que o servidor já cumpre

- **Mensagem repetida**: a Meta às vezes manda o mesmo webhook duas vezes; o id de cada mensagem fica salvo e a repetida é ignorada.
- **Foto, áudio, vídeo**: o cliente recebe "Por aqui eu consigo ler só mensagens de texto 😊", sem gastar IA.
- **Janela de 24h**: só responde texto livre até 24h depois da última mensagem do cliente. Depois disso, só template aprovado.
- **Template de marketing**: só sai quando você roda `npm run disparo` ou `npm run disparo-feriado`. O atendimento nunca manda sozinho.
- **Pausar o bot** para alguém da equipe assumir:
  - pelo WhatsApp, a organizadora (ou um número de `EQUIPE_WHATSAPP`) manda para o número do Zind:
    `#pausar 5547999999999` (24h), `#pausar 5547999999999 72` (72h) ou `#voltar 5547999999999`;
  - pelo terminal: `npm run pausar -- 5547999999999` e `npm run voltar -- 5547999999999`;
  - responder o cliente pelo app WhatsApp Business também pausa por `HUMAN_PAUSE_HOURS`.

## Custo por cliente

Cada resposta que usou a IA gera uma linha no log:

```
[ia-uso] {"canal":"whatsapp","cliente":"...","modelo":"claude-haiku-4-5-20251001","entrada":812,"saida":24,"cache_leitura":0,"cache_escrita":5100,"chamadas":1,"custo_usd":0.007307}
```

e fica salva na tabela `ai_usage`. No Supabase, a view **ai_custo_por_cliente** já soma tudo por cliente e canal
(tokens e custo estimado em dólar). Respostas do chatbot de intenções (a maioria) não usam IA e custam zero.
