
import "./globals.css";
import { cookies } from "next/headers";
import AppLayout from "@/components/AppLayout";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

export const metadata = {
  title: "YJ Building Evolution",
  description: "YJ Management System",
};

const VALID_ROLES = ["admin", "yjpo", "yjest"];

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();

  // Use the same session cookie as proxy.ts.
  const sessionCookie = cookieStore.get("__session")?.value;

  let isAuthenticated = false;
  let role = null;

  // Verify the server session and read the role from Firebase.
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
