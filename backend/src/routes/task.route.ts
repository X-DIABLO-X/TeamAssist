import { Router } from "express";
import {
  createTaskController,
  createTaskClarificationController,
  deleteTaskController,
  getAllTasksController,
  getTaskClarificationsController,
  getTaskByIdController,
  respondToTaskClarificationController,
  updateTaskController,
} from "../controllers/task.controller";

const taskRoutes = Router();

taskRoutes.post(
  "/project/:projectId/workspace/:workspaceId/create",
  createTaskController
);

taskRoutes.delete("/:id/workspace/:workspaceId/delete", deleteTaskController);

taskRoutes.put(
  "/:id/project/:projectId/workspace/:workspaceId/update",
  updateTaskController
);

taskRoutes.get(
  "/:taskId/workspace/:workspaceId/clarifications",
  getTaskClarificationsController
);

taskRoutes.post(
  "/:taskId/workspace/:workspaceId/clarifications",
  createTaskClarificationController
);

taskRoutes.post(
  "/:taskId/workspace/:workspaceId/clarifications/:clarificationId/respond",
  respondToTaskClarificationController
);

taskRoutes.get("/workspace/:workspaceId/all", getAllTasksController);

taskRoutes.get(
  "/:id/project/:projectId/workspace/:workspaceId",
  getTaskByIdController
);

export default taskRoutes;
