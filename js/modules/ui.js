// @flow

import _ from 'lodash'

function handleClasses(el, toRemove, toAdd) {
  if (_.isElement(el)) {
    toRemove.forEach(el.classList.remove.bind(el.classList))
    toAdd.forEach(el.classList.add.bind(el.classList))
  }
}

export function saving(el: HTMLElement) {
  return handleClasses(el, ['saved'], ['saving'])
}

export function saved(el: HTMLElement) {
  return handleClasses(el, ['saving'], ['saved'])
}

export function failed(el: HTMLElement) {
  return handleClasses(el, ['saving', 'saved'], ['failed'])
}
