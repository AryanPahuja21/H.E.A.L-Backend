import mongoose, { Schema } from "mongoose";

const ConversationSchema = new Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, { timestamps: true });

ConversationSchema.index({ participants: 1 });

export default mongoose.model('Conversation', ConversationSchema);