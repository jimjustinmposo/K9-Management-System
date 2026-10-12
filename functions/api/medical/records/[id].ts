import { get, remove, update } from "../_lib"

export const onRequestGet: PagesFunction = (context) => get(context, "records")
export const onRequestPut: PagesFunction = (context) => update(context, "records")
export const onRequestDelete: PagesFunction = (context) => remove(context, "records")