/**
 * Página /privacidade: a Meta pede o endereço de uma política de privacidade para deixar o app "Ativo".
 * Texto em linguagem simples, de acordo com a LGPD, sobre o que o atendimento automático guarda.
 */
const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function privacyPage(empresa: string, atualizadoEm = "26/10/2026"): string {
  const nome = escape(empresa);
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Política de Privacidade - ${nome}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px 16px; line-height: 1.6; color: #222; background: #fff; }
  h1 { font-size: 1.6rem; } h2 { font-size: 1.15rem; margin-top: 1.8rem; }
  small { color: #666; }
</style>
</head>
<body>
<h1>Política de Privacidade</h1>
<p><small>Atendimento automático de ${nome} pelo WhatsApp e pelo Instagram. Atualizada em ${atualizadoEm}.</small></p>

<p>Esta página explica quais dados o nosso atendimento automático usa quando você conversa com ${nome}
pelo WhatsApp ou pelo Direct do Instagram, por que usamos e como você pode pedir para apagar.
Seguimos a Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD).</p>

<h2>1. Quais dados guardamos</h2>
<ul>
  <li>Seu nome e seu número de WhatsApp, ou seu nome e usuário do Instagram, como aparecem para nós na conversa.</li>
  <li>As mensagens de texto que você manda e as que respondemos.</li>
  <li>As informações que você mesmo passa para pedir um orçamento de festa (por exemplo, pacote e número de convidados).</li>
  <li>Se você aceitou ou recusou receber avisos e novidades.</li>
</ul>
<p>Fotos, áudios e vídeos não são lidos pelo atendimento automático.</p>

<h2>2. Para que usamos</h2>
<ul>
  <li>Responder suas dúvidas e continuar a conversa de onde parou.</li>
  <li>Passar o seu pedido de festa ou a sua dúvida para a pessoa da equipe que vai te atender.</li>
  <li>Mandar avisos e novidades, só se você tiver aceitado. Responda <strong>SAIR</strong> a qualquer momento para parar.</li>
</ul>
<p>Não vendemos seus dados e não usamos para nada além do atendimento.</p>

<h2>3. Com quem os dados são compartilhados</h2>
<ul>
  <li><strong>Meta</strong> (WhatsApp e Instagram), que entrega as mensagens.</li>
  <li><strong>Anthropic</strong>, empresa da inteligência artificial que ajuda a escrever algumas respostas. Ela recebe só o trecho da conversa necessário para responder.</li>
  <li>O serviço de banco de dados e o servidor onde o atendimento funciona, que guardam o histórico com segurança.</li>
  <li>A equipe de ${nome}, quando a conversa precisa de uma pessoa.</li>
</ul>

<h2>4. Por quanto tempo</h2>
<p>Guardamos o histórico enquanto for útil para o seu atendimento. Você pode pedir para apagar a qualquer momento.</p>

<h2>5. Seus direitos e como apagar seus dados</h2>
<p>Você pode pedir para ver, corrigir ou apagar seus dados. É só mandar uma mensagem no mesmo WhatsApp ou Instagram
dizendo <strong>"quero apagar meus dados"</strong>, e a equipe de ${nome} apaga o seu histórico e confirma por lá.</p>

<h2>6. Segurança</h2>
<p>A conexão com o banco de dados é criptografada e só o servidor do atendimento tem acesso a ele.</p>

<h2>7. Mudanças</h2>
<p>Se esta política mudar, a data lá em cima é atualizada.</p>
</body>
</html>
`;
}
