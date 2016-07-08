import {model} from '../index'
import resize from 'resize-image'
import reader from './file-reader'
import blob from 'blob-util'
import _ from 'underscore-contrib-up-to-date'
import freeze from 'deep-freeze-strict'

export {freeze}

export const $ = document.querySelector.bind(document)
export const $$ = _.compose(Array.from, document.querySelectorAll.bind(document))

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

/**
 * Remove non-word characters (e.g. space)
 * @param  {String} str         Input string
 * @param  {String} replacement Replacement character
 * @return {String}             Output string
 */
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

function getTargetHeight(origWidth, targetWidth, origHeight) {
  return (targetWidth / origWidth) * origHeight
}

export function resizer(file, width) {
  return new Promise(async (resolve) => {
    const img = new Image()
    img.onload = async function() {
      const targetHeight = getTargetHeight(this.width, width, this.height)
      try {
        resolve(
          await blob.dataURLToBlob(
            resize.resize(img, width, targetHeight, resize.JPEG)
          )
        )
      } catch (e) {
        console.error(e)
      }
    }
    img.src = await reader(file)
  })
}

export function swapNames(authorObj) {
  const name = authorObj.name,
        sep = name.indexOf(','),
        ln = name.substring(0, sep),
        fn = name.substring(sep + 1).trim();

  return `${fn} ${ln}`
}

export function joinMany(array) {
  return {
    '0': 'Unknown',
    '1': array[0],
    '2+': array.join(', ')
  }[array.length < 2 ? `${array.length}` : '2+']
}

export function rebuildArray(oldArr, newArr) {
  oldArr.length = 0
  return oldArr.push(...newArr)
}

export function cutAtNextFullStop(str, len) {
  const fullStopIndex = str.indexOf('.', len)
  if (fullStopIndex >= 0) {
    return str.substr(0, fullStopIndex + 1)
  } else {
    return str
  }
}
