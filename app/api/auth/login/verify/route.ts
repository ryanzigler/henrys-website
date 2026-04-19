import { NextResponse } from 'next/server';
import {
  verifyAuthenticationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/browser';
import { consumeChallenge } from '@/lib/auth/challenges';
import { getCredential, updateCredentialCounter } from '@/lib/auth/credentials';
import { createSession, setSessionCookie } from '@/lib/auth/sessions';
import { getUser } from '@/lib/auth/users';
import { getWebAuthnConfig } from '@/lib/auth/webauthn-config';

interface LoginVerifyBody {
  challengeId?: string;
  response?: AuthenticationResponseJSON;
}

export const POST = async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as LoginVerifyBody;
  if (!body.challengeId || !body.response) {
    return NextResponse.json(
      { error: 'challengeId and response required' },
      { status: 400 },
    );
  }

  const [challenge, credential] = await Promise.all([
    consumeChallenge(body.challengeId),
    getCredential(body.response.id),
  ]);
  if (!challenge || challenge.kind !== 'login') {
    return NextResponse.json(
      { error: 'challenge not found or expired' },
      { status: 400 },
    );
  }
  if (!credential || credential.userId !== challenge.userId) {
    return NextResponse.json({ error: 'unknown credential' }, { status: 400 });
  }

  const { rpID, origin } = getWebAuthnConfig();

  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: credential.transports,
      },
      requireUserVerification: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  if (!verification.verified) {
    return NextResponse.json({ error: 'not verified' }, { status: 400 });
  }

  const user = await getUser(challenge.userId);
  if (!user) {
    return NextResponse.json({ error: 'user vanished' }, { status: 500 });
  }

  await updateCredentialCounter(
    credential.id,
    verification.authenticationInfo.newCounter,
  );

  const { sessionId } = await createSession(user);
  await setSessionCookie(sessionId);

  return NextResponse.json({ ok: true });
};
