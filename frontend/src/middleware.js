import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('token')?.value;
  const role = request.cookies.get('user_role')?.value;
  const { pathname } = request.nextUrl;

  if (token && pathname === '/login') {
    if (role === 'paciente') {
      return NextResponse.redirect(
        new URL('/patient/home', request.url)
      );
  }}
  // 1. Si no hay token y quiere entrar a zonas protegidas
  if (!token && (pathname.startsWith('/patient') || pathname.startsWith('/doctor') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si el rol es admin y quiere entar a /patient o /doctor
  if (role === 'admin' && (pathname.startsWith('/patient') || pathname.startsWith('/doctor'))) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  //Si el rol es doctor y quiere entrar a /patient o /admin
  if (role === 'doctor' && (pathname.startsWith('/patient') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/doctor/home', request.url));
  }

  // 3. Si el rol es paciente y quiere entrar a /doctor
  if (role === 'paciente' && (pathname.startsWith('/doctor') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/patient/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/patient/:path*', '/doctor/:path*', '/admin/:path*', '/login',],
};