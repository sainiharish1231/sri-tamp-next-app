export type Asset = any;
export type CameraOptions = any;
export type ImageLibraryOptions = any;

function launchPicker(options: any, callback: (response: any) => void) {
  if (typeof document === "undefined") {
    callback({ didCancel: true, assets: [] });
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = (options?.selectionLimit || 1) > 1;
  input.onchange = () => {
    const files = Array.from(input.files || []);
    callback({
      didCancel: files.length === 0,
      assets: files.map((file) => ({
        uri: URL.createObjectURL(file),
        fileName: file.name,
        type: file.type,
        fileSize: file.size
      }))
    });
  };
  input.click();
}

export function launchImageLibrary(options: ImageLibraryOptions, callback: (response: any) => void) {
  launchPicker(options, callback);
}

export function launchCamera(options: CameraOptions, callback: (response: any) => void) {
  launchPicker(options, callback);
}
