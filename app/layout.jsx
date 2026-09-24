import "./globals.css";
import { cookies } from "next/headers";
import AppLayout from "@/components/AppLayout";

export const metadata = {
  title: "YJ Building Evolution",
  description: "YJ Management System",
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();

  const auth = cookieStore.get("yj_auth")?.value;
  const role = cookieStore.get("yj_role")?.value;

  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <AppLayout
          isAuthenticated={auth === "authenticated"}
          role={role}
        >
          {children}
        </AppLayout>
      </body>
    </html>
  );
}