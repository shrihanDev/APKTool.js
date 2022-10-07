import { XmlSerializer } from 'hjs-xmlpull';
import { Int } from 'types/Int';
import Duo from 'util/Duo';
import ResResource from '../ResResource';
import ResResSpec from '../ResResSpec';
import ResAttr from './ResAttr';
import ResIntValue from './ResIntValue';
import ResReferenceValue from './ResReferenceValue';
import ResScalarValue from './ResScalarValue';

export default class ResEnumAttr extends ResAttr {
  private readonly mItems: Array<Duo<ResReferenceValue, ResIntValue>>;
  private readonly mItemsCache: Map<Int, string | null>;

  constructor(
    parent: ResReferenceValue,
    type: Int | null,
    min: Int | null,
    max: Int | null,
    l10n: boolean | null,
    items: Array<Duo<ResReferenceValue, ResIntValue>>
  ) {
    super(parent, type, min, max, l10n);
    this.mItems = items;
  }

  public override convertToResXmlFormat(value: ResScalarValue): string | null {
    if (value instanceof ResIntValue) {
      const ret: string | null = this.decodeValue(value.getValue());
      if (ret !== null) {
        return ret;
      }
    }
    return super.convertToResXmlFormat(value);
  }

  protected override serializeBody(
    serializer: XmlSerializer,
    res: ResResource
  ): void {
    for (const duo of this.mItems) {
      const intVal: Int = duo.m2.getValue();
      const m1Referent: ResResSpec | null = duo.m1.getReferent();

      serializer.startTag(null, 'enum');
      serializer.attribute(
        null,
        'name',
        m1Referent !== null ? m1Referent.getName() : '@null'
      );
      serializer.attribute(null, 'value', intVal.toString());
      serializer.endTag(null, 'enum');
    }
  }

  private decodeValue(value: Int): string | null {
    let value2: string | null | undefined = this.mItemsCache.get(value);
    if (value2 === null || value2 === '' || value2 === undefined) {
      let ref: ResReferenceValue | null = null;
      for (const duo of this.mItems) {
        if (duo.m2.getValue() === value) {
          ref = duo.m1;
          break;
        }
      }
      if (ref !== null) {
        value2 = ref.getReferent()!.getName();
        this.mItemsCache.set(value, value2);
      }
    }
    return value2!;
  }
}
