import { RGSClient } from 'stake-engine';

export const rgs = RGSClient({
  url: window.location.href, // RGS reads auth/session data from the URL
});

