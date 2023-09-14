import {importPKCS8, importSPKI, importX509, jwtVerify, generateKeyPair, exportSPKI, exportPKCS8} from "jose";
import fs from "fs";

const { publicKey, privateKey } = await generateKeyPair('EdDSA')

// save keys when not exists
if (!fs.existsSync("./public.pem")) {
    fs.writeFileSync("./public.pem", await exportSPKI(publicKey))
}

if (!fs.existsSync("./private.pem")) {
    fs.writeFileSync("./private.pem", await exportPKCS8(privateKey))
}
