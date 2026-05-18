import { getAppSettings, saveAppSettings, appSettingsSchema } from '@/lib/app-settings';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
  }

  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  return NextResponse.json({ settings: await getAppSettings() });
}

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = appSettingsSchema.parse(await request.json());
  const settings = await saveAppSettings(body);

  return NextResponse.json({ settings });
}
