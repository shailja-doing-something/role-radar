import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

// Edge-safe auth instance built from the Prisma-free config.
// NextAuth's own JWT verification handles secure-cookie naming
// correctly regardless of whether the host terminates SSL.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/patterns/:path*",
    "/top100/:path*",
    "/sources/:path*",
    "/settings/:path*",
  ],
};
