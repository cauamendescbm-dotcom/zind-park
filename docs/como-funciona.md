# Como o atendimento funciona (explicado sem código)

## Quando chega uma mensagem
1. A Meta avisa o servidor (webhook). O servidor confere que veio mesmo da Meta e responde "ok" na hora.
2. A mensagem é guardada no banco. Se for repetida (a Meta às vezes manda duas vezes), é ignorada.
3. Se a pessoa escreveu só "SAIR" (ou "PARAR"), ela sai da lista de promoções e recebe uma confirmação. Fim.
4. O agente espera uns 4 segundos: se a pessoa mandar várias mensagens seguidas, ele responde tudo de uma vez.
5. O chatbot de intenções descobre o assunto (horário, valor, festa...) pelas palavras da mensagem
   e responde com o texto oficial da Zind, lembrando do que já foi conversado. Se ficar em dúvida entre
   dois assuntos, pergunta qual é.
   No modo `hibrido`, o que o chatbot não entender vai para o Claude, que lê a conversa e as mesmas
   informações oficiais e escreve a resposta.
6. A resposta é quebrada em balões de até 3 linhas. De vez em quando (no máximo 1 vez por conversa)
   um balão sai com uma letra trocada e o próximo corrige: "*festa".
7. Antes de cada balão aparece "digitando..." por alguns segundos, proporcional ao tamanho do texto.

## Festa (só no WhatsApp)
- Quem pergunta de festa recebe a apresentação oficial dos espaços e o menu "1 — pacotes / 2 — dúvida".
- Quando a pessoa quer seguir, o atendimento pergunta, uma coisa por vez: data, convidados, horário,
  idade do aniversariante, espaço, tema e nome. O telefone já vem do WhatsApp.
- No fim, a organizadora recebe tudo no WhatsApp e o lead fica "fechado".
- Valores de festa só aparecem depois que os pacotes do PDF forem cadastrados.
- No Instagram não tem coleta: a pessoa recebe a explicação e o link do WhatsApp.

## Quando o atendimento não sabe
- Nunca inventa. Se não entender, pergunta o assunto; se continuar sem entender, diz que vai encaminhar
  para a equipe e a organizadora recebe um aviso com a mensagem e o contato.
- Assuntos que a Zind ainda não passou (estacionamento, feriados...): "Essa informação eu não tenho
  disponível por aqui, mas nossa equipe pode confirmar para você." e a equipe é avisada.
- No modo com IA, se a API do Claude cair, o cliente recebe "vou confirmar e já te retorno" e a equipe é avisada.

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
