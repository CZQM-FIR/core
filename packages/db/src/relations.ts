import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  users: {
    flags: r.many.flags({
      from: r.users.cid.through(r.usersToFlags.userId),
      to: r.flags.id.through(r.usersToFlags.flagId),
    }),
    rating: r.one.ratings({
      from: r.users.ratingID,
      to: r.ratings.id,
      optional: false,
    }),
    news: r.many.news(),
    sessions: r.many.sessions(),
    tickets: r.many.tickets({
      from: r.users.cid.through(r.ticketMessages.authorId),
      to: r.tickets.id.through(r.ticketMessages.ticketId),
      alias: "tickets_users_via_ticketMessages",
    }),
    authoredTickets: r.many.tickets({
      from: r.users.cid,
      to: r.tickets.authorId,
    }),
    ticketTypes: r.many.ticketType({
      from: r.users.cid.through(r.tickets.authorId),
      to: r.ticketType.id.through(r.tickets.typeId),
    }),
    positions: r.many.positions(),
    roster: r.many.roster(),
    authSessions: r.many.authSessions(),
    integrations: r.many.integrations(),
    preferences: r.many.preferences(),
    enrolledList: r.many.waitlists({
      from: r.users.cid.through(r.enrolledUsers.cid),
      to: r.waitlists.id.through(r.enrolledUsers.waitlistId),
      alias: "waitlists_id_users_cid_via_enrolledUsers",
    }),
    waitingList: r.many.waitlists({
      from: r.users.cid.through(r.waitingUsers.cid),
      to: r.waitlists.id.through(r.waitingUsers.waitlistId),
      alias: "waitlists_id_users_cid_via_waitingUsers",
    }),
    moodleQueues: r.many.moodleQueue(),
    notifications: r.many.notifications(),
    soloEndorsements: r.many.soloEndorsements({
      from: r.users.cid,
      to: r.soloEndorsements.controllerId,
    }),
    waitingPositions: r.many.waitingUsers({
      from: r.users.cid,
      to: r.waitingUsers.cid,
    }),
    enrolledPositions: r.many.enrolledUsers({
      from: r.users.cid,
      to: r.enrolledUsers.cid,
    }),
  },
  flags: {
    users: r.many.users(),
  },
  ratings: {
    users: r.many.users(),
    sessions: r.many.sessions(),
  },
  news: {
    author: r.one.users({
      from: r.news.authorID,
      to: r.users.cid,
    }),
  },
  sessions: {
    position: r.one.positions({
      from: r.sessions.positionId,
      to: r.positions.id,
      optional: false,
    }),
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.cid,
      optional: false,
    }),
    rating: r.one.ratings({
      from: r.sessions.ratingId,
      to: r.ratings.id,
    }),
  },
  positions: {
    sessions: r.many.sessions(),
    users: r.many.users({
      from: r.positions.id.through(r.soloEndorsements.positionId),
      to: r.users.cid.through(r.soloEndorsements.controllerId),
    }),
  },
  tickets: {
    author: r.one.users({
      from: r.tickets.authorId,
      to: r.users.cid,
      optional: false,
    }),
    users: r.many.users({
      from: r.tickets.id.through(r.ticketMessages.ticketId),
      to: r.users.cid.through(r.ticketMessages.authorId),
      alias: "tickets_users_via_ticketMessages",
    }),
    type: r.one.ticketType({
      from: r.tickets.typeId,
      to: r.ticketType.id,
      optional: false,
    }),
    messages: r.many.ticketMessages({
      from: r.tickets.id,
      to: r.ticketMessages.ticketId,
    }),
  },
  ticketMessages: {
    ticket: r.one.tickets({
      from: r.ticketMessages.ticketId,
      to: r.tickets.id,
      optional: false,
    }),
    author: r.one.users({
      from: r.ticketMessages.authorId,
      to: r.users.cid,
      optional: false,
    }),
  },
  ticketTypes: {
    users: r.many.users({
      from: r.ticketType.id.through(r.tickets.typeId),
      to: r.users.cid.through(r.tickets.authorId),
    }),
  },
  roster: {
    user: r.one.users({
      from: r.roster.controllerId,
      to: r.users.cid,
      optional: false,
    }),
  },
  authSessions: {
    user: r.one.users({
      from: r.authSessions.userId,
      to: r.users.cid,
      optional: false,
    }),
  },
  integrations: {
    user: r.one.users({
      from: r.integrations.cid,
      to: r.users.cid,
      optional: false,
    }),
  },
  preferences: {
    user: r.one.users({
      from: r.preferences.cid,
      to: r.users.cid,
      optional: false,
    }),
  },
  waitlists: {
    students: r.many.waitingUsers(),
    enrolled: r.many.enrolledUsers(),
    usersViaEnrolledUsers: r.many.users({
      from: r.waitlists.id.through(r.enrolledUsers.waitlistId),
      to: r.users.cid.through(r.enrolledUsers.cid),
      alias: "waitlists_id_users_cid_via_enrolledUsers",
    }),
    usersViaWaitingUsers: r.many.users({
      from: r.waitlists.id.through(r.waitingUsers.waitlistId),
      to: r.users.cid.through(r.waitingUsers.cid),
      alias: "waitlists_id_users_cid_via_waitingUsers",
    }),
  },
  waitingUsers: {
    user: r.one.users({
      from: r.waitingUsers.cid,
      to: r.users.cid,
      optional: false,
    }),
    waitlist: r.one.waitlists({
      from: r.waitingUsers.waitlistId,
      to: r.waitlists.id,
      optional: false,
    }),
  },
  enrolledUsers: {
    user: r.one.users({
      from: r.enrolledUsers.cid,
      to: r.users.cid,
      optional: false,
    }),
    waitlist: r.one.waitlists({
      from: r.enrolledUsers.waitlistId,
      to: r.waitlists.id,
      optional: false,
    }),
  },
  moodleQueue: {
    user: r.one.users({
      from: r.moodleQueue.cid,
      to: r.users.cid,
      optional: false,
    }),
  },
  notifications: {
    user: r.one.users({
      from: r.notifications.userId,
      to: r.users.cid,
      optional: false,
    }),
  },
  soloEndorsements: {
    position: r.one.positions({
      from: r.soloEndorsements.positionId,
      to: r.positions.id,
      optional: false,
    }),
    controller: r.one.users({
      from: r.soloEndorsements.controllerId,
      to: r.users.cid,
      optional: false,
    }),
  },
}));
