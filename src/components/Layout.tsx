import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { PWAInstallButton } from "@/components/PWAInstallButton";

type LayoutProps = {
  children: React.ReactNode;
};

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-8 pt-14 md:pt-4 w-full overflow-x-hidden">
        <div className="absolute top-2 right-3 z-10">
          <PWAInstallButton />
        </div>
        <div className="container mx-auto px-0 md:px-4 max-w-full">
          {children}
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}
