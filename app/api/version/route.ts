export const dynamic = 'force-static';

/** Identifica a publicação para não executar homologação contra uma versão antiga. */
export function GET() {
  return Response.json({ commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'local' }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
