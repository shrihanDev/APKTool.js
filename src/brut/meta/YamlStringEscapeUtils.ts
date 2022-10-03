import { Int, toInt } from 'strict-types/Int';

export default class YamlStringEscapeUtils {
  public static escapeString(str: string) {
    return YamlStringEscapeUtils.escapeJavaStyleString(str, false, false);
  }
  /**
   * @param {string} str String to escape values in, may be null
   * @param {boolean} escapeSingleQuotes escapes single quotes if <code>true</code>
   * @param {boolean} escapeForwardSlash TODO
   * @return {string} the escaped string
   */
  private static escapeJavaStyleString(
    str: string,
    escapeSingleQuotes: boolean,
    escapeForwardSlash: boolean
  ) {
    let out: string = '';
    let sz: Int = toInt(str.length);
    for (let i = 0; i < sz; i++) {
      let ch: string = str.charAt(i);
      // "[^\t\n\r\u0020-\u007E\u0085\u00A0-\uD7FF\uE000-\uFFFD]"
      // handle unicode
      if (
        ch.charCodeAt(0)! > 0xfffd ||
        (ch.charCodeAt(0)! > 0xd7ff && ch.charCodeAt(0)! < 0xe000)
      )
        out += '\\u' + ch.charCodeAt(0).toString(16);
      else if (
        ch.charCodeAt(0)! > 0x7e &&
        ch.charCodeAt(0) != 0x85 &&
        ch.charCodeAt(0) < 0xa0
      )
        out += '\\u00' + ch.charCodeAt(0).toString(16);
      else if (ch.charCodeAt(0)! < 32) {
        switch (ch) {
          case '\t':
            out += '\\t';
            break;
          case '\n':
            out += '\\n';
            break;
          case '\r':
            out += '\\r';
            break;
          default:
            if (ch.charCodeAt(0) > 0xf)
              out += '\\u00' + ch.charCodeAt(0).toString(16);
            else out += '\\u000' + ch.charCodeAt(0).toString(16);
            break;
        }
      } else {
        switch (ch) {
          case "'":
            out += escapeSingleQuotes ? "\\'" : "'";
            break;
          case '"':
            out += '\\"';
            break;
          case '/':
            out += escapeForwardSlash ? '\\/' : '/';
            break;
          default:
            out += ch;
            break;
        }
      }
    }
  }

  /**
   * <p>Unescapes any Java literals found in the <code>String</code>.
   * For example, it will turn a sequence of <code>'\'</code> and
   * <code>'n'</code> into a newline character, unless the <code>'\'</code>
   * is preceded by another <code>'\'</code>.</p>
   *
   * @param {string} str  the <code>String</code> to unescape, may be null
   * @return {string} a new unescaped <code>String</code>, <code>null</code> if null string input
   */
  public static unescapeString(str: string): string {
    let replacements: { idx: Int; char: string }[] = [];
    let finalStr: string = '';
    for (
      let index = str.indexOf('\\');
      index >= 0;
      index = str.indexOf('\\', index + 1)
    ) {
      if (index == str.length - 1) break;
      let replChar: string = '';
      switch (str.charAt(index + 1)) {
        case '\\':
          replChar = '\\';
          break;
        case 'n':
          replChar = '\n';
          break;
        case 't':
          replChar = '\t';
          break;
        case 'r':
          replChar = '\r';
          break;
        case 'u':
          let hexDigits = str.substring(index + 1, index + 5);
          replChar = eval(`\\u${hexDigits}`);
        default:
          replChar = `\\${str.charAt(index + 1)}`;
      }
      replacements.push({ idx: toInt(index + 1), char: replChar });
    }
    replacements.forEach(replacement => {
      finalStr = setCharAt(str, replacement.idx, replacement.char);
    });
    function setCharAt(str: string, index: Int, chr: string): string {
      if (index > str.length - 1) return str;
      return str.substring(0, index) + chr + str.substring(index + 1);
    }
    return finalStr;
  }
}
