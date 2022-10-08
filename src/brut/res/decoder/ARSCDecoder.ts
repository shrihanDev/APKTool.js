import TypedValue from 'android/util/TypedValue';
import AndrolibException from 'brut/AndrolibException';
import { SmartBuffer } from 'smart-buffer';
import internal, { Readable, Stream } from 'stream';
import { Int, toInt } from 'types/Int';
import Duo from 'util/Duo';
import ResConfigFlags from '../data/ResConfigFlags';
import ResID from '../data/ResID';
import ResPackage from '../data/ResPackage';
import ResResource from '../data/ResResource';
import ResResSpec from '../data/ResResSpec';
import ResTable from '../data/ResTable';
import ResType from '../data/ResType';
import ResTypeSpec from '../data/ResTypeSpec';
import ResBagValue from '../data/value/ResBagValue';
import ResFileValue from '../data/value/ResFileValue';
import ResIntBasedValue from '../data/value/ResIntBasedValue';
import ResReferenceValue from '../data/value/ResReferenceValue';
import ResScalarValue from '../data/value/ResScalarValue';
import ResStringValue from '../data/value/ResStringValue';
import ResValue from '../data/value/ResValue';
import ResValueFactory from '../data/value/ResValueFactory';
import StringBlock from './StringBlock';

export class FlagsOffset {
  public offset: Int;
  public count: Int;

  constructor(offset: Int, count: Int) {
    this.offset = offset;
    this.count = count;
  }
}

class EntryData {
  public mFlags: Int;
  public mSpecNameId: Int;
  public mValue: ResValue;
}

export class ARSCData {
  private readonly mPackages: ResPackage[];
  private readonly mFlagsOffsets: FlagsOffset[];
  private readonly mResTable: ResTable;

  constructor(
    packages: ResPackage[],
    flagsOffsets: FlagsOffset[],
    resTable: ResTable
  ) {
    this.mPackages = packages;
    this.mFlagsOffsets = flagsOffsets;
    this.mResTable = resTable;
  }

  public getFlagsOffsets(): FlagsOffset[] {
    return this.mFlagsOffsets;
  }

  public getPackages(): ResPackage[] {
    return this.mPackages;
  }

  public getOnePackage(): ResPackage {
    if (this.mPackages.length <= 0) {
      throw new AndrolibException('Arsc file contains zero packages');
    } else if (this.mPackages.length !== 1) {
      const id: Int = this.findPackagesWithMostResSpecs();
      console.info(
        `Arsc file contains multiple packages. Using package ${this.mPackages[
          id
        ].getName()} as default.`
      );
      return this.mPackages[id];
    }
    return this.mPackages[0];
  }

  public findPackagesWithMostResSpecs(): Int {
    let count: Int = this.mPackages[0].getResSpecCount();
    let id: Int = toInt(0);

    for (let i = 0; i < this.mPackages.length; i++) {
      if (this.mPackages[i].getResSpecCount() >= count) {
        count = this.mPackages[i].getResSpecCount();
        id = toInt(i);
      }
    }
    return id;
  }

  public getResTable(): ResTable {
    return this.mResTable;
  }
}

export class Header {
  public type: Int;
  public headerSize: Int;
  public chunkSize: Int;
  public startPosition: Int;
  public endPosition: Int;

  constructor(type: Int, headerSize: Int, chunkSize: Int, headerStart: Int) {
    this.type = type;
    this.headerSize = headerSize;
    this.chunkSize = chunkSize;
    this.startPosition = headerStart;
    this.endPosition = toInt(headerStart + chunkSize);
  }

  public static read(
    in_: SmartBuffer,
    countIn: CountingReadableStream
  ): Header {
    let type: Int;
    const start: Int = toInt(countIn.getBytesRead());
    try {
      type = toInt(in_.readBuffer(2).readIntBE(0, 2));
    } catch (e) {
      return new Header(
        this.TYPE_NONE,
        toInt(0),
        toInt(0),
        toInt(countIn.getBytesRead())
      );
    }
    return new Header(
      type,
      toInt(in_.readBuffer(2).readIntBE(0, 2)),
      toInt(in_.readInt32BE()),
      start
    );
  }

  public static TYPE_NONE: Int = toInt(-1);
  public static TYPE_STRING_POOL: Int = toInt(0x0001);
  public static TYPE_TABLE: Int = toInt(0x0002);
  public static TYPE_XML: Int = toInt(0x0003);

  public static XML_TYPE_PACKAGE: Int = toInt(0x0200);
  public static XML_TYPE_TYPE: Int = toInt(0x0201);
  public static XML_TYPE_SPEC_TYPE: Int = toInt(0x0202);
  public static XML_TYPE_LIBRARY: Int = toInt(0x0203);
  public static XML_TYPE_OVERLAY: Int = toInt(0x0204);
  public static XML_TYPE_OVERLAY_POLICY: Int = toInt(0x0205);
  public static XML_TYPE_STAGED_ALIAS: Int = toInt(0x0206);
}

export default class ARSCDecoder {
  private mIn: SmartBuffer;
  private readonly mResTable: ResTable;
  private readonly mFlagsOffsets: FlagsOffset[] | null;
  private readonly mKeepBroken: boolean;
  private mHeader: Header;
  private readonly mCountIn: CountingReadableStream;
  private mTableStrings: StringBlock;
  private mTypeNames: StringBlock;
  private mSpecNames: StringBlock;
  private mPkg: ResPackage;
  private mTypeSpec: ResTypeSpec;
  private mType: ResType | null;
  private mResId: Int;
  private mTypeIdOffset: Int = toInt(0);
  private mMissingResSpecMap: Map<Int, boolean>;
  private readonly mResTypeSpecs: Map<Int, ResTypeSpec> = new Map<
    Int,
    ResTypeSpec
  >();

  private static readonly ENTRY_FLAG_COMPLEX: Int = toInt(0x0001);
  private static readonly ENTRY_FLAG_PUBLIC: Int = toInt(0x0002);
  private static readonly ENTRY_FLAG_WEAK: Int = toInt(0x0004);
  private static readonly KNOWN_CONFIG_BYTES: Int = toInt(56);

  private constructor(
    arscStream: Readable,
    resTable: ResTable,
    storeFlagsOffsets: boolean,
    keepBroken: boolean
  ) {
    arscStream = this.mCountIn = new CountingReadableStream(arscStream);
    if (storeFlagsOffsets) {
      this.mFlagsOffsets = new Array<FlagsOffset>();
    } else {
      this.mFlagsOffsets = null;
    }
    void (async _this => {
      _this.mIn = SmartBuffer.fromBuffer(await stream2buffer(arscStream));
    })(this);
    this.mResTable = resTable;
    this.mKeepBroken = keepBroken;
  }

  private readTableHeader(): ResPackage[] {
    this.nextChunkCheckType(Header.TYPE_TABLE);
    const packageCount: Int = toInt(this.mIn.readInt32LE());

    this.mTableStrings = StringBlock.read(this.mIn);
    const packages: ResPackage[] = new Array<ResPackage>(packageCount);

    this.nextChunk();
    for (let i = 0; i < packageCount; i++) {
      this.mTypeIdOffset = toInt(0);
      packages[i] = this.readTablePackage();
    }
    return packages;
  }

  private readTablePackage(): ResPackage {
    this.checkChunkType(Header.XML_TYPE_PACKAGE);
    let id: Int = toInt(this.mIn.readInt32LE());

    if (id === 0) {
      // This means we are dealing with a Library Package, we should just temporarily
      // set the packageId to the next available id . This will be set at runtime regardless, but
      // for Apktool's use we need a non-zero packageId.
      // AOSP indicates 0x02 is next, as 0x01 is system and 0x7F is private.
      id = toInt(2);
      if (
        (this.mResTable.getPackageOriginal() === null ||
          this.mResTable.getPackageOriginal() === undefined) &&
        (this.mResTable.getPackageRenamed() === null ||
          this.mResTable.getPackageRenamed() === undefined)
      ) {
        this.mResTable.setSharedLibrary(true);
      }
    }

    const name: string = this.mIn.readStringNT();
    /* typeStrings */ this.mIn.readInt32LE();
    /* lastPublicType */ this.mIn.readInt32LE();
    /* keyStrings */ this.mIn.readInt32LE();
    /* lastPublicKey */ this.mIn.readInt32LE();

    // TypeIdOffset was added platform_frameworks_base/@f90f2f8dc36e7243b85e0b6a7fd5a590893c827e
    // which is only in split/new applications.
    const splitHeaderSize: Int = toInt(2 + 2 + 4 + 4 + 2 * 128 + 4 * 5); // short, short, int, int, char[128], int * 4
    if (this.mHeader.headerSize === splitHeaderSize) {
      this.mTypeIdOffset = toInt(this.mIn.readInt32LE());
    }

    if (this.mTypeIdOffset > 0) {
      console.warn(
        'Please report this application to Apktool for a fix: https://github.com/iBotPeaches/Apktool/issues/1728'
      );
    }

    this.mTypeNames = StringBlock.read(this.mIn);
    this.mSpecNames = StringBlock.read(this.mIn);

    this.mResId = toInt(id << 24);
    this.mPkg = new ResPackage(this.mResTable, id, name);

    this.nextChunk();
    let flag: boolean = true;
    while (flag) {
      switch (this.mHeader.type) {
        case Header.XML_TYPE_SPEC_TYPE:
          this.readTableTypeSpec();
          break;
        case Header.XML_TYPE_LIBRARY:
          this.readLibraryType();
          break;
        case Header.XML_TYPE_OVERLAY:
          this.readOverlaySpec();
          break;
        case Header.XML_TYPE_STAGED_ALIAS:
          this.readStagedAliasSpec();
          break;
        default:
          flag = false;
          break;
      }
    }

    return this.mPkg;
  }

  private readLibraryType(): void {
    this.checkChunkType(Header.XML_TYPE_LIBRARY);
    const libraryCount: Int = toInt(this.mIn.readInt32LE());

    let packageId: Int;
    let packageName: string;

    for (let i = 0; i < libraryCount; i++) {
      packageId = toInt(this.mIn.readInt32LE());
      packageName = this.mIn.readStringNT();
      console.info(
        `Decoding Shared Library (${packageName}), pkgId: ${packageId}`
      );
    }

    while (this.nextChunk().type === Header.XML_TYPE_TYPE) {
      this.readTableTypeSpec();
    }
  }

  private readStagedAliasSpec(): void {
    const count: Int = toInt(this.mIn.readInt32LE());

    for (let i = 0; i < count; i++) {
      console.log(
        `Skipping staged alias stagedId (${this.mIn.readInt32LE()}) finalId: ${this.mIn.readInt32LE()}`
      );
    }

    this.nextChunk();
  }

  private readOverlaySpec(): void {
    /* policyFlags */ this.mIn.readInt32LE();
    const count: Int = toInt(this.mIn.readInt32LE());

    for (let i = 0; i < count; i++) {
      console.log(`Skipping overlay (${this.mIn.readInt32LE()})`);
    }

    this.nextChunk();
  }

  private readTableTypeSpec(): void {
    this.mTypeSpec = this.readSingleTableTypeSpec();
    this.addTypeSpec(this.mTypeSpec);

    let type: Int = this.nextChunk().type;
    let resTypeSpec: ResTypeSpec;

    while (type === Header.XML_TYPE_SPEC_TYPE) {
      resTypeSpec = this.readSingleTableTypeSpec();
      this.addTypeSpec(resTypeSpec);
      type = this.nextChunk().type;

      // We've detected sparse resources, lets record this so we can rebuild in that same format (sparse/not)
      // with aapt2. aapt1 will ignore this.
      if (!this.mResTable.getSparseResources()) {
        this.mResTable.setSparseResources(true);
      }
    }

    while (type === Header.XML_TYPE_TYPE) {
      this.readTableType();

      // skip "TYPE 8 chunks" and/or padding data at the end of this chunk
      if (this.mCountIn.getBytesRead() < this.mHeader.endPosition) {
        console.warn(
          `Unknown data detected. Skipping: ${
            this.mHeader.endPosition - this.mCountIn.getBytesRead()
          } byte(s)`
        );
        this.mCountIn.read(
          this.mHeader.endPosition - this.mCountIn.getBytesRead()
        );
      }

      type = this.nextChunk().type;

      this.addMissingResSpecs();
    }
  }

  private readSingleTableTypeSpec(): ResTypeSpec {
    this.checkChunkType(Header.XML_TYPE_SPEC_TYPE);
    const id: Int = toInt(this.mIn.readUInt8());
    this.mIn.readBuffer(3);
    const entryCount: Int = toInt(this.mIn.readInt32LE());

    if (this.mFlagsOffsets !== null) {
      this.mFlagsOffsets.push(
        new FlagsOffset(toInt(this.mCountIn.getBytesRead()), entryCount)
      );
    }

    /* flags */ this.mIn.readBuffer(entryCount * 4);
    this.mTypeSpec = new ResTypeSpec(
      this.mTypeNames.getString(toInt(id - 1)) ?? '',
      this.mResTable,
      this.mPkg,
      id,
      entryCount
    );
    this.mPkg.addType(this.mTypeSpec);
    return this.mTypeSpec;
  }

  private readTableType(): ResType | null {
    this.checkChunkType(Header.XML_TYPE_TYPE);
    const typeId: Int = toInt(this.mIn.readUInt8() - this.mTypeIdOffset);
    if (this.mResTypeSpecs.has(typeId)) {
      this.mResId = toInt(
        (0xff000000 & this.mResId) |
          (this.mResTypeSpecs.get(typeId)!.getId() << 16)
      );
    }

    const typeFlags: Int = toInt(this.mIn.readInt8());
    /* reserved */ this.mIn.readBuffer(2);
    const entryCount: Int = toInt(this.mIn.readInt32LE());
    const entriesStart: Int = toInt(this.mIn.readInt32LE());
    this.mMissingResSpecMap = new Map();

    const flags: ResConfigFlags = this.readConfigFlags();
    const position: Int = toInt(
      this.mHeader.startPosition + entriesStart - entryCount * 4
    );

    // For some APKs there is a disconnect between the reported size of Configs
    // If we find a mismatch skip those bytes.
    if (position !== this.mCountIn.getBytesRead()) {
      console.warn(
        `Invalid data detected. Skipping: ${
          position - this.mCountIn.getBytesRead()
        } byte(s)`
      );
      this.mIn.readBuffer(position - this.mCountIn.getBytesRead());
    }

    if ((typeFlags & 0x01) !== 0) {
      console.info(`Sparse type flags detected: ${this.mTypeSpec.getName()}`);
    }

    const entryOffsetMap: Map<Int, Int> = new Map();
    for (let i = 0; i < entryCount; i++) {
      if ((typeFlags & 0x01) !== 0) {
        entryOffsetMap.set(
          toInt(this.mIn.readUInt16LE()),
          toInt(this.mIn.readUInt16LE())
        );
      } else {
        entryOffsetMap.set(toInt(i), toInt(this.mIn.readInt32LE()));
      }
    }

    if (flags.isInvalid) {
      const resName: string = this.mTypeSpec.getName() + flags.getQualifiers();
      if (this.mKeepBroken) {
        console.warn(`Invalid config flags detected: ${resName}`);
      } else {
        console.warn(
          'Invalid config flags detected. Dropping resources: ' + resName
        );
      }
    }

    this.mType =
      flags.isInvalid && !this.mKeepBroken
        ? null
        : this.mPkg.getOrCreateConfig(flags);

    for (const i of entryOffsetMap.keys()) {
      const offset: Int | undefined = toInt(entryOffsetMap.get(i));
      if (offset === -1 || offset === undefined) {
        continue;
      }
      this.mMissingResSpecMap.set(i, false);
      this.mResId = toInt((this.mResId & 0xffff0000) | i);
      this.readEntry(this.readEntryData());
    }

    return this.mType;
  }

  private readEntryData(): EntryData {
    const size: Int = toInt(this.mIn.readInt16LE());
    if (size < 0) {
      throw new AndrolibException('Entry size is under 0 bytes');
    }

    const flags: Int = toInt(this.mIn.readInt16LE());
    const specNamesId: Int = toInt(this.mIn.readInt32LE());
    const value: ResValue =
      (flags & ARSCDecoder.ENTRY_FLAG_COMPLEX) === 0
        ? this.readValue()
        : this.readComplexEntry();
    const entryData: EntryData = new EntryData();
    entryData.mFlags = flags;
    entryData.mSpecNameId = specNamesId;
    entryData.mValue = value;
    return entryData;
  }

  private readEntry(entryData: EntryData): void {
    const specNamesId: Int = entryData.mSpecNameId;
    let value: ResValue = entryData.mValue;

    if (this.mTypeSpec.isString() && value instanceof ResFileValue) {
      value = new ResStringValue(value.toString(), value.getRawIntValue());
    }
    if (this.mType === null) {
      return;
    }

    const resId: ResID = new ResID(this.mResId);
    let spec: ResResSpec;
    if (this.mPkg.hasResSpec(resId)) {
      spec = this.mPkg.getResSpec(resId);

      if (spec.isDummyResSpec()) {
        this.removeResSpec(spec);

        spec = new ResResSpec(
          resId,
          this.mSpecNames.getString(specNamesId)!,
          this.mPkg,
          this.mTypeSpec
        );
        this.mPkg.addResSpec(spec);
        this.mTypeSpec.addResSpec(spec);
      }
    } else {
      spec = new ResResSpec(
        resId,
        this.mSpecNames.getString(specNamesId)!,
        this.mPkg,
        this.mTypeSpec
      );
      this.mPkg.addResSpec(spec);
      this.mTypeSpec.addResSpec(spec);
    }
    const res: ResResource = new ResResource(this.mType, spec, value);

    try {
      this.mType.addResource(res);
      spec.addResource(res);
    } catch (ex) {
      if (ex instanceof AndrolibException) {
        if (this.mKeepBroken) {
          this.mType.addResource(res, true);
          spec.addResource(res, true);
          console.warn(
            `Duplicate Resource Detected. Ignoring duplicate: ${res.toString()}`
          );
        } else {
          throw ex;
        }
      }
    }
  }

  private readComplexEntry(): ResBagValue {
    const parent: Int = toInt(this.mIn.readInt32LE());
    const count: Int = toInt(this.mIn.readInt32LE());

    const factory: ResValueFactory = this.mPkg.getValueFactory();
    const items: Array<Duo<Int, ResScalarValue>> = new Array<
      Duo<Int, ResScalarValue>
    >(count);
    let resValue: ResIntBasedValue;
    let resId: Int;

    for (let i = 0; i < count; i++) {
      resId = toInt(this.mIn.readInt32LE());
      resValue = this.readValue();

      if (!(resValue instanceof ResScalarValue)) {
        resValue = new ResStringValue(
          resValue.toString(),
          resValue.getRawIntValue()
        );
      }
      items[i] = new Duo(resId, resValue as ResScalarValue);
    }

    return factory.bagFactory(parent, items, this.mTypeSpec);
  }

  private readValue(): ResIntBasedValue {
    /* size */ const sizeSkip = this.mIn.readInt16LE();
    if (sizeSkip !== 8) {
      throw Error(
        `Expected: 0x${Number(8).toString(16)}, got: ${sizeSkip.toString(16)}`
      );
    }
    /* zero */ const zeroSkip = this.mIn.readInt8();
    if (zeroSkip !== 0) {
      throw Error(
        `Expected: 0x${Number(0).toString(16)}, got: ${sizeSkip.toString(16)}`
      );
    }

    const type: Int = toInt(this.mIn.readInt8());
    const data: Int = toInt(this.mIn.readInt32LE());

    return type === TypedValue.TYPE_STRING
      ? this.mPkg
          .getValueFactory()
          .factoryStr(this.mTableStrings.getHTML(data), data)
      : this.mPkg.getValueFactory().factory(type, data, null);
  }

  private readConfigFlags(): ResConfigFlags {
    const size: Int = toInt(this.mIn.readInt32LE());
    let read: Int = toInt(28);

    if (size < 28) {
      throw new AndrolibException('Config size < 28');
    }

    let isInvalid: boolean = false;

    const mcc: Int = toInt(this.mIn.readInt16LE());
    const mnc: Int = toInt(this.mIn.readInt16LE());

    const language: string[] = this.unpackLanguageOrRegion(
      toInt(this.mIn.readInt8()),
      toInt(this.mIn.readInt8()),
      'a'
    );
    const country: string[] = this.unpackLanguageOrRegion(
      toInt(this.mIn.readInt8()),
      toInt(this.mIn.readInt8()),
      '0'
    );

    const orientation: Int = toInt(this.mIn.readInt8());
    const touchscreen: Int = toInt(this.mIn.readInt8());

    const density: Int = toInt(this.mIn.readUInt8());

    const keyboard: Int = toInt(this.mIn.readInt8());
    const navigation: Int = toInt(this.mIn.readInt8());
    const inputFlags: Int = toInt(this.mIn.readInt8());
    /* inputPad0 */ this.mIn.readBuffer(1);

    const screenWidth: Int = toInt(this.mIn.readInt16LE());
    const screenHeight: Int = toInt(this.mIn.readInt16LE());

    const sdkVersion: Int = toInt(this.mIn.readInt16LE());
    /* minorVersion, now must always be 0 */ this.mIn.readBuffer(2);

    let screenLayout: Int = toInt(0);
    let uiMode: Int = toInt(0);
    let smallestScreenWidthDp: Int = toInt(0);
    if (size >= 32) {
      screenLayout = toInt(this.mIn.readInt8());
      uiMode = toInt(this.mIn.readInt8());
      smallestScreenWidthDp = toInt(this.mIn.readInt16LE());
      read = toInt(32);
    }

    let screenWidthDp: Int = toInt(0);
    let screenHeightDp: Int = toInt(0);
    if (size >= 36) {
      screenWidthDp = toInt(this.mIn.readInt16LE());
      screenHeightDp = toInt(this.mIn.readInt16LE());
      read = toInt(36);
    }

    let localeScript: string = '';
    let localeVariant: string = '';
    if (size >= 48) {
      localeScript = this.readScriptOrVariantChar(toInt(4));
      localeVariant = this.readScriptOrVariantChar(toInt(8));
    }

    let screenLayout2: Int = toInt(0);
    let colorMode: Int = toInt(0);
    if (size >= 52) {
      screenLayout2 = toInt(this.mIn.readInt8());
      colorMode = toInt(this.mIn.readInt8());
      this.mIn.readBuffer(2); // reserved padding
      read = toInt(52);
    }

    if (size >= 56) {
      this.mIn.readBuffer(4);
      read = toInt(56);
    }

    const exceedingSize = size - ARSCDecoder.KNOWN_CONFIG_BYTES;
    if (exceedingSize > 0) {
      // const buf: Buffer;
      read = toInt(read + exceedingSize);
      const buf: Buffer = this.mIn.readBuffer(exceedingSize);
      const biArr = buf.toString('binary').split('');
      biArr[biArr.length - 1] = '1';
      const exceedingBI: bigint = BigInt(`0b${biArr.join()}`);
      if (exceedingBI === 0n) {
        console.log(
          `Config flags size > ${ARSCDecoder.KNOWN_CONFIG_BYTES}, but exceeding bytes are all zero, so it should be ok.`
        );
      } else {
        console.warn(
          `Config flags size > ${
            ARSCDecoder.KNOWN_CONFIG_BYTES
          }. Size = ${size}. Exceeding bytes: 0x${exceedingBI.toString(16)}`
        );
        isInvalid = true;
      }
    }

    const remainingSize: Int = toInt(size - read);
    if (remainingSize > 0) {
      this.mIn.readBuffer(remainingSize);
    }
    return new ResConfigFlags().setFlags(
      mcc,
      mnc,
      language,
      country,
      orientation,
      touchscreen,
      density,
      keyboard,
      navigation,
      inputFlags,
      screenWidth,
      screenHeight,
      sdkVersion,
      screenLayout,
      uiMode,
      smallestScreenWidthDp,
      screenWidthDp,
      screenHeightDp,
      localeScript,
      localeVariant,
      screenLayout2,
      colorMode,
      isInvalid,
      size
    );
  }

  private unpackLanguageOrRegion(in0: Int, in1: Int, base: string): string[] {
    // check high bit, if so we have a packed 3 letter code
    if (((in0 >> 7) & 1) === 1) {
      const first: Int = toInt(in1 & 0x1f);
      const second: Int = toInt(((in1 & 0xe0) >> 5) + ((in0 & 0x03) << 3));
      const third: Int = toInt((in0 & 0x7c) >> 2);

      // since this function handles languages & regions, we add the value(s) to the base char
      // which is usually 'a' or '0' depending on language or region.
      return [
        String.fromCharCode(first + base.charCodeAt(0)),
        String.fromCharCode(second + base.charCodeAt(0)),
        String.fromCharCode(third + base.charCodeAt(0))
      ];
    }
    return [String.fromCharCode(in0), String.fromCharCode(in1)];
  }

  private readScriptOrVariantChar(length: Int): string {
    let str: string = '';

    while (length-- !== 0) {
      const ch: Int = toInt(this.mIn.readInt8());
      if (ch === 0) {
        break;
      }
      str += String.fromCharCode(ch);
    }
    this.mIn.readBuffer(length);

    return str;
  }

  private addTypeSpec(resTypeSpec: ResTypeSpec): void {
    this.mResTypeSpecs.set(resTypeSpec.getId(), resTypeSpec);
  }

  private addMissingResSpecs(): void {
    const resId: Int = toInt(this.mResId & 0xffff0000);
    for (const i of this.mMissingResSpecMap.keys()) {
      if (this.mMissingResSpecMap.get(i) === true) continue;

      const spec: ResResSpec = new ResResSpec(
        new ResID(toInt(resId | i)),
        'APKTOOL_DUMMY_' + i.toString(16),
        this.mPkg,
        this.mTypeSpec
      );

      // If we already have this resID don't add it again.
      if (!this.mPkg.hasResSpec(new ResID(toInt(resId | i)))) {
        this.mPkg.addResSpec(spec);
        this.mTypeSpec.addResSpec(spec);

        if (this.mType === null) {
          this.mType = this.mPkg.getOrCreateConfig(new ResConfigFlags());
        }

        // We are going to make dummy attributes a null reference (@null) now instead of a boolean false.
        // This is because aapt2 is much more strict when it comes to what we can put in an application.
        const value: ResValue = new ResReferenceValue(this.mPkg, toInt(0), '');

        const res: ResResource = new ResResource(this.mType, spec, value);
        this.mType.addResource(res);
        spec.addResource(res);
      }
    }
  }

  private removeResSpec(spec: ResResSpec): void {
    if (this.mPkg.hasResSpec(spec.getId())) {
      this.mPkg.removeResSpec(spec);
      this.mTypeSpec.removeResSpec(spec);
    }
  }

  private nextChunk(): Header {
    // eslint-disable-next-line no-return-assign
    return (this.mHeader = Header.read(this.mIn, this.mCountIn));
  }

  private checkChunkType(expectedType: Int): void {
    if (this.mHeader.type !== expectedType) {
      throw new AndrolibException(
        `Invalid chunk type: expected=0x${expectedType.toString(
          16
        )}, got=0x${this.mHeader.type.toString(16)}`
      );
    }
  }

  private nextChunkCheckType(expectedType: Int): void {
    this.nextChunk();
    this.checkChunkType(expectedType);
  }
}

async function stream2buffer(stream: Stream): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const _buf = Array<any>();
    stream.on('data', chunk => _buf.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(_buf)));
    stream.on('error', err => reject(err));
  });
}

class CountingReadableStream extends Readable {
  private bytesRead: number;

  constructor(from?: Readable, opts?: internal.ReadableOptions) {
    super(opts);
    if (from !== undefined) {
      const asynk = async (): Promise<void> => {
        const buf = await stream2buffer(from);
        this.push(buf);
        this.push(null);
      };
      void asynk();
    }
  }

  public override _read(size: number): void {
    this.bytesRead += size;
    super._read(size);
  }

  public getBytesRead(): number {
    return this.bytesRead;
  }
}
