// A stable operationId for the Milestone inserts createGoalWithMilestonesAndTrackers makes through
// goal_work_v1 (TD-005 B7), so a retried Goal create doesn't duplicate them: the same (goalId, index)
// always derives the same operationId, and goal_work_v1's own replay-by-identity handles the retry.
// This intentionally avoids Node-only crypto because the shared Goal service is included in native bundles.
const MILESTONE_CREATE_NAMESPACE = '3d917822-3c23-44f9-ac31-8d999d23cdba';

function rotateLeft(value: number, bits: number): number {
  return (value << bits) | (value >>> (32 - bits));
}

function sha1(input: Uint8Array): Uint8Array {
  const bitLength = input.length * 8;
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(input);
  bytes[input.length] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const words = new Uint32Array(80);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4);
    for (let index = 16; index < 80; index += 1) {
      words[index] = rotateLeft(words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16], 1) >>> 0;
    }
    let a = h0; let b = h1; let c = h2; let d = h3; let e = h4;
    for (let index = 0; index < 80; index += 1) {
      let f: number; let k: number;
      if (index < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (index < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (index < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const next = (rotateLeft(a, 5) + f + e + k + words[index]) >>> 0;
      e = d; d = c; c = rotateLeft(b, 30) >>> 0; b = a; a = next;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  const digest = new Uint8Array(20);
  const digestView = new DataView(digest.buffer);
  [h0, h1, h2, h3, h4].forEach((value, index) => digestView.setUint32(index * 4, value));
  return digest;
}

function uuidv5(namespace: string, name: string): string {
  const namespaceHex = namespace.replace(/-/g, '');
  const namespaceBytes = Uint8Array.from({ length: 16 }, (_, index) => Number.parseInt(namespaceHex.slice(index * 2, index * 2 + 2), 16));
  const nameBytes = Uint8Array.from([...name].map((character) => character.charCodeAt(0)));
  const input = new Uint8Array(namespaceBytes.length + nameBytes.length);
  input.set(namespaceBytes); input.set(nameBytes, namespaceBytes.length);
  const hash = sha1(input);
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = [...hash.subarray(0, 16)].map((value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function milestoneCreateOperationId(goalId: string, index: number): string {
  return uuidv5(MILESTONE_CREATE_NAMESPACE, `${goalId}:${index}`);
}
