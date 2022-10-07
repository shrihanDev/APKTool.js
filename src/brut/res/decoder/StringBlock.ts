import { decode } from 'iconv-lite';
import { SmartBuffer } from 'smart-buffer';
import { Int, toInt } from 'types/Int';
import ResXmlEncoders from '../xml/ResXmlEncoders';
import StyledString from './StyledString';

export default class StringBlock {
  private readonly m_stringOffsets: Int[] | null;
  private m_strings: Uint8Array;
  private readonly m_styleOffsets: Int[] | null;
  private readonly m_styles: Int[] | null;
  private m_isUTF8: boolean;

  // ResChunk_header = header.type (0x0001) + header.headerSize (0x001C)
  private static readonly CHUNK_STRINGPOOL_TYPE: Int = toInt(0x001c0001);
  private static readonly CHUNK_NULL_TYPE: Int = toInt(0x00000000);
  private static readonly UTF8_FLAG: Int = toInt(0x00000100);

  /**
   * Reads whole (including chunk type) string block from stream. Stream must
   * be at the chunk type.
   * @param reader ExtDataInput
   * @return StringBlock
   *
   * @throws IOException Parsing resources.arsc error
   */
  public static read(reader: SmartBuffer): StringBlock {
    const chunkSize: Int = toInt(reader.readInt32LE());

    // ResStringPool_header
    const stringCount: Int = toInt(reader.readInt32LE());
    const styleCount: Int = toInt(reader.readInt32LE());
    const flags: Int = toInt(reader.readInt32LE());
    const stringsOffset: Int = toInt(reader.readInt32LE());
    const stylesOffset: Int = toInt(reader.readInt32BE());

    const block: StringBlock = new StringBlock();
    block.m_isUTF8 = (flags & this.UTF8_FLAG) !== 0;
    for (let i = 0; i <= stringCount; i++) {
      block.m_stringOffsets!.push(toInt(reader.readInt32LE()));
    }

    if (styleCount !== 0) {
      for (let i = 0; i <= styleCount; i++) {
        block.m_styleOffsets!.push(toInt(reader.readInt32LE()));
      }
    }

    let size: Int = toInt(
      (stylesOffset === 0 ? chunkSize : stylesOffset) - stringsOffset
    );
    block.m_strings = new Uint8Array(reader.readBuffer(size));

    if (stylesOffset !== 0) {
      size = toInt(chunkSize - stylesOffset);
      for (let i = 0; i <= size / 4; i++) {
        block.m_styleOffsets!.push(toInt(reader.readInt32LE()));
      }

      // read remaining bytes
      let remaining: Int = toInt(size % 4);
      if (remaining >= 1) {
        while (remaining-- > 0) {
          reader.readBuffer(1);
        }
      }
    }
    return block;
  }

  /**
   * Returns raw string (without any styling information) at specified index.
   * @param index int
   * @return String
   */
  public getString(index: Int): string | null {
    if (
      index < 0 ||
      this.m_stringOffsets === null ||
      index >= this.m_stringOffsets.length
    ) {
      return null;
    }
    let offset: Int = this.m_stringOffsets[index];
    let length: Int;

    let val: Int[];
    if (this.m_isUTF8) {
      val = StringBlock.getUtf8(this.m_strings, offset);
      offset = val[0];
    } else {
      val = StringBlock.getUtf16(this.m_strings, offset);
      offset = toInt(offset + val[0]);
    }
    // eslint-disable-next-line prefer-const
    length = val[1];
    return this.decodeString(offset, length);
  }

  /**
   * @param index Location (index) of string to process to HTML
   * @return String Returns string with style tags (html-like).
   */
  public getHTML(index: Int): string | null {
    const text: string | null = this.getString(index);
    if (text === null) {
      return null;
    }
    const style: Int[] | null = this.getStyle(index);
    if (style === null) {
      return ResXmlEncoders.escapeXmlChars(text);
    }

    // If the returned style is further in string, than string length. Lets skip it
    if (style[1] > text.length) {
      return ResXmlEncoders.escapeXmlChars(text);
    }

    // Convert styles to spans
    const spans: StyledString.Span[] = new Array<StyledString.spans>(
      style.length / 3
    );
    for (let i = 0; i < style.length; i += 3) {
      spans.push(
        new StyledString.Span(
          this.getString(style[i]),
          style[i + 1],
          style[i + 2]
        )
      );
    }
    // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
    spans.sort();

    const styledString: StyledString = new StyledString(text, spans);
    return styledString.toString();
  }

  /**
   * Finds index of the string. Returns -1 if the string was not found.
   *
   * @param str String to index location of
   * @return int (Returns -1 if not found)
   */
  public find(str: string | null): Int {
    if (str === null) {
      return toInt(-1);
    }
    for (let i = 0; i !== this.m_stringOffsets!.length; i++) {
      let offset: Int = this.m_stringOffsets![i];
      const length: Int = StringBlock.getShort(this.m_strings, offset);
      if (length !== str.length) {
        continue;
      }
      let j = 0;
      for (; j !== length; ++j) {
        offset = toInt(offset + 2);
        if (
          str.charAt(j) !==
          String.fromCharCode(StringBlock.getShort(this.m_strings, offset))
        ) {
          break;
        }
      }
      if (j === length) {
        return toInt(i);
      }
    }
    return toInt(-1);
  }

  constructor(strings?: Uint8Array, isUTF8?: boolean) {
    if (strings !== undefined && isUTF8 !== undefined) {
      this.m_strings = strings;
      this.m_isUTF8 = isUTF8;
    }
  }

  /**
   * Returns style information - array of int triplets, where in each triplet:
   * * first int is index of tag name ('b','i', etc.) * second int is tag
   * start index in string * third int is tag end index in string
   */
  private getStyle(index: Int): Int[] | null {
    if (this.m_styleOffsets === null || this.m_styles === null) {
      return null;
    }
    const offset: Int = toInt(this.m_styleOffsets[index] / 4);
    let count: Int = toInt(0);
    let style: Int[];

    for (let i = offset; i < this.m_styles.length; ++i) {
      if (this.m_styles[i] === -1) {
        break;
      }
      count = toInt(count + 1);
    }

    if (count === 0 || count % 3 !== 0) {
      return null;
    }
    // eslint-disable-next-line prefer-const
    style = new Array<Int>(count);

    for (let i = offset, j = 0; i < this.m_styles.length;) {
      if (this.m_styles[i] === -1) {
        break;
      }
      style[j++] = this.m_styles[i++];
    }
    return style;
  }

  decodeString(offset: Int, length: Int): string | null {
    try {
      const wrappedBuffer: Buffer = Buffer.from(this.m_strings, offset, length);
      return wrappedBuffer.toString(this.m_isUTF8 ? 'utf8' : 'utf16le');
    } catch (ex) {
      if (!this.m_isUTF8) {
        console.warn(
          `Failed to decode a string at offset ${offset} of length ${length}`
        );
        return null;
      }
    }

    try {
      const wrappedBufferRetry: Buffer = Buffer.from(
        this.m_strings,
        offset,
        length
      );
      // in some places, Android uses 3-byte UTF-8 sequences instead of 4-bytes.
      // If decoding failed, we try to use CESU-8 decoder, which is closer to what Android actually uses.
      return decode(wrappedBufferRetry, 'cesu-8');
    } catch (ex) {
      if (!this.m_isUTF8) {
        console.warn(
          `Failed to decode a string at offset ${offset} of length ${length} while using CESU-8 decoder`
        );
        return null;
      }
    }
    return null;
  }

  private static getShort(array: Uint8Array, offset: Int): Int {
    return toInt(((array[offset + 1] & 0xff) << 8) | (array[offset] & 0xff));
  }

  private static getUtf8(array: Uint8Array, offset: Int): Int[] {
    let val: Int = toInt(array[offset]);
    let length: Int;
    // We skip the utf16 length of the string
    if ((val & 0x80) !== 0) {
      offset = toInt(offset + 2);
    } else {
      offset = toInt(offset + 1);
    }
    // And we read only the utf-8 encoded length
    val = toInt(array[offset]);
    offset++;
    if ((val & 0x80) !== 0) {
      const low = array[offset] & 0xff;
      length = toInt(((val & 0x7f) << 8) + low);
      offset++;
    } else {
      length = val;
    }
    return new Array<Int>(offset, length);
  }

  private static getUtf16(array: Uint8Array, offset: Int): Int[] {
    const val: Int = toInt(
      ((array[offset + 1] & 0xff) << 8) | (array[offset] & 0xff)
    );

    if ((val & 0x8000) !== 0) {
      const high: Int = toInt((array[offset + 3] & 0xff) << 8);
      const low: Int = toInt(array[offset + 2] & 0xff);
      const lenValue: Int = toInt(((val & 0x7fff) << 16) + (high + low));
      return new Array<Int>(toInt(4), toInt(lenValue * 2));
    }
    return new Array<Int>(toInt(2), toInt(val * 2));
  }
}
