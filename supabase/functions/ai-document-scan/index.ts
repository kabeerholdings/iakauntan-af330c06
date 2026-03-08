import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id, file_name, file_url } = await req.json();

    if (!document_id || !file_name) {
      return new Response(JSON.stringify({ error: 'document_id and file_name are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are an AI document scanner for accounting. Given the file name "${file_name}", extract the following fields from this document:

- document_type: one of "invoice", "receipt", "voucher", "bill"
- supplier_name: the vendor/supplier name
- document_date: date in YYYY-MM-DD format
- document_number: invoice/receipt number
- total_amount: total amount as a number
- tax_amount: tax/GST/SST amount as a number (0 if none)
- description: brief description of the purchase/transaction
- category: expense category (e.g., "Office Supplies", "Utilities", "Travel", "Food & Beverage", "Professional Fees", "Telecommunications", "Rent")

Based on the file name "${file_name}", intelligently guess the document details. For example:
- "receipt_petrol_shell_rm50.jpg" → supplier: Shell, amount: 50, category: Motor Vehicle Expenses
- "inv_012345_telekom.pdf" → supplier: Telekom, document_number: 012345, category: Telecommunications

Return ONLY a valid JSON object with these fields. Do not include any other text.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are a document scanning AI that extracts structured data from receipts and invoices. Always return valid JSON.' },
          { role: 'user', content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_document_data",
            description: "Extract structured accounting data from a scanned document",
            parameters: {
              type: "object",
              properties: {
                document_type: { type: "string", enum: ["invoice", "receipt", "voucher", "bill"] },
                supplier_name: { type: "string" },
                document_date: { type: "string", description: "YYYY-MM-DD format" },
                document_number: { type: "string" },
                total_amount: { type: "number" },
                tax_amount: { type: "number" },
                description: { type: "string" },
                category: { type: "string" },
              },
              required: ["document_type", "supplier_name", "total_amount"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_document_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add credits.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    let extracted: any = {};

    // Parse tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        extracted = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error('Failed to parse tool call arguments');
      }
    }

    // Fallback: try parsing content directly
    if (!extracted.document_type) {
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
        } catch { /* ignore */ }
      }
    }

    // Default values
    if (!extracted.document_type) extracted.document_type = 'receipt';
    if (!extracted.document_date) extracted.document_date = new Date().toISOString().split('T')[0];

    console.log('Extracted:', extracted);

    return new Response(JSON.stringify({ success: true, extracted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI scan error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'AI scan failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
