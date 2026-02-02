import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Receipt, 
  LogOut, 
  Wallet,
  Settings,
  Banknote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/incomes", label: "Income", icon: Banknote },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="h-screen w-64 bg-card border-r border-border flex flex-col fixed left-0 top-0 z-30 hidden md:flex shadow-xl shadow-primary/5">
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3 text-primary mb-8">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-tight text-foreground">SpendWisely</h1>
            <p className="text-xs text-muted-foreground font-medium">Finance Tracker</p>
          </div>
        </div>
        
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group font-medium text-sm",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground hover:shadow-sm"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-auto p-6 border-t border-border bg-muted/20">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="font-medium text-sm truncate text-foreground">{user?.username}</p>
            <p className="text-xs text-muted-foreground truncate">Free Plan</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-colors"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
      </div>
    </div>
  );
}

export function MobileNav() {
  const [location] = useLocation();
  const { logout } = useAuth();
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border z-50 px-8 pt-3 safe-area-bottom-pad flex justify-between items-center">
      <Link href="/">
        <div className={cn("flex flex-col items-center gap-1", location === "/" ? "text-primary" : "text-muted-foreground")}>
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-medium">Home</span>
        </div>
      </Link>
      <Link href="/expenses">
        <div className={cn("flex flex-col items-center gap-1", location === "/expenses" ? "text-primary" : "text-muted-foreground")}>
          <Receipt className="w-6 h-6" />
          <span className="text-[10px] font-medium">Expenses</span>
        </div>
      </Link>
      <Link href="/incomes">
        <div className={cn("flex flex-col items-center gap-1", location === "/incomes" ? "text-primary" : "text-muted-foreground")}>
          <Banknote className="w-6 h-6" />
          <span className="text-[10px] font-medium">Income</span>
        </div>
      </Link>
      <Link href="/settings">
        <div className={cn("flex flex-col items-center gap-1", location === "/settings" ? "text-primary" : "text-muted-foreground")}>
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-medium">Settings</span>
        </div>
      </Link>
      <button onClick={() => logout()} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-destructive">
        <LogOut className="w-6 h-6" />
        <span className="text-[10px] font-medium">Logout</span>
      </button>
    </div>
  );
}
