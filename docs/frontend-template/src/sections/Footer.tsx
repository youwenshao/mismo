

interface FooterColumn {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}

const footerColumns: FooterColumn[] = [
  {
    title: 'Our Research',
    links: [
      { label: 'Research Index', href: '#' },
      { label: 'Research Overview', href: '#' },
      { label: 'Research Residency', href: '#' },
      { label: 'OpenAI for Science', href: '#' },
      { label: 'Economic Research', href: '#' },
    ],
  },
  {
    title: 'ChatGPT',
    links: [
      { label: 'Explore ChatGPT', href: '#', external: true },
      { label: 'Business', href: '#' },
      { label: 'Enterprise', href: '#' },
      { label: 'Education', href: '#' },
      { label: 'Pricing', href: '#', external: true },
      { label: 'Download', href: '#', external: true },
    ],
  },
  {
    title: 'Sora',
    links: [
      { label: 'Sora Overview', href: '#' },
      { label: 'Features', href: '#' },
      { label: 'Pricing', href: '#' },
      { label: 'Sora log in', href: '#', external: true },
    ],
  },
  {
    title: 'API Platform',
    links: [
      { label: 'Platform Overview', href: '#' },
      { label: 'Pricing', href: '#' },
      { label: 'API log in', href: '#', external: true },
      { label: 'Documentation', href: '#', external: true },
      { label: 'Developer Forum', href: '#', external: true },
    ],
  },
  {
    title: 'For Business',
    links: [
      { label: 'Business Overview', href: '#' },
      { label: 'Solutions', href: '#' },
      { label: 'Contact Sales', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '#' },
      { label: 'Our Charter', href: '#' },
      { label: 'Foundation', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Brand', href: '#' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '#', external: true },
    ],
  },
  {
    title: 'More',
    links: [
      { label: 'News', href: '#' },
      { label: 'Stories', href: '#' },
      { label: 'Livestreams', href: '#' },
      { label: 'Podcast', href: '#' },
      { label: 'RSS', href: '#' },
    ],
  },
  {
    title: 'Terms & Policies',
    links: [
      { label: 'Terms of Use', href: '#' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Other Policies', href: '#' },
    ],
  },
];

const latestAdvancements = [
  { label: 'GPT-5', href: '#' },
  { label: 'Codex', href: '#' },
  { label: 'OpenAI o3', href: '#' },
  { label: 'OpenAI o4-mini', href: '#' },
  { label: 'GPT-4o', href: '#' },
  { label: 'GPT-4o mini', href: '#' },
  { label: 'Sora', href: '#' },
];

const safetyLinks = [
  { label: 'Safety Approach', href: '#' },
  { label: 'Security & Privacy', href: '#' },
  { label: 'Trust & Transparency', href: '#' },
];

export default function Footer() {
  const language = 'English (United States)';

  return (
    <footer className="px-4 md:px-8 lg:px-12 py-12 border-t border-gray-100">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Our Research */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Our Research</h3>
            <ul className="space-y-3">
              {footerColumns[0].links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="footer-link text-sm text-gray-600 hover:text-gray-900"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            <h3 className="text-sm font-medium text-gray-900 mb-4 mt-8">Latest Advancements</h3>
            <ul className="space-y-3">
              {latestAdvancements.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="footer-link text-sm text-gray-600 hover:text-gray-900"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            <h3 className="text-sm font-medium text-gray-900 mb-4 mt-8">Safety</h3>
            <ul className="space-y-3">
              {safetyLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="footer-link text-sm text-gray-600 hover:text-gray-900"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* ChatGPT */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">ChatGPT</h3>
            <ul className="space-y-3">
              {footerColumns[1].links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="footer-link text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    {link.label}
                    {link.external && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 7h10v10" />
                        <path d="M7 17 17 7" />
                      </svg>
                    )}
                  </a>
                </li>
              ))}
            </ul>

            <h3 className="text-sm font-medium text-gray-900 mb-4 mt-8">Sora</h3>
            <ul className="space-y-3">
              {footerColumns[2].links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="footer-link text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    {link.label}
                    {link.external && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 7h10v10" />
                        <path d="M7 17 17 7" />
                      </svg>
                    )}
                  </a>
                </li>
              ))}
            </ul>

            <h3 className="text-sm font-medium text-gray-900 mb-4 mt-8">API Platform</h3>
            <ul className="space-y-3">
              {footerColumns[3].links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="footer-link text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    {link.label}
                    {link.external && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 7h10v10" />
                        <path d="M7 17 17 7" />
                      </svg>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* For Business */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">For Business</h3>
            <ul className="space-y-3">
              {footerColumns[4].links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="footer-link text-sm text-gray-600 hover:text-gray-900"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            <h3 className="text-sm font-medium text-gray-900 mb-4 mt-8">Company</h3>
            <ul className="space-y-3">
              {footerColumns[5].links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="footer-link text-sm text-gray-600 hover:text-gray-900"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            <h3 className="text-sm font-medium text-gray-900 mb-4 mt-8">Support</h3>
            <ul className="space-y-3">
              {footerColumns[6].links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="footer-link text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    {link.label}
                    {link.external && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 7h10v10" />
                        <path d="M7 17 17 7" />
                      </svg>
                    )}
                  </a>
                </li>
              ))}
            </ul>

            <h3 className="text-sm font-medium text-gray-900 mb-4 mt-8">More</h3>
            <ul className="space-y-3">
              {footerColumns[7].links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="footer-link text-sm text-gray-600 hover:text-gray-900"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Terms & Policies */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Terms & Policies</h3>
            <ul className="space-y-3">
              {footerColumns[8].links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="footer-link text-sm text-gray-600 hover:text-gray-900"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-gray-100 gap-4">
          {/* Social Icons */}
          <div className="flex items-center gap-4">
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4l11.733 16h4.267l-11.733 -16z" fill="currentColor" stroke="none" />
                <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" fill="none" />
              </svg>
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.623 4.823-4.351c.192-.192-.054-.3-.297-.108l-5.965 3.759-2.568-.802c-.56-.176-.571-.56.117-.828l10.037-3.869c.466-.174.875.108.713.827z" />
              </svg>
            </a>
          </div>

          {/* Copyright */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Mismo © 2015-2026</span>
            <a href="#" className="hover:text-gray-900 transition-colors">
              Manage Cookies
            </a>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span>{language}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
