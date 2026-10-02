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

## Promoções com foto (disparo no WhatsApp)

Cada promoção usa um template de categoria **Marketing**, com cabeçalho do tipo **Imagem**.
A foto em si é escolhida na hora do disparo (`--imagem`), então o mesmo template serve para várias promoções.

Exemplo `promo_zind`:

```
Cabeçalho: [Imagem]
Corpo:
Oi, {{1}}! 💛
Preparamos uma novidade especial no Zind pra você e sua família. Confira na imagem!
Quer saber mais? É só responder esta mensagem.
Rodapé: Responda SAIR para não receber mais promoções.
```

No disparo: `--template promo_zind --param "{{nome}}" --imagem https://...`
