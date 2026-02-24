import Link from "next/link";

function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-lg dark:border-white/10 dark:bg-gray-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Mismo
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#how-it-works" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            How it Works
          </a>
          <a href="#pricing" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            Pricing
          </a>
          <a href="#about" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            About
          </a>
        </div>
        <Link
          href="/chat"
          className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 hover:shadow-md active:scale-[0.98]"
        >
          Start Building
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 sm:pt-44 sm:pb-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-white to-white dark:from-indigo-950/40 dark:via-gray-950 dark:to-gray-950" />
      <div className="pointer-events-none absolute -top-40 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-900/20" />
      <div className="pointer-events-none absolute -bottom-20 left-0 -z-10 h-[400px] w-[400px] rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-900/20" />

      <div className="mx-auto max-w-4xl px-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl sm:leading-[1.1] dark:text-white">
          Your Technical Co-Founder,{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
            Powered by AI
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-400">
          Transform your idea into a production-ready web application. No coding
          required.
        </p>
        <div className="mt-10">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98]"
          >
            Start Building with Mo
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
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
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    ),
    step: "01",
    title: "Talk to Mo",
    description: "Describe your product idea in plain language. Mo, your AI consultant, will ask the right questions to understand your vision.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    step: "02",
    title: "Review Your Spec",
    description: "Mo generates a detailed product requirements document. Review it, tweak it, and approve when you're ready.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
      </svg>
    ),
    step: "03",
    title: "We Build It",
    description: "Our AI-powered development pipeline builds your application with optional human expert review and quality assurance.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
      </svg>
    ),
    step: "04",
    title: "Launch",
    description: "Your production-ready application is deployed and delivered. You own the code, the infrastructure, and the future.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Process
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            From idea to launch in four steps
          </h2>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.step}
              className="group relative rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 dark:border-white/10 dark:bg-gray-900 dark:hover:border-indigo-500/30"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:group-hover:bg-indigo-950/80">
                {s.icon}
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Step {s.step}
              </span>
              <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
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
    cta: "Most Popular",
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
    <section id="pricing" className="bg-gray-50 py-24 sm:py-32 dark:bg-gray-900/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Pricing
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Choose your build tier
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-400">
            Every tier gets you a working product. Pick the level of quality
            assurance that fits your stage.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition-shadow ${
                tier.highlighted
                  ? "border-indigo-600 bg-white shadow-xl shadow-indigo-500/10 dark:border-indigo-500 dark:bg-gray-900"
                  : "border-gray-200 bg-white hover:shadow-lg dark:border-white/10 dark:bg-gray-900"
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {tier.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {tier.description}
              </p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {tier.price}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  / project
                </span>
              </p>
              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/chat"
                className={`mt-8 block rounded-full py-2.5 text-center text-sm font-semibold transition-all ${
                  tier.highlighted
                    ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500"
                    : "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
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
    <footer id="about" className="border-t border-gray-200 bg-white py-12 dark:border-white/10 dark:bg-gray-950">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          &copy; 2026 Mismo. All rights reserved.
        </p>
        <div className="flex gap-6">
          <a href="#" className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            Privacy
          </a>
          <a href="#" className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            Terms
          </a>
          <a href="#" className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans dark:bg-gray-950">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Pricing />
      <Footer />
    </div>
  );
}
