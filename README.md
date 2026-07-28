# WhatsApp chatbot backend

Node.js/Express webhook receiver for the Meta WhatsApp Cloud API.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set a private `WHATSAPP_VERIFY_TOKEN`. You choose this value yourself.
3. Set `WHATSAPP_APP_SECRET` to the app secret shown in the Meta dashboard.
4. Run:

   ```sh
   npm install
   npm start
   ```

The server runs at `http://localhost:3000`.

## Meta webhook settings

Deploy the app behind HTTPS, then enter these values in the Meta dashboard:

- **Callback URL:** `https://your-domain.com/webhook`
- **Verify token:** the exact value of `WHATSAPP_VERIFY_TOKEN`

Subscribe the webhook to the `messages` field. The GET route verifies the
callback, while Meta sends incoming events to the POST route at the same URL.

Meta cannot call `localhost`. For local development, expose port 3000 with an
HTTPS tunnel and use its `/webhook` URL.

## Apache `.htaccess`

The included `.htaccess` reverse-proxies requests to Node on port 3000. It
requires Apache `mod_rewrite` and `mod_proxy`. The Node process must already be
running.

Some shared hosts use cPanel Passenger and generate their own `.htaccess`.
In that case, create a Node.js application with `src/server.js` as its startup
file and use the host-generated configuration instead.

## Endpoints

- `GET /health` — health check
- `GET /webhook` — Meta callback verification
- `POST /webhook` — incoming WhatsApp events

Run checks with `npm test`.
