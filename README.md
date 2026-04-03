# TANE Faturas - Starter Electron

Projeto inicial para:
- cadastrar clientes
- lançar dados da fatura mensal
- anexar imagem do boleto
- visualizar o template
- exportar em PDF

## Como rodar

1. Instale o Node.js
2. Abra a pasta do projeto no terminal
3. Rode:

```bash
npm install
npm start
```

## Estrutura

- `src/main.js`: processo principal do Electron
- `src/preload.js`: ponte segura entre interface e Electron
- `src/renderer/index.html`: layout principal
- `src/renderer/styles.css`: estilos do template
- `src/renderer/app.js`: lógica da interface

## Próximo passo sugerido

- trocar JSON por SQLite
- permitir edição do histórico
- importar dados da fatura ENEL
- criar um template mais fiel ao CorelDRAW
- incluir tabela detalhada com todos os itens tarifários
