import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // PERBAIKAN DI SINI: Cek apakah rute berawalan /dashboard ATAU /smki/dashboard
  const isDashboardRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/smki/dashboard');

  // Jika tidak ada user dan mencoba akses rute dashboard tersebut
  if ((error || !user) && isDashboardRoute) {
    const redirectUrl = new URL('/login', request.url);
    const res = NextResponse.redirect(redirectUrl);
    
    // Hapus kuki sesi jika ada yang tertinggal
    request.cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith('sb-')) {
        res.cookies.delete(cookie.name);
      }
    });
    return res;
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/dashboard', 
    '/smki/dashboard/:path*', 
    '/smki/dashboard'
  ],
};
