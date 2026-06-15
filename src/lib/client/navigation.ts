export interface NavTab {
	label: string;
	href?: string;
	exact?: boolean;
}

export const activitiesTabs: NavTab[] = [
	{ label: 'Calendar', href: '/society/calendar' },
	{ label: 'Courses', href: '/society/courses' }
];

export const marketTabs: NavTab[] = [
	{ label: 'Market', href: '/society/market' }
];

export const governanceTabs: NavTab[] = [
	{ label: 'Assembly', href: '/society/assembly' },
	{ label: 'Units', href: '/society/units' },
	{ label: 'Treasury', href: '/society/treasury' },
	{ label: 'Society Ledger', href: '/society/ledger' },
	{ label: 'Federation Ledger', href: '/society/ledger/federation' }
];

export const directoryTabs: NavTab[] = [
	{ label: 'People', href: '/society/directory/people' },
	{ label: 'Associations', href: '/society/directory/associations' },
	{ label: 'Neighbors', href: '/society/directory/neighbors' }
];

export const nutritionTabs: NavTab[] = [
	{ label: 'Requirements', href: '/society/nutrition/requirements' },
	{ label: 'Planner', href: '/society/nutrition/planner' }
];

export const knowledgeTabs: NavTab[] = [
	{ label: 'Encyclopedia', href: '/society/encyclopedia' },
	{ label: 'Guides', href: '/society/guides' }
];

export const settingsTabs: NavTab[] = [
	{ label: 'Profile', href: '/profile/settings/profile' }
];

export const societySettingsTabs: NavTab[] = [
	{ label: 'Configuration', href: '/society/settings', exact: true },
	{ label: 'Schedule', href: '/society/settings/schedule' },
	{ label: 'Audit Log', href: '/society/settings/audit-log' },
	{ label: 'Backup', href: '/society/settings/backup' }
];