import {
  createApiErrorResponse,
  logApiRoute,
  requireDolibarrApiKey,
  requirePortalSession
} from '@/lib/api/dolibarr-route';
import { getInvoicePDF } from '@/lib/dolibarr/invoices';
import { NextResponse, type NextRequest } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const startedAt = Date.now();
  let status = 200;

  try {
    const session = await requirePortalSession();
    if (session.user.role !== 'ADMIN') {
      status = 403;
      return NextResponse.json({ error: 'Acces refuse', code: 'FORBIDDEN' }, { status });
    }

    const apiKey = process.env.DOLIBARR_API_KEY ?? (await requireDolibarrApiKey(session));
    const { id } = await params;
    const pdf = await getInvoicePDF(id, apiKey);

    return new NextResponse(pdf, {
      status,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="facture-${id}.pdf"`
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
