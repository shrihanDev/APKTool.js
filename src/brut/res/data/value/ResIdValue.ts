import ResValuesXmlSerializable from 'brut/res/xml/ResValuesXmlSerializable';
import { XmlSerializer } from 'hjs-xmlpull';
import ResResource from '../ResResource';
import ResValue from './ResValue';

export default class ResIdValue
  extends ResValue
  implements ResValuesXmlSerializable {
  public serializeToResValuesXml(
    serializer: XmlSerializer,
    res: ResResource
  ): void {
    serializer.startTag(null, 'item');
    serializer.attribute(null, 'type', res.getResSpec().getType().getName());
    serializer.attribute(null, 'name', res.getResSpec().getName());
    serializer.endTag(null, 'item');
  }
}
