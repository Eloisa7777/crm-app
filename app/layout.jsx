
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

  const sessionCookie = cookieStore.get(
    SESSION_COOKIE_NAME
  )?.value;

  let isAuthenticated = false;
  let role = null;

  if (sessionCookie) {
    try {
const { adminAuth, adminDb } = await getFirebaseAdminServices();

      // 1. Verify Firebase Session Cookie.
      const decodedToken =
        await adminAuth.verifySessionCookie(
          sessionCookie,
          true
        );

      const uid = decodedToken.uid;

      // 2. Read user RBAC document.
      const userSnap = await adminDb
        .collection("users")
        .doc(uid)
        .get();

      if (!userSnap.exists) {
        throw new Error("USER_NOT_REGISTERED");
      }

      const userData = userSnap.data();

      // 3. Check user status.
      if (userData.Active !== true) {
        throw new Error("USER_DISABLED");
      }

      // 4. Get roleId from Firestore.
      const roleId = userData.roleId;

      if (
        typeof roleId !== "string" ||
        !VALID_ROLES.includes(roleId)
      ) {
        throw new Error("INVALID_USER_ROLE");
      }

      // 5. Verify role document exists and is active.
      const roleSnap = await adminDb
        .collection("roles")
        .doc(roleId)
        .get();

      if (!roleSnap.exists) {
        throw new Error("ROLE_NOT_FOUND");
      }

      const roleData = roleSnap.data();

      if (roleData.active === false) {
        throw new Error("ROLE_DISABLED");
      }

      // 6. Authentication successful.
      isAuthenticated = true;
      role = roleId;

    } catch (error) {
      console.error("[RootLayout] Authentication failed:", {
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
