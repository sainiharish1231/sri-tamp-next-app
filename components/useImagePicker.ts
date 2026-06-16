// hooks/useImagePicker.ts
import { useState } from "react";
import { Alert, Platform, PermissionsAndroid } from "react-native";
import {
  launchCamera,
  launchImageLibrary,
  CameraOptions,
  ImageLibraryOptions,
  Asset,
} from "react-native-image-picker";

interface ImagePickerResult {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

const useImagePicker = () => {
  const [loading, setLoading] = useState(false);

  // Request camera permissions for Android
  const requestCameraPermission = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "App needs camera permission to take photos",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error("Camera permission error:", err);
        return false;
      }
    }
    return true;
  };

  // Request storage permissions for Android
  const requestStoragePermission = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: "Storage Permission",
            message: "App needs storage permission to access photos",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error("Storage permission error:", err);
        return false;
      }
    }
    return true;
  };

  const pickFromGallery = async (
    multiple = true,
  ): Promise<ImagePickerResult[]> => {
    try {
      setLoading(true);

      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert("Permission denied", "Storage permission is required");
        return [];
      }

      const options: ImageLibraryOptions = {
        mediaType: "photo",
        quality: 0.8,
        selectionLimit: multiple ? 10 : 1,
        includeBase64: false,
      };

      return new Promise((resolve) => {
        launchImageLibrary(options, (response) => {
          setLoading(false);

          if (response.didCancel) {
            console.log("User cancelled image picker");
            resolve([]);
          } else if (response.errorCode) {
            console.error("Image picker error:", response.errorMessage);
            Alert.alert("Error", "Failed to pick images");
            resolve([]);
          } else if (response.assets && response.assets.length > 0) {
            const images = response.assets.map(
              (asset: Asset, index: number) => ({
                uri: asset.uri!,
                name: asset.fileName || `image_${Date.now()}_${index}.jpg`,
                type: asset.type || "image/jpeg",
                size: asset.fileSize,
              }),
            );
            resolve(images);
          } else {
            resolve([]);
          }
        });
      });
    } catch (error) {
      setLoading(false);
      console.error("Gallery pick error:", error);
      Alert.alert("Error", "Failed to access gallery");
      return [];
    }
  };

  const takePhoto = async (): Promise<ImagePickerResult[]> => {
    try {
      setLoading(true);

      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert("Permission denied", "Camera permission is required");
        return [];
      }

      const options: CameraOptions = {
        mediaType: "photo",
        quality: 0.8,
        cameraType: "back",
        saveToPhotos: true,
        includeBase64: false,
      };

      return new Promise((resolve) => {
        launchCamera(options, (response) => {
          setLoading(false);

          if (response.didCancel) {
            console.log("User cancelled camera");
            resolve([]);
          } else if (response.errorCode) {
            console.error("Camera error:", response.errorMessage);
            Alert.alert("Error", "Failed to take photo");
            resolve([]);
          } else if (response.assets && response.assets.length > 0) {
            const asset = response.assets[0];
            const image = {
              uri: asset.uri!,
              name: asset.fileName || `camera_${Date.now()}.jpg`,
              type: asset.type || "image/jpeg",
              size: asset.fileSize,
            };
            resolve([image]);
          } else {
            resolve([]);
          }
        });
      });
    } catch (error) {
      setLoading(false);
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to access camera");
      return [];
    }
  };

  const pickImages = async (multiple = true): Promise<ImagePickerResult[]> => {
    return new Promise((resolve) => {
      Alert.alert(
        "Select Image Source",
        "",
        [
          {
            text: "Gallery",
            onPress: async () => {
              const images = await pickFromGallery(multiple);
              resolve(images);
            },
          },
          {
            text: "Camera",
            onPress: async () => {
              const images = await takePhoto();
              resolve(images);
            },
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => resolve([]),
          },
        ],
        { cancelable: true },
      );
    });
  };

  return {
    pickImages,
    pickFromGallery,
    takePhoto,
    loading,
  };
};

export default useImagePicker;
