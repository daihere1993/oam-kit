import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { RbService } from '@ng-client/core/services/rb.service';
import { LOG_PHASE, LOG_TYPE } from '@oam-kit/logger';
import { Observable, Observer, Subject } from 'rxjs';
import { RbItem } from './auto-commit.component';

@Component({
  selector: 'app-attachbar',
  template: `
    <style>
      .rb-form__input {
        width: 330px;
      }
      .link-input__alert {
        width: 330px;
      }
      form > nz-form-item {
        margin: 0;
      }
    </style>
    <form nz-form [formGroup]="validateForm" nzLayout="inline">
      <nz-form-item>
        <nz-form-control nzHasFeedback nzValidatingTip="Validating..." [nzErrorTip]="linkErrorTpl">
          <input #attachedLink class="rb-form__input" nz-input formControlName="link" placeholder="RB link" />
          <ng-template #linkErrorTpl let-control>
            <ng-container *ngIf="control.hasError('notValid')">
              <p class="link-input__alert">Please input right RB link like: http://biedronka.emea.nsn-net.net/r/92555/</p>
            </ng-container>
            <ng-container *ngIf="control.hasError('existed')">
              <p class="link-input__alert">This RB has been attached.</p>
            </ng-container>
          </ng-template>
        </nz-form-control>
      </nz-form-item>
      <nz-form-item>
        <nz-form-control>
          <button
            nz-button
            nzType="primary"
            data-btn-type="attach"
            [disabled]="!validateForm.valid"
            [nzLoading]="isAttaching"
            (click)="attachRb(attachedLink.value)"
          >
            {{ isAttaching ? 'Attaching...' : 'Attach' }}
          </button>
        </nz-form-control>
      </nz-form-item>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachbarComponent {
  @Input() rbList: RbItem[] = [];
  @Input() onLogChange: Subject<string>;
  @Output() attached = new EventEmitter<RbItem>();

  public isAttaching = false;
  public validateForm: FormGroup;

  linkValidator = (control: FormControl) =>
    new Observable((observer: Observer<ValidationErrors | null>) => {
      setTimeout(() => {
        const link = control.value;
        if (!this.isRbLink(link)) {
          observer.next({ error: true, notValid: true });
        } else if (this.linkExisted(link)) {
          observer.next({ error: true, existed: true });
        } else {
          observer.next(null);
        }
        observer.complete();
      }, 500);
    });

  constructor(private fb: FormBuilder, private rbService: RbService, private cdr: ChangeDetectorRef) {
    this.validateForm = this.fb.group({
      link: ['', [Validators.required], [this.linkValidator]],
    });
  }

  async attachRb(link: string) {
    const _link = this.formatLink(link);
    this.isAttaching = true;

    const rb = new RbItem({ link: _link }, this.onLogChange);
    rb.logger.insert(LOG_PHASE.RB_ATTACH, LOG_TYPE.RB_ATTACH__START, { link: _link });

    const { isSuccessed } = await this.rbService.completeRbInfo(rb);
    if (isSuccessed) {
      this.attached.next(rb);
    }
    this.isAttaching = false;
    this.cdr.detectChanges();
  }

  private findRbByLink(link: string) {
    return this.rbList.find((item) => item.link === link);
  }

  private isRbLink(link: string) {
    return !!link.match(/http:\/\/biedronka.emea.nsn-net.net\/r\/(\d+)/);
  }

  private linkExisted(link: string) {
    return !!this.findRbByLink(link);
  }

  /**
   * Link must end with a slash like: http://biedronka.emea.nsn-net.net/r/76664/
   * instead of http://biedronka.emea.nsn-net.net/r/76664, review board doesn't accept this type of link.
   */
  private formatLink(link: string) {
    if (link.match(/.+\//)[0] === link) {
      return link;
    } else {
      return link + '/';
    }
  }
}