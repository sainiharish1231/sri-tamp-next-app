
GoogleSignin.configure({
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  offlineAccess: true,
  webClientId:
    "309057291290-quh8ac1vqf6fn5hpi9k295fk9afdockj.apps.googleusercontent.com",
  forceCodeForRefreshToken: true,
});
export const signIn = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo: any = await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();
    if (!userInfo || !userInfo.data || !userInfo.data.user || !tokens) {
      console.log("Sign in cancelled or blocked:", userInfo);
      return null;
    }

    const dataToSave = {
      name: userInfo?.data?.user?.name,
      email: userInfo?.data?.user?.email,
      profile: userInfo?.data?.user?.photo,
      accessToken: tokens.accessToken,
    };
    await AsyncStorage.setItem("authData", JSON.stringify(dataToSave));

    console.log("User Info saved:", dataToSave);
    return dataToSave;
  } catch (error) {
    console.error(error);
  }
};
