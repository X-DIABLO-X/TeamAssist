import { useState } from "react";
import { z } from "zod";
import { format, formatDistanceToNow } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CalendarIcon, Loader, ShieldAlert } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import useWorkspaceId from "@/hooks/use-workspace-id";
import {
  TaskPriorityEnum,
  TaskStatusEnum,
} from "@/constant";
import type {
  TaskPriorityEnumType,
  TaskStatusEnumType,
} from "@/constant";
import useGetWorkspaceMembers from "@/hooks/api/use-get-workspace-members";
import useTaskClarifications from "@/hooks/api/use-task-clarifications";
import {
  createTaskClarificationMutationFn,
  editTaskMutationFn,
  respondTaskClarificationMutationFn,
} from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type {
  RespondTaskClarificationPayloadType,
  TaskClarificationResponseType,
  TaskType,
} from "@/types/api.type";
import { useAuthContext } from "@/context/auth-provider";
const UNASSIGNED_OPTION_VALUE = "__unassigned__";

const formSchema = z.object({
  title: z.string().trim().min(1, { message: "Title is required" }),
  description: z.string().trim(),
  status: z.enum(
    Object.values(TaskStatusEnum) as [keyof typeof TaskStatusEnum]
  ),
  priority: z.enum(
    Object.values(TaskPriorityEnum) as [keyof typeof TaskPriorityEnum]
  ),
  assignedTo: z.string().trim().optional(),
  dueDate: z.date({ required_error: "A due date is required." }),
});

export default function EditTaskForm({
  task,
  onClose,
}: {
  task: TaskType;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();
  const { user, workspace } = useAuthContext();
  const [activeTab, setActiveTab] = useState<"details" | "clarifications">(
    "details"
  );
  const { mutate: updateTask, isPending: isUpdatingTask } = useMutation({
    mutationFn: editTaskMutationFn,
  });

  const { data: memberData } = useGetWorkspaceMembers(workspaceId);
  const members = memberData?.members || [];

  const memberRecord = workspace?.members.find(
    (member) => member.userId === user?._id
  );

  const roleName = memberRecord?.role?.name;
  const isOwnerOrAdmin = roleName === "OWNER" || roleName === "ADMIN";
  const isTaskAssignee = task.assignedTo?._id === user?._id;
  const canUpdateStatus = isOwnerOrAdmin || isTaskAssignee;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: task?.status ?? "TODO",
      priority: task?.priority ?? "MEDIUM",
      assignedTo: task.assignedTo?._id ?? UNASSIGNED_OPTION_VALUE,
      dueDate: task?.dueDate ? new Date(task.dueDate) : new Date(),
    },
  });

  const membersOptions = members
    .map((member) => {
      const id = member.userId?._id;
      if (!id) {
        return null;
      }
      return {
        label: member.userId?.name || "Unknown",
        value: id,
      };
    })
    .filter(Boolean) as Array<{ label: string; value: string }>;

  const statusOptions = Object.values(TaskStatusEnum).map((status) => ({
    label: status.charAt(0) + status.slice(1).toLowerCase(),
    value: status,
  }));

  const priorityOptions = Object.values(TaskPriorityEnum).map((priority) => ({
    label: priority.charAt(0) + priority.slice(1).toLowerCase(),
    value: priority,
  }));

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (isUpdatingTask || !canUpdateStatus) return;

    const payloadData: Partial<{
      title: string;
      description: string;
      status: TaskStatusEnumType;
      priority: TaskPriorityEnumType;
      assignedTo: string | null;
      dueDate: string;
    }> = {
      status: values.status,
    };

    if (isOwnerOrAdmin) {
      payloadData.title = values.title;
      payloadData.description = values.description;
      payloadData.priority = values.priority;
      payloadData.assignedTo =
        values.assignedTo && values.assignedTo !== UNASSIGNED_OPTION_VALUE
          ? values.assignedTo
          : null;
      payloadData.dueDate = values.dueDate
        ? values.dueDate.toISOString()
        : undefined;
    }

    const payload = {
      workspaceId,
      projectId: task.project?._id ?? "",
      taskId: task._id,
      data: payloadData,
    };

    updateTask(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["all-tasks", workspaceId],
        });
        toast({
          title: "Success",
          description: "Task updated successfully",
          variant: "success",
        });
        onClose();
      },
      onError: (error: unknown) => {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to update the task",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="w-full h-auto max-w-full">
      <div className="h-full">
        <div className="mb-5 pb-2 border-b">
          <h1 className="text-xl font-semibold text-center sm:text-left">
            Edit Task
          </h1>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        >
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="clarifications">Clarifications</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <Form {...form}>
              <form
                className="space-y-3"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Task title"
                          readOnly={!isOwnerOrAdmin}
                          disabled={!isOwnerOrAdmin}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={2}
                          placeholder="Description"
                          readOnly={!isOwnerOrAdmin}
                          disabled={!isOwnerOrAdmin}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                        disabled={!isOwnerOrAdmin}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <div className="w-full max-h-[200px] overflow-y-auto scrollbar">
                            {isOwnerOrAdmin && (
                              <SelectItem value={UNASSIGNED_OPTION_VALUE}>
                                Unassigned
                              </SelectItem>
                            )}
                            {membersOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </div>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" disabled={!isOwnerOrAdmin}>
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick a date"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent>
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={!isOwnerOrAdmin ? () => true : undefined}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                        disabled={!isOwnerOrAdmin}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priorityOptions.map((priority) => (
                            <SelectItem key={priority.value} value={priority.value}>
                              {priority.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isOwnerOrAdmin && (
                  <div className="rounded-md bg-muted/40 border px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Only admins, owners, or the assigned member can update status.
                    Task details like title, description, priority, and assignee are
                    managed by workspace admins.
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isUpdatingTask || !canUpdateStatus}
                >
                  {isUpdatingTask && (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="clarifications">
            <ClarificationSection
              workspaceId={workspaceId}
              taskId={task._id}
              canAsk={Boolean(roleName)}
              isOwnerOrAdmin={isOwnerOrAdmin}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

type ClarificationSectionProps = {
  workspaceId: string;
  taskId: string;
  canAsk: boolean;
  isOwnerOrAdmin: boolean;
};

const ClarificationSection = ({
  workspaceId,
  taskId,
  canAsk,
  isOwnerOrAdmin,
}: ClarificationSectionProps) => {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [activeResponseId, setActiveResponseId] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useTaskClarifications(
    workspaceId,
    taskId
  );
  const clarifications = data?.clarifications ?? [];

  const { mutate: submitClarification, isPending: isSubmittingQuestion } =
    useMutation<
      { message: string; clarification: TaskClarificationResponseType },
      unknown,
      { workspaceId: string; taskId: string; question: string }
    >({
      mutationFn: createTaskClarificationMutationFn,
      onSuccess: () => {
        toast({
          title: "Question posted",
          description: "Your clarification request was shared with admins.",
          variant: "success",
        });
        setQuestion("");
        queryClient.invalidateQueries({
          queryKey: ["task-clarifications", workspaceId, taskId],
        });
      },
      onError: (error: unknown) => {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to submit clarification",
          variant: "destructive",
        });
      },
    });

  const { mutate: respondClarification, isPending: isSubmittingResponse } =
    useMutation<
      { message: string; clarification: TaskClarificationResponseType },
      unknown,
      RespondTaskClarificationPayloadType
    >({
      mutationFn: respondTaskClarificationMutationFn,
      onMutate: (variables) => {
        setActiveResponseId(variables.clarificationId);
      },
      onSuccess: (_, variables) => {
        toast({
          title: "Response posted",
          description: "Your reply is visible to everyone on the task.",
          variant: "success",
        });
        setAnswerDrafts((prev) => ({
          ...prev,
          [variables.clarificationId]: "",
        }));
        queryClient.invalidateQueries({
          queryKey: ["task-clarifications", workspaceId, taskId],
        });
      },
      onError: (error: unknown) => {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to post the response",
          variant: "destructive",
        });
      },
      onSettled: () => {
        setActiveResponseId(null);
      },
    });

  const handleAsk = () => {
    const trimmed = question.trim();
    if (trimmed.length < 5) {
      toast({
        title: "Hold on",
        description: "Please provide a bit more detail in your question.",
        variant: "destructive",
      });
      return;
    }

    submitClarification({ workspaceId, taskId, question: trimmed });
  };

  const handleRespond = (clarificationId: string) => {
    const message = answerDrafts[clarificationId]?.trim();
    if (!message) {
      toast({
        title: "Nothing to send",
        description: "Please type a response before submitting.",
        variant: "destructive",
      });
      return;
    }

    respondClarification({
      workspaceId,
      taskId,
      clarificationId,
      message,
    });
  };

  return (
    <div className="space-y-4">
      {canAsk && (
        <div className="rounded-md border p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Need clarification?</h2>
            <p className="text-xs text-muted-foreground">
              Ask a question for the workspace admins or owner to review.
            </p>
          </div>
          <Textarea
            placeholder="Describe what you need help with..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={3}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmittingQuestion}
              onClick={() => setQuestion("")}
            >
              Clear
            </Button>
            <Button
              type="button"
              disabled={isSubmittingQuestion}
              onClick={handleAsk}
            >
              {isSubmittingQuestion && (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              )}
              Submit question
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Clarifications</h2>
          {isFetching && (
            <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : clarifications.length === 0 ? (
          <p className="text-sm text-muted-foreground border rounded-md px-3 py-4">
            No clarifications yet. {canAsk ? "Be the first to ask a question." : ""}
          </p>
        ) : (
          <ScrollArea className="max-h-80 pr-3">
            <div className="space-y-3">
              {clarifications.map((clarification) => (
                <ClarificationCard
                  key={clarification._id}
                  clarification={clarification}
                  answerDraft={answerDrafts[clarification._id] ?? ""}
                  onDraftChange={(value) =>
                    setAnswerDrafts((prev) => ({
                      ...prev,
                      [clarification._id]: value,
                    }))
                  }
                  onRespond={() => handleRespond(clarification._id)}
                  isOwnerOrAdmin={isOwnerOrAdmin}
                  isSubmitting={
                    isSubmittingResponse && activeResponseId === clarification._id
                  }
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

type ClarificationCardProps = {
  clarification: TaskClarificationResponseType;
  answerDraft: string;
  onDraftChange: (value: string) => void;
  onRespond: () => void;
  isOwnerOrAdmin: boolean;
  isSubmitting: boolean;
};

const ClarificationCard = ({
  clarification,
  answerDraft,
  onDraftChange,
  onRespond,
  isOwnerOrAdmin,
  isSubmitting,
}: ClarificationCardProps) => {
  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            {clarification.askedBy?.name ?? "Workspace member"}
          </p>
          <p className="text-xs text-muted-foreground">
            Asked {formatDistanceToNow(new Date(clarification.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>
      </div>
      <p className="text-sm text-foreground">{clarification.question}</p>

      <div className="space-y-2">
        {clarification.responses.length === 0 ? (
          <p className="text-xs text-muted-foreground">No responses yet.</p>
        ) : (
          clarification.responses.map((response) => (
            <div key={response._id} className="rounded-md bg-muted/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {response.respondedBy?.name ?? "Workspace admin"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(response.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className="mt-1 text-sm text-foreground">{response.message}</p>
            </div>
          ))
        )}
      </div>

      {isOwnerOrAdmin && (
        <div className="space-y-2 border-t pt-2">
          <Textarea
            value={answerDraft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Share an update or answer..."
            rows={2}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onDraftChange("")}
            >
              Clear
            </Button>
            <Button type="button" size="sm" disabled={isSubmitting} onClick={onRespond}>
              {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Respond
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
