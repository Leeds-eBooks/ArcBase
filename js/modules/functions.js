// import parseG from 'parse'
// const Parse = parseG.Parse

// import humane from './humane'
import {update} from '../index.js'
import _ from './underscore'

function choosy(message, options, urls) {
  return new Promise((resolve) => {
    const hasUrls = urls && urls.length,
          frag = document.createDocumentFragment(),
          overlay = document.createElement('div'),
          dialog = document.createElement('div'),
          p = document.createElement('p'),
          inputs = options.map((option, i) => {
            const button = hasUrls ?
              document.createElement('a') : document.createElement('button');
            button.textContent = option
            if (hasUrls) {
              button.href = urls[i]
              button.target = "_blank"
            }
            return button;
          });

    function dismiss() {document.body.removeChild(overlay)}

    overlay.className = 'dialog-overlay'

    p.innerHTML = message
    dialog.appendChild(p)
    inputs.forEach(input => dialog.appendChild(input))

    overlay.appendChild(dialog)
    frag.appendChild(overlay)
    document.body.appendChild(frag)

    overlay.addEventListener('click', event => {
      if (event.target === event.currentTarget) {
        dismiss()
        resolve(false)
      }
    });

    if (!hasUrls) {
      inputs.forEach((input, i) =>
        input.addEventListener('click', () => {
          dismiss()
          resolve(options[i])
        })
      )
    }
  })
}

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
        this.roleMap.find(({_id}) => _id === author._id).roles :
        {}
    }
  } else {
    return {
      name: "",
      roles: {}
    }
  }
}

export function alphaNumeric(str, replacement = '-') {
  return str.replace(/\W+/g, replacement)
}

export function formatISBN(str) {
  return str.insert(3, '-').insert(11, '-').insert(14, '-')
}

export function preventAuthorEditing(i) {
  const bookRows = Array.from(document.querySelectorAll('tr.book-rows')),
        authors = Array.from(bookRows[i].querySelectorAll('td.authors > div .author-button'))
  authors.forEach(a => {a.readOnly = true})
}

export function saveToParse(data, bookToEdit) {
  const book = bookToEdit ? Kinvey.DataStore.get('Book', bookToEdit._id) : {}

  async function save(book) {
    console.log(book)
    try {
      const newBook = await Kinvey.DataStore[bookToEdit ? 'update' : 'save'](
        'Book',
        Object.assign(book, data),
        {relations: {authors: 'Author'}}
      )
      update(newBook)
    } catch (error) {
      console.error(JSON.stringify(error))
      // if (error.code === 141) {
      //   humane.error('The upload failed! Please try again.') // TODO
      //   update(book)
      // }
    }
  }

  if (bookToEdit) book.then(save)
  else save(book)
}

export function getKinveyAuthors(authorsArray) {
  return new Promise((resolve, reject) => {
    const query = new Kinvey.Query()
    query.contains('name', authorsArray)

    Kinvey.DataStore.find('Author', query)
    .then(function(savedAuthors) {
      const savedAuthorNames = _.pluck(savedAuthors, 'name')

      if (savedAuthorNames.length !== authorsArray.length) {
        const promisedAuthors = authorsArray.map(name =>
          savedAuthorNames.includes(name) ?
            savedAuthors.find(savedAuthor => savedAuthor.name === name) :
            Kinvey.DataStore.save('Author', {name})
        )
        Promise.all(promisedAuthors).then(resolve)
      } else {
        resolve(savedAuthors)
      }
    }).catch(reject)
  })
}
