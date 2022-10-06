import { existsSync, PathLike, readFileSync, writeFileSync } from 'fs';
import { Attribute, Document, Element, parseXml } from 'libxmljs2';
import { dirname, join } from 'path';

export default class ResXmlPatcher {
  /**
   * Removes "debug" tag from file
   *
   * @param file AndroidManifest file
   * @throws AndrolibException Error reading Manifest file
   */
  public static removeApplicationDebugTag(file: PathLike): void {
    if (existsSync(file)) {
      try {
        // XMLDoc library:
        // const doc: XmlDocument = this.loadDocument(file);
        // const application: XmlElement = doc.descendantWithPath('application')!;
        // // load attr
        // const attr: XmlAttributes = application.attr;
        // const debugAttr: string = attr['android:debuggable'];
        // // remove application:debuggable
        // if (debugAttr !== null && debugAttr !== undefined && debugAttr !== '') {
        //   att
        // }
        const doc: Document = this.loadDocument(file);
        const application: Element = doc.get('/application')!;

        // load attr
        const debugAttr: Attribute | null =
          application.attr('android:debuggable');

        if (debugAttr !== null) {
          debugAttr.remove();
        }

        this.saveDocument(file, doc);
      } catch (ignored) {}
    }
  }

  /**
   * Sets "debug" tag in the file to true
   *
   * @param file AndroidManifest file
   */
  public static setApplicationDebugTagTrue(file: PathLike): void {
    if (existsSync(file)) {
      try {
        const doc: Document = this.loadDocument(file);
        const application: Element = doc.get('/application')!;

        // load attr
        const debugAttr: Attribute | null =
          application.attr('android:debuggable');

        if (debugAttr === null) {
          // set application:debuggable to 'true'
          application.attr('android:debuggable', 'true');
        }

        this.saveDocument(file, doc);
      } catch (ignored) {}
    }
  }

  /**
   * Sets the value of the network security config in the AndroidManifest file
   *
   * @param file AndroidManifest file
   */
  public static setNetworkSecurityConfig(file: PathLike): void {
    if (existsSync(file)) {
      try {
        const doc: Document = this.loadDocument(file);
        const application: Element = doc.get('/application')!;

        // load attr
        const netSecConfAttr: Attribute | null =
          application.attr('android:debuggable');

        if (netSecConfAttr === null) {
          // there is not an already existing network security configuration
          application.attr('android:networkSecurityConfig', '');
        }
        // whether it already existed or it was created now set it to the proper value
        application.attr(
          'android:networkSecurityConfig',
          '@xml/network_security_config'
        );

        this.saveDocument(file, doc);
      } catch (ignored) {}
    }
  }

  /**
   * Creates a modified network security config file that is more permissive
   *
   * @param file network security config file
   * @throws TransformerException XML file could not be edited
   * @throws IOException XML file could not be located
   * @throws SAXException XML file could not be read
   * @throws ParserConfigurationException XML nodes could be written
   */
  public static modNetworkSecurityConfig(file: PathLike): void {
    const document: Document = new Document();
    document
      .node('network-security-config')
      .node('base-config')
      .node('trust-anchors')
      .node('certificates')
      .attr('src', 'system')
      .parent()
      .node('certificates')
      .attr('user');

    this.saveDocument(file, document);
  }

  /**
   * Any @string reference in a provider value in AndroidManifest.xml will break on
   * build, thus preventing the application from installing. This is from a bug/error
   * in AOSP where public resources cannot be part of an authorities attribute within
   * a provider tag.
   *
   * This finds any reference and replaces it with the literal value found in the
   * res/values/strings.xml file.
   *
   * @param file File for AndroidManifest.xml
   */
  public static fixingPublicAttrsInProviderAttributes(file: PathLike): void {
    let saved: boolean = false;
    if (existsSync(file)) {
      try {
        const doc: Document = this.loadDocument(file);
        let xPathExp = '/manifest/application/provider';
        let nodes: Element[] = doc.find(xPathExp)!;

        for (let i = 0; i < nodes.length; i++) {
          const node: Element = nodes[i];
          const provider: Attribute | null = node.attr('android:authorities');
          if (provider !== null) {
            saved = this.isSaved(file, saved, provider);
          }
        }

        // android:scheme
        xPathExp = '/manifest/application/activity/intent-filter/data';
        nodes = doc.find(xPathExp)!;

        for (let i = 0; i < nodes.length; i++) {
          const node: Element = nodes[i];
          const provider: Attribute | null = node.attr('android:scheme');

          if (provider !== null) {
            saved = this.isSaved(file, saved, provider);
          }
        }

        if (saved) {
          this.saveDocument(file, doc);
        }
      } catch (ignored) {}
    }
  }

  /**
   * Checks if the replacement was properly made to a node.
   *
   * @param file File we are searching for value
   * @param saved boolean on whether we need to save
   * @param provider Node we are attempting to replace
   * @return boolean
   */
  private static isSaved(
    file: PathLike,
    saved: boolean,
    provider: Attribute
  ): boolean {
    const reference: string = provider.value();
    const replacement: string | null = this.pullValueFromStrings(
      dirname(file.toString()),
      reference
    );

    if (replacement !== null) {
      provider.value(replacement);
      saved = true;
    }
    return saved;
  }

  /**
   * Finds key in strings.xml file and returns text value
   *
   * @param directory Root directory of apk
   * @param key String reference (ie @string/foo)
   * @return String|null
   */
  public static pullValueFromStrings(
    directory: PathLike,
    key: string
  ): string | null {
    if (key === null || key === undefined || key === '' || !key.includes('@')) {
      return null;
    }

    const file: PathLike = join(
      directory.toString(),
      '/res/values/strings.xml'
    );
    key = key.replace('@string/', '');

    if (existsSync(file)) {
      try {
        const doc: Document = this.loadDocument(file);
        const xPathExp: string = `/resources/string[@name="${key}"]`;
        const node: Element | null = doc.get(xPathExp);
        if (node !== null) {
          const result: string = node.text();
          if (result !== '') {
            return result;
          }
        }
      } catch (ignored) {}
    }

    return null;
  }

  /**
   * Finds key in integers.xml file and returns text value
   *
   * @param directory Root directory of apk
   * @param key Integer reference (ie @integer/foo)
   * @return String|null
   */
  public static pullValueFromIntegers(
    directory: PathLike,
    key: string
  ): string | null {
    if (key === null || key === undefined || key === '' || !key.includes('@')) {
      return null;
    }

    const file: PathLike = join(
      directory.toString(),
      '/res/values/integers.xml'
    );
    key = key.replace('@integer/', '');

    if (existsSync(file)) {
      try {
        const doc: Document = this.loadDocument(file);
        const xPathExp: string = `/resources/integer[@name="${key}"]`;
        const node: Element | null = doc.get(xPathExp);
        if (node !== null) {
          const result: string = node.text();
          if (result !== '') {
            return result;
          }
        }
      } catch (ignored) {}
    }

    return null;
  }

  /**
   * Removes attributes like "versionCode" and "versionName" from file.
   *
   * @param file File representing AndroidManifest.xml
   */
  public static removeManifestVersions(file: PathLike): void {
    if (existsSync(file)) {
      try {
        const doc: Document = this.loadDocument(file);
        const manifest: Element = doc.child(0) as Element;
        const vCode: Attribute | null = manifest.attr('android:versionCode');
        const vName: Attribute | null = manifest.attr('android:versionName');

        if (vCode !== null) {
          vCode.remove();
        }

        if (vName !== null) {
          vName.remove();
        }

        this.saveDocument(file, doc);
      } catch (ignored) {}
    }
  }

  /**
   * Replaces package value with passed packageOriginal string
   *
   * @param file File for AndroidManifest.xml
   * @param packageOriginal Package name to replace
   */
  public static renameManifestPackage(
    file: PathLike,
    packageOriginal: string
  ): void {
    try {
      const doc: Document = this.loadDocument(file);

      // Get the manifest line
      const manifest: Element = doc.child(0) as Element;

      // update package attribute
      const nodeAttr: Attribute | null = manifest.attr('package');
      nodeAttr!.value(packageOriginal);
      this.saveDocument(file, doc);
    } catch (ignored) {}
  }

  /**
   *
   * @param file File to load into Document
   * @return Document
   * @throws IOException
   * @throws SAXException
   * @throws ParserConfigurationException
   */
  private static loadDocument(file: PathLike): Document {
    return parseXml(readFileSync(file).toString('utf8'), {
      doctype: false,
      dtdload: false
    });
  }

  /**
   *
   * @param file File to save Document to (ie AndroidManifest.xml)
   * @param doc Document being saved
   * @throws IOException
   * @throws SAXException
   * @throws ParserConfigurationException
   * @throws TransformerException
   */
  private static saveDocument(file: PathLike, doc: Document): void {
    writeFileSync(file, doc.toString(true), { encoding: 'utf8' });
  }
}
