import { useEffect, useRef, useState } from 'react';

export default function Stories() {
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
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="px-4 md:px-8 lg:px-12 py-12" id="stories">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-gray-900">Stories</h2>
          <a
            href="#"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            View all
          </a>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left - Grid of portraits */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <a href="#" className="block group">
              <div className="grid grid-cols-2 gap-2">
                <div className="aspect-[3/4] bg-gray-200 rounded-lg overflow-hidden">
                  <img
                    src="/images/portrait1.jpg"
                    alt="Portrait 1"
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                </div>
                <div className="aspect-[3/4] bg-gray-200 rounded-lg overflow-hidden">
                  <img
                    src="/images/portrait2.jpg"
                    alt="Portrait 2"
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                </div>
                <div className="aspect-[3/4] bg-gray-200 rounded-lg overflow-hidden">
                  <img
                    src="/images/portrait3.jpg"
                    alt="Portrait 3"
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                </div>
                <div className="aspect-[3/4] bg-gray-200 rounded-lg overflow-hidden">
                  <img
                    src="/images/portrait4.jpg"
                    alt="Portrait 4"
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:opacity-70 transition-opacity">
                  Frontier Builders
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Meet the leaders putting machine intelligence to work.
                </p>
              </div>
            </a>
          </div>

          {/* Middle - Medium card */}
          <div
            className={`transition-all duration-700 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <a href="#" className="block group">
              <div className="aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden">
                <img
                  src="/images/creative-writing.jpg"
                  alt="Creative writing"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:opacity-70 transition-opacity">
                  Creative writing with GPT-5
                </h3>
                <p className="text-sm text-gray-500 mt-1">GPT-5</p>
              </div>
            </a>
          </div>

          {/* Right - Large card */}
          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <a href="#" className="block group">
              <div className="aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden">
                <img
                  src="/images/medical-research.jpg"
                  alt="Medical research"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:opacity-70 transition-opacity">
                  Medical research with GPT-5
                </h3>
                <p className="text-sm text-gray-500 mt-1">GPT-5</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
