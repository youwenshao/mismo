"use client";

import { useState } from "react";
import LoginDropdown from "./LoginDropdown";

interface HeaderProps {
  scrolled: boolean;
  isSidebarOpen?: boolean;
}

export default function Header({
  scrolled,
  isSidebarOpen = true,
}: HeaderProps) {
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);

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
          <div className="relative">
            <button
              onClick={() => setShowLoginDropdown(!showLoginDropdown)}
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              Log in
            </button>
            {showLoginDropdown && (
              <LoginDropdown onClose={() => setShowLoginDropdown(false)} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
