import Archiver from 'archiver';
import { normalize } from 'canonical-path';
import InvalidUnknownFileException from 'common/InvalidUnknownFileException';
import RootUnknownFileException from 'common/RootUnknownFileException';
import TraversalUnknownFileException from 'common/TraversalUnknownFileException';
import { buf as crc32FromBuffer } from 'crc-32';
import {
  createReadStream,
  lstatSync,
  PathLike,
  readdirSync,
  statSync
} from 'fs';
import { isAbsolute, sep } from 'path';
import { Readable, Writable } from 'stream';
import { Int, toInt } from 'types/Int';
import { ParseOne } from 'unzipper';

export default class BrutIO {
  public static copyAndClose(inp: Readable, out: Writable): void {
    try {
      inp.pipe(out, { end: true });
    } finally {
      inp.emit('close');
      out.emit('close');
    }
  }

  public static recursiveModifiedTimeMultiple(files: PathLike[]): BigInt {
    let modified: BigInt = 0n;
    for (const file of files) {
      const submodified: BigInt = this.recursiveModifiedTime(file);
      if (submodified > modified) {
        modified = submodified;
      }
    }
    return modified;
  }

  public static recursiveModifiedTime(file: PathLike): BigInt {
    let modified: BigInt = BigInt(new Date(statSync(file).mtime).getTime());
    if (lstatSync(file).isDirectory()) {
      const subfiles: PathLike[] = readdirSync(file);
      for (const subfile of subfiles) {
        const submodified = this.recursiveModifiedTime(subfile);
        if (submodified > modified) {
          modified = submodified;
        }
      }
    }
    return modified;
  }

  public static calculateCrc(buf: Buffer): Int {
    return toInt(crc32FromBuffer(buf));
  }

  public static sanitizeUnknownFile(
    directory: PathLike,
    entry: string
  ): string {
    if (entry.length === 0) {
      throw new InvalidUnknownFileException('Invalid Unknown File');
    }

    if (isAbsolute(entry)) {
      throw new RootUnknownFileException(
        'Absolute Unknown File is not allowed'
      );
    }

    const canonicalDirPath: string = normalize(directory.toString()) + sep;
    const canonicalEntryPath: string = normalize(
      directory.toString() + sep + entry.toString()
    );

    if (!canonicalEntryPath.startsWith(canonicalDirPath)) {
      throw new TraversalUnknownFileException(
        'Directory Traversal is not allowed'
      );
    }

    // https://stackoverflow.com/q/2375903/455008
    return canonicalEntryPath.substring(canonicalDirPath.length);
  }

  public static normalizePath(path: string): string {
    if (sep !== '/') {
      return normalize(path.replace(sep, '/'));
    }
    return normalize(path);
  }

  public static async copy(
    inputFile: PathLike,
    outputFile: Writable
  ): Promise<void> {
    const archive = Archiver('zip');
    archive.pipe(outputFile);
    archive.append(createReadStream(inputFile), { name: inputFile.toString() });
    return await archive.finalize();
  }

  public static async copyZE(
    inputFile: PathLike,
    outputFile: Writable,
    entry: RegExp
  ): Promise<void> {
    return await new Promise<void>((resolve, reject) => {
      const st: Writable = createReadStream(inputFile)
        .pipe(ParseOne(entry))
        .pipe(outputFile);
      st.on('finish', () => resolve());
      st.on('error', err => reject(err));
    });
  }
}
