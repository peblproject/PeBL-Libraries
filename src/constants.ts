export const SYNC_ANNOTATIONS = "annotations";
export const SYNC_SHARED_ANNOTATIONS = "sharedAnnotations";
export const SYNC_THREAD = "threads";
export const SYNC_PRIVATE_THREAD = "privateThreads";
export const SYNC_GROUP_THREAD = "groupThreads";
export const SYNC_REFERENCES = "references";
export const SYNC_NOTIFICATIONS = "notifications";

export function generateGroupSharedAnnotationsSyncTimestampsKey(groupId: string): string {
	return SYNC_SHARED_ANNOTATIONS + '_' + groupId;
}