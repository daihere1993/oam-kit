import { Logger } from 'winston';
import { SyncCodeStep } from './types';

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;
    // This clips the constructor invocation from the stack trace.
    // It's not absolutely essential, but it does make the stack trace a little nicer.
    Error.captureStackTrace(this, this.constructor);
  }
}

export class SyncCodeError extends DomainError {
  public step: SyncCodeStep;

  constructor(logger: Logger, step: SyncCodeStep, message: string) {
    super(`${step}: ${message}`);
    this.step = step;
    logger.error(this.message, { needInformFrontEnd: true });
  }
} 
