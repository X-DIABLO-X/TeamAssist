import { getTaskClarificationsQueryFn } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const useTaskClarifications = (workspaceId: string, taskId: string) => {
  return useQuery({
    queryKey: ["task-clarifications", workspaceId, taskId],
    queryFn: () => getTaskClarificationsQueryFn({ workspaceId, taskId }),
    enabled: Boolean(workspaceId && taskId),
    staleTime: 30_000,
  });
};

export default useTaskClarifications;
