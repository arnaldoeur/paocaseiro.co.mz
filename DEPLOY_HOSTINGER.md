# Guia de Deploy - Hostinger (paocaseiro.co.mz)

Este guia explica como colocar o seu site online na Hostinger.

## 1. Localização dos Arquivos
Já foi gerada a versão final ("Build") do seu site. Os arquivos estão na pasta:
`c:\Users\Arnaldo Eurico\Desktop\Zyph Dev\paocaseiro.co.mz\paocaseiro.co.mz\dist`

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

## 3. Opção C: Deploy via Git (Automático) - RECOMENDADO ⭐

Esta é a forma mais moderna e rápida. Ao fazer `git push`, o seu site será compilado e enviado automaticamente para a Hostinger.

### Passo 1: Configurar Secrets no GitHub
No seu repositório do GitHub, vá em **Settings** -> **Secrets and variables** -> **Actions** e adicione os seguintes **New repository secret**:

| Nome do Secret | Valor para Copiar e Colar |
|----------------|-----------------------|
| `FTP_SERVER` | `82.25.87.163` |
| `FTP_USERNAME` | `u178468876.paocaseiro.co.mz` |
| `FTP_PASSWORD` | `@Paocaseiro25` |
| `VITE_SUPABASE_URL` | *(Podes ver no teu ficheiro .env)* |
| `VITE_SUPABASE_ANON_KEY` | *(Podes ver no teu ficheiro .env)* |
| `VITE_GEMINI_API_KEY` | *(Podes ver no teu ficheiro .env)* |

### Passo 2: Como Funciona
1. Sempre que fizeres `git push`, o GitHub inicia o build sozinho.
2. Ele gera a pasta `dist` e envia para a Hostinger. É o "mãos-livres" total.

---

## 4. Opção D: Menu Git da Hostinger (Via Token/Webhook)

Este é o método que mencionaste, onde ligas o GitHub diretamente à Hostinger. 

> [!WARNING]
> **Atenção:** Este método apenas "puxa" os ficheiros. Como o teu site precisa de ser "compilado" (`npm run build`), este método só funciona se tu subires a pasta `dist` para o GitHub (o que não é recomendado) ou se usares a **Opção C (GitHub Actions)** que eu configurei, que já faz o build sozinho.

### Como configurar (Se quiseres usar o painel Hostinger):

#### Passo 1: Criar o Token no GitHub
Para repositórios privados, a Hostinger precisa de um "Personal Access Token" (PAT):
1.  No GitHub, clica na tua foto (canto superior direito) -> **Settings**.
2.  No fundo da barra lateral esquerda, clica em **Developer settings**.
3.  Clica em **Personal access tokens** -> **Tokens (classic)**.
4.  Clica em **Generate new token** -> **Generate new token (classic)**.
5.  **Note**: Dá um nome (ex: "Deploy Hostinger").
6.  **Expiration**: Escolhe "No expiration" ou um prazo longo.
7.  **Select scopes**: Marca a caixa **`repo`** (isto permite à Hostinger ler os teus repositórios privados).
8.  Clica em **Generate token** no fundo da página.
9.  **IMPORTANTE**: Copia o token agora! Não o verás novamente.

#### Passo 2: Vincular na Hostinger
1.  Na Hostinger: Vai a **Avançado** ou **Website** -> **Git**.
2.  No campo **Repository URL**, usa este formato:
    `https://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@github.com/arnaldoeur/paocaseiro.co.mz.git`
3.  Coloca a Branch (ex: `main`) e clica em **Create**.
3.  **No GitHub:**
    *   Vai a **Settings** -> **Webhooks** -> **Add Webhook**.
    *   Cola o URL da Hostinger no campo **Payload URL**.
    *   Escolha `application/json`.
    *   Pronto! Cada push agora "avisa" a Hostinger para atualizar os ficheiros.

---

## 5. Configurações Importantes já Feitas
- **Roteamento (.htaccess)**: O arquivo `.htaccess` já foi criado e incluído na pasta `public` para que o build final já o contenha.
- **Variáveis de Ambiente**: Se usares a **Opção C (GitHub Actions)**, as chaves do Supabase são inseridas durante o build automático usando os "Secrets" do GitHub.

## 6. Teste Final
Após o upload:
1.  Acesse `https://paocaseiro.co.mz`.
2.  Navegue entre as páginas (Menu, Galeria, etc.).
3.  Recarregue a página estando na Galeria (F5). Se o `.htaccess` estiver correto, a página recarregará sem erros.
4.  Teste o formulário de contacto.

**Pronto! Seu site está no ar.**
