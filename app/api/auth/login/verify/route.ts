import { NextResponse } from 'next/server';
import {
  verifyAuthenticationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/browser';
import { consumeChallenge } from '@/lib/auth/challenges';
import { getCredential, updateCredentialCounter } from '@/lib/auth/credentials';
import { createSession, setSessionCookie } from '@/lib/auth/sessions';
import { getWebAuthnConfig } from '@/lib/auth/webauthn-config';

type Body = {
  challengeId?: string;
  response?: AuthenticationResponseJSON;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.challengeId || !body.response) {
    return NextResponse.json(
      { error: 'challengeId and response required' },
      { status: 400 },
    );
  }

  const challenge = await consumeChallenge(body.challengeId);
  if (!challenge || challenge.kind !== 'login') {
    return NextResponse.json(
      { error: 'challenge not found or expired' },
      { status: 400 },
    );
  }

  const credential = await getCredential(body.response.id);
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
        publicKey: credential.publicKey.slice(),
        counter: credential.counter,
        transports: credential.transports as never,
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

  await updateCredentialCounter(
    credential.id,
    verification.authenticationInfo.newCounter,
  );

  const { sessionId } = await createSession(challenge.userId);
  await setSessionCookie(sessionId);

  return NextResponse.json({ ok: true });
}
