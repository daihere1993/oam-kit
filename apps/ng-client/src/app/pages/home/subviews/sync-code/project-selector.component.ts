import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ProjectSettingComponent, DialogRes, DialogAction } from './project-setting.component';
import { StoreService } from '../../../../core/services/store.service';
import { Project, SyncCode } from '@oam-kit/shared-interfaces';
import { Model } from '@oam-kit/data-persistent';

@Component({
  selector: 'app-project-selector',
  template: `
    <style>
      :host(app-project-selector) {
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
      .add_project_container {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      nb-icon {
        color: #8f9bb3;
      }
      nz-select {
        width: 180px;
      }
      nz-divider {
        margin: 4px 0;
      }
    </style>
    <div class="container">
      <nz-select
        data-test="project-select"
        [ngModel]="selected"
        [disabled]="disabled"
        [nzDropdownRender]="addProjectOption"
        (ngModelChange)="setSelection($event)"
      >
        <nz-option
          *ngFor="let project of projects; trackBy: trackFn"
          nzCustomContent
          [nzLabel]="project.name"
          [nzValue]="project"
        >
          <div class="option_container">
            <span>{{ project.name }}</span>
            <i nz-icon data-test="edit-project-button" nzType="edit" nzTheme="outline" (click)="edit($event, project)"></i>
          </div>
        </nz-option>
        <ng-template #addProjectOption>
          <nz-divider></nz-divider>
          <div class="add_project_container">
            <a data-test="add-project-button" nz-button nzType="link" (click)="edit($event)">
              <i nz-icon nzType="plus"></i>
              Add project
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
  public projects: Project[] = [];
  public model!: Model<SyncCode>;

  constructor(private modalService: NzModalService, private store: StoreService) {}

  ngOnInit() {
    this.model = this.store.getModel<SyncCode>('syncCode');
    this.model.subscribe<Project[]>('projects', (data) => {
      this.projects = data;
      if (this.projects.length) {
        if (!this.selected) {
          this.setSelection(this.projects[0]);
        } else {
          const project = this.projects.find((item) => item.name === this.selected.name);
          if (project) {
            this.setSelection(project);
          }
        }
      }
    });
  }

  public setSelection(value: Project) {
    this.selected = value;
    this.projectChange.emit(value);
  }

  public edit(e: Event, project?: Project): void {
    const isAddAction = !project;
    const isEditSelectedProject = project?.name === this.selected?.name;
    const nzComponentParams = isAddAction ? undefined : { project };
    this.modalService
      .create({
        nzWidth: 600,
        nzTitle: isAddAction ? 'New project' : 'Edit project',
        nzContent: ProjectSettingComponent,
        nzComponentParams,
      })
      .afterClose.subscribe(({ content, action }: DialogRes) => {
        if (action === DialogAction.SAVE) {
          if (isAddAction) {
            // select added project
            this.setSelection(content);
            this.model.set('projects', (draft) => {
              draft.push(content);
            });
          } else {
            if (isEditSelectedProject) {
              this.setSelection(content);
            }
            this.model.set('projects', (draft) => {
              Object.assign(
                draft.find((item) => item.name === project.name),
                content
              );
            });
          }
        } else if (action === DialogAction.DELETE) {
          if (isEditSelectedProject) {
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