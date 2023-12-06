import {useEffect, useRef, useState} from "react";
import {
    BasicResponse,
    claim,
    discordLink,
    discordLogin,
    discordOAuth,
    discordUnlink,
    login,
    loginRequest,
    logout,
    refresh,
    resoniteAuth
} from "./api.ts";
import {
    Box,
    Button,
    Chip,
    Container,
    CssBaseline,
    Divider,
    Paper,
    TextField,
    Typography
} from "@mui/material";
import {useTranslation} from "./contexts/Translation.tsx";
import {Header} from "./components/Header.tsx";
import {useAppState} from "./contexts/Application.tsx";


function App() {
    const {
        userInfo,
        loginState,
        setLoginState,
        loaded,
        loginReq,
        login,
        username
    } = useAppState()
    const {t} = useTranslation()


    const userIdRef = useRef<HTMLInputElement>(null)
    const loginTokenRef = useRef<HTMLInputElement>(null)

    if (!loaded) return (<div>loading...</div>)

    if (loginState === "notLoggedIn" || loginState === "loginRequested") return (
        <div style={{height: "100vh", backgroundSize: "cover", backgroundColor: "rgba(0,0,0,0.7)"}}>
            <video autoPlay muted loop style={{
                position: "fixed",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "translate(-50%, -50%)",
                zIndex: -1,
                left: "50%",
                top: "50%"
            }}>
                <source src={"/bg.webm"} type="video/webm"/>
            </video>
            <Header/>
            <Container component='main' maxWidth='xs'
                       sx={{
                           display: "flex",
                           justifyContent: "center",
                           height: "calc(100vh - 48px)",
                           alignItems: "center"
                       }}>
                <Paper sx={{padding: "40px 20px", backgroundColor: "rgba(255,255,255,0.8)"}}>
                    <CssBaseline/>
                    {loginState === "notLoggedIn" && (<>
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
                                <TextField key={"userId"} type="text" label="UserId" id={"userId"}
                                           inputRef={userIdRef}/>
                                <Button variant={"outlined"} onClick={() => {
                                    loginReq(userIdRef.current?.value ?? "")
                                }}
                                        sx={{
                                            background: "linear-gradient(45deg, #f9f770 20%, #59eb5c 40%, #ff7676 60%, #ba64f2 80%, #61d1fa 100%)",
                                            color: "white",
                                            border: 0,
                                            "&:hover": {
                                                border: 0
                                            }
                                        }}
                                >{t.loginViaResonite}</Button>

                                <Divider sx={{paddingTop: "1em", paddingBottom: "1em"}}>
                                    <Chip label={t.externalLoginLabel}/>
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
                    </>)
                    }
                    {
                        loginState === "loginRequested" && (<>
                            <Box
                                sx={{
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
                                    <Button variant={"outlined"} onClick={() => {
                                        loginReq(userIdRef.current?.value ?? "")
                                    }}>{t.resendCode}</Button>
                                    <Button variant={"outlined"} onClick={() => {
                                        login(loginTokenRef.current?.value ?? "")
                                    }}>{t.login}</Button>
                                </Box>
                            </Box>
                        </>)
                    }
                </Paper>
            </Container>
        </div>
    )

    return (
        <>
            <Header/>
            <Container component='main' maxWidth='xs'>
                <Typography component='h1' variant='h5'>
                    {t.loggedIn}
                </Typography>
                {userInfo && (<>
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
