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

  const params = new URLSearchParams();
  params.append('mode', 'subscription');
  params.append('payment_method_types[]', 'card');
  params.append('line_items[0][price]', priceId);
  params.append('line_items[0][quantity]', '1');
  params.append('success_url', 'https://codelens.tech?success=true');
  params.append('cancel_url', 'https://codelens.tech?cancelled=true');
  params.append('billing_address_collection', 'auto');
  if (plan === 'pro') {
    params.append('subscription_data[trial_period_days]', '7');
  }

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();
    console.log('Stripe status:', response.status);
    console.log('Stripe response:', JSON.stringify(data));

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Stripe error' });
    }

    res.status(200).json({ url: data.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
