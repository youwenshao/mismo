"use client";

import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "http://localhost:3000";
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Settings</h1>

      <section className="mb-8">
        <h2 className="text-sm font-medium mb-1">Admin Whitelist</h2>
        <p className="text-sm text-gray-400">
          Whitelist management coming soon
        </p>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-3">System</h2>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 text-sm border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
