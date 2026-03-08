import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SANDBOX_URL = "https://preprod-api.myinvois.hasil.gov.my";
const PROD_URL = "https://api.myinvois.hasil.gov.my";

const SANDBOX_IDP = "https://preprod-ims.myinvois.hasil.gov.my";
const PROD_IDP = "https://ims.myinvois.hasil.gov.my";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  environment: string
): Promise<string> {
  const idpUrl = environment === "production" ? PROD_IDP : SANDBOX_IDP;
  const tokenUrl = `${idpUrl}/connect/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "InvoicingAPI",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LHDN token error (${res.status}): ${errText}`);
  }

  const data: TokenResponse = await res.json();
  return data.access_token;
}

function getApiUrl(environment: string): string {
  return environment === "production" ? PROD_URL : SANDBOX_URL;
}

async function submitDocument(
  accessToken: string,
  apiUrl: string,
  tin: string,
  documents: any[]
): Promise<any> {
  const res = await fetch(
    `${apiUrl}/api/v1.0/documentsubmissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documents }),
    }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`LHDN submit error (${res.status}): ${text}`);
  }
  return JSON.parse(text);
}

async function cancelDocument(
  accessToken: string,
  apiUrl: string,
  documentUUID: string,
  reason: string
): Promise<any> {
  const res = await fetch(
    `${apiUrl}/api/v1.0/documents/state/${documentUUID}/state`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "cancelled", reason }),
    }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`LHDN cancel error (${res.status}): ${text}`);
  }
  return JSON.parse(text);
}

async function getSubmissionStatus(
  accessToken: string,
  apiUrl: string,
  submissionUid: string
): Promise<any> {
  const res = await fetch(
    `${apiUrl}/api/v1.0/documentsubmissions/${submissionUid}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`LHDN status error (${res.status}): ${text}`);
  }
  return JSON.parse(text);
}

async function getDocumentDetails(
  accessToken: string,
  apiUrl: string,
  documentUUID: string
): Promise<any> {
  const res = await fetch(
    `${apiUrl}/api/v1.0/documents/${documentUUID}/details`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`LHDN document error (${res.status}): ${text}`);
  }
  return JSON.parse(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    const body = await req.json();
    const { action, company_id, invoice_id, document_uuid, submission_uid, reason } = body;

    // Verify user owns the company
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, einvoice_tin, einvoice_enabled")
      .eq("id", company_id)
      .eq("owner_id", userId)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: "Company not found or access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!company.einvoice_enabled) {
      return new Response(
        JSON.stringify({ error: "e-Invoice is not enabled for this company" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get LHDN credentials
    const { data: creds, error: credsError } = await supabase
      .from("lhdn_credentials")
      .select("*")
      .eq("company_id", company_id)
      .single();

    if (credsError || !creds) {
      return new Response(
        JSON.stringify({ error: "LHDN API credentials not configured. Go to Settings → e-Invoice." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get access token from LHDN
    const accessToken = await getAccessToken(
      creds.client_id,
      creds.client_secret,
      creds.environment
    );
    const apiUrl = getApiUrl(creds.environment);

    let result: any;

    switch (action) {
      case "submit": {
        // Fetch invoice data with lines
        const { data: invoice, error: invError } = await supabase
          .from("invoices")
          .select("*, invoice_lines(*), contacts(*)")
          .eq("id", invoice_id)
          .eq("company_id", company_id)
          .single();

        if (invError || !invoice) {
          return new Response(
            JSON.stringify({ error: "Invoice not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Build LHDN document format (UBL 2.1 JSON)
        const document = {
          _D: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
          _A: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
          _B: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
          Invoice: [{
            ID: [{ _: invoice.invoice_number }],
            IssueDate: [{ _: invoice.invoice_date }],
            InvoiceTypeCode: [{ _: "01", listVersionID: "1.0" }],
            DocumentCurrencyCode: [{ _: invoice.currency || "MYR" }],
            AccountingSupplierParty: [{
              Party: [{
                PartyIdentification: [{
                  ID: [{ _: company.einvoice_tin, schemeID: "TIN" }],
                }],
              }],
            }],
            AccountingCustomerParty: [{
              Party: [{
                PartyIdentification: [{
                  ID: [{ _: invoice.contacts?.tax_id || "", schemeID: "TIN" }],
                }],
                PartyLegalEntity: [{
                  RegistrationName: [{ _: invoice.contacts?.name || "" }],
                }],
              }],
            }],
            InvoiceLine: (invoice.invoice_lines || []).map((line: any, idx: number) => ({
              ID: [{ _: String(idx + 1) }],
              InvoicedQuantity: [{ _: line.quantity || 1, unitCode: "C62" }],
              LineExtensionAmount: [{ _: line.line_total || 0, currencyID: invoice.currency || "MYR" }],
              Item: [{ Description: [{ _: line.description }] }],
              Price: [{
                PriceAmount: [{ _: line.unit_price || 0, currencyID: invoice.currency || "MYR" }],
              }],
              TaxTotal: [{
                TaxAmount: [{ _: line.tax_amount || 0, currencyID: invoice.currency || "MYR" }],
              }],
            })),
            TaxTotal: [{
              TaxAmount: [{ _: invoice.tax_amount || 0, currencyID: invoice.currency || "MYR" }],
            }],
            LegalMonetaryTotal: [{
              LineExtensionAmount: [{ _: invoice.subtotal || 0, currencyID: invoice.currency || "MYR" }],
              TaxExclusiveAmount: [{ _: invoice.subtotal || 0, currencyID: invoice.currency || "MYR" }],
              TaxInclusiveAmount: [{ _: invoice.total_amount || 0, currencyID: invoice.currency || "MYR" }],
              PayableAmount: [{ _: invoice.total_amount || 0, currencyID: invoice.currency || "MYR" }],
            }],
          }],
        };

        // Base64 encode the document
        const docStr = JSON.stringify(document);
        const encoder = new TextEncoder();
        const encoded = encoder.encode(docStr);
        const base64Doc = btoa(String.fromCharCode(...encoded));

        // Create SHA256 hash
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashBase64 = btoa(String.fromCharCode(...hashArray));

        const submission = [
          {
            format: "JSON",
            document: base64Doc,
            documentHash: hashBase64,
            codeNumber: invoice.invoice_number,
          },
        ];

        result = await submitDocument(accessToken, apiUrl, company.einvoice_tin || "", submission);

        // Update invoice with submission details
        const acceptedDoc = result?.acceptedDocuments?.[0];
        const rejectedDoc = result?.rejectedDocuments?.[0];

        if (acceptedDoc) {
          await supabase.from("invoices").update({
            einvoice_status: "submitted",
            einvoice_uuid: acceptedDoc.uuid,
            einvoice_submitted_at: new Date().toISOString(),
          }).eq("id", invoice_id);
        } else if (rejectedDoc) {
          await supabase.from("invoices").update({
            einvoice_status: "rejected",
          }).eq("id", invoice_id);
        }
        break;
      }

      case "cancel": {
        if (!document_uuid || !reason) {
          return new Response(
            JSON.stringify({ error: "document_uuid and reason are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await cancelDocument(accessToken, apiUrl, document_uuid, reason);

        await supabase.from("invoices").update({
          einvoice_status: "cancelled",
        }).eq("id", invoice_id).eq("company_id", company_id);
        break;
      }

      case "status": {
        if (!submission_uid) {
          return new Response(
            JSON.stringify({ error: "submission_uid is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await getSubmissionStatus(accessToken, apiUrl, submission_uid);

        // Update document statuses based on response
        for (const doc of result?.documentSummary || []) {
          if (doc.uuid && doc.status) {
            await supabase.from("invoices").update({
              einvoice_status: doc.status.toLowerCase(),
              einvoice_uuid: doc.uuid,
              einvoice_long_id: doc.longId || null,
              einvoice_validated_at: doc.dateTimeValidated || null,
            }).eq("einvoice_uuid", doc.uuid).eq("company_id", company_id);
          }
        }
        break;
      }

      case "get_document": {
        if (!document_uuid) {
          return new Response(
            JSON.stringify({ error: "document_uuid is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await getDocumentDetails(accessToken, apiUrl, document_uuid);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
