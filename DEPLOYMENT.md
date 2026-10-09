# Accounts and deployment setup

## Cloudflare D1

Apply every migration to preview and production. The authentication schema stores users, workspaces, memberships, sessions, invitations, password resets, and subscription access state.

The current release has no payment-provider integration. Workspaces remain view-only until a replacement billing provider is implemented and verifies an active subscription.

## Resend

Verify the sending domain in Resend. Store the API key and a sender on that domain as `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. Set `APP_URL` to the public application origin so invitation and password-reset links point to the correct deployment.

Never commit `.dev.vars` or production secrets. `.dev.vars.example` contains names only.

