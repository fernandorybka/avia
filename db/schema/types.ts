import { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { countries, states, cities } from "./location";
import { people, theaterGroups, theaterGroupMembers } from "./people";
import { venues } from "./venues";
import {
  shows,
  showTheaterGroups,
  creditRoles,
  showCredits,
  showSessions,
} from "./shows";
import { externalLinks } from "./links";

export type Country = InferSelectModel<typeof countries>;
export type NewCountry = InferInsertModel<typeof countries>;

export type State = InferSelectModel<typeof states>;
export type NewState = InferInsertModel<typeof states>;

export type City = InferSelectModel<typeof cities>;
export type NewCity = InferInsertModel<typeof cities>;

export type Person = InferSelectModel<typeof people>;
export type NewPerson = InferInsertModel<typeof people>;

export type TheaterGroup = InferSelectModel<typeof theaterGroups>;
export type NewTheaterGroup = InferInsertModel<typeof theaterGroups>;

export type TheaterGroupMember = InferSelectModel<typeof theaterGroupMembers>;
export type NewTheaterGroupMember = InferInsertModel<typeof theaterGroupMembers>;

export type Venue = InferSelectModel<typeof venues>;
export type NewVenue = InferInsertModel<typeof venues>;

export type Show = InferSelectModel<typeof shows>;
export type NewShow = InferInsertModel<typeof shows>;

export type ShowTheaterGroup = InferSelectModel<typeof showTheaterGroups>;
export type NewShowTheaterGroup = InferInsertModel<typeof showTheaterGroups>;

export type CreditRole = InferSelectModel<typeof creditRoles>;
export type NewCreditRole = InferInsertModel<typeof creditRoles>;

export type ShowCredit = InferSelectModel<typeof showCredits>;
export type NewShowCredit = InferInsertModel<typeof showCredits>;

export type ShowSession = InferSelectModel<typeof showSessions>;
export type NewShowSession = InferInsertModel<typeof showSessions>;

export type ExternalLink = InferSelectModel<typeof externalLinks>;
export type NewExternalLink = InferInsertModel<typeof externalLinks>;