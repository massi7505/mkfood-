import {
  ApiRouteError,
  createApiErrorResponse,
  requireDolibarrApiKey
} from '@/lib/api/dolibarr-route';
import { auth } from '@/lib/auth';
import { findPortalUserThirdpartyId } from '@/lib/dolibarr/thirdparties';
import { prisma } from '@/lib/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const linkClientSchema = z.object({
  clientCode: z.string().trim().min(1, 'Code client requis')
});

const accountSelect = {
  id: true,
  email: true,
  name: true,
  companyName: true,
  siret: true,
  address: true,
  phone: true,
  mobile: true,
  billingAddress: true,
  shippingAddress: true,
  billingEmail: true,
  vatNumber: true,
  thirdpartyId: true
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      throw new ApiRouteError('Non authentifie', 401, 'UNAUTHORIZED');
    }

    const body = (await request.json()) as unknown;
    const parsed = linkClientSchema.parse(body);
    const existingAccount = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: accountSelect
    });

    if (!existingAccount) {
      throw new ApiRouteError('Compte introuvable', 404, 'ACCOUNT_NOT_FOUND');
    }

    if (existingAccount.thirdpartyId > 0) {
      return NextResponse.json(existingAccount);
    }

    const apiKey = await requireDolibarrApiKey(session);
    const thirdpartyId = await findPortalUserThirdpartyId(
      { clientCode: parsed.clientCode },
      apiKey
    );

    if (!thirdpartyId) {
      throw new ApiRouteError('Code client Dolibarr introuvable', 404, 'CLIENT_CODE_NOT_FOUND');
    }

    const account = await prisma.user.update({
      where: { id: session.user.id },
      data: { thirdpartyId },
      select: accountSelect
    });

    return NextResponse.json(account);
  } catch (error) {
    return createApiErrorResponse(error);
  }
}
