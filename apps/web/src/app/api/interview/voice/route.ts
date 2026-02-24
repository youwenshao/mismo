import { NextResponse } from "next/server";

// TODO: Install livekit-server-sdk and generate a real room token.
// import { AccessToken } from "livekit-server-sdk";
//
// When implemented, this endpoint should:
//  1. Authenticate the user via Supabase session
//  2. Create an AccessToken using LIVEKIT_API_KEY / LIVEKIT_API_SECRET
//  3. Grant the token permissions to join a room
//  4. Return { token: string }

export async function POST() {
  return NextResponse.json(
    {
      error:
        "LiveKit not configured. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET.",
    },
    { status: 501 },
  );
}
