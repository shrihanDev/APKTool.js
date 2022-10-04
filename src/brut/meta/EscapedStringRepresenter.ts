import YamlStringEscapeUtils from './YamlStringEscapeUtils';

export default function EscapedStringRepresenter(data: any): string {
  return YamlStringEscapeUtils.escapeString(data.toString());
}
