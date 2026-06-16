declare module "@env" {
  export const CLOUDINARY_CLOUD_NAME: string;
  export const CLOUDINARY_UPLOAD_PRESET: string;
}

declare module "@react-native-google-signin/google-signin" {
  export const GoogleSignin: {
    configure: (options: Record<string, unknown>) => void;
    hasPlayServices: () => Promise<boolean>;
    signIn: () => Promise<unknown>;
    getTokens: () => Promise<{ accessToken: string }>;
  };
}
