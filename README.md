# MovenPro+

Sistema ERP e PDV moderno para restaurantes e conveniências.

---

## 🚀 Tecnologias utilizadas

- JavaScript
- Firebase
- Firestore
- Cloud Functions
- HTML5
- CSS3
- PWA

---

## 📋 Funcionalidades

✅ PDV de vendas  
✅ Controle de estoque  
✅ Financeiro  
✅ Dashboard administrativo  
✅ Controle de mesas  
✅ Integração cozinha/bar  
✅ Multiusuário  
✅ Sistema responsivo  
✅ PWA instalável  

---

## 🔥 Diferenciais

- Sistema em tempo real com Firebase
- Estrutura moderna e escalável
- Integração entre setores
- Interface moderna e intuitiva
- Arquitetura focada em performance

---

## 🚧 Status do projeto

Em desenvolvimento ativo.

---

## 👨‍💻 Desenvolvedor

Carlos Eduardo Rodrigues Pereira

🔗 LinkedIn:
https://www.linkedin.com/in/carlosdevjoinville/

---

## 📌 Projeto

MovenPro+ é um sistema desenvolvido para gerenciamento de restaurantes, conveniências e estabelecimentos comerciais.


- Estoque agora tem botão **Adicionar produto** para produtos fora do XML.
- Produto manual permite código interno fácil, código de barras opcional, foto, categoria, custo, venda, quantidade, mínimo e validade.
- O sistema gera automaticamente o próximo código interno, mas o admin pode trocar.
- No PDV, o funcionário pode buscar ou vender pelo código interno curto, exemplo: `1001`, `1002`, `3001`.
- Funcionário/caixa continua sem permissão para adicionar produto, alterar preço ou acessar financeiro.


## Versão com sugestões adicionais
- Central de Alertas
- Busca Global simples
- Organização: ações em PDV/Estoque/Financeiro, análise em Dashboard/Relatórios, configurações em Configurações.

## Versão V16 - Menu Fiscal / SEFAZ
- Página `fiscal.html` atualizada com estrutura fiscal profissional.
- Cadastro fiscal da empresa: CNPJ, IE, CRT, regime e endereço.
- Configuração NFC-e/SEFAZ: ambiente, série, numeração, CSC, certificado A1 e URL backend.
- Área de produtos fiscais com NCM, CFOP, CST/CSOSN, CEST e unidade.
- Área XML/DANFE, cancelamentos, inutilização e contingência preparada.
- Aba de backend fiscal próprio com arquitetura para Firebase Functions + SEFAZ.

Observação: o produto inclui módulo Fiscal/NFC-e. A emissão real em produção deve ser ativada na implantação fiscal assistida, com backend seguro, certificado digital A1, CSC e homologação junto à SEFAZ.


## v20 - Financeiro avançado
- Contas Fixas: aluguel, água, luz, internet, contador, funcionários e outros custos recorrentes.
- Markup / Formação de Preços: calcula preço sugerido usando custo do produto, impostos, taxas, perdas, margem e contas fixas.
- Integração preparada com Estoque para aplicar preço de venda futuramente no banco online.


## v21 - Markup automático no Estoque
- Removido menu separado de Markup.
- Contas Fixas agora ficam dentro do Financeiro.
- Estoque mostra Markup automático ao lado da Margem de cada produto.
- Cálculo considera custo do produto, vendas médias, despesas mensais, impostos, taxas, perdas e margem desejada.


## v22 - Markup IA Inteligente
- Markup automático por categoria.
- Preço mínimo, ideal e premium por produto.
- Análise de giro e vendas mensais.
- Rateio inteligente de contas fixas.
- Status visual:
  - 🔴 preço baixo
  - 🟡 lucro apertado
  - 🟢 saudável
  - 🔵 premium
- Botão aplicar preço ideal automaticamente.
