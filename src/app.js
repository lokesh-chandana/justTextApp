const crypto = require("node:crypto");
const express = require("express");
const { waitUntil } = require("@vercel/functions");
const {
  claimMessage,
  logApplicationEvent,
  logWebhook,
  releaseMessage,
} = require("./webhookLogger");
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

  if (request.body?.object !== "whatsapp_business_account") {
    await logApplicationEvent({
      level: "warning",
      event: "unsupported_webhook_object",
      data: { object: request.body?.object },
    });
    return;
  }

  for (const entry of request.body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;

      for (const message of change.value?.messages ?? []) {
        if (!phoneNumberId) {
          await logApplicationEvent({
            level: "error",
            event: "missing_phone_number_id",
            messageId: message.id,
          });
          continue;
        }

        const claim = await claimMessage(message.id);
        if (!claim.claimed) {
          await logApplicationEvent({
            level: claim.reason === "duplicate" ? "info" : "error",
            event: "message_not_claimed",
            messageId: message.id,
            data: { reason: claim.reason },
          });
          continue;
        }

        console.log("WhatsApp message received", {
          from: message.from,
          id: message.id,
          type: message.type,
          text: message.text?.body,
        });

        await logApplicationEvent({
          event: "reply_send_started",
          messageId: message.id,
          data: {
            phoneNumberId,
            recipient: message.from,
            incomingType: message.type,
          },
        });

        try {
          const result = await sendDevelopmentReply({
            phoneNumberId,
            to: message.from,
          });

          await logApplicationEvent({
            event: "reply_send_succeeded",
            messageId: message.id,
            data: result,
          });
        } catch (error) {
          await releaseMessage(message.id);
          await logApplicationEvent({
            level: "error",
            event: "reply_send_failed",
            message: error.message,
            messageId: message.id,
            data: error.details ?? {},
          });
          throw error;
        }
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
    runInBackground(
      Promise.all([
        logWebhook(request),
        logApplicationEvent({
          level: "error",
          event: "webhook_signature_rejected",
          message: signature.reason,
          data: signature.details ?? {},
        }),
      ]),
    );
    return response.sendStatus(401);
  }

  // Acknowledge promptly so Meta does not retry the event.
  response.sendStatus(200);
  runInBackground(processWebhook(request));
});

module.exports = app;
