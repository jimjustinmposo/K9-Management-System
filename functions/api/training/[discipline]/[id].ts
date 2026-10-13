import { get, remove, update } from "../_lib"

export const onRequestGet: PagesFunction = (context) => get(context)
export const onRequestPut: PagesFunction = (context) => update(context)
export const onRequestDelete: PagesFunction = (context) => remove(context)