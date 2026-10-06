import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"

import { clean, json } from "../../_lib/http"

interface K9Row {
  id: string

  profile_photo: string

  dog_name: string

  nick_name: string

  breed: string

  date_of_birth: string

  sex: string

  status: string

  microchip_number: string

  father_sire: string

  mother_dam: string

  notes: string

  created_at: string

  updated_at: string
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `k9-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
}

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")

  if (isResponse(session)) return session

  const { searchParams } = new URL(context.request.url)

  const search = searchParams.get("search")?.trim() ?? ""

  try {
    let query = "SELECT * FROM k9_roster WHERE workspace_id = ?"

    const params: string[] = [session.workspace.id]

    if (search) {
      query +=
        " AND (dog_name LIKE ? OR nick_name LIKE ? OR breed LIKE ? OR microchip_number LIKE ?)"

      const like = `%${search}%`

      params.push(like, like, like, like)
    }

    query += " ORDER BY dog_name ASC"

    const result = params.length
      ? await context.env.DB.prepare(query)
          .bind(...params)
          .all<K9Row>()
      : await context.env.DB.prepare(query).all<K9Row>()

    return json({ data: result.results ?? [] })
  } catch (error) {
    return json(
      { error: "Failed to load K9 roster", detail: String(error) },

      500,
    )
  }
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "create")

  if (isResponse(session)) return session

  try {
    const body = (await context.request.json()) as any

    const dogName = clean(body.dog_name)

    if (!dogName) return json({ error: "Dog Name is required" }, 400)

    const now = new Date().toISOString()

    const row: K9Row = {
      id: clean(body.id) || newId(),

      profile_photo:
        typeof body.profile_photo === "string" ? body.profile_photo : "",

      dog_name: dogName,

      nick_name: clean(body.nick_name),

      breed: clean(body.breed),

      date_of_birth: clean(body.date_of_birth),

      sex: clean(body.sex),

      status: clean(body.status),

      microchip_number: clean(body.microchip_number),

      father_sire: clean(body.father_sire),

      mother_dam: clean(body.mother_dam),

      notes: typeof body.notes === "string" ? body.notes.trim() : "",

      created_at: now,

      updated_at: now,
    }

    await context.env.DB.prepare(
      `INSERT INTO k9_roster
       (id, profile_photo, dog_name, nick_name, breed, date_of_birth, sex, status, microchip_number, father_sire, mother_dam, notes, created_at, updated_at, workspace_id, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )

      .bind(
        row.id,

        row.profile_photo,

        row.dog_name,

        row.nick_name,

        row.breed,

        row.date_of_birth,

        row.sex,

        row.status,

        row.microchip_number,

        row.father_sire,

        row.mother_dam,

        row.notes,

        row.created_at,

        row.updated_at,

        session.workspace.id,

        session.user.id,
      )

      .run()

    return json({ data: row }, 201)
  } catch (error) {
    return json(
      { error: "Failed to create K9 record", detail: String(error) },

      500,
    )
  }
}
