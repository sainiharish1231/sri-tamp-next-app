import { deleteObject, ref } from "firebase/storage";
import { storage } from "@/lib/firebase";

export const deleteMediaByUrls = async (urls: string[]) => {
  await Promise.all(
    urls.map((u) => deleteObject(ref(storage, u)).catch(() => {})),
  );
};
