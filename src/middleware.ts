import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SPORT_HEADER, sportFromLocation } from "@/lib/sport-from-route";
import {
  DEVICE_COOKIE_MAX_AGE,
  DEVICE_COOKIE_NAME,
  createDeviceId,
  isValidDeviceId,
} from "@/lib/workspace/device-cookie";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const routeSport = sportFromLocation(request.nextUrl.pathname, request.nextUrl.searchParams);
  if (routeSport) requestHeaders.set(SPORT_HEADER, routeSport);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const existing = request.cookies.get(DEVICE_COOKIE_NAME)?.value;

  if (!isValidDeviceId(existing)) {
    response.cookies.set(DEVICE_COOKIE_NAME, createDeviceId(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: DEVICE_COOKIE_MAX_AGE,
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
