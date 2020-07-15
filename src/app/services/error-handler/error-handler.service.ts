import { ErrorHandler } from '@angular/core'

export enum ErrorCategory {
  CORDOVA_PLUGIN = 'cordova_plugin',
  IONIC_MODAL = 'ionic_modal',
  IONIC_ALERT = 'ionic_alert',
  IONIC_LOADER = 'ionic_loader',
  IONIC_NAVIGATION = 'navigation',
  WALLET_SERVICE = 'wallet_service',
  SCHEME_ROUTING = 'scheme_routing',
  SECURE_STORAGE = 'secure_storage',
  INIT_CHECK = 'init_check',
  ENTROPY_COLLECTION = 'entropy_collection',
  INTERACTION_SERVICE = 'interaction_service',
  DEEPLINK_SERVICE = 'deeplink_service',
  OTHER = 'other'
}

type ErrorHistoryObject = [ErrorCategory, string, string, string, string]

export class LocalErrorLogger {
  private readonly errorHistoryKey: string = 'ERROR_HISTORY'
  constructor() { }

  public async addLog(category: ErrorCategory, error: Error): Promise<void> {
    const storedErrors: ErrorHistoryObject[] = (await this.getErrorHistory()).slice(0, 99)
    storedErrors.unshift([
      category,
      error.name,
      error.message,
      error.stack,
      new Date().toString(),
    ])
    localStorage.setItem(this.errorHistoryKey, JSON.stringify(storedErrors))
  }

  public async getErrorHistory(): Promise<ErrorHistoryObject[]> {
    try {
      return JSON.parse(localStorage.getItem(this.errorHistoryKey)) || []
    } catch (e) {
      return []
    }
  }

  public async getErrorHistoryFormatted(): Promise<string> {
    const errorHistory = await this.getErrorHistory()

    return errorHistory.map(([category, name, message, stack, date]) => {
      return `[${category}] ${name}: ${message} (${date})
      ${stack}`
    }).join('\n\n')
  }
}

const errorLogger = new LocalErrorLogger()

type ErrorCallback = (error: Error & { originalError?: Error }) => void

const handleErrorLocal: (category: ErrorCategory) => ErrorCallback = (category?: ErrorCategory): ErrorCallback => {
  return (error: Error & { originalError?: Error }): void => {
    console.log('saving error locally, category', category)
    console.error(error.originalError || error)
    errorLogger.addLog(category, error)
  }
}

const handleErrorIgnore: ErrorCallback = (error: { originalError?: Error }): void => {
  console.log('ignoring error')
  console.error(error.originalError || error)
}

export { handleErrorIgnore, handleErrorLocal }

export class ErrorHandlerService extends ErrorHandler {
  public handleError(error: Error): void {
    super.handleError(error)
    handleErrorLocal(ErrorCategory.OTHER)(error)
  }
}
