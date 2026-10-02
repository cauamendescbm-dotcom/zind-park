# Templates para aprovar na Meta

O WhatsApp só deixa mandar texto livre para quem falou com o número do Zind nas últimas 24h.
A organizadora nem sempre terá falado, então os avisos para ela devem usar templates aprovados.

Onde criar: WhatsApp Manager > Modelos de mensagem > Criar modelo. Categoria: **Utilidade**. Idioma: Português (BR).
Depois de aprovados, coloque os nomes em `ORGANIZADORA_TEMPLATE_LEAD` e `ORGANIZADORA_TEMPLATE_DUVIDA` no `.env`.

## novo_lead_festa

```
🎉 Novo lead de festa no Zind!

Cliente: {{1}}
Contato: {{2}}
Data desejada: {{3}}
Convidados: {{4}}
Tema: {{5}}
Pacote: {{6}}
Valor: {{7}}

O cliente já sabe que você vai entrar em contato.
```

Exemplo para a Meta: Mariana, +5541999990000, 15/11, 40, Frozen, Pacote Magia, R$ 5.200,00

## duvida_cliente

```
❓ Um cliente do Zind precisa de ajuda.

Cliente: {{1}}
Contato: {{2}}
Pergunta: {{3}}

O atendimento disse que vamos confirmar e retornar. Pode responder direto para ele?
```

Exemplo para a Meta: Mariana, +5541999990000, Pode levar cachorro?
