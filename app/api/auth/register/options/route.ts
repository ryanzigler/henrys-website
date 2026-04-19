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

  let user: Awaited<ReturnType<typeof getUser>>;
  if ('userId' in body && body.userId) {
    user = await getUser(body.userId);
    if (!user)
      return NextResponse.json({ error: 'unknown user' }, { status: 404 });
  } else if (
    'username' in body
    && body.username
    && body.displayName
    && body.emoji
  ) {
    user = await createUser({
      username: body.username,
      displayName: body.displayName,
      emoji: body.emoji,
    });
  } else {
    return NextResponse.json(
      { error: 'must include { userId } or { username, displayName, emoji }' },
      { status: 400 },
    );
  }

  const { rpID, rpName } = getWebAuthnConfig();
  const existingCreds = await listCredentialsForUser(user.id);

  const options = await generateRegistrationOptions({
    rpID,
    rpName,
    userName: user.username,
    userDisplayName: user.displayName,
    userID: new TextEncoder().encode(user.id),
    attestationType: 'none',
    excludeCredentials: existingCreds.map((c) => ({
      id: c.id,
      transports: c.transports,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
  });

  const { challengeId } = await saveChallenge({
    challenge: options.challenge,
    userId: user.id,
    kind: 'register',
  });

  return NextResponse.json({ challengeId, userId: user.id, options });
}
