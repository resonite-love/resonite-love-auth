import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Container,
  Grid,
  Typography
} from "@mui/material";
import {useAppState} from "../contexts/Application.tsx";
import {claimMisskeyLink, discordOAuth, discordUnlink, getResoniteUserByUserId, logout, unlinkMisskey} from "../api.ts";
import {useEffect, useState} from "react";
import {parseResDB, ResoniteUser} from "../lib/share.ts";
import {useTranslation} from "../contexts/Translation.tsx";

const calcDateDiff = (date: Date) => {
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days}`
}


export const UserInfo = () => {
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

  const [resontieUserInfo, setResontieUserInfo] = useState<ResoniteUser | null>(null)

  useEffect(() => {
    console.log(userInfo)
    if (userInfo?.resoniteUserId) {

      getResoniteUserByUserId(userInfo.resoniteUserId).then((res) => {
        setResontieUserInfo(res)
      })
    }
  }, [userInfo])

  if(!resontieUserInfo) return (<div>loading...</div>)

  return (
    <Container component='main' sx={{paddingTop: 2}}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{display: "flex", flexDirection:"column", gap: 2}}>
                <Box sx={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1}}>
                  <Avatar sx={{
                    width: 100,
                    height: 100,
                  }} alt={resontieUserInfo?.username} src={parseResDB(resontieUserInfo?.profile.iconUrl)}/>

                  <Box>
                    <Typography variant='h4'>{resontieUserInfo?.username}</Typography>
                    <Typography variant='body1'>{resontieUserInfo?.id}</Typography>
                  </Box>
                </Box>
                <Box sx={{padding: "0 1rem"}}>
                  <Typography variant='caption'>Resonite {t.registeredDate}</Typography>
                  <Typography variant='body1'>{(new Date(resontieUserInfo?.registrationDate)).toLocaleString()} ({calcDateDiff(new Date(resontieUserInfo?.registrationDate))}) {t.daysAgo}</Typography>
                  {resontieUserInfo?.migratedData && (
                    <>
                      <Typography variant='caption'>NeosVR {t.registeredDate}</Typography>
                      <Typography variant='body1'>{(new Date(resontieUserInfo?.migratedData.registrationDate)).toLocaleString()} ({calcDateDiff(new Date(resontieUserInfo?.migratedData.registrationDate))}) {t.daysAgo}</Typography>
                    </>)
                  }
                </Box>
              </Box>
            </CardContent>
            <CardActions>
              <Button variant={"outlined"} sx={{backgroundColor: "white"}} onClick={() => {
                logout().then(res => {
                  if (res.success) setLoginState("notLoggedIn")
                })
              }}>
                {t.logout}
              </Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={8}>
            <Card>
              <CardContent>
                <Typography variant='h5'>{t.linkSettings}</Typography>
                <Box sx={{display: "flex", gap: 1}}>
                  <Card sx={{backgroundColor: "#7289da", minWidth: 300}}>
                    <CardContent>
                      <Box sx={{display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2}}>
                        <img src={"/discord-logo-white.png"} alt="Discord" style={{height: "24px", width: "auto"}}/>

                        {userInfo?.discordId ? (
                          <>
                            <Typography variant='body1' color={"white"}>Discord {t.linked}</Typography>
                            <Button variant={"outlined"} sx={{backgroundColor: "white"}}  onClick={
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
                          <Typography variant='body1' color={"white"}>Discord {t.noLinked}</Typography>
                          <Button variant={"outlined"} sx={{backgroundColor: "white"}} onClick={() => {
                            discordOAuth()
                          }}>{t.linkDiscord}
                          </Button>
                        </>)}
                      </Box>
                    </CardContent>
                  </Card>
                  <Card sx={{backgroundColor: "#52bc2b", minWidth: 300}}>
                    <CardHeader title={"Misskey"} sx={{color: "white"}}/>
                    <CardContent>
                      <Box sx={{display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2}}>

                        {userInfo?.misskeyId ? (<>
                          <Typography variant='body1' color={"white"}>Misskey {t.linked}</Typography>
                          <Button variant={"outlined"} sx={{backgroundColor: "white"}} onClick={() => {
                            unlinkMisskey().then(res => {
                              if (res.success) {
                                location.reload()
                              }
                            })
                          }}>
                            {t.unlinkMisskey}
                          </Button>
                        </>) : (<>
                          <Typography variant='body1' color={"white"}>Misskey {t.noLinked}</Typography>
                          <Button variant={"outlined"} sx={{backgroundColor: "white"}} onClick={() => {
                            claimMisskeyLink().then(res => {
                              if (res.success) {
                                location.href = res.url
                              }
                            })
                          }}>
                            {t.linkMisskey}
                          </Button>
                        </>)}
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </CardContent>
            </Card>
        </Grid>
      </Grid>

    </Container>
  )
}