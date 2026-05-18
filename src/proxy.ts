import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';

const protectedPaths = ['/dashboard', '/account', '/orders', '/invoices', '/reminders', '/history'];
const dolibarrApiPrefix = '/api/dolibarr';
const rateLimitWindowMs = 60_000;
const rateLimitMax = 100;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith(dolibarrApiPrefix)) {
    const limited = rateLimit(request);
    if (limited) return withSecurityHeaders(limited);
  }

  const isProtectedPage = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  const isPublicCatalogApi =
    request.method === 'GET' &&
    (pathname === '/api/dolibarr/products' ||
      /^\/api\/dolibarr\/products\/[^/]+(?:\/image)?$/.test(pathname));
  const isProtectedApi = pathname.startsWith(dolibarrApiPrefix) && !isPublicCatalogApi;

  if (isProtectedPage || isProtectedApi) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      if (isProtectedApi) {
        return withSecurityHeaders(
          NextResponse.json({ error: 'Non authentifie', code: 'UNAUTHORIZED' }, { status: 401 })
        );
      }

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

function rateLimit(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  const current = rateLimitStore.get(ip);

  if (!current || current.resetAt < now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + rateLimitWindowMs });
    return null;
  }

  current.count += 1;

  if (current.count > rateLimitMax) {
    return NextResponse.json({ error: 'Trop de requetes', code: 'RATE_LIMITED' }, { status: 429 });
  }

  return null;
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'"
    ].join('; ')
  );
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ]
};
