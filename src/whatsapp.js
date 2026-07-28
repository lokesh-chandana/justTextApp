async function sendDevelopmentReply({ phoneNumberId, to }) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("Reply was not sent: WHATSAPP_ACCESS_TOKEN is missing");
    return;
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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API returned ${response.status}: ${error}`);
  }
}

module.exports = { sendDevelopmentReply };
