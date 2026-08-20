import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from 'crypto';

import type {
  SignedLicenseCertificate,
  SignedLicenseCertificatePayload,
} from './interfaces/signed-license-certificate.interface';

@Injectable()
export class LicenseSigningService {
  private readonly keyId =
    process.env.LICENSE_SIGNING_KEY_ID?.trim() || 'tallysync-main-1';

  requiresSignedLicenses(): boolean {
    return process.env.LICENSE_REQUIRE_SIGNED_LICENSES === 'true';
  }

  signPayload(
    payload: SignedLicenseCertificatePayload,
  ): SignedLicenseCertificate {
    const privateKeyPem = this.readKey(
      'LICENSE_SIGNING_PRIVATE_KEY_PEM',
      'LICENSE_SIGNING_PRIVATE_KEY_BASE64',
    );
    if (!privateKeyPem) {
      throw new ServiceUnavailableException(
        'License signing private key is not configured on this server',
      );
    }

    const canonical = this.canonicalize(payload);
    const bytes = Buffer.from(canonical, 'utf8');
    const privateKey = createPrivateKey(privateKeyPem);
    const signature = sign(null, bytes, privateKey).toString('base64url');

    return {
      payload,
      signature,
      payloadHash: createHash('sha256').update(bytes).digest('hex'),
      keyId: this.keyId,
    };
  }

  verifyCertificate(certificate: SignedLicenseCertificate): void {
    const publicKeyPem = this.readKey(
      'LICENSE_SIGNING_PUBLIC_KEY_PEM',
      'LICENSE_SIGNING_PUBLIC_KEY_BASE64',
    );
    if (!publicKeyPem) {
      throw new ServiceUnavailableException(
        'License verification public key is not configured on this server',
      );
    }

    const canonical = this.canonicalize(certificate.payload);
    const bytes = Buffer.from(canonical, 'utf8');
    const payloadHash = createHash('sha256').update(bytes).digest('hex');

    if (payloadHash !== certificate.payloadHash) {
      throw new ForbiddenException('Signed license payload hash is invalid');
    }

    const publicKey = createPublicKey(publicKeyPem);
    const valid = verify(
      null,
      bytes,
      publicKey,
      Buffer.from(certificate.signature, 'base64url'),
    );

    if (!valid) {
      throw new ForbiddenException('Signed license certificate is invalid');
    }
  }

  private readKey(pemName: string, base64Name: string): string | null {
    const direct = process.env[pemName]?.trim();
    if (direct) return direct.replace(/\\n/g, '\n');

    const encoded = process.env[base64Name]?.trim();
    if (!encoded) return null;
    return Buffer.from(encoded, 'base64').toString('utf8');
  }

  private canonicalize(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.canonicalize(item)).join(',')}]`;
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map(
        (key) =>
          `${JSON.stringify(key)}:${this.canonicalize(record[key])}`,
      )
      .join(',')}}`;
  }
}
