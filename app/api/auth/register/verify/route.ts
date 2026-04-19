import { NextResponse } from 'next/server';
import {
  verifyRegistrationResponse,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/browser';
import { isAdminRequest } from '@/lib/auth/admin';
import { consumeChallenge } from '@/lib/auth/challenges';
import { saveCredential } from '@/lib/auth/credentials';
import { getWebAuthnConfig } from '@/lib/auth/webauthn-config';

interface RegisterVerifyBody {
  challengeId?: string;
  response?: RegistrationResponseJSON;
}

export const POST = async (req: Request) => {
  const url = new URL(req.url);
  if (!isAdminRequest(url)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as RegisterVerifyBody;
  if (!body.challengeId || !body.response) {
    return NextResponse.json(
      { error: 'challengeId and response required' },
      { status: 400 },
    );
  }

  const challenge = await consumeChallenge(body.challengeId);
  if (!challenge || challenge.kind !== 'register') {
    return NextResponse.json(
      { error: 'challenge not found or expired' },
      { status: 400 },
    );
  }

  const { rpID, origin } = getWebAuthnConfig();

  const verification = await verifyRegistrationResponse({
    response: body.response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json(
      { error: 'registration not verified' },
      { status: 400 },
    );
  }

  const { credential } = verification.registrationInfo;
  await saveCredential({
    id: credential.id,
    userId: challenge.userId,
    publicKey: credential.publicKey,
    counter: credential.counter,
    transports: credential.transports as
      | AuthenticatorTransportFuture[]
      | undefined,
  });

  return NextResponse.json({ ok: true, userId: challenge.userId });
};
