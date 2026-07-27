import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  DEVICE_COOKIE_MAX_AGE,
  DEVICE_COOKIE_NAME,
  createDeviceId,
  isValidDeviceId,
} from "@/lib/workspace/device-cookie";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
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
