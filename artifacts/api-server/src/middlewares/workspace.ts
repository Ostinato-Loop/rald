import { type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { workspacesTable, workspaceMembersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import type { AuthRequest } from "../lib/auth";

export interface WorkspaceRequest extends AuthRequest {
  workspaceId?: string;
  workspaceRole?: string;
}

export async function requireWorkspaceMember(
  req: WorkspaceRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const workspaceId =
    (req.headers["x-workspace-id"] as string | undefined) ||
    req.params.workspaceId;

  if (!workspaceId) {
    res.status(400).json({
      error: "Workspace ID is required via X-Workspace-ID header or URL param",
    });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Admin users bypass workspace membership check but workspace must exist
  if (req.user.role === "admin" || req.user.role === "operator") {
    const [workspace] = await db
      .select({ id: workspacesTable.id, isActive: workspacesTable.isActive })
      .from(workspacesTable)
      .where(eq(workspacesTable.id, workspaceId))
      .limit(1);

    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }
    if (!workspace.isActive) {
      res.status(403).json({ error: "Workspace is inactive" });
      return;
    }

    req.workspaceId = workspaceId;
    req.workspaceRole = req.user.role;
    next();
    return;
  }

  // Regular users must be workspace members
  const [member] = await db
    .select({
      role: workspaceMembersTable.role,
      workspaceIsActive: workspacesTable.isActive,
    })
    .from(workspaceMembersTable)
    .innerJoin(
      workspacesTable,
      eq(workspaceMembersTable.workspaceId, workspacesTable.id),
    )
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.userId, req.user.id),
      ),
    )
    .limit(1);

  if (!member) {
    res
      .status(403)
      .json({ error: "You do not have access to this workspace" });
    return;
  }
  if (!member.workspaceIsActive) {
    res.status(403).json({ error: "Workspace is inactive" });
    return;
  }

  req.workspaceId = workspaceId;
  req.workspaceRole = member.role;
  next();
}
