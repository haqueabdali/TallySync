import { generateKeyPairSync } from 'crypto';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');

const privatePem = privateKey.export({
  type: 'pkcs8',
  format: 'pem',
}) as string;
const publicPem = publicKey.export({
  type: 'spki',
  format: 'pem',
}) as string;

console.log('LICENSE_SIGNING_PRIVATE_KEY_BASE64=' + Buffer.from(privatePem).toString('base64'));
console.log('LICENSE_SIGNING_PUBLIC_KEY_BASE64=' + Buffer.from(publicPem).toString('base64'));
console.log('LICENSE_SIGNING_KEY_ID=tallysync-main-1');
