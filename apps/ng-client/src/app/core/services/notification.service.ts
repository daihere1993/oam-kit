import { Injectable } from '@angular/core';
import { NzNotificationDataOptions, NzNotificationService } from 'ng-zorro-antd/notification';

const PLACEMENT = 'bottomRight';
const defaultOpts: NzNotificationDataOptions = {
  nzPlacement: PLACEMENT
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private nzNotification: NzNotificationService) {}

  info(title: string, message: string, opts?: NzNotificationDataOptions) {
    this.nzNotification.create('info', title, message, { ...defaultOpts, ...opts });
  }

  success(title: string, message: string, opts?: NzNotificationDataOptions) {
    this.nzNotification.create('success', title, message, { ...defaultOpts, ...opts });
  }

  error(title: string, message: string, opts?: NzNotificationDataOptions) {
    this.nzNotification.create('error', title, message, { ...defaultOpts, ...opts });
  }
}