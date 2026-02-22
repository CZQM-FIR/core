import { events } from "@czqm/db/schema";
import { eq } from "drizzle-orm";
import type { DB } from "../db";

type CreateEventInput = {
  name: string;
  start: Date;
  end: Date;
  description: string;
  image: string;
  recurring?: boolean;
};

type UpdateEventInput = {
  name: string;
  start: Date;
  end: Date;
  description: string;
  image: string;
  recurring: boolean;
};

export class Event {
  static async fetchAll(db: DB) {
    return await db.query.events.findMany();
  }

  static async fetchUpcoming(db: DB, fromDate = new Date()) {
    const dateFloorUtc = new Date(
      fromDate.getUTCFullYear(),
      fromDate.getUTCMonth(),
      fromDate.getUTCDate(),
    );

    return await db.query.events.findMany({
      where: {
        end: { gte: dateFloorUtc },
      },
      orderBy: (events, { desc }) => desc(events.start),
    });
  }

  static async fetchSplitByCurrentTime(db: DB, now = new Date()) {
    const events = await Event.fetchAll(db);

    return {
      upcomingEvents: events.filter((event) => new Date(event.end) > now),
      pastEvents: events.filter((event) => new Date(event.end) <= now),
    };
  }

  static async fetchById(db: DB, id: number) {
    return await db.query.events.findFirst({
      where: { id },
    });
  }

  static async create(db: DB, data: CreateEventInput) {
    return await db.insert(events).values({
      name: data.name,
      start: data.start,
      end: data.end,
      description: data.description,
      image: data.image,
      recurring: data.recurring ?? false,
    });
  }

  static async update(db: DB, id: number, data: UpdateEventInput) {
    return await db
      .update(events)
      .set({
        name: data.name,
        start: data.start,
        end: data.end,
        description: data.description,
        image: data.image,
        recurring: data.recurring,
      })
      .where(eq(events.id, id));
  }

  static async remove(db: DB, id: number) {
    return await db.delete(events).where(eq(events.id, id));
  }
}
