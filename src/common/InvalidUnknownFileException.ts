import BrutException from 'common/BrutException'

export default class InvalidUnknownFileException extends BrutException {
  constructor (message: string) {
    super(message)
  }
}
