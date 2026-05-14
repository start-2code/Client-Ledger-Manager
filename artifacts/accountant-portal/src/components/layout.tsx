import React from "react";
import { Link, useLocation } from "wouter";
import { Building2, LayoutDashboard, Users, CheckSquare, FileText, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/tax-returns", label: "Tax Returns", icon: FileText },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const NavLinks = () => (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </div>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-sidebar px-4 sm:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 text-sidebar-foreground">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-sidebar border-r-sidebar-border text-sidebar-foreground p-0">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-8">
                <div className="bg-primary p-2 rounded-md">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-semibold text-lg tracking-tight">ClearBooks</span>
              </div>
              <NavLinks />
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 text-sidebar-foreground font-semibold">
          <Building2 className="h-5 w-5 text-primary" />
          ClearBooks Portal
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground shrink-0 sticky top-0 h-screen">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-primary p-2 rounded-md shadow-sm">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl tracking-tight">ClearBooks</span>
          </div>
          <NavLinks />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
