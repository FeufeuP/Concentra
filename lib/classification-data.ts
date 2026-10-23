export interface CascadingSubcategory {
  id: string;
  name: string;
  nrCode: string;
  defaultScope: string;
}

export interface CascadingMacroCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  color?: string;
  subcategories: CascadingSubcategory[];
}

export interface StatusSubStage {
  id: string;
  name: string;
  description: string;
}

export interface CascadingStatusDef {
  status: 'Rascunho' | 'Enviado' | 'Aguardando Retorno' | 'Aprovado' | 'Reprovado' | 'Cancelado' | 'Vencido';
  label: string;
  icon: string;
  colorClass: string;
  badgeBg: string;
  badgeText: string;
  subStages: StatusSubStage[];
}

export const CASCADING_STATUS_LIST: CascadingStatusDef[] = [
  {
    status: 'Rascunho',
    label: 'Rascunho',
    icon: 'edit_note',
    colorClass: 'text-slate-700 bg-slate-100 border-slate-300',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    badgeText: 'text-slate-800',
    subStages: [
      { id: 'rasc-1', name: 'Coleta de Dados Preliminares', description: 'Reunindo dados da empresa, CNAE e número de vidas' },
      { id: 'rasc-2', name: 'Dimensionamento Técnico', description: 'Calculando horas técnicas e postos de trabalho' },
      { id: 'rasc-3', name: 'Composição de Honorários', description: 'Definindo valores de itens e condições de pagamento' },
      { id: 'rasc-4', name: 'Em Revisão Interna', description: 'Aguardando validação do responsável técnico' },
    ]
  },
  {
    status: 'Enviado',
    label: 'Enviado',
    icon: 'send',
    colorClass: 'text-blue-700 bg-blue-50 border-blue-200',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    badgeText: 'text-blue-800',
    subStages: [
      { id: 'env-1', name: 'Enviado por E-mail Formal', description: 'PDF e proposta formal transmitidos com confirmação' },
      { id: 'env-2', name: 'Enviado via WhatsApp Comercial', description: 'Resumo e link do PDF enviados ao contato direto' },
      { id: 'env-3', name: 'Apresentado em Videoconferência', description: 'Alinhamento de escopo técnico realizado remotamente' },
      { id: 'env-4', name: 'Entregue em Visita Presencial', description: 'Proposta apresentada na sede ou planta do cliente' },
    ]
  },
  {
    status: 'Aguardando Retorno',
    label: 'Aguardando Retorno',
    icon: 'hourglass_top',
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeText: 'text-amber-800',
    subStages: [
      { id: 'ret-1', name: 'Em Análise pela Diretoria / Compras', description: 'Proposta sob cotação comparativa ou aprovação financeira' },
      { id: 'ret-2', name: 'Em Negociação Comercial', description: 'Cliente solicitou desconto ou parcelamento diferenciado' },
      { id: 'ret-3', name: 'Em Análise Técnica pelo SESMT', description: 'Engenharia/Medicina do cliente avaliando itens regulatórios' },
      { id: 'ret-4', name: 'Follow-up Comercial Agendado', description: 'Próximo contato programado com o gestor' },
    ]
  },
  {
    status: 'Aprovado',
    label: 'Aprovado',
    icon: 'check_circle',
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-300',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    badgeText: 'text-emerald-800',
    subStages: [
      { id: 'apr-1', name: 'Contrato Formal Assinado', description: 'Documento assinado digitalmente pelas partes' },
      { id: 'apr-2', name: 'Ordem de Serviço (OS) Autorizada', description: 'Liberação imediata para agendamento de vistorias' },
      { id: 'apr-3', name: 'Sinal / 1ª Parcela Confirmada', description: 'Faturamento de entrada liquidado' },
      { id: 'apr-4', name: 'Faturado Direto (Boleto/PIX)', description: 'Faturamento lançado conforme cronograma' },
    ]
  },
  {
    status: 'Reprovado',
    label: 'Reprovado',
    icon: 'cancel',
    colorClass: 'text-rose-700 bg-rose-50 border-rose-200',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
    badgeText: 'text-rose-800',
    subStages: [
      { id: 'rep-1', name: 'Preço Acima do Teto Orçamentário', description: 'Cliente optou por solução de menor custo' },
      { id: 'rep-2', name: 'Optou por Concorrente', description: 'Fechou com outra assessoria de SST' },
      { id: 'rep-3', name: 'Projeto Postergado / Sem Verba', description: 'Investimento cancelado para o exercício atual' },
      { id: 'rep-4', name: 'Sem Resposta após Follow-up', description: 'Múltiplas tentativas de contato sem retorno' },
    ]
  },
  {
    status: 'Cancelado',
    label: 'Cancelado',
    icon: 'block',
    colorClass: 'text-neutral-700 bg-neutral-100 border-neutral-300',
    badgeBg: 'bg-neutral-100 text-neutral-800 border-neutral-300',
    badgeText: 'text-neutral-800',
    subStages: [
      { id: 'canc-1', name: 'Proposta Duplicada ou Substituída', description: 'Substituída por novo sequencial com outro escopo' },
      { id: 'canc-2', name: 'Cliente Desistiu da Demanda', description: 'Mudança de atividade, fechamento ou terceirização' },
      { id: 'canc-3', name: 'Restrição Cadastral ou Inadimplência', description: 'Cancelamento por compliance financeiro' },
    ]
  },
  {
    status: 'Vencido',
    label: 'Vencido',
    icon: 'timer_off',
    colorClass: 'text-orange-700 bg-orange-50 border-orange-200',
    badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
    badgeText: 'text-orange-800',
    subStages: [
      { id: 'venc-1', name: 'Validade de 15 Dias Expirada', description: 'Prazo estipulado na proposta atingido sem decisão' },
      { id: 'venc-2', name: 'Necessita Revalidação de Preços', description: 'Reajuste anual ou variação de insumos/médicos' },
      { id: 'venc-3', name: 'Aguardando Reativação Comercial', description: 'Lead em nutrição para reenvio' },
    ]
  }
];

export const CASCADING_MACRO_CATEGORIES: CascadingMacroCategory[] = [
  {
    id: 'programas-laudos',
    name: 'Programas e Laudos Regulamentares',
    icon: 'fact_check',
    description: 'Documentos legais obrigatórios pelo MTE e Previdência Social',
    subcategories: [
      { id: 'pgr-nr01', name: 'PGR / GRO (NR-01 - Gerenciamento de Riscos)', nrCode: 'NR-01', defaultScope: 'Inventário Geral de Riscos Ocupacionais + Plano de Ação 5W2H' },
      { id: 'pcmso-nr07', name: 'PCMSO Clínico (NR-07 - Controle Médico)', nrCode: 'NR-07', defaultScope: 'Planejamento médico ocupacional, exames periódicos e audiometrias' },
      { id: 'ltcat-prev', name: 'LTCAT Previdenciário (Aposentadoria Especial)', nrCode: 'INSS/PPP', defaultScope: 'Laudo conclusivo para enquadramento GFIP/eSocial S-2240' },
      { id: 'insalub-nr15', name: 'Laudo Pericial de Insalubridade (NR-15)', nrCode: 'NR-15', defaultScope: 'Avaliação de ruído contínuo, calor IBUTG, químicos e biológicos' },
      { id: 'pericul-nr16', name: 'Laudo Pericial de Periculosidade (NR-16)', nrCode: 'NR-16', defaultScope: 'Avaliação de áreas de risco para inflamáveis, explosivos e eletricidade' },
      { id: 'aet-nr17', name: 'AET - Análise Ergonômica do Trabalho (NR-17)', nrCode: 'NR-17', defaultScope: 'Avaliação biomecânica, cognitiva e organizacional dos postos' },
      { id: 'elet-nr10', name: 'Prontuário de Instalações Elétricas (NR-10)', nrCode: 'NR-10', defaultScope: 'Relatório técnico de inspeção de painéis, subestações e diagramas' },
      { id: 'maq-nr12', name: 'Apreciação de Riscos em Máquinas (NR-12)', nrCode: 'NR-12', defaultScope: 'Matriz HRN de perigos, dispositivos de parada e intertravamentos' },
      { id: 'pgrss-nr32', name: 'PGRSS & Laudo Biológico Hospitalar (NR-32)', nrCode: 'NR-32', defaultScope: 'Plano de resíduos e proteção a agentes biológicos em saúde' },
    ]
  },
  {
    id: 'treinamentos-capacitacoes',
    name: 'Treinamentos e Capacitações SST',
    icon: 'school',
    description: 'Cursos obrigatórios presenciais, semipresenciais e práticos com ART',
    subcategories: [
      { id: 'tr-nr35', name: 'NR-35 Trabalho em Altura (8h Básico / 16h Resgate)', nrCode: 'NR-35', defaultScope: 'Capacitação teórica e prática com simulação de retenção de quedas' },
      { id: 'tr-nr33', name: 'NR-33 Espaço Confinado (16h Vigia / 40h Supervisor)', nrCode: 'NR-33', defaultScope: 'Treinamento de entrada segura, detectores de gases e resgate' },
      { id: 'tr-nr10', name: 'NR-10 Segurança em Instalações em Eletricidade (40h)', nrCode: 'NR-10', defaultScope: 'Capacitação de risco elétrico, arco voltaico e primeiros socorros' },
      { id: 'tr-nr11', name: 'NR-11 Operador de Empilhadeira e Pontes Rolantes', nrCode: 'NR-11', defaultScope: 'Formação teórica e teste de pista operacional de movimentação' },
      { id: 'tr-nr05', name: 'NR-05 CIPA e Designado de Prevenção de Acidentes', nrCode: 'NR-05', defaultScope: 'Formação de membros cipeiros, mapa de riscos e SIPAT' },
      { id: 'tr-nr06', name: 'NR-06 Treinamento e Conscientização de Uso de EPI', nrCode: 'NR-06', defaultScope: 'Conservação, guarda e higienização de equipamentos individuais' },
      { id: 'tr-brigada', name: 'Brigada de Incêndio e Primeiros Socorros (IT-17)', nrCode: 'Bombeiros', defaultScope: 'Combate prático com extintores, mangueiras e suporte básico à vida' },
    ]
  },
  {
    id: 'medicina-saude',
    name: 'Medicina Ocupacional e Saúde',
    icon: 'medical_services',
    description: 'Exames clínicos, complementares e gestão de prontuários médicos',
    subcategories: [
      { id: 'med-aso', name: 'Exames Clínicos Ocupacionais & ASO em 2 Vias', nrCode: 'NR-07', defaultScope: 'Exames admissionais, periódicos, demissionais e retorno ao trabalho' },
      { id: 'med-audio', name: 'Audiometria Tonal e Vocal Ocupacional', nrCode: 'NR-07', defaultScope: 'Cabine acústica calibrada com PCA (Programa de Conservação Auditiva)' },
      { id: 'med-compl', name: 'Espirometria, Raio-X OIT e ECG/EEG', nrCode: 'NR-07', defaultScope: 'Bateria complementar para poeiras, fumos e trabalho em altura' },
      { id: 'med-psico', name: 'Avaliação Psicossocial (NR-33 e NR-35)', nrCode: 'NR-33/35', defaultScope: 'Aplicação de testes psicológicos e emissão de parecer por psicólogo' },
      { id: 'med-gestao', name: 'Gestão de Absenteísmo e Redução de FAP/NTEP', nrCode: 'Gestão', defaultScope: 'Monitoramento epidemiológico de atestados e contestações INSS' },
    ]
  },
  {
    id: 'consultoria-esocial',
    name: 'Consultoria Digital & eSocial SST',
    icon: 'cloud_sync',
    description: 'Transmissão automatizada de eventos XML e assessoria jurídica técnica',
    subcategories: [
      { id: 'esoc-mensal', name: 'Transmissão Mensal eSocial (S-2210/2220/2240)', nrCode: 'eSocial', defaultScope: 'Disparo seguro de eventos de CAT, ASO e Condições Ambientais' },
      { id: 'esoc-audit', name: 'Auditoria de Conformidade e Notificações MTE', nrCode: 'Compliance', defaultScope: 'Prevenção de multas administrativas e saneamento de bases' },
      { id: 'esoc-pericia', name: 'Assistente Técnico em Perícias Trabalhistas', nrCode: 'Jurídico', defaultScope: 'Elaboração de quesitos, acompanhamento in loco e laudo divergente' },
      { id: 'esoc-gestao', name: 'Implantação de Sistema de Gestão SST (ISO 45001)', nrCode: 'ISO 45001', defaultScope: 'Mapeamento de processos, comitês de governança e auditoria interna' },
    ]
  },
  {
    id: 'prevencao-incendio',
    name: 'Engenharia de Incêndio & AVCB',
    icon: 'local_fire_department',
    description: 'Projetos técnicos contra incêndio e aprovação no Corpo de Bombeiros',
    subcategories: [
      { id: 'inc-avcb', name: 'Projeto Técnico e Renovação de AVCB / CLCB', nrCode: 'Bombeiros', defaultScope: 'Vistoria predial, montagem de pasta técnica e protocolo via Via Fácil' },
      { id: 'inc-emerg', name: 'Plano de Emergência e Evacuação Predial', nrCode: 'IT-16', defaultScope: 'Rotas de fuga, sinalização fotoluminescente e simulados' },
      { id: 'inc-laudo', name: 'Laudo de Conformidade de Hidrantes e Extintores', nrCode: 'NBR 13714', defaultScope: 'Teste hidrostático de mangueiras e vazão de bombas de incêndio' },
    ]
  }
];

export const DEMAND_ORIGINS = [
  'Prospecção Comercial Ativa (Outbound)',
  'Indicação de Parceiro / Contabilidade',
  'Renovação Anual Contratual (Recorrência)',
  'Fiscalização / Notificação do MTE ou MPT',
  'Exigência de Cliente / Auditoria Fornecedor',
  'Inbound / Solicitação Direta via Website & WhatsApp'
];

export const PRIORITY_LEVELS = [
  { value: 'Alta / Urgente (Até 48h)', label: 'Alta / Urgente (Até 48h)', badge: 'bg-rose-100 text-rose-800 border-rose-200' },
  { value: 'Média / Padrão (Até 5 dias)', label: 'Média / Padrão (Até 5 dias)', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'Baixa / Planejamento', label: 'Baixa / Planejamento', badge: 'bg-slate-100 text-slate-800 border-slate-200' }
];

export const TECHNICAL_RESPONSIBLES = [
  { name: 'Washington Assis', role: 'Engenheiro de Segurança do Trabalho (CREA/SP 506.892/D)' },
  { name: 'Dra. Mariana Rios', role: 'Médica do Trabalho Coordenadora (CRM/SP 142.809)' },
  { name: 'Tec. Roberto Silva', role: 'Técnico de Segurança do Trabalho (MTE/SP 0048291)' },
  { name: 'Amanda Silveira', role: 'Gerente Comercial & Contratos Corporativos' }
];
