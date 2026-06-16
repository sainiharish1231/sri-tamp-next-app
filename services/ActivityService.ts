import ApiService from "./ApiService";
import type { ActivityLog } from "@/types/activity.types";

class ActivityService extends ApiService {
  constructor() {
    super("/activities");
  }

  fetchRecentActivities(options?: any): Promise<{
    success: boolean;
    data?: { data: ActivityLog[]; nextCursor?: string | null; hasMore?: boolean };
    message?: string;
  }> {
    return this.getData("/", options);
  }
}

const activityService = new ActivityService();

export default activityService;
