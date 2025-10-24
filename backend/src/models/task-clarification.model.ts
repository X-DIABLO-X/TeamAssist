import { Schema, model, Document, Types } from "mongoose";

export interface ClarificationResponse {
  message: string;
  respondedBy: Types.ObjectId;
  createdAt: Date;
}

export interface TaskClarificationDocument extends Document {
  task: Types.ObjectId;
  workspace: Types.ObjectId;
  question: string;
  askedBy: Types.ObjectId;
  responses: ClarificationResponse[];
  createdAt: Date;
  updatedAt: Date;
}

const clarificationResponseSchema = new Schema<ClarificationResponse>(
  {
    message: {
      type: String,
      required: true,
      trim: true,
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const taskClarificationSchema = new Schema<TaskClarificationDocument>(
  {
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    askedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    responses: {
      type: [clarificationResponseSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const TaskClarificationModel = model<TaskClarificationDocument>(
  "TaskClarification",
  taskClarificationSchema
);

export default TaskClarificationModel;
