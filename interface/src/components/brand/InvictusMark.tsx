import { cn } from "@/lib/utils";

/** Símbolo geométrico INVICTUS: losango com eixo vertical. */
export function InvictusMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <path d="M16 2.5 29.5 16 16 29.5 2.5 16Z" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M16 9v14" stroke="currentColor" strokeWidth="3.2" strokeLinecap="square" />
    </svg>
  );
}

export function InvictusWordmark({ className, subtle }: { className?: string; subtle?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <InvictusMark className="size-7 text-gold" />
      <div className="leading-none">
        <div className="text-[13px] font-bold tracking-[0.22em]">INVICTUS</div>
        {!subtle && (
          <div className="mt-0.5 text-[9.5px] font-medium tracking-wide text-muted-foreground">
            Monitoramento Inteligente
          </div>
        )}
      </div>
    </div>
  );
}
