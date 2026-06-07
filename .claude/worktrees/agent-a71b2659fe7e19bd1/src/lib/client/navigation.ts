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
	{ label: 'Associations', href: '/society/directory/associations' }
];