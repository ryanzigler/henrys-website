import { describe, it, expect, beforeEach } from 'vitest';
import { FakeBlob } from '@/lib/blob';

describe('FakeBlob', () => {
  let blob: FakeBlob;
  beforeEach(() => {
    blob = new FakeBlob();
  });

  it('put returns a stable URL and stores the payload', async () => {
    const { url } = await blob.put('x.json', JSON.stringify({ hi: 1 }), {
      contentType: 'application/json',
    });
    expect(url).toContain('x.json');
    expect(await blob.getText(url)).toBe('{"hi":1}');
  });

  it('put overwrites when called twice with the same pathname', async () => {
    const firstPut = await blob.put('p.txt', 'one', {
      contentType: 'text/plain',
    });
    const secondPut = await blob.put('p.txt', 'two', {
      contentType: 'text/plain',
    });
    expect(firstPut.url).toBe(secondPut.url);
    expect(await blob.getText(secondPut.url)).toBe('two');
  });

  it('del removes a stored blob', async () => {
    const { url } = await blob.put('gone.txt', 'bye', {
      contentType: 'text/plain',
    });
    await blob.del(url);
    await expect(blob.getText(url)).rejects.toThrow(/not found/);
  });

  it('put accepts a Uint8Array payload', async () => {
    const { url } = await blob.put('bin.png', new Uint8Array([1, 2, 3]), {
      contentType: 'image/png',
    });
    const bytes = await blob.getBytes(url);
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });
});
