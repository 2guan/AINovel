export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        displayName: string | null;
        role?: string;
        status?: string;
      };
    }
  }
}
