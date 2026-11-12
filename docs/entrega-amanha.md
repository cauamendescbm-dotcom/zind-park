# Guia da entrega do Zind (13/11/2026)

Um passo de cada vez, na ordem. **Nunca mande token ou senha em chat:** cole direto no Railway ou na Meta.
Ao fim de cada bloco, abra https://zind-park-production.up.railway.app/health. A lista `faltando` vai
diminuindo, e quando ficar vazia o robô está pronto.

## 0. Antes de começar (2 min)

- Abra o /health. Se `banco` mostrar `memoria (banco fora: ...)`, está tudo bem: o robô atende em memória até
  o Supabase voltar. Você **não** precisa apagar o `DATABASE_URL`.
- Tenha em mãos o celular que testa (o seu) e o número do responsável pelas festas.

## 1. Pegar os dados do número de teste na Meta (10 min)

1. Entre em **developers.facebook.com** > **Meus apps** > **atendimento zind park**.
2. Menu da esquerda: **WhatsApp** > **Configuração da API** (API Setup).
3. Copie o **Identificação do número de telefone** (Phone number ID). Ele vai para `PHONE_NUMBER_ID`.
4. Clique em **Gerar token de acesso** e copie o token. Ele vai para `WHATSAPP_TOKEN`
   (vale só 24h; o passo 4 troca por um permanente).
5. Menu da esquerda: **Configurações do app** > **Básico** > **Chave Secreta do Aplicativo** > **Mostrar**.
   Copie. Ela vai para `APP_SECRET`.

## 2. Colar no Railway (5 min)

1. **railway.com** > projeto **zind-park** > clique no serviço > aba **Variables**.
2. Para cada uma: **+ New Variable**, nome à esquerda, valor à direita, **Add**:
   - `PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`, `APP_SECRET` (do passo 1)
   - `ORGANIZADORA_WHATSAPP`: número do responsável pelas festas, só números com 55 e DDD (ex.: 5547999990000)
   - `ZIND_WHATSAPP_LINK`: `https://wa.me/55DDDNUMERO` do Zind (sem esse link, o Instagram mostra "[PREENCHER ...]")
   - `ZIND_INSTAGRAM_LINK`: `https://instagram.com/usuario_do_zind`
3. Clique no botão roxo **Deploy** no topo e espere uns 2 minutos.

## 3. Primeiro teste (5 min)

Do seu celular, mande para o número de teste (+1 555 166-2070):
- `oi` → tem que responder.
- `que horas abre?` → tem que falar de segunda.
- uma festa inteira (pacote, convidados, nome) → o responsável pelas festas recebe o aviso.

Observação: com o número de teste, o responsável pelas festas só recebe o aviso se o número dele também estiver
na lista de destinatários do teste (WhatsApp > Configuração da API > **Para** > **Gerenciar lista**).

## 4. Token permanente (15 min) — senão o robô para em 24h

1. **business.facebook.com** > **Configurações** > **Usuários** > **Usuários do sistema** > **Adicionar**.
   Nome: `robo-zind`, função **Administrador**.
2. **Atribuir ativos**: o app **atendimento zind park** (controle total) e a conta do WhatsApp (controle total).
3. **Gerar novo token** > app **atendimento zind park** > validade **Nunca** > marque
   `whatsapp_business_messaging` e `whatsapp_business_management` > **Gerar**.
4. Railway > Variables > `WHATSAPP_TOKEN` > três pontinhos > **Edit** > cole o novo > **Deploy**.

## 5. App Ativo (5 min)

developers.facebook.com > o app > **Configurações do app** > **Básico**:
- **URL da Política de Privacidade**: `https://zind-park-production.up.railway.app/privacidade` > **Salvar**.
- No topo, mude **Modo do app** de Desenvolvimento para **Ativo**.

## 6. Quando a Meta autorizar: número real do Zind

- Abra `https://zind-park-production.up.railway.app/conectar?chave=...` (a chave é a `CONECTAR_CHAVE` do Railway).
- Use o **QR oficial de coexistência**: o Zind continua usando o app WhatsApp Business no celular.
- **Não** registre o número atual pelo SMS: isso apaga a conta do app e as conversas do celular.
- Cartão na conta do WhatsApp: WhatsApp Manager > **Pagamentos**.

## 7. Opcional

- `ANTHROPIC_API_KEY` (console.anthropic.com, com crédito e recarga automática): a IA responde o que o robô não entende.
- Modelos `novo_lead_festa` e `duvida_cliente` (docs/templates-meta.md): sem eles, o aviso de festa só chega se o
  responsável pelas festas tiver falado com o robô nas últimas 24h.

## 8. Depois da entrega

- Supabase: pagar, conferir que o projeto voltou e clicar em **Restart** no serviço do Railway. O /health deve mostrar `"banco": "ok"`.
- Rodar as migrações 004, 005 e 006 no SQL Editor do Supabase, nessa ordem (podem rodar de novo sem estragar).
- Feriados: preencher com o Zind a lista em docs/feriados-para-confirmar.md.
