// @flow

import {freeze} from './util.js'

export const pricing = freeze({
  '0-112':   '9.99',
  '113-160': '10.99',
  '161-192': '11.99',
  '193-999': '12.99'
})

export const loadingGif = '<img class="loading" src="images/loading.gif">'

export const numberOfBooksToLoad = 200

export const storageNames = freeze({
  newBookDataEntryCache: 'new book data entry cache'
})
