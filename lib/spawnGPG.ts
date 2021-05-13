import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import fs, { WriteStream } from "fs";
import { IStreamingOptions } from "./types";

const globalArgs = ["--batch"];
const readStream = fs.createReadStream;
const writeStream = fs.createWriteStream;

// Wrapper around spawn. Catches error events and passed global args.
const spawnIt = async (
  args: string[],
  gpgOptions?: { useSudo: boolean }
): Promise<ChildProcessWithoutNullStreams> => {
  return new Promise((resolve, reject) => {
    const gpg = gpgOptions?.useSudo
      ? spawn("sudo", ["gpg"].concat(globalArgs.concat(args || [])))
      : spawn("gpg", globalArgs.concat(args || []));
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
  gpgOptions?: { useSudo: boolean }
): Promise<void | Buffer> => {
  const buffers = [];
  let buffersLength = 0;
  let error = "";
  return spawnIt(args, gpgOptions).then((gpg) => {
    return new Promise((resolve, reject) => {
      gpg.stdout.on("data", function (buf: Buffer) {
        buffers.push(buf);
        buffersLength += buf.length;
      });

      gpg.stderr.on("data", function (buf: Buffer) {
        error += buf.toString("utf8");
      });

      gpg.on("close", function (code) {
        const message = Buffer.concat(buffers, buffersLength);
        if (code !== 0) {
          // If error is empty, we probably redirected stderr to stdout (for verifySignature, import, etc)
          reject(error || message.toString("utf8"));
        }

        if (error !== "") {
          reject({
            error,
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
  gpgOptions?: { useSudo: boolean }
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
