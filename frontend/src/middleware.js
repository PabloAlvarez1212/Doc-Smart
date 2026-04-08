import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('token')?.value;
  const role = request.cookies.get('user_role')?.value;
  const { pathname } = request.nextUrl;

  // 1. Si no hay token y quiere entrar a zonas protegidas
  if (!token && (pathname.startsWith('/patient') || pathname.startsWith('/doctor'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Si el rol es doctor y quiere entrar a /patient
  if (pathname.startsWith('/patient') && role === 'doctor') {
    return NextResponse.redirect(new URL('/doctor/home', request.url));
  }

  // 3. Si el rol es paciente (o cualquier otro que no sea doctor) y quiere entrar a /doctor
  if (pathname.startsWith('/doctor') && role !== 'doctor') {
    return NextResponse.redirect(new URL('/patient/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/patient/:path*', '/doctor/:path*'],
};