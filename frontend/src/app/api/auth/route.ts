import { NextResponse } from 'next/server';

// API depreciat - folosește /api/auth/login sau /api/auth/signup
export async function GET() {
    return NextResponse.json({
        error: "API depreciat. Folosește /api/auth/login sau /api/auth/signup"
    }, { status: 410 });
}