import {model} from '../index'

/**
  * Promisified CSS transition events
  * @param  {HTMLElement} el        The element to watch
  * @param  {String}      action    The `classList` method: "add", "remove" or "toggle"
  * @param  {String}      className The className to be added/removed
  * @return {Promise}               Resolves on `transitionend` event
  */
export const trans = (el, action, className) =>
  new Promise(resolve => {
    const eventStr = el.style.transition ? 'transitionend' : 'webkitTransitionEnd'
    function end() {
      el.removeEventListener(eventStr, end)
      resolve(el)
    }
    el.addEventListener(eventStr, end)
    el.classList[action](className)
  })

export function alphaNumeric(str, replacement = '-') {
  return str.replace(/\W+/g, replacement)
}

export function formatISBN(str) {
  return str.insert(3, '-').insert(11, '-').insert(14, '-')
}

export function clearInputs() {
  model.inputs = {
    title: '',
    authors: [{
      name:'',
      roles: {
        author: false,
        translator: false,
        editor: false,
        introducer: false,
        critic: false
      }
    }],
    pubdate: '',
    pages: '',
    shortdesc: '',
    ISBNs: {
      pbk: '',
      hbk: '',
      ebk: ''
    },
    price: {
      pbk: '',
      hbk: '',
      ebk: ''
    },
    button: 'Save'
  }
}
