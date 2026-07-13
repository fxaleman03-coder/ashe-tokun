import { NextResponse, type NextRequest } from "next/server";
import { staffSessionCookieName } from "@/lib/staff/sessionCookie";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-ashe-pathname", pathname);

  if (
    pathname.startsWith("/staff") &&
    pathname !== "/staff/login" &&
    !pathname.startsWith("/staff/login/") &&
    pathname !== "/staff/change-pin" &&
    !pathname.startsWith("/staff/change-pin/")
  ) {
    const hasStaffSession = request.cookies.has(staffSessionCookieName);

    if (!hasStaffSession) {
      return NextResponse.redirect(
        new URL("/staff/login?status=session_required", request.url),
      );
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/staff/:path*", "/admin/:path*"],
};
