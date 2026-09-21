import type { DB } from "../db";
import { Position } from "./position";
import { User } from "./user";

export class SoloEndorsement {
  id: number;
  cid: number;
  positions: Position[];
  controller: User;
  expiresAt: Date;
  private db: DB;

  private constructor(
    id: number,
    cid: number,
    positions: Position[],
    controller: User,
    expiresAt: Date,
    db: DB,
  ) {
    this.id = id;
    this.cid = cid;
    this.positions = positions;
    this.controller = controller;
    this.expiresAt = expiresAt;
    this.db = db;
  }

  static async fromId(db: DB, searchId: number): Promise<SoloEndorsement> {
    const endorsement = await db.query.soloEndorsements.findFirst({
      where: { id: searchId },
      with: { positions: true },
    });
    if (!endorsement) throw new Error("Solo endorsement not found");
    const { controllerId, expiresAt, positions, id } = endorsement;
    const controller = await User.fromCid(db, controllerId);

    return new SoloEndorsement(
      id,
      controllerId,
      positions.map(
        (position) =>
          new Position(
            position.id,
            position.name,
            position.callsign,
            position.frequency,
            db,
          ),
      ),
      controller!,
      expiresAt,
      db,
    );
  }

  static async fromCID(db: DB, cid: number): Promise<SoloEndorsement[]> {
    const endorsements = await db.query.soloEndorsements.findMany({
      where: { controllerId: cid },
      columns: {
        id: true,
      },
    });

    return Promise.all(
      endorsements.map(async (e) => {
        return SoloEndorsement.fromId(db, e.id);
      }),
    );
  }

  static async fetchAll(
    db: DB,
    includeInavtive = false,
  ): Promise<SoloEndorsement[]> {
    const endorsementsData = await db.query.soloEndorsements.findMany({
      with: { positions: true },
    });

    const endorsements = endorsementsData.map(async (e) => {
      const controller = await User.fromCid(db, e.controllerId);

      return new SoloEndorsement(
        e.id,
        e.controllerId,
        e.positions.map(
          (position) =>
            new Position(
              position.id,
              position.name,
              position.callsign,
              position.frequency,
              db,
            ),
        ),
        controller!,
        e.expiresAt,
        db,
      );
    });

    return (await Promise.all(endorsements)).filter(
      (e) => includeInavtive || e.isActive,
    );
  }

  get isActive(): boolean {
    return this.expiresAt.valueOf() > Date.now();
  }
}
