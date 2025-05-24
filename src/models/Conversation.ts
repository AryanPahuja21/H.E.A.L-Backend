import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    roomId : { type: String, required: true },
    transcript: { type: String, required: true },
  }
    ,
    { timestamps: true }
);

export default mongoose.model("Conversation", ConversationSchema);