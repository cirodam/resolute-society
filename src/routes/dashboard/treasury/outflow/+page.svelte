<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import UniversalAllowancesPanel from '../UniversalAllowancesPanel.svelte';
	import GroupedAllowancesPanel from '../GroupedAllowancesPanel.svelte';
	import PositionPayrollPanel from '../PositionPayrollPanel.svelte';
	import TransferPanel from '../TransferPanel.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<UniversalAllowancesPanel memberCount={data.memberCount} permissions={data.permissions} {form} />
<GroupedAllowancesPanel
	allowanceGroups={data.allowanceGroups}
	membersByGroup={data.membersByGroup}
	members={data.members}
	permissions={data.permissions}
	{form}
/>
<PositionPayrollPanel positions={data.positions} permissions={data.permissions} {form} />
<TransferPanel societyCredits={data.society.society_credits} permissions={data.permissions} {form} />
