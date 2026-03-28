# 🚀 Guia de Deploy - Pão Caseiro

Este guia ajuda a garantir que o sistema funcione corretamente após o envio dos ficheiros para o servidor.

## 1. Estrutura de Pastas (Crucial)
Ao realizar o build com `npm run build`, o Vite gera uma pasta chamada `dist/`.

**Ação:** Deve copiar **apenas o conteúdo** da pasta `dist/` para a raiz da sua pasta pública no servidor (quase sempre `public_html`).

### Exemplo de Estrutura Correta no Servidor:
```text
/public_html
  ├── index.html
  ├── assets/
  ├── images/
  ├── paysuite_proxy.php (Novo)
  ├── .htaccess (Para suporte a rotas SPA)
  └── favicon.ico
```

---

## 2. Suporte a Rotas (SPA)
Como este sistema é uma SPA (Single Page Application), o servidor precisa de saber redirecionar todas as rotas para o `index.html`. 

**Ação:** Crie um ficheiro `.htaccess` na raiz (`public_html`) com o seguinte conteúdo:

```apacheconf
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 3. Variáveis de Ambiente (.env)
Certifique-se de que o seu ficheiro `.env` no servidor tem as credenciais de produção corretas. O sistema depende disto para o WhatsApp funcionar:

```env
VITE_SUPABASE_URL=seu_url
VITE_SUPABASE_ANON_KEY=sua_chave
VITE_WHATSAPP_API_URL=https://wa.zyphtech.com
VITE_WHATSAPP_INSTANCE_NAME=PAOCASEIRO25
VITE_WHATSAPP_API_KEY=sua_chave_evolution
VITE_OPENROUTER_API_KEY=sua_chave_ia
```

---

## 4. Pagamentos (PaySuite)
O ficheiro `paysuite_proxy.php` que incluímos é **obrigatório** em produção. Ele serve para o JavaScript conseguir falar com a PaySuite sem erros de segurança (CORS). Certifique-se de que ele está na mesma pasta que o `index.html`.

---

**Pão Caseiro está pronto para brilhar!** ✨🥖
