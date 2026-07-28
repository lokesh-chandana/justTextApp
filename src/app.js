const crypto = require("node:crypto");
const express = require("express");

const app = express();

app.use(
  express.json({
    limit: "1mb",
    verify: (request, _response, buffer) => {
      request.rawBody = buffer;
    },
  }),
);

function hasValidSignature(request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // Signature checking is optional locally, but should be configured in production.
  if (!appSecret) return true;

  const signature = request.get("x-hub-signature-256");
  if (!signature || !request.rawBody) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(request.rawBody)
    .digest("hex")}`;

  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

app.get("/", (_request, response) => {
  response.json({ service: "WhatsApp chatbot backend", status: "running" });
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

// Meta calls this endpoint when you configure the callback URL.
app.get("/webhook", (request, response) => {
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
  if (!hasValidSignature(request)) {
    return response.sendStatus(401);
  }

  // Acknowledge promptly so Meta does not retry the event.
  response.sendStatus(200);

  if (request.body?.object !== "whatsapp_business_account") return;

  for (const entry of request.body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        console.log("WhatsApp message received", {
          from: message.from,
          id: message.id,
          type: message.type,
          text: message.text?.body,
        });
      }
    }
  }
});

module.exports = app;
