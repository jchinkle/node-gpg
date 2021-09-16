"use strict";
/*!
 * node-gpg
 * Copyright(c) 2011 Nicholas Penree <drudge@conceited.net>
 * MIT Licensed
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gpg = exports.GpgService = exports.GPG_WINDOWS_BASE_DIR = exports.GPG_UNIX_BASE_DIR = void 0;
/**
 * Module dependencies.
 */
const fs_1 = __importDefault(require("fs"));
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const spawnGPG_1 = require("./spawnGPG");
const parsers_1 = require("./parsers");
const keyRegex = /^gpg: key (.*?):/;
exports.GPG_UNIX_BASE_DIR = `${os_1.homedir()}/.gnupg`;
exports.GPG_WINDOWS_BASE_DIR = `${os_1.homedir()}\\AppData\\Roaming\\gnupg`;
class GpgService {
    constructor(options) {
        this.options = options;
    }
    /**
     * Raw call to gpg.
     */
    call(input, args) {
        return this.options.spawnGPG(input, [
            ...(this.options.basedir ? ["--homedir", this.options.basedir] : []),
            ...args,
        ], this.options);
    }
    /**
     * Raw streaming call to gpg. Reads from input file and writes to output file.
     *
     * @api public
     */
    callStreaming(options, args) {
        return this.options.streaming(options, [
            ...(this.options.basedir ? ["--homedir", this.options.basedir] : []),
            ...args,
        ], this.options);
    }
    setExecutablePath(executablePath) {
        this.options.executablePath = executablePath;
        return this;
    }
    setTempFolderPath(tempFolderPath) {
        this.options.tempFolderPath = tempFolderPath;
        return this;
    }
    setBaseDir(basedir) {
        this.options.basedir = basedir;
        return this;
    }
    useSudo(value) {
        this.options.useSudo = value;
        return this;
    }
    setQuiet(quiet) {
        this.options.quiet = quiet;
        return this;
    }
    /**
     * Encrypt source file passed as `options.source` and store it in a file specified in `options.dest`.
     *
     * @api public
     */
    encryptToFile(options) {
        return this.callStreaming(options, ["--encrypt"]);
    }
    /**
     * Encrypt source `file` and pass the encrypted contents to the callback `fn`.
     *
     * @param {String}   file   Filename.
     * @param {Function} [fn]   Callback containing the encrypted file contents.
     * @api public
     */
    encryptFile(file, recipientUsernames = []) {
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
    encryptToStream(options, recipientUsernames = []) {
        return this.callStreaming(options, recipientUsernames
            .map((username) => ["-r", username])
            .reduce((arr, item) => arr.concat(item), [])
            .concat(["-a", "--trust-model", "always", "--encrypt"]));
    }
    /**
     * Encrypt source `stream` and pass the encrypted contents to the callback `fn`.
     *
     * @api public
     */
    encryptStream(stream, recipientUsernames = []) {
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
    encrypt(str, recipientUsernames = []) {
        return this.call(str.toString(), recipientUsernames
            .map((username) => ["-r", username])
            .reduce((arr, item) => arr.concat(item), [])
            .concat(["-a", "--trust-model", "always", "--encrypt"]));
    }
    /**
     * Decrypt `str` and pass the decrypted version to the callback `fn`.
     *
     * @api public
     */
    decrypt(str, passphrase) {
        const messageFilePath = path_1.default.join(this.options.tempFolderPath, `${this.options.idFactoryFn()}.txt`);
        return this.options.writer
            .writeFile(messageFilePath, str)
            .then(() => this.decryptFile(messageFilePath, passphrase))
            .finally(() => {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            this.options.writer.unlink(messageFilePath).then(() => { });
        });
    }
    /**
     * Decrypt source `file` and pass the decrypted contents to the callback `fn`.
     *
     * @api public
     */
    decryptFile(file, passphrase) {
        return this.call(passphrase, [
            "--no-tty",
            "--logger-fd",
            "1",
            ...(this.options.quiet ? [] : ["--quiet"]),
            "--passphrase-fd",
            "0",
            "--pinentry-mode",
            "loopback",
            "--decrypt",
            file,
        ]);
    }
    /**
     * Decrypt source file passed as `options.source` and store it in a file specified in `options.dest`.
     *
     * @api public
     */
    decryptToFile(options) {
        return this.callStreaming(options, ["--decrypt"]);
    }
    /**
     * Decrypt source `stream` and pass the decrypted contents to the callback `fn`.
     *
     * @api public
     */
    decryptStream(stream, passphrase) {
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
    decryptToStream(options) {
        return this.callStreaming(options, ["--decrypt"]);
    }
    /**
     * Clearsign `str` and pass the signed message to the callback `fn`.
     *
     * @api public
     */
    clearsign(str, args = []) {
        return this.call(str, args.concat(["--clearsign"]));
    }
    /**
     * Verify `str` and pass the output to the callback `fn`.
     *
     * @api public
     */
    verifySignature(str, args = []) {
        // Set logger fd, verify otherwise outputs to stderr for whatever reason
        return this.call(str, args.concat(["--logger-fd", "1", "--verify"]));
    }
    /**
     * Add a key to the keychain by filename.
     *
     * @api public
     */
    importKeyFromFile(fileName, args = []) {
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
    importKey(keyStr, args = []) {
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
            }
            else {
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
    removeKey(keyID, args = []) {
        // Set logger fd, verify otherwise outputs to stderr for whatever reason
        return this.call("", args.concat([
            "--no-tty",
            "--yes",
            "--logger-fd",
            "1",
            "--delete-secret-and-public-key",
            keyID,
        ]));
    }
    /**
     * Creates a key!
     *
     * @api public
     */
    generateKey(username, passphrase, args = []) {
        return this.call("", args.concat([
            "--no-tty",
            "--logger-fd",
            "1",
            "--passphrase",
            passphrase,
            "--quick-generate-key",
            username,
        ]));
    }
    /**
     * Exports a public key!
     *
     * @api public
     */
    exportPublicKey(username, args = []) {
        return this.call("", args.concat(["--logger-fd", "1", "--export", "-a", username])).then((buffer) => buffer === null || buffer === void 0 ? void 0 : buffer.toString());
    }
    /**
     * Exports a private key!
     *
     * @api public
     */
    exportPrivateKey(keygrip) {
        return this.options.reader
            .readFile(path_1.default.join(this.options.basedir, `/private-keys-v1.d/${keygrip}.key`))
            .catch((err) => Promise.reject(err.code === "ENOENT"
            ? new Error(`No key exists with keygrip ${keygrip}`)
            : err));
    }
    /**
     * Exports a private key as base64 string!
     *
     * @api public
     */
    exportPrivateKeyAsBase64(keygrip) {
        return this.exportPrivateKey(keygrip).then((buffer) => buffer === null || buffer === void 0 ? void 0 : buffer.toString("base64"));
    }
    /**
     * Lists keys!
     *
     * @api public
     */
    listKeys(args = []) {
        return this.call("", [
            "--no-tty",
            "--logger-fd",
            "1",
            "--list-keys",
            "--with-keygrip",
            ...args,
        ]).then((buffer) => {
            const message = buffer.toString();
            return parsers_1.parseKeysFromOutput(message);
        });
    }
    /**
     * Gets a keys by either its id, or username
     *
     * @api public
     */
    getKey(idOrUsername) {
        return this.listKeys([idOrUsername]).then((keys) => keys[0]);
    }
    /**
     * Check if a key exists
     *
     * @api public
     */
    exists(idOrUsername) {
        return this.getKey(idOrUsername)
            .then((key) => !!key)
            .catch(() => false);
    }
}
exports.GpgService = GpgService;
exports.gpg = new GpgService({
    spawnGPG: spawnGPG_1.spawnGPG,
    streaming: spawnGPG_1.streaming,
    reader: {
        readFile: fs_1.default.promises.readFile,
        readFileString: (filePath) => fs_1.default.promises.readFile(filePath, "utf8"),
    },
    writer: {
        writeFile: (filePath, content) => fs_1.default.promises.writeFile(filePath, content, {
            encoding: "utf8",
        }),
        unlink: fs_1.default.promises.unlink,
    },
    tempFolderPath: "./",
    idFactoryFn: uuid_1.v4,
    basedir: exports.GPG_UNIX_BASE_DIR,
    useSudo: false,
    quiet: true,
});
exports.default = exports.gpg;
//# sourceMappingURL=gpg.js.map