// A stable operationId for the Milestone inserts createGoalWithMilestonesAndTrackers makes through
// goal_work_v1 (TD-005 B7), so a retried Goal create doesn't duplicate them: the same (goalId, index)
// always derives the same operationId, and goal_work_v1's own replay-by-identity handles the retry.
// This implementation is platform-neutral because lib/db/goals.ts is reachable
// from the native route graph even when the write ultimately runs on the server.
const MILESTONE_CREATE_NAMESPACE = '3d917822-3c23-44f9-ac31-8d999d23cdba';

function rotateLeft(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

/** Minimal SHA-1 needed by RFC 9562 UUIDv5; input here is bounded ASCII. */
function sha1(input: Uint8Array): Uint8Array {
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(input);
  padded[input.length] = 0x80;
  new DataView(padded.buffer).setUint32(paddedLength - 4, input.length * 8, false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const words = new Uint32Array(80);
  const view = new DataView(padded.buffer);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
    for (let index = 16; index < 80; index += 1) {
      words[index] = rotateLeft(words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let index = 0; index < 80; index += 1) {
      let f: number;
      let k: number;
      if (index < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (index < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (index < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const next = (rotateLeft(a, 5) + f + e + k + words[index]) >>> 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = next;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const output = new Uint8Array(20);
  const outputView = new DataView(output.buffer);
  [h0, h1, h2, h3, h4].forEach((value, index) => outputView.setUint32(index * 4, value, false));
  return output;
}

function uuidv5(namespace: string, name: string): string {
  const namespaceHex = namespace.replace(/-/g, '');
  const namespaceBytes = Uint8Array.from({ length: 16 }, (_, index) => Number.parseInt(namespaceHex.slice(index * 2, index * 2 + 2), 16));
  const nameBytes = Uint8Array.from(name, (character) => character.charCodeAt(0));
  const value = new Uint8Array(namespaceBytes.length + nameBytes.length);
  value.set(namespaceBytes);
  value.set(nameBytes, namespaceBytes.length);
  const hash = sha1(value);
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = [...hash.subarray(0, 16)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function milestoneCreateOperationId(goalId: string, index: number): string {
  return uuidv5(MILESTONE_CREATE_NAMESPACE, `${goalId}:${index}`);
}
