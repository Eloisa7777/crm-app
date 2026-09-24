import "./globals.css";
import AppLayout from "@/components/AppLayout";

export const metadata = {
  title: "YJ Building Evolution",
  description: "YJ Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}