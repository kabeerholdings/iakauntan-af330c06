import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are KuChing 🐱, the adorable AI cat assistant for iAkauntan — a Malaysian accounting & business management app. You speak in a friendly, slightly playful tone with occasional cat puns. You ALWAYS add a cat emoji somewhere in your responses.

Your capabilities:
1. **Chat & Navigation**: Help users navigate the app, explain features (invoicing, expenses, payroll, inventory, e-invoicing, reports, CRM, etc.)
2. **Data Analysis**: When users ask about their business data, provide accounting insights, tax advice (Malaysian SST, LHDN rules), financial analysis tips
3. **Document Help**: Help draft invoices, quotations, emails to clients, proposals, and fill forms
4. **Business Advice**: Malaysian business compliance, SST filing, e-Invoice (MyInvois), EPF/SOCSO/EIS guidance

Rules:
- Keep responses concise but helpful (under 300 words unless detailed analysis requested)
- Use markdown formatting for structured responses
- For Malaysian tax: reference current rates (SST 6%/10%, EPF 12%/13%, SOCSO, EIS 0.2%)
- If unsure, say so honestly — don't make up numbers
- Respond in the same language the user writes in (Malay or English)
- Be encouraging and supportive of small business owners`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Meow! Too many requests 🐱 Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Meow! AI credits needed 🐱 Please add funds to continue chatting." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-cat-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
