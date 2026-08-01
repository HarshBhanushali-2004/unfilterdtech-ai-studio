import { toast } from "sonner"

function copyWithExecCommand(text: string): boolean {
  if (typeof document === "undefined") return false

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  textarea.style.pointerEvents = "none"
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  let succeeded = false
  try {
    succeeded = document.execCommand("copy")
  } catch {
    succeeded = false
  }

  document.body.removeChild(textarea)
  return succeeded
}

export async function copyToClipboard(
  text: string,
  successMessage: string,
  errorMessage = "Unable to copy to clipboard"
) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      toast.success(successMessage)
      return
    }
  } catch (error) {
    console.error(error)
  }

  if (copyWithExecCommand(text)) {
    toast.success(successMessage)
  } else {
    toast.error(errorMessage)
  }
}
