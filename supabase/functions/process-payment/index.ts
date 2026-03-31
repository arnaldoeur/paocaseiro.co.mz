import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const id = url.searchParams.get('id');

    // Config
    const API_KEY = Deno.env.get('PAYSUITE_API_KEY') || '1298|OxFmkooNPDC14WPRIjomqAyJ0np4wp22Fm12j1pt76fd238e';
    const PAYSUITE_URL = 'https://paysuite.tech/api/v1/payments';

    if (action === 'verify' && id) {
       // Verification (GET)
       const response = await fetch(`${PAYSUITE_URL}/${id}`, {
         method: "GET",
         headers: { 
             "Accept": "application/json", 
             "Authorization": `Bearer ${API_KEY}` 
         },
       });
       const result = await response.json();
       return new Response(JSON.stringify(result), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: response.status,
       });
    } else {
       // Initiation (POST)
       const payload = await req.json();
       const response = await fetch(PAYSUITE_URL, {
         method: "POST",
         headers: { 
             "Content-Type": "application/json", 
             "Accept": "application/json", 
             "Authorization": `Bearer ${API_KEY}` 
         },
         body: JSON.stringify(payload),
       });
       const result = await response.json();
       return new Response(JSON.stringify(result), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: response.status,
       });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
})
