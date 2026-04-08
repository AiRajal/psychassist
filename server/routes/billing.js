/**
 * Stripe subscription billing routes.
 */
const express = require("express");
const { getOne, runAndSave } = require("../db/connection");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

function getStripe() {
  return require("stripe")(process.env.STRIPE_SECRET_KEY);
}

// ── Create Checkout Session ────────────────────────────────────────
router.post("/checkout", authenticate, async (req, res) => {
  try {
    const stripe = getStripe();
    const user = getOne("SELECT * FROM users WHERE id = ?", [req.userId]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { plan } = req.body;
    const priceMap = {
      professional: process.env.STRIPE_PRICE_PROFESSIONAL,
      clinic: process.env.STRIPE_PRICE_CLINIC,
    };
    const priceId = priceMap[plan];
    if (!priceId) return res.status(400).json({ error: "Invalid plan" });

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      runAndSave("UPDATE users SET stripe_customer_id = ? WHERE id = ?", [customerId, user.id]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/app?billing=success`,
      cancel_url: `${process.env.FRONTEND_URL}/app?billing=canceled`,
      subscription_data: {
        trial_period_days: plan === "professional" ? 30 : undefined,
        metadata: { userId: user.id, plan },
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// ── Customer Portal ────────────────────────────────────────────────
router.post("/portal", authenticate, async (req, res) => {
  try {
    const stripe = getStripe();
    const user = getOne("SELECT * FROM users WHERE id = ?", [req.userId]);
    if (!user?.stripe_customer_id) {
      return res.status(400).json({ error: "No billing account found." });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/app`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Portal error:", err);
    res.status(500).json({ error: "Failed to open billing portal" });
  }
});

// ── Billing status ─────────────────────────────────────────────────
router.get("/status", authenticate, (req, res) => {
  const user = getOne("SELECT * FROM users WHERE id = ?", [req.userId]);
  res.json({
    plan: user.plan,
    subscriptionStatus: user.subscription_status,
    trialEndsAt: user.trial_ends_at,
    hasStripeCustomer: !!user.stripe_customer_id,
  });
});

// ── Stripe Webhook ─────────────────────────────────────────────────
function createWebhookHandler() {
  return async (req, res) => {
    const stripe = getStripe();
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("Webhook signature failed:", err.message);
      return res.status(400).json({ error: "Invalid signature" });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const user = getOne("SELECT * FROM users WHERE stripe_customer_id = ?", [session.customer]);
        if (user && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          const plan = sub.metadata?.plan || "professional";
          runAndSave(
            `UPDATE users SET plan=?, stripe_subscription_id=?, subscription_status='active', updated_at=datetime('now') WHERE id=?`,
            [plan, session.subscription, user.id]
          );
          console.log(`[billing] ${user.email} upgraded to ${plan}`);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const user = getOne("SELECT * FROM users WHERE stripe_customer_id = ?", [sub.customer]);
        if (user) {
          const plan = sub.status === "canceled" ? "starter" : (sub.metadata?.plan || user.plan);
          runAndSave(
            `UPDATE users SET plan=?, subscription_status=?, trial_ends_at=?, updated_at=datetime('now') WHERE id=?`,
            [plan, sub.status, sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null, user.id]
          );
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const user = getOne("SELECT * FROM users WHERE stripe_customer_id = ?", [sub.customer]);
        if (user) {
          runAndSave(
            `UPDATE users SET plan='starter', subscription_status='canceled', stripe_subscription_id=NULL, updated_at=datetime('now') WHERE id=?`,
            [user.id]
          );
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const user = getOne("SELECT * FROM users WHERE stripe_customer_id = ?", [invoice.customer]);
        if (user) {
          runAndSave("UPDATE users SET subscription_status='past_due', updated_at=datetime('now') WHERE id=?", [user.id]);
        }
        break;
      }
    }

    res.json({ received: true });
  };
}

module.exports = { router, createWebhookHandler };
