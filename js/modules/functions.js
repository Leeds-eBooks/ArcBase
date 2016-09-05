// @flow

import humane from './humane'
import update from './update'
import _ from 'lodash'
import choosy from './choosy'
import {getKinveySaveError} from './util'

declare var Kinvey: Object

export function chooseCover(parseBook: Object) {
  return function() {
    const sizes = ['200', '600', 'full size']
    choosy(
      'Choose cover size (width in pixels)<br><br>' +
        '<strong>Right-click and choose "Save&nbsp;link&nbsp;as..." to download</strong>',
      sizes,
      sizes.map(size =>
        parseBook[size === 'full size' ? 'cover_orig' : 'cover_' + size]._downloadURL
      )
    ).catch(console.error.bind(console))
  }
}

export function authorMapper(author: {name: string, _id: string}) {
  // this = kinvey book
  if (author) {
    return {
      name: author.name,
      roles: this.roleMap && this.roleMap.length ?
        this.roleMap.find(({id}) => id === author._id).roles :
        {}
    }
  } else {
    return {
      name: "",
      roles: {}
    }
  }
}

export function preventAuthorEditing(i: number) {
  const bookRows = Array.from(document.querySelectorAll('tr.book-rows')),
        authors = Array.from(bookRows[i].querySelectorAll('td.authors > div .author-button'))
  authors.forEach(a => {
    if (a instanceof HTMLInputElement) a.readOnly = true
  })
}

export async function saveToKinvey(data: Object, inputModel: Object, bookToEdit: Object) {
  const isCreatingNewBook = !bookToEdit

  try {
    const newBook = await Kinvey.DataStore[isCreatingNewBook ? 'save' : 'update'](
      'Book',
      Object.assign(
        isCreatingNewBook ?
          {} :
          await Kinvey.DataStore.get('Book', bookToEdit._id),
        data
      ),
      {relations: {authors: 'Author'}}
    );

    humane.success(
      `Success! Your changes to ${
        isCreatingNewBook ? (data.title || 'this book') : `‘${bookToEdit.title}’`
      } have been saved.`
    )

    await update(newBook)

  } catch (e) {
    console.error(e)

    humane.error(
      getKinveySaveError(e, isCreatingNewBook ? inputModel : null)
    )
    // TODO handle Kinvey failed upload
  }
}

export async function getKinveyAuthors(authorsArray: Array<Object>): Promise<> {
  const query = new Kinvey.Query()
  query.contains('name', authorsArray)

  const savedAuthors = await Kinvey.DataStore.find('Author', query),
        savedAuthorNames = _.map(savedAuthors, 'name');

  if (savedAuthorNames.length !== authorsArray.length) {
    return await Promise.all(
      authorsArray.map(name =>
        savedAuthorNames.includes(name) ?
          savedAuthors.find(savedAuthor => savedAuthor.name === name) :
          Kinvey.DataStore.save('Author', {name})
      )
    )
  } else {
    return savedAuthors
  }
}
