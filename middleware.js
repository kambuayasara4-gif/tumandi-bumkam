import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Lewati file statis, aset Next.js, dan endpoint publik auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Ambil token sesi dari cookie
  const sessionToken = request.cookies.get('tumandi_session')?.value;

  // 3. Jika pengguna BELUM login dan mengakses halaman selain /login, arahkan ke /login
  if (!sessionToken && pathname !== '/login') {
    const loginUrl = new URL('/login', request.url);
    // Simpan target URL sebelumnya untuk kenyamanan navigasi jika diperlukan
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Jika pengguna SUDAH login dan mencoba membuka /login, arahkan ke dashboard utama /
  if (sessionToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Cocokkan seluruh rute aplikasi kecuali file internal Next.js
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
