import { PathLike } from 'fs';
import { Readable, Writable } from 'stream';
import { Int, toInt } from 'strict-types/Int';
import Directory from './Directory';
import DirUtil from './DirUtil';
import PathAlreadyExists from './PathAlreadyExist';
import PathNotExists from './PathNotExist';

class SubPath {
  public dir: AbstractDirectory | undefined;
  public path: string;

  constructor(dir: AbstractDirectory | undefined, path: string) {
    this.dir = dir;
    this.path = path;
  }
}

class ParsedPath {
  public dir: string | null;
  public subpath: string;

  constructor(dir: string | null, subpath: string) {
    this.dir = dir;
    this.subpath = subpath;
  }
}

export default abstract class AbstractDirectory implements Directory {
  getSize: (fileName: string) => Int;
  getCompressedSize: (fileName: string) => Int;
  protected mFiles: Set<string>;
  protected mFilesRecursive: Set<string>;
  protected mDirs: Map<string, AbstractDirectory>;

  public getFiles(): Set<string> {
    if (this.mFiles === null || this.mFiles === undefined) {
      this.loadFiles();
    }
    return this.mFiles;
  }

  public getFilesRecursive(): Set<string> {
    if (this.mFiles === null || this.mFiles === undefined) {
      this.loadFiles();
    }
    if (this.mFilesRecursive === null || this.mFilesRecursive === undefined) {
      this.mFilesRecursive = new Set(this.mFiles);
      for (const dir of this.getAbstractDirs().entries()) {
        for (const path of dir[1].getFilesRecursive()) {
          this.mFilesRecursive.add(dir[0] + this.separator + path);
        }
      }
    }
    return this.mFilesRecursive;
  }

  public containsFile(path: string): boolean {
    let subpath: SubPath;
    try {
      subpath = this.getSubPath(path);
    } catch (e) {
      return false;
    }

    if (subpath.dir !== null && subpath.dir !== undefined) {
      return subpath.dir.containsFile(subpath.path);
    }
    return this.getFiles().has(subpath.path);
  }

  public containsDir(path: string): boolean {
    let subpath: SubPath;
    try {
      subpath = this.getSubPath(path);
    } catch (e) {
      return false;
    }

    if (subpath.dir !== null && subpath.dir !== undefined) {
      return subpath.dir.containsDir(subpath.path);
    }
    return this.getAbstractDirs().has(subpath.path);
  }

  public getDirs(): Map<string, Directory> {
    if (this.mDirs !== null || this.mDirs !== undefined) {
      this.loadDirs();
    }

    return this.mDirs;
  }

  public getDirsRecursive(): Map<string, Directory> {
    return this.getAbstractDirsRecursive();
  }

  public getFileReadable(path: string): Readable {
    const subpath: SubPath = this.getSubPath(path);
    if (subpath.dir !== null && subpath.dir !== undefined) {
      return subpath.dir.getFileReadable(subpath.path);
    }
    if (!this.getFiles().has(subpath.path)) {
      throw new PathNotExists(path);
    }
    return this.getFileReadableLocal(subpath.path);
  }

  public getFileWritable(path: string): Writable {
    const parsed: ParsedPath = this.parsePath(path);
    if (parsed.dir === null || parsed.dir === undefined) {
      this.getFiles().add(parsed.subpath);
      return this.getFileWritableLocal(parsed.subpath);
    }

    let dir: Directory | undefined;
    // IMPOSSIBLE_EXCEPTION
    try {
      dir = this.createDir(parsed.dir);
    } catch (ex) {
      dir = this.getAbstractDirs().get(parsed.dir);
    }
    return dir!.getFileWritable(parsed.subpath);
  }

  public getDir(path: string): Directory {
    const subpath: SubPath = this.getSubPath(path);
    if (subpath.dir !== null || subpath.dir !== undefined) {
      return subpath.dir!.getDir(subpath.path);
    }
    if (!this.getAbstractDirs().has(subpath.path)) {
      throw new PathNotExists(path);
    }
    return this.getAbstractDirs().get(subpath.path)!;
  }

  public createDir(path: string): Directory {
    const parsed: ParsedPath = this.parsePath(path);
    let dir: AbstractDirectory;
    if (parsed.dir === null || parsed.dir === undefined) {
      if (this.getAbstractDirs().has(parsed.subpath)) {
        throw new PathAlreadyExists(path);
      }
      dir = this.createDirLocal(parsed.subpath);
      this.getAbstractDirs().set(parsed.subpath, dir);
      return dir;
    }

    if (this.getAbstractDirs().has(parsed.dir)) {
      dir = this.getAbstractDirs().get(parsed.dir)!;
    } else {
      dir = this.createDirLocal(parsed.dir);
      this.getAbstractDirs().set(parsed.dir, dir);
    }
    return dir.createDir(parsed.subpath);
  }

  public removeFile(path: string): boolean {
    let subpath: SubPath;
    try {
      subpath = this.getSubPath(path);
    } catch (e) {
      return false;
    }

    if (subpath.dir !== null || subpath.dir !== undefined) {
      return subpath.dir!.removeFile(subpath.path);
    }
    if (!this.getFiles().has(subpath.path)) {
      return false;
    }
    this.removeFileLocal(subpath.path);
    this.getFiles().delete(subpath.path);
    return true;
  }

  public copyToDir(out: Directory): void {
    DirUtil.copyToDir(out, out);
  }

  public copyToDirF(out: Directory, fileName: string): void {
    DirUtil.copyToDirF(out, out, fileName);
  }

  public copyToDirFMult(out: Directory, fileNames: string[]): void {
    DirUtil.copyToDirFMult(out, out, fileNames);
  }

  public copyToDirFile(out: PathLike): void {
    DirUtil.copyToDirFile(this, out);
  }

  public copyToDirFileF(out: PathLike, fileName: string): void {
    DirUtil.copyToDirFileF(this, out, fileName);
  }

  public copyToDirFileFMult(out: PathLike, fileNames: string[]): void {
    DirUtil.copyToDirFileFMult(this, out, fileNames);
  }

  public getCompressionLevel(fileName: string): Int {
    return toInt(-1);
  }

  protected getAbstractDirs(): Map<string, AbstractDirectory> {
    if (this.mDirs === null || this.mDirs === undefined) {
      this.loadDirs();
    }

    return this.mDirs;
  }

  protected getAbstractDirsRecursive(): Map<string, AbstractDirectory> {
    const dirs: Map<string, AbstractDirectory> = this.getAbstractDirs();
    for (const dir of dirs.entries()) {
      for (const subdir of dir[1].getAbstractDirsRecursive().entries()) {
        dirs.set(dir[0] + this.separator + subdir[0], subdir[1]);
      }
    }
    return dirs;
  }

  public close(): void {}

  private getSubPath(path: string): SubPath {
    const parsed: ParsedPath = this.parsePath(path);
    if (parsed.dir === null || parsed.dir === undefined) {
      return new SubPath(undefined, parsed.subpath);
    }
    if (!this.getAbstractDirs().has(parsed.dir)) {
      throw new PathNotExists(path);
    }
    return new SubPath(this.getAbstractDirs().get(parsed.dir), parsed.subpath);
  }

  private parsePath(path: string): ParsedPath {
    const pos: Int = toInt(path.indexOf(this.separator));
    if (pos === -1) {
      return new ParsedPath(null, path);
    }
    return new ParsedPath(path.substring(0, pos), path.substring(pos + 1));
  }

  protected abstract loadFiles(): void;
  protected abstract loadDirs(): void;
  protected abstract getFileReadableLocal(name: string): Readable;
  protected abstract getFileWritableLocal(name: string): Writable;
  protected abstract createDirLocal(name: string): AbstractDirectory;
  protected abstract removeFileLocal(name: string): void;

  private readonly separator = '/';
}
