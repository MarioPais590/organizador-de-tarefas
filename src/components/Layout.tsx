import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { InstallPWAButton } from "@/components/InstallPWAButton";

type LayoutProps = {
  children: React.ReactNode;
};

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-8 pt-14 md:pt-4 w-full overflow-x-hidden">
        <div className="container mx-auto px-0 md:px-4 max-w-full">
          <div className="fixed top-4 right-4 z-50">
            <InstallPWAButton />
          </div>
          {children}
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}
