## List Keys

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  const keys = await gpg.listKeys();
})();
```

## Generate Key

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  const keys = await gpg.generateKey(
    "John Doe",
    "john.doe@mailinator.com",
    "sample-passphrase"
  );
})();
```

## Export Public Key

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  const keys = await gpg.exportPublicKey("john.doe@mailinator.com");
})();
```

or

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  const keys = await gpg.exportPublicKey("John Doe <john.doe@mailinator.com>");
})();
```

## Export Private Key

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  const keys = await gpg.listKeys();
  const keyGridId = keys.find(key => key.email === "john.doe@mailinator.com");
  const buffer = await gpg.exportPrivateKey(keyGridId); // this will be encrypted, if there's a passphrase
})();
```

## Export Private Key as Base64

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  const keys = await gpg.listKeys();
  const keyGridId = keys.find(key => key.email === "john.doe@mailinator.com");
  const privateKey = await gpg.exportPrivateKeyAsBase64(keyGridId); // this will be encrypted, if there's a passphrase
})();
```

## Import Key from File

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  const { fingerprint } = await gpg.importKeyFromFile(
    path.join(__dirname, "public.key")
  );
})();
```

## Import Key from String

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  const { fingerprint } = await gpg.importKey(`THIS IS A SAMPLE PUBLIC KEY`);
})();
```

## Remove Key

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  await gpg.removeKey(`6F20F59D`); // pass the key's id
})();
```

## Verify Signature

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  await gpg.verifySignature("Hello, this is me!", [
    "--trust-model",
    "always",
    "--default-key",
    "6F20F59D",
  ]); // pass the key's id
})();
```

## Encrypt String

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  await gpg.encrypt("Hello World", [
    "recipient1@example.com",
    "recipient2@example.com",
  ]);
})();
```

## Encrypt File

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  await gpg.encryptFile("/path/to/file", [
    "recipient1@example.com",
    "recipient2@example.com",
  ]);
})();
```

## Decrypt String

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  await gpg.decrypt("SAMPLE-ENCRYPTED-STRING", "sample-passphrase");
})();
```

## Decrypt File

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  await gpg.decryptFile("/path/to/encrypted/file", "sample-passphrase");
})();
```

## Other Operations

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  await gpg.call("<input>", [
    "--skip-verify",
    "--passphrase-fd",
    "0",
    "--decrypt",
    "./path/to/key.gpg",
  ]);
})();
```

```js
import { gpg } from "@mykeels/gpg";

(async () => {
  await gpg.callStreaming(
    {
      source: "source",
      dest: "dest",
    },
    [
      "--decrypt",
      "--default-key",
      "6F20F59D",
      "--recipient",
      "6F20F59D",
      "--trust-model",
      "always",
    ]
  );
})();
```

## Change GPG Base Directory

Unix uses `~/.gnupg`
Windows uses `C:\Users\[User]\AppData\Roaming\gnupg`

```js
import { gpg, GPG_WINDOWS_BASE_DIR } from "@mykeels/gpg";

// gpg uses unix base directory by default

(async () => {
  gpg.setBaseDir(GPG_WINDOWS_BASE_DIR);
})();
```

## Set Temp Directory for storing Encrypted Files for Decryption

```js
gpg.setTempFolderPath("./temp");
```