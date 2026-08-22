export type StudentTrainingNote = {
	sessionId: number;
	notesSubmittedAt: Date | null;
	startsAt: Date;
	actualEndedAt: Date | null;
	courseName: string;
	sessionDescription: string;
	sessionTypeLabel: string;
	positionTrained: string | null;
	instructorName: string;
	instructorRole: string;
	instructorNotes: string | null;
};

export type LegacyTrainingNote = {
	id: number;
	createdAt: Date | null;
	createdAtRaw: string | null;
	position: string | null;
	sessionTypeLabel: string | null;
	instructorName: string | null;
	trainingNote: string | null;
};

export type StudentTrainingNotes = {
	notes: StudentTrainingNote[];
	legacyNotes: LegacyTrainingNote[];
	legacyError: string | null;
};
