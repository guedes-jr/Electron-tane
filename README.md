<div align="center">
  <img src="build/icon.png" width="120" height="120" alt="TANE Logo" />
  <h1>Faturas TANE</h1>
  <p>Software Desktop construído com Electron focado no gerenciamento de clientes, controle de consumo energético e exportação de extratos e relatórios limpos.</p>
</div>

---

## 📌 Visão Geral

O projeto **Faturas TANE** é uma aplicação nativa de Desktop (cross-platform), construída com base em tecnologias web robustas (`Node.js`, `Electron`, `HTML/CSS` Nativo), voltada para gerenciar os lançamentos de compensação de planos de assinaturas solares/energéticas, gerar demonstrativos realistas e exportá-los em **PDF** formatado e tabelas **.XLSX**.

### 💼 Principais Funcionalidades

- **Controle de Acesso Segregado**: Tela de Login segura com validação de administrador.
- **Gerenciador de Clientes**: Cadastro rápido, atualização de dados cadastrais (Unidade Consumidora, CPF/CNPJ, Distribuidora) e deleção limpa.
- **Lançamentos Mensais Autônomos**: Formulário inteligente com cálculos matemáticos autossuficientes e somatórias automáticas de economia acumulada global (`Carteira Solar`).
- **Exportação XLSX em Lote**: Funcionalidade nativa nativa de filtragem e exporação do banco de dados em lote no formato Excel.
- **Visualização & Mockup Realista**: Sistema robusto de recriação de Faturas de Energia/Boleto para Impressão e Envio.
- **Suporte Multicamada para PDF**: Captura otimizada, invisível (Background) e direta para extensão formato `.pdf`.

### 🌅 Capturas de Tela

<div align="center">
  <img src="assets/img/screenshot1.png" alt="Tela de Login" width="48%" style="border-radius: 8px; border: 1px solid #ddd;"/>
  <img src="assets/img/screenshot2.png" alt="Tela de Clientes" width="48%" style="border-radius: 8px; border: 1px solid #ddd;"/>
</div>

---

## ⚙️ Tecnologias Utilizadas

- **Electron** (`^41.x`): Framework base que isola o ambiente Chromium nativo para hospedar a interface.
- **Node.js**: Operações assíncronas do Sistema Operacional via Electron IPC (Inter-Process Communication): acesso e escrita assíncrona ao FileSystem (`fs`).
- **Vanilla JS & UI**: Interface livre de abstrações superpesadas. A manipulação de comportamento e responsividade é feita nativamente com seletores diretos de DOM de altíssima performance.
- **XLSX (SheetJS)**: Biblioteca para empacotamento do formato Excel a nível local das tabelas internas.

---

## 🚀 Como Rodar o Ambiente de Desenvolvimento

Certifique-se de que possui o pacote base do **Node.js** (versão LTS recomendável) e NPM ativados na sua máquina.

1. **Clone do repositório ou obtenha a pasta raiz:**
   Navegue via terminal para ela.
2. **Baixe todas as dependências do `package.json`:**
   ```bash
   npm install
   ```
3. **Inicie o servidor de testes nativo na tela:**
   ```bash
   npm start
   ```

---

## 📦 Como Compilar a Versão de Produção (Instalador .exe)

Configuramos o pacote definitivo via **`electron-builder`**, garantindo suporte de compilação facilitado a um instalador único NSIS.

Basta rodar no seu terminal (Em aparelhos host **Windows** ou linux equipados com `wine32` habilitado):
```bash
npm run build:win
```
Após um término bem-sucedido, procure na nova pasta `dist/` gerada pelo script o seu arquivo final **`Faturas TANE Setup 0.1.0.exe`**.

---

<p align="center">
  Desenvolvido sob demanda - 2026<br>
  <i>Energia e Gestão na palma da sua mão.</i>
</p>
