import _ from 'underscore-contrib-up-to-date'

function handleClasses(el, toRemove, toAdd) {
  if (_.isElement(el)) {
    toRemove.forEach(el.classList.remove.bind(el.classList))
    toAdd.forEach(el.classList.add.bind(el.classList))
  }
}

export function saving(el) {
  return handleClasses(el, ['saved'], ['saving'])
}

export function saved(el) {
  return handleClasses(el, ['saving'], ['saved'])
}

export function failed(el) {
  return handleClasses(el, ['saving', 'saved'], ['failed'])
}
