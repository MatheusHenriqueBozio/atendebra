# AtendeBra · protótipo navegável

Protótipo do caso de estudo AtendeBra (atendimento Bradesco): contestação de Pix e cancelamento de cartão.
Site estático (HTML, CSS e JS puros), sem build. Todos os dados são fictícios.

## O que dá pra fazer
- 4 jornadas guiadas e acesso direto às 14 telas pelo menu lateral
- Pix: atalhos, filtros (tipo, valor, data), menu de cada transação, detalhe (com bloqueio e MED), pagamento, contatos
- Cartão: motivo, lista de motivos, entrega por correspondência ou agência (aviso A/B), endereço, confirmação, processando e resultado para os 8 motivos com caminho definido
- Tecla `H` mostra as áreas clicáveis; `Esc` ou `←` volta; links profundos por `#tela`

## Rodar
    npx serve .

## Publicar
    gh repo create atendebra-prototipo --public --source . --push
    npx vercel --prod
