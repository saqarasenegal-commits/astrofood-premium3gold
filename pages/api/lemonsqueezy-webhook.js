// pages/api/lemonsqueezy-webhook.js
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import streamBuffers from 'stream-buffers';
import { getIntentById, markPurchaseProcessed, purchaseExists } from '../../lib/db';
import { getRecipeById } from '../../lib/recipes';
import { supabaseUploadBufferAndGetSignedUrl } from '../../lib/supabase';
import { sendEmail } from '../../lib/email';

export const config = { api: { bodyParser: false } };

function bufferToHex(b){ return b.toString('hex'); }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');

  // Read raw body
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks);

  const signature = (req.headers['x-signature'] || '').toString();
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('LEMONSQUEEZY_WEBHOOK_SECRET not set');
    return res.status(500).end('Server misconfigured');
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // Timing-safe comparison
  try {
    if (expected.length !== signature.length || !crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))) {
      console.warn('Invalid signature', { expected, signature });
      return res.status(401).end('Invalid signature');
    }
  } catch (e) {
    console.warn('Signature compare error', e);
    return res.status(401).end('Invalid signature');
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    console.error('Invalid JSON payload', err);
    return res.status(400).end('Invalid JSON');
  }

  // event name may be in header or payload
  const eventName = req.headers['x-event-name'] || payload.event_name || '';

  // Extract order id and meta fields (depends on Lemon's payload structure)
  const orderId = payload?.data?.id ? String(payload.data.id) : null;
  const meta = payload?.data?.attributes?.meta || {}; // if you sent meta at create-time
  const customerEmail = payload?.data?.attributes?.customer?.email || meta.email || null;

  // Idempotency: check if purchase already processed
  if (orderId && await purchaseExists(orderId)) {
    console.log('Order already processed:', orderId);
    return res.status(200).json({ ok: true, info: 'already processed' });
  }

  // Only act on paid orders (adjust event name based on Lemon docs)
  if (eventName === 'order_paid' || eventName === 'order_completed' || (payload?.data?.attributes?.status === 'paid')) {
    // Map to our purchase_intent_id: prefer meta.purchase_intent_id else attempt to parse return_url
    const purchaseIntentId = meta.purchase_intent_id || meta.pi || (payload?.data?.attributes?.return_url ? (new URL(payload.data.attributes.return_url)).searchParams.get('pi') : null);

    const intent = purchaseIntentId ? await getIntentById(purchaseIntentId) : null;

    // If no intent found, fallback to trying to map by email (best-effort)
    const recipeId = intent?.recipe_id || meta.recipe_id || null;
    const emailToUse = intent?.email || customerEmail || meta.email || null;

    if (!recipeId) {
      console.warn('No recipe_id mapped for order', orderId);
      // Save minimal record if you have DB logic — here, just return ok to webhook
      return res.status(200).json({ ok: true, info: 'no recipe mapped' });
    }

    // Generate PDF from recipe
    let recipe;
    try {
      recipe = await getRecipeById(recipeId);
      if (!recipe) {
        console.error('Recipe not found for id', recipeId);
        return res.status(500).end('Recipe not found');
      }
    } catch (e) {
      console.error('Error loading recipe', e);
      return res.status(500).end('Recipe fetch error');
    }

    // Create PDF using pdfkit
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const writableBuffer = new streamBuffers.WritableStreamBuffer();

    doc.pipe(writableBuffer);

    // Simple layout — customize as needed
    if (recipe.title) {
      doc.fontSize(20).fillColor('#081024').text(recipe.title, { align: 'center' }).moveDown();
    }
    doc.fontSize(12).text('Ingrédients:', { underline: true }).moveDown(0.5);
    (recipe.ingredients || []).forEach(i => doc.text('• ' + i));
    doc.moveDown();
    doc.fontSize(12).text('Préparation:', { underline: true }).moveDown(0.5);
    (recipe.steps || []).forEach((s, idx) => doc.text(`${idx+1}. ${s}`));
    if (recipe.notes) { doc.addPage().fontSize(10).text('Notes:').moveDown().text(recipe.notes); }

    doc.end();
    const pdfBuffer = writableBuffer.getContents();

    // Upload to Supabase Storage and get signed URL
    try {
      const path = `purchases/${orderId || 'order_' + Date.now()}_${Date.now()}.pdf`;
      const signedUrl = await supabaseUploadBufferAndGetSignedUrl(path, pdfBuffer, 'application/pdf', 60 * 60 * 24 * 3); // 3 days
      // Save purchase record in DB (implement markPurchaseProcessed)
      await markPurchaseProcessed({ order_id: orderId, recipe_id: recipeId, file_url: signedUrl, customer_email: emailToUse, status: 'delivered' });

      // Send email with link if email present
      if (emailToUse) {
        const subject = `Votre carte recette AstroFood — ${recipe.title || ''}`;
        const html = `<p>Bonjour,</p>
          <p>Merci pour votre achat ! Téléchargez votre carte recette imprimable (disponible 72h) :</p>
          <p><a href="${signedUrl}">Télécharger la carte recette</a></p>
          <p>Bonne dégustation — L'équipe AstroFood</p>`;
        await sendEmail({ to: emailToUse, subject, html });
      }

      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('Upload / processing error', e);
      return res.status(500).end('Processing error');
    }
  }

  // For other events just acknowledge
  return res.status(200).json({ ok: true, info: 'ignored event' });
}
