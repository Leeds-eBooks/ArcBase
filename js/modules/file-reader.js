export default function(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = function() {
      resolve(this.result)
    }
    reader.onabort = () => reject('aborted')
    reader.onerror = err => reject(err)
    reader.readAsDataURL(file)
  })
}
