import { Component, computed, effect, inject, Injector, input, signal } from '@angular/core';
import { routePattern } from '@connected-ng/core';
import { ActionDescriptionWithAction } from '@connected-ng/components';
import { CodeListActions } from '@connected-ng/components/code-lists';
import { BusyIndicatorStructuralDirective, BusyService } from '@connected-ng/components/indicators';
import { ActionsProviderContract, StackNavigationContext, StackPageInfo } from '@connected-ng/components/navigation';
import { Claim, ClaimService, CLAIM_UNDEFINED, RoleService } from '@connected-ng/core/permissions';
import { ClaimSelectList } from '@connected-ng/core/permissions';
import { firstValueFrom, from } from 'rxjs';

@Component({
  selector: 'cn-role-claim-assignment',
  imports: [ClaimSelectList, BusyIndicatorStructuralDirective],
  templateUrl: './role-claim-assignment.html',
  styleUrl: './role-claim-assignment.scss',
})
export class RoleClaimAssignment implements ActionsProviderContract {
  static readonly routePattern = routePattern('claims');

  static fromParams(params: Record<string, string>, injector: Injector): StackPageInfo<unknown> {
    const roleId = Number(params['id']);
    return {
      component: RoleClaimAssignment,
      key: RoleClaimAssignment.routePattern.pattern,
      pattern: RoleClaimAssignment.routePattern.pattern,
      title: 'Claims',
      data: { roleId },
      pageFactory: (_p) => RoleClaimAssignment.fromParams(params, injector)
    };
  }

  roleId = input<number>();

  private navigationContext = inject(StackNavigationContext);
  private roleService = inject(RoleService);
  private claimService = inject(ClaimService);
  private busyService = inject(BusyService);

  readonly busyKey = 'role-claim-assignment-save';
  readonly loadKey = 'role-claim-assignment-load';

  loaded = signal(false);
  selectedClaimValues = signal<string[]>([]);
  entityId = computed(() => this.roleId()?.toString() ?? '');

  private originalClaims: Claim[] = [];
  private roleToken: string | undefined;

  constructor() {
    effect(() => {
      const roleId = this.roleId();
      if (!roleId) return;
      this.load(roleId);
    });
  }

  private async load(roleId: number) {
    this.loaded.set(false);
    this.busyService.setBusy(this.loadKey, true);
    try {
      const role = await firstValueFrom(this.roleService.select({ id: roleId }));
      this.roleToken = role.token;
      const claims = await firstValueFrom(
        this.claimService.query({ schema: 'role', identity: role.token, entity: CLAIM_UNDEFINED, entityId: CLAIM_UNDEFINED })
      );
      this.originalClaims = claims ?? [];
      this.selectedClaimValues.set(this.originalClaims.map(c => c.value));
      this.loaded.set(true);
    } finally {
      this.busyService.setBusy(this.loadKey, false);
    }
  }

  pageActions = computed<ActionDescriptionWithAction[]>(() => [
    CodeListActions.backAction(() => { this.navigationContext.back(); }),
    {
      label: 'Save',
      description: 'Save current state',
      icon: 'check_circle',
      action: () => { this.save(); }
    }
  ]);

  private async save() {
    const roleId = this.roleId();
    if (!roleId) return;

    const original = new Set(this.originalClaims.map(c => c.value));
    const current = new Set(this.selectedClaimValues());

    const toAdd = [...current].filter(v => !original.has(v));
    const toRemove = this.originalClaims.filter(c => !current.has(c.value));

    firstValueFrom(
      from(Promise.all([
        ...toAdd.map(value =>
          firstValueFrom(this.claimService.insert({
            value,
            schema: 'role',
            identity: this.roleToken!,
            entity: CLAIM_UNDEFINED,
            entityId: CLAIM_UNDEFINED
          }))
        ),
        ...toRemove.map(c =>
          firstValueFrom(this.claimService.delete({ id: c.id }))
        )
      ])).pipe(this.busyService.track(this.busyKey))
    ).then(() => this.navigationContext.back());
  }
}
