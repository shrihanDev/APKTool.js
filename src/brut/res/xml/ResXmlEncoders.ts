import { Int, toInt } from 'strict-types/Int';
import Duo from 'util/Duo';

export default class ResXmlEncoders {
  public static escapeXmlChars(str: string): string {
    return str.replace('&', '&amp;').replace('<', '&lt;');
  }

  public static encodeAsResXmlAttr(str: string): string {
    if (str === '') {
      return str;
    }

    const chars: string[] = str.split('');
    let out: string = '';

    switch (chars[0]) {
      case '#':
      case '@':
      case '?':
        out += '\\';
    }

    for (const c of chars) {
      switch (c) {
        case '\\':
          out += '\\';
          break;
        case '"':
          out += '&quot;';
          continue;
        case '\n':
          out += '\\n';
          continue;
        default:
          if (!this.isPrintableChar(c)) {
            out += `\\u${c.charCodeAt(0).toString(16)}`;
            continue;
          }
      }
      out += c;
    }

    return out;
  }

  public static encodeAsXmlValue(str: string): string {
    if (str === '') {
      return str;
    }

    const chars: string[] = str.split('');
    let out: string = '';

    switch (chars[0]) {
      case '#':
      case '@':
      case '?':
        out += '\\';
    }

    let isInStyleTag: boolean = false;
    let startPos: Int = toInt(0);
    let enclose: boolean = false;
    let wasSpace: boolean = true;
    for (const c of chars) {
      if (isInStyleTag) {
        if (c === '>') {
          isInStyleTag = false;
          startPos = toInt(out.length + 1);
          enclose = false;
        }
      } else if (c === ' ') {
        if (wasSpace) {
          enclose = true;
        }
        wasSpace = true;
      } else {
        wasSpace = false;
        switch (c) {
          case '\\':
          case '"':
            out += '\\';
            break;
          case "'":
          case '\n':
            enclose = true;
            break;
          case '<':
            isInStyleTag = true;
            if (enclose) {
              out = insert(out, startPos, '"');
              out += '"';
            }
            break;
          default:
            if (!this.isPrintableChar(c)) {
              // lets not write trailing \u0000 if we are at end of string
              if (out.length + 1 === str.length && c === '\u0000') {
                continue;
              }
              out += `\\u${c.charCodeAt(0).toString(16)}`;
              continue;
            }
        }
      }
      out += c;
    }

    if (enclose || wasSpace) {
      insert(out, startPos, '"');
      out += '"';
    }
    return out;
  }

  public static hasMultipleNonPositionalSubstitutions(str: string): boolean {
    const tuple: Duo<Int[], Int[]> = this.findSubstitutions(str, toInt(4));
    return tuple.m1.length !== 0 && tuple.m1.length + tuple.m2.length > 1;
  }

  public static enumerateNonPositionalSubstitutionsIfRequired(
    str: string
  ): string {
    const tuple: Duo<Int[], Int[]> = this.findSubstitutions(str, toInt(4));
    if (tuple.m1.length === 0 || tuple.m1.length + tuple.m2.length < 2) {
      return str;
    }
    const subs: Int[] = tuple.m1;

    let out: string = '';
    let pos: Int = toInt(0);
    let count: Int = toInt(0);
    for (let sub of subs) {
      out += str.substr(pos, ++sub);
      out += (++count).toString();
      out += '$';
      pos = sub;
    }
    out += str.substring(pos);

    return out;
  }

  private static findSubstitutions(
    str: string,
    nonPosMax: Int
  ): Duo<Int[], Int[]> {
    if (nonPosMax === -1) {
      nonPosMax = toInt(Number.MAX_SAFE_INTEGER);
    }
    let pos: Int;
    let pos2: Int = toInt(0);
    const nonPositional: Int[] = new Array<Int>();
    const positional: Int[] = new Array<Int>();

    if (str === '') {
      return new Duo(nonPositional, positional);
    }

    const length = str.length;

    while ((pos = toInt(str.indexOf('%', pos2))) !== -1) {
      pos2 = toInt(pos + 1);
      if (pos2 === length) {
        nonPositional.push(pos);
        break;
      }
      let c: string = str.charAt(pos2++);
      if (c === '%') {
        continue;
      }
      if (
        c.charCodeAt(0) >= '0'.charCodeAt(0) &&
        c.charCodeAt(0) <= '9'.charCodeAt(0) &&
        pos2 < length
      ) {
        while (
          (c = str.charAt(pos2++)).charCodeAt(0) >= '0'.charCodeAt(0) &&
          c.charCodeAt(0) <= '9'.charCodeAt(0) &&
          pos2 < length
        ) {
          if (c === '$') {
            positional.push(pos);
            continue;
          }
        }
      }

      nonPositional.push(pos);
      if (nonPositional.length >= nonPosMax) {
        break;
      }
    }

    return new Duo(nonPositional, positional);
  }

  private static isPrintableChar(c: string): boolean {
    const match: RegExpMatchArray | null = c.match(
      // eslint-disable-next-line no-control-regex
      /[\u0000-\u001F\u007F-\u009F]/
    );
    if (match === null || match.length !== 0) {
      return true;
    } else {
      return false;
    }
  }
}

function insert(str: string, index: Int, newStr: string): string {
  if (index > 0) {
    return str.substring(0, index) + newStr + str.substring(index);
  }
  return newStr + str;
}
