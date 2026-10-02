# Como o agente funciona (explicado sem código)

## Quando chega uma mensagem
1. A Meta avisa o servidor (webhook). O servidor confere que veio mesmo da Meta e responde "ok" na hora.
2. A mensagem é guardada no banco. Se for repetida (a Meta às vezes manda duas vezes), é ignorada.
3. Se a pessoa escreveu só "SAIR" (ou "PARAR"), ela sai da lista de promoções e recebe uma confirmação. Fim.
4. O agente espera uns 4 segundos: se a pessoa mandar várias mensagens seguidas, ele responde tudo de uma vez.
5. O Claude lê a conversa, as informações do Zind (`knowledge/`) e o estado da conversa (por exemplo, quais
   dados da festa já foram coletados) e escreve a resposta. Se precisar, ele usa "ferramentas":
   salvar dados da festa, repassar para a organizadora, chamar uma pessoa da equipe, tirar da lista.
6. A resposta é quebrada em balões de até 3 linhas. De vez em quando (no máximo 1 vez por conversa)
   um balão sai com uma letra trocada e o próximo corrige: "*festa".
7. Antes de cada balão aparece "digitando..." por alguns segundos, proporcional ao tamanho do texto.

## Festa (só no WhatsApp)
- O agente vai descobrindo nome, contato, data, número de convidados, tema e pacote, conversando.
- Com tudo preenchido, ele confirma o resumo com o cliente e repassa: a organizadora recebe no WhatsApp
  todos os dados e o valor do pacote. O lead fica "fechado" e o agente não vende mais nessa conversa.
- No Instagram o agente não faz festa: convida a pessoa para o WhatsApp.

## Quando o agente não sabe
- Ele nunca inventa. Diz que vai confirmar e a organizadora recebe um aviso com a pergunta e o contato.
- Se a API do Claude cair, o cliente recebe a mesma mensagem e a equipe também é avisada.

## Quando alguém da equipe responde direto
- Se alguém responder o cliente pelo app do WhatsApp Business (modo coexistência) ou pela caixa de
  mensagens do Instagram, o agente percebe e fica em silêncio nessa conversa por 12 horas
  (`HUMAN_PAUSE_HOURS`), para não atropelar a pessoa.
- Mensagens que a organizadora manda para o número do Zind nunca são respondidas pelo agente.

## Promoções
- WhatsApp: `npm run disparo` manda um template aprovado com a foto, para quem deu permissão (opt-in).
- Instagram: a Meta só deixa mandar para quem falou com o Zind nas últimas 24h.
- "Comente PROMO": em `campanhas/comentarios-instagram.json` você define palavras. Quem comentar a palavra
  num post recebe uma resposta pública e uma mensagem no Direct; daí em diante o agente conversa normalmente.
- Se a pessoa responder a uma promoção, o agente sabe qual promoção ela recebeu.
- Métricas de cada campanha: `npm run metricas -- ID` ou a view `campaign_metrics` no Supabase.
