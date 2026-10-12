import { create, list } from "../_lib"

export const onRequestGet: PagesFunction = (context) => list(context, "conditions")
export const onRequestPost: PagesFunction = (context) => create(context, "conditions")