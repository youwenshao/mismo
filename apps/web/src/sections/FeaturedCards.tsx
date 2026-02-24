"use client";

import { useEffect, useRef, useState } from "react";

export default function FeaturedCards() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="px-4 md:px-8 lg:px-12 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Large featured card */}
          <div
            className={`lg:col-span-2 transition-all duration-700 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <a href="/chat" className="block group">
              <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-20 h-20 md:w-28 md:h-28 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-6">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="w-10 h-10 md:w-14 md:h-14 text-white"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                        fill="white"
                        stroke="none"
                      />
                    </svg>
                  </div>
                  <span className="text-white/80 text-sm font-medium tracking-wide uppercase">
                    From Idea to Launch
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 group-hover:opacity-70 transition-opacity">
                  Tell Mo your idea. We build the rest.
                </h2>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <span>Platform</span>
                  <span>&middot;</span>
                  <span>Start in 15 minutes</span>
                </div>
              </div>
            </a>
          </div>

          {/* Right column tier cards */}
          <div className="space-y-6">
            <a
              href="#pricing"
              className={`block group transition-all duration-700 delay-100 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
            >
              <div
                className="relative aspect-[16/9] rounded-xl overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl md:text-4xl font-bold text-white">
                    $2k
                  </span>
                  <span className="text-white/80 text-sm mt-1">
                    Vibe Tier
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:opacity-70 transition-opacity">
                  AI-powered MVP for rapid validation
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>Starting at $2,000</span>
                </div>
              </div>
            </a>

            <a
              href="#pricing"
              className={`block group transition-all duration-700 delay-200 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
            >
              <div
                className="relative aspect-[16/9] rounded-xl overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
                }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl md:text-4xl font-bold text-white">
                    $8k
                  </span>
                  <span className="text-white/80 text-sm mt-1">
                    Verified Tier
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:opacity-70 transition-opacity">
                  Production-grade with human oversight
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>Starting at $8,000</span>
                  <span>&middot;</span>
                  <span>Most popular</span>
                </div>
              </div>
            </a>

            <a
              href="#pricing"
              className={`block group transition-all duration-700 delay-300 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
            >
              <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-gradient-to-br from-blue-300 to-cyan-400">
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl md:text-4xl font-bold text-white">
                    $25k
                  </span>
                  <span className="text-white/80 text-sm mt-1">
                    Foundry Tier
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:opacity-70 transition-opacity">
                  Enterprise-grade development partnership
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>Starting at $25,000</span>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
