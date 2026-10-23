# Página para o cliente conectar o WhatsApp e o Instagram dele

Endereço: `https://zind-park-production.up.railway.app/conectar?chave=SUA_SENHA`

O cliente abre o link, clica em um botão, entra com o Facebook dele e escolhe o número.
Pronto: o robô passa a responder nesse número. Ninguém precisa copiar token nem id.

## Por que não é um QR Code igual ao do WhatsApp Web?

Aquele QR só funciona com programas **não oficiais**, que fingem ser um celular. A Meta proíbe e costuma
**banir o número**. Esta página usa o **cadastro oficial da Meta** ("Embedded Signup").

Tem QR Code sim, mas é o oficial: no botão **"Conectar com QR Code"** (para quem já usa o app
WhatsApp Business), a Meta mostra um QR no fim e o cliente escaneia no app. Ele continua usando o app
normalmente, junto com o robô (a Meta chama isso de "coexistência"). Quando a equipe responde pelo app,
o robô fica quieto naquela conversa, como já acontece hoje.

O outro botão, **"Conectar número novo"**, é para um número que não está em nenhum app. A Meta confirma
por SMS ou ligação.

## O que fazer uma vez (você, não o cliente)

1. **App da Meta.** Em developers.facebook.com, no app do Zind (tipo Empresa), com o produto WhatsApp.
2. **Facebook Login para Empresas.** No app: Adicionar produto > Facebook Login para Empresas >
   Configurações > Criar configuração > escolha **"Cadastro incorporado do WhatsApp"** (WhatsApp Embedded
   Signup). Copie o **ID da configuração**.
3. Ainda em Facebook Login para Empresas > Configurações, em **Domínios permitidos para o SDK do JavaScript**
   coloque `https://zind-park-production.up.railway.app` e ligue "Login com o SDK do JavaScript".
4. **Variáveis no Railway** (Variables):
   - `APP_ID` = App > Configurações > Básico > ID do app
   - `APP_SECRET` = mesma tela, Chave secreta do app (talvez já esteja lá)
   - `WHATSAPP_CONFIG_ID` = o ID da configuração do passo 2
   - `INSTAGRAM_CONFIG_ID` = opcional, para o cartão do Instagram (seção Instagram abaixo)
   - `CONECTAR_CHAVE` = uma senha que você inventa (ex.: `zind-conecta-8271`). Ela vai no link e impede
     que um estranho troque o número do robô.
5. **Supabase.** Banco criado antes desta versão: SQL Editor > cole `db/migrations/006-conexoes-pela-pagina.sql` > Run.
6. O **webhook** continua o mesmo (`/webhook`, ver `docs/meta-webhook.md`). Ao conectar, o servidor já
   inscreve o app na conta do WhatsApp do cliente, então as mensagens dele chegam aqui.

Mande para o cliente: `https://zind-park-production.up.railway.app/conectar?chave=SUA_SENHA`

## Instagram

O cartão "Instagram da empresa" aparece quando `INSTAGRAM_CONFIG_ID` está preenchido. O cliente clica,
entra com o Facebook e autoriza a Página ligada ao Instagram profissional dele. O servidor pega o token da
Página, inscreve o app nela e passa a responder o Direct dessa conta (vale mais que `INSTAGRAM_PAGE_ID`/
`INSTAGRAM_TOKEN` do Railway).

Para ligar:
1. Em Facebook Login para Empresas > Configurações, crie **outra** configuração (tipo "Token de acesso do
   usuário") com as permissões `instagram_basic`, `instagram_manage_messages`, `instagram_manage_comments`,
   `pages_show_list`, `pages_manage_metadata` e `pages_read_engagement`. Copie o ID dela.
2. No Railway: `INSTAGRAM_CONFIG_ID` = esse ID.
3. No app da Meta, o webhook do produto Instagram continua o mesmo (`/webhook`, ver `docs/meta-webhook.md`).

Se a pessoa tiver várias Páginas, o robô usa a primeira que tem Instagram profissional.

## QR Codes

Depois de conectar, a página mostra dois QR Codes prontos para imprimir (botão "Imprimir os QR Codes"):
- **WhatsApp:** abre a conversa com o número conectado (`wa.me/...`).
- **Instagram:** abre o Direct da conta conectada (`ig.me/m/...`).

O cliente coloca no balcão, no cardápio ou no cartão, e quem escanear cai direto no atendimento do robô.

## Importante

- **Número de outra empresa.** Enquanto o app da Meta estiver em modo de desenvolvimento, só quem é
  administrador ou testador do app consegue conectar. Para conectar o WhatsApp de um cliente de outra
  empresa, o app precisa virar **Provedor de tecnologia** (Tech Provider): verificar a empresa no
  Gerenciador de Negócios e pedir as permissões `whatsapp_business_management` e
  `whatsapp_business_messaging` na Análise do app.
- **Um número por servidor.** O robô atende o número conectado por último. Conectar de novo troca o número.
  Para atender vários clientes ao mesmo tempo, cada um precisa do próprio servidor (outro deploy no Railway).
- O número conectado pela página vale mais que o `WHATSAPP_TOKEN`/`PHONE_NUMBER_ID` do Railway.
- Se o WhatsApp estava desligado e foi ligado pela página, reinicie o servidor no Railway uma vez para
  ligar também os avisos da organizadora e o retorno do "vou pensar".
- Número novo: o servidor cria o PIN de confirmação em duas etapas e guarda na tabela `whatsapp_connections`.
