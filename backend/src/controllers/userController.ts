import type { NextFunction, Response } from "express";
import { User } from "../models/User";
import type { AuthRequest } from "../middleware/auth";

export const getUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    const users = await User.find({ _id: { $ne: userId } });
    res.status(200).json(users);
  } catch (error) {
    res.status(500);
    next(error);
  }
};
