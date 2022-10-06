/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { dirname } from 'canonical-path';
import BrutException from 'common/BrutException';
import InvalidUnknownFileException from 'common/InvalidUnknownFileException';
import RootUnknownFileException from 'common/RootUnknownFileException';
import TraversalUnknownFileException from 'common/TraversalUnknownFileException';
import { createWriteStream, mkdirSync, PathLike } from 'fs';
import { sep } from 'path';
import BrutIO from 'util/BrutIO';
import OS from 'util/OS';
import Directory from './Directory';
import DirectoryException from './DirectoryException';

export default class DirUtil {
  private constructor() {
    // pass through
  }

  public static copyToDir(inp: Directory, out: Directory): void {
    for (const fileName of inp.getFilesRecursive()) {
      DirUtil.copyToDirF(inp, out, fileName);
    }
  }

  public static copyToDirF(
    inp: Directory,
    out: Directory,
    fileName: string
  ): void {
    DirUtil.copyToDirIOF(inp, out, fileName, fileName);
  }

  public static copyToDirFMult(
    inp: Directory,
    out: Directory,
    fileNames: string[]
  ): void {
    for (const fileName of fileNames) {
      DirUtil.copyToDirF(inp, out, fileName);
    }
  }

  public static copyToDirIOF(
    inp: Directory,
    out: Directory,
    inFileName: string,
    outFileName: string
  ): void {
    try {
      if (inp.containsDir(inFileName)) {
        inp.getDir(inFileName).copyToDir(out.createDir(outFileName));
      } else {
        BrutIO.copyAndClose(
          inp.getFileReadable(inFileName),
          out.getFileWritable(inFileName)
        );
      }
    } catch (ex) {
      if (ex instanceof Error) {
        throw new DirectoryException(
          `Error copying file: ${inFileName}\n${ex.stack}`
        );
      }
    }
  }

  public static copyToDirFile(inp: Directory, out: PathLike): void {
    for (const fileName of inp.getFilesRecursive()) {
      this.copyToDirFileF(inp, out, fileName);
    }
  }

  public static copyToDirFileF(
    inp: Directory,
    out: PathLike,
    fileName: string
  ): void {
    this.copyToDirFileFMult(inp, out, [fileName]);
  }

  public static copyToDirFileFMult(
    inp: Directory,
    out: PathLike,
    fileNames: string[]
  ): void {
    for (const fileName of fileNames) {
      try {
        if (inp.containsDir(fileName)) {
          OS.rmdir(out.toString() + sep + fileName);
          inp
            .getDir(fileName)
            .copyToDirFile(createWriteStream(out.toString() + sep + fileName));
        } else {
          if (fileName === 'res' && !inp.containsFile(fileName)) {
            return;
          }
          const cleanedFilename: string = BrutIO.sanitizeUnknownFile(
            out,
            fileName
          );
          const outFile: PathLike = out.toString() + sep + cleanedFilename;
          mkdirSync(dirname(outFile.toString()));
          BrutIO.copyAndClose(
            inp.getFileReadable(fileName),
            createWriteStream(outFile)
          );
        }
      } catch (ex) {
        if (
          ex instanceof RootUnknownFileException ||
          ex instanceof InvalidUnknownFileException ||
          ex instanceof TraversalUnknownFileException
        ) {
          console.warn(`Skipping file ${fileName} (${ex.stack})`);
        } else if (ex instanceof BrutException || ex instanceof Error) {
          throw new DirectoryException(
            `Error copying file: ${fileName}\n${ex.stack}`
          );
        }
      }
    }
  }
}
