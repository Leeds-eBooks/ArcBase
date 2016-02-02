import {model, kvBookMap} from '../index'
import {authorMapper, chooseCover} from './functions'
import {clearInputs} from './util'

function whenLoaded(results, newBook) {
  results.forEach(kb => { // kb = parseBook
    const existingBook = model.books.find(book => book._id === kb._id),
          bookObj = {
            _id: kb._id,
            title: kb.title,
            // coverimg: kb.cover_200 ? kb.cover_200._downloadURL : '',
            // coverimgFull: kb.cover_orig ? kb.cover_orig._downloadURL : '',
            // coverimg600: kb.cover_600 ? kb.cover_600._downloadURL : '',
            // coverimg: kb.cover_orig ? kb.cover_orig._downloadURL : '',
            cover_orig: kb.cover_orig,
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
        addAuthor(event,scope) {
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
      model.books[results.length > 1 ? 'push' : 'unshift'](modelBook)
    }

    kvBookMap.set(modelBook, kb)
  })

  if (newBook) clearInputs()
}

export default async function(newBook, load150more) {
  const query = new Kinvey.Query(),
        amountToSkip = load150more ? model.books.length : 0;

  if (newBook) query.equalTo('_id', newBook._id)

  query
  .descending('pubdate')
  .skip(amountToSkip)
  .limit(150)

  try {
    whenLoaded(
      await Kinvey.DataStore.find('Book', query, {
        relations: {'authors': 'Author'}
      }),
      newBook
    )
  } catch (e) {
    console.error(e)
  }
}
