import {createContext, ReactNode, useContext, useEffect, useMemo, useState} from "react";
import {Language} from "../components/LanguageButton.tsx";
import {usePersistent} from "../usePersistent.ts";

export interface ITranslationState {
    language: Language;
    setLanguage: (language: Language) => void;
    t: any
}


export interface ITranslationProps {
    children: ReactNode;
}

const TranslationContext = createContext<ITranslationState | undefined>(undefined);

export const TranslationProvider = ({children}: ITranslationProps) => {
    const [language, setLanguage] = usePersistent<Language>("lang", "ja")

    const [t, setT] = useState({})

    useEffect(() => {
        switch (language) {
            case "ja":
                setT({
                    loginViaResonite: "Resoniteでログイン・登録",
                    userPlaceholder: "Resoniteユーザを選択",
                    externalLoginLabel: "外部ログイン",
                    externalLoginDesc: "外部ログインはResoniteアカウントと連携した後に使えます",
                    loginViaDiscord: "Discordでログイン",
                    loginViaResoniteLove: "resonite.loveでログイン",
                    sentCode: "Resoniteにログインリクエストを送信しました。ワンタイムパスワードを入力してください。",
                    resendCode: "コードを再送信",
                    login: "ログイン",
                    loggedIn: "ログインしてます",
                    logout: "ログアウト",
                    linkDiscord: "Discord連携",
                    unlinkDiscord: "Discord連携を解除",
                    linkMisskey: "misskey.resonite.love連携",
                    unlinkMisskey: "misskey.resonite.love連携を解除",
                })
                break
            case "en":
                setT({
                    loginViaResonite: "Login/Register with Resonite",
                    userPlaceholder: "Select a Resonite user",
                    externalLoginLabel: "External Login",
                    externalLoginDesc: "External login is available after linking with Resonite account",
                    loginViaDiscord: "Login with Discord",
                    loginViaResoniteLove: "Login with resonite.love",
                    sentCode: "Login request sent. Please enter the one-time password.",
                    resendCode: "Resend code",
                    login: "Login",
                    loggedIn: "Logged in",
                    logout: "Logout",
                    linkDiscord: "Link Discord",
                    unlinkDiscord: "Unlink Discord",
                    linkMisskey: "Link misskey.resonite.love",
                    unlinkMisskey: "Unlink misskey.resonite.love",
                })
                break
            case "ko":
                setT({
                    loginViaResonite: "Resonite로 로그인/등록",
                    userPlaceholder: "Resonite 사용자 선택",
                    externalLoginLabel: "외부 로그인",
                    externalLoginDesc: "외부 로그인은 Resonite 계정과 연결한 후 사용할 수 있습니다",
                    loginViaDiscord: "Discord로 로그인",
                    loginViaResoniteLove: "resonite.love로 로그인",
                    sentCode: "로그인 요청을 보냈습니다. 일회용 패스워드를 입력해주세요.",
                    resendCode: "코드를 다시 보내기",
                    login: "로그인",
                    loggedIn: "로그인되었습니다",
                    logout: "로그아웃",
                    linkDiscord: "Discord 연결",
                    unlinkDiscord: "Discord 연결 해제",
                    linkMisskey: "misskey.resonite.love 연결",
                    unlinkMisskey: "misskey.resonite.love 연결 해제",
                })
                break
        }
    }, [language]);

    const value = useMemo(() => {
        return {
            language,
            setLanguage,
            t
        }
    }, [language, setLanguage, t]);

    return (
        <TranslationContext.Provider value={value}>
            {children}
        </TranslationContext.Provider>
    )
}

export const useTranslation = () => {
    const context = useContext(TranslationContext)
    if (context === undefined) {
        throw new Error('useTranslation must be used within a TranslationProvider')
    }
    return context
}