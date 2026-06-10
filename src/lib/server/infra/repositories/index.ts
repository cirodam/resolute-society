import postgres from 'postgres';
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
import { AuditEventRepository } from './audit-event.repository';

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
	auditEvents: AuditEventRepository;
	society: SocietyRepositories;
}

let repositories: Repositories | null = null;

export function createRepositories(sql: postgres.Sql | postgres.TransactionSql = db()): Repositories {
	const s = sql as postgres.Sql;
	const ledger = new LedgerRepository(s);
	const permissions = new PermissionRepository(s);
	const societies = new SocietyRepository(s);
	const people = new PersonRepository(s);
	const associations = new AssociationRepository(s);
	const assembly = new AssemblyRepository(s);
	const courses = new CourseRepository(s);
	const messages = new MessageRepository(s);
	const market = new MarketRepository(s);
	const events = new EventRepository(s);
	const posts = new PostRepository(s);
	const positions = new PositionRepository(s);
	const treasury = new TreasuryRepository(s);
	const allowanceGroups = new AllowanceGroupRepository(s);
	const federationMessageQueue = new FederationMessageQueueRepository(s);
	const keypair = new FederationKeypairRepository(s);
	const locations = new LocationRepository(s);
	const locationCategories = new LocationCategoryRepository(s);
	const dependants = new DependantRepository(s);
	const ledgerDays = new LedgerDayRepository(s);
	const nutrition = new NutritionRepository(s);
	const roadGraph = new RoadGraphRepository(s);
	const auditEvents = new AuditEventRepository(s);

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
		auditEvents,
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
export type { InboxMessageRow, SentMessageRow, ArchivedMessageRow, MessageRecipient, AssociationInboxMessageRow, AssociationSentMessageRow } from './message.repository';
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
export type { PostRow, PostReplyRow } from './post.repository';
export { LocationRepository } from './location.repository';
export { DependantRepository } from './dependant.repository';
export type { DependantRow } from './dependant.repository';
export type { LocationRow, LocationCategory } from './location.repository';
export { LocationCategoryRepository } from './location-category.repository';
export type { LocationCategoryRow } from './location-category.repository';
export { LedgerRepository } from './ledger.repository';
export type { CalculateMoneySupplyResult, TxnRow } from './ledger.repository';
export { LedgerDayRepository } from './ledger-day.repository';
export type { LedgerDayRow, CloseDayParams, CloseDayResult } from './ledger-day.repository';
export { NutritionRepository } from './nutrition.repository';
export type { NutrientRow, DriProfileRow, DriValueRow, FoodRow, FoodNutrientRow } from './nutrition.repository';
export { RoadGraphRepository } from './road-graph.repository';
export type { RoadNodeRow, RoadEdgeRow } from './road-graph.repository';
export { FederationMessageQueueRepository } from './federation-message-queue.repository';
export type { FederationMessageRow } from './federation-message-queue.repository';
export { AuditEventRepository } from './audit-event.repository';
export type { AuditEventRow, AppendAuditEventParams } from './audit-event.repository';
