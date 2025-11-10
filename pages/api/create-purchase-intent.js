// pages/api/create-purchase-intent.js
import { nanoid } from 'nanoid';
import { insertIntent } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { recipe_id, email } = req.body || {};
  if (!recipe_id) return res.status(400).json({ error: 'recipe_id required' });

  const intentId = nanoid(12);
  await insertIntent({ id: intentId, recipe_id, email: email || null, status: 'created', created_at: new Date() });

  // Compose LemonSqueezy checkout URL.
  // Replace YOUR_PRODUCT_CHECKOUT_PATH with the real path from LemonSqueezy.
  // Use return_url to include the purchase_intent id so you can map the order to the intent.
  const checkoutUrl = `https://checkout.lemon.io/YOUR_PRODUCT_CHECKOUT_PATH?return_url=${encodeURIComponent((process.env.APP_BASE_URL || '') + '/thanks?pi=' + intentId)}`;

  return res.status(200).json({ purchase_intent_id: intentId, checkout_url: checkoutUrl });
}
