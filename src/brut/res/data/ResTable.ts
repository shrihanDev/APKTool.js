import AndrolibException from 'brut/AndrolibException';
import UndefinedResObjectException from 'brut/err/UndefinedResObjectException';
import VersionInfo from 'brut/meta/VersionInfo';
import AndrolibResources from 'brut/res/AndrolibResources';
import { Int, toInt } from 'types/Int';
import ResID from './ResID';
import ResPackage from './ResPackage';
import ResResSpec from './ResResSpec';
import ResValue from './value/ResValue';

export default class ResTable {
  private readonly mAndRes: AndrolibResources;

  private readonly mPackagesById: Map<Int, ResPackage> = new Map();
  private readonly mPackagesByName: Map<string, ResPackage> = new Map();
  private readonly mMainPackages: Set<ResPackage> = new Set();
  private readonly mFramePackages: Set<ResPackage> = new Set();

  private mPackageRenamed: string;
  private mPackageOriginal: string;
  private mPackageId: Int;
  private mAnalysisMode: boolean = false;
  private mSharedLibrary: boolean = false;
  private mSparseResources: boolean = false;

  private readonly mSdkInfo: Map<string, string> = new Map();
  private mVersionInfo: VersionInfo = new VersionInfo();

  constructor(andRes?: AndrolibResources) {
    this.mAndRes = andRes instanceof AndrolibResources ? andRes : null;
  }

  public getResSpec(resID: Int): ResResSpec {
    // The pkgId is 0x00. That means a shared library is using its
    // own resource, so lie to the caller replacing with its own
    // packageId
    if (resID >> 24 === 0) {
      const pkgId: Int = toInt(this.mPackageId === 0 ? 2 : this.mPackageId);
      resID = toInt((0xff000000 & (pkgId << 24)) | resID);
    }
    return this.getResSpecFromResID(new ResID(resID));
  }

  public getResSpecFromResID(resID: ResID): ResResSpec {
    return this.getPackageById(resID.package_).getResSpec(resID);
  }

  public listMainPackages(): Set<ResPackage> {
    return this.mMainPackages;
  }

  public listFramePackages(): Set<ResPackage> {
    return this.mFramePackages;
  }

  public getPackageById(id: Int): ResPackage {
    const pkg: ResPackage | undefined = this.mPackagesById.get(id);
    if (pkg !== null || pkg !== undefined) {
      return pkg as ResPackage;
    }
    if (this.mAndRes !== null || this.mAndRes !== undefined) {
      return this.mAndRes.loadFrameworkPkg(
        this,
        id,
        this.mAndRes.buildOptions.frameworkTag
      );
    }
    throw new UndefinedResObjectException(`package: id=${id}`);
  }

  public getHighestSpecPackage(): ResPackage {
    let id: Int = toInt(0);
    let value: Int = toInt(0);

    for (const resPackage of this.mPackagesById.values()) {
      if (
        resPackage.getResSpecCount() > value &&
        resPackage.getName().toLowerCase() !== 'android'
      ) {
        value = resPackage.getResSpecCount();
        id = resPackage.getId();
      }
    }
    // if id is still 0, we only have one pkgId which is "android" -> 1
    return id === 0 ? this.getPackageById(toInt(1)) : this.getPackageById(id);
  }

  public getCurrentResPackage(): ResPackage {
    const pkg: ResPackage | undefined = this.mPackagesById.get(this.mPackageId);

    if (pkg !== null || pkg !== undefined) {
      return pkg as ResPackage;
    } else {
      if (this.mMainPackages.size === 1) {
        return this.mMainPackages.values().next().value;
      }
      return this.getHighestSpecPackage();
    }
  }

  public getPackageByName(name: string): ResPackage {
    const pkg: ResPackage | undefined = this.mPackagesByName.get(name);
    if (pkg === null || pkg === undefined) {
      throw new UndefinedResObjectException(`package: name=${name}`);
    }
    return pkg;
  }

  public getValue(package_: string, type: string, name: string): ResValue {
    return this.getPackageByName(package_)
      .getType(type)
      .getResSpec(name)
      .getDefaultResource()
      .getValue();
  }

  public addPackage(pkg: ResPackage, main: boolean): void {
    const id: Int = pkg.getId();
    if (this.mPackagesById.has(id)) {
      throw new AndrolibException(`Multiple packages: id=${id}`);
    }
    const name = pkg.getName();
    if (this.mPackagesByName.has(name)) {
      throw new AndrolibException(`Multiple packages: name=${name}`);
    }

    this.mPackagesById.set(id, pkg);
    this.mPackagesByName.set(name, pkg);

    if (main) {
      this.mMainPackages.add(pkg);
    } else {
      this.mFramePackages.add(pkg);
    }
  }

  public setAnalysisMode(mode: boolean): void {
    this.mAnalysisMode = mode;
  }

  public setPackageRenamed(pkg: string): void {
    this.mPackageRenamed = pkg;
  }

  public setPackageOriginal(pkg: string): void {
    this.mPackageOriginal = pkg;
  }

  public setPackageId(id: Int): void {
    this.mPackageId = id;
  }

  public setSharedLibrary(flag: boolean): void {
    this.mSharedLibrary = flag;
  }

  public setSparseResources(flag: boolean): void {
    this.mSparseResources = flag;
  }

  public clearSdkInfo(): void {
    this.mSdkInfo.clear();
  }

  public addSdkInfo(key: string, value: string): void {
    this.mSdkInfo.set(key, value);
  }

  public setVersionName(versionName: string): void {
    this.mVersionInfo.versionName = versionName;
  }

  public setVersionCode(versionCode: string): void {
    this.mVersionInfo.versionCode = versionCode;
  }

  public getSdkInfo(): Map<string, string> {
    return this.mSdkInfo;
  }

  public getAnalysisMode(): boolean {
    return this.mAnalysisMode;
  }

  public getPackageRenamed(): string {
    return this.mPackageRenamed;
  }

  public getPackageOriginal(): string {
    return this.mPackageOriginal;
  }

  public getPackageId(): Int {
    return this.mPackageId;
  }

  public getSharedLibrary(): boolean {
    return this.mSharedLibrary;
  }

  public getSparseResources(): boolean {
    return this.mSparseResources;
  }
}
