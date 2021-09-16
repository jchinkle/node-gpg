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
import { v4 as uuid } from "uuid";
import { Stream } from "stream";
import { spawnGPG, streaming } from "./spawnGPG";
import { IGpgKey, IGpgOptions, IStreamingOptions } from "./types";
import { parseKeysFromOutput } from "./parsers";

const keyRegex = /^gpg: key (.*?):/;

export const GPG_UNIX_BASE_DIR = `${homedir()}/.gnupg`;
export const GPG_WINDOWS_BASE_DIR = `${homedir()}\\AppData\\Roaming\\gnupg`;

export class GpgService {
  constructor(private options: IGpgOptions) {}

  /**
   * Raw call to gpg.
   */
  call(input: string, args: string[]): Promise<Buffer> {
    return this.options.spawnGPG(
      input,
      [
        ...(this.options.basedir ? ["--homedir", this.options.basedir] : []),
        ...args,
      ],
      this.options
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
    return this.options.streaming(
      options,
      [
        ...(this.options.basedir ? ["--homedir", this.options.basedir] : []),
        ...args,
      ],
      this.options
    );
  }

  setExecutablePath(executablePath: string): GpgService {
    this.options.executablePath = executablePath;
    return this;
  }

  setTempFolderPath(tempFolderPath: string): GpgService {
    this.options.tempFolderPath = tempFolderPath;
    return this;
  }

  setBaseDir(basedir: string): GpgService {
    this.options.basedir = basedir;
    return this;
  }

  useSudo(value: boolean): GpgService {
    this.options.useSudo = value;
    return this;
  }

  setQuiet(quiet: boolean): GpgService {
    this.options.quiet = quiet;
    return this;
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
  encryptFile(
    file: string,
    recipientUsernames: string[] = []
  ): Promise<Buffer> {
    return this.options.reader
      .readFile(file)
      .then((content) => this.encrypt(content, recipientUsernames));
  }

  /**
   * Encrypt source stream passed as `options.source` and pass it to the stream specified in `options.dest`.
   * Is basicaly the same method as `encryptToFile()`.
   *
   * @api public
   */
  encryptToStream(
    options: IStreamingOptions,
    recipientUsernames: string[] = []
  ): Promise<fs.WriteStream> {
    return this.callStreaming(
      options,
      recipientUsernames
        .map((username) => ["-r", username])
        .reduce((arr, item) => arr.concat(item), [])
        .concat(["-a", "--trust-model", "always", "--encrypt"])
    );
  }

  /**
   * Encrypt source `stream` and pass the encrypted contents to the callback `fn`.
   *
   * @api public
   */
  encryptStream(
    stream: Stream,
    recipientUsernames: string[] = []
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks = [];

      stream.on("data", function (chunk) {
        chunks.push(chunk);
      });

      stream.on("end", () => {
        resolve(this.encrypt(Buffer.concat(chunks), recipientUsernames));
      });

      stream.on("error", reject);
    });
  }

  /**
   * Encrypt `str` and pass the encrypted version to the callback `fn`.
   *
   * @api public
   */
  encrypt(
    str: string | Buffer,
    recipientUsernames: string[] = []
  ): Promise<Buffer> {
    return this.call(
      str.toString(),
      recipientUsernames
        .map((username) => ["-r", username])
        .reduce((arr, item) => arr.concat(item), [])
        .concat(["-a", "--trust-model", "always", "--encrypt"])
    );
  }

  /**
   * Decrypt `str` and pass the decrypted version to the callback `fn`.
   *
   * @api public
   */
  decrypt(str: string | Buffer, passphrase: string): Promise<Buffer> {
    const messageFilePath = path.join(
      this.options.tempFolderPath,
      `${this.options.idFactoryFn()}.txt`
    );
    return this.options.writer
      .writeFile(messageFilePath, str)
      .then(() => this.decryptFile(messageFilePath, passphrase))
      .finally(() => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        this.options.writer.unlink(messageFilePath).then(() => {});
      });
  }

  /**
   * Decrypt source `file` and pass the decrypted contents to the callback `fn`.
   *
   * @api public
   */
  decryptFile(file: string, passphrase: string, options: string[] = []): Promise<Buffer> {
    return this.call(passphrase, [
      "--no-tty",
      "--logger-fd",
      "1",
      ...(this.options.quiet ? [] : ["--quiet"]),
      "--passphrase-fd",
      "0",
      //"--pinentry-mode",
      //"loopback",
      "--decrypt",
      ...options,
      file,
    ]);
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
  decryptStream(stream: Stream, passphrase: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks = [];

      stream.on("data", (chunk) => {
        chunks.push(chunk);
      });

      stream.on("end", () => {
        resolve(this.decrypt(Buffer.concat(chunks), passphrase));
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
    return this.options.reader
      .readFile(
        path.join(this.options.basedir, `/private-keys-v1.d/${keygrip}.key`)
      )
      .catch((err) =>
        Promise.reject(
          err.code === "ENOENT"
            ? new Error(`No key exists with keygrip ${keygrip}`)
            : err
        )
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
    return this.call("", [
      "--no-tty",
      "--logger-fd",
      "1",
      "--list-keys",
      "--with-keygrip",
      ...args,
    ]).then((buffer) => {
      const message = buffer.toString();
      return parseKeysFromOutput(message);
    });
  }

  /**
   * Gets a keys by either its id, or username
   *
   * @api public
   */
  getKey(idOrUsername: string): Promise<IGpgKey> {
    return this.listKeys([idOrUsername]).then((keys) => keys[0]);
  }

  /**
   * Check if a key exists
   *
   * @api public
   */
  exists(idOrUsername: string): Promise<boolean> {
    return this.getKey(idOrUsername)
      .then((key) => !!key)
      .catch(() => false);
  }
}

export const gpg = new GpgService({
  spawnGPG,
  streaming,
  reader: {
    readFile: fs.promises.readFile,
    readFileString: (filePath) => fs.promises.readFile(filePath, "utf8"),
  },
  writer: {
    writeFile: (filePath, content) =>
      fs.promises.writeFile(filePath, content, {
        encoding: "utf8",
      }),
    unlink: fs.promises.unlink,
  },
  tempFolderPath: "./",
  idFactoryFn: uuid,
  basedir: GPG_UNIX_BASE_DIR,
  useSudo: false,
  quiet: true,
});
export default gpg;
