import {Chip, Stack} from "@mui/material";

export type Language = "ja" | "en" | "ko";

export type LanguageButtonProps = {
    language: Language;
    setLanguage: (language: Language) => void;
}


export const LanguageButton = ({language, setLanguage}: LanguageButtonProps) => {
  return (
      <Stack direction="row" spacing={0.3}>
          <Chip onClick={() => setLanguage("ja")} label={"JA"} clickable
                color={language === "ja" ? "primary" : "default"}/>
          <Chip onClick={() => setLanguage("en")} label={"EN"} clickable
                color={language === "en" ? "primary" : "default"}/>
          <Chip onClick={() => setLanguage("ko")} label={"KO"} clickable
                color={language === "ko" ? "primary" : "default"}/>
      </Stack>
  )
}