import { NextResponse, type NextRequest } from "next/server";

/** App is fully public — no auth gate on routes. */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
