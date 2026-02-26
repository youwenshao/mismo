"use client";

interface ReadinessBarProps {
  score: number;
}

export function ReadinessBar({ score }: ReadinessBarProps) {
  const clampedScore = Math.max(0, Math.min(100, score));

  let colorClass: string;
  if (clampedScore < 30) {
    colorClass = "bg-gray-300";
  } else if (clampedScore < 70) {
    colorClass = "bg-gradient-to-r from-amber-400 to-green-400";
  } else {
    colorClass = "bg-green-500";
  }

  return (
    <div className="group relative w-full h-1 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`}
        style={{ width: `${clampedScore}%` }}
      />
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-gray-500 bg-white border border-gray-200 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Mo is {clampedScore}% confident in understanding your project
      </div>
    </div>
  );
}
