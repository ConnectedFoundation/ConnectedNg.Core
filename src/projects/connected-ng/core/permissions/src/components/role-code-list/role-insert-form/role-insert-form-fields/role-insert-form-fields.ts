import { Component } from '@angular/core';
import { CodeListInsertForm } from '@connected-ng/components/code-lists';
import { ReactiveFormsModule } from '@angular/forms';
import { DynamicFormFieldComponent } from '@connected-ng/components/forms';
import { ActionsProviderContract } from '@connected-ng/components/navigation';
import { InsertRoleDto } from '../../../../services/roles/dtos/role-dtos';
import { RoleSelectBox } from '../../role-select-box/role-select-box';

@Component({
  selector: 'cn-role-insert-form-fields',
  imports: [ReactiveFormsModule, DynamicFormFieldComponent, RoleSelectBox],
  templateUrl: './role-insert-form-fields.html',
  styleUrl: './role-insert-form-fields.scss',
})
export class RoleInsertFormFields extends CodeListInsertForm<InsertRoleDto> implements ActionsProviderContract {
  name = this.field('name');
  parent = this.field('parent');
}
