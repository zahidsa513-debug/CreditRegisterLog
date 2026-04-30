import { logEvent } from 'firebase/analytics';
import { analytics } from './firebase';

export const trackEvent = async (eventName: string, params?: Record<string, any>) => {
  try {
    const a = await analytics;
    if (a) {
      logEvent(a, eventName, params);
    }
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

export const trackPageChange = (pageName: string) => {
  trackEvent('page_view', { page_path: pageName, page_title: pageName });
};

export const trackFeatureUsage = (featureName: string, params?: Record<string, any>) => {
  trackEvent('feature_used', { feature_id: featureName, ...params });
};
