export const parseResDB = (url: string) => {
  const u = url.replace("resdb:///", "https://assets.resonite.com/")
  // remove extension
  return u.replace(/\.[^/.]+$/, "")
}

export type ResoniteUser = {
  id: string
  username: string,
  registrationDate: string,
  migratedData?: {
    registrationDate: string
  }
  profile: {
    iconUrl: string
  }
}