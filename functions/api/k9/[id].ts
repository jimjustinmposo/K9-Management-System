import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"

import { clean, json } from "../../_lib/http"

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")
  if (isResponse(session)) return session

  const id = context.params.id as string

  try {
    const row = await context.env.DB.prepare(
      "SELECT * FROM k9_roster WHERE id = ? AND workspace_id = ?",
    )

      .bind(id, session.workspace.id)

      .first()

    if (!row) return json({ error: "K9 record not found" }, 404)

    return json({ data: row })
  } catch (error) {
    return json(
      { error: "Failed to load K9 record", detail: String(error) },
      500,
    )
  }
}

export const onRequestPut: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "edit")
  if (isResponse(session)) return session

  const id = context.params.id as string

  try {
    const body = (await context.request.json()) as any

    const dogName = clean(body.dog_name)

    if (!dogName) return json({ error: "Dog Name is required" }, 400)

    const existing = await context.env.DB.prepare(
      "SELECT created_at FROM k9_roster WHERE id = ? AND workspace_id = ?",
    )

      .bind(id, session.workspace.id)

      .first<{ created_at: string }>()

    if (!existing) return json({ error: "K9 record not found" }, 404)

    const updatedAt = new Date().toISOString()

    await context.env.DB.prepare(
      `UPDATE k9_roster SET
        profile_photo = ?, dog_name = ?, nick_name = ?, breed = ?,
        date_of_birth = ?, sex = ?, status = ?, microchip_number = ?,
        father_sire = ?, mother_dam = ?, notes = ?, updated_at = ?
       WHERE id = ? AND workspace_id = ?`,
    )

      .bind(
        typeof body.profile_photo === "string" ? body.profile_photo : "",

        dogName,

        clean(body.nick_name),

        clean(body.breed),

        clean(body.date_of_birth),

        clean(body.sex),

        clean(body.status),

        clean(body.microchip_number),

        clean(body.father_sire),

        clean(body.mother_dam),

        typeof body.notes === "string" ? body.notes.trim() : "",

        updatedAt,

        id,

        session.workspace.id,
      )

      .run()

    const row = await context.env.DB.prepare(
      "SELECT * FROM k9_roster WHERE id = ? AND workspace_id = ?",
    )

      .bind(id, session.workspace.id)

      .first()

    return json({ data: row })
  } catch (error) {
    return json(
      { error: "Failed to update K9 record", detail: String(error) },
      500,
    )
  }
}

export const onRequestDelete: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "delete")
  if (isResponse(session)) return session

  const id = context.params.id as string

  try {
    await context.env.DB.prepare(
      "DELETE FROM k9_roster WHERE id = ? AND workspace_id = ?",
    )

      .bind(id, session.workspace.id)

      .run()

    return json({ success: true })
  } catch (error) {
    return json(
      { error: "Failed to delete K9 record", detail: String(error) },
      500,
    )
  }
}
