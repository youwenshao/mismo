"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListTodo, FolderKanban, Activity, Settings, Menu } from "lucide-react";

const navItems = [
  {
    label: "Review Queue",
    path: "/",
    icon: <ListTodo className="h-5 w-5" strokeWidth={1.5} />,
  },
  {
    label: "Projects",
    path: "/projects",
    icon: <FolderKanban className="h-5 w-5" strokeWidth={1.5} />,
  },
  {
    label: "Monitoring",
    path: "/monitoring",
    icon: <Activity className="h-5 w-5" strokeWidth={1.5} />,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: <Settings className="h-5 w-5" strokeWidth={1.5} />,
  },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-primary)] md:flex">
        <div className="flex items-center gap-4 border-b border-[var(--border)] px-6 py-5">
          <span className="font-[var(--font-serif)] text-[28px] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
            Mismo
          </span>
          <span className="text-xs font-medium text-[var(--accent)]">
            Internal
          </span>
        </div>

        <nav className="flex-1 space-y-6 px-4 py-8">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? pathname === "/"
                : pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-4 px-4 py-4 text-sm transition-colors ${
                  isActive
                    ? "-ml-[1px] border-l-2 border-[var(--accent)] pl-4 font-medium text-[var(--accent)]"
                    : "font-normal text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] px-6 py-6">
          <p className="text-xs text-[var(--text-secondary)]">
            Mismo Platform v0.1
          </p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-primary)] px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="p-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              Welcome, Engineer
            </span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-primary)]">
            E
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[var(--bg-primary)] px-8 py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
