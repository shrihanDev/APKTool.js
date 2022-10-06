import { PathLike } from 'fs';
import { Readable, Writable } from 'stream';
import { Int } from 'strict-types/Int';

export default interface Directory {
  getFiles: () => Set<string>;
  getFilesRecursive: () => Set<string>;
  getDirs: () => Map<string, Directory>;
  getDirsRecursive: () => Map<string, Directory>;
  containsFile: (path: string) => boolean;
  containsDir: (path: string) => boolean;
  getFileReadable: (path: string) => Readable;
  getFileWritable: (path: string) => Writable;
  getDir: (path: string) => Directory;
  createDir: (path: string) => Directory;
  removeFile: (path: string) => boolean;
  copyToDir: (out: Directory) => void;
  copyToDirF: (out: Directory, fileName: string) => void;
  copyToDirFMult: (out: Directory, fileNames: string[]) => void;
  copyToDirFile: (out: PathLike) => void;
  copyToDirFileF: (out: PathLike, fileName: string) => void;
  copyToDirFileFMult: (out: PathLike, fileNames: string[]) => void;
  getSize: (fileName: string) => Int;
  getCompressedSize: (fileName: string) => Int;
  getCompressionLevel: (fileName: string) => Int;
  close: () => void;
}
