import postgres from 'postgres';

let _sql: postgres.Sql | null = null;

export function db(): postgres.Sql {
	if (!_sql) {
		_sql = postgres(process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/resolute_society');
	}
	return _sql;
}
