"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streaming = exports.spawnGPG = void 0;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const readStream = fs_1.default.createReadStream;
const writeStream = fs_1.default.createWriteStream;
// Wrapper around spawn. Catches error events and passed global args.
const spawnIt = async (args, gpgOptions) => {
    return new Promise((resolve, reject) => {
        const globalArgs = ["--batch", ...(gpgOptions.quiet ? ["--quiet"] : [])];
        const gpg = (gpgOptions === null || gpgOptions === void 0 ? void 0 : gpgOptions.useSudo)
            ? child_process_1.spawn("sudo", [((gpgOptions === null || gpgOptions === void 0 ? void 0 : gpgOptions.executablePath) ? gpgOptions === null || gpgOptions === void 0 ? void 0 : gpgOptions.executablePath : 'gpg')].concat(globalArgs.concat(args || [])))
            : child_process_1.spawn(((gpgOptions === null || gpgOptions === void 0 ? void 0 : gpgOptions.executablePath) ? gpgOptions === null || gpgOptions === void 0 ? void 0 : gpgOptions.executablePath : 'gpg'), globalArgs.concat(args || []));
        gpg.on("error", reject);
        resolve(gpg);
    });
};
// Check if input is stream with duck typing
const isStream = (stream) => {
    return (stream != null &&
        typeof stream === "object" &&
        typeof stream.pipe === "function");
};
/**
 * Wrapper around spawning GPG. Handles stdout, stderr, and default args.
 */
const spawnGPG = async (input, args, gpgOptions) => {
    const buffers = [];
    let buffersLength = 0;
    let errors = "";
    let warnings = "";
    return spawnIt(args, gpgOptions).then((gpg) => {
        return new Promise((resolve, reject) => {
            gpg.stdout.on("data", function (buf) {
                buffers.push(buf);
                buffersLength += buf.length;
            });
            gpg.stderr.on("data", function (buf) {
                const message = buf.toString("utf8");
                if (message.includes("gpg: WARNING")) {
                    warnings += message;
                }
                else {
                    errors += message;
                }
            });
            gpg.on("close", function (code) {
                const message = Buffer.concat(buffers, buffersLength);
                if (code !== 0) {
                    // If error is empty, we probably redirected stderr to stdout (for verifySignature, import, etc)
                    reject(errors || message.toString("utf8"));
                }
                if (warnings !== "") {
                    console.warn(warnings);
                }
                if (errors !== "") {
                    reject({
                        error: errors,
                        message: message.toString("utf8"),
                    });
                }
                else {
                    resolve(message);
                }
            });
            gpg.stdin.end(input);
        });
    });
};
exports.spawnGPG = spawnGPG;
/**
 * Similar to spawnGPG, but sets up a read/write pipe to/from a stream.
 */
const streaming = async (options, args, gpgOptions) => {
    return new Promise((resolve, reject) => {
        options = options || {};
        const isSourceStream = isStream(options.source);
        const isDestStream = isStream(options.dest);
        if (typeof options.source !== "string" && !isSourceStream) {
            return reject(new Error("Missing 'source' option (string or stream)"));
        }
        else if (typeof options.dest !== "string" && !isDestStream) {
            return reject(new Error("Missing 'dest' option (string or stream)"));
        }
        let sourceStream;
        if (!isSourceStream) {
            // This will throw if the file doesn't exist
            try {
                sourceStream = readStream(options.source);
            }
            catch (e) {
                return reject(new Error(options.source + " does not exist. Error: " + e.message));
            }
        }
        else {
            sourceStream = options.source;
        }
        let destStream;
        if (!isDestStream) {
            try {
                destStream = writeStream(options.dest);
            }
            catch (e) {
                return reject(new Error("Error opening " + options.dest + ". Error: " + e.message));
            }
        }
        else {
            destStream = options.dest;
        }
        // Go for it
        spawnIt(args, gpgOptions).then((gpg) => {
            if (!isDestStream) {
                gpg.on("close", function () {
                    resolve(null);
                });
            }
            else {
                resolve(destStream);
            }
            // Pipe input file into gpg stdin; gpg stdout into output file..
            sourceStream.pipe(gpg.stdin);
            gpg.stdout.pipe(destStream);
        });
    });
};
exports.streaming = streaming;
//# sourceMappingURL=spawnGPG.js.map