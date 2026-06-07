import Database from 'better-sqlite3';

let _db: Database.Database | null = null;

export function db(): Database.Database {
	if (!_db) {
		_db = new Database(process.env.DATABASE_PATH ?? 'working-society.sqlite');
		_db.pragma('journal_mode = WAL');
		_db.pragma('foreign_keys = ON');
	}
	return _db;
}
