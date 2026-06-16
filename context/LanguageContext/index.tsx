import { languages, languagesData } from "./languages";
import { storage } from "@/utils/storage";

export interface LanguageContextType {
  t: (
    key: string,
    arg?: Record<string, LinearData> | LinearData | undefined,
    ...args: LinearData[]
  ) => string;
  languages: string[];
  currentLanguage: string;
  changeLanguage: (language: "hindi" | "english") => Promise<void>;
}

interface LanguageProviderProps {
  children: ReactNode | ReactNode[];
}

type LinearData = string | number | boolean;

type LanguageData = Record<string, string | undefined>;

export const LanguageContext = createContext<LanguageContextType>({
  t: (k: string) => k,
  languages: [],
  currentLanguage: "",
  changeLanguage: async () => {},
});

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [currentLanguage, setCurrentLanguage] = useState(languages[0]);
  const [languageData, setLanguageData] = useState<LanguageData>({});

  const changeLanguage = async (language: "hindi" | "english") => {
    let languageData = languagesData[language];
    if (!languageData) {
      console.log("Unable to load the language data properly.");
      language = languages[0] as "english";
      languageData = languagesData[language];
    }

    setCurrentLanguage(language);
    setLanguageData(languageData);

    await storage.setLanguage({
      language,
      data: languageData,
    });
  };

  useEffect(() => {
    (async () => {
      const lang = await storage.getLanguage();

      if (lang) {
        setCurrentLanguage(lang.language);
        setLanguageData(lang.data);
      } else {
        await changeLanguage(languages[0] as "english");
      }
    })();
  }, []);

  const t = (
    key: string,
    arg?: Record<string, LinearData> | LinearData | undefined,
    ...args: LinearData[]
  ) => {
    let translagedString = languageData[key];

    if (!translagedString) return key;

    let dynamicData: LinearData[] | Record<string, LinearData>;

    if (typeof arg === "object") {
      dynamicData = arg;
    } else if (arg !== undefined) {
      dynamicData = [arg, ...args];
    } else {
      dynamicData = {};
    }
    for (let k in dynamicData) {
      const v = (dynamicData as Record<string, LinearData>)[k];
      translagedString = translagedString.replace(`{${k}}`, v as string);
    }

    return translagedString;
  };

  const value = { t, languages, currentLanguage, changeLanguage };
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
