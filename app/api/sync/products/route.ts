import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enqueueProductSync } from '@/lib/queue/queue';
import { runProductSyncIncremental } from '@/lib/sync/product-sync';
import type { Product } from '@/types/pos';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        code: 'unauthorized'
      }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const force = searchParams.get('force') === 'true';

    // Reset watermark when force is requested
    if (force) {
      await prisma.syncLock.updateMany({
        data: {
          lastSyncedAt: null,
        }
      });
    }

    // Try to queue via BullMQ first
    try {
      await enqueueProductSync({ force });
      console.log('[sync] job queued to BullMQ');
    } catch (queueError) {
      // BullMQ/Redis unavailable — run sync inline as fallback
      console.warn('[sync] BullMQ unavailable, running sync inline:', queueError);
      try {
        await runProductSyncIncremental({ force });
        console.log('[sync] inline sync completed');
      } catch (syncError) {
        console.error('[sync] inline sync failed:', syncError);
      }
    }

    // Always return current DB snapshot regardless of sync method
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        include: { variants: true },
        orderBy: [{ stockPriority: 'desc' }, { name: 'asc' }],
        take: 500,
      }),
      prisma.product.count(),
    ]);

    const mappedProducts: Product[] = products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      sku: p.sku ?? '',
      type: p.type as "simple" | "variable",
      image: p.image ?? undefined,
      categoryIds: p.categoryIds,
      variants: p.variants.map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku ?? '',
        price: v.price,
        stock: v.stock,
      }))
    }));

    return NextResponse.json({
      success: true,
      queued: true,
      data: mappedProducts,
      total,
      message: `Sync dimulai. ${total} produk tersedia.`
    });
  } catch (error) {
    console.error('[SYNC_PRODUCTS_ERROR]', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start sync',
      code: 'internal_error'
    }, { status: 500 });
  }
}
