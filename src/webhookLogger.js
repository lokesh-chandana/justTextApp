const { createClient } = require("@supabase/supabase-js");

let supabase;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  supabase ??= createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabase;
}

function getWebhookData(request) {
  if (request.method === "GET") {
    const { "hub.verify_token": _verifyToken, ...safeQuery } = request.query;
    return safeQuery;
  }

  return request.body ?? {};
}

async function logWebhook(request) {
  const client = getSupabase();

  if (!client) {
    console.warn(
      "Webhook was not saved: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing",
    );
    return;
  }

  const { error } = await client.from("webhook_logs").insert({
    method: request.method,
    data: getWebhookData(request),
  });

  if (error) {
    console.error("Failed to save webhook log", {
      code: error.code,
      message: error.message,
    });
  }
}

module.exports = { logWebhook };
