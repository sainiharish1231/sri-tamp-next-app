import { useState } from "react";

interface ImagePickerResult {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

const useImagePicker = () => {
  const [loading, setLoading] = useState(false);

  const pickFromGallery = async (
    multiple = true,
  ): Promise<ImagePickerResult[]> => {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = multiple;

      input.onchange = async (e: any) => {
        const files = e.target.files as FileList;
        const images: ImagePickerResult[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const reader = new FileReader();

          reader.onload = (event: any) => {
            images.push({
              uri: event.target.result,
              name: file.name,
              type: file.type,
              size: file.size,
            });

            if (i === files.length - 1) {
              resolve(images);
            }
          };

          reader.readAsDataURL(file);
        }

        if (files.length === 0) {
          resolve([]);
        }
      };

      input.click();
    });
  };

  const takePhoto = async (): Promise<ImagePickerResult[]> => {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";

      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) {
          resolve([]);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event: any) => {
          resolve([
            {
              uri: event.target.result,
              name: file.name,
              type: file.type,
              size: file.size,
            },
          ]);
        };
        reader.readAsDataURL(file);
      };

      input.click();
    });
  };

  const pickImages = async (multiple = true): Promise<ImagePickerResult[]> => {
    if (confirm("Pick from gallery or take a photo?\n\nOK = Gallery, Cancel = Camera")) {
      return pickFromGallery(multiple);
    } else {
      return takePhoto();
    }
  };

  return {
    pickImages,
    pickFromGallery,
    takePhoto,
    loading,
  };
};

export default useImagePicker;
