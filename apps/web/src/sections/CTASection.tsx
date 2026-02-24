"use client";

import { useEffect, useRef, useState } from "react";

export default function CTASection() {
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
        <div
          className={`bg-gray-50 rounded-2xl py-16 md:py-24 px-4 text-center transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-6">
            Get started with Mo
          </h2>
          <a
            href="/chat"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-medium transition-colors"
          >
            Start Building
          </a>
        </div>
      </div>
    </section>
  );
}
