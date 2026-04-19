export const saveBlobToPhotos = async (blob: Blob, filename: string) => {
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') {
        return;
      }
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.href = objectUrl;
  downloadAnchor.download = filename;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

export const sanitizeFilename = (title: string, id: string) => {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'untitled';
  const short = id.replace(/^d_/, '').slice(0, 8);

  return `${slug}-${short}.png`;
};
