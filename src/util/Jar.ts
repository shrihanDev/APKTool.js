import BrutException from 'common/BrutException';
import { copyFileSync, existsSync, PathLike } from 'fs';
import { sep } from 'path';
import { FileResult, fileSync, tmpdir } from 'tmp';

export default abstract class Jar {
  private static readonly mExtracted: Map<string, PathLike> = new Map();

  public static getResourceAsFile(name: string, clazz: Object): PathLike {
    let file: PathLike | undefined = this.mExtracted.get(name);
    if (file === null || file === undefined) {
      file = this.extractToTmp(name, clazz);
      this.mExtracted.set(name, file);
    }
    return file;
  }

  public static extractToTmp(resourcePath: PathLike, clazz: Object): PathLike {
    return this.extractToTmpPref(resourcePath, 'brut_util_Jar_', clazz)!;
  }

  public static extractToTmpPref(
    resourcePath: PathLike,
    tmpPrefix: string,
    clazz: Object
  ): PathLike | undefined {
    try {
      if (!existsSync(resourcePath)) {
        throw new Error(`ENOENT: ${resourcePath as string}`);
      }
      const fileOut: FileResult = fileSync({
        prefix: tmpPrefix,
        postfix: '.tmp'
      });
      const tmpFilePath: PathLike = tmpdir + sep + fileOut.name;
      copyFileSync(resourcePath, tmpFilePath);
      return tmpFilePath;
    } catch (ex) {
      if (ex instanceof Error) {
        throw new BrutException(
          `Could not extract resource: ${resourcePath.toString()}\n${ex.stack!}`
        );
      }
    }
  }
}
