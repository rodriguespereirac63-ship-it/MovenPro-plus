# Checklist de Entrega MovenPro

## Correções aplicadas
- Segurança Firebase revisada com isolamento por empresaId.
- Bloqueio de login por página com Firebase Auth.
- Caixa aberto/fechado real no PDV.
- Venda bloqueada sem caixa aberto.
- Sangria, reforço e fechamento registrados.
- Venda, financeiro, caixa, produtos e backup preparados para Firestore.
- firebase.json corrigido para publicar somente a pasta public.
- firestore.rules incluído no deploy.
- Menu Alertas corrigido.
- Backup manual real com download JSON e registro no Firebase quando online.

## Antes de entregar ao cliente
1. Criar usuário no Firebase Authentication.
2. Criar documento em Firestore: usuarios/{UID}
3. Usar campos:
   - nome
   - email
   - perfil: admin ou caixa
   - empresaId: moven001
   - ativo: true
4. Rodar:
   firebase deploy
5. Entrar no sistema.
6. Abrir caixa.
7. Fazer venda teste.
8. Conferir estoque, financeiro e caixa.
9. Fechar caixa.
10. Fazer backup em Configurações > Segurança > Backup manual.

## Observação
A integração fiscal real com SEFAZ ainda depende de certificado digital A1, CNPJ, ambiente de homologação e backend fiscal.
