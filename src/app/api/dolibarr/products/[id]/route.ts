import {
  createApiErrorResponse,
  logApiRoute,
  requireDolibarrApiKey
} from '@/lib/api/dolibarr-route';
import { auth } from '@/lib/auth';
import { getProductById } from '@/lib/dolibarr/products';
import { NextResponse, type NextRequest } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const startedAt = Date.now();
  let status = 200;

  try {
    const session = await auth();
    const apiKey = session?.user ? await requireDolibarrApiKey(session) : undefined;
    const { id } = await params;
    const product = await getProductById(id, apiKey);
    return NextResponse.json(product);
  } catch (error) {
    const response = createApiErrorResponse(error);
    status = response.status;
    return response;
  } finally {
    logApiRoute('GET', request.nextUrl.pathname, status, startedAt);
  }
}
