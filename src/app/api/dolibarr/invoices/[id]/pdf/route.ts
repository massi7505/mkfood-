import {
  assertOwnsThirdparty,
  ApiRouteError,
  createApiErrorResponse,
  logApiRoute,
  requireDolibarrApiKey,
  requirePortalSession
} from '@/lib/api/dolibarr-route';
import { getInvoiceById, getInvoicePDF } from '@/lib/dolibarr/invoices';
import { isInvoicePaid } from '@/lib/invoices/status';
import { type NextRequest } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const startedAt = Date.now();
  let status = 200;

  try {
    const session = await requirePortalSession({ requireLinkedClient: true });
    const apiKey = await requireDolibarrApiKey(session);
    const { id } = await params;
    const invoice = await getInvoiceById(id, apiKey);
    assertOwnsThirdparty(session, invoice.socid);

    if (!isInvoicePaid(invoice)) {
      throw new ApiRouteError('PDF disponible uniquement apres paiement', 403, 'INVOICE_UNPAID');
    }

    const pdf = await getInvoicePDF(id, apiKey);
    const filename = `facture-${invoice.ref.replace(/[^a-z0-9-_.]/gi, '_')}.pdf`;

    return new Response(pdf, {
      status,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
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
