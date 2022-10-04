import AndrolibException from 'brut/AndrolibException'

export default class UndefinedResObjectException extends AndrolibException {
  constructor (message?: string) {
    super('UndefinedResObjectException', message)
  }
}
