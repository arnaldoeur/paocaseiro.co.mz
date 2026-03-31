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
    const { number, text, media, mediatype, fileName, caption } = await req.json()
    
    // Config (Fallback to hardcoded for immediate reliability, but secrets are preferred)
    const INSTANCE = Deno.env.get('WHATSAPP_INSTANCE') || 'Zyph Tech, Lda'
    const API_KEY = Deno.env.get('WHATSAPP_API_KEY') || '24724DC5AA2F-4CBF-9013-9C645CF4E565'
    const BASE_URL = 'https://wa.zyphtech.com'

    let endpoint = `/message/sendText/${encodeURIComponent(INSTANCE)}`
    let body: any = { 
        number, 
        options: { delay: 1000, presence: 'composing' }, 
        text 
    }

    if (media) {
      endpoint = `/message/sendMedia/${encodeURIComponent(INSTANCE)}`
      body = { 
          number, 
          options: { delay: 1500, presence: 'composing' }, 
          mediatype, 
          fileName, 
          caption, 
          media 
      }
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { 
          "Content-Type": "application/json", 
          "apikey": API_KEY 
      },
      body: JSON.stringify(body),
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
