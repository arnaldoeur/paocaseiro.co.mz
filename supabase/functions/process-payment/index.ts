import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Request start: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    let action = url.searchParams.get('action');
    let id = url.searchParams.get('id');
    let payload: any = {};

    // For POST requests, parse body reliably
    if (req.method === 'POST') {
        const bodyText = await req.text();
        try {
            payload = JSON.parse(bodyText);
            if (!action && payload.action) action = payload.action;
            if (!id && payload.id) id = payload.id;
        } catch (e) {
            console.error(`[${requestId}] Body parse error:`, e.message);
        }
    }

    console.log(`[${requestId}] Action: ${action || 'initiate'}, Time elapsed: ${Date.now() - startTime}ms`);

    // Config
    const API_KEY = Deno.env.get('PAYSUITE_API_KEY') || '1298|OxFmkooNPDC14WPRIjomqAyJ0np4wp22Fm12j1pt76fd238e';
    const PAYSUITE_URL = 'https://paysuite.tech/api/v1/payments';
    
    // Timeout promise (increased to 12s for slower gateway responses)
    const timeoutSeconds = 12;
    const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Gateway Timeout')), ms));

    if (action === 'verify' && id) {
       console.log(`[${requestId}] Verifying transaction: ${id}`);
       const apiStart = Date.now();
       
       const fetchPromise = fetch(`${PAYSUITE_URL}/${id}`, {
         method: "GET",
         headers: { 
             "Accept": "application/json", 
             "Authorization": `Bearer ${API_KEY}` 
         },
       });

       const response = await Promise.race([fetchPromise, timeout(timeoutSeconds * 1000)]) as Response;
       const result = await response.json();
       
       console.log(`[${requestId}] PaySuite Verify Response (${response.status}) in ${Date.now() - apiStart}ms`);
       console.log(`[${requestId}] Verify Body:`, JSON.stringify(result));
       
       const isSuccess = response.status >= 200 && response.status < 300;
       const data = result.data || result;
       
       // Improved status extraction
       // We prioritize specific payment status fields over generic API response status
       let status = data.payment_status || data.transaction_status || (result.data ? result.data.status : null);
       
       // If no transaction-specific status is found, we do NOT fallback to result.status (which is often just "OK")
       // Unless result.status is a known payment status (unlikely for PaySuite API)
       if (!status && result.status && !['OK', 'SUCCESS', 'SUCCESSFUL'].includes(result.status.toUpperCase())) {
           status = result.status;
       }

       const responseBody = JSON.stringify({
         success: isSuccess,
         data: { ...data, status: status },
         message: isSuccess ? undefined : (result.message || 'Erro na PaySuite')
       });

       console.log(`[${requestId}] Total execution: ${Date.now() - startTime}ms`);
       return new Response(responseBody, {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: response.status,
       });

    } else {
       // Initiation (POST)
       console.log(`[${requestId}] Initiating payment. Payload:`, JSON.stringify(payload));
       const apiStart = Date.now();
       
       const fetchPromise = fetch(PAYSUITE_URL, {
         method: "POST",
         headers: { 
             "Content-Type": "application/json", 
             "Accept": "application/json", 
             "Authorization": `Bearer ${API_KEY}` 
         },
         body: JSON.stringify(payload),
       });

       const response = await Promise.race([fetchPromise, timeout(timeoutSeconds * 1000)]) as Response;
       const result = await response.json();
       
       console.log(`[${requestId}] PaySuite Initiate Response (${response.status}) in ${Date.now() - apiStart}ms`);
       console.log(`[${requestId}] Initiate Body:`, JSON.stringify(result));
       
       const isSuccess = response.status >= 200 && response.status < 300;
       const data = result.data || result;
       
       // Robust detection of key fields
       const checkout_url = data.checkout_url || data.url || data.redirect_url || result.checkout_url;
       const txId = data.id || data.transaction_id || result.id;
       
       let status = data.payment_status || data.transaction_status || (result.data ? result.data.status : null) || result.status;
       if (status && (status.toLowerCase() === 'success' || status.toLowerCase() === 'ok')) {
           if (data.status && data.status !== status) status = data.status;
       }

       const responseBody = JSON.stringify({
         success: isSuccess,
         data: {
           ...data,
           checkout_url,
           id: txId,
           status: status
         },
         message: isSuccess ? undefined : (result.message || 'Erro na PaySuite')
       });

       console.log(`[${requestId}] Total execution: ${Date.now() - startTime}ms`);
       return new Response(responseBody, {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: response.status,
       });
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[${requestId}] Error after ${elapsed}ms: ${error.message}`);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      message: error.message === 'Gateway Timeout' ? 'O servidor de pagamento demorou muito a responder. Tente novamente.' : 'Erro interno no sistema de pagamento.'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error.message === 'Gateway Timeout' ? 504 : 400,
    });
  }
})
