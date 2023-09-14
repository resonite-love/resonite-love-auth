import express from "express";

declare namespace Express {
  export interface RequestWithUser extends Request {
    user: {
      id: string,
      createdAt: Date,
      neosUserId: string | null,
      discordId: string | null
    };
  }
}
