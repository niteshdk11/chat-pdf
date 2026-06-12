import { NextResponse, type NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

export async function updateSession(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  const response = NextResponse.next({
    request,
  })

  // Verify JWT token if present
  if (token) {
    const payload = verifyToken(token)
    if (!payload) {
      // Token is invalid, clear it
      response.cookies.delete('auth-token')
    }
  }

  return response
}
