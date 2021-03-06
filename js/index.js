// @flow

import 'babel-polyfill'
import 'whatwg-fetch'
import 'sightglass'
import rivets from 'rivets'
import FileSaver from '../bower_components/FileSaver/FileSaver.min'
import ArcBase from '../keys'
import {
  preventAuthorEditing,
  saveToKinvey,
  getKinveyAuthors
} from './modules/functions'
import {
  pricing,
  loadingGif,
  numberOfBooksToLoad,
  storageNames
} from './modules/constants'
import {
  alphaNumeric,
  resizer,
  $,
  $$,
  swapNames,
  getKinveySaveError,
  pause
} from './modules/util'
import * as docTemplates from './modules/template-helpers'
import './modules/config'
import searchContacts, {
  updateContact,
  deleteContact as moduleDeleteContact
} from './modules/contacts'
import {saving} from './modules/ui'
import _ from 'lodash'
import update, {refreshAuthor} from './modules/update'
import moment from 'moment'
import Lazy from 'lazy.js'
import Mousetrap from 'mousetrap'
import Clipboard from 'clipboard'
import humane from './modules/humane'
import swal from './modules/sweetalert'
import getConfirmer from './modules/author-name-confirmer'
import touringSheet from './modules/templates/touring'

// $FlowIgnore
import 'script!../bower_components/pdfmake/build/pdfmake.min'
// $FlowIgnore
import 'script!../bower_components/pdfmake/build/vfs_fonts.js'

const table = document.querySelector('#main table'),
      notesOverlay = document.querySelector('.notes-overlay'),
      authorOverlay = document.querySelector('.author-overlay'),
      longOverlay = document.querySelector('.long-overlay');

export const kvBookMap = new Map()

export const model = {}

void async function() {
  try {
    const user = await Kinvey.init({
      appKey: ArcBase.keys.Kinvey.a,
      appSecret: ArcBase.keys.Kinvey.b
      // sync: {
      //   enable: true,
      //   online: window.navigator.onLine
      // }
    })

    if (!user) await Kinvey.User.login('default', 'qwertyui')

    Object.assign(model, {
      numberOfBooksToLoad,

      authors: [],
      books: [],
      inputs: {
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
      },

      config: {
        canLoadMore: true
      },

      selectAll() {
        if (this.readOnly) this.select()
      },

      addAuthor() {
        model.inputs.authors.push({
          name: '',
          roles: {
            author: false,
            translator: false,
            editor: false,
            introducer: false,
            critic: false
          }
        })
      },

      async loadMore() {
        await update(model, null, true)
        const currentSearch = $('input[type="search"].warning')
        if (currentSearch instanceof HTMLInputElement) model.smartSearch.call(currentSearch)
      },

      async submit(event, modelArg, bookToEdit) {
        const data = {},
            authors = [],
            replacedAuthorMap = {},
            inputModel = bookToEdit || model.inputs;

        async function continueSubmit(replacedAuthors) {
          let coverFile
          if (!bookToEdit) model.inputs.button = loadingGif

          _.each(inputModel, (input, key) => {
            if (key === 'authors') {
              input.forEach(v => {
                const replacement = replacedAuthors && replacedAuthors.find(
                  replacedAuthor => replacedAuthor[0].submitted.name === v.name
                )
                if (replacement) {
                  let newName = replacement[0].author.name
                  replacedAuthorMap[newName] = v
                  authors.push(newName)
                } else {
                  if (v.name.trim()) authors.push(v.name.trim().replace(/\s{1,}/g,' '))
                }
              })
            } else if (key === 'ISBNs') {
              data.ISBNs = Object.keys(input)
                .map(type =>
                  ({
                    type,
                    value: input[type].replace(/\D+/g,'')
                  })
                )
            } else if (key === 'price') {
              data.price = Object.keys(input)
                .map(type =>
                  ({
                    type,
                    value: input[type]
                  })
                )
            } else if (key === 'cover_orig') {
              if (input instanceof Blob) {
                coverFile = {
                  file: input,
                  filename: `${alphaNumeric(inputModel.title)}.jpg`
                }
              }
            } else {
              if (
                'function' !== typeof input &&
                key !== 'button' &&
                key !== 'filterOut' &&
                !key.includes('cover_')
              ) {
                data[key] = input && input.trim().replace(/\s{1,}/g,' ')
              }
            }
          })

          if (coverFile) {
            try {
              Object.assign(coverFile, {
                resized: await Promise.all([
                  resizer(coverFile.file, 200),
                  resizer(coverFile.file, 600)
                ])
              })
            } catch (e) {
              console.error(e)
            }
          }

          try {
            let uploader = Promise.resolve([])

            if (coverFile) {
              uploader = Promise.all(
                Lazy([coverFile.file, ...coverFile.resized])
                .compact()
                .map(async (file) => {
                  const {_id} = await Kinvey.File.upload(file, {
                    _filename: coverFile ? coverFile.filename : '',
                    mimeType: file.type
                  }, {public: true})
                  return _id
                }).toArray()
              )
            }

            const [returnedAuthors, images] = await Promise.all([
              getKinveyAuthors(authors),
              uploader
            ])

            data.authors = returnedAuthors
            data.roleMap = []

            returnedAuthors.forEach(author => {
              const roleModel = inputModel.authors.find(({name}) => name === author.name),
                    roles = roleModel ?
                      roleModel.roles :
                      replacedAuthorMap[author.name].roles;

              data.roleMap.push({
                id: author._id,
                roles
              })
            })

            if (images.length) {
              Object.assign(data, {
                cover_orig: {
                  _type: 'KinveyFile',
                  _id: images[0]
                },
                cover_200: {
                  _type: 'KinveyFile',
                  _id: images[1]
                },
                cover_600: {
                  _type: 'KinveyFile',
                  _id: images[2]
                }
              })
            }

            await saveToKinvey(model, data, inputModel, bookToEdit)
          } catch (e) {
            console.error(e)
            humane.error(
              getKinveySaveError(e, bookToEdit ? null : model.inputs)
            )
          }
        }

        // submit() -->
        if (!inputModel.title.trim()) {
          swal({
            title: 'Every book needs a title...',
            type: 'error',
            text: 'Please add a title for this book, even if it’s just temporary.'
          })
          return false
        } else if (!inputModel.pubdate || inputModel.pubdate.length < 10) {
          swal({
            title: 'Publication date required',
            type: 'error',
            text: 'Please choose a full publication date (dd/mm/yyyy), otherwise this book will be placed at the bottom of the list and it will seem like it hasn’t saved correctly.\n\nIf you know the month but not the day, just choose the last day of the month.\n\nIf it is a forthcoming book without a publication date yet, just choose a date in the future. You can change it at any time.'
          })
          return false
        } else if (inputModel.authors.some(v => v.name.trim() && !v.name.includes(','))) {
          swal({
            title: 'Incorrect author name',
            type: 'error',
            text: 'Author names must be: Lastname, Firstname'
          })
          return false
        } else {
          try {
            const res = await Kinvey.execute('checkauthors', {authors: inputModel.authors}),
                  state = {
                    cancelFlag: true,
                    replaced: []
                  },
                  confirmers = res.map(matches => getConfirmer(matches, state));

            for (let i = 0, l = confirmers.length; i < l; i++) {
              if (i > 0) await pause(500)
              await confirmers[i]()
            }

            if (state.cancelFlag) {
              return false
            } else if (state.replaced.length) {
              continueSubmit(state.replaced)
              return true
            } else {
              continueSubmit()
              return true
            }

          } catch (error) {
            console.log('Kinvey Business Logic error caught', error)
            console.log('continuing...')
            continueSubmit()
            return true
          }
        }
      },

      async editOrSubmit(event, scope) {
        if (scope.book.button === 'Edit') {
          scope.book.button = 'Save'
          preventAuthorEditing(scope.index)
        } else {
          scope.book.button = loadingGif

          try {
            if (await model.submit(null, null, scope.book)) {
              table
                .querySelectorAll('.book-rows')[scope.index]
                .querySelector('button.cover-upload').textContent = '⇧ cover'
            } else {
              scope.book.button = 'Save'
            }
          } catch (e) {
            console.error(e)
          }
        }
      },

      calculatePrice(event, scope) {
        const mod = scope.book || scope.inputs
        mod.price.hbk = String(parseFloat(this.value) + 3)
        mod.price.ebk = String(parseFloat(this.value) - 4)
      },

      calculatePriceFromPages(event, scope) {
        const book = scope.book || scope.inputs

        function getRange(pages) {
          const p = parseInt(pages, 10)
          return Object.keys(pricing).find(range =>
            p >= parseInt(range.split('-')[0], 10) &&
            p <= parseInt(range.split('-')[1], 10)
          )
        }

        if (!book.price.pbk || parseFloat(book.price.pbk) < 13) {
          book.price.pbk = book.pages ? pricing[getRange(book.pages)] : ""
          book.price.hbk = String(parseFloat(book.price.pbk) + 3)
          book.price.ebk = String(parseFloat(book.price.pbk) - 4)
        }
      },

      validateISBN() {
        const sanitized = this.value.replace(/\D/g, '')
        if (sanitized.length === 13) {
          const ISBNArr = sanitized.split('').map(d => parseInt(d, 10))

          let even = 0,
              odd = 0,
              checkdigit;

          for (let i = 0; i < 6; i++) {
            even += ISBNArr[2 * i]
            odd += ISBNArr[2 * i + 1] * 3
          }

          checkdigit = (10 - (even + odd) % 10) % 10
          if (ISBNArr[12] !== checkdigit) this.classList.add('invalid')
          else this.classList.remove('invalid')
        } else if (sanitized.length > 13) {
          this.classList.add('invalid')
        } else if (sanitized.length < 13) {
          this.classList.remove('invalid')
        }
      },

      isEditing: {
        author: false,
        notes: false,
        long: false
      },

      currentAuthor: undefined,
      currentAuthorOldName: undefined,

      getCurrentAuthor(name) {
        return this.authors.find(author => author.name === name)
      },

      async showAuthorModal(event, {author: {name}}) {
        if (this.readOnly) {
          model.currentAuthor = model.getCurrentAuthor(name)

          if (model.currentAuthor) {
            model.currentAuthorOldName = model.currentAuthor.name

            try {
              // HACK because Kinvey is not resolving book authors with all the
              // authors' data
              await refreshAuthor(model.currentAuthor)
            } catch (e) {
              humane.error(e)
            }

            authorOverlay.classList.add('modal-in')
          }
        }
      },

      closeAuthorModal(event) {
        if (this === event.target) {
          model.isEditing.author = false
          model.authorButton = 'Edit'
          authorOverlay.classList.remove('modal-in')
        }
      },

      calculateCurrentAuthorAge() {
        if (model.currentAuthor && model.currentAuthor.dob) {
          return `(Age: ${
            Math.floor(moment().diff(model.currentAuthor.dob) / 3.15569e10)
          })`
        }
      },

      authorButton: 'Edit',

      addTravelAvailDateRange() {
        if (model.currentAuthor) {
          model.currentAuthor.addUnique('travel_avail_dates', ['',''])
          model.currentAuthor.change() // TODO kv
        }
      },

      delTravelAvailDateRange(event, scope) {
        if (model.currentAuthor) {
          const range = model.currentAuthor.travel_avail_dates[scope.index]
          model.currentAuthor.remove('travel_avail_dates', range) // FIXME can't remove() after add() without saving in-between
          model.currentAuthor.change() // TODO kv
        }
      },

      async editAuthor() {
        const isEditing = model.authorButton === 'Save'
        model.authorButton = isEditing ?
          loadingGif : 'Save'
        model.isEditing.author = !isEditing

        if (isEditing && model.currentAuthor) {
          try {
            if (model.currentAuthor.author_photo instanceof File) {

              const {_id} = await Kinvey.File.upload(model.currentAuthor.author_photo, {
                _filename: `${alphaNumeric(model.currentAuthor.name)}.jpg`,
                mimeType: model.currentAuthor.author_photo.type
              }, {public: true})

              model.currentAuthor.author_photo = {
                _type: 'KinveyFile',
                _id
              }
            }

            model.books.forEach(book =>
              book.authors
              .filter(a => a.name === model.currentAuthorOldName)
              .forEach(author => author.name = model.currentAuthor.name)
            )

            const {_id} = await Kinvey.DataStore.update('Author', model.currentAuthor)
            await refreshAuthor(model.currentAuthor, _id)

          } catch (e) {
            console.error(e)
          } finally {
            model.authorButton = 'Edit'
          }
        }
      },

      removeAuthor(event, scope) {
        /*const x = */scope.book.authors.splice(scope.index, 1);
        // TODO roles
      },

      currentBook: undefined,
      notesButton: 'Edit',
      longButton: 'Edit',

      showModal(which, scope) {
        model.currentBook = kvBookMap.get(scope.book)

        const modalMap = {
          notes: notesOverlay,
          long: longOverlay
        }
        modalMap[which].classList.add('modal-in')
      },

      showNotesModal: (event, scope) => model.showModal('notes', scope),
      showLongModal: (event, scope) => model.showModal('long', scope),

      closeModal(which) {
        const button = `${which}Button`
        model.isEditing[which] = false
        model[button] = 'Edit'

        const modalMap = {
          notes: notesOverlay,
          long: longOverlay
        }
        modalMap[which].classList.remove('modal-in')
      },

      closeNotesModal(event) {
        if (this === event.target) return model.closeModal('notes')
      },

      closeLongModal(event) {
        if (this === event.target) return model.closeModal('long')
      },

      async editModal(which) {
        const button = `${which}Button`,
              isEditing = model[button] === 'Save';

        model[button] = isEditing ?
          loadingGif :
          'Save'

        model.isEditing[which] = !isEditing

        if (isEditing) {
          try {
            if (!model.currentBook) {
              throw new TypeError('model.currentBook is not defined')
            }
            await Kinvey.DataStore.update('Book', model.currentBook)
            model[button] = 'Edit'
          } catch (e) {
            console.error(e)
          }
        }
      },

      editNotes: () => model.editModal('notes'),
      editLong: () => model.editModal('long'),

      downloadAI(event, scope) {
        const book = scope.book,
              kvBook = kvBookMap.get(book);

        if (kvBook) {
          const AI = docTemplates.AI(model, book, kvBook),
                blob = new Blob([AI], {type: "text/plain;charset=utf-8"});

          FileSaver.saveAs(blob, `${book.title} AI.txt`)
        }
      },

      downloadPR(event, scope) {
        const book = scope.book,
              PR = docTemplates.PR(model, book),
              blob = new Blob([PR], {type: "text/plain;charset=utf-8"});

        FileSaver.saveAs(blob, `Press Release Arc Publications - ${book.title}.txt`)
      },

      async downloadTouringSheet() {
        if (model.currentAuthor) {
          const buttonCache = this.innerHTML
          try {
            this.innerHTML = loadingGif
            const doc = await touringSheet(model.currentAuthor);

            window.pdfMake
            .createPdf(doc)
            .download(`${
              alphaNumeric(swapNames(model.currentAuthor))
            }-touring-sheet`)

          } catch (e) {
            console.error(e)
            if (e.message.toLowerCase().includes('missing cover image')) {
              alert('Missing cover image – add a cover image and try again.')
            } else if (e.message.toLowerCase().includes('missing author photo')) {
              alert('Missing author photo – add an author photo and try again.')
            }
          } finally {
            this.innerHTML = buttonCache
          }
        }
      },

      async downloadCatalogueSheet(event, scope) {
        const textCache = this.textContent
        try {
          this.innerHTML = loadingGif
          const book = scope.book,
                doc = await touringSheet(book);

          window.pdfMake.createPdf(doc).download(`${alphaNumeric(book.title)}-catalogue-page`)

        } catch (e) {
          console.error(e)
          if (e.message.toLowerCase().includes('missing cover image')) {
            alert('Missing cover image – add a cover image and try again.')
          }
        } finally {
          this.textContent = textCache
        }
      },

      smartSearch() {
        const column = this.getAttribute('data-search-column')

        for (let i = 0, l = model.books.length; i < l; i++) {
          let book = model.books[i],
              item = book[column];
          if ('string' === typeof item) {
            book.filterOut = !item.toLowerCase().includes(this.value.toLowerCase())
          } else if (column === 'authors') {
            book.filterOut = item.every(v => !v.name.toLowerCase().includes(this.value.toLowerCase()))
          } else if (column === 'ISBNs' || column === 'price') {
            book.filterOut = Object.keys(item).every(k => !item[k].includes(this.value))
          } else if (!item) {
            book.filterOut = true
          }
        }
        if (this.value) this.classList.add('warning')
        else this.classList.remove('warning')
      },

      openFileInput() {
        this.parentNode.querySelector('input[type=file]').click()
      },

      coverSelected(event, scope) {
        const file = this.files[0]
        scope.book.cover_orig = file
        this.parentNode.querySelector('button').textContent = file.name
      },

      authorPhotoSelected(event, scope) {
        const file = this.files[0]
        scope.currentAuthor.author_photo = file
        this.parentNode.querySelector('button').textContent = file.name
      },

      openContacts() {
        const el = document.querySelector('.contacts-overlay')
        el.classList.add('modal-in')
        el.querySelector(`input[type="search"]`).focus()
      },

      closeContacts(event) {
        if (this === event.target) {
          const el = document.querySelector('.contacts-overlay')
          el.classList.remove('modal-in')
        }
      },

      updateContact(event, {contact}) {
        saving(this)
        updateContact(contact, this)
      },

      foundContacts: [],
      searchContacts: searchContacts(model),

      deleteContact(event, {contact}) {
        moduleDeleteContact(contact, model.foundContacts)
      },

      async addNewContact() {
        const newContact = await Kinvey.DataStore.save('Contact', {})
        model.foundContacts.unshift(newContact)
      }
    })

    rivets.bind(document.body, model)

    // window.addEventListener('offline', Kinvey.Sync.offline)
    // window.addEventListener('online', Kinvey.Sync.online)

    window.model = model

    void async function() {
      try {
        await update(model)
        await update(model, null, true)

        // URL search
        const search = window.location.search.substr(1)
        if (search) {
          const searchBox = $('[data-search-column="title"]')
          if (searchBox instanceof HTMLInputElement) {
            searchBox.value = search
            searchBox.dispatchEvent(new Event('input'))
          }
        }
      } catch (e) {
        console.error(e)
      }
    }()

    const searchBoxes = $$('tr#search input[type="search"]')

    Mousetrap.bind(
      Lazy.range(searchBoxes.length).map(v => `${v}`).toArray(),
      (event, combo) => {
        event.preventDefault()
        searchBoxes[parseInt(Lazy(combo).last(), 10) - 1].select()
      }
    )

    const clipboard = new Clipboard(
      [
        'input[readonly]:not(.author-button)',
        'textarea[readonly]',
        '[data-clipboard-text]'
      ].join(', '),
      {
        target: trigger => trigger
      }
    )

    clipboard.on('success', ({text}) =>
      text && humane.success(
        `Copied "${
          text.substr(0, 20)
        }${
          text.length > 20 ? '...' : ''
        }" to clipboard`
      )
    )

    clipboard.on('error', () => {
      if (/(iPad|iPhone)/.test(navigator.userAgent)) {
        humane.error('Not supported')
      } else {
        humane.success('Now press ⌘ + C to copy the selection to your clipboard')
      }
    })

    const cachedInputModelString = sessionStorage.getItem(storageNames.newBookDataEntryCache)

    if (cachedInputModelString) {
      try {
        const cachedInputModel = JSON.parse(cachedInputModelString)
        Object.assign(model.inputs, cachedInputModel)
        sessionStorage.removeItem(storageNames.newBookDataEntryCache)
      } catch (e) {
        console.error(e)
      }
    }

  } catch (e) {
    alert(e.message || e)
  }
}()
