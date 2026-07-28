const crypto = require("node:crypto");
const express = require("express");
const { waitUntil } = require("@vercel/functions");
const { claimMessage, logWebhook } = require("./webhookLogger");
const { sendDevelopmentReply } = require("./whatsapp");

const app = express();

app.use(
  express.json({
    limit: "1mb",
    verify: (request, _response, buffer) => {
      request.rawBody = buffer;
    },
  }),
);

function checkSignature(request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();

  // Signature checking is optional locally, but should be configured in production.
  if (!appSecret) return { valid: true };

  const received = request.get("x-hub-signature-256");
  if (!received) return { valid: false, reason: "missing signature header" };

  const rawBody = request.rawBody;
  if (!rawBody?.length) return { valid: false, reason: "missing raw body" };

  const expected = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex")}`;

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  if (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: "signature mismatch",
    details: {
      rawBodyBytes: rawBody.length,
      contentLength: request.get("content-length"),
      receivedPrefix: received.slice(0, 16),
      expectedPrefix: expected.slice(0, 16),
    },
  };
}

function runInBackground(promise) {
  promise.catch((error) => {
    console.error("Webhook background task failed", error);
  });
  waitUntil(promise);
}

async function processWebhook(request) {
  await logWebhook(request);

  if (request.body?.object !== "whatsapp_business_account") return;

  for (const entry of request.body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;

      for (const message of change.value?.messages ?? []) {
        if (!phoneNumberId || !(await claimMessage(message.id))) continue;

        console.log("WhatsApp message received", {
          from: message.from,
          id: message.id,
          type: message.type,
          text: message.text?.body,
        });

        await sendDevelopmentReply({
          phoneNumberId,
          to: message.from,
        });
      }
    }
  }
}

app.get("/", (_request, response) => {
  response.json({ service: "WhatsApp chatbot backend", status: "running" });
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

// Meta calls this endpoint when you configure the callback URL.
app.get("/webhook", (request, response) => {
  runInBackground(logWebhook(request));
  const mode = request.query["hub.mode"];
  const token = request.query["hub.verify_token"];
  const challenge = request.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return response.status(200).send(challenge);
  }

  return response.sendStatus(403);
});

// Meta delivers incoming WhatsApp events here.
app.post("/webhook", (request, response) => {
  const signature = checkSignature(request);

  if (!signature.valid) {
    console.error("Rejected webhook", {
      reason: signature.reason,
      ...signature.details,
    });
    runInBackground(logWebhook(request));
    return response.sendStatus(401);
  }

  // Acknowledge promptly so Meta does not retry the event.
  response.sendStatus(200);
  runInBackground(processWebhook(request));
});

module.exports = app;
