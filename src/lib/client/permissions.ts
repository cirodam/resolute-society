import type { PermissionCode } from '$lib/permissions';

export function hasPermission(
	permissions: { isFounder: boolean; codes: string[] } | undefined,
	code: PermissionCode
): boolean {
	if (!permissions) return false;
	if (permissions.isFounder) return true;
	return permissions.codes.includes(code);
}

