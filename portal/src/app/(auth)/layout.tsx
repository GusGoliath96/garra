import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-8 overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-coral/20 blur-3xl" />
      <Logo />
      {children}
    </main>
  );
}
