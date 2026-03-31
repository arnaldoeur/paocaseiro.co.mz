<div align="center">
  <h1>Pão Caseiro - Web App</h1>
  <p>O sabor que aquece o coração - Lichinga, Niassa</p>
</div>

## 📌 Visão Geral
Esta é a aplicação web completa da **Pão Caseiro** (Frontend React/Vite + Backend Express Node.js). 
Está otimizada para PWA (Progressive Web App) e preparada para ambientes de produção como Hostinger (VPS / Cloud / cPanel Node App).

---

## 🚀 Como Executar Localmente

**Pré-requisitos:** Node.js v18+ 

1. **Instalar dependências**
   ```bash
   npm install
   ```

2. **Configurar as Variáveis de Ambiente**
   Crie um ficheiro `.env` na raiz do projeto com base no ficheiro base e defina:
   ```env
   VITE_SUPABASE_URL=seu_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_anon_key_do_supabase
   ```

3. **Executar em modo de Desenvolvimento (Vite)**
   ```bash
   npm run dev
   ```

---

## 🛠️ Build e Teste de Produção Local

Para compilar a aplicação para produção (Gera os assets otimizados de cliente na pasta `/dist`):
```bash
npm run build
```

Para executar o servidor Express de produção localmente (Hardened com Helmet, CORS, e Compression):
```bash
npm start
```
*(A sua app ficará disponível geralmente em `http://localhost:8080`)*

---

## 🌐 Deploy na Hostinger (Node.js)

Se estiver a alojar a aplicação num ambiente Node.js na Hostinger:

### Método via Terminal / VPS / PM2
1. Confirme que tem o código via Git ou carregado via FTP.
2. Na sua consola/terminal do ambiente Hostinger, faça install focado para produção:
   ```bash
   npm install --production
   ```
3. Gere o build estático de Frontend:
   ```bash
   npm run build
   ```
4. Inicie o servidor usando um gestor de processos, como o `pm2`:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "paocaseiro"
   ```

### Método via Painel (cPanel "Setup Node.js App")
1. Crie a sua aplicação Node.js no painel com o "Application startup file" a apontar para `server.js`.
2. Adicione as variáveis de ambiente necessárias (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) dentro da interface da Hostinger.
3. Carregue o projeto (ignorar a pasta `node_modules` e `.git`).
4. Clique em **Install NPM dependencies**.
5. Obtenha acesso SSH à sua conta pelo painel Terminal do Hospedeiro e corra:
   ```bash
   npm run build
   ```
6. **Reinicie** a app Node.js na interface gráfica da Hostinger. 

---

## 🛠️ Estrutura do Projeto & Troubleshooting

### O que fazer se tiver uma "White Screen" ou erro PWA offline?
- Limpe a cache do navegador (`Application > Service Workers > Unregister` no Chrome).
- Se a cache do Service Worker persistir, mude os valores da sua manifest. 
- Verifique se os caminhos das imagens PWA referenciadas no ficheiro `vite.config.ts` (`/pao_caseiro_hero.png`) existem.

### Pastas Principais:
- `/src` -> Todo o código fonte do Cliente UI (React).
- `/server.js` -> O ficheiro de entrada principal para Servidor Express (Produção).
- `/public` -> Recursos não otimizados globais (PWA manifest assets, sitemap.xml, robots.txt).
- `/scripts` e `/logs_and_debug` -> Ferramentas e logs utilitários.
