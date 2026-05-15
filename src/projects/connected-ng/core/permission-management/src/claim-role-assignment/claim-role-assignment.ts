import { Component, computed, effect, inject, Injector, input, signal } from '@angular/core';
import { routePattern } from '@connected-ng/core';
import { ActionDescriptionWithAction } from '@connected-ng/components';
import { CodeListActions } from '@connected-ng/components/code-lists';
import { BusyIndicatorStructuralDirective, BusyService } from '@connected-ng/components/indicators';
import { ActionsProviderContract, StackNavigationContext, StackPageInfo } from '@connected-ng/components/navigation';
import { Claim, ClaimService, CLAIM_UNDEFINED, RoleSelectList, RoleService, Role } from '@connected-ng/core/permissions';
import { firstValueFrom, from } from 'rxjs';

@Component({
  selector: 'cn-claim-role-assignment',
  imports: [RoleSelectList, BusyIndicatorStructuralDirective],
  templateUrl: './claim-role-assignment.html',
  styleUrl: './claim-role-assignment.scss',
})
export class ClaimRoleAssignment implements ActionsProviderContract {
  static readonly routePattern = routePattern('roles');

  static fromParams(params: Record<string, string>, injector: Injector): StackPageInfo<unknown> {
    const claimValue = params['id'];
    return {
      component: ClaimRoleAssignment,
      key: ClaimRoleAssignment.routePattern.pattern,
      pattern: ClaimRoleAssignment.routePattern.pattern,
      title: 'Roles',
      data: { claimValue },
      pageFactory: (_p) => ClaimRoleAssignment.fromParams(params, injector)
    };
  }

  claimValue = input<string>();

  private navigationContext = inject(StackNavigationContext);
  private roleService = inject(RoleService);
  private claimService = inject(ClaimService);
  private busyService = inject(BusyService);

  readonly busyKey = 'claim-role-assignment-save';
  readonly loadKey = 'claim-role-assignment-load';

  loaded = signal(false);
  selectedRoleIds = signal<number[]>([]);

  private allRoles: Role[] = [];
  private originalClaims: Claim[] = [];

  constructor() {
    effect(() => {
      const claimValue = this.claimValue();
      if (!claimValue) return;
      this.load(claimValue);
    });
  }

  private async load(claimValue: string) {
    this.loaded.set(false);
    this.busyService.setBusy(this.loadKey, true);
    try {
      const [roles, claims] = await Promise.all([
        firstValueFrom(this.roleService.query()),
        firstValueFrom(this.claimService.query({ schema: 'role', entity: CLAIM_UNDEFINED, entityId: CLAIM_UNDEFINED }))
      ]);
      this.allRoles = roles ?? [];
      this.originalClaims = (claims ?? []).filter(c => c.value === claimValue);

      const selectedTokens = new Set(
        this.originalClaims.map(c => c.identity).filter((v): v is string => !!v)
      );
      this.selectedRoleIds.set(
        this.allRoles.filter(r => selectedTokens.has(r.token)).map(r => r.id)
      );
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
    const claimValue = this.claimValue();
    if (!claimValue) return;

    const originalTokens = new Set(
      this.originalClaims.map(c => c.identity).filter((v): v is string => !!v)
    );
    const current = new Set(this.selectedRoleIds());
    const currentRoles = this.allRoles.filter(r => current.has(r.id));
    const currentTokens = new Set(currentRoles.map(r => r.token));

    const toAdd = currentRoles.filter(r => !originalTokens.has(r.token));
    const toRemove = this.originalClaims.filter(c => c.identity && !currentTokens.has(c.identity));

    await firstValueFrom(
      from(Promise.all([
        ...toAdd.map(role =>
          firstValueFrom(this.claimService.insert({
            value: claimValue,
            schema: 'role',
            identity: role.token,
            entity: CLAIM_UNDEFINED,
            entityId: CLAIM_UNDEFINED
          }))
        ),
        ...toRemove.map(c => firstValueFrom(this.claimService.delete({ id: c.id })))
      ])).pipe(this.busyService.track(this.busyKey))
    );

    this.navigationContext.back();
  }
}
