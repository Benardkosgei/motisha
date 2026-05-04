import { C } from '@/components/Logo';

export const WEEKLY_CONTENT: Record<string, ContentItem[]> = {
  'Week 1 – Jan 6': [
    { id: 1, title: 'Opening Term Assembly Speech', type: 'Speech', icon: '🎤', premium: false, pdf: true, desc: 'Powerful opening address welcoming students back for Term 1, CBC-aligned.' },
    { id: 2, title: 'Parent Newsletter – Term 1 Kickoff', type: 'Newsletter', icon: '📮', premium: false, pdf: true, desc: 'Professional bilingual newsletter covering term calendar and fees schedule.' },
    { id: 3, title: 'Student Motivation Bulletin', type: 'Newsletter', icon: '📰', premium: false, pdf: true, desc: 'Engaging student bulletin on goal-setting and the new term ahead.' },
  ],
  'Week 2 – Jan 13': [
    { id: 4, title: 'Financial Planning for Teachers 2025', type: 'Course', icon: '💰', premium: true, pdf: false, progress: 0, modules: 8, desc: '10-module course on SACCO wealth, NSSF Tier II, and real estate on a teacher\'s salary.' },
    { id: 5, title: 'Monday Motivation Speech – Resilience', type: 'Speech', icon: '🌅', premium: false, pdf: true, desc: 'Short punchy Monday assembly script on resilience for secondary students.' },
    { id: 6, title: 'Student Council Leadership Guide', type: 'Template', icon: '📋', premium: true, pdf: true, desc: 'Full training manual for student council members — roles, procedures, meeting scripts.' },
  ],
  'Week 3 – Jan 20': [
    { id: 7, title: 'Public Speaking Masterclass', type: 'Course', icon: '🎓', premium: true, pdf: false, progress: 35, modules: 6, desc: 'Build confidence and command in front of any audience.' },
    { id: 8, title: 'CBC Parent Explainer Newsletter', type: 'Newsletter', icon: '📮', premium: false, pdf: true, desc: 'Clear, jargon-free CBC explainer newsletter for parents.' },
    { id: 9, title: 'Anti-Bullying Assembly Script', type: 'Speech', icon: '🤝', premium: false, pdf: true, desc: 'Impactful assembly script addressing school bullying with student participation.' },
    { id: 10, title: 'Budget Template – Teachers Edition', type: 'Template', icon: '📊', premium: false, pdf: true, desc: 'Monthly budgeting spreadsheet template personalised for TSC salary earners.' },
  ],
  'Week 4 – Jan 27': [
    { id: 11, title: 'Work Productivity & Culture Talk', type: 'Course', icon: '⚡', premium: true, pdf: false, progress: 72, modules: 5, desc: 'Transform your school\'s staff culture with practical productivity systems.' },
    { id: 12, title: 'Mid-Month Staff Newsletter', type: 'Newsletter', icon: '📰', premium: false, pdf: true, desc: 'Internal staff newsletter covering school achievements and upcoming events.' },
    { id: 13, title: 'Retirement Planning for Educators', type: 'Course', icon: '🏖️', premium: true, pdf: false, progress: 0, modules: 7, desc: 'Comprehensive retirement planning guide for teachers — pension, investments and legacy.' },
  ],
  'Week 5 – Feb 3': [
    { id: 14, title: 'National Day Celebration Speech', type: 'Speech', icon: '🇰🇪', premium: false, pdf: true, desc: 'Patriotic address honouring Kenya\'s heritage for school national day events.' },
    { id: 15, title: 'Leadership Training – Student Council', type: 'Course', icon: '🌟', premium: true, pdf: false, progress: 10, modules: 9, desc: 'Full leadership programme for student council — vision, decision-making, public speaking.' },
    { id: 16, title: 'Parent-Teacher Meeting Script Kit', type: 'Template', icon: '🗣️', premium: true, pdf: true, desc: 'Complete script and agenda templates for parent-teacher conference meetings.' },
  ],
};

export const WEEKS = Object.keys(WEEKLY_CONTENT);

export interface ContentItem {
  id: number;
  title: string;
  type: 'Speech' | 'Newsletter' | 'Course' | 'Template' | 'Guide';
  icon: string;
  premium: boolean;
  pdf: boolean;
  desc: string;
  progress?: number;
  modules?: number;
}

export const COURSES: Course[] = [
  { id: 'c1', title: 'Public Speaking Masterclass', progress: 35, modules: 6, done: 2, icon: '🎤', color: C.teal, nextLesson: 'Module 3: Vocal Projection' },
  { id: 'c2', title: 'Work Productivity & Culture', progress: 72, modules: 5, done: 4, icon: '⚡', color: C.mustard, nextLesson: 'Module 5: Building Team Culture' },
  { id: 'c3', title: 'Student Council Leadership', progress: 10, modules: 9, done: 1, icon: '🌟', color: C.turquoise, nextLesson: 'Module 2: Running Effective Meetings' },
  { id: 'c4', title: 'Financial Planning 2025', progress: 0, modules: 8, done: 0, icon: '💰', color: C.success, nextLesson: 'Module 1: Assessing Your Financial Health' },
];

export interface Course {
  id: string;
  title: string;
  icon: string;
  modules: number;
  done: number;
  progress: number;
  nextLesson: string;
  color: string;
}

export const REFERRAL_LEADERBOARD: LeaderboardUser[] = [
  { name: 'Mary Wanjiku', county: 'Nairobi', refs: 14, points: 1400 },
  { name: 'Peter Ochieng', county: 'Kisumu', refs: 11, points: 1100 },
  { name: 'Jane Njoroge (You)', county: 'Kiambu', refs: 7, points: 700, isMe: true },
  { name: 'Samuel Kamau', county: 'Meru', refs: 5, points: 500 },
  { name: 'Grace Achieng', county: 'Mombasa', refs: 4, points: 400 },
];

export interface LeaderboardUser {
  name: string;
  county: string;
  refs: number;
  points: number;
  isMe?: boolean;
}

export const NOTIFICATIONS_INIT: Notification[] = [
  { id: 1, title: 'New upload this week!', body: '"National Day Speech" just dropped — download now', time: '2 min ago', read: false, icon: '🆕', color: C.mustard },
  { id: 2, title: 'Course reminder', body: 'Continue Public Speaking Masterclass — you\'re 35% through!', time: '1 hr ago', read: false, icon: '📚', color: C.teal },
  { id: 3, title: 'You earned 100 points!', body: 'Peter Ochieng joined using your promo code JANE-MTX7', time: '3 hrs ago', read: true, icon: '🎉', color: C.success },
  { id: 4, title: 'Commission earned', body: 'Your article earned KES 340 this month', time: 'Yesterday', read: true, icon: '💰', color: C.mustard },
];

export interface Notification {
  id: number;
  title: string;
  body: string;
  time: string;
  read: boolean;
  icon: string;
  color: string;
}

export const TYPE_COLORS: Record<string, string> = {
  Speech: C.teal,
  Newsletter: C.mustard,
  Course: C.turquoise,
  Template: C.success,
  Guide: '#A855F7',
};

export type NavItem = 'home' | 'calendar' | 'courses' | 'referral' | 'author' | 'pricing' | 'notifications';

export const NAV_ITEMS: { id: NavItem; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '⊞' },
  { id: 'calendar', label: 'Weekly Calendar', icon: '📅' },
  { id: 'courses', label: 'My Courses', icon: '🎓' },
  { id: 'referral', label: 'Refer & Earn', icon: '🎁' },
  { id: 'author', label: 'Author Content', icon: '✍️' },
  { id: 'pricing', label: 'Plans', icon: '💳' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
];