export function parsePage(url: URL, key = 'page'): number {
	return Math.max(1, parseInt(url.searchParams.get(key) ?? '1', 10));
}

export function pageOffset(page: number, pageSize: number): number {
	return (page - 1) * pageSize;
}

export function totalPages(total: number, pageSize: number): number {
	return Math.max(1, Math.ceil(total / pageSize));
}
