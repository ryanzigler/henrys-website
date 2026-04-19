import {
  del as vercelDel,
  get as vercelGet,
  put as vercelPut,
} from '@vercel/blob';

export interface BlobPutOptions {
  contentType: string;
}

export interface BlobPutResult {
  pathname: string;
  url: string;
}

export interface BlobStore {
  del: (url: string) => Promise<void>;
  getText: (url: string) => Promise<string>;
  put: (
    pathname: string,
    body: string | Uint8Array | ArrayBuffer,
    opts: BlobPutOptions,
  ) => Promise<BlobPutResult>;
}

export const blobStore: BlobStore = {
  del: async (url) => {
    await vercelDel(url);
  },
  getText: async (url) => {
    const result = await vercelGet(url, { access: 'private' });
    if (!result || result.statusCode !== 200) {
      throw new Error(`blob fetch failed (${result?.statusCode ?? 404})`);
    }
    return new Response(result.stream).text();
  },
  put: async (pathname, body, opts) => {
    const { url, pathname: storedPath } = await vercelPut(
      pathname,
      body as Blob | string,
      {
        access: 'private',
        contentType: opts.contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      },
    );
    return { url, pathname: storedPath };
  },
};
