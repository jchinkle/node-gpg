import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import fs, { WriteStream } from "fs";
import { IGpgOptions, IStreamingOptions } from "./types";

const readStream = fs.createReadStream;
const writeStream = fs.createWriteStream;

// Wrapper around spawn. Catches error events and passed global args.
const spawnIt = async (
  args: string[],
  gpgOptions?: IGpgOptions
): Promise<ChildProcessWithoutNullStreams> => {
  return new Promise((resolve, reject) => {
    const globalArgs = ["--batch", ...(gpgOptions.quiet ? ["--quiet"] : [])];
    const gpg = gpgOptions?.useSudo
      ? spawn("sudo", [(gpgOptions?.executablePath ? gpgOptions?.executablePath : 'gpg')].concat(globalArgs.concat(args || [])))
      : spawn((gpgOptions?.executablePath ? gpgOptions?.executablePath : 'gpg'), globalArgs.concat(args || []));
    gpg.on("error", reject);
    resolve(gpg);
  });
};

// Check if input is stream with duck typing
const isStream = (stream) => {
  return (
    stream != null &&
    typeof stream === "object" &&
    typeof stream.pipe === "function"
  );
};

/**
 * Wrapper around spawning GPG. Handles stdout, stderr, and default args.
 */
export const spawnGPG = async (
  input: string,
  args: string[],
  gpgOptions?: IGpgOptions
): Promise<void | Buffer> => {
  const buffers = [];
  let buffersLength = 0;
  let errors = "";
  let warnings = "";
  return spawnIt(args, gpgOptions).then((gpg) => {
    return new Promise((resolve, reject) => {
      gpg.stdout.on("data", function (buf: Buffer) {
        buffers.push(buf);
        buffersLength += buf.length;
      });

      gpg.stderr.on("data", function (buf: Buffer) {
        const message = buf.toString("utf8");
        if (message.includes("gpg: WARNING")) {
          warnings += message;
        } else {
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
        } else {
          resolve(message);
        }
      });

      gpg.stdin.end(input);
    });
  });
};

/**
 * Similar to spawnGPG, but sets up a read/write pipe to/from a stream.
 */
export const streaming = async (
  options: IStreamingOptions,
  args: string[],
  gpgOptions?: IGpgOptions
): Promise<WriteStream> => {
  return new Promise((resolve, reject) => {
    options = options || {};

    const isSourceStream = isStream(options.source);
    const isDestStream = isStream(options.dest);

    if (typeof options.source !== "string" && !isSourceStream) {
      return reject(new Error("Missing 'source' option (string or stream)"));
    } else if (typeof options.dest !== "string" && !isDestStream) {
      return reject(new Error("Missing 'dest' option (string or stream)"));
    }

    let sourceStream;
    if (!isSourceStream) {
      // This will throw if the file doesn't exist
      try {
        sourceStream = readStream(options.source as string);
      } catch (e) {
        return reject(
          new Error(options.source + " does not exist. Error: " + e.message)
        );
      }
    } else {
      sourceStream = options.source;
    }

    let destStream: WriteStream;
    if (!isDestStream) {
      try {
        destStream = writeStream(options.dest as string);
      } catch (e) {
        return reject(
          new Error("Error opening " + options.dest + ". Error: " + e.message)
        );
      }
    } else {
      destStream = options.dest as WriteStream;
    }

    // Go for it
    spawnIt(args, gpgOptions).then((gpg) => {
      if (!isDestStream) {
        gpg.on("close", function () {
          resolve(null);
        });
      } else {
        resolve(destStream);
      }

      // Pipe input file into gpg stdin; gpg stdout into output file..
      sourceStream.pipe(gpg.stdin);
      gpg.stdout.pipe(destStream as WriteStream);
    });
  });
};
