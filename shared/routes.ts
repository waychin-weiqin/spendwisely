import { z } from "zod";
import { insertUserSchema, insertExpenseSchema, insertIncomeSchema, insertGoalSchema, insertBudgetSchema, userPublicSchema, expenses, goals, incomes, budgets } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: "POST" as const,
      path: "/api/register",
      input: insertUserSchema,
      responses: {
        201: userPublicSchema,
        400: errorSchemas.validation,
      },
    },
    login: {
      method: "POST" as const,
      path: "/api/login",
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: userPublicSchema,
        401: z.object({ message: z.string() }),
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/logout",
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/user",
      responses: {
        200: userPublicSchema,
        401: z.void(),
      },
    },
    forgotPassword: {
      method: "POST" as const,
      path: "/api/password/forgot",
      input: z.object({
        email: z.string().email(),
      }),
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    resetPassword: {
      method: "POST" as const,
      path: "/api/password/reset",
      input: z.object({
        token: z.string(),
        password: z.string().min(6),
      }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
  userSettings: {
    get: {
      method: "GET" as const,
      path: "/api/user/settings",
      responses: {
        200: z.object({
          email: z.string().email(),
          summaryEnabled: z.boolean(),
          budgetEnabled: z.boolean(),
        }),
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/user/settings",
      input: z.object({
        summaryEnabled: z.boolean().optional(),
        budgetEnabled: z.boolean().optional(),
      }),
      responses: {
        200: z.object({
          email: z.string().email(),
          summaryEnabled: z.boolean(),
          budgetEnabled: z.boolean(),
        }),
      },
    },
  },
  expenses: {
    list: {
      method: "GET" as const,
      path: "/api/expenses",
      responses: {
        200: z.array(z.custom<typeof expenses.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/expenses",
      input: insertExpenseSchema,
      responses: {
        201: z.custom<typeof expenses.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/expenses/:id",
      input: insertExpenseSchema,
      responses: {
        200: z.custom<typeof expenses.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/expenses/:id",
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    // For export functionality, frontend can use the list endpoint and process data, 
    // or we can add a specific export endpoint if server-side generation is preferred.
    // For now, client-side export from list data is efficient for typical personal usage.
  },
  incomes: {
    list: {
      method: "GET" as const,
      path: "/api/incomes",
      responses: {
        200: z.array(z.custom<typeof incomes.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/incomes",
      input: insertIncomeSchema,
      responses: {
        201: z.custom<typeof incomes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/incomes/:id",
      input: insertIncomeSchema,
      responses: {
        200: z.custom<typeof incomes.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/incomes/:id",
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  goals: {
    get: {
      method: "GET" as const,
      path: "/api/goals",
      responses: {
        200: z.custom<typeof goals.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/goals",
      input: insertGoalSchema,
      responses: {
        201: z.custom<typeof goals.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/goals",
      input: insertGoalSchema,
      responses: {
        200: z.custom<typeof goals.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  budgets: {
    list: {
      method: "GET" as const,
      path: "/api/budgets",
      responses: {
        200: z.array(z.custom<typeof budgets.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/budgets",
      input: insertBudgetSchema,
      responses: {
        201: z.custom<typeof budgets.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/budgets/:id",
      input: insertBudgetSchema,
      responses: {
        200: z.custom<typeof budgets.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/budgets/:id",
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
