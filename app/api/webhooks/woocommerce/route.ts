import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { verifyWooCommerceWebhookSignature } from '@/lib/woocommerce';
import { enqueueProductSync } from '@/lib/queue/queue';
// Required WooCommerce Webhooks → WC > Settings > Advanced > Webhooks:
// product.updated, order.created, order.updated, order.deleted
// All pointing to same URL, secret = WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-wc-webhook-signature');
    if (!signature) {
      return NextResponse.json({ success: false, error: 'Missing signature', code: 'unauthorized' }, { status: 401 });
    }

    const rawBody = await req.arrayBuffer();
    const buffer = Buffer.from(rawBody);

    const isValid = verifyWooCommerceWebhookSignature(buffer, signature);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid signature', code: 'unauthorized' }, { status: 401 });
    }

    const event = req.headers.get('x-wc-webhook-event');
    const topic = req.headers.get('x-wc-webhook-topic');
    const body = JSON.parse(buffer.toString('utf8'));

    const id = body.id || body.product_id || body.order_id;
    console.log(`[WC Webhook] Received topic: ${topic}, event: ${event}, id: ${id}`);

    if (topic === 'product.updated') {
      enqueueProductSync().catch(console.error);
    }

    // Return 200 immediately
    return NextResponse.json({ success: true, data: { received: true } });
  } catch (error) {
    console.error('[WC Webhook Error]', error);
    return NextResponse.json({ success: false, error: 'Internal server error', code: 'internal_error' }, { status: 500 });
  }
}
