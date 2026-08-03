/** Loads a data-URL/http(s) image source into an `HTMLImageElement`, resolved once it's ready to draw. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Failed to load image."))
    image.src = src
  })
}
