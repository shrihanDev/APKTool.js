export default class OSDetection {
  private static readonly OS: string = process.platform;
  private static readonly ARCH: string = process.arch;

  public static isWindows(): boolean {
    return this.OS.includes('win');
  }

  public static isMacOSX(): boolean {
    return this.OS.includes('mac');
  }

  public static isUnix(): boolean {
    return (
      this.OS.includes('nix') ||
      this.OS.includes('nux') ||
      this.OS.includes('aix') ||
      this.OS.includes('sunos')
    );
  }

  public static is64Bit(): boolean {
    if (this.isWindows()) {
      const arch: string | undefined = process.env.PROCESSOR_ARCHITECTURE;
      const wow64Arch: string | undefined =
        process.env.PROCESSOR_ARCHITECTUREW6432;
      return (
        (arch !== '' && arch !== undefined && arch.endsWith('64')) ||
        (wow64Arch !== '' &&
          wow64Arch !== undefined &&
          wow64Arch.endsWith('64'))
      );
    }
    return this.ARCH.toLowerCase() === 'x64';
  }

  public static returnOS(): string {
    return this.OS;
  }
}
