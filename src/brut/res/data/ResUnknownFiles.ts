export default class ResUnknownFiles {
  private readonly mUnknownFiles: Map<string, string> = new Map();

  public addUnknownFileInfo(file: string, value: string): void {
    this.mUnknownFiles.set(file, value);
  }

  public getUnknownFiles(): Map<string, string> {
    return this.mUnknownFiles;
  }
}
