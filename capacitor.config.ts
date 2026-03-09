import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drshoezclean.app',
  appName: 'Dr.ShoezClean',
  webDir: 'dist',
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK',
    }
  },
  plugins: {
    CapacitorThermalPrinter: {
      // Plugin config if needed
    }
  }
};

export default config;
