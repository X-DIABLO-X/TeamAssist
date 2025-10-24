import { TaskPriorityEnum, TaskStatusEnum } from "../enums/task.enum";
import { Roles, RoleType } from "../enums/role.enum";
import MemberModel from "../models/member.model";
import ProjectModel from "../models/project.model";
import TaskModel from "../models/task.model";
import TaskClarificationModel from "../models/task-clarification.model";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "../utils/appError";

const verifyTaskBelongsToWorkspace = async (
  workspaceId: string,
  taskId: string
) => {
  const task = await TaskModel.findOne({
    _id: taskId,
    workspace: workspaceId,
  });

  if (!task) {
    throw new NotFoundException(
      "Task not found or does not belong to this workspace"
    );
  }

  return task;
};

export const createTaskService = async (
  workspaceId: string,
  projectId: string,
  userId: string,
  body: {
    title: string;
    description?: string;
    priority: string;
    status: string;
    assignedTo?: string | null;
    dueDate?: string;
  }
) => {
  const { title, description, priority, status, assignedTo, dueDate } = body;

  const project = await ProjectModel.findById(projectId);

  if (!project || project.workspace.toString() !== workspaceId.toString()) {
    throw new NotFoundException(
      "Project not found or does not belong to this workspace"
    );
  }
  if (assignedTo) {
    const isAssignedUserMember = await MemberModel.exists({
      userId: assignedTo,
      workspaceId,
    });

    if (!isAssignedUserMember) {
      throw new Error("Assigned user is not a member of this workspace.");
    }
  }
  const task = new TaskModel({
    title,
    description,
    priority: priority || TaskPriorityEnum.MEDIUM,
    status: status || TaskStatusEnum.TODO,
    assignedTo,
    createdBy: userId,
    workspace: workspaceId,
    project: projectId,
    dueDate,
  });

  await task.save();

  return { task };
};

type UpdateTaskPayload = {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  assignedTo?: string | null;
  dueDate?: string;
};

export const updateTaskService = async (
  workspaceId: string,
  projectId: string,
  taskId: string,
  userId: string,
  userRole: RoleType,
  body: UpdateTaskPayload
) => {
  const project = await ProjectModel.findById(projectId);

  if (!project || project.workspace.toString() !== workspaceId.toString()) {
    throw new NotFoundException(
      "Project not found or does not belong to this workspace"
    );
  }

  const task = await TaskModel.findById(taskId);

  if (!task || task.project.toString() !== projectId.toString()) {
    throw new NotFoundException(
      "Task not found or does not belong to this project"
    );
  }

  const isOwnerOrAdmin =
    userRole === Roles.OWNER || userRole === Roles.ADMIN;

  const isTaskAssignedToUser =
    task.assignedTo && task.assignedTo.toString() === userId.toString();

  if (!isOwnerOrAdmin && !isTaskAssignedToUser) {
    throw new UnauthorizedException(
      "You are not authorized to update this task"
    );
  }

  const providedEntries = Object.entries(body).filter(
    ([, value]) => value !== undefined
  );

  if (!isOwnerOrAdmin) {
    const invalidFields = providedEntries
      .map(([key]) => key)
      .filter((key) => key !== "status");

    if (invalidFields.length > 0) {
      throw new UnauthorizedException(
        "Members can only update the task status"
      );
    }
  }

  const updatePayload: Record<string, unknown> = {};

  if (body.status !== undefined) {
    updatePayload.status = body.status;
  }

  if (isOwnerOrAdmin) {
    if (body.title !== undefined) {
      updatePayload.title = body.title;
    }
    if (body.description !== undefined) {
      updatePayload.description = body.description;
    }
    if (body.priority !== undefined) {
      updatePayload.priority = body.priority;
    }
    if (body.dueDate !== undefined) {
      updatePayload.dueDate = body.dueDate;
    }

    if (Object.prototype.hasOwnProperty.call(body, "assignedTo")) {
      const sanitizedAssignee =
        body.assignedTo === undefined || body.assignedTo === ""
          ? undefined
          : body.assignedTo;

      if (sanitizedAssignee) {
        const isAssignedUserMember = await MemberModel.exists({
          userId: sanitizedAssignee,
          workspaceId,
        });

        if (!isAssignedUserMember) {
          throw new BadRequestException(
            "Assigned user is not a member of this workspace"
          );
        }
        updatePayload.assignedTo = sanitizedAssignee;
      } else if (body.assignedTo === null) {
        updatePayload.assignedTo = null;
      } else if (body.assignedTo === "") {
        updatePayload.assignedTo = null;
      }
    }
  }

  if (!Object.keys(updatePayload).length) {
    throw new BadRequestException("No updates were provided");
  }

  const updatedTask = await TaskModel.findByIdAndUpdate(taskId, updatePayload, {
    new: true,
  });

  if (!updatedTask) {
    throw new BadRequestException("Failed to update task");
  }

  return { updatedTask };
};

export const getAllTasksService = async (
  workspaceId: string,
  filters: {
    projectId?: string;
    status?: string[];
    priority?: string[];
    assignedTo?: string[];
    keyword?: string;
    dueDate?: string;
  },
  pagination: {
    pageSize: number;
    pageNumber: number;
  }
) => {
  const query: Record<string, any> = {
    workspace: workspaceId,
  };

  if (filters.projectId) {
    query.project = filters.projectId;
  }

  if (filters.status && filters.status?.length > 0) {
    query.status = { $in: filters.status };
  }

  if (filters.priority && filters.priority?.length > 0) {
    query.priority = { $in: filters.priority };
  }

  if (filters.assignedTo && filters.assignedTo?.length > 0) {
    query.assignedTo = { $in: filters.assignedTo };
  }

  if (filters.keyword && filters.keyword !== undefined) {
    query.title = { $regex: filters.keyword, $options: "i" };
  }

  if (filters.dueDate) {
    query.dueDate = {
      $eq: new Date(filters.dueDate),
    };
  }

  //Pagination Setup
  const { pageSize, pageNumber } = pagination;
  const skip = (pageNumber - 1) * pageSize;

  const [tasks, totalCount] = await Promise.all([
    TaskModel.find(query)
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 })
      .populate("assignedTo", "_id name profilePicture -password")
      .populate("project", "_id emoji name"),
    TaskModel.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    tasks,
    pagination: {
      pageSize,
      pageNumber,
      totalCount,
      totalPages,
      skip,
    },
  };
};

export const getTaskByIdService = async (
  workspaceId: string,
  projectId: string,
  taskId: string
) => {
  const project = await ProjectModel.findById(projectId);

  if (!project || project.workspace.toString() !== workspaceId.toString()) {
    throw new NotFoundException(
      "Project not found or does not belong to this workspace"
    );
  }

  const task = await TaskModel.findOne({
    _id: taskId,
    workspace: workspaceId,
    project: projectId,
  }).populate("assignedTo", "_id name profilePicture -password");

  if (!task) {
    throw new NotFoundException("Task not found.");
  }

  return task;
};

export const getTaskClarificationsService = async (
  workspaceId: string,
  taskId: string
) => {
  await verifyTaskBelongsToWorkspace(workspaceId, taskId);

  const clarifications = await TaskClarificationModel.find({
    workspace: workspaceId,
    task: taskId,
  })
    .sort({ createdAt: -1 })
    .populate("askedBy", "_id name profilePicture")
    .populate("responses.respondedBy", "_id name profilePicture");

  return { clarifications };
};

export const createTaskClarificationService = async (
  workspaceId: string,
  taskId: string,
  userId: string,
  question: string
) => {
  await verifyTaskBelongsToWorkspace(workspaceId, taskId);

  const clarification = await TaskClarificationModel.create({
    workspace: workspaceId,
    task: taskId,
    askedBy: userId,
    question,
  });

  await clarification.populate("askedBy", "_id name profilePicture");

  return { clarification };
};

export const respondToTaskClarificationService = async (
  workspaceId: string,
  taskId: string,
  clarificationId: string,
  userId: string,
  message: string
) => {
  await verifyTaskBelongsToWorkspace(workspaceId, taskId);

  const clarification = await TaskClarificationModel.findOneAndUpdate(
    {
      _id: clarificationId,
      workspace: workspaceId,
      task: taskId,
    },
    {
      $push: {
        responses: {
          message,
          respondedBy: userId,
          createdAt: new Date(),
        },
      },
    },
    { new: true }
  )
    .populate("askedBy", "_id name profilePicture")
    .populate("responses.respondedBy", "_id name profilePicture");

  if (!clarification) {
    throw new NotFoundException("Clarification not found for this task");
  }

  return { clarification };
};

export const deleteTaskService = async (
  workspaceId: string,
  taskId: string
) => {
  const task = await TaskModel.findOneAndDelete({
    _id: taskId,
    workspace: workspaceId,
  });

  if (!task) {
    throw new NotFoundException(
      "Task not found or does not belong to the specified workspace"
    );
  }

  return;
};
