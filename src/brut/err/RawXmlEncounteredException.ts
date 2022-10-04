import AndrolibException from 'brut/AndrolibException'

export default class RawXmlEncounteredException extends AndrolibException {
  constructor (message?: string) {
    super('RawXmlEncounteredException', message)
  }
}
