import aurora_portao from "@/assets/cam-aurora-portao.jpg";
import aurora_jardim from "@/assets/cam-aurora-jardim.jpg";
import aurora_garagem from "@/assets/cam-aurora-garagem.jpg";
import norte_estacionamento from "@/assets/cam-norte-estacionamento.jpg";
import norte_recepcao from "@/assets/cam-norte-recepcao.jpg";
import norte_perimetro from "@/assets/cam-norte-perimetro.jpg";
import loja_entrada from "@/assets/cam-loja-entrada.jpg";
import loja_estoque from "@/assets/cam-loja-estoque.jpg";

/**
 * Dados 100% demonstrativos. Nenhuma câmera, DVR ou serviço real está conectado.
 * A integração com o backend existente (Node/SQLite/RTSP) acontece em fase posterior.
 */

export type Category = "pessoa" | "veiculo" | "animal";
export type Priority = "alta" | "media" | "baixa";
export type OccurrenceStatus = "pendente" | "em_atendimento" | "finalizada";
export type ClientId = "aurora" | "norte" | "loja";
export type ClientFilter = ClientId | "todos";

export interface BBox {
  /** valores em % da imagem */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Client {
  id: ClientId;
  name: string;
  city: string;
  companyId: string;
}

export interface Camera {
  id: string;
  code: string;
  clientId: ClientId;
  location: string;
  zone: string;
  image: string;
}

export interface Occurrence {
  id: string;
  code: string;
  cameraId: string;
  category: Category;
  priority: Priority;
  status: OccurrenceStatus;
  /** segundos desde 00:00 do dia simulado */
  captureAt: number;
  alertAt: number;
  reason: string;
  note: string;
  confidence: number;
  bbox?: BBox | undefined;
  operator?: string;
  assumedAt?: number;
  finishedAt?: number;
  simulated?: boolean;
}

export const OPERATOR = { name: "Rafael Lima", initials: "RL", role: "Operador · Turno noite" };

export const CLIENTS: Client[] = [
  { id: "aurora", name: "Residencial Aurora", city: "Campinas/SP", companyId: "invictus" },
  { id: "norte", name: "Comercial Norte", city: "Jundiaí/SP", companyId: "invictus" },
  { id: "loja", name: "Loja Centro", city: "Campinas/SP", companyId: "invictus" },
];

export const CLIENT_FILTERS: { value: ClientFilter; label: string }[] = [
  { value: "todos", label: "Todos os clientes" },
  ...CLIENTS.map((c) => ({ value: c.id as ClientFilter, label: c.name })),
];

export const CAMERAS: Camera[] = [
  { id: "aurora-portao", code: "CAM-01", clientId: "aurora", location: "Portão", zone: "Acesso de veículos", image: aurora_portao },
  { id: "norte-estacionamento", code: "CAM-04", clientId: "norte", location: "Estacionamento", zone: "Área externa", image: norte_estacionamento },
  { id: "loja-entrada", code: "CAM-07", clientId: "loja", location: "Entrada", zone: "Porta principal", image: loja_entrada },
  { id: "aurora-jardim", code: "CAM-02", clientId: "aurora", location: "Jardim interno", zone: "Área comum", image: aurora_jardim },
  { id: "aurora-garagem", code: "CAM-03", clientId: "aurora", location: "Garagem G1", zone: "Subsolo", image: aurora_garagem },
  { id: "norte-recepcao", code: "CAM-05", clientId: "norte", location: "Recepção", zone: "Térreo", image: norte_recepcao },
  { id: "norte-perimetro", code: "CAM-06", clientId: "norte", location: "Perímetro lateral", zone: "Doca de carga", image: norte_perimetro },
  { id: "loja-estoque", code: "CAM-08", clientId: "loja", location: "Estoque", zone: "Área interna", image: loja_estoque },
];

/** Caixas de referência por câmera/categoria, usadas também nas detecções simuladas. */
export const REFERENCE_BOXES: Partial<Record<string, Partial<Record<Category, BBox>>>> = {
  "loja-entrada": { pessoa: { x: 53, y: 29, w: 15, h: 52 } },
  "loja-estoque": { pessoa: { x: 18, y: 28, w: 12, h: 47 } },
  "aurora-portao": { veiculo: { x: 83, y: 20, w: 15, h: 14 }, pessoa: { x: 66, y: 19, w: 6, h: 9 } },
  "norte-estacionamento": { veiculo: { x: 19, y: 63, w: 32, h: 35 } },
  "aurora-garagem": { veiculo: { x: 78, y: 24, w: 17, h: 24 } },
  "norte-perimetro": { animal: { x: 26, y: 48, w: 9, h: 10 } },
};

const t = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;

export const INITIAL_OCCURRENCES: Occurrence[] = [
  {
    id: "oc-2048",
    code: "OC-2048",
    cameraId: "loja-entrada",
    category: "pessoa",
    priority: "alta",
    status: "pendente",
    captureAt: t(20, 44, 12),
    alertAt: t(20, 44, 19),
    reason: "Pessoa detectada na porta principal após o horário de funcionamento configurado (até 20:00).",
    note: "",
    confidence: 0.91,
    bbox: REFERENCE_BOXES["loja-entrada"]?.pessoa,
  },
  {
    id: "oc-2047",
    code: "OC-2047",
    cameraId: "aurora-portao",
    category: "veiculo",
    priority: "media",
    status: "pendente",
    captureAt: t(20, 39, 51),
    alertAt: t(20, 40, 3),
    reason: "Veículo parado junto ao portão em 3 capturas consecutivas.",
    note: "",
    confidence: 0.88,
    bbox: REFERENCE_BOXES["aurora-portao"]?.veiculo,
  },
  {
    id: "oc-2046",
    code: "OC-2046",
    cameraId: "loja-estoque",
    category: "pessoa",
    priority: "alta",
    status: "em_atendimento",
    captureAt: t(20, 31, 8),
    alertAt: t(20, 31, 16),
    reason: "Pessoa detectada no estoque durante período monitorado (loja fechada).",
    note: "Contato com responsável da loja em andamento.",
    confidence: 0.86,
    bbox: REFERENCE_BOXES["loja-estoque"]?.pessoa,
    operator: OPERATOR.name,
    assumedAt: t(20, 32, 40),
  },
  {
    id: "oc-2045",
    code: "OC-2045",
    cameraId: "norte-perimetro",
    category: "animal",
    priority: "baixa",
    status: "finalizada",
    captureAt: t(20, 22, 40),
    alertAt: t(20, 22, 47),
    reason: "Animal detectado no pátio da doca de carga.",
    note: "Cão circulando no pátio. Sem necessidade de ação.",
    confidence: 0.82,
    bbox: REFERENCE_BOXES["norte-perimetro"]?.animal,
    operator: OPERATOR.name,
    assumedAt: t(20, 23, 30),
    finishedAt: t(20, 25, 2),
  },
  {
    id: "oc-2044",
    code: "OC-2044",
    cameraId: "norte-estacionamento",
    category: "veiculo",
    priority: "baixa",
    status: "finalizada",
    captureAt: t(20, 10, 5),
    alertAt: t(20, 10, 14),
    reason: "Veículo entrou no estacionamento após o expediente.",
    note: "Veículo de colaborador, conferido com a portaria.",
    confidence: 0.93,
    bbox: REFERENCE_BOXES["norte-estacionamento"]?.veiculo,
    operator: "Marina Duarte",
    assumedAt: t(20, 11, 0),
    finishedAt: t(20, 14, 37),
  },
  {
    id: "oc-2043",
    code: "OC-2043",
    cameraId: "aurora-garagem",
    category: "veiculo",
    priority: "media",
    status: "finalizada",
    captureAt: t(19, 58, 30),
    alertAt: t(19, 58, 41),
    reason: "Veículo em movimento na garagem G1 em horário de baixa circulação.",
    note: "Morador do bloco B. Registro conferido.",
    confidence: 0.9,
    bbox: REFERENCE_BOXES["aurora-garagem"]?.veiculo,
    operator: "Marina Duarte",
    assumedAt: t(19, 59, 20),
    finishedAt: t(20, 3, 12),
  },
  {
    id: "oc-2042",
    code: "OC-2042",
    cameraId: "aurora-portao",
    category: "pessoa",
    priority: "media",
    status: "finalizada",
    captureAt: t(19, 36, 44),
    alertAt: t(19, 36, 52),
    reason: "Pessoa detectada próxima à guarita.",
    note: "Troca de turno do porteiro.",
    confidence: 0.79,
    bbox: REFERENCE_BOXES["aurora-portao"]?.pessoa,
    operator: "Marina Duarte",
    assumedAt: t(19, 37, 30),
    finishedAt: t(19, 39, 0),
  },
  {
    id: "oc-2041",
    code: "OC-2041",
    cameraId: "loja-entrada",
    category: "pessoa",
    priority: "baixa",
    status: "finalizada",
    captureAt: t(19, 12, 2),
    alertAt: t(19, 12, 9),
    reason: "Pessoa detectada na porta principal (loja aberta).",
    note: "Movimento normal de clientes.",
    confidence: 0.94,
    bbox: REFERENCE_BOXES["loja-entrada"]?.pessoa,
    operator: "Marina Duarte",
    assumedAt: t(19, 12, 50),
    finishedAt: t(19, 13, 30),
  },
  {
    id: "oc-2040",
    code: "OC-2040",
    cameraId: "norte-perimetro",
    category: "animal",
    priority: "baixa",
    status: "finalizada",
    captureAt: t(18, 47, 17),
    alertAt: t(18, 47, 25),
    reason: "Animal detectado junto à cerca lateral.",
    note: "Mesmo animal recorrente. Sem ação.",
    confidence: 0.77,
    bbox: REFERENCE_BOXES["norte-perimetro"]?.animal,
    operator: "Marina Duarte",
    assumedAt: t(18, 48, 0),
    finishedAt: t(18, 48, 40),
  },
  {
    id: "oc-2039",
    code: "OC-2039",
    cameraId: "norte-estacionamento",
    category: "veiculo",
    priority: "baixa",
    status: "finalizada",
    captureAt: t(18, 25, 50),
    alertAt: t(18, 26, 1),
    reason: "Veículo saindo do estacionamento.",
    note: "Saída de colaboradores.",
    confidence: 0.92,
    bbox: REFERENCE_BOXES["norte-estacionamento"]?.veiculo,
    operator: "Marina Duarte",
    assumedAt: t(18, 26, 30),
    finishedAt: t(18, 27, 5),
  },
];

/* ---------- Gestão Master (demonstrativo) ---------- */

export interface Company {
  id: string;
  name: string;
  type: "Matriz" | "Parceira";
  city: string;
  clients: number;
  cameras: number;
  status: "Ativa" | "Em implantação";
  admin: string;
}

export const COMPANIES: Company[] = [
  { id: "invictus", name: "Invictus Monitoramento", type: "Matriz", city: "Campinas/SP", clients: 3, cameras: 8, status: "Ativa", admin: "Carla Menezes" },
  { id: "vigilia", name: "Vigília Sul Segurança", type: "Parceira", city: "Curitiba/PR", clients: 3, cameras: 22, status: "Ativa", admin: "Paulo Teixeira" },
  { id: "atlas", name: "Atlas Portarias", type: "Parceira", city: "Belo Horizonte/MG", clients: 2, cameras: 6, status: "Em implantação", admin: "Juliana Prado" },
];

export interface ManagedClient {
  id: string;
  name: string;
  companyId: string;
  segment: string;
  cameras: number;
  operators: number;
  status: "Ativo" | "Suspenso" | "Em implantação";
}

export const MANAGED_CLIENTS: ManagedClient[] = [
  { id: "aurora", name: "Residencial Aurora", companyId: "invictus", segment: "Condomínio residencial", cameras: 3, operators: 4, status: "Ativo" },
  { id: "norte", name: "Comercial Norte", companyId: "invictus", segment: "Centro comercial", cameras: 3, operators: 3, status: "Ativo" },
  { id: "loja", name: "Loja Centro", companyId: "invictus", segment: "Varejo", cameras: 2, operators: 2, status: "Ativo" },
  { id: "jardins", name: "Condomínio Jardins", companyId: "vigilia", segment: "Condomínio residencial", cameras: 12, operators: 5, status: "Ativo" },
  { id: "clinica", name: "Clínica Vida", companyId: "vigilia", segment: "Saúde", cameras: 6, operators: 2, status: "Ativo" },
  { id: "galpao", name: "Galpão Logístico Sul", companyId: "vigilia", segment: "Logística", cameras: 4, operators: 2, status: "Suspenso" },
  { id: "atlas-center", name: "Edifício Atlas Center", companyId: "atlas", segment: "Corporativo", cameras: 4, operators: 2, status: "Em implantação" },
  { id: "vila-rica", name: "Residencial Vila Rica", companyId: "atlas", segment: "Condomínio residencial", cameras: 2, operators: 1, status: "Em implantação" },
];

export interface License {
  id: string;
  companyId: string;
  plan: "Essencial" | "Profissional" | "Empresarial";
  cameraLimit: number;
  camerasInUse: number;
  validUntil: string;
  status: "Vigente" | "Renovação próxima";
}

export const LICENSES: License[] = [
  { id: "LIC-0107", companyId: "invictus", plan: "Profissional", cameraLimit: 16, camerasInUse: 8, validUntil: "31/12/2026", status: "Vigente" },
  { id: "LIC-0112", companyId: "vigilia", plan: "Empresarial", cameraLimit: 32, camerasInUse: 22, validUntil: "15/03/2027", status: "Vigente" },
  { id: "LIC-0118", companyId: "atlas", plan: "Essencial", cameraLimit: 8, camerasInUse: 6, validUntil: "30/11/2026", status: "Renovação próxima" },
];

/* ---------- Helpers ---------- */

export const CATEGORY_LABEL: Record<Category, string> = {
  pessoa: "Pessoa",
  veiculo: "Veículo",
  animal: "Animal",
};

export const DETECTION_TITLE: Record<Category, string> = {
  pessoa: "Pessoa detectada",
  veiculo: "Veículo detectado",
  animal: "Animal detectado",
};

export const PRIORITY_LABEL: Record<Priority, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

export const STATUS_LABEL: Record<OccurrenceStatus, string> = {
  pendente: "Pendente",
  em_atendimento: "Em atendimento",
  finalizada: "Finalizada",
};

export function getCamera(id: string): Camera {
  const cam = CAMERAS.find((c) => c.id === id);
  if (!cam) throw new Error(`Câmera desconhecida: ${id}`);
  return cam;
}

export function getClient(id: ClientId): Client {
  return CLIENTS.find((c) => c.id === id)!;
}

export function cameraLabel(cam: Camera): string {
  return `${getClient(cam.clientId).name} · ${cam.location}`;
}

export function companyName(id: string): string {
  return COMPANIES.find((c) => c.id === id)?.name ?? "—";
}
