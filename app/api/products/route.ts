import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { Product } from '@/types/pos';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const per_page = parseInt(searchParams.get('per_page') || '24', 10);

    const skip = (page - 1) * per_page;

    const where: Prisma.ProductWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: per_page,
        include: {
          variants: true
        },
        orderBy: [
          { stockPriority: 'desc' },
          { name: 'asc' },
        ]
      }),
      prisma.product.count({ where })
    ]);

    const mappedProducts: Product[] = products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      sku: p.sku || '',
      type: p.type as "simple" | "variable",
      image: p.image || undefined,
      categoryIds: p.categoryIds,
      variants: p.variants.map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku || '',
        price: v.price,
        stock: v.stock
      }))
    }));

    return NextResponse.json({
      success: true,
      data: mappedProducts,
      total
    }, {
      headers: {
        'Cache-Control': 'max-age=30'
      }
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch products',
      code: 'internal_error'
    }, { status: 500 });
  }
}
