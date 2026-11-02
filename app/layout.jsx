
import "./globals.css";
import { cookies } from "next/headers";
import AppLayout from "@/components/AppLayout";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

export const metadata = {
  title: "YJ Building Evolution",
  description: "YJ Management System",
};

// All valid CRM roles.
const VALID_ROLES = ["admin", "yjpo", "yjest", "subsup"];

// Must match login API and proxy.
const SESSION_COOKIE_NAME = "yj_session";

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();

  // Read the unified CRM session cookie.
  const sessionCookie = cookieStore.get(
    SESSION_COOKIE_NAME
  )?.value;

  let isAuthenticated = false;
  let role = null;

  // Verify Firebase session and read custom claims.
  if (sessionCookie) {
    try {
      const { adminAuth } = getFirebaseAdminServices();

      const decodedToken = await adminAuth.verifySessionCookie(
        sessionCookie,
        true
      );

      const tokenRole = decodedToken.role;

      if (
        typeof tokenRole === "string" &&
        VALID_ROLES.includes(tokenRole)
      ) {
        isAuthenticated = true;
        role = tokenRole;
      }
    } catch (error) {
      console.error("[RootLayout] Session verification failed:", {
        code: error?.code,
        message: error?.message,
      });
    }
  }

  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <AppLayout
          isAuthenticated={isAuthenticated}
          role={role}
        >
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
