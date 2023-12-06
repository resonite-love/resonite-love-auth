import {createContext, ReactNode, useContext, useEffect, useMemo, useState} from "react";
import {BasicResponse, claim, discordLink, discordLogin, getUserInfo, login as apiLogin, loginRequest, refresh} from "../api.ts";
import {useTranslation} from "./Translation.tsx";

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

    const {language} = useTranslation()


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
        const code = urlParams.get('code')
        const link = urlParams.get('link')

        if (urlParams.get("userId")) {
            setUserId(urlParams.get("userId") ?? "")
        }
        if (urlParams.get("username")) {
            setUsername(urlParams.get("username") ?? "")
        }

        window.history.replaceState({}, document.title, "/");
        const beforeLink = localStorage.getItem("link")

        if (res.success) {
            setLoginState("loggedIn");
            if (code) {
                const discordLinkRes = await discordLink(code)
                if (discordLinkRes.success) {
                    console.log(discordLinkRes.data)
                    location.reload()
                } else {
                    alert(discordLinkRes.message)
                }
            } else if (link) {
                // todo: handle link
                const claimRes = await claim()
                if (claimRes.success) {
                    const token = claimRes.token

                    const fetchRes = await fetch(link, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    })

                    console.log(await fetchRes.text())

                } else {
                    alert(claimRes.message)
                }
            } else if (beforeLink) {
                localStorage.removeItem("link")

                const claimRes = await claim()
                if (claimRes.success) {
                    const token = claimRes.token

                    const fetchRes = await fetch(beforeLink, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    })

                    console.log(await fetchRes.text())

                } else {
                    alert(claimRes.message)
                }
            }
        } else {
            if (code) {
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
            if (res.success) setLoginState("loggedIn")
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