import {createContext, ReactNode, useContext, useEffect, useMemo, useState} from "react";
import {
    BasicResponse,
    claim,
    discordLink,
    discordLogin,
    getUserInfo,
    linkMisskey,
    login as apiLogin,
    loginRequest, loginWithMisskey,
    refresh
} from "../api.ts";
import {useTranslation} from "./Translation.tsx";
import {Language} from "../components/LanguageButton.tsx";

export type LoginState = "notLoggedIn" | "loginRequested" | "loggedIn"


export interface IAppState {
    version: string;
    loginState: LoginState;
    setLoginState: (state: LoginState) => void;
    userInfo: any;

    userId: string;
    username: string;
    loaded: boolean;

    loginReq: (userId: string) => void;
    login: (loginToken: string) => void;
}

export interface IAppProps {
    children: ReactNode;
}

const AppStateContext = createContext<IAppState | undefined>(undefined);


export const AppStateProvider = ({children}: IAppProps) => {
    const [loginState, setLoginState] = useState<LoginState>("notLoggedIn")
    const [userInfo, setUserInfo] = useState<any>(null)
    const [userId, setUserId] = useState("")
    const [username, setUsername] = useState("")
    const [loaded, setLoaded] = useState(false)

    const {language, setLanguage} = useTranslation()


    useEffect(() => {
        switch (loginState) {
            case "notLoggedIn":
                setUserInfo(null)
                break
            case "loggedIn":
                getUserInfo().then(res => {
                    if (res.success) setUserInfo(res.data)
                })
                break
            default:
                break
        }
    }, [loginState]);


    const handleLoad = async (res: BasicResponse) => {
        const urlParams = new URLSearchParams(window.location.search);
        console.log(urlParams)
        const code = urlParams.get('code')
        const iss = urlParams.get('iss')
        const link = urlParams.get('link')
        const linkType = urlParams.get('linkType')
        const lang = urlParams.get('lang')
        if (lang) {
            // set lang 2 chars
            const langStr = lang.substring(0, 2)
            setLanguage(langStr as Language)
        }

        if (urlParams.get("userId")) {
            setUserId(urlParams.get("userId") ?? "")
        }
        if (urlParams.get("username")) {
            setUsername(urlParams.get("username") ?? "")
        }

        window.history.replaceState({}, document.title, "/");
        const beforeLink = localStorage.getItem("link")
        const beforeLinkType = localStorage.getItem("linkType")

        if (res.success) {
            setLoginState("loggedIn");
            if (code) {
                if (iss?.includes("misskey")) {
                    linkMisskey(code).then(res => {
                        if (res.success) {
                            location.reload()
                        } else {
                            alert(res.message)
                        }

                    })
                    return
                }
                const discordLinkRes = await discordLink(code)
                if (discordLinkRes.success) {
                    console.log(discordLinkRes.data)
                    location.reload()
                } else {
                    alert(discordLinkRes.message)
                }
            } else if (link) {
                // ログインした状態でリンクを処理
                // todo: handle link
                const claimRes = await claim(link)

                if (claimRes.success) {
                    const token = claimRes.token

                    switch (linkType) {
                        case "GET":
                            await fetch(link, {
                                method: "GET",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${token}`
                                }
                            })
                            break
                        case "POST":
                            await fetch(link, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${token}`
                                }
                            })
                            break
                        case "REDIRECT":
                            window.location.href = `${link}?RLToken=${token}`
                            break
                        default:
                            await fetch(link, {
                                method: "GET",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${token}`
                                }
                            })
                            break
                    }


                } else {
                    alert(claimRes.message)
                }
            } else if (beforeLink) {
                // ログインした(いま)状態で、前回のリンクを処理
                localStorage.removeItem("link")
                localStorage.removeItem("linkType")

                const claimRes = await claim(beforeLink)
                if (claimRes.success) {
                    const token = claimRes.token

                    switch (beforeLinkType) {
                        case "GET":
                            await fetch(beforeLink, {
                                method: "GET",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${token}`
                                }
                            })
                            break
                        case "POST":
                            await fetch(beforeLink, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${token}`
                                }
                            })
                            break
                        case "REDIRECT":
                            window.location.href = `${beforeLink}?RLToken=${token}`
                            break
                        default:
                            await fetch(beforeLink, {
                                method: "GET",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${token}`
                                }
                            })
                            break
                    }

                } else {
                    alert(claimRes.message)
                }
            }
        } else {
            if (code) {
                if (iss?.includes("misskey")) {
                    loginWithMisskey(code).then(res => {
                        if (res.success) {
                            location.reload()
                        } else {
                            alert(res.message)
                        }

                    })
                    return
                }
                const discordLoginRes = await discordLogin(code)
                if (discordLoginRes.success) {
                    console.log(discordLoginRes.data)
                    location.reload()
                } else {
                    alert(discordLoginRes.message)
                }
            }

            if (link) {
                // alert("ログインしていないので、ログインして処理を続行してください。")
                localStorage.setItem("link", link)
                localStorage.setItem("linkType", linkType ?? "GET")
            }
        }
        setLoaded(true)
    }


    useEffect(() => {
        refresh().then(res => {
            // if query has code
            handleLoad(res)
        })
    }, []);

    const loginReq = (userId: string) => {
        console.log("loginReq", userId)
        loginRequest(userId, language).then(res => {
            if (res.success) setLoginState("loginRequested")
        })
    }

    const login = (loginToken: string) => {
        setLoginState("loggedIn")
        apiLogin(loginToken).then(res => {
            if (res.success) {
                setLoginState("loggedIn")
                const beforeLink = localStorage.getItem("link")
                console.log("beforeLink", beforeLink)
                location.reload()
            }
        })
    }

    const value = useMemo(() => {
        return {
            version: "0.0.1",
            loginState,
            setLoginState,
            userInfo,
            userId,
            username,
            loaded,
            loginReq,
            login
        }
    }, [loginState, userInfo, userId, username, loaded]);

    return (
        <AppStateContext.Provider value={value}>
            {children}
        </AppStateContext.Provider>
    )
}

export const useAppState = () => {
    const context = useContext(AppStateContext)
    if (context === undefined) {
        throw new Error('useAppState must be used within a AppStateProvider')
    }
    return context
}