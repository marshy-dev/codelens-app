import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { plan } = req.body;

  if (!plan || !['pro', 'team'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const priceId = plan === 'pro'
    ? process.env.STRIPE_PRO_PRICE_ID
    : process.env.STRIPE_TEAM_PRICE_ID;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      trial_period_days: plan === 'pro' ? 7 : undefined,
      success_url: `https://codelens.tech?success=true`,
      cancel_url: `https://codelens.tech?cancelled=true`,
      billing_address_collection: 'auto',
      automatic_tax: { enabled: true },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
