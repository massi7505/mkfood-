import {
  createApiErrorResponse,
  ApiRouteError,
  requireDolibarrApiKey
} from '@/lib/api/dolibarr-route';
import { auth } from '@/lib/auth';
import { updateThirdpartyBillingProfile } from '@/lib/dolibarr/thirdparties';
import { prisma } from '@/lib/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const accountSchema = z.object({
  name: z.string().trim().min(2),
  companyName: z.string().trim().optional(),
  siret: z
    .string()
    .trim()
    .regex(/^\d{14}$/, 'SIRET invalide')
    .or(z.literal(''))
    .optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  mobile: z.string().trim().optional(),
  billingAddress: z.string().trim().optional(),
  shippingAddress: z.string().trim().optional(),
  billingEmail: z.string().trim().email().or(z.literal('')).optional(),
  vatNumber: z.string().trim().optional()
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

function emptyToNull(value: string | undefined) {
  return value?.trim() ? value.trim() : null;
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      throw new ApiRouteError('Non authentifie', 401, 'UNAUTHORIZED');
    }

    const account = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: accountSelect
    });

    if (!account) {
      throw new ApiRouteError('Compte introuvable', 404, 'ACCOUNT_NOT_FOUND');
    }

    return NextResponse.json(account);
  } catch (error) {
    return createApiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      throw new ApiRouteError('Non authentifie', 401, 'UNAUTHORIZED');
    }

    const body = (await request.json()) as unknown;
    const parsed = accountSchema.parse(body);
    const existingAccount = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        ...accountSelect,
        dolibarrApiKey: true
      }
    });

    if (!existingAccount) {
      throw new ApiRouteError('Compte introuvable', 404, 'ACCOUNT_NOT_FOUND');
    }

    if (existingAccount.thirdpartyId <= 0) {
      throw new ApiRouteError('Compte client non rattache', 403, 'THIRDPARTY_NOT_LINKED');
    }

    const apiKey = await requireDolibarrApiKey(session);

    await updateThirdpartyBillingProfile(
      existingAccount.thirdpartyId,
      {
        email: existingAccount.email,
        name: parsed.name,
        contactName: parsed.name,
        companyName: emptyToNull(parsed.companyName),
        siret: emptyToNull(parsed.siret),
        address: emptyToNull(parsed.address),
        phone: emptyToNull(parsed.phone),
        mobile: emptyToNull(parsed.mobile),
        billingAddress: emptyToNull(parsed.billingAddress),
        shippingAddress: emptyToNull(parsed.shippingAddress),
        billingEmail: emptyToNull(parsed.billingEmail),
        vatNumber: emptyToNull(parsed.vatNumber)
      },
      apiKey
    );

    const account = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.name,
        companyName: emptyToNull(parsed.companyName),
        siret: emptyToNull(parsed.siret),
        address: emptyToNull(parsed.address),
        phone: emptyToNull(parsed.phone),
        mobile: emptyToNull(parsed.mobile),
        billingAddress: emptyToNull(parsed.billingAddress),
        shippingAddress: emptyToNull(parsed.shippingAddress),
        billingEmail: emptyToNull(parsed.billingEmail),
        vatNumber: emptyToNull(parsed.vatNumber)
      },
      select: accountSelect
    });

    return NextResponse.json(account);
  } catch (error) {
    return createApiErrorResponse(error);
  }
}
