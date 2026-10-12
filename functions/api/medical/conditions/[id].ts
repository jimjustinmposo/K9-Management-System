import { get, remove, update } from "../_lib"

export const onRequestGet: PagesFunction = (context) => get(context, "conditions")
export const onRequestPut: PagesFunction = (context) => update(context, "conditions")
export const onRequestDelete: PagesFunction = (context) => remove(context, "conditions")