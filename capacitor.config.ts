import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = 'https://gracelessly-unresonating-milania.ngrok-free.dev';

const config: CapacitorConfig = {
  appId: 'com.spendwisely.app',
  appName: 'SpendWisely',
  webDir: 'dist/public',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: true,
        },
      }
    : {}),
};

export default config;
