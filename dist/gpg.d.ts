/*!
 * node-gpg
 * Copyright(c) 2011 Nicholas Penree <drudge@conceited.net>
 * MIT Licensed
 */
/// <reference types="node" />
/**
 * Module dependencies.
 */
import fs from "fs";
import { Stream } from "stream";
import { IGpgKey, IGpgOptions, IStreamingOptions } from "./types";
export declare const GPG_UNIX_BASE_DIR: string;
export declare const GPG_WINDOWS_BASE_DIR: string;
export declare class GpgService {
    private options;
    constructor(options: IGpgOptions);
    /**
     * Raw call to gpg.
     */
    call(input: string, args: string[]): Promise<Buffer>;
    /**
     * Raw streaming call to gpg. Reads from input file and writes to output file.
     *
     * @api public
     */
    callStreaming(options: IStreamingOptions, args: string[]): Promise<fs.WriteStream>;
    setExecutablePath(executablePath: string): GpgService;
    setTempFolderPath(tempFolderPath: string): GpgService;
    setBaseDir(basedir: string): GpgService;
    useSudo(value: boolean): GpgService;
    setQuiet(quiet: boolean): GpgService;
    /**
     * Encrypt source file passed as `options.source` and store it in a file specified in `options.dest`.
     *
     * @api public
     */
    encryptToFile(options: IStreamingOptions): Promise<fs.WriteStream>;
    /**
     * Encrypt source `file` and pass the encrypted contents to the callback `fn`.
     *
     * @param {String}   file   Filename.
     * @param {Function} [fn]   Callback containing the encrypted file contents.
     * @api public
     */
    encryptFile(file: string, recipientUsernames?: string[]): Promise<Buffer>;
    /**
     * Encrypt source stream passed as `options.source` and pass it to the stream specified in `options.dest`.
     * Is basicaly the same method as `encryptToFile()`.
     *
     * @api public
     */
    encryptToStream(options: IStreamingOptions, recipientUsernames?: string[]): Promise<fs.WriteStream>;
    /**
     * Encrypt source `stream` and pass the encrypted contents to the callback `fn`.
     *
     * @api public
     */
    encryptStream(stream: Stream, recipientUsernames?: string[]): Promise<Buffer>;
    /**
     * Encrypt `str` and pass the encrypted version to the callback `fn`.
     *
     * @api public
     */
    encrypt(str: string | Buffer, recipientUsernames?: string[]): Promise<Buffer>;
    /**
     * Decrypt `str` and pass the decrypted version to the callback `fn`.
     *
     * @api public
     */
    decrypt(str: string | Buffer, passphrase: string): Promise<Buffer>;
    /**
     * Decrypt source `file` and pass the decrypted contents to the callback `fn`.
     *
     * @api public
     */
    decryptFile(file: string, passphrase: string): Promise<Buffer>;
    /**
     * Decrypt source file passed as `options.source` and store it in a file specified in `options.dest`.
     *
     * @api public
     */
    decryptToFile(options: IStreamingOptions): Promise<fs.WriteStream>;
    /**
     * Decrypt source `stream` and pass the decrypted contents to the callback `fn`.
     *
     * @api public
     */
    decryptStream(stream: Stream, passphrase: string): Promise<Buffer>;
    /**
     * Decrypt source stream passed as `options.source` and pass it to the stream specified in `options.dest`.
     * This is basicaly the same method as `decryptToFile()`.
     *
     * @api public
     */
    decryptToStream(options: IStreamingOptions): Promise<fs.WriteStream>;
    /**
     * Clearsign `str` and pass the signed message to the callback `fn`.
     *
     * @api public
     */
    clearsign(str: string | Buffer, args?: string[]): Promise<Buffer>;
    /**
     * Verify `str` and pass the output to the callback `fn`.
     *
     * @api public
     */
    verifySignature(str: string | Buffer, args?: string[]): Promise<Buffer>;
    /**
     * Add a key to the keychain by filename.
     *
     * @api public
     */
    importKeyFromFile(fileName: string, args?: string[]): Promise<{
        fingerprint: string;
        result: string;
    }>;
    /**
     * Add an ascii-armored key to gpg. Expects the key to be passed as input.
     *
     * @param {String}   keyStr  Key string (armored).
     * @param {Array}    args    Optional additional arguments to pass to gpg.
     * @param {Function} fn      Callback containing the signed message Buffer.
     * @api public
     */
    importKey(keyStr: string, args?: string[]): Promise<{
        fingerprint: string;
        result: string;
    }>;
    /**
     * Removes a key by fingerprint. Warning: this will remove both pub and privkeys!
     *
     * @param {String}   keyID  Key fingerprint.
     * @param {Array}    [args] Array of additonal gpg arguments.
     * @param {Function} fn     Callback containing the signed message Buffer.
     * @api public
     */
    removeKey(keyID: string, args?: string[]): Promise<Buffer>;
    /**
     * Creates a key!
     *
     * @api public
     */
    generateKey(username: string, passphrase: string, args?: string[]): Promise<Buffer>;
    /**
     * Exports a public key!
     *
     * @api public
     */
    exportPublicKey(username: string, args?: string[]): Promise<string>;
    /**
     * Exports a private key!
     *
     * @api public
     */
    exportPrivateKey(keygrip: string): Promise<Buffer>;
    /**
     * Exports a private key as base64 string!
     *
     * @api public
     */
    exportPrivateKeyAsBase64(keygrip: string): Promise<string>;
    /**
     * Lists keys!
     *
     * @api public
     */
    listKeys(args?: string[]): Promise<IGpgKey[]>;
    /**
     * Gets a keys by either its id, or username
     *
     * @api public
     */
    getKey(idOrUsername: string): Promise<IGpgKey>;
    /**
     * Check if a key exists
     *
     * @api public
     */
    exists(idOrUsername: string): Promise<boolean>;
}
export declare const gpg: GpgService;
export default gpg;
