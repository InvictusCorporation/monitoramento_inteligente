import { createFileRoute } from "@tanstack/react-router";
import { Building2, KeyRound, Plus, Users } from "lucide-react";

import { DemoNotice } from "@/components/common/indicators";
import { ResponsiveTable } from "@/components/common/ResponsiveTable";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COMPANIES, LICENSES, MANAGED_CLIENTS, companyName, type Company, type License, type ManagedClient } from "@/lib/demo-data";
import { notIntegrated } from "@/lib/not-integrated";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gestao")({
  head: () => ({
    meta: [
      { title: "Gestão Master · INVICTUS Monitoramento Inteligente" },
      { name: "description", content: "Gestão de empresas, clientes e licenças da plataforma INVICTUS (demonstração)." },
      { property: "og:title", content: "Gestão Master · INVICTUS" },
      {
        property: "og:description",
        content: "Gestão de empresas, clientes e licenças da plataforma INVICTUS (demonstração).",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GestaoPage,
});

function Pill({ tone, children }: { tone: "success" | "warning" | "info" | "muted"; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium",
        tone === "success" && "bg-success-soft text-success",
        tone === "warning" && "bg-warning-soft text-warning",
        tone === "info" && "bg-info-soft text-info",
        tone === "muted" && "bg-secondary text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

const manage = (what: string) => (
  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => notIntegrated(what)}>
    Gerenciar
  </Button>
);

function GestaoPage() {
  const totalCams = LICENSES.reduce((s, l) => s + l.cameraLimit, 0);
  return (
    <div className="space-y-5 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Gestão Master</h1>
        <DemoNotice />
      </div>
      <p className="-mt-2 text-[13px] text-muted-foreground">
        {COMPANIES.length} empresas · {MANAGED_CLIENTS.length} clientes · {totalCams} câmeras licenciadas · dados
        demonstrativos
      </p>

      <Tabs defaultValue="empresas" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="empresas" className="gap-1.5">
            <Building2 className="size-3.5" /> Empresas
          </TabsTrigger>
          <TabsTrigger value="clientes" className="gap-1.5">
            <Users className="size-3.5" /> Clientes
          </TabsTrigger>
          <TabsTrigger value="licencas" className="gap-1.5">
            <KeyRound className="size-3.5" /> Licenças
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresas" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="h-8" onClick={() => notIntegrated("Cadastro de empresas")}>
              <Plus /> Nova empresa
            </Button>
          </div>
          <ResponsiveTable<Company>
            rows={COMPANIES}
            rowKey={(r) => r.id}
            actions={() => manage("Gestão de empresas")}
            columns={[
              {
                key: "name",
                header: "Empresa",
                primary: true,
                cell: (r) => (
                  <span>
                    <span className="block font-medium">{r.name}</span>
                    <span className="block text-[11px] font-normal text-muted-foreground">{r.city}</span>
                  </span>
                ),
              },
              { key: "type", header: "Tipo", cell: (r) => <Pill tone={r.type === "Matriz" ? "info" : "muted"}>{r.type}</Pill> },
              { key: "admin", header: "Administrador", cell: (r) => r.admin },
              { key: "clients", header: "Clientes", cell: (r) => <span className="tabular-nums">{r.clients}</span> },
              { key: "cameras", header: "Câmeras", cell: (r) => <span className="tabular-nums">{r.cameras}</span> },
              {
                key: "status",
                header: "Status",
                cell: (r) => <Pill tone={r.status === "Ativa" ? "success" : "warning"}>{r.status}</Pill>,
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="clientes" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="h-8" onClick={() => notIntegrated("Cadastro de clientes")}>
              <Plus /> Novo cliente
            </Button>
          </div>
          <ResponsiveTable<ManagedClient>
            rows={MANAGED_CLIENTS}
            rowKey={(r) => r.id}
            actions={() => manage("Gestão de clientes")}
            columns={[
              {
                key: "name",
                header: "Cliente",
                primary: true,
                cell: (r) => (
                  <span>
                    <span className="block font-medium">{r.name}</span>
                    <span className="block text-[11px] font-normal text-muted-foreground">{r.segment}</span>
                  </span>
                ),
              },
              { key: "company", header: "Empresa", cell: (r) => companyName(r.companyId) },
              { key: "cameras", header: "Câmeras", cell: (r) => <span className="tabular-nums">{r.cameras}</span> },
              { key: "operators", header: "Operadores", cell: (r) => <span className="tabular-nums">{r.operators}</span> },
              {
                key: "status",
                header: "Status",
                cell: (r) => (
                  <Pill tone={r.status === "Ativo" ? "success" : r.status === "Suspenso" ? "muted" : "warning"}>
                    {r.status}
                  </Pill>
                ),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="licencas" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="h-8" onClick={() => notIntegrated("Emissão de licenças")}>
              <Plus /> Emitir licença
            </Button>
          </div>
          <ResponsiveTable<License>
            rows={LICENSES}
            rowKey={(r) => r.id}
            actions={() => manage("Gestão de licenças")}
            columns={[
              {
                key: "id",
                header: "Licença",
                primary: true,
                cell: (r) => (
                  <span>
                    <span className="block font-medium">{companyName(r.companyId)}</span>
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      {r.id} · Plano {r.plan}
                    </span>
                  </span>
                ),
              },
              {
                key: "usage",
                header: "Uso de câmeras",
                className: "min-w-[180px]",
                cell: (r) => (
                  <div className="space-y-1">
                    <div className="text-xs tabular-nums">
                      {r.camerasInUse} de {r.cameraLimit}
                    </div>
                    <Progress value={(r.camerasInUse / r.cameraLimit) * 100} className="h-1.5 bg-secondary" />
                  </div>
                ),
              },
              { key: "valid", header: "Validade", cell: (r) => <span className="tabular-nums">{r.validUntil}</span> },
              {
                key: "status",
                header: "Status",
                cell: (r) => <Pill tone={r.status === "Vigente" ? "success" : "warning"}>{r.status}</Pill>,
              },
            ]}
          />
          <p className="text-xs text-muted-foreground">
            Licenças demonstrativas. Cobrança e renovação ficam disponíveis após integração.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
