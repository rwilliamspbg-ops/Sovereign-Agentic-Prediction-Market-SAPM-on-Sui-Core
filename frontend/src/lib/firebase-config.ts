export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface NotificationPreferences {
  marketResolutionAlerts: boolean;
  priceChangeAlerts: boolean;
  agentForecastAlerts: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  marketResolutionAlerts: true,
  priceChangeAlerts: true,
  agentForecastAlerts: true,
};

const PREFS_STORAGE_KEY = 'sapm:notification-prefs';

export function getNotificationPermissionState(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

export function loadNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const raw = localStorage.getItem(PREFS_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  try {
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...JSON.parse(raw),
    } as NotificationPreferences;
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function saveNotificationPreferences(preferences: NotificationPreferences): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(preferences));
}

export async function notifyLocalPreview(title: string, body: string): Promise<boolean> {
  const permission = getNotificationPermissionState();
  if (permission !== 'granted' || typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  new Notification(title, {
    body,
    icon: '/favicon.ico',
  });

  return true;
}
