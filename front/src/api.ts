export const loginRequest = async (userId: string, lang: string) => {

  if (!userId) return {success: false, message: "userId is empty"}
  const res = await fetch("/api/loginRequest", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({userId: userId, lang})
  })

  return await res.json()
}

export const login = async (token: string) => {
  const res = await fetch("/api/login", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({token: token})
  })

  return await res.json()
}

export type BasicResponse = {
  success: boolean
  message: string
}

export interface ClaimResponse extends BasicResponse {
  token: string
}

export const refresh = async () => {
  const res = await fetch("/api/refresh", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  })

  return await res.json() as BasicResponse
}

export const claim = async (link?: string) => {
  const url = link ? `/api/claim?link=${link}` : "/api/claim"

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    },
  })
  return await res.json() as ClaimResponse
}

export const logout = async () => {
  const res = await fetch("/api/logout", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  })

  return await res.json() as BasicResponse
}

export const getUserInfo = async () => {
  const res = await fetch("/api/user", {
    headers: {
      'Content-Type': 'application/json'
    },
  })

  return await res.json()
}

export const discordOAuth = async () => {
  const res = await fetch("/api/oauth/discord", {
    headers: {
      'Content-Type': 'application/json'
    },
  })

  const result = await res.json()
  if (result.success) {
    window.location.href = result.url + window.location
  }
}

export const discordLink = async (code: string) => {
  const res = await fetch("/api/oauth/discord/link", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({code: code, redirectUri: window.location.origin + "/"})
  })

  return await res.json()
}

export const discordUnlink = async () => {
  const res = await fetch("/api/oauth/discord", {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
  })

  return await res.json()
}

export const discordLogin = async (code: string) => {
  const res = await fetch("/api/oauth/discord", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({code: code, redirectUri: window.location.origin + "/"})
  })

  return await res.json()
}

export const claimMisskeyLink = async () => {
  const res = await fetch("/api/oauth/misskey/claimAuthLink", {
    headers: {
      'Content-Type': 'application/json'
    },
  })

  return await res.json()
}

export const linkMisskey = async (code: string) => {
  const res = await fetch("/api/oauth/misskey/link", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({code: code})
  })

  return await res.json()
}

export const unlinkMisskey = async () => {
  const res = await fetch("/api/oauth/misskey", {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
  })

  return await res.json()
}

export const loginWithMisskey = async (code: string) => {
  const res = await fetch("/api/oauth/misskey", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({code: code})
  })

  return await res.json()
}

export const getResoniteUserByUserId = async (userId: string) => {
  const res = await fetch(`/api/proxy/resonite/users/${userId}`, {
    headers: {
      'Content-Type': 'application/json'
    },
  })

  return await res.json()
}

export const searchResoniteUser = async (query: string) => {
  const res = await fetch(`/api/proxy/resonite/users?name=${query}`, {
    headers: {
      'Content-Type': 'application/json'
    },
  })

  return await res.json()
}