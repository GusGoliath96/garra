import Link from "next/link";

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-coral text-lg text-white shadow-[0_4px_14px_-4px_rgba(255,90,54,0.7)] transition-transform group-hover:-rotate-6">
        🦞
      </span>
      <span className={`font-display text-xl font-bold tracking-tight ${light ? "text-cream" : "text-ink"}`}>
        Garra
      </span>
    </Link>
  );
}
