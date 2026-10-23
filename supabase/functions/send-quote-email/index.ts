// =============================================================================
// Edge Function: send-quote-email
// Envia a proposta (PDF anexo) por e-mail ao cliente usando a API do Resend
// (https://resend.com) e registra o envio no histórico (`quote_events`).
//
// Segredos necessários (Supabase > Edge Functions > Secrets):
//   RESEND_API_KEY  chave da API do Resend (re_...)
//   EMAIL_FROM      remetente de um domínio verificado no Resend,
//                   ex.: "Consentra SST <propostas@consentra.com.br>"
// Sem eles a função responde `configured: false` e o app oferece o envio
// manual (baixar PDF + abrir o aplicativo de e-mail).
//
// Segurança:
// * Exige sessão válida (token do usuário logado) e perfil com permissão de
//   escrita (Auditor SST não envia).
// * O orçamento precisa existir no banco.
// * Destinatários validados e limitados; texto escapado no HTML; anexo limitado.
// * A resposta ao cliente vai para o e-mail do usuário que enviou (reply_to).
//
// Deploy: supabase functions deploy send-quote-email --no-verify-jwt
// (o JWT é validado dentro da função via auth.getUser)
// =============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_RECIPIENTS = 5;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 10_000;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 MB (PDF)
const EMAIL_RE = /^[^\s@<>(),;:"\[\]]+@[^\s@<>(),;:"\[\]]+\.[^\s@<>(),;:"\[\]]{2,}$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function emailList(value: unknown): string[] | null {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,;]/) : [];
  const list = raw.map((v) => str(v).toLowerCase()).filter(Boolean);
  if (list.some((e) => e.length > 254 || !EMAIL_RE.test(e))) return null;
  return Array.from(new Set(list));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function messageToHtml(message: string): string {
  const paragraphs = escapeHtml(message)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#0b1c30">${paragraphs}</div>`;
}

/** Tamanho aproximado (bytes) de um conteúdo base64. */
function base64Bytes(b64: string): number {
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Função mal configurada.' }, 500);

  const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
  const emailFrom = Deno.env.get('EMAIL_FROM') ?? '';
  const configured = Boolean(resendKey && emailFrom);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ---- 1. Autenticação e autorização ----
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sessão não informada. Faça login novamente.' }, 401);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return json({ error: 'Sessão inválida ou expirada.' }, 401);
  const caller = userData.user;

  const { data: profile } = await admin
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', caller.id)
    .maybeSingle();
  if (!profile) return json({ error: 'Perfil de usuário não encontrado.' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  // Consulta de configuração (o app decide entre envio real e envio manual)
  if (body.action === 'status') return json({ configured });

  if (profile.role === 'Auditor SST') {
    return json({ error: 'Perfil Auditor SST possui acesso somente leitura.' }, 403);
  }
  if (!configured) {
    return json(
      {
        error: 'Envio de e-mail não configurado no servidor (RESEND_API_KEY / EMAIL_FROM).',
        code: 'not_configured',
      },
      503
    );
  }

  // ---- 2. Validação ----
  const quoteId = str(body.quote_id).replace('#', '');
  if (!quoteId) return json({ error: 'Orçamento não informado.' }, 400);

  const to = emailList(body.to);
  const cc = emailList(body.cc ?? []);
  if (!to || to.length === 0) return json({ error: 'Informe ao menos um destinatário válido.' }, 400);
  if (!cc) return json({ error: 'Há e-mails inválidos em "Cópia (CC)".' }, 400);
  if (to.length > MAX_RECIPIENTS || cc.length > MAX_RECIPIENTS) {
    return json({ error: `Máximo de ${MAX_RECIPIENTS} destinatários por campo.` }, 400);
  }

  const subject = str(body.subject).replace(/[\r\n]+/g, ' ');
  const message = typeof body.message === 'string' ? body.message.replace(/\r\n/g, '\n').trim() : '';
  if (!subject || subject.length > MAX_SUBJECT) {
    return json({ error: `O assunto é obrigatório (até ${MAX_SUBJECT} caracteres).` }, 400);
  }
  if (!message || message.length > MAX_MESSAGE) {
    return json({ error: `A mensagem é obrigatória (até ${MAX_MESSAGE} caracteres).` }, 400);
  }

  const att = body.attachment as { filename?: unknown; content?: unknown } | undefined;
  let attachment: { filename: string; content: string } | null = null;
  if (att) {
    const filename = str(att.filename).replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'proposta.pdf';
    const content = str(att.content).replace(/^data:[^,]*,/, '');
    if (!content || !/^[A-Za-z0-9+/=]+$/.test(content)) return json({ error: 'Anexo inválido.' }, 400);
    if (base64Bytes(content) > MAX_ATTACHMENT_BYTES) {
      return json({ error: 'O PDF excede o limite de 8 MB para envio por e-mail.' }, 413);
    }
    attachment = { filename: filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`, content };
  }

  const { data: quote } = await admin
    .from('quotes')
    .select('id, number_only, status, client_name')
    .eq('id', quoteId)
    .maybeSingle();
  if (!quote) return json({ error: 'Orçamento não encontrado. Salve o orçamento antes de enviar.' }, 404);

  // ---- 3. Envio (Resend) ----
  const replyTo = str(profile.email) || caller.email || undefined;
  let providerId: string | null = null;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: emailFrom,
        to,
        cc: cc.length ? cc : undefined,
        reply_to: replyTo,
        subject,
        text: message,
        html: messageToHtml(message),
        attachments: attachment ? [attachment] : undefined,
      }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Resend error', res.status, result);
      const detail = typeof result?.message === 'string' ? ` (${result.message})` : '';
      return json({ error: `O provedor de e-mail recusou o envio${detail}.` }, 502);
    }
    providerId = typeof result?.id === 'string' ? result.id : null;
  } catch (err) {
    console.error('Resend fetch failed', err);
    return json({ error: 'Falha ao contatar o provedor de e-mail. Tente novamente.' }, 502);
  }

  // ---- 4. Histórico ----
  const { error: logError } = await admin.from('quote_events').insert({
    quote_id: quote.id,
    quote_number: quote.number_only,
    event_type: 'email_sent',
    to_status: quote.status,
    details: {
      to,
      cc,
      subject,
      attachment: attachment?.filename ?? null,
      provider_id: providerId,
      client_name: quote.client_name,
    },
    actor_id: profile.id,
    actor_name: profile.name,
  });
  if (logError) console.error('quote_events insert failed', logError);

  return json({ success: true, id: providerId });
});
