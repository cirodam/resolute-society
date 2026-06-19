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
import { UnitRepository } from './unit.repository';
import { PeerSocietyRepository } from './peer-society.repository';
import { OutboundFedTxnRepository } from './outbound-fed-txn.repository';
import { InboundFedTxnRepository } from './inbound-fed-txn.repository';
import { FedMintEventRepository } from './fed-mint-event.repository';
import { FedLedgerRepository } from './fed-ledger.repository';

export type { EntityType } from './ledger.repository';

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
	units: UnitRepository;
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
	peerSocieties: PeerSocietyRepository;
	outboundFedTxns: OutboundFedTxnRepository;
	inboundFedTxns: InboundFedTxnRepository;
	fedMintEvents: FedMintEventRepository;
	fedLedger: FedLedgerRepository;
}

let repositories: Repositories | null = null;

export function createRepositories(sql: postgres.Sql | postgres.TransactionSql = db()): Repositories {
	const s = sql as postgres.Sql;
	return {
		ledger: new LedgerRepository(s),
		permissions: new PermissionRepository(s),
		societies: new SocietyRepository(s),
		people: new PersonRepository(s),
		associations: new AssociationRepository(s),
		assembly: new AssemblyRepository(s),
		courses: new CourseRepository(s),
		messages: new MessageRepository(s),
		market: new MarketRepository(s),
		events: new EventRepository(s),
		posts: new PostRepository(s),
		positions: new PositionRepository(s),
		units: new UnitRepository(s),
		treasury: new TreasuryRepository(s),
		allowanceGroups: new AllowanceGroupRepository(s),
		federationMessageQueue: new FederationMessageQueueRepository(s),
		keypair: new FederationKeypairRepository(s),
		locations: new LocationRepository(s),
		locationCategories: new LocationCategoryRepository(s),
		dependants: new DependantRepository(s),
		ledgerDays: new LedgerDayRepository(s),
		nutrition: new NutritionRepository(s),
		roadGraph: new RoadGraphRepository(s),
		auditEvents: new AuditEventRepository(s),
		peerSocieties: new PeerSocietyRepository(s),
		outboundFedTxns: new OutboundFedTxnRepository(s),
		inboundFedTxns: new InboundFedTxnRepository(s),
		fedMintEvents: new FedMintEventRepository(s),
		fedLedger: new FedLedgerRepository(s)
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
export type { PositionPayrollRow, PositionPayrollCandidateRow, PositionAllowanceUpdateParams, PositionDetailRow } from './position.repository';
export { UnitRepository } from './unit.repository';
export type { UnitRow, UnitDetailRow, UnitPositionRow } from './unit.repository';
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
export type { CalculateMoneySupplyResult, TxnRow, TxnRowWithBalance } from './ledger.repository';
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
export { PeerSocietyRepository } from './peer-society.repository';
export type { PeerSocietyRow, PeerSocietyStanding } from './peer-society.repository';
export { OutboundFedTxnRepository } from './outbound-fed-txn.repository';
export type { OutboundFedTxnRow, OutboundFedTxnStatus } from './outbound-fed-txn.repository';
export { InboundFedTxnRepository } from './inbound-fed-txn.repository';
export type { InboundFedTxnRow } from './inbound-fed-txn.repository';
export { FedMintEventRepository } from './fed-mint-event.repository';
export type { FedMintEventRow } from './fed-mint-event.repository';
export { FedLedgerRepository } from './fed-ledger.repository';
export type { FedTxnEntry } from './fed-ledger.repository';
