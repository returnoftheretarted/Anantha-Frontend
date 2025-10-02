import type { ApiResponse } from '@/types';

export const fetchData = async (
  query: string,
  tab: string,
  language: string,
  imageData?: string   // make optional
): Promise<ApiResponse> => {
  const res = await fetch('https://anantha-kwml.onrender.com/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tab,
      query,
      language,
      imageData: imageData ?? null   // send null if undefined
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
};