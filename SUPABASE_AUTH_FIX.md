# Como Corrigir o Erro de Login com Google

> [!IMPORTANT]
> O código do website já está totalmente preparado e correto para o login. Este erro ocorre devido à **configuração interna do Supabase**, que ainda possui o link de testes local (`http://localhost:3000`) como padrão.

## Por que o erro acontece?
1. Ao clicar em "Login com Google", o sistema inicia o processo.
2. Como a URL `https://paocaseiro.co.mz` não está configurada como destino permitido no painel do Supabase, o Supabase "força" o retorno para o endereço padrão (`http://localhost:3000`).
3. Ao mudar abruptamente de domínio, o navegador perde os cookies de segurança, gerando o erro `bad_oauth_state`.

---

## Passos para Resolução (No Painel do Supabase)

### Passo A: Atualizar a "Site URL"
1. Aceda ao seu painel do [Supabase Dashboard](https://supabase.com/dashboard).
2. Selecione o projeto **PAO CASEIRO DB 26**.
3. No menu lateral esquerdo, clique no ícone da engrenagem (**Project Settings**).
4. Clique em **Authentication**.
5. No separador **URL Configuration**, localize o campo **Site URL**.
6. Substitua `http://localhost:3000` por:
   ```text
   https://paocaseiro.co.mz
   ```
7. Clique em **Save** no final da página.

### Passo B: Adicionar URLs de Redirecionamento Adicionais
No mesmo ecrã de **URL Configuration**, procure pelo campo **Redirect URLs** (ou Additional Redirect URLs):
1. Adicione os seguintes links (um por um):
   - `https://paocaseiro.co.mz/dashboard`
   - `http://localhost:3000/dashboard` *(caso queira continuar a testar no PC localmente)*
2. Clique em **Save**.

---

> [!TIP]
> Assim que salvar estas duas configurações, o seu login com Google estará 100% funcional sem que precise de alterar nenhuma linha de código no website.
