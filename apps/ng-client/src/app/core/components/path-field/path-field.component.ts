import { Component, Input, OnDestroy, Output, EventEmitter } from '@angular/core';
import { IpcResponseCode } from '@oam-kit/shared-interfaces';
import { IpcService } from '../../services/ipc.service';

enum Type {
  DIR = 'dir',
  FILE = 'file',
}

@Component({
  selector: 'app-path-field',
  template: `
    <style>
      .icon {
        cursor: pointer;
      }
      .icon:hover {
        color: #40a9ff;
      }
    </style>
    <i nz-icon class="icon" nzType="folder" nzTheme="outline" (click)="toSelectPath($event)"></i>
  `,
  styles: [':host { display: block; }'],
})
export class PathInputComponent implements OnDestroy {
  @Output() valueChange: EventEmitter<string> = new EventEmitter();

  @Input() value!: string;

  @Input() type: Type = Type.DIR;

  private get isDirectory(): boolean {
    return this.type === Type.DIR;
  }

  public setValue(value: string) {
    this.valueChange.emit(value);
  }

  constructor(private ipcService: IpcService) {}

  ngOnDestroy(): void {
    this.ipcService.destroy();
  }

  public async toSelectPath(e: Event) {
    const isDirectory = this.isDirectory;
    const res = await this.ipcService.send('/file/select_path', { isDirectory });
    if (res.code === IpcResponseCode.success) {
      this.setValue(res.data);
    }
    e.stopPropagation();
  }
}