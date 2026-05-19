import 'server-only'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  // Auth check — ADMIN only
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  let deletedCount = 0

  // ── 1. Check each local order against WooCommerce ──────────────────────────
  const orders = await prisma.order.findMany({
    where: { wcOrderId: { not: null } },
    select: { id: true, wcOrderId: true, items: true }
  })

  for (const order of orders) {
    if (!order.wcOrderId) continue
    const wcOrderId = order.wcOrderId

    const response = await fetch(
      `${process.env.WC_BASE_URL}/wp-json/wc/v3/orders/${wcOrderId}`,
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(
            `${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`
          ).toString('base64')
        },
        cache: 'no-store'
      }
    )

    console.log(`[cleanup] order ${wcOrderId}: HTTP ${response.status}`)

    // WooCommerce returns these status codes for deleted orders:
    // 404 — order not found (hard deleted)
    // 410 — order trashed (soft deleted / in trash)
    // In BOTH cases, treat as deleted
    const exists = response.status !== 404 && response.status !== 410

    if (!exists) {
      // Restore local stock before deleting the order
      try {
        const orderItems = JSON.parse(order.items || "[]") as { productId: string; variationId?: string; quantity: number }[];
        for (const item of orderItems) {
          if (item.variationId) {
            const variant = await prisma.productVariant.findUnique({ where: { id: item.variationId } });
            if (variant) {
              await prisma.productVariant.update({
                where: { id: item.variationId },
                data: { stock: variant.stock + item.quantity }
              });
              
              // Also update parent computedStock
              const parent = await prisma.product.findUnique({
                where: { id: item.productId },
                include: { variants: true }
              });
              if (parent) {
                const computedStock = parent.variants.reduce((sum, v) => sum + v.stock, 0);
                await prisma.product.update({
                  where: { id: item.productId },
                  data: { computedStock }
                });
              }
            }
          } else {
            const product = await prisma.product.findUnique({ where: { id: item.productId } });
            if (product) {
              await prisma.product.update({
                where: { id: item.productId },
                data: { 
                  stock: product.stock + item.quantity,
                  computedStock: product.computedStock + item.quantity
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn(`[cleanup] failed to restore stock for order ${wcOrderId}:`, err);
      }

      await prisma.order.delete({ where: { id: order.id } })
      deletedCount++
      console.log(`[cleanup] deleted local order ${wcOrderId}`)
    }
  }

  // ── 2. Delete ALL website-sourced orders (legacy sync artefacts) ───────────
  const { count: websiteCount } = await prisma.order.deleteMany({
    where: { source: 'website' }
  })
  console.log('[cleanup] deleted website orders:', websiteCount)
  deletedCount += websiteCount

  console.log('[cleanup] Total deleted:', deletedCount)

  return NextResponse.json({
    success: true,
    deleted: deletedCount,
    message: `${deletedCount} order dihapus`
  })
}
