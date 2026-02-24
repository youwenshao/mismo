"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowUp, Menu, X } from "lucide-react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import HeroSection from "@/sections/HeroSection";
import FeaturedCards from "@/sections/FeaturedCards";
import HowItWorks from "@/sections/HowItWorks";
import TestimonialsSection from "@/sections/TestimonialsSection";
import CTASection from "@/sections/CTASection";
import Footer from "@/sections/Footer";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div className="min-h-screen-safe bg-white">
      <Header scrolled={scrolled} isSidebarOpen={isSidebarOpen} />

      {/* Sidebar toggle */}
      <div
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-[60] p-2 bg-white hover:bg-gray-100 rounded-full transition-colors shadow-sm cursor-pointer select-none"
        role="button"
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main
        className={`pt-20 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <HeroSection />
        <FeaturedCards />
        <HowItWorks />
        <TestimonialsSection />
        <CTASection />
        <Footer />
      </main>

      {/* Floating chat button */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <a
          href="/chat"
          className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-2 shadow-lg hover:shadow-xl transition-shadow"
        >
          <span className="text-sm text-gray-600">Ask Mo</span>
          <span className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white">
            <ArrowUp size={16} />
          </span>
        </a>
      </div>
    </div>
  );
}
