import 'server-only';
import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/woocommerce';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await getCategories();
    
    return NextResponse.json({
      success: true,
      data: categories
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to fetch categories" }, { status: 500 });
  }
}
