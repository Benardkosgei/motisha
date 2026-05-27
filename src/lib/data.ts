import { C } from '@/components/Logo';
import {
  Home,
  CalendarDays,
  GraduationCap,
  Gift,
  Briefcase,
  FolderOpen,
  CreditCard,
  Bell,
  Mic2,
  FileText,
  Newspaper,
  User,
  type LucideIcon,
} from 'lucide-react';

export const TYPE_COLORS: Record<string, string> = {
  Speech: C.teal,
  Newsletter: C.mustard,
  Course: C.turquoise,
  Template: C.success,
  Guide: '#A855F7',
  Article: '#F97316',
  Resource: '#EC4899',
};

export type NavItem = 'home' | 'profile' | 'calendar' | 'courses' | 'referral' | 'book-service' | 'resources' | 'pricing' | 'notifications' | 'speeches' | 'articles' | 'newsletters';

export interface NavItemDef {
  id: NavItem;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItemDef[] = [
  { id: 'home',          label: 'Home',            icon: Home },
  { id: 'profile',       label: 'Profile',         icon: User },
  { id: 'calendar',      label: 'Weekly Calendar', icon: CalendarDays },
  { id: 'speeches',      label: 'Speeches',        icon: Mic2 },
  { id: 'articles',      label: 'Articles',        icon: FileText },
  { id: 'newsletters',   label: 'Newsletters',     icon: Newspaper },
  { id: 'courses',       label: 'My Courses',      icon: GraduationCap },
  { id: 'referral',      label: 'Refer & Earn',    icon: Gift },
  { id: 'book-service',  label: 'Book a Service',  icon: Briefcase },
  { id: 'resources',     label: 'Resources',       icon: FolderOpen },
  { id: 'pricing',       label: 'Plans',           icon: CreditCard },
  { id: 'notifications', label: 'Notifications',   icon: Bell },
];
