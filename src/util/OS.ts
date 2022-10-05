import { exec } from 'child_process';
import BrutException from 'common/BrutException';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  PathLike,
  readdirSync,
  rmdirSync,
  rmSync
} from 'fs';
import { sep } from 'path';
import { promisify } from 'util';

export default class OS {
  public static rmdir(dir: PathLike): void {
    if (!existsSync(dir)) {
      // do nothing
    } else {
      const files: PathLike[] = readdirSync(dir);
      if (files === null || files === undefined) {
        // do nothing
      } else {
        for (const file of files) {
          if (lstatSync(file).isDirectory()) {
            this.rmdir(file);
          } else {
            rmSync(file);
          }
        }
      }
    }
    rmdirSync(dir);
  }

  public static rmFile(file: string): void {
    rmSync(file);
  }

  public static cpdir(src: PathLike, dest: PathLike): void {
    mkdirSync(dest);
    const files: PathLike[] = readdirSync(src);
    if (files === null || files === undefined) {
      // do nothing
    } else {
      for (const file of files) {
        const destFile: PathLike = (dest.toString() +
          sep +
          file.toString()) as PathLike;
        if (lstatSync(destFile).isDirectory()) {
          this.cpdir(file, destFile);
          continue;
        }
        try {
          copyFileSync(file, destFile);
        } catch (ex) {
          if (ex instanceof Error) {
            throw new BrutException(
              `Could not copy file: ${file.toString()}\n${ex.stack ?? ''}`
            );
          }
        }
      }
    }
  }

  public static async exec(
    cmd: string
  ): Promise<{ stdout: string; stderr: string } | Error> {
    try {
      const result: { stdout: string; stderr: string } = await promisify(exec)(
        cmd
      );
      return result;
    } catch (ex) {
      return ex as Error;
    }
  }
}
