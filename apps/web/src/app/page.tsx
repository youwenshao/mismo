import Link from "next/link";

function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full bg-[var(--bg-primary)]">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-[var(--font-serif)] text-[28px] font-bold tracking-[-0.03em] text-[var(--text-primary)]"
        >
          Mismo
        </Link>
        <div className="hidden items-center gap-x-[72px] md:flex">
          <a
            href="#how-it-works"
            className="font-[var(--font-sans)] text-sm font-normal text-[var(--text-secondary)] transition-colors duration-150 ease-out hover:text-[var(--accent)]"
          >
            How it Works
          </a>
          <a
            href="#pricing"
            className="font-[var(--font-sans)] text-sm font-normal text-[var(--text-secondary)] transition-colors duration-150 ease-out hover:text-[var(--accent)]"
          >
            Pricing
          </a>
          <a
            href="#about"
            className="font-[var(--font-sans)] text-sm font-normal text-[var(--text-secondary)] transition-colors duration-150 ease-out hover:text-[var(--accent)]"
          >
            About
          </a>
        </div>
        <Link
          href="/chat"
          className="rounded-[4px] bg-[var(--accent)] px-6 py-3 text-sm font-medium uppercase tracking-[0.1em] text-white transition-colors duration-150 ease-out hover:bg-[var(--accent-hover)]"
        >
          Start Building
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="pt-40 pb-24">
      <div className="mx-auto max-w-4xl px-6">
        <h1 className="font-[var(--font-serif)] text-[2.5rem] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[3.5rem]">
          Your Technical Co-Founder, Powered by AI
        </h1>
        <p className="mt-6 max-w-2xl font-[var(--font-sans)] text-lg text-[var(--text-secondary)]">
          Transform your idea into a production-ready web application. No coding
          required.
        </p>
        <div className="mt-10">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-[4px] bg-[var(--accent)] px-8 py-3.5 text-sm font-medium uppercase tracking-[0.1em] text-white transition-colors duration-150 ease-out hover:bg-[var(--accent-hover)]"
          >
            Start Building with Mo
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-7 w-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
        />
      </svg>
    ),
    step: "01",
    title: "Talk to Mo",
    description:
      "Describe your product idea in plain language. Mo, your AI consultant, will ask the right questions to understand your vision.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-7 w-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
    ),
    step: "02",
    title: "Review Your Spec",
    description:
      "Mo generates a detailed product requirements document. Review it, tweak it, and approve when you're ready.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-7 w-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
        />
      </svg>
    ),
    step: "03",
    title: "We Build It",
    description:
      "Our AI-powered development pipeline builds your application with optional human expert review and quality assurance.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-7 w-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
        />
      </svg>
    ),
    step: "04",
    title: "Launch",
    description:
      "Your production-ready application is deployed and delivered. You own the code, the infrastructure, and the future.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <p className="font-[var(--font-sans)] text-xs font-medium tracking-[0.05em] text-[var(--text-secondary)]">
          Process
        </p>
        <h2 className="mt-6 font-[var(--font-serif)] text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
          From idea to launch in four steps
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-16 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.step}>
              <div className="mb-6 text-[var(--accent)]">{s.icon}</div>
              <span className="font-[var(--font-sans)] text-xs font-medium tracking-[0.05em] text-[var(--text-secondary)]">
                Step {s.step}
              </span>
              <h3 className="mt-3 font-[var(--font-sans)] text-[1.25rem] font-semibold leading-[1.3] text-[var(--text-primary)]">
                {s.title}
              </h3>
              <p className="mt-4 text-sm text-[var(--text-secondary)]">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const tiers = [
  {
    name: "Vibe",
    price: "$2,000",
    description: "AI-powered MVP for rapid validation",
    features: [
      "AI-generated spec",
      "AI-coded MVP",
      "Automated testing",
      "As-is delivery",
    ],
    highlighted: false,
    cta: "Get Started",
  },
  {
    name: "Verified",
    price: "$8,000",
    description: "Production-grade quality with human oversight",
    features: [
      "Everything in Vibe",
      "Human architectural review",
      "Security audit",
      "30-day support",
      "Technical debt remediation",
    ],
    highlighted: true,
    cta: "Get Started",
  },
  {
    name: "Foundry",
    price: "$25,000",
    description: "Enterprise-grade development partnership",
    features: [
      "Custom architecture",
      "Dedicated dev team",
      "6-month maintenance",
      "Compliance consulting",
    ],
    highlighted: false,
    cta: "Contact Us",
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <p className="font-[var(--font-sans)] text-xs font-medium tracking-[0.05em] text-[var(--text-secondary)]">
          Pricing
        </p>
        <h2 className="mt-6 font-[var(--font-serif)] text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
          Choose your build tier
        </h2>
        <p className="mt-8 max-w-2xl text-sm text-[var(--text-secondary)]">
          Every tier gets you a working product. Pick the level of quality
          assurance that fits your stage.
        </p>
        <div className="mt-16 grid grid-cols-1 gap-16 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col ${tier.highlighted ? "border-l-2 border-[var(--accent)] pl-8" : ""}`}
            >
              <div className="flex items-baseline gap-4">
                <h3 className="font-[var(--font-sans)] text-lg font-semibold text-[var(--text-primary)]">
                  {tier.name}
                </h3>
                {tier.highlighted && (
                  <span className="text-xs font-medium text-[var(--accent)]">
                    Most Popular
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm text-[var(--text-secondary)]">
                {tier.description}
              </p>
              <p className="mt-8 flex items-baseline gap-2">
                <span className="font-[var(--font-serif)] text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                  {tier.price}
                </span>
                <span className="text-sm text-[var(--text-secondary)]">
                  / project
                </span>
              </p>
              <ul className="mt-10 flex-1 space-y-6">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-[var(--text-secondary)]"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/chat"
                className={`mt-8 block rounded-[4px] py-3 text-center text-sm font-medium uppercase tracking-[0.1em] transition-colors duration-150 ease-out ${
                  tier.highlighted
                    ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                    : "border border-[var(--border)] text-[var(--text-primary)] hover:text-[var(--accent)]"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      id="about"
      className="border-t border-[var(--border)] bg-[var(--bg-primary)] py-12"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 sm:flex-row sm:items-center">
        <p className="text-sm text-[var(--text-secondary)]">
          &copy; 2026 Mismo. All rights reserved.
        </p>
        <div className="flex gap-12">
          <a
            href="#"
            className="text-sm text-[var(--text-secondary)] transition-colors duration-150 ease-out hover:text-[var(--accent)]"
          >
            Privacy
          </a>
          <a
            href="#"
            className="text-sm text-[var(--text-secondary)] transition-colors duration-150 ease-out hover:text-[var(--accent)]"
          >
            Terms
          </a>
          <a
            href="#"
            className="text-sm text-[var(--text-secondary)] transition-colors duration-150 ease-out hover:text-[var(--accent)]"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] font-[var(--font-sans)]">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Pricing />
      <Footer />
    </div>
  );
}
