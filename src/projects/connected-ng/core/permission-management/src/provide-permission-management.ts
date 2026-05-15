import { EnvironmentProviders, Injector, makeEnvironmentProviders } from '@angular/core';
import { provideChildPage } from '@connected-ng/components/navigation';
import { UserUpdateFormFields } from '@connected-ng/core/users';
import { RoleUpdateFormFields } from '@connected-ng/core/permissions';
import { UserRoleAssignment } from './user-role-assignment/user-role-assignment';
import { RoleUserAssignment } from './role-user-assignment/role-user-assignment';
import { RoleClaimAssignment } from './role-claim-assignment/role-claim-assignment';
import { UserClaimAssignment } from './user-claim-assignment/user-claim-assignment';
import { ClaimRoleAssignment } from './claim-role-assignment/claim-role-assignment';
import { ClaimUserAssignment } from './claim-user-assignment/claim-user-assignment';

export function providePermissionManagement(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideChildPage(UserUpdateFormFields, {
      factory: (params: Record<string, string>, injector: Injector) => UserRoleAssignment.fromParams(params, injector),
      routePattern: UserRoleAssignment.routePattern.pattern,
      action: { label: 'Roles', description: 'Manage user roles' }
    }),
    provideChildPage(UserUpdateFormFields, {
      factory: (params: Record<string, string>, injector: Injector) => UserClaimAssignment.fromParams(params, injector),
      routePattern: UserClaimAssignment.routePattern.pattern,
      action: { label: 'Claims', description: 'Manage user claims' }
    }),
    provideChildPage(RoleUpdateFormFields, {
      factory: (params: Record<string, string>, injector: Injector) => RoleUserAssignment.fromParams(params, injector),
      routePattern: RoleUserAssignment.routePattern.pattern,
      action: { label: 'Users', description: 'Manage role users' }
    }),
    provideChildPage(RoleUpdateFormFields, {
      factory: (params: Record<string, string>, injector: Injector) => RoleClaimAssignment.fromParams(params, injector),
      routePattern: RoleClaimAssignment.routePattern.pattern,
      action: { label: 'Claims', description: 'Manage role claims' }
    })
  ]);
}
