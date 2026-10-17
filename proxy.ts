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

  if (user && pathname === '/login') {
    const redirectUrl = new URL('/landing-page', request.url);
    const res = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => res.cookies.set(cookie));
    res.headers.set('Cache-Control', 'private, no-store');
    return res;
  }

  // 2. Rute yang dilindungi (Dashboard & SMKI)
  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/')
    || pathname === '/smki/dashboard' || pathname.startsWith('/smki/dashboard/')
    || pathname === '/landing-page' || pathname.startsWith('/landing-page/');

  // Jika tidak ada user dan mencoba akses rute tersebut
  if ((error || !user) && (isDashboardRoute || pathname === '/landing-page')) {
    const redirectUrl = new URL('/login?error=unauthorized', request.url);
    const res = NextResponse.redirect(redirectUrl);

    response.cookies.getAll().forEach((cookie) => res.cookies.set(cookie));
    res.headers.set('Cache-Control', 'private, no-store');
    return res;
  }

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

// Tambahkan '/login' dan '/landing-page' ke dalam matcher supaya terpantau
export const config = {
  matcher: [
    '/login',
    '/landing-page',
    '/landing-page/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/smki/dashboard',
    '/smki/dashboard/:path*',
  ],
};
