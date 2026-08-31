import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getWCOrder, updateWCOrder, addOrderNote, WCApiError } from '@/lib/woocommerce';
import type { OrderItemPayload } from '@/types/api-schemas';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wcOrderId: string }> }
) {
  try {
    const { wcOrderId } = await params;
    const localOrder = await prisma.order.findFirst({
      where: { wcOrderId }
    });

    if (!localOrder) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: localOrder });
  } catch (error) {
    console.error('[Order Detail GET Error]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ wcOrderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'unauthorized' },
        { status: 401 }
      );
    }

    const { wcOrderId } = await params;
    if (!wcOrderId) {
      return NextResponse.json(
        { success: false, error: 'Missing wcOrderId', code: 'validation_error' },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log(`[Order PUT] Editing order #${wcOrderId}:`, JSON.stringify(body).slice(0, 300));

    // Step 1: Fetch current WC order to know current status + items
    const currentWCOrder = await getWCOrder(wcOrderId);
    if (!currentWCOrder) {
      return NextResponse.json(
        { success: false, error: 'WooCommerce order not found', code: 'not_found' },
        { status: 404 }
      );
    }

    // If status is 'completed', temporarily set to 'processing' for editing
    if (currentWCOrder.status === 'completed') {
      console.log(`[Order PUT] Temporarily changing status of #${wcOrderId} to processing`);
      await updateWCOrder(wcOrderId, { status: 'processing' });
    }

    // Step 2: Build WC update payload
    const wcUpdatePayload: Record<string, unknown> = {};

    // Update line items if provided (either via body.line_items or calculated from body.items)
    if (body.line_items) {
      wcUpdatePayload.line_items = body.line_items;
    } else if (body.items && Array.isArray(body.items)) {
      const newItems = body.items as OrderItemPayload[];
      const wcLineItems: Array<{
        id?: number;
        product_id?: number;
        variation_id?: number;
        quantity: number;
      }> = [];

      // Map existing WC line items
      for (const wcLineItem of currentWCOrder.line_items) {
        const matchingNewItem = newItems.find((item) => {
          const itemProdId = Number(item.productId);
          const itemVarId = item.variationId ? Number(item.variationId) : 0;
          const wcVarId = wcLineItem.variation_id || 0;
          return itemProdId === wcLineItem.product_id && itemVarId === wcVarId;
        });

        if (matchingNewItem) {
          wcLineItems.push({
            id: wcLineItem.id,
            quantity: matchingNewItem.quantity,
          });
        } else {
          // Setting quantity: 0 removes the item in WC and restores stock
          wcLineItems.push({
            id: wcLineItem.id,
            quantity: 0,
          });
        }
      }

      // Add newly added items not present in current WC order
      for (const newItem of newItems) {
        const itemProdId = Number(newItem.productId);
        const itemVarId = newItem.variationId ? Number(newItem.variationId) : 0;
        const existsInWC = currentWCOrder.line_items.some(
          (wcItem) => wcItem.product_id === itemProdId && (wcItem.variation_id || 0) === itemVarId
        );

        if (!existsInWC && newItem.quantity > 0) {
          wcLineItems.push({
            product_id: itemProdId,
            variation_id: newItem.variationId ? Number(newItem.variationId) : undefined,
            quantity: newItem.quantity,
          });
        }
      }

      wcUpdatePayload.line_items = wcLineItems;
    }

    // Update payment method
    let paymentMethod = body.payment_method;
    let paymentMethodTitle = body.payment_method_title;

    if (paymentMethod) {
      const pmNormalized = paymentMethod.startsWith('pos_') ? paymentMethod.slice(4) : paymentMethod;
      if (pmNormalized === 'cash') {
        paymentMethod = 'pos_cash';
        paymentMethodTitle = paymentMethodTitle || 'Cash';
      } else if (pmNormalized === 'transfer') {
        paymentMethod = 'pos_transfer';
        paymentMethodTitle = paymentMethodTitle || 'Direct Bank Transfer';
      } else if (pmNormalized === 'split') {
        paymentMethod = 'pos_split';
        paymentMethodTitle = paymentMethodTitle || `Split Transfer (Tunai: Rp ${Number(body.cash_amount ?? 0).toLocaleString('id-ID')} / Transfer: Rp ${Number(body.transfer_amount ?? 0).toLocaleString('id-ID')})`;
      } else if (pmNormalized === 'other') {
        paymentMethod = 'pos_other';
        paymentMethodTitle = paymentMethodTitle || `Other - ${body.other_label ?? 'Other'}`;
      }

      wcUpdatePayload.payment_method = paymentMethod;
      wcUpdatePayload.payment_method_title = paymentMethodTitle;
    }

    // Update customer name via billing
    if (body.customer_name !== undefined) {
      wcUpdatePayload.billing = {
        first_name: body.customer_name || 'Guest',
        last_name: '',
      };
    }

    // Update order note
    if (body.order_note !== undefined) {
      wcUpdatePayload.customer_note = body.order_note;
    }

    // Update meta_data for POS payment tracking
    const metaData: Array<{ key: string; value: string }> = [
      { key: '_is_pos', value: 'Y' },
      { key: '_pos_payment_method', value: body.payment_method ?? '' },
      { key: '_pos_cash_amount', value: String(body.cash_amount ?? 0) },
      { key: '_pos_transfer_amount', value: String(body.transfer_amount ?? 0) },
      { key: '_pos_cashier', value: session.user.name ?? 'Kasir' },
      { key: '_pos_edited_at', value: new Date().toISOString() },
      { key: '_pos_edited_by', value: session.user.name ?? 'Kasir' },
    ];

    if (body.other_label) {
      metaData.push({
        key: '_pos_other_label',
        value: body.other_label,
      });
    }

    if (body.discount_type !== undefined) {
      metaData.push(
        { key: '_pos_discount_type', value: body.discount_type ?? 'none' },
        { key: '_pos_discount_value', value: String(body.discount_value || 0) },
        { key: '_pos_discount_amount', value: String(body.discount_amount || 0) }
      );
    }

    wcUpdatePayload.meta_data = metaData;

    // Fee lines for discount
    wcUpdatePayload.fee_lines = body.fee_lines ?? [];

    // Set status back to completed
    wcUpdatePayload.status = 'completed';

    // Step 3: Call WC update API (WC is source of truth)
    console.log(`[Order PUT] Calling updateWCOrder for #${wcOrderId}`);
    const updatedWCOrder = await updateWCOrder(wcOrderId, wcUpdatePayload);
    console.log(`[Order PUT] WC order #${wcOrderId} updated successfully`);

    // Step 4: Update local Prisma DB only after WC succeeded
    const updatedItems = body.items ?? (body.line_items ? undefined : undefined);
    const subtotal = body.items
      ? (body.items as OrderItemPayload[]).reduce((sum, i) => sum + (i.price * i.quantity), 0)
      : undefined;
    const total = body.total !== undefined ? body.total : subtotal;

    await prisma.order.updateMany({
      where: { wcOrderId },
      data: {
        items: updatedItems ? JSON.stringify(updatedItems) : undefined,
        subtotal: subtotal !== undefined ? subtotal : undefined,
        discountType: body.discount_type ?? null,
        discountValue: body.discount_value ?? 0,
        discountAmount: body.discount_amount ?? 0,
        total: total !== undefined ? total : undefined,
        paymentMethod: paymentMethod ?? undefined,
        paymentMethodTitle: paymentMethodTitle ?? undefined,
        customerName: body.customer_name ?? undefined,
        orderNote: body.order_note ?? undefined,
        cashAmount: body.cash_amount ?? undefined,
        transferAmount: body.transfer_amount ?? undefined,
        otherLabel: body.other_label ?? undefined,
        wcStatus: 'completed',
        updatedAt: new Date(),
      },
    });

    // Step 5: Add WC order note about the edit for audit trail
    try {
      await addOrderNote(
        parseInt(wcOrderId, 10),
        `[POS] Order diedit oleh ${session.user.name ?? 'Kasir'} pada ${new Date().toLocaleString('id-ID')}`
      );
    } catch (noteErr) {
      console.warn('[Order PUT] Failed to add audit order note:', noteErr);
    }

    return NextResponse.json({ success: true, order: updatedWCOrder });
  } catch (error) {
    console.error('[Order PUT Error]', error);
    if (error instanceof WCApiError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update order',
        code: 'internal_error',
      },
      { status: 500 }
    );
  }
}
