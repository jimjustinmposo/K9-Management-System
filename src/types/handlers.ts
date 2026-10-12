export interface Handler {
  id: string
  full_name: string
  nick_name: string
  position: string
  email: string
  phone: string
  created_at: string
  updated_at: string
}

export type HandlerFormValues = Pick<Handler, "full_name" | "nick_name" | "position" | "email" | "phone">

export const EMPTY_HANDLER_FORM: HandlerFormValues = {
  full_name: "",
  nick_name: "",
  position: "",
  email: "",
  phone: "",
}