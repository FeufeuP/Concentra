export type QuoteStatus = 
  | 'Rascunho' 
  | 'Enviado' 
  | 'Aguardando Retorno' 
  | 'Aprovado' 
  | 'Reprovado' 
  | 'Cancelado' 
  | 'Vencido';

export interface QuoteItem {
  id: string;
  itemNumber: number;
  title: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ClientData {
  id: string;
  name: string;
  cnpj: string;
  ie?: string;
  riskGrade: string; // e.g. "Grau de Risco 3 (CNAE 25.11-0)"
  cnae?: string;
  contactName: string;
  contactRole?: string;
  email: string;
  phone: string;
  address: string;
}

export interface Quote {
  id: string; // e.g. "#319"
  numberOnly: number;
  clientId: string;
  clientName: string;
  cnpj: string;
  ie?: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  operationalAddress: string;
  riskGrade: string;
  issueDate: string; // '14/09/2026'
  validityDays: number;
  validityDate: string; // '29/09/2026'
  executionForecast: string;
  status: QuoteStatus;
  scopeSummary: string;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  total: number;
  installments: number;
  installmentValue: number;
  paymentCondition: string; // e.g. 'Faturado 3x (30/60/90d)'
  paymentNotes?: string; // Observações para condições especiais de pagamento
  observations: string;
  regulatoryScope: string[]; // ['PGR + PCMSO', 'Treinamento NR-35', 'LTCAT']
  responsibleTech: string; // 'Washington Assis'
  lastModified?: string;
  // Cascading classification fields
  macroCategory?: string;
  subCategory?: string;
  statusSubStage?: string;
  demandOrigin?: string;
  priority?: string;
  customTexts?: Record<string, string>;
  headerConfig?: Record<string, string>;
}

export interface CatalogService {
  id: string;
  code?: string;
  title: string;
  subtitle?: string;
  description: string;
  unit: string;
  suggestedPrice: number;
  nrCategory: string;
  category?: string;
  status?: 'Ativo' | 'Inativo';
  deliverables?: string[];
  quickSelect?: boolean;
  /** ISO — vêm do banco (created_at/updated_at) ou são carimbados ao salvar no modo local. */
  createdAt?: string;
  updatedAt?: string;
}
