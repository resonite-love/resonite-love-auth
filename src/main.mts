import express from 'express';
import cookieParser from 'cookie-parser';
import {PrismaClient} from '@prisma/client'
import {SignJWT, jwtVerify, importPKCS8} from "jose"
import cors from 'cors';
import fs from 'fs';
import {Neos} from 'neos-client';
import {createViteDevServer} from "./viteServer.mjs";

if (!process.env.NEOS_USERNAME || !process.env.NEOS_PASSWORD) {
  throw new Error('NEOS_USERNAME or NEOS_PASSWORD not set')
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

if(process.env.NODE_ENV === "production") {
  app.use(express.static('front/dist'))
} else {
  createViteDevServer("./front").then(({app: viteApp}) => {
    app.use(viteApp)
  })
}



// <認証コード, userID>のマップ
const tokenMap = new Map<string,string>()

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

    if(!user) {
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

app.post('/api/refresh', async (req, res) => {
  const refreshToken = req.cookies.refresh_token

  if (!refreshToken) {
    res.status(400).json({
      success: false,
      message: "リフレッシュトークンがありません"
    })
    return
  }

  const {payload} = await jwtVerify(refreshToken, privateKey, {
    algorithms: ['EdDSA']
  })

  const userId = payload.id as string

  if (!userId) {
    res.status(400).json({
      success: false,
      message: "リフレッシュトークンが間違っています"
    })
    return
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  })

  if(!user) {
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
          id: userId
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

app.post("/api/claim", async (req, res) => {
  const refreshToken = req.cookies.refresh_token

  if (!refreshToken) {
    res.json({
      success: false,
      message: "リフレッシュトークンがありません"
    })
    return
  }

  const {payload} = await jwtVerify(refreshToken, privateKey, {
    algorithms: ['EdDSA']
  })

  const userId = payload.id as string

  if (!userId) {
    res.json({
      success: false,
      message: "リフレッシュトークンが間違っています"
    })
    return
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  })

  if(!user) {
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
          id: userId
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

app.get("/api/user", async (req, res) => {
  const refreshToken = req.cookies.refresh_token

  if (!refreshToken) {
    res.status(400).json({
      success: false,
      message: "リフレッシュトークンがありません"
    })
    return
  }

  const {payload} = await jwtVerify(refreshToken, privateKey, {
    algorithms: ['EdDSA']
  })

  const user = await prisma.user.findUnique({
    where: {
      id: payload.id as string
    }
  })

  return res.json(user)
})

app.listen(3000, () => {
  console.log('Server is running');
})
