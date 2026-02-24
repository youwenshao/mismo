import { useEffect, useRef, useState } from 'react';

interface NewsItem {
  id: string;
  title: string;
  category: string;
  date: string;
  image: string;
  gradient?: string;
}

const newsItems: NewsItem[] = [
  {
    id: '1',
    title: 'Introducing Lockdown Mode and Elevated Risk labels in ChatGPT',
    category: 'Safety',
    date: 'Feb 13, 2026',
    image: '/images/lockdown.jpg',
    gradient: 'linear-gradient(135deg, #f472b6 0%, #a78bfa 100%)',
  },
  {
    id: '2',
    title: 'Testing ads in ChatGPT',
    category: 'Company',
    date: 'Feb 9, 2026',
    image: '/images/ads.jpg',
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
  },
  {
    id: '3',
    title: 'Developers can now submit apps to ChatGPT',
    category: 'Product',
    date: 'Dec 17, 2025',
    image: '/images/developers.jpg',
    gradient: 'linear-gradient(135deg, #34d399 0%, #06b6d4 100%)',
  },
  {
    id: '4',
    title: 'Introducing GPT-5.3-Codex-Spark',
    category: 'Product',
    date: 'Feb 12, 2026',
    image: '/images/spark.jpg',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  },
  {
    id: '5',
    title: 'OpenAI for Healthcare',
    category: 'Product',
    date: 'Jan 8, 2026',
    image: '/images/healthcare.jpg',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
  },
  {
    id: '6',
    title: 'Advancing science and math with GPT-5.2',
    category: 'Publication',
    date: 'Dec 11, 2025',
    image: '/images/science.jpg',
    gradient: 'linear-gradient(135deg, #f87171 0%, #fb923c 100%)',
  },
];

export default function RecentNews() {
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
    <section ref={sectionRef} className="px-4 md:px-8 lg:px-12 py-12" id="news">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-gray-900">Recent news</h2>
          <a
            href="#"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            View more
          </a>
        </div>

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {newsItems.slice(0, 3).map((item, index) => (
              <a
                key={item.id}
                href="#"
                className={`flex gap-4 group transition-all duration-700 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div
                  className="w-24 h-24 md:w-32 md:h-32 rounded-lg flex-shrink-0 flex items-center justify-center"
                  style={{ background: item.gradient }}
                >
                  {item.id === '1' && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="w-10 h-10 text-white"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect
                        x="5"
                        y="11"
                        width="14"
                        height="10"
                        rx="2"
                        fill="white"
                        stroke="none"
                      />
                      <path
                        d="M7 11V7a5 5 0 0 1 10 0v4"
                        stroke="white"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {item.id === '2' && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="w-10 h-10 text-white"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="16"
                        rx="2"
                        fill="white"
                        stroke="none"
                      />
                      <line x1="7" y1="8" x2="17" y2="8" stroke="#a78bfa" strokeWidth="2" />
                      <line x1="7" y1="12" x2="17" y2="12" stroke="#a78bfa" strokeWidth="2" />
                      <line x1="7" y1="16" x2="12" y2="16" stroke="#a78bfa" strokeWidth="2" />
                    </svg>
                  )}
                  {item.id === '3' && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="w-10 h-10 text-white"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                        stroke="white"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-base font-medium text-gray-900 group-hover:opacity-70 transition-opacity line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <span>{item.category}</span>
                    <span>•</span>
                    <span>{item.date}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {newsItems.slice(3, 6).map((item, index) => (
              <a
                key={item.id}
                href="#"
                className={`flex gap-4 group transition-all duration-700 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${(index + 3) * 100}ms` }}
              >
                <div
                  className="w-24 h-24 md:w-32 md:h-32 rounded-lg flex-shrink-0 flex items-center justify-center"
                  style={{ background: item.gradient }}
                >
                  {item.id === '4' && (
                    <span className="text-lg font-bold text-white">GPT-5.3-Codex-Spark</span>
                  )}
                  {item.id === '5' && (
                    <div className="text-center">
                      <span className="text-sm font-medium text-white block">AI for Science</span>
                      <span className="text-xs text-white/80">AI for Healthcare</span>
                    </div>
                  )}
                  {item.id === '6' && (
                    <div className="text-center">
                      <span className="text-3xl font-bold text-white block">Math</span>
                      <span className="text-lg font-bold text-white block">Science</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-base font-medium text-gray-900 group-hover:opacity-70 transition-opacity line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <span>{item.category}</span>
                    <span>•</span>
                    <span>{item.date}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
