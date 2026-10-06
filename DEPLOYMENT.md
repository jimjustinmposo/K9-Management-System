# Accounts and billing setup

## Cloudflare D1

Apply every migration to preview and production. Migration `0007_paypal_billing.sql` adds PayPal subscription fields and the provider-neutral payment event log. The first workspace whose PayPal subscription becomes active claims existing K9 rows that have no workspace.

## PayPal subscriptions

Production uses the existing live monthly and yearly plans configured in `wrangler.toml`. The application retrieves their active recurring prices directly from PayPal, so the website currency and amount match checkout.

Configure these Cloudflare Pages secrets and variables:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_MONTHLY_PLAN_ID`
- `PAYPAL_YEARLY_PLAN_ID`
- `PAYPAL_ENVIRONMENT` (`sandbox` or `live`)

Register this webhook endpoint in the matching sandbox or live PayPal app:

`https://YOUR_DOMAIN/api/billing/webhook`

Subscribe it to:

- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `BILLING.SUBSCRIPTION.SUSPENDED`
- `BILLING.SUBSCRIPTION.EXPIRED`
- `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
- `PAYMENT.SALE.COMPLETED`

The PayPal return URL calls the server to verify the subscription directly. The webhook independently keeps later renewals, failures, suspensions, and cancellations synchronized. Only a verified `ACTIVE` subscription makes a workspace writable.

Use separate sandbox and live REST apps, plans, credentials, and webhook IDs. Never commit `.dev.vars` or production secrets.

## Resend

Verify the sending domain in Resend. Store the API key and a sender on that domain as `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. Set `APP_URL` to the public application origin so invitation and password-reset links point to the correct deployment.
