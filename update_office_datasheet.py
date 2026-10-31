import re

with open('components/OfficeDatasheet.tsx', 'r') as f:
    content = f.read()

content = content.replace('StudioDatasheet', 'OfficeDatasheet')

new_apps = """const APPS_DATABASE: AppRecord[] = [
  {
    id: 'social_generator',
    number: 1,
    title: 'Social Media Suite',
    description: 'Generate viral posts for LinkedIn, X, and Instagram.',
    author: 'sax/kooLabs',
    creationDate: '2025-10-12',
    category: 'Marketing',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Topic', 'Platform'],
    outputs: ['Social Media Posts'],
    detailedScope: 'Generates platform-specific social media posts tailored to your audience.'
  },
  {
    id: 'quiz_creator',
    number: 2,
    title: 'Quiz & Assessment Builder',
    description: 'Transform boring documents into interactive, gamified quizzes instantly.',
    author: 'sax/kooLabs',
    creationDate: '2025-10-15',
    category: 'Content',
    techStack: ['Gemini 2.5 Flash', 'React', 'Tailwind'],
    inputs: ['Document', 'Quiz Type'],
    outputs: ['Interactive Quiz'],
    detailedScope: 'Creates interactive quizzes from any document to test knowledge retention.'
  },
  {
    id: 'exec_briefing',
    number: 3,
    title: 'Executive Briefing Generator',
    description: 'Condense 50-page reports into crisp, 1-page executive summaries.',
    author: 'sax/kooLabs',
    creationDate: '2025-10-20',
    category: 'Research',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Long Report'],
    outputs: ['1-Page Summary'],
    detailedScope: 'Distills complex documents into concise executive briefings for rapid consumption.'
  },
  {
    id: 'brainstormer',
    number: 4,
    title: 'Concept Brainstormer',
    description: 'Overcome writer\\'s block with AI-driven lateral thinking and idea generation.',
    author: 'sax/kooLabs',
    creationDate: '2025-10-22',
    category: 'Content',
    techStack: ['Gemini 2.5 Flash', 'React', 'Tailwind'],
    inputs: ['Topic or Problem'],
    outputs: ['Idea List'],
    detailedScope: 'Generates creative and lateral ideas to kickstart your next project.'
  },
  {
    id: 'email_drafter',
    number: 5,
    title: 'Smart Email Drafter',
    description: 'Write professional, persuasive emails for any scenario in seconds.',
    author: 'sax/kooLabs',
    creationDate: '2025-10-25',
    category: 'Marketing',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Recipient', 'Purpose'],
    outputs: ['Email Draft'],
    detailedScope: 'Drafts professional emails for sales, networking, or internal communication.'
  },
  {
    id: 'marketing_copy',
    number: 6,
    title: 'Marketing Copywriter',
    description: 'Generate high-converting ad copy, landing page headlines, and product descriptions.',
    author: 'sax/kooLabs',
    creationDate: '2025-10-28',
    category: 'Marketing',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Product Info', 'Target Audience'],
    outputs: ['Marketing Copy'],
    detailedScope: 'Writes persuasive copy optimized for conversions across various marketing channels.'
  },
  {
    id: 'swot_analysis',
    number: 7,
    title: 'SWOT Analysis Builder',
    description: 'Analyze strengths, weaknesses, opportunities, and threats for any business strategy.',
    author: 'sax/kooLabs',
    creationDate: '2025-11-01',
    category: 'Research',
    techStack: ['Gemini 2.5 Flash', 'React', 'Tailwind'],
    inputs: ['Business Context'],
    outputs: ['SWOT Matrix'],
    detailedScope: 'Creates a structured SWOT analysis to evaluate business strategies or projects.'
  },
  {
    id: 'code_explainer',
    number: 8,
    title: 'Code Explainer',
    description: 'Paste complex code snippets and get plain-English explanations of how they work.',
    author: 'sax/kooLabs',
    creationDate: '2025-11-05',
    category: 'Web',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Code Snippet'],
    outputs: ['Explanation'],
    detailedScope: 'Breaks down complex code into easy-to-understand explanations.'
  },
  {
    id: 'ebook_generator',
    number: 9,
    title: 'E-Book Outliner & Drafter',
    description: 'Structure and draft comprehensive e-books or whitepapers from a single prompt.',
    author: 'sax/kooLabs',
    creationDate: '2025-11-10',
    category: 'Content',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Topic', 'Target Audience'],
    outputs: ['E-Book Outline'],
    detailedScope: 'Generates a structured outline and drafts content for long-form e-books or whitepapers.'
  },
  {
    id: 'spreadsheet_creator',
    number: 10,
    title: 'Smart Spreadsheet Creator',
    description: 'Generate complex Excel/Sheets formulas and VBA macros from natural language.',
    author: 'sax/kooLabs',
    creationDate: '2025-11-15',
    category: 'Content',
    techStack: ['Gemini 2.5 Flash', 'React', 'Tailwind'],
    inputs: ['Data Requirements'],
    outputs: ['Spreadsheet Formulas'],
    detailedScope: 'Translates natural language into complex spreadsheet formulas and macros.'
  },
  {
    id: 'website_builder',
    number: 11,
    title: 'Website Builder',
    description: 'Generate complete, interactive website landing pages with modern design components.',
    author: 'sax/kooLabs',
    creationDate: '2025-11-20',
    category: 'Web',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Website Idea'],
    outputs: ['Website Code'],
    detailedScope: 'Creates fully functional, responsive website landing pages with modern design patterns.'
  },
  {
    id: 'product_research_tool',
    number: 12,
    title: 'Product Research Tool',
    description: 'Discover profitable digital product niches before competitors with trend analysis.',
    author: 'sax/kooLabs',
    creationDate: '2025-11-25',
    category: 'Research',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Niche or Market'],
    outputs: ['Product Research Report'],
    detailedScope: 'Analyzes market trends and identifies profitable digital product opportunities.'
  }
];"""

content = re.sub(r'const APPS_DATABASE: AppRecord\[\] = \[.*?\];', new_apps, content, flags=re.DOTALL)

with open('components/OfficeDatasheet.tsx', 'w') as f:
    f.write(content)
