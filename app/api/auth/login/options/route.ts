import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getUser } from '@/lib/auth/users';
import { listCredentialsForUser } from '@/lib/auth/credentials';
import { saveChallenge } from '@/lib/auth/challenges';
import { getWebAuthnConfig } from '@/lib/auth/webauthn-config';

interface LoginOptionsBody {
  userId?: string;
}

export const POST = async (req: Request) => {
  const { userId } = (await req.json().catch(() => ({}))) as LoginOptionsBody;

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const user = await getUser(userId);
  if (!user) {
    return NextResponse.json({ error: 'unknown user' }, { status: 404 });
  }

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
    allowCredentials: creds.map((cred) => ({
      id: cred.id,
      transports: cred.transports,
    })),
  });

  const { challengeId } = await saveChallenge({
    challenge: options.challenge,
    userId,
    kind: 'login',
  });

  return NextResponse.json({ challengeId, options });
};
