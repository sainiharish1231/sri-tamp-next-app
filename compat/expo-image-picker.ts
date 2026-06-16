export const MediaTypeOptions = {
  Images: "Images"
};

export async function requestMediaLibraryPermissionsAsync() {
  return { status: "granted", granted: true };
}

export async function requestCameraPermissionsAsync() {
  return { status: "granted", granted: true };
}

function pickFiles(multiple: boolean) {
  return new Promise<any>((resolve) => {
    if (typeof document === "undefined") {
      resolve({ canceled: true, assets: [] });
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = multiple;
    input.onchange = () => {
      const files = Array.from(input.files || []);
      resolve({
        canceled: files.length === 0,
        assets: files.map((file) => ({
          uri: URL.createObjectURL(file),
          width: 0,
          height: 0,
          fileSize: file.size,
          mimeType: file.type,
          file
        }))
      });
    };
    input.click();
  });
}

export async function launchImageLibraryAsync(options: any = {}) {
  return pickFiles(Boolean(options.allowsMultipleSelection));
}

export async function launchCameraAsync(_options: any = {}) {
  return pickFiles(false);
}
