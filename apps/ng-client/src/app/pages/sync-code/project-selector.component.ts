import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { NzModalService } from 'ng-zorro-antd/modal';
import { Project, SyncCodeModel } from '@oam-kit/utility/types';
import { ProjectSettingComponent, DialogRes, DialogAction } from './project-setting.component';
import { StoreService } from '@ng-client/core/services/store.service';
import { MODEL_NAME } from '@oam-kit/utility/overall-config';
import { Model } from '@oam-kit/utility/model';

@Component({
  selector: 'app-project-selector',
  template: `
    <style>
      :host(branch-selector) {
        display: block;
      }
      .container {
        display: flex;
      }
      .option_container {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .add_branch_container {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      nb-icon {
        color: #8f9bb3;
      }
      nz-select {
        width: 200px;
      }
      nz-divider {
        margin: 4px 0;
      }
    </style>
    <div class="container">
      <nz-select
        [ngModel]="selected"
        (ngModelChange)="setSelection($event)"
        [disabled]="disabled"
        [nzDropdownRender]="addBranchOption"
      >
        <nz-option
          *ngFor="let project of projects; trackBy: trackFn"
          nzCustomContent
          [nzLabel]="project.name"
          [nzValue]="project"
        >
          <div class="option_container">
            <span>{{ project.name }}</span>
            <i nz-icon data-btn-type="editProject" nzType="edit" nzTheme="outline" (click)="edit($event, project)"></i>
          </div>
        </nz-option>
        <ng-template #addBranchOption>
          <nz-divider></nz-divider>
          <div class="add_branch_container">
            <a class="add_branch_btn" data-btn-type="addBranch" nz-button nzType="link" (click)="addBranch()">
              <i nz-icon nzType="plus"></i>
              Add branch
            </a>
          </div>
        </ng-template>
      </nz-select>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectSelectorComponent implements OnInit {
  @Input() disabled = false;
  @Output() projectChange = new EventEmitter();

  public selected: Project;
  public projects: Project[];
  public model: Model<SyncCodeModel>;

  constructor(private modalService: NzModalService, private store: StoreService) {}

  ngOnInit() {
    this.model = this.store.getModel<SyncCodeModel>(MODEL_NAME.SYNC_CODE);
    this.model.subscribe<Project[]>('projects', (data) => {
      this.projects = data;
      if (this.projects.length) {
        if (!this.selected) {
          this.setSelection(this.projects[0]);
        } else {
          this.setSelection(this.projects.find((item) => item.name === this.selected.name));
        }
      }
    });
  }

  public addBranch(): void {
    this.modalService
      .create({ nzContent: ProjectSettingComponent, nzWidth: 600 })
      .afterClose.subscribe(({ content, action }: DialogRes = { content: null, action: null }) => {
        if (action === DialogAction.SAVE) {
          this.setSelection(content);
          this.model.set('projects', (draft) => {
            draft.push(content);
          });
        }
      });
  }

  public setSelection(value: Project) {
    this.selected = value;
    this.projectChange.emit(value);
  }

  public edit(e: Event, project: Project): void {
    const isEditSelectedBranch = this.selected.name === project.name;
    this.modalService
      .create({
        nzWidth: 600,
        nzContent: ProjectSettingComponent,
        nzComponentParams: { project, isEdit: true },
      })
      .afterClose.subscribe(({ content, action }: DialogRes = { content: null, action: null }) => {
        if (action === DialogAction.SAVE) {
          if (isEditSelectedBranch) {
            this.setSelection(content);
          }
          this.model.set('projects', (draft) => {
            Object.assign(
              draft.find((item) => item.name === project.name),
              content
            );
          });
        } else if (action === DialogAction.DELETE) {
          if (isEditSelectedBranch) {
            this.setSelection(null);
          }
          this.model.set('projects', (draft) => {
            const index = draft.findIndex((item) => item.name === project.name);
            draft.splice(index, 1);
          });
        }
      });
    e.stopPropagation();
  }

  public trackFn(index: number, item: Project) {
    return item.name;
  }
}
