import {
  assertOwnsThirdparty,
  createApiErrorResponse,
  logApiRoute,
  requireDolibarrApiKey,
  requirePortalSession
} from '@/lib/api/dolibarr-route';
import { getOrderById } from '@/lib/dolibarr/orders';
import { prisma } from '@/lib/prisma';
import { NextResponse, type NextRequest } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const startedAt = Date.now();
  let status = 200;

  try {
    const session = await requirePortalSession({ requireLinkedClient: true });
    const apiKey = await requireDolibarrApiKey(session);
    const { id } = await params;
    const order = await getOrderById(id, apiKey);
    assertOwnsThirdparty(session, order.socid);
    const workflow = await prisma.orderWorkflow.findUnique({
      where: { dolibarrOrderId: order.id }
    });
    return NextResponse.json({
      ...order,
      portalWorkflow: workflow
        ? {
            preparationStatus: workflow.preparationStatus,
            driver: workflow.driver,
            deliveryDate: workflow.deliveryDate?.toISOString() ?? null,
            deliveryNote: workflow.deliveryNote,
            customerMessage: workflow.customerMessage,
            customerNotifiedAt: workflow.customerNotifiedAt?.toISOString() ?? null
          }
        : null
    });
  } catch (error) {
    const response = createApiErrorResponse(error);
    status = response.status;
    return response;
  } finally {
    logApiRoute('GET', request.nextUrl.pathname, status, startedAt);
  }
}
