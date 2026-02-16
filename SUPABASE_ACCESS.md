# Informações de Acesso ao Supabase - Pão Caseiro

## Credenciais do Projeto

**Project ID:** `odzzshgvgwiaeafyzqiv`

**URL do Projeto:** https://bqiegszufcqimlvucrpm.supabase.co

**Dashboard:** https://supabase.com/dashboard/project/bqiegszufcqimlvucrpm

**Anon Key (Pública):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kenpzaGd2Z3dpYWVhZnl6cWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4Mzc4NTEsImV4cCI6MjA4NDQxMzg1MX0.hMb6jQm3Oqq27kqxxv16qho5qTMDh4OVpCQyCL_GR2o
```

---

## Como Recuperar Acesso

### Opção 1: Recuperar Senha do Email
1. Vá para: https://supabase.com/dashboard/sign-in
2. Clique em "Forgot your password?"
3. Digite o email usado para criar a conta
4. Verifique sua caixa de entrada

### Opção 2: Verificar Emails Comuns
Tente fazer login com estes emails comuns:
- Email pessoal
- Email da empresa (se houver)
- Email usado para outros serviços de desenvolvimento

### Opção 3: Criar Nova Conta e Migrar
Se não conseguir recuperar:
1. Crie uma nova conta Supabase
2. Crie um novo projeto
3. Execute o script `database_backup_complete.sql` no novo projeto
4. Atualize o arquivo `.env` com as novas credenciais

---

## Arquivos Importantes

1. **database_backup_complete.sql** - Backup completo da estrutura do banco
2. **.env** - Contém as credenciais atuais do Supabase
3. **migrations/** - Pasta com migrações individuais

---

## Próximos Passos

1. **Tente recuperar acesso** usando as opções acima
2. **Se conseguir acessar:**
   - Execute `database_backup_complete.sql` no SQL Editor
   - Isso criará todas as tabelas necessárias
3. **Se não conseguir acessar:**
   - Crie novo projeto Supabase
   - Execute o backup SQL
   - Atualize `.env` com novas credenciais
