const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { after, before, test } = require("node:test");

process.env.WHATSAPP_VERIFY_TOKEN = "test-token";

const app = require("../src/app");

let baseUrl;
let server;

before(
  () =>
    new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    }),
);

after(() => new Promise((resolve) => server.close(resolve)));

test("health endpoint reports ok", async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("webhook verification returns Meta challenge", async () => {
  const query = new URLSearchParams({
    "hub.mode": "subscribe",
    "hub.verify_token": "test-token",
    "hub.challenge": "123456",
  });
  const response = await fetch(`${baseUrl}/webhook?${query}`);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "123456");
});

test("webhook verification rejects an invalid token", async () => {
  const query = new URLSearchParams({
    "hub.mode": "subscribe",
    "hub.verify_token": "wrong-token",
    "hub.challenge": "123456",
  });
  const response = await fetch(`${baseUrl}/webhook?${query}`);

  assert.equal(response.status, 403);
});

test("incoming webhook events are acknowledged", async () => {
  const response = await fetch(`${baseUrl}/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      object: "whatsapp_business_account",
      entry: [],
    }),
  });

  assert.equal(response.status, 200);
});

test("a payload signed with the app secret is accepted", async (t) => {
  const appSecret = "test-app-secret";
  process.env.WHATSAPP_APP_SECRET = appSecret;
  t.after(() => delete process.env.WHATSAPP_APP_SECRET);

  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [],
  });
  const signature = crypto
    .createHmac("sha256", appSecret)
    .update(body)
    .digest("hex");

  const response = await fetch(`${baseUrl}/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": `sha256=${signature}`,
    },
    body,
  });

  assert.equal(response.status, 200);
});

test("a payload signed with the wrong secret is rejected", async (t) => {
  process.env.WHATSAPP_APP_SECRET = "test-app-secret";
  t.after(() => delete process.env.WHATSAPP_APP_SECRET);

  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [],
  });
  const signature = crypto
    .createHmac("sha256", "a-different-secret")
    .update(body)
    .digest("hex");

  const response = await fetch(`${baseUrl}/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": `sha256=${signature}`,
    },
    body,
  });

  assert.equal(response.status, 401);
});
