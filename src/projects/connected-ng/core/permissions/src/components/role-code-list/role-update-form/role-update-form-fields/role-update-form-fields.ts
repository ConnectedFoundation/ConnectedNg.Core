import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CodeListUpdateForm } from '@connected-ng/components/code-lists';
import { DynamicFormFieldComponent } from '@connected-ng/components/forms';
import { ActionsProviderContract } from '@connected-ng/components/navigation';
import { UpdateRoleDto } from '../../../../services/roles/dtos/role-dtos';
import { RoleSelectBox } from '../../role-select-box/role-select-box';

@Component({
  selector: 'cn-role-update-form-fields',
  imports: [ReactiveFormsModule, DynamicFormFieldComponent, RoleSelectBox],
  templateUrl: './role-update-form-fields.html',
  styleUrl: './role-update-form-fields.scss',
})
export class RoleUpdateFormFields extends CodeListUpdateForm<UpdateRoleDto> implements ActionsProviderContract {
  name = this.field('name');
  parent = this.field('parent');
}
