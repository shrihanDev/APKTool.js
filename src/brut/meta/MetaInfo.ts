import { dump, DumpOptions, load } from 'js-yaml';
import { Readable, Writable } from 'node:stream';
import EscapedStringRepresenter from './EscapedStringRepresenter';
import PackageInfo from './PackageInfo';
import UsesFramework from './UsesFramework';
import VersionInfo from './VersionInfo';
import YamlStringEscapeUtils from './YamlStringEscapeUtils';

export default class MetaInfo {
  public version: string;
  public apkFileName: string;
  public isFrameworkApk: boolean;
  public usesFramework: UsesFramework;
  public sdkInfo: { [key: string]: string };
  public packageInfo: PackageInfo;
  public versionInfo: VersionInfo;
  public compressionType: boolean;
  public sharedLibrary: boolean;
  public sparseResources: boolean;
  public unknownFiles: { [key: string]: string };
  public doNotCompress: string[];

  public save(output: Writable): void {
    const dumpOpts: DumpOptions = {
      flowLevel: -1,
      replacer: (key: any, value: any) => ({
        key: EscapedStringRepresenter(key),
        value: EscapedStringRepresenter(value)
      })
    };
    output.write(dump(this, dumpOpts));
  }

  public static load(input: Readable): MetaInfo {
    return load(YamlStringEscapeUtils.unescapeString(input.read())) as MetaInfo;
  }
}
