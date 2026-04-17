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

    // First attempt
    let response = await fetch(RESEND_URL, {
      method: "POST",
      headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${API_KEY}` 
      },
      body: JSON.stringify(payload),
    })

    let result = await response.json()
    let status = response.status
    let resendMode = 'production'

    // Fallback logic for Unverified Domain (403) or Sandbox Limits (422)
    // If the error is 403 (Forbidden) and we are trying to send from our custom domain,
    // we fallback to onboarding@resend.dev to ensure delivery for account owners/admins.
    if (status === 403 || (status === 422 && result.message?.includes('sandbox'))) {
      console.warn(`[Mail-Fallback] Primary delivery failed (${status}). Attempting sandbox fallback via onboarding@resend.dev...`)
      
      const fallbackPayload = {
        ...payload,
        from: 'Pão Caseiro <onboarding@resend.dev>',
        bcc: undefined, // BCC is strictly forbidden in sandbox mode
        cc: undefined
      }

      const fallbackResponse = await fetch(RESEND_URL, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${API_KEY}` 
        },
        body: JSON.stringify(fallbackPayload),
      })

      const fallbackResult = await fallbackResponse.json()
      
      // If fallback succeeds or gives a different error, update the output
      if (fallbackResponse.status === 200) {
        result = { 
          ...fallbackResult, 
          _fallback: true, 
          _message: 'Delivered via Sandbox. Domain verification required for production email.' 
        }
        status = 200
        resendMode = 'sandbox'
      } else {
        // If even the fallback fails, we include both errors for debugging
        result = {
          primary_error: result,
          fallback_error: fallbackResult,
          message: 'Both primary and sandbox delivery failed.'
        }
        status = fallbackResponse.status
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "X-Resend-Mode": resendMode
      },
      status: status,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
