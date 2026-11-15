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

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isRoot = pathname === '/';
  const isLoginRoute = pathname === '/login';
  const isLandingRoute = pathname === '/landing-page' || pathname.startsWith('/landing-page/');
  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/') || pathname === '/smki/dashboard' || pathname.startsWith('/smki/dashboard/');

  function redirect(path: string) {
    const url = request.nextUrl.clone(); 
    url.pathname = path;

    const redirectResponse = NextResponse.redirect(url);

    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    redirectResponse.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');

    return redirectResponse;
  }

  // 1. Pintu Utama (/): Buka web pertama kali langsung lempar ke /login
  if (isRoot) {
    return redirect(user ? '/landing-page' : '/login');
  }

  // 2. Proteksi Halaman Landing Page & Dashboard: Kalau BELUM LOGIN, tidak boleh masuk (lempar ke /login)
  if ((isLandingRoute || isDashboardRoute) && !user) {
    return redirect('/login');
  }

  // 3. Kalau SUDAH LOGIN tapi iseng buka /login -> Lempar ke landing page (sebagai penghubung)
  if (isLoginRoute && user) {
    return redirect('/landing-page');
  }

  response.headers.set('Cache-Control', 'private, no-store, must-revalidate');
  return response;
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/landing-page/:path*',
    '/dashboard/:path*',
    '/smki/dashboard/:path*',
  ],
};