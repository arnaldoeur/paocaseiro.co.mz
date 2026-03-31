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
    const payload = await req.json()
    
    // Config
    const API_KEY = Deno.env.get('RESEND_API_KEY') || 're_S6EgeUY6_L24YuNaVSrmAC265zq9wQxwh'
    const RESEND_URL = 'https://api.resend.com/emails'

    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${API_KEY}` 
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: response.status,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
