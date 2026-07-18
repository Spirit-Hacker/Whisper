import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ DB connected successfully");
  } catch (error) {
    console.error("❌ Error connecting to DB:", error);

    process.exit(1);
  }
};
