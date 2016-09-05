// @flow

export default function(message: string, options: Array<string>, urls: Array<string>) {
  return new Promise((resolve) => {
    const hasUrls = urls && urls.length,
          frag = document.createDocumentFragment(),
          overlay = document.createElement('div'),
          dialog = document.createElement('div'),
          p = document.createElement('p'),
          inputs = options.map((option, i) => {
            const button = hasUrls ?
              document.createElement('a') :
              document.createElement('button');

            button.textContent = option

            if (hasUrls && button instanceof HTMLAnchorElement) {
              button.href = urls[i]
              button.target = "_blank"
            }
            return button;
          });

    function dismiss() {document.body.removeChild(overlay)}

    overlay.className = 'dialog-overlay'

    p.innerHTML = message
    dialog.appendChild(p)
    inputs.forEach(input => dialog.appendChild(input))

    overlay.appendChild(dialog)
    frag.appendChild(overlay)
    document.body.appendChild(frag)

    overlay.addEventListener('click', event => {
      if (event.target === event.currentTarget) {
        dismiss()
        resolve(false)
      }
    });

    if (!hasUrls) {
      inputs.forEach((input, i) =>
        input.addEventListener('click', () => {
          dismiss()
          resolve(options[i])
        })
      )
    }
  })
}
