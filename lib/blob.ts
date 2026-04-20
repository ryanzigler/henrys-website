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
  getBytes: (url: string) => Promise<Uint8Array>;
  getText: (url: string) => Promise<string>;
  put: (
    pathname: string,
    body: string | Uint8Array | ArrayBuffer,
    opts: BlobPutOptions,
  ) => Promise<BlobPutResult>;
}

const fetchPrivateBlob = async (url: string) => {
  const result = await vercelGet(url, { access: 'private' });
  if (!result || result.statusCode !== 200) {
    throw new Error(`blob fetch failed (${result?.statusCode ?? 404})`);
  }
  return result.stream;
};

export const blobStore: BlobStore = {
  del: async (url) => {
    await vercelDel(url);
  },
  getBytes: async (url) =>
    new Uint8Array(
      await new Response(await fetchPrivateBlob(url)).arrayBuffer(),
    ),
  getText: async (url) => new Response(await fetchPrivateBlob(url)).text(),
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
