import 'babel-polyfill'
import 'whatwg-fetch'
import 'sightglass'
import 'script!kinvey-html5/kinvey'
import rivets from 'rivets'
import FileSaver from '../bower_components/FileSaver/FileSaver.min'
import ArcBase from '../keys'
import dropin from './modules/dropin'
import {
  preventAuthorEditing,
  saveToKinvey,
  getKinveyAuthors
} from './modules/functions'
import {alphaNumeric, getTargetHeight} from './modules/util'
import docTemplates from './modules/templates'
import './modules/config'
import searchContacts, {updateContact} from './modules/contacts'
import {saving} from './modules/ui'
import _ from 'underscore-contrib-up-to-date'
import update from './modules/update'
import moment from 'moment'
import resize from 'resize-image'
import reader from './modules/file-reader'
import Lazy from 'lazy.js'
import blob from 'blob-util'

const table = document.querySelector('#main table'),
      notesOverlay = document.querySelector('.notes-overlay'),
      authorOverlay = document.querySelector('.author-overlay'),
      longOverlay = document.querySelector('.long-overlay');

export const kvBookMap = new Map()

export let model

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

    model = {
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

      load150more() {
        update(false, true)
      },

      submit(event, modelArg, bookToEdit) {
        const data = {},
            authors = [],
            replacedAuthorMap = {},
            inputModel = bookToEdit || model.inputs;

        let coverFile

        async function continueSubmit(replacedAuthors) {
          if (!bookToEdit) model.inputs.button = '<img class="loading" src="images/loading.gif">'

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
              });
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
              if (input instanceof File) {
                coverFile = {
                  file: input,
                  filename: `${alphaNumeric(inputModel.title, '-')}.jpg`
                }
              }
            } else {
              if (
                'function' !== typeof input &&
                key !== 'button' &&
                key !== 'filterOut'
              ) data[key] = input && input.trim().replace(/\s{1,}/g,' ')
            }
          })

          if (coverFile) {
            try {
              const img200 = new Image(),
                    img600 = new Image(),
                    [resized200, resized600] = await Promise.all([
                      new Promise(async (resolve) => {
                        img200.onload = async function() {
                          const targetHeight = getTargetHeight(this.width, 200, this.height)
                          try {
                            resolve(
                              await blob.dataURLToBlob(
                                resize.resize(img200, 200, targetHeight, resize.JPEG)
                              )
                            )
                          } catch (e) {
                            console.error(e)
                          }
                        }
                        img200.src = await reader(coverFile.file)
                      }),
                      new Promise(async (resolve) => {
                        img600.onload = async function() {
                          const targetHeight = getTargetHeight(this.width, 600, this.height)
                          try {
                            resolve(
                              await blob.dataURLToBlob(
                                resize.resize(img200, 600, targetHeight, resize.JPEG)
                              )
                            )
                          } catch (e) {
                            console.error(e)
                          }
                        }
                        img600.src = await reader(coverFile.file)
                      })
                    ]);
              Object.assign(coverFile, {
                resized: [
                  resized200,
                  resized600
                ]
              })
            } catch (e) {
              console.error(e)
            }
          }

          try {
            const [returnedAuthors, images] = await Promise.all([
              getKinveyAuthors(authors),
              coverFile ?
                Promise.all(
                  Lazy([coverFile.file, ...coverFile.resized])
                  .compact()
                  .map(file =>
                    Kinvey.File.upload(file, {
                      _filename: coverFile.filename,
                      mimeType: file.type
                    }, {public: true})
                    .then(res => res._id)
                  )
                  .toArray()
                ) :
                Promise.resolve()
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

            if (images) {
              data.cover_orig = {
                _type: 'KinveyFile',
                _id: images[0]
              }
              data.cover_200 = {
                _type: 'KinveyFile',
                _id: images[1]
              }
              data.cover_600 = {
                _type: 'KinveyFile',
                _id: images[2]
              }
            }

            await saveToKinvey(data, bookToEdit)
          } catch (e) {
            console.error(e.message || e)
          }
        }

        // submit() -->
        if (!inputModel.title.trim()) {
          alert('Every book needs a title...')
          return false
        } else if (inputModel.authors.some(v => v.name.trim() && !v.name.includes(','))) {
          alert('Author names must be Lastname, Firstname')
          return false
        } else {
          return Kinvey.execute('checkauthors', {authors: inputModel.authors})
            .then(res => {
              let cancelFlag = false
              const replaced = res.filter(r => {
                if (r.length === 1) {
                  let name = r[0].author.name
                  return confirm(
                    `Did you mean ${name}?

                    Ok for YES, I MEANT "${name}"
                    Cancel for NO, I AM CORRECT`
                  )
                } else {
                  cancelFlag = confirm(
                    `There is an author with a similar name on the database already. If there's a typo, do you want to go back and fix it?

                    Ok for YES, I MADE A MISTAKE
                    Cancel for NO, I AM CORRECT`
                  )
                  return cancelFlag
                }
              })

              if (replaced.length) {
                if (!cancelFlag) continueSubmit(replaced)
              } else {
                continueSubmit()
              }

            }).catch(error => {
              console.log('BL error caught', error)
              continueSubmit()
            })
        }
      },

      editOrSubmit(event, scope) {
        if (scope.book.button === 'Edit') {
          scope.book.button = 'Save'
          preventAuthorEditing(scope.index)
        } else {
          if (model.submit(null, null, scope.book)) {
            scope.book.button = '<img class="loading" src="images/loading.gif">'

            table
            .querySelectorAll('.book-rows')[scope.index]
            .querySelector('button.cover-upload').textContent = '⇧ cover'
          }
        }
      },

      calculatePrice(event, scope) {
        const mod = scope.book || scope.inputs
        mod.price.hbk = String(parseFloat(this.value) + 3)
        mod.price.ebk = String(parseFloat(this.value) - 4)
      },

      calculatePriceFromPages(event, scope) {
        const book = scope.book || scope.inputs,
              pageRange = {
                "0-89":     "8.99",
                "90-128":   "9.99",
                "129-160": "10.99",
                "161-192": "11.99",
                "193-999": "12.99"
              };

        function getRange(pages) {
          const p = parseInt(pages, 10)
          return Object.keys(pageRange).find(range =>
            p >= parseInt(range.split('-')[0], 10) &&
            p <= parseInt(range.split('-')[1], 10)
          )
        }

        if (!book.price.pbk || parseFloat(book.price.pbk) < 13) {
          book.price.pbk = book.pages ? pageRange[getRange(book.pages)] : ""
          book.price.hbk = String(parseFloat(book.price.pbk) + 3)
          book.price.ebk = String(parseFloat(book.price.pbk) - 4)
        }
      },

      validateISBN() {
        if (this.value.length === 13) {
          const ISBNArr = this.value.split('').map(d => parseInt(d, 10))

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
        } else if (this.value.length > 13) {
          this.classList.add('invalid')
        } else if (this.value.length < 13) {
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

      showAuthorModal(event, scope) {
        if (this.readOnly) {
          model.currentAuthor = model.getCurrentAuthor(scope.author.name)
          model.currentAuthorOldName = model.currentAuthor.name
          authorOverlay.classList.add('modal-in')
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
        model.currentAuthor.addUnique('travel_avail_dates', ['',''])
        model.currentAuthor.change() // TODO kv
      },

      delTravelAvailDateRange(event, scope) {
        const range = model.currentAuthor.travel_avail_dates[scope.index]
        model.currentAuthor.remove('travel_avail_dates', range) // FIXME can't remove() after add() without saving in-between
        model.currentAuthor.change() // TODO kv
      },

      async editAuthor() {
        const isEditing = model.authorButton === 'Save'
        model.authorButton = isEditing ?
          '<img class="loading" src="images/loading.gif">' : 'Save'
        model.isEditing.author = !isEditing

        if (isEditing) {
          console.log(model.currentAuthor)
          try {
            const updated = await Kinvey.DataStore.update('Author', model.currentAuthor)
            model.authorButton = 'Edit'
            model.books.forEach(book =>
              book.authors
              .filter(a => a.name === model.currentAuthorOldName)
              .forEach(author => author.name = updated.name)
            )
          } catch (e) {
            console.error(e)
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
          '<img class="loading" src="images/loading.gif">' :
          'Save'

        model.isEditing[which] = !isEditing

        if (isEditing) {
          try {
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
              AI = docTemplates.AI(book),
              blob = new Blob([AI], {type: "text/plain;charset=utf-8"});

        FileSaver.saveAs(blob, `${book.title} AI.txt`)
      },

      downloadPR(event, scope) {
        const book = scope.book,
              PR = docTemplates.PR(book),
              blob = new Blob([PR], {type: "text/plain;charset=utf-8"});

        FileSaver.saveAs(blob, `Press Release Arc Publications - ${book.title}.txt`)
      },

      downloadCataloguePage(event, scope) {
        const book = scope.book,
              cat = docTemplates.CataloguePage(book),
              blob = new Blob([cat], {type: "text/plain;charset=utf-8"});

        FileSaver.saveAs(blob, `CataloguePage-${book.title.replace(/\s+/g, '')}.html`)
      },

      async downloadCatalogue() {
        const {from, to, email} = await dropin(
                'Details for automatic catalogue generation',
                [{
                  key: 'from',
                  placeholder: 'start date',
                  type: 'date'
                }, {
                  key: 'to',
                  placeholder: 'end date',
                  type: 'date'
                }, {
                  key: 'email',
                  placeholder: 'email address',
                  type: 'email',
                  value: 'angela@arcpublications.co.uk'
                }]
              ),
              range = [from, to].map(str => new Date(str)),
              cat = model.books
                .filter(book => {
                  const pubdate = new Date(book.pubdate)
                  return range[0] <= pubdate && pubdate <= range[1]
                })
                .map(book => docTemplates.CataloguePage(book))
                .join('<p style="page-break-after:always;"></p>'),
              blob = new Blob([cat], {type: "text/plain;charset=utf-8"});

        fetch(`https://arcbase.herokuapp.com/?email=${encodeURIComponent(email)}`, {
          method: 'post',
          body: blob
        })
        .then(console.log.bind(console))
        .catch(console.error.bind(console))
      },

      // downloadCatalogue() {
      //   const range = prompt('Date range\n\nFormat: YYYY-MM-DD to YYYY-MM-DD')
      //           .split(' to ')
      //           .map(str => new Date(str)),
      //         cat = model.books
      //           .filter(book => {
      //             const pubdate = new Date(book.pubdate)
      //             return range[0] <= pubdate && pubdate <= range[1]
      //           })
      //           .map(book => docTemplates.CataloguePage(book))
      //           .join('<p style="page-break-after:always;"></p>'),
      //         blob = new Blob([cat], {type: "text/plain;charset=utf-8"});
      //
      //   FileSaver.saveAs(blob, 'Catalogue.html');
      // },

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

      openFilesCover() {
        this.parentNode.querySelector('input[type=file]').click()
      },

      coverSelected(event, scope) {
        const file = this.files[0]
        scope.book.cover_orig = file
        this.parentNode.querySelector('button').textContent = file.name
      },

      openContacts() {
        const el = document.querySelector('.contacts-overlay')
        el.classList.add('modal-in')
      },

      closeContacts(event) {
        if (this === event.target) {
          const el = document.querySelector('.contacts-overlay')
          el.classList.remove('modal-in')
        }
      },

      updateContact(event, scope) {
        saving(this)
        updateContact(scope.contact, this)
      },

      foundContacts: [],
      searchContacts: searchContacts(),

      async addNewContact() {
        const newContact = await Kinvey.DataStore.save('Contact', {})
        model.foundContacts.unshift(newContact)
      }
    }

    rivets.bind(document.body, model)

    // window.addEventListener('offline', Kinvey.Sync.offline)
    // window.addEventListener('online', Kinvey.Sync.online)

    window.model = model

    update()

  } catch (e) {
    window.alert(`There has been an error while attempting to connect to the database.\n\n${e}`)
  }
}()
