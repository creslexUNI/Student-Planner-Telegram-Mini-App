// server/index.ts
import path from "path";
import express2 from "express";

// server/app.ts
import express from "express";
import cookieParser from "cookie-parser";

// server/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
var prisma = global.__prisma || new PrismaClient({
  // Disable automatic error dumping to avoid flooding logs when database is not yet ready or unreachable
  log: []
});
if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
async function checkDatabaseHealth() {
  if (!process.env.DATABASE_URL) {
    return {
      connected: false,
      message: "DATABASE_URL environment variable is not configured"
    };
  }
  const now = Date.now();
  if (global.__dbHealthCache && now - global.__dbHealthCache.timestamp < 15e3) {
    return {
      connected: global.__dbHealthCache.connected,
      message: global.__dbHealthCache.message
    };
  }
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 3e3))
    ]);
    const result = { connected: true, message: "Database connection active" };
    global.__dbHealthCache = { ...result, timestamp: now };
    return result;
  } catch (err) {
    const errorMsg = err.message?.includes("password authentication failed") ? "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438 PostgreSQL (\u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C \u0432 DATABASE_URL)" : err.message?.includes("Can't reach database server") ? "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F \u043A \u0441\u0435\u0440\u0432\u0435\u0440\u0443 PostgreSQL (\u0441\u0435\u0440\u0432\u0435\u0440 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0438\u043B\u0438 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D \u043F\u043E\u0440\u0442)" : `\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F: ${err.message || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430"}`;
    const result = { connected: false, message: errorMsg };
    global.__dbHealthCache = { ...result, timestamp: now };
    return result;
  }
}
async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
  } catch {
  }
}

// server/middleware/auth.ts
async function authMiddleware(req, res, next) {
  const token = req.cookies?.session_token || req.headers.authorization?.replace(/^Bearer\s+/, "");
  if (!token) {
    req.user = void 0;
    next();
    return;
  }
  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            memberships: {
              select: {
                groupId: true,
                role: true
              }
            }
          }
        }
      }
    });
    if (!session) {
      req.user = void 0;
      next();
      return;
    }
    if (/* @__PURE__ */ new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {
      });
      res.clearCookie("session_token");
      req.user = void 0;
      next();
      return;
    }
    req.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      memberships: session.user.memberships
    };
    req.sessionId = session.id;
    next();
  } catch (error) {
    req.user = void 0;
    next();
  }
}
function requireAuth(req, res, next) {
  if (!req.user) {
    res.status(401).json({
      error: "Unauthorized",
      message: "\u0414\u043B\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u044D\u0442\u043E\u043C\u0443 \u0440\u0430\u0437\u0434\u0435\u043B\u0443 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E \u0432\u043E\u0439\u0442\u0438 \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0443"
    });
    return;
  }
  next();
}

// server/middleware/errorHandler.ts
import { ZodError } from "zod";
var AppError = class _AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, _AppError.prototype);
  }
};
function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((e) => ({
      field: e.path?.join(".") || "",
      message: e.message
    }));
    res.status(400).json({
      error: "ValidationError",
      message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0438 \u0432\u0445\u043E\u0434\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445",
      details: formattedErrors
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: "ClientError",
      message: err.message
    });
    return;
  }
  if (err.name === "PrismaClientInitializationError" || typeof err.code === "string" && err.code.startsWith("P1")) {
    res.status(503).json({
      error: "DatabaseUnavailable",
      message: "\u0411\u0430\u0437\u0430 \u0434\u0430\u043D\u043D\u044B\u0445 PostgreSQL \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0438\u043B\u0438 \u043E\u0436\u0438\u0434\u0430\u0435\u0442 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 DATABASE_URL."
    });
    return;
  }
  if (err.code === "P2002") {
    const target = err.meta?.target?.join(", ") || "\u043F\u043E\u043B\u0435";
    res.status(409).json({
      error: "Conflict",
      message: `\u0417\u0430\u043F\u0438\u0441\u044C \u0441 \u0442\u0430\u043A\u0438\u043C \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435\u043C (${target}) \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442`
    });
    return;
  }
  if (err.code === "P2025") {
    res.status(404).json({
      error: "NotFound",
      message: "\u0417\u0430\u043F\u0440\u043E\u0448\u0435\u043D\u043D\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0432 \u0431\u0430\u0437\u0435 \u0434\u0430\u043D\u043D\u044B\u0445"
    });
    return;
  }
  console.error("Application error:", err?.message || err);
  res.status(500).json({
    error: "InternalServerError",
    message: "\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u044F\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441 \u043F\u043E\u0437\u0436\u0435."
  });
}
function notFoundHandler(req, res) {
  res.status(404).json({
    error: "NotFound",
    message: `API \u043C\u0430\u0440\u0448\u0440\u0443\u0442 ${req.method} ${req.originalUrl} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`
  });
}

// server/routes/health.ts
import { Router } from "express";
var healthRouter = Router();
healthRouter.get("/", async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.status(200).json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    database: {
      connected: dbHealth.connected,
      message: dbHealth.message
    }
  });
});

// server/routes/auth.ts
import { Router as Router2 } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
var authRouter = Router2();
var registerSchema = z.object({
  name: z.string().min(2, "\u0418\u043C\u044F \u0434\u043E\u043B\u0436\u043D\u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043C\u0438\u043D\u0438\u043C\u0443\u043C 2 \u0441\u0438\u043C\u0432\u043E\u043B\u0430").max(50),
  email: z.string().email("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 email").toLowerCase(),
  password: z.string().min(6, "\u041F\u0430\u0440\u043E\u043B\u044C \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043D\u0435 \u043A\u043E\u0440\u043E\u0447\u0435 6 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432"),
  university: z.string().optional(),
  faculty: z.string().optional(),
  course: z.number().int().min(1).max(6).optional(),
  groupName: z.string().optional(),
  inviteCode: z.string().optional()
});
var loginSchema = z.object({
  email: z.string().email("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 email").toLowerCase(),
  password: z.string().min(1, "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C")
});
var profileUpdateSchema = z.object({
  name: z.string().min(2, "\u0418\u043C\u044F \u0434\u043E\u043B\u0436\u043D\u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043C\u0438\u043D\u0438\u043C\u0443\u043C 2 \u0441\u0438\u043C\u0432\u043E\u043B\u0430").max(50).optional(),
  university: z.string().max(100).optional().nullable(),
  faculty: z.string().max(100).optional().nullable(),
  course: z.number().int().min(1).max(6).optional().nullable(),
  groupName: z.string().max(50).optional().nullable()
});
function setSessionCookie(res, token, expiresAt) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("session_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    expires: expiresAt,
    path: "/"
  });
}
function formatUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    university: user.university || null,
    faculty: user.faculty || null,
    course: user.course || null,
    groupName: user.groupName || null,
    groups: user.memberships?.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      role: m.role,
      inviteCode: m.group.inviteCode
    })) || []
  };
}
authRouter.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });
    if (existingUser) {
      throw new AppError("\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441 \u0442\u0430\u043A\u0438\u043C email \u0443\u0436\u0435 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D", 409);
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        university: data.university,
        faculty: data.faculty,
        course: data.course,
        groupName: data.groupName
      }
    });
    if (data.inviteCode) {
      const group = await prisma.group.findUnique({
        where: { inviteCode: data.inviteCode }
      });
      if (group) {
        await prisma.groupMember.create({
          data: {
            userId: user.id,
            groupId: group.id,
            role: "MEMBER"
          }
        });
      }
    } else if (data.groupName) {
      const generatedCode = crypto.randomBytes(3).toString("hex").toUpperCase();
      const group = await prisma.group.create({
        data: {
          name: data.groupName,
          inviteCode: generatedCode
        }
      });
      await prisma.groupMember.create({
        data: {
          userId: user.id,
          groupId: group.id,
          role: "ADMIN"
        }
      });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3);
    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt
      }
    });
    setSessionCookie(res, token, expiresAt);
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        memberships: {
          include: {
            group: true
          }
        }
      }
    });
    res.status(201).json({
      message: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430",
      user: formatUserResponse(fullUser || user)
    });
  } catch (error) {
    next(error);
  }
});
authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            group: true
          }
        }
      }
    });
    if (!user) {
      throw new AppError("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 email \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C", 401);
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 email \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C", 401);
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3);
    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt
      }
    });
    setSessionCookie(res, token, expiresAt);
    res.status(200).json({
      message: "\u0423\u0441\u043F\u0435\u0448\u043D\u044B\u0439 \u0432\u0445\u043E\u0434 \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0443",
      user: formatUserResponse(user)
    });
  } catch (error) {
    next(error);
  }
});
authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.session_token || req.headers.authorization?.replace(/^Bearer\s+/, "");
    if (token) {
      await prisma.session.deleteMany({
        where: { token }
      }).catch(() => {
      });
    }
    res.clearCookie("session_token", { path: "/" });
    res.status(200).json({ message: "\u0412\u044B \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0432\u044B\u0448\u043B\u0438 \u0438\u0437 \u0441\u0438\u0441\u0442\u0435\u043C\u044B" });
  } catch (error) {
    next(error);
  }
});
authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        memberships: {
          include: {
            group: true
          }
        }
      }
    });
    if (!user) {
      throw new AppError("\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D", 404);
    }
    res.status(200).json({
      user: formatUserResponse(user)
    });
  } catch (error) {
    next(error);
  }
});
authRouter.patch("/profile", requireAuth, async (req, res, next) => {
  try {
    const data = profileUpdateSchema.parse(req.body);
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: data.name,
        university: data.university,
        faculty: data.faculty,
        course: data.course,
        groupName: data.groupName
      },
      include: {
        memberships: {
          include: {
            group: true
          }
        }
      }
    });
    res.status(200).json({
      message: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D",
      user: formatUserResponse(updated)
    });
  } catch (error) {
    next(error);
  }
});

// server/routes/tasks.ts
import { Router as Router3 } from "express";
import { z as z2 } from "zod";
var tasksRouter = Router3();
tasksRouter.use(requireAuth);
var createTaskSchema = z2.object({
  title: z2.string().min(1, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438").max(200),
  description: z2.string().optional(),
  priority: z2.enum(["low", "medium", "high"]).default("medium"),
  category: z2.string().optional(),
  deadline: z2.string().datetime().or(z2.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  homeworkId: z2.string().optional().nullable()
});
var updateTaskSchema = z2.object({
  title: z2.string().min(1).max(200).optional(),
  description: z2.string().optional().nullable(),
  completed: z2.boolean().optional(),
  priority: z2.enum(["low", "medium", "high"]).optional(),
  category: z2.string().optional().nullable(),
  deadline: z2.string().datetime().or(z2.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable()
});
tasksRouter.get("/", async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const where = {
      userId: req.user.id
    };
    if (status === "completed") {
      where.completed = true;
    } else if (status === "active") {
      where.completed = false;
    }
    if (typeof category === "string" && category.trim()) {
      where.category = category.trim();
    }
    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { completed: "asc" },
        { deadline: "asc" },
        { createdAt: "desc" }
      ],
      include: {
        homework: {
          select: {
            id: true,
            subject: true,
            title: true
          }
        }
      }
    });
    res.status(200).json({
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        completed: t.completed,
        priority: t.priority,
        category: t.category,
        deadline: t.deadline ? t.deadline.toISOString().slice(0, 10) : null,
        homework: t.homework,
        createdAt: t.createdAt.toISOString()
      }))
    });
  } catch (error) {
    next(error);
  }
});
tasksRouter.get("/:id", async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        homework: true
      }
    });
    if (!task) {
      throw new AppError("\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430", 404);
    }
    if (task.userId !== req.user.id) {
      throw new AppError("\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u044D\u0442\u043E\u0439 \u0437\u0430\u0434\u0430\u0447\u0435", 403);
    }
    res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
});
tasksRouter.post("/", async (req, res, next) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const deadlineDate = data.deadline ? new Date(data.deadline) : null;
    const task = await prisma.task.create({
      data: {
        userId: req.user.id,
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        deadline: deadlineDate,
        homeworkId: data.homeworkId
      }
    });
    res.status(201).json({
      message: "\u0417\u0430\u0434\u0430\u0447\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043E\u0437\u0434\u0430\u043D\u0430",
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        completed: task.completed,
        priority: task.priority,
        category: task.category,
        deadline: task.deadline ? task.deadline.toISOString().slice(0, 10) : null,
        createdAt: task.createdAt.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});
tasksRouter.patch("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.task.findUnique({
      where: { id: req.params.id }
    });
    if (!existing) {
      throw new AppError("\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430", 404);
    }
    if (existing.userId !== req.user.id) {
      throw new AppError("\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043F\u0440\u0430\u0432 \u0434\u043B\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u044D\u0442\u043E\u0439 \u0437\u0430\u0434\u0430\u0447\u0438", 403);
    }
    const data = updateTaskSchema.parse(req.body);
    const updateData = {};
    if (data.title !== void 0) updateData.title = data.title;
    if (data.description !== void 0) updateData.description = data.description;
    if (data.completed !== void 0) updateData.completed = data.completed;
    if (data.priority !== void 0) updateData.priority = data.priority;
    if (data.category !== void 0) updateData.category = data.category;
    if (data.deadline !== void 0) {
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    }
    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.status(200).json({
      message: "\u0417\u0430\u0434\u0430\u0447\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0430",
      task: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        completed: updated.completed,
        priority: updated.priority,
        category: updated.category,
        deadline: updated.deadline ? updated.deadline.toISOString().slice(0, 10) : null
      }
    });
  } catch (error) {
    next(error);
  }
});
tasksRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.task.findUnique({
      where: { id: req.params.id }
    });
    if (!existing) {
      throw new AppError("\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430", 404);
    }
    if (existing.userId !== req.user.id) {
      throw new AppError("\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043F\u0440\u0430\u0432 \u0434\u043B\u044F \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F \u044D\u0442\u043E\u0439 \u0437\u0430\u0434\u0430\u0447\u0438", 403);
    }
    await prisma.task.delete({
      where: { id: req.params.id }
    });
    res.status(200).json({ message: "\u0417\u0430\u0434\u0430\u0447\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0443\u0434\u0430\u043B\u0435\u043D\u0430" });
  } catch (error) {
    next(error);
  }
});

// server/routes/schedule.ts
import { Router as Router4 } from "express";
import { z as z3 } from "zod";
var scheduleRouter = Router4();
scheduleRouter.use(requireAuth);
var lessonSchema = z3.object({
  groupId: z3.string().optional().nullable(),
  subject: z3.string().min(1, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0440\u0435\u0434\u043C\u0435\u0442").max(100),
  type: z3.enum(["lecture", "practice", "lab"]).default("lecture"),
  teacher: z3.string().min(1, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044F"),
  room: z3.string().min(1, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0430\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u044E"),
  dayOfWeek: z3.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]),
  weekType: z3.enum(["odd", "even", "both"]).default("both"),
  startTime: z3.string().regex(/^\d{2}:\d{2}$/, "\u0412\u0440\u0435\u043C\u044F \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 \u0427\u0427:\u041C\u041C"),
  endTime: z3.string().regex(/^\d{2}:\d{2}$/, "\u0412\u0440\u0435\u043C\u044F \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 \u0427\u0427:\u041C\u041C"),
  specificDate: z3.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z3.string().optional().nullable()
});
var updateLessonSchema = lessonSchema.partial();
var copyDaySchema = z3.object({
  sourceDay: z3.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]),
  sourceWeek: z3.enum(["odd", "even", "both"]),
  targetDay: z3.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]),
  targetWeek: z3.enum(["odd", "even", "both"]),
  groupId: z3.string().optional().nullable()
});
var copyLessonSchema = z3.object({
  targetDay: z3.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]).optional(),
  targetWeek: z3.enum(["odd", "even", "both"]).optional(),
  targetDate: z3.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()
});
scheduleRouter.get("/", async (req, res, next) => {
  try {
    const { dayOfWeek, weekType, specificDate, groupId } = req.query;
    const userGroupIds = req.user.memberships.map((m) => m.groupId);
    const orConditions = [{ userId: req.user.id }];
    if (userGroupIds.length > 0) {
      if (typeof groupId === "string" && userGroupIds.includes(groupId)) {
        orConditions.push({ groupId });
      } else {
        orConditions.push({ groupId: { in: userGroupIds } });
      }
    }
    const where = {
      OR: orConditions
    };
    if (typeof dayOfWeek === "string" && dayOfWeek) {
      where.dayOfWeek = dayOfWeek;
    }
    if (typeof weekType === "string" && (weekType === "odd" || weekType === "even")) {
      where.weekType = { in: [weekType, "both"] };
    }
    if (typeof specificDate === "string" && specificDate) {
      where.specificDate = specificDate;
    }
    const lessons = await prisma.lesson.findMany({
      where,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
    });
    res.status(200).json({ lessons });
  } catch (error) {
    next(error);
  }
});
scheduleRouter.get("/week", async (req, res, next) => {
  try {
    const { weekType } = req.query;
    const parity = weekType === "even" ? "even" : "odd";
    const userGroupIds = req.user.memberships.map((m) => m.groupId);
    const lessons = await prisma.lesson.findMany({
      where: {
        OR: [
          { userId: req.user.id },
          ...userGroupIds.length > 0 ? [{ groupId: { in: userGroupIds } }] : []
        ],
        weekType: { in: [parity, "both"] }
      },
      orderBy: { startTime: "asc" }
    });
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const grouped = {};
    for (const d of days) {
      grouped[d] = lessons.filter((l) => l.dayOfWeek === d);
    }
    res.status(200).json({ weekType: parity, schedule: grouped });
  } catch (error) {
    next(error);
  }
});
scheduleRouter.post("/", async (req, res, next) => {
  try {
    const data = lessonSchema.parse(req.body);
    if (data.groupId) {
      const membership = req.user.memberships.find((m) => m.groupId === data.groupId);
      if (!membership) {
        throw new AppError("\u0412\u044B \u043D\u0435 \u0441\u043E\u0441\u0442\u043E\u0438\u0442\u0435 \u0432 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u0439 \u0433\u0440\u0443\u043F\u043F\u0435", 403);
      }
    }
    const lesson = await prisma.lesson.create({
      data: {
        subject: data.subject,
        type: data.type,
        teacher: data.teacher,
        room: data.room,
        dayOfWeek: data.dayOfWeek,
        weekType: data.weekType,
        startTime: data.startTime,
        endTime: data.endTime,
        specificDate: data.specificDate || null,
        notes: data.notes || null,
        groupId: data.groupId || null,
        userId: data.groupId ? null : req.user.id
      }
    });
    res.status(201).json({
      message: "\u041F\u0430\u0440\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430 \u0432 \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435",
      lesson
    });
  } catch (error) {
    next(error);
  }
});
scheduleRouter.patch("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.lesson.findUnique({
      where: { id: req.params.id }
    });
    if (!existing) {
      throw new AppError("\u0417\u0430\u043D\u044F\u0442\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E", 404);
    }
    if (existing.userId && existing.userId !== req.user.id) {
      throw new AppError("\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043F\u0440\u0430\u0432 \u0434\u043B\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u044D\u0442\u043E\u0433\u043E \u0437\u0430\u043D\u044F\u0442\u0438\u044F", 403);
    }
    if (existing.groupId) {
      const member = req.user.memberships.find((m) => m.groupId === existing.groupId);
      if (!member || member.role !== "ADMIN" && member.role !== "HEADMAN") {
        throw new AppError("\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0433\u0440\u0443\u043F\u043F\u044B \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u0442\u0430\u0440\u043E\u0441\u0442\u0430 \u0438\u043B\u0438 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440", 403);
      }
    }
    const data = updateLessonSchema.parse(req.body);
    const updated = await prisma.lesson.update({
      where: { id: req.params.id },
      data: {
        ...data,
        specificDate: data.specificDate !== void 0 ? data.specificDate : existing.specificDate
      }
    });
    res.status(200).json({
      message: "\u0417\u0430\u043D\u044F\u0442\u0438\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E",
      lesson: updated
    });
  } catch (error) {
    next(error);
  }
});
scheduleRouter.post("/:id/copy", async (req, res, next) => {
  try {
    const existing = await prisma.lesson.findUnique({
      where: { id: req.params.id }
    });
    if (!existing) {
      throw new AppError("\u0417\u0430\u043D\u044F\u0442\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E", 404);
    }
    const body = copyLessonSchema.parse(req.body);
    const newLesson = await prisma.lesson.create({
      data: {
        subject: existing.subject,
        type: existing.type,
        teacher: existing.teacher,
        room: existing.room,
        startTime: existing.startTime,
        endTime: existing.endTime,
        notes: existing.notes,
        dayOfWeek: body.targetDay || existing.dayOfWeek,
        weekType: body.targetWeek || existing.weekType,
        specificDate: body.targetDate !== void 0 ? body.targetDate : existing.specificDate,
        groupId: existing.groupId,
        userId: existing.groupId ? null : req.user.id
      }
    });
    res.status(201).json({
      message: "\u0417\u0430\u043D\u044F\u0442\u0438\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E",
      lesson: newLesson
    });
  } catch (error) {
    next(error);
  }
});
scheduleRouter.post("/copy-day", async (req, res, next) => {
  try {
    const { sourceDay, sourceWeek, targetDay, targetWeek, groupId } = copyDaySchema.parse(req.body);
    const userGroupIds = req.user.memberships.map((m) => m.groupId);
    const orConditions = [{ userId: req.user.id }];
    if (groupId && userGroupIds.includes(groupId)) {
      orConditions.push({ groupId });
    }
    const sourceLessons = await prisma.lesson.findMany({
      where: {
        OR: orConditions,
        dayOfWeek: sourceDay,
        weekType: { in: [sourceWeek, "both"] }
      }
    });
    if (sourceLessons.length === 0) {
      throw new AppError("\u0412 \u0438\u0441\u0445\u043E\u0434\u043D\u043E\u043C \u0434\u043D\u0435 \u043D\u0435\u0442 \u0437\u0430\u043D\u044F\u0442\u0438\u0439 \u0434\u043B\u044F \u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F", 400);
    }
    const createdLessons = await Promise.all(
      sourceLessons.map(
        (l) => prisma.lesson.create({
          data: {
            subject: l.subject,
            type: l.type,
            teacher: l.teacher,
            room: l.room,
            startTime: l.startTime,
            endTime: l.endTime,
            notes: l.notes,
            dayOfWeek: targetDay,
            weekType: targetWeek,
            groupId: l.groupId,
            userId: l.groupId ? null : req.user.id
          }
        })
      )
    );
    res.status(201).json({
      message: `\u0423\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E ${createdLessons.length} \u043F\u0430\u0440 \u0438\u0437 ${sourceDay} \u0432 ${targetDay}`,
      count: createdLessons.length,
      lessons: createdLessons
    });
  } catch (error) {
    next(error);
  }
});
scheduleRouter.delete("/:id", async (req, res, next) => {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.id }
    });
    if (!lesson) {
      throw new AppError("\u0417\u0430\u043D\u044F\u0442\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E", 404);
    }
    if (lesson.userId && lesson.userId !== req.user.id) {
      throw new AppError("\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043F\u0440\u0430\u0432 \u043D\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u044D\u0442\u043E\u0433\u043E \u0437\u0430\u043D\u044F\u0442\u0438\u044F", 403);
    }
    if (lesson.groupId) {
      const member = req.user.memberships.find((m) => m.groupId === lesson.groupId);
      if (!member || member.role !== "ADMIN" && member.role !== "HEADMAN") {
        throw new AppError("\u0423\u0434\u0430\u043B\u044F\u0442\u044C \u0437\u0430\u043D\u044F\u0442\u0438\u044F \u0433\u0440\u0443\u043F\u043F\u044B \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u0442\u0430\u0440\u043E\u0441\u0442\u0430 \u0438\u043B\u0438 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440", 403);
      }
    }
    await prisma.lesson.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "\u0417\u0430\u043D\u044F\u0442\u0438\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0443\u0434\u0430\u043B\u0435\u043D\u043E" });
  } catch (error) {
    next(error);
  }
});

// server/routes/homework.ts
import { Router as Router5 } from "express";
import { z as z4 } from "zod";
var homeworkRouter = Router5();
homeworkRouter.use(requireAuth);
var createHomeworkSchema = z4.object({
  groupId: z4.string().optional(),
  subject: z4.string().min(1, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0440\u0435\u0434\u043C\u0435\u0442").max(100),
  title: z4.string().min(1, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u044F").max(200),
  description: z4.string().min(1, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u044F"),
  deadline: z4.string().datetime().or(z4.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  attachmentName: z4.string().optional()
});
var updateHomeworkSchema = z4.object({
  subject: z4.string().min(1).max(100).optional(),
  title: z4.string().min(1).max(200).optional(),
  description: z4.string().min(1).optional(),
  deadline: z4.string().datetime().or(z4.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  attachmentName: z4.string().optional().nullable()
});
var updateProgressSchema = z4.object({
  status: z4.enum(["pending", "in_progress", "urgent", "completed"])
});
homeworkRouter.get("/", async (req, res, next) => {
  try {
    const userGroupIds = req.user.memberships.map((m) => m.groupId);
    if (userGroupIds.length === 0) {
      res.status(200).json({ homework: [] });
      return;
    }
    const { status, subject, groupId } = req.query;
    const targetGroupIds = typeof groupId === "string" && userGroupIds.includes(groupId) ? [groupId] : userGroupIds;
    const where = {
      groupId: { in: targetGroupIds }
    };
    if (typeof subject === "string" && subject.trim() && subject !== "all") {
      where.subject = subject.trim();
    }
    const homeworkList = await prisma.homework.findMany({
      where,
      orderBy: { deadline: "asc" },
      include: {
        group: { select: { id: true, name: true } },
        progress: {
          where: { userId: req.user.id },
          select: { status: true, updatedAt: true }
        }
      }
    });
    const result = homeworkList.map((hw) => {
      const userProgress = hw.progress[0]?.status || "pending";
      return {
        id: hw.id,
        groupId: hw.groupId,
        groupName: hw.group.name,
        subject: hw.subject,
        title: hw.title,
        description: hw.description,
        deadline: hw.deadline.toISOString().slice(0, 10),
        author: hw.author,
        attachmentName: hw.attachmentName,
        status: userProgress,
        // Personal status!
        createdAt: hw.createdAt.toISOString()
      };
    });
    const filtered = status && status !== "all" ? result.filter((item) => item.status === status) : result;
    res.status(200).json({ homework: filtered });
  } catch (error) {
    next(error);
  }
});
homeworkRouter.get("/:id", async (req, res, next) => {
  try {
    const hw = await prisma.homework.findUnique({
      where: { id: req.params.id },
      include: {
        group: { select: { id: true, name: true } },
        progress: {
          where: { userId: req.user.id },
          select: { status: true }
        }
      }
    });
    if (!hw) {
      throw new AppError("\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E", 404);
    }
    const isMember = req.user.memberships.some((m) => m.groupId === hw.groupId);
    if (!isMember) {
      throw new AppError("\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u0437\u0430\u0434\u0430\u043D\u0438\u044F\u043C \u044D\u0442\u043E\u0439 \u0433\u0440\u0443\u043F\u043F\u044B", 403);
    }
    res.status(200).json({
      homework: {
        id: hw.id,
        groupId: hw.groupId,
        groupName: hw.group.name,
        subject: hw.subject,
        title: hw.title,
        description: hw.description,
        deadline: hw.deadline.toISOString().slice(0, 10),
        author: hw.author,
        attachmentName: hw.attachmentName,
        status: hw.progress[0]?.status || "pending"
      }
    });
  } catch (error) {
    next(error);
  }
});
homeworkRouter.post("/", async (req, res, next) => {
  try {
    const data = createHomeworkSchema.parse(req.body);
    const targetGroupId = data.groupId || req.user.memberships[0]?.groupId;
    if (!targetGroupId) {
      throw new AppError("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0443\u0447\u0435\u0431\u043D\u0443\u044E \u0433\u0440\u0443\u043F\u043F\u0443 \u0438\u043B\u0438 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u0435\u0441\u044C \u043A \u0433\u0440\u0443\u043F\u043F\u0435", 400);
    }
    const membership = req.user.memberships.find((m) => m.groupId === targetGroupId);
    if (!membership) {
      throw new AppError("\u0412\u044B \u043D\u0435 \u0441\u043E\u0441\u0442\u043E\u0438\u0442\u0435 \u0432 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u0439 \u0433\u0440\u0443\u043F\u043F\u0435", 403);
    }
    if (membership.role === "MEMBER") {
      const memberCount = await prisma.groupMember.count({ where: { groupId: targetGroupId } });
      if (memberCount > 1) {
        throw new AppError("\u0421\u043E\u0437\u0434\u0430\u0432\u0430\u0442\u044C \u043E\u0431\u0449\u0438\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u044F \u0433\u0440\u0443\u043F\u043F\u044B \u043C\u043E\u0433\u0443\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u0442\u0430\u0440\u043E\u0441\u0442\u0430 \u0438\u043B\u0438 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u0433\u0440\u0443\u043F\u043F\u044B", 403);
      }
    }
    const deadlineDate = new Date(data.deadline);
    const hw = await prisma.homework.create({
      data: {
        groupId: targetGroupId,
        subject: data.subject,
        title: data.title,
        description: data.description,
        deadline: deadlineDate,
        author: req.user.name,
        attachmentName: data.attachmentName
      },
      include: { group: true }
    });
    res.status(201).json({
      message: "\u0414\u043E\u043C\u0430\u0448\u043D\u0435\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E \u0434\u043B\u044F \u0433\u0440\u0443\u043F\u043F\u044B",
      homework: {
        id: hw.id,
        groupId: hw.groupId,
        groupName: hw.group.name,
        subject: hw.subject,
        title: hw.title,
        description: hw.description,
        deadline: hw.deadline.toISOString().slice(0, 10),
        author: hw.author,
        attachmentName: hw.attachmentName,
        status: "pending"
      }
    });
  } catch (error) {
    next(error);
  }
});
homeworkRouter.patch("/:id/progress", async (req, res, next) => {
  try {
    const { status } = updateProgressSchema.parse(req.body);
    const hw = await prisma.homework.findUnique({
      where: { id: req.params.id }
    });
    if (!hw) {
      throw new AppError("\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E", 404);
    }
    const isMember = req.user.memberships.some((m) => m.groupId === hw.groupId);
    if (!isMember) {
      throw new AppError("\u0412\u044B \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0435\u0441\u044C \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u043C \u0433\u0440\u0443\u043F\u043F\u044B \u044D\u0442\u043E\u0433\u043E \u0437\u0430\u0434\u0430\u043D\u0438\u044F", 403);
    }
    const progress = await prisma.homeworkProgress.upsert({
      where: {
        homeworkId_userId: {
          homeworkId: hw.id,
          userId: req.user.id
        }
      },
      create: {
        homeworkId: hw.id,
        userId: req.user.id,
        status
      },
      update: {
        status
      }
    });
    res.status(200).json({
      message: "\u041B\u0438\u0447\u043D\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u0437\u0430\u0434\u0430\u043D\u0438\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D",
      status: progress.status
    });
  } catch (error) {
    next(error);
  }
});
homeworkRouter.post("/:id/convert-to-task", async (req, res, next) => {
  try {
    const hw = await prisma.homework.findUnique({
      where: { id: req.params.id }
    });
    if (!hw) {
      throw new AppError("\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E", 404);
    }
    const task = await prisma.task.create({
      data: {
        userId: req.user.id,
        title: `${hw.subject}: ${hw.title}`,
        description: hw.description,
        deadline: hw.deadline,
        category: "\u0423\u0447\u0451\u0431\u0430",
        priority: "high",
        homeworkId: hw.id
      }
    });
    res.status(201).json({
      message: "\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E \u0432 \u0432\u0430\u0448 \u043B\u0438\u0447\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u0434\u0435\u043B",
      task
    });
  } catch (error) {
    next(error);
  }
});
homeworkRouter.patch("/:id", async (req, res, next) => {
  try {
    const hw = await prisma.homework.findUnique({
      where: { id: req.params.id }
    });
    if (!hw) {
      throw new AppError("\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E", 404);
    }
    const member = req.user.memberships.find((m) => m.groupId === hw.groupId);
    if (!member || member.role !== "ADMIN" && member.role !== "HEADMAN" && hw.author !== req.user.name) {
      throw new AppError("\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0437\u0430\u0434\u0430\u043D\u0438\u0435 \u0433\u0440\u0443\u043F\u043F\u044B \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u0442\u0430\u0440\u043E\u0441\u0442\u0430, \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u0438\u043B\u0438 \u0430\u0432\u0442\u043E\u0440", 403);
    }
    const data = updateHomeworkSchema.parse(req.body);
    const updateData = {};
    if (data.subject !== void 0) updateData.subject = data.subject;
    if (data.title !== void 0) updateData.title = data.title;
    if (data.description !== void 0) updateData.description = data.description;
    if (data.deadline !== void 0) updateData.deadline = new Date(data.deadline);
    if (data.attachmentName !== void 0) updateData.attachmentName = data.attachmentName;
    const updated = await prisma.homework.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.status(200).json({
      message: "\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E",
      homework: {
        id: updated.id,
        groupId: updated.groupId,
        subject: updated.subject,
        title: updated.title,
        description: updated.description,
        deadline: updated.deadline.toISOString().slice(0, 10),
        author: updated.author,
        attachmentName: updated.attachmentName
      }
    });
  } catch (error) {
    next(error);
  }
});
homeworkRouter.delete("/:id", async (req, res, next) => {
  try {
    const hw = await prisma.homework.findUnique({
      where: { id: req.params.id }
    });
    if (!hw) {
      throw new AppError("\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E", 404);
    }
    const member = req.user.memberships.find((m) => m.groupId === hw.groupId);
    if (!member || member.role !== "ADMIN" && member.role !== "HEADMAN") {
      throw new AppError("\u0423\u0434\u0430\u043B\u044F\u0442\u044C \u0437\u0430\u0434\u0430\u043D\u0438\u0435 \u0433\u0440\u0443\u043F\u043F\u044B \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u0442\u0430\u0440\u043E\u0441\u0442\u0430 \u0438\u043B\u0438 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440", 403);
    }
    await prisma.homework.delete({
      where: { id: req.params.id }
    });
    res.status(200).json({ message: "\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u0433\u0440\u0443\u043F\u043F\u044B \u0443\u0434\u0430\u043B\u0435\u043D\u043E" });
  } catch (error) {
    next(error);
  }
});

// server/routes/groups.ts
import { Router as Router6 } from "express";
import crypto2 from "crypto";
import { z as z5 } from "zod";
var groupsRouter = Router6();
groupsRouter.use(requireAuth);
var createGroupSchema = z5.object({
  name: z5.string().min(2, "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0433\u0440\u0443\u043F\u043F\u044B \u0434\u043E\u043B\u0436\u043D\u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043E\u0442 2 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432").max(50)
});
var joinGroupSchema = z5.object({
  inviteCode: z5.string().min(4, "\u041A\u043E\u0434 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u044F \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043E\u0442 4 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432").trim().toUpperCase()
});
groupsRouter.get("/", async (req, res, next) => {
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: req.user.id },
      include: {
        group: {
          include: {
            _count: { select: { members: true, homeworks: true, lessons: true } }
          }
        }
      }
    });
    res.status(200).json({
      groups: memberships.map((m) => ({
        id: m.group.id,
        name: m.group.name,
        role: m.role,
        inviteCode: m.group.inviteCode,
        memberCount: m.group._count.members,
        homeworkCount: m.group._count.homeworks,
        lessonCount: m.group._count.lessons,
        joinedAt: m.joinedAt.toISOString()
      }))
    });
  } catch (error) {
    next(error);
  }
});
groupsRouter.post("/", async (req, res, next) => {
  try {
    const { name } = createGroupSchema.parse(req.body);
    const inviteCode = crypto2.randomBytes(3).toString("hex").toUpperCase();
    const group = await prisma.group.create({
      data: {
        name,
        inviteCode,
        members: {
          create: {
            userId: req.user.id,
            role: "ADMIN"
          }
        }
      },
      include: {
        _count: { select: { members: true } }
      }
    });
    res.status(201).json({
      message: "\u0423\u0447\u0435\u0431\u043D\u0430\u044F \u0433\u0440\u0443\u043F\u043F\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043E\u0437\u0434\u0430\u043D\u0430",
      group: {
        id: group.id,
        name: group.name,
        inviteCode: group.inviteCode,
        role: "ADMIN",
        memberCount: 1
      }
    });
  } catch (error) {
    next(error);
  }
});
groupsRouter.post("/join", async (req, res, next) => {
  try {
    const { inviteCode } = joinGroupSchema.parse(req.body);
    const group = await prisma.group.findUnique({
      where: { inviteCode }
    });
    if (!group) {
      throw new AppError("\u0413\u0440\u0443\u043F\u043F\u0430 \u0441 \u0442\u0430\u043A\u0438\u043C \u043A\u043E\u0434\u043E\u043C \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430", 404);
    }
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user.id,
          groupId: group.id
        }
      }
    });
    if (existingMember) {
      throw new AppError("\u0412\u044B \u0443\u0436\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0435\u0441\u044C \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u043C \u044D\u0442\u043E\u0439 \u0433\u0440\u0443\u043F\u043F\u044B", 409);
    }
    const membership = await prisma.groupMember.create({
      data: {
        userId: req.user.id,
        groupId: group.id,
        role: "MEMBER"
      }
    });
    res.status(200).json({
      message: `\u0412\u044B \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u043B\u0438\u0441\u044C \u043A \u0433\u0440\u0443\u043F\u043F\u0435 \xAB${group.name}\xBB`,
      group: {
        id: group.id,
        name: group.name,
        inviteCode: group.inviteCode,
        role: membership.role
      }
    });
  } catch (error) {
    next(error);
  }
});
groupsRouter.post("/:id/leave", async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user.id,
          groupId: req.params.id
        }
      }
    });
    if (!membership) {
      throw new AppError("\u0412\u044B \u043D\u0435 \u0441\u043E\u0441\u0442\u043E\u0438\u0442\u0435 \u0432 \u044D\u0442\u043E\u0439 \u0433\u0440\u0443\u043F\u043F\u0435", 404);
    }
    await prisma.groupMember.delete({
      where: { id: membership.id }
    });
    res.status(200).json({ message: "\u0412\u044B \u043F\u043E\u043A\u0438\u043D\u0443\u043B\u0438 \u0443\u0447\u0435\u0431\u043D\u0443\u044E \u0433\u0440\u0443\u043F\u043F\u0443" });
  } catch (error) {
    next(error);
  }
});
groupsRouter.get("/:id/members", async (req, res, next) => {
  try {
    const isMember = req.user.memberships.some((m) => m.groupId === req.params.id);
    if (!isMember) {
      throw new AppError("\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u0441\u043F\u0438\u0441\u043A\u0443 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u044D\u0442\u043E\u0439 \u0433\u0440\u0443\u043F\u043F\u044B", 403);
    }
    const members = await prisma.groupMember.findMany({
      where: { groupId: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { joinedAt: "asc" }
    });
    res.status(200).json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        name: m.user.name,
        role: m.role,
        joinedAt: m.joinedAt.toISOString()
      }))
    });
  } catch (error) {
    next(error);
  }
});

// server/routes/dashboard.ts
import { Router as Router7 } from "express";
var dashboardRouter = Router7();
dashboardRouter.use(requireAuth);
function getCurrentDayOfWeekString() {
  const day = (/* @__PURE__ */ new Date()).getDay();
  switch (day) {
    case 1:
      return "monday";
    case 2:
      return "tuesday";
    case 3:
      return "wednesday";
    case 4:
      return "thursday";
    case 5:
      return "friday";
    case 6:
      return "saturday";
    case 0:
    default:
      return "monday";
  }
}
dashboardRouter.get("/today", async (req, res, next) => {
  try {
    const { weekType } = req.query;
    const parity = weekType === "even" ? "even" : "odd";
    const dayOfWeek = getCurrentDayOfWeekString();
    const userGroupIds = req.user.memberships.map((m) => m.groupId);
    const lessons = await prisma.lesson.findMany({
      where: {
        OR: [
          { userId: req.user.id },
          ...userGroupIds.length > 0 ? [{ groupId: { in: userGroupIds } }] : []
        ],
        dayOfWeek,
        weekType: { in: [parity, "both"] }
      },
      orderBy: { startTime: "asc" }
    });
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id },
      orderBy: [{ completed: "asc" }, { deadline: "asc" }]
    });
    const incompleteTasksCount = tasks.filter((t) => !t.completed).length;
    let urgentHomework = [];
    if (userGroupIds.length > 0) {
      const homeworkList = await prisma.homework.findMany({
        where: {
          groupId: { in: userGroupIds }
        },
        orderBy: { deadline: "asc" },
        include: {
          progress: {
            where: { userId: req.user.id },
            select: { status: true }
          }
        },
        take: 5
      });
      urgentHomework = homeworkList.filter((h) => (h.progress[0]?.status || "pending") !== "completed").map((h) => ({
        id: h.id,
        subject: h.subject,
        title: h.title,
        deadline: h.deadline.toISOString().slice(0, 10),
        status: h.progress[0]?.status || "pending"
      }));
    }
    res.status(200).json({
      dayOfWeek,
      currentWeek: parity,
      lessons,
      stats: {
        lessonsCount: lessons.length,
        incompleteTasksCount,
        urgentHomeworkCount: urgentHomework.length
      },
      urgentHomework: urgentHomework.slice(0, 3),
      tasksPreview: tasks.slice(0, 5).map((t) => ({
        id: t.id,
        title: t.title,
        completed: t.completed,
        priority: t.priority,
        deadline: t.deadline ? t.deadline.toISOString().slice(0, 10) : null
      }))
    });
  } catch (error) {
    next(error);
  }
});

// server/app.ts
function createExpressApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(authMiddleware);
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/schedule", scheduleRouter);
  app.use("/api/homework", homeworkRouter);
  app.use("/api/groups", groupsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api", notFoundHandler);
  app.use(errorHandler);
  return app;
}

// server/index.ts
var isProduction = process.env.NODE_ENV === "production";
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var HOST = process.env.HOST || "0.0.0.0";
async function startServer() {
  const app = createExpressApp();
  if (isProduction) {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express2.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          host: HOST
        },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Could not mount Vite middleware in development mode:", e);
    }
  }
  const server = app.listen(PORT, HOST, () => {
    console.log(`[Student Planner Server] Running at http://${HOST}:${PORT} (mode: ${isProduction ? "production" : "development"})`);
  });
  const shutdown = async (signal) => {
    console.log(`
Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      console.log("Server and database connections closed. Bye!");
      process.exit(0);
    });
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 1e4);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  return { app, server };
}
startServer().catch((err) => {
  console.error("Fatal error during server startup:", err);
  process.exit(1);
});
export {
  startServer
};
