import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { createOrder, getProductStock, WCApiError, addOrderNote } from '@/lib/woocommerce';
import { createOrderRequestSchema } from '@/types/api-schemas';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });
    }
    const cashierId = session.user.id;

    const body = await req.json();
    console.log('[orders POST] received body:', JSON.stringify(body).slice(0, 200));
    const offline_id = body.offline_id;
    
    if (!offline_id) {
      return NextResponse.json({ success: false, error: 'Missing offline_id', code: 'validation_error' }, { status: 400 });
    }

    // Step 2: Check IdempotencyKey table
    const existingKey = await prisma.idempotencyKey.findUnique({
      where: { key: offline_id }
    });

    if (existingKey && existingKey.response) {
      return NextResponse.json(JSON.parse(existingKey.response));
    }

    // Step 1: Validate body with Zod
    const validatedData = createOrderRequestSchema.parse(body);

    const paymentMethodRaw = validatedData.paymentMethod;
    const paymentMethodNormalized = paymentMethodRaw.startsWith('pos_') 
      ? paymentMethodRaw.slice(4) 
      : paymentMethodRaw;

    // FIX 5 — Validate split amounts server-side
    if (paymentMethodNormalized === 'split') {
      const cashAmt = Number(validatedData.cashAmount ?? body.cash_amount ?? 0);
      const transferAmt = Number(validatedData.transferAmount ?? body.transfer_amount ?? 0);
      const expectedTotal = Number(body.total);
      
      if (Math.abs((cashAmt + transferAmt) - expectedTotal) > 1) {
        return NextResponse.json({
          success: false,
          error: 'Split payment amounts do not match total',
          code: 'SPLIT_AMOUNT_MISMATCH',
          expected: expectedTotal,
          received: cashAmt + transferAmt,
        }, { status: 400 });
      }
    }

    // Step 3: Verify stock (Strict pre-check)
    const stockErrors: { name: string; requested: number; available: number }[] = [];

    for (const item of validatedData.items) {
      const liveStock = await getProductStock(
        parseInt(item.productId, 10),
        item.variationId ? parseInt(item.variationId, 10) : undefined
      );
      const available = liveStock.stock_quantity ?? 0;
      if (available < item.quantity) {
        stockErrors.push({
          name: item.name,
          requested: item.quantity,
          available
        });
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'STOCK_INSUFFICIENT',
        code: 'STOCK_INSUFFICIENT',
        items: stockErrors
      }, { status: 409 });
    }

    // Step 4: Call createOrder
    const lineItems = validatedData.items.map(item => ({
      product_id: parseInt(item.productId, 10),
      quantity: item.quantity,
      variation_id: item.variationId ? parseInt(item.variationId, 10) : undefined,
    }));

    // Map payment methods for WooCommerce
    let paymentMethod = paymentMethodNormalized;
    let paymentMethodTitle = 'POS';

    if (paymentMethod === 'cash') {
      paymentMethod = 'pos_cash';
      paymentMethodTitle = 'Cash';
    } else if (paymentMethod === 'transfer') {
      paymentMethod = 'pos_transfer';
      paymentMethodTitle = 'Direct Bank Transfer';
    } else if (paymentMethod === 'split') {
      paymentMethod = 'pos_split';
      paymentMethodTitle = `Split Transfer (Tunai: Rp ${Number(validatedData.cashAmount ?? body.cash_amount ?? 0).toLocaleString('id-ID')} / Transfer: Rp ${Number(validatedData.transferAmount ?? body.transfer_amount ?? 0).toLocaleString('id-ID')})`;
    }

    const meta_data = [
      { key: '_is_pos', value: 'Y' },
      { key: '_pos_cashier', value: session.user.name ?? 'POS' },
    ];

    if (paymentMethodNormalized === 'split') {
      meta_data.push(
        { key: '_pos_payment_method', value: 'split' },
        { key: '_pos_cash_amount', value: String(validatedData.cashAmount ?? body.cash_amount ?? 0) },
        { key: '_pos_transfer_amount', value: String(validatedData.transferAmount ?? body.transfer_amount ?? 0) }
      );
    }

    const discountAmount = validatedData.discountAmount || 0;
    const subtotal = validatedData.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const taxAmount = validatedData.taxAmount || 0;
    const total = subtotal - discountAmount + taxAmount;

    const fee_lines: { name: string; total: string }[] = discountAmount > 0 ? [{
      name: validatedData.discountType === 'percent'
        ? `Diskon ${validatedData.discountValue}%`
        : 'Diskon',
      total: String(-discountAmount)
    }] : [];

    const wcResponse = await createOrder({
      payment_method: paymentMethod,
      payment_method_title: paymentMethodTitle,
      set_paid: true,
      status: 'completed',
      billing: validatedData.customerName ? {
        first_name: validatedData.customerName,
        last_name: ''
      } : {
        first_name: 'JB - Store',
        last_name: ''
      },
      line_items: lineItems,
      fee_lines,
      customer_note: (() => {
        const cash_amount = validatedData.cashAmount ?? body.cash_amount ?? 0;
        const transfer_amount = validatedData.transferAmount ?? body.transfer_amount ?? 0;
        const given_amount = validatedData.cashAmount ?? body.cash_amount ?? total;
        const change_amount = Math.max(0, given_amount - total);

        const breakdown = paymentMethodNormalized === 'split'
          ? `[POS Split Payment] Tunai: Rp ${Number(cash_amount).toLocaleString('id-ID')} | Transfer: Rp ${Number(transfer_amount).toLocaleString('id-ID')}`
          : paymentMethodNormalized === 'cash'
          ? `[POS Cash Payment] Diterima: Rp ${Number(given_amount).toLocaleString('id-ID')} | Kembalian: Rp ${Number(change_amount).toLocaleString('id-ID')}`
          : `[POS Transfer Payment] Rp ${Number(total).toLocaleString('id-ID')}`;

        return validatedData.orderNote 
          ? `${breakdown}\nNotes: ${validatedData.orderNote}`
          : breakdown;
      })(),
      meta_data: [
        ...meta_data,
        { key: '_pos_customer_name', value: validatedData.customerName ?? 'Guest' },
        { key: '_pos_discount_type', value: validatedData.discountType ?? 'none' },
        { key: '_pos_discount_value', value: String(validatedData.discountValue || 0) },
        { key: '_pos_discount_amount', value: String(discountAmount) },
      ],
    });
    console.log('[orders POST] WC order created:', wcResponse.id);

    // FIX 3 — Order note (shows in WC order timeline)
    try {
      const cash_amount = validatedData.cashAmount ?? body.cash_amount ?? 0;
      const transfer_amount = validatedData.transferAmount ?? body.transfer_amount ?? 0;
      const given_amount = validatedData.cashAmount ?? body.cash_amount ?? total;
      const change_amount = Math.max(0, given_amount - total);

      const noteContent = paymentMethodNormalized === 'split'
        ? `[POS] Split Payment:\n- Tunai: Rp ${Number(cash_amount).toLocaleString('id-ID')}\n- Transfer: Rp ${Number(transfer_amount).toLocaleString('id-ID')}\n- Total: Rp ${Number(total).toLocaleString('id-ID')}`
        : paymentMethodNormalized === 'cash'
        ? `[POS] Pembayaran Tunai - Diterima: Rp ${Number(given_amount).toLocaleString('id-ID')}, Kembalian: Rp ${Number(change_amount).toLocaleString('id-ID')}`
        : `[POS] Pembayaran Transfer - Rp ${Number(total).toLocaleString('id-ID')}`;

      await addOrderNote(wcResponse.id, noteContent);
    } catch (e) {
      console.warn('[addOrderNote] failed:', e);
    }

    // Overwrite item SKUs and variantNames from the local database to guarantee 100% data integrity
    for (const item of validatedData.items) {
      try {
        if (item.variationId) {
          const variant = await prisma.productVariant.findUnique({
            where: { id: item.variationId },
            select: { sku: true, name: true }
          });
          if (variant) {
            if (variant.sku) item.sku = variant.sku;
            if (variant.name) item.variantName = variant.name;
          }
        } else {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { sku: true }
          });
          if (product && product.sku) {
            item.sku = product.sku;
          }
        }
      } catch (e) {
        console.warn('[checkout] Backend item resolution failed:', e);
      }
    }

    const order = await prisma.order.create({
      data: {
        posOrderId: offline_id,
        wcOrderId: wcResponse.id.toString(),
        cashierId,
        items: JSON.stringify(validatedData.items),
        subtotal,
        discountAmount,
        taxAmount,
        total,
        paymentMethod: validatedData.paymentMethod,
        paymentMethodTitle: paymentMethodTitle,
        cashAmount: validatedData.cashAmount,
        transferAmount: validatedData.transferAmount,
        customerName: validatedData.customerName,
        orderNote: validatedData.orderNote,
        discountType: validatedData.discountType,
        discountValue: validatedData.discountValue,
        syncStatus: 'SYNCED',
      }
    });
    console.log('[orders POST] saved to DB:', order.id);

    // Step 5.5: Deduct stock in local DB immediately
    try {
      for (const item of validatedData.items) {
        if (item.variationId) {
          const variant = await prisma.productVariant.findUnique({ where: { id: item.variationId } });
          if (variant) {
            await prisma.productVariant.update({
              where: { id: item.variationId },
              data: { stock: Math.max(0, variant.stock - item.quantity) }
            });
            const variants = await prisma.productVariant.findMany({
              where: { productId: item.productId },
              select: { stock: true }
            });
            const newComputedStock = variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
            await prisma.product.update({
              where: { id: item.productId },
              data: { computedStock: newComputedStock }
            });
          }
        } else {
          const product = await prisma.product.findUnique({ where: { id: item.productId } });
          if (product) {
            const newStock = Math.max(0, product.stock - item.quantity);
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stock: newStock,
                computedStock: newStock
              }
            });
          }
        }
      }
      console.log('[order] Local stock deducted for order', wcResponse.id);
    } catch (dbError) {
      console.error('[order] Failed to deduct local stock:', dbError);
    }

    const responseData = { 
      success: true, 
      order: {
        id: wcResponse.id,
        wcOrderId: String(wcResponse.id),
        number: wcResponse.number,
        status: wcResponse.status,
        total: wcResponse.total,
        date_created: wcResponse.date_created,
        createdAt: wcResponse.date_created,
      }
    };

    console.log('[orders POST] returning:', { success: true, orderId: wcResponse.id });

    // Step 6: Save offline_id -> response mapping
    await prisma.idempotencyKey.create({
      data: {
        key: offline_id,
        orderId: order.id,
        response: JSON.stringify(responseData)
      }
    });

    return NextResponse.json(responseData);
  } catch (error) {
    if (error instanceof WCApiError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
    }
    // Check if error is from Zod validation
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation error', code: 'validation_error' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error', code: 'internal_error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const per_page = parseInt(searchParams.get('per_page') || '20', 10);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    const skip = (page - 1) * per_page;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const where: Prisma.OrderWhereInput = {
      source: 'pos',
      createdAt: { gte: thirtyDaysAgo }
    };

    if (status && status !== 'all') {
      where.wcStatus = status;
    }
    if (search) {
      where.OR = [
        { wcOrderId: { contains: search } },
        { customerName: { contains: search } },
        { posOrderId: { contains: search } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: per_page,
        include: {
          cashier: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.order.count({ where })
    ]);

    const mappedOrders = await Promise.all(orders.map(async (order) => {
      let parsedItems = [];
      try {
        parsedItems = JSON.parse(order.items);
        for (const item of parsedItems) {
          if (item.variationId) {
            const variant = await prisma.productVariant.findUnique({
              where: { id: item.variationId },
              select: { sku: true, name: true }
            });
            if (variant) {
              if (variant.sku) item.sku = variant.sku;
              if (variant.name) item.variantName = variant.name;
            }
          }
        }
      } catch (e) {
        console.warn('[Orders GET] Failed to parse/enrich items:', e);
      }

      return {
        id: order.id,
        posOrderId: order.posOrderId,
        wcOrderId: order.wcOrderId,
        cashierId: order.cashierId,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        taxAmount: order.taxAmount,
        total: order.total,
        paymentMethod: order.paymentMethod,
        discountType: order.discountType,
        discountValue: order.discountValue,
        orderNote: order.orderNote,
        cashAmount: order.cashAmount,
        transferAmount: order.transferAmount,
        customerName: order.customerName,
        syncStatus: order.syncStatus,
        retryCount: order.retryCount,
        errorMessage: order.errorMessage,
        items: parsedItems,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        cashierName: order.cashier?.name
      };
    }));

    return NextResponse.json({
      success: true,
      data: mappedOrders,
      total
    });
  } catch (error) {
    console.error('[Orders GET Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders', code: 'internal_error' }, { status: 500 });
  }
}
