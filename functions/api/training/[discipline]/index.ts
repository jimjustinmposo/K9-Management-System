import { create, list } from "../_lib"

export const onRequestGet: PagesFunction = (context) => list(context)
export const onRequestPost: PagesFunction = (context) => create(context)