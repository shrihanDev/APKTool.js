import { Float, toFloat } from 'types/Float';
import { Int, toInt } from 'types/Int';

/**
 * Container for a dynamically typed data value. Primarily used with
 * Resources for holding resource values.
 */
export default class TypedValue {
  /** The value contains no data. */
  static TYPE_NULL: Int = toInt(0x00);

  /** The <var>data</var> field holds a resource identifier. */
  static TYPE_REFERENCE: Int = toInt(0x01);

  /**
   * The <var>data</var> field holds an attribute resource identifier
   * (referencing an attribute in the current theme style, not a resource
   * entry).
   */
  static TYPE_ATTRIBUTE: Int = toInt(0x02);

  /**
   * The <var>string</var> field holds string data. In addition, if
   * <var>data</var> is non-zero then it is the string block index of the
   * string and <var>assetCookie</var> is the set of assets the string came
   * from.
   */
  static TYPE_STRING: Int = toInt(0x03);

  /** The <var>data</var> field holds an IEEE 754 floating point number. */
  static TYPE_FLOAT: Int = toInt(0x04);

  /**
   * The <var>data</var> field holds a complex number encoding a dimension
   * value.
   */
  static TYPE_DIMENSION: Int = toInt(0x05);

  /**
   * The <var>data</var> field holds a complex number encoding a fraction of a
   * container.
   */
  static TYPE_FRACTION: Int = toInt(0x06);

  /**
   * The <var>data</var> holds a dynamic res table reference, which needs to be
   * resolved before it can be used like TYPE_REFERENCE
   */
  static TYPE_DYNAMIC_REFERENCE: Int = toInt(0x07);

  /**
   * The <var>data</var> an attribute resource identifier, which needs to be resolved
   * before it can be used like a TYPE_ATTRIBUTE.
   */
  static TYPE_DYNAMIC_ATTRIBUTE: Int = toInt(0x08);

  /**
   * Identifies the start of plain integer values. Any type value from this to
   * {@link #TYPE_LAST_INT} means the <var>data</var> field holds a generic
   * integer value.
   */
  static TYPE_FIRST_INT: Int = toInt(0x10);

  /**
   * The <var>data</var> field holds a number that was originally specified in
   * decimal.
   */
  static TYPE_INT_DEC: Int = toInt(0x10);

  /**
   * The <var>data</var> field holds a number that was originally specified in
   * hexadecimal (0xn).
   */
  static TYPE_INT_HEX: Int = toInt(0x11);

  /**
   * The <var>data</var> field holds 0 or 1 that was originally specified as
   * "false" or "true".
   */
  static TYPE_INT_BOOLEAN: Int = toInt(0x12);

  /**
   * Identifies the start of integer values that were specified as color
   * constants (starting with '#').
   */
  static TYPE_FIRST_COLOR_INT: Int = toInt(0x1c);
  /**
   * The <var>data</var> field holds a color that was originally specified as
   * #aarrggbb.
   */
  static TYPE_INT_COLOR_ARGB8: Int = toInt(0x1c);
  /**
   * The <var>data</var> field holds a color that was originally specified as
   * #rrggbb.
   */
  static TYPE_INT_COLOR_RGB8: Int = toInt(0x1d);
  /**
   * The <var>data</var> field holds a color that was originally specified as
   * #argb.
   */
  static TYPE_INT_COLOR_ARGB4: Int = toInt(0x1e);
  /**
   * The <var>data</var> field holds a color that was originally specified as
   * #rgb.
   */
  static TYPE_INT_COLOR_RGB4: Int = toInt(0x1f);

  /**
   * Identifies the end of integer values that were specified as color
   * constants.
   */
  static TYPE_LAST_COLOR_INT: Int = toInt(0x1f);

  /** Identifies the end of plain integer values. */
  static TYPE_LAST_INT: Int = toInt(0x1f);

  /* ------------------------------------------------------------ */

  /** Complex data: bit location of unit information. */
  static COMPLEX_UNIT_SHIFT: Int = toInt(0);
  /**
   * Complex data: mask to extract unit information (after shifting by
   * {@link #COMPLEX_UNIT_SHIFT}). This gives us 16 possible types, as defined
   * below.
   */
  static COMPLEX_UNIT_MASK: Int = toInt(0xf);

  /** {@link #TYPE_DIMENSION} complex unit: Value is raw pixels. */
  static COMPLEX_UNIT_PX: Int = toInt(0);
  /**
   * {@link #TYPE_DIMENSION} complex unit: Value is Device Independent Pixels.
   */
  static COMPLEX_UNIT_DIP: Int = toInt(1);
  /** {@link #TYPE_DIMENSION} complex unit: Value is a scaled pixel. */
  static COMPLEX_UNIT_SP: Int = toInt(2);
  /** {@link #TYPE_DIMENSION} complex unit: Value is in points. */
  static COMPLEX_UNIT_PT: Int = toInt(3);
  /** {@link #TYPE_DIMENSION} complex unit: Value is in inches. */
  static COMPLEX_UNIT_IN: Int = toInt(4);
  /** {@link #TYPE_DIMENSION} complex unit: Value is in millimeters. */
  static COMPLEX_UNIT_MM: Int = toInt(5);

  /**
   * {@link #TYPE_FRACTION} complex unit: A basic fraction of the overall size.
   */
  static COMPLEX_UNIT_FRACTION: Int = toInt(0);
  /** {@link #TYPE_FRACTION} complex unit: A fraction of the parent size. */
  static COMPLEX_UNIT_FRACTION_PARENT: Int = toInt(1);

  /**
   * Complex data: where the radix information is, telling where the decimal
   * place appears in the mantissa.
   */
  static COMPLEX_RADIX_SHIFT: Int = toInt(4);
  /**
   * Complex data: mask to extract radix information (after shifting by
   * {@link #COMPLEX_RADIX_SHIFT}). This give us 4 possible fixed point
   * representations as defined below.
   */
  static COMPLEX_RADIX_MASK: Int = toInt(0x3);

  /** Complex data: the mantissa is an integral number -- i.e., 0xnnnnnn.0 */
  static COMPLEX_RADIX_23p0: Int = toInt(0);
  /** Complex data: the mantissa magnitude is 16 bits -- i.e, 0xnnnn.nn */
  static COMPLEX_RADIX_16p7: Int = toInt(1);
  /** Complex data: the mantissa magnitude is 8 bits -- i.e, 0xnn.nnnn */
  static COMPLEX_RADIX_8p15: Int = toInt(2);
  /** Complex data: the mantissa magnitude is 0 bits -- i.e, 0x0.nnnnnn */
  static COMPLEX_RADIX_0p23: Int = toInt(3);

  /** Complex data: bit location of mantissa information. */
  static COMPLEX_MANTISSA_SHIFT: Int = toInt(8);
  /**
   * Complex data: mask to extract mantissa information (after shifting by
   * {@link #COMPLEX_MANTISSA_SHIFT}). This gives us 23 bits of precision); the
   * top bit is the sign.
   */
  static COMPLEX_MANTISSA_MASK: Int = toInt(0xffffff);

  /* ------------------------------------------------------------ */

  /**
   * {@link #TYPE_NULL} data indicating the value was not specified.
   */
  static DATA_NULL_UNDEFINED: Int = toInt(0);
  /**
   * {@link #TYPE_NULL} data indicating the value was explicitly set to null.
   */
  static DATA_NULL_EMPTY: Int = toInt(1);

  /* ------------------------------------------------------------ */

  /**
   * If density is equal to this value, then the density should be
   * treated as the system's default density value:
   */
  static DENSITY_DEFAULT: Int = toInt(0);

  /**
   * If density is equal to this value, then there is no density
   * associated with the resource and it should not be scaled.
   */
  static DENSITY_NONE: Int = toInt(0xffff);

  /* ------------------------------------------------------------ */

  /**
   * The type held by this value, as defined by the constants here. This tells
   * you how to interpret the other fields in the object.
   */
  type: Int = toInt(Number.MAX_SAFE_INTEGER);
  private static readonly MANTISSA_MULT: Float = toFloat(
    1 / (1 << this.COMPLEX_MANTISSA_SHIFT)
  );

  private static readonly RADIX_MULTS: Float[] = [
    this.MANTISSA_MULT,
    toFloat((1 / (1 << 7)) * this.MANTISSA_MULT),
    toFloat((1 / (1 << 15)) * this.MANTISSA_MULT),
    toFloat((1 / (1 << 23)) * this.MANTISSA_MULT)
  ];

  /**
   * Retrieve the base value from a complex data integer. This uses the
   * {@link #COMPLEX_MANTISSA_MASK} and {@link #COMPLEX_RADIX_MASK} fields of
   * the data to compute a floating point representation of the number they
   * describe. The units are ignored.
   *
   * @param {Int} complex
   *            A complex data value.
   *
   * @return {Float} A floating point value corresponding to the complex data.
   */
  public static complexToFloat(complex: Int): Float {
    return toFloat(
      (complex &
        (TypedValue.COMPLEX_MANTISSA_MASK <<
          TypedValue.COMPLEX_MANTISSA_SHIFT)) *
        this.RADIX_MULTS[
          (complex >> TypedValue.COMPLEX_RADIX_SHIFT) &
            TypedValue.COMPLEX_RADIX_MASK
        ]
    );
  }

  private static readonly DIMENSION_UNIT_STRS: string[] = [
    'px',
    'dip',
    'sp',
    'pt',
    'in',
    'mm'
  ];

  private static readonly FRACTION_UNIT_STRS: string[] = ['%', '%p'];

  /**
   * Perform type conversion as per coerceToString on an explicitly
   * supplied type and data.
   *
   * @param {Int} type The data type identifier.
   * @param {Int} data The data value.
   *
   * @return {string} The coerced string value. If the value is null or the type
   *         is not known, null is returned.
   */
  public static coerceToString(type: Int, data: Int): string | null {
    switch (type) {
      case this.TYPE_NULL:
        return null;
      case this.TYPE_REFERENCE:
        return `@${data}`;
      case this.TYPE_ATTRIBUTE:
        return `?${data}`;
      case this.TYPE_FLOAT:
        return toFloat(data).toString();
      case this.TYPE_DIMENSION:
        return `${this.complexToFloat(data)}${
          this.DIMENSION_UNIT_STRS[
            (data >> this.COMPLEX_UNIT_SHIFT) & this.COMPLEX_UNIT_MASK
          ]
        }`;
      case this.TYPE_FRACTION:
        return `${this.complexToFloat(data) * 100}${
          this.FRACTION_UNIT_STRS[
            (data >> this.COMPLEX_UNIT_SHIFT) & this.COMPLEX_UNIT_MASK
          ]
        }`;
      case this.TYPE_INT_HEX:
        return `0x${data}`;
      case this.TYPE_INT_BOOLEAN:
        return data !== 0 ? 'true' : 'false';
    }
    if (type >= this.TYPE_FIRST_COLOR_INT && type <= this.TYPE_LAST_COLOR_INT) {
      let res: string = data.toString();
      const vals: string[] = res.split('');
      switch (type) {
        case this.TYPE_INT_COLOR_ARGB8: // #AaRrGgBb
          break;
        case this.TYPE_INT_COLOR_RGB8: // #FFRrGgBb->#RrGgBb
          res = res.substring(2);
          break;
        case this.TYPE_INT_COLOR_ARGB4: // #AARRGGBB->#ARGB
          res = vals[0].toString() + vals[2] + vals[4] + vals[6];
          break;
        case this.TYPE_INT_COLOR_RGB4: // #FFRRGGBB->#RGB
          res = vals[2].toString() + vals[4] + vals[6];
          break;
      }
      return '#' + res;
    } else if (type >= this.TYPE_FIRST_INT && type <= this.TYPE_LAST_INT) {
      let res: string | null = null;
      if (type === this.TYPE_INT_DEC) {
        res = data.toString();
      }
      return res;
    }

    return null;
  }
}
