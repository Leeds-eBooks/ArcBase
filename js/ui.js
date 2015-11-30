import _ from './underscore'

export function saving(el) {
  if (_.isElement(el)) {
    el.classList.remove('saved')
    el.classList.add('saving')
  }
}

export function saved(el) {
  if (_.isElement(el)) {
    el.classList.remove('saving')
    el.classList.add('saved')
  }
}

export function failed(el) {
  if (_.isElement(el)) {
    el.classList.remove('saving')
    el.classList.remove('saved')
    el.classList.add('failed')
  }
}
