export default interface ResXmlEncodable {
  encodeAsResXmlAttr: () => string;
  encodeAsResXmlValue: () => string;
}
