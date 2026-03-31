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
    const TURBO_TOKEN = Deno.env.get('TURBO_TOKEN') || 'WTJlMzZpeDNNb25WR3hZK0NhcG1DUT09'
    const TURBO_URL = 'https://my.turbo.host/api/international-sms/submit'

    // If payload doesn't have user_token, use the default
    if (!payload.user_token) {
        payload.user_token = TURBO_TOKEN;
    }

    const response = await fetch(TURBO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
