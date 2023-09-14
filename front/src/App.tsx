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
  discordUnlink
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


  useEffect(() => {
    refresh().then(res => {
      // if query has code
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code')
      window.history.replaceState({}, document.title, "/");
      if (res.success) {
        // ログインしている状態
        setLoginState("loggedIn");
        if (code) {
          discordLink(code).then(res => {
            if (res.success) {
              console.log(res.data)
              // めんどくさいのでリロード
              location.reload()
            }
          })
        }
      } else {
        if(code) {
          discordLogin(code).then(res => {
            if (res.success) {
              console.log(res.data)
              // めんどくさいのでリロード
              location.reload()
            } else {
              alert(res.message)
            }
          })
        }
      }
    }).finally(() => {
      setLoaded(true)
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
      <div>ログインリクエストをNeos経由で送信しました、ワンタイムパスワードを入力してください。</div>
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
        <p>NeosUserId: {userInfo?.neosUserId}</p>
        <p>discordId: {userInfo?.discordId}</p>

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
