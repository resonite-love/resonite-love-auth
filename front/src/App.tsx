import {useEffect, useRef, useState} from "react";
import {
    discordOAuth,
    discordLink,
    getUserInfo,
    login,
    loginRequest,
    logout,
    refresh,
    discordLogin,
    discordUnlink, BasicResponse, claim, resoniteAuth
} from "./api.ts";
import {
    AppBar,
    Box,
    Button,
    Chip,
    Container,
    CssBaseline,
    Divider, FormControl, InputLabel, MenuItem, Paper, Select,
    TextField,
    Toolbar,
    Typography
} from "@mui/material";
import {usePersistent} from "./usePersistent.ts";

type LoginState = "notLoggedIn" | "loginRequested" | "loggedIn"


function App() {
    const [loaded, setLoaded] = useState(false)
    const [loginState, setLoginState] = useState<LoginState>("notLoggedIn")
    const [userInfo, setUserInfo] = useState<any>(null)

    const [userId, setUserId] = useState("")
    const [username, setUsername] = useState("")
    const loginTokenRef = useRef<HTMLInputElement>(null)

    const [lang, setLang] = usePersistent<"ja" | "en" | "ko">("lang", "ja")
    const [t, setT] = useState<any>({})

    const handleLoginReq = () => {
        if (!userId) return
        loginRequest(userId, lang).then(res => {
            if (res.success) setLoginState("loginRequested")
        })
    }

    const resendCode = () => {
        if (!userId) return
        loginRequest(userId, lang).then(res => {
            if (res.success) setLoginState("loginRequested")
        })
    }

    const handleLogin = () => {
        const loginToken = loginTokenRef.current?.value
        if (!loginToken) return
        login(loginToken).then(res => {
            if (res.success) setLoginState("loggedIn")
        })
    }
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


    useEffect(() => {
        switch (lang) {
            case "ja":
                setT({
                    loginViaResonite: "Resoniteでログイン・登録",
                    externalLoginLabel: "外部ログイン",
                    externalLoginDesc: "外部ログインはResoniteアカウントと連携した後に使えます",
                    loginViaDiscord: "Discordでログイン",
                    loginViaResoniteLove: "resonite.loveでログイン",
                    sentCode: "ログインリクエストを送信しました。ワンタイムパスワードを入力してください。",
                    resendCode: "コードを再送信",
                    login: "ログイン",
                    loggedIn: "ログインしてます",
                    logout: "ログアウト",
                    linkDiscord: "Discord連携",
                    unlinkDiscord: "Discord連携を解除",

                })
                break
            case "en":
                setT({
                    loginViaResonite: "Login/Register with Resonite",
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
                })
                break
            case "ko":
                setT({
                    loginViaResonite: "Resonite로 로그인/등록",
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
                })
                break
        }
    }, [lang]);




    if (!loaded) return (<div>loading...</div>)

    if (loginState === "notLoggedIn") return (
        <>
            <AppBar position="static" color={"inherit"} elevation={1}>
                <Toolbar variant="dense">
                    <Typography variant="h6" color="inherit" component="div" sx={{ flexGrow: 1 }}>
                        Resonite.Love
                    </Typography>
                    <FormControl sx={{width: 200}} size={"small"}>
                        <InputLabel id="demo-simple-select-label">Language</InputLabel>
                        <Select
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            label="Language"
                            value={lang}
                            onChange={(e) => {
                                setLang(e.target.value as "ja" | "en" | "ko")
                            }}
                        >
                            <MenuItem value={"ja"}>Japanese</MenuItem>
                            <MenuItem value={"en"}>English</MenuItem>
                            <MenuItem value={"ko"}>Korean</MenuItem>
                        </Select>
                    </FormControl>
                </Toolbar>
            </AppBar>
            <Container component='main' maxWidth='xs'>
                <Paper sx={{padding: "40px 20px", marginTop: "60px"}}>
                    <CssBaseline/>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        <Typography component='h1' variant='h5'>
                            R.L Auth
                        </Typography>
                        <Box sx={{mt: 1, display: "flex", flexDirection: "column", width: "80%", gap: "10px"}}>

                            <TextField key={"username"} type="text" label="username" id={"username"} disabled={true}
                                       value={username}/>
                            <TextField key={"userId"} type="text" label="UserId" id={"userId"} value={userId} onChange={
                                (e) => {
                                    setUserId(e.target.value)
                                }
                            }/>
                            <Button variant={"outlined"} onClick={handleLoginReq}
                                    sx={{
                                        background: "linear-gradient(45deg, #f9f770 20%, #59eb5c 40%, #ff7676 60%, #ba64f2 80%, #61d1fa 100%)",
                                        border: 0,
                                        color: "white",
                                    }}
                            >{t.loginViaResonite}</Button>

                            <Divider sx={{paddingTop: "1em", paddingBottom: "1em"}}>
                                <Chip label={t.externalLoginLabel} />
                            </Divider>
                            <small>{t.externalLoginDesc}</small>
                            <Button variant={"outlined"} sx={{
                                backgroundColor: "#7289DA",
                                color: "white",
                                "&:hover": {
                                    backgroundColor: "#586dc4"
                                }
                            }}
                                    onClick={() => {
                                        discordOAuth()
                                    }}>{t.loginViaDiscord}</Button>
                            <Button variant={"outlined"} sx={{
                                backgroundColor: "#86b300",
                                color: "white",
                                "&:hover": {
                                    backgroundColor: "#5b7600"
                                }
                            }}
                                    onClick={() => {
                                        resoniteAuth()
                                    }}>{t.loginViaResoniteLove}</Button>

                        </Box>
                    </Box>
                </Paper>
            </Container>
        </>
    )

    if (loginState === "loginRequested") return (
        <>
            <AppBar position="static" color={"inherit"} elevation={1}>
                <Toolbar variant="dense">
                    <Typography variant="h6" color="inherit" component="div" sx={{ flexGrow: 1 }}>
                        Resonite.Love
                    </Typography>
                    <FormControl sx={{width: 200}} size={"small"}>
                        <InputLabel id="demo-simple-select-label">Language</InputLabel>
                        <Select
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            label="Language"
                            value={lang}
                            onChange={(e) => {
                                setLang(e.target.value as "ja" | "en" | "ko")
                            }}
                        >
                            <MenuItem value={"ja"}>Japanese</MenuItem>
                            <MenuItem value={"en"}>English</MenuItem>
                            <MenuItem value={"ko"}>Korean</MenuItem>
                        </Select>
                    </FormControl>
                </Toolbar>
            </AppBar>
            <Container component='main' maxWidth='xs'>
                <CssBaseline/>
                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <Typography component='h1' variant='h5'>
                        {t.sentCode}
                    </Typography>
                    <Box sx={{mt: 1, display: "flex", flexDirection: "column", width: "80%", gap: "10px"}}>
                        <TextField key={"token"} type="text" placeholder="OneTimePassword" id={"token"}
                                   inputRef={loginTokenRef}/>
                        <Button variant={"outlined"} onClick={resendCode}>{t.resendCode}</Button>
                        <Button variant={"outlined"} onClick={handleLogin}>{t.login}</Button>
                    </Box>
                </Box>
            </Container>
        </>
    )

    return (
        <>
            <AppBar position="static" color={"inherit"} elevation={1}>
                <Toolbar variant="dense">
                    <Typography variant="h6" color="inherit" component="div" sx={{ flexGrow: 1 }}>
                        Resonite.Love
                    </Typography>
                    <FormControl sx={{width: 200}} size={"small"}>
                        <InputLabel id="demo-simple-select-label">Language</InputLabel>
                        <Select
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            label="Language"
                            value={lang}
                            onChange={(e) => {
                                setLang(e.target.value as "ja" | "en" | "ko")
                            }}
                        >
                            <MenuItem value={"ja"}>Japanese</MenuItem>
                            <MenuItem value={"en"}>English</MenuItem>
                            <MenuItem value={"ko"}>Korean</MenuItem>
                        </Select>
                    </FormControl>
                </Toolbar>
            </AppBar>
            <Container component='main' maxWidth='xs'>
                <Typography component='h1' variant='h5'>
                    {t.loggedIn}
                </Typography>
                {userInfo && (<>
                    {/*<p>id: {userInfo?.id}</p>*/}
                    {/*<p>createdAt: {(new Date(userInfo.createdAt)).toLocaleString()}</p>*/}
                    <p>ResoniteUserId: {userInfo?.resoniteUserId}</p>
                    <p>discordId: {userInfo?.discordId ?? "not connected"}</p>

                    {userInfo?.discordId ? (<>
                        <Button variant={"outlined"} onClick={
                            () => {
                                discordUnlink().then(res => {
                                    if (res.success) {
                                        console.log(res.data)
                                        // めんどくさいのでリロード
                                        location.reload()
                                    } else {
                                        alert(res.message)
                                        location.reload()
                                    }
                                })
                            }
                        }>{t.unlinkDiscord}
                        </Button>
                    </>) : (<>
                        <Button variant={"outlined"} onClick={() => {
                            discordOAuth()
                        }}>{t.linkDiscord}
                        </Button>
                    </>)}

                </>)}
                <Button variant={"outlined"} onClick={() => {
                    logout().then(res => {
                        if (res.success) setLoginState("notLoggedIn")
                    })
                }}>{t.logout}
                </Button>
            </Container>
        </>
    )
}

export default App
