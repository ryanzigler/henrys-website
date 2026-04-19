import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { isAdminRequest } from '@/lib/auth/admin';
import { createUser, getUser } from '@/lib/auth/users';
import { listCredentialsForUser } from '@/lib/auth/credentials';
import { saveChallenge } from '@/lib/auth/challenges';
import { getWebAuthnConfig } from '@/lib/auth/webauthn-config';

interface RegisterBody {
  userId?: string;
  username?: string;
  displayName?: string;
  emoji?: string;
}

const resolveUser = async (body: RegisterBody) => {
  if (body.userId) {
    const existing = await getUser(body.userId);
    return (
      existing ?? NextResponse.json({ error: 'unknown user' }, { status: 404 })
    );
  }

  if (body.username && body.displayName && body.emoji) {
    return createUser({
      username: body.username,
      displayName: body.displayName,
      emoji: body.emoji,
    });
  }

  return NextResponse.json(
    { error: 'must include { userId } or { username, displayName, emoji }' },
    { status: 400 },
  );
};

export const POST = async (req: Request) => {
  const url = new URL(req.url);
  if (!isAdminRequest(url)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as RegisterBody;
  const user = await resolveUser(body);
  if (user instanceof NextResponse) return user;

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
};
