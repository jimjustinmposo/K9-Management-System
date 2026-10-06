UPDATE workspaces
SET subscription_status = 'incomplete',
    current_period_end = NULL,
    paypal_payer_id = NULL,
    paypal_subscription_id = NULL,
    paypal_plan_id = NULL,
    paypal_last_event_time = NULL,
    updated_at = CURRENT_TIMESTAMP;

DELETE FROM payment_events;
DROP INDEX IF EXISTS idx_workspaces_paypal_subscription;
