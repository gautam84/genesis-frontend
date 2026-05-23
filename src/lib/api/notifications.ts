export enum NotificationType {
    INFO = 'INFO',
    SUCCESS = 'SUCCESS',
    WARNING = 'WARNING',
    ERROR = 'ERROR'
}

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    workspaceId?: string;
    actorId?: string;
    link?: string;
    read: boolean;
    createdAt: string;
}
