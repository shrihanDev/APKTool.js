import { XmlSerializer } from 'hjs-xmlpull';
import { Int, toInt } from 'types/Int';
import Duo from 'util/Duo';
import ResResource from '../ResResource';
import ResAttr from './ResAttr';
import ResIntValue from './ResIntValue';
import ResReferenceValue from './ResReferenceValue';
import ResScalarValue from './ResScalarValue';

class FlagItem {
  public ref: ResReferenceValue;
  public flag: Int;
  public value: string | undefined;

  constructor(ref: ResReferenceValue, flag: Int) {
    this.ref = ref;
    this.flag = flag;
  }

  public getValue(): string | undefined {
    if (this.value === null) {
      if (this.ref.referentIsNull()) {
        return '@null';
      }
      this.value = this.ref.getReferent()?.getName();
    }
    return this.value;
  }
}

export default class ResFlagsAttr extends ResAttr {
  private readonly mItems: FlagItem[];
  private mZeroFlags: FlagItem[];
  private mFlags: FlagItem[];

  constructor(
    parent: ResReferenceValue,
    type: Int | null,
    min: Int | null,
    max: Int | null,
    l10n: boolean | null,
    items: Array<Duo<ResReferenceValue, ResIntValue>>
  ) {
    super(parent, type, min, max, l10n);

    this.mItems = new Array<FlagItem>(items.length);
    for (let i = 0; i < items.length; i++) {
      this.mItems[i] = new FlagItem(items[i].m1, items[i].m2.getValue());
    }
  }

  public override convertToResXmlFormat(value: ResScalarValue): string | null {
    if (value instanceof ResReferenceValue) {
      return value.encodeAsResXml();
    }
    if (!(value instanceof ResIntValue)) {
      return super.convertToResXmlFormat(value);
    }
    this.loadFlags();
    const intVal: Int = value.getValue();

    if (intVal === 0) {
      return this.renderFlags(this.mZeroFlags);
    }

    const flagItems: FlagItem[] = new Array<FlagItem>(this.mFlags.length);
    const flags: Int[] = new Array<Int>(this.mFlags.length);
    let flagsCount: Int = toInt(0);
    for (const flagItem of this.mFlags) {
      const flag: Int = flagItem.flag;

      if ((intVal & flag) !== flag) {
        continue;
      }

      if (!this.isSubpartOf(flag, flags)) {
        flags[flagsCount] = flag;
        flagItems[flagsCount++] = flagItem;
      }
    }
    return this.renderFlags(flagItems.slice(0, flagsCount));
  }

  protected override serializeBody(
    serializer: XmlSerializer,
    res: ResResource
  ): void {
    for (const item of this.mItems) {
      serializer.startTag(null, 'flag');
      serializer.attribute(null, 'name', item.getValue());
      serializer.attribute(null, 'value', `0x${item.flag.toString(16)}`);
      serializer.endTag(null, 'flag');
    }
  }

  private isSubpartOf(flag: Int, flags: Int[]): boolean {
    for (const j of flags) {
      if ((j & flag) === flag) {
        return true;
      }
    }
    return false;
  }

  private renderFlags(flags: FlagItem[]): string {
    let ret: string = '';
    for (const flag of flags) {
      ret += `|${flag.getValue()!}`;
    }
    if (ret.length === 0) {
      return ret;
    }
    return ret.substring(1);
  }

  private loadFlags(): void {
    if (this.mFlags !== null) {
      // do nothing
    }

    const zeroFlags: FlagItem[] = new Array<FlagItem>(this.mItems.length);
    let zeroFlagsCount: Int = toInt(0);
    const flags: FlagItem[] = new Array<FlagItem>(this.mItems.length);
    let flagsCount: Int = toInt(0);

    for (const item of this.mItems) {
      if (item.flag === 0) {
        zeroFlags[zeroFlagsCount++] = item;
      } else {
        flags[flagsCount++] = item;
      }
    }

    this.mZeroFlags = zeroFlags.slice(0, zeroFlagsCount);
    this.mFlags = flags.slice(0, flagsCount);

    this.mFlags.sort((o1: FlagItem, o2: FlagItem): number => {
      const count1s = (n: Int): Int =>
        toInt(n.toString(2).replace(/0/g, '').length);
      const o1Bits: Int = count1s(o1.flag);
      const o2Bits: Int = count1s(o2.flag);
      if (o1Bits === o2Bits) {
        return 0;
      } else if (o1Bits < o2Bits) {
        return -1;
      } else {
        return 1;
      }
    });
  }
}
