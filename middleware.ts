import { withAuth } from "next-auth/middleware";

// signed-out users see only the landing preview and the sign-in screen;
// everything that reads or writes a log requires a session
export default withAuth({
  pages: { signIn: "/signin" },
});

export const config = {
  matcher: [
    "/workout/:path*",
    "/history/:path*",
    "/profile/:path*",
    "/analytics/:path*",
    "/exercises/:path*",
  ],
};
