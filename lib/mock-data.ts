import { Quote, ClientData, CatalogService } from './types';

export const DIRECT_LOGO_URL = "/logo-consentra-horizontal.png";
export const DIRECT_VERTICAL_LOGO_URL = "/logo-consentra-horizontal.png";
export const DIRECT_MARK_LOGO_URL = "/logo-consentra-mark.png";

export const COMPANY_PROFILE = {
  name: "CONSENTRA SEGURANÇA E MEDICINA DO TRABALHO LTDA",
  tradeName: "CONSENTRA GESTÃO SST",
  cnpj: "28.934.120/0001-45",
  ie: "114.892.340.118",
  address: "Av. Paulista, 1842 - 12º Andar - Bela Vista - CEP 01310-200",
  phone: "(11) 3450-8900",
  email: "comercial@consentra.com.br",
  financeEmail: "financeiro@consentra.com.br",
  bankName: "Banco Itaú (341)",
  bankAgency: "0340",
  bankAccount: "45890-2",
  pixKey: "financeiro@consentra.com.br",
  technicalResponsible: "Washington Assis • CREA-SP 506.892/D",
  technicalTitle: "Engenheiro de Segurança do Trabalho Resp.",
  systemVersion: "v2.4",
  systemHash: "e4b2-998f-319a-2026",
  directImageUrl: DIRECT_LOGO_URL
};

export const INITIAL_CLIENTS: ClientData[] = [];

export const CATALOG_SERVICES: CatalogService[] = [
  {
    id: "pgr-01",
    code: "#SRV-01",
    title: "PGR - Programa de Gerenciamento de Riscos",
    subtitle: "Inventário + Plano de Ação",
    description: "Levantamento de riscos físicos, químicos, biológicos, ergonômicos e mecânicos com matriz de probabilidade x severidade e cronograma técnico.",
    unit: "Unidade",
    suggestedPrice: 3800,
    nrCategory: "NR-01 Geral",
    category: "Programas NR",
    status: "Ativo",
    deliverables: [
      "Emissão de Anotação de Responsabilidade Técnica (ART / CREA)",
      "Visita técnica presencial com engenheiro de segurança credenciado",
      "Entrega em formato digital PDF assinado com certificado ICP-Brasil"
    ],
    quickSelect: true
  },
  {
    id: "pcmso-07",
    code: "#SRV-02",
    title: "PCMSO - Prog. Controle Médico Saúde Ocupacional",
    subtitle: "Médico do Trabalho Coordenador",
    description: "Planejamento anual dos exames clínicos e complementares por função, faixa etária e grupo homogêneo de exposição (GHE), integrado ao PGR.",
    unit: "Unidade",
    suggestedPrice: 2900,
    nrCategory: "NR-07 Médica",
    category: "Saúde Ocupacional",
    status: "Ativo",
    deliverables: [
      "Indicação de Médico Coordenador com CRM ativo",
      "Cronograma anual de exames clínicos e complementares",
      "Relatório analítico epidemiológico anual"
    ],
    quickSelect: true
  },
  {
    id: "ltcat-prev",
    code: "#SRV-03",
    title: "LTCAT - Laudo Técnico Condições Ambientais",
    subtitle: "Previdência / INSS & Aposentadoria Especial",
    description: "Análise conclusiva de insalubridade e periculosidade conforme Lei 8.213/91, fundamentação técnica para evento governamental S-2240 e GFIP.",
    unit: "Laudo",
    suggestedPrice: 4200,
    nrCategory: "Previdenciário",
    category: "Laudos Técnicos",
    status: "Ativo",
    deliverables: [
      "Dosimetria de ruído com dosímetros calibrados RBC",
      "Amostragens químicas de vapores e poeiras em laboratório acreditado",
      "ART registrada no CREA pelo Engenheiro de Segurança"
    ],
    quickSelect: true
  },
  {
    id: "nr-35-turma",
    code: "#SRV-04",
    title: "Treinamento NR-35 (Trabalho em Altura)",
    subtitle: "Carga Horária: 8h Teórico-Prático",
    description: "Carga horária de 8 horas teórico-prática, instrutor técnico qualificado, materiais didáticos individuais e emissão de certificados com ART do Eng. Responsável.",
    unit: "Turma (15p)",
    suggestedPrice: 1500,
    nrCategory: "NR-35 Formação",
    category: "Treinamentos",
    status: "Ativo",
    deliverables: [
      "Certificados individuais com código de validação e QR Code",
      "Apostila técnica ilustrada e lista de presença formal",
      "ART de capacitação e proficiência do instrutor"
    ],
    quickSelect: false
  },
  {
    id: "cipa-05",
    code: "#SRV-05",
    title: "Implantação & Treinamento de CIPA (NR-05)",
    subtitle: "CIPA + Designado",
    description: "Assessoria em todo o processo eleitoral, minutas de convocação, apuração de votos, posse formal e treinamento regulamentar dos membros titulares e suplentes.",
    unit: "Turma",
    suggestedPrice: 1800,
    nrCategory: "NR-05 Comissão",
    category: "Treinamentos",
    status: "Ativo",
    deliverables: [
      "Minuta de edital de convocação, votação e ata de posse",
      "Treinamento regulamentar de 20h para os membros eleitos",
      "Manual de atuação da CIPA e cronograma anual de reuniões"
    ],
    quickSelect: false
  },
  {
    id: "aet-17",
    code: "#SRV-06",
    title: "Laudo de Ergonomia / AET (NR-17)",
    subtitle: "Biomecânica & Avaliação Postural",
    description: "Análise ergonômica preliminar (AEP) e Aprofundada (AET) de postos operacionais e administrativos com ferramentas validadas (RULA, REBA, NIOSH).",
    unit: "Laudo",
    suggestedPrice: 3600,
    nrCategory: "NR-17 Biomecânica",
    category: "Laudos Técnicos",
    status: "Ativo",
    deliverables: [
      "Avaliação fotográfica e de esforço muscular dos postos",
      "Planilhas com critérios internacionais (RULA, REBA, OWAS)",
      "Recomendações técnicas de adequação de mobiliário e pausas"
    ],
    quickSelect: false
  },
  {
    id: "esocial-gestao",
    code: "#SRV-07",
    title: "Envio Mensal de Eventos eSocial SST",
    subtitle: "S-2210 / S-2220 / S-2240",
    description: "Auditoria, geração contínua e transmissão de arquivos XML para o ambiente do Governo Federal via certificado digital A1 da contratante ou procuração.",
    unit: "Mensalidade",
    suggestedPrice: 450,
    nrCategory: "eSocial SST",
    category: "Gestão eSocial",
    status: "Ativo",
    deliverables: [
      "Auditoria prévia de dados cadastrais e cargos",
      "Transmissão e monitoramento dos lotes de eventos XML",
      "Emissão mensal de relatório de recibos oficiais do governo"
    ],
    quickSelect: true
  },
  {
    id: "aso-clinico",
    code: "#SRV-08",
    title: "Exame Clínico Ocupacional (ASO)",
    subtitle: "Admissional / Periódico / Demissional",
    description: "Anamnese ocupacional presencial com médico examinador habilitado e emissão de Atestado de Saúde Ocupacional em 2 vias físicas e digitais.",
    unit: "Vidas / Exame",
    suggestedPrice: 65,
    nrCategory: "NR-07 Exames",
    category: "Saúde Ocupacional",
    status: "Ativo",
    deliverables: [
      "ASO emitido em 2 vias com carimbo e CRM do médico examinador",
      "Registro e guarda de prontuário clínico ocupacional",
      "Integração imediata com o layout S-2220 do eSocial"
    ],
    quickSelect: false
  },
  {
    id: "nr-10-seg",
    code: "#SRV-09",
    title: "Treinamento de Segurança em Instalações Elétricas (NR-10)",
    subtitle: "Básico 40h Teórico-Prático",
    description: "Capacitação com ênfase em riscos em eletricidade, medidas de controle, combate a princípios de incêndio e primeiros socorros.",
    unit: "Turma (10p)",
    suggestedPrice: 2400,
    nrCategory: "NR-10 Eletricidade",
    category: "Treinamentos",
    status: "Ativo",
    deliverables: [
      "Material didático individual impresso e digital",
      "Prática de primeiros socorros e combate a princípio de incêndio",
      "Certificado assinado por instrutores habilitados com ART"
    ],
    quickSelect: false
  },
  {
    id: "nr-12-laudo",
    code: "#SRV-10",
    title: "Apreciação de Riscos em Máquinas e Equipamentos (NR-12)",
    subtitle: "Inventário & Categoria de Segurança",
    description: "Levantamento de dispositivos de segurança, intertravamentos categoria 4, paradas de emergência e plano de adequação mecânica e elétrica.",
    unit: "Por Equip.",
    suggestedPrice: 1200,
    nrCategory: "NR-12 Máquinas",
    category: "Laudos Técnicos",
    status: "Ativo",
    deliverables: [
      "Inventário detalhado e planta de localização das máquinas",
      "Matriz HRN (Hazard Rating Number) e categoria de comando",
      "Laudo conclusivo com ART recolhida no CREA"
    ],
    quickSelect: false
  },
  {
    id: "periculosidade-16",
    code: "#SRV-11",
    title: "Laudo Pericial de Periculosidade (NR-16)",
    subtitle: "Inflamáveis, Explosivos e Eletricidade",
    description: "Avaliação quantitativa e qualitativa das áreas de armazenamento e operação de inflamáveis líquidos/gasosos e sistemas elétricos de potência.",
    unit: "Laudo",
    suggestedPrice: 2800,
    nrCategory: "NR-16 Periculosidade",
    category: "Laudos Técnicos",
    status: "Ativo",
    deliverables: [
      "Delimitação de áreas de risco e bacias de contenção",
      "Enquadramento legal para pagamento do adicional de 30%",
      "ART registrada e parecer técnico para contestação jurídica"
    ],
    quickSelect: false
  },
  {
    id: "insalubridade-15",
    code: "#SRV-12",
    title: "Laudo Pericial de Insalubridade (NR-15)",
    subtitle: "Agentes Físicos, Químicos e Biológicos",
    description: "Avaliação técnica das atividades exercidas com exposição a agentes nocivos, comparando medições com os limites de tolerância regulamentares.",
    unit: "Laudo",
    suggestedPrice: 2900,
    nrCategory: "NR-15 Insalubridade",
    category: "Laudos Técnicos",
    status: "Ativo",
    deliverables: [
      "Relatórios de medição ambiental com certificado de calibração",
      "Definição de graus mínimo (10%), médio (20%) ou máximo (40%)",
      "Recomendações técnicas para neutralização via EPI/EPC"
    ],
    quickSelect: false
  }
];

export const DEFAULT_EMPTY_QUOTE: Quote = {
  id: '001',
  numberOnly: 1,
  clientId: '',
  clientName: '',
  cnpj: '',
  ie: '',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  operationalAddress: '',
  riskGrade: 'Grau de Risco 2',
  issueDate: '19/09/2026',
  validityDays: 15,
  validityDate: '04/10/2026',
  executionForecast: '10 dias úteis após alinhamento técnico',
  status: 'Rascunho',
  scopeSummary: '',
  items: [],
  subtotal: 0,
  discount: 0,
  total: 0,
  installments: 1,
  installmentValue: 0,
  paymentCondition: 'À Vista / Faturado 15 dias',
  observations: 'Proposta técnica elaborada sob as diretrizes vigentes das Normas Regulamentadoras do Ministério do Trabalho e Emprego.',
  regulatoryScope: [],
  responsibleTech: 'Washington Assis'
};

export const INITIAL_QUOTES: Quote[] = [];
