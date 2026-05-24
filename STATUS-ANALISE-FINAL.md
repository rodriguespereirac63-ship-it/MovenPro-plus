# Status final MovenPro

## Corrigido nesta versão
- `firebase.json` sem Functions para não exigir Blaze.
- Firestore Rules ajustadas.
- Caixa/funcionário pode atualizar estoque após venda.
- Backup com regra correta.
- Menu Alertas corrigido.
- Hosting usando pasta `public`.

## Comando de deploy
firebase deploy --only hosting,firestore:rules

## Fiscal
O MovenPro+ pode ser vendido com módulo Fiscal/NFC-e incluído: cadastro fiscal, produtos fiscais, XML, DANFE, contingência, cancelamento e inutilização ficam organizados no sistema.

Para emissão real em produção, a ativação deve ser feita por implantação fiscal assistida: certificado A1, CSC, CNPJ/IE, ambiente de homologação, backend seguro e validação junto à SEFAZ do estado do cliente.
