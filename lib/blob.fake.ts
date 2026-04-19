import type { BlobPutOptions, BlobPutResult, BlobStore } from '@/lib/blob';

interface FakeBlobEntry {
  body: Uint8Array;
  contentType: string;
}

export class FakeBlob implements BlobStore {
  private store = new Map<string, FakeBlobEntry>();

  async del(url: string): Promise<void> {
    const pathname = url.replace('https://fake-blob.local/', '');
    this.store.delete(pathname);
  }

  async getBytes(url: string): Promise<Uint8Array> {
    const pathname = url.replace('https://fake-blob.local/', '');
    const entry = this.store.get(pathname);

    if (!entry) {
      throw new Error(`not found: ${pathname}`);
    }

    return entry.body;
  }

  async getText(url: string): Promise<string> {
    const pathname = url.replace('https://fake-blob.local/', '');
    const entry = this.store.get(pathname);

    if (!entry) {
      throw new Error(`not found: ${pathname}`);
    }

    return new TextDecoder().decode(entry.body);
  }

  async put(
    pathname: string,
    body: string | Uint8Array | ArrayBuffer,
    opts: BlobPutOptions,
  ): Promise<BlobPutResult> {
    const bytes =
      typeof body === 'string' ? new TextEncoder().encode(body)
      : body instanceof ArrayBuffer ? new Uint8Array(body)
      : body;
    this.store.set(pathname, { body: bytes, contentType: opts.contentType });

    return { url: `https://fake-blob.local/${pathname}`, pathname };
  }

  reset() {
    this.store.clear();
  }
}
