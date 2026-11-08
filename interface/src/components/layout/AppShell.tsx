import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  Cctv,
  ChevronRight,
  CircleHelp,
  LogOut,
  MonitorPlay,
  RotateCcw,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { InvictusMark, InvictusWordmark } from "@/components/brand/InvictusMark";
import { CategoryIcon } from "@/components/common/indicators";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CAMERAS, CLIENT_FILTERS, DETECTION_TITLE, OPERATOR, cameraLabel, getCamera, type ClientFilter } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";
import { notIntegrated } from "@/lib/not-integrated";
import { cn } from "@/lib/utils";

type NavPath = "/" | "/ocorrencias" | "/cameras" | "/gestao";

interface NavItem {
  to: NavPath;
  label: string;
  short: string;
  icon: LucideIcon;
  section: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Visão ao vivo", short: "Ao vivo", icon: MonitorPlay, section: "Operação" },
  { to: "/ocorrencias", label: "Ocorrências", short: "Ocorrências", icon: Bell, section: "Operação" },
  { to: "/cameras", label: "Câmeras", short: "Câmeras", icon: Cctv, section: "Operação" },
  { to: "/gestao", label: "Gestão Master", short: "Gestão", icon: Building2, section: "Administração" },
];

function useActiveNav(): NavItem {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    NAV_ITEMS.find((n) => (n.to === "/" ? pathname === "/" : pathname.startsWith(n.to))) ?? NAV_ITEMS[0]!
  );
}

function usePendingCount() {
  const { occurrences } = useDemo();
  return occurrences.filter((o) => o.status === "pendente").length;
}

function Sidebar() {
  const active = useActiveNav();
  const pending = usePendingCount();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[76px] flex-col items-center bg-sidebar py-4 md:flex">
      <Link to="/" aria-label="INVICTUS — início" className="mb-6 text-gold">
        <InvictusMark className="size-8" />
      </Link>
      <nav aria-label="Navegação principal" className="flex w-full flex-1 flex-col items-center gap-1 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.to === active.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex w-full flex-col items-center gap-1 rounded-md py-2.5 text-[10.5px] font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              {isActive && <span className="absolute inset-y-2 -left-2 w-[3px] rounded-r bg-gold" />}
              <span className="relative">
                <Icon className={cn("size-5", isActive && "text-gold")} strokeWidth={1.75} />
                {item.to === "/ocorrencias" && pending > 0 && (
                  <span className="absolute -top-1.5 -right-2 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-bold text-primary-foreground">
                    {pending}
                  </span>
                )}
              </span>
              {item.short}
            </Link>
          );
        })}
      </nav>
      <div className="flex w-full flex-col items-center gap-1 px-2">
        <button
          type="button"
          onClick={() => notIntegrated("Configurações da conta")}
          className="flex w-full cursor-pointer flex-col items-center gap-1 rounded-md py-2 text-[10.5px] text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <Settings className="size-5" strokeWidth={1.75} />
          Ajustes
        </button>
        <button
          type="button"
          onClick={() => notIntegrated("Central de ajuda")}
          className="flex w-full cursor-pointer flex-col items-center gap-1 rounded-md py-2 text-[10.5px] text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <CircleHelp className="size-5" strokeWidth={1.75} />
          Ajuda
        </button>
      </div>
    </aside>
  );
}

function MobileNav() {
  const active = useActiveNav();
  const pending = usePendingCount();
  return (
    <nav
      aria-label="Navegação principal"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar md:hidden"
    >
      <div className="grid h-16 grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.to === active.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium",
                isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70",
              )}
            >
              {isActive && <span className="absolute inset-x-6 top-0 h-[3px] rounded-b bg-gold" />}
              <span className="relative">
                <Icon className={cn("size-5", isActive && "text-gold")} strokeWidth={1.75} />
                {item.to === "/ocorrencias" && pending > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-bold text-primary-foreground">
                    {pending}
                  </span>
                )}
              </span>
              {item.short}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ClientSelect({ className }: { className?: string }) {
  const { clientId, setClientId } = useDemo();
  return (
    <Select value={clientId} onValueChange={(v) => setClientId(v as ClientFilter)}>
      <SelectTrigger aria-label="Selecionar cliente ou local" className={cn("h-9 bg-card text-[13px]", className)}>
        <Building2 className="mr-1 size-4 shrink-0 text-muted-foreground" />
        <SelectValue>{CLIENT_FILTERS.find((c) => c.value === clientId)?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {CLIENT_FILTERS.map((c) => (
          <SelectItem key={c.value} value={c.value}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { occurrences } = useDemo();
  const navigate = useNavigate();
  const go = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar câmera, local ou ocorrência…" />
      <CommandList>
        <CommandEmpty>Nada encontrado nos dados da demonstração.</CommandEmpty>
        <CommandGroup heading="Câmeras">
          {CAMERAS.map((cam) => (
            <CommandItem
              key={cam.id}
              value={`${cam.code} ${cameraLabel(cam)}`}
              onSelect={() => go(() => navigate({ to: "/cameras", search: { camera: cam.id } }))}
            >
              <Cctv className="text-muted-foreground" />
              <span>{cameraLabel(cam)}</span>
              <span className="ml-auto text-xs text-muted-foreground">{cam.code}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Ocorrências">
          {occurrences.slice(0, 12).map((o) => (
            <CommandItem
              key={o.id}
              value={`${o.code} ${DETECTION_TITLE[o.category]} ${cameraLabel(getCamera(o.cameraId))}`}
              onSelect={() => go(() => navigate({ to: "/ocorrencias", search: { id: o.id } }))}
            >
              <CategoryIcon category={o.category} className="text-muted-foreground" />
              <span>
                {DETECTION_TITLE[o.category]} · {cameraLabel(getCamera(o.cameraId))}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">{o.code}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function OperatorMenu({ compact }: { compact?: boolean }) {
  const { reset } = useDemo();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu do operador"
        className="flex cursor-pointer items-center gap-2.5 rounded-md py-1 pr-1 pl-1 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="grid size-8 place-items-center rounded-full bg-graphite text-xs font-semibold text-ivory">
          {OPERATOR.initials}
        </span>
        {!compact && (
          <span className="hidden text-left leading-tight xl:block">
            <span className="block text-[13px] font-medium">{OPERATOR.name}</span>
            <span className="block text-[11px] text-muted-foreground">{OPERATOR.role}</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="text-sm">{OPERATOR.name}</div>
          <div className="text-xs font-normal text-muted-foreground">{OPERATOR.role}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            reset();
            toast.success("Dados da demonstração restaurados");
          }}
        >
          <RotateCcw /> Restaurar demonstração
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => notIntegrated("Preferências do operador")}>
          <Settings /> Preferências
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => notIntegrated("Login e encerramento de sessão")}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header() {
  const active = useActiveNav();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
      {/* Desktop / tablet */}
      <div className="hidden h-14 items-center gap-4 px-5 md:flex">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
          <span className="text-muted-foreground">{active.section}</span>
          <ChevronRight className="size-3.5 text-muted-foreground/60" />
          <span className="truncate font-medium">{active.label}</span>
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          <ClientSelect className="w-[200px]" />
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-56 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-[13px] text-muted-foreground hover:border-gold/60 lg:w-64"
          >
            <Search className="size-4" />
            Buscar câmera ou ocorrência
            <kbd className="ml-auto rounded border bg-card px-1.5 text-[10px] font-medium">Ctrl K</kbd>
          </button>
          <div className="mx-1 h-6 w-px bg-border" />
          <OperatorMenu />
        </div>
      </div>
      {/* Mobile */}
      <div className="flex h-14 items-center gap-2 px-3 md:hidden">
        <InvictusWordmark subtle className="shrink-0" />
        <ClientSelect className="ml-auto w-[150px] min-w-0" />
        <button
          type="button"
          aria-label="Buscar"
          onClick={() => setSearchOpen(true)}
          className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-md border border-input bg-background text-muted-foreground"
        >
          <Search className="size-4" />
        </button>
        <OperatorMenu compact />
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <Sidebar />
      <div className="flex min-h-dvh flex-col md:pl-[76px]">
        <Header />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
