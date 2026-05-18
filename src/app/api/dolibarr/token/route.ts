import {
  createApiErrorResponse,
  logApiRoute,
  requirePortalSession
} from '@/lib/api/dolibarr-route';
import { requestDolibarrToken } from '@/lib/dolibarr/client';
import { prisma } from '@/lib/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const tokenRequestSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
  reset: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let status = 200;

  try {
    const session = await requirePortalSession();
    const body = (await request.json()) as unknown;
    const parsed = tokenRequestSchema.parse(body);
    const token = await requestDolibarrToken(parsed);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { dolibarrApiKey: token }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const response = createApiErrorResponse(error);
    status = response.status;
    return response;
  } finally {
    logApiRoute('POST', request.nextUrl.pathname, status, startedAt);
  }
}
