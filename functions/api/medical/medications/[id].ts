import { get, remove, update } from "../_lib"

export const onRequestGet: PagesFunction = (context) => get(context, "medications")
export const onRequestPut: PagesFunction = (context) => update(context, "medications")
export const onRequestDelete: PagesFunction = (context) => remove(context, "medications")