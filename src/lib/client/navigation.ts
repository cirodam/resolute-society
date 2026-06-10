export interface NavTab {
	label: string;
	href: string;
}

export const activitiesTabs: NavTab[] = [
	{ label: 'Calendar', href: '/society/calendar' },
	{ label: 'Courses', href: '/society/courses' }
];

export const economyTabs: NavTab[] = [
	{ label: 'Market', href: '/society/market' },
	{ label: 'Treasury', href: '/society/treasury' },
	{ label: 'Master Ledger', href: '/society/ledger' }
];

export const governanceTabs: NavTab[] = [
	{ label: 'Assembly', href: '/society/assembly' },
	{ label: 'Officers', href: '/society/officers' }
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

export const settingsTabs: NavTab[] = [
	{ label: 'Profile', href: '/profile/settings/profile' }
];

export const societySettingsTabs: NavTab[] = [
	{ label: 'Society', href: '/society/settings' },
	{ label: 'Schedule', href: '/society/settings/schedule' }
];