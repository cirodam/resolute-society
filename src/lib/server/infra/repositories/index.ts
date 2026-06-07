import { db } from '../db';
import { FederationMessageQueueRepository } from './federation-message-queue.repository';
import { FederationKeypairRepository } from './federation-keypair.repository';
import { AssociationRepository } from './association.repository';
import { AssemblyRepository } from './assembly.repository';
import { CourseRepository } from './course.repository';
import { MessageRepository } from './message.repository';
import { MarketRepository } from './market.repository';
import { PersonRepository } from './person.repository';
import { PermissionRepository } from './permissions.repository';
import { PositionRepository } from './position.repository';
import { TreasuryRepository } from './treasury.repository';
import { AllowanceGroupRepository } from './allowance-group.repository';
import { SocietyRepository } from './society.repository';
import { EventRepository } from './event.repository';
import { PostRepository } from './post.repository';
import { LedgerRepository } from './ledger.repository';
import { LocationRepository } from './location.repository';
import { LocationCategoryRepository } from './location-category.repository';
import { DependantRepository } from './dependant.repository';
import { LedgerDayRepository } from './ledger-day.repository';
import { NutritionRepository } from './nutrition.repository';
import { RoadGraphRepository } from './road-graph.repository';

export type { EntityType } from './ledger.repository';

export interface SocietyRepositories {
	people: PersonRepository;
	associations: AssociationRepository;
	assembly: AssemblyRepository;
	courses: CourseRepository;
	messages: MessageRepository;
	market: MarketRepository;
	events: EventRepository;
	posts: PostRepository;
	positions: PositionRepository;
	treasury: TreasuryRepository;
	allowanceGroups: AllowanceGroupRepository;
	permissions: PermissionRepository;
	societies: SocietyRepository;
	ledger: LedgerRepository;
}

export interface Repositories {
	people: PersonRepository;
	associations: AssociationRepository;
	assembly: AssemblyRepository;
	courses: CourseRepository;
	messages: MessageRepository;
	market: MarketRepository;
	events: EventRepository;
	posts: PostRepository;
	permissions: PermissionRepository;
	positions: PositionRepository;
	treasury: TreasuryRepository;
	allowanceGroups: AllowanceGroupRepository;
	societies: SocietyRepository;
	ledger: LedgerRepository;
	ledgerDays: LedgerDayRepository;
	nutrition: NutritionRepository;
	roadGraph: RoadGraphRepository;
	federationMessageQueue: FederationMessageQueueRepository;
	keypair: FederationKeypairRepository;
	locations: LocationRepository;
	locationCategories: LocationCategoryRepository;
	dependants: DependantRepository;
	society: SocietyRepositories;
}

let repositories: Repositories | null = null;

export function createRepositories(database = db()): Repositories {
	const ledger = new LedgerRepository(database);
	const permissions = new PermissionRepository(database);
	const societies = new SocietyRepository(database);
	const people = new PersonRepository(database);
	const associations = new AssociationRepository(database);
	const assembly = new AssemblyRepository(database);
	const courses = new CourseRepository(database);
	const messages = new MessageRepository(database);
	const market = new MarketRepository(database);
	const events = new EventRepository(database);
	const posts = new PostRepository(database);
	const positions = new PositionRepository(database);
	const treasury = new TreasuryRepository(database);
	const allowanceGroups = new AllowanceGroupRepository(database);
	const federationMessageQueue = new FederationMessageQueueRepository(database);
	const keypair = new FederationKeypairRepository(database);
	const locations = new LocationRepository(database);
	const locationCategories = new LocationCategoryRepository(database);
	const dependants = new DependantRepository(database);
	const ledgerDays = new LedgerDayRepository(database);
	const nutrition = new NutritionRepository(database);
	const roadGraph = new RoadGraphRepository(database);

	const society: SocietyRepositories = {
		people,
		associations,
		assembly,
		courses,
		messages,
		market,
		events,
		posts,
		positions,
		treasury,
		allowanceGroups,
		permissions,
		societies,
		ledger
	};

	return {
		people,
		associations,
		assembly,
		courses,
		messages,
		market,
		events,
		posts,
		permissions,
		positions,
		treasury,
		allowanceGroups,
		societies,
		ledger,
		ledgerDays,
		nutrition,
		roadGraph,
		federationMessageQueue,
		keypair,
		locations,
		locationCategories,
		dependants,
		society
	};
}

export function getRepositories(): Repositories {
	if (!repositories) {
		repositories = createRepositories();
	}

	return repositories;
}

export { CourseRepository } from './course.repository';
export type {
	SocietyRow,
	CourseListRow,
	CourseDetailRow,
	CourseSummaryRow,
	CourseSocietyRow,
	CourseApprovalRow,
	CourseCreateParams
} from './course.repository';
export { MessageRepository } from './message.repository';
export type { InboxMessageRow, SentMessageRow, ArchivedMessageRow, RecipientRow } from './message.repository';
export { MarketRepository } from './market.repository';
export type { SocietyRow as MarketSocietyRow, ItemListingRow, ServiceListingRow } from './market.repository';
export { PersonRepository } from './person.repository';
export type {
	SessionPersonRow,
	LoginPersonRow,
	PersonProfileRow,
	PersonIdentityRow,
	PersonSocietyRow,
	DirectoryMemberRow,
	FullMemberRow
} from './person.repository';
export { AssociationRepository } from './association.repository';
export type { AssociationHandleRow, DirectoryAssociationRow } from './association.repository';
export { AssemblyRepository } from './assembly.repository';
export { PermissionRepository, PERMISSION_DEFINITIONS } from './permissions.repository';
export type { PermissionDefinition } from './permissions.repository';
export { PositionRepository } from './position.repository';
export type { PositionPayrollRow, PositionPayrollCandidateRow, PositionAllowanceUpdateParams } from './position.repository';
export { TreasuryRepository } from './treasury.repository';
export { AllowanceGroupRepository } from './allowance-group.repository';
export type { AllowanceGroupRow, AllowanceGroupMemberRow, AllowanceGroupRecord } from './allowance-group.repository';
export { SocietyRepository } from './society.repository';
export type { SocietyHandleRow, SocietyIdentityRow } from './society.repository';
export { EventRepository } from './event.repository';
export type { EventRow, EventAssociationRow } from './event.repository';
export { PostRepository } from './post.repository';
export type { PostRow } from './post.repository';
export { LocationRepository } from './location.repository';
export { DependantRepository } from './dependant.repository';
export type { DependantRow } from './dependant.repository';
export type { LocationRow, LocationCategory } from './location.repository';
export { LocationCategoryRepository } from './location-category.repository';
export type { LocationCategoryRow } from './location-category.repository';
export { LedgerRepository } from './ledger.repository';
export type { CalculateMoneySupplyResult, TxnRow } from './ledger.repository';
export { LedgerDayRepository } from './ledger-day.repository';
export type { LedgerDayRow, CloseDayParams } from './ledger-day.repository';
export { NutritionRepository } from './nutrition.repository';
export type { NutrientRow, DriProfileRow, DriValueRow, FoodRow, FoodNutrientRow } from './nutrition.repository';
export { RoadGraphRepository } from './road-graph.repository';
export type { RoadNodeRow, RoadEdgeRow } from './road-graph.repository';
export { FederationMessageQueueRepository } from './federation-message-queue.repository';
export type { FederationMessageRow } from './federation-message-queue.repository';
