

import Sidebar from "../components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-black overflow-hidden">
      {/* The Sidebar sits on the left */}
      <Sidebar />
      
      {/* The Page Content sits on the right. If {children} is missing, the page goes white! */}
      <main className="flex-1 overflow-y-auto relative">
        {children}
      </main>
    </div>
  );
}