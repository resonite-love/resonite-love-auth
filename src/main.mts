import express, {Request} from 'express';
import cookieParser from 'cookie-parser';
import {PrismaClient} from '@prisma/client'
import {importPKCS8, jwtVerify, SignJWT} from "jose"
import cors from 'cors';
import {Resonite} from 'resonite-client-beta';
import {createViteDevServer} from "./viteServer.mjs";
import {config} from 'dotenv';

config()

type User = {
  id: string,
  createdAt: Date,
  resoniteUsername: string | null,
  resoniteUserId: string | null,
  discordId: string | null,
  misskeyId: string | null,
}

interface RequestWithUser extends Request {
  user?: User
}

if (!process.env.RESONITE_USERNAME || !process.env.RESONITE_PASSWORD) {
  throw new Error('RESONITE_USERNAME or RESONITE_PASSWORD not set')
}

if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
  throw new Error('DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET not set')
}

if (!process.env.PRIVATE_KEY || !process.env.PUBLIC_KEY) {
  throw new Error('PRIVATE_KEY or PRIVATE_KEY not set')
}

if (!process.env.PUBLIC_URL) {
  throw new Error('PUBLIC_URL not set')
}

console.log(process.env.DATABASE_URL)

function buffer_to_string(buf: ArrayBuffer) {
  // @ts-ignore
  const re = String.fromCharCode.apply('', new Uint8Array(buf))
  console.log(re)
  return re
}

const base64uri = (data: ArrayBuffer) =>
  btoa(buffer_to_string(data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

const clientId = process.env.PUBLIC_URL
const redirectUri = process.env.PUBLIC_URL + "callback"
const codeVerifier = (() => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
})()

const privateKey = await importPKCS8(process.env.PRIVATE_KEY, "EdDSA")

const resonite = new Resonite()
await resonite.login({
  username: process.env.RESONITE_USERNAME,
  password: process.env.RESONITE_PASSWORD,
})
const prisma = new PrismaClient()
const app = express();
app.use(express.json());
app.use(cookieParser())
app.use(express.urlencoded({extended: true}));
app.use(cors())

if (process.env.NODE_ENV === "production") {
  app.use(express.static('front/dist'))
} else {
  createViteDevServer("./front").then(({app: viteApp}) => {
    app.use(viteApp)
  })
}


// <認証コード, userID>のマップ
const tokenMap = new Map<string, string>()


const checkTokenMiddleware = async (req: RequestWithUser, res: express.Response, next: express.NextFunction) => {
  const refreshToken = req.cookies.refresh_token

  if (!refreshToken) {
    res.status(400).json({
      success: false,
      message: "リフレッシュトークンがありません No refresh token"
    })
    return
  }

  try {
    const {payload} = await jwtVerify(refreshToken, privateKey, {
      algorithms: ['EdDSA']
    })

    const userId = payload.id as string

    const long = payload.long as boolean

    if (!long) {
      res.status(400).json({
        success: false,
        message: "リフレッシュトークンではありません Invalid token"
      })
      return
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    })

    if (!user) {
      res.status(400).json({
        success: false,
        message: "ユーザーが見つかりません User not found"
      })
      return
    }

    req.user = user
    next()

  } catch (e) {
    res.clearCookie("refresh_token").status(400).json({
      success: false,
      message: "リフレッシュトークンが間違っています"
    })
    return
  }
}

// 未ログイン時 ログインリクエストを受けて認証コードを送る
app.post('/api/loginRequest', async (req, res) => {
  const userId = req.body.userId
  const lang = req.body.lang


  // tokenを作る
  const token = Math.floor(Math.random() * 1000000).toString().padStart(6, "0")

  tokenMap.set(token, userId)

  await resonite.addContact({targetUserId: userId})

  let message = `認証コードは${token}です`
  switch (lang) {
    case "en":
      message = `Your authentication code is ${token}`
      break
    case "ko":
      message = `인증 코드는 ${token}입니다`
      break
  }

  // Resoniteに認証コードを送る
  await resonite.sendTextMessage({
    message: message,
    targetUserId: userId
  })

  await resonite.sendTextMessage({
    message: `${token}`,
    targetUserId: userId
  })

  // フロントにリクエストの成功を返す
  res.json({
    success: true,
    message: "認証コードを入力してください Please enter the authentication code"
  })
})

app.get("/api/publickey", (_, res) => {
  res.json({
    success: true,
    key: process.env.PUBLIC_KEY,
    alg: "EdDSA"
  })
})

app.post('/api/login', async (req, res) => {
  const token = req.body.token
  const userId = tokenMap.get(token)

  if (userId) {
    let user = await prisma.user.findUnique({
      where: {
        resoniteUserId: userId
      }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          resoniteUserId: userId,
        }
      })

      await prisma.log.create({
        data: {
          user: {
            connect: {
              id: user.id
            }
          },
          type: "createUser",
          data: {}
        }
      })
    } else {
      await prisma.log.create({
        data: {
          user: {
            connect: {
              id: user.id
            }
          },
          type: "login",
          data: {}
        }
      })
    }

    const jwt = await generateLongToken(user)

    return res.cookie("refresh_token", jwt, {
      httpOnly: true,
    }).json({
      success: true
    })
  } else {
    return res.json({
      success: false,
      message: "認証コードが間違っています Invalid token"
    })
  }
})

app.post('/api/refresh', checkTokenMiddleware, async (req: RequestWithUser, res) => {

  const user = req.user

  if (!user) {
    res.status(400).json({
      success: false,
      message: "ユーザーが見つかりません User not found"
    })
    return
  }

  await prisma.log.create({
    data: {
      user: {
        connect: {
          id: user.id
        }
      },
      type: "refresh",
      data: {}
    }
  })


  const jwt = await generateLongToken(user)

  res.cookie("refresh_token", jwt, {
    httpOnly: true,
  }).json({
    success: true
  })
})

app.get("/api/claim", checkTokenMiddleware, async (req: RequestWithUser, res) => {
  const user = req.user
  const link = req.query.link as string

  if (!user) {
    res.status(500).json({
      success: false,
      message: "ユーザーが見つかりません"
    })
    return
  }

  await prisma.log.create({
    data: {
      user: {
        connect: {
          id: user.id
        }
      },
      type: "claim",
      data: {}
    }
  })

  const jwt = await generateShortToken(user, link)

  res.json({
    success: true,
    token: jwt
  })
  return
})

app.post("/api/logout", async (_, res) => {
  res.clearCookie("refresh_token").json({
    success: true,
  })
  return
})

app.get("/api/user", checkTokenMiddleware, async (req: RequestWithUser, res) => {
  const user = req.user
  return res.json({
    success: true,
    data: user
  })
})

app.get("/api/user/search", async (req, res) => {
  const misskeyId = req.query.misskeyId as string
  const user = await prisma.user.findUnique({
    where: {
      misskeyId: misskeyId
    }
  })
  if (!user) {
    res.json({
      success: false,
      message: "ユーザーが見つかりません"
    })
    return
  }
  return res.json({
    success: true,
    data: user
  })
})

app.get("/api/oauth/discord", async (_, res) => {
  const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&response_type=code&scope=identify&redirect_uri=`

  return res.json({
    success: true,
    url: url
  })
})

app.post("/api/oauth/discord", async (req, res) => {
  const code = req.body.code as string
  const redirectUri = req.body.redirectUri as string

  if (!code) {
    return res.json({
      success: false,
      message: "codeがありません"
    })
  }

  const id = await getDiscordUserId(code, redirectUri)

  const user = await prisma.user.findUnique({
    where: {
      discordId: id,
    }
  })

  if (!user) {
    res.json({
      success: false,
      message: "Discordと連携されていません"
    })
    return
  }

  await prisma.log.create({
    data: {
      user: {
        connect: {
          id: user.id
        }
      },
      type: "loginWithDiscord",
      data: {discordId: id}
    }
  })

  const jwt = await generateLongToken(user)

  res.cookie("refresh_token", jwt, {
    httpOnly: true,
  }).json
  ({
    success: true
  })
})

app.delete("/api/oauth/discord", checkTokenMiddleware, async (req: RequestWithUser, res) => {

  const user = req.user
  if (!user) {
    res.status(500).json({
      success: false,
      message: "ユーザーが見つかりません"
    })
    return
  }

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      discordId: null
    }
  })

  await prisma.log.create({
    data: {
      user: {
        connect: {
          id: user.id
        }
      },
      type: "unlinkDiscord",
      data: {discordId: user.discordId}
    }
  })

  res.json({
    success: true
  })
  return
})


app.post("/api/oauth/discord/link", checkTokenMiddleware, async (req: RequestWithUser, res) => {
  const code = req.body.code as string
  const redirectUri = req.body.redirectUri as string

  if (!code) {
    return res.json({
      success: false,
      message: "codeがありません"
    })
  }

  const user = req.user
  if (!user) {
    res.status(500).json({
      success: false,
      message: "ユーザーが見つかりません"
    })
    return
  }

  const id = await getDiscordUserId(code, redirectUri)

  const tmpUser = await prisma.user.findUnique({
    where: {
      discordId: id,
    }
  })

  if (tmpUser) {
    res.json({
      success: false,
      message: "既にDiscordと連携されています"
    })
    return
  }

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      discordId: id
    }
  })

  await prisma.log.create({
    data: {
      user: {
        connect: {
          id: user.id
        }
      },
      type: "linkDiscord",
      data: {}
    }
  })

  res.json({
    success: true
  })
  return
})

app.delete("/api/oauth/misskey", checkTokenMiddleware, async (req: RequestWithUser, res) => {
  const user = req.user
  if (!user) {
    res.status(500).json({
      success: false,
      message: "ユーザーが見つかりません"
    })
    return
  }

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      misskeyId: null
    }
  })

  await prisma.log.create({
    data: {
      user: {
        connect: {
          id: user.id
        }
      },
      type: "unlinkMisskey",
      data: {misskeyId: user.misskeyId}
    }
  })

  res.json({
    success: true
  })
  return
})

app.get("/api/oauth/misskey/claimAuthLink", async (_: RequestWithUser, res) => {

  const codeChallengeMethod = "S256"
  const codeChallenge = base64uri(await crypto.subtle.digest("sha-256", new TextEncoder().encode(codeVerifier)))

  const url = `https://misskey.resonite.love/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=read:account&code_challenge=${codeChallenge}&code_challenge_method=${codeChallengeMethod}`
  return res.json({
    success: true,
    url: url,
    //  codeVerifier: codeVerifier
  })

})

app.post("/api/oauth/misskey/link", checkTokenMiddleware, async (req: RequestWithUser, res) => {
  // link misskey
  const code = req.body.code as string

  const tokenResponse = await fetch("https://misskey.resonite.love/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  }).then((res) => res.json());

  const userData = await fetch("https://misskey.resonite.love/api/i", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      i: tokenResponse.access_token
    })
  }).then((res) => res.json());

  const misskeyUserId = userData.id
  const user = req.user
  if (!user) {
    res.status(500).json({
      success: false,
      message: "ユーザーが見つかりません"
    })
    return
  }

  const tmpUser = await prisma.user.findUnique({
    where: {
      misskeyId: misskeyUserId,
    }
  })
  if (tmpUser) {
    res.json({
      success: false,
      message: "既にMisskeyと連携されています"
    })
    return
  }
  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      misskeyId: misskeyUserId
    }
  })

  await prisma.log.create({
    data: {
      user: {
        connect: {
          id: user.id
        }
      },
      type: "linkMisskey",
      data: {}
    }
  })

  res.json({
    success: true
  })
})

app.post("/api/oauth/misskey", async (req, res) => {
  // login misskey
  const code = req.body.code as string

  const tokenResponse = await fetch("https://misskey.resonite.love/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  }).then((res) => res.json());

  const userData = await fetch("https://misskey.resonite.love/api/i", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      i: tokenResponse.access_token
    })
  }).then((res) => res.json());

  const user = await prisma.user.findUnique({
    where: {
      misskeyId: userData.id,
    }
  })

  if (!user) {
    res.json({
      success: false,
      message: "Misskeyと連携されていません"
    })
    return
  }

  await prisma.log.create({
    data: {
      user: {
        connect: {
          id: user.id
        }
      },
      type: "loginWithMisskey",
      data: {misskeyId: userData.id}
    }
  })

  const jwt = await generateLongToken(user)

  res.cookie("refresh_token", jwt, {
    httpOnly: true,
  }).json
  ({
    success: true
  })
})

const userSearchCache: Record<string, any> = {}
app.get("/api/proxy/resonite/users", async (req, res) => {
  // https://api.resonite.com/users/?name=yoshi
  const name = req.query.name as string

  if (userSearchCache[name]) {
    return res.json(userSearchCache[name])
  }

  const result = await fetch(`https://api.resonite.com/users/?name=${name}`)
  let data = await result.json()

  data = data.sort((a: any, b: any) => {
    if (a.profile?.iconUrl && b.profile?.iconUrl) {
      return 0
    }
    if (a.profile?.iconUrl) {
      return -1
    }
    return 1
  })

  userSearchCache[name] = data

  setTimeout(() => {
    delete userSearchCache[name]
  }, 1000 * 60 * 30)

  return res.json(data)
})

const userInfoCache: Record<string, any> = {}
app.get("/api/proxy/resonite/users/:userId", async (req, res) => {
  const userId = req.params.userId

  if (userInfoCache[userId]) {
    return res.json(userInfoCache[userId])
  }

  const result = await fetch(`https://api.resonite.com/users/${userId}`)
  let data = await result.json()

  userInfoCache[userId] = data

  setTimeout(() => {
    delete userInfoCache[userId]
  }, 1000 * 60 * 30)

  return res.json(data)
})

app.listen(3000, () => {
  console.log('Server is running');
})

const generateLongToken = async (user: User) => {
  const jwt = await new SignJWT({...user, long: true})
    .setProtectedHeader({alg: 'EdDSA'})
    .setExpirationTime('30d')
    .sign(privateKey)

  return jwt
}

const generateShortToken = async (user: User, link: string = "NO_CONTAIN_LINK") => {
  // linkからドメインを取得
  let aud = new URL(link).origin
  if (!aud) {
    aud = "NO_CONTAIN_LINK"
  }

  return await new SignJWT(user)
    .setProtectedHeader({alg: 'EdDSA'})
    .setAudience(aud)
    .setExpirationTime('60s')
    .sign(privateKey)
}

const getDiscordUserId = async (code: string, redirectUri: string) => {
  const clientId = process.env.DISCORD_CLIENT_ID as string
  const clientSecret = process.env.DISCORD_CLIENT_SECRET as string


  const result = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    }),
  });
  const discordAuthResult = await result.json();
  const {access_token} = discordAuthResult;
  // get discord userId
  const discordUser = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  const {id} = await discordUser.json();
  return id.toString()
}

// catch unhandledRejection
process.on('unhandledRejection', (err) => {
  // restart
  console.error(err)
  process.exit(1)
})
