import {
  createApiErrorResponse,
  logApiRoute,
  requireDolibarrApiKey
} from '@/lib/api/dolibarr-route';
import { auth } from '@/lib/auth';
import { getProducts } from '@/lib/dolibarr/products';
import { NextResponse, type NextRequest } from 'next/server';

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  let status = 200;

  try {
    const session = await auth();
    const apiKey = session?.user ? await requireDolibarrApiKey(session) : undefined;
    const { searchParams } = request.nextUrl;
    const limit = searchParams.get('limit');
    const products = await getProducts(
      {
        search: searchParams.get('search') ?? undefined,
        category: searchParams.get('category') ?? undefined,
        limit: limit ? Number(limit) : undefined
      },
      apiKey
    );

    return NextResponse.json(products);
  } catch (error) {
    const response = createApiErrorResponse(error);
    status = response.status;
    return response;
  } finally {
    logApiRoute('GET', request.nextUrl.pathname, status, startedAt);
  }
}
