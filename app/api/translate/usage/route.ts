import { translationUser } from '@/lib/i18n/auth';
import { azureConfigured, translatorUsage } from '@/lib/i18n/azure';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const user = await translationUser(request);
  if (!user) return Response.json({ code: 'UNAUTHENTICATED' }, { status: 401, headers });
  // A resource's global usage belongs to the two approved account administrators.
  const admin = ['dellarosa@andima.co.id', 'griselda@andima.co.id'].includes(user.email?.toLowerCase() ?? '');
  const usage = await translatorUsageFor(admin);
  return Response.json(usage, { headers });
}

async function translatorUsageFor(admin: boolean) {
  if (admin) return translatorUsage();
  // Non-admins only need connection state, never the shared resource's usage.
  return { configured: azureConfigured(), code: azureConfigured() ? 'ADMIN_REQUIRED_FOR_USAGE' : 'TRANSLATOR_NOT_CONFIGURED' };
}
