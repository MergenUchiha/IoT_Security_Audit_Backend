import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger extends ConsoleLogger {
  log(message: any, ...optionalParams: any[]) {
    this.printStructuredLog('INFO', message, optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.printStructuredLog('ERROR', message, optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.printStructuredLog('WARN', message, optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    this.printStructuredLog('DEBUG', message, optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.printStructuredLog('VERBOSE', message, optionalParams);
  }

  private printStructuredLog(
    level: string,
    message: any,
    optionalParams: any[],
  ) {
    const context = optionalParams[optionalParams.length - 1] || this.context;
    // Nest passes trace in error as the second argument, and context as last
    let trace: string | undefined;
    let paramsToLog = optionalParams.slice();

    if (level === 'ERROR' && optionalParams.length >= 2) {
      trace = optionalParams[0];
      // remove trace from params if it's there
    }

    const payload = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      trace,
      ...this.extractAdditionalData(paramsToLog),
    };

    console.log(JSON.stringify(payload));
  }

  private extractAdditionalData(params: any[]) {
    if (!params.length) return {};
    const data: any = {};
    params.forEach((p, i) => {
      if (typeof p === 'object') {
        Object.assign(data, p);
      }
    });
    return data;
  }
}
