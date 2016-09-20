// @flow

import {kvBookMap} from '../index'
import {authorMapper, chooseCover} from './functions'
import {clearInputs} from './util'
import {numberOfBooksToLoad} from './constants'

function whenLoaded(model, results, newBook) {
  if (model.books && model.authors && model.config) {

    if (results.length < numberOfBooksToLoad) {
      model.config.canLoadMore = false
    }

    results.forEach(kb => { // kb = kinveyBook
      const existingBook = model.books.find(book => book._id === kb._id),
            bookObj: Object = {
              _id: kb._id,
              title: kb.title,
              cover_orig: kb.cover_orig,
              cover_200: kb.cover_200,
              cover_600: kb.cover_600,
              authors: kb.authors ? kb.authors.map(authorMapper, kb) : [],
              pubdate: kb.pubdate,
              pages: kb.pages,
              shortdesc: kb.shortdesc,
              ISBNs: kb.ISBNs && kb.ISBNs.reduce((obj, current) => {
                obj[current.type]=current.value
                return obj
              }, {}),
              price: kb.price ?
                kb.price.reduce((obj, current) => {
                  obj[current.type] = current.value
                  return obj
                }, {}) :
                {
                  pbk: '',
                  hbk: '',
                  ebk: ''
                },
              button: 'Edit',
              chooseCover: chooseCover(kb)
            };

      let modelBook

      if (kb.authors) {
        kb.authors.forEach(kvAuthor => {
          if (!model.authors.some(a => a.name === kvAuthor.name)) {
            model.authors.push(kvAuthor)
          }
        })
      }

      if (existingBook) {
        modelBook = Object.assign(existingBook, bookObj)
      } else {
        modelBook = Object.assign(bookObj, {
          addAuthor(event, scope) {
            scope.book.authors.push({
              name: '',
              roles: {
                author: false,
                translator: false,
                editor: false,
                introducer: false,
                critic: false
              }
            });
          },
          isEditing() {
            return this.button === 'Save'
          }
        })

        if (results.length > 1) {
          model.books.push(modelBook)
        } else {
          model.books.unshift(modelBook)
        }
      }

      kvBookMap.set(modelBook, kb)
    })

    if (newBook) clearInputs(model)
  } else {
    console.error('model.books, model.authors and model.config not yet initialized')
  }
}

export default async function(model: Object, newBook: ?Object, loadMore?: boolean) {
  const query = new Kinvey.Query(),
        amountToSkip = loadMore ? model.books.length : 0;

  if (newBook) query.equalTo('_id', newBook._id)

  query
  .descending('pubdate')
  .skip(amountToSkip)
  .limit(numberOfBooksToLoad)

  try {
    whenLoaded(
      model,
      await Kinvey.DataStore.find('Book', query, {
        relations: {'authors': 'Author'}
      }),
      newBook
    )
  } catch (e) {
    console.error(e)
  }
}

export async function refreshAuthor(target: Object, id: string = target._id) {
  if (!id) throw new TypeError('author _id not defined')
  Object.assign(
    target,
    await Kinvey.DataStore.get('Author', id)
  )
}
