import { Int, toInt } from 'types/Int';

export default class BuildOptions {
  public forceBuildAll: boolean = false;
  public forceDeleteFramework: boolean = false;
  public debugMode: boolean = false;
  public netSecConf: boolean = false;
  public verbose: boolean = false;
  public copyOriginalFiles: boolean = false;
  public updateFiles: boolean = false;
  public isFramework: boolean = false;
  public resourcesAreCompressed: boolean = false;
  public useAapt2: boolean = false;
  public noCrunch: boolean = false;
  public forceApi: Int = toInt(0);
  public doNotCompress: string[];

  public frameworkFolderLocation: string = '';
  public frameworkTag: string = '';
  public aaptPath: string = '';

  public aaptVersion: Int = toInt(1);

  public isAapt2(): boolean {
    return this.useAapt2 || this.aaptVersion === 2;
  }
}
