import { Socket, Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import { verifyToken } from "@clerk/express";
import Message from "../models/Message";
import Chat from "../models/Chat";
import User from "../models/User";

interface SocketWithUserId extends Socket {
  userId?: string;
}

// store online users in memory - userId -> socketId
export const onlneUsers: Map<string, string> = new Map();

export const initializeSocketServer = (httpServer: HttpServer) => {
  const allowedOrigins = [
    "http://localhost:5173", // web
    "http://localhost:8081", // mobile
    process.env.FRONTEND_URL!, // production
  ];

  const io = new SocketServer(httpServer, {
    cors: { origin: allowedOrigins },
  });

  // verify socket connection - if user is authenticated we will store its userId in the socket
  io.use(async (socket: SocketWithUserId, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const session = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });

      const clerkId = session.sub;

      const user = await User.findOne({ clerkId });
      if (!user) {
        return next(new Error("User not found"));
      }

      socket.userId = user._id.toString();
      next();
    } catch (error: any) {
      return next(new Error(error));
    }
  });

  io.on("connection", (socket: SocketWithUserId) => {
    const userId = socket.userId;

    // send list of current online users to the newly connected user
    socket.emit("online-users", { userIds: Array.from(onlneUsers.keys()) });

    // store the newly connected user in the online users map
    onlneUsers.set(userId!, socket.id);

    // notify all other users that a new user has come online
    socket.broadcast.emit("user-online", { userId });

    socket.join(`user-${userId}`);

    socket.on("join-chat", (chatId: string) => {
      socket.join(`chat-${chatId}`);
    });

    socket.on("leave-chat", (chatId: string) => {
      socket.leave(`chat-${chatId}`);
    });

    socket.on(
      "send-message",
      async (data: { chatId: string; text: string }) => {
        try {
          const { chatId, text } = data;
          const chat = await Chat.findOne({
            _id: chatId,
            participants: userId,
          });

          if (!chat) {
            socket.emit("error", {
              message: "Chat not found or user not a participant",
            });
            return;
          }

          const message = await Message.create({
            chat: chatId,
            sender: userId,
            text,
          });

          chat.lastMessage = message._id;
          chat.lastMessageAt = new Date();
          await chat.save();

          await message.populate("sender", "name email avatar");

          // notify all users in the chat about the new message
          io.to(`chat-${chatId}`).emit("new-message", message);

          // also emit to partcipants personal rooms (for chat list view)
          for (const participantId of chat.participants) {
            io.to(`user-${participantId}`).emit("new-message", message);
          }
        } catch (error) {
          socket.emit("socket-error", { message: "Failed to send message" });
        }
      },
    );

    // TODO: Later
    socket.on("typing", async (data) => {});

    socket.on("disconnect", () => {
      // remove the user from the online users map
      onlneUsers.delete(userId!);

      // notify all other users that a user has gone offline
      socket.broadcast.emit("user-offline", { userId });
    });
  });

  return io;
};
