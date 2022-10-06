import ResValuesXmlSerializable from 'brut/res/xml/ResValuesXmlSerializable';
import { XmlSerializer } from 'hjs-xmlpull';
import Duo from 'util/Duo';
import ResResource from '../ResResource';
import ResArrayValue from './ResArrayValue';
import ResPluralsValue from './ResPluralsValue';
import ResReferenceValue from './ResReferenceValue';
import ResStyleValue from './ResStyleValue';
import ResValue from './ResValue';

export default class ResBagValue
  extends ResValue
  implements ResValuesXmlSerializable {
  protected mParent: ResReferenceValue;

  constructor(parent: ResReferenceValue) {
    super();
    this.mParent = parent;
  }

  public serializeToResValuesXml(
    serializer: XmlSerializer,
    res: ResResource
  ): void {
    const type: string = res.getResSpec().getType().getName();
    if (type === 'style') {
      new ResStyleValue(
        this.mParent,
        new Array<Duo<any, any>>(0),
        null
      ).serializeToResValuesXml(serializer, res);
      return;
    }
    if (type === 'array') {
      new ResArrayValue(
        this.mParent,
        new Array<Duo<any, any>>(0)
      ).serializeToResValuesXml(serializer, res);
      return;
    }
    if (type === 'plurals') {
      new ResPluralsValue(
        this.mParent,
        new Array<Duo<any, any>>(0)
      ).serializeToResValuesXml(serializer, res);
      return;
    }

    serializer.startTag(null, 'item');
    serializer.attribute(null, 'type', type);
    serializer.attribute(null, 'name', res.getResSpec().getName());
    serializer.endTag(null, 'item');
  }

  public getParent(): ResReferenceValue {
    return this.mParent;
  }
}
