import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const userPatchSchema = z.object({
  role: z.enum(['CLIENT', 'ADMIN']).optional(),
  isActive: z.boolean().optional()
});

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
  }

  const { id } = await props.params;
  const body = userPatchSchema.parse(await request.json());

  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'Aucune modification' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: body,
    select: {
      id: true,
      email: true,
      name: true,
      companyName: true,
      thirdpartyId: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  return NextResponse.json({ user });
}
