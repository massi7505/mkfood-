import {
  createApiErrorResponse,
  logApiRoute,
  requireDolibarrApiKey
} from '@/lib/api/dolibarr-route';
import { auth } from '@/lib/auth';
import { getProductById, getProductImage } from '@/lib/dolibarr/products';
import { type NextRequest } from 'next/server';

type Params = { params: Promise<{ id: string }> };

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createProductPlaceholder(ref: string, label: string) {
  const safeRef = escapeSvgText(ref || 'Produit');
  const safeLabel = escapeSvgText(label || 'Photo produit indisponible');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" role="img" aria-label="${safeLabel}">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#eff6ff"/>
      <stop offset="1" stop-color="#dbeafe"/>
    </linearGradient>
  </defs>
  <rect width="640" height="640" fill="url(#g)"/>
  <rect x="112" y="132" width="416" height="376" rx="34" fill="#ffffff" stroke="#bfdbfe" stroke-width="8"/>
  <path d="M218 268h204l-32 142H250l-32-142Z" fill="#2563eb" opacity=".12"/>
  <path d="M240 242h160l22 26H218l22-26Z" fill="#2563eb" opacity=".28"/>
  <circle cx="282" cy="440" r="18" fill="#2563eb" opacity=".55"/>
  <circle cx="372" cy="440" r="18" fill="#2563eb" opacity=".55"/>
  <text x="320" y="548" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#1e3a8a">${safeRef}</text>
</svg>`;
}

export async function GET(request: NextRequest, { params }: Params) {
  const startedAt = Date.now();
  let status = 200;

  try {
    const session = await auth();
    const apiKey = session?.user ? await requireDolibarrApiKey(session) : undefined;
    const { id } = await params;
    const image = await getProductImage(id, apiKey);

    if (!image) {
      const product = await getProductById(id, apiKey).catch(() => null);
      const placeholder = createProductPlaceholder(product?.ref ?? id, product?.label ?? id);
      return new Response(placeholder, {
        status,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
          'X-Content-Type-Options': 'nosniff'
        }
      });
    }

    return new Response(image.buffer, {
      status,
      headers: {
        'Content-Type': image.contentType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    const response = createApiErrorResponse(error);
    status = response.status;
    return response;
  } finally {
    logApiRoute('GET', request.nextUrl.pathname, status, startedAt);
  }
}
