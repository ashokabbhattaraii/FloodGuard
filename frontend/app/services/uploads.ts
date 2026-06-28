import { apiClient } from './api-client';

type PresignResponse = { url: string; key: string };

export const uploadsService = {
  getPresignedUrl: (filename: string, contentType: string) =>
    apiClient.post<PresignResponse>('/uploads/presign', { filename, contentType }),

  uploadFile: async (file: File): Promise<string> => {
    const { url, key } = await uploadsService.getPresignedUrl(file.name, file.type);

    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!res.ok) {
      throw new Error('Failed to upload file to storage');
    }

    return key;
  },

  getDownloadUrl: (key: string) =>
    apiClient.get<{ url: string }>(`/uploads/${key}`),
};
