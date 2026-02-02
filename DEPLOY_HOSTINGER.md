# Guia de Deploy - Hostinger (paocaseiro.co.mz)

Este guia explica como colocar o seu site online na Hostinger.

## 1. Localização dos Arquivos
Já foi gerada a versão final ("Build") do seu site. Os arquivos estão na pasta:
`c:\Users\arnal\Desktop\WEBSITE\paocasieiro2026\paocasiero2026new\dist`

Esta pasta contém tudo o que é necessário:
- `index.html` (o site principal)
- `.htaccess` (configuração para evitar erros de página 404)
- Pasta `assets` (imagens, estilos, scripts)

## 2. Como Fazer o Upload (Passo a Passo)

### Opção A: Usando o Gerenciador de Arquivos (Hostinger File Manager) - RECOMENDADO
1.  Faça login no painel da **Hostinger**.
2.  Vá em **Sites** -> **paocaseiro.co.mz** -> **Gerenciar**.
3.  No menu lateral ou dashboard, clique em **Gerenciador de Arquivos (File Manager)**.
4.  Entre na pasta **`public_html`**.
    *   *Nota: Se houver um arquivo `default.php` ou `hosting_page`, apague-o.*
5.  Clique no botão de **Upload** (seta para cima) no topo direito.
6.  Selecione **TODOS** os arquivos e pastas que estão dentro da sua pasta `dist` local (não suba a pasta `dist` em si, suba o *conteúdo* dela).
    *   Ou seja, você deve ver `index.html`, `.htaccess` e a pasta `assets` diretamente dentro de `public_html`.

### Opção B: Usando FileZilla (FTP)
1.  Abra o FileZilla.
2.  Conecte-se com os dados de FTP da Hostinger:
    *   Host: `ftp.paocaseiro.co.mz` (ou o IP fornecido pela Hostinger)
    *   Usuário: (seu usuário FTP)
    *   Senha: (sua senha)
3.  No lado direito (Servidor), abra a pasta `public_html`.
4.  No lado esquerdo (Seu PC), navegue até `c:\Users\arnal\Desktop\WEBSITE\paocasieiro2026\paocasiero2026new\dist`.
5.  Selecione tudo no lado esquerdo e arraste para o lado direito.

## 3. Configurações Importantes já Feitas
- **Roteamento (.htaccess)**: O arquivo `.htaccess` já foi criado e incluído. Ele garante que se alguém acessar `paocaseiro.co.mz/gallery` diretamente, a página abrirá corretamente sem erro 404.
- **Variáveis de Ambiente**: As chaves do Supabase (Banco de Dados) e APIs já foram "embutidas" no código durante o build. Não precisa configurar `.env` no servidor.

## 4. Teste Final
Após o upload:
1.  Acesse `https://paocaseiro.co.mz`.
2.  Navegue entre as páginas (Menu, Galeria, etc.).
3.  Recarregue a página estando na Galeria (F5). Se o `.htaccess` estiver correto, a página recarregará sem erros.
4.  Teste o formulário de contacto.

**Pronto! Seu site está no ar.**
