"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";

const TIERS = {
  VIBE: {
    name: "Vibe",
    price: "$2,000",
    description: "AI-powered MVP for rapid validation",
    features: [
      "AI-generated spec",
      "AI-coded MVP",
      "Automated testing",
      "As-is delivery",
    ],
  },
  VERIFIED: {
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
  },
  FOUNDRY: {
    name: "Foundry",
    price: "$25,000",
    description: "Enterprise-grade development partnership",
    features: [
      "Custom architecture",
      "Dedicated dev team",
      "6-month maintenance",
      "Compliance consulting",
    ],
  },
} as const;

type TierKey = keyof typeof TIERS;

function CheckIcon() {
  return (
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
  );
}

function SuccessView({ projectId }: { projectId: string }) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-8 w-8 text-[var(--accent)]"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m4.5 12.75 6 6 9-13.5"
          />
        </svg>
      </div>
      <h1 className="font-[var(--font-serif)] text-3xl font-bold text-[var(--text-primary)]">
        Payment Successful
      </h1>
      <p className="mt-3 text-[var(--text-secondary)]">
        Your project is being set up. You&apos;ll receive a confirmation email
        shortly with next steps.
      </p>
      <Link
        href={`/project/${projectId}`}
        className="mt-8 inline-block rounded-[4px] bg-[var(--accent)] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
      >
        Go to Project
      </Link>
    </div>
  );
}

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  const tierParam = (searchParams.get("tier") ?? "VIBE").toUpperCase();
  const tierKey: TierKey = (tierParam in TIERS ? tierParam : "VIBE") as TierKey;
  const tier = TIERS[tierKey];

  const isSuccess = searchParams.get("success") === "true";
  const isCanceled = searchParams.get("canceled") === "true";

  const [ageGroup, setAgeGroup] = useState<"adult" | "minor" | null>(null);
  const [ackIp, setAckIp] = useState(false);
  const [ackAup, setAckAup] = useState(false);
  const [ackAge, setAckAge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked = useMemo(
    () => ageGroup !== null && ackIp && ackAup && ackAge,
    [ageGroup, ackIp, ackAup, ackAge],
  );

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierKey, projectId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Checkout failed");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-6">
        <SuccessView projectId={projectId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <nav className="border-b border-[var(--border)] bg-[var(--bg-primary)]">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-6">
          <Link
            href="/"
            className="font-[var(--font-serif)] text-xl font-bold tracking-tight text-[var(--text-primary)]"
          >
            Mismo
          </Link>
          <span className="text-sm text-[var(--text-secondary)]">
            Checkout
          </span>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-16">
        {isCanceled && (
          <div className="mb-10 border-l-2 border-amber-500 bg-amber-50 p-4 text-sm text-amber-800">
            Payment was canceled. You can try again when you&apos;re ready.
          </div>
        )}

        {/* Tier summary */}
        <div className="mb-16">
          <p className="text-xs font-medium tracking-[0.05em] text-[var(--accent)]">
            {tier.name} tier
          </p>
          <div className="mt-8 flex items-baseline gap-3">
            <span className="font-[var(--font-serif)] text-4xl font-bold text-[var(--text-primary)]">
              {tier.price}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">
              / project
            </span>
          </div>
          <p className="mt-6 text-[var(--text-secondary)]">
            {tier.description}
          </p>

          <ul className="mt-10 space-y-6">
            {tier.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-4 text-sm text-[var(--text-primary)]"
              >
                <CheckIcon />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Age verification */}
        <div className="mb-16">
          <h2 className="font-[var(--font-serif)] text-lg font-semibold text-[var(--text-primary)]">
            Age Verification
          </h2>
          <p className="mt-6 text-sm text-[var(--text-secondary)]">
            Please confirm your age group to proceed.
          </p>

          <div className="mt-10 space-y-6">
            <label className="flex cursor-pointer items-center gap-4 border border-[var(--border)] p-5 transition-colors has-[:checked]:border-[var(--accent)]">
              <input
                type="radio"
                name="age-group"
                value="adult"
                checked={ageGroup === "adult"}
                onChange={() => setAgeGroup("adult")}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                I am 18 or older
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-4 border border-[var(--border)] p-5 transition-colors has-[:checked]:border-[var(--accent)]">
              <input
                type="radio"
                name="age-group"
                value="minor"
                checked={ageGroup === "minor"}
                onChange={() => setAgeGroup("minor")}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                I am 16–17 years old
              </span>
            </label>
          </div>

          {ageGroup === "minor" && (
            <div className="mt-8 border-l-2 border-[var(--accent)] bg-[var(--bg-secondary)] p-6 text-sm">
              <p className="font-medium text-[var(--text-primary)]">
                Parental confirmation required
              </p>
              <p className="mt-3 text-[var(--text-secondary)]">
                Users aged 16–17 require parental or guardian confirmation. A
                confirmation email will be sent to your parent/guardian, and a
                24-hour cooling-off period will apply before your project begins.
              </p>
            </div>
          )}
        </div>

        {/* Acknowledgments */}
        <div className="mb-16">
          <h2 className="font-[var(--font-serif)] text-lg font-semibold text-[var(--text-primary)]">
            Acknowledgments
          </h2>
          <p className="mt-6 text-sm text-[var(--text-secondary)]">
            Please review and accept the following before proceeding.
          </p>

          <div className="mt-10 space-y-8">
            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={ackIp}
                onChange={(e) => setAckIp(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span className="text-sm text-[var(--text-primary)]">
                I understand the IP ownership terms — all intellectual property
                for the delivered code and assets will transfer to me upon full
                payment.
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={ackAup}
                onChange={(e) => setAckAup(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span className="text-sm text-[var(--text-primary)]">
                I accept the{" "}
                <a
                  href="#"
                  className="font-medium text-[var(--accent)] underline hover:text-[var(--accent-hover)]"
                >
                  Acceptable Use Policy
                </a>{" "}
                and agree not to use Mismo for prohibited use cases.
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={ackAge}
                onChange={(e) => setAckAge(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span className="text-sm text-[var(--text-primary)]">
                I confirm my age verification status above is accurate.
              </span>
            </label>
          </div>
        </div>

        {/* Payment button */}
        <div>
          {error && (
            <div className="mb-8 border-l-2 border-[var(--accent)] bg-[var(--bg-secondary)] p-6 text-sm text-[var(--accent)]">
              {error}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={!allChecked || loading}
            className="w-full rounded-[4px] bg-[var(--accent)] py-3.5 text-base font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--accent)]"
          >
            {loading ? "Redirecting to payment…" : "Proceed to Payment"}
          </button>

          <p className="mt-8 text-center text-xs text-[var(--text-secondary)]">
            You&apos;ll be redirected to Stripe&apos;s secure checkout to
            complete payment.
          </p>
        </div>
      </main>
    </div>
  );
}
