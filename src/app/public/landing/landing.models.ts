import { IPlan } from '../../core/services/subscription.service';

export interface PlanMeta {
  tag: string;
  cta: string;
  features: string[];
  ctaRoute: string;
  suffix?: string;
  badge?: string;
  primary?: boolean;
  comingSoon?: boolean;
}

export interface LandingPlan extends IPlan {
  tag: string;
  cta: string;
  features: string[];
  ctaRoute: string;
  suffix?: string;
  badge?: string;
  primary: boolean;
}
