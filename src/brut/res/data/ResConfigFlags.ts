import { value as getHashCode } from 'hashcode';
import { Int, toInt } from 'types/Int';

export default class ResConfigFlags {
  public mcc: Int;
  public mnc: Int;

  public language: string[];
  public region: string[];

  public orientation: Int;
  public touchscreen: Int;
  public density: Int;

  public keyboard: Int;
  public navigation: Int;
  public inputFlags: Int;

  public screenWidth: Int;
  public screenHeight: Int;

  public sdkVersion: Int;

  public screenLayout: Int;
  public uiMode: Int;
  public smallestScreenWidthDp: Int;

  public screenWidthDp: Int;
  public screenHeightDp: Int;

  private localeScript: string;
  private localeVariant: string;

  private screenLayout2: Int;
  private colorMode: Int;

  public isInvalid: boolean;

  private mQualifiers: string;

  private size: Int;

  constructor() {
    this.mcc = toInt(0);
    this.mnc = toInt(0);
    this.language = ['\0', '\0'];
    this.region = ['\0', '\0'];
    this.orientation = ResConfigFlags.ORIENTATION_ANY;
    this.touchscreen = ResConfigFlags.TOUCHSCREEN_ANY;
    this.density = ResConfigFlags.DENSITY_DEFAULT;
    this.keyboard = ResConfigFlags.KEYBOARD_ANY;
    this.navigation = ResConfigFlags.NAVIGATION_ANY;
    this.inputFlags = toInt(
      ResConfigFlags.KEYSHIDDEN_ANY | ResConfigFlags.NAVHIDDEN_ANY
    );
    this.screenWidth = toInt(0);
    this.screenHeight = toInt(0);
    this.sdkVersion = toInt(0);
    this.screenLayout = toInt(
      ResConfigFlags.SCREENLONG_ANY | ResConfigFlags.SCREENSIZE_ANY
    );
    this.uiMode = toInt(
      ResConfigFlags.UI_MODE_TYPE_ANY | ResConfigFlags.UI_MODE_NIGHT_ANY
    );
    this.smallestScreenWidthDp = toInt(0);
    this.screenWidthDp = toInt(0);
    this.screenHeightDp = toInt(0);
    this.localeScript = '';
    this.localeVariant = '';
    this.screenLayout2 = toInt(0);
    this.colorMode = ResConfigFlags.COLOR_WIDE_UNDEFINED;
    this.isInvalid = false;
    this.mQualifiers = '';
    this.size = toInt(0);
  }

  public setFlags(
    mcc: Int,
    mnc: Int,
    language: string[],
    region: string[],
    orientation: Int,
    touchscreen: Int,
    density: Int,
    keyboard: Int,
    navigation: Int,
    inputFlags: Int,
    screenWidth: Int,
    screenHeight: Int,
    sdkVersion: Int,
    screenLayout: Int,
    uiMode: Int,
    smallestScreenWidthDp: Int,
    screenWidthDp: Int,
    screenHeightDp: Int,
    localeScript: string,
    localeVariant: string,
    screenLayout2: Int,
    colorMode: Int,
    isInvalid: boolean,
    size: Int
  ): void {
    if (orientation < 0 || orientation > 3) {
      console.warn(`Invalid orientation value ${orientation}`);
      orientation = toInt(0);
      isInvalid = true;
    }
    if (touchscreen < 0 || touchscreen > 3) {
      console.warn(`Invalid touchscreen value ${touchscreen}`);
      touchscreen = toInt(0);
      isInvalid = true;
    }
    if (density < -1) {
      console.warn(`Invalid density value ${density}`);
      density = toInt(0);
      isInvalid = true;
    }
    if (keyboard < 0 || keyboard > 3) {
      console.warn(`Invalid keyboard value ${keyboard}`);
      keyboard = toInt(0);
      isInvalid = true;
    }
    if (navigation < 0 || navigation > 4) {
      console.warn(`Invalid navigation value ${navigation}`);
      navigation = toInt(0);
      isInvalid = true;
    }

    if (localeScript.length !== 0) {
      if (localeScript[0] === '\0') {
        localeScript = '';
      }
    } else {
      localeScript = '';
    }

    if (localeVariant.length !== 0) {
      if (localeVariant[0] === '\0') {
        localeVariant = '';
      }
    } else {
      localeVariant = '';
    }

    this.mcc = mcc;
    this.mnc = mnc;
    this.language = language;
    this.region = region;
    this.orientation = orientation;
    this.touchscreen = touchscreen;
    this.density = density;
    this.keyboard = keyboard;
    this.navigation = navigation;
    this.inputFlags = inputFlags;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.sdkVersion = sdkVersion;
    this.screenLayout = screenLayout;
    this.uiMode = uiMode;
    this.smallestScreenWidthDp = smallestScreenWidthDp;
    this.screenWidthDp = screenWidthDp;
    this.screenHeightDp = screenHeightDp;
    this.localeScript = localeScript;
    this.localeVariant = localeVariant;
    this.screenLayout2 = screenLayout2;
    this.colorMode = colorMode;
    this.isInvalid = isInvalid;
    this.size = size;
    this.mQualifiers = this.generateQualifiers();
  }

  public getQualifiers(): string {
    return this.mQualifiers;
  }

  private generateQualifiers(): string {
    let ret = '';
    if (this.mcc !== 0) {
      ret += `-mcc${this.mcc.toLocaleString('en-US', {
        minimumIntegerDigits: 3,
        useGrouping: false
      })}`;
      if (this.mnc !== ResConfigFlags.MNC_ZERO) {
        if (this.mnc !== 0) {
          ret += '-mnc';
          if (this.size <= 32) {
            if (this.mnc > 0 && this.mnc < 10) {
              ret += this.mnc.toLocaleString('en-US', {
                minimumIntegerDigits: 2,
                useGrouping: false
              });
            } else {
              ret += this.mnc.toLocaleString('en-US', {
                minimumIntegerDigits: 3,
                useGrouping: false
              });
            }
          }
        }
      } else {
        ret += '-mnc00';
      }
    } else {
      if (this.mnc !== 0) {
        ret += `-mnc${this.mnc}`;
      }
    }
    ret += this.getLocaleString();

    switch (this.screenLayout & ResConfigFlags.MASK_LAYOUTDIR) {
      case ResConfigFlags.SCREENLAYOUT_LAYOUTDIR_RTL:
        ret += '-ldrtl';
        break;
      case ResConfigFlags.SCREENLAYOUT_LAYOUTDIR_LTR:
        ret += '-ldltr';
        break;
    }
    if (this.smallestScreenWidthDp !== 0) {
      ret += `-sw${this.smallestScreenWidthDp}dp`;
    }
    if (this.screenWidthDp !== 0) {
      ret += `-w${this.screenWidthDp}dp`;
    }
    if (this.screenHeightDp !== 0) {
      ret += `-h${this.screenHeightDp}dp`;
    }
    switch (this.screenLayout & ResConfigFlags.MASK_SCREENSIZE) {
      case ResConfigFlags.SCREENSIZE_SMALL:
        ret += '-small';
        break;
      case ResConfigFlags.SCREENSIZE_NORMAL:
        ret += '-normal';
        break;
      case ResConfigFlags.SCREENSIZE_LARGE:
        ret += '-large';
        break;
      case ResConfigFlags.SCREENSIZE_XLARGE:
        ret += '-xlarge';
        break;
    }
    switch (this.screenLayout & ResConfigFlags.MASK_SCREENLONG) {
      case ResConfigFlags.SCREENLONG_YES:
        ret += '-long';
        break;
      case ResConfigFlags.SCREENLONG_NO:
        ret += '-notlong';
        break;
    }
    switch (this.screenLayout2 & ResConfigFlags.MASK_SCREENROUND) {
      case ResConfigFlags.SCREENLAYOUT_ROUND_NO:
        ret += '-notround';
        break;
      case ResConfigFlags.SCREENLAYOUT_ROUND_YES:
        ret += '-round';
        break;
    }
    switch (this.colorMode & ResConfigFlags.COLOR_HDR_MASK) {
      case ResConfigFlags.COLOR_HDR_YES:
        ret += '-highdr';
        break;
      case ResConfigFlags.COLOR_HDR_NO:
        ret += '-lowdr';
        break;
    }
    switch (this.colorMode & ResConfigFlags.COLOR_WIDE_MASK) {
      case ResConfigFlags.COLOR_WIDE_YES:
        ret += '-widecg';
        break;
      case ResConfigFlags.COLOR_WIDE_NO:
        ret += '-nowidecg';
        break;
    }
    switch (this.orientation) {
      case ResConfigFlags.ORIENTATION_PORT:
        ret += '-port';
        break;
      case ResConfigFlags.ORIENTATION_LAND:
        ret += '-land';
        break;
      case ResConfigFlags.ORIENTATION_SQUARE:
        ret += '-square';
        break;
    }
    switch (this.uiMode & ResConfigFlags.MASK_UI_MODE_TYPE) {
      case ResConfigFlags.UI_MODE_TYPE_CAR:
        ret += '-car';
        break;
      case ResConfigFlags.UI_MODE_TYPE_DESK:
        ret += '-desk';
        break;
      case ResConfigFlags.UI_MODE_TYPE_TELEVISION:
        ret += '-television';
        break;
      case ResConfigFlags.UI_MODE_TYPE_SMALLUI:
        ret += '-smallui';
        break;
      case ResConfigFlags.UI_MODE_TYPE_MEDIUMUI:
        ret += '-mediumui';
        break;
      case ResConfigFlags.UI_MODE_TYPE_LARGEUI:
        ret += '-largeui';
        break;
      case ResConfigFlags.UI_MODE_TYPE_GODZILLAUI:
        ret += '-godzillaui';
        break;
      case ResConfigFlags.UI_MODE_TYPE_HUGEUI:
        ret += '-hugeui';
        break;
      case ResConfigFlags.UI_MODE_TYPE_APPLIANCE:
        ret += '-appliance';
        break;
      case ResConfigFlags.UI_MODE_TYPE_WATCH:
        ret += '-watch';
        break;
      case ResConfigFlags.UI_MODE_TYPE_VR_HEADSET:
        ret += '-vrheadset';
        break;
    }
    switch (this.uiMode & ResConfigFlags.MASK_UI_MODE_NIGHT) {
      case ResConfigFlags.UI_MODE_NIGHT_YES:
        ret += '-night';
        break;
      case ResConfigFlags.UI_MODE_NIGHT_NO:
        ret += '-nonight';
        break;
    }
    switch (this.density) {
      case ResConfigFlags.DENSITY_DEFAULT:
        break;
      case ResConfigFlags.DENSITY_LOW:
        ret += '-ldpi';
        break;
      case ResConfigFlags.DENSITY_MEDIUM:
        ret += '-mdpi';
        break;
      case ResConfigFlags.DENSITY_HIGH:
        ret += '-hdpi';
        break;
      case ResConfigFlags.DENSITY_TV:
        ret += '-tvdpi';
        break;
      case ResConfigFlags.DENSITY_XHIGH:
        ret += '-xhdpi';
        break;
      case ResConfigFlags.DENSITY_XXHIGH:
        ret += '-xxhdpi';
        break;
      case ResConfigFlags.DENSITY_XXXHIGH:
        ret += '-xxxhdpi';
        break;
      case ResConfigFlags.DENSITY_ANY:
        ret += '-anydpi';
        break;
      case ResConfigFlags.DENSITY_NONE:
        ret += '-nodpi';
        break;
      default:
        ret += `-${this.density}dpi`;
    }
    switch (this.touchscreen) {
      case ResConfigFlags.TOUCHSCREEN_NOTOUCH:
        ret += '-notouch';
        break;
      case ResConfigFlags.TOUCHSCREEN_STYLUS:
        ret += '-stylus';
        break;
      case ResConfigFlags.TOUCHSCREEN_FINGER:
        ret += '-finger';
        break;
    }
    switch (this.inputFlags & ResConfigFlags.MASK_KEYSHIDDEN) {
      case ResConfigFlags.KEYSHIDDEN_NO:
        ret += '-keysexposed';
        break;
      case ResConfigFlags.KEYSHIDDEN_YES:
        ret += '-keyshidden';
        break;
      case ResConfigFlags.KEYSHIDDEN_SOFT:
        ret += '-keyssoft';
        break;
    }
    switch (this.keyboard) {
      case ResConfigFlags.KEYBOARD_NOKEYS:
        ret += '-nokeys';
        break;
      case ResConfigFlags.KEYBOARD_QWERTY:
        ret += '-qwerty';
        break;
      case ResConfigFlags.KEYBOARD_12KEY:
        ret += '-12key';
        break;
    }
    switch (this.inputFlags & ResConfigFlags.MASK_NAVHIDDEN) {
      case ResConfigFlags.NAVHIDDEN_NO:
        ret += '-navexposed';
        break;
      case ResConfigFlags.NAVHIDDEN_YES:
        ret += '-navhidden';
        break;
    }
    switch (this.navigation) {
      case ResConfigFlags.NAVIGATION_NONAV:
        ret += '-nonav';
        break;
      case ResConfigFlags.NAVIGATION_DPAD:
        ret += '-dpad';
        break;
      case ResConfigFlags.NAVIGATION_TRACKBALL:
        ret += '-trackball';
        break;
      case ResConfigFlags.NAVIGATION_WHEEL:
        ret += '-wheel';
        break;
    }
    if (this.screenWidth !== 0 && this.screenHeight !== 0) {
      if (this.screenWidth > this.screenHeight) {
        ret += `${this.screenWidth}x${this.screenHeight}`;
      } else ret += `${this.screenHeight}x${this.screenWidth}`;
    }
    if (
      this.sdkVersion > 0 &&
      this.sdkVersion >= this.getNaturalSdkVersionRequirement()
    ) {
      ret += `-v${this.sdkVersion}`;
    }
    if (this.isInvalid) {
      ret += `-ERR${ResConfigFlags.sErrCounter++}`;
    }

    return ret;
  }

  private getNaturalSdkVersionRequirement(): Int {
    if (
      (this.uiMode & ResConfigFlags.MASK_UI_MODE_TYPE) ===
        ResConfigFlags.UI_MODE_TYPE_VR_HEADSET ||
      (this.colorMode & ResConfigFlags.COLOR_WIDE_MASK) !== 0 ||
      (this.colorMode & ResConfigFlags.COLOR_HDR_MASK) !== 0
    ) {
      return ResConfigFlags.SDK_OREO;
    }

    if ((this.screenLayout2 & ResConfigFlags.MASK_SCREENROUND) !== 0) {
      return ResConfigFlags.SDK_MNC;
    }
    if (this.density === ResConfigFlags.DENSITY_ANY) {
      return ResConfigFlags.SDK_LOLLIPOP;
    }
    if (
      this.smallestScreenWidthDp !== 0 ||
      this.screenWidthDp !== 0 ||
      this.screenHeightDp !== 0
    ) {
      return ResConfigFlags.SDK_HONEYCOMB_MR2;
    }
    if (
      (this.uiMode &
        (ResConfigFlags.MASK_UI_MODE_TYPE |
          ResConfigFlags.MASK_UI_MODE_NIGHT)) !==
      ResConfigFlags.UI_MODE_NIGHT_ANY
    ) {
      return ResConfigFlags.SDK_FROYO;
    }
    if (
      (this.screenLayout &
        (ResConfigFlags.MASK_SCREENSIZE | ResConfigFlags.MASK_SCREENLONG)) !==
        ResConfigFlags.SCREENSIZE_ANY ||
      this.density !== ResConfigFlags.DENSITY_DEFAULT
    ) {
      return ResConfigFlags.SDK_DONUT;
    }

    return toInt(0);
  }

  private getLocaleString(): string {
    let sb: string = '';

    // check for old style non BCP47 tags
    // allows values-xx-rXX, values-xx, values-xxx-rXX
    // denies values-xxx, anything else
    if (
      this.localeVariant === '' &&
      this.localeScript === '' &&
      (this.region[0] !== '\0' || this.language[0] !== '\0') &&
      this.region.length !== 3
    ) {
      sb += `-${this.language.join()}`;
      if (this.region[0] !== '\0') {
        sb += `-r${this.region.join()}`;
      }
    } else {
      // BCP47
      if (this.language[0] === '\0' && this.region[0] === '\0') {
        return sb; // early return, no language or region
      }
      sb += '-b+';
      if (this.language[0] !== '\0') {
        sb += this.language.join();
      }
      if (this.localeScript !== '' && this.localeScript.length === 4) {
        sb += `+${this.localeScript}`;
      }
      if (
        (this.region.length === 2 || this.region.length === 3) &&
        this.region[0] !== '\0'
      ) {
        sb += `+${this.region.join()}`;
      }
      if (this.localeVariant !== null && this.localeVariant.length >= 5) {
        sb += `+${this.localeVariant.toUpperCase()}`;
      }
    }
    return sb;
  }

  public toString(): string {
    return this.getQualifiers() !== '' ? this.getQualifiers() : '[DEFAULT]';
  }

  public equals(object: Object): boolean {
    if (object === null) {
      return false;
    }
    if (!(object instanceof ResConfigFlags)) {
      return false;
    }
    const other: ResConfigFlags = object;
    return this.mQualifiers === other.mQualifiers;
  }

  public hashCode(): Int {
    let hash: Int = toInt(17);
    hash = toInt(31 * hash + getHashCode(this.mQualifiers));
    return hash;
  }

  // TODO: Dirty static hack. This counter should be a part of ResPackage,
  // but it would be hard right now and this feature is very rarely used.
  private static sErrCounter: Int = toInt(0);

  public static SDK_BASE: Int = toInt(1);
  public static SDK_BASE_1_1: Int = toInt(2);
  public static SDK_CUPCAKE: Int = toInt(3);
  public static SDK_DONUT: Int = toInt(4);
  public static SDK_ECLAIR: Int = toInt(5);
  public static SDK_ECLAIR_0_1: Int = toInt(6);
  public static SDK_ECLAIR_MR1: Int = toInt(7);
  public static SDK_FROYO: Int = toInt(8);
  public static SDK_GINGERBREAD: Int = toInt(9);
  public static SDK_GINGERBREAD_MR1: Int = toInt(10);
  public static SDK_HONEYCOMB: Int = toInt(11);
  public static SDK_HONEYCOMB_MR1: Int = toInt(12);
  public static SDK_HONEYCOMB_MR2: Int = toInt(13);
  public static SDK_ICE_CREAM_SANDWICH: Int = toInt(14);
  public static SDK_ICE_CREAM_SANDWICH_MR1: Int = toInt(15);
  public static SDK_JELLY_BEAN: Int = toInt(16);
  public static SDK_JELLY_BEAN_MR1: Int = toInt(17);
  public static SDK_JELLY_BEAN_MR2: Int = toInt(18);
  public static SDK_KITKAT: Int = toInt(19);
  public static SDK_LOLLIPOP: Int = toInt(21);
  public static SDK_LOLLIPOP_MR1: Int = toInt(22);
  public static SDK_MNC: Int = toInt(23);
  public static SDK_NOUGAT: Int = toInt(24);
  public static SDK_NOUGAT_MR1: Int = toInt(25);
  public static SDK_OREO: Int = toInt(26);
  public static SDK_OREO_MR1: Int = toInt(27);
  public static SDK_P: Int = toInt(28);
  public static SDK_Q: Int = toInt(29);
  public static SDK_R: Int = toInt(30);
  public static SDK_S: Int = toInt(31);
  public static SDK_S_V2: Int = toInt(32);
  public static SDK_T: Int = toInt(33);

  // AOSP has this as 10,000 for dev purposes.
  // platform_frameworks_base/commit/c7a1109a1fe0771d4c9b572dcf178e2779fc4f2d
  public static SDK_DEVELOPMENT: Int = toInt(10000);

  public static ORIENTATION_ANY: Int = toInt(0);
  public static ORIENTATION_PORT: Int = toInt(1);
  public static ORIENTATION_LAND: Int = toInt(2);
  public static ORIENTATION_SQUARE: Int = toInt(3);

  public static TOUCHSCREEN_ANY: Int = toInt(0);
  public static TOUCHSCREEN_NOTOUCH: Int = toInt(1);
  public static TOUCHSCREEN_STYLUS: Int = toInt(2);
  public static TOUCHSCREEN_FINGER: Int = toInt(3);

  public static DENSITY_DEFAULT: Int = toInt(0);
  public static DENSITY_LOW: Int = toInt(120);
  public static DENSITY_MEDIUM: Int = toInt(160);
  public static DENSITY_400: Int = toInt(190);
  public static DENSITY_TV: Int = toInt(213);
  public static DENSITY_HIGH: Int = toInt(240);
  public static DENSITY_XHIGH: Int = toInt(320);
  public static DENSITY_XXHIGH: Int = toInt(480);
  public static DENSITY_XXXHIGH: Int = toInt(640);
  public static DENSITY_ANY: Int = toInt(0xfffe);
  public static DENSITY_NONE: Int = toInt(0xffff);

  public static MNC_ZERO: Int = toInt(-1);

  public static MASK_LAYOUTDIR: Int = toInt(0xc0);
  public static SCREENLAYOUT_LAYOUTDIR_ANY: Int = toInt(0x00);
  public static SCREENLAYOUT_LAYOUTDIR_LTR: Int = toInt(0x40);
  public static SCREENLAYOUT_LAYOUTDIR_RTL: Int = toInt(0x80);
  public static SCREENLAYOUT_LAYOUTDIR_SHIFT: Int = toInt(0x06);

  public static MASK_SCREENROUND: Int = toInt(0x03);
  public static SCREENLAYOUT_ROUND_ANY: Int = toInt(0);
  public static SCREENLAYOUT_ROUND_NO: Int = toInt(0x1);
  public static SCREENLAYOUT_ROUND_YES: Int = toInt(0x2);

  public static KEYBOARD_ANY: Int = toInt(0);
  public static KEYBOARD_NOKEYS: Int = toInt(1);
  public static KEYBOARD_QWERTY: Int = toInt(2);
  public static KEYBOARD_12KEY: Int = toInt(3);

  public static NAVIGATION_ANY: Int = toInt(0);
  public static NAVIGATION_NONAV: Int = toInt(1);
  public static NAVIGATION_DPAD: Int = toInt(2);
  public static NAVIGATION_TRACKBALL: Int = toInt(3);
  public static NAVIGATION_WHEEL: Int = toInt(4);

  public static MASK_KEYSHIDDEN: Int = toInt(0x3);
  public static KEYSHIDDEN_ANY: Int = toInt(0x0);
  public static KEYSHIDDEN_NO: Int = toInt(0x1);
  public static KEYSHIDDEN_YES: Int = toInt(0x2);
  public static KEYSHIDDEN_SOFT: Int = toInt(0x3);

  public static MASK_NAVHIDDEN: Int = toInt(0xc);
  public static NAVHIDDEN_ANY: Int = toInt(0x0);
  public static NAVHIDDEN_NO: Int = toInt(0x4);
  public static NAVHIDDEN_YES: Int = toInt(0x8);

  public static MASK_SCREENSIZE: Int = toInt(0x0f);
  public static SCREENSIZE_ANY: Int = toInt(0x00);
  public static SCREENSIZE_SMALL: Int = toInt(0x01);
  public static SCREENSIZE_NORMAL: Int = toInt(0x02);
  public static SCREENSIZE_LARGE: Int = toInt(0x03);
  public static SCREENSIZE_XLARGE: Int = toInt(0x04);

  public static MASK_SCREENLONG: Int = toInt(0x30);
  public static SCREENLONG_ANY: Int = toInt(0x00);
  public static SCREENLONG_NO: Int = toInt(0x10);
  public static SCREENLONG_YES: Int = toInt(0x20);

  public static MASK_UI_MODE_TYPE: Int = toInt(0x0f);
  public static UI_MODE_TYPE_ANY: Int = toInt(0x00);
  public static UI_MODE_TYPE_NORMAL: Int = toInt(0x01);
  public static UI_MODE_TYPE_DESK: Int = toInt(0x02);
  public static UI_MODE_TYPE_CAR: Int = toInt(0x03);
  public static UI_MODE_TYPE_TELEVISION: Int = toInt(0x04);
  public static UI_MODE_TYPE_APPLIANCE: Int = toInt(0x05);
  public static UI_MODE_TYPE_WATCH: Int = toInt(0x06);
  public static UI_MODE_TYPE_VR_HEADSET: Int = toInt(0x07);

  // start - miui
  public static UI_MODE_TYPE_GODZILLAUI: Int = toInt(0x0b);
  public static UI_MODE_TYPE_SMALLUI: Int = toInt(0x0c);
  public static UI_MODE_TYPE_MEDIUMUI: Int = toInt(0x0d);
  public static UI_MODE_TYPE_LARGEUI: Int = toInt(0x0e);
  public static UI_MODE_TYPE_HUGEUI: Int = toInt(0x0f);
  // end - miui

  public static MASK_UI_MODE_NIGHT: Int = toInt(0x30);
  public static UI_MODE_NIGHT_ANY: Int = toInt(0x00);
  public static UI_MODE_NIGHT_NO: Int = toInt(0x10);
  public static UI_MODE_NIGHT_YES: Int = toInt(0x20);

  public static COLOR_HDR_MASK: Int = toInt(0xc);
  public static COLOR_HDR_NO: Int = toInt(0x4);
  public static COLOR_HDR_SHIFT: Int = toInt(0x2);
  public static COLOR_HDR_UNDEFINED: Int = toInt(0x0);
  public static COLOR_HDR_YES: Int = toInt(0x8);

  public static COLOR_UNDEFINED: Int = toInt(0x0);

  public static COLOR_WIDE_UNDEFINED: Int = toInt(0x0);
  public static COLOR_WIDE_NO: Int = toInt(0x1);
  public static COLOR_WIDE_YES: Int = toInt(0x2);
  public static COLOR_WIDE_MASK: Int = toInt(0x3);
}
