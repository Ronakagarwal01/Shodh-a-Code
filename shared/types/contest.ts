export enum ContestStatus {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
}

export interface Contest {
  id: string;
  slug: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: ContestStatus;
  organization: string;
  problemIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContestOverview extends Contest {
  problemsCount: number;
  participantsCount: number;
  isRegistered?: boolean;
}
