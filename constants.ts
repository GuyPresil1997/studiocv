import { ResumeData } from './types';

export const INITIAL_RESUME: ResumeData = {
  personalInfo: {
    fullName: "Alex Rivera",
    title: "Senior Product Designer",
    email: "alex.rivera@example.com",
    phone: "(555) 123-4567",
    location: "San Francisco, CA",
    website: "alexrivera.design",
    linkedin: "linkedin.com/in/arivera"
  },
  summary: "Creative and detail-oriented Product Designer with over 6 years of experience in building user-centric digital products. Proven track record of improving user engagement and streamlining complex workflows. Passionate about accessibility and design systems.",
  experience: [
    {
      id: '1',
      company: "TechFlow Solutions",
      role: "Lead UI/UX Designer",
      duration: "2021 - Present",
      description: [
        "Spearheaded the redesign of the core SaaS platform, resulting in a 25% increase in user retention.",
        "Managed a team of 4 designers and established a comprehensive design system used across 3 products.",
        "Collaborated closely with engineering to ensure pixel-perfect implementation of designs."
      ]
    },
    {
      id: '2',
      company: "Creative Pulse Agency",
      role: "UI Designer",
      duration: "2018 - 2021",
      description: [
        "Designed responsive websites and mobile apps for diverse clients in fintech and healthcare.",
        "Conducted user research and usability testing to validate design concepts.",
        " facilitated design sprints and workshops with stakeholders."
      ]
    }
  ],
  education: [
    {
      id: '1',
      school: "Rhode Island School of Design",
      degree: "BFA in Interaction Design",
      year: "2018"
    }
  ],
  skills: [
    "Figma", "Adobe Creative Suite", "Prototyping", "HTML/CSS", "User Research", "Agile Methodology", "Design Systems"
  ]
};

export const SAMPLE_RESUME_TEXT = `
John Doe
Software Engineer
john.doe@email.com
(123) 456-7890
New York, NY

Summary:
Experienced software engineer with a focus on frontend technologies.

Experience:
Frontend Developer at Tech Corp (2020-Present)
- Built main dashboard using React
- Improved performance by 50%

Junior Dev at Startup Inc (2018-2020)
- Fixed bugs and added features
- Worked with senior devs

Education:
BS Computer Science, State University (2018)

Skills:
React, TypeScript, Node.js
`;