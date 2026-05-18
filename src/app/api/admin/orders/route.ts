import {
  createApiErrorResponse,
  logApiRoute,
  requireDolibarrApiKey,
  requirePortalSession
} from '@/lib/api/dolibarr-route';
import { getAllInvoices } from '@/lib/dolibarr/invoices';
import { getAllOrders } from '@/lib/dolibarr/orders';
import { prisma } from '@/lib/prisma';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  let status = 200;

  try {
    const session = await requirePortalSession();
    if (session.user.role !== 'ADMIN') {
      status = 403;
      return NextResponse.json({ error: 'Acces refuse', code: 'FORBIDDEN' }, { status: 403 });
    }

    const apiKey = process.env.DOLIBARR_API_KEY ?? (await requireDolibarrApiKey(session));
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 100);
    const orders = await getAllOrders({ limit }, apiKey);
    const invoices = await getAllInvoices({ limit: 500 }, apiKey).catch(() => []);
    const accountingByThirdparty = new Map<
      number,
      {
        invoiceCount: number;
        openInvoiceCount: number;
        overdueInvoiceCount: number;
        totalInvoiced: number;
        totalPaid: number;
        remainingDue: number;
      }
    >();

    for (const invoice of invoices) {
      const thirdpartyId = Number(invoice.socid ?? invoice.fk_soc ?? 0);
      if (thirdpartyId <= 0) continue;

      const totalTtc = Number(invoice.total_ttc ?? 0);
      const remainingDue = Math.max(Number(invoice.remaintopay ?? 0), 0);
      const current = accountingByThirdparty.get(thirdpartyId) ?? {
        invoiceCount: 0,
        openInvoiceCount: 0,
        overdueInvoiceCount: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        remainingDue: 0
      };
      current.invoiceCount += 1;
      current.openInvoiceCount += remainingDue > 0 ? 1 : 0;
      current.overdueInvoiceCount +=
        remainingDue > 0 &&
        Number(invoice.date_lim_reglement ?? 0) > 0 &&
        Number(invoice.date_lim_reglement) * 1000 < Date.now()
          ? 1
          : 0;
      current.totalInvoiced += totalTtc;
      current.remainingDue += remainingDue;
      current.totalPaid += Math.max(totalTtc - remainingDue, 0);
      accountingByThirdparty.set(thirdpartyId, current);
    }
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
    const thirdpartyIds = Array.from(
      new Set(
        orders
          .map((order) => Number(order.socid ?? order.fk_soc ?? 0))
          .filter((thirdpartyId) => thirdpartyId > 0)
      )
    );
    const users = await prisma.user.findMany({
      where: { thirdpartyId: { in: thirdpartyIds } },
      select: {
        email: true,
        name: true,
        companyName: true,
        phone: true,
        mobile: true,
        thirdpartyId: true
      }
    });
    const usersByThirdparty = new Map(users.map((user) => [user.thirdpartyId, user]));

    return NextResponse.json({
      orders: orders.map((order) => ({
        ...order,
        portalWorkflow: workflowsByOrderId.get(order.id) ?? null,
        accountingSummary:
          accountingByThirdparty.get(Number(order.socid ?? order.fk_soc ?? 0)) ?? null,
        portalUser: usersByThirdparty.get(Number(order.socid ?? order.fk_soc ?? 0)) ?? null
      }))
    });
  } catch (error) {
    const response = createApiErrorResponse(error);
    status = response.status;
    return response;
  } finally {
    logApiRoute('GET', request.nextUrl.pathname, status, startedAt);
  }
}
