import { XmlSerializer } from 'hjs-xmlpull';
import ResResource from '../data/ResResource';

export default interface ResValuesXmlSerializable {
  serializeToResValuesXml: (
    serializer: XmlSerializer,
    res: ResResource
  ) => void;
}
