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
    discordUnlink, BasicResponse, claim
} from "./api.ts";
import {Box, Button, Container, CssBaseline, TextField, Typography} from "@mui/material";

type LoginState = "notLoggedIn" | "loginRequested" | "loggedIn"


function App() {
    const [loaded, setLoaded] = useState(false)
    const [loginState, setLoginState] = useState<LoginState>("notLoggedIn")
    const [userInfo, setUserInfo] = useState<any>(null)

    const [userId, setUserId] = useState("")
    const [username, setUsername] = useState("")
    const loginTokenRef = useRef<HTMLInputElement>(null)

    const handleLoginReq = () => {
        if (!userId) return
        loginRequest(userId).then(res => {
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
                alert("ログインしていないので、ログインして処理を続行してください。")
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

    if (!loaded) return (<div>loading...</div>)

    if (loginState === "notLoggedIn") return (
        <>
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
                        Resonite.Love 統合認証 ログイン
                    </Typography>
                    <Box sx={{mt: 1, display: "flex", flexDirection: "column", width: "80%", gap: "10px"}}>

                        <TextField key={"username"} type="text" label="username" id={"username"} disabled={true}
                                   value={username}/>
                        <TextField key={"userId"} type="text" label="UserId" id={"userId"} value={userId} onChange={
                            (e) => {
                                setUserId(e.target.value)
                            }
                        }/>
                        <Button variant={"outlined"} onClick={handleLoginReq}>Resoniteでログイン</Button>
                        <Button variant={"outlined"} sx={{
                            backgroundColor: "#7289DA",
                            color: "white",
                            "&:hover": {
                                backgroundColor: "#586dc4"
                            }
                        }}
                                onClick={() => {
                                    discordOAuth()
                                }}>Discordでログイン</Button>

                    </Box>
                </Box>
            </Container>
        </>
    )

    if (loginState === "loginRequested") return (
        <>
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
                        ログインリクエストをResonite経由で送信しました。<br/>ワンタイムパスワードを入力してください。
                    </Typography>
                    <Box sx={{mt: 1, display: "flex", flexDirection: "column", width: "80%", gap: "10px"}}>
                        <TextField key={"token"} type="text" placeholder="OneTimePassword" id={"token"}
                                   inputRef={loginTokenRef}/>
                        <Button variant={"outlined"} onClick={handleLogin}>ログイン</Button>
                    </Box>
                </Box>
            </Container>
        </>
    )

    return (
        <>
            <Container component='main' maxWidth='xs'>
                <Typography component='h1' variant='h5'>
                    ログインしてます
                </Typography>
                {userInfo && (<>
                    {/*<p>id: {userInfo?.id}</p>*/}
                    {/*<p>createdAt: {(new Date(userInfo.createdAt)).toLocaleString()}</p>*/}
                    <p>ResoniteUserId: {userInfo?.resoniteUserId}</p>
                    <p>discordId: {userInfo?.discordId ?? "未連携"}</p>

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
                        }>Discord連携を解除
                        </Button>
                    </>) : (<>
                        <Button variant={"outlined"} onClick={() => {
                            discordOAuth()
                        }}>Discord連携する
                        </Button>
                    </>)}

                </>)}
                <Button variant={"outlined"} onClick={() => {
                    logout().then(res => {
                        if (res.success) setLoginState("notLoggedIn")
                    })
                }}>ログアウト
                </Button>
            </Container>
        </>
    )
}

export default App
