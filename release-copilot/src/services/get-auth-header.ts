import { useAuthStore } from '@/store/auth-store.ts';

export const getAuthHeader = (): Record<string, string> => {
  const accessToken = useAuthStore.getState().session?.accessToken;

  return accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {
        Authorization: `Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6IjM1MTg1OGI5LTI4NGUtNDEwMi04ZDU4LWVmYzg2NjY2ZDM5MSIsInR5cCI6IkpXVCJ9`,
      };
};
