import AndrolibException from 'brut/AndrolibException';
import ResValuesXmlSerializable from 'brut/res/xml/ResValuesXmlSerializable';
import { XmlSerializer } from 'hjs-xmlpull';
import { Int, toInt } from 'types/Int';
import Duo from 'util/Duo';
import ResPackage from '../ResPackage';
import ResResource from '../ResResource';
import ResBagValue from './ResBagValue';
import ResEnumAttr from './ResEnumAttr';
import ResFlagsAttr from './ResFlagsAttr';
import ResIntValue from './ResIntValue';
import ResReferenceValue from './ResReferenceValue';
import ResScalarValue from './ResScalarValue';
import ResValueFactory from './ResValueFactory';

export default class ResAttr
  extends ResBagValue
  implements ResValuesXmlSerializable
{
  private readonly mType: Int | null;
  private readonly mMin: Int | null;
  private readonly mMax: Int | null;
  private readonly mL10n: boolean | null;
  constructor(
    parentVal: ResReferenceValue,
    type: Int | null,
    min: Int | null,
    max: Int | null,
    l10n: boolean | null
  ) {
    super(parentVal);
    this.mType = type;
    this.mMin = min;
    this.mMax = max;
    this.mL10n = l10n;
  }

  public convertToResXmlFormat(value: ResScalarValue): string | null {
    return null;
  }

  public override serializeToResValuesXml(
    serializer: XmlSerializer,
    res: ResResource
  ): void {
    const type: string | null = this.getTypeAsString();

    serializer.startTag(null, 'attr');
    serializer.attribute(null, 'name', res.getResSpec().getName());
    if (type !== null) {
      serializer.attribute(null, 'format', type);
    }
    if (this.mMin !== null) {
      serializer.attribute(null, 'min', this.mMin.toString());
    }
    if (this.mMax !== null) {
      serializer.attribute(null, 'max', this.mMax.toString());
    }
    if (this.mL10n !== null && this.mL10n) {
      serializer.attribute(null, 'localization', 'suggested');
    }
    this.serializeBody(serializer, res);
    serializer.endTag(null, 'attr');
  }

  public static factory(
    parent: ResReferenceValue,
    items: Array<Duo<Int, ResScalarValue>>,
    factory: ResValueFactory,
    pkg: ResPackage
  ): ResAttr {
    const type: Int = toInt((items[0].m2 as ResIntValue).getValue());
    const scalarType: Int = toInt(type & 0xffff);
    let min: Int | null = null;
    let max: Int | null = null;
    let l10n: boolean | null = null;
    let i;
    for (i = 1; i < items.length; i++) {
      switch (items[i].m1) {
        case this.BAG_KEY_ATTR_MIN:
          min = toInt((items[i].m2 as ResIntValue).getValue());
          continue;
        case this.BAG_KEY_ATTR_MAX:
          max = toInt((items[i].m2 as ResIntValue).getValue());
          continue;
        case this.BAG_KEY_ATTR_L10N:
          l10n = toInt((items[i].m2 as ResIntValue).getValue()) !== 0;
          continue;
      }
      break;
    }

    if (i === items.length) {
      return new ResAttr(parent, scalarType, min, max, l10n);
    }
    const attrItems: Array<Duo<ResReferenceValue, ResIntValue>> = new Array<
      Duo<any, any>
    >(items.length - 1);
    let j = 0;
    for (; i < items.length; i++) {
      const resId = items[i].m1;
      pkg.addSynthesizedRes(resId);
      attrItems[j++] = new Duo(
        factory.newReference(resId, '')!,
        items[i].m2 as ResIntValue
      );
    }
    switch (type & 0xff0000) {
      case this.TYPE_ENUM:
        return new ResEnumAttr(parent, scalarType, min, max, l10n, attrItems);
      case this.TYPE_FLAGS:
        return new ResFlagsAttr(parent, scalarType, min, max, l10n, attrItems);
    }

    throw new AndrolibException('Could not decode attr value');
  }

  protected serializeBody(serializer: XmlSerializer, res: ResResource): void {}

  protected getTypeAsString(): string | null {
    let s: string = '';
    if ((this.mType! & ResAttr.TYPE_REFERENCE) !== 0) {
      s += '|reference';
    }
    if ((this.mType! & ResAttr.TYPE_STRING) !== 0) {
      s += '|string';
    }
    if ((this.mType! & ResAttr.TYPE_INT) !== 0) {
      s += '|integer';
    }
    if ((this.mType! & ResAttr.TYPE_BOOL) !== 0) {
      s += '|boolean';
    }
    if ((this.mType! & ResAttr.TYPE_COLOR) !== 0) {
      s += '|color';
    }
    if ((this.mType! & ResAttr.TYPE_FLOAT) !== 0) {
      s += '|float';
    }
    if ((this.mType! & ResAttr.TYPE_DIMEN) !== 0) {
      s += '|dimension';
    }
    if ((this.mType! & ResAttr.TYPE_FRACTION) !== 0) {
      s += '|fraction';
    }
    if (s === '') {
      return null;
    }
    return s.substring(1);
  }

  public static BAG_KEY_ATTR_TYPE: Int = toInt(0x01000000);
  private static readonly BAG_KEY_ATTR_MIN: Int = toInt(0x01000001);
  private static readonly BAG_KEY_ATTR_MAX: Int = toInt(0x01000002);
  private static readonly BAG_KEY_ATTR_L10N: Int = toInt(0x01000003);

  private static readonly TYPE_REFERENCE: Int = toInt(0x01);
  private static readonly TYPE_STRING: Int = toInt(0x02);
  private static readonly TYPE_INT: Int = toInt(0x04);
  private static readonly TYPE_BOOL: Int = toInt(0x08);
  private static readonly TYPE_COLOR: Int = toInt(0x10);
  private static readonly TYPE_FLOAT: Int = toInt(0x20);
  private static readonly TYPE_DIMEN: Int = toInt(0x40);
  private static readonly TYPE_FRACTION: Int = toInt(0x80);
  private static readonly TYPE_ANY_STRING: Int = toInt(0xee);

  private static readonly TYPE_ENUM: Int = toInt(0x00010000);
  private static readonly TYPE_FLAGS: Int = toInt(0x00020000);
}
