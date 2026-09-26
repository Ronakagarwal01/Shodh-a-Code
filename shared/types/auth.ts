export enum UserRole {
  LEARNER = 'learner',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  organization: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  user: UserProfile;
}

export interface RegisterDto {
  username: string;
  displayName: string;
  email: string;
  password: string;
  organization?: string;
  role?: UserRole;
}

export interface LoginDto {
  usernameOrEmail: string;
  password: string;
}
