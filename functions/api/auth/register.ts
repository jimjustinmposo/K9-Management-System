import { createSession, hashPassword, type AppEnv } from "../../_lib/auth"
import { clean, id, json } from "../../_lib/http"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  try {
    const body = (await context.request.json()) as any
    const email = clean(body.email).toLowerCase()
    const name = clean(body.name)
    const workspaceName = clean(body.workspaceName) || `${name}'s K9 Unit`
    const password = typeof body.password === "string" ? body.password : ""
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 10)
      return json(
        {
          error:
            "Name, valid email, and a password of at least 10 characters are required",
        },
        400,
      )
    if (
      await context.env.DB.prepare("SELECT id FROM users WHERE email=?")
        .bind(email)
        .first()
    )
      return json({ error: "An account with this email already exists" }, 409)
    const now = new Date().toISOString()
    const userId = id()
    const workspaceId = id()
    const passwordData = await hashPassword(password)
    await context.env.DB.prepare(
      "INSERT INTO users (id,email,name,password_hash,password_salt,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
    )
      .bind(userId, email, name, passwordData.hash, passwordData.salt, now, now)
      .run()
    await context.env.DB.prepare(
      "INSERT INTO workspaces (id,name,created_at,updated_at) VALUES (?,?,?,?)",
    )
      .bind(workspaceId, workspaceName, now, now)
      .run()
    await context.env.DB.prepare(
      "INSERT INTO memberships (id,workspace_id,user_id,role,created_at) VALUES (?,?,?,?,?)",
    )
      .bind(id(), workspaceId, userId, "owner", now)
      .run()
    return json({ success: true }, 201, {
      "Set-Cookie": await createSession(context.env.DB, userId),
    })
  } catch (error) {
    return json({ error: "Registration failed", detail: String(error) }, 500)
  }
}
