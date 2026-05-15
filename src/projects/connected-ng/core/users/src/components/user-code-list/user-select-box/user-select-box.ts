import { Component, forwardRef, inject, signal, Type, OnDestroy, input } from '@angular/core';
import { NG_VALUE_ACCESSOR, FormControl, ReactiveFormsModule } from '@angular/forms';
import { CodeListSelectBox } from '@connected-ng/components/code-lists';
import { FormBase, FormResult } from '@connected-ng/components/forms';
import { firstValueFrom, Subscription } from 'rxjs';
import { InsertUserDto, User } from '../../../services/users/dtos/user-dtos';
import { UserInsertForm } from '../user-insert-form/user-insert-form';
import { UserService } from '../../../public-api';
@Component({
  selector: 'cn-user-select-box',
  imports: [CodeListSelectBox, ReactiveFormsModule],
  templateUrl: './user-select-box.html',
  styleUrl: './user-select-box.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UserSelectBox), multi: true }
  ]
})
export class UserSelectBox {
  items = signal<User[]>([]);

  control = input<FormControl<number | null>>(new FormControl<number | null>(null));

  insertForm = signal<Type<FormBase<InsertUserDto>>>(UserInsertForm);
  service = inject(UserService);

  private subscriptions = new Subscription();

  keySelector = (entity: User) => entity.id;
  displayMemberSelector = (entity: User) => `${entity.firstName} ${entity.lastName} (${entity.email})`;

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
