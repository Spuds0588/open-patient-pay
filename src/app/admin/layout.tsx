import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { config } from "@/lib/config";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              {config.appShortName.slice(0, 2).toUpperCase()}
            </span>
            <span className="font-semibold">{config.appName}</span>
            <span className="ml-1 hidden items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground sm:flex">
              <Stethoscope className="h-3 w-3" /> Admin
            </span>
          </Link>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
