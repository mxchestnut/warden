import { Router, raw } from 'express';
import Stripe from 'stripe';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth.js';
import { getSecretsWithFallback } from '../config/secrets.js';

const router = Router();

// Initialize Stripe (will be done in server.ts with secrets)
let stripe: Stripe;

export async function initializeStripe() {
  const secrets = await getSecretsWithFallback();

  if (!secrets.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not available');
  }

  stripe = new Stripe(secrets.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia' as any,
  });
  return stripe;
}

// Create Checkout Session for RP Tier subscription
router.post('/create-checkout-session', isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;

    if (!user.email) {
      return res.status(400).json({ error: 'Email required for subscription. Please add an email to your account.' });
    }

    if (user.subscriptionTier === 'rp') {
      return res.status(400).json({ error: 'You already have an active RP tier subscription.' });
    }

    const secrets = await getSecretsWithFallback();

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id.toString(),
          username: user.username,
        },
      });
      customerId = customer.id;

      // Update user with Stripe customer ID
      await db.update(users)
        .set({ stripeCustomerId: customerId })
        .where(eq(users.id, user.id));
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: secrets.STRIPE_RP_TIER_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin || 'https://my1e.party'}/settings?upgrade=success`,
      cancel_url: `${req.headers.origin || 'https://my1e.party'}/settings?upgrade=cancelled`,
      metadata: {
        userId: user.id.toString(),
      },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create Customer Portal Session (for managing subscription)
router.post('/create-portal-session', isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;

    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'No active subscription found.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${req.headers.origin || 'https://my1e.party'}/settings`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe portal error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Webhook endpoint (NO CSRF protection, NO authentication - Stripe verifies via signature)
// This needs to be mounted with raw body parser
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('No Stripe signature found');
    return res.status(400).send('No signature');
  }

  let event: Stripe.Event;

  try {
    const secrets = await getSecretsWithFallback();
    const rawBody = (req as any).rawBody; // Will be set by raw body middleware

    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      secrets.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);

        // Get subscription details
        if (session.subscription && session.metadata?.userId) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await updateUserSubscription(parseInt(session.metadata.userId), subscription);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated:', subscription.id, subscription.status);

        // Find user by Stripe customer ID
        const [user] = await db.select()
          .from(users)
          .where(eq(users.stripeCustomerId, subscription.customer as string))
          .limit(1);

        if (user) {
          await updateUserSubscription(user.id, subscription);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription deleted:', subscription.id);

        // Find user and downgrade to free tier
        const [user] = await db.select()
          .from(users)
          .where(eq(users.stripeCustomerId, subscription.customer as string))
          .limit(1);

        if (user) {
          await db.update(users)
            .set({
              subscriptionTier: 'free',
              stripeSubscriptionStatus: 'canceled',
              subscriptionEndsAt: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
            })
            .where(eq(users.id, user.id));

          console.log(`User ${user.username} downgraded to free tier`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment failed for invoice:', invoice.id);

        // Optionally notify user or take action
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Helper function to update user subscription based on Stripe subscription
async function updateUserSubscription(userId: number, subscription: Stripe.Subscription) {
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';

  await db.update(users)
    .set({
      subscriptionTier: isActive ? 'rp' : 'free',
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      subscriptionEndsAt: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
    })
    .where(eq(users.id, userId));

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  console.log(`User ${user?.username} subscription updated: ${subscription.status} -> tier: ${isActive ? 'rp' : 'free'}`);
}

export default router;
