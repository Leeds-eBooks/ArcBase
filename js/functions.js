import parseG from 'parse'
const Parse = parseG.Parse

import humane from './humane'
import {Book, Author, update} from './index.js'

function choosy(message, options, urls) {
  return new Promise((resolve, reject) => {
    const hasUrls = urls && urls.length,
          frag = document.createDocumentFragment(),
          overlay = document.createElement('div'),
          dialog = document.createElement('div'),
          p = document.createElement('p'),
          inputs = options.map((option, i) => {
            const button = hasUrls ?
              document.createElement('a') : document.createElement('button');
            button.textContent = option;
            if (hasUrls) {
              button.href = urls[i];
              button.target = "_blank";
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
        input.addEventListener('click', event => {
          dismiss()
          resolve(options[i])
        })
      )
    }
  })
}

export function chooseCover(parseBook) {
  return function(event, scope) {
    const sizes = ['200', '600', 'full size']
    choosy(
      'Choose cover size (width in pixels)<br><br>' +
        '<strong>Right-click and choose "Save&nbsp;link&nbsp;as..." to download</strong>',
      sizes,
      sizes.map(size =>
        parseBook.get(size === 'full size' ? 'cover_orig' : 'cover_' + size).url()
      )
    ).catch(console.log.bind(console))
  }
}

export function authorMapper(author) {
  // var obj = this;
  if (author && author.get) {
    return {
      name: author.get('name'),
      roles: (
        this.get('roleMap') && // FIXME what is `this`?
        this.get('roleMap').find(v => v.id === author.id).roles
      ) || {}
    }
  } else return {name: "", roles: {}}
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
  const query = new Parse.Query(Book),
        book = bookToEdit ? query.get(bookToEdit.id) : new Book()

  function save(book) {
    book.save(data, {
      success: update, // update(newBook)
      error: function(book, error) {
        console.error(JSON.stringify(error))
        if (error.code == 141) {
          humane.error('The upload failed! Please try again.')
          update(book)
        }
      }
    })
  }

  if (bookToEdit) book.then(save)
  else save(book)
}

export function getParseAuthors(authorsArray) {
  return new Promise((resolve, reject) => {
    const query = new Parse.Query(Author)
    query.containedIn('name', authorsArray)
    query.find({
      success(savedAuthors) {
        const savedAuthorNames = savedAuthors.map(v => v.get('name'))

        if (savedAuthorNames.length !== authorsArray.length) {
          const promisedAuthors = authorsArray.map(name => {
            if (!savedAuthorNames.includes(name)) {
              const newAuthor = new Author()
              return newAuthor.save({name})
            } else {
              return savedAuthors.find(savedAuthor =>
                savedAuthor.get('name') === name
              )
            }
          })
          Promise.all(promisedAuthors).then(resolve)
        } else resolve(savedAuthors)
      },
      error: reject
    })
  })
}
