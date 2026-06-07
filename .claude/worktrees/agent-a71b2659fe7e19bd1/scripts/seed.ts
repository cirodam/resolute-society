import { migrate } from '../src/lib/server/infra/schema';
import { getRepositories } from '../src/lib/server/infra/repositories';

async function seed() {
	console.log('Running migrations...');
	migrate();

	console.log('Seeding permission definitions...');
	getRepositories().permissions.seedPermissions();
	console.log('✓ Seeded permission definitions');

	console.log('\nSetup complete. Visit the app and complete society setup at /setup');
}

seed().catch(console.error);
