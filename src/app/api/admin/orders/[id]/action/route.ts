import {
  createApiErrorResponse,
  logApiRoute,
  requireDolibarrApiKey,
  requirePortalSession
} from '@/lib/api/dolibarr-route';
import { createInvoiceFromOrder } from '@/lib/dolibarr/invoices';
import {
  addOrderLine,
  closeOrder,
  deleteOrder,
  deleteOrderLine,
  markOrderInvoiced,
  setOrderToDraft,
  updateOrderLine,
  validateOrder
} from '@/lib/dolibarr/orders';
import { prisma } from '@/lib/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('validate') }),
  z.object({ action: z.literal('invoice') }),
  z.object({ action: z.literal('close') }),
  z.object({ action: z.literal('draft') }),
  z.object({ action: z.literal('markInvoiced') }),
  z.object({ action: z.literal('deleteOrder') }),
  z.object({
    action: z.literal('addLine'),
    productId: z.string().min(1),
    qty: z.number().positive(),
    priceHt: z.number().nonnegative()
  }),
  z.object({
    action: z.literal('updateLine'),
    lineId: z.string().min(1),
    productId: z.string().min(1).optional(),
    qty: z.number().positive(),
    priceHt: z.number().nonnegative()
  }),
  z.object({
    action: z.literal('deleteLine'),
    lineId: z.string().min(1)
  }),
  z.object({
    action: z.literal('updateWorkflow'),
    preparationStatus: z.enum(['to_prepare', 'validated', 'preparing', 'ready', 'shipped', 'delivered', 'blocked']),
    driver: z.string().trim().optional(),
    deliveryDate: z.string().trim().optional(),
    deliveryNote: z.string().trim().optional()
  })
]);

const customerMessages: Record<string, string> = {
  to_prepare: 'Votre commande est enregistree et sera preparee prochainement.',
  validated: 'Votre commande est validee.',
  preparing: 'Votre commande est en cours de preparation.',
  ready: 'Votre commande est preparee et attend la livraison.',
  shipped: 'Votre commande est confiee au livreur.',
  delivered: 'Votre commande est livree.',
  blocked: 'Votre commande est temporairement bloquee. Notre equipe vous contactera si necessaire.'
};

async function upsertOrderWorkflow(
  orderId: string,
  data: {
    preparationStatus: string;
    driver?: string | null;
    deliveryDate?: string | null;
    deliveryNote?: string | null;
  }
) {
  return prisma.orderWorkflow.upsert({
    where: { dolibarrOrderId: orderId },
    create: {
      dolibarrOrderId: orderId,
      preparationStatus: data.preparationStatus,
      driver: data.driver || null,
      deliveryDate: data.deliveryDate ? new Date(`${data.deliveryDate}T00:00:00`) : null,
      deliveryNote: data.deliveryNote || null,
      customerMessage: customerMessages[data.preparationStatus] ?? customerMessages.to_prepare,
      customerNotifiedAt: new Date()
    },
    update: {
      preparationStatus: data.preparationStatus,
      driver: data.driver || null,
      deliveryDate: data.deliveryDate ? new Date(`${data.deliveryDate}T00:00:00`) : null,
      deliveryNote: data.deliveryNote || null,
      customerMessage: customerMessages[data.preparationStatus] ?? customerMessages.to_prepare,
      customerNotifiedAt: new Date()
    }
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const startedAt = Date.now();
  let status = 200;

  try {
    const session = await requirePortalSession();
    if (session.user.role !== 'ADMIN') {
      status = 403;
      return NextResponse.json({ error: 'Acces refuse', code: 'FORBIDDEN' }, { status: 403 });
    }

    const apiKey = process.env.DOLIBARR_API_KEY ?? (await requireDolibarrApiKey(session));
    const { id } = await params;
    const body = actionSchema.parse(await request.json());

    if (body.action === 'validate') {
      const order = await validateOrder(id, apiKey);
      const workflow = await upsertOrderWorkflow(id, { preparationStatus: 'validated' });
      return NextResponse.json({ order, workflow });
    }

    if (body.action === 'invoice') {
      const invoice = await createInvoiceFromOrder(id, { validate: true }, apiKey);
      await markOrderInvoiced(id, apiKey).catch(() => null);
      return NextResponse.json({ invoice });
    }

    if (body.action === 'close') {
      const order = await closeOrder(id, apiKey);
      const workflow = await upsertOrderWorkflow(id, { preparationStatus: 'delivered' });
      return NextResponse.json({ order, workflow });
    }

    if (body.action === 'draft') {
      const order = await setOrderToDraft(id, apiKey);
      const workflow = await upsertOrderWorkflow(id, { preparationStatus: 'to_prepare' });
      return NextResponse.json({ order, workflow });
    }

    if (body.action === 'markInvoiced') {
      return NextResponse.json({ order: await markOrderInvoiced(id, apiKey) });
    }

    if (body.action === 'deleteOrder') {
      await deleteOrder(id, apiKey);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'updateWorkflow') {
      const workflow = await upsertOrderWorkflow(id, {
        preparationStatus: body.preparationStatus,
        driver: body.driver,
        deliveryDate: body.deliveryDate,
        deliveryNote: body.deliveryNote
      });

      return NextResponse.json({ workflow });
    }

    if (body.action === 'addLine') {
      return NextResponse.json({
        order: await addOrderLine(
          id,
          { productId: body.productId, qty: body.qty, priceHt: body.priceHt },
          apiKey
        )
      });
    }

    if (body.action === 'updateLine') {
      return NextResponse.json({
        order: await updateOrderLine(
          id,
          body.lineId,
          {
            productId: body.productId,
            qty: body.qty,
            priceHt: body.priceHt
          },
          apiKey
        )
      });
    }

    return NextResponse.json({ order: await deleteOrderLine(id, body.lineId, apiKey) });
  } catch (error) {
    const response = createApiErrorResponse(error);
    status = response.status;
    return response;
  } finally {
    logApiRoute('POST', request.nextUrl.pathname, status, startedAt);
  }
}
