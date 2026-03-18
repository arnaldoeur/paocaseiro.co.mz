# Manter o Banco de Dados Ativo (Keep-Alive)

O Supabase pausa projetos inativos após uma semana. Para evitar isso, você deve configurar um serviço de "ping" automático.

## Passos para configurar o cron-job.org (Grátis)

1.  Crie uma conta em [cron-job.org](https://cron-job.org).
2.  Clique em **"Create Cronjob"**.
3.  **Título**: `Pão Caseiro Keep Alive`.
4.  **URL**: `https://paocaseiro.co.mz/` (Sua URL principal).
5.  **Execution schedule**: Escolha "Every day" ou "Every 2 days".
6.  Clique em **Create**.

Isso garantirá que seu site receba uma visita regular, mantendo o banco de dados do Supabase "quente" e evitando que ele seja pausado por inatividade.

---

## Recomendação Técnica
Se preferir uma chamada direta ao banco (mais garantido):
- **URL**: `https://bqiegszufcqimlvucrpm.supabase.co/rest/v1/products?select=id&limit=1`
- **Método**: `GET`
- **Headers**:
    - `apikey`: *Sua VITE_SUPABASE_ANON_KEY*
    - `Authorization`: `Bearer *Sua VITE_SUPABASE_ANON_KEY*`
