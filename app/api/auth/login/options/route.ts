import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getUser } from '@/lib/auth/users';
import { listCredentialsForUser } from '@/lib/auth/credentials';
import { saveChallenge } from '@/lib/auth/challenges';
import { getWebAuthnConfig } from '@/lib/auth/webauthn-config';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userId: string | undefined = body?.userId;
  if (!userId)
    return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const user = await getUser(userId);
  if (!user)
    return NextResponse.json({ error: 'unknown user' }, { status: 404 });

  const creds = await listCredentialsForUser(userId);
  if (creds.length === 0) {
    return NextResponse.json(
      { error: 'no passkeys registered for this user' },
      { status: 409 },
    );
  }

  const { rpID } = getWebAuthnConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
    allowCredentials: creds.map((c) => ({
      id: c.id,
      transports: c.transports as never,
    })),
  });

  const { challengeId } = await saveChallenge({
    challenge: options.challenge,
    userId,
    kind: 'login',
  });

  return NextResponse.json({ challengeId, options });
}
