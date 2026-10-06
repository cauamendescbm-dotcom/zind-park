/**
 * Grupos de sinônimos. Uma intenção lista os grupos que fazem sentido para ela;
 * qualquer variação do grupo na mensagem soma +3 no score.
 * Escreva as variações como as pessoas escrevem (com ou sem acento, tanto faz).
 */
export const synonyms: Record<string, string[]> = {
  saudacao: ["oi", "ola", "oie", "bom dia", "boa tarde", "boa noite", "eai", "e ai", "hello", "opa", "oii", "oiee", "tudo bem"],
  parque: ["parque", "brinquedo", "atracao", "espaco kids"],
  funcionamento: ["como funciona", "funciona como", "como e o parque", "como que funciona", "regras do parque", "como faz para entrar", "explica"],
  horario: ["horario", "hora", "abre", "abrem", "fecha", "fecham", "aberto", "funcionamento", "ate que horas", "que horas"],
  diasSemana: ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo", "fim de semana", "final de semana", "hoje", "amanha"],
  localizacao: ["endereco", "onde fica", "localizacao", "local", "como chegar", "como chego", "fica onde", "rua", "mapa", "maps", "bairro", "localiza"],
  reserva: ["reserva", "reservar", "agendar", "agendamento", "antecipado", "antecipada", "comprar antes", "marcar horario", "chegar direto", "sem reservar", "sem reserva", "lista de espera"],
  preco: ["preco", "valor", "quanto custa", "quanto e", "quanto fica", "custa", "cobra", "cobram", "quanto sai", "tabela", "pagar", "paga", "pagam", "ingresso", "entrada"],
  crianca: ["crianca", "filho", "filha", "bebe", "nenem", "menino", "menina", "pequeno", "pequena", "kids", "infantil", "meu filho", "minha filha"],
  idade: ["ano", "anos", "idade", "mes", "meses", "aninho", "aninhos"],
  adulto: ["adulto", "pai", "mae", "acompanhante", "responsavel", "avo", "vovo", "tio", "tia", "grande", "maior de idade"],
  brincar: ["brincar", "brinca", "brinquedo", "pular", "diversao"],
  pagamento: ["pix", "cartao", "credito", "debito", "dinheiro", "forma de pagamento", "formas de pagamento", "parcela", "parcelar", "aceita", "aceitam", "maquininha"],
  meia: ["meia", "meias", "antiderrapante", "meinha", "sock"],
  pcd: ["pcd", "deficiencia", "deficiente", "pessoa com deficiencia", "cadeirante", "necessidade especial", "necessidades especiais", "sindrome de down", "down"],
  autismo: ["autista", "autismo", "tea", "espectro autista", "neurodivergente", "tdah"],
  desconto: ["desconto", "meia entrada", "beneficio", "laudo", "cid", "carteirinha", "gratuidade", "paga meia"],
  aniversario: ["aniversario", "niver", "aniver", "aniversariante", "parabens", "aniv"],
  comida: ["comida", "comer", "restaurante", "cafeteria", "pub", "lanche", "lanchonete", "almoco", "janta", "jantar", "porcao", "cafe", "bebida", "cerveja", "chopp", "cardapio", "menu", "salgado", "doce", "sobremesa"],
  levarComida: ["levar", "trazer", "de fora", "de casa", "entrar com", "posso levar", "pode levar", "mamadeira", "papinha"],
  festa: ["festa", "festinha", "evento", "comemorar", "comemoracao", "celebrar", "celebracao", "confraternizacao", "fazer o aniversario", "fazer aniversario", "festa infantil"],
  pacote: ["pacote", "pacotes", "plano", "opcoes de festa", "orcamento", "cardapio da festa", "decoracao", "buffet"],
  convidados: ["convidado", "convidados", "pessoas", "criancas convidadas", "lista"],
  humano: ["atendente", "humano", "pessoa", "falar com alguem", "falar com uma pessoa", "alguem da equipe", "gerente", "responsavel pelo atendimento", "ligar", "telefone de voces"],
};
