import { relations } from "drizzle-orm";

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

// location
export const countriesRelations = relations(countries, ({ many }) => ({
  states: many(states),
  cities: many(cities),
  people: many(people),
  theaterGroups: many(theaterGroups),
  venues: many(venues),
  showSessions: many(showSessions),
}));

export const statesRelations = relations(states, ({ one, many }) => ({
  country: one(countries, {
    fields: [states.countryId],
    references: [countries.id],
  }),
  cities: many(cities),
  people: many(people),
  theaterGroups: many(theaterGroups),
  venues: many(venues),
  showSessions: many(showSessions),
}));

export const citiesRelations = relations(cities, ({ one, many }) => ({
  state: one(states, {
    fields: [cities.stateId],
    references: [states.id],
  }),
  country: one(countries, {
    fields: [cities.countryId],
    references: [countries.id],
  }),
  people: many(people),
  theaterGroups: many(theaterGroups),
  venues: many(venues),
  showSessions: many(showSessions),
}));

// people
export const peopleRelations = relations(people, ({ one, many }) => ({
  city: one(cities, {
    fields: [people.cityId],
    references: [cities.id],
  }),
  state: one(states, {
    fields: [people.stateId],
    references: [states.id],
  }),
  country: one(countries, {
    fields: [people.countryId],
    references: [countries.id],
  }),
  theaterGroupMemberships: many(theaterGroupMembers),
  showCredits: many(showCredits),
}));

export const theaterGroupsRelations = relations(
  theaterGroups,
  ({ one, many }) => ({
    city: one(cities, {
      fields: [theaterGroups.cityId],
      references: [cities.id],
    }),
    state: one(states, {
      fields: [theaterGroups.stateId],
      references: [states.id],
    }),
    country: one(countries, {
      fields: [theaterGroups.countryId],
      references: [countries.id],
    }),
    members: many(theaterGroupMembers),
    showLinks: many(showTheaterGroups),
  })
);

export const theaterGroupMembersRelations = relations(
  theaterGroupMembers,
  ({ one }) => ({
    theaterGroup: one(theaterGroups, {
      fields: [theaterGroupMembers.theaterGroupId],
      references: [theaterGroups.id],
    }),
    person: one(people, {
      fields: [theaterGroupMembers.personId],
      references: [people.id],
    }),
  })
);

// venues
export const venuesRelations = relations(venues, ({ one, many }) => ({
  city: one(cities, {
    fields: [venues.cityId],
    references: [cities.id],
  }),
  state: one(states, {
    fields: [venues.stateId],
    references: [states.id],
  }),
  country: one(countries, {
    fields: [venues.countryId],
    references: [countries.id],
  }),
  showSessions: many(showSessions),
}));

// shows
export const showsRelations = relations(shows, ({ many }) => ({
  theaterGroupLinks: many(showTheaterGroups),
  credits: many(showCredits),
  sessions: many(showSessions),
}));

export const showTheaterGroupsRelations = relations(
  showTheaterGroups,
  ({ one }) => ({
    show: one(shows, {
      fields: [showTheaterGroups.showId],
      references: [shows.id],
    }),
    theaterGroup: one(theaterGroups, {
      fields: [showTheaterGroups.theaterGroupId],
      references: [theaterGroups.id],
    }),
  })
);

export const creditRolesRelations = relations(creditRoles, ({ many }) => ({
  showCredits: many(showCredits),
}));

export const showCreditsRelations = relations(showCredits, ({ one }) => ({
  show: one(shows, {
    fields: [showCredits.showId],
    references: [shows.id],
  }),
  person: one(people, {
    fields: [showCredits.personId],
    references: [people.id],
  }),
  creditRole: one(creditRoles, {
    fields: [showCredits.creditRoleId],
    references: [creditRoles.id],
  }),
}));

export const showSessionsRelations = relations(showSessions, ({ one }) => ({
  show: one(shows, {
    fields: [showSessions.showId],
    references: [shows.id],
  }),
  venue: one(venues, {
    fields: [showSessions.venueId],
    references: [venues.id],
  }),
  city: one(cities, {
    fields: [showSessions.cityId],
    references: [cities.id],
  }),
  state: one(states, {
    fields: [showSessions.stateId],
    references: [states.id],
  }),
  country: one(countries, {
    fields: [showSessions.countryId],
    references: [countries.id],
  }),
}));