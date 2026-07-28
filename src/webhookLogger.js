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

async function claimMessage(messageId) {
  const client = getSupabase();

  if (!client) {
    console.warn("Message was not processed: Supabase is not configured");
    return { claimed: false, reason: "supabase_not_configured" };
  }

  const { error } = await client.from("processed_messages").insert({
    message_id: messageId,
  });

  if (!error) return { claimed: true };
  if (error.code === "23505") {
    return { claimed: false, reason: "duplicate" };
  }

  console.error("Failed to claim WhatsApp message", {
    code: error.code,
    message: error.message,
  });
  return { claimed: false, reason: "database_error" };
}

async function logApplicationEvent({
  level = "info",
  event,
  message,
  messageId,
  data = {},
}) {
  const client = getSupabase();
  if (!client) return;

  const { error } = await client.from("application_logs").insert({
    level,
    event,
    message: message ?? null,
    message_id: messageId ?? null,
    data,
  });

  if (error) {
    console.error("Failed to save application log", {
      code: error.code,
      message: error.message,
    });
  }
}

async function releaseMessage(messageId) {
  const client = getSupabase();
  if (!client) return;

  const { error } = await client
    .from("processed_messages")
    .delete()
    .eq("message_id", messageId);

  if (error) {
    console.error("Failed to release WhatsApp message", {
      code: error.code,
      message: error.message,
    });
  }
}

module.exports = {
  claimMessage,
  logApplicationEvent,
  logWebhook,
  releaseMessage,
};
