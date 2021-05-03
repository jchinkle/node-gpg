/*!
 * node-gpg
 * Copyright(c) 2011 Nicholas Penree <drudge@conceited.net>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
import fs from "fs";
import { homedir } from "os";
import path from "path";
import { Stream } from "node:stream";
import { IStreamingOptions, spawnGPG, streaming } from "./spawnGPG";
const keyRegex = /^gpg: key (.*?):/;
// eslint-disable-next-line no-control-regex
const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gi;

type SpawnGpgFn = (
  input: string,
  args: string[],
  executable: string
) => Promise<void | Buffer>;
type StreamingFn = (
  options: IStreamingOptions,
  args: string[],
  executable: string
) => Promise<fs.WriteStream>;
interface IGpgKey {
  created_at: string | Date;
  expires_at: string | Date;
  id: string;
  username: string;
  keygrip: string;
}

export class GpgService {
  constructor(
    private options: {
      spawnGPG?: SpawnGpgFn;
      streaming?: StreamingFn;
      executable?: string;
      reader?: {
        readFile: (filePath: string) => Promise<Buffer>;
        readFileString: (filePath: string) => Promise<string>;
      };
    }
  ) {}

  /**
   * Raw call to gpg.
   */
  call(input: string, args: string[]): Promise<Buffer> {
    return this.options.spawnGPG(
      input,
      args,
      this.options.executable
    ) as Promise<Buffer>;
  }

  /**
   * Raw streaming call to gpg. Reads from input file and writes to output file.
   *
   * @api public
   */
  callStreaming(
    options: IStreamingOptions,
    args: string[]
  ): Promise<fs.WriteStream> {
    return this.options.streaming(options, args, this.options.executable);
  }

  /**
   * Encrypt source file passed as `options.source` and store it in a file specified in `options.dest`.
   *
   * @api public
   */
  encryptToFile(options: IStreamingOptions): Promise<fs.WriteStream> {
    return this.callStreaming(options, ["--encrypt"]);
  }

  /**
   * Encrypt source `file` and pass the encrypted contents to the callback `fn`.
   *
   * @param {String}   file   Filename.
   * @param {Function} [fn]   Callback containing the encrypted file contents.
   * @api public
   */
  encryptFile(file: string): Promise<Buffer> {
    return this.options.reader
      .readFile(file)
      .then((content) => this.encrypt(content));
  }

  /**
   * Encrypt source stream passed as `options.source` and pass it to the stream specified in `options.dest`.
   * Is basicaly the same method as `encryptToFile()`.
   *
   * @api public
   */
  encryptToStream(options: IStreamingOptions): Promise<fs.WriteStream> {
    return this.callStreaming(options, ["--encrypt"]);
  }

  /**
   * Encrypt source `stream` and pass the encrypted contents to the callback `fn`.
   *
   * @api public
   */
  encryptStream(stream: Stream, args: string[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks = [];

      stream.on("data", function (chunk) {
        chunks.push(chunk);
      });

      stream.on("end", () => {
        resolve(this.encrypt(Buffer.concat(chunks), args));
      });

      stream.on("error", reject);
    });
  }

  /**
   * Encrypt `str` and pass the encrypted version to the callback `fn`.
   *
   * @api public
   */
  encrypt(str: string | Buffer, args: string[] = []): Promise<Buffer> {
    return this.call(str.toString(), args.concat(["--encrypt"]));
  }

  /**
   * Decrypt `str` and pass the decrypted version to the callback `fn`.
   *
   * @api public
   */
  decrypt(str: string | Buffer, args: string[] = []): Promise<Buffer> {
    return this.call(str.toString(), args.concat(["--decrypt"]));
  }

  /**
   * Decrypt source `file` and pass the decrypted contents to the callback `fn`.
   *
   * @api public
   */
  decryptFile(file: string): Promise<Buffer> {
    return this.options.reader
      .readFile(file)
      .then((content) => this.decrypt(content));
  }

  /**
   * Decrypt source file passed as `options.source` and store it in a file specified in `options.dest`.
   *
   * @api public
   */
  decryptToFile(options: IStreamingOptions): Promise<fs.WriteStream> {
    return this.callStreaming(options, ["--decrypt"]);
  }

  /**
   * Decrypt source `stream` and pass the decrypted contents to the callback `fn`.
   *
   * @api public
   */
  decryptStream(stream: Stream, args: string[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks = [];

      stream.on("data", (chunk) => {
        chunks.push(chunk);
      });

      stream.on("end", () => {
        resolve(this.decrypt(Buffer.concat(chunks), args));
      });

      stream.on("error", reject);
    });
  }

  /**
   * Decrypt source stream passed as `options.source` and pass it to the stream specified in `options.dest`.
   * This is basicaly the same method as `decryptToFile()`.
   *
   * @api public
   */
  decryptToStream(options: IStreamingOptions): Promise<fs.WriteStream> {
    return this.callStreaming(options, ["--decrypt"]);
  }

  /**
   * Clearsign `str` and pass the signed message to the callback `fn`.
   *
   * @api public
   */
  clearsign(str: string | Buffer, args: string[] = []): Promise<Buffer> {
    return this.call(str as string, args.concat(["--clearsign"]));
  }

  /**
   * Verify `str` and pass the output to the callback `fn`.
   *
   * @api public
   */
  verifySignature(str: string | Buffer, args: string[] = []): Promise<Buffer> {
    // Set logger fd, verify otherwise outputs to stderr for whatever reason
    return this.call(
      str as string,
      args.concat(["--logger-fd", "1", "--verify"])
    );
  }

  /**
   * Add a key to the keychain by filename.
   *
   * @api public
   */
  importKeyFromFile(
    fileName: string,
    args: string[] = []
  ): Promise<{ fingerprint: string; result: string }> {
    return this.options.reader
      .readFileString(fileName)
      .then((str) => this.importKey(str, args));
  }

  /**
   * Add an ascii-armored key to gpg. Expects the key to be passed as input.
   *
   * @param {String}   keyStr  Key string (armored).
   * @param {Array}    args    Optional additional arguments to pass to gpg.
   * @param {Function} fn      Callback containing the signed message Buffer.
   * @api public
   */
  importKey(
    keyStr: string,
    args: string[] = []
  ): Promise<{ fingerprint: string; result: string }> {
    return this.call(keyStr, args.concat(["--logger-fd", "1", "--import"]))
      .then((result) => {
        // Grab key fingerprint and send it back as second arg
        const match = result.toString().match(keyRegex);
        return { fingerprint: match && match[1], result: result.toString() };
      })
      .catch((importError) => {
        // Ignorable errors
        if (/already in secret keyring/.test(importError.message)) {
          throw new Error(importError.message);
        } else {
          throw new Error(importError);
        }
      });
  }

  /**
   * Removes a key by fingerprint. Warning: this will remove both pub and privkeys!
   *
   * @param {String}   keyID  Key fingerprint.
   * @param {Array}    [args] Array of additonal gpg arguments.
   * @param {Function} fn     Callback containing the signed message Buffer.
   * @api public
   */
  removeKey(keyID: string, args: string[] = []): Promise<Buffer> {
    // Set logger fd, verify otherwise outputs to stderr for whatever reason
    return this.call(
      "",
      args.concat([
        "--no-tty",
        "--yes",
        "--logger-fd",
        "1",
        "--delete-secret-and-public-key",
        keyID,
      ])
    );
  }

  /**
   * Creates a key!
   *
   * @api public
   */
  generateKey(
    username: string,
    passphrase: string,
    args: string[] = []
  ): Promise<Buffer> {
    return this.call(
      "",
      args.concat([
        "--no-tty",
        "--logger-fd",
        "1",
        "--passphrase",
        passphrase,
        "--quick-generate-key",
        username,
      ])
    );
  }

  /**
   * Exports a public key!
   *
   * @api public
   */
  exportPublicKey(username: string, args: string[] = []): Promise<string> {
    return this.call(
      "",
      args.concat(["--logger-fd", "1", "--export", "-a", username])
    ).then((buffer) => buffer?.toString());
  }

  /**
   * Exports a private key!
   *
   * @api public
   */
  exportPrivateKey(keygrip: string): Promise<Buffer> {
    return this.options.reader.readFile(
      path.join(homedir(), `/.gnupg/private-keys-v1.d/${keygrip}.key`)
    );
  }

  /**
   * Exports a private key as base64 string!
   *
   * @api public
   */
  exportPrivateKeyAsBase64(keygrip: string): Promise<string> {
    return this.exportPrivateKey(keygrip).then((buffer) =>
      buffer?.toString("base64")
    );
  }

  /**
   * Lists keys!
   *
   * @api public
   */
  listKeys(args: string[] = []): Promise<IGpgKey[]> {
    return this.call(
      "",
      args.concat([
        "--no-tty",
        "--logger-fd",
        "1",
        "--list-keys",
        "--with-keygrip",
      ])
    ).then((buffer) => {
      const message = buffer.toString();
      const [ourFocus] = message
        .split(/-----+/)
        .map((l) => l.trim())
        .slice(1);
      const lines = ["", ...ourFocus.split("\n").map((l) => l.trim())];
      const keys = lines.reduce((keys, line) => {
        if (line === "") {
          return keys.concat({});
        }
        const lastKey = keys[keys.length - 1] as Partial<IGpgKey>;
        if (line.startsWith("pub")) {
          const [created_at, expires_at] = line
            .match(/(\d{4}-\d{2}-\d{2}) .+ (\d{4}-\d{2}-\d{2})/)
            .slice(1);
          lastKey.created_at = created_at;
          lastKey.expires_at = expires_at;
        } else if (line.startsWith("uid")) {
          const [ourFocus] = line.split("]").slice(1);
          const [name] = ourFocus.match(/(.+ <(.+)>)/)?.slice(1) || [];
          const [email] = ourFocus.match(emailRegex);
          lastKey.username = name?.trim().replace('"', "") || email;
        } else if (line.trim().startsWith("Keygrip")) {
          const [keygrip] = line.split(" = ").slice(1);
          lastKey.keygrip = keygrip;
        } else if (!line.startsWith("sub")) {
          lastKey.id = line;
        }
        return keys;
      }, []);
      return keys;
    });
  }
}

export const gpg = new GpgService({
  spawnGPG,
  streaming,
  reader: {
    readFile: fs.promises.readFile,
    readFileString: (filePath) => fs.promises.readFile(filePath, "utf8"),
  },
});
export default gpg;
