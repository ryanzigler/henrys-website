export const randomToken = (bytes = 32) => {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Buffer.from(buf).toString('hex');
};
