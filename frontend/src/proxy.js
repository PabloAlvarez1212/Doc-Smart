import { NextResponse } from "next/server";

export function proxy(request) {
    return NextResponse.next();
}

export const config = {
    matcher: [
        "/patient/:path*",
        "/doctor/:path*",
        "/admin/:path*",
        "/login",
    ],
};