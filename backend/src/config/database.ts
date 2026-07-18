import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const mongoDBUrl = process.env.MONGO_URI;
    if (!mongoDBUrl) {
      throw new Error("MONGO_URI is not defined");
    }
    await mongoose.connect(mongoDBUrl);
    console.log("✅ DB connected successfully");
  } catch (error) {
    console.error("❌ Error connecting to DB:", error);

    process.exit(1);
  }
};
