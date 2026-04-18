import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { isAdminRequest } from '@/lib/auth/admin';
import { createUser, getUser } from '@/lib/auth/users';
import { listCredentialsForUser } from '@/lib/auth/credentials';
import { saveChallenge } from '@/lib/auth/challenges';
import { getWebAuthnConfig } from '@/lib/auth/webauthn-config';

type Body =
  | { userId: string }
  | { username: string; displayName: string; emoji: string };

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!isAdminRequest(url)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<Body>;

  let userId: string;
  if ('userId' in body && body.userId) {
    const existing = await getUser(body.userId);
    if (!existing)
      return NextResponse.json({ error: 'unknown user' }, { status: 404 });
    userId = existing.id;
  } else if (
    'username' in body
    && body.username
    && body.displayName
    && body.emoji
  ) {
    const user = await createUser({
      username: body.username,
      displayName: body.displayName,
      emoji: body.emoji,
    });
    userId = user.id;
  } else {
    return NextResponse.json(
      { error: 'must include { userId } or { username, displayName, emoji }' },
      { status: 400 },
    );
  }

  const user = await getUser(userId);
  if (!user)
    return NextResponse.json(
      { error: 'user not found after create' },
      { status: 500 },
    );

  const { rpID, rpName } = getWebAuthnConfig();
  const existingCreds = await listCredentialsForUser(userId);

  const options = await generateRegistrationOptions({
    rpID,
    rpName,
    userName: user.username,
    userDisplayName: user.displayName,
    userID: new TextEncoder().encode(user.id),
    attestationType: 'none',
    excludeCredentials: existingCreds.map((c) => ({
      id: c.id,
      transports: c.transports as never,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
  });

  const { challengeId } = await saveChallenge({
    challenge: options.challenge,
    userId,
    kind: 'register',
  });

  return NextResponse.json({ challengeId, userId, options });
}
