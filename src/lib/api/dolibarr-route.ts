import { DolibarrApiError } from '@/lib/dolibarr/client';
import { findPortalUserThirdpartyId } from '@/lib/dolibarr/thirdparties';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { ZodError } from 'zod';

export class ApiRouteError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ApiRouteError';
  }
}

export async function requirePortalSession(options: { requireLinkedClient?: boolean } = {}) {
  const session = await auth();

  if (!session?.user) {
    throw new ApiRouteError('Non authentifie', 401, 'UNAUTHORIZED');
  }

  if (session.user.role !== 'ADMIN' && session.user.thirdpartyId <= 0) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        companyName: true,
        siret: true,
        thirdpartyId: true
      }
    });

    if (user?.thirdpartyId && user.thirdpartyId > 0) {
      session.user.thirdpartyId = user.thirdpartyId;
    } else if (user) {
      const linkedThirdpartyId = await findPortalUserThirdpartyId({
        siret: user.siret,
        email: user.email,
        companyName: user.companyName
      }).catch(() => null);

      if (linkedThirdpartyId) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { thirdpartyId: linkedThirdpartyId }
        });
        session.user.thirdpartyId = linkedThirdpartyId;
      }
    }
  }

  if (
    options.requireLinkedClient &&
    session.user.role !== 'ADMIN' &&
    session.user.thirdpartyId <= 0
  ) {
    throw new ApiRouteError('Compte client non rattache', 403, 'THIRDPARTY_NOT_LINKED');
  }

  return session;
}

export async function requireDolibarrApiKey(session: Session) {
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dolibarrApiKey: true }
  });

  const apiKey = user?.dolibarrApiKey || process.env.DOLIBARR_API_KEY;

  if (!apiKey) {
    throw new ApiRouteError(
      'Jeton Dolibarr manquant pour cet utilisateur',
      403,
      'DOLIBARR_TOKEN_MISSING'
    );
  }

  return apiKey;
}

export function assertOwnsThirdparty(session: Session, thirdpartyId: string | number) {
  if (session.user.role === 'ADMIN') return;

  if (Number(thirdpartyId) !== session.user.thirdpartyId) {
    throw new ApiRouteError('Acces refuse', 403, 'FORBIDDEN');
  }
}

export function createApiErrorResponse(error: unknown) {
  if (error instanceof ApiRouteError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  if (error instanceof DolibarrApiError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Payload invalide', code: 'VALIDATION_ERROR', issues: error.flatten() },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: 'Erreur interne', code: 'INTERNAL_SERVER_ERROR' },
    { status: 500 }
  );
}

export function logApiRoute(method: string, path: string, status: number, startedAt: number) {
  console.warn(
    JSON.stringify({
      source: 'portal-api',
      method,
      path,
      status,
      duration: Date.now() - startedAt
    })
  );
}
