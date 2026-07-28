async function sendDevelopmentReply({ phoneNumberId, to }) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("Reply was not sent: WHATSAPP_ACCESS_TOKEN is missing");
    throw new Error("WHATSAPP_ACCESS_TOKEN is missing");
  }

  const response = await fetch(
    `https://graph.facebook.com/v23.0/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: "App is still in development",
        },
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      result.error?.message ?? `WhatsApp API returned HTTP ${response.status}`,
    );
    error.details = {
      httpStatus: response.status,
      graphError: result.error
        ? {
            code: result.error.code,
            type: result.error.type,
            subcode: result.error.error_subcode,
            traceId: result.error.fbtrace_id,
          }
        : undefined,
    };
    throw error;
  }

  return {
    recipient: result.contacts?.[0]?.wa_id,
    sentMessageId: result.messages?.[0]?.id,
  };
}

module.exports = { sendDevelopmentReply };
