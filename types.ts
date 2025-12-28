export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  website?: string;
  linkedin?: string;
  title: string;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  duration: string;
  description: string[]; // Array of bullet points
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  year: string;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
}

export enum AppView {
  RESUME = 'RESUME'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type TemplateId = 'modern' | 'compact' | 'classic';

export type ThemeColor = 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'slate';