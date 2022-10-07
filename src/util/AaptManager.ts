import { resolve } from 'canonical-path';
import BrutException from 'common/BrutException';
import { accessSync, chmodSync, constants, lstatSync, PathLike } from 'fs';
import { Int, toInt } from 'types/Int';
import Jar from './Jar';
import OS from './OS';
import OSDetection from './OSDetection';

export default class AaptManager {
  public static getAapt2(): PathLike | undefined {
    return this.getAapt(toInt(2));
  }

  public static getAapt1(): PathLike | undefined {
    return this.getAapt(toInt(1));
  }

  private static getAapt(version: Int): PathLike | undefined {
    let aaptBinary: PathLike = '';
    let aaptVersion: string = this.getAaptBinaryName(version);

    if (!OSDetection.is64Bit() && OSDetection.isMacOSX()) {
      throw new BrutException(
        '32 bit OS detected. No 32 bit binaries available.'
      );
    }

    // Set the 64 bit flag
    aaptVersion += OSDetection.is64Bit() ? '_64' : '';

    try {
      if (OSDetection.isMacOSX()) {
        aaptBinary = Jar.getResourceAsFile(
          '/prebuilt/macosx/' + aaptVersion,
          AaptManager
        );
      } else if (OSDetection.isUnix()) {
        aaptBinary = Jar.getResourceAsFile(
          '/prebuilt/linux/' + aaptVersion,
          AaptManager
        );
      } else if (OSDetection.isWindows()) {
        aaptBinary = Jar.getResourceAsFile(
          '/prebuilt/windows/' + aaptVersion + '.exe',
          AaptManager
        );
      } else {
        throw new BrutException(
          `Could not identify platform: ${OSDetection.returnOS()}`
        );
      }
    } catch (ex) {
      if (ex instanceof BrutException) {
        throw new BrutException(ex.message);
      }
    }

    try {
      chmodSync(aaptBinary, constants.X_OK);
      accessSync(aaptBinary, constants.X_OK);
      return aaptBinary;
    } catch (ex) {
      if (ex instanceof Error) {
        throw new BrutException(
          `Can't set aapt binary as executable\n${ex.stack!.toString()}`
        );
      }
    }
  }

  public static getAaptExecutionCommand(
    aaptPath: string,
    aapt: PathLike
  ): PathLike | undefined {
    if (aaptPath !== '') {
      try {
        accessSync(aaptPath, constants.R_OK);
      } catch (ex) {
        if (ex instanceof Error) {
          throw new BrutException(
            `binary could not be read: ${resolve(aaptPath)}`
          );
        }
      }
      try {
        chmodSync(aaptPath, constants.X_OK);
        accessSync(aaptPath, constants.X_OK);
        return resolve(aaptPath);
      } catch (ex) {
        if (ex instanceof Error) {
          throw new BrutException(
            `Can't set aapt binary (${resolve(
              aaptPath
            )}) as executable\n${ex.stack!.toString()}`
          );
        }
      }
    } else {
      return resolve(aapt.toString());
    }
  }

  public static async getAaptVersion(aaptLocation: string): Promise<Int> {
    if (!lstatSync(aaptLocation).isFile()) {
      throw new BrutException('Could not identify aapt binary as executable.');
    }
    chmodSync(aaptLocation, constants.X_OK);

    const cmd: string = `${resolve(aaptLocation)} version`;
    const verQueryRes: Error | { stdout: string; stderr: string } =
      await OS.exec(cmd);
    if (verQueryRes instanceof Error) {
      throw new BrutException(
        `Could not execute aapt binary at location: ${resolve(aaptLocation)}`
      );
    } else if (
      verQueryRes.stderr === null &&
      verQueryRes.stdout !== null &&
      verQueryRes.stderr === undefined &&
      verQueryRes.stdout !== undefined &&
      verQueryRes.stderr === '' &&
      verQueryRes.stdout !== ''
    ) {
      throw new BrutException(
        `Could not execute aapt binary at location: ${resolve(aaptLocation)}`
      );
    } else {
      return this.getAppVersionFromString(verQueryRes.stdout);
    }
  }

  public static getAaptBinaryName(version: Int): string {
    return 'aapt' + (version === 2 ? '2' : '');
  }

  public static getAppVersionFromString(version: string): Int {
    if (version.startsWith('Android Asset Packaging Tool (aapt) 2:')) {
      return toInt(2);
    } else if (version.startsWith('Android Asset Packaging Tool (aapt) 2.')) {
      return toInt(2); // Prior to Android SDK 26.0.2
    } else if (version.startsWith('Android Asset Packaging Tool, v0.')) {
      return toInt(1);
    }

    throw new BrutException(`aapt version could not be identified: ${version}`);
  }
}
