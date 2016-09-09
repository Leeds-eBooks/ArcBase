// @flow

import resize from 'resize-image'
import reader from './file-reader'
import blob from 'blob-util'
import _ from 'lodash'
import {storageNames} from './constants'

export function pause(millis: number = 0) {
  return new Promise(resolve => setTimeout(resolve, millis))
}

export const $ = document.querySelector.bind(document)
export const $$ = _.flow(document.querySelectorAll.bind(document), Array.from)

/**
  * Promisified CSS transition events
  * @param  {HTMLElement} el        The element to watch
  * @param  {String}      action    The `classList` method: "add", "remove" or "toggle"
  * @param  {String}      className The className to be added/removed
  * @return {Promise}               Resolves on `transitionend` event
  */
export const trans = (el: HTMLElement, action: string, className: string) =>
  new Promise(resolve => {
    const eventStr = el.style.transition ? 'transitionend' : 'webkitTransitionEnd'
    function end() {
      el.removeEventListener(eventStr, end)
      resolve(el)
    }
    el.addEventListener(eventStr, end)

    if      (action === 'add')    el.classList.add(className)
    else if (action === 'remove') el.classList.remove(className)
    else if (action === 'toggle') el.classList.toggle(className)
    else throw new TypeError(`${action} is not a method of classList`)
  })

/**
 * Remove non-word characters (e.g. space)
 * @param  {String} str         Input string
 * @param  {String} replacement Replacement character
 * @return {String}             Output string
 */
export function alphaNumeric(str: string, replacement: string = '-') {
  return str.replace(/\W+/g, replacement)
}

export function formatISBN(str: string): string {
  return _.flow([
    stringInsert.bind(null, 3, '-'),
    stringInsert.bind(null, 11, '-'),
    stringInsert.bind(null, 14, '-')
  ])(str)
}

export function clearInputs(model: {inputs: Object}) {
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

export function resizer(file: Blob, width: number) {
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

export function swapNames(authorObj: {name: string}) {
  const name = authorObj.name,
        sep = name.indexOf(','),
        ln = name.substring(0, sep),
        fn = name.substring(sep + 1).trim();

  return `${fn} ${ln}`
}

export function joinMany(array: Array<string>) {
  return {
    '0': 'Unknown',
    '1': array[0],
    '2+': array.join(', ')
  }[array.length < 2 ? `${array.length}` : '2+']
}

export function rebuildArray(oldArr: Array<any>, newArr: Array<any>) {
  oldArr.length = 0
  return oldArr.push(...newArr)
}

export function cutAtNextFullStop(str: string, len: number) {
  const fullStopIndex = str.indexOf('.', len)
  if (fullStopIndex >= 0) {
    return str.substr(0, fullStopIndex + 1)
  } else {
    return str
  }
}

export function stringInsert(index: number, substr: string, targetStr: string) {
  return targetStr.substring(0, index) + substr + targetStr.substr(index)
}

export function getKinveySaveError(
  e: {name: string, description: string, debug: string} | Error,
  cache: ?Object
): Array<string> {
  const ret = [
    'ERROR: Your changes have not been saved.',
    `(${
      e instanceof Error ? e.toString() : `${e.name}: ${e.description}`
    })`
  ]

  if (cache) {
    window.sessionStorage.setItem(
      storageNames.newBookDataEntryCache,
      JSON.stringify(cache)
    )
    ret.splice(1, 0,
      'The details you have entered have been temporarily saved, please REFRESH THE PAGE and TRY AGAIN.'
    )
  }

  return ret
}
