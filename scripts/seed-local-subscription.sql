UPDATE workspaces
SET subscription_status = 'active',
    billing_interval = 'month',
    current_period_end = '2099-12-31T00:00:00.000Z'
WHERE subscription_status != 'active';