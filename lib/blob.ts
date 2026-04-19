import { put as vercelPut, del as vercelDel } from '@vercel/blob';

export interface BlobPutOptions {
  contentType: string;
}

export interface BlobPutResult {
  url: string;
  pathname: string;
}

export interface BlobStore {
  put: (
    pathname: string,
    body: string | Uint8Array | ArrayBuffer,
    opts: BlobPutOptions,
  ) => Promise<BlobPutResult>;
  del: (url: string) => Promise<void>;
}

const realBlob: BlobStore = {
  put: async (pathname, body, opts) => {
    const putResult = await vercelPut(pathname, body as Blob | string, {
      access: 'public',
      contentType: opts.contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { url: putResult.url, pathname: putResult.pathname };
  },
  del: async (url) => {
    await vercelDel(url);
  },
};

export const blobStore: BlobStore = realBlob;

// ---------- test double ----------

interface FakeBlobEntry {
  body: Uint8Array;
  contentType: string;
}

export class FakeBlob implements BlobStore {
  private store = new Map<string, FakeBlobEntry>();

  reset() {
    this.store.clear();
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

  async del(url: string): Promise<void> {
    const pathname = url.replace('https://fake-blob.local/', '');
    this.store.delete(pathname);
  }

  async getText(url: string): Promise<string> {
    const pathname = url.replace('https://fake-blob.local/', '');
    const entry = this.store.get(pathname);
    if (!entry) throw new Error(`not found: ${pathname}`);
    return new TextDecoder().decode(entry.body);
  }

  async getBytes(url: string): Promise<Uint8Array> {
    const pathname = url.replace('https://fake-blob.local/', '');
    const entry = this.store.get(pathname);
    if (!entry) throw new Error(`not found: ${pathname}`);
    return entry.body;
  }
}
