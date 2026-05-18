import {
  assertOwnsThirdparty,
  createApiErrorResponse,
  logApiRoute,
  requireDolibarrApiKey,
  requirePortalSession
} from '@/lib/api/dolibarr-route';
import { createInvoiceFromOrder } from '@/lib/dolibarr/invoices';
import { getOrderById } from '@/lib/dolibarr/orders';
import { NextResponse, type NextRequest } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const startedAt = Date.now();
  let status = 201;

  try {
    const session = await requirePortalSession({ requireLinkedClient: true });
    const apiKey = await requireDolibarrApiKey(session);
    const { id } = await params;
    const order = await getOrderById(id, apiKey);
    assertOwnsThirdparty(session, order.socid);
    const invoice = await createInvoiceFromOrder(id, { validate: true }, apiKey);
    return NextResponse.json(invoice, { status });
  } catch (error) {
    const response = createApiErrorResponse(error);
    status = response.status;
    return response;
  } finally {
    logApiRoute('POST', request.nextUrl.pathname, status, startedAt);
  }
}
