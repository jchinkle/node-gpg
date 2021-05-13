import fs, { WriteStream, ReadStream } from "fs";
import { Stream } from "stream";

export interface IStreamingOptions {
  source?: string | Stream | ReadStream;
  dest?: string | Stream | WriteStream;
}

export type SpawnGpgFn = (
  input: string,
  args: string[],
  gpgOptions?: Partial<IGpgOptions>
) => Promise<void | Buffer>;
export type StreamingFn = (
  options: IStreamingOptions,
  args: string[],
  gpgOptions?: Partial<IGpgOptions>
) => Promise<fs.WriteStream>;

export interface IGpgKey {
  created_at: string | Date;
  expires_at: string | Date;
  id: string;
  username: string;
  keygrip: string;
}

export interface IGpgOptions {
  spawnGPG?: SpawnGpgFn;
  streaming?: StreamingFn;
  basedir?: string;
  tempFolderPath?: string;
  reader?: {
    readFile: (filePath: string) => Promise<Buffer>;
    readFileString: (filePath: string) => Promise<string>;
  };
  writer?: {
    writeFile: (filePath: string, content: string | Buffer) => Promise<void>;
    unlink: (filePath: string) => Promise<void>;
  };
  idFactoryFn?: () => string;
  useSudo?: boolean;
  quiet?: boolean;
}
