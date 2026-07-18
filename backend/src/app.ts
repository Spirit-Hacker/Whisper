import express from "express";
import userRoutes from "./routes/userRoutes";
import messageRoutes from "./routes/messageRoutes";
import chatRoutes from "./routes/chatRoutes";
import authRoutes from "./routes/authRoutes";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

export default app;
