import express from 'express';
import cookieParser from 'cookie-parser';
import {PrismaClient} from '@prisma/client'
import {SignJWT, jwtVerify, importPKCS8} from "jose"
import cors from 'cors';
import fs from 'fs';
import {Neos} from 'neos-client';
import {createViteDevServer} from "./viteServer.mjs";
import RequestWithUser = Express.RequestWithUser;

if (!process.env.NEOS_USERNAME || !process.env.NEOS_PASSWORD) {
  throw new Error('NEOS_USERNAME or NEOS_PASSWORD not set')
}

if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
  throw new Error('DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET not set')
}

const PRIVATE_KEY_PATH = './private.pem'
const privateKey = await importPKCS8(fs.readFileSync(PRIVATE_KEY_PATH, 'utf-8'), "EdDSA")

const neos = new Neos({
  username: process.env.NEOS_USERNAME,
  password: process.env.NEOS_PASSWORD,
})
const prisma = new PrismaClient()
const app = express();
app.use(express.json());
app.use(cookieParser())
app.use(express.urlencoded({extended: true}));
app.use(cors({
  origin: 'https://v2.neauth.app/',
}))

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
      message: "リフレッシュトークンがありません"
    })
    return
  }

  try {
    const {payload} = await jwtVerify(refreshToken, privateKey, {
      algorithms: ['EdDSA']
    })

    const userId = payload.id as string

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    })

    if (!user) {
      res.status(400).json({
        success: false,
        message: "ユーザーが見つかりません"
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
  // tokenを作る
  const token = Math.floor(Math.random() * 1000000).toString().padStart(6, "0")

  tokenMap.set(token, userId)

  // Neosに送る
  neos.sendTextMessage({
    message: `認証コードは${token}です`,
    targetUserId: userId
  })

  // フロントにリクエストの成功を返す
  res.json({
    success: true,
    message: "認証コードを入力してください"
  })
})

app.post('/api/login', async (req, res) => {
  const token = req.body.token
  const userId = tokenMap.get(token)

  if (userId) {
    let user = await prisma.user.findUnique({
      where: {
        neosUserId: userId
      }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          neosUserId: userId,
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

    const jwt = await new SignJWT(user)
      .setProtectedHeader({alg: 'EdDSA'})
      .setExpirationTime('30d')
      .sign(privateKey)

    return res.cookie("refresh_token", jwt, {
      httpOnly: true,
    }).json({
      success: true
    })
  } else {
    return res.json({
      success: false,
      message: "認証コードが間違っています"
    })
  }
})

app.post('/api/refresh', checkTokenMiddleware, async (req: RequestWithUser, res) => {

  const user = req.user

  if (!user) {
    res.status(400).json({
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
      type: "refresh",
      data: {}
    }
  })


  const jwt = await new SignJWT(user)
    .setProtectedHeader({alg: 'EdDSA'})
    .setExpirationTime('30d')
    .sign(privateKey)

  res.cookie("refresh_token", jwt, {
    httpOnly: true,
  }).json({
    success: true
  })
})

app.post("/api/claim", checkTokenMiddleware, async (req: RequestWithUser, res) => {
  const user = req.user

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

  const jwt = await new SignJWT(user)
    .setProtectedHeader({alg: 'EdDSA'})
    .setExpirationTime('60s')
    .sign(privateKey)

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

app.get("/api/oauth/discord", async (req, res) => {
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

  const jwt = await new SignJWT(user)
    .setProtectedHeader({alg: 'EdDSA'})
    .setExpirationTime('30d')
    .sign(privateKey)

  res.cookie("refresh_token", jwt, {
    httpOnly: true,
  }).json
  ({
    success: true
  })
})

app.delete("/api/oauth/discord", checkTokenMiddleware, async (req: RequestWithUser, res) => {

  const user = req.user

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

app.listen(3000, () => {
  console.log('Server is running');
})

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
  console.error(err)
})
