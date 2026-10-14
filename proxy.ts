import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/')
    || pathname === '/smki/dashboard' || pathname.startsWith('/smki/dashboard/');

  // Jika tidak ada user dan mencoba akses rute dashboard tersebut
  if ((error || !user) && isDashboardRoute) {
    const redirectUrl = new URL('/login', request.url);
    const res = NextResponse.redirect(redirectUrl);

    // Preserve session updates/expiry cookies produced by the Supabase client.
    response.cookies.getAll().forEach((cookie) => res.cookies.set(cookie));
    res.headers.set('Cache-Control', 'private, no-store');
    return res;
  }

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/smki/dashboard/:path*',
  ],
};
