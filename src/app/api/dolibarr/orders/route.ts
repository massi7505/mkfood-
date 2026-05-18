import {
  assertOwnsThirdparty,
  createApiErrorResponse,
  logApiRoute,
  requireDolibarrApiKey,
  requirePortalSession
} from '@/lib/api/dolibarr-route';
import { createOrder, getOrdersByClient } from '@/lib/dolibarr/orders';
import { prisma } from '@/lib/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const createOrderSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().positive(),
        priceHt: z.number().nonnegative()
      })
    )
    .min(1)
});

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  let status = 200;

  try {
    const session = await requirePortalSession({ requireLinkedClient: true });
    const apiKey = await requireDolibarrApiKey(session);
    const limit = request.nextUrl.searchParams.get('limit');
    const offset = request.nextUrl.searchParams.get('offset');
    const orders = await getOrdersByClient(
      session.user.thirdpartyId,
      {
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined
      },
      apiKey
    );
    const workflows = await prisma.orderWorkflow.findMany({
      where: { dolibarrOrderId: { in: orders.map((order) => order.id) } }
    });
    const workflowsByOrderId = new Map(
      workflows.map((workflow) => [
        workflow.dolibarrOrderId,
        {
          preparationStatus: workflow.preparationStatus,
          driver: workflow.driver,
          deliveryDate: workflow.deliveryDate?.toISOString() ?? null,
          deliveryNote: workflow.deliveryNote,
          customerMessage: workflow.customerMessage,
          customerNotifiedAt: workflow.customerNotifiedAt?.toISOString() ?? null
        }
      ])
    );
    return NextResponse.json(
      orders.map((order) => ({
        ...order,
        portalWorkflow: workflowsByOrderId.get(order.id) ?? null
      }))
    );
  } catch (error) {
    const response = createApiErrorResponse(error);
    status = response.status;
    return response;
  } finally {
    logApiRoute('GET', request.nextUrl.pathname, status, startedAt);
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let status = 201;

  try {
    const session = await requirePortalSession({ requireLinkedClient: true });
    const apiKey = await requireDolibarrApiKey(session);
    assertOwnsThirdparty(session, session.user.thirdpartyId);
    const body = (await request.json()) as unknown;
    const parsed = createOrderSchema.parse(body);
    const order = await createOrder(session.user.thirdpartyId, parsed.lines, apiKey);
    return NextResponse.json(order, { status });
  } catch (error) {
    const response = createApiErrorResponse(error);
    status = response.status;
    return response;
  } finally {
    logApiRoute('POST', request.nextUrl.pathname, status, startedAt);
  }
}
