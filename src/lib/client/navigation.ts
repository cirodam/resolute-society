export interface NavTab {
	label: string;
	href?: string;
	exact?: boolean;
}

export const activitiesTabs: NavTab[] = [
	{ label: 'Calendar', href: '/dashboard/calendar' },
	{ label: 'Courses', href: '/dashboard/courses' }
];

export const marketTabs: NavTab[] = [
	{ label: 'Market', href: '/dashboard/market' }
];

export const governanceTabs: NavTab[] = [
	{ label: 'Assembly', href: '/dashboard/assembly' },
	{ label: 'Units', href: '/dashboard/units' },
	{ label: 'Treasury', href: '/dashboard/treasury' },
	{ label: 'Society Ledger', href: '/dashboard/ledger' },
	{ label: 'Federation Ledger', href: '/dashboard/ledger/federation' }
];

export const treasuryTabs: NavTab[] = [
	{ label: 'Overview', href: '/dashboard/treasury', exact: true },
	{ label: 'Inflow', href: '/dashboard/treasury/inflow' },
	{ label: 'Outflow', href: '/dashboard/treasury/outflow' }
];

export const directoryTabs: NavTab[] = [
	{ label: 'People', href: '/dashboard/directory/people' },
	{ label: 'Associations', href: '/dashboard/directory/associations' },
	{ label: 'Neighbors', href: '/dashboard/directory/neighbors' }
];

export const nutritionTabs: NavTab[] = [
	{ label: 'Requirements', href: '/dashboard/nutrition/requirements' },
	{ label: 'Planner', href: '/dashboard/nutrition/planner' }
];

export const knowledgeTabs: NavTab[] = [
	{ label: 'Encyclopedia', href: '/dashboard/encyclopedia' },
	{ label: 'Guides', href: '/dashboard/guides' }
];

export const settingsTabs: NavTab[] = [
	{ label: 'Profile', href: '/profile/settings/profile' }
];

export const societySettingsTabs: NavTab[] = [
	{ label: 'Configuration', href: '/dashboard/settings', exact: true },
	{ label: 'Schedule', href: '/dashboard/settings/schedule' },
	{ label: 'Audit Log', href: '/dashboard/settings/audit-log' },
	{ label: 'Backup', href: '/dashboard/settings/backup' }
];