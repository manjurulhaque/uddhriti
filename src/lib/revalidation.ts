import { revalidatePath } from "next/cache"

export function revalidatePublicSurfaces() {
  revalidatePath("/")
}
