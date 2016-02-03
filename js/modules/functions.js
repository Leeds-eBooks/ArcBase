// import humane from './humane'
import update from './update'
import _ from 'underscore-contrib-up-to-date'
import choosy from './choosy'

export function chooseCover(parseBook) {
  return function() {
    const sizes = [/*'200', '600', */'full size']
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

export function authorMapper(author) {
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

export function preventAuthorEditing(i) {
  const bookRows = Array.from(document.querySelectorAll('tr.book-rows')),
        authors = Array.from(bookRows[i].querySelectorAll('td.authors > div .author-button'))
  authors.forEach(a => a.readOnly = true)
}

export async function saveToKinvey(data, bookToEdit) {
  try {
    const newBook = await Kinvey.DataStore[bookToEdit ? 'update' : 'save'](
      'Book',
      Object.assign(
        bookToEdit ?
          await Kinvey.DataStore.get('Book', bookToEdit._id) :
          {},
        data
      ),
      {relations: {authors: 'Author'}}
    )
    await update(newBook)
  } catch (e) {
    console.error(e)
    // if (error.code === 141) {
    //   humane.error('The upload failed! Please try again.') // TODO handle Kinvey failed upload
    //   update(book)
    // }
  }
}

export async function getKinveyAuthors(authorsArray) {
  const query = new Kinvey.Query()
  query.contains('name', authorsArray)

  const savedAuthors = await Kinvey.DataStore.find('Author', query),
        savedAuthorNames = _.pluck(savedAuthors, 'name');

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
