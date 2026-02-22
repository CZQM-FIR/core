import type { DB } from "../db";

export class Position {
  id: number;
  name: string;
  callsign: string;
  frequency: string;
  private db: DB;

  constructor(
    id: number,
    name: string,
    callsign: string,
    frequency: string,
    db: DB,
  ) {
    this.id = id;
    this.name = name;
    this.callsign = callsign;
    this.frequency = frequency;
    this.db = db;
  }

  static async fromId(db: DB, searchId: number): Promise<Position> {
    const position = await db.query.positions.findFirst({
      where: { id: searchId },
    });
    if (!position) throw new Error("Position not found");
    const { id, name, callsign, frequency } = position;
    return new Position(id, name, callsign, frequency, db);
  }
}
