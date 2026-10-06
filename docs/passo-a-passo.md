# Passo a passo para colocar o atendimento no ar

O código está pronto. O que falta são as informações do Zind e as contas (Meta, banco e servidor),
que precisam ser feitas por alguém com acesso às contas do Zind. Siga na ordem.
Travou em algum passo? Manda um print no chat que o Claude te ajuda.

## Parte 1: mandar as informações no chat (o Claude cadastra)

1. **Horário dos feriados**, começando pelo Dia das Crianças (12/10). Ex.: "12/10 abre das 10h às 22h, 2/11 fechado".
2. **Número da organizadora** de festas, com DDD (é para onde vão os leads e as dúvidas).
3. **Link do WhatsApp do Zind** (o número que os clientes usam). O Instagram manda as festas para lá.
4. **PDF dos pacotes de festa**, quando estiver pronto.

## Parte 2: banco de dados (Supabase, grátis)

5. Entre em https://supabase.com, crie uma conta e clique em **New project**. Guarde a senha do banco.
6. No menu da esquerda, abra **SQL Editor**, cole todo o conteúdo do arquivo `db/schema.sql` e clique em **Run**.
7. Vá em **Project Settings > Database > Connection string (URI)** e copie o endereço.
   Troque `[YOUR-PASSWORD]` pela senha do passo 5. Esse é o `DATABASE_URL`.

## Parte 3: WhatsApp na Meta

8. Entre em https://developers.facebook.com com o Facebook que administra a página do Zind.
   Clique em **Meus apps > Criar app**, escolha o tipo **Empresa** e ligue ao portfólio (Business Manager) do Zind.
9. No app, adicione o produto **WhatsApp**. Na hora de escolher o número, use a opção de conectar o número
   que já está no **app WhatsApp Business** (coexistência). Assim a equipe continua usando o app no celular.
10. Em **WhatsApp > Configuração da API**, copie o **Phone number ID** (`WHATSAPP_PHONE_NUMBER_ID`).
11. Crie um token que não expira: **Configurações do negócio > Usuários do sistema > Adicionar**, dê acesso
    ao app e ao número e gere o token com as permissões `whatsapp_business_messaging` e
    `whatsapp_business_management`. Esse é o `WHATSAPP_TOKEN`.
12. Em **Configurações do app > Básico**, copie a **Chave secreta do app** (`META_APP_SECRET`).

## Parte 4: Instagram na Meta

13. Confira que o Instagram do Zind é conta profissional e está ligado à Página do Facebook.
14. No mesmo app, adicione **Instagram** (mensagens). Gere o token da Página (`INSTAGRAM_PAGE_TOKEN`)
    e copie o id da Página (`INSTAGRAM_PAGE_ID`) e o id da conta do Instagram (`INSTAGRAM_ACCOUNT_ID`).
15. No app do Instagram: **Configurações > Mensagens > Ferramentas conectadas**, deixe ligado o acesso às mensagens.

## Parte 5: colocar o servidor no ar (Railway)

16. Entre em https://railway.app com a conta do GitHub. **New Project > Deploy from GitHub repo > zind-park**.
17. Na aba **Variables**, adicione uma por uma (os nomes estão no arquivo `.env.example`):
    `DATABASE_URL`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `META_APP_SECRET`, `INSTAGRAM_PAGE_TOKEN`,
    `INSTAGRAM_PAGE_ID`, `INSTAGRAM_ACCOUNT_ID`, `ORGANIZADORA_WHATSAPP`, `ZIND_WHATSAPP_LINK`,
    e invente duas senhas para `WHATSAPP_VERIFY_TOKEN` e `INSTAGRAM_VERIFY_TOKEN`.
    `BOT_MODE` pode ficar `intents` (sem IA, sem custo).
18. Em **Settings > Networking**, clique em **Generate Domain**. Abra `https://SEU-DOMINIO/health`:
    tem que aparecer `{"ok":true,...}`.

## Parte 6: ligar a Meta ao servidor (webhooks)

19. No app da Meta, **WhatsApp > Configuração**: URL `https://SEU-DOMINIO/webhooks/whatsapp`,
    token de verificação = o `WHATSAPP_VERIFY_TOKEN` do passo 17. Assine os campos `messages` e `smb_message_echoes`.
20. **Instagram > Webhooks**: URL `https://SEU-DOMINIO/webhooks/instagram`, token = `INSTAGRAM_VERIFY_TOKEN`.
    Assine `messages` e `comments`.

## Parte 7: modelos de mensagem (templates)

21. No **WhatsApp Manager > Modelos de mensagem**, crie os 3 modelos do arquivo `docs/templates-meta.md`:
    `novo_lead_festa` e `duvida_cliente` (categoria Utilidade) e `aviso_feriado` (Marketing).
    A Meta leva de minutos a 1 dia para aprovar.
22. Depois de aprovados, no Railway, preencha `ORGANIZADORA_TEMPLATE_LEAD=novo_lead_festa` e
    `ORGANIZADORA_TEMPLATE_DUVIDA=duvida_cliente`.

## Parte 8: testar

23. Do seu celular, mande "oi" para o WhatsApp do Zind. Teste também "quero fazer uma festa" até o fim:
    a organizadora tem que receber o aviso.
24. Mande uma mensagem no Direct do Instagram do Zind.

## Parte 9: lista para os disparos

25. Monte uma planilha com as colunas `telefone, nome, tags, opt_in` (opt_in = "sim" só para quem aceitou
    receber mensagens) e salve como CSV. O Claude importa para você.
26. Antes de cada disparo, teste num número só (ver "Aviso de feriado" em `docs/como-funciona.md`).
