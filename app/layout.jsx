import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "YJ Building Evolution",
  description: "YJ Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <div className="min-h-screen flex">
          
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}