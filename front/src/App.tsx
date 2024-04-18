import {useRef} from "react";
import {
  discordOAuth,
  discordUnlink,
  logout,
  claimMisskeyLink, unlinkMisskey
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
import UserSearch from "./components/UserSearch.tsx";
import {UserInfo} from "./components/UserInfo.tsx";


function App() {
  const {
    userInfo,
    loginState,
    setLoginState,
    loaded,
    userId,
    loginReq,
    login,
    setUserId,
    username
  } = useAppState()
  const {t} = useTranslation()


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
                ResoAuth
              </Typography>
              <Box sx={{mt: 2, display: "flex", flexDirection: "column", width: "80%", gap: "10px"}}>
                <UserSearch setUserId={setUserId} defaultUserId={userId}/>
                <Button variant={"outlined"} onClick={() => {
                  loginReq(userId)
                }}
                        sx={{
                          background: "linear-gradient(45deg, #d3d15f 20%, #4bc74e 40%, #d86464 60%, #9e55cd 80%, #52b1d4 100%)",
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
                          claimMisskeyLink().then(res => {
                            if (res.success) {
                              location.href = res.url

                            }
                          })
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
                    loginReq(userId)
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
      <CssBaseline/>
      <UserInfo />
    </>
  )
}

export default App
