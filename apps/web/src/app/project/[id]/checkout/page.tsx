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
      className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400"
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
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-8 w-8 text-green-600 dark:text-green-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m4.5 12.75 6 6 9-13.5"
          />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        Payment Successful
      </h1>
      <p className="mt-3 text-gray-600 dark:text-gray-400">
        Your project is being set up. You&apos;ll receive a confirmation email
        shortly with next steps.
      </p>
      <Link
        href={`/project/${projectId}`}
        className="mt-8 inline-block rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500"
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
      <div className="flex min-h-screen items-center justify-center bg-white px-6 dark:bg-gray-950">
        <SuccessView projectId={projectId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="border-b border-gray-200/60 bg-white/80 backdrop-blur-lg dark:border-white/10 dark:bg-gray-950/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Mismo
          </Link>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Checkout
          </span>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {isCanceled && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-300">
            Payment was canceled. You can try again when you&apos;re ready.
          </div>
        )}

        {/* Tier summary */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            {tier.name} Tier
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              {tier.price}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              / project
            </span>
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {tier.description}
          </p>

          <ul className="mt-6 space-y-3">
            {tier.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
              >
                <CheckIcon />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Age verification */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Age Verification
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Please confirm your age group to proceed.
          </p>

          <div className="mt-5 space-y-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:border-indigo-300 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:border-white/10 dark:hover:border-indigo-500/40 dark:has-[:checked]:border-indigo-500 dark:has-[:checked]:bg-indigo-950/30">
              <input
                type="radio"
                name="age-group"
                value="adult"
                checked={ageGroup === "adult"}
                onChange={() => setAgeGroup("adult")}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                I am 18 or older
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:border-indigo-300 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:border-white/10 dark:hover:border-indigo-500/40 dark:has-[:checked]:border-indigo-500 dark:has-[:checked]:bg-indigo-950/30">
              <input
                type="radio"
                name="age-group"
                value="minor"
                checked={ageGroup === "minor"}
                onChange={() => setAgeGroup("minor")}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                I am 16–17 years old
              </span>
            </label>
          </div>

          {ageGroup === "minor" && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-950/20 dark:text-blue-300">
              <p className="font-medium">Parental confirmation required</p>
              <p className="mt-1">
                Users aged 16–17 require parental or guardian confirmation. A
                confirmation email will be sent to your parent/guardian, and a
                24-hour cooling-off period will apply before your project begins.
              </p>
            </div>
          )}
        </div>

        {/* Acknowledgments */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Acknowledgments
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Please review and accept the following before proceeding.
          </p>

          <div className="mt-5 space-y-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={ackIp}
                onChange={(e) => setAckIp(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-indigo-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I understand the IP ownership terms — all intellectual property
                for the delivered code and assets will transfer to me upon full
                payment.
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={ackAup}
                onChange={(e) => setAckAup(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-indigo-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I accept the{" "}
                <a
                  href="#"
                  className="font-medium text-indigo-600 underline hover:text-indigo-500 dark:text-indigo-400"
                >
                  Acceptable Use Policy
                </a>{" "}
                and agree not to use Mismo for prohibited use cases.
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={ackAge}
                onChange={(e) => setAckAge(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-indigo-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I confirm my age verification status above is accurate.
              </span>
            </label>
          </div>
        </div>

        {/* Payment button */}
        <div className="mt-8">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/20 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={!allChecked || loading}
            className="w-full rounded-full bg-indigo-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:bg-indigo-600"
          >
            {loading ? "Redirecting to payment…" : "Proceed to Payment"}
          </button>

          <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
            You&apos;ll be redirected to Stripe&apos;s secure checkout to
            complete payment.
          </p>
        </div>
      </main>
    </div>
  );
}
