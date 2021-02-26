import { produce } from 'immer';

export enum StepStatus {
  WAIT = 'wait',
  TIMEOUT = 'wait',
  FAILED = 'error',
  ONGOING = 'process',
  FINISHED = 'finish',
}

export enum StepperStatus {
  ONGOING = 'process',
  FAILED = 'error',
  FINISHED = 'finish',
  WAIT = 'wait',
}

export class Step {
  index?: number;
  title: string;
  type: string;
  description: string;
  status?: StepStatus;
}


export class Stepper {
  steps: Step[] = [];
  errorInfo: string;

  get status(): StepperStatus {
    let nOngoing = 0;
    let nFailed = 0;
    let nFinished = 0;
    for (const step of this.steps) {
      if (step.status === StepStatus.ONGOING) {
        nOngoing++;
        break;
      } else if (step.status === StepStatus.FAILED) {
        nFailed++;
        break;
      } else if (step.status === StepStatus.FINISHED) {
        nFinished++;
      }
    }

    if (nOngoing === 1) {
      return StepperStatus.ONGOING;
    } else if (nFailed === 1) {
      return StepperStatus.FAILED;
    } else if (nFinished === this.steps.length) {
      return StepperStatus.FINISHED;
    } else {
      return StepperStatus.WAIT;
    }
  }

  constructor(steps: Step[]) {
    this.steps = produce(steps, (draft) => {
      for (let i = 0; i < steps.length; i++) {
        draft[i].index = i;
        draft[i].status = StepStatus.WAIT;
      }
    });
  }

  start() {
    this.steps = produce(this.steps, (draft) => {
      draft[0].status = StepStatus.ONGOING;
    });
    this.steps = produce(this.steps, (draft) => {
      for (let i = 1; i < this.steps.length; i++) {
        draft[i].status = StepStatus.WAIT;
      }
    });
    
  }

  finish() {
    this.steps = produce(this.steps, (draft) => {
      for (let i = 0; i < this.steps.length; i++) {
        draft[i].status = StepStatus.FINISHED;
      }
    });
  }

  setStatusForSingleStep(type: string, status: StepStatus) {
    const index = this.steps.findIndex((step) => step.type === type);
    
    if (index === -1) {
      throw new Error(`Can find the step for "${type}"`);
    }
    const current = this.steps[index];

    this.steps = produce(this.steps, (draft) => {
      draft[index].status = status;
    });
    if (status === StepStatus.FAILED) {
      this.steps = produce(this.steps, (draft) => {
        for (let i = current.index + 1; i < this.steps.length; i++) {
          draft[i].status = StepStatus.TIMEOUT;
        }
      });
    } else if (status === StepStatus.FINISHED && !this.isLastStep(current)) {
      this.steps = produce(this.steps, (draft) => {
        draft[current.index + 1].status = StepStatus.ONGOING;
      });
    }
  }

  private isLastStep(step: Step): boolean {
    return step.index === this.steps.length - 1;
  }
}
