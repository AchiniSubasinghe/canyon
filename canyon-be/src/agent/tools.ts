import type { OpenAiToolDefinition } from "./types.js";

const paginationProps = {
  limit: {
    type: "integer",
    minimum: 1,
    maximum: 50,
    description: "Max items to return (default 20, max 50)",
  },
  offset: {
    type: "integer",
    minimum: 0,
    description: "Pagination offset (default 0)",
  },
};

function tool(
  name: string,
  description: string,
  parameters: Record<string, unknown>
): OpenAiToolDefinition {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: {
        type: "object",
        ...parameters,
        additionalProperties: false,
      },
    },
  };
}

export const AGENT_TOOLS: OpenAiToolDefinition[] = [
  tool("get_my_profile", "Return the current authenticated user's id, name, email, and roles.", {
    properties: {},
  }),

  tool("list_projects", "List projects visible to the current user.", {
    properties: {
      ...paginationProps,
      status: {
        type: "string",
        enum: ["planning", "active", "on_hold", "completed"],
      },
      search: { type: "string", description: "Filter by project name" },
    },
  }),

  tool("get_project", "Get a project with members and task stats.", {
    properties: {
      projectId: { type: "integer", description: "Project id" },
    },
    required: ["projectId"],
  }),

  tool("create_project", "Create a project. Caller becomes manager. Admin or project_manager only.", {
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      status: {
        type: "string",
        enum: ["planning", "active", "on_hold", "completed"],
      },
    },
    required: ["name"],
  }),

  tool("update_project", "Update project name, description, or status. Requires manage permission.", {
    properties: {
      projectId: { type: "integer" },
      name: { type: "string" },
      description: { type: "string" },
      status: {
        type: "string",
        enum: ["planning", "active", "on_hold", "completed"],
      },
    },
    required: ["projectId"],
  }),

  tool("delete_project", "Hard-delete a project. Administrator only. Confirm with user first.", {
    properties: {
      projectId: { type: "integer" },
    },
    required: ["projectId"],
  }),

  tool("list_project_members", "List members of a project.", {
    properties: {
      projectId: { type: "integer" },
    },
    required: ["projectId"],
  }),

  tool(
    "list_candidate_members",
    "List active users who are not yet members of the project (for adding members).",
    {
      properties: {
        projectId: { type: "integer" },
      },
      required: ["projectId"],
    }
  ),

  tool(
    "list_assignable_users",
    "List active project members who can be assigned to tasks.",
    {
      properties: {
        projectId: { type: "integer" },
      },
      required: ["projectId"],
    }
  ),

  tool("add_project_member", "Add a user to a project. Requires manage permission.", {
    properties: {
      projectId: { type: "integer" },
      userId: { type: "integer" },
      memberRole: { type: "string", enum: ["manager", "member"] },
    },
    required: ["projectId", "userId"],
  }),

  tool("update_project_member", "Change a member's role on a project.", {
    properties: {
      projectId: { type: "integer" },
      userId: { type: "integer" },
      memberRole: { type: "string", enum: ["manager", "member"] },
    },
    required: ["projectId", "userId", "memberRole"],
  }),

  tool("remove_project_member", "Remove a user from a project.", {
    properties: {
      projectId: { type: "integer" },
      userId: { type: "integer" },
    },
    required: ["projectId", "userId"],
  }),

  tool("list_tasks", "List tasks visible to the current user (role-scoped).", {
    properties: {
      ...paginationProps,
      status: {
        type: "string",
        enum: ["todo", "in_progress", "review", "done"],
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high", "urgent"],
      },
      projectId: { type: "integer" },
    },
  }),

  tool("list_project_tasks", "List tasks in a project (team members only see their assigned tasks).", {
    properties: {
      projectId: { type: "integer" },
      ...paginationProps,
      status: {
        type: "string",
        enum: ["todo", "in_progress", "review", "done"],
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high", "urgent"],
      },
    },
    required: ["projectId"],
  }),

  tool("get_task", "Get a single task by id.", {
    properties: {
      taskId: { type: "integer" },
    },
    required: ["taskId"],
  }),

  tool("create_task", "Create a task in a project. Requires project manage (admin/PM).", {
    properties: {
      projectId: { type: "integer" },
      title: { type: "string" },
      description: { type: "string" },
      status: {
        type: "string",
        enum: ["todo", "in_progress", "review", "done"],
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high", "urgent"],
      },
      assignedTo: { type: ["integer", "null"], description: "User id of assignee or null" },
      dueDate: { type: ["string", "null"], description: "ISO date string or null" },
    },
    required: ["projectId", "title"],
  }),

  tool("update_task", "Update task fields. Requires edit permission (manage or assignee).", {
    properties: {
      taskId: { type: "integer" },
      title: { type: "string" },
      description: { type: ["string", "null"] },
      status: {
        type: "string",
        enum: ["todo", "in_progress", "review", "done"],
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high", "urgent"],
      },
      assignedTo: { type: ["integer", "null"] },
      dueDate: { type: ["string", "null"] },
    },
    required: ["taskId"],
  }),

  tool("update_task_status", "Update only the status of a task.", {
    properties: {
      taskId: { type: "integer" },
      status: {
        type: "string",
        enum: ["todo", "in_progress", "review", "done"],
      },
    },
    required: ["taskId", "status"],
  }),

  tool("delete_task", "Delete a task. Requires project manage. Confirm with user first.", {
    properties: {
      taskId: { type: "integer" },
    },
    required: ["taskId"],
  }),

  tool("list_users", "List users. Administrator only.", {
    properties: {
      ...paginationProps,
      search: { type: "string" },
      isActive: { type: "boolean" },
    },
  }),

  tool("get_user", "Get a user by id. Administrator only.", {
    properties: {
      userId: { type: "integer" },
    },
    required: ["userId"],
  }),

  tool("create_user", "Create a user with roles. Administrator only.", {
    properties: {
      email: { type: "string" },
      password: { type: "string", minLength: 8 },
      name: { type: "string" },
      roles: {
        type: "array",
        items: {
          type: "string",
          enum: ["administrator", "project_manager", "team_member"],
        },
        minItems: 1,
      },
    },
    required: ["email", "password", "name", "roles"],
  }),

  tool("update_user", "Update a user. Administrator only.", {
    properties: {
      userId: { type: "integer" },
      email: { type: "string" },
      password: { type: "string", minLength: 8 },
      name: { type: "string" },
      isActive: { type: "boolean" },
      roles: {
        type: "array",
        items: {
          type: "string",
          enum: ["administrator", "project_manager", "team_member"],
        },
        minItems: 1,
      },
    },
    required: ["userId"],
  }),

  tool(
    "deactivate_user",
    "Soft-deactivate a user (isActive=false). Administrator only. Cannot deactivate self. Confirm first.",
    {
      properties: {
        userId: { type: "integer" },
      },
      required: ["userId"],
    }
  ),
];
