import {
  createApiErrorResponse,
  logApiRoute,
  requireDolibarrApiKey,
  requirePortalSession
} from '@/lib/api/dolibarr-route';
import { getAllInvoices } from '@/lib/dolibarr/invoices';
import { prisma } from '@/lib/prisma';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  let status = 200;

  try {
    const session = await requirePortalSession();
    if (session.user.role !== 'ADMIN') {
      status = 403;
      return NextResponse.json({ error: 'Acces refuse', code: 'FORBIDDEN' }, { status });
    }

    const apiKey = process.env.DOLIBARR_API_KEY ?? (await requireDolibarrApiKey(session));
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 200);
    const invoices = await getAllInvoices({ limit }, apiKey);
    const thirdpartyIds = Array.from(
      new Set(
        invoices
          .map((invoice) => Number(invoice.socid ?? invoice.fk_soc ?? 0))
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
      invoices: invoices.map((invoice) => ({
        ...invoice,
        portalUser: usersByThirdparty.get(Number(invoice.socid ?? invoice.fk_soc ?? 0)) ?? null
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
