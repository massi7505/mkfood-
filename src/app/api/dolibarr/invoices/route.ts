import {
  createApiErrorResponse,
  logApiRoute,
  requireDolibarrApiKey,
  requirePortalSession
} from '@/lib/api/dolibarr-route';
import { getInvoicesByClient, getUnpaidInvoices } from '@/lib/dolibarr/invoices';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  let status = 200;

  try {
    const session = await requirePortalSession({ requireLinkedClient: true });
    const apiKey = await requireDolibarrApiKey(session);
    const invoices =
      request.nextUrl.searchParams.get('status') === 'unpaid'
        ? await getUnpaidInvoices(session.user.thirdpartyId, apiKey)
        : await getInvoicesByClient(session.user.thirdpartyId, apiKey);
    return NextResponse.json(invoices);
  } catch (error) {
    const response = createApiErrorResponse(error);
    status = response.status;
    return response;
  } finally {
    logApiRoute('GET', request.nextUrl.pathname, status, startedAt);
  }
}
