import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { companyId, endpoint, method = 'GET', payload } = body;

    if (!companyId || !endpoint) {
      return new Response(JSON.stringify({ error: 'companyId and endpoint are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get API credentials
    const { data: apiKey, error: keyError } = await supabase
      .from('autocount_api_keys')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle();

    if (keyError || !apiKey) {
      return new Response(JSON.stringify({ error: 'AutoCount API key not configured for this company' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const baseUrl = apiKey.endpoint_url || 'https://accounting-api.autocountcloud.com';
    const url = `${baseUrl}/${apiKey.account_book_id}/${endpoint}`;

    const headers: Record<string, string> = {
      'API-Key': apiKey.api_key,
      'Key-ID': apiKey.key_id,
      'Content-Type': 'application/json',
    };

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && payload !== undefined) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(url, fetchOptions);
    
    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // Log sync activity
    await supabase.from('autocount_sync_log').insert({
      company_id: companyId,
      sync_type: endpoint.split('/')[0] || 'unknown',
      direction: method === 'GET' ? 'pull' : 'push',
      status: response.ok ? 'success' : 'error',
      records_processed: response.ok ? 1 : 0,
      records_failed: response.ok ? 0 : 1,
      error_message: response.ok ? null : JSON.stringify(responseData),
      completed_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      data: responseData,
    }), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AutoCount proxy error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
