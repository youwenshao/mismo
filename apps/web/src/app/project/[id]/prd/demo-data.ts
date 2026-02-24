export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  resolved: boolean;
}

export interface Feature {
  name: string;
  description: string;
  priority: "must-have" | "should-have" | "nice-to-have";
}

export interface UserStory {
  title: string;
  given: string;
  when: string;
  then: string;
}

export interface PRDSection {
  id: string;
  title: string;
  type:
    | "overview"
    | "target-users"
    | "features"
    | "user-stories"
    | "data-model"
    | "api"
    | "architecture";
}

export interface PRDData {
  projectName: string;
  version: string;
  lastUpdated: string;
  ambiguityScore: number;
  sections: PRDSection[];
  overview: {
    description: string;
    problemStatement: string;
  };
  targetUsers: {
    personas: { name: string; description: string }[];
  };
  features: Feature[];
  userStories: UserStory[];
  dataModel: string;
  apiSpec: Record<string, unknown> | null;
  architecture: {
    template: string;
    description: string;
  };
  comments: Record<string, Comment[]>;
}

export const DEMO_PRD: PRDData = {
  projectName: "TaskFlow",
  version: "1.2",
  lastUpdated: "2026-02-22",
  ambiguityScore: 12,
  sections: [
    { id: "overview", title: "Overview", type: "overview" },
    { id: "target-users", title: "Target Users", type: "target-users" },
    { id: "features", title: "Features", type: "features" },
    { id: "user-stories", title: "User Stories", type: "user-stories" },
    { id: "data-model", title: "Data Model", type: "data-model" },
    { id: "api", title: "API Specification", type: "api" },
    { id: "architecture", title: "Architecture", type: "architecture" },
  ],
  overview: {
    description:
      "TaskFlow is a modern task management SaaS platform designed for small-to-medium engineering teams. It provides an intuitive Kanban-style interface with real-time collaboration, automated workflow triggers, and deep integrations with developer tools like GitHub, Linear, and Slack.",
    problemStatement:
      "Engineering teams waste an average of 5 hours per week switching between fragmented tools for task tracking, status updates, and sprint planning. Existing solutions are either too complex (Jira) or too simple (Trello) for teams of 5–30 engineers who need structured workflows without enterprise overhead.",
  },
  targetUsers: {
    personas: [
      {
        name: "Engineering Manager",
        description:
          "Manages a team of 5–15 engineers. Needs sprint planning views, velocity tracking, and one-click status reports for leadership. Values simplicity over feature density.",
      },
      {
        name: "Individual Contributor (IC)",
        description:
          "Senior or mid-level engineer who wants a fast, keyboard-driven interface. Cares about GitHub PR linking, time tracking, and minimal context switching.",
      },
      {
        name: "Product Manager",
        description:
          "Creates and prioritizes the backlog. Needs roadmap visualization, dependency mapping, and stakeholder sharing. Often non-technical.",
      },
    ],
  },
  features: [
    {
      name: "Kanban Board with Swimlanes",
      description:
        "Drag-and-drop board with customizable columns and horizontal swimlanes for grouping by assignee, epic, or priority.",
      priority: "must-have",
    },
    {
      name: "Real-time Collaboration",
      description:
        "Live cursors and presence indicators. Changes sync instantly across all connected clients via WebSockets.",
      priority: "must-have",
    },
    {
      name: "GitHub Integration",
      description:
        "Auto-link PRs to tasks, update task status on merge, and surface CI status directly on task cards.",
      priority: "must-have",
    },
    {
      name: "Sprint Planning View",
      description:
        "Dedicated sprint planning interface with capacity estimation, story point budgets, and drag-to-assign from backlog.",
      priority: "should-have",
    },
    {
      name: "Time Tracking",
      description:
        "Built-in timer per task with manual entry fallback. Weekly timesheet export in CSV format. TBD: integration with payroll systems.",
      priority: "should-have",
    },
    {
      name: "Custom Workflow Automations",
      description:
        'If-this-then-that style rules: e.g., "When PR merged → move task to Done → notify channel."',
      priority: "should-have",
    },
    {
      name: "Roadmap Gantt Chart",
      description:
        "Interactive Gantt chart for PMs to visualize epics over time with dependency arrows. TBD: exact rendering library.",
      priority: "nice-to-have",
    },
    {
      name: "AI Task Decomposition",
      description:
        "Paste a feature description and get AI-suggested subtasks with effort estimates.",
      priority: "nice-to-have",
    },
  ],
  userStories: [
    {
      title: "Engineer views assigned tasks",
      given: "an authenticated engineer on the dashboard",
      when: 'they click "My Tasks"',
      then: "they see a filtered Kanban board showing only tasks assigned to them, sorted by priority",
    },
    {
      title: "Manager creates a sprint",
      given: "an engineering manager on the Sprint Planning page",
      when: "they set a sprint name, date range, and drag tasks from the backlog",
      then: "a new sprint is created and team members are notified via Slack",
    },
    {
      title: "PR auto-updates task status",
      given: "a task linked to a GitHub PR",
      when: "the PR is merged to main",
      then: 'the task status automatically moves to "In Review" and the assignee is notified',
    },
  ],
  dataModel: `erDiagram
    User {
        uuid id PK
        string email
        string name
        string role
        timestamp created_at
    }
    Workspace {
        uuid id PK
        string name
        string slug
        uuid owner_id FK
    }
    Project {
        uuid id PK
        string name
        uuid workspace_id FK
        string status
    }
    Task {
        uuid id PK
        string title
        text description
        string status
        string priority
        int story_points
        uuid project_id FK
        uuid assignee_id FK
        uuid sprint_id FK
    }
    Sprint {
        uuid id PK
        string name
        date start_date
        date end_date
        uuid project_id FK
    }
    User ||--o{ Workspace : owns
    Workspace ||--o{ Project : contains
    Project ||--o{ Task : has
    Project ||--o{ Sprint : plans
    Sprint ||--o{ Task : includes
    User ||--o{ Task : assigned`,
  apiSpec: {
    "POST /api/tasks": {
      description: "Create a new task",
      body: {
        title: "string (required)",
        description: "string",
        priority: "low | medium | high | critical",
        assignee_id: "uuid",
        project_id: "uuid (required)",
      },
      response: {
        id: "uuid",
        title: "string",
        status: "backlog",
        created_at: "ISO 8601",
      },
    },
    "GET /api/tasks/:id": {
      description: "Retrieve a task by ID",
      response: {
        id: "uuid",
        title: "string",
        description: "string",
        status: "string",
        assignee: "{ id, name, email }",
        comments: "Comment[]",
      },
    },
    "PATCH /api/tasks/:id/status": {
      description: "Update task status",
      body: { status: "backlog | todo | in_progress | in_review | done" },
      response: { id: "uuid", status: "string", updated_at: "ISO 8601" },
    },
  },
  architecture: {
    template: "Next.js Full-Stack + Supabase",
    description:
      "Server-rendered Next.js 16 application using App Router with React Server Components. Supabase provides PostgreSQL database, real-time subscriptions via WebSocket channels, row-level security, and built-in auth. Deployed on Vercel with edge functions for low-latency API routes.",
  },
  comments: {
    overview: [
      {
        id: "c1",
        author: "Sarah Chen",
        content:
          "The problem statement is strong. Could we add a data point about how many teams actually use 3+ tools?",
        timestamp: "2026-02-21T14:30:00Z",
        resolved: false,
      },
    ],
    features: [
      {
        id: "c2",
        author: "Mo (AI)",
        content:
          'The "Time Tracking" feature mentions TBD for payroll integration. This should be clarified before development begins.',
        timestamp: "2026-02-22T09:15:00Z",
        resolved: false,
      },
      {
        id: "c3",
        author: "James Park",
        content:
          "GitHub integration should also support GitLab as a stretch goal.",
        timestamp: "2026-02-20T16:45:00Z",
        resolved: true,
      },
    ],
  },
};
