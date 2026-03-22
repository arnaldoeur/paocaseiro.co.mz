import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }});
  }

  try {
    const { logs } = await req.json();
    
    // Requisito do cliente: Guardar no hard code escondido, apenas roda no backend do edge function!
    const openRouterKey = "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";

    if (!openRouterKey) {
      throw new Error("A chave API do OpenRouter não foi encontrada no código.");
    }

    const systemPrompt = `Você é o Auditor IA Oficial do sistema 'Pão Caseiro'. A sua função é analisar métricas, eventos de log e o comportamento dos utilizadores da nossa plataforma.
Recebeu uma lista de eventos JSON filtrados recentes. Elabore um relatório analítico direto e conciso, em Markdown.

**Foco:**
1. Resumo da Atividade Global.
2. Identificação de Padrões Críticos ou Suspeitos (ex: Logins falhados sucessivos, Erros de Checkout).
3. Jornada de Utilizadores: O que estão tipicamente a tentar fazer? Quais as ações que repetem mais?

Escreva em Português de Portugal. Assuma um tom analítico, sénior e construtivo.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Logs recentes para análise: \n\n" + JSON.stringify(logs) }
        ]
      })
    });

    const aiData = await response.json();
    const text = aiData.choices?.[0]?.message?.content || "Houve um problema a processar a análise com a IA (OpenRouter).";

    return new Response(JSON.stringify({ report: text }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
