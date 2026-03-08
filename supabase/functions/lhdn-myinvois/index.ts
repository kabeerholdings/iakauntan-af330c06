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

async function getAccessToken(clientId: string, clientSecret: string, environment: string): Promise<string> {
  const idpUrl = environment === "production" ? PROD_IDP : SANDBOX_IDP;
  const body = new URLSearchParams({
    client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials", scope: "InvoicingAPI",
  });
  const res = await fetch(`${idpUrl}/connect/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(),
  });
  if (!res.ok) throw new Error(`LHDN token error (${res.status}): ${await res.text()}`);
  const data: TokenResponse = await res.json();
  return data.access_token;
}

function getApiUrl(env: string): string {
  return env === "production" ? PROD_URL : SANDBOX_URL;
}

function buildUBLDocument(invoice: any, company: any) {
  return {
    _D: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    _A: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    _B: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    Invoice: [{
      ID: [{ _: invoice.invoice_number }],
      IssueDate: [{ _: invoice.invoice_date }],
      IssueTime: [{ _: "00:00:00Z" }],
      InvoiceTypeCode: [{ _: invoice.invoice_type_code || "01", listVersionID: "1.1" }],
      DocumentCurrencyCode: [{ _: invoice.currency || "MYR" }],
      InvoicePeriod: [{ StartDate: [{ _: invoice.invoice_date }], EndDate: [{ _: invoice.invoice_date }], Description: [{ _: "Monthly" }] }],
      BillingReference: invoice.billing_ref ? [{ InvoiceDocumentReference: [{ ID: [{ _: invoice.billing_ref }] }] }] : undefined,
      AccountingSupplierParty: [{
        Party: [{
          IndustryClassificationCode: [{ _: company.msic_code || "00000", name: "General" }],
          PartyIdentification: [
            { ID: [{ _: company.einvoice_tin || "", schemeID: "TIN" }] },
            { ID: [{ _: company.registration_no || "", schemeID: "BRN" }] },
          ],
          PostalAddress: [{
            CityName: [{ _: company.city || "" }],
            PostalZone: [{ _: company.postcode || "" }],
            CountrySubentityCode: [{ _: company.state || "" }],
            AddressLine: [{ Line: [{ _: company.address_line1 || "" }] }],
            Country: [{ IdentificationCode: [{ _: "MYS", listID: "ISO3166-1", listAgencyID: "6" }] }],
          }],
          PartyLegalEntity: [{ RegistrationName: [{ _: company.name || "" }] }],
          Contact: [{
            Telephone: [{ _: company.phone || "" }],
            ElectronicMail: [{ _: company.email || "" }],
          }],
        }],
      }],
      AccountingCustomerParty: [{
        Party: [{
          PartyIdentification: [
            { ID: [{ _: invoice.contacts?.tax_id || "EI00000000010", schemeID: "TIN" }] },
            { ID: [{ _: invoice.contacts?.registration_no || "NA", schemeID: "BRN" }] },
          ],
          PostalAddress: [{
            CityName: [{ _: invoice.contacts?.city || "" }],
            PostalZone: [{ _: invoice.contacts?.postcode || "" }],
            CountrySubentityCode: [{ _: invoice.contacts?.state || "" }],
            AddressLine: [{ Line: [{ _: invoice.contacts?.address || "" }] }],
            Country: [{ IdentificationCode: [{ _: "MYS", listID: "ISO3166-1", listAgencyID: "6" }] }],
          }],
          PartyLegalEntity: [{ RegistrationName: [{ _: invoice.contacts?.name || "" }] }],
          Contact: [{
            Telephone: [{ _: invoice.contacts?.phone || "" }],
            ElectronicMail: [{ _: invoice.contacts?.email || "" }],
          }],
        }],
      }],
      InvoiceLine: (invoice.invoice_lines || []).map((line: any, idx: number) => ({
        ID: [{ _: String(idx + 1) }],
        InvoicedQuantity: [{ _: line.quantity || 1, unitCode: "C62" }],
        LineExtensionAmount: [{ _: line.line_total || 0, currencyID: invoice.currency || "MYR" }],
        TaxTotal: [{
          TaxAmount: [{ _: line.tax_amount || 0, currencyID: invoice.currency || "MYR" }],
          TaxSubtotal: [{
            TaxableAmount: [{ _: line.line_total || 0, currencyID: invoice.currency || "MYR" }],
            TaxAmount: [{ _: line.tax_amount || 0, currencyID: invoice.currency || "MYR" }],
            TaxCategory: [{
              ID: [{ _: "01" }],
              Percent: [{ _: line.tax_rate || 0 }],
              TaxScheme: [{ ID: [{ _: "OTH", schemeID: "UN/ECE 5153", schemeAgencyID: "6" }] }],
            }],
          }],
        }],
        Item: [{
          CommodityClassification: [{ ItemClassificationCode: [{ _: line.classification_code || "001", listID: "CLASS" }] }],
          Description: [{ _: line.description }],
        }],
        Price: [{ PriceAmount: [{ _: line.unit_price || 0, currencyID: invoice.currency || "MYR" }] }],
        ItemPriceExtension: [{ Amount: [{ _: line.line_total || 0, currencyID: invoice.currency || "MYR" }] }],
      })),
      TaxTotal: [{
        TaxAmount: [{ _: invoice.tax_amount || 0, currencyID: invoice.currency || "MYR" }],
        TaxSubtotal: [{
          TaxableAmount: [{ _: invoice.subtotal || 0, currencyID: invoice.currency || "MYR" }],
          TaxAmount: [{ _: invoice.tax_amount || 0, currencyID: invoice.currency || "MYR" }],
          TaxCategory: [{
            ID: [{ _: "01" }],
            TaxScheme: [{ ID: [{ _: "OTH", schemeID: "UN/ECE 5153", schemeAgencyID: "6" }] }],
          }],
        }],
      }],
      LegalMonetaryTotal: [{
        LineExtensionAmount: [{ _: invoice.subtotal || 0, currencyID: invoice.currency || "MYR" }],
        TaxExclusiveAmount: [{ _: invoice.subtotal || 0, currencyID: invoice.currency || "MYR" }],
        TaxInclusiveAmount: [{ _: invoice.total_amount || 0, currencyID: invoice.currency || "MYR" }],
        PayableAmount: [{ _: invoice.total_amount || 0, currencyID: invoice.currency || "MYR" }],
      }],
    }],
  };
}

function encodeDocument(document: any) {
  const docStr = JSON.stringify(document);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(docStr);
  const base64Doc = btoa(String.fromCharCode(...encoded));
  return { encoded, base64Doc };
}

async function hashDocument(encoded: Uint8Array) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

async function submitDocuments(accessToken: string, apiUrl: string, documents: any[]): Promise<any> {
  const res = await fetch(`${apiUrl}/api/v1.0/documentsubmissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ documents }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LHDN submit error (${res.status}): ${text}`);
  return JSON.parse(text);
}

async function cancelDocument(accessToken: string, apiUrl: string, uuid: string, reason: string): Promise<any> {
  const res = await fetch(`${apiUrl}/api/v1.0/documents/state/${uuid}/state`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cancelled", reason }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LHDN cancel error (${res.status}): ${text}`);
  return JSON.parse(text);
}

async function getSubmissionStatus(accessToken: string, apiUrl: string, submissionUid: string): Promise<any> {
  const res = await fetch(`${apiUrl}/api/v1.0/documentsubmissions/${submissionUid}`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LHDN status error (${res.status}): ${text}`);
  return JSON.parse(text);
}

async function getDocumentDetails(accessToken: string, apiUrl: string, uuid: string): Promise<any> {
  const res = await fetch(`${apiUrl}/api/v1.0/documents/${uuid}/details`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LHDN document error (${res.status}): ${text}`);
  return JSON.parse(text);
}

async function searchTIN(accessToken: string, apiUrl: string, idType: string, idValue: string): Promise<any> {
  const res = await fetch(`${apiUrl}/api/v1.0/taxpayer/validate/${idType}/${idValue}?idType=${idType}&idValue=${idValue}`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LHDN TIN search error (${res.status}): ${text}`);
  return JSON.parse(text);
}

async function getRecentDocuments(accessToken: string, apiUrl: string, tin: string, params: any): Promise<any> {
  const query = new URLSearchParams();
  if (params.pageNo) query.set("pageNo", params.pageNo);
  if (params.pageSize) query.set("pageSize", params.pageSize);
  if (params.submissionDateFrom) query.set("submissionDateFrom", params.submissionDateFrom);
  if (params.submissionDateTo) query.set("submissionDateTo", params.submissionDateTo);
  if (params.direction) query.set("direction", params.direction);
  if (params.status) query.set("status", params.status);

  const res = await fetch(`${apiUrl}/api/v1.0/documents/recent?${query.toString()}`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LHDN recent docs error (${res.status}): ${text}`);
  return JSON.parse(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claimsData.claims.sub;
    const body = await req.json();
    const { action, company_id } = body;

    // Verify user owns the company
    const { data: company, error: companyError } = await supabase.from("companies")
      .select("*").eq("id", company_id).eq("owner_id", userId).single();
    if (companyError || !company) {
      return new Response(JSON.stringify({ error: "Company not found or access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!company.einvoice_enabled) {
      return new Response(JSON.stringify({ error: "e-Invoice is not enabled for this company" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get LHDN credentials
    const { data: creds, error: credsError } = await supabase.from("lhdn_credentials")
      .select("*").eq("company_id", company_id).single();
    if (credsError || !creds) {
      return new Response(JSON.stringify({ error: "LHDN API credentials not configured. Go to Settings → e-Invoice." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const accessToken = await getAccessToken(creds.client_id, creds.client_secret, creds.environment);
    const apiUrl = getApiUrl(creds.environment);
    let result: any;

    switch (action) {
      // ===== Submit single invoice =====
      case "submit": {
        const { invoice_id } = body;
        const { data: invoice, error: invError } = await supabase.from("invoices")
          .select("*, invoice_lines(*), contacts(*)").eq("id", invoice_id).eq("company_id", company_id).single();
        if (invError || !invoice) {
          return new Response(JSON.stringify({ error: "Invoice not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const doc = buildUBLDocument(invoice, company);
        const { encoded, base64Doc } = encodeDocument(doc);
        const hashBase64 = await hashDocument(encoded);

        result = await submitDocuments(accessToken, apiUrl, [{
          format: "JSON", document: base64Doc, documentHash: hashBase64, codeNumber: invoice.invoice_number,
        }]);

        const accepted = result?.acceptedDocuments?.[0];
        const rejected = result?.rejectedDocuments?.[0];
        if (accepted) {
          await supabase.from("invoices").update({
            einvoice_status: "submitted", einvoice_uuid: accepted.uuid, einvoice_submitted_at: new Date().toISOString(),
          }).eq("id", invoice_id);
        } else if (rejected) {
          await supabase.from("invoices").update({ einvoice_status: "rejected" }).eq("id", invoice_id);
        }
        break;
      }

      // ===== Batch submit multiple invoices =====
      case "batch_submit": {
        const { invoice_ids } = body;
        if (!invoice_ids?.length) {
          return new Response(JSON.stringify({ error: "invoice_ids required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { data: invoices, error: batchError } = await supabase.from("invoices")
          .select("*, invoice_lines(*), contacts(*)").in("id", invoice_ids).eq("company_id", company_id);
        if (batchError || !invoices?.length) {
          return new Response(JSON.stringify({ error: "No invoices found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const submissions = [];
        for (const inv of invoices) {
          const doc = buildUBLDocument(inv, company);
          const { encoded, base64Doc } = encodeDocument(doc);
          const hashBase64 = await hashDocument(encoded);
          submissions.push({ format: "JSON", document: base64Doc, documentHash: hashBase64, codeNumber: inv.invoice_number });
        }

        result = await submitDocuments(accessToken, apiUrl, submissions);

        // Update each invoice status
        for (const acc of result?.acceptedDocuments || []) {
          const inv = invoices.find((i: any) => i.invoice_number === acc.invoiceCodeNumber);
          if (inv) {
            await supabase.from("invoices").update({
              einvoice_status: "submitted", einvoice_uuid: acc.uuid, einvoice_submitted_at: new Date().toISOString(),
            }).eq("id", inv.id);
          }
        }
        for (const rej of result?.rejectedDocuments || []) {
          const inv = invoices.find((i: any) => i.invoice_number === rej.invoiceCodeNumber);
          if (inv) {
            await supabase.from("invoices").update({ einvoice_status: "rejected" }).eq("id", inv.id);
          }
        }
        break;
      }

      // ===== Submit consolidated e-invoice =====
      case "submit_consolidated": {
        const { invoice_ids } = body;
        const { data: invoices } = await supabase.from("invoices")
          .select("*, invoice_lines(*), contacts(*)").in("id", invoice_ids).eq("company_id", company_id);
        if (!invoices?.length) {
          return new Response(JSON.stringify({ error: "No invoices found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Merge all invoice lines into one consolidated document
        const allLines = invoices.flatMap((inv: any) => inv.invoice_lines || []);
        const totalSubtotal = invoices.reduce((s: number, i: any) => s + (i.subtotal || 0), 0);
        const totalTax = invoices.reduce((s: number, i: any) => s + (i.tax_amount || 0), 0);
        const totalAmount = invoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);

        const consolidated = {
          ...invoices[0],
          invoice_number: `CONS-${new Date().toISOString().substring(0, 7)}`,
          invoice_type_code: "01",
          invoice_lines: allLines,
          subtotal: totalSubtotal,
          tax_amount: totalTax,
          total_amount: totalAmount,
          contacts: { name: "Consolidated Buyers", tax_id: "EI00000000010", address: "", city: "", postcode: "", state: "", phone: "", email: "" },
        };

        const doc = buildUBLDocument(consolidated, company);
        const { encoded, base64Doc } = encodeDocument(doc);
        const hashBase64 = await hashDocument(encoded);

        result = await submitDocuments(accessToken, apiUrl, [{
          format: "JSON", document: base64Doc, documentHash: hashBase64, codeNumber: consolidated.invoice_number,
        }]);

        const accepted = result?.acceptedDocuments?.[0];
        if (accepted) {
          for (const inv of invoices) {
            await supabase.from("invoices").update({
              einvoice_status: "consolidated", einvoice_uuid: accepted.uuid, einvoice_submitted_at: new Date().toISOString(),
            }).eq("id", inv.id);
          }
        }
        break;
      }

      // ===== Submit self-billed e-invoice (for purchases) =====
      case "submit_self_billed": {
        const { invoice_id } = body;
        const { data: invoice } = await supabase.from("invoices")
          .select("*, invoice_lines(*), contacts(*)").eq("id", invoice_id).eq("company_id", company_id).single();
        if (!invoice) {
          return new Response(JSON.stringify({ error: "Invoice not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Self-billed: swap supplier/customer, use type code 02
        const selfBilledInvoice = { ...invoice, invoice_type_code: "02" };
        const doc = buildUBLDocument(selfBilledInvoice, company);

        // For self-billed, the buyer (company) is the supplier party
        doc.Invoice[0].InvoiceTypeCode = [{ _: "02", listVersionID: "1.1" }];

        const { encoded, base64Doc } = encodeDocument(doc);
        const hashBase64 = await hashDocument(encoded);

        result = await submitDocuments(accessToken, apiUrl, [{
          format: "JSON", document: base64Doc, documentHash: hashBase64, codeNumber: invoice.invoice_number,
        }]);

        const accepted = result?.acceptedDocuments?.[0];
        if (accepted) {
          await supabase.from("invoices").update({
            einvoice_status: "submitted", einvoice_uuid: accepted.uuid, einvoice_submitted_at: new Date().toISOString(),
          }).eq("id", invoice_id);
        }
        break;
      }

      // ===== Cancel =====
      case "cancel": {
        const { document_uuid, reason, invoice_id } = body;
        if (!document_uuid || !reason) {
          return new Response(JSON.stringify({ error: "document_uuid and reason are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        result = await cancelDocument(accessToken, apiUrl, document_uuid, reason);
        await supabase.from("invoices").update({ einvoice_status: "cancelled" }).eq("id", invoice_id).eq("company_id", company_id);
        break;
      }

      // ===== Get submission status =====
      case "status": {
        const { submission_uid } = body;
        if (!submission_uid) {
          return new Response(JSON.stringify({ error: "submission_uid is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        result = await getSubmissionStatus(accessToken, apiUrl, submission_uid);

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

      // ===== Get document details =====
      case "get_document": {
        const { document_uuid } = body;
        if (!document_uuid) {
          return new Response(JSON.stringify({ error: "document_uuid is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        result = await getDocumentDetails(accessToken, apiUrl, document_uuid);
        break;
      }

      // ===== TIN Search =====
      case "search_tin": {
        const { id_type, id_value } = body;
        if (!id_type || !id_value) {
          return new Response(JSON.stringify({ error: "id_type and id_value are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        result = await searchTIN(accessToken, apiUrl, id_type, id_value);
        break;
      }

      // ===== Get recent documents (for import) =====
      case "get_recent_documents": {
        result = await getRecentDocuments(accessToken, apiUrl, company.einvoice_tin || "", body.params || {});
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
