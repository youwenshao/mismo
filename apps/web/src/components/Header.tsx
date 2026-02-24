"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface HeaderProps {
  scrolled: boolean;
  isSidebarOpen?: boolean;
}

export default function Header({
  scrolled,
  isSidebarOpen = true,
}: HeaderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const initials = user?.id ? user.id.slice(0, 2).toUpperCase() : "";

  return (
    <header
      className={`fixed top-0 right-0 z-[55] transition-all duration-300 ease-in-out ${
        scrolled ? "bg-white/90 backdrop-blur-sm" : "bg-transparent"
      } ${isSidebarOpen ? "left-64" : "left-0"}`}
    >
      <div className="flex items-center justify-between px-4 py-3 lg:px-8">
        <div className="flex items-center gap-4 pl-10">
          <a href="/" className="flex items-center gap-2">
            <span className="text-xl font-semibold hidden sm:inline">
              Mismo
            </span>
          </a>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {initials}
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <a
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Dashboard
                  </a>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a
              href="/auth"
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              Log in
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
