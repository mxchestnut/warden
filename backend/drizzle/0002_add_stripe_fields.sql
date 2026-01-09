-- Add Stripe fields to users table for subscription management
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP;

-- Create index for efficient Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id);
