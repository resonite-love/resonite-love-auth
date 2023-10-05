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

type LoginState = "notLoggedIn" | "loginRequested" | "loggedIn"

function App() {
  const [loaded, setLoaded] = useState(false)
  const [loginState, setLoginState] = useState<LoginState>("notLoggedIn")
  const [userInfo, setUserInfo] = useState<any>(null)

  const userIdRef = useRef<HTMLInputElement>(null)
  const loginTokenRef = useRef<HTMLInputElement>(null)

  const handleLoginReq = () => {
    const userId = userIdRef.current?.value
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
    window.history.replaceState({}, document.title, "/");

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
      }
    } else {
      if(code) {
        const discordLoginRes = await discordLogin(code)
        if (discordLoginRes.success) {
          console.log(discordLoginRes.data)
          location.reload()
        } else {
          alert(discordLoginRes.message)
        }
      }

      if(link) {
        alert("ログインしていません。ログインしてからリクエストしてください。")
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
      <div>ログインしてください</div>
      <input key={"userId"} type="text" placeholder="UserId" id={"userId"} ref={userIdRef}/>
      <button onClick={handleLoginReq}>ログイン</button>
      <button onClick={() => {discordOAuth()}}>Discordログイン</button>
    </>
  )

  if (loginState === "loginRequested") return (
    <>
      <div>ログインリクエストをResonite経由で送信しました、ワンタイムパスワードを入力してください。</div>
      <input key={"token"} type="text" placeholder="OneTimePassword" id={"token"} ref={loginTokenRef}/>
      <button onClick={handleLogin}>ログイン</button>
    </>
  )

  return (
    <>
      <div>ログインしてます</div>
      {userInfo && (<>
        <p>id: {userInfo?.id}</p>
        <p>createdAt: {(new Date(userInfo.createdAt)).toLocaleString()}</p>
        <p>ResoniteUserId: {userInfo?.resoniteUserId}</p>
        <p>discordId: {userInfo?.discordId ?? "未連携"}</p>

        {userInfo?.discordId ? (<>
          <button onClick={
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
          }>Discord連携を解除</button>
        </>) : (<>
          <button onClick={() => {
            discordOAuth()
          }}>Discord連携する
          </button>
        </>)}

      </>)}
      <button onClick={() => {
        logout().then(res => {
          if (res.success) setLoginState("notLoggedIn")
        })
      }}>ログアウト
      </button>
    </>
  )
}

export default App
