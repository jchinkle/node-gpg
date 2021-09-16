/// <reference types="node" />
import { WriteStream } from "fs";
import { IGpgOptions, IStreamingOptions } from "./types";
/**
 * Wrapper around spawning GPG. Handles stdout, stderr, and default args.
 */
export declare const spawnGPG: (input: string, args: string[], gpgOptions?: IGpgOptions) => Promise<void | Buffer>;
/**
 * Similar to spawnGPG, but sets up a read/write pipe to/from a stream.
 */
export declare const streaming: (options: IStreamingOptions, args: string[], gpgOptions?: IGpgOptions) => Promise<WriteStream>;
