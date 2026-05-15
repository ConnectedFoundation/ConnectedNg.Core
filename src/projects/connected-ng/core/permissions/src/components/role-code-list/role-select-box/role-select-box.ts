import { Component, forwardRef, inject, signal, Type, OnDestroy, input } from '@angular/core';
import { NG_VALUE_ACCESSOR, FormControl, ReactiveFormsModule } from '@angular/forms';
import { CodeListSelectBox } from '@connected-ng/components/code-lists';
import { FormBase, FormResult } from '@connected-ng/components/forms';
import { firstValueFrom, Subscription } from 'rxjs';
import { InsertRoleDto, Role } from '../../../services/roles/dtos/role-dtos';
import { RoleInsertForm } from '../role-insert-form/role-insert-form';
import { RoleService } from '../../../services/roles/role-service';

@Component({
  selector: 'cn-role-select-box',
  imports: [CodeListSelectBox, ReactiveFormsModule],
  templateUrl: './role-select-box.html',
  styleUrl: './role-select-box.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RoleSelectBox), multi: true }
  ]
})
export class RoleSelectBox implements OnDestroy {
  items = signal<Role[]>([]);

  control = input<FormControl<number | null>>(new FormControl<number | null>(null));

  insertForm = signal<Type<FormBase<InsertRoleDto>>>(RoleInsertForm);
  service = inject(RoleService);

  private subscriptions = new Subscription();

  keySelector = (entity: Role) => entity.id;
  displayMemberSelector = (entity: Role) => entity.name;

  insertResultMapper = async (result: FormResult) => {
    if (!result.success) return undefined;
    const entity = await firstValueFrom(this.service.select({ id: result.result }));
    return entity ?? undefined;
  }

  ngOnInit() {
    this.subscriptions.add(
      this.service.queryAndSubscribe$().subscribe(items => this.items.set(items))
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  writeValue(value: any): void {
    this.control()?.setValue(value, { emitEvent: false });
  }

  registerOnChange(fn: any): void {
    this.subscriptions.add(this.control()?.valueChanges.subscribe(fn));
  }

  registerOnTouched(_fn: any): void { }

  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.control()?.disable({ emitEvent: false }) : this.control()?.enable({ emitEvent: false });
  }
}
