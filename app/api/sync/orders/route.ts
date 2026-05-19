import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Order sync disabled' },
    { status: 410 }
  );
}
