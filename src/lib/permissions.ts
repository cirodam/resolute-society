export const PERMISSION = {
	TREASURY_RUN_DEMURRAGE: 'treasury.run_demurrage',
	TREASURY_TRANSFER: 'treasury.transfer',
	TREASURY_RUN_ALLOWANCE_GROUP: 'treasury.run_allowance_group',
	TREASURY_CREATE_ALLOWANCE_GROUP: 'treasury.create_allowance_group',
	TREASURY_DELETE_ALLOWANCE_GROUP: 'treasury.delete_allowance_group',
	TREASURY_MANAGE_ALLOWANCE_MEMBERS: 'treasury.manage_allowance_members',
	TREASURY_RUN_POSITION_PAYROLL: 'treasury.run_position_payroll',
	TREASURY_ADJUST_POSITION_ALLOWANCE: 'treasury.adjust_position_allowance',
	TREASURY_DISTRIBUTE_UNIVERSAL_ALLOWANCE: 'treasury.distribute_universal_allowance',
	POSITIONS_CREATE_OFFICER: 'positions.create_officer',
	POSITIONS_ASSIGN_PERSON: 'positions.assign_person',
	POSITIONS_REMOVE_PERSON: 'positions.remove_person',
	POSITIONS_CREATE_SUBORDINATE: 'positions.create_subordinate',
	ASSEMBLY_ASSIGN_SEAT: 'assembly.assign_seat',
	ASSEMBLY_UNASSIGN_SEAT: 'assembly.unassign_seat',
	MEMBERSHIP_CREATE_MEMBER: 'membership.create_member',
	MEMBERSHIP_REMOVE_MEMBER: 'membership.remove_member',
	MEMBERSHIP_RUN_SORTITION: 'membership.run_sortition',
	MEMBERSHIP_CREATE_ASSOCIATION: 'membership.create_association',
	LEDGER_CLOSE_DAY: 'ledger.close_day',
	GOVERNANCE_UPDATE_SOCIETY: 'governance.update_society',
	EDUCATION_APPROVE_COURSE: 'education.approve_course'
} as const;

export type PermissionCode = (typeof PERMISSION)[keyof typeof PERMISSION];
