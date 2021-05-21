/*

Copyright 2021 Eduworks Corporation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

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
