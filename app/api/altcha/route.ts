import { createChallenge } from 'altcha-lib'
import { NextResponse } from 'next/server'

// Force dynamic - challenges must be unique each time
export const dynamic = 'force-dynamic'

// HMAC key for signing challenges - in production, use an environment variable
const HMAC_KEY = process.env.ALTCHA_HMAC_KEY || 'aol-chat-secret-key-change-in-production'

export async function GET() {
  try {
    // Create a new challenge with expiration
    const challenge = await createChallenge({
      hmacKey: HMAC_KEY,
      maxNumber: 50000, // Reasonable difficulty for quick verification
      algorithm: 'SHA-256',
      expires: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    })

    // Return with proper headers
    return new NextResponse(JSON.stringify(challenge), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('ALTCHA challenge generation error:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to generate challenge' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}

// Needed for CORS if widget is on different domain
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
