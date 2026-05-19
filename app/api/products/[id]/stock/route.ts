import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { getProductStock, WCApiError } from '@/lib/woocommerce';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stockData = await getProductStock(id);
    return NextResponse.json({
      success: true,
      data: stockData
    });
  } catch (error) {
    if (error instanceof WCApiError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code
      }, { status: error.status });
    }
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error',
      code: 'internal_error'
    }, { status: 500 });
  }
}
