import {
  LanguageContext,
  LanguageContextType,
} from "@/context/LanguageContext";
import { useContext } from "react";

export const useLanguage = () => {
  return useContext<LanguageContextType>(LanguageContext);
};
